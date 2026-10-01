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
 * The fixtures are real trees, generated OFFLINE from this repository's
 * history (D16): the v2.10 tree at the 8.1.0 tag, and the current scaffold at
 * SCAFFOLD_TAG (9.2.0, the 9.0.0 layout) — the release the script itself
 * fetches, so a re-pin is one line in the script, plus the pin test and the
 * guide and skill that name it. Never the working tree, whose payload has moved on
 * (`cycles/TEMPLATE.md`, `features/README.md`), and never this repository's
 * own docs.
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
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { childEnv } from "../../../../../../scripts/pdocs/test-env.ts";

import {
  GIT_LOCAL_ENV,
  KEPT_LIBRARY,
  MARKDOWN_LINK_RE,
  OWNED_RELEASES,
  OWNED_PATHS,
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
  joinFrontmatter,
  isUuid,
  jsoncToJson,
  loadManifest,
  mayWrite,
  movedTo,
  patchLintArrays,
  patchLintText,
  patchTopLevelVersion,
  planCycles,
  planTemplates,
  ownedType,
  ARTIFACT_FIELDS,
  ENTITY_FILE_TYPE,
  OWNED_FILE_TYPE,
  OWNER_SUBFOLDER,
  retypeAsArtifact,
  prettierFrontmatter,
  prettierFormat,
  proseKey,
  scopeEntryPath,
  renameRecord,
  researchLifecycle,
  respellBiomeText,
  respellIgnorePattern,
  respellIgnoreText,
  respellText,
  rewriteExcludeGlob,
  rewriteFromField,
  rewriteFolderLinks,
  rewriteLinks,
  SCAFFOLD_RELEASE,
  compareReleases,
  rootPointsAtCli,
  treeRelease,
  SCAFFOLD_TAG,
  SEEDED_PAGES,
  slugOf,
  splitFrontmatter,
  stripCode,
  tableBlocks,
  editedTables,
  repadTables,
  repadVerdict,
  suggestLinkFix,
  suggestLinkFixes,
  archivedReading,
  synthesizeFrontmatter,
  uuidv7,
  verdictFor,
  within,
  yamlScalar,
  type Verdict,
  type TableBlock,
} from "./migrate-v2.10-to-v3.0.ts";
import * as seed from "../../../../../../scripts/pdocs/seed.ts";
import * as uuid from "../../../../../../scripts/pdocs/uuid.ts";
import * as links from "../../../../../../scripts/pdocs/links-rewrite.ts";
import * as lintIndex from "../../../../../../scripts/pdocs/docs-lint/index.ts";
import { GIT_LOCAL_ENV as RULES_GIT_LOCAL_ENV, gitEnv as rulesGitEnv, documentProblems as lintDocumentProblems, ownedType as lintOwnedType, allowedFields as lintAllowedFields } from "../../../../../../scripts/pdocs/lint/rules.ts";
import * as registry from "../../../../../../scripts/pdocs/lint/registry.ts";
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
    expect(b).toContain("reports/2026-01-03-orphan-report.md — a report with no owner: no investigation is linked with it — none links to it, and it links to none; links from other documents do not decide");
    expect(b).toContain("with its type set to `artifact`");
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
    });
    const b = p.blockers.join("\n");
    expect(b).toContain('backlog/2026-01-01-x.md — lifecycle "wip" has no item state');
    for (const f of ["backlog/notes.txt", "investigations/assets/chart.png", "projects/stray.md"])
      expect(b).toContain(`${f} — not a document this migration knows where to put`);
  });

  test("a template the scaffold never shipped is the adopter's: it moves to TEMPLATES/ as it is, and only a clash stops the run", () => {
    // Spellbook's PROJECT-LEDGER and SPRINT-OUTCOME were named "not a document this
    // migration knows where to put" — every template lives in TEMPLATES/ from 9.0.0.
    const p = plan({
      "projects/TEMPLATES/PLAN.template.md": "the scaffold's\n",
      "projects/TEMPLATES/PROJECT-LEDGER.template.md": "our ledger\n",
      "projects/TEMPLATES/SPRINT-OUTCOME.template.md": "our outcome\n",
      "backlog/TEMPLATE-triage.md": "our triage form\n",
      "briefs/TEMPLATES/PITCH.template.md": "our pitch\n",
      // Clashes: a name the scaffold ships there, one already in TEMPLATES/, and two onto one name.
      "reports/TEMPLATES/ITEM.template.md": "ours\n",
      "TEMPLATES/TAKEN.template.md": "already here\n",
      "projects/TEMPLATES/TAKEN.template.md": "ours\n",
      "fragments/TEMPLATE-triage.md": "a second triage form\n",
      // An archived copy is not placed for the adopter.
      "backlog/_archive/TEMPLATE-old.md": "old\n",
    });
    expect(p.ownTemplates).toEqual([
      ["backlog/TEMPLATE-triage.md", "TEMPLATES/TEMPLATE-triage.md"],
      ["briefs/TEMPLATES/PITCH.template.md", "TEMPLATES/PITCH.template.md"],
      ["projects/TEMPLATES/PROJECT-LEDGER.template.md", "TEMPLATES/PROJECT-LEDGER.template.md"],
      ["projects/TEMPLATES/SPRINT-OUTCOME.template.md", "TEMPLATES/SPRINT-OUTCOME.template.md"],
    ]);
    const b = p.blockers.join("\n");
    expect(b).not.toContain("PROJECT-LEDGER");
    expect(b).not.toContain("PLAN.template.md");
    expect(b).toContain("reports/TEMPLATES/ITEM.template.md — a template of yours: the scaffold never shipped it. It would move to TEMPLATES/ITEM.template.md, which is the scaffold's own");
    expect(b).toContain("projects/TEMPLATES/TAKEN.template.md — a template of yours: the scaffold never shipped it. It would move to TEMPLATES/TAKEN.template.md, which is already there");
    expect(b).toContain("fragments/TEMPLATE-triage.md — a template of yours: the scaffold never shipped it. It would move to TEMPLATES/TEMPLATE-triage.md, which is where backlog/TEMPLATE-triage.md goes");
    expect(b).toContain("backlog/_archive/TEMPLATE-old.md — a template of yours, in an archive: the scaffold never shipped it. Keep it outside backlog/, or delete it");
    expect(b).not.toContain("not a document this migration knows where to put");
  });

  test("a name that differs from a taken one only in case is a clash: on a case-insensitive filesystem they are one file", () => {
    // Planned for TEMPLATES/plan.template.md, it passed an exact-name check; on macOS the
    // scaffold's PLAN.template.md then moved first and the run stopped mid-phase 8.
    const p = plan({
      "projects/TEMPLATES/PLAN.template.md": "the scaffold's\n",
      "briefs/TEMPLATES/plan.template.md": "ours\n",
      "TEMPLATES/Ledger.template.md": "already here\n",
      "projects/TEMPLATES/LEDGER.template.md": "ours\n",
      "backlog/TEMPLATE-x.md": "ours\n",
      "fragments/TEMPLATE-X.md": "ours too\n",
    });
    const b = p.blockers.join("\n");
    expect(b).toContain("briefs/TEMPLATES/plan.template.md — a template of yours: the scaffold never shipped it. It would move to TEMPLATES/plan.template.md, which is the scaffold's own TEMPLATES/PLAN.template.md — the names differ only in case, and on a case-insensitive filesystem (macOS, Windows) they are one file");
    expect(b).toContain("projects/TEMPLATES/LEDGER.template.md — a template of yours: the scaffold never shipped it. It would move to TEMPLATES/LEDGER.template.md, which is already there as TEMPLATES/Ledger.template.md — the names differ only in case");
    expect(b).toContain("fragments/TEMPLATE-X.md — a template of yours: the scaffold never shipped it. It would move to TEMPLATES/TEMPLATE-X.md, which is where backlog/TEMPLATE-x.md goes — the names differ only in case");
    expect(p.ownTemplates).toEqual([["backlog/TEMPLATE-x.md", "TEMPLATES/TEMPLATE-x.md"]]);
  });

  test("the preflight stops on a case-only clash before anything moves", () => {
    const root = fixtureO({ "docs/briefs/TEMPLATES/plan.template.md": "our plan form\n" });
    const before = treeDigest(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("docs/briefs/TEMPLATES/plan.template.md — a template of yours");
    expect(r.out).toContain("the scaffold's own TEMPLATES/PLAN.template.md — the names differ only in case");
    expect(r.out).toContain("Nothing was written.");
    expect(treeDigest(root)).toEqual(before);
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

describe("suggestLinkFix — a broken link resolved through the run's moves", () => {
  const D = "/r/docs";
  const moves = new Map([
    [`${D}/projects/_archive/gamma`, `${D}/features/_archive/gamma`],
    [`${D}/projects/alpha`, `${D}/features/alpha`],
    [`${D}/projects/alpha/proposal.md`, `${D}/features/alpha/feature.md`],
    [`${D}/backlog/2026-01-01-x.md`, `${D}/items/x.md`],
  ]);
  const on = new Set([`${D}/features/alpha/feature.md`, `${D}/items/x.md`, `${D}/architecture/README.md`]);
  const exists = (abs: string) => on.has(abs);
  const file = `${D}/features/_archive/gamma/sessions/2025-12-02-old.md`;

  test("a link a legacy archive left one folder level short: to a document that moved, and to one that did not", () => {
    // Written at projects/gamma/sessions/ as ../../alpha/proposal.md; the archive added a level,
    // and the rewrite kept what it then resolved to: docs/projects/_archive/alpha/proposal.md.
    expect(suggestLinkFix(file, "../../../../projects/_archive/alpha/proposal.md#goals", moves, exists)).toBe("../../../alpha/feature.md#goals");
    expect(suggestLinkFix(file, "../../../../projects/architecture/README.md", moves, exists)).toBe("../../../../architecture/README.md");
  });

  test("a target that moved but was written in a way the rewrite could not see", () => {
    expect(suggestLinkFix(`${D}/playbooks/p.md`, "../backlog/2026-01-01-x.md", moves, exists)).toBe("../items/x.md");
  });

  test("nothing to suggest: a target found by neither reading, a URL, an absolute path", () => {
    expect(suggestLinkFix(file, "../../nowhere.md", moves, exists)).toBeNull();
    expect(suggestLinkFix(file, "https://example.com/a.md", moves, exists)).toBeNull();
    expect(suggestLinkFix(file, "/abs/a.md", moves, exists)).toBeNull();
  });
});

describe("suggestLinkFixes — from the root, and archived since; ambiguity suggests nothing", () => {
  const R = "/r";
  const D = `${R}/docs`;
  const moves = new Map([
    [`${D}/projects/alpha`, `${D}/features/alpha`],
    [`${D}/projects/alpha/proposal.md`, `${D}/features/alpha/feature.md`],
    [`${D}/projects/_archive/beta`, `${D}/features/_archive/beta`],
    [`${D}/projects/_archive/beta/proposal.md`, `${D}/features/_archive/beta/feature.md`],
    [`${D}/projects/_archive/gamma`, `${D}/features/_archive/gamma`],
    [`${D}/backlog/_archive/2026-01-02-y.md`, `${D}/items/_archive/y.md`],
    [`${D}/backlog/2026-01-03-z.md`, `${D}/items/z.md`],
    [`${D}/backlog/_archive/2026-01-03-z.md`, `${D}/items/_archive/z.md`],
  ]);
  const on = new Set([
    `${D}/features/alpha/feature.md`, `${D}/features/_archive/beta/feature.md`, `${D}/items/_archive/y.md`,
    `${D}/items/z.md`, `${D}/items/_archive/z.md`, `${D}/architecture/README.md`,
  ]);
  const exists = (abs: string) => on.has(abs);
  const fromRoot = { root: R, docsRootName: "docs" };
  const file = `${D}/features/_archive/gamma/artifacts/links.md`;
  const s = (target: string) => suggestLinkFixes(file, target, moves, exists, fromRoot);
  /** Where a suggestion lands, followed from the file's new place. */
  const lands = (fix: string) => resolve(dirname(file), fix.replace(/#.*$/, ""));

  test("archivedReading inserts _archive/ after the retired category folder, and only there", () => {
    expect(archivedReading(`${D}/backlog/x.md`, D)).toBe(`${D}/backlog/_archive/x.md`);
    expect(archivedReading(`${D}/projects/beta/plan.md`, D)).toBe(`${D}/projects/_archive/beta/plan.md`);
    expect(archivedReading(`${D}/backlog/_archive/x.md`, D)).toBeNull();
    expect(archivedReading(`${D}/architecture/x.md`, D)).toBeNull();
    expect(archivedReading(`${R}/elsewhere/backlog/x.md`, D)).toBeNull();
  });

  test("from the root: a link that starts with the docs root's name, read through the move record, anchor kept", () => {
    const r = s("docs/projects/alpha/proposal.md#goals");
    expect(r).toEqual({ fix: "../../../alpha/feature.md#goals", reading: "from the root" });
    expect(lands((r as { fix: string }).fix)).toBe(`${D}/features/alpha/feature.md`);
    expect(s("docs/architecture/README.md")).toEqual({ fix: "../../../../architecture/README.md", reading: "from the root" });
  });

  test("from the root, archived since: found only with _archive/ inserted", () => {
    const r = s("docs/projects/beta/proposal.md");
    expect(r).toEqual({ fix: "../../beta/feature.md", reading: "from the root, archived since" });
    expect(lands((r as { fix: string }).fix)).toBe(`${D}/features/_archive/beta/feature.md`);
  });

  test("one level short, archived since: a hand-archived document's link to a target archived after it", () => {
    // Written at projects/gamma/artifacts/ as ../../../backlog/…; archiving gamma by hand made it
    // resolve to docs/projects/backlog/…, and the move kept that.
    const r = s("../../../../projects/backlog/2026-01-02-y.md");
    expect(r).toEqual({ fix: "../../../../items/_archive/y.md", reading: "one level short, archived since" });
    expect(lands((r as { fix: string }).fix)).toBe(`${D}/items/_archive/y.md`);
  });

  test("two readings on different documents: nothing is suggested, and both are named", () => {
    expect(s("../../../../projects/backlog/2026-01-03-z.md")).toEqual({
      ambiguous: [
        { fix: "../../../../items/z.md", reading: "one level short" },
        { fix: "../../../../items/_archive/z.md", reading: "one level short, archived since" },
      ],
    });
    expect(suggestLinkFix(file, "../../../../projects/backlog/2026-01-03-z.md", moves, exists, fromRoot)).toBeNull();
  });

  test("a candidate outside the project root is never suggested, however it was reached", () => {
    const root = "/r";
    const SD = `${root}/site/docs`;
    const m = new Map([[`${SD}/projects/_archive/gamma`, `${SD}/features/_archive/gamma`]]);
    const escaping = `${SD}/features/_archive/gamma/links.md`;
    // One level short climbs from site/docs/projects/_archive past /r and lands on /outside.md.
    const anywhere = () => true;
    expect(suggestLinkFixes(escaping, "../../../../../outside.md", m, anywhere, { root, docsRootName: "site/docs" })).toBeNull();
    // Inside the project, the same reading still suggests.
    expect(suggestLinkFixes(escaping, "../../../../README.md", m, (abs) => abs === `${root}/README.md`, { root, docsRootName: "site/docs" })).toEqual({ fix: "../../../../../README.md", reading: "one level short" });
  });

  test("dangling, or not starting with the docs root's name: nothing", () => {
    expect(s("docs/projects/zeta/proposal.md")).toBeNull();
    expect(s("projects/alpha/proposal.md")).toBeNull();
    // Without the root to read from, no root reading is tried.
    expect(suggestLinkFixes(file, "docs/projects/alpha/proposal.md", moves, exists)).toBeNull();
  });
});

describe("respellText — retired docs paths in any text, from the move record", () => {
  const moves = new Map([
    ["docs/projects/alpha", "docs/features/alpha"],
    ["docs/projects/alpha/proposal.md", "docs/features/alpha/feature.md"],
    ["docs/backlog/2026-01-01-x.md", "docs/items/x.md"],
  ]);
  test("a whole path is respelled, the longest move first; a retired folder itself goes to its successor", () => {
    const text = [
      "// see docs/projects/alpha/proposal.md#goals and docs/projects/alpha/plan.md.",
      '{ "items": "docs/backlog/", "one": "docs/backlog/2026-01-01-x.md" }',
      "Also ../docs/projects/alpha and `docs/projects`.",
    ].join("\n");
    const r = respellText(text, "docs", moves);
    expect(r.text).toBe(
      [
        "// see docs/features/alpha/feature.md#goals and docs/features/alpha/plan.md.",
        '{ "items": "docs/items/", "one": "docs/items/x.md" }',
        "Also ../docs/features/alpha and `docs/features`.",
      ].join("\n")
    );
    expect(r.hits.map((h) => [h.line, h.from, h.to])).toEqual([
      [1, "docs/projects/alpha/proposal.md", "docs/features/alpha/feature.md"],
      [1, "docs/projects/alpha/plan.md", "docs/features/alpha/plan.md"],
      [2, "docs/backlog/", "docs/items/"],
      [2, "docs/backlog/2026-01-01-x.md", "docs/items/x.md"],
      [3, "docs/projects/alpha", "docs/features/alpha"],
      [3, "docs/projects", "docs/features"],
    ]);
  });
  test("a path that only starts like one is not touched; a retired path nothing moved is reported and left", () => {
    const text = "docs/projects/alpha-two/x.md mydocs/backlog/a.md docs/backlogs/a.md docs/investigations/gone.md\n";
    const r = respellText(text, "docs", moves);
    expect(r.text).toBe(text);
    expect(r.hits).toEqual([
      { line: 1, from: "docs/projects/alpha-two/x.md", to: null },
      { line: 1, from: "docs/investigations/gone.md", to: null },
    ]);
  });
});

describe("ownedType — a document's type from where it sits in its owner, as the 9.x lint types it", () => {
  test("the mirrored tables equal the lint's registry", () => {
    expect(ENTITY_FILE_TYPE).toEqual(Object.fromEntries(Object.values(registry.ENTITY_FILE).map((e) => [e.name, e.type])));
    expect(OWNED_FILE_TYPE).toEqual(registry.OWNED_FILE_TYPE);
    expect(OWNER_SUBFOLDER).toEqual(registry.OWNER_SUBFOLDER);
  });

  test("the mirrored rule equals the lint's ownedType over every shape of path", () => {
    const names = ["x.md", ...Object.keys(ENTITY_FILE_TYPE), ...Object.keys(OWNED_FILE_TYPE)];
    const inner = [
      ...names,
      ...names.map((n) => `workstreams/ws/${n}`),
      ...Object.values(OWNER_SUBFOLDER).flatMap((f) => [`${f}/x.md`, `${f}/deeper/x.md`, `workstreams/ws/${f}/x.md`, `${f}/plan.md`]),
      "_archive/x.md",
    ];
    const paths = ["features", "items"].flatMap((owner) =>
      ["", "_archive/"].flatMap((pre) => [...names.map((n) => [owner, `${pre}${n}`]), ...inner.map((i) => [owner, `${pre}e/${i}`])])
    );
    expect(paths.length).toBeGreaterThan(100);
    for (const [owner, within] of paths) expect([owner, within, ownedType(owner as string, within as string)]).toEqual([owner, within, lintOwnedType(owner as string, within as string)]);
  });

  test.each([
    ["features", "alpha/plan.md", "plan"],
    ["features", "alpha/workstreams/ws/plan.md", "artifact"],
    ["features", "alpha/sessions/2026-01-01-s.md", "session"],
    ["features", "alpha/workstreams/ws/sessions/2026-01-01-s.md", "artifact"],
    ["items", "question/reports/r-report.md", "report"],
    ["items", "_archive/question/workstreams/ws/reports/r-report.md", "artifact"],
    ["features", "alpha/workstreams/ws/design-resolution.md", "artifact"],
  ])("%s/%s → %s", (owner, within, type) => expect(ownedType(owner, within)).toBe(type));

  test("ARTIFACT_FIELDS is exactly the lint's allowed set for an artifact — a key added to either side fails", () => {
    expect(new Set(ARTIFACT_FIELDS)).toEqual(lintAllowedFields("artifact"));
    expect(ARTIFACT_FIELDS).toHaveLength(new Set(ARTIFACT_FIELDS).size);
  });

  test("…and the lint's UNKNOWN FIELD verdicts on an artifact agree with it, key by key", () => {
    const keys = new Set([...ARTIFACT_FIELDS, "lifecycle", ...[...registry.defaultRegistryIndex().values()].flatMap((r) => [...r.extra, ...(r.required ?? [])])]);
    const base: Record<string, string> = { type: "artifact", title: "T", description: "D.", status: "stable", generated: "{ by: fixture, at: 2026-01-01 }" };
    for (const key of keys) {
      const fields = { ...base, ...(key in base ? {} : { [key]: "x" }) };
      const raw = `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n\n# T\n`;
      const { problems } = lintDocumentProblems({ path: "/x", rel: "docs/features/a/w/x.md", type: "artifact" }, raw, "docs", false);
      expect([key, problems.some((p) => p.startsWith("UNKNOWN FIELD"))]).toEqual([key, !ARTIFACT_FIELDS.includes(key)]);
    }
  });

  test("retypeAsArtifact keeps the fields an artifact may carry, in place, and names what it drops", () => {
    const fm = "type: plan\ntitle: WS plan\ndescription: How it went.\nstatus: stable\nlifecycle: completed\nparent: feature/x\ngenerated: { by: a, at: 2026-01-01 }\ntags: [a]";
    expect(retypeAsArtifact(fm)).toEqual({
      fm: "type: artifact\ntitle: WS plan\ndescription: How it went.\nstatus: stable\ngenerated: { by: a, at: 2026-01-01 }\ntags: [a]",
      dropped: [["lifecycle", "completed"], ["parent", "feature/x"]],
    });
  });
});

describe("synthesizeFrontmatter — a legacy archive's document with none", () => {
  test("the title from the H1, the description from the first sentence; the body kept byte for byte, after one blank line", () => {
    const body = "# Proposal: dev-kickoff Skill\n\n**Date:** 2026-03-03 **Status:** Approved\n\n## Problem\n\nThe workflow has a gap. More follows.\n";
    const out = synthesizeFrontmatter("feature", "proposal.md", body, { date: "2026-03-03", extra: [["lifecycle", "done"]] });
    const { fm, body: after } = splitFrontmatter(out);
    expect(after).toBe(`\n${body}`);
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

  test("a setext heading is a heading: the H1 is the title, and the description comes from the first real paragraph", () => {
    const fm = (body: string, name = "x.md") => splitFrontmatter(synthesizeFrontmatter("artifact", name, body, { date: "2026-01-01" })).fm as string;
    const h1 = fm("Alpha\n=====\n\nThe alpha notes. More.\n");
    expect([fmGet(h1, "title"), fmGet(h1, "description")]).toEqual(["Alpha", "The alpha notes."]);
    // A setext H2 before the prose is skipped too, and so is a thematic break.
    const h2 = fm("Alpha\n=====\n\nBackground\n----------\n\n---\n\nWhat happened first. Then more.\n");
    expect([fmGet(h2, "title"), fmGet(h2, "description")]).toEqual(["Alpha", "What happened first."]);
    // Text right under the underline, with no blank line, is the paragraph.
    const tight = fm("Beta\n===\nThe beta notes.\n");
    expect([fmGet(tight, "title"), fmGet(tight, "description")]).toEqual(["Beta", "The beta notes."]);
    // An ATX H1 that comes first still wins; a setext H2 alone gives no title.
    expect(fmGet(fm("# Gamma\n\nDelta\n=====\n\nBody.\n"), "title")).toBe("Gamma");
    expect(fmGet(fm("Section\n-------\n\nBody here.\n", "2026-01-01-from-name.md"), "title")).toBe("From name");
    // An underline inside a code fence is not one.
    expect(fmGet(fm("```\nNot\n===\n```\n\nReal prose.\n", "code.md"), "description")).toBe("Real prose.");
  });

  test("CRLF line endings: a setext heading is still a heading, and the body keeps its CRLF", () => {
    const body = "Title CR\r\n========\r\n\r\nBody text here. More.\r\n";
    const out = synthesizeFrontmatter("artifact", "2026-01-01-from-name.md", body, { date: "2026-01-01" });
    const fm = splitFrontmatter(out).fm as string;
    expect([fmGet(fm, "title"), fmGet(fm, "description")]).toEqual(["Title CR", "Body text here."]);
    expect(out.endsWith(body)).toBe(true);
    const atx = splitFrontmatter(synthesizeFrontmatter("artifact", "x.md", "# Heading\r\n\r\nFirst line. Second.\r\n", { date: "2026-01-01" })).fm as string;
    expect([fmGet(atx, "title"), fmGet(atx, "description")]).toEqual(["Heading", "First line."]);
  });

  test("a value with a colon is quoted, so the lint reads it back whole", () => {
    const out = synthesizeFrontmatter("artifact", "x.md", "# A: b\n\nWhy: because.\n", { date: "2026-01-01" });
    expect(out).toContain('title: "A: b"');
    expect(fmGet(splitFrontmatter(out).fm as string, "description")).toBe("Why: because.");
  });
});

describe("tables whose links the run respells — found, and re-padded only where still the same table", () => {
  const before = "# T\n\n| Doc | Where |\n| --- | ----- |\n| A   | [a](../projects/alpha/proposal.md) |\n\n```\n| not | a table |\n| --- | --- |\n```\n\n| Other | x |\n| ----- | - |\n| y     | z |\n";
  const after = before.replace("../projects/alpha/proposal.md", "../features/alpha/feature.md");

  test("only the table the edit changed is found, and a fenced one never is", () => {
    expect(tableBlocks(before).map((t) => t.start)).toEqual([2, 11]);
    expect(editedTables(before, after).map((t) => t.text)).toEqual([after.split("\n").slice(2, 5).join("\n")]);
  });

  test("a table in a blockquote or under a list item is found, and never re-padded: the verdict says why", () => {
    const text = "> | a | b |\n> | - | - |\n> | [x](y.md) | z |\n\n- item\n\n  | a | b |\n  | - | - |\n  | c | d |\n";
    const blocks = tableBlocks(text);
    expect(blocks.map((t) => t.start)).toEqual([0, 6]);
    expect(repadVerdict(blocks[0] as TableBlock, "| a | b |\n| - | - |\n| [x](y.md) | z |\n")).toEqual({ why: "in a blockquote" });
    expect(repadVerdict(blocks[1] as TableBlock, "| a | b |\n| - | - |\n| c | d |\n")).toEqual({ why: "indented" });
    const em = { start: 0, end: 3, text: "| a | b |\n| - | - |\n| *em* | [x](y.md) |" };
    expect(repadVerdict(em, "| a    | b        |\n| ---- | -------- |\n| _em_ | [x](y.md) |\n")).toEqual({ why: "your Prettier would change more than its padding" });
  });

  test("a formatted form whose header or delimiter row changed shape is rejected: a pipe in a code span splits a body cell", () => {
    const table = "| Doc | Note |\n| --- | ---- |\n| `a|b` | [a](../x.md) |";
    const block = { start: 0, end: 3, text: table };
    // What Prettier prints for it: a three-column delimiter under a two-column header, which GFM no longer renders as a table.
    const printed = "| Doc | Note |\n| --- | ---- | ------------ |\n| `a  | b`   | [a](../x.md) |\n";
    expect(repadTables(table, [block], [printed])).toBe(table);
  });

  test("a formatted form replaces the block only when it is the same table, and never an indented one", () => {
    const [t] = editedTables(before, after);
    const good = "| Doc | Where                            |\n| --- | -------------------------------- |\n| A   | [a](../features/alpha/feature.md) |\n";
    expect(repadTables(after, [t as TableBlock], [good])).toBe(after.replace((t as TableBlock).text, good.trimEnd()));
    expect(repadTables(after, [t as TableBlock], ["| Doc | Where |\n| --- | --- |\n| B | changed |\n"])).toBe(after);
    expect(repadTables(after, [t as TableBlock], [null])).toBe(after);
    const indented = { start: 0, end: 3, text: "  | a | b |\n  | - | - |\n  | c | d |" };
    expect(repadTables(indented.text, [indented], ["| a | b |\n| - | - |\n| c | d |\n"])).toBe(indented.text);
  });
});

describe("the shape of what the run writes — Prettier's, for its defaults", () => {
  test("joinFrontmatter: one blank line after the block, whatever the body began with", () => {
    expect(joinFrontmatter("a: 1", "# H\n")).toBe("---\na: 1\n---\n\n# H\n");
    expect(joinFrontmatter("a: 1", "\n# H\n")).toBe("---\na: 1\n---\n\n# H\n");
    expect(joinFrontmatter("a: 1", "\n\n\n# H\n")).toBe("---\na: 1\n---\n\n# H\n");
    expect(joinFrontmatter("a: 1", "")).toBe("---\na: 1\n---\n");
  });

  test("yamlScalar: plain where safe; single quotes when the value holds a double quote and needs no other escape (Prettier's rule)", () => {
    const cases: Array<[string, string]> = [
      ["Plain words", "Plain words"],
      ["A: b", '"A: b"'],
      ["It's here: now", `"It's here: now"`],
      ['The "delta" work', `'The "delta" work'`],
      [`The "delta" work's end`, `'The "delta" work''s end'`],
      [`One "quote" or 'two'`, `'One "quote" or ''two'''`],
      ['"', `'"'`],
      [`'"'`, `'''"'''`],
      ['A "b" \\ c', '"A \\"b\\" \\\\ c"'],
    ];
    for (const [s, want] of cases) {
      expect([s, yamlScalar(s)]).toEqual([s, want]);
      expect(fmGet(`k: ${yamlScalar(s)}`, "k")).toBe(s);
      expect(lintIndex.unquoteScalar(yamlScalar(s))).toBe(s);
    }
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
    // A wildcard where the entity would be goes category-wide, in the glob's own place.
    expect(lint.exclude).toEqual(["docs/features/deck/artifacts/*-prototype.md", "dist/**", "docs/features/*/artifacts/*.md", "docs/items/*/artifacts/*.md"]);
    expect(changes).toContain("lint.exclude: docs/projects/*/artifacts/*.md → docs/features/*/artifacts/*.md, docs/items/*/artifacts/*.md");
    expect(lint.scopes).toEqual([]);
    expect(lint.adopting).toBe(false);
    expect(changes).toContain("lint.skip: -_archive (the archive is linted now)");
    expect(notes).toEqual([]);
  });

  test("a lint.exclude glob that still names a retired folder after respelling is named, and left as written", () => {
    const lint = { workbench: ["projects", "backlog"], exclude: ["docs/{projects,backlog}/**/*.md", "**/docs/projects/**", "!docs/projects/alpha/**"] };
    const { lint: out, notes } = patchLintArrays(lint, { moves: [["docs/projects/alpha", "docs/features/alpha"]], keptLibrary: [], docsRootName: "docs" });
    expect(out.exclude ?? lint.exclude).toEqual(lint.exclude);
    expect(notes).toHaveLength(3);
    for (const g of lint.exclude) expect(notes.some((n) => n.includes(`\`${g}\``))).toBe(true);
  });

  test("already migrated: nothing changes", () => {
    const done = { workbench: ["features", "items", "cycles"], durable: ["architecture"], skip: [], exclude: [], scopes: ["cli"], types: {} };
    const r = patchLintArrays(done, { moves: [], keptLibrary: [], docsRootName: "docs" });
    expect(r.changes).toEqual([]);
    expect(r.lint).toEqual(done);
  });

  test("rewriteExcludeGlob: a spelled-out path follows its move; a wildcard at the entity goes category-wide; a whole retired folder is left", () => {
    const moves: Array<[string, string]> = [
      ["docs/projects/a", "docs/features/a"],
      ["docs/projects/a/x.md", "docs/features/a/feature.md"],
      ["docs/projects/a/artifacts/deck-slides.md", "docs/features/a/artifacts/deck-slides.md"],
      ["docs/projects/b", "docs/items/b"],
      ["docs/projects/b/artifacts/slides/talk-slides.md", "docs/items/b/artifacts/slides/talk-slides.md"],
      ["docs/projects/_archive/g", "docs/features/_archive/g"],
      ["docs/projects/_archive/g/artifacts/old-slides.md", "docs/features/_archive/g/artifacts/old-slides.md"],
      ["docs/investigations/2026-01-01-q.md", "docs/items/q/write-up.md"],
    ];
    expect(rewriteExcludeGlob("docs/projects/a/x.md", moves, "docs")).toEqual(["docs/features/a/feature.md"]);
    expect(rewriteExcludeGlob("docs/projects/a/**", moves, "docs")).toEqual(["docs/features/a/**"]);
    expect(rewriteExcludeGlob("dist/**", moves, "docs")).toEqual(["dist/**"]);
    // Category-wide, so an entity filed after the run is excluded too; the archive's forms
    // because the same glob one level down matched an archived entity's file (the archive
    // was skipped by the old lint and is linted now).
    const slides = rewriteExcludeGlob("docs/projects/*/artifacts/**/*-slides.md", moves, "docs");
    expect(slides).toEqual([
      "docs/features/*/artifacts/**/*-slides.md",
      "docs/items/*/artifacts/**/*-slides.md",
      "docs/features/_archive/*/artifacts/**/*-slides.md",
      "docs/items/_archive/*/artifacts/**/*-slides.md",
    ]);
    const excludes = (p: string) => (slides as string[]).some((g) => new Bun.Glob(g).match(p));
    for (const p of ["docs/features/a/artifacts/deck-slides.md", "docs/items/b/artifacts/slides/talk-slides.md", "docs/features/_archive/g/artifacts/old-slides.md", "docs/items/later/artifacts/new-slides.md"])
      expect([p, excludes(p)]).toEqual([p, true]);
    expect(excludes("docs/items/b/item.md")).toBe(false);
    // `**` where the entity would be already reaches the archive.
    expect(rewriteExcludeGlob("docs/projects/**/*-slides.md", moves, "docs")).toEqual(["docs/features/**/*-slides.md", "docs/items/**/*-slides.md"]);
    // A whole retired folder, or files in it: items/ holds every kind of item now, and would all be excluded.
    expect(rewriteExcludeGlob("docs/backlog/*.md", moves, "docs")).toBeNull();
    expect(rewriteExcludeGlob("docs/backlog/**", moves, "docs")).toBeNull();
    expect(rewriteExcludeGlob("docs/projects/*", moves, "docs")).toBeNull();
    // A path nothing moved.
    expect(rewriteExcludeGlob("docs/projects/gone/**", moves, "docs")).toBeNull();
    // Globs that name a retired folder in a shape this does not respell: named, never rewritten.
    for (const g of ["docs/{projects,backlog}/**/*.md", "**/docs/projects/**", "!docs/projects/a/**", "./docs/projects/*/x/*.md"])
      expect([g, rewriteExcludeGlob(g, moves, "docs")]).toEqual([g, null]);
    // A folder that only shares a retired name, outside the docs root, is not ours.
    expect(rewriteExcludeGlob("coverage/reports/**", moves, "docs")).toEqual(["coverage/reports/**"]);
    // A moved file the category-wide glob would not reach: an investigation became items/<slug>/write-up.md.
    expect(rewriteExcludeGlob("docs/investigations/*-q.md", moves, "docs")).toBeNull();
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
  /** A generated project at SCAFFOLD_TAG: the 9.0.0 layout, as the script fetches it. */
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
  const archived = (tag: string, name: string): string => {
    if (Bun.spawnSync(["git", "-C", REPO_ROOT, "rev-parse", "--verify", "--quiet", `${tag}^{commit}`], { stdout: "pipe", stderr: "pipe", env: childEnv() }).exitCode !== 0)
      throw new Error(`tag ${tag} is not in this clone. Run \`git fetch --tags\` and re-run.`);
    const dir = join(base, name);
    mkdirSync(dir);
    sh(["git", "-C", REPO_ROOT, "archive", "--format=tar", "-o", join(base, `${name}.tar`), tag]);
    sh(["tar", "-xf", join(base, `${name}.tar`), "-C", dir]);
    return dir;
  };
  const generate = (template: string, into: string): string => {
    mkdirSync(into);
    sh(["cookiecutter", "--config-file", config, "--no-input", "-o", into, template, "install_target=New project folder"]);
    return join(into, "my-project");
  };
  scaffolds = {
    old: generate(archived(V210_TAG, "template-v210"), join(base, "old")),
    current: generate(archived(SCAFFOLD_TAG, "template-v300"), join(base, "current")),
  };
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
    "# Mixed\n\n## Scope\n\n- [Alpha](../projects/alpha/proposal.md)\n- [Open item](../backlog/2026-01-01-open-item.md)\n\n## Outcome\n\nAlpha shipped; the open item carried over.\n"
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

/** `root` with `rels` recorded in its seed record at their current bytes, committed — what v2.8-to-v2.9 did to a template matched by name. */
function withRecorded(root: string, ...rels: string[]): string {
  const m = readJson(join(root, "docs/.pdocs-seed.json"));
  for (const rel of rels) m.files[rel] = hashOf(join(root, "docs", rel));
  write(root, { "docs/.pdocs-seed.json": `${JSON.stringify(m, null, 2)}\n` });
  commitAll(root, `recorded ${rels.join(", ")}`);
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

/**
 * A document's body with every link destination blanked — what "no prose changed"
 * compares. The blank line Prettier puts after a block is not prose.
 */
const prose = (text: string) => splitFrontmatter(text).body.replace(/^\n+/, "").replace(/\]\([^)]*\)/g, "]()");

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

  test("a born item with two sessions is dated by the latest and described by the latest that has a description", () => {
    const root = fixtureO({
      "docs/projects/beta/sessions/2026-01-09-more.md": doc(common("session", "More beta", "Beta's second session."), "# More beta\n\nMore.\n"),
    });
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    const fm = fmOf(root, "docs/items/beta/item.md");
    expect(fmGet(fm, "generated")).toContain("at: 2026-01-09 }");
    expect(fmGet(fm, "description")).toBe("Beta's second session.");
  });

  test("a born item with no session or plan takes its title and description from the document it holds", () => {
    // Five dogfood items born from folders holding only a brief or a report were
    // "Work recorded in <slug> before it had an item", titled from the folder name.
    const root = fixtureO({
      "docs/projects/ui-experimentation-framework/artifacts/brief.md": doc(common("artifact", "UI experimentation framework", "A harness for trying UI variants side by side."), "# UI experimentation framework\n\nThe idea.\n"),
      "docs/projects/perf-audit/reports/2026-01-02-audit-report.md": doc(common("artifact", "Performance audit", "Where the time goes on first load."), "# Performance audit\n\nFindings.\n"),
      "docs/projects/_archive/old-spike/notes.md": "# Old spike\n\nWe tried the thing. It did not work.\n",
    });
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    const item = (rel: string) => {
      const fm = fmOf(root, rel);
      return [fmGet(fm, "title"), fmGet(fm, "description"), splitFrontmatter(read(root, rel)).body.split("\n").find((l) => l.startsWith("# "))];
    };
    expect(item("docs/items/ui-experimentation-framework/item.md")).toEqual(["UI experimentation framework", "A harness for trying UI variants side by side.", "# UI experimentation framework"]);
    expect(item("docs/items/perf-audit/item.md")).toEqual(["Performance audit", "Where the time goes on first load.", "# Performance audit"]);
    // A legacy archive's document with no frontmatter: its H1 and first sentence, as the run synthesizes them.
    expect(item("docs/items/_archive/old-spike/item.md")).toEqual(["Old spike", "We tried the thing.", "# Old spike"]);
    expect(r.out).toContain("docs/items/ui-experimentation-framework/item.md — created (item, task, done), titled and described from artifacts/brief.md");
    // With a session, the session still describes it, and the folder names it.
    expect(item("docs/items/beta/item.md").slice(0, 2)).toEqual(["Beta", "Beta was built without a proposal."]);
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
    // The deck is in lint.exclude: it moves, and keeps its bytes — links included.
    const deck = "features/alpha/artifacts/deck-prototype.md";
    expect(read(root, `docs/${deck}`)).toBe(SHAPES["docs/projects/alpha/artifacts/deck-prototype.md"] as string);
    const all = readdirSync(join(root, "docs"), { recursive: true }).map(String).filter((p) => p.endsWith(".md") && p !== deck);
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

  test("a template of the adopter's that an earlier migration recorded by name moves to TEMPLATES/ as it is, its record dropped", () => {
    const own = "docs/projects/TEMPLATES/PROJECT-LEDGER.template.md";
    const root = withRecorded(fixtureO({ [own]: "# Project ledger\n\nOur own form.\n" }), "projects/TEMPLATES/PROJECT-LEDGER.template.md");
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain(
      "· template of yours: docs/projects/TEMPLATES/PROJECT-LEDGER.template.md → docs/TEMPLATES/PROJECT-LEDGER.template.md — the scaffold never shipped it, so it is yours: moved as it is, and the seed record an earlier migration took of it by its name dropped"
    );
    expect(r.out.slice(r.out.indexOf("For you to check"))).toContain(
      "docs/TEMPLATES/PROJECT-LEDGER.template.md is a template of yours, moved as it is from docs/projects/TEMPLATES/PROJECT-LEDGER.template.md: the scaffold never shipped it"
    );
    expect(read(root, "docs/TEMPLATES/PROJECT-LEDGER.template.md")).toBe("# Project ledger\n\nOur own form.\n");
    const m = readJson(join(root, "docs/.pdocs-seed.json"));
    expect(Object.keys(m.files).filter((k) => k.includes("PROJECT-LEDGER"))).toEqual([]);
    expect(pdocs(root, "check", "--format", "json").exitCode).toBe(0);
  });

  test("the guide's ownerless-report step is committable: a report moved into a project's reports/ as an artifact passes the v2.10 lint, and the run makes it a report", () => {
    // Left as `type: report` there, the v2.10 lint says WRONG TYPE and a pre-commit gate
    // refuses the commit the preflight asks for.
    const moved = "docs/projects/alpha/reports/2026-01-21-audit-report.md";
    const root = fixtureO({ [moved]: doc(common("artifact", "Audit", "What the audit found."), "# Audit\n\nFound.\n") });
    // Fixture O's baseline has problems of its own; the question is only whether this file is one.
    expect(pdocs(root, "check", "--format", "text").stdout.toString()).not.toContain(moved);
    const asReport = fixtureO({ [moved]: doc(common("report", "Audit", "What the audit found."), "# Audit\n\nFound.\n") });
    expect(pdocs(asReport, "check", "--format", "text").stdout.toString()).toContain(`WRONG TYPE     ${moved}: "report" (its position says "artifact")`);
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("docs/features/alpha/reports/2026-01-21-audit-report.md — type: artifact → report (its position)");
    expect(fmGet(fmOf(root, "docs/features/alpha/reports/2026-01-21-audit-report.md"), "type")).toBe("report");
  });

  test("the run's summary counts the born items set done for having no proposal, and lists each to check", () => {
    const { r } = wholeRun();
    const tail = r.out.slice(r.out.indexOf("For you to check"));
    expect(tail).toContain(
      "1 item(s) born from a project folder with no proposal were set `done`: with no plan active, the run read the work as finished, and it cannot tell finished from stopped. Check each, and set one that is not finished: bun scripts/pdocs/cli.ts set item/<slug> --lifecycle backlog (or ready, active, dropped)"
    );
    expect(tail).toContain("       docs/items/beta/item.md");
    expect(tail.indexOf("For you to check")).toBeLessThan(tail.indexOf("Migration complete."));
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

// ─── Phase 10: a MISSING FILE resolved through the move record ──────────────

describe("phase 10 suggests the correction for a MISSING FILE the move record accounts for", () => {
  test("a legacy archive's links one level short: suggested, applied literally, and the re-run — planned afresh — suggests the rest and then passes", () => {
    // Written at projects/gamma/sessions/, then archived by hand: each relative link lost a level.
    const short = "docs/projects/_archive/gamma/sessions/2025-12-04-short.md";
    const root = fixtureO({ [short]: "# Short\n\nSee [alpha](../../alpha/proposal.md#alpha) and [the architecture](../../../architecture/README.md).\n" });
    const first = migrate(root);
    expect(first.exitCode).toBe(1);
    expect(first.out).toContain("MISSING FILE");
    const moved = "docs/features/_archive/gamma/sessions/2025-12-04-short.md";
    const alpha = new RegExp(`${moved}: (\\S+) → \\.\\./\\.\\./\\.\\./alpha/feature\\.md#alpha  \\(one level short\\)` + "$", "m").exec(first.out);
    const arch = new RegExp(`${moved}: (\\S+) → \\.\\./\\.\\./\\.\\./\\.\\./architecture/README\\.md  \\(one level short\\)` + "$", "m").exec(first.out);
    expect(first.out).toContain("Suggested corrections for 2 MISSING FILE link(s)");
    expect(alpha).not.toBeNull();
    expect(arch).not.toBeNull();
    // The adopter applies ONE suggestion, as printed, without committing.
    write(root, { [moved]: read(root, moved).replace(`(${alpha?.[1]})`, "(../../../alpha/feature.md#alpha)") });
    const second = migrate(root);
    expect(second.exitCode).toBe(1);
    expect(second.out).toContain("Suggested corrections for 1 MISSING FILE link(s)");
    expect(second.out).toContain(`${moved}: ${arch?.[1]} → ../../../../architecture/README.md`);
    write(root, { [moved]: read(root, moved).replace(`(${arch?.[1]})`, "(../../../../architecture/README.md)") });
    const third = migrate(root);
    if (third.exitCode !== 0) console.log(third.out);
    expect(third.exitCode).toBe(0);
  });
});

describe("phase 10 also reads a broken link from the root, and with _archive/ inserted", () => {
  test("each reading suggested only when it lands on a file, the suggestion followed from the new place lands there; ambiguous and dangling ones get none", () => {
    // Written in projects/gamma/artifacts/ before gamma was archived by hand.
    const links = "docs/projects/_archive/gamma/artifacts/links.md";
    const root = fixtureO({
      [links]:
        "# Links\n\n" +
        "- [alpha](docs/projects/alpha/proposal.md#alpha)\n" + // (a) from the root
        "- [gamma plan](docs/projects/gamma/plan.md)\n" + // (b) from the root, archived since
        "- [archived item](../../../backlog/2026-01-05-archived-item.md)\n" + // (c) one level short, archived since
        "- [twin](../../../reports/2026-01-21-twin-report.md)\n" + // (d) ambiguous: a live and an archived report share a name
        "- [zeta](docs/projects/zeta/proposal.md)\n", // (e) dangling
      "docs/investigations/2026-01-20-first-investigation.md": doc(common("investigation", "First", "The first question.", { lifecycle: "active" }), "# First\n\n[Report](../reports/2026-01-21-twin-report.md)\n"),
      "docs/investigations/_archive/2026-01-22-second.md": doc(common("investigation", "Second", "The second question.", { lifecycle: "concluded" }), "# Second\n\n[Report](../../reports/_archive/2026-01-21-twin-report.md)\n"),
      "docs/reports/2026-01-21-twin-report.md": doc(common("report", "Twin", "The live twin."), "# Twin\n"),
      "docs/reports/_archive/2026-01-21-twin-report.md": doc(common("report", "Twin", "The archived twin."), "# Twin\n"),
    });
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    const moved = "docs/features/_archive/gamma/artifacts/links.md";
    const line = (reading: string) => new RegExp(`^\\s*${moved}: \\S+ → (\\S+)  \\(${reading}\\)` + "$", "m").exec(r.out)?.[1];
    const follow = (fix: string | undefined) => join(root, dirname(moved), (fix ?? "").replace(/#.*$/, ""));
    const a = line("from the root");
    expect(a).toBe("../../../alpha/feature.md#alpha");
    expect(existsSync(follow(a))).toBe(true);
    const b = line("from the root, archived since");
    expect(existsSync(follow(b))).toBe(true);
    expect(follow(b)).toBe(join(root, "docs/features/_archive/gamma/plan.md"));
    const c = line("one level short, archived since");
    expect(existsSync(follow(c))).toBe(true);
    expect(follow(c)).toBe(join(root, "docs/items/_archive/archived-item.md"));
    expect(r.out).toMatch(new RegExp(`Ambiguous[\\s\\S]*${moved}: \\S*twin-report\\.md — \\S+ \\(one level short\\) or \\S+ \\(one level short, archived since\\)`));
    expect(r.out).not.toMatch(new RegExp(`${moved}: \\S*twin-report\\.md →`));
    expect(r.out).toContain(`${moved}: docs/projects/zeta/proposal.md`);
    expect(r.out).not.toMatch(/zeta\/proposal\.md →/);
  });
});

describe("phase 10 reads from the root under a docs root of another name", () => {
  test("docsRoot `documentation`: a link starting with it is read from the project root, and the suggestion lands", () => {
    const root = fixtureO({
      "docs/projects/_archive/gamma/artifacts/links.md": "# Links\n\n- [alpha](documentation/projects/alpha/proposal.md#alpha)\n",
    });
    git(root, "mv", "docs", "documentation");
    const cfg = readJson(join(root, ".project-docs.json"));
    cfg.docsRoot = "documentation";
    cfg.lint.exclude = cfg.lint.exclude.map((g: string) => g.replace(/^docs\//, "documentation/"));
    write(root, {
      ".project-docs.json": `${JSON.stringify(cfg, null, 2)}\n`,
      "README.md": read(root, "README.md").replaceAll("](docs/", "](documentation/"),
    });
    commitAll(root, "the docs root is documentation/");
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    const moved = "documentation/features/_archive/gamma/artifacts/links.md";
    const fix = new RegExp(`^\\s*${moved}: documentation/projects/alpha/proposal\\.md#alpha → (\\S+)  \\(from the root\\)` + "$", "m").exec(r.out)?.[1];
    expect(fix).toBe("../../../alpha/feature.md#alpha");
    expect(existsSync(join(root, dirname(moved), (fix as string).replace(/#.*$/, "")))).toBe(true);
  });
});

// ─── --respell: retired paths outside the docs root ─────────────────────────

describe("--respell lists the retired paths in the files named, and writes only with --write, only those", () => {
  const OUTSIDE = {
    "src/app.ts": "// see docs/projects/alpha/proposal.md and docs/backlog/2026-01-01-open-item.md\nexport const x = 1;\n",
    ".anthill/config.json": '{ "board": "docs/backlog/", "feature": "docs/projects/alpha/" }\n',
    "DEV_KICKOFF.md": "# Kickoff\n\nRead docs/projects/alpha/proposal.md first; not docs/projects/alpha-two/x.md.\n",
    "CHANGELOG-local.md": "We retired docs/backlog/ in 2026.\n",
  };
  const respelled = () => {
    const root = fixtureO(OUTSIDE);
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    commitAll(root, "migrated");
    return root;
  };
  const respell = (root: string, ...args: string[]) =>
    Bun.spawnSync(["bun", SCRIPT, "--root", root, "--respell", ...args], { cwd: root, stdout: "pipe", stderr: "pipe", env: childEnv() });

  test("the listing first: every hit, file and line, and nothing written", () => {
    const root = respelled();
    const before = treeDigest(root);
    const r = respell(root, "src", ".anthill", "DEV_KICKOFF.md");
    const out = r.stdout.toString() + r.stderr.toString();
    expect(r.exitCode).toBe(0);
    for (const line of [
      "src/app.ts:1: docs/projects/alpha/proposal.md → docs/features/alpha/feature.md",
      "src/app.ts:1: docs/backlog/2026-01-01-open-item.md → docs/items/open-item.md",
      ".anthill/config.json:1: docs/backlog/ → docs/items/",
      ".anthill/config.json:1: docs/projects/alpha/ → docs/features/alpha/",
      "DEV_KICKOFF.md:3: docs/projects/alpha/proposal.md → docs/features/alpha/feature.md",
      "DEV_KICKOFF.md:3: docs/projects/alpha-two/x.md — left as written: nothing this migration moved is there",
      "5 path(s) respelled in 3 file(s), 1 left as written — nothing written.",
    ])
      expect(out).toContain(line);
    expect(out).not.toContain("CHANGELOG-local.md");
    expect(treeDigest(root)).toEqual(before);
  });

  test("--write writes the files named and no other", () => {
    const root = respelled();
    const r = respell(root, "--write", "src", ".anthill", "DEV_KICKOFF.md");
    expect(r.exitCode).toBe(0);
    expect(read(root, "src/app.ts")).toBe("// see docs/features/alpha/feature.md and docs/items/open-item.md\nexport const x = 1;\n");
    expect(read(root, ".anthill/config.json")).toBe('{ "board": "docs/items/", "feature": "docs/features/alpha/" }\n');
    expect(read(root, "DEV_KICKOFF.md")).toContain("not docs/projects/alpha-two/x.md");
    expect(read(root, "CHANGELOG-local.md")).toBe(OUTSIDE["CHANGELOG-local.md"]);
    expect(git(root, "status", "--porcelain").split("\n").filter(Boolean).sort()).toEqual([" M .anthill/config.json", " M DEV_KICKOFF.md", " M src/app.ts"]);
  });

  test("a folder is walked without its VCS or dependency folders: node_modules/, .git/, .svn/, .hg/", () => {
    const root = respelled();
    write(root, {
      "tools/node_modules/dep/index.js": "// docs/projects/alpha/proposal.md\n",
      "tools/.svn/entries": "docs/projects/alpha/proposal.md\n",
      "tools/.hg/store": "docs/projects/alpha/proposal.md\n",
      "tools/mine.ts": "// docs/projects/alpha/proposal.md\n",
    });
    const r = respell(root, "--write", ".");
    expect(r.exitCode).toBe(0);
    // Each hit is named from the project root, whatever path reached it.
    const hits = r.stdout.toString().split("\n").filter((l) => /^   \S/.test(l)).map((l) => l.trim().split(":")[0]);
    expect([...new Set(hits)].sort()).toEqual([".anthill/config.json", "CHANGELOG-local.md", "DEV_KICKOFF.md", "src/app.ts", "tools/mine.ts"]);
    expect(read(root, "tools/node_modules/dep/index.js")).toBe("// docs/projects/alpha/proposal.md\n");
    expect(read(root, "tools/.svn/entries")).toBe("docs/projects/alpha/proposal.md\n");
  });

  test("with no move record it stops and says why; --write alone, or no path, is a bad invocation", () => {
    const root = fixtureO();
    const r = respell(root, "src");
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("there is no move record");
    const bad = (...args: string[]) => Bun.spawnSync(["bun", SCRIPT, ...args], { stdout: "pipe", stderr: "pipe", env: childEnv() });
    expect(bad("--respell").exitCode).toBe(2);
    expect(bad("--write").exitCode).toBe(2);
    expect(bad("--respell", "src", "--dry-run").exitCode).toBe(2);
  });
});

// ─── An owned file the refresh replaces or removes, edited by the adopter ────

describe("owned files the refresh replaces or removes: an edit of the adopter's is named, with its recovery", () => {
  test("OWNED_RELEASES is every owned file as every release up to SCAFFOLD_TAG shipped it, by proseKey — derived from the release tags", () => {
    const semver = (v: string) => v.split(".").map(Number);
    const upTo = (v: string, pin: string) => {
      const [a, b] = [semver(v), semver(pin)];
      for (let i = 0; i < 3; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
      return true;
    };
    const tags = sh(["git", "-C", REPO_ROOT, "tag", "--list", "project-docs-scaffold-template-v*"])
      .split("\n")
      .filter((t) => t && upTo(t.slice(t.lastIndexOf("-v") + 2), SCAFFOLD_RELEASE));
    // Semver, not string order: 9.0.1 is in, and so is 8.10.x should it exist; the pin itself is in.
    expect(tags).toContain(V210_TAG);
    expect(tags).toContain(SCAFFOLD_TAG);
    // Every owned path the refresh replaces or removes has a row.
    expect(Object.keys(OWNED_RELEASES).sort()).toEqual([...OWNED_PATHS].sort());
    // One `git cat-file --batch` over every tag:path pair, rather than a process per pair.
    const pairs = OWNED_PATHS.flatMap((rel) => tags.map((tag) => [rel, `${tag}:{{cookiecutter.project_slug}}/docs/${rel}`] as const));
    const r = Bun.spawnSync(["git", "-C", REPO_ROOT, "cat-file", "--batch"], {
      stdin: Buffer.from(pairs.map(([, spec]) => `${spec}\n`).join("")),
      stdout: "pipe",
      stderr: "pipe",
      env: childEnv(),
    });
    const out = Buffer.from(r.stdout);
    const derived: Record<string, Set<string>> = Object.fromEntries(OWNED_PATHS.map((rel) => [rel, new Set<string>()]));
    let at = 0;
    for (const [rel] of pairs) {
      const eol = out.indexOf(10, at);
      const header = out.subarray(at, eol).toString();
      at = eol + 1;
      if (header.endsWith(" missing")) continue;
      const size = Number(header.split(" ")[2]);
      derived[rel]?.add(proseKey(out.subarray(at, at + size).toString()));
      at += size + 1;
    }
    expect(OWNED_RELEASES).toEqual(Object.fromEntries(Object.entries(derived).map(([rel, keys]) => [rel, [...keys].sort()])));
  }, 30_000);

  test("a tree an earlier run put on 9.0.0: its 9.0.0 owned files, reformatted or not, are not named as edits and are replaced quietly; a genuinely edited one still is", () => {
    const at900 = (rel: string) => sh(["git", "-C", REPO_ROOT, "show", `project-docs-scaffold-template-v9.0.0:{{cookiecutter.project_slug}}/docs/${rel}`]);
    const root = fixtureO();
    expect(migrate(root).exitCode).toBe(0);
    // Owned files as 9.0.0 shipped them: SCHEMA.md, README.md and features/README.md changed in 9.0.1.
    const readme = at900("README.md").replace(/^docs_version:.*$/m, /^docs_version:.*$/m.exec(read(root, "docs/README.md"))?.[0] ?? "");
    // SCHEMA.md as a formatter left it: every wrapped line joined, emphasis marks swapped.
    const schema = at900("SCHEMA.md").replace(/([a-z,])\n([a-z])/g, "$1 $2").replace(/\*\*/g, "__");
    expect(schema).not.toBe(at900("SCHEMA.md"));
    write(root, { "docs/SCHEMA.md": schema, "docs/README.md": readme, "docs/features/README.md": at900("features/README.md") });
    // A genuine edit, in a file that exists only from 9.0.0 on.
    write(root, { "docs/items/README.md": `${read(root, "docs/items/README.md")}\n## Our triage rota\n\nWho triages which week.\n` });
    commitAll(root, "on 9.0.0's owned files, with one edited");
    const dry = migrate(root, ["--dry-run"]);
    expect(dry.exitCode).toBe(0);
    for (const rel of ["SCHEMA.md", "README.md", "features/README.md"]) expect(dry.out).not.toContain(`docs/${rel} differs from every release`);
    expect(dry.out).toContain("docs/items/README.md differs from every release of the scaffold, so it holds edits of yours");
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    for (const rel of ["SCHEMA.md", "features/README.md"]) {
      expect(r.out).toContain(`✓ docs/${rel} replaced (owned)`);
      expect(read(root, `docs/${rel}`)).toBe(read(target(), `docs/${rel}`));
    }
    expect(r.out).not.toMatch(/yours: docs\/(SCHEMA|README|features\/README)\.md/);
    expect(r.out).toContain("yours: docs/items/README.md differs from every release");
  });

  test("proseKey ignores what a formatter changes — wrapping, table padding, emphasis marks — and the docs_version value", () => {
    const shipped = read(generatedScaffolds().old, "docs/projects/README.md");
    const reflowed = shipped.replace(/([a-z,])\n([a-z])/g, "$1 $2").replace(/\*\*/g, "__");
    expect(reflowed).not.toBe(shipped);
    expect(proseKey(reflowed)).toBe(proseKey(shipped));
    const readme = read(generatedScaffolds().old, "docs/README.md");
    expect(proseKey(readme.replace(/^docs_version:.*$/m, 'docs_version: "1.2.3"'))).toBe(proseKey(readme));
    expect(proseKey(`${shipped}\n## Our sprints\n\nOne file per sprint.\n`)).not.toBe(proseKey(shipped));
  });

  test("the item's definition of done: one dry run names a recorded template of the adopter's and each edited owned file as theirs, with the git show that recovers it; the run repeats it, and following it recovers the text", () => {
    // Spellbook's multi-sprint convention lived in its owned projects/README.md, and was removed silently;
    // its own PROJECT-LEDGER template had been recorded as the scaffold's by an earlier migration.
    const added = "\n## Multi-sprint projects\n\nOur own convention: one sprint file per sprint.\n";
    const root = withRecorded(fixtureO({ "docs/projects/TEMPLATES/PROJECT-LEDGER.template.md": "# Project ledger\n\nOur own form.\n" }), "projects/TEMPLATES/PROJECT-LEDGER.template.md");
    write(root, {
      "docs/projects/README.md": `${read(root, "docs/projects/README.md")}${added}`,
      "docs/architecture/README.md": `${read(root, "docs/architecture/README.md")}${added}`,
    });
    commitAll(root, "our own conventions, in owned READMEs");
    const base = git(root, "rev-parse", "HEAD").trim();
    const removed = `docs/projects/README.md differs from every release of the scaffold, so it holds edits of yours: the refresh removes it with its folder. An owned file is replaced whole on every refresh, so keep what you added in a page of your own (a playbook, or your root AGENTS.md). Recover your text with: git show ${base}:docs/projects/README.md`;
    const replaced = `docs/architecture/README.md differs from every release of the scaffold, so it holds edits of yours: the refresh replaces it with ${SCAFFOLD_RELEASE}'s. An owned file is replaced whole on every refresh, so keep what you added in a page of your own (a playbook, or your root AGENTS.md). Recover your text with: git show ${base}:docs/architecture/README.md`;
    const ownTemplate =
      "docs/TEMPLATES/PROJECT-LEDGER.template.md is a template of yours, moved as it is from docs/projects/TEMPLATES/PROJECT-LEDGER.template.md: the scaffold never shipped it, and the seed record an earlier migration took of it by its name dropped.";
    const dry = migrate(root, ["--dry-run"]);
    expect(dry.exitCode).toBe(0);
    const dryList = dry.out.slice(dry.out.indexOf("For you to check"));
    for (const line of [removed, replaced, ownTemplate]) expect(dryList).toContain(line);
    // Untouched owned files are not named.
    expect(dry.out).not.toContain("docs/backlog/README.md differs");
    expect(dry.out).not.toContain("docs/SCHEMA.md differs");
    // An adopter's unrelated work in progress, uncommitted, beside the run.
    write(root, { "notes/wip.md": "my draft\n" });
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    const tail = r.out.slice(r.out.indexOf("For you to check"));
    for (const line of [removed, replaced, ownTemplate]) expect(tail).toContain(line);
    // Follow the printed instruction literally: it recovers the text, and touches nothing else.
    const cmd = /Recover your text with: (git show \S+)$/m.exec(tail.slice(tail.indexOf("docs/projects/README.md differs")))?.[1] as string;
    const recovered = Bun.spawnSync(["sh", "-c", cmd], { cwd: root, stdout: "pipe", stderr: "pipe", env: childEnv() });
    expect(recovered.exitCode).toBe(0);
    expect(recovered.stdout.toString()).toContain("Our own convention: one sprint file per sprint.");
    expect(read(root, "notes/wip.md")).toBe("my draft\n");
    expect(existsSync(join(root, "docs/projects"))).toBe(false);
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

  test("the cookiecutter call checks out SCAFFOLD_TAG, never the template's HEAD (D16)", () => {
    const dir = tmp("migrate-v30-rec-");
    const log = join(dir, "args.log");
    writeFileSync(join(dir, "cookiecutter"), `#!/bin/sh\nprintf '%s\\n' "$@" > "${log}"\nexit 3\n`);
    chmodSync(join(dir, "cookiecutter"), 0o755);
    const r = migrate(fixtureO(), ["--dry-run"], { scaffold: null, env: { PATH: `${dir}:${process.env.PATH}` } });
    expect(r.exitCode).toBe(1);
    const args = read(dir, "args.log").split("\n");
    expect(args).toContain("--checkout");
    expect(args[args.indexOf("--checkout") + 1]).toBe(SCAFFOLD_TAG);
    expect(args).toContain("gh:ichabodcole/project-docs-scaffold-template");
  });

  test("SCAFFOLD_TAG is pinned to the 9.2.0 release, a tag in this clone, and the guide and the skill name that tag", () => {
    // A re-pin is a decision (D16): it changes this line, and the guide and skill with it.
    expect(SCAFFOLD_TAG).toBe("project-docs-scaffold-template-v9.2.0");
    expect(SCAFFOLD_RELEASE).toBe("9.2.0");
    // A tag, not a branch: `--checkout main` would fetch whatever the template is today.
    const tag = Bun.spawnSync(["git", "-C", REPO_ROOT, "rev-parse", "--verify", "--quiet", `refs/tags/${SCAFFOLD_TAG}`], { stdout: "pipe", stderr: "pipe", env: childEnv() });
    expect(tag.exitCode).toBe(0);
    const skillDir = resolve(import.meta.dir, "../..");
    const guide = readFileSync(join(skillDir, "migrations/v2.10-to-v3.0.md"), "utf8");
    const checkouts = [...guide.matchAll(/--checkout (\S+)/g)].map((m) => m[1]);
    expect(checkouts.length).toBeGreaterThan(0);
    for (const c of checkouts) expect(c).toBe(SCAFFOLD_TAG);
    const named = (text: string): string[] => [...new Set(text.match(/project-docs-scaffold-template-v9\.\d+\.\d+/g) ?? [])];
    expect(named(guide)).toEqual([SCAFFOLD_TAG]);
    expect(guide).toContain(`→ \`${SCAFFOLD_RELEASE}\``);
    expect(guide).toContain(`The tree is at release ${SCAFFOLD_RELEASE}.`);
    const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
    expect(named(skill)).toEqual([SCAFFOLD_TAG]);
    expect(skill).toContain(`(scaffold ${SCAFFOLD_RELEASE})`);
  });
});

describe("the end of a run names a root agent file with no CLI pointer — by Step 6's own check", () => {
  const skillText = () => readFileSync(resolve(import.meta.dir, "../../SKILL.md"), "utf8");
  const rowCheck = () => {
    const row = skillText().split("\n").find((l) => l.startsWith("| Documentation CLI pointer")) as string;
    return (/\| `(.+?)` — \*\*precondition/.exec(row)?.[1] as string).replaceAll("\\|", "|");
  };
  const blurb = () => {
    const sub = skillText().slice(skillText().indexOf("### Documentation CLI pointer"));
    return /```markdown\n([\s\S]*?)```/.exec(sub)?.[1] as string;
  };

  test("rootPointsAtCli agrees with the row's shell check, case for case", () => {
    const cases: Array<[string, Record<string, string>, boolean]> = [
      ["neither file", {}, false],
      ["Step 6's section, in AGENTS.md alone", { "AGENTS.md": blurb() }, true],
      ["the short form, in CLAUDE.md alone", { "CLAUDE.md": "Create documents with `pdocs new <type>`.\n" }, true],
      ["a mention with no `new`", { "AGENTS.md": "The gate is `bun scripts/pdocs/cli.ts check`.\n" }, false],
      ["stale: the CLI and the retired lint", { "AGENTS.md": "`bun scripts/pdocs/cli.ts new item x`\n", "CLAUDE.md": "Run `bun docs/lint.ts`.\n" }, false],
    ];
    for (const [name, files, want] of cases) {
      const root = tmp("migrate-v30-pointer-");
      write(root, files);
      const shell = Bun.spawnSync(["bash", "-c", rowCheck()], { cwd: root, stdout: "pipe", stderr: "pipe", env: childEnv() }).exitCode === 0;
      expect([name, shell, rootPointsAtCli(root)]).toEqual([name, want, want]);
    }
  });

  test("a run on a project whose root has no pointer ends by naming Step 6; one whose AGENTS.md has it does not", () => {
    const { r } = wholeRun();
    expect(r.exitCode).toBe(0);
    const tail = r.out.slice(r.out.indexOf("Migration complete."));
    expect(tail).toContain('Your root AGENTS.md / CLAUDE.md does not point at the pdocs CLI');
    expect(tail).toContain('update-project-docs Step 6 ("Documentation CLI pointer")');

    const pointed = fixtureO({ "AGENTS.md": blurb() });
    const quiet = migrate(pointed);
    expect(quiet.exitCode).toBe(0);
    expect(quiet.out).not.toContain("does not point at the pdocs CLI");
  });
});

describe("update-project-docs Steps 2 and 3, run as written on trees generated from release tags", () => {
  const skillDir = resolve(import.meta.dir, "../..");
  const skill = () => readFileSync(join(skillDir, "SKILL.md"), "utf8");
  const blockOf = (from: string, to: string) => {
    const s = skill();
    return /```bash\n([\s\S]*?)```/.exec(s.slice(s.indexOf(from), s.indexOf(to)))?.[1] as string;
  };
  /** The migrations table: name, From, Applies If (unescaped). */
  const rows = () =>
    skill()
      .split("\n")
      .filter((l) => l.startsWith("| [migrations/"))
      .map((l) => l.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim()))
      .map((c) => ({ name: /\[migrations\/(.*?)\.md\]/.exec(c[0] as string)?.[1] as string, from: c[1] as string, test: (c[3] as string).replace(/^`|`$/g, "").replaceAll("\\|", "|") }));
  // Step 3's rule: the rows From 2.5 or earlier are the first five.
  const EARLY = new Set(["pre-2.0", "2.0–2.2", "2.3", "2.4", "2.5"]);

  const generated = (tag: string): string => {
    const base = tmp("migrate-v30-matrix-");
    const tpl = join(base, "tpl");
    mkdirSync(tpl);
    sh(["git", "-C", REPO_ROOT, "archive", "--format=tar", "-o", join(base, "t.tar"), tag]);
    sh(["tar", "-xf", join(base, "t.tar"), "-C", tpl]);
    writeFileSync(join(base, "cc.yaml"), `replay_dir: "${join(base, "replay")}"\ncookiecutters_dir: "${join(base, "cc")}"\n`);
    sh(["cookiecutter", "--config-file", join(base, "cc.yaml"), "--no-input", "-o", join(base, "out"), tpl, "install_target=New project folder"]);
    return join(base, "out", "my-project");
  };

  /** Step 1's version, Step 2's verdict, Step 3's rows — and the case they make. */
  const walk = (root: string) => {
    const cfg = join(root, ".project-docs.json");
    const tree = existsSync(cfg) ? readJson(cfg).version : (/docs_version:\s*"([^"]+)"/.exec(read(root, "docs/README.md"))?.[1] as string);
    const step2 = Bun.spawnSync(["bash", "-c", blockOf("### Step 2:", "### Step 3:").replace("TREE=<the version Step 1 read>", `TREE=${tree}`)], {
      cwd: root,
      env: childEnv({ SKILL_DIR: skillDir }),
      stdout: "pipe",
      stderr: "pipe",
    }).stdout.toString().trim().split("\n");
    const early = Bun.spawnSync(["bash", "-c", blockOf("### Step 3:", "### Step 4:")], { cwd: root, env: childEnv(), stdout: "pipe", stderr: "pipe" }).stdout.toString().trim().endsWith("yes");
    const applying = rows()
      .filter((r) => early || !EARLY.has(r.from))
      .filter((r) => Bun.spawnSync(["bash", "-c", r.test], { cwd: root, env: childEnv(), stdout: "pipe", stderr: "pipe" }).exitCode === 0)
      .map((r) => r.name);
    const verdict = step2[1];
    const kase = verdict === "tree is NEWER" ? 1 : applying.length ? 2 : verdict === "tree is behind" ? 3 : 4;
    return { tree, verdict, early, applying, kase };
  };

  test("each release lands on the case it should, and the early rows are tested only on a tree from before .project-docs.json", () => {
    const at = (v: string) => walk(generated(`project-docs-scaffold-template-v${v}`));
    const past = (() => {
      const root = generated(SCAFFOLD_TAG);
      const [a, b] = SCAFFOLD_RELEASE.split(".").map(Number) as [number, number];
      const v = `${a}.${b + 1}.0`;
      write(root, { "docs/README.md": read(root, "docs/README.md").replace(/^docs_version:\s*"[^"]*"/m, `docs_version: "${v}"`) });
      write(root, { ".project-docs.json": read(root, ".project-docs.json").replace(/"version":\s*"[^"]*"/, `"version": "${v}"`) });
      return walk(root);
    })();
    const later = ["v2.6-to-v2.7", "v2.8-to-v2.9", "v2.9-to-v2.10", "v2.10-to-v3.0"];
    expect(at("2.3.0")).toMatchObject({ verdict: "tree is behind", early: true, kase: 2, applying: ["v2.4-to-v2.5", "v2.5-to-v2.6", ...later] });
    expect(at("6.3.0")).toMatchObject({ verdict: "tree is behind", early: true, kase: 2, applying: later });
    expect(at("8.0.0")).toMatchObject({ verdict: "tree is behind", early: false, kase: 2, applying: ["v2.9-to-v2.10", "v2.10-to-v3.0"] });
    expect(at("8.1.0")).toMatchObject({ verdict: "tree is behind", early: false, kase: 2, applying: ["v2.10-to-v3.0"] });
    // A 9.x tree: the early rows' own tests would come back true on it, and are not run.
    const n900 = generated("project-docs-scaffold-template-v9.0.0");
    const earlyTrue = rows()
      .filter((r) => EARLY.has(r.from))
      .filter((r) => Bun.spawnSync(["bash", "-c", r.test], { cwd: n900, env: childEnv(), stdout: "pipe", stderr: "pipe" }).exitCode === 0).length;
    expect(earlyTrue).toBeGreaterThan(0);
    expect(walk(n900)).toMatchObject({ verdict: "tree is behind", early: false, kase: 3, applying: [] });
    for (const v of ["9.0.1", "9.1.0"]) expect(at(v)).toMatchObject({ verdict: "tree is behind", early: false, kase: 3, applying: [] });
    expect(at(SCAFFOLD_RELEASE)).toMatchObject({ verdict: "same release", kase: 4, applying: [] });
    expect(past).toMatchObject({ verdict: "tree is NEWER", kase: 1, applying: [] });
  }, 120_000); // nine trees generated with cookiecutter
});

describe("update-project-docs Step 2 reads the release this plugin installs from the newest script", () => {
  test("its block, run verbatim, names the newest script's pin and each case; the step names no release itself", () => {
    const skillDir = resolve(import.meta.dir, "../..");
    const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
    const step = skill.slice(skill.indexOf("### Step 2:"), skill.indexOf("### Step 3:"));
    const block = /```bash\n([\s\S]*?)```/.exec(step)?.[1] as string;
    expect(block).toContain("TREE=<the version Step 1 read>");
    // The newest script by its label, part by part — independently of `sort -V`.
    const label = (f: string) => (/^migrate-v([\d.]+)-to-v([\d.]+)\.ts$/.exec(f)?.slice(1) ?? []).flatMap((v) => v.split(".").map(Number));
    const newest = readdirSync(import.meta.dir)
      .filter((f) => label(f).length > 0)
      .sort((a, b) => {
        const [x, y] = [label(a), label(b)];
        for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
        return 0;
      })
      .pop() as string;
    const pin = /SCAFFOLD_TAG = "project-docs-scaffold-template-v([\d.]+)"/.exec(readFileSync(join(import.meta.dir, newest), "utf8"))?.[1] as string;
    const [a, b, c] = pin.split(".").map(Number) as [number, number, number];
    for (const [tree, verdict] of [
      [pin, "same release"],
      [`${a}.${b}.${c + 10}`, "tree is NEWER"],
      [`${a + 1}.0.0`, "tree is NEWER"],
      ["8.1.0", "tree is behind"],
    ] as const) {
      const r = Bun.spawnSync(["bash", "-c", block.replace("TREE=<the version Step 1 read>", `TREE=${tree}`)], { env: childEnv({ SKILL_DIR: skillDir }), stdout: "pipe", stderr: "pipe" });
      expect(r.exitCode).toBe(0);
      expect(r.stdout.toString()).toBe(`tree ${tree}, this plugin installs ${pin} (from ${newest})\n${verdict}\n`);
    }
    // A re-pin needs no edit to the case analysis: it names no scaffold release.
    expect(step.replace(/`9\.0\.10` is later than\s+`9\.0\.9`/, "")).not.toMatch(/\b\d+\.\d+\.\d+\b/);
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

/** `npx` and `bunx` stand-ins that record every call to `log` and do nothing: nothing in the run may call them. */
function recordingNpx(log: string): string {
  const dir = tmp("migrate-v30-stubnpx-");
  for (const name of ["npx", "bunx"]) {
    writeFileSync(join(dir, name), `#!/bin/sh\necho "${name} $*" >> "${log}"\nexit 0\n`);
    chmodSync(join(dir, name), 0o755);
  }
  return dir;
}

describe("format before record — the project's own Prettier, never a downloaded one", () => {
  test("what the run created is formatted with the project's Prettier before the record; a document of the adopter's is not", () => {
    const messy = "docs/projects/alpha/artifacts/messy.md";
    const messyText = doc(common("artifact", "Messy", "Not Prettier's shape."), "# Messy\n\n*   one\n*   two\n");
    const root = withPrettier(fixtureO({ [messy]: messyText }));
    // A config the scaffold's bytes do not already satisfy, so formatting has work to do.
    const config = join(root, ".prettierrc");
    writeFileSync(config, '{ "proseWrap": "always", "printWidth": 50 }\n');
    commitAll(root, "a narrow print width");
    const r = migrate(root, [], { format: true });
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("no document of yours was formatted");
    expect(r.out).toMatch(/formatted \d+ file\(s\) this run created or installed with your Prettier 3\.[\d.]+ \([1-9]\d* changed\)/);
    const created = ["docs/items/beta/item.md", "docs/TEMPLATES/PLAN.template.md"];
    expect(prettierCheck(root, created, config).exitCode).toBe(0);
    expect(readJson(join(root, "docs/.pdocs-seed.json")).files["TEMPLATES/PLAN.template.md"]).toBe(hashOf(join(root, "docs/TEMPLATES/PLAN.template.md")));
    expect(splitFrontmatter(read(root, "docs/features/alpha/artifacts/messy.md")).body).toBe(splitFrontmatter(messyText).body);
  });

  test("the owned files the refresh installs pass the project's own `prettier --check`, and a re-run still reads them as unedited", () => {
    const root = withPrettier(fixtureO());
    const config = join(root, ".prettierrc");
    // Not the scaffold's config: every wrapped paragraph of the scaffold's bytes fails this check.
    writeFileSync(config, '{ "proseWrap": "never" }\n');
    commitAll(root, "unwrapped prose");
    const r = migrate(root, [], { format: true });
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    const owned = ["SCHEMA.md", "README.md", "AGENTS.md", "features/README.md", "items/README.md", "playbooks/README.md", "cycles/README.md"].map((f) => `docs/${f}`);
    const check = prettierCheck(root, owned, config);
    if (check.exitCode !== 0) console.log(check.out);
    expect(check.exitCode).toBe(0);
    expect(r.out).toContain("the owned files are written as your Prettier");
    commitAll(root, "migrated");
    const before = treeDigest(join(root, "docs"));
    const again = migrate(root, [], { format: true });
    expect(again.exitCode).toBe(0);
    expect(again.out).not.toContain("yours, in an owned file");
    expect(again.out).toContain("owned file(s) already identical to the scaffold's, as your Prettier prints it");
    expect(treeDigest(join(root, "docs"))).toEqual(before);
  });

  test("an owned file your Prettier would change beyond wrapping is left at the scaffold's bytes, and named", () => {
    const root = withPrettier(fixtureO());
    // At this width Prettier breaks a YAML list in SCHEMA.md and adds a trailing comma.
    writeFileSync(join(root, ".prettierrc"), '{ "proseWrap": "always", "printWidth": 50 }\n');
    commitAll(root, "a narrow print width");
    const r = migrate(root, [], { format: true });
    expect(r.exitCode).toBe(0);
    expect(r.out).toMatch(/left at the scaffold's bytes, because your Prettier would change more than wrapping[^\n]*docs\/SCHEMA\.md/);
    expect(read(root, "docs/SCHEMA.md")).toBe(read(target(), "docs/SCHEMA.md"));
  });

  test("a table whose links the run respells still passes `prettier --check`; a table it did not edit is left as it was", () => {
    const clean = "docs/projects/alpha/artifacts/table.md";
    const mixed = "docs/projects/alpha/artifacts/mixed.md";
    const table = "| Item | Where |\n| --- | --- |\n| Open | [open](../../../backlog/2026-01-01-open-item.md) |\n| Alpha | [plan](../plan.md) |\n";
    const untouched = "| a | b |\n|---|---|\n| misaligned | on purpose |\n";
    const root = withPrettier(
      fixtureO({
        [clean]: doc(common("artifact", "Table", "A table of links."), `# Table\n\n${table}`),
        [mixed]: doc(common("artifact", "Mixed", "Two tables."), `# Mixed\n\n${table}\n${untouched}`),
      })
    );
    // The adopter's file is Prettier-clean before the run (the second table in `mixed` aside, on purpose).
    Bun.spawnSync([join(REPO_ROOT, "node_modules/.bin/prettier"), "--write", "--config", join(root, ".prettierrc"), clean], { cwd: root, stdout: "pipe", stderr: "pipe", env: childEnv() });
    commitAll(root, "a table of links");
    expect(prettierCheck(root, [clean], join(root, ".prettierrc")).exitCode).toBe(0);
    const r = migrate(root, [], { format: true });
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    const moved = "docs/features/alpha/artifacts/table.md";
    expect(read(root, moved)).toContain("(../../../items/open-item.md)");
    const check = prettierCheck(root, [moved], join(root, ".prettierrc"));
    if (check.exitCode !== 0) console.log(check.out);
    expect(check.exitCode).toBe(0);
    const m = read(root, "docs/features/alpha/artifacts/mixed.md");
    expect(m).toContain(untouched);
    expect(m).not.toContain("| Open | [open](../../../items/open-item.md) |");
  });

  test("every edited table the run could not re-pad is named with why: one Prettier would change beyond padding, one in a blockquote, one under a list item", () => {
    const f = "docs/projects/alpha/artifacts/three.md";
    const link = "[open](../../../backlog/2026-01-01-open-item.md)";
    const body = `# Three\n\n| Item | Note |\n| ---- | ---- |\n| ${link} | *em* |\n\n> | Item | Note |\n> | ---- | ---- |\n> | ${link} | x |\n\n- A list\n\n  | Item | Note |\n  | ---- | ---- |\n  | ${link} | y |\n`;
    const root = withPrettier(fixtureO({ [f]: doc(common("artifact", "Three", "Three tables."), body) }));
    const r = migrate(root, [], { format: true });
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    const moved = "docs/features/alpha/artifacts/three.md";
    expect(r.out).toContain("3 table(s) whose links this run respells are left as they are");
    expect(r.out).toMatch(new RegExp(`${moved}:\\d+ \\(your Prettier would change more than its padding\\)`));
    expect(r.out).toMatch(new RegExp(`${moved}:\\d+ \\(in a blockquote\\)`));
    expect(r.out).toMatch(new RegExp(`${moved}:\\d+ \\(indented\\)`));
    expect(read(root, moved)).toContain("| [open](../../../items/open-item.md) | *em* |");
  });

  test("without Prettier, a respelled table is left as it is, and the plan says which file to format", () => {
    const root = fixtureO({ "docs/projects/alpha/artifacts/table.md": doc(common("artifact", "Table", "A table of links."), "# Table\n\n| Item | Where |\n| ---- | ----- |\n| Open | [open](../../../backlog/2026-01-01-open-item.md) |\n") });
    const r = migrate(root, [], { format: true });
    expect(r.exitCode).toBe(0);
    expect(read(root, "docs/features/alpha/artifacts/table.md")).toContain("| Open | [open](../../../items/open-item.md) |");
    expect(r.out).toMatch(/1 table\(s\) whose links this run respells are left as they are, their columns possibly out of line — format them yourself: docs\/features\/alpha\/artifacts\/table\.md:\d+ \(no Prettier in this project\)/);
  });

  test("a Prettier that fails stops the run before the record", () => {
    const root = withPrettier(fixtureO());
    writeFileSync(join(root, ".prettierrc"), "{ not json\n");
    commitAll(root, "a broken config");
    const r = migrate(root, [], { format: true });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: your Prettier failed over the");
    expect(readJson(join(root, "docs/.pdocs-seed.json")).version).toBe("8.1.0");
  });

  test("a project with no Prettier: formatting is skipped and says so; nothing is downloaded, with empty caches and no npx needed", () => {
    const root = fixtureO();
    const log = join(tmp("migrate-v30-npxlog-"), "calls.log");
    const bunCache = tmp("migrate-v30-bun-cache-");
    const npmCache = tmp("migrate-v30-npm-cache-");
    const r = migrate(root, [], {
      format: true,
      env: {
        PATH: `${recordingNpx(log)}:${dirname(Bun.which("bun") as string)}:/usr/bin:/bin`,
        BUN_INSTALL_CACHE_DIR: bunCache,
        npm_config_cache: npmCache,
      },
    });
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("no Prettier in this project, so the");
    expect(r.out).toContain("none is downloaded");
    expect(existsSync(log)).toBe(false);
    expect(readdirSync(bunCache)).toEqual([]);
    expect(readdirSync(npmCache)).toEqual([]);
    expect(existsSync(join(root, "node_modules"))).toBe(false);
  });
});

// ─── Frontmatter in Prettier's shape ─────────────────────────────────────────

/**
 * Documents whose frontmatter the run synthesizes or rewrites with values past
 * the print width: a legacy archive with none (a long title, a long first
 * sentence carrying a quoted phrase), and an investigation with a long
 * description, so the item created for it carries one too.
 */
const LONG_VALUES: Record<string, string> = {
  "docs/projects/_archive/delta/proposal.md":
    '# Proposal: A deliberately long title for the delta feature, past eighty columns\n\n**Date:** 2025-11-01\n\nThe "delta" work needed a first sentence long enough that Prettier has to fold\nit onto an indented line under its key. It shipped.\n',
  "docs/investigations/2026-01-16-long-question.md": doc(
    common("investigation", "Long question", "Whether a description this long, once the run copies it onto the item it creates for the investigation, is folded the way Prettier folds it.", { lifecycle: "active" }),
    "# Long question\n\nStill open.\n"
  ),
};

/** `root` given this repository's Prettier and `.prettierrc`, as a consumer on Prettier 3.x has them. */
function withPrettier(root: string): string {
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  symlinkSync(realpathSync(join(REPO_ROOT, "node_modules/prettier")), join(root, "node_modules/prettier"));
  symlinkSync(join(root, "node_modules/prettier/bin/prettier.cjs"), join(root, "node_modules/.bin/prettier"));
  write(root, { ".prettierrc": read(REPO_ROOT, ".prettierrc"), ".gitignore": "node_modules/\n" });
  commitAll(root, "prettier, as the project has it");
  return root;
}

/**
 * The documents whose frontmatter the run synthesized, rewrote or created, from
 * its phase 5 lines. Only these: the owned files and the adopter's untouched
 * documents are not the run's to shape.
 */
const frontmatterWritten = (out: string) => [...out.matchAll(/✓ (?:created|frontmatter) (\S+\.md) — /g)].map((m) => m[1] as string);

/** `prettier --check` over `files`, with this repository's Prettier and `config` (its `.prettierrc` by default). */
function prettierCheck(root: string, files: string[], config = join(REPO_ROOT, ".prettierrc")): { exitCode: number | null; out: string } {
  const r = Bun.spawnSync([join(REPO_ROOT, "node_modules/.bin/prettier"), "--check", "--config", config, ...files], { cwd: root, stdout: "pipe", stderr: "pipe", env: childEnv() });
  return { exitCode: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

describe("frontmatter the run writes is in Prettier's shape", () => {
  test("with the project's Prettier: `prettier --check` finds nothing to change in any document whose frontmatter the run wrote", () => {
    const root = withPrettier(fixtureO(LONG_VALUES));
    const r = migrate(root, [], { format: true });
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    const written = frontmatterWritten(r.out);
    // Synthesized (gamma, delta), rewritten (alpha, the backlog, the write-ups), created (the items).
    for (const f of ["docs/features/_archive/delta/feature.md", "docs/features/alpha/feature.md", "docs/items/open-item.md", "docs/items/long-question/write-up.md", "docs/items/long-question/item.md"])
      expect(written).toContain(f);
    const check = prettierCheck(root, written);
    expect(check.out).toContain("All matched files use Prettier code style!");
    expect(check.exitCode).toBe(0);
    // The long values were folded, and the lint still reads them back whole.
    const delta = fmOf(root, "docs/features/_archive/delta/feature.md");
    expect(delta).toContain("description:\n  ");
    expect(fmGet(delta, "description")).toBe('The "delta" work needed a first sentence long enough that Prettier has to fold it onto an indented line under its key.');
    expect(fmGet(fmOf(root, "docs/items/long-question/item.md"), "description")).toStartWith("Whether a description this long");
    expect(pdocs(root, "check").exitCode).toBe(0);
  });

  test("without Prettier: a blank line after the block, Prettier's quotes, and nothing for Prettier's defaults to change", () => {
    const root = fixtureO(LONG_VALUES);
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    const text = read(root, "docs/features/_archive/delta/feature.md");
    expect(text).toMatch(/\n---\n\n# Proposal: A deliberately long title/);
    // More double quotes than single: Prettier would single-quote it, so the run does.
    expect(text).toContain(`description: 'The "delta" work needed`);
    // Prettier's defaults (proseWrap: preserve, printWidth: 80) keep a long value on its key's line.
    const written = frontmatterWritten(r.out);
    expect(written.length).toBeGreaterThan(10);
    const defaults = join(tmp("migrate-v30-prettierrc-"), ".prettierrc");
    writeFileSync(defaults, "{}\n");
    const check = prettierCheck(root, written, defaults);
    expect(check.out).toContain("All matched files use Prettier code style!");
  });
});

describe("prettierFrontmatter — the project's own Prettier, or none; never a downloaded one", () => {
  const block = `title: a\ndescription: 'The "delta" work needed a first sentence long enough that Prettier has to fold it.'`;

  test("on Prettier 3, a path .gitignore names is ignored as the CLI ignores it, and so is one .prettierignore names", () => {
    const root = tmp("migrate-v30-gitignored-");
    mkdirSync(join(root, "node_modules"), { recursive: true });
    symlinkSync(realpathSync(join(REPO_ROOT, "node_modules/prettier")), join(root, "node_modules/prettier"));
    write(root, { ".gitignore": "node_modules/\nscratch/\n", ".prettierignore": "vendor/\n" });
    const text = "*   one\n*   two\n";
    const r = prettierFormat(root, ["scratch/a.md", "vendor/b.md", "docs/c.md"].map((p) => ({ path: join(root, p), text })));
    expect(r.version).toStartWith("3.");
    expect(r.out).toEqual([null, null, "- one\n- two\n"]);
  });

  test("a project with no node_modules: every block falls back, it says so, and nothing is downloaded", () => {
    const root = tmp("migrate-v30-noprettier-");
    const cache = tmp("migrate-v30-bun-cache-");
    const before = process.env.BUN_INSTALL_CACHE_DIR;
    process.env.BUN_INSTALL_CACHE_DIR = cache;
    try {
      const r = prettierFrontmatter(root, [{ path: join(root, "docs/a.md"), fm: block }]);
      expect(r.blocks).toEqual([null]);
      expect(r.note).toContain("no Prettier in this project");
    } finally {
      if (before === undefined) delete process.env.BUN_INSTALL_CACHE_DIR;
      else process.env.BUN_INSTALL_CACHE_DIR = before;
    }
    expect(readdirSync(cache)).toEqual([]);
  });

  test("the project's Prettier folds a long value; a config it cannot parse falls back, and says why", () => {
    const root = tmp("migrate-v30-withprettier-");
    mkdirSync(join(root, "node_modules"));
    symlinkSync(realpathSync(join(REPO_ROOT, "node_modules/prettier")), join(root, "node_modules/prettier"));
    write(root, { ".prettierrc": read(REPO_ROOT, ".prettierrc") });
    const good = prettierFrontmatter(root, [{ path: join(root, "docs/a.md"), fm: block }]);
    expect(good.note).toBeNull();
    expect(good.blocks[0]).toContain(`description:\n  'The "delta" work`);
    write(root, { ".prettierrc": "{ not json" });
    const bad = prettierFrontmatter(root, [{ path: join(root, "docs/a.md"), fm: block }]);
    expect(bad.blocks).toEqual([null]);
    expect(bad.note).toContain("failed on a block");
    expect(bad.note).toContain(".prettierrc");
  });

  test("the plan says so when the run falls back, and says nothing with --skip-format", () => {
    const root = fixtureO(LONG_VALUES);
    expect(migrate(root, ["--dry-run"], { format: true }).out).toContain("no Prettier in this project");
    expect(migrate(root, ["--dry-run"]).out).not.toContain("no Prettier in this project");
  });
});

// ─── Ignore files follow what moved ──────────────────────────────────────────

describe("respellIgnorePattern / respellIgnoreText / respellBiomeText — a pattern follows what it ignored", () => {
  const moves: Array<[string, string]> = [
    ["docs/projects/alpha", "docs/features/alpha"],
    ["docs/projects/alpha/proposal.md", "docs/features/alpha/feature.md"],
    ["docs/projects/alpha/checkpoint/canon/Hero.md", "docs/features/alpha/checkpoint/canon/Hero.md"],
    ["docs/projects/beta", "docs/items/beta"],
    ["docs/projects/beta/checkpoint/canon/Villain.md", "docs/items/beta/checkpoint/canon/Villain.md"],
    ["docs/projects/beta/sessions/s.md", "docs/items/beta/sessions/s.md"],
    ["docs/projects/_archive/gamma", "docs/features/_archive/gamma"],
    ["docs/projects/_archive/gamma/plan.md", "docs/features/_archive/gamma/plan.md"],
    ["docs/backlog/2026-01-01-a.md", "docs/items/a.md"],
  ];

  test.each([
    ["dist/", ["dist/"]],
    ["canon/", ["canon/"]],
    ["docs/**/canon/", ["docs/**/canon/"]],
    ["docs/projects/alpha/checkpoint/canon/", ["docs/features/alpha/checkpoint/canon/"]],
    ["/docs/projects/alpha/checkpoint/canon/", ["/docs/features/alpha/checkpoint/canon/"]],
    ["./docs/projects/beta/checkpoint/canon/Villain.md", ["./docs/items/beta/checkpoint/canon/Villain.md"]],
    ["!docs/projects/alpha/checkpoint/canon/Hero.md", ["!docs/features/alpha/checkpoint/canon/Hero.md"]],
    ["!!docs/backlog/2026-01-01-a.md", ["!!docs/items/a.md"]],
    ["docs/projects/alpha/proposal.md", ["docs/features/alpha/feature.md"]],
    ["docs/projects/alpha/**/*.md", ["docs/features/alpha/**/*.md"]],
    // A wildcard where the entity would be: one line per entity, wherever it went.
    ["docs/projects/*/checkpoint/canon/", ["docs/features/alpha/checkpoint/canon/", "docs/items/beta/checkpoint/canon/"]],
    ["docs/projects/**/canon/*.md", ["docs/features/alpha/**/canon/*.md", "docs/items/beta/**/canon/*.md"]],
    ["docs/projects/*/proposal.md", ["docs/features/alpha/feature.md"]],
    // The retired folder itself: each entity under it, the archive's included.
    ["docs/projects/", ["docs/features/alpha/", "docs/items/beta/", "docs/features/_archive/gamma/"]],
    ["docs/backlog/*.md", ["docs/items/a.md"]],
  ] as const)("%s → %p", (pattern, want) => {
    expect(respellIgnorePattern(pattern, moves, "docs")).toEqual({ lines: [...want] });
  });

  test.each([
    ["**/docs/projects/alpha/canon/", "behind a wildcard"],
    ["docs/projects/zeta/", "nothing the run moved matched it"],
    // Spelled out, but the run renamed the one file it ignored: the new spelling would miss it.
    ["docs/projects/alpha/proposal.*", "would no longer ignore 1 moved file(s)"],
    // gitignore reads braces literally: this ignored nothing, and two lines would ignore two folders.
    ["docs/projects/{alpha,beta}/checkpoint/", "a brace pattern"],
    ["\\!docs/projects/alpha/checkpoint/", "an escaped pattern"],
    ["\\#docs/projects/alpha/checkpoint/", "an escaped pattern"],
  ])("%s is left as written, and says why", (pattern, why) => {
    const r = respellIgnorePattern(pattern, moves, "docs");
    expect(r.lines).toBeNull();
    expect(r.why).toContain(why);
  });

  test("`.gitignore` (wide): a wildcard at the entity goes category-wide, so a later entity's files stay ignored; a spelled-out path still follows its move", () => {
    const wide = (p: string) => respellIgnorePattern(p, moves, "docs", { wide: true });
    expect(wide("docs/projects/*/scratch/")).toEqual({ lines: ["docs/features/*/scratch/", "docs/items/*/scratch/"] });
    expect(wide("docs/projects/**/canon/*.md")).toEqual({ lines: ["docs/features/**/canon/*.md", "docs/items/**/canon/*.md"] });
    expect(wide("docs/projects/_archive/*/tmp/")).toEqual({ lines: ["docs/features/_archive/*/tmp/", "docs/items/_archive/*/tmp/"] });
    expect(wide("docs/backlog/*.tmp")).toEqual({ lines: ["docs/items/*.tmp"] });
    expect(wide("docs/projects/alpha/checkpoint/canon/")).toEqual({ lines: ["docs/features/alpha/checkpoint/canon/"] });
    expect(wide("docs/projects/").lines).toBeNull();
  });

  test("a file: comments and blank lines byte for byte, a negation after its pattern, CRLF kept, and a second pass changes nothing", () => {
    const text = "# docs/projects/alpha/checkpoint/canon/ is byte-exact\r\n\r\ndocs/projects/*/checkpoint/canon/*.md\r\n!docs/projects/alpha/checkpoint/canon/Hero.md\r\nnode_modules/\r\n";
    const r = respellIgnoreText(text, moves, "docs");
    expect(r.text).toBe(
      "# docs/projects/alpha/checkpoint/canon/ is byte-exact\r\n\r\ndocs/features/alpha/checkpoint/canon/*.md\r\ndocs/items/beta/checkpoint/canon/*.md\r\n!docs/features/alpha/checkpoint/canon/Hero.md\r\nnode_modules/\r\n"
    );
    expect(r.changes).toEqual([
      "line 3: docs/projects/*/checkpoint/canon/*.md → docs/features/alpha/checkpoint/canon/*.md, docs/items/beta/checkpoint/canon/*.md",
      "line 4: !docs/projects/alpha/checkpoint/canon/Hero.md → !docs/features/alpha/checkpoint/canon/Hero.md",
    ]);
    expect(r.flags).toEqual([]);
    expect(respellIgnoreText(r.text, moves, "docs")).toEqual({ text: r.text, changes: [], flags: [] });
  });

  test("add then drop: both spellings in between, each pass idempotent, and the end is what replace writes — a new line taken out during a stop is put back", () => {
    const text = "# canon\ndocs/projects/*/checkpoint/canon/*.md\n!docs/projects/alpha/checkpoint/canon/Hero.md\n";
    const added = respellIgnoreText(text, moves, "docs", { mode: "add" });
    expect(added.text).toBe(
      "# canon\ndocs/projects/*/checkpoint/canon/*.md\ndocs/features/alpha/checkpoint/canon/*.md\ndocs/items/beta/checkpoint/canon/*.md\n!docs/projects/alpha/checkpoint/canon/Hero.md\n!docs/features/alpha/checkpoint/canon/Hero.md\n"
    );
    expect(respellIgnoreText(added.text, moves, "docs", { mode: "add" }).text).toBe(added.text);
    const dropped = respellIgnoreText(added.text, moves, "docs", { mode: "drop" });
    expect(dropped.text).toBe(respellIgnoreText(text, moves, "docs").text);
    expect(respellIgnoreText(dropped.text, moves, "docs", { mode: "drop" })).toEqual({ text: dropped.text, changes: [], flags: [] });
    // The adopter deleted one added line while the run was stopped: drop restores it where the old one stood.
    const edited = added.text.replace("docs/items/beta/checkpoint/canon/*.md\n", "");
    expect(respellIgnoreText(edited, moves, "docs", { mode: "drop" }).text).toBe(dropped.text);
  });

  test("Biome: each glob string respelled in the file's own text, a negation kept, comments not read as globs", () => {
    const text = '{\n  // docs/projects/alpha is where canon lived\n  "files": { "includes": ["**", "!docs/projects/*/checkpoint/canon", "!docs/backlog/2026-01-01-a.md"] }\n}\n';
    const r = respellBiomeText(text, moves, "docs");
    expect(r.text).toBe(
      '{\n  // docs/projects/alpha is where canon lived\n  "files": { "includes": ["**", "!docs/features/alpha/checkpoint/canon", "!docs/items/beta/checkpoint/canon", "!docs/items/a.md"] }\n}\n'
    );
    expect(r.changes).toHaveLength(2);
    expect(respellBiomeText(r.text, moves, "docs").changes).toEqual([]);
    // add then drop lands on the same bytes, the dropped element's comma with it.
    const added = respellBiomeText(text, moves, "docs", { mode: "add" }).text;
    expect(added).toContain('"!docs/projects/*/checkpoint/canon", "!docs/features/alpha/checkpoint/canon", "!docs/items/beta/checkpoint/canon"');
    expect(respellBiomeText(added, moves, "docs", { mode: "drop" }).text).toBe(r.text);
  });

  test("Biome: a string outside a list is respelled only to one string; one that would become several is named, and the file still parses", () => {
    const text = '{\n  "vcs": { "root": "docs/projects/" },\n  "files": { "root": "docs/projects/alpha/checkpoint" },\n}\n';
    const r = respellBiomeText(text, moves, "docs");
    expect(r.text).toBe('{\n  "vcs": { "root": "docs/projects/" },\n  "files": { "root": "docs/features/alpha/checkpoint" },\n}\n');
    expect(r.flags).toEqual([expect.stringContaining("not in a list to hold several")]);
    expect(() => JSON.parse(jsoncToJson(r.text))).not.toThrow();
  });
});

/** A byte-exact canon note that Prettier would reformat: `*` bullets and a setext heading. */
const CANON = "---\nname: Hero\n---\n\nHero\n====\n\n*   brave\n*   tired\n";

/** `root` with `files` written, `lint.exclude` extended by `exclude`, committed. */
function withIgnored(root: string, files: Record<string, string>, exclude: string[]): string {
  const cfg = readJson(join(root, ".project-docs.json"));
  cfg.lint.exclude = [...cfg.lint.exclude, ...exclude];
  write(root, { ...files, ".project-docs.json": `${JSON.stringify(cfg, null, 2)}\n` });
  commitAll(root, "ignore files, and what they protect");
  return root;
}

/** Prettier's own verdict: whether `.prettierignore` (and `.gitignore`) at `root` ignore `rel`. Never downloads: the repository's binary. */
function prettierIgnores(root: string, rel: string): boolean {
  const r = Bun.spawnSync([join(REPO_ROOT, "node_modules/.bin/prettier"), "--file-info", rel], { cwd: root, stdout: "pipe", stderr: "pipe", env: childEnv() });
  if (r.exitCode !== 0) throw new Error(`prettier --file-info ${rel} exited ${r.exitCode}: ${r.stderr.toString()}`);
  return JSON.parse(r.stdout.toString()).ignored === true;
}

/** Git's own verdict: whether `.gitignore` at `root` ignores `rel`. */
const gitIgnores = (root: string, rel: string) => Bun.spawnSync(["git", "check-ignore", "-q", rel], { cwd: root, stdout: "pipe", stderr: "pipe", env: childEnv() }).exitCode === 0;

describe("the run respells retired paths in the ignore files, so what was excluded from formatting stays excluded", () => {
  test("the item's definition of done: a canon file .prettierignore protected before the run is still ignored after it, byte for byte", () => {
    const root = withIgnored(
      fixtureO(),
      {
        "docs/projects/alpha/checkpoint/canon/Hero.md": CANON,
        ".prettierignore": "# byte-exact canon, read back by a tool\ndocs/projects/alpha/checkpoint/canon/\n",
      },
      ["docs/projects/alpha/checkpoint/**"]
    );
    // Before: ignored, and Prettier WOULD change it, so the protection is load-bearing.
    expect(prettierIgnores(root, "docs/projects/alpha/checkpoint/canon/Hero.md")).toBe(true);
    const unprotected = prettierCheck(root, ["--ignore-path", "/dev/null", "docs/projects/alpha/checkpoint/canon/Hero.md"]);
    expect(unprotected.exitCode).not.toBe(0);

    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    expect(read(root, "docs/features/alpha/checkpoint/canon/Hero.md")).toBe(CANON);
    expect(prettierIgnores(root, "docs/features/alpha/checkpoint/canon/Hero.md")).toBe(true);
    expect(read(root, ".prettierignore")).toBe("# byte-exact canon, read back by a tool\ndocs/features/alpha/checkpoint/canon/\n");
    expect(r.out).toContain("✓ .prettierignore: line 2: docs/features/alpha/checkpoint/canon/ added beside docs/projects/alpha/checkpoint/canon/");
    expect(r.out).toContain("✓ .prettierignore: line 2: docs/projects/alpha/checkpoint/canon/ dropped — docs/features/alpha/checkpoint/canon/ stands in its place");
    expect(r.out).toContain("· .prettierignore: 1 pattern(s) naming a moved path respelled");
  });

  test("a run stopped mid-move leaves the moved canon ignored; the re-run keeps it ignored and drops the old line", () => {
    const root = withIgnored(
      fixtureO(),
      {
        "docs/projects/alpha/checkpoint/canon/Hero.md": CANON,
        ".prettierignore": "docs/projects/alpha/checkpoint/canon/\n",
      },
      ["docs/projects/alpha/checkpoint/**"]
    );
    chmodSync(join(root, "docs/investigations/_archive"), 0o555);
    const stopped = migrate(root);
    chmodSync(join(root, "docs/investigations/_archive"), 0o755);
    expect(stopped.exitCode).toBe(1);
    // alpha moved before the stop; the canon is protected where it now sits.
    expect(existsSync(join(root, "docs/features/alpha/checkpoint/canon/Hero.md"))).toBe(true);
    expect(prettierIgnores(root, "docs/features/alpha/checkpoint/canon/Hero.md")).toBe(true);
    expect(read(root, ".prettierignore")).toBe("docs/projects/alpha/checkpoint/canon/\ndocs/features/alpha/checkpoint/canon/\n");

    const resumed = migrate(root);
    if (resumed.exitCode !== 0) console.log(resumed.out);
    expect(resumed.exitCode).toBe(0);
    expect(read(root, ".prettierignore")).toBe("docs/features/alpha/checkpoint/canon/\n");
    expect(prettierIgnores(root, "docs/features/alpha/checkpoint/canon/Hero.md")).toBe(true);
    expect(read(root, "docs/features/alpha/checkpoint/canon/Hero.md")).toBe(CANON);
  });

  test("a glob, a negation and a comment line; .eslintignore, .gitignore (category-wide) and biome.jsonc respelled, eslint.config.js named; a re-run changes nothing", () => {
    const ignore =
      "# docs/projects/alpha/checkpoint/canon/ — the comment keeps its words\n" +
      "docs/projects/*/checkpoint/canon/*.md\n" +
      "!docs/projects/alpha/checkpoint/canon/Loose.md\n";
    const root = withIgnored(
      fixtureO(),
      {
        "docs/projects/alpha/checkpoint/canon/Hero.md": CANON,
        "docs/projects/alpha/checkpoint/canon/Loose.md": CANON,
        "docs/projects/beta/checkpoint/canon/Villain.md": CANON,
        ".prettierignore": ignore,
        ".eslintignore": "docs/projects/alpha/checkpoint/\n",
        ".gitignore": "docs/projects/*/scratch/\n",
        "biome.jsonc": '{\n  // canon is byte-exact\n  "files": { "includes": ["**", "!docs/projects/*/checkpoint",] }\n}\n',
        "eslint.config.js": 'export default [{ ignores: ["docs/projects/alpha/checkpoint/**"] }];\n',
      },
      ["docs/projects/alpha/checkpoint/**", "docs/projects/beta/checkpoint/**"]
    );
    write(root, { "docs/projects/alpha/scratch/notes.txt": "scratch\n" });
    for (const f of ["alpha/checkpoint/canon/Hero.md", "beta/checkpoint/canon/Villain.md"]) expect(prettierIgnores(root, `docs/projects/${f}`)).toBe(true);
    expect(prettierIgnores(root, "docs/projects/alpha/checkpoint/canon/Loose.md")).toBe(false);
    expect(gitIgnores(root, "docs/projects/alpha/scratch/notes.txt")).toBe(true);

    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    expect(prettierIgnores(root, "docs/features/alpha/checkpoint/canon/Hero.md")).toBe(true);
    expect(prettierIgnores(root, "docs/items/beta/checkpoint/canon/Villain.md")).toBe(true);
    expect(prettierIgnores(root, "docs/features/alpha/checkpoint/canon/Loose.md")).toBe(false);
    expect(read(root, ".prettierignore")).toBe(
      "# docs/projects/alpha/checkpoint/canon/ — the comment keeps its words\n" +
        "docs/features/alpha/checkpoint/canon/*.md\n" +
        "docs/items/beta/checkpoint/canon/*.md\n" +
        "!docs/features/alpha/checkpoint/canon/Loose.md\n"
    );
    expect(read(root, ".eslintignore")).toBe("docs/features/alpha/checkpoint/\n");
    expect(read(root, ".gitignore")).toBe("docs/features/*/scratch/\ndocs/items/*/scratch/\n");
    // What git ignored stays ignored — for the entity that moved, and for one filed after the run.
    expect(gitIgnores(root, "docs/features/alpha/scratch/notes.txt")).toBe(true);
    write(root, { "docs/items/later/scratch/new.txt": "new\n" });
    expect(gitIgnores(root, "docs/items/later/scratch/new.txt")).toBe(true);
    expect(read(root, "biome.jsonc")).toBe('{\n  // canon is byte-exact\n  "files": { "includes": ["**", "!docs/features/alpha/checkpoint", "!docs/items/beta/checkpoint",] }\n}\n');
    expect(read(root, "eslint.config.js")).toBe('export default [{ ignores: ["docs/projects/alpha/checkpoint/**"] }];\n');
    expect(r.out).toContain("eslint.config.js: 1 pattern(s) naming a retired path left as written — respell each by hand");
    expect(r.out).toContain("`docs/projects/alpha/checkpoint/` — now docs/features/alpha/checkpoint/; a config in code is not rewritten, respell it by hand");
    expect(r.out).toContain("docs/projects/*/scratch/ → docs/features/*/scratch/, docs/items/*/scratch/");

    rmSync(join(root, "docs/items/later"), { recursive: true });
    commitAll(root, "migrated");
    const before = treeDigest(root);
    const again = migrate(root);
    expect(again.exitCode).toBe(0);
    expect(treeDigest(root)).toEqual(before);
  });

  test("--dry-run plans each respelling and each flag, and writes nothing", () => {
    const root = withIgnored(
      fixtureO(),
      {
        "docs/projects/alpha/checkpoint/canon/Hero.md": CANON,
        ".prettierignore": "docs/projects/alpha/checkpoint/canon/\n",
        "eslint.config.js": 'export default [{ ignores: ["docs/projects/alpha/checkpoint/**"] }];\n',
      },
      ["docs/projects/alpha/checkpoint/**"]
    );
    const before = treeDigest(root);
    const r = migrate(root, ["--dry-run"]);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("· ignore file: .prettierignore: line 1: docs/projects/alpha/checkpoint/canon/ → docs/features/alpha/checkpoint/canon/");
    expect(r.out).toContain("· ignore file — for you: eslint.config.js: line 1:");
    expect(r.out).toContain("For you to check");
    expect(treeDigest(root)).toEqual(before);
  });
});

describe("a lint.exclude glob with a wildcard at the entity is respelled category-wide", () => {
  const DECK = "---\ntheme: default\nclass: text-center\n---\n\n# A deck\n\n[proposal](../../proposal.md)\n";
  const decks = {
    "docs/projects/alpha/artifacts/slides/intro-slides.md": DECK,
    "docs/projects/beta/artifacts/beta-slides.md": DECK,
  };
  const deckGlob = "docs/projects/*/artifacts/**/*-slides.md";

  test("the decks it excluded stay excluded — not edited, not linted — through a stop mid-move and its resume; a later entity's deck is excluded too; a re-run changes nothing", () => {
    const root = withIgnored(fixtureO(decks), {}, [deckGlob]);
    chmodSync(join(root, "docs/investigations/_archive"), 0o555);
    const stopped = migrate(root);
    chmodSync(join(root, "docs/investigations/_archive"), 0o755);
    expect(stopped.exitCode).toBe(1);
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    expect(read(root, "docs/features/alpha/artifacts/slides/intro-slides.md")).toBe(DECK);
    expect(read(root, "docs/items/beta/artifacts/beta-slides.md")).toBe(DECK);
    const exclude = readJson(join(root, ".project-docs.json")).lint.exclude as string[];
    expect(exclude).toContain("docs/features/*/artifacts/**/*-slides.md");
    expect(exclude).toContain("docs/items/*/artifacts/**/*-slides.md");
    expect(exclude).not.toContain(deckGlob);
    expect(stopped.out + r.out).toContain(`lint.exclude: ${deckGlob} → docs/features/*/artifacts/**/*-slides.md, docs/items/*/artifacts/**/*-slides.md`);
    // An entity filed after the run, with a deck of its own: excluded by the respelled glob.
    write(root, { "docs/items/later/artifacts/later-slides.md": DECK });
    expect(pdocs(root, "check").exitCode).toBe(0);
    rmSync(join(root, "docs/items/later"), { recursive: true });

    commitAll(root, "migrated");
    const before = treeDigest(root);
    expect(migrate(root).exitCode).toBe(0);
    expect(treeDigest(root)).toEqual(before);
  });
});

describe("a document in lint.exclude moves with its folder, and nothing in it is rewritten", () => {
  test("a canon file with no frontmatter and links in it, excluded, is byte-identical after the run — and the run says so", () => {
    const bare = "Bare\n====\n\nSee [the proposal](../../proposal.md) and [the backlog](../../../../backlog/2026-01-01-open-item.md).\n";
    const root = withIgnored(fixtureO(), { "docs/projects/alpha/checkpoint/canon/Bare.md": bare }, ["docs/projects/alpha/checkpoint/**"]);
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    expect(read(root, "docs/features/alpha/checkpoint/canon/Bare.md")).toBe(bare);
    expect(r.out).toContain("document(s) in lint.exclude were moved with their folder but not edited");
    expect(r.out).toContain("docs/features/alpha/checkpoint/canon/Bare.md");
  });
});

// ─── A position that says artifact ───────────────────────────────────────────

/** A workstream nested in a project: its own plan and a session, as story-loom's storyline-engine has them. */
const WORKSTREAM_BODY = "# WS one plan\n\nSee the [feature plan](../../plan.md).\n\n*   one\n*   two\n";
const WORKSTREAM: Record<string, string> = {
  "docs/projects/alpha/workstreams/ws-one/plan.md": doc(common("plan", "WS one plan", "How the first workstream was built.", { lifecycle: "completed", tags: "[workstream]" }), WORKSTREAM_BODY),
  "docs/projects/alpha/workstreams/ws-one/sessions/2026-01-09-ws-session.md": doc(common("session", "WS session", "A session inside the workstream."), "# WS session\n\nDone.\n"),
  // In lint.exclude: moved, never edited.
  "docs/projects/alpha/workstreams/ws-two/plan.md": doc(common("plan", "WS two plan", "Kept as written.", { lifecycle: "completed" }), "# WS two\n"),
};

describe("a document whose new position says artifact is retyped", () => {
  test("a nested plan and a nested session become artifacts, lifecycle dropped and named, body byte for byte; the owner's own plan and sessions keep their types; a re-run changes nothing", () => {
    const root = withIgnored(fixtureO(WORKSTREAM), {}, ["docs/projects/alpha/workstreams/ws-two/**"]);
    const r = migrate(root);
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    expect(pdocs(root, "check").exitCode).toBe(0);

    const plan = read(root, "docs/features/alpha/workstreams/ws-one/plan.md");
    expect(fmGet(splitFrontmatter(plan).fm as string, "type")).toBe("artifact");
    expect(fmGet(splitFrontmatter(plan).fm as string, "lifecycle")).toBeNull();
    expect(fmGet(splitFrontmatter(plan).fm as string, "tags")).toBe("[workstream]");
    expect(splitFrontmatter(plan).body).toBe(splitFrontmatter(WORKSTREAM["docs/projects/alpha/workstreams/ws-one/plan.md"] as string).body);
    const session = read(root, "docs/features/alpha/workstreams/ws-one/sessions/2026-01-09-ws-session.md");
    expect(fmGet(splitFrontmatter(session).fm as string, "type")).toBe("artifact");

    expect(r.out).toContain("· frontmatter: docs/features/alpha/workstreams/ws-one/plan.md — type: plan → artifact (its position), dropped lifecycle: completed");
    expect(r.out).toContain("· frontmatter: docs/features/alpha/workstreams/ws-one/sessions/2026-01-09-ws-session.md — type: session → artifact (its position)");
    expect(r.out).toContain("docs/features/alpha/workstreams/ws-one/plan.md — lifecycle: completed");

    expect(fmGet(fmOf(root, "docs/features/alpha/plan.md"), "type")).toBe("plan");
    expect(fmGet(fmOf(root, "docs/features/alpha/plan.md"), "lifecycle")).toBe("active");
    expect(fmGet(fmOf(root, "docs/features/alpha/sessions/2026-01-07-first.md"), "type")).toBe("session");
    expect(read(root, "docs/features/alpha/workstreams/ws-two/plan.md")).toBe(WORKSTREAM["docs/projects/alpha/workstreams/ws-two/plan.md"] as string);

    commitAll(root, "migrated");
    const before = treeDigest(root);
    expect(migrate(root).exitCode).toBe(0);
    expect(treeDigest(root)).toEqual(before);
  });

  test("a document already typed artifact is left byte for byte, its tool keys (a deck's marp, theme) included", () => {
    const deck = "---\ntype: artifact\ntitle: Deck\ndescription: The alpha deck.\nstatus: stable\ngenerated: { by: fixture, at: 2026-01-01 }\nmarp: true\ntheme: gaia\n---\n\n# Deck\n";
    const nested = deck.replace("title: Deck", "title: Nested deck");
    const root = fixtureO({ "docs/projects/alpha/artifacts/deck.md": deck, "docs/projects/alpha/workstreams/ws-one/deck.md": nested });
    const r = migrate(root);
    // The keys are left for the lint to name, which stops the run at verify — after every move.
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain('UNKNOWN FIELD  docs/features/alpha/artifacts/deck.md: "marp"');
    expect(read(root, "docs/features/alpha/artifacts/deck.md")).toBe(deck);
    expect(read(root, "docs/features/alpha/workstreams/ws-one/deck.md")).toBe(nested);
    expect(r.out).not.toContain("deck.md — type: artifact");
  });

  test("with the project's Prettier, the retyped frontmatter is in Prettier's shape", () => {
    const root = withPrettier(fixtureO(WORKSTREAM));
    const r = migrate(root, [], { format: true });
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    const files = ["docs/features/alpha/workstreams/ws-one/plan.md", "docs/features/alpha/workstreams/ws-one/sessions/2026-01-09-ws-session.md"];
    for (const f of files) expect(fmGet(fmOf(root, f), "type")).toBe("artifact");
    // The body is the adopter's and unformatted (its bullets are not Prettier's): check only the block.
    for (const f of files) {
      const block = `---\n${splitFrontmatter(read(root, f)).fm}\n---\n`;
      const tmpFile = join(root, "fm-only.md");
      writeFileSync(tmpFile, block);
      expect(prettierCheck(root, ["fm-only.md"]).exitCode).toBe(0);
      rmSync(tmpFile);
    }
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

describe("a tree past the release the run installs is refused, not set back", () => {
  test("compareReleases and treeRelease — numeric, the later marker, non-releases ignored", () => {
    expect(compareReleases("9.1.0", "9.0.1")).toBeGreaterThan(0);
    expect(compareReleases("9.0.10", "9.0.9")).toBeGreaterThan(0);
    expect(compareReleases("10.0.0", "9.9.9")).toBeGreaterThan(0);
    expect(compareReleases("9.0.1", "9.0.1")).toBe(0);
    expect(compareReleases("9.0.0", "9.0.1")).toBeLessThan(0);
    expect(compareReleases("9.1", "9.0.1")).toBeNull();
    expect(treeRelease("9.0.1", "9.1.0")).toEqual({ version: "9.1.0", from: "docs_version" });
    expect(treeRelease("9.1.0", "9.0.1")).toEqual({ version: "9.1.0", from: ".project-docs.json version" });
    expect(treeRelease(undefined, "8.1.0")).toEqual({ version: "8.1.0", from: "docs_version" });
    expect(treeRelease(7, null)).toBeNull();
  });

  /** O migrated with the pinned scaffold, committed: a tree at exactly SCAFFOLD_RELEASE. */
  let atPin: string | null = null;
  const migratedAtPin = (): string => {
    if (atPin) return atPin;
    const root = fixtureO();
    const r = migrate(root, [], { scaffold: generatedScaffolds().current });
    if (r.exitCode !== 0) console.log(r.out);
    expect(r.exitCode).toBe(0);
    commitAll(root, `migrated to ${SCAFFOLD_RELEASE}`);
    atPin = root;
    return root;
  };
  /** A copy of that tree with its markers set, committed. */
  const markedAt = (readme: string, config: string): string => {
    const root = tmp("migrate-v30-marked-");
    cpSync(migratedAtPin(), root, { recursive: true });
    write(root, { "docs/README.md": read(root, "docs/README.md").replace(/^docs_version:\s*"[^"]*"/m, `docs_version: "${readme}"`) });
    write(root, { ".project-docs.json": read(root, ".project-docs.json").replace(/"version":\s*"[^"]*"/, `"version": "${config}"`) });
    commitAll(root, `markers at ${readme} / ${config}`);
    return root;
  };
  // Without --scaffold-dir, as an adopter runs it: the fetch is a copy of the pinned scaffold.
  const pinned = (root: string, args: string[] = []) => migrate(root, args, { scaffold: null, env: { PATH: stubCookiecutter("copy", generatedScaffolds().current) } });

  // A release past the pin, whatever the pin is: the next minor.
  const PAST = (() => {
    const [a, b] = SCAFFOLD_RELEASE.split(".").map(Number) as [number, number];
    return `${a}.${b + 1}.0`;
  })();

  test("a tree past the pin stops in the preflight, says there is nothing to do, and writes nothing — dry run too", () => {
    const root = markedAt(PAST, PAST);
    const before = treeDigest(root);
    for (const args of [[], ["--dry-run"]]) {
      const r = pinned(root, args);
      expect(r.exitCode).toBe(1);
      expect(r.out).toContain(
        `STOPPED: this tree is already past what this migration installs: its .project-docs.json version is ${PAST}, and this\n   migration installs ${SCAFFOLD_RELEASE}. There is nothing for it to do, and running it would set the tree back.`
      );
      expect(r.out).toContain("A newer project-docs plugin may carry a newer migration. Without one there is nothing to migrate");
      expect(r.out).toContain("update-project-docs goes on to its root-file and verify steps.");
      expect(r.out).not.toContain("disagree");
      expect(r.out).toContain("Nothing was written.");
      expect(r.out).not.toContain("[2/12]");
    }
    expect(treeDigest(root)).toEqual(before);
  });

  test("either marker ahead is enough, and the stop names the stale one", () => {
    const r = pinned(markedAt(PAST, SCAFFOLD_RELEASE));
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain(
      `its docs_version is ${PAST} (its .project-docs.json version says ${SCAFFOLD_RELEASE}: the markers disagree, and the later one is what a run would set back), and this`
    );
  });

  test(`a tree at exactly the pin (${SCAFFOLD_RELEASE}) re-runs, and ones at 9.0.1 and 9.0.0 run and are stamped ${SCAFFOLD_RELEASE}`, () => {
    const same = pinned(markedAt(SCAFFOLD_RELEASE, SCAFFOLD_RELEASE));
    if (same.exitCode !== 0) console.log(same.out);
    expect(same.exitCode).toBe(0);
    for (const v of ["9.0.1", "9.0.0"]) {
      const root = markedAt(v, v);
      const r = pinned(root);
      if (r.exitCode !== 0) console.log(r.out);
      expect(r.exitCode).toBe(0);
      expect(readJson(join(root, ".project-docs.json")).version).toBe(SCAFFOLD_RELEASE);
      expect(read(root, "docs/README.md")).toContain(`docs_version: "${SCAFFOLD_RELEASE}"`);
    }
  });

  test("with --scaffold-dir the release compared is that scaffold's own", () => {
    const r = migrate(markedAt("9.9.10", "9.9.10"));
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("its .project-docs.json version is 9.9.10, and this\n   migration installs 9.9.9.");
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

describe("the move record survives a stop: a re-run planned from the half-migrated tree does not shrink it", () => {
  test("stopped in phase 8 with a template of the adopter's still to move: the re-run keeps every move, suggests from them, and --respell still finds them", () => {
    const short = "docs/projects/_archive/gamma/sessions/2025-12-04-short.md";
    const root = fixtureO({
      "docs/projects/TEMPLATES/PROJECT-LEDGER.template.md": "# Project ledger\n",
      [short]: "# Short\n\nSee [alpha](../../alpha/proposal.md).\n",
      "src/app.ts": "// see docs/projects/alpha/proposal.md\n",
    });
    const moves = () => readJson(join(root, ".git", "pdocs-migrate-v2.10-to-v3.0.moves.json")).moves as Array<[string, string]>;
    chmodSync(join(root, "docs/projects/TEMPLATES"), 0o555);
    const first = migrate(root);
    chmodSync(join(root, "docs/projects/TEMPLATES"), 0o755);
    expect(first.exitCode).toBe(1);
    expect(first.out).toContain("[8/12]");
    const complete = moves();
    expect(complete).toContainEqual(["projects/alpha", "features/alpha"]);
    expect(complete).toContainEqual(["projects/TEMPLATES/PROJECT-LEDGER.template.md", "TEMPLATES/PROJECT-LEDGER.template.md"]);
    // The re-run plans afresh — only the templates are left to move — and stops at verify on the short link.
    const again = migrate(root);
    expect(again.exitCode).toBe(1);
    expect(moves()).toEqual(complete);
    expect(again.out).toContain("docs/features/_archive/gamma/sessions/2025-12-04-short.md: ../../../../projects/_archive/alpha/proposal.md → ../../../alpha/feature.md");
    const moved = "docs/features/_archive/gamma/sessions/2025-12-04-short.md";
    write(root, { [moved]: read(root, moved).replace("(../../../../projects/_archive/alpha/proposal.md)", "(../../../alpha/feature.md)") });
    const last = migrate(root);
    if (last.exitCode !== 0) console.log(last.out);
    expect(last.exitCode).toBe(0);
    expect(moves()).toEqual(complete);
    const r = Bun.spawnSync(["bun", SCRIPT, "--root", root, "--respell", "src"], { cwd: root, stdout: "pipe", stderr: "pipe", env: childEnv() });
    expect(r.stdout.toString()).toContain("src/app.ts:1: docs/projects/alpha/proposal.md → docs/features/alpha/feature.md");
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
    // The re-run plans from the moved tree, where nothing is born any more: what the first
    // run found for the adopter to check is still said by the run that completes.
    expect(again.out.slice(again.out.indexOf("For you to check"))).toContain("docs/items/beta/item.md");
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
