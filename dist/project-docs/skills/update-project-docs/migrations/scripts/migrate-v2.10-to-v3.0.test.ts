/**
 * The v2.10 → v3.0 migration: the first to MOVE an adopter's documents.
 *
 * What this file has to show, in the words of `migration-authoring`: the pure
 * planning functions, each against its table of cases; the logic copied out of
 * `scripts/pdocs/` PINNED to its original; every table row of the plan's
 * conversion realised on a generated v2.10 tree; the run re-runnable and its dry
 * run writing nothing; every guard WATCHED FAILING; and a WIRING WITNESS per
 * phase.
 *
 * The fixtures are real trees, generated OFFLINE: the v2.10 tree from this
 * repository's history at the 8.1.0 tag (D16), the 9.0.0 scaffold from the
 * working tree — never this repository's own docs.
 */
import { afterAll, describe, expect, test } from "bun:test";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { childEnv } from "../../../../../../scripts/pdocs/test-env.ts";

import {
  GIT_LOCAL_ENV,
  KEPT_LIBRARY,
  MARKDOWN_LINK_RE,
  addToScope,
  backlogLifecycle,
  bornItemLifecycle,
  buildMoveMap,
  featureLifecycle,
  fmGet,
  fmList,
  fragmentLifecycle,
  gitEnv,
  hashOf,
  isSeeded,
  isUuid,
  loadManifest,
  mayWrite,
  movedTo,
  patchLintArrays,
  patchLintText,
  patchTopLevelVersion,
  planCycles,
  planTemplates,
  renameRecord,
  researchLifecycle,
  rewriteExcludeGlob,
  rewriteFromField,
  rewriteLinks,
  SEEDED_PAGES,
  slugOf,
  splitFrontmatter,
  stripCode,
  synthesizeFrontmatter,
  uuidv7,
  verdictFor,
  within,
  type Verdict,
} from "./migrate-v2.10-to-v3.0.ts";
import * as seed from "../../../../../../scripts/pdocs/seed.ts";
import * as uuid from "../../../../../../scripts/pdocs/uuid.ts";
import * as links from "../../../../../../scripts/pdocs/links-rewrite.ts";
import * as lintIndex from "../../../../../../scripts/pdocs/docs-lint/index.ts";
import { GIT_LOCAL_ENV as RULES_GIT_LOCAL_ENV, gitEnv as rulesGitEnv } from "../../../../../../scripts/pdocs/lint/rules.ts";
import { patchTopLevelVersion as v210Patch } from "./migrate-v2.9-to-v2.10.ts";

const SCRIPT = join(import.meta.dir, "migrate-v2.10-to-v3.0.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../../../../..");
/** The release a v2.10 tree was generated from: fixture O. */
const V210_TAG = "project-docs-scaffold-template-v8.1.0";
/** The `Applies If` cell of the migrations table, verbatim. */
const APPLIES_IF = "[ ! -d docs/items ] || [ -d docs/backlog ] || [ -d docs/projects ]";

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function tmp(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  roots.push(d);
  return d;
}

function write(root: string, files: Record<string, string>): void {
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
}

const read = (root: string, rel: string) => readFileSync(join(root, rel), "utf8");
const readJson = (abs: string) => JSON.parse(readFileSync(abs, "utf8"));

// ─── The pure planning functions ─────────────────────────────────────────────

describe("slugOf — date prefix, the -investigation suffix", () => {
  test.each([
    ["2026-09-02-fix-hook.md", "backlog", "fix-hook", "2026-09-02"],
    ["fix-hook.md", "backlog", "fix-hook", null],
    ["2026-09-22-work-taxonomy-investigation.md", "investigation", "work-taxonomy", "2026-09-22"],
    ["2026-09-22-work-taxonomy-investigation.md", "backlog", "work-taxonomy-investigation", "2026-09-22"],
    ["2026-03-13-markdown-slide-deck-tooling.md", "investigation", "markdown-slide-deck-tooling", "2026-03-13"],
    ["investigation.md", "investigation", "investigation", null],
    ["agent-bridge-plugin", "project", "agent-bridge-plugin", null],
    ["2026-1-02-not-a-date.md", "backlog", "2026-1-02-not-a-date", null],
  ] as const)("%s (%s) → %s", (name, kind, slug, date) => {
    expect(slugOf(name, kind)).toEqual({ slug, date });
  });
});

describe("the lifecycle maps — every legacy value", () => {
  test("proposal → feature, including the plan-active case and archives without a lifecycle", () => {
    const cases: Array<[string | null, boolean, boolean, string | null]> = [
      ["draft", false, false, "backlog"],
      ["draft", true, false, "backlog"],
      ["approved", false, false, "ready"],
      ["approved", true, false, "active"],
      ["deferred", false, false, "backlog"],
      ["implemented", false, false, "done"],
      ["withdrawn", false, false, "dropped"],
      ["superseded", false, false, "dropped"],
      [null, false, true, "done"],
      [null, false, false, null],
      ["in-flight", false, false, null],
    ];
    for (const [was, plan, archived, want] of cases)
      expect([was, plan, archived, featureLifecycle(was, plan, archived)]).toEqual([was, plan, archived, want]);
  });

  test("backlog, fragment and investigation → item", () => {
    expect(["open", "done", "promoted", "dropped"].map((v) => backlogLifecycle(v, false))).toEqual(["backlog", "done", "dropped", "dropped"]);
    expect(backlogLifecycle(null, true)).toBe("done");
    expect(backlogLifecycle(null, false)).toBeNull();
    expect(backlogLifecycle("wip", false)).toBeNull();
    expect(["open", "promoted", "dropped"].map((v) => fragmentLifecycle(v, false))).toEqual(["triage", "dropped", "dropped"]);
    expect(fragmentLifecycle(null, true)).toBe("dropped");
    expect(["active", "concluded"].map((v) => researchLifecycle(v, false))).toEqual(["active", "done"]);
    expect(researchLifecycle(null, true)).toBe("done");
    expect([bornItemLifecycle(false), bornItemLifecycle(true)]).toEqual(["done", "active"]);
  });
});

const FM = (fields: string) => `---\n${fields}\n---\n\n# Body\n`;

describe("buildMoveMap — over an in-memory file list", () => {
  const plan = (files: Record<string, string | null>) =>
    buildMoveMap(Object.keys(files), (rel) => files[rel] ?? null);

  test("a project with a proposal is a feature; one without is a born item; the plan decides active", () => {
    const p = plan({
      "projects/a/proposal.md": FM("type: proposal\nlifecycle: approved"),
      "projects/a/plan.md": FM("type: plan\nlifecycle: active"),
      "projects/b/sessions/2026-01-01-s.md": FM("type: session"),
      "projects/c/sessions/2026-01-01-s.md": FM("type: session"),
      "projects/c/plan.md": FM("type: plan\nlifecycle: active"),
      "projects/README.md": "# Projects\n",
      "projects/_archive/.gitkeep": "",
    });
    expect(p.blockers).toEqual([]);
    expect(p.moves.map((m) => [m.kind, m.from, m.to, m.lifecycle])).toEqual([
      ["feature", "projects/a", "features/a", "active"],
      ["born-item", "projects/b", "items/b", "done"],
      ["born-item", "projects/c", "items/c", "active"],
    ]);
    expect(p.junk).toEqual(["projects/_archive/.gitkeep"]);
  });

  test("an archived entity goes to _archive only when terminal; otherwise live, with a note", () => {
    const p = plan({
      "projects/_archive/old/proposal.md": "# Proposal: old\n\nNo frontmatter.\n",
      "projects/_archive/deferred/proposal.md": FM("type: proposal\nlifecycle: deferred"),
      "backlog/_archive/2026-01-01-x.md": FM("type: backlog\nlifecycle: done"),
      "backlog/_archive/2026-01-02-y.md": FM("type: backlog\nlifecycle: open"),
    });
    const by = Object.fromEntries(p.moves.map((m) => [m.from, m]));
    expect(by["projects/_archive/old"]?.to).toBe("features/_archive/old");
    expect(by["projects/_archive/deferred"]?.to).toBe("features/deferred");
    expect(by["projects/_archive/deferred"]?.note).toContain("goes to the live folder");
    expect(by["backlog/_archive/2026-01-01-x.md"]?.to).toBe("items/_archive/x.md");
    expect(by["backlog/_archive/2026-01-02-y.md"]?.to).toBe("items/y.md");
  });

  test("backlog, fragments and investigations: slugs, and a collision keeps the date", () => {
    const p = plan({
      "backlog/2026-01-01-fix.md": FM("type: backlog\nlifecycle: open"),
      "fragments/2026-02-02-fix.md": FM("type: fragment\nlifecycle: open"),
      "backlog/2026-01-03-promo.md": FM("type: backlog\nlifecycle: promoted"),
      "investigations/2026-03-03-q-investigation.md": FM("type: investigation\nlifecycle: concluded"),
      "projects/q/sessions/2026-01-01-s.md": FM("type: session"),
    });
    const by = Object.fromEntries(p.moves.map((m) => [m.from, m]));
    expect(by["backlog/2026-01-01-fix.md"]?.to).toBe("items/2026-01-01-fix.md");
    expect(by["fragments/2026-02-02-fix.md"]?.to).toBe("items/2026-02-02-fix.md");
    expect(by["fragments/2026-02-02-fix.md"]?.lifecycle).toBe("triage");
    expect(by["backlog/2026-01-03-promo.md"]?.lifecycle).toBe("dropped");
    expect(by["backlog/2026-01-03-promo.md"]?.note).toContain("listed for review");
    // The born item keeps the bare slug; the dated investigation takes its date.
    expect(by["projects/q"]?.to).toBe("items/q");
    expect(by["investigations/2026-03-03-q-investigation.md"]?.to).toBe("items/2026-03-03-q");
    expect(p.blockers).toEqual([]);
  });

  test("an existing item counts as a claim, and two undated claims are a judgment step", () => {
    const p = plan({
      "items/q.md": FM("type: item"),
      "projects/q/sessions/2026-01-01-s.md": FM("type: session"),
    });
    expect(p.blockers.join("\n")).toContain("slug `q` is claimed by items/q and projects/q");
  });

  test("a report goes to the one research item linked with it; none or two is a judgment step", () => {
    const p = plan({
      "investigations/2026-01-01-a.md": `${FM("type: investigation\nlifecycle: active")}[r](../reports/2026-01-01-r-report.md)\n`,
      "investigations/2026-01-02-b.md": FM("type: investigation\nlifecycle: active"),
      "reports/2026-01-01-r-report.md": FM("type: report"),
      "reports/2026-01-02-back-report.md": `${FM("type: report")}[b](../investigations/2026-01-02-b.md)\n`,
      "reports/2026-01-03-orphan-report.md": FM("type: report"),
      "reports/2026-01-04-two-report.md": `${FM("type: report")}[a](../investigations/2026-01-01-a.md) [b](../investigations/2026-01-02-b.md)\n`,
    });
    const by = Object.fromEntries(p.moves.map((m) => [m.from, m]));
    expect(by["reports/2026-01-01-r-report.md"]?.to).toBe("items/a/reports/2026-01-01-r-report.md");
    expect(by["reports/2026-01-02-back-report.md"]?.to).toBe("items/b/reports/2026-01-02-back-report.md");
    const b = p.blockers.join("\n");
    expect(b).toContain("reports/2026-01-03-orphan-report.md — a report with no owner");
    expect(b).toContain("reports/2026-01-04-two-report.md — a report with 2 possible owners");
  });

  test("a brief is always a judgment step, with the one project it links to suggested", () => {
    const p = plan({
      "projects/a/proposal.md": FM("type: proposal\nlifecycle: draft"),
      "briefs/2026-01-01-idea.md": `${FM("type: brief\nlifecycle: active")}[a](../projects/a/proposal.md)\n`,
      "briefs/2026-01-02-loose.md": FM("type: brief\nlifecycle: spent"),
      "briefs/TEMPLATES/BRIEF.template.md": "form\n",
    });
    const b = p.blockers.join("\n");
    expect(b).toContain("briefs/2026-01-01-idea.md — a brief. Move it into its owner's artifacts/ folder (suggested: projects/a/artifacts/");
    expect(b).toContain("briefs/2026-01-02-loose.md — a brief. Move it into its owner's artifacts/ folder, or delete it");
    expect(b).not.toContain("BRIEF.template.md");
  });

  test("an unmappable lifecycle and an unknown file are judgment steps", () => {
    const p = plan({
      "backlog/2026-01-01-x.md": FM("type: backlog\nlifecycle: wip"),
      "backlog/notes.txt": "x",
      "investigations/assets/chart.png": "x",
      "projects/stray.md": "# stray\n",
      "backlog/TEMPLATE-triage.md": "my own form\n",
    });
    const b = p.blockers.join("\n");
    expect(b).toContain('backlog/2026-01-01-x.md — lifecycle "wip" has no item state');
    for (const f of ["backlog/notes.txt", "investigations/assets/chart.png", "projects/stray.md", "backlog/TEMPLATE-triage.md"])
      expect(b).toContain(`${f} — not a document this migration knows where to put`);
  });
});

describe("planTemplates — moved templates carry their record; retired ones go only while untouched", () => {
  const run = (present: string[], verdicts: Record<string, Verdict>, recorded: string[] = []) =>
    planTemplates((r) => present.includes(r), (r) => verdicts[r] ?? "keep-unknown", (r) => recorded.includes(r));

  test("a moved template whose destination is free moves; every rename carries a record", () => {
    const t = run(["projects/TEMPLATES/PLAN.template.md", "reports/YYYY-MM-DD-TEMPLATE-report.md"], {});
    expect(t.moves).toEqual([
      ["projects/TEMPLATES/PLAN.template.md", "TEMPLATES/PLAN.template.md"],
      ["reports/YYYY-MM-DD-TEMPLATE-report.md", "TEMPLATES/REPORT.template.md"],
    ]);
    expect(t.records).toContainEqual(["projects/TEMPLATES/PROPOSAL.template.md", "TEMPLATES/FEATURE.template.md"]);
    expect(t.records.length).toBe(7);
  });

  test("a retired template is removed while untouched, and a judgment step when edited", () => {
    const t = run(["backlog/TEMPLATE.md", "fragments/TEMPLATE.md"], { "backlog/TEMPLATE.md": "update", "fragments/TEMPLATE.md": "keep-modified" }, ["briefs/TEMPLATES/BRIEF.template.md"]);
    expect(t.removals).toEqual(["backlog/TEMPLATE.md"]);
    expect(t.dropped).toEqual(["backlog/TEMPLATE.md", "briefs/TEMPLATES/BRIEF.template.md"]);
    expect(t.blockers.join("\n")).toContain("fragments/TEMPLATE.md — the form for a type 9.0.0 retires, and you have edited it");
  });

  test("an old template beside its already-moved successor is a leftover, handled like a retired one", () => {
    const t = run(["projects/TEMPLATES/PLAN.template.md", "TEMPLATES/PLAN.template.md"], { "projects/TEMPLATES/PLAN.template.md": "update" });
    expect(t.moves).toEqual([]);
    expect(t.removals).toEqual(["projects/TEMPLATES/PLAN.template.md"]);
  });
});

describe("planCycles — membership moves onto the items", () => {
  const moves = buildMoveMap(
    ["backlog/2026-01-01-a.md", "backlog/_archive/2026-01-02-b.md", "projects/f/proposal.md"],
    (r) => (r.startsWith("projects") ? FM("type: proposal\nlifecycle: approved") : FM("type: backlog\nlifecycle: done"))
  ).moves;

  test("a backlog entry gains `cycle:`; `scope:` is removed; a listed feature is left alone", () => {
    const cycle = `---\ntype: cycle\nlifecycle: closed\nscope:\n  [\n    backlog/2026-01-01-a,\n    backlog/2026-01-02-b,\n    project/f,\n  ]\nafter: []\n---\n\n# C\n\n## Scope\n\n- [F](../projects/f/proposal.md)\n`;
    const c = planCycles(["cycles/2026-01-c.md"], () => cycle, moves);
    expect(c.itemCycle.get("backlog/2026-01-01-a.md")).toBe("2026-01-c");
    expect(c.itemCycle.get("backlog/_archive/2026-01-02-b.md")).toBe("2026-01-c");
    const out = c.texts.get("cycles/2026-01-c.md") as string;
    expect(out).not.toContain("scope:");
    expect(out).toContain("after: []");
    expect(splitFrontmatter(out).body).toBe(splitFrontmatter(cycle).body);
    expect(c.notes.join("\n")).toContain("already listed in the cycle's Scope section");
  });

  test("an unlisted feature is added to the Scope section; an active cycle's is a judgment note", () => {
    const cycle = `---\ntype: cycle\nlifecycle: active\nscope: [project/f]\n---\n\n# C\n\n## Scope\n\n- something else\n\n## Outcome\n`;
    const c = planCycles(["cycles/2026-01-c.md"], () => cycle, moves);
    const body = splitFrontmatter(c.texts.get("cycles/2026-01-c.md") as string).body;
    expect(body).toContain("- something else\n- [f](../projects/f/proposal.md)\n\n## Outcome");
    expect(c.notes.join("\n")).toContain("is active and names project/f");
  });

  test("addToScope makes a Scope section when there is none", () => {
    expect(addToScope("# C\n", "- x")).toBe("# C\n\n## Scope\n\n- x\n");
  });

  test("fmList reads flow, wrapped flow and block lists", () => {
    expect(fmList("scope: [a, b]", "scope")).toEqual(["a", "b"]);
    expect(fmList("scope:\n  [\n    a,\n    b,\n  ]", "scope")).toEqual(["a", "b"]);
    expect(fmList("scope:\n  - a\n  - b\nafter: []", "scope")).toEqual(["a", "b"]);
  });
});

describe("synthesizeFrontmatter — a legacy archive's document with none", () => {
  test("the title from the H1, the description from the first sentence; the body kept byte for byte", () => {
    const body = "# Proposal: dev-kickoff Skill\n\n**Date:** 2026-03-03 **Status:** Approved\n\n## Problem\n\nThe workflow has a gap. More follows.\n";
    const out = synthesizeFrontmatter("feature", "proposal.md", body, { date: "2026-03-03", extra: [["lifecycle", "done"]] });
    const { fm, body: after } = splitFrontmatter(out);
    expect(after).toBe(body);
    expect(fmGet(fm as string, "type")).toBe("feature");
    expect(fmGet(fm as string, "title")).toBe("Proposal: dev-kickoff Skill");
    expect(fmGet(fm as string, "description")).toBe("The workflow has a gap.");
    expect(fmGet(fm as string, "status")).toBe("stable");
    expect(fmGet(fm as string, "lifecycle")).toBe("done");
    expect(fmGet(fm as string, "generated")).toBe("{ by: unknown, at: 2026-03-03 }");
  });

  test("no H1: the title from the file name; an empty body: the description is the title", () => {
    const out = synthesizeFrontmatter("session", "2026-02-02-first-pass.md", "", { date: "2026-02-02" });
    expect(fmGet(splitFrontmatter(out).fm as string, "title")).toBe("First pass");
    expect(fmGet(splitFrontmatter(out).fm as string, "description")).toBe("First pass");
    expect(splitFrontmatter(out).body).toBe("");
  });

  test("a value with a colon is quoted, so the lint reads it back whole", () => {
    const out = synthesizeFrontmatter("artifact", "x.md", "# A: b\n\nWhy: because.\n", { date: "2026-01-01" });
    expect(out).toContain('title: "A: b"');
    expect(fmGet(splitFrontmatter(out).fm as string, "description")).toBe("Why: because.");
  });
});

describe("patchLintArrays — keeps the adopter's entries and order", () => {
  const V210 = {
    adopting: false,
    exclude: ["docs/projects/deck/artifacts/*-prototype.md", "dist/**", "docs/projects/*/artifacts/*.md"],
    durable: ["architecture", "mine", "specifications", "lessons-learned", "memories"],
    workbench: ["backlog", "briefs", "investigations", "projects", "reports", "fragments", "cycles", "runbooks"],
    skip: ["_archive", "superpowers"],
  };

  test("the retired workbench folders out, features and items in, the user's own kept in place", () => {
    const { lint, changes } = patchLintArrays(V210, { moves: [["docs/projects/deck", "docs/features/deck"]], keptLibrary: ["memories"], docsRootName: "docs" });
    expect(lint.workbench).toEqual(["cycles", "runbooks", "features", "items"]);
    expect(lint.durable).toEqual(["architecture", "mine", "specifications", "memories"]);
    expect(lint.types).toEqual({ memories: "memory" });
    expect(lint.skip).toEqual(["superpowers"]);
    expect(lint.exclude).toEqual(["docs/features/deck/artifacts/*-prototype.md", "dist/**", "docs/features/*/artifacts/*.md"]);
    expect(lint.scopes).toEqual([]);
    expect(lint.adopting).toBe(false);
    expect(changes).toContain("lint.skip: -_archive (the archive is linted now)");
  });

  test("already migrated: nothing changes", () => {
    const done = { workbench: ["features", "items", "cycles"], durable: ["architecture"], skip: [], exclude: [], scopes: ["cli"], types: {} };
    const r = patchLintArrays(done, { moves: [], keptLibrary: [], docsRootName: "docs" });
    expect(r.changes).toEqual([]);
    expect(r.lint).toEqual(done);
  });

  test("rewriteExcludeGlob respells moved paths, longest first, and leaves the rest", () => {
    const moves: Array<[string, string]> = [["docs/projects/a", "docs/features/a"], ["docs/projects/a/x.md", "docs/features/a/feature.md"]];
    expect(rewriteExcludeGlob("docs/projects/a/x.md", moves, "docs")).toBe("docs/features/a/feature.md");
    expect(rewriteExcludeGlob("docs/projects/a/**", moves, "docs")).toBe("docs/features/a/**");
    expect(rewriteExcludeGlob("docs/backlog/*.md", moves, "docs")).toBe("docs/items/*.md");
    expect(rewriteExcludeGlob("dist/**", moves, "docs")).toBe("dist/**");
  });
});

describe("patchLintText — the adopter's bytes kept everywhere else", () => {
  const BIOME = `{
  "docsRoot": "docs",
  "version": "8.1.0",
  "lint": {
    "adopting": false,
    "exclude": [],
    "durable": ["architecture", "memories"],
    "workbench": [
      "backlog",
      "cycles"
    ],
    "skip": ["_archive"]
  }
}
`;
  test("a one-line array stays one line, a multi-line one stays multi-line, a new key is appended", () => {
    const next = { adopting: false, exclude: [], durable: ["architecture", "memories"], workbench: ["cycles", "features", "items"], skip: [], scopes: [], types: { memories: "memory" } };
    const out = patchLintText(BIOME, next) as string;
    expect(JSON.parse(out).lint).toEqual(next);
    expect(out).toContain('    "durable": ["architecture", "memories"],');
    expect(out).toContain('    "workbench": [\n      "cycles",\n      "features",\n      "items"\n    ],');
    expect(out).toContain('    "skip": [],');
    expect(out).toContain('    "scopes": [],\n    "types": {\n      "memories": "memory"\n    }\n  }\n}\n');
    expect(out.startsWith('{\n  "docsRoot": "docs",\n  "version": "8.1.0",\n')).toBe(true);
  });

  test("no lint object: null, so the caller re-serialises and says so", () => {
    expect(patchLintText('{"version": "1"}', { scopes: [] })).toBeNull();
  });
});

// ─── The copied logic is pinned to the original ──────────────────────────────

describe("the copied logic equals the originals in scripts/pdocs/", () => {
  test("isSeeded, verdictFor, within, hashOf, loadManifest, mayWrite, renameRecord and SEEDED_PAGES", () => {
    for (const n of ["TEMPLATE.md", "TEMPLATE-domain.md", "YYYY-MM-DD-TEMPLATE-report.md", "PLAN.template.md", "TEMPLATES/x.md", "templates.md", "STYLE.md", "a.md"])
      expect([n, isSeeded(n)]).toEqual([n, seed.isSeeded(n)]);
    const docs = tmp("migrate-v30-seed-");
    write(docs, { "a/TEMPLATE.md": "same\n", "b/TEMPLATE.md": "changed\n", "e/TEMPLATE.md": "x\n", ".pdocs-seed.json": '{"version": 3, "files": {"a": "h", "b": 2}}' });
    const sha = (s: string) => new Bun.CryptoHasher("sha256").update(s).digest("hex");
    const m = { version: "8.1.0", files: { "a/TEMPLATE.md": sha("same\n"), "b/TEMPLATE.md": sha("was\n"), "c/TEMPLATE.md": sha("gone\n") } };
    for (const rel of ["a/TEMPLATE.md", "b/TEMPLATE.md", "c/TEMPLATE.md", "d/TEMPLATE.md", "e/TEMPLATE.md", "../x.md", "/etc/passwd", ""]) {
      expect([rel, verdictFor(m, docs, rel)]).toEqual([rel, seed.verdictFor(m, docs, rel)]);
      expect([rel, within(docs, rel)]).toEqual([rel, seed.within(docs, rel)]);
    }
    for (const v of ["update", "install", "keep-modified", "keep-unknown", "keep-deleted"] as const) expect(mayWrite(v)).toBe(seed.mayWrite(v));
    expect(hashOf(join(docs, "a/TEMPLATE.md"))).toBe(seed.hashOf(join(docs, "a/TEMPLATE.md")));
    expect(loadManifest(docs)).toEqual(seed.loadManifest(docs));
    for (const [f, t] of [["a/TEMPLATE.md", "z/TEMPLATE.md"], ["nope", "x"], ["a/TEMPLATE.md", "b/TEMPLATE.md"]] as const)
      expect(renameRecord(m, f, t)).toEqual(seed.renameRecord(m, f, t));
    expect([...SEEDED_PAGES]).toEqual([...seed.SEEDED_PAGES]);
  });

  test("uuidv7 and isUuid", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const ms of [0, 1, 1727222400000, 2 ** 48 - 1]) expect(uuidv7(ms, bytes)).toBe(uuid.uuidv7(ms, bytes));
    for (const v of [uuidv7(), "0192f3a4-0000-7000-8000-000000000000", "ABC", "0192F3A4-0000-7000-8000-000000000000"]) expect(isUuid(v)).toBe(uuid.isUuid(v));
    expect(isUuid(uuidv7())).toBe(true);
  });

  test("the link grammar and the rewriter: stripCode, MARKDOWN_LINK_RE, movedTo, rewriteLinks, rewriteFromField", () => {
    expect(MARKDOWN_LINK_RE.source).toBe(lintIndex.MARKDOWN_LINK_RE.source);
    const docs = "/r/docs";
    const map = new Map([
      [`${docs}/projects/a`, `${docs}/features/a`],
      [`${docs}/projects/a/proposal.md`, `${docs}/features/a/feature.md`],
      [`${docs}/backlog/2026-01-01-x.md`, `${docs}/items/x.md`],
    ]);
    const texts = [
      "[a](../projects/a/proposal.md#why) [p](./plan.md) `[c](../projects/a/proposal.md)`\n",
      "```\n[f](../backlog/2026-01-01-x.md)\n```\n[x](<../backlog/2026-01-01-x.md>)\n[d]: ../projects/a/plan.md \"t\"\n[^1]: ../projects/a/x.md\n",
      "---\nfrom: backlog/2026-01-01-x.md # a path\n---\n[u](https://x.org) [m](mailto:a@b)\n",
    ];
    for (const t of texts) {
      expect(stripCode(t)).toBe(lintIndex.stripCode(t));
      for (const [from, to] of [[`${docs}/projects/a/proposal.md`, `${docs}/features/a/feature.md`], [`${docs}/cycles/c.md`, `${docs}/cycles/c.md`], [`${docs}/backlog/2026-01-01-x.md`, `${docs}/items/x.md`]] as const) {
        expect(rewriteLinks(t, from, to, map, () => true)).toEqual(links.rewriteLinks(t, from, to, map, () => true));
        expect(rewriteLinks(t, from, to, map)).toEqual(links.rewriteLinks(t, from, to, map));
      }
      expect(rewriteFromField(t, docs, map)).toEqual(links.rewriteFromField(t, docs, map));
    }
    for (const p of [`${docs}/projects/a/sessions/s.md`, `${docs}/projects/a/proposal.md`, `${docs}/other.md`])
      expect(movedTo(p, map)).toBe(links.movedTo(p, map));
  });

  test("gitEnv and GIT_LOCAL_ENV", () => {
    expect([...GIT_LOCAL_ENV]).toEqual([...RULES_GIT_LOCAL_ENV]);
    process.env.GIT_INDEX_FILE = "/nope";
    try {
      expect(gitEnv()).toEqual(rulesGitEnv());
      expect(gitEnv().GIT_INDEX_FILE).toBeUndefined();
    } finally {
      delete process.env.GIT_INDEX_FILE;
    }
  });

  test("patchTopLevelVersion equals the v2.10 script's on every shape", () => {
    for (const s of ['{"version": "1.0.0"}', '{\n  "version": "1",\n  "lint": { "version": "keep" }\n}\n', '{"a": {"version": "n"}}', '{"version": ["x"]}', "{}"])
      expect([s, patchTopLevelVersion(s, "9.9.9")]).toEqual([s, v210Patch(s, "9.9.9")]);
  });

  test("the kept library folders are the ones the live registry still types", async () => {
    const { DURABLE_TYPE } = await import("../../../../../../scripts/pdocs/lint/registry.ts");
    for (const [folder, type] of Object.entries(KEPT_LIBRARY)) expect(DURABLE_TYPE[folder] ?? type).toBe(type);
  });
});
