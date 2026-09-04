#!/usr/bin/env bun
// The documentation gate.
//
//   bun docs/lint.ts            lint everything; non-zero exit on any problem
//   bun docs/lint.ts --report   what is missing, grouped by field; always exits 0
//   bun docs/lint.ts --json     the library's knowledge graph
//
// Two tiers, keyed to folders rather than to location — see docs/SCHEMA.md.
// The LIBRARY (architecture, specifications, interaction-design, playbooks,
// lessons-learned, memories, and the two root pages) is checked by the ported
// core, which additionally enforces catalog reachability, `related` resolution
// and the graph. The WORKBENCH (backlog, briefs, investigations, projects,
// reports, fragments, cycles) is checked by `thinTier` below: presence and
// vocabulary, and links, and nothing about reachability — those documents are
// written once, they close, and nobody returns to them.
//
// Everything project-specific lives in this file. `scripts/docs-lint/` is a
// copy of a portable core and stays that way.

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ProjectDocsConfig,
  loadConfig,
} from "../scripts/docs-lint/config.ts";
import {
  type LintPage,
  checkLinks,
  parseFrontmatter,
  runDocsLint,
  stripInlineComment,
  walkMarkdown,
  yamlList,
} from "../scripts/docs-lint/index.ts";
import {
  linkProblemsFor,
  trackedMarkdown,
} from "../scripts/docs-lint/unlinted-links.ts";

/**
 * Where to lint, and by what rules.
 *
 * Every function below takes one rather than closing over this repository's
 * paths. A lint bound to its own root cannot be run against a fixture, and
 * cannot be shipped in the scaffold payload to run somewhere else — which are
 * the two things this file has to do.
 */
export interface Ctx {
  repoRoot: string;
  docsRoot: string;
  config: ProjectDocsConfig;
}

export function context(repoRoot: string): Ctx {
  const config = loadConfig(repoRoot);
  return { repoRoot, docsRoot: join(repoRoot, config.docsRoot), config };
}

// ---------------------------------------------------------------------------------------
// What counts as what
// ---------------------------------------------------------------------------------------

/**
 * Meta-documents ABOUT the tree rather than entries in its type system. They
 * carry no frontmatter; only their links are checked, because a folder contract
 * with a dead pointer misroutes the next document written.
 */
const CONTRACT_BASENAMES = new Set([
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "SCHEMA.md",
]);

/** A form, not a document: its links are placeholders by construction. */
export const isTemplate = (path: string): boolean =>
  /template/i.test(basename(path));

/**
 * Not documentation at all — `lint.exclude` in `.project-docs.json`, matched
 * against the path relative to the repository root.
 *
 * Compiled once per context rather than once per file: a glob is parsed on
 * construction, and the walk asks this of every `.md` in the tree.
 */
export function excluder(ctx: Ctx): (repoRelative: string) => boolean {
  const globs = ctx.config.lint.exclude.map((pattern) => new Bun.Glob(pattern));
  if (globs.length === 0) return () => false;
  return (repoRelative) => globs.some((g) => g.match(repoRelative));
}

/** Library folders, and the `type` each one's pages carry.
 *  Exported: the template test and the v2.6-to-v2.7 codemod read the same map. */
export const DURABLE_TYPE: Record<string, string> = {
  architecture: "architecture",
  specifications: "specification",
  "interaction-design": "interaction",
  playbooks: "playbook",
  "lessons-learned": "lesson",
  memories: "memory",
};

/** Library pages that live at the docs root rather than in a folder. */
export const ROOT_PAGE_TYPE: Record<string, string> = {
  "PROJECT_MANIFESTO.md": "manifesto",
  "PROJECT-SUMMARY.md": "summary",
  "index.md": "index",
};

/**
 * A project folder's type is decided by FILENAME, because a project is one
 * feature's whole record and its documents are of different kinds.
 * Anything unrecognised is an `artifact` — a findings note, a review, a
 * prototype writeup — which is what those files are.
 */
export const PROJECT_FILE_TYPE: Record<string, string> = {
  "proposal.md": "proposal",
  "plan.md": "plan",
  "design-resolution.md": "design-resolution",
  "test-plan.md": "test-plan",
  "DEV_KICKOFF.md": "handoff",
};

/**
 * The workbench contract, folder by folder.
 *
 * `lifecycle: null` means the type carries no lifecycle and writing one is an
 * error — a frozen record whose only date is `generated.at`. See SCHEMA.md's
 * "Lifecycle by type" table, which `schemaTableChecks` proves equal to this.
 */
export const SPEC: Record<
  string,
  { type: string; lifecycle: string[] | null; extra?: string[] }
> = {
  // `done` is not in the proposal's vocabulary and should have been. The
  // backlog README describes the real path as open → work it → archive, and
  // "promoted" is the rarer outcome where an item turns out to need a project.
  // Without `done` the common case had no word, which is the same failure that
  // produced `Approved (in flight)` on the proposals.
  backlog: {
    type: "backlog",
    lifecycle: ["open", "done", "promoted", "dropped"],
  },
  fragments: { type: "fragment", lifecycle: ["open", "promoted", "dropped"] },
  briefs: { type: "brief", lifecycle: ["active", "spent"] },
  investigations: { type: "investigation", lifecycle: ["active", "concluded"] },
  cycles: {
    type: "cycle",
    lifecycle: ["planned", "active", "closed", "abandoned"],
    extra: ["scope", "after", "appetite", "started", "closed"],
  },
  reports: { type: "report", lifecycle: null },
};

/** Types a project folder can hold, and their vocabularies. */
export const PROJECT_SPEC: Record<string, { lifecycle: string[] | null }> = {
  proposal: {
    lifecycle: [
      "draft",
      "approved",
      "deferred",
      "implemented",
      "withdrawn",
      "superseded",
    ],
  },
  plan: { lifecycle: ["draft", "active", "completed", "abandoned"] },
  // Both of these were stateless in the first draft of SCHEMA.md, on the
  // reasoning that they follow their proposal or plan. The templates they
  // replace disagreed: each carried its own `**Status:**` line, because a
  // design question is open until it is answered and a scenario list is
  // written before it is run. Dropping those axes would have deleted
  // information the tree already tracked.
  "design-resolution": { lifecycle: ["draft", "resolved", "superseded"] },
  "test-plan": { lifecycle: ["draft", "ready", "active", "completed"] },
  handoff: { lifecycle: null },
  session: { lifecycle: null },
  artifact: { lifecycle: null },
};

/** Library types carry no lifecycle: a living page is current or it is not, and `status` says which. */
export const DURABLE_TYPES = [
  ...Object.values(DURABLE_TYPE),
  ...Object.values(ROOT_PAGE_TYPE),
];

/** OKF 0.2 §5.4. Required explicitly so a reader never has to know the default. */
const OKF_STATUS = ["draft", "stable", "deprecated"];

/**
 * Required on every workbench document. `tags` is deliberately NOT here: a
 * library page is found by tag, a workbench document by its date and its folder
 * README, and requiring four keywords on forty-four session notes buys a tag
 * cloud nobody reads.
 */
const REQUIRED = ["type", "title", "description", "status", "generated"];
const OPTIONAL = new Set(["tags", "related", "supersedes"]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TAG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------------------
// The workbench: presence and vocabulary
// ---------------------------------------------------------------------------------------

/** Every workbench file, paired with the `type` its position says it must carry. */
export function workbenchFiles(ctx: Ctx): Array<{
  path: string;
  rel: string;
  type: string;
}> {
  const skip = new Set([...ctx.config.lint.skip, "TEMPLATES"]);
  const excluded = excluder(ctx);
  const out: Array<{ path: string; rel: string; type: string }> = [];

  for (const folder of ctx.config.lint.workbench) {
    const dir = join(ctx.docsRoot, folder);
    if (!existsSync(dir)) continue;
    for (const path of walkMarkdown(dir, skip)) {
      const rel = relative(ctx.repoRoot, path);
      if (excluded(rel)) continue;
      out.push({
        path,
        rel,
        type:
          folder === "projects"
            ? projectType(path)
            : (SPEC[folder]?.type ?? ""),
      });
    }
  }
  return out;
}

function projectType(path: string): string {
  if (path.includes("/sessions/")) return "session";
  return PROJECT_FILE_TYPE[basename(path)] ?? "artifact";
}

function vocabularyFor(type: string): string[] | null {
  if (type in PROJECT_SPEC) return PROJECT_SPEC[type]?.lifecycle ?? null;
  const spec = Object.values(SPEC).find((s) => s.type === type);
  return spec ? spec.lifecycle : null;
}

export function thinTier(ctx: Ctx): string[] {
  const problems: string[] = [];
  let activeCycles: string[] = [];

  for (const { path, rel, type } of workbenchFiles(ctx)) {
    const raw = readFileSync(path, "utf8");
    const name = basename(path);

    // Links are checked on every file including the folder READMEs, which are
    // the contracts and cross-link each other constantly. Templates are the one
    // exception: their links are placeholders.
    if (!isTemplate(name)) {
      for (const bad of checkLinks(path, raw).problems) {
        problems.push(
          bad.kind === "MISSING FILE"
            ? `MISSING FILE   ${rel}: ${bad.target}`
            : `MISSING ANCHOR ${rel}: ${bad.target}  (#${bad.anchor} not a heading)`
        );
      }
    }

    if (CONTRACT_BASENAMES.has(name) || isTemplate(name)) continue;

    const m = /^---\n([\s\S]*?)\n---/.exec(raw);
    if (!m) {
      problems.push(
        `NO FRONTMATTER ${rel}  (see ${ctx.config.docsRoot}/SCHEMA.md)`
      );
      continue;
    }
    const fields = parseFrontmatter(m[1] as string);
    const lifecycle = vocabularyFor(type);
    const allowed = new Set([
      ...REQUIRED,
      ...OPTIONAL,
      ...(lifecycle ? ["lifecycle"] : []),
      ...(Object.values(SPEC).find((s) => s.type === type)?.extra ?? []),
    ]);

    for (const key of REQUIRED)
      if (!fields.get(key)) problems.push(`MISSING ${key}   ${rel}`);
    if (lifecycle && !fields.get("lifecycle"))
      problems.push(`MISSING lifecycle   ${rel}`);
    for (const key of fields.keys())
      if (!allowed.has(key)) problems.push(`UNKNOWN FIELD  ${rel}: "${key}"`);

    const declared = fields.get("type");
    if (declared && declared !== type)
      problems.push(
        `WRONG TYPE     ${rel}: "${declared}" (its position says "${type}")`
      );

    const status = fields.get("status");
    if (status && !OKF_STATUS.includes(status))
      problems.push(
        `BAD STATUS     ${rel}: "${status}"  (OKF 0.2: ${OKF_STATUS.join(" | ")})`
      );

    const value = fields.get("lifecycle");
    if (value) {
      if (lifecycle === null)
        problems.push(
          `LIFECYCLE      ${rel}: a ${type} is a frozen record and carries no lifecycle`
        );
      else if (!lifecycle.includes(value))
        problems.push(
          `BAD LIFECYCLE  ${rel}: "${value}"  (${type}: ${lifecycle.join(" | ")})`
        );
      else if (type === "cycle" && value === "active") activeCycles.push(rel);
    }

    problems.push(...generatedProblems(rel, fields.get("generated")));

    // Superseded by `generated.at` in OKF 0.2, and rejected rather than ignored
    // so a document cannot carry two disagreeing dates.
    for (const legacy of ["date", "timestamp", "updated"])
      if (fields.has(legacy))
        problems.push(
          `LEGACY FIELD   ${rel}: \`${legacy}\` is superseded by \`generated.at\` (OKF 0.2 §13.1)`
        );

    for (const tag of yamlList(fields.get("tags")))
      if (!TAG_RE.test(tag))
        problems.push(`BAD TAG        ${rel}: "${tag}"  (kebab-case)`);
  }

  // The rule a cycle exists for: two answers to "what are we doing" is the
  // state it prevents.
  if (activeCycles.length > 1)
    problems.push(
      `TWO ACTIVE CYCLES  ${activeCycles.join(", ")}  (at most one cycle is \`lifecycle: active\`)`
    );

  return problems;
}

function generatedProblems(
  rel: string,
  generated: string | undefined
): string[] {
  if (!generated) return [];
  const g = /^\{\s*by:\s*([^,}]+?)\s*,\s*at:\s*([^,}]+?)\s*\}$/.exec(generated);
  if (!g)
    return [
      `BAD GENERATED  ${rel}: ${generated}  (expected \`{ by: <actor>, at: YYYY-MM-DD }\`)`,
    ];
  if (!DATE_RE.test(g[2] as string))
    return [`BAD generated.at  ${rel}: "${g[2]}"  (expected YYYY-MM-DD)`];
  return [];
}

/**
 * Frontmatter that this repo's lenient parser accepts and a real YAML parser
 * would not.
 *
 * `description: finalize-branch stopped assuming: it verifies …` is a mapping
 * with two colons, and every YAML library reads it as a syntax error or as a
 * nested key. `parseFrontmatter` here splits on the FIRST colon and hands back
 * the rest as a string, so the document looks fine to the gate and breaks in
 * the next tool that reads it.
 *
 * Checked across both tiers, because the hazard is the punctuation rather than
 * the folder — and hand-written `description` values are exactly where a colon
 * turns up.
 */
export function frontmatterSyntaxProblems(ctx: Ctx): string[] {
  const excluded = excluder(ctx);
  const skip = new Set([...ctx.config.lint.skip, "TEMPLATES"]);
  const problems: string[] = [];

  for (const path of walkMarkdown(ctx.docsRoot, skip)) {
    const name = basename(path);
    if (CONTRACT_BASENAMES.has(name) || isTemplate(name)) continue;
    const rel = relative(ctx.repoRoot, path);
    if (excluded(rel)) continue;
    const m = /^---\n([\s\S]*?)\n---/.exec(readFileSync(path, "utf8"));
    if (!m) continue;

    for (const line of (m[1] as string).split("\n")) {
      const kv = /^([A-Za-z_][\w-]*):\s+(\S.*)$/.exec(line);
      if (!kv) continue;
      // A trailing ` # comment` is not part of the scalar — YAML strips it, so
      // this check has to as well. It did not, and the first document to carry
      // an explanatory comment on `status` was reported as broken frontmatter
      // when it was correct. `stripInlineComment` is the same helper the parser
      // uses, which is the point: two readings of one value is how the check
      // and the thing it checks come apart.
      const value = stripInlineComment((kv[2] as string).trim()).trim();
      if (!value) continue;
      // Quoted, a flow collection, or a mapping — all unambiguous.
      if (/^["'[{]/.test(value)) continue;
      if (/:\s/.test(value))
        problems.push(
          `BAD SCALAR     ${rel}: \`${kv[1]}\` contains ": " unquoted  (a real YAML parser reads this as a nested mapping)`
        );
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------------------
// The library: the ported core, plus the catalog hook check
// ---------------------------------------------------------------------------------------

/**
 * Every catalog entry in `index.md`: the page it points at, and the hook it
 * states.
 *
 * Lifted from agent-cli-conformance's `docs/wiki/lint.ts`. An entry is a list
 * item whose first token links a `.md` page; a Prettier-wrapped continuation
 * line belongs to the entry above it, and is folded BEFORE the link is matched
 * — a matcher reading one physical line at a time silently skips exactly the
 * entries whose text is longest.
 */
export function catalogEntries(
  indexBody: string
): Array<{ target: string; hook: string }> {
  const items: string[] = [];
  let inItem = false;
  for (const raw of indexBody.split("\n")) {
    if (/^-\s+\[/.test(raw)) {
      items.push(raw.trim());
      inItem = true;
    } else if (inItem && /^\s+\S/.test(raw))
      items[items.length - 1] += ` ${raw.trim()}`;
    else inItem = false;
  }

  const out: Array<{ target: string; hook: string }> = [];
  for (const item of items) {
    const m = /^-\s+\[[^\]]*\]\(([^)#]+\.md)\)(.*)$/.exec(item);
    if (m)
      out.push({
        target: (m[1] ?? "").replace(/^\.\//, ""),
        // Prettier escapes markdown-active characters in body text and not in
        // YAML, so a description containing `_archive/` reaches the catalog as
        // `\_archive/`. Comparing the two verbatim would fail on the escape
        // rather than on the drift the check exists to find.
        hook: (m[2] ?? "")
          .replace(/\s+/g, " ")
          .replace(/^\s*—\s*/, "")
          .replace(/\\([_*`[\]<>#~])/g, "$1")
          .trim(),
      });
  }
  return out;
}

/**
 * A catalog hook must be its target page's `description`, verbatim.
 *
 * SCHEMA.md says the description doubles as the hook. Nothing enforcing that is
 * how a catalog ends up describing a page that has since been rewritten — and
 * nobody re-reads the catalog, so it survives every review of the page itself.
 */
export function hookChecks(pages: LintPage[]): string[] {
  const index = pages.find((p) => p.rel === "index.md");
  if (!index) return [];
  const byRel = new Map(pages.map((p) => [p.rel, p]));
  const problems: string[] = [];
  for (const { target, hook } of catalogEntries(index.body)) {
    const page = byRel.get(target);
    if (!page) continue; // a link out of the library is the core lint's problem
    const description = (page.fields.get("description") ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!description) continue; // already reported as missing frontmatter
    if (hook !== description)
      problems.push(
        `STALE HOOK     index.md → ${target}:\n         hook: ${JSON.stringify(hook)}\n  description: ${JSON.stringify(description)}`
      );
  }
  return problems;
}

export function graphTier(ctx: Ctx, json = false): number {
  // `skipFiles` is handed a path relative to the docs root; `exclude` globs are
  // written relative to the repository root, which is the only root a person
  // editing `.project-docs.json` can see.
  const excluded = excluder(ctx);
  return runDocsLint({
    root: ctx.docsRoot,
    types: DURABLE_TYPES,
    nonPageDirs: [
      ...ctx.config.lint.workbench,
      ...ctx.config.lint.skip,
      "TEMPLATES",
    ],
    dateField: "generated",
    allowDateOnly: true,
    skipFiles: (rel) =>
      isTemplate(rel) || excluded(join(ctx.config.docsRoot, rel)),
    isContractPage: (rel) => CONTRACT_BASENAMES.has(basename(rel)),
    extraChecks: hookChecks,
    json,
  });
}

// ---------------------------------------------------------------------------------------
// The contract and the code must agree
// ---------------------------------------------------------------------------------------

/**
 * SCHEMA.md's "Lifecycle by type" table, parsed.
 *
 * The table is what a writer reads and `SPEC` is what the gate enforces. State
 * a contract twice and the copies drift; the one that drifts is always the
 * prose, because nothing checks it. So this reads the prose and compares.
 *
 * Cells are trimmed, so Prettier's column padding is irrelevant.
 */
export function schemaLifecycles(schema: string): Map<string, string[] | null> {
  const out = new Map<string, string[] | null>();
  const section = /\n## Lifecycle by type\n([\s\S]*?)\n## /.exec(schema);
  if (!section) return out;
  // Rows only after the alignment row, so the header — whose first cell is the
  // literal `type` — is not read as a type named "type".
  let inBody = false;
  for (const line of (section[1] as string).split("\n")) {
    if (/^\|\s*:?-+:?\s*\|/.test(line)) {
      inBody = true;
      continue;
    }
    if (!inBody) continue;
    const m = /^\|\s*`([a-z-]+)`\s*\|([^|]*)\|/.exec(line);
    if (!m) continue;
    const cell = (m[2] as string).trim();
    out.set(
      m[1] as string,
      cell === "—"
        ? null
        : cell
            .split("·")
            .map((v) => v.trim().replace(/^`|`$/g, ""))
            .filter(Boolean)
    );
  }
  return out;
}

export function schemaTableChecks(schema: string): string[] {
  const stated = schemaLifecycles(schema);
  if (stated.size === 0)
    return [
      'NO SCHEMA TABLE  SCHEMA.md: no parsable "## Lifecycle by type" section',
    ];

  const enforced = new Map<string, string[] | null>();
  for (const type of DURABLE_TYPES) enforced.set(type, null);
  for (const spec of Object.values(SPEC))
    enforced.set(spec.type, spec.lifecycle);
  for (const [type, spec] of Object.entries(PROJECT_SPEC))
    enforced.set(type, spec.lifecycle);

  const problems: string[] = [];
  const show = (v: string[] | null) => (v === null ? "—" : v.join(" · "));

  for (const [type, values] of enforced) {
    if (!stated.has(type)) {
      problems.push(
        `SCHEMA MISSING TYPE  SCHEMA.md: the lint enforces \`${type}\`, the table omits it`
      );
      continue;
    }
    const want = stated.get(type) ?? null;
    if (show(want) !== show(values))
      problems.push(
        `SCHEMA DISAGREES  \`${type}\`: SCHEMA.md says "${show(want)}", the lint enforces "${show(values)}"`
      );
  }
  for (const type of stated.keys())
    if (!enforced.has(type))
      problems.push(
        `SCHEMA EXTRA TYPE  SCHEMA.md documents \`${type}\`, which the lint knows nothing about`
      );

  return problems;
}

// ---------------------------------------------------------------------------------------
// --report: the backfill worklist
// ---------------------------------------------------------------------------------------

/**
 * What is missing, grouped by field and then by folder — and never a failure.
 *
 * A gate answers "may this land"; this answers "what is left", which is a
 * different question asked at a different moment. Merging them gives a list
 * ordered by directory walk, which is the least useful order for working
 * through it.
 */
export function reportLines(ctx: Ctx): string[] {
  const missing = new Map<string, string[]>();
  const note = (field: string, rel: string) =>
    missing.set(field, [...(missing.get(field) ?? []), rel]);

  for (const problem of [...thinTier(ctx), ...libraryFieldProblems(ctx)]) {
    // `MISSING FILE` and `MISSING ANCHOR` share the prefix and are not fields: a
    // broken link is a defect to fix, not a blank to fill, and listing it here
    // would put it in the one report that never fails.
    const m = /^(?:MISSING|NO) (?!FILE|ANCHOR)(\S+)\s+(\S+)/.exec(problem);
    if (m)
      note(
        m[1] === "FRONTMATTER" ? "frontmatter" : (m[1] as string),
        m[2] as string
      );
  }

  const lines: string[] = [];
  const total = [...missing.values()].reduce((n, v) => n + v.length, 0);
  lines.push(
    `${total} missing field(s) across ${new Set([...missing.values()].flat()).size} document(s)\n`
  );

  for (const [field, rels] of [...missing].sort(
    (a, b) => b[1].length - a[1].length
  )) {
    lines.push(`${field}  (${rels.length})`);
    const byFolder = new Map<string, number>();
    for (const rel of rels.sort()) {
      const folder = dirname(rel);
      byFolder.set(folder, (byFolder.get(folder) ?? 0) + 1);
    }
    for (const [folder, n] of [...byFolder].sort((a, b) => b[1] - a[1]))
      lines.push(`    ${String(n).padStart(4)}  ${folder}/`);
    lines.push("");
  }
  return lines;
}

/**
 * The library's missing fields, computed here rather than read back out of
 * `runDocsLint` — which prints and returns a count, by design, because a gate
 * has no reason to hand its findings to anyone.
 */
export function libraryFieldProblems(ctx: Ctx): string[] {
  const skip = new Set([
    ...ctx.config.lint.workbench,
    ...ctx.config.lint.skip,
    "TEMPLATES",
  ]);
  const excluded = excluder(ctx);
  const problems: string[] = [];
  const required = [
    "type",
    "title",
    "description",
    "tags",
    "status",
    "generated",
  ];

  for (const path of walkMarkdown(ctx.docsRoot, skip)) {
    const name = basename(path);
    if (CONTRACT_BASENAMES.has(name) || isTemplate(name)) continue;
    if (dirname(path) === ctx.docsRoot && !(name in ROOT_PAGE_TYPE)) continue;
    const rel = relative(ctx.repoRoot, path);
    if (excluded(rel)) continue;
    const raw = readFileSync(path, "utf8");
    const m = /^---\n([\s\S]*?)\n---/.exec(raw);
    if (!m) {
      problems.push(`NO FRONTMATTER ${rel}`);
      continue;
    }
    const fields = parseFrontmatter(m[1] as string);
    for (const key of required)
      if (!fields.get(key)) problems.push(`MISSING ${key}   ${rel}`);
  }
  return problems;
}

// ---------------------------------------------------------------------------------------

function main(): void {
  const args = new Set(process.argv.slice(2));
  const ctx = context(resolve(dirname(fileURLToPath(import.meta.url)), ".."));

  if (args.has("--json")) {
    graphTier(ctx, true);
    return;
  }

  if (args.has("--report")) {
    for (const line of reportLines(ctx)) console.log(line);
    return;
  }

  console.log(`── library (graph tier) ────────────────────────────────`);
  const libraryCount = graphTier(ctx);

  console.log(`\n── workbench (thin tier) ───────────────────────────────`);
  const rest = [
    ...thinTier(ctx),
    ...frontmatterSyntaxProblems(ctx),
    ...schemaTableChecks(readFileSync(join(ctx.docsRoot, "SCHEMA.md"), "utf8")),
    // Everything git tracks outside the docs root: README, AGENTS, and the
    // shipped plugin pages, where a link to a moved playbook is a broken
    // instruction in someone else's repository.
    ...linkProblemsFor(
      ctx.repoRoot,
      trackedMarkdown(ctx.repoRoot).filter(
        (p) => !isTemplate(p) && !excluder(ctx)(p)
      )
    ),
  ];
  for (const p of rest) console.log(p);
  console.log(
    rest.length ? `\n${rest.length} problem(s).` : "OK — no problems."
  );

  const total = libraryCount + rest.length;
  if (total === 0) {
    console.log(`\ndocs-lint: clean`);
    return;
  }

  if (ctx.config.lint.adopting) {
    console.log(
      `\ndocs-lint: ${total} problem(s), exiting 0 — \`lint.adopting\` is true in ` +
        `.project-docs.json.\n` +
        `           This project is mid-adoption. Work the list with \`npm run docs:report\`,\n` +
        `           then set \`lint.adopting\` to false; it is not a permanent setting.`
    );
    return;
  }

  console.log(`\ndocs-lint: ${total} problem(s)`);
  process.exit(1);
}

if (import.meta.main) main();
