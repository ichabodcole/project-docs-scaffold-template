// `pdocs view` (plan Task 2.8): the backlog, the board and the rest are
// DERIVED from fields, never authored. One fixture tree, JSON output.

import { afterAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { ExitCode } from "../envelope.ts";
import { context } from "../lint/rules.ts";
import { childEnv } from "../test-env.ts";
import { collectWork, viewBacklog } from "../work.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");
const PAYLOAD = join(REPO_ROOT, "{{cookiecutter.project_slug}}");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function run(args: string[]) {
  const p = Bun.spawnSync(["bun", CLI, ...args], { cwd: REPO_ROOT, env: childEnv() });
  return { code: p.exitCode, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}

const doc = (fields: Record<string, string>) =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n# X\n`;

let n = 0;
const id = () => `0190f4b2-7c3a-7d4e-8f00-${String(++n).padStart(12, "0")}`;
const IDS: Record<string, string> = {};

const item = (slug: string, lifecycle: string, extra: Record<string, string> = {}, at = "2026-09-01") => {
  IDS[slug] = id();
  return doc({
    type: "item",
    title: slug,
    description: "An item.",
    status: "draft",
    lifecycle,
    id: IDS[slug] as string,
    kind: "task",
    generated: `{ by: test, at: ${at} }`,
    ...extra,
  });
};

const feature = (lifecycle: string, extra: Record<string, string> = {}, at = "2026-09-01") =>
  doc({
    type: "feature",
    title: "F",
    description: "A feature.",
    status: "draft",
    lifecycle,
    generated: `{ by: test, at: ${at} }`,
    ...extra,
  });

const cycle = doc({
  type: "cycle",
  title: "C",
  description: "A cycle.",
  status: "draft",
  lifecycle: "active",
  generated: "{ by: test, at: 2026-09-01 }",
});

function tree(): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-view-"));
  roots.push(root);
  cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
  copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
  const cfg = JSON.parse(readFileSync(join(root, ".project-docs.json"), "utf8"));
  cfg.lint.scopes = ["cli", "lint"];
  writeFileSync(join(root, ".project-docs.json"), JSON.stringify(cfg, null, 2));
  const files: Record<string, string> = {
    "docs/features/auth/feature.md": feature("active", { scope: "cli" }),
    "docs/features/old/feature.md": feature("done", {}, "2026-08-01"),
    "docs/features/shipped/feature.md": feature("done", { released_in: "9.0.0" }),
    "docs/cycles/2026-09-x.md": cycle,
    "docs/cycles/2026-10-y.md": cycle.replace("lifecycle: active", "lifecycle: planned"),
    // unstarted, in a deliberately scrambled order
    "docs/items/b-none.md": item("b-none", "backlog", {}, "2026-09-03"),
    "docs/items/a-low.md": item("a-low", "triage", { priority: "low" }),
    "docs/items/c-urgent-late.md": item("c-urgent-late", "ready", { priority: "urgent" }, "2026-09-05"),
    "docs/items/d-urgent-early.md": item("d-urgent-early", "ready", { priority: "urgent" }, "2026-09-02"),
    "docs/items/e-high.md": item("e-high", "backlog", { priority: "high", parent: "feature/auth", cycle: "2026-09-x" }),
    // started
    "docs/items/f-active.md": item("f-active", "active", { parent: "feature/auth", cycle: "2026-09-x", scope: "cli" }),
    "docs/items/g-review/item.md": item("g-review", "review", { scope: "lint" }),
    // terminal
    "docs/items/h-done.md": item("h-done", "done", { cycle: "2026-10-y" }),
    "docs/items/i-dropped.md": item("i-dropped", "dropped", { cycle: "2026-10-y" }),
    "docs/items/j-released.md": item("j-released", "done", { released_in: "9.0.0" }),
    "docs/items/_archive/k-archived.md": item("k-archived", "done", {}, "2026-07-01"),
  };
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  // `ready` depends on blockers: one ready item blocked by a done one (ready),
  // one blocked by an active one (not ready).
  const readyOk = item("l-ready-unblocked", "ready", { blocked_by: `[${IDS["h-done"]}]` });
  const readyBlocked = item("m-ready-blocked", "ready", { blocked_by: `[${IDS["f-active"]}]` });
  writeFileSync(join(root, "docs/items/l-ready-unblocked.md"), readyOk);
  writeFileSync(join(root, "docs/items/m-ready-blocked.md"), readyBlocked);
  Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
  return root;
}

const ROOT = tree();
const view = (...args: string[]) => run(["view", ...args, "--root", ROOT, "--format", "json"]);
const data = (...args: string[]) => {
  const r = view(...args);
  expect(r.stderr).toBe("");
  expect(r.code).toBe(ExitCode.Success);
  return JSON.parse(r.stdout).data;
};
const slugs = (list: Array<{ slug: string }>) => list.map((e) => e.slug);

describe("pdocs view", () => {
  test("the fixture is clean", () => {
    expect(run(["check", "--root", ROOT, "--format", "text"]).stdout).toContain(
      "docs-lint: clean"
    );
  });

  test("backlog: the unstarted group, by priority, then date, then path", () => {
    expect(slugs(data("backlog").items)).toEqual([
      "d-urgent-early",
      "c-urgent-late",
      "e-high",
      "a-low",
      "l-ready-unblocked",
      "m-ready-blocked",
      "b-none",
    ]);
  });

  test("board: items grouped by state group; --features adds the features", () => {
    const board = data("board");
    expect(Object.keys(board.groups)).toEqual(["unstarted", "started", "completed", "cancelled"]);
    expect(slugs(board.groups.started)).toEqual(["f-active", "g-review"]);
    expect(slugs(board.groups.completed)).toEqual(["h-done", "j-released"]);
    expect(slugs(board.groups.cancelled)).toEqual(["i-dropped"]);
    expect(board.groups.unstarted).toHaveLength(7);
    // the archive stays off the board
    expect(JSON.stringify(board)).not.toContain("k-archived");
    expect(JSON.stringify(board)).not.toContain('"entity":"feature"');

    const withFeatures = data("board", "--features");
    expect(slugs(withFeatures.groups.started)).toEqual(["auth", "f-active", "g-review"]);
    expect(slugs(withFeatures.groups.completed)).toEqual([
      "old",
      "shipped",
      "h-done",
      "j-released",
    ]);
  });

  test("ready: `ready` items whose blockers are all done", () => {
    expect(slugs(data("ready").items)).toEqual([
      "d-urgent-early",
      "c-urgent-late",
      "l-ready-unblocked",
    ]);
  });

  test("feature <slug>: the feature and its items", () => {
    const d = data("feature", "auth");
    expect(d.feature.path).toBe("docs/features/auth/feature.md");
    expect(slugs(d.items)).toEqual(["e-high", "f-active"]);
  });

  test("cycle <slug>: its items, and closable when every one is finished", () => {
    const x = data("cycle", "2026-09-x");
    expect(slugs(x.items)).toEqual(["e-high", "f-active"]);
    expect(x.closable).toBe(false);
    const y = data("cycle", "2026-10-y");
    expect(slugs(y.items)).toEqual(["h-done", "i-dropped"]);
    expect(y.closable).toBe(true);
  });

  test("an empty cycle is not closable (review 5)", () => {
    const root = tree();
    writeFileSync(
      join(root, "docs/cycles/2026-11-empty.md"),
      cycle.replace("lifecycle: active", "lifecycle: planned")
    );
    const r = run(["view", "cycle", "2026-11-empty", "--root", root, "--format", "json"]);
    const d = JSON.parse(r.stdout).data;
    expect(d.items).toEqual([]);
    expect(d.closable).toBe(false);
  });

  test("scope <name>: the features and items in it", () => {
    expect(slugs(data("scope", "cli").items)).toEqual(["auth", "f-active"]);
    expect(slugs(data("scope", "lint").items)).toEqual(["g-review"]);
  });

  test("unreleased [--since]: done features and items with no released_in", () => {
    // Oldest first: the archive is included — archived is not released.
    expect(slugs(data("unreleased").items)).toEqual(["k-archived", "old", "h-done"]);
    expect(slugs(data("unreleased", "--since", "2026-08-15").items)).toEqual(["h-done"]);
  });

  test("released <version>", () => {
    expect(slugs(data("released", "9.0.0").items)).toEqual(["shipped", "j-released"]);
  });

  test("an unknown view exits 2 and lists the views", () => {
    const r = view("roadmap");
    expect(r.code).toBe(ExitCode.Usage);
    expect(JSON.parse(r.stderr).error.choices).toEqual([
      "backlog",
      "board",
      "ready",
      "feature",
      "cycle",
      "scope",
      "unreleased",
      "released",
    ]);
  });

  test("a view that needs an argument says so", () => {
    expect(view("feature").code).toBe(ExitCode.Usage);
    expect(view("feature", "nope").code).toBe(ExitCode.Usage);
    expect(view("unreleased", "--since", "yesterday").code).toBe(ExitCode.Usage);
  });

  test("output is byte-identical across two runs", () => {
    for (const args of [["board", "--features"], ["backlog"], ["cycle", "2026-09-x"]])
      expect(view(...args).stdout).toBe(view(...args).stdout);
  });

  test("the views are pure functions of the model", () => {
    const model = collectWork(context(ROOT));
    expect(slugs(viewBacklog(model))).toEqual(slugs(data("backlog").items));
  });

  test("text output renders", () => {
    const r = run(["view", "board", "--root", ROOT, "--format", "text"]);
    expect(r.code).toBe(ExitCode.Success);
    expect(r.stdout).toContain("started");
    expect(r.stdout).toContain("docs/items/f-active.md");
  });
});
