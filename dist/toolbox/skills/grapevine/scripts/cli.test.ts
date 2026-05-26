// Integration tests for the grapevine CLI + daemon. Spawns a fresh daemon
// against a tmpdir GRAPEVINE_HOME, exercises the verbs end to end.
//
// Run with: bun test from this directory.

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const HOME = mkdtempSync(join(tmpdir(), "grapevine-test-"));
const CLI = join(import.meta.dir, "cli.ts");

function bunRun(
  args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [CLI, ...args], {
      env: { ...process.env, GRAPEVINE_HOME: HOME },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    proc.stdout.on("data", (b) => out.push(b));
    proc.stderr.on("data", (b) => err.push(b));
    proc.on("exit", (code) =>
      resolve({
        code: code ?? -1,
        stdout: Buffer.concat(out).toString("utf-8"),
        stderr: Buffer.concat(err).toString("utf-8"),
      })
    );
  });
}

function spawnTail(
  name: string,
  extra: string[] = []
): { proc: ReturnType<typeof spawn>; output: () => string } {
  const buf: Buffer[] = [];
  const proc = spawn(process.execPath, [CLI, "tail", name, ...extra], {
    env: { ...process.env, GRAPEVINE_HOME: HOME },
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout.on("data", (b) => buf.push(b));
  return { proc, output: () => Buffer.concat(buf).toString("utf-8") };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

afterAll(async () => {
  await bunRun(["stop"]);
  await sleep(100);
  rmSync(HOME, { recursive: true, force: true });
});

describe("grapevine cli", () => {
  test("open creates a channel idempotently", async () => {
    const r1 = await bunRun(["open", "test1"]);
    expect(r1.code).toBe(0);
    expect(JSON.parse(r1.stdout).channel.name).toBe("test1");

    const r2 = await bunRun(["open", "test1"]);
    expect(r2.code).toBe(0);
    expect(JSON.parse(r2.stdout).channel.name).toBe("test1");
  });

  test("send appends a message and assigns id", async () => {
    await bunRun(["open", "test2"]);
    const r = await bunRun(["send", "test2", "--from", "alice", "hello"]);
    expect(r.code).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.id).toBe(1);
    expect(parsed.channel).toBe("test2");
    expect(parsed.subscribers).toBe(0);
    expect(parsed.warning).toBe("channel has no subscribers");
  });

  test("send --quiet suppresses stdout on success", async () => {
    await bunRun(["open", "test_quiet"]);
    const r = await bunRun([
      "send",
      "test_quiet",
      "--from",
      "x",
      "--quiet",
      "shh",
    ]);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
  });

  test("GRAPEVINE_FROM provides default alias", async () => {
    await bunRun(["open", "test_env"]);
    // Use bunRun's env merge with a custom override.
    const proc = spawn(process.execPath, [CLI, "send", "test_env", "hi"], {
      env: { ...process.env, GRAPEVINE_HOME: HOME, GRAPEVINE_FROM: "viaenv" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out: Buffer[] = [];
    proc.stdout.on("data", (b) => out.push(b));
    const code: number = await new Promise((r) =>
      proc.on("exit", (c) => r(c ?? -1))
    );
    expect(code).toBe(0);
    const list = await bunRun(["list"]);
    const ch = JSON.parse(list.stdout).channels.find(
      (c: any) => c.name === "test_env"
    );
    expect(ch.message_count).toBe(1);
  });

  test("list shows channels with counts", async () => {
    await bunRun(["open", "test3"]);
    await bunRun(["send", "test3", "--from", "x", "one"]);
    await bunRun(["send", "test3", "--from", "x", "two"]);
    const r = await bunRun(["list"]);
    const data = JSON.parse(r.stdout);
    const ch = data.channels.find((c: any) => c.name === "test3");
    expect(ch).toBeDefined();
    expect(ch.message_count).toBe(2);
  });

  test("tail receives live messages", async () => {
    await bunRun(["open", "test4"]);
    const { proc, output } = spawnTail("test4");
    await sleep(400); // let subscription land
    await bunRun(["send", "test4", "--from", "bob", "live ping"]);
    await sleep(300);
    proc.kill("SIGTERM");
    const lines = output()
      .trim()
      .split("\n")
      .filter((l) => l);
    expect(lines.length).toBe(1);
    const m = JSON.parse(lines[0]);
    expect(m.from).toBe("bob");
    expect(m.text).toBe("live ping");
  });

  test("--from-start replays backlog", async () => {
    await bunRun(["open", "test5"]);
    await bunRun(["send", "test5", "--from", "a", "msg1"]);
    await bunRun(["send", "test5", "--from", "b", "msg2"]);
    const { proc, output } = spawnTail("test5", ["--from-start"]);
    await sleep(400);
    proc.kill("SIGTERM");
    const lines = output()
      .trim()
      .split("\n")
      .filter((l) => l);
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]).text).toBe("msg1");
    expect(JSON.parse(lines[1]).text).toBe("msg2");
  });

  test("two tails get the same message", async () => {
    await bunRun(["open", "test6"]);
    const a = spawnTail("test6");
    const b = spawnTail("test6");
    await sleep(400);
    await bunRun(["send", "test6", "--from", "x", "broadcast"]);
    await sleep(300);
    a.proc.kill("SIGTERM");
    b.proc.kill("SIGTERM");
    const aLines = a
      .output()
      .trim()
      .split("\n")
      .filter((l) => l);
    const bLines = b
      .output()
      .trim()
      .split("\n")
      .filter((l) => l);
    expect(aLines.length).toBe(1);
    expect(bLines.length).toBe(1);
    expect(JSON.parse(aLines[0]).id).toBe(JSON.parse(bLines[0]).id);
  });

  test("close removes the channel and its log", async () => {
    await bunRun(["open", "test7"]);
    await bunRun(["send", "test7", "--from", "x", "before close"]);
    const r = await bunRun(["close", "test7"]);
    expect(r.code).toBe(0);
    expect(existsSync(join(HOME, "channels", "test7.jsonl"))).toBe(false);
  });

  test("invalid channel name rejected", async () => {
    const r = await bunRun(["open", "bad/name"]);
    expect(r.code).not.toBe(0);
  });

  test("who returns subscriber aliases", async () => {
    await bunRun(["open", "test_who"]);
    const a = spawnTail("test_who", ["--as", "alice"]);
    const b = spawnTail("test_who", ["--as", "bob"]);
    await sleep(500);
    const r = await bunRun(["who", "test_who"]);
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.channel).toBe("test_who");
    expect(data.subscribers.sort()).toEqual(["alice", "bob"]);
    expect(data.count).toBe(2);
    a.proc.kill("SIGTERM");
    b.proc.kill("SIGTERM");
  });

  test("pull returns backlog since cursor", async () => {
    await bunRun(["open", "test_pull"]);
    await bunRun(["send", "test_pull", "--from", "x", "one"]);
    await bunRun(["send", "test_pull", "--from", "x", "two"]);
    const r = await bunRun(["pull", "test_pull", "--since", "0"]);
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.messages.length).toBe(2);
    expect(data.cursor).toBe(2);
    // Pull again with cursor at top — no new messages.
    const r2 = await bunRun([
      "pull",
      "test_pull",
      "--since",
      String(data.cursor),
    ]);
    expect(JSON.parse(r2.stdout).messages.length).toBe(0);
  });

  test("wait returns immediately when messages already present", async () => {
    await bunRun(["open", "test_wait_now"]);
    await bunRun(["send", "test_wait_now", "--from", "x", "ready"]);
    const t0 = Date.now();
    const r = await bunRun([
      "wait",
      "test_wait_now",
      "--since",
      "0",
      "--timeout",
      "5",
    ]);
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.messages.length).toBe(1);
    expect(data.timed_out).toBe(false);
    expect(Date.now() - t0).toBeLessThan(2000); // should be immediate
  });

  test("wait blocks then resolves on new message", async () => {
    await bunRun(["open", "test_wait_block"]);
    // Kick off a wait at the current head (no messages yet).
    const waitProc = spawn(
      process.execPath,
      [CLI, "wait", "test_wait_block", "--since", "0", "--timeout", "5"],
      {
        env: { ...process.env, GRAPEVINE_HOME: HOME },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    const out: Buffer[] = [];
    waitProc.stdout.on("data", (b) => out.push(b));
    // Send a message a moment later — give the wait process time to bind
    // and register before the send fires.
    await sleep(800);
    await bunRun(["send", "test_wait_block", "--from", "x", "hi"]);
    const code: number = await new Promise((r) =>
      waitProc.on("exit", (c) => r(c ?? -1))
    );
    expect(code).toBe(0);
    const data = JSON.parse(Buffer.concat(out).toString("utf-8"));
    expect(data.messages.length).toBe(1);
    expect(data.messages[0].text).toBe("hi");
    expect(data.timed_out).toBe(false);
  });

  test("wait times out cleanly with empty messages + unchanged cursor", async () => {
    await bunRun(["open", "test_wait_timeout"]);
    await bunRun(["send", "test_wait_timeout", "--from", "x", "anchor"]);
    const r = await bunRun([
      "wait",
      "test_wait_timeout",
      "--since",
      "1",
      "--timeout",
      "0.4",
    ]);
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.timed_out).toBe(true);
    expect(data.messages.length).toBe(0);
    expect(data.cursor).toBe(1);
  });

  test("open --topic sets the channel topic", async () => {
    const r = await bunRun([
      "open",
      "test_topic_set",
      "--topic",
      "discussing the X feature",
    ]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).channel.topic).toBe("discussing the X feature");
    const t = await bunRun(["topic", "test_topic_set"]);
    expect(JSON.parse(t.stdout).topic).toBe("discussing the X feature");
  });

  test("topic verb updates the channel topic", async () => {
    await bunRun(["open", "test_topic_update"]);
    await bunRun(["topic", "test_topic_update", "first topic"]);
    await bunRun(["topic", "test_topic_update", "second topic"]);
    const r = await bunRun(["topic", "test_topic_update"]);
    expect(JSON.parse(r.stdout).topic).toBe("second topic");
  });

  test("re-opening with a different --topic does not clobber existing topic", async () => {
    await bunRun(["open", "test_topic_noclobber", "--topic", "original"]);
    await bunRun(["open", "test_topic_noclobber", "--topic", "ignored"]);
    const r = await bunRun(["topic", "test_topic_noclobber"]);
    expect(JSON.parse(r.stdout).topic).toBe("original");
  });

  test("who response includes current topic", async () => {
    await bunRun(["open", "test_topic_who", "--topic", "what we're doing"]);
    const r = await bunRun(["who", "test_topic_who"]);
    expect(JSON.parse(r.stdout).topic).toBe("what we're doing");
  });

  test("wait --as registers presence for the wait duration", async () => {
    await bunRun(["open", "test_wait_presence"]);
    // Spawn a wait that will block for 2s, then check who while it's blocked.
    const waitProc = spawn(
      process.execPath,
      [
        CLI,
        "wait",
        "test_wait_presence",
        "--as",
        "polly",
        "--since",
        "0",
        "--timeout",
        "2",
      ],
      {
        env: { ...process.env, GRAPEVINE_HOME: HOME },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    await sleep(400); // let wait register
    const r = await bunRun(["who", "test_wait_presence"]);
    expect(JSON.parse(r.stdout).subscribers).toContain("polly");
    // Wait for the wait to time out.
    await new Promise((res) => waitProc.on("exit", res));
    // After it exits, polly should be gone.
    const r2 = await bunRun(["who", "test_wait_presence"]);
    expect(JSON.parse(r2.stdout).subscribers).not.toContain("polly");
  });

  test("send --stdin reads body from stdin", async () => {
    await bunRun(["open", "test_stdin"]);
    const proc = spawn(
      process.execPath,
      [CLI, "send", "test_stdin", "--from", "x", "--stdin"],
      {
        env: { ...process.env, GRAPEVINE_HOME: HOME },
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    proc.stdin.write(`text with <brackets> & "quotes" & \`backticks\``);
    proc.stdin.end();
    const out: Buffer[] = [];
    proc.stdout.on("data", (b) => out.push(b));
    const code: number = await new Promise((r) =>
      proc.on("exit", (c) => r(c ?? -1))
    );
    expect(code).toBe(0);
    const pulled = await bunRun(["pull", "test_stdin", "--since", "0"]);
    const msg = JSON.parse(pulled.stdout).messages[0];
    expect(msg.text).toBe(`text with <brackets> & "quotes" & \`backticks\``);
  });

  test("send --verbose includes subscriber aliases", async () => {
    await bunRun(["open", "test_verbose"]);
    const a = spawnTail("test_verbose", ["--as", "alice"]);
    await sleep(400);
    const r = await bunRun([
      "send",
      "test_verbose",
      "--from",
      "outside",
      "--verbose",
      "hi",
    ]);
    expect(r.code).toBe(0);
    const data = JSON.parse(r.stdout);
    expect(data.subscriber_aliases).toEqual(["alice"]);
    expect(data.subscribers).toBe(1);
    a.proc.kill("SIGTERM");
  });
});
