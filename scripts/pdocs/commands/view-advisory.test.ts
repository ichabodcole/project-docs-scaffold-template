// The archive advisory: a live view that lists a type whose unarchived finished
// work exceeds `checks.archive.threshold` says so, once, in text and JSON —
// and lists, exits and writes exactly as it would without it.
//
// Real temp trees and the real CLI, in the style of `view.test.ts`. The cycle
// counting cases call the advisory function over a model read from a real
// tree; `view portfolio`, which lists cycles, is exercised through the CLI.

import { afterAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  ARCHIVE_ADVISORY,
  ARCHIVE_WHY_HIDDEN,
  ARCHIVE_WHY_LIVE,
  BAD_CONFIG_ADVISORY,
  archiveAdvisory,
} from "../advisories.ts";
import { loadConfig } from "../docs-lint/config.ts";
import { ExitCode } from "../envelope.ts";
import { context } from "../lint/rules.ts";
import { childEnv } from "../test-env.ts";
import { collectWork } from "../work.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");
const PAYLOAD = join(REPO_ROOT, "{{cookiecutter.project_slug}}");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function run(root: string, args: string[]) {
  const p = Bun.spawnSync(["bun", CLI, ...args, "--root", root], {
    cwd: REPO_ROOT,
    env: childEnv(),
  });
  return { code: p.exitCode, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}

const doc = (fields: Record<string, string>) =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n# X\n`;

let n = 0;
const nextId = () => `0190f4b2-7c3a-7d4e-8f00-${String(++n).padStart(12, "0")}`;

const itemDoc = (slug: string, lifecycle: string, at = "2026-09-01") =>
  doc({
    type: "item",
    title: slug,
    description: "An item.",
    // Reviewed, so open items here say nothing about review: these cases
    // are about archiving alone.
    status: "stable",
    lifecycle,
    id: nextId(),
    kind: "task",
    generated: `{ by: test, at: ${at} }`,
  });

const featureDoc = (slug: string, lifecycle: string) =>
  doc({
    type: "feature",
    title: slug,
    description: "A feature.",
    status: "draft",
    lifecycle,
    generated: "{ by: test, at: 2026-09-01 }",
  });

const cycleDoc = (slug: string, lifecycle: string) =>
  doc({
    type: "cycle",
    title: slug,
    description: "A cycle.",
    status: "draft",
    lifecycle,
    generated: "{ by: test, at: 2026-09-01 }",
  });

/** How many of each state, per type. `archived` counts land in `_archive/`. */
interface Shape {
  items?: Record<string, number>;
  archivedItems?: number;
  features?: Record<string, number>;
  archivedFeatures?: number;
  cycles?: Record<string, number>;
  archivedCycles?: number;
  /** `.project-docs.json`'s `checks`, as written. Omitted: no `checks` key. */
  checks?: unknown;
}

function tree(shape: Shape): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-advisory-"));
  roots.push(root);
  cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
  copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
  if (shape.checks !== undefined) setChecks(root, shape.checks);
  const files: Record<string, string> = {};
  for (const [state, count] of Object.entries(shape.items ?? {}))
    for (let i = 0; i < count; i++)
      files[`docs/items/${state}-${i}.md`] = itemDoc(`${state}-${i}`, state);
  for (let i = 0; i < (shape.archivedItems ?? 0); i++)
    files[`docs/items/_archive/old-${i}.md`] = itemDoc(`old-${i}`, i % 2 ? "dropped" : "done");
  for (const [state, count] of Object.entries(shape.features ?? {}))
    for (let i = 0; i < count; i++)
      files[`docs/features/f-${state}-${i}/feature.md`] = featureDoc(`f-${state}-${i}`, state);
  for (let i = 0; i < (shape.archivedFeatures ?? 0); i++)
    files[`docs/features/_archive/f-old-${i}/feature.md`] = featureDoc(`f-old-${i}`, "done");
  for (const [state, count] of Object.entries(shape.cycles ?? {}))
    for (let i = 0; i < count; i++)
      files[`docs/cycles/2026-01-${state}-${i}.md`] = cycleDoc(`${state}-${i}`, state);
  for (let i = 0; i < (shape.archivedCycles ?? 0); i++)
    files[`docs/cycles/_archive/2025-01-old-${i}.md`] = cycleDoc(`old-${i}`, "closed");
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
  return root;
}

function setChecks(root: string, checks: unknown): void {
  const path = join(root, ".project-docs.json");
  const cfg = JSON.parse(readFileSync(path, "utf8"));
  if (checks === undefined) delete cfg.checks;
  else cfg.checks = checks;
  writeFileSync(path, JSON.stringify(cfg, null, 2));
}

const threshold = (root: string, t: unknown) => setChecks(root, { archive: { threshold: t } });

function board(root: string, ...args: string[]) {
  const r = run(root, ["view", "board", ...args, "--format", "json"]);
  expect(r.stderr).toBe("");
  expect(r.code).toBe(ExitCode.Success);
  return JSON.parse(r.stdout).data;
}

/** The types the board's advisory names, with their counts. */
const advised = (root: string, ...args: string[]): Record<string, number> => {
  const { advisories } = board(root, ...args);
  expect(advisories.length).toBeLessThanOrEqual(1);
  return Object.fromEntries(
    (advisories[0]?.types ?? []).map((t: { type: string; count: number }) => [t.type, t.count])
  );
};

/** Every file under `root` but `.git`, with its bytes. */
function snapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === ".git") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else out[p] = readFileSync(p, "utf8");
    }
  };
  walk(root);
  return out;
}

describe("the archive threshold setting", () => {
  test("omitted — the setting or the whole section — defaults to 25", () => {
    const root = tree({});
    expect(loadConfig(root).checks.archive.threshold).toBe(25);
    setChecks(root, {});
    expect(loadConfig(root).checks.archive.threshold).toBe(25);
    setChecks(root, { archive: {} });
    expect(loadConfig(root).checks.archive.threshold).toBe(25);
    expect(loadConfig(root).issues).toEqual([]);
  });

  test("a nonnegative integer is taken as written: 0, 10, 25, 100", () => {
    const root = tree({});
    for (const t of [0, 10, 25, 100]) {
      threshold(root, t);
      expect(loadConfig(root).checks.archive.threshold).toBe(t);
      expect(loadConfig(root).issues).toEqual([]);
    }
  });

  test("an invalid explicit value is an issue, never silently replaced", () => {
    const root = tree({});
    for (const bad of [-1, 2.5, "25", null, true, [25]]) {
      threshold(root, bad);
      const cfg = loadConfig(root);
      expect(cfg.issues.map((i) => i.key)).toEqual(["checks.archive.threshold"]);
      expect(cfg.issues[0]!.value).toEqual(bad);
    }
    setChecks(root, []);
    expect(loadConfig(root).issues.map((i) => i.key)).toEqual(["checks"]);
    setChecks(root, { archive: 25 });
    expect(loadConfig(root).issues.map((i) => i.key)).toEqual(["checks.archive"]);
  });

  test("an unknown key inside checks.archive is an issue; so is an unknown section beside it, which stops nothing", () => {
    const root = tree({});
    setChecks(root, { archive: { treshold: 3 } });
    let cfg = loadConfig(root);
    expect(cfg.issues).toEqual([
      { key: "checks.archive.treshold", value: 3, expected: "no such key; checks.archive takes threshold" },
    ]);
    expect(cfg.checks.archive.threshold).toBe(25);
    // A section this version does not know is an issue too — a typo or a
    // version mismatch — and does not stop `archive` from being read.
    setChecks(root, { futureCheck: { mode: "strict" }, archive: { threshold: 7 } });
    cfg = loadConfig(root);
    expect(cfg.issues.map((i) => i.key)).toEqual(["checks.futureCheck"]);
    expect(cfg.checks.archive.threshold).toBe(7);
  });

  test("an invalid value never takes the view down: a bad-config advisory replaces the archive advice", () => {
    const root = tree({ items: { done: 30 } });
    threshold(root, -1);
    const before = snapshot(root);

    const json = run(root, ["view", "board", "--format", "json"]);
    expect(json.code).toBe(ExitCode.Success);
    expect(json.stderr).toBe("");
    const data = JSON.parse(json.stdout).data;
    expect(data.groups.completed).toHaveLength(30);
    expect(data.advisories).toHaveLength(1);
    const [a] = data.advisories;
    expect(a.id).toBe(BAD_CONFIG_ADVISORY);
    expect(a.id).toBe("bad-config");
    expect(a.issues).toEqual([
      {
        key: "checks.archive.threshold",
        value: -1,
        expected: "a nonnegative integer; omit it for the default, 25",
      },
    ]);
    expect(a.message).toBe(
      ".project-docs.json: `checks.archive.threshold` is -1, expected a nonnegative integer; omit it for the default, 25."
    );
    expect(a.refs).toBeUndefined();
    expect(JSON.stringify(data.advisories)).not.toContain("archive-threshold");

    const text = run(root, ["view", "board", "--format", "text"]);
    expect(text.code).toBe(ExitCode.Success);
    expect(text.stdout).toContain(`advisory (bad-config): ${a.message}`);
    expect(text.stdout).toContain(`  next: ${a.action}`);
    expect(text.stdout).not.toContain("archive-threshold");

    const check = run(root, ["check", "--format", "text"]);
    expect(check.code).toBe(9);
    expect(check.stdout).toContain(
      "BAD CONFIG  .project-docs.json: checks.archive.threshold is -1  (expected a nonnegative integer; omit it for the default, 25)"
    );
    expect(snapshot(root)).toEqual(before);
  });

  test("a misspelt archive key is a bad-config advisory and a BAD CONFIG finding", () => {
    const root = tree({ items: { done: 30 } });
    setChecks(root, { archive: { treshold: 3 } });
    const [a, ...rest] = board(root).advisories;
    expect(rest).toEqual([]);
    expect(a.id).toBe("bad-config");
    expect(a.issues.map((i: { key: string }) => i.key)).toEqual(["checks.archive.treshold"]);
    const check = run(root, ["check", "--format", "text"]);
    expect(check.code).toBe(9);
    expect(check.stdout).toContain("BAD CONFIG  .project-docs.json: checks.archive.treshold is 3");
  });

  test("every malformed shape of the section is reported, not refused", () => {
    const root = tree({ items: { done: 1 } });
    for (const [checks, key] of [
      [[], "checks"],
      [{ archive: 25 }, "checks.archive"],
      [{ archive: { threshold: "25" } }, "checks.archive.threshold"],
    ] as const) {
      setChecks(root, checks);
      const [a] = board(root).advisories;
      expect(a.id).toBe("bad-config");
      expect(a.issues[0].key).toBe(key);
    }
  });

  test("a view that does not advise still runs under an invalid value", () => {
    const root = tree({ items: { backlog: 1 } });
    threshold(root, "lots");
    expect(run(root, ["view", "backlog", "--format", "json"]).code).toBe(ExitCode.Success);
  });
});

describe("pdocs view board: the archive advisory", () => {
  test("default threshold: 25 finished items give none, 26 give one", () => {
    const at = tree({ items: { done: 20, dropped: 5, active: 3 } });
    expect(board(at).advisories).toEqual([]);
    const over = tree({ items: { done: 21, dropped: 5, active: 3 } });
    expect(advised(over)).toEqual({ item: 26 });
  });

  test("below, at and above a custom threshold, for items and for features", () => {
    const root = tree({ items: { done: 6, dropped: 4 }, features: { done: 7, dropped: 3 } });
    // 10 finished items and 10 finished features.
    threshold(root, 11);
    expect(advised(root, "--features")).toEqual({});
    threshold(root, 10);
    expect(advised(root, "--features")).toEqual({});
    threshold(root, 9);
    expect(advised(root, "--features")).toEqual({ item: 10, feature: 10 });
    // Without --features the board lists no features, and advises on none.
    expect(advised(root)).toEqual({ item: 10 });
  });

  test("custom limits of 10, 25 and 100", () => {
    const root = tree({ items: { done: 101 }, features: { done: 26 } });
    threshold(root, 10);
    expect(advised(root, "--features")).toEqual({ item: 101, feature: 26 });
    threshold(root, 25);
    expect(advised(root, "--features")).toEqual({ item: 101, feature: 26 });
    threshold(root, 100);
    expect(advised(root, "--features")).toEqual({ item: 101 });
    threshold(root, 101);
    expect(advised(root, "--features")).toEqual({});
  });

  test("zero advises on any unarchived finished work, and not on none", () => {
    const one = tree({ items: { dropped: 1, ready: 2 }, archivedItems: 3 });
    threshold(one, 0);
    expect(advised(one)).toEqual({ item: 1 });
    const none = tree({ items: { ready: 2, active: 1 }, archivedItems: 3 });
    threshold(none, 0);
    expect(board(none).advisories).toEqual([]);
  });

  test("only done and dropped count; open work never does", () => {
    const root = tree({
      items: { triage: 2, backlog: 2, ready: 2, active: 2, review: 2, done: 2, dropped: 1 },
      features: { backlog: 2, ready: 2, active: 2, review: 2, done: 1, dropped: 2 },
    });
    threshold(root, 0);
    expect(advised(root, "--features")).toEqual({ item: 3, feature: 3 });
  });

  test("archived records do not contribute", () => {
    const root = tree({
      items: { done: 25 },
      archivedItems: 40,
      features: { done: 25 },
      archivedFeatures: 40,
    });
    expect(board(root, "--features").advisories).toEqual([]);
    expect(board(root, "--features", "--all").advisories).toEqual([]);
  });

  test("the JSON advisory: a stable id, and per type the count, threshold, remediation and candidates", () => {
    const root = tree({ items: { done: 2, dropped: 1 }, features: { done: 1 } });
    threshold(root, 0);
    const [a, ...rest] = board(root, "--features").advisories;
    expect(rest).toEqual([]);
    expect(a.id).toBe(ARCHIVE_ADVISORY);
    expect(a.id).toBe("archive-threshold");
    expect(a.setting).toBe("checks.archive.threshold");
    expect(a.threshold).toBe(0);
    expect(a.message).toContain("3 finished items and 1 finished feature are not archived");
    expect(a.action).toContain("pdocs archive");
    // `refs`: the shared field every advisory about entities fills — here every
    // type's candidates, in type order.
    expect(a.refs).toEqual(["item/done-0", "item/done-1", "item/dropped-0", "feature/f-done-0"]);
    expect(a.refs).toEqual(a.types.flatMap((t: { candidates: string[] }) => t.candidates));
    expect(a.types).toEqual([
      {
        type: "item",
        count: 3,
        threshold: 0,
        lifecycles: ["done", "dropped"],
        remediation: expect.stringContaining("pdocs archive item/<slug>"),
        candidates: ["item/done-0", "item/done-1", "item/dropped-0"],
      },
      {
        type: "feature",
        count: 1,
        threshold: 0,
        lifecycles: ["done", "dropped"],
        remediation: expect.stringContaining("pdocs archive feature/<slug>"),
        candidates: ["feature/f-done-0"],
      },
    ]);
  });

  test("candidates (and refs) are oldest first by generated.at, not by path", () => {
    const root = tree({});
    const files: Record<string, string> = {
      "docs/items/a-new.md": itemDoc("a-new", "done", "2026-09-20"),
      "docs/items/b-old.md": itemDoc("b-old", "dropped", "2026-01-05"),
      "docs/items/c-mid.md": itemDoc("c-mid", "done", "2026-05-01"),
    };
    for (const [rel, body] of Object.entries(files)) writeFileSync(join(root, rel), body);
    threshold(root, 0);
    const [a] = board(root).advisories;
    expect(a.types[0].candidates).toEqual(["item/b-old", "item/c-mid", "item/a-new"]);
    expect(a.refs).toEqual(["item/b-old", "item/c-mid", "item/a-new"]);
  });

  test("text and JSON say the same thing, once — never a line per entity", () => {
    const root = tree({ items: { done: 30, active: 1 }, features: { dropped: 27 } });
    const [a] = board(root, "--features").advisories;
    const text = run(root, ["view", "board", "--features", "--format", "text"]);
    expect(text.code).toBe(ExitCode.Success);
    expect(text.stderr).toBe("");
    const lines = text.stdout.trimEnd().split("\n");
    const adv = lines.filter((l) => l.startsWith("advisory"));
    expect(adv).toEqual([`advisory (archive-threshold): ${a.message}`]);
    expect(a.message).toContain("30 finished items and 27 finished features");
    expect(a.message).toContain("over the threshold of 25");
    expect(lines.at(-1)).toBe(`  next: ${a.action}`);
    // The candidates are data; the text never lists them.
    expect(text.stdout).not.toContain("item/done-0");
  });

  test("no advisory, no advisory text", () => {
    const root = tree({ items: { done: 3 } });
    const text = run(root, ["view", "board", "--format", "text"]).stdout;
    expect(text).not.toContain("advisory");
  });

  test("the advisory leaves the board's membership alone, exits 0 and writes nothing", () => {
    const root = tree({ items: { done: 5, dropped: 2, active: 1 }, features: { done: 2 } });
    const before = snapshot(root);
    threshold(root, 1000);
    const quiet = board(root, "--features");
    threshold(root, 0);
    const before2 = snapshot(root);
    const loud = board(root, "--features");
    expect(quiet.advisories).toEqual([]);
    expect(loud.advisories).toHaveLength(1);
    expect(loud.groups).toEqual(quiet.groups);
    expect(snapshot(root)).toEqual(before2);
    expect(Object.keys(snapshot(root))).toEqual(Object.keys(before));
  });
});

describe("cycles: counted against the same threshold", () => {
  // The function `view portfolio` calls, over a model read from a real tree.
  const model = (shape: Shape) => collectWork(context(tree(shape)));

  test("closed and abandoned count; planned, active and archived do not", () => {
    const m = model({ cycles: { closed: 2, abandoned: 1, planned: 1, active: 1 }, archivedCycles: 5 });
    expect(archiveAdvisory(m, ["cycle"], 3)).toBeNull();
    const a = archiveAdvisory(m, ["cycle"], 2)!;
    expect(a.types.map((t) => [t.type, t.count, t.lifecycles])).toEqual([
      ["cycle", 3, ["closed", "abandoned"]],
    ]);
    expect(a.types[0]!.candidates).toEqual([
      "cycle/2026-01-abandoned-0",
      "cycle/2026-01-closed-0",
      "cycle/2026-01-closed-1",
    ]);
    expect(a.message).toContain("3 finished cycles are not archived");
  });

  test("one advisory names every type over the threshold, in the order asked", () => {
    const m = model({ items: { done: 4 }, features: { done: 2 }, cycles: { closed: 4 } });
    const a = archiveAdvisory(m, ["feature", "cycle", "item"], 3)!;
    expect(a.types.map((t) => t.type)).toEqual(["cycle", "item"]);
    expect(a.message).toContain("4 finished cycles and 4 finished items are not archived");
    const three = archiveAdvisory(m, ["item", "feature", "cycle"], 1)!;
    expect(three.message).toContain(
      "4 finished items, 2 finished features and 4 finished cycles are not archived"
    );
  });
});

describe("live views hide archived work unless --all asks", () => {
  const scoped = () => {
    const root = tree({});
    const cfg = JSON.parse(readFileSync(join(root, ".project-docs.json"), "utf8"));
    cfg.lint.scopes = ["cli"];
    writeFileSync(join(root, ".project-docs.json"), JSON.stringify(cfg, null, 2));
    const files: Record<string, string> = {
      "docs/items/live.md": itemDoc("live", "done").replace("kind: task", "kind: task\nscope: cli"),
      "docs/items/_archive/gone.md": itemDoc("gone", "done").replace(
        "kind: task",
        "kind: task\nscope: cli"
      ),
    };
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    }
    return root;
  };
  const slugs = (r: { stdout: string }) =>
    JSON.parse(r.stdout).data.items.map((e: { slug: string }) => e.slug);

  test("view scope leaves the archive out; --all puts it back", () => {
    const root = scoped();
    expect(slugs(run(root, ["view", "scope", "cli", "--format", "json"]))).toEqual(["live"]);
    expect(slugs(run(root, ["view", "scope", "cli", "--all", "--format", "json"]))).toEqual([
      "gone",
      "live",
    ]);
  });

  test("view board --all lists archived items; the advisory still counts only unarchived", () => {
    const root = tree({ items: { done: 2 }, archivedItems: 2 });
    threshold(root, 1);
    expect(board(root).groups.completed).toHaveLength(2);
    const all = board(root, "--all");
    expect(all.groups.completed.length + all.groups.cancelled.length).toBe(4);
    expect(all.advisories[0].types[0].count).toBe(2);
  });

  test("--all is refused where a view has no archive to add", () => {
    const root = tree({});
    for (const v of [["backlog"], ["ready"], ["unreleased"], ["released", "1.0.0"]]) {
      const r = run(root, ["view", ...v, "--all", "--format", "json"]);
      expect(r.code).toBe(ExitCode.Usage);
    }
  });

  test("find is a query: it returns archived records and carries no advisory", () => {
    const root = tree({ items: { done: 30 }, archivedItems: 2 });
    const r = run(root, ["find", "--type", "item", "--format", "json"]);
    expect(r.code).toBe(ExitCode.Success);
    const data = JSON.parse(r.stdout).data;
    expect(data.count).toBe(32);
    expect(data.advisories).toBeUndefined();
    expect(r.stdout).not.toContain("archive-threshold");
  });

  test("every view carries `advisories`, empty where it has none", () => {
    const root = tree({ items: { done: 3, backlog: 1 }, features: { done: 1 }, cycles: { active: 1 } });
    const cfg = JSON.parse(readFileSync(join(root, ".project-docs.json"), "utf8"));
    cfg.lint.scopes = ["cli"];
    writeFileSync(join(root, ".project-docs.json"), JSON.stringify(cfg, null, 2));
    for (const v of [
      ["board"],
      ["backlog"],
      ["ready"],
      ["scope", "cli"],
      ["feature", "f-done-0"],
      ["cycle", "2026-01-active-0"],
      ["unreleased"],
      ["released", "1.0.0"],
      ["portfolio"],
      ["portfolio", "--all"],
    ]) {
      const r = run(root, ["view", ...v, "--format", "json"]);
      expect([v, r.code]).toEqual([v, ExitCode.Success]);
      expect([v, JSON.parse(r.stdout).data.advisories]).toEqual([v, []]);
    }
  });
});

describe("pdocs view portfolio: the archive advisory", () => {
  function portfolio(root: string, ...args: string[]) {
    const r = run(root, ["view", "portfolio", ...args, "--format", "json"]);
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    return JSON.parse(r.stdout).data;
  }

  test("under the threshold it carries `advisories: []` and prints none", () => {
    const root = tree({ features: { done: 25, active: 1 }, cycles: { closed: 25, active: 1 } });
    expect(portfolio(root).advisories).toEqual([]);
    expect(run(root, ["view", "portfolio", "--format", "text"]).stdout).not.toContain("advisory");
  });

  test("advises on features and cycles, never items, in the wording for a view that hides finished work", () => {
    const root = tree({
      items: { done: 5 },
      features: { done: 3, dropped: 1, active: 1 },
      cycles: { closed: 2, abandoned: 1, active: 1 },
      archivedFeatures: 4,
      archivedCycles: 4,
    });
    threshold(root, 2);
    const data = portfolio(root);
    // the listing is unchanged: finished features and cycles stay out by default
    expect(data.features.map((e: { slug: string }) => e.slug)).toEqual(["f-active-0"]);
    expect(data.advisories).toHaveLength(1);
    const [a] = data.advisories;
    expect(a.id).toBe(ARCHIVE_ADVISORY);
    expect(a.types.map((t: { type: string; count: number }) => [t.type, t.count])).toEqual([
      ["feature", 4],
      ["cycle", 3],
    ]);
    expect(a.message).toBe(
      "4 finished features and 3 finished cycles are not archived, over the threshold of 2 " +
        `(checks.archive.threshold). ${ARCHIVE_WHY_HIDDEN} Archiving preserves their records and updates links.`
    );
    expect(a.message).not.toContain(ARCHIVE_WHY_LIVE);
    // the same advisory under --all
    expect(portfolio(root, "--all").advisories).toEqual(data.advisories);

    // text: the advisory comes last, after a blank line, said once
    const text = run(root, ["view", "portfolio", "--format", "text"]).stdout;
    expect(text.endsWith(`\n\nadvisory (archive-threshold): ${a.message}\n  next: ${a.action}\n`)).toBe(
      true
    );
    expect(text.split("advisory (").length).toBe(2);
  });

  test("the board keeps the live-view wording", () => {
    const root = tree({ items: { done: 3 } });
    threshold(root, 1);
    expect(board(root).advisories[0].message).toContain(ARCHIVE_WHY_LIVE);
  });

  test("a bad threshold gives a bad-config advisory, and the portfolio still lists", () => {
    const root = tree({ features: { done: 30, active: 1 }, cycles: { active: 1 } });
    threshold(root, -1);
    const data = portfolio(root);
    expect(data.features.map((e: { slug: string }) => e.slug)).toEqual(["f-active-0"]);
    expect(data.cycles).toHaveLength(1);
    expect(data.advisories.map((x: { id: string }) => x.id)).toEqual([BAD_CONFIG_ADVISORY]);
    const text = run(root, ["view", "portfolio", "--format", "text"]);
    expect(text.code).toBe(ExitCode.Success);
    expect(text.stdout).toContain("advisory (bad-config): ");
  });
});

describe("--all: one option, a meaning per view", () => {
  test("help documents both meanings in one entry", () => {
    const r = run(tree({}), ["view", "--help", "--format", "text"]);
    const lines = r.stdout.split("\n").filter((l) => l.trimStart().startsWith("--all"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("board, scope, unreviewed: include archived work");
    expect(lines[0]).toContain("portfolio: add past cycles and features");
  });

  test("board, scope, unreviewed and portfolio take it; any other view refuses it, naming them", () => {
    const root = tree({ features: { active: 1 } });
    const cfg = JSON.parse(readFileSync(join(root, ".project-docs.json"), "utf8"));
    cfg.lint.scopes = ["cli"];
    writeFileSync(join(root, ".project-docs.json"), JSON.stringify(cfg, null, 2));
    for (const v of [["board"], ["scope", "cli"], ["unreviewed"], ["portfolio"]])
      expect([v, run(root, ["view", ...v, "--all", "--format", "json"]).code]).toEqual([
        v,
        ExitCode.Success,
      ]);
    for (const v of [["backlog"], ["feature", "f-active-0"]]) {
      const r = run(root, ["view", ...v, "--all", "--format", "json"]);
      expect(r.code).toBe(ExitCode.Usage);
      expect(JSON.parse(r.stderr).error.message).toBe(
        "--all applies to `view board`, `view scope`, `view unreviewed` and `view portfolio` only."
      );
    }
  });
});
