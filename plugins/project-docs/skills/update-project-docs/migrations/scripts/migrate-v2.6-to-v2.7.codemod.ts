// The frontmatter codemod: phase 5 of `migrate-v2.6-to-v2.7.ts`.
//
// Adds OKF 0.2 frontmatter to every document under the docs root, deriving
// what the file already knows: `type` from where it sits, `title` from its H1,
// `lifecycle` from the bold `**Status:**` line it is about to lose, and
// `generated.at` from a bold date line or the file's first commit.
//
// It does NOT write `description`. That is one sentence a person has to mean,
// and a generated paraphrase of the first paragraph would be worse than the
// blank — you would never know which ones had been thought about. After the
// migration runs, `bun scripts/pdocs/cli.ts report --format text` is the
// worklist for the fields left.
//
// NOT AN ENTRY POINT. The migration has one, `migrate-v2.6-to-v2.7.ts`, and it
// calls `runCodemod` as one phase among nine. `main` below is the codemod's own
// driver, kept so its unit tests can run it against a hand-built tree of three
// files without generating a scaffold; nothing else calls it.
//
// SELF-CONTAINED BY DESIGN. This runs inside a repository that has not adopted
// the layer yet, so it imports nothing from the project it is migrating and
// carries its own copy of the folder → type table. The copy is not free: the
// test beside this file (`migrate-v2.6-to-v2.7.test.ts`) asserts it equals the
// one the scaffold repo's lint enforces (`scripts/pdocs/lint/rules.ts`), so the
// two cannot drift without CI saying so.

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative } from "node:path";

// ─── The tables, copied from scripts/pdocs/lint/registry.ts ──────────────────

export const DURABLE_TYPE: Record<string, string> = {
  architecture: "architecture",
  specifications: "specification",
  "interaction-design": "interaction",
  playbooks: "playbook",
  "lessons-learned": "lesson",
  memories: "memory",
};

export const ROOT_PAGE_TYPE: Record<string, string> = {
  "PROJECT_MANIFESTO.md": "manifesto",
  "PROJECT-SUMMARY.md": "summary",
  "index.md": "index",
};

export const WORKBENCH_TYPE: Record<string, string> = {
  backlog: "backlog",
  fragments: "fragment",
  briefs: "brief",
  investigations: "investigation",
  cycles: "cycle",
  reports: "report",
};

export const PROJECT_FILE_TYPE: Record<string, string> = {
  "proposal.md": "proposal",
  "plan.md": "plan",
  "design-resolution.md": "design-resolution",
  "test-plan.md": "test-plan",
  "DEV_KICKOFF.md": "kickoff",
  "handoff.md": "handoff",
};

/** Types that carry no `lifecycle`: frozen records and living pages alike. */
export const NO_LIFECYCLE = new Set([
  ...Object.values(DURABLE_TYPE),
  ...Object.values(ROOT_PAGE_TYPE),
  "report",
  "kickoff",
  "handoff",
  "session",
  "artifact",
]);

export const LIFECYCLE: Record<string, string[]> = {
  backlog: ["open", "done", "promoted", "dropped"],
  fragment: ["open", "promoted", "dropped"],
  brief: ["active", "spent"],
  investigation: ["active", "concluded"],
  cycle: ["planned", "active", "closed", "abandoned"],
  proposal: [
    "draft",
    "approved",
    "deferred",
    "implemented",
    "withdrawn",
    "superseded",
  ],
  plan: ["draft", "active", "completed", "abandoned"],
  "design-resolution": ["draft", "resolved", "superseded"],
  "test-plan": ["draft", "ready", "active", "completed"],
};

/**
 * Bold `**Status:**` values, per type, because the same word means different
 * things in different folders: a `Completed` proposal is `implemented`, a
 * `Completed` plan is `completed`, and a `Completed` investigation is
 * `concluded`.
 *
 * A value absent from the map is NOT guessed. It is logged and left for a
 * person, because a wrong lifecycle is worse than a missing one — the missing
 * one shows up in `pdocs report`.
 */
export const STATUS_MAP: Record<string, Record<string, string>> = {
  proposal: {
    draft: "draft",
    "under review": "draft",
    proposed: "draft",
    approved: "approved",
    "approved (in flight)": "approved",
    "approved (shipped)": "implemented",
    accepted: "approved",
    completed: "implemented",
    complete: "implemented",
    implemented: "implemented",
    shipped: "implemented",
    deferred: "deferred",
    rejected: "withdrawn",
    withdrawn: "withdrawn",
    superseded: "superseded",
  },
  plan: {
    draft: "draft",
    active: "active",
    "in progress": "active",
    completed: "completed",
    complete: "completed",
    done: "completed",
    superseded: "abandoned",
    abandoned: "abandoned",
  },
  investigation: {
    active: "active",
    "in progress": "active",
    concluded: "concluded",
    complete: "concluded",
    completed: "concluded",
  },
  brief: {
    draft: "active",
    active: "active",
    spawned: "spent",
    parked: "spent",
    spent: "spent",
  },
  backlog: {
    open: "open",
    todo: "open",
    done: "done",
    completed: "done",
    dropped: "dropped",
  },
  fragment: { open: "open", promoted: "promoted", dropped: "dropped" },
  cycle: {
    planned: "planned",
    active: "active",
    closed: "closed",
    abandoned: "abandoned",
  },
  "design-resolution": {
    draft: "draft",
    "under review": "draft",
    resolved: "resolved",
    superseded: "superseded",
  },
  "test-plan": {
    draft: "draft",
    "scenarios complete": "ready",
    ready: "ready",
    "in execution": "active",
    active: "active",
    "results recorded": "completed",
    completed: "completed",
  },
};

/** The opening value, for a document whose status line said nothing usable. */
const OPENING: Record<string, string> = {
  backlog: "open",
  fragment: "open",
  brief: "active",
  investigation: "active",
  cycle: "planned",
  proposal: "draft",
  plan: "draft",
  "design-resolution": "draft",
  "test-plan": "draft",
};

const CONTRACT_BASENAMES = new Set([
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "SCHEMA.md",
]);
export const DEFAULT_SKIP = ["_archive", "superpowers"];
export const DEFAULT_DOCS_ROOT = "docs";

// A project with no `docs_version` marker at all is pre-2.0. The migration's
// preflight stops on it — `v1-to-v2` comes first — and this is the sentinel it
// tests for, so the number is never written into a project by the migration.
export const UNKNOWN_VERSION = "0.0.0";

// ─── Output (the standalone driver's; the migration prints its own) ──────────

const C = {
  reset: "\x1b[0m",
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  dim: "\x1b[2m",
};
const step = (m: string) => console.log(`\n${C.yellow}${m}${C.reset}`);
const ok = (m: string) => console.log(`  ${C.green}✓${C.reset} ${m}`);
const warn = (m: string) => console.log(`  ${C.yellow}⚠${C.reset} ${m}`);
const fail = (m: string) => console.log(`  ${C.red}✗${C.reset} ${m}`);

// ─── Derivation ───────────────────────────────────────────────────────────────

/**
 * A README, template or contract page: never a document to mark.
 *
 * A template is an EXACT SHAPE — the five the scaffold ships, copied from the
 * lint's `isTemplate` in `scripts/pdocs/lint/rules.ts` and held equal to it by
 * the test beside this file. This was `/template/i`, and a specification named
 * `templates.md` was the one document a migration left bare, then invisible to
 * the lint that shared the same substring rule.
 */
export function isContractPage(docsRelative: string): boolean {
  const name = basename(docsRelative);
  return (
    CONTRACT_BASENAMES.has(name) ||
    /^(?:YYYY-MM-DD-)?TEMPLATE(?:-[^/]+)?\.md$/.test(name) ||
    name.endsWith(".template.md") ||
    docsRelative.split("/").includes("TEMPLATES")
  );
}

/**
 * The `type` a document's position declares. `null` means "not ours to touch"
 * — a contract page, or a folder this codemod has no type for.
 *
 * `types` is the project's own `lint.types` — `{ runbooks: "runbook" }` — the
 * folders the preflight told the adopter to declare. A page there gets the
 * declared type and no `lifecycle`: this codemod has no vocabulary for a type
 * it did not ship.
 */
export function typeOf(
  docsRelative: string,
  types: Record<string, string> = {}
): string | null {
  const name = basename(docsRelative);
  if (isContractPage(docsRelative)) return null;

  const parts = docsRelative.split("/");
  if (parts.length === 1) return ROOT_PAGE_TYPE[name] ?? null;

  const top = parts[0] as string;
  if (top in DURABLE_TYPE) return DURABLE_TYPE[top] as string;
  if (top in WORKBENCH_TYPE) return WORKBENCH_TYPE[top] as string;
  if (top === "projects") {
    if (parts.includes("sessions")) return "session";
    return PROJECT_FILE_TYPE[name] ?? "artifact";
  }
  if (top in types) return types[top] as string;
  return null;
}

/**
 * The H1, minus a label the `type` already carries.
 *
 * "Investigation: Wiki tooling boundary" becomes "Wiki tooling boundary" —
 * repeating the type in the title makes every catalog line start with the same
 * word. Only the label matching this document's own type is stripped, so a
 * proposal titled "Investigation tooling" keeps its subject.
 */
export function titleOf(body: string, type: string): string | null {
  const m = /^#\s+(.+?)\s*$/m.exec(body);
  if (!m) return null;
  const label = new RegExp(`^${type.replace("-", "[- ]")}\\s*:\\s*`, "i");
  return (m[1] as string).replace(label, "").trim() || null;
}

/** `**Status:** Approved` → the lifecycle value, or null if nobody mapped it. */
export function lifecycleOf(
  body: string,
  type: string
): { value: string | null; raw: string | null } {
  if (NO_LIFECYCLE.has(type)) return { value: null, raw: null };
  // NOT anchored to line start: Prettier packs several bold keys onto one
  // line (`**Status:** X **Created:** Y`), and an anchored match finds only the
  // first of them.
  const m = /\*\*Status:?\*\*:?\s*([^*\n]+?)\s*(?:\*\*|$)/m.exec(body);
  // A trailing backslash is Markdown's hard line break, not part of the value.
  const raw = m ? (m[1] as string).replace(/\\+$/, "").trim() : null;
  if (!raw) return { value: OPENING[type] ?? null, raw: null };
  // A template's unfilled pick-list, not a status: "Draft | Active | Completed".
  if (raw.includes("|")) return { value: OPENING[type] ?? null, raw: null };
  const mapped = STATUS_MAP[type]?.[raw.toLowerCase()];
  return { value: mapped ?? null, raw };
}

/** A bold date line, or the file's first commit. Never today: this is when the content was produced. */
export function dateOf(
  body: string,
  abs: string,
  repoRoot: string
): string | null {
  const m =
    /\*\*(?:Created|Date Started|Date|Added|Last Updated):?\*\*:?\s*(\d{4}-\d{2}-\d{2})/m.exec(
      body
    );
  if (m) return m[1] as string;

  const name = basename(abs);
  const fromName = /^(\d{4}-\d{2}-\d{2})-/.exec(name);
  if (fromName) return fromName[1] as string;

  const out = Bun.spawnSync(
    [
      "git",
      "log",
      "--diff-filter=A",
      "--format=%as",
      "-1",
      "--",
      relative(repoRoot, abs),
    ],
    { cwd: repoRoot }
  );
  const date = new TextDecoder().decode(out.stdout).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

/** A line that OPENS a bold metadata paragraph: the keys this script reads. */
const METADATA_LINE =
  /^\*\*(Status|Created|Date Started|Date|Added|Last Updated|Last Reviewed|Author|Investigator|Tags):?\*\*/;

/**
 * The bold metadata paragraphs, joined — the exact text `stripConsumedMetadata`
 * removes. Anything derived from the body is derived from here, so a value the
 * codemod writes into the frontmatter is one it is also taking out of the prose.
 */
function metadataParagraphs(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!METADATA_LINE.test(lines[i] as string)) continue;
    while (i < lines.length && (lines[i] as string).trim() !== "")
      out.push(lines[i++] as string);
  }
  return out.join("\n");
}

/**
 * `**Tags:** `#a` `#b`` → ["a", "b"]. Only what is already written down as a
 * tag — which means two things this used to get wrong.
 *
 * The label is read only inside a bold metadata paragraph, not anywhere in the
 * body: a UI spec's bullet `- **Tags**: Clickable tag chips: Clicking adds…`
 * is prose about tags, and matching it produced `[clickable, tag, chips,
 * licking, adds, …]` — values that pass the lint, so nothing downstream ever
 * said so. And a token is a backticked or `#`-prefixed word, never a bare run
 * of letters; the old lowercase-only class is what turned `Clicking` into
 * `licking`. Within the paragraph the value runs to the next bold key across
 * wrapped lines, which the packed Prettier form (`**Date:** X **Tags:** …`)
 * needs.
 */
export function tagsOf(body: string): string[] {
  const m = /\*\*Tags:?\*\*:?\s*([^*]*)/.exec(metadataParagraphs(body));
  if (!m) return [];
  const TOKEN = "[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*";
  const tokens = [
    ...(m[1] as string).matchAll(
      new RegExp(`\`#?(${TOKEN})\`|(?:^|\\s)#(${TOKEN})`, "g")
    ),
  ].map((x) => ((x[1] ?? x[2]) as string).toLowerCase());
  return [...new Set(tokens)].filter((t) => t.length > 1);
}

/** The bold metadata paragraph this script consumed, so it is not said twice. */
export function stripConsumedMetadata(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (!METADATA_LINE.test(line)) {
      out.push(line);
      continue;
    }
    // A bold metadata paragraph runs to the next blank line; Prettier wraps it.
    while (i < lines.length && (lines[i] as string).trim() !== "") i++;
    // And it is usually followed by a `---` rule that separated it from the body.
    if (
      out.length > 0 &&
      lines[i + 1] !== undefined &&
      (lines[i + 1] as string).trim() === "---" &&
      (lines[i + 2] ?? "").trim() === ""
    )
      i += 2;
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

export interface Derived {
  type: string;
  title: string | null;
  lifecycle: string | null;
  unmappedStatus: string | null;
  date: string | null;
  tags: string[];
}

export function derive(
  body: string,
  abs: string,
  docsRelative: string,
  repoRoot: string,
  types: Record<string, string> = {}
): Derived | null {
  const type = typeOf(docsRelative, types);
  if (type === null) return null;
  const { value, raw } = lifecycleOf(body, type);
  return {
    type,
    title: titleOf(body, type),
    lifecycle: value,
    unmappedStatus: value === null && raw !== null ? raw : null,
    date: dateOf(body, abs, repoRoot),
    tags: tagsOf(body),
  };
}

/** The YAML block. `description` is deliberately absent; see the header. */
export function frontmatterFor(d: Derived): string {
  const lines = [`type: ${d.type}`];
  if (d.title) lines.push(`title: ${yamlScalar(d.title)}`);
  if (d.tags.length) lines.push(`tags: [${d.tags.join(", ")}]`);
  lines.push("status: stable");
  if (d.lifecycle) lines.push(`lifecycle: ${d.lifecycle}`);
  // `unknown` is a legal OKF actor and the honest encoding for a document whose
  // producer was never recorded. `git blame` names whoever committed the file,
  // which is a different fact.
  lines.push(`generated: { by: unknown, at: ${d.date ?? "1970-01-01"} }`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

/**
 * A YAML scalar the way Prettier would write it, so a project that formats
 * `docs/**` has nothing to reformat on a file the migration just touched.
 * Bare when it can be; otherwise SINGLE quotes when the value holds a double
 * quote and no single one — Prettier's choice, and it needs no escapes —
 * and double quotes with escapes for everything else.
 */
function yamlScalar(v: string): string {
  if (/^[A-Za-z0-9][\w .,'()/-]*$/.test(v) && !v.includes(": ")) return v;
  if (v.includes('"') && !v.includes("'")) return `'${v}'`;
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// ─── Walking ──────────────────────────────────────────────────────────────────

function walk(dir: string, skip: Set<string>, out: string[] = []): string[] {
  for (const entry of readdirSync(dir).sort()) {
    if (skip.has(entry)) continue;
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, skip, out);
    else if (entry.endsWith(".md")) out.push(abs);
  }
  return out;
}

interface Config {
  docsRoot: string;
  exclude: string[];
}

function readConfig(repoRoot: string): { config: Config; existed: boolean } {
  const path = join(repoRoot, ".project-docs.json");
  if (!existsSync(path))
    return {
      config: { docsRoot: DEFAULT_DOCS_ROOT, exclude: [] },
      existed: false,
    };
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const lint = (raw.lint ?? {}) as Record<string, unknown>;
  return {
    config: {
      docsRoot:
        typeof raw.docsRoot === "string" ? raw.docsRoot : DEFAULT_DOCS_ROOT,
      exclude: Array.isArray(lint.exclude) ? (lint.exclude as string[]) : [],
    },
    existed: true,
  };
}

// The version marker carries the scaffold release the project last copied from,
// and `docs/README.md` already holds it. Inventing a second number here — "2.7.0",
// say, from this migration's own name — would put two disagreeing versions in one
// project, and the migration names stopped tracking the release numbers long ago.
export function docsVersionOf(repoRoot: string, docsRoot: string): string {
  const readme = join(repoRoot, docsRoot, "README.md");
  if (!existsSync(readme)) return UNKNOWN_VERSION;
  const m = /^docs_version:\s*["']?([^"'\s#]+)/m.exec(
    readFileSync(readme, "utf8")
  );
  return m ? m[1] : UNKNOWN_VERSION;
}

/**
 * The `.project-docs.json` a v2.6 project gets: `lint.adopting: true` so its
 * first `pdocs check` reports rather than blocks, the tier arrays from the same
 * tables the codemod types documents by, and the version carried forward from
 * `docs/README.md` so the two markers never disagree mid-migration.
 */
export function defaultConfig(
  repoRoot: string,
  docsRoot: string
): Record<string, unknown> {
  return {
    docsRoot,
    version: docsVersionOf(repoRoot, docsRoot),
    lint: {
      adopting: true,
      exclude: [],
      durable: Object.keys(DURABLE_TYPE),
      workbench: [...Object.keys(WORKBENCH_TYPE), "projects"],
      skip: DEFAULT_SKIP,
    },
  };
}

function writeConfig(repoRoot: string, docsRoot: string): void {
  writeFileSync(
    join(repoRoot, ".project-docs.json"),
    `${JSON.stringify(defaultConfig(repoRoot, docsRoot), null, 2)}\n`
  );
}

function docsRootIsDirty(repoRoot: string, docsRoot: string): boolean {
  const out = Bun.spawnSync(["git", "status", "--porcelain", "--", docsRoot], {
    cwd: repoRoot,
  });
  if (!out.success) return false; // not a git repository; nothing to protect
  return new TextDecoder().decode(out.stdout).trim().length > 0;
}

// ─── The codemod, as a phase ──────────────────────────────────────────────────

/**
 * Keys a slide renderer reads — Slidev and Marp between them. Copied from
 * `scripts/pdocs/lint/rules.ts` and held equal to it by the test beside this
 * file.
 */
export const RENDERER_KEYS = [
  "marp",
  "theme",
  "paginate",
  "layout",
  "colorSchema",
  "highlighter",
];

/** The top-level keys of a frontmatter block. */
function keysOf(block: string): Set<string> {
  const keys = new Set<string>();
  for (const line of block.split("\n")) {
    const k = /^([A-Za-z_][\w-]*):/.exec(line)?.[1];
    if (k) keys.add(k);
  }
  return keys;
}

/** A frontmatter block that is plainly a renderer's, not this schema's. */
function looksLikeSlideDeck(block: string): boolean {
  const keys = keysOf(block);
  return !keys.has("type") && RENDERER_KEYS.some((k) => keys.has(k));
}

/**
 * Why an EXISTING block is not this contract's — or `null` when it is. Only
 * `type` is judged: a foreign block with the right `type` and a stray `name:`
 * is the lint's `UNKNOWN FIELD`, a backfill and not a conversion.
 */
function conversionNeeded(block: string, expected: string): string | null {
  const raw = /^type:\s*([^\s#]+)/m.exec(block)?.[1] ?? null;
  if (raw === null) return "no type";
  // `type: "memory"` is `memory` to every YAML reader, the lint's included.
  const declared = /^(["']).*\1$/.test(raw) ? raw.slice(1, -1) : raw;
  if (declared !== expected)
    return `type: ${declared} — its position says ${expected}`;
  return null;
}

export interface CodemodResult {
  /** Repo-relative paths that gained (or, on a dry run, would gain) a block. */
  changed: string[];
  /** Already marked, or a README, template or contract page. */
  skipped: string[];
  /**
   * `[path, reason]` — skipped because a block was there, but the block is not
   * this contract's: no `type`, or a `type` the file's position does not
   * allow. A frontmatter block from some other system looks exactly like
   * "already migrated" to the skip, and reached `pdocs report` as ordinary
   * missing-field rows — three per file, beside documents that merely want a
   * backfill. These need converting, not filling in, and the difference has
   * to be visible where the skip happens. Naming them is the whole of what
   * this does; the file itself is left alone.
   */
  needsConversion: Array<[string, string]>;
  /**
   * Skipped because a block was there, and the block has no `type` but carries
   * a slide renderer's keys — a Slidev or Marp deck, a program that happens to
   * be written in Markdown. Not conversion work: the answer is `lint.exclude`,
   * per SCHEMA.md § "Files that are not documentation", and it has to be
   * offered here, where the file would otherwise read as "needs a type".
   */
  slideDecks: string[];
  /** `[path, raw status]` — a bold status nobody mapped; `lifecycle` left blank. */
  unmapped: Array<[string, string]>;
  /** No date line, no dated filename, no first commit — `1970-01-01`. */
  undated: string[];
  /**
   * Bare documents in a folder this codemod has no type for — neither shipped
   * nor declared in `lint.types`. Reported under their own count, never as
   * "skipped": the lint will read them, and they are not marked.
   */
  untyped: string[];
}

/**
 * Walk the docs root and prepend a derived frontmatter block to every document
 * that has none. Idempotent: a file that already opens with `---` is skipped,
 * so a second run changes nothing.
 *
 * `types` and `skip` are the project's own `lint.types` and `lint.skip`, so
 * the codemod agrees with the lint the migration installs — passed in, so
 * this file still imports nothing from the tree it migrates.
 *
 * `onFile` is called once per document that gains a block, before it is
 * written, so a caller can print the line in its own voice.
 */
export function runCodemod(opts: {
  repoRoot: string;
  docsRootName: string;
  exclude: string[];
  dryRun: boolean;
  types?: Record<string, string>;
  skip?: string[];
  onFile?: (rel: string, d: Derived) => void;
}): CodemodResult {
  const docsRoot = join(opts.repoRoot, opts.docsRootName);
  const excluded = opts.exclude.map((g) => new Bun.Glob(g));
  const types = opts.types ?? {};
  const files = walk(docsRoot, new Set(opts.skip ?? DEFAULT_SKIP)).filter(
    (f) => !excluded.some((g) => g.match(relative(opts.repoRoot, f)))
  );

  const result: CodemodResult = {
    changed: [],
    skipped: [],
    needsConversion: [],
    slideDecks: [],
    unmapped: [],
    undated: [],
    untyped: [],
  };

  for (const abs of files) {
    const rel = relative(opts.repoRoot, abs);
    const docsRelative = relative(docsRoot, abs);
    const body = readFileSync(abs, "utf8");

    const block = /^---\n([\s\S]*?)\n---/.exec(body);
    if (block) {
      result.skipped.push(rel);
      // Judged only in a document position: a template's block is a form, and
      // a contract page's position declares no type.
      const expected = typeOf(docsRelative, types);
      if (expected !== null) {
        if (looksLikeSlideDeck(block[1] as string)) result.slideDecks.push(rel);
        else {
          const why = conversionNeeded(block[1] as string, expected);
          if (why) result.needsConversion.push([rel, why]);
        }
      }
      continue;
    }
    const d = derive(body, abs, docsRelative, opts.repoRoot, types);
    if (d === null) {
      (isContractPage(docsRelative) ? result.skipped : result.untyped).push(rel);
      continue;
    }
    if (d.unmappedStatus) result.unmapped.push([rel, d.unmappedStatus]);
    if (!d.date) result.undated.push(rel);

    opts.onFile?.(rel, d);
    const next =
      frontmatterFor(d) + stripConsumedMetadata(body).replace(/^\n+/, "");
    if (!opts.dryRun) writeFileSync(abs, next);
    result.changed.push(rel);
  }
  return result;
}

// ─── The standalone driver, for the unit tests ────────────────────────────────

export function main(argv: string[], repoRoot: string): number {
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");

  const { config, existed } = readConfig(repoRoot);
  const docsRoot = join(repoRoot, config.docsRoot);

  if (!existsSync(docsRoot)) {
    fail(
      `No ${config.docsRoot}/ directory here. Run this from your project root.`
    );
    return 1;
  }

  step(`Reading ${config.docsRoot}/`);
  if (!existed) {
    ok(
      `.project-docs.json is absent; assuming docsRoot "${DEFAULT_DOCS_ROOT}"`
    );
  } else {
    ok(`.project-docs.json says docsRoot is "${config.docsRoot}"`);
  }

  // A codemod that rewrites a hundred files should leave a reviewable diff, and
  // it cannot if the tree already had changes in it.
  if (!dryRun && !force && docsRootIsDirty(repoRoot, config.docsRoot)) {
    fail(`${config.docsRoot}/ has uncommitted changes.`);
    console.log(
      `\n  Commit or stash them first, so this migration's diff is reviewable on its own.\n` +
        `  Re-run with --force to write anyway, or --dry-run to see what would change.\n`
    );
    return 1;
  }

  step(dryRun ? "What would change" : "Writing frontmatter");
  const { changed, skipped, needsConversion, slideDecks, unmapped, undated, untyped } = runCodemod({
    repoRoot,
    docsRootName: config.docsRoot,
    exclude: config.exclude,
    dryRun,
    onFile: (rel, d) =>
      console.log(
        `  ${dryRun ? `${C.blue}[DRY RUN]${C.reset} ` : `${C.green}✓${C.reset} `}${rel}` +
          `${C.dim}  type: ${d.type}${d.lifecycle ? `, lifecycle: ${d.lifecycle}` : ""}${C.reset}`
      ),
  });

  if (!existed) {
    step(".project-docs.json");
    if (dryRun)
      console.log(
        `  ${C.blue}[DRY RUN]${C.reset} would create it with lint.adopting: true`
      );
    else {
      writeConfig(repoRoot, config.docsRoot);
      ok(
        "created, with lint.adopting: true so the gate reports rather than blocks"
      );
    }
  }

  step("Summary");
  ok(
    `${changed.length} document(s) ${dryRun ? "would gain" : "gained"} frontmatter`
  );
  ok(
    `${skipped.length} skipped (already marked, or a README, template or contract page)`
  );
  if (needsConversion.length) {
    warn(
      `${needsConversion.length} skipped file(s) need conversion — an existing block with no \`type\`, or a \`type\` this folder does not allow. Not a backfill: rewrite the block by hand, then re-run:`
    );
    for (const [rel, why] of needsConversion)
      console.log(`      ${rel}  ${C.dim}(${why})${C.reset}`);
  }
  if (slideDecks.length) {
    warn(
      `${slideDecks.length} file(s) look like slide decks rather than documents — consider \`lint.exclude\`:`
    );
    for (const rel of slideDecks) console.log(`      ${rel}`);
    console.log(
      `    See ${config.docsRoot}/SCHEMA.md § "Files that are not documentation".`
    );
  }
  if (untyped.length) {
    warn(`${untyped.length} document(s) not typed by this codemod — in a folder it has no type for:`);
    for (const rel of untyped) console.log(`      ${rel}`);
  }

  if (unmapped.length) {
    warn(
      `${unmapped.length} document(s) had a **Status:** nobody could map — left blank:`
    );
    for (const [rel, raw] of unmapped)
      console.log(`      ${rel}  ${C.dim}("${raw}")${C.reset}`);
  }
  if (undated.length) {
    warn(
      `${undated.length} document(s) had no date and no first commit — set to 1970-01-01:`
    );
    for (const rel of undated) console.log(`      ${rel}`);
  }

  console.log(
    `\n${C.yellow}Next${C.reset}\n` +
      `  1. ${dryRun ? "Re-run without --dry-run." : "Review the diff, then run your formatter."}\n` +
      `  2. \`bun scripts/pdocs/cli.ts report --format text\` — the worklist for\n` +
      `     what is left. This script never writes \`description\`; that is one\n` +
      `     sentence a person has to mean.\n` +
      `  3. When the report is empty, set \`lint.adopting\` to false in .project-docs.json.\n`
  );
  return 0;
}
