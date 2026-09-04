#!/usr/bin/env bun
//
// Migration script: v2.6 → v2.7
//
// Adds OKF 0.2 frontmatter to every document under your docs root, deriving
// what the file already knows: `type` from where it sits, `title` from its H1,
// `lifecycle` from the bold `**Status:**` line it is about to lose, and
// `generated.at` from a bold date line or the file's first commit.
//
// It does NOT write `description`. That is one sentence a person has to mean,
// and a generated paraphrase of the first paragraph would be worse than the
// blank — you would never know which ones had been thought about. After this
// runs, `bun docs/lint.ts --report` is the worklist for the fields left.
//
// Usage:
//   bun path/to/migrate-v2.6-to-v2.7.ts [--dry-run] [--force]
//
// Flags:
//   --dry-run   Print what would change, write nothing. Safe to run repeatedly.
//   --force     Write even if the docs root has uncommitted changes.
//
// Run from your project root:
//   bun path/to/migrate-v2.6-to-v2.7.ts --dry-run
//   bun path/to/migrate-v2.6-to-v2.7.ts
//
// SELF-CONTAINED BY DESIGN. This runs inside a repository that has not adopted
// the layer yet, so it imports nothing from the project it is migrating and
// carries its own copy of the folder → type table. The copy is not free: a test
// in the scaffold repo (`scripts/docs-lint/migrate-v2.6-to-v2.7.test.ts`)
// asserts it equals the one `docs/lint.ts` enforces, so the two cannot drift
// without CI saying so.

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

// ─── The tables, copied from docs/lint.ts ─────────────────────────────────────

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
  "DEV_KICKOFF.md": "handoff",
};

/** Types that carry no `lifecycle`: frozen records and living pages alike. */
export const NO_LIFECYCLE = new Set([
  ...Object.values(DURABLE_TYPE),
  ...Object.values(ROOT_PAGE_TYPE),
  "report",
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
 * one shows up in `--report`.
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
const DEFAULT_SKIP = ["_archive", "superpowers"];
const DEFAULT_DOCS_ROOT = "docs";

// A project with no `docs_version` marker at all is pre-2.0; say so rather than
// guessing a number, and let Step 12 of the guide set it.
export const UNKNOWN_VERSION = "0.0.0";

// ─── Output ───────────────────────────────────────────────────────────────────

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

/** The `type` a document's position declares. `null` means "not ours to touch". */
export function typeOf(docsRelative: string): string | null {
  const name = basename(docsRelative);
  if (CONTRACT_BASENAMES.has(name)) return null;
  if (/template/i.test(name)) return null;

  const parts = docsRelative.split("/");
  if (parts.length === 1) return ROOT_PAGE_TYPE[name] ?? null;

  const top = parts[0] as string;
  if (top in DURABLE_TYPE) return DURABLE_TYPE[top] as string;
  if (top in WORKBENCH_TYPE) return WORKBENCH_TYPE[top] as string;
  if (top === "projects") {
    if (parts.includes("TEMPLATES")) return null;
    if (parts.includes("sessions")) return "session";
    return PROJECT_FILE_TYPE[name] ?? "artifact";
  }
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

/** `**Tags:** `#a` `#b`` → ["a", "b"]. Only what is already written down. */
export function tagsOf(body: string): string[] {
  const m = /\*\*Tags:?\*\*:?\s*([^*\n]+)/m.exec(body);
  if (!m) return [];
  return [...(m[1] as string).matchAll(/[`#]?([a-z0-9]+(?:-[a-z0-9]+)*)[`]?/g)]
    .map((x) => x[1] as string)
    .filter((t) => t.length > 1);
}

/** The bold metadata paragraph this script consumed, so it is not said twice. */
export function stripConsumedMetadata(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (
      !/^\*\*(Status|Created|Date Started|Date|Added|Last Updated|Last Reviewed|Author|Investigator|Tags):?\*\*/.test(
        line
      )
    ) {
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
  repoRoot: string
): Derived | null {
  const type = typeOf(docsRelative);
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

function yamlScalar(v: string): string {
  return /^[A-Za-z0-9][\w .,'()/-]*$/.test(v) && !v.includes(": ")
    ? v
    : `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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

function writeConfig(repoRoot: string, docsRoot: string): void {
  writeFileSync(
    join(repoRoot, ".project-docs.json"),
    `${JSON.stringify(
      {
        docsRoot,
        version: docsVersionOf(repoRoot, docsRoot),
        lint: {
          adopting: true,
          exclude: [],
          durable: Object.keys(DURABLE_TYPE),
          workbench: [...Object.keys(WORKBENCH_TYPE), "projects"],
          skip: DEFAULT_SKIP,
        },
      },
      null,
      2
    )}\n`
  );
}

function docsRootIsDirty(repoRoot: string, docsRoot: string): boolean {
  const out = Bun.spawnSync(["git", "status", "--porcelain", "--", docsRoot], {
    cwd: repoRoot,
  });
  if (!out.success) return false; // not a git repository; nothing to protect
  return new TextDecoder().decode(out.stdout).trim().length > 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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

  const excluded = config.exclude.map((g) => new Bun.Glob(g));
  const files = walk(docsRoot, new Set(DEFAULT_SKIP)).filter(
    (f) => !excluded.some((g) => g.match(relative(repoRoot, f)))
  );

  const changed: string[] = [];
  const skipped: string[] = [];
  const unmapped: Array<[string, string]> = [];
  const undated: string[] = [];

  step(dryRun ? "What would change" : "Writing frontmatter");

  for (const abs of files) {
    const rel = relative(repoRoot, abs);
    const docsRelative = relative(docsRoot, abs);
    const body = readFileSync(abs, "utf8");

    if (/^---\n[\s\S]*?\n---/.test(body)) {
      skipped.push(rel);
      continue;
    }
    const d = derive(body, abs, docsRelative, repoRoot);
    if (d === null) {
      skipped.push(rel);
      continue;
    }
    if (d.unmappedStatus) unmapped.push([rel, d.unmappedStatus]);
    if (!d.date) undated.push(rel);

    const next =
      frontmatterFor(d) + stripConsumedMetadata(body).replace(/^\n+/, "");
    if (!dryRun) writeFileSync(abs, next);
    changed.push(rel);
    console.log(
      `  ${dryRun ? `${C.blue}[DRY RUN]${C.reset} ` : `${C.green}✓${C.reset} `}${rel}` +
        `${C.dim}  type: ${d.type}${d.lifecycle ? `, lifecycle: ${d.lifecycle}` : ""}${C.reset}`
    );
  }

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
      `  2. \`bun docs/lint.ts --report\` — the worklist for what is left. This script\n` +
      `     never writes \`description\`; that is one sentence a person has to mean.\n` +
      `  3. When --report is empty, set \`lint.adopting\` to false in .project-docs.json.\n`
  );
  return 0;
}

if (import.meta.main)
  process.exit(main(process.argv.slice(2), resolve(process.cwd())));
