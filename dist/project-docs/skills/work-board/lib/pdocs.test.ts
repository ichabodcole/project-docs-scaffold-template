import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { childEnv } from "../../../../../scripts/pdocs/test-env.ts";
import {
  findRoot,
  parseResult,
  pdocsArgv,
  pdocsRunner,
  READ_TIMEOUT_MS,
  SET_TIMEOUT_MS,
  SLUG,
  TIMEOUT_EXIT,
} from "./pdocs.ts";
import { cleanup, stubProject, tempDir } from "./test-support.ts";

afterAll(cleanup);

describe("finding the project", () => {
  test("walks up from a subfolder to the first .project-docs.json", () => {
    const root = stubProject("no-fields");
    mkdirSync(join(root, "docs/items/deep"), { recursive: true });
    expect(findRoot(join(root, "docs/items/deep"))).toEqual({
      ok: true,
      root,
      cli: join(root, "scripts/pdocs/cli.ts"),
    });
  });

  test("a folder outside any project is refused", () => {
    const r = findRoot(tempDir("work-board-none-"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain(".project-docs.json");
  });

  test("a project without scripts/pdocs/cli.ts is refused, naming update-project-docs", () => {
    const root = tempDir("work-board-nocli-");
    writeFileSync(join(root, ".project-docs.json"), "{}");
    const r = findRoot(root);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain("scripts/pdocs/cli.ts");
      expect(r.hint).toContain("update-project-docs");
    }
  });
});

describe("reading a finished call", () => {
  test("exit 0 yields the envelope's data", () => {
    const stdout = JSON.stringify({ ok: true, data: { view: "board" }, meta: { command: "view" } });
    expect(parseResult(0, stdout, "")).toEqual({ ok: true, data: { view: "board" } });
  });

  test("a failure keeps kind, exit_code, message and choices from the stderr envelope", () => {
    const stderr = JSON.stringify({
      ok: false,
      error: {
        kind: "usage",
        exit_code: 2,
        retryable: false,
        message: "unknown view `x`",
        choices: ["board", "cycle"],
        details: { token: "x" },
      },
      meta: { command: "view" },
    });
    expect(parseResult(2, "", stderr)).toEqual({
      ok: false,
      kind: "usage",
      exit_code: 2,
      message: "unknown view `x`",
      choices: ["board", "cycle"],
      details: { token: "x" },
    });
  });

  test("a failure that printed no envelope keeps the exit code and the first line", () => {
    expect(parseResult(2, "", "error: unknown command view\nmore\n")).toEqual({
      ok: false,
      kind: "usage",
      exit_code: 2,
      message: "error: unknown command view",
    });
    expect(parseResult(7, "", "")).toEqual({ ok: false, kind: "internal", exit_code: 7, message: "pdocs exited 7." });
  });

  test("exit 0 without an envelope is a fault, not data", () => {
    const r = parseResult(0, "not json", "");
    expect(r.ok).toBe(false);
  });
});

describe("spawning", () => {
  test("the argv is an array ending in --json, with no shell", () => {
    expect(pdocsArgv("/p/scripts/pdocs/cli.ts", ["view", "cycle", "a b; rm -rf /"])).toEqual([
      process.execPath,
      "/p/scripts/pdocs/cli.ts",
      "view",
      "cycle",
      "a b; rm -rf /",
      "--json",
    ]);
  });

  test("runs the project's own CLI and parses both outcomes", async () => {
    const root = stubProject("no-fields");
    const run = pdocsRunner(root, join(root, "scripts/pdocs/cli.ts"), childEnv());
    expect(await run(["--version"])).toEqual({ ok: true, data: { name: "pdocs", version: "9.4.1" } });
    const old = stubProject("no-view");
    const runOld = pdocsRunner(old, join(old, "scripts/pdocs/cli.ts"), childEnv());
    expect(await runOld(["view", "board"])).toEqual({
      ok: false,
      kind: "usage",
      exit_code: 2,
      message: "unknown command `view`.",
    });
  });
});

describe("no shell", () => {
  test("a value full of shell syntax reaches the CLI as one argument, and runs nothing", async () => {
    const root = stubProject("echo");
    const run = pdocsRunner(root, join(root, "scripts/pdocs/cli.ts"), childEnv());
    const hostile = "a b; touch pwned; $(touch pwned) `touch pwned` && touch pwned | cat > pwned";
    const r = await run(["view", "cycle", hostile]);
    expect(r).toEqual({ ok: true, data: { argv: ["view", "cycle", hostile, "--json"] } });
    expect(existsSync(join(root, "pwned"))).toBe(false);
  });
});

describe("a CLI that does not answer", () => {
  const alive = (pid: number): boolean => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  const stubPid = async (root: string): Promise<number> => {
    for (let i = 0; i < 100 && !existsSync(join(root, "stub.pid")); i++) await Bun.sleep(20);
    return Number(readFileSync(join(root, "stub.pid"), "utf8"));
  };

  test("the limits are 10 s for a read and 15 s for a set", () => {
    expect([READ_TIMEOUT_MS, SET_TIMEOUT_MS]).toEqual([10_000, 15_000]);
  });

  test("a read past its limit is killed and comes back as a failure", async () => {
    const root = stubProject("sleep");
    const run = pdocsRunner(root, join(root, "scripts/pdocs/cli.ts"), childEnv(), { read: 400, set: 60_000 });
    const started = Date.now();
    const r = await run(["view", "board"]);
    expect(Date.now() - started).toBeLessThan(5000);
    expect(r).toEqual({
      ok: false,
      kind: "timeout",
      exit_code: TIMEOUT_EXIT,
      message: "`pdocs view board` did not finish within 0.4 s and was stopped.",
    });
    expect(alive(await stubPid(root))).toBe(false);
  });

  test("a set has its own limit, and a hung one does not hold the next call", async () => {
    const root = stubProject("sleep");
    const run = pdocsRunner(root, join(root, "scripts/pdocs/cli.ts"), childEnv(), { read: 60_000, set: 400 });
    const first = await run(["set", "item/x", "--lifecycle", "ready"]);
    expect(first.ok).toBe(false);
    if (!first.ok) expect([first.kind, first.exit_code]).toEqual(["timeout", TIMEOUT_EXIT]);
    const second = await run(["set", "item/x", "--lifecycle", "ready"]);
    expect(second.ok).toBe(false);
  });

  test("killAll stops every live child at once", async () => {
    const root = stubProject("sleep");
    const run = pdocsRunner(root, join(root, "scripts/pdocs/cli.ts"), childEnv());
    const started = Date.now();
    const calls = [run(["view", "board"]), run(["view", "portfolio"])];
    const pid = await stubPid(root);
    expect(alive(pid)).toBe(true);
    run.killAll();
    const results = await Promise.all(calls);
    expect(results.every((r) => !r.ok)).toBe(true);
    expect(Date.now() - started).toBeLessThan(5000);
    expect(alive(pid)).toBe(false);
    run.killAll();
  });
});

test("a slug can never be read as a flag", () => {
  for (const good of ["a", "2026-11-work-board", "x.y_z"]) expect(SLUG.test(good)).toBe(true);
  for (const bad of ["", "-x", "--unset", "a b", "a/b", "a;b", "../x", "a\n"]) expect(SLUG.test(bad)).toBe(false);
});
