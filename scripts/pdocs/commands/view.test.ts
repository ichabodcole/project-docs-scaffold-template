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
import { collectWork, viewBacklog, viewPortfolio } from "../work.ts";

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
      "portfolio",
      "unreviewed",
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

  test("text output shows each id by its shortest unique prefix, never under 12; JSON keeps the full id (D25)", () => {
    // The fixture's ids are a burst: they share their first 24 characters, the
    // way ids minted in one millisecond do. Twelve would print them all alike.
    const idOf = (rel: string) =>
      /\nid: (\S+)/.exec(readFileSync(join(ROOT, rel), "utf8"))![1] as string;
    const full = idOf("docs/items/f-active.md");
    const text = run(["view", "board", "--root", ROOT, "--format", "text"]).stdout;
    const shown = [...text.matchAll(/^ {2}([0-9a-f-]{12,36}) /gm)].map((m) => m[1] as string);
    expect(shown.length).toBeGreaterThan(2);
    expect(new Set(shown).size).toBe(shown.length);
    for (const s of shown) expect(s.length).toBeGreaterThanOrEqual(12);
    expect(shown).toContain(full.slice(0, shown.find((s) => full.startsWith(s))!.length));
    expect(full.startsWith(shown.find((s) => full.startsWith(s))!)).toBe(true);
    expect(JSON.stringify(data("board"))).toContain(full);
  });
});

// `pdocs view portfolio`: current cycles and features, their members counted by
// state group. These pin what is counted and included, and the text layout.
describe("pdocs view portfolio", () => {
  const cycleDoc = (lifecycle: string) => cycle.replace("lifecycle: active", `lifecycle: ${lifecycle}`);

  function portfolioTree(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), "pdocs-portfolio-"));
    roots.push(root);
    cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
    copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    }
    Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
    return root;
  }

  const P = portfolioTree({
    // cycles: two current (one active, one planned), two past, one archived
    "docs/cycles/2026-11-next.md": cycleDoc("planned"),
    "docs/cycles/2026-10-now.md": cycleDoc("active"),
    "docs/cycles/2026-09-abandoned.md": cycleDoc("abandoned"),
    "docs/cycles/_archive/2026-08-old.md": cycleDoc("closed"),
    "docs/cycles/_archive/2026-07-older.md": cycleDoc("closed"),
    // features: current in mixed lifecycles; past done, dropped, archived
    "docs/features/building/feature.md": feature("active", {}, "2026-09-10"),
    "docs/features/reviewing/feature.md": feature("review", {}, "2026-09-11"),
    "docs/features/queued/feature.md": feature("backlog", {}, "2026-09-12"),
    "docs/features/finished/feature.md": feature("done", {}, "2026-08-01"),
    "docs/features/given-up/feature.md": feature("dropped", {}, "2026-08-02"),
    "docs/features/_archive/shelved/feature.md": feature("done", {}, "2026-07-01"),
    "docs/features/_archive/empty-old/feature.md": feature("done", {}, "2026-06-01"),
    // items in the active cycle, some also in a feature
    "docs/items/a.md": item("a", "backlog", { cycle: "2026-10-now", parent: "feature/building" }),
    "docs/items/b.md": item("b", "active", { cycle: "2026-10-now", parent: "feature/building" }),
    "docs/items/c.md": item("c", "review", { cycle: "2026-10-now" }),
    "docs/items/d.md": item("d", "done", { cycle: "2026-10-now", parent: "feature/reviewing" }),
    "docs/items/e.md": item("e", "dropped", { cycle: "2026-10-now" }),
    // an archived item still counts toward its cycle and feature
    "docs/items/_archive/f.md": item("f", "done", { cycle: "2026-08-old", parent: "feature/building" }),
    "docs/items/g.md": item("g", "triage", { parent: "feature/queued" }),
    "docs/items/h.md": item("h", "done", { parent: "feature/finished" }),
    "docs/items/i.md": item("i", "done", { parent: "feature/shelved" }),
    // no parent, no cycle: counted once, in `unattached`, never in an entity
    "docs/items/loose-1.md": item("loose-1", "ready"),
    "docs/items/loose-2.md": item("loose-2", "active"),
    "docs/items/loose-3.md": item("loose-3", "done"),
    // an archived loose item is not counted
    "docs/items/_archive/loose-4.md": item("loose-4", "done"),
  });

  const pf = (root: string, ...args: string[]) => {
    const r = run(["view", "portfolio", ...args, "--root", root, "--format", "json"]);
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    return JSON.parse(r.stdout).data;
  };
  const text = (root: string, ...args: string[]) => {
    const r = run(["view", "portfolio", ...args, "--root", root, "--format", "text"]);
    expect(r.code).toBe(ExitCode.Success);
    return r.stdout;
  };
  const counts = (u: number, s: number, c: number, x: number, other = 0) => ({
    unstarted: u,
    started: s,
    completed: c,
    cancelled: x,
    ungrouped: other,
    total: u + s + c + x + other,
  });
  type Row = { slug: string; current: boolean; archived: boolean; counts: unknown };
  const bySlug = (list: Row[]) => Object.fromEntries(list.map((e) => [e.slug, e]));

  test("default: current cycles (active first, then planned) and current features only", () => {
    const d = pf(P);
    expect(d.view).toBe("portfolio");
    expect(d.all).toBe(false);
    expect(d.activeCycle).toBe(true);
    expect(slugs(d.cycles)).toEqual(["2026-10-now", "2026-11-next"]);
    // started before unstarted; done, dropped and archived features excluded
    expect(slugs(d.features)).toEqual(["building", "reviewing", "queued"]);
    for (const e of [...d.cycles, ...d.features]) {
      expect(e.current).toBe(true);
      expect(e.archived).toBe(false);
    }
  });

  test("JSON carries stable fields for each entity", () => {
    const d = pf(P);
    expect(Object.keys(d)).toEqual([
      "view",
      "all",
      "activeCycle",
      "cycles",
      "features",
      "unattached",
      "advisories",
    ]);
    expect(d.cycles[0]).toEqual({
      entity: "cycle",
      path: "docs/cycles/2026-10-now.md",
      slug: "2026-10-now",
      title: "C",
      lifecycle: "active",
      archived: false,
      current: true,
      counts: counts(1, 2, 1, 1),
    });
    expect(Object.keys(d.features[0])).toEqual(Object.keys(d.cycles[0]));
  });

  test("counts come from `cycle` and `parent`; archived members still count", () => {
    const all = pf(P, "--all");
    const c = bySlug(all.cycles);
    const f = bySlug(all.features);
    expect(c["2026-10-now"]!.counts).toEqual(counts(1, 2, 1, 1));
    expect(c["2026-11-next"]!.counts).toEqual(counts(0, 0, 0, 0));
    expect(c["2026-08-old"]!.counts).toEqual(counts(0, 0, 1, 0));
    // `a`, `b` (in a cycle too) and the archived `f`: an item counts once per summary
    expect(f.building!.counts).toEqual(counts(1, 1, 1, 0));
    expect(f.reviewing!.counts).toEqual(counts(0, 0, 1, 0));
    expect(f.queued!.counts).toEqual(counts(1, 0, 0, 0));
    expect(f.finished!.counts).toEqual(counts(0, 0, 1, 0));
    expect(f.shelved!.counts).toEqual(counts(0, 0, 1, 0));
  });

  test("items with no cycle and no parent are counted apart, archived ones not at all", () => {
    expect(pf(P).unattached).toEqual(counts(1, 1, 1, 0));
  });

  test("--all adds past cycles and features, newest first, marked not current", () => {
    const d = pf(P, "--all");
    expect(d.all).toBe(true);
    expect(slugs(d.cycles)).toEqual([
      "2026-10-now",
      "2026-11-next",
      "2026-09-abandoned",
      "2026-08-old",
      "2026-07-older",
    ]);
    expect(slugs(d.features)).toEqual([
      "building",
      "reviewing",
      "queued",
      "given-up",
      "finished",
      "shelved",
      "empty-old",
    ]);
    const c = bySlug(d.cycles);
    const f = bySlug(d.features);
    expect(c["2026-09-abandoned"]).toMatchObject({ current: false, archived: false, lifecycle: "abandoned" });
    expect(c["2026-08-old"]).toMatchObject({ current: false, archived: true, lifecycle: "closed" });
    expect(f.shelved).toMatchObject({ current: false, archived: true, lifecycle: "done" });
    expect(f["given-up"]).toMatchObject({ current: false, archived: false, lifecycle: "dropped" });
  });

  test("a planned cycle alone is current, but there is no active cycle", () => {
    const root = portfolioTree({ "docs/cycles/2026-11-next.md": cycleDoc("planned") });
    const d = pf(root);
    expect(slugs(d.cycles)).toEqual(["2026-11-next"]);
    expect(d.activeCycle).toBe(false);
    expect(text(root)).toMatch(/no active cycle/i);
  });

  test("an empty tree says so for cycles and features", () => {
    const root = portfolioTree({
      "docs/cycles/_archive/2026-08-old.md": cycleDoc("closed"),
      "docs/features/finished/feature.md": feature("done"),
    });
    const d = pf(root);
    expect(d.cycles).toEqual([]);
    expect(d.features).toEqual([]);
    expect(d.activeCycle).toBe(false);
    expect(d.unattached).toEqual(counts(0, 0, 0, 0));
    const t = text(root);
    expect(t).toMatch(/no current cycle/i);
    expect(t).toMatch(/no current feature/i);
    // the history is still there on request
    expect(slugs(pf(root, "--all").cycles)).toEqual(["2026-08-old"]);
  });

  test("an item in a lifecycle outside the vocabulary counts as ungrouped, and the text says so", () => {
    const root = portfolioTree({
      "docs/cycles/2026-10-now.md": cycleDoc("active"),
      "docs/items/odd.md": item("odd", "someday", { cycle: "2026-10-now" }),
    });
    expect(pf(root).cycles[0].counts).toEqual(counts(0, 0, 0, 0, 1));
    expect(text(root)).toContain(
      "  active             ·        ·          ·          ·  2026-10-now  — C  (+1 in an unknown state)\n"
    );
  });

  test("an archived feature or cycle is never current, even in an open lifecycle", () => {
    // Out of place — the lint reports an open record under `_archive/` — but
    // the view must still not count it as current work.
    const root = portfolioTree({
      "docs/features/live/feature.md": feature("active"),
      "docs/features/_archive/stray/feature.md": feature("active"),
      "docs/features/_archive/stray-ready/feature.md": feature("ready"),
      "docs/cycles/2026-10-now.md": cycleDoc("active"),
      "docs/cycles/_archive/2026-09-stray.md": cycleDoc("active"),
      "docs/cycles/_archive/2026-11-stray-planned.md": cycleDoc("planned"),
    });
    const d = pf(root);
    expect(slugs(d.features)).toEqual(["live"]);
    expect(slugs(d.cycles)).toEqual(["2026-10-now"]);
    const all = pf(root, "--all");
    const f = bySlug(all.features);
    const c = bySlug(all.cycles);
    expect(f.stray).toMatchObject({ current: false, archived: true, lifecycle: "active" });
    expect(f["stray-ready"]).toMatchObject({ current: false, archived: true, lifecycle: "ready" });
    expect(c["2026-09-stray"]).toMatchObject({ current: false, archived: true, lifecycle: "active" });
    expect(c["2026-11-stray-planned"]).toMatchObject({ current: false, archived: true });
  });

  test("a current feature with no items is listed, never folded; only past ones fold", () => {
    const root = portfolioTree({
      "docs/features/empty-now/feature.md": feature("active"),
      "docs/features/empty-then/feature.md": feature("done"),
    });
    const t = text(root, "--all");
    expect(t).toContain(
      "Features (1 active)\n" +
        "  lifecycle  unstarted  started  completed  cancelled  feature\n" +
        "  active             ·        ·          ·          ·  empty-now  — F\n"
    );
    expect(t).toContain("Past features (1 done)\n  1 done feature with no items\n");
    expect(t).not.toContain("empty-then");
  });

  test("text names every entity the JSON does, but folds past features with no items", () => {
    for (const args of [[], ["--all"]]) {
      const d = pf(P, ...args);
      const t = text(P, ...args);
      for (const e of [...d.cycles, ...d.features]) {
        const folded = !e.current && e.entity === "feature" && e.counts.total === 0;
        if (folded) expect(t).not.toContain(e.slug);
        else expect(t).toContain(e.slug);
      }
      if (args.length === 0) expect(t).not.toContain("2026-08-old");
    }
  });

  // The text layout, pinned (settled with Cole, 2026-10-01): count columns
  // first, named as `view board` names its groups; a zero as `·`; slug and
  // title last; past features with no items folded, one line per lifecycle.
  test("text layout: default", () => {
    expect(text(P)).toBe(
      [
        "Cycles (1 active, 1 planned)",
        "  lifecycle  unstarted  started  completed  cancelled  cycle",
        "  active             1        2          1          1  2026-10-now  — C",
        "  planned            ·        ·          ·          ·  2026-11-next  — C",
        "",
        "Features (1 active, 1 review, 1 backlog)",
        "  lifecycle  unstarted  started  completed  cancelled  feature",
        "  active             1        1          1          ·  building  — F",
        "  review             ·        ·          1          ·  reviewing  — F",
        "  backlog            1        ·          ·          ·  queued  — F",
        "",
        "Items in no cycle or feature: 1 unstarted, 1 started, 1 completed, 0 cancelled (archived not counted)",
        "",
      ].join("\n")
    );
  });

  test("text layout: --all adds past cycles and features, folding featureless ones", () => {
    expect(text(P, "--all")).toBe(
      [
        "Cycles (1 active, 1 planned)",
        "  lifecycle  unstarted  started  completed  cancelled  cycle",
        "  active             1        2          1          1  2026-10-now  — C",
        "  planned            ·        ·          ·          ·  2026-11-next  — C",
        "",
        "Features (1 active, 1 review, 1 backlog)",
        "  lifecycle  unstarted  started  completed  cancelled  feature",
        "  active             1        1          1          ·  building  — F",
        "  review             ·        ·          1          ·  reviewing  — F",
        "  backlog            1        ·          ·          ·  queued  — F",
        "",
        "Items in no cycle or feature: 1 unstarted, 1 started, 1 completed, 0 cancelled (archived not counted)",
        "",
        "Past cycles (1 abandoned, 2 closed)",
        "  lifecycle  unstarted  started  completed  cancelled  cycle",
        "  abandoned          ·        ·          ·          ·  2026-09-abandoned  — C",
        "  closed             ·        ·          1          ·  2026-08-old [archived]  — C",
        "  closed             ·        ·          ·          ·  2026-07-older [archived]  — C",
        "",
        "Past features (1 dropped, 3 done)",
        "  lifecycle  unstarted  started  completed  cancelled  feature",
        "  done               ·        ·          1          ·  finished  — F",
        "  done               ·        ·          1          ·  shelved [archived]  — F",
        "  1 dropped feature with no items",
        "  1 done feature with no items (1 archived)",
        "",
      ].join("\n")
    );
  });

  test("text layout: empty states", () => {
    const empty = portfolioTree({});
    expect(text(empty)).toBe(
      [
        "Cycles",
        "  No current cycle — none planned or active.",
        "",
        "Features",
        "  No current feature — none in backlog, ready, active or review.",
        "",
      ].join("\n")
    );
    expect(text(empty, "--all")).toBe(
      [
        "Cycles",
        "  No current cycle — none planned or active.",
        "",
        "Features",
        "  No current feature — none in backlog, ready, active or review.",
        "",
        "Past cycles",
        "  None.",
        "",
        "Past features",
        "  None.",
        "",
      ].join("\n")
    );
    const planned = portfolioTree({ "docs/cycles/2026-11-next.md": cycleDoc("planned") });
    expect(text(planned).split("\n").slice(0, 5)).toEqual([
      "Cycles (1 planned)",
      "  lifecycle  unstarted  started  completed  cancelled  cycle",
      "  planned            ·        ·          ·          ·  2026-11-next  — C",
      "  No active cycle — only planned ones.",
      "",
    ]);
  });

  test("text layout: past features with no items fold even when all of them are empty", () => {
    const root = portfolioTree({
      "docs/features/a/feature.md": feature("done"),
      "docs/features/b/feature.md": feature("done"),
    });
    const t = text(root, "--all");
    expect(t).toContain("Past features (2 done)\n  2 done features with no items\n");
    expect(t).not.toContain("feature\n  2 done");
  });

  test("--all is refused by a view that takes neither of its meanings", () => {
    const r = run(["view", "backlog", "--all", "--root", P, "--format", "json"]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(JSON.parse(r.stderr).error.message).toContain("`view portfolio`");
  });

  test("output is byte-identical across two runs, and the CLI is the pure function", () => {
    expect(text(P, "--all")).toBe(text(P, "--all"));
    const p = viewPortfolio(collectWork(context(P)), { all: true });
    expect(p.cycles.map((e) => e.entity.slug)).toEqual(slugs(pf(P, "--all").cycles));
  });
});
