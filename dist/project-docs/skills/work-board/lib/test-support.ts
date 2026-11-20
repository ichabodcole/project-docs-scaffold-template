// Fixture projects for the bridge and server tests. Not part of the app.
//
// Every spawn here goes through `childEnv()`: a temp project must not inherit
// the git variables a commit hook exports, nor a timezone other than the
// test's own.

import { cpSync, copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { childEnv } from "../../../../../scripts/pdocs/test-env.ts";
import type { PdocsResult } from "./pdocs.ts";

export const REPO_ROOT = resolve(import.meta.dir, "../../../../..");
export const SKILL = resolve(import.meta.dir, "..");
export const BOARD_CLI = join(SKILL, "scripts/cli.ts");
/** The scaffold payload: this repository's `scripts/pdocs/` without its tests, and an empty `docs/`. */
const PAYLOAD = join(REPO_ROOT, "{{cookiecutter.project_slug}}");

const made: string[] = [];

/** Remove every temp folder this file made. Call from `afterAll`. */
export function cleanup(): void {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
}

export function tempDir(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  made.push(dir);
  return dir;
}

export interface Spawned {
  code: number;
  stdout: string;
  stderr: string;
}

export function runIn(argv: string[], cwd: string, extra: Record<string, string | undefined> = {}): Spawned {
  const p = Bun.spawnSync(argv, { cwd, env: childEnv(extra) });
  return { code: p.exitCode, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}

/** Run a project's own `pdocs`. */
export function pdocs(root: string, ...args: string[]): Spawned {
  return runIn(["bun", join(root, "scripts/pdocs/cli.ts"), ...args], root);
}

/**
 * Run the board's CLI with a project (or any folder) as the working directory.
 * Its state folder is `<stateTmp>/pdocs-work-board`, never the machine's own.
 */
export function board(cwd: string, stateTmp: string, ...args: string[]): Spawned {
  return runIn(["bun", BOARD_CLI, ...args], cwd, { XDG_RUNTIME_DIR: stateTmp });
}

/**
 * A real project in a temp folder: the payload's CLI and docs, two items
 * waiting in triage with no `priority`, `parent` or `cycle`, one backlog item,
 * one feature and one planned cycle. Committed, so `git status` shows a write.
 */
export function fixtureProject(): string {
  const root = tempDir("work-board-fx-");
  cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
  copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
  cpSync(join(PAYLOAD, "scripts/pdocs"), join(root, "scripts/pdocs"), { recursive: true });
  for (const args of [
    ["new", "feature", "big-thing"],
    ["new", "cycle", "2026-11-a"],
    ["new", "item", "first-thing", "--kind", "task"],
    ["new", "item", "second-thing", "--kind", "bug"],
    ["new", "item", "settled-thing", "--kind", "task", "--lifecycle", "backlog"],
  ]) {
    const r = pdocs(root, ...args, "--json");
    if (r.code !== 0) throw new Error(`fixture: pdocs ${args.join(" ")} failed: ${r.stderr}`);
  }
  for (const args of [
    ["init", "-q"],
    ["add", "-A"],
    ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "base"],
  ]) {
    const r = runIn(["git", ...args], root);
    if (r.code !== 0) throw new Error(`fixture: git ${args.join(" ")} failed: ${r.stderr}`);
  }
  return root;
}

/** `git status --short` of a fixture: every file a write touched or made. */
export function gitStatus(root: string): string {
  return runIn(["git", "status", "--short", "--untracked-files=all"], root).stdout;
}

// ---- stub CLIs: projects whose pdocs is too old ---------------------------------

const STUB_NO_VIEW = `// A pre-9.0.0 pdocs: it has no \`view\`.
const argv = process.argv.slice(2);
if (argv.includes("--version")) {
  console.log(JSON.stringify({ ok: true, data: { name: "pdocs", version: "8.0.0" }, meta: { command: "version" } }));
} else {
  console.error(JSON.stringify({
    ok: false,
    error: { kind: "usage", exit_code: 2, retryable: false, message: "unknown command \`" + argv[0] + "\`." },
    meta: { command: "pdocs" },
  }));
  process.exitCode = 2;
}
`;

/** An entry as 9.4.1 printed it: no `description`, `from`, `source`, `appetite` or `started`. */
export const OLD_ENTRY = {
  path: "docs/items/old-thing.md",
  entity: "item",
  slug: "old-thing",
  id: "0190f4b2-7c3a-7d4e-8f00-00000000000a",
  title: "Old thing",
  status: "draft",
  kind: "task",
  lifecycle: "triage",
  group: "unstarted",
  priority: null,
  assignee: null,
  parent: null,
  cycle: null,
  scope: null,
  blockedBy: [],
  releasedIn: null,
  archived: false,
  date: "2026-09-22",
};

const STUB_NO_FIELDS = `// A 9.4.1-shaped pdocs: \`view\` works, and its entries lack the board's fields.
const argv = process.argv.slice(2);
const out = (command, data) => console.log(JSON.stringify({ ok: true, data, meta: { command } }));
if (argv.includes("--version")) out("version", { name: "pdocs", version: "9.4.1" });
else if (argv[0] === "view" && argv[1] === "board")
  out("view", { view: "board", groups: { unstarted: [${JSON.stringify(OLD_ENTRY)}], started: [], completed: [], cancelled: [] }, advisories: [] });
else if (argv[0] === "view" && argv[1] === "portfolio") out("view", { view: "portfolio", cycles: [], features: [], advisories: [] });
else if (argv[0] === "view") out("view", { view: argv[1], items: [], advisories: [] });
else process.exitCode = 2;
`;

/** An old CLI in a project that has a cycle and no items: only the cycle entry shows its age. */
const STUB_NO_CYCLE_FIELDS = `// A 9.4.1-shaped pdocs with nothing on the board but a cycle.
const argv = process.argv.slice(2);
const out = (command, data) => console.log(JSON.stringify({ ok: true, data, meta: { command } }));
if (argv.includes("--version")) out("version", { name: "pdocs", version: "9.4.1" });
else if (argv[0] === "view" && argv[1] === "board")
  out("view", { view: "board", groups: { unstarted: [], started: [], completed: [], cancelled: [] }, advisories: [] });
else if (argv[0] === "view" && argv[1] === "portfolio")
  out("view", { view: "portfolio", cycles: [{ entity: "cycle", path: "docs/cycles/c1.md", slug: "c1", title: "C1", lifecycle: "planned", archived: false, current: true, counts: {} }], features: [], advisories: [] });
else if (argv[0] === "view" && argv[1] === "cycle")
  out("view", { view: "cycle", cycle: ${JSON.stringify({ ...OLD_ENTRY, entity: "cycle", slug: "c1", path: "docs/cycles/c1.md", lifecycle: "planned" })}, items: [] });
else if (argv[0] === "view") out("view", { view: argv[1], items: [], advisories: [] });
else process.exitCode = 2;
`;

/** A CLI that never answers: it records its pid in \`stub.pid\` and sleeps. */
const STUB_SLEEP = `await Bun.write("stub.pid", String(process.pid));
await Bun.sleep(120_000);
`;

/** A CLI that prints the arguments it was given, one array element each. */
const STUB_ECHO = `console.log(JSON.stringify({ ok: true, data: { argv: process.argv.slice(2) }, meta: { command: "echo" } }));
`;

const STUBS = {
  "no-view": STUB_NO_VIEW,
  "no-fields": STUB_NO_FIELDS,
  "no-cycle-fields": STUB_NO_CYCLE_FIELDS,
  sleep: STUB_SLEEP,
  echo: STUB_ECHO,
};

/** A project folder whose `scripts/pdocs/cli.ts` is one of the stubs. */
export function stubProject(kind: keyof typeof STUBS): string {
  const root = tempDir(`work-board-${kind}-`);
  writeFileSync(join(root, ".project-docs.json"), JSON.stringify({ docsRoot: "docs", version: "0.0.0" }));
  mkdirSync(join(root, "scripts/pdocs"), { recursive: true });
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "scripts/pdocs/cli.ts"), STUBS[kind]);
  return root;
}

// ---- recorded results -----------------------------------------------------------

export const ok = (data: unknown): PdocsResult => ({ ok: true, data });
export const failed = (exit_code: number, message = "refused", kind = "usage"): PdocsResult => ({
  ok: false,
  kind,
  exit_code,
  message,
});
