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
  positionalType,
  scopeEntryPath,
  renameRecord,
  researchLifecycle,
  rewriteExcludeGlob,
  rewriteFromField,
  rewriteFolderLinks,
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
  for (const r of roots) {
    // The recovery tests take write permission away; give it back so the tree can go.
    Bun.spawnSync(["chmod", "-R", "u+w", r], { env: childEnv() });
    rmSync(r, { recursive: true, force: true });
  }
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

  test("a report two investigations link is decided by the one it links to itself", () => {
    const report = "reports/2026-01-05-shared-report.md";
    const files = {
      "investigations/2026-01-01-a.md": `${FM("type: investigation\nlifecycle: active")}[r](../${report})\n`,
      "investigations/2026-01-02-b.md": `${FM("type: investigation\nlifecycle: active")}[r](../${report})\n`,
      [report]: FM("type: report"),
    };
    const ambiguous = plan(files);
    expect(ambiguous.blockers.join("\n")).toContain("Add a link from the report to the investigation it belongs to");
    const decided = plan({ ...files, [report]: `${FM("type: report")}For [b](../investigations/2026-01-02-b.md).\n` });
    expect(decided.blockers).toEqual([]);
    expect(decided.moves.find((m) => m.from === report)?.to).toBe("items/b/reports/2026-01-05-shared-report.md");
  });

  test("a brief is always a judgment step, with the one project it links to suggested", () => {
    const p = plan({
      "projects/a/proposal.md": FM("type: proposal\nlifecycle: draft"),
      "briefs/2026-01-01-idea.md": `${FM("type: brief\nlifecycle: active")}[a](../projects/a/proposal.md)\n`,
      "briefs/2026-01-02-loose.md": FM("type: brief\nlifecycle: spent"),
      "briefs/TEMPLATES/BRIEF.template.md": "form\n",
    });
    const b = p.blockers.join("\n");
    expect(b).toContain("briefs/2026-01-01-idea.md — a brief. Move it into its owner's artifacts/ folder (suggested: the one project it links to, projects/a/artifacts/");
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

  test("an item in two cycles' scope carries the active one, whichever file comes first", () => {
    const closed = (s: string) => `---\ntype: cycle\nlifecycle: closed\nscope: [${s}]\n---\n\n# C\n`;
    const active = (s: string) => `---\ntype: cycle\nlifecycle: active\nscope: [${s}]\n---\n\n# C\n`;
    const e = "backlog/2026-01-01-a";
    const later = planCycles(["cycles/2026-01-a.md", "cycles/2026-02-b.md"], (r) => (r.includes("-a.md") ? closed(e) : active(e)), moves);
    expect(later.itemCycle.get("backlog/2026-01-01-a.md")).toBe("2026-02-b");
    expect(later.notes.join("\n")).toContain("the active one");
    const earlier = planCycles(["cycles/2026-01-a.md", "cycles/2026-02-b.md"], (r) => (r.includes("-a.md") ? active(e) : closed(e)), moves);
    expect(earlier.itemCycle.get("backlog/2026-01-01-a.md")).toBe("2026-01-a");
  });

  test("a singular `fragment/` scope entry is mapped, and its item carries the cycle", () => {
    expect(scopeEntryPath("fragment/2026-01-06-a-thought")).toBe("fragments/2026-01-06-a-thought");
    expect(scopeEntryPath("fragments/x.md")).toBe("fragments/x");
    expect(scopeEntryPath("investigation/q")).toBe("investigations/q");
    expect(scopeEntryPath("brief/x")).toBeNull();
    const fm = buildMoveMap(["fragments/2026-01-06-a-thought.md"], () => FM("type: fragment\nlifecycle: open")).moves;
    const c = planCycles(["cycles/2026-01-c.md"], () => "---\ntype: cycle\nlifecycle: active\nscope: [fragment/2026-01-06-a-thought]\n---\n\n# C\n", fm);
    expect(c.itemCycle.get("fragments/2026-01-06-a-thought.md")).toBe("2026-01-c");
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

describe("rewriteFolderLinks — a link to a retired folder itself, and nothing inside it", () => {
  test("the folder link goes to its successor; a link into the folder that nothing moved is left as written", () => {
    const map = new Map([["/r/docs/backlog", "/r/docs/items"], ["/r/docs/projects", "/r/docs/features"]]);
    const text = "[a](docs/backlog/) [b](docs/projects) [c](docs/projects/gone.md) [d](./docs/backlog/#x) `[e](docs/backlog/)`\n";
    const r = rewriteFolderLinks(text, "/r/README.md", map);
    expect(r.text).toBe("[a](docs/items/) [b](docs/features) [c](docs/projects/gone.md) [d](./docs/items/#x) `[e](docs/backlog/)`\n");
    expect(r.changed).toBe(3);
  });
});

describe("positionalType — a document's type from where it sits in its owner", () => {
  test.each([
    ["feature.md", "feature"], ["item.md", "item"], ["plan.md", "plan"], ["write-up.md", "write-up"], ["DEV_KICKOFF.md", "kickoff"],
    ["sessions/2026-01-01-s.md", "session"], ["reports/2026-01-01-r-report.md", "report"], ["artifacts/n.md", "artifact"], ["design.md", "artifact"],
  ])("%s → %s", (rel, type) => expect(positionalType(rel)).toBe(type));
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
    const { lint, changes, notes } = patchLintArrays(V210, { moves: [["docs/projects/deck", "docs/features/deck"]], keptLibrary: ["memories"], docsRootName: "docs" });
    expect(lint.workbench).toEqual(["cycles", "runbooks", "features", "items"]);
    expect(lint.durable).toEqual(["architecture", "mine", "specifications", "memories"]);
    expect(lint.types).toEqual({ memories: "memory" });
    expect(lint.skip).toEqual(["superpowers"]);
    // A wildcard where the entity would be could mean features/ or items/: left as written, and named.
    expect(lint.exclude).toEqual(["docs/features/deck/artifacts/*-prototype.md", "dist/**", "docs/projects/*/artifacts/*.md"]);
    expect(changes.join("\n")).not.toContain("docs/projects/*/artifacts/*.md →");
    expect(lint.scopes).toEqual([]);
    expect(lint.adopting).toBe(false);
    expect(changes).toContain("lint.skip: -_archive (the archive is linted now)");
    expect(notes).toEqual([
      "lint.exclude: `docs/projects/*/artifacts/*.md` names a retired folder, and what it matched now sits under features/ or items/ — left as written; respell it by hand",
    ]);
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
    // Not unambiguous: items/ holds every kind of item now, and a guess would exclude all of them.
    expect(rewriteExcludeGlob("docs/backlog/*.md", moves, "docs")).toBeNull();
    expect(rewriteExcludeGlob("docs/backlog/**", moves, "docs")).toBeNull();
    expect(rewriteExcludeGlob("docs/projects/*/artifacts/*.md", moves, "docs")).toBeNull();
    expect(rewriteExcludeGlob("docs/projects/gone/**", moves, "docs")).toBeNull();
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

// ─── Generated fixtures: real trees, not hand-built ones ─────────────────────

function sh(cmd: string[], cwd?: string, env?: Record<string, string>): string {
  const r = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe", env: childEnv(env) });
  if (r.exitCode !== 0) throw new Error(`${cmd.join(" ")} exited ${r.exitCode}\n${r.stderr.toString()}${r.stdout.toString()}`);
  return r.stdout.toString();
}

interface Scaffolds {
  /** A generated 8.1.0 project: the v2.10 tree as a consumer has it. */
  old: string;
  /** A generated project from the working tree: the 9.0.0 layout. */
  current: string;
}
let scaffolds: Scaffolds | null = null;

function generatedScaffolds(): Scaffolds {
  if (scaffolds) return scaffolds;
  if (!Bun.which("cookiecutter"))
    throw new Error("cookiecutter is not on PATH, so the generated fixtures cannot be built. Install it — these tests do not skip without it.");
  const base = tmp("migrate-v30-scaffolds-");
  const config = join(base, "cookiecutter.yaml");
  writeFileSync(config, `replay_dir: "${join(base, "replay")}"\ncookiecutters_dir: "${join(base, "cookiecutters")}"\n`);
  if (Bun.spawnSync(["git", "-C", REPO_ROOT, "rev-parse", "--verify", "--quiet", `${V210_TAG}^{commit}`], { stdout: "pipe", stderr: "pipe", env: childEnv() }).exitCode !== 0)
    throw new Error(`tag ${V210_TAG} is not in this clone. Run \`git fetch --tags\` and re-run.`);
  const dir = join(base, "template-v210");
  mkdirSync(dir);
  sh(["git", "-C", REPO_ROOT, "archive", "--format=tar", "-o", join(base, "t.tar"), V210_TAG]);
  sh(["tar", "-xf", join(base, "t.tar"), "-C", dir]);
  const generate = (template: string, into: string): string => {
    mkdirSync(into);
    sh(["cookiecutter", "--config-file", config, "--no-input", "-o", into, template, "install_target=New project folder"]);
    return join(into, "my-project");
  };
  scaffolds = { old: generate(dir, join(base, "old")), current: generate(REPO_ROOT, join(base, "current")) };
  return scaffolds;
}

function git(root: string, ...args: string[]): string {
  return sh(["git", "-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "-c", "init.defaultBranch=main", ...args], root);
}

function commitAll(root: string, message: string): void {
  if (!existsSync(join(root, ".git"))) git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-q", "--allow-empty", "-m", message);
}

const doc = (fields: Record<string, string>, body: string) =>
  `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n")}\ngenerated: { by: fixture, at: 2026-01-01 }\n---\n\n${body}`;
const common = (type: string, title: string, description: string, extra: Record<string, string> = {}) => ({ type, title, description, status: "stable", ...extra });

/**
 * Every shape the plan's conversion table names, and every one this
 * repository has: projects with and without a proposal, a legacy archive with
 * no frontmatter, backlog items in each lifecycle (one archived), a fragment,
 * an investigation that owns a report and an archived one, a brief its owner
 * has already moved into a project's artifacts/, a cycle with scope, a
 * DEV_KICKOFF.md, artifacts/, two memories and a lesson, a root README linking
 * into docs/backlog/, and a lint.exclude glob into projects/.
 */
const SHAPES: Record<string, string> = {
  "docs/backlog/2026-01-01-open-item.md": doc(common("backlog", "Open item", "An open item.", { lifecycle: "open" }), "# Open item\n\nSee [alpha](../projects/alpha/proposal.md).\n"),
  "docs/backlog/2026-01-02-done-item.md": doc(common("backlog", "Done item", "A done item.", { lifecycle: "done" }), "# Done item\n\nFinished.\n"),
  "docs/backlog/2026-01-03-promoted-item.md": doc(common("backlog", "Promoted item", "A promoted item.", { lifecycle: "promoted" }), "# Promoted item\n\nBecame [alpha](../projects/alpha/proposal.md).\n"),
  "docs/backlog/2026-01-04-dropped-item.md": doc(common("backlog", "Dropped item", "A dropped item.", { lifecycle: "dropped" }), "# Dropped item\n\nNot doing it.\n"),
  "docs/backlog/_archive/2026-01-05-archived-item.md": doc(common("backlog", "Archived item", "An archived item.", { lifecycle: "done" }), "# Archived item\n\nOld.\n"),
  "docs/fragments/2026-01-06-a-thought.md": doc(common("fragment", "A thought", "A thought.", { lifecycle: "open" }), "# A thought\n\nMaybe.\n"),
  "docs/projects/alpha/proposal.md": doc(common("proposal", "Alpha", "The alpha feature.", { lifecycle: "approved" }), "# Alpha\n\nThe plan is [here](./plan.md); the kickoff [here](./DEV_KICKOFF.md).\n"),
  "docs/projects/alpha/plan.md": doc(common("plan", "Alpha plan", "How alpha is built.", { lifecycle: "active" }), "# Alpha plan\n\n[Proposal](./proposal.md) · [question](../../investigations/2026-01-10-question-investigation.md)\n"),
  "docs/projects/alpha/DEV_KICKOFF.md": doc(common("kickoff", '"Kickoff: alpha"', "Start alpha."), "# Kickoff\n\n[Proposal](./proposal.md)\n"),
  "docs/projects/alpha/sessions/2026-01-07-first.md": doc(common("session", "First session", "What happened first."), "# First\n\n[Plan](../plan.md)\n"),
  "docs/projects/alpha/artifacts/notes.md": doc(common("artifact", "Notes", "Notes on alpha."), "# Notes\n\n[Backlog item](../../../backlog/2026-01-01-open-item.md)\n"),
  "docs/projects/alpha/artifacts/2026-01-13-idea.md": doc(common("brief", "Idea", "The brief alpha came from.", { lifecycle: "spent" }), "# Idea\n\nA brief, moved here by its owner.\n"),
  "docs/projects/alpha/artifacts/deck-prototype.md": "---\nmarp: true\n---\n\n# A deck\n\n[proposal](../proposal.md)\n",
  "docs/projects/beta/sessions/2026-01-08-work.md": doc(common("session", "Beta work", "Beta was built without a proposal."), "# Beta work\n\nDone.\n"),
  "docs/projects/_archive/gamma/proposal.md": "# Proposal: Gamma\n\n**Date:** 2025-12-01 **Status:** Implemented\n\n## Problem\n\nGamma was needed. It shipped.\n",
  "docs/projects/_archive/gamma/sessions/2025-12-02-old.md": "# Old session\n\nIt went fine. [Proposal](../proposal.md)\n",
  "docs/projects/_archive/gamma/design.md": "Notes without a heading.\n",
  "docs/projects/_archive/gamma/plan.md": "# Gamma plan\n\nBuild it, then ship it.\n",
  "docs/projects/_archive/gamma/reports/2025-12-03-findings-report.md": "# Findings\n\nIt worked.\n",
  "docs/investigations/2026-01-10-question-investigation.md": doc(common("investigation", '"Investigation: question"', "Is it possible?", { lifecycle: "concluded" }), "# Question\n\nEvidence: [report](../reports/2026-01-11-evidence-report.md).\n"),
  "docs/investigations/_archive/2026-01-12-old-question.md": doc(common("investigation", "Old question", "An old question.", { lifecycle: "concluded" }), "# Old question\n\nAnswered.\n"),
  "docs/reports/2026-01-11-evidence-report.md": doc(common("report", "Evidence", "What was found."), "# Evidence\n\nFor [the question](../investigations/2026-01-10-question-investigation.md).\n"),
  "docs/cycles/2026-01-mixed.md": doc(
    { ...common("cycle", "Mixed", "A cycle with mixed scope."), lifecycle: "closed", started: "2026-01-01", closed: "2026-01-31", appetite: "A month.", scope: "\n  [\n    backlog/2026-01-01-open-item,\n    backlog/2026-01-02-done-item,\n    project/alpha,\n  ]", after: "[]" },
    "# Mixed\n\n## Scope\n\n- [Alpha](../projects/alpha/proposal.md)\n- [Open item](../backlog/2026-01-01-open-item.md)\n"
  ),
  "docs/memories/2026-01-14-first-memory.md": doc(common("memory", "First memory", "Something that happened.", { tags: "[history]" }), "# First memory\n\nIt happened.\n"),
  "docs/memories/2026-01-15-second-memory.md": doc(common("memory", "Second memory", "Something else that happened.", { tags: "[history]" }), "# Second memory\n\nThen this.\n"),
  "docs/lessons-learned/a-lesson.md": doc(common("lesson", "A lesson", "What was learned.", { tags: "[history]" }), "# A lesson\n\nLearned.\n"),
  "README.md": "# My project\n\n- [An open item](docs/backlog/2026-01-01-open-item.md)\n- [Alpha](docs/projects/alpha/proposal.md#alpha)\n- [The backlog](docs/backlog/)\n",
};

/** Fixture O: the generated 8.1.0 tree with every shape, committed. */
function fixtureO(extra: Record<string, string> = {}): string {
  const root = tmp("migrate-v30-O-");
  cpSync(generatedScaffolds().old, root, { recursive: true });
  write(root, { ...SHAPES, ...extra });
  const index = read(root, "docs/index.md")
    .replace(/(## Lessons learned[\s\S]*?)_No pages yet\._/, "$1- [A lesson](./lessons-learned/a-lesson.md) — What was learned.")
    .replace(
      /(## Memories[\s\S]*?)_No pages yet\._/,
      "$1- [First memory](./memories/2026-01-14-first-memory.md) — Something that happened.\n- [Second memory](./memories/2026-01-15-second-memory.md) — Something else that happened."
    );
  const cfg = readJson(join(root, ".project-docs.json"));
  cfg.lint.exclude = ["docs/projects/alpha/artifacts/*-prototype.md"];
  write(root, { "docs/index.md": index, ".project-docs.json": `${JSON.stringify(cfg, null, 2)}\n` });
  commitAll(root, "the 8.1.0 tree, with every shape");
  return root;
}

/** The 9.0.0 scaffold with its docs_version set, so the markers have somewhere to move. */
function scaffoldAt(version: string): string {
  const s = tmp("migrate-v30-N-");
  cpSync(generatedScaffolds().current, s, { recursive: true });
  write(s, { "docs/README.md": read(s, "docs/README.md").replace(/^docs_version:\s*"[^"]*"/m, `docs_version: "${version}"`) });
  return s;
}
let n999: string | null = null;
const target = () => (n999 ??= scaffoldAt("9.9.9"));

interface Run {
  exitCode: number | null;
  out: string;
}

function migrate(
  root: string,
  args: string[] = [],
  o: { script?: string; env?: Record<string, string>; scaffold?: string | null; bun?: string; format?: boolean } = {}
): Run {
  const scaffold = o.scaffold === undefined ? target() : o.scaffold;
  const r = Bun.spawnSync(
    [o.bun ?? "bun", o.script ?? SCRIPT, "--root", root, ...(scaffold ? ["--scaffold-dir", scaffold] : []), ...(o.format ? [] : ["--skip-format"]), ...args],
    { stdout: "pipe", stderr: "pipe", env: childEnv(o.env) }
  );
  return { exitCode: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

function treeDigest(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === ".git") continue;
      const abs = join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else out[relative(root, abs)] = hashOf(abs) as string;
    }
  };
  walk(root);
  return out;
}

const pdocs = (root: string, ...args: string[]) =>
  Bun.spawnSync(["bun", "scripts/pdocs/cli.ts", ...args], { cwd: root, stdout: "pipe", stderr: "pipe", env: childEnv() });

/** A document's body with every link destination blanked — what "no prose changed" compares. */
const prose = (text: string) => splitFrontmatter(text).body.replace(/\]\([^)]*\)/g, "]()");

// ─── The owned diff between O and N is DERIVED, never pinned ─────────────────

function ownedDiff(o: string, n: string, sub = "scripts/pdocs"): string[] {
  const a = treeDigest(join(o, sub));
  const b = treeDigest(join(n, sub));
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).sort();
}
/** The files the 9.0.0 work added: the refresh must carry at least these. */
const NEW_OWNED = ["lint/work.ts", "links-rewrite.ts", "move.ts", "uuid.ts", "work.ts", "commands/view.ts", "commands/set.ts", "commands/archive.ts", "commands/promote.ts"];

describe("fixtures — the generated trees", () => {
  test("O is a v2.10 tree with every shape; N is the 9.0.0 layout", () => {
    const o = fixtureO();
    expect(read(o, "scripts/pdocs/lint/rules.ts")).toContain("isSeeded");
    expect(existsSync(join(o, "docs/items"))).toBe(false);
    for (const rel of Object.keys(SHAPES)) expect(existsSync(join(o, rel))).toBe(true);
    const n = generatedScaffolds().current;
    expect(existsSync(join(n, "docs/items/README.md"))).toBe(true);
    expect(existsSync(join(n, "docs/backlog"))).toBe(false);
  });

  test("the owned diff between O and N carries the 9.0.0 CLI — derived, not pinned", () => {
    const diff = ownedDiff(generatedScaffolds().old, generatedScaffolds().current);
    for (const f of NEW_OWNED) expect(diff).toContain(f);
  });

  test("the migrations table carries this row, and its Applies If is the one tested below", () => {
    const skill = readFileSync(join(import.meta.dir, "../../SKILL.md"), "utf8");
    const row = skill.split("\n").find((l) => l.startsWith("| [migrations/v2.10-to-v3.0.md]"));
    expect(row).toBeDefined();
    expect(row).toContain(`\`${APPLIES_IF.replaceAll("||", "\\|\\|")}\``);
    expect(existsSync(join(import.meta.dir, "../v2.10-to-v3.0.md"))).toBe(true);
  });

  test("the Applies If test is true on O and false on N, executed as the table's shell", () => {
    const on = (root: string) => Bun.spawnSync(["sh", "-c", APPLIES_IF], { cwd: root, stdout: "pipe", stderr: "pipe", env: childEnv() }).exitCode;
    expect(on(fixtureO())).toBe(0);
    expect(on(generatedScaffolds().current)).toBe(1);
  });
});

// ─── The whole run on O ──────────────────────────────────────────────────────

let whole: { root: string; r: Run } | null = null;
/** One run on O, shared by the assertions below: none of them writes. */
const wholeRun = () => {
  if (whole) return whole;
  const root = fixtureO();
  whole = { root, r: migrate(root) };
  return whole;
};
const fmOf = (root: string, rel: string) => splitFrontmatter(read(root, rel)).fm as string;

describe("the whole migration on fixture O", () => {
  test("exit 0, pdocs check clean, no legacy folder, both markers moved", () => {
    const { root, r } = wholeRun();
    if (r.exitCode !== 0 || process.env.SHOW_RUN) console.log(r.out);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("Migration complete.");
    expect(r.out).toContain("✓ no retired folder remains");
    expect(r.out).toContain("✓ pdocs check: clean (exit 0)");
    const check = pdocs(root, "check", "--format", "json");
    expect(check.exitCode).toBe(0);
    for (const f of ["backlog", "briefs", "fragments", "investigations", "reports", "projects"]) expect(existsSync(join(root, "docs", f))).toBe(false);
    expect(read(root, "docs/README.md")).toContain('docs_version: "9.9.9"');
    expect(readJson(join(root, ".project-docs.json")).version).toBe("9.9.9");
  });

  test("projects: a proposal becomes feature.md (approved + active plan → active); no proposal → a born item; a legacy archive → features/_archive with frontmatter", () => {
    const { root } = wholeRun();
    expect(fmGet(fmOf(root, "docs/features/alpha/feature.md"), "type")).toBe("feature");
    expect(fmGet(fmOf(root, "docs/features/alpha/feature.md"), "lifecycle")).toBe("active");
    for (const f of ["plan.md", "DEV_KICKOFF.md", "sessions/2026-01-07-first.md", "artifacts/notes.md"]) expect(existsSync(join(root, "docs/features/alpha", f))).toBe(true);
    const beta = fmOf(root, "docs/items/beta/item.md");
    expect([fmGet(beta, "type"), fmGet(beta, "kind"), fmGet(beta, "lifecycle"), fmGet(beta, "description")]).toEqual(["item", "task", "done", "Beta was built without a proposal."]);
    const gamma = fmOf(root, "docs/features/_archive/gamma/feature.md");
    expect([fmGet(gamma, "type"), fmGet(gamma, "lifecycle"), fmGet(gamma, "title")]).toEqual(["feature", "done", "Proposal: Gamma"]);
    expect(fmGet(fmOf(root, "docs/features/_archive/gamma/sessions/2025-12-02-old.md"), "type")).toBe("session");
    expect(fmGet(fmOf(root, "docs/features/_archive/gamma/design.md"), "type")).toBe("artifact");
    // An owned document with no frontmatter, in a legacy archive: typed by position, in its closed state.
    const plan = fmOf(root, "docs/features/_archive/gamma/plan.md");
    expect([fmGet(plan, "type"), fmGet(plan, "lifecycle")]).toEqual(["plan", "completed"]);
    const report = fmOf(root, "docs/features/_archive/gamma/reports/2025-12-03-findings-report.md");
    expect([fmGet(report, "type"), fmGet(report, "lifecycle")]).toEqual(["report", null]);
  });

  test("the brief its owner moved into artifacts/ is an artifact now, with no lifecycle", () => {
    const { root } = wholeRun();
    const fm = fmOf(root, "docs/features/alpha/artifacts/2026-01-13-idea.md");
    expect(fmGet(fm, "type")).toBe("artifact");
    expect(fmGet(fm, "lifecycle")).toBeNull();
  });

  test("backlog and fragments: items, each lifecycle mapped, the archived one in items/_archive; the cycle moved onto them", () => {
    const { root } = wholeRun();
    const state = (rel: string) => fmGet(fmOf(root, rel), "lifecycle");
    expect(state("docs/items/open-item.md")).toBe("backlog");
    expect(state("docs/items/done-item.md")).toBe("done");
    expect(state("docs/items/promoted-item.md")).toBe("dropped");
    expect(state("docs/items/dropped-item.md")).toBe("dropped");
    expect(state("docs/items/_archive/archived-item.md")).toBe("done");
    expect(state("docs/items/a-thought.md")).toBe("triage");
    expect(fmGet(fmOf(root, "docs/items/open-item.md"), "cycle")).toBe("2026-01-mixed");
    expect(fmGet(fmOf(root, "docs/items/done-item.md"), "cycle")).toBe("2026-01-mixed");
    expect(fmGet(fmOf(root, "docs/items/dropped-item.md"), "cycle")).toBeNull();
    expect(fmOf(root, "docs/cycles/2026-01-mixed.md")).not.toContain("scope:");
  });

  test("investigations: a research item owning its write-up and its report; the archived one in items/_archive", () => {
    const { root } = wholeRun();
    const item = fmOf(root, "docs/items/question/item.md");
    expect([fmGet(item, "kind"), fmGet(item, "lifecycle"), fmGet(item, "description")]).toEqual(["research", "done", "Is it possible?"]);
    const wu = fmOf(root, "docs/items/question/write-up.md");
    expect([fmGet(wu, "type"), fmGet(wu, "lifecycle")]).toEqual(["write-up", null]);
    expect(existsSync(join(root, "docs/items/question/reports/2026-01-11-evidence-report.md"))).toBe(true);
    expect(fmGet(fmOf(root, "docs/items/_archive/old-question/item.md"), "lifecycle")).toBe("done");
  });

  test("every item has a unique v7 id", () => {
    const { root } = wholeRun();
    const items = readdirSync(join(root, "docs/items"), { recursive: true })
      .map(String)
      .filter((p) => p.endsWith(".md") && p !== "README.md" && !p.includes("/reports/") && !p.endsWith("write-up.md") && !p.includes("sessions/"));
    const ids = items.map((p) => fmGet(fmOf(root, `docs/items/${p}`), "id") as string);
    expect(items.length).toBe(9);
    for (const id of ids) expect(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("each migrated id is minted from the commit that first added its document, so ids sort in filing order and no two share a timestamp", () => {
    const { root } = wholeRun();
    const msOf = (id: string) => Number.parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
    // Fixture O is one commit: every item takes that commit's time, and the
    // ties are a millisecond apart.
    const committed = Date.parse(git(root, "log", "--reverse", "--format=%aI").trim().split("\n")[0] as string);
    for (const rel of ["docs/items/open-item.md", "docs/items/a-thought.md", "docs/items/beta/item.md"]) {
      const ms = msOf(fmGet(fmOf(root, rel), "id") as string);
      expect([rel, ms >= committed && ms < committed + 1000]).toEqual([rel, true]);
    }
    const ids = readdirSync(join(root, "docs/items"), { recursive: true })
      .map(String)
      .filter((p) => (/^(_archive\/)?[^/]+\.md$/.test(p) && p !== "README.md") || /(^|\/)item\.md$/.test(p))
      .map((p) => fmGet(fmOf(root, `docs/items/${p}`), "id") as string);
    expect(ids.length).toBe(9);
    expect(new Set(ids.map((id) => id.slice(0, 13))).size).toBe(ids.length);
  });

  test("two items committed the same day at different times mint those times, in that order — and a file moved before the run keeps its first commit's time", () => {
    const root = fixtureO();
    const at = (iso: string, files: Record<string, string>, message: string) => {
      write(root, files);
      git(root, "add", "-A");
      git(root, "commit", "-q", `--date=${iso}`, "-m", message);
    };
    // Path order is the reverse of time order, so a sort by path cannot pass.
    // Each new item resembles fixture O's backlog items, which `--follow`
    // reads as a copy: an add time taken through a copy would be fixture O's.
    at("2026-02-01T09:00:00Z", { "docs/backlog/2026-02-01-zz-early.md": doc(common("backlog", "Early", "Filed first.", { lifecycle: "open" }), "# Early\n") }, "early");
    at("2026-02-01T15:30:00Z", { "docs/backlog/2026-02-01-aa-late.md": doc(common("backlog", "Late", "Filed second.", { lifecycle: "open" }), "# Late\n") }, "late");
    at("2026-02-02T08:00:00Z", { "docs/backlog/2026-02-02-moved-before.md": doc(common("backlog", "Moved", "Renamed before the run.", { lifecycle: "open" }), "# Moved\n") }, "moved, before");
    git(root, "mv", "docs/backlog/2026-02-02-moved-before.md", "docs/backlog/2026-02-02-moved-after.md");
    git(root, "commit", "-q", "--date=2026-03-01T12:00:00Z", "-m", "rename");
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    const msOf = (rel: string) => {
      const id = fmGet(fmOf(root, rel), "id") as string;
      return Number.parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
    };
    expect(msOf("docs/items/zz-early.md")).toBe(Date.parse("2026-02-01T09:00:00Z"));
    expect(msOf("docs/items/aa-late.md")).toBe(Date.parse("2026-02-01T15:30:00Z"));
    expect(msOf("docs/items/moved-after.md")).toBe(Date.parse("2026-02-02T08:00:00Z"));
    // generated.at stays a date.
    expect(fmGet(fmOf(root, "docs/items/zz-early.md"), "generated")).toContain("at: 2026-01-01 }");
  });

  test("memories and lessons are kept and declared; the config's other bytes are the adopter's", () => {
    const { root } = wholeRun();
    expect(existsSync(join(root, "docs/memories/2026-01-14-first-memory.md"))).toBe(true);
    expect(existsSync(join(root, "docs/lessons-learned/a-lesson.md"))).toBe(true);
    const lint = readJson(join(root, ".project-docs.json")).lint;
    expect(lint.types).toEqual({ memories: "memory", "lessons-learned": "lesson" });
    expect(lint.durable).toContain("memories");
    expect(lint.workbench).toEqual(["cycles", "features", "items"]);
    expect(lint.skip).toEqual([]);
    expect(lint.scopes).toEqual([]);
    expect(lint.exclude).toEqual(["docs/features/alpha/artifacts/*-prototype.md"]);
  });

  test("no document's prose changed — only link targets and frontmatter", () => {
    const { root } = wholeRun();
    const moved: Record<string, string> = {
      "docs/backlog/2026-01-01-open-item.md": "docs/items/open-item.md",
      "docs/backlog/2026-01-03-promoted-item.md": "docs/items/promoted-item.md",
      "docs/projects/alpha/proposal.md": "docs/features/alpha/feature.md",
      "docs/projects/alpha/plan.md": "docs/features/alpha/plan.md",
      "docs/projects/alpha/artifacts/notes.md": "docs/features/alpha/artifacts/notes.md",
      "docs/projects/_archive/gamma/proposal.md": "docs/features/_archive/gamma/feature.md",
      "docs/projects/_archive/gamma/sessions/2025-12-02-old.md": "docs/features/_archive/gamma/sessions/2025-12-02-old.md",
      "docs/investigations/2026-01-10-question-investigation.md": "docs/items/question/write-up.md",
      "docs/reports/2026-01-11-evidence-report.md": "docs/items/question/reports/2026-01-11-evidence-report.md",
      "docs/cycles/2026-01-mixed.md": "docs/cycles/2026-01-mixed.md",
      "README.md": "README.md",
    };
    for (const [from, to] of Object.entries(moved)) {
      const original = SHAPES[from] as string;
      const now = read(root, to);
      expect([to, prose(from === "README.md" ? `---\n\n---\n${now}` : now)]).toEqual([to, prose(from === "README.md" ? `---\n\n---\n${original}` : original)]);
    }
  });

  test("links: the root README resolves, and every proposal.md link now points at feature.md", () => {
    const { root } = wholeRun();
    expect(read(root, "README.md")).toContain("[An open item](docs/items/open-item.md)");
    expect(read(root, "README.md")).toContain("[Alpha](docs/features/alpha/feature.md#alpha)");
    expect(read(root, "README.md")).toContain("[The backlog](docs/items/)");
    expect(read(root, "docs/items/open-item.md")).toContain("[alpha](../features/alpha/feature.md)");
    expect(read(root, "docs/features/alpha/plan.md")).toContain("[Proposal](./feature.md)");
    expect(read(root, "docs/features/alpha/plan.md")).toContain("[question](../../items/question/write-up.md)");
    expect(read(root, "docs/features/alpha/artifacts/notes.md")).toContain("[Backlog item](../../../items/open-item.md)");
    expect(read(root, "docs/cycles/2026-01-mixed.md")).toContain("[Alpha](../features/alpha/feature.md)");
    const all = readdirSync(join(root, "docs"), { recursive: true }).map(String).filter((p) => p.endsWith(".md"));
    for (const p of all) expect([p, read(root, `docs/${p}`).includes("proposal.md)")]).toEqual([p, false]);
  });

  test("archived entities sit in items/_archive or features/_archive, in a terminal state", () => {
    const { root } = wholeRun();
    for (const base of ["docs/items/_archive", "docs/features/_archive"])
      for (const p of readdirSync(join(root, base), { recursive: true }).map(String).filter((x) => /(^|\/)(item|feature)\.md$|^[^/]+\.md$/.test(x)))
        expect([p, ["done", "dropped"].includes(fmGet(fmOf(root, `${base}/${p}`), "lifecycle") as string)]).toEqual([p, true]);
  });

  test("templates: the moved ones at their new paths with their records carried; the retired ones gone; STYLE.md installed", () => {
    const { root } = wholeRun();
    const m = readJson(join(root, "docs/.pdocs-seed.json"));
    expect(m.version).toBe("9.9.9");
    for (const t of ["TEMPLATES/PLAN.template.md", "TEMPLATES/FEATURE.template.md", "TEMPLATES/REPORT.template.md", "TEMPLATES/ITEM.template.md", "STYLE.md"]) {
      expect(existsSync(join(root, "docs", t))).toBe(true);
      expect(m.files[t]).toBe(hashOf(join(root, "docs", t)));
    }
    for (const t of Object.keys(m.files)) expect([t, t.startsWith("projects/") || t.startsWith("backlog/")]).toEqual([t, false]);
    expect(existsSync(join(root, "docs/memories/TEMPLATE.md"))).toBe(true);
  });

  test("every move is named in the output", () => {
    const { r } = wholeRun();
    for (const line of [
      "✓ moved docs/projects/alpha/ → docs/features/alpha/",
      "✓ moved docs/projects/_archive/gamma/ → docs/features/_archive/gamma/",
      "✓ moved docs/backlog/2026-01-01-open-item.md → docs/items/open-item.md",
      "✓ moved docs/investigations/2026-01-10-question-investigation.md → docs/items/question/write-up.md",
      "✓ moved docs/reports/2026-01-11-evidence-report.md → docs/items/question/reports/2026-01-11-evidence-report.md",
      "✓ template moved: docs/projects/TEMPLATES/PLAN.template.md → docs/TEMPLATES/PLAN.template.md",
      "promoted → dropped: listed for review",
    ])
      expect(r.out).toContain(line);
  });
});

// ─── Idempotence, the dry run, and format-before-record ──────────────────────

describe("the Delete option for memories and lessons", () => {
  test("with both folders deleted before the run, their templates' seed records go too, and neither is declared", () => {
    const root = fixtureO();
    rmSync(join(root, "docs/memories"), { recursive: true });
    rmSync(join(root, "docs/lessons-learned"), { recursive: true });
    const index = read(root, "docs/index.md");
    const a = index.indexOf("## Lessons learned");
    write(root, { "docs/index.md": index.slice(0, a).replace(/\n+$/, "\n") });
    commitAll(root, "the adopter deleted memories and lessons");
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    const m = readJson(join(root, "docs/.pdocs-seed.json"));
    expect(Object.keys(m.files).filter((k) => k.startsWith("memories/") || k.startsWith("lessons-learned/"))).toEqual([]);
    const lint = readJson(join(root, ".project-docs.json")).lint;
    expect(lint.durable).not.toContain("memories");
    expect(lint.types ?? {}).toEqual({});
  });
});

describe("idempotence and dry run", () => {
  test("a second run finds its work done and changes no byte", () => {
    const root = fixtureO();
    expect(migrate(root).exitCode).toBe(0);
    commitAll(root, "migrated");
    const before = treeDigest(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("✓ git tree clean");
    expect(r.out).toContain("none — nothing left in a retired folder");
    expect(r.out).toContain("✓ scripts/pdocs/ already identical to the scaffold's");
    expect(r.out).toContain("✓ nothing to move — no document is left in a retired folder");
    expect(r.out).toContain("✓ no link pointed at a moved document");
    expect(r.out).toContain("✓ .project-docs.json already carries the 9.0.0 lint keys");
    expect(r.out).toContain("✓ docs/.pdocs-seed.json unchanged");
    expect(r.out).toContain("✓ .project-docs.json already at 9.9.9");
    expect(treeDigest(root)).toEqual(before);
  });

  test("--dry-run prints the move map and every config key, and leaves O byte-identical", () => {
    const root = fixtureO();
    const before = treeDigest(root);
    const r = migrate(root, ["--dry-run"]);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("· would move docs/projects/alpha/ → docs/features/alpha/ (feature, approved → active)");
    expect(r.out).toContain("· would move docs/backlog/2026-01-01-open-item.md → docs/items/open-item.md (item, open → backlog)");
    expect(r.out).toContain("· frontmatter: docs/items/open-item.md — type: backlog → item");
    expect(r.out).toContain("· config: lint.skip: -_archive");
    expect(r.out).toContain("Dry run complete — nothing was changed.");
    expect(r.out).not.toContain("[4/12]");
    expect(treeDigest(root)).toEqual(before);
  });

  test("--dry-run without --scaffold-dir generates the scaffold and removes it", () => {
    const root = fixtureO();
    const r = migrate(root, ["--dry-run"], { scaffold: null, env: { PATH: stubCookiecutter("copy") } });
    expect(r.exitCode).toBe(0);
    const at = /✓ generated at (.+)$/m.exec(r.out)?.[1];
    expect(at).toBeDefined();
    expect(existsSync(at as string)).toBe(false);
  });

  test("the cookiecutter call checks out project-docs-scaffold-template-v9.0.0 (D16)", () => {
    const dir = tmp("migrate-v30-rec-");
    const log = join(dir, "args.log");
    writeFileSync(join(dir, "cookiecutter"), `#!/bin/sh\nprintf '%s\\n' "$@" > "${log}"\nexit 3\n`);
    chmodSync(join(dir, "cookiecutter"), 0o755);
    const r = migrate(fixtureO(), ["--dry-run"], { scaffold: null, env: { PATH: `${dir}:${process.env.PATH}` } });
    expect(r.exitCode).toBe(1);
    const args = read(dir, "args.log").split("\n");
    expect(args[args.indexOf("--checkout") + 1]).toBe("project-docs-scaffold-template-v9.0.0");
  });
});

function stubCookiecutter(mode: "fail" | "copy", source: string = target()): string {
  const dir = tmp("migrate-v30-stubcc-");
  writeFileSync(
    join(dir, "cookiecutter"),
    `#!/bin/sh\nout=""\nwhile [ $# -gt 0 ]; do\n  if [ "$1" = "-o" ]; then out="$2"; shift; fi\n  shift\ndone\ncase "${mode}" in\n  fail) echo "stub cookiecutter: boom" >&2; exit 3 ;;\n  copy) cp -R "${source}" "$out/my-project" ;;\nesac\nexit 0\n`
  );
  chmodSync(join(dir, "cookiecutter"), 0o755);
  return `${dir}:${process.env.PATH}`;
}

function stubNpx(mode: "append" | "fail"): string {
  const dir = tmp("migrate-v30-stubnpx-");
  writeFileSync(
    join(dir, "npx"),
    `#!/bin/sh\n[ "$1" = "prettier" ] && [ "$2" = "--write" ] || exit 4\nshift 2\ncase "${mode}" in\n  fail) echo "stub prettier: boom" >&2; exit 1 ;;\n  append) for f in "$@"; do printf '\\n<!-- formatted by the stub -->\\n' >> "$f"; done ;;\nesac\nexit 0\n`
  );
  chmodSync(join(dir, "npx"), 0o755);
  return `${dir}:${process.env.PATH}`;
}

describe("format before record", () => {
  test("what the run created is formatted before the record; a document of the adopter's is not", () => {
    const root = fixtureO();
    const r = migrate(root, [], { format: true, env: { PATH: stubNpx("append") } });
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("no document of yours was formatted");
    expect(read(root, "docs/items/beta/item.md")).toContain("formatted by the stub");
    expect(read(root, "docs/TEMPLATES/PLAN.template.md")).toContain("formatted by the stub");
    expect(readJson(join(root, "docs/.pdocs-seed.json")).files["TEMPLATES/PLAN.template.md"]).toBe(hashOf(join(root, "docs/TEMPLATES/PLAN.template.md")));
    expect(read(root, "docs/features/alpha/feature.md")).not.toContain("formatted by the stub");
  });

  test("a formatter that fails stops the run before the record", () => {
    const root = fixtureO();
    const r = migrate(root, [], { format: true, env: { PATH: stubNpx("fail") } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: prettier exited 1");
    expect(readJson(join(root, "docs/.pdocs-seed.json")).version).toBe("8.1.0");
  });
});

// ─── Guards that must be able to fire ────────────────────────────────────────

describe("bad invocation exits 2, not 1", () => {
  const bad = (...args: string[]) => Bun.spawnSync(["bun", SCRIPT, ...args], { stdout: "pipe", stderr: "pipe", env: childEnv() });
  test.each([
    [["--root"], "--root needs a value"],
    [["--scaffold-dir", "--dry-run"], "--scaffold-dir needs a value"],
    [["--root", ""], "--root was given an empty value"],
    [["--scaffold-dir", " "], "--scaffold-dir was given an empty value"],
    [["--nope"], "unknown argument `--nope`"],
  ])("%p", (args, message) => {
    const r = bad(...(args as string[]));
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain(message as string);
  });
});

describe("guards that must be able to fire", () => {
  const stops = (r: Run, reason: string, nothingWritten = true) => {
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain(reason);
    if (nothingWritten) expect(r.out).toContain("Nothing was written.");
  };

  test("preflight: not a v2.10 tree — the lint without isSeeded names the migration that owns it", () => {
    const root = fixtureO();
    write(root, { "scripts/pdocs/lint/rules.ts": "// the 8.0.0 rule\n" });
    commitAll(root, "an older lint");
    stops(migrate(root), "scripts/pdocs/lint/rules.ts carrying `isSeeded` (v2.9-to-v2.10 refreshes it)");
  });

  test("preflight: a bare directory is not a v2.10 tree", () => {
    stops(migrate(tmp("migrate-v30-bare-")), "STOPPED: this is not a v2.10 tree");
  });

  test("preflight: a .project-docs.json that is not JSON", () => {
    const root = fixtureO();
    writeFileSync(join(root, ".project-docs.json"), "{ nope");
    stops(migrate(root), "STOPPED: .project-docs.json is not valid JSON");
  });

  test("preflight: a brief is a judgment step, named with its suggested owner", () => {
    const root = fixtureO({ "docs/briefs/2026-01-20-idea.md": doc(common("brief", "Idea", "An idea.", { lifecycle: "active" }), "# Idea\n\nFor [alpha](../projects/alpha/proposal.md).\n") });
    const before = treeDigest(root);
    const r = migrate(root);
    stops(r, "docs/briefs/2026-01-20-idea.md — a brief. Move it into its owner's artifacts/ folder (suggested: the one project it links to, projects/alpha/artifacts/");
    expect(treeDigest(root)).toEqual(before);
  });

  test("preflight: a report with no owner is a judgment step; the dry run stops on it too", () => {
    const root = fixtureO({ "docs/reports/2026-01-21-loose-report.md": doc(common("report", "Loose", "Nobody owns it."), "# Loose\n") });
    stops(migrate(root, ["--dry-run"]), "docs/reports/2026-01-21-loose-report.md — a report with no owner");
  });

  test("preflight: a retired template the adopter edited is a judgment step", () => {
    const root = fixtureO({ "docs/backlog/TEMPLATE.md": "my own backlog form\n" });
    stops(migrate(root), "docs/backlog/TEMPLATE.md — the form for a type 9.0.0 retires, and you have edited it");
  });

  test("preflight: every blocker is listed at once", () => {
    const root = fixtureO({
      "docs/briefs/2026-01-20-idea.md": doc(common("brief", "Idea", "An idea.", { lifecycle: "active" }), "# Idea\n"),
      "docs/reports/2026-01-21-loose-report.md": doc(common("report", "Loose", "Nobody owns it."), "# Loose\n"),
      "docs/backlog/notes.txt": "x\n",
    });
    const r = migrate(root);
    stops(r, "STOPPED: 3 judgment step(s)");
    expect(r.out).toContain("docs/backlog/notes.txt — not a document");
  });

  test("preflight: an uncommitted edit in the docs stops the run; --force writes over it", () => {
    const root = fixtureO();
    writeFileSync(join(root, "docs/backlog/2026-01-02-done-item.md"), `${SHAPES["docs/backlog/2026-01-02-done-item.md"]}\nuncommitted\n`);
    const r = migrate(root);
    stops(r, "path(s) this run would write have uncommitted changes");
    expect(r.out).toContain("docs/backlog/2026-01-02-done-item.md");
    expect(migrate(root, ["--force"]).exitCode).toBe(0);
    expect(read(root, "docs/items/done-item.md")).toContain("uncommitted");
  });

  test("preflight: an uncommitted edit to a file outside the docs that the rewrite would change stops the run", () => {
    const root = fixtureO();
    writeFileSync(join(root, "README.md"), `${SHAPES["README.md"]}\nmine\n`);
    const r = migrate(root);
    stops(r, "path(s) this run would write have uncommitted changes");
    expect(r.out).toContain("       README.md");
  });

  test("preflight: bun off PATH", () => {
    stops(migrate(fixtureO(), [], { bun: Bun.which("bun") as string, env: { PATH: "/usr/bin:/bin" } }), "STOPPED: bun is not on PATH");
  });

  test("preflight: cookiecutter missing with no --scaffold-dir", () => {
    stops(migrate(fixtureO(), [], { scaffold: null, env: { PATH: `${dirname(Bun.which("bun") as string)}:/usr/bin:/bin` } }), "STOPPED: cookiecutter is not installed");
  });

  test("preflight: npx missing without --skip-format", () => {
    stops(migrate(fixtureO(), [], { format: true, env: { PATH: `${dirname(Bun.which("bun") as string)}:/usr/bin:/bin` } }), "STOPPED: npx not found");
  });

  test("scaffold: cookiecutter exiting non-zero", () => {
    stops(migrate(fixtureO(), [], { scaffold: null, env: { PATH: stubCookiecutter("fail") } }), "STOPPED: cookiecutter failed (exit 3)");
  });

  test("scaffold: a --scaffold-dir that is not a generated project root", () => {
    stops(migrate(fixtureO(), [], { scaffold: tmp("migrate-v30-notroot-") }), "is not a generated project root");
  });

  test("scaffold: the 8.1.0 scaffold is older than this migration, in both modes, before anything is written", () => {
    const root = fixtureO();
    const before = treeDigest(root);
    for (const args of [["--dry-run"], []]) {
      const r = migrate(root, args, { scaffold: generatedScaffolds().old });
      stops(r, "is older than this migration requires (release 8.1.0, missing scripts/pdocs/lint/registry.ts carrying `FEATURES_FOLDER`");
      expect(r.out).not.toContain("[3/12]");
    }
    expect(treeDigest(root)).toEqual(before);
  });

  test("verify: a tree the refreshed lint rejects stops the run after the moves, before the markers", () => {
    // A library page with no tags: the 8.1.0 lint and the 9.0.0 lint both reject it.
    const root = fixtureO({ "docs/memories/2026-01-22-bare.md": doc(common("memory", "Bare", "No tags."), "# Bare\n") });
    const r = migrate(root);
    stops(r, "STOPPED: `pdocs check` exits 9 on the migrated tree", false);
    expect(r.out).toContain("MISSING tags");
    expect(r.out).toContain("the version markers were NOT moved");
    expect(existsSync(join(root, "docs/items/open-item.md"))).toBe(true);
    expect(readJson(join(root, ".project-docs.json")).version).toBe("8.1.0");
  });

  test("an unexpected exception is exit 1 with a named reason", () => {
    const root = fixtureO();
    rmSync(join(root, "docs/SCHEMA.md"));
    mkdirSync(join(root, "docs/SCHEMA.md"));
    writeFileSync(join(root, "docs/SCHEMA.md/x.md"), "x\n");
    commitAll(root, "SCHEMA.md is a directory");
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED:");
    expect(r.out).not.toContain("    at ");
  });

  test("the seam refuses a path outside the docs root", () => {
    stops(migrate(fixtureO(), [], { env: { PDOCS_MIGRATE_TEST_MUTATE: "../outside.md" } }), "PDOCS_MIGRATE_TEST_MUTATE must name a path inside the docs root", false);
  });
});

// ─── The end-of-run invariants, and the wiring witnesses ─────────────────────

describe("the end-of-run invariants can fire", () => {
  test("a recorded template changed after the record fails the run and names the ordering", () => {
    const r = migrate(fixtureO(), [], { env: { PDOCS_MIGRATE_TEST_MUTATE: "TEMPLATES/PLAN.template.md" } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: the migration's own invariants do not hold after this run:");
    expect(r.out).toContain("seeded file(s) this run recorded no longer match the record");
  });

  test("a moved document changed after the move phase fails the run", () => {
    const r = migrate(fixtureO(), [], { env: { PDOCS_MIGRATE_TEST_MUTATE: "items/open-item.md" } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("do not hold their planned text");
  });
});

function patchedScript(find: string, replacement?: string): string {
  const src = readFileSync(SCRIPT, "utf8");
  if (!src.includes(find)) throw new Error(`not in the script, so nothing was neutered: ${find}`);
  const dir = tmp("migrate-v30-patched-");
  const copy = join(dir, basename(SCRIPT));
  writeFileSync(copy, src.replace(find, replacement ?? `/* neutered: ${find.trim()} */`));
  return copy;
}

describe("wiring witnesses — each phase's call site, neutered", () => {
  test("phase 1 preflight: neutered, a brief the intact script stops on is not named, and the run cannot plan", () => {
    const root = fixtureO({ "docs/briefs/2026-01-20-idea.md": doc(common("brief", "Idea", "An idea.", { lifecycle: "active" }), "# Idea\n") });
    expect(migrate(root).out).toContain("a brief. Move it");
    const r = migrate(root, [], { script: patchedScript("\n    preflight(ctx);\n") });
    expect(r.out).not.toContain("[1/12]");
    expect(r.out).not.toContain("a brief. Move it");
    expect(r.exitCode).toBe(1);
  });

  test("phase 2 scaffold: neutered, there is nothing to verify", () => {
    const r = migrate(fixtureO(), [], { script: patchedScript("\n    ctx.scaffoldDir = getScaffold(ctx);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("no scaffold to verify — the scaffold phase did not run");
  });

  test("phase 3 plan: neutered, the dry run names no move", () => {
    const r = migrate(fixtureO(), ["--dry-run"], { script: patchedScript("\n    printPlan(ctx);\n") });
    expect(r.out).not.toContain("would move");
    expect(migrate(fixtureO(), ["--dry-run"]).out).toContain("would move");
  });

  test("phase 4 refresh: neutered, the run stops — the old CLI and SCHEMA.md are still there", () => {
    const r = migrate(fixtureO(), [], { script: patchedScript("\n    refreshOwned(ctx);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).not.toContain("[4/12]");
  });

  test("phase 5 move: neutered, the verify phase finds the retired folders still there", () => {
    const r = migrate(fixtureO(), [], { script: patchedScript("\n    moveDocuments(ctx);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("remain in a retired folder");
  });

  test("phase 6 links: neutered, the root README's links are left pointing at nothing", () => {
    const r = migrate(fixtureO(), [], { script: patchedScript("\n    rewriteInPlace(ctx);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("README.md");
  });

  test("phase 7 config: neutered, the verify phase finds a tree the refreshed lint rejects", () => {
    // The retired folders still in lint.workbench and features/ in no tier: the refreshed lint rejects the tree.
    const r = migrate(fixtureO(), [], { script: patchedScript("\n    patchConfig(ctx);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).not.toContain("[7/12]");
    expect(r.out).toContain("the version markers were NOT moved");
  });

  test("phase 8 seeds: neutered, there is no record to write", () => {
    const r = migrate(fixtureO(), [], { script: patchedScript("\n    reconcileSeeds(ctx, version);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: no record to write — the seeds phase did not run.");
  });

  test("verify: a file left in a retired folder stops the run — the seeds phase's removals skipped", () => {
    // The retired templates are what phase 8 removes; with that loop gone they
    // stay behind, and the verify phase's own assertion must name them.
    const r = migrate(fixtureO(), [], { script: patchedScript("  for (const rel of c.templates.removals) {", "  for (const rel of [] as string[]) {") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("remain in a retired folder");
    expect(r.out).toContain("docs/backlog/TEMPLATE.md");
  });

  test("phase 9 record: neutered, the record is found at the old release", () => {
    const r = migrate(fixtureO(), [], { script: patchedScript("\n    formatAndRecord(ctx);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain('docs/.pdocs-seed.json version is "8.1.0", not 9.9.9');
  });

  test("phase 10 verify: neutered, the markers move on a red tree and the invariant catches it", () => {
    const root = fixtureO({ "docs/memories/2026-01-22-bare.md": doc(common("memory", "Bare", "No tags."), "# Bare\n") });
    const r = migrate(root, [], { script: patchedScript("\n    verify(ctx);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("✓ docs/README.md set to 9.9.9");
    expect(r.out).toContain("the verify phase stops the run before the markers move");
  });

  test("phase 11 version: neutered, both markers are found short", () => {
    const r = migrate(fixtureO(), [], { script: patchedScript("\n    bumpVersion(ctx, version);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("docs/README.md docs_version is 8.1.0, not 9.9.9");
    expect(r.out).toContain('.project-docs.json version is "8.1.0", not 9.9.9');
  });

  test("phase 12 cleanup: neutered, the generated scaffold is found still on disk", () => {
    const r = migrate(fixtureO(), [], { script: patchedScript("\n    cleanup(ctx);\n\n"), scaffold: null, env: { PATH: stubCookiecutter("copy") } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("the generated scaffold is still on disk");
  });
});

// ─── Recovery: an interrupted run, and a re-run after a red verify ───────────

/** Every file's text (or hash) with the minted ids blanked, the run-state file left out:
 *  what "the same result as an uninterrupted run" compares. */
function outcome(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rel, h] of Object.entries(treeDigest(root))) {
    if (rel.startsWith(".pdocs-migrate")) continue;
    out[rel] = rel.endsWith(".md") ? read(root, rel).replace(/^id: .*$/m, "id: <id>").replace(/^cycle: .*$/m, (l) => l) : h;
  }
  return out;
}

let clean: Record<string, string> | null = null;
/** The outcome of one uninterrupted run on O. */
const uninterrupted = () => {
  if (clean) return clean;
  const root = fixtureO();
  expect(migrate(root).exitCode).toBe(0);
  clean = outcome(root);
  return clean;
};

describe("an interrupted run is finished by re-running the same command, uncommitted", () => {
  const cases: Array<[string, string, (root: string) => void, (root: string) => void]> = [
    [
      "phase 4: a retired README cannot be removed",
      "[4/12]",
      (root) => chmodSync(join(root, "docs/fragments"), 0o555),
      (root) => chmodSync(join(root, "docs/fragments"), 0o755),
    ],
    [
      "phase 5, mid-moves: a move out of investigations/_archive/ fails after others have landed",
      "[5/12]",
      (root) => chmodSync(join(root, "docs/investigations/_archive"), 0o555),
      (root) => chmodSync(join(root, "docs/investigations/_archive"), 0o755),
    ],
    [
      "phase 5, after the moves: a moved document cannot take its new frontmatter",
      "[5/12]",
      (root) => chmodSync(join(root, "docs/backlog/2026-01-02-done-item.md"), 0o444),
      (root) => chmodSync(join(root, "docs/items/done-item.md"), 0o644),
    ],
    [
      "phase 6: a file outside the docs cannot take its rewritten links",
      "[6/12]",
      (root) => chmodSync(join(root, "README.md"), 0o444),
      (root) => chmodSync(join(root, "README.md"), 0o644),
    ],
    [
      "phase 7: the config cannot be written",
      "[7/12]",
      (root) => chmodSync(join(root, ".project-docs.json"), 0o444),
      (root) => chmodSync(join(root, ".project-docs.json"), 0o644),
    ],
    [
      "phase 8: a retired template cannot be removed",
      "[8/12]",
      (root) => chmodSync(join(root, "docs/briefs/TEMPLATES"), 0o555),
      (root) => chmodSync(join(root, "docs/briefs/TEMPLATES"), 0o755),
    ],
  ];
  for (const [name, phase, breakIt, fixIt] of cases)
    test(name, () => {
      const root = fixtureO();
      breakIt(root);
      const first = migrate(root);
      expect(first.exitCode).toBe(1);
      expect(first.out).toContain(phase);
      expect(first.out).toContain("The tree may be partly migrated");
      fixIt(root);
      const again = migrate(root);
      if (again.exitCode !== 0) console.log(again.out);
      expect(again.exitCode).toBe(0);
      expect(again.out).toContain("Migration complete.");
      expect(outcome(root)).toEqual(uninterrupted());
      expect(existsSync(join(root, ".pdocs-migrate-v2.10-to-v3.0.json"))).toBe(false);
      expect(existsSync(RECORD(root))).toBe(false);
    });
});

describe("a red verify, worked without committing, then the same command", () => {
  test("the re-run recognises its own uncommitted output, keeps the adopter's fixes, and completes", () => {
    const root = fixtureO({ "docs/memories/2026-01-22-bare.md": doc(common("memory", "Bare", "No tags."), "# Bare\n") });
    const first = migrate(root);
    expect(first.exitCode).toBe(1);
    expect(first.out).toContain("MISSING tags");
    expect(first.out).toContain("without committing");
    // The adopter works the problem, and edits a moved document too — nothing committed.
    write(root, {
      "docs/memories/2026-01-22-bare.md": doc(common("memory", "Bare", "No tags.", { tags: "[history]" }), "# Bare\n"),
      "docs/items/open-item.md": `${read(root, "docs/items/open-item.md")}\nMy note after the migration.\n`,
    });
    const index = read(root, "docs/index.md").replace("Something else that happened.", "Something else that happened.\n- [Bare](./memories/2026-01-22-bare.md) — No tags.");
    write(root, { "docs/index.md": index });
    const again = migrate(root);
    if (again.exitCode !== 0) console.log(again.out);
    expect(again.exitCode).toBe(0);
    expect(read(root, "docs/items/open-item.md")).toContain("My note after the migration.");
    expect(readJson(join(root, ".project-docs.json")).version).toBe("9.9.9");
  });

  test("an edit of the adopter's in a path the re-run would write still stops it", () => {
    const root = fixtureO({ "docs/memories/2026-01-22-bare.md": doc(common("memory", "Bare", "No tags."), "# Bare\n") });
    expect(migrate(root).exitCode).toBe(1);
    write(root, { "docs/SCHEMA.md": `${read(root, "docs/SCHEMA.md")}\nmine\n` });
    const again = migrate(root);
    expect(again.exitCode).toBe(1);
    expect(again.out).toContain("path(s) this run would write have uncommitted changes");
    expect(again.out).toContain("docs/SCHEMA.md");
    expect(again.out).not.toContain("docs/items/");
  });
});

// ─── Recovery must never cost the adopter an edit ────────────────────────────

const RECORD = (root: string) => join(root, ".git", "pdocs-migrate-v2.10-to-v3.0.json");

describe("a resumed run and the edits made after the stop", () => {
  const edited = ["docs/features/alpha/plan.md", "docs/features/alpha/feature.md", "docs/items/open-item.md", "README.md"];
  const stopInPhase5 = () => {
    const root = fixtureO();
    chmodSync(join(root, "docs/backlog/2026-01-02-done-item.md"), 0o444);
    const first = migrate(root);
    expect(first.exitCode).toBe(1);
    expect(first.out).toContain("[5/12]");
    chmodSync(join(root, "docs/items/done-item.md"), 0o644);
    return root;
  };

  test("stopped in phase 5: an edit to a moved document or a file the rewrite owes stops the re-run, and survives it", () => {
    const root = stopInPhase5();
    for (const f of edited) write(root, { [f]: `${read(root, f)}\nMY EDIT AFTER THE STOP\n` });
    const again = migrate(root);
    expect(again.exitCode).toBe(1);
    for (const f of edited) expect(again.out).toContain(`       ${f}`);
    expect(again.out).toContain("--force");
    for (const f of edited) expect(read(root, f)).toContain("MY EDIT AFTER THE STOP");
  });

  test("stopped in phase 5, re-run with --force: the recorded plan is written over the edits, as documented", () => {
    const root = stopInPhase5();
    write(root, { "docs/items/open-item.md": `${read(root, "docs/items/open-item.md")}\nMY EDIT AFTER THE STOP\n` });
    const again = migrate(root, ["--force"]);
    expect(again.exitCode).toBe(0);
    expect(again.out).toContain("--force: the recorded plan is written over 1 path(s) changed since the stop: docs/items/open-item.md");
    expect(read(root, "docs/items/open-item.md")).not.toContain("MY EDIT AFTER THE STOP");
  });

  test("stopped in phase 6: an edit to a document phase 5 already wrote, or to the file it stopped on, stops the re-run", () => {
    const root = fixtureO();
    chmodSync(join(root, "README.md"), 0o444);
    expect(migrate(root).out).toContain("[6/12]");
    chmodSync(join(root, "README.md"), 0o644);
    for (const f of ["docs/features/alpha/plan.md", "README.md"]) write(root, { [f]: `${read(root, f)}\nMY EDIT AFTER THE STOP\n` });
    const again = migrate(root);
    expect(again.exitCode).toBe(1);
    expect(again.out).toContain("       docs/features/alpha/plan.md");
    expect(again.out).toContain("       README.md");
    expect(read(root, "README.md")).toContain("MY EDIT AFTER THE STOP");
  });

  test("the same, outside git: the resume's own hash check stops it", () => {
    const root = stopInPhase5();
    // Move the repository aside: no git, so no dirt check — only the record's hashes.
    const record = readFileSync(RECORD(root), "utf8");
    rmSync(join(root, ".git"), { recursive: true, force: true });
    writeFileSync(join(root, ".pdocs-migrate-v2.10-to-v3.0.json"), record);
    write(root, { "docs/items/open-item.md": `${read(root, "docs/items/open-item.md")}\nMY EDIT AFTER THE STOP\n` });
    const again = migrate(root);
    expect(again.exitCode).toBe(1);
    expect(again.out).toContain("       docs/items/open-item.md");
    expect(read(root, "docs/items/open-item.md")).toContain("MY EDIT AFTER THE STOP");
  });
});

describe("the run's record", () => {
  test("it lives inside .git, so no `git add -A` commits it", () => {
    const root = fixtureO();
    chmodSync(join(root, "README.md"), 0o444);
    expect(migrate(root).exitCode).toBe(1);
    chmodSync(join(root, "README.md"), 0o644);
    expect(existsSync(RECORD(root))).toBe(true);
    expect(existsSync(join(root, ".pdocs-migrate-v2.10-to-v3.0.json"))).toBe(false);
    expect(git(root, "status", "--porcelain", "--untracked-files=all")).not.toContain("pdocs-migrate");
  });

  test("after a resume, the last line counts what the whole migration removed", () => {
    const root = fixtureO();
    chmodSync(join(root, "docs/briefs/TEMPLATES"), 0o555);
    expect(migrate(root).out).toContain("[8/12]");
    chmodSync(join(root, "docs/briefs/TEMPLATES"), 0o755);
    const again = migrate(root);
    expect(again.exitCode).toBe(0);
    expect(again.out).toContain("6 retired owned README(s)");
    expect(again.out).toContain("4 untouched retired template(s)");
  });

  test("a corrupt record stops the run and says how to recover without it", () => {
    const root = fixtureO();
    chmodSync(join(root, "README.md"), 0o444);
    expect(migrate(root).exitCode).toBe(1);
    chmodSync(join(root, "README.md"), 0o644);
    writeFileSync(RECORD(root), "{ not json");
    const again = migrate(root);
    expect(again.exitCode).toBe(1);
    expect(again.out).toContain("is not valid JSON");
    expect(again.out).toContain("git stash push --include-untracked");
  });
});

// ─── The record's safety, and the resume's edges ─────────────────────────────

describe("recovering without a record never costs the adopter work", () => {
  const stopInPhase6 = () => {
    const root = fixtureO();
    chmodSync(join(root, "README.md"), 0o444);
    const first = migrate(root);
    expect(first.out).toContain("[6/12]");
    chmodSync(join(root, "README.md"), 0o644);
    return { root, first };
  };

  test("the first run names the commit it starts from, and the record keeps it", () => {
    const { root, first } = stopInPhase6();
    const head = git(root, "rev-parse", "HEAD").trim();
    expect(first.out).toContain(`starting from commit ${head}`);
    expect(readJson(RECORD(root)).base).toBe(head);
  });

  test("a corrupt record's stop gives a reversible, scoped procedure, and no destructive command", () => {
    const { root } = stopInPhase6();
    writeFileSync(RECORD(root), "{ not json");
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain('git stash push --include-untracked -m "before re-running the v3.0 migration"');
    expect(r.out).toContain("git reset --hard <the commit before the first run>");
    expect(r.out).toContain("git checkout stash@{0} -- <path>");
    // Untracked files live in the stash's third parent: listed and restored from there.
    expect(r.out).toContain("git stash show --include-untracked stash@{0}");
    expect(r.out).toContain("git show --stat 'stash@{0}^3'");
    expect(r.out).toContain("git checkout 'stash@{0}^3' -- <path>");
    expect(r.out).toContain("Don't drop the stash until everything of yours is back");
    // A document the migration also rewrites is re-edited by hand, not restored half-migrated.
    expect(r.out).toContain("git diff stash@{0} -- <path>");
    expect(r.out).toContain("do not restore the stashed copy");
    // The reset drops the adopter's own commits after the base too.
    expect(r.out).toContain("git reflog");
    expect(r.out).toContain("git cherry-pick");
    expect(r.out).toContain("Without git");
    expect(r.out).not.toContain("git clean");
    expect(r.out).not.toContain("checkout -- .");
  });

  test("the record is written atomically: a save that fails leaves the previous record whole", () => {
    const { root } = stopInPhase6();
    const before = readFileSync(RECORD(root), "utf8");
    mkdirSync(`${RECORD(root)}.tmp`); // the temp file cannot be written
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(readFileSync(RECORD(root), "utf8")).toBe(before);
    expect(() => JSON.parse(readFileSync(RECORD(root), "utf8"))).not.toThrow();
  });
});

describe("the resume's edges", () => {
  const stopInPhase5 = () => {
    const root = fixtureO();
    chmodSync(join(root, "docs/backlog/2026-01-02-done-item.md"), 0o444);
    expect(migrate(root).out).toContain("[5/12]");
    chmodSync(join(root, "docs/items/done-item.md"), 0o644);
    return root;
  };

  test("a new file of yours inside a moved folder does not block the resume, and is neither claimed nor touched", () => {
    const root = stopInPhase5();
    const mine = doc(common("artifact", "Mine", "A note of mine."), "# Mine\n");
    write(root, { "docs/features/alpha/mine.md": mine });
    const again = migrate(root, []);
    if (again.exitCode !== 0) console.log(again.out);
    expect(again.exitCode).toBe(0);
    expect(again.out).not.toContain("mine.md");
    expect(read(root, "docs/features/alpha/mine.md")).toBe(mine);
  });

  test("an edit that is byte-identical to the planned text is the run's own", () => {
    const root = stopInPhase5();
    const planned = (readJson(RECORD(root)).journal.writes as Array<{ to: string; text: string }>).find((w) => w.to.endsWith("docs/items/done-item.md"));
    expect(planned).toBeDefined();
    write(root, { "docs/items/done-item.md": planned!.text });
    const again = migrate(root);
    if (again.exitCode !== 0) console.log(again.out);
    expect(again.exitCode).toBe(0);
  });

  test("the resume stop says how to keep the edit, and does not suggest committing it", () => {
    const root = stopInPhase5();
    write(root, { "docs/items/open-item.md": `${read(root, "docs/items/open-item.md")}\nMINE\n` });
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("git show HEAD:docs/backlog/2026-01-01-open-item.md > docs/items/open-item.md");
    expect(r.out).not.toContain("commit them");
    expect(r.out).toContain("--force");
  });
});
