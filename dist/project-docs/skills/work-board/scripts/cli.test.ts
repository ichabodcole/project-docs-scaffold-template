// The board end to end: the real CLI and daemon against temp fixture projects.
// Every board started here is stopped in `afterAll`, and its pointer and log
// live in a temp folder of the test's own (TMPDIR), never the machine's.

import { afterAll, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  board,
  cleanup,
  fixtureProject,
  gitStatus,
  pdocs,
  runIn,
  stubProject,
  tempDir,
  type Spawned,
} from "../lib/test-support.ts";
import { childEnv } from "../../../../../scripts/pdocs/test-env.ts";
import { rootKey } from "../lib/state.ts";
import { TOKEN_HEADER } from "./server.ts";

const state = tempDir("work-board-state-");
const stateFiles = (): string[] => {
  const dir = join(state, "pdocs-work-board");
  return existsSync(dir) ? readdirSync(dir) : [];
};
const mode = (path: string): number => lstatSync(path).mode & 0o777;
const started: string[] = [];
const pids: number[] = [];
const open = (root: string): Spawned => {
  started.push(root);
  const r = board(root, state, "open", "--no-browser");
  try {
    pids.push((JSON.parse(r.stdout) as { pid: number }).pid);
  } catch {
    // It refused: there is nothing to stop.
  }
  return r;
};

afterAll(() => {
  for (const root of started) board(root, state, "stop");
  // A test that forged a pointer may have left a server no pointer names.
  for (const pid of pids)
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already gone.
    }
  cleanup();
});

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

interface Opened {
  url: string;
  port: number;
  pid: number;
  root: string;
  reused: boolean;
  log: string;
}

function api(o: Opened, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const token = new URL(o.url).searchParams.get("token") ?? "";
  return fetch(`http://127.0.0.1:${o.port}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { [TOKEN_HEADER]: token, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("open, status, stop", () => {
  test("open starts one board on 127.0.0.1, a second open reuses it, stop ends it", async () => {
    const root = fixtureProject();
    const first = open(root);
    expect(first.stderr).toBe("");
    expect(first.code).toBe(0);
    expect(first.stdout.trim().split("\n").length).toBe(1);
    const o = JSON.parse(first.stdout) as Opened;
    expect(o.root).toBe(root);
    expect(o.reused).toBe(false);
    expect(new URL(o.url).hostname).toBe("127.0.0.1");
    expect(Number(new URL(o.url).port)).toBe(o.port);
    expect(new URL(o.url).searchParams.get("token")).toMatch(/^[0-9a-f]{64}$/);
    expect(alive(o.pid)).toBe(true);

    const page = await fetch(o.url);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("Work board");

    const snap = await api(o, "/api/snapshot");
    expect(snap.status).toBe(200);
    const { data } = (await snap.json()) as { data: { hash: string; snapshot: Record<string, unknown> } };
    expect(Object.keys(data.snapshot)).toEqual(["board", "portfolio", "unreviewed", "cycles"]);
    expect((data.snapshot.cycles as Array<{ slug: string }>).map((c) => c.slug)).toEqual(["2026-11-a"]);

    expect((await fetch(`http://127.0.0.1:${o.port}/api/snapshot`)).status).toBe(401);
    expect((await api(o, "/api/snapshot", undefined, { origin: "http://evil.example" })).status).toBe(403);

    const second = JSON.parse(open(root).stdout) as Opened;
    expect([second.url, second.pid, second.reused]).toEqual([o.url, o.pid, true]);

    // From a subfolder it is the same project, and the same board.
    const status = JSON.parse(board(join(root, "docs"), state, "status").stdout) as Opened & { running: boolean };
    expect([status.running, status.url, status.pid, status.root]).toEqual([true, o.url, o.pid, root]);
    expect(stateFiles().filter((f) => f.endsWith(".json")).length).toBe(1);
    // The state folder is the user's alone, and so are the pointer and the log.
    const dir = join(state, "pdocs-work-board");
    expect(mode(dir)).toBe(0o700);
    expect(mode(join(dir, `${rootKey(root)}.json`))).toBe(0o600);
    expect(o.log).toBe(join(dir, `${rootKey(root)}.log`));
    expect(mode(o.log)).toBe(0o600);
    expect(Object.keys(JSON.parse(readFileSync(join(dir, `${rootKey(root)}.json`), "utf8")))).toEqual([
      "pid", "port", "token", "root", "started",
    ]);
    // The token is taken from the header only.
    const token = new URL(o.url).searchParams.get("token");
    expect((await fetch(`http://127.0.0.1:${o.port}/api/snapshot?token=${token}`)).status).toBe(401);

    const stop = board(root, state, "stop");
    expect(JSON.parse(stop.stdout)).toEqual({ stopped: true, pid: o.pid, root });
    expect(alive(o.pid)).toBe(false);
    // Its pointer and its log go with it.
    expect(stateFiles()).toEqual([]);
    expect(JSON.parse(board(root, state, "status").stdout)).toEqual({ running: false, root });
    expect(JSON.parse(board(root, state, "stop").stdout)).toEqual({ stopped: false, root });
    // Reading wrote nothing into the project.
    expect(gitStatus(root)).toBe("");
  }, 30_000);
});

describe("an old CLI", () => {
  for (const [kind, version, clue] of [
    ["no-view", "8.0.0", "view board --features --all"],
    ["no-fields", "9.4.1", "`description`"],
    ["no-cycle-fields", "9.4.1", "`description`"],
  ] as const)
    test(`${kind}: open refuses with one error naming update-project-docs, and nothing starts`, () => {
      const root = stubProject(kind);
      const before = stateFiles();
      const r = open(root);
      expect(r.code).toBe(6);
      expect(r.stdout).toBe("");
      expect(r.stderr.trim().split("\n").length).toBe(1);
      const { ok, error, meta } = JSON.parse(r.stderr) as {
        ok: boolean;
        error: { kind: string; exit_code: number; retryable: boolean; message: string; hint: string };
        meta: { command: string };
      };
      expect([ok, error.kind, error.exit_code, error.retryable, meta.command]).toEqual([false, "conflict", 6, false, "open"]);
      expect(error.message).toContain(`version ${version}`);
      expect(error.message).toContain(clue);
      expect(error.message).toContain("update-project-docs");
      expect(stateFiles()).toEqual(before);
      expect(JSON.parse(board(root, state, "status").stdout)).toEqual({ running: false, root });
    });
});

describe("refusals of the invocation", () => {
  test("outside a project: exit 5", () => {
    const r = board(tempDir("work-board-nowhere-"), state, "open", "--no-browser");
    expect(r.code).toBe(5);
    expect(r.stdout).toBe("");
    expect((JSON.parse(r.stderr) as { error: { kind: string } }).error.kind).toBe("not_found");
  });

  test("an unknown verb or flag: exit 2, with the choices", () => {
    const dir = tempDir("work-board-usage-");
    const verb = board(dir, state, "restart");
    expect(verb.code).toBe(2);
    expect((JSON.parse(verb.stderr) as { error: { choices: string[] } }).error.choices).toEqual(["open", "status", "stop"]);
    const flag = board(dir, state, "open", "--port", "80");
    expect(flag.code).toBe(2);
    expect((JSON.parse(flag.stderr) as { error: { kind: string } }).error.kind).toBe("usage");
    expect(board(dir, state, "stop", "--no-browser").code).toBe(2);
  });

  test("no verb at all: the usage error on stderr, exit 2, nothing on stdout", () => {
    const r = board(tempDir("work-board-bare-"), state);
    expect(r.code).toBe(2);
    expect(r.stdout).toBe("");
    expect(r.stderr.trim().split("\n").length).toBe(1);
    const { error } = JSON.parse(r.stderr) as {
      error: { kind: string; exit_code: number; message: string; choices: string[] };
    };
    expect([error.kind, error.exit_code, error.choices]).toEqual(["usage", 2, ["open", "status", "stop"]]);
    expect(error.message).toBe("a command is needed — open, status, stop.");
    expect(board(tempDir("work-board-help-"), state, "--help").code).toBe(0);
  });
});

describe("a state folder that is not the board's own", () => {
  const refusedIn = (runtime: string, clue: string) => {
    const root = fixtureProject();
    for (const verb of [["open", "--no-browser"], ["status"], ["stop"]]) {
      const r = board(root, runtime, ...verb);
      expect(r.code).toBe(1);
      expect(r.stdout).toBe("");
      expect(r.stderr.trim().split("\n").length).toBe(1);
      const { error } = JSON.parse(r.stderr) as { error: { kind: string; message: string } };
      expect(error.kind).toBe("internal");
      expect(error.message).toContain(join(runtime, "pdocs-work-board"));
      expect(error.message).toContain(clue);
    }
    expect(runIn(["pgrep", "-f", `server.ts --root ${root}`], root).stdout).toBe("");
    expect(gitStatus(root)).toBe("");
  };

  test("made beforehand with mode 0755: every verb refuses, naming the path, and nothing starts", () => {
    const runtime = tempDir("work-board-open-dir-");
    mkdirSync(join(runtime, "pdocs-work-board"));
    chmodSync(join(runtime, "pdocs-work-board"), 0o755);
    refusedIn(runtime, "0755");
    expect(readdirSync(join(runtime, "pdocs-work-board"))).toEqual([]);
  });

  test("a link to another folder: refused, and nothing is written through it", () => {
    const runtime = tempDir("work-board-linked-dir-");
    const elsewhere = tempDir("work-board-elsewhere-");
    chmodSync(elsewhere, 0o700);
    symlinkSync(elsewhere, join(runtime, "pdocs-work-board"));
    refusedIn(runtime, "not a directory");
    expect(readdirSync(elsewhere)).toEqual([]);
  });

  test("a link where the log should be: open refuses, and the link's target is untouched", () => {
    const runtime = tempDir("work-board-linked-log-");
    const root = fixtureProject();
    const dir = join(runtime, "pdocs-work-board");
    mkdirSync(dir, { mode: 0o700 });
    chmodSync(dir, 0o700);
    const target = join(tempDir("work-board-target-"), "precious");
    writeFileSync(target, "precious");
    symlinkSync(target, join(dir, `${rootKey(root)}.log`));
    const r = board(root, runtime, "open", "--no-browser");
    expect(r.code).toBe(1);
    expect(r.stdout).toBe("");
    expect((JSON.parse(r.stderr) as { error: { message: string } }).error.message).toContain(`${rootKey(root)}.log`);
    expect(readFileSync(target, "utf8")).toBe("precious");
    expect(readdirSync(dir)).toEqual([`${rootKey(root)}.log`]);
  });
});

describe("stop signals only the board that answers as the pointer's own", () => {
  const forge = (root: string, pointer: object) =>
    writeFileSync(join(state, "pdocs-work-board", `${rootKey(root)}.json`), JSON.stringify(pointer), { mode: 0o600 });

  test("a pointer naming another project's board, or another process, stops nothing", async () => {
    const a = fixtureProject();
    const b = fixtureProject();
    const o = JSON.parse(open(a).stdout) as Opened;
    const token = new URL(o.url).searchParams.get("token");
    const real = { pid: o.pid, port: o.port, token, root: a, started: "2026-11-19T00:00:00.000Z" };

    // Project B's pointer names project A's board: the health answer's root is A, not B.
    forge(b, { ...real, root: b });
    expect(JSON.parse(board(b, state, "status").stdout)).toEqual({ running: false, root: b });
    expect(JSON.parse(board(b, state, "stop").stdout)).toEqual({ stopped: false, root: b });
    expect(alive(o.pid)).toBe(true);

    // B's pointer copied whole from A's: the root in it is A's, and B's board it is not.
    forge(b, real);
    expect(JSON.parse(board(b, state, "stop").stdout)).toEqual({ stopped: false, root: b });
    expect(alive(o.pid)).toBe(true);

    // A's pointer names a bystander's pid with the board's port and token: the health answer's pid differs.
    const bystander = Bun.spawn(["sleep", "60"], { env: childEnv() });
    try {
      forge(a, { ...real, pid: bystander.pid });
      expect(JSON.parse(board(a, state, "status").stdout)).toEqual({ running: false, root: a });
      expect(JSON.parse(board(a, state, "stop").stdout)).toEqual({ stopped: false, root: a });
      expect(alive(bystander.pid)).toBe(true);
      expect(alive(o.pid)).toBe(true);
    } finally {
      bystander.kill();
    }

    // A pointer with a URL of its own choosing: the URL printed is rebuilt, never the stored one.
    forge(a, { ...real, url: "http://evil.example/?token=x" });
    const status = JSON.parse(board(a, state, "status").stdout) as Opened;
    expect(status.url).toBe(o.url);
    expect(JSON.parse(board(a, state, "open", "--no-browser").stdout).url).toBe(o.url);
    expect(JSON.parse(board(a, state, "stop").stdout)).toEqual({ stopped: true, pid: o.pid, root: a });
    expect(alive(o.pid)).toBe(false);
  }, 60_000);
});

describe("the two writes, against a fixture project", () => {
  test("each write is one set, and its Undo leaves the file byte-identical", async () => {
    const root = fixtureProject();
    const file = join(root, "docs/items/first-thing.md");
    const original = readFileSync(file, "utf8");
    for (const key of ["priority", "parent", "cycle"]) expect(original).not.toMatch(new RegExp(`^${key}:`, "m"));
    const o = JSON.parse(open(root).stdout) as Opened;
    const write = async (body: unknown) => {
      const res = await api(o, "/api/write", body, { origin: `http://127.0.0.1:${o.port}` });
      return { status: res.status, body: (await res.json()) as { data: { command: string; restore: unknown }; error?: { message: string } } };
    };

    // Refused, with nothing written.
    for (const body of [
      { kind: "triage", ref: "item/x;rm -rf /", lifecycle: "active" },
      { kind: "restore", ref: "item/first-thing", changes: [{ key: "title", before: "x" }] },
      { kind: "restore", ref: "item/first-thing", changes: [{ key: "lifecycle", before: "dropped" }] },
      { kind: "archive", ref: "item/first-thing" },
      { kind: "membership", ref: "item/not-here", cycle: "2026-11-a" },
      { kind: "triage", ref: "item/settled-thing", lifecycle: "dropped" },
    ])
      expect((await write(body)).status).toBeWithin(400, 500);
    const unknownCycle = await write({ kind: "membership", ref: "item/first-thing", cycle: "no-such-cycle" });
    expect(unknownCycle.status).toBe(422);
    expect(unknownCycle.body.error?.message).toContain("no-such-cycle");
    expect(gitStatus(root)).toBe("");

    // Accept to ready, with fields that were absent before.
    const accept = await write({
      kind: "triage",
      ref: "item/first-thing",
      lifecycle: "ready",
      priority: "high",
      parent: "feature/big-thing",
      reviewed: true,
    });
    expect(accept.status).toBe(200);
    expect(accept.body.data.command).toBe(
      "pdocs set item/first-thing --lifecycle ready --priority high --parent feature/big-thing --status stable"
    );
    const written = readFileSync(file, "utf8");
    for (const line of ["lifecycle: ready", "priority: high", "parent: feature/big-thing", "status: stable"])
      expect(written).toContain(line);
    expect(gitStatus(root)).toBe(" M docs/items/first-thing.md\n");
    expect(accept.body.data.restore).toEqual({
      kind: "restore",
      ref: "item/first-thing",
      changes: [
        { key: "lifecycle", before: "triage" },
        { key: "priority", before: null },
        { key: "parent", before: null },
        { key: "status", before: "draft" },
      ],
    });
    expect((await write(accept.body.data.restore)).status).toBe(200);
    expect(readFileSync(file, "utf8")).toBe(original);

    // An Undo is used once.
    expect((await write(accept.body.data.restore)).status).toBe(409);
    expect(readFileSync(file, "utf8")).toBe(original);

    // Accept, then the item is changed from a terminal: the Undo is refused and the file is left alone.
    const stale = await write({ kind: "triage", ref: "item/second-thing", lifecycle: "ready", priority: "high" });
    expect(stale.status).toBe(200);
    expect(pdocs(root, "set", "item/second-thing", "--lifecycle", "active", "--priority", "low", "--json").code).toBe(0);
    const second = join(root, "docs/items/second-thing.md");
    const outside = readFileSync(second, "utf8");
    expect(outside).toContain("lifecycle: active");
    const refusedUndo = await write(stale.body.data.restore);
    expect(refusedUndo.status).toBe(409);
    expect(refusedUndo.body.error?.message).toBe("the item changed since this write; Undo is no longer available.");
    expect(readFileSync(second, "utf8")).toBe(outside);
    runIn(["git", "checkout", "-q", "docs/items/second-thing.md"], root);

    // Drop, then Undo.
    const drop = await write({ kind: "triage", ref: "item/first-thing", lifecycle: "dropped" });
    expect(drop.status).toBe(200);
    expect(readFileSync(file, "utf8")).toContain("lifecycle: dropped");
    expect((await write(drop.body.data.restore)).status).toBe(200);
    expect(readFileSync(file, "utf8")).toBe(original);

    // Bring in, then Undo; then bring in, take out.
    const bring = await write({ kind: "membership", ref: "item/first-thing", cycle: "2026-11-a" });
    expect(bring.status).toBe(200);
    expect(readFileSync(file, "utf8")).toContain("cycle: 2026-11-a");
    expect((await write(bring.body.data.restore)).status).toBe(200);
    expect(readFileSync(file, "utf8")).toBe(original);
    await write({ kind: "membership", ref: "item/first-thing", cycle: "2026-11-a" });
    const out = await write({ kind: "membership", ref: "item/first-thing", cycle: null });
    expect(out.body.data.command).toBe("pdocs set item/first-thing --unset cycle");
    expect(readFileSync(file, "utf8")).toBe(original);

    // The whole project is as it was: no changed file and no new one.
    expect(gitStatus(root)).toBe("");
    // Each write is one `pdocs set` in the log; the refusals spawned none.
    const log = readFileSync(o.log, "utf8");
    expect(log.split("\n").filter((l) => l.includes(" spawn pdocs set ")).length).toBe(10);
    expect(o.log.startsWith(root)).toBe(false);

    board(root, state, "stop");
    expect(alive(o.pid)).toBe(false);
    // The fixture's own CLI agrees nothing moved.
    expect(pdocs(root, "view", "board", "--json").stdout).toContain('"lifecycle": "triage"');
  }, 60_000);
});
