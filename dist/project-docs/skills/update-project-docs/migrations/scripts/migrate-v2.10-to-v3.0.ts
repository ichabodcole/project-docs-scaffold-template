#!/usr/bin/env bun
/**
 * v2.10 → v3.0 (scaffold 9.1.0, the 9.0.0 layout). The migration, not a description of one.
 *
 * WHY THIS IS A SCRIPT. It generates a scaffold and reads a version from it,
 * every later phase consumes the move map an earlier one built, several checks
 * must be able to stop the run, and an adopter may arrive with part of it done.
 *
 * WHAT IT DOES
 *   1  preflight  — a v2.10 tree, the tools, git, the baseline `pdocs check`,
 *                   and every JUDGMENT BLOCKER (briefs, reports without one
 *                   owner, edited retired templates, files it cannot place)
 *   2  scaffold   — the template at SCAFFOLD_TAG (9.1.0), its own tag (D16), verified
 *   3  plan       — the move map, every frontmatter rewrite (each block as the
 *                   project's own Prettier prints it), every config key;
 *                   `--dry-run` prints it and stops here
 *   4  refresh    — the owned files; the retired owned READMEs removed
 *   5  move       — every document to its new place, frontmatter rewritten
 *                   (first, each moved path's new spelling added to the ignore
 *                   files beside the old; a document in lint.exclude moves
 *                   but is never edited)
 *   6  links      — every link that pointed at a moved document, respelled
 *   7  config     — `lint` arrays patched in place; every other byte kept.
 *                   First, the ignore files at the root (.prettierignore,
 *                   .eslintignore, .gitignore, biome.json[c]): phase 5 added
 *                   each moved path's new spelling beside the old before the
 *                   first move; here the old ones are dropped. A retired path in
 *                   a config that is code (eslint.config.*) is named, not rewritten
 *   8  seeds      — templates moved with their records (renameRecord),
 *                   retired ones removed only while untouched, the rest
 *                   reconciled by verdict; STYLE.md installed
 *   9  format     — Prettier over what this run CREATED, then the record
 *  10  verify     — no legacy folder remains, and `pdocs check` is clean
 *  11  version    — both markers
 *  12  cleanup    — remove the generated scaffold
 *
 * NOTHING IS DELETED (D11). A document is moved, never removed; a retired
 * library folder that is present (`memories/`, `lessons-learned/`) is kept and
 * declared in `lint.types`. What this run removes is the scaffold's own: the
 * retired owned READMEs, a retired template only while its bytes still match
 * what the scaffold recorded, and the `.gitkeep` placeholders of emptied
 * legacy `_archive/` folders. Every move is printed.
 *
 * Usage:
 *   bun migrate-v2.10-to-v3.0.ts [--root <path>] [--dry-run]
 *                                [--scaffold-dir <path>] [--skip-format] [--force]
 *
 *   --root <path>          the project to migrate. Default: the current directory.
 *   --dry-run              generate the scaffold, print the plan, change nothing.
 *   --scaffold-dir <path>  use an already-generated scaffold (a project root, not
 *                          its docs/). Skips the network. `--scaffold` is an alias.
 *   --skip-format          do not run Prettier over the files this run creates, nor
 *                          over the frontmatter it writes: each block is then in the
 *                          shape Prettier's defaults (proseWrap: preserve) give it —
 *                          a blank line after it, Prettier's quotes, values unwrapped.
 *                          Without it, the frontmatter goes through the project's own
 *                          Prettier, never a downloaded one (see prettierFrontmatter).
 *   --force                write over uncommitted changes in the paths this run
 *                          touches — on a re-run after a stop, over edits made
 *                          since the stop. Without it the preflight stops on them.
 *
 *   bun migrate-v2.10-to-v3.0.ts [--root <path>] --respell <path>... [--write]
 *
 *   --respell <path>...    after the run: list every retired docs path (docs/projects/…)
 *                          spelled in the files named — a folder means every file
 *                          under it — and what the move record respells it to.
 *                          Writes nothing.
 *   --write                with --respell: write those files, and only those.
 *
 * Exit codes: 0 success · 1 the migration could not complete · 2 bad invocation.
 */
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  posix,
  relative,
  resolve,
  sep,
} from "node:path";

const TEMPLATE_REPO = "gh:ichabodcole/project-docs-scaffold-template";
/**
 * The scaffold release this migration installs (plan D16): 9.1.0, which has the
 * 9.0.0 layout the script was written against and the cycle template and
 * features README that shipped after it. As the newest migration it is re-pinned
 * at every scaffold release (the writing-migrations playbook), so re-running it
 * refreshes a tree to the release being adopted.
 */
export const SCAFFOLD_TAG = "project-docs-scaffold-template-v9.1.0";
/** SCAFFOLD_TAG's release number, for the messages that name it. */
export const SCAFFOLD_RELEASE = SCAFFOLD_TAG.slice(SCAFFOLD_TAG.lastIndexOf("-v") + 2);
const MANIFEST_NAME = ".pdocs-seed.json";
/**
 * The run's own record, kept until a run completes, inside the repository's git
 * directory (`.git/`, so no `git add -A` commits it; at the project root, dotted,
 * when there is no git): every
 * path this migration wrote (and the hash it left there), and — from the start of
 * phase 5 to the end of phase 7 — the plan itself. A re-run reads it to tell its
 * own uncommitted output from an edit of the adopter's, and to finish moves an
 * interrupted run had begun from the plan that began them.
 */
export const STATE_NAME = "pdocs-migrate-v2.10-to-v3.0.json";
/**
 * The run's MOVE RECORD, beside the record above and KEPT after the run
 * completes: every docs-relative `[from, to]` the run's links follow. Phase 10
 * reads it to suggest the fix for a broken link — on a re-run too, when the plan
 * has nothing left to move — and `--respell` reads it to respell retired paths
 * outside the docs root. Written when a run first moves anything.
 */
export const MOVES_NAME = "pdocs-migrate-v2.10-to-v3.0.moves.json";
const PHASES = 12;
/** `generated.by` on the documents this run creates. */
export const ACTOR = "migrate-v2.10-to-v3.0";

/** The workbench folders 9.0.0 retires. None may remain after the run. */
export const LEGACY_FOLDERS = ["backlog", "briefs", "fragments", "investigations", "reports", "projects"];
/** Retired library folders, kept when present (D11), and the type their pages carry. */
export const KEPT_LIBRARY: Record<string, string> = { memories: "memory", "lessons-learned": "lesson" };
/** Templates the scaffold moved; each carries its seed record with it. */
export const TEMPLATE_RENAMES: Record<string, string> = {
  "projects/TEMPLATES/DESIGN-RESOLUTION.template.md": "TEMPLATES/DESIGN-RESOLUTION.template.md",
  "projects/TEMPLATES/HANDOFF.template.md": "TEMPLATES/HANDOFF.template.md",
  "projects/TEMPLATES/PLAN.template.md": "TEMPLATES/PLAN.template.md",
  "projects/TEMPLATES/PROPOSAL.template.md": "TEMPLATES/FEATURE.template.md",
  "projects/TEMPLATES/TEST-PLAN.template.md": "TEMPLATES/TEST-PLAN.template.md",
  "projects/TEMPLATES/YYYY-MM-DD-SESSION.template.md": "TEMPLATES/YYYY-MM-DD-SESSION.template.md",
  "reports/YYYY-MM-DD-TEMPLATE-report.md": "TEMPLATES/REPORT.template.md",
};
/** Templates for retired types, with no successor file; the value is where a link to one now points. */
export const RETIRED_TEMPLATES: Record<string, string> = {
  "backlog/TEMPLATE.md": "TEMPLATES/ITEM.template.md",
  "fragments/TEMPLATE.md": "TEMPLATES/ITEM.template.md",
  "briefs/TEMPLATES/BRIEF.template.md": "TEMPLATES/ITEM.template.md",
  "investigations/YYYY-MM-DD-TEMPLATE-investigation.md": "TEMPLATES/WRITE-UP.template.md",
};
/** The retired folders' owned READMEs, removed; a link to one now points at the successor's. */
export const RETIRED_READMES: Record<string, string> = {
  "backlog/README.md": "items/README.md",
  "briefs/README.md": "items/README.md",
  "fragments/README.md": "items/README.md",
  "investigations/README.md": "items/README.md",
  "reports/README.md": "items/README.md",
  "projects/README.md": "features/README.md",
};
/** Every template the 9.0.0 scaffold keeps in `TEMPLATES/`: a name an adopter's own template may not take. */
const SCAFFOLD_TEMPLATES = new Set([...Object.values(TEMPLATE_RENAMES), ...Object.values(RETIRED_TEMPLATES)]);
/** Where a link to a retired FOLDER itself now points. */
export const FOLDER_SUCCESSOR: Record<string, string> = {
  backlog: "items",
  briefs: "items",
  fragments: "items",
  investigations: "items",
  reports: "items",
  projects: "features",
};
/** Owned files at the docs root the refresh replaces. README.md keeps its `docs_version`. */
const OWNED_ROOT = ["SCHEMA.md", "README.md", "AGENTS.md", "CLAUDE.md"];
/** The 9.0.0 category folders whose README.md the refresh replaces (owned). */
const OWNED_CATEGORIES = ["architecture", "specifications", "interaction-design", "playbooks", "cycles", "features", "items"];
/** Every owned file the refresh replaces or removes, docs-relative: the rows of `OWNED_RELEASES`. */
export const OWNED_PATHS = [...OWNED_ROOT, ...OWNED_CATEGORIES.map((c) => `${c}/README.md`), ...Object.keys(RETIRED_READMES)];
/**
 * A Markdown text reduced to what a formatter cannot change: the `docs_version`
 * value, emphasis and escape marks, table padding and all wrapping are dropped,
 * and what is left is hashed (16 hex digits). Two texts with the same key say
 * the same thing; an added sentence changes it.
 */
export function proseKey(text: string): string {
  const plain = text
    .replace(/^docs_version:.*$/m, "docs_version")
    .replace(/[*_\\]/g, "")
    .replace(/:?-{3,}:?/g, "---")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(plain).digest("hex").slice(0, 16);
}

/**
 * Every owned Markdown file the refresh replaces or removes (`OWNED_PATHS`), as
 * each scaffold release up to and including the pinned one (`SCAFFOLD_TAG`)
 * shipped it, by `proseKey`. A file whose key is in none of its releases, and
 * is not the fetched scaffold's, holds edits of the adopter's — Spellbook kept
 * its multi-sprint convention in its owned `projects/README.md` — and the run
 * names it with the command that recovers it. A tree an earlier run of this
 * migration put on 9.0.0 holds 9.0.0's copies: they are releases too.
 *
 * Derived from the release tags and pinned to them by the test beside this
 * file: re-pinning `SCAFFOLD_TAG` fails that test until this is regenerated.
 */
export const OWNED_RELEASES: Record<string, string[]> = {
  "SCHEMA.md": ["6a7f72fdb958b0b7", "6f56fbcf5ec845de", "901d5b55b7d48422", "bcf64b0b7e5f20ea", "ed4c7ff0666db6f1"],
  "README.md": ["1be5adeeeb3eda24", "2dfa4eca342cb5c5", "3fd655241d87344f", "7b9204982f2451be", "8b94b8d4f8c3e2de", "f2bf59dce2c8c345", "fe573ebb6c6ea6b7", "feac07aacbdf0615"],
  "AGENTS.md": ["28870996acb9be93", "3510f2c1d02a4463", "4e85093fe9f42c12", "833f44053c166134", "dbf3ee4501c58069", "fc5ac2d9fdf95b05"],
  "CLAUDE.md": ["2292934d5083c5d4"],
  "architecture/README.md": ["570a3828bbc218f8", "d84ef4267ad8ac4f"],
  "specifications/README.md": ["06db0a77fae2f7b8", "b2ffc15d87181a74"],
  "interaction-design/README.md": ["46040d4e8fc8d55b", "4efdc4a3ca453eb7"],
  "playbooks/README.md": ["21d3c4d5ed2e0f53", "60a25bd0073e27a9", "e89e2ebd733d3e25"],
  "cycles/README.md": ["7a4c39296dc16c50", "c3c1cbf60ce2e388"],
  "features/README.md": ["a1f78ad4d0d8a864", "b6fe554241e35cac"],
  "items/README.md": ["1c636f9c85bc3a2f"],
  "backlog/README.md": ["90ca6ce56a72d3df", "aca2f560332d6c77"],
  "briefs/README.md": ["20bc4cbaf98abaf7"],
  "fragments/README.md": ["47be902ce910b87d"],
  "investigations/README.md": ["5ae5c3cff8b7e2f7", "8fd3268fdc29d8bc"],
  "reports/README.md": ["259a826dd9bd1f50", "667ded81fb9d1cca", "bcd888e65d4e9bd8", "c4feb2ad7c9e6058"],
  "projects/README.md": ["01169453c766d4f8", "074a5920ef3e666e", "09c1f9b0e352ca32", "13069018bd4d0dc2", "453831a93deb7620", "d23f606ea522b749"],
};

/** What proves a scaffold is 9.0.0 or later: each is checked in phase 2. */
const SCAFFOLD_MARKERS: Array<[string, string | null]> = [
  ["scripts/pdocs/lint/registry.ts", "FEATURES_FOLDER"],
  ["scripts/pdocs/lint/work.ts", null],
  ["docs/SCHEMA.md", "## State groups"],
  ["docs/TEMPLATES/FEATURE.template.md", null],
  ["docs/TEMPLATES/ITEM.template.md", null],
  ["docs/features/README.md", null],
  ["docs/items/README.md", null],
];

// =======================================================================================
// COPIED LOGIC. This script runs before the refresh, against a `scripts/pdocs/` a
// release older, so it imports nothing from the tree it migrates. Each copy is pinned
// to its original, function by function, by the test file beside this one.
// =======================================================================================

// --- from scripts/pdocs/lint/rules.ts ----------------------------------------------------

export const GIT_LOCAL_ENV = [
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_PARAMETERS",
  "GIT_DIR",
  "GIT_GRAFT_FILE",
  "GIT_IMPLICIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_NO_REPLACE_OBJECTS",
  "GIT_OBJECT_DIRECTORY",
  "GIT_PREFIX",
  "GIT_REPLACE_REF_BASE",
  "GIT_SHALLOW_FILE",
  "GIT_WORK_TREE",
] as const;

/** This process's environment minus `GIT_LOCAL_ENV`, so a spawned git finds the
 *  repository from its `cwd` even when this runs inside a commit hook. */
export function gitEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  for (const name of GIT_LOCAL_ENV) delete env[name];
  return env;
}

// --- from scripts/pdocs/seed.ts ----------------------------------------------------------

export function isSeeded(path: string): boolean {
  const name = basename(path);
  return (
    /^(?:YYYY-MM-DD-)?TEMPLATE(?:-[^/]+)?\.md$/.test(name) ||
    name.endsWith(".template.md") ||
    path.split("/").includes("TEMPLATES")
  );
}

export const SEEDED_PAGES: ReadonlySet<string> = new Set(["STYLE.md"]);

export interface SeedManifest {
  version: string | null;
  files: Record<string, string>;
}

export type Verdict = "update" | "install" | "keep-modified" | "keep-unknown" | "keep-deleted";

export function hashOf(abs: string): string | null {
  if (!existsSync(abs)) return null;
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

export function loadManifest(docsRoot: string): SeedManifest {
  const path = join(docsRoot, MANIFEST_NAME);
  if (!existsSync(path)) return { version: null, files: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(
      `${MANIFEST_NAME} is not valid JSON: ${(e as Error).message}. ` +
        `Delete it to start a fresh record — every file then reads as the adopter's, ` +
        `which is safe but forgets what the scaffold installed.`
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    throw new Error(`${MANIFEST_NAME} must contain a JSON object`);
  const o = parsed as Record<string, unknown>;
  const raw = (o.files ?? {}) as Record<string, unknown>;
  const files: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") files[k] = v;
  return { version: typeof o.version === "string" ? o.version : null, files };
}

function realIfPossible(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

export function within(docsRoot: string, rel: string): string | null {
  if (isAbsolute(rel)) return null;
  const base = realIfPossible(resolve(docsRoot));
  const real = realIfPossible(resolve(base, rel));
  const back = relative(base, real);
  if (back === "" || back === ".." || back.startsWith(`..${sep}`) || isAbsolute(back))
    return null;
  return real;
}

export function verdictFor(m: SeedManifest, docsRoot: string, rel: string): Verdict {
  const abs = within(docsRoot, rel);
  if (abs === null) return "keep-unknown";
  const recorded = m.files[rel];
  const current = hashOf(abs);
  if (recorded === undefined) return current === null ? "install" : "keep-unknown";
  if (current === null) return "keep-deleted";
  return current === recorded ? "update" : "keep-modified";
}

export function renameRecord(m: SeedManifest, from: string, to: string): SeedManifest {
  if (m.files[from] === undefined) return { version: m.version, files: { ...m.files } };
  const files: Record<string, string> = {};
  for (const [k, v] of Object.entries(m.files)) if (k !== from) files[k] = v;
  if (files[to] === undefined) files[to] = m.files[from] as string;
  return { version: m.version, files };
}

export function mayWrite(v: Verdict): boolean {
  return v === "update" || v === "install";
}

// --- from scripts/pdocs/uuid.ts ----------------------------------------------------------

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

const RAND_BITS = 74n;
const RAND_MAX = (1n << RAND_BITS) - 1n;

function randomBits(bytes: Uint8Array): bigint {
  let r = BigInt((bytes[0] as number) & 0x0f);
  r = (r << 8n) | BigInt(bytes[1] as number);
  r = (r << 6n) | BigInt((bytes[2] as number) & 0x3f);
  for (let i = 3; i < 10; i++) r = (r << 8n) | BigInt(bytes[i] as number);
  return r;
}

function encode(ms: number, r: bigint): string {
  const b = new Uint8Array(16);
  let t = ms;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  const randA = Number(r >> 62n);
  b[6] = 0x70 | (randA >> 8);
  b[7] = randA & 0xff;
  let randB = r & ((1n << 62n) - 1n);
  for (let i = 15; i >= 9; i--) {
    b[i] = Number(randB & 0xffn);
    randB >>= 8n;
  }
  b[8] = 0x80 | Number(randB & 0x3fn);
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let lastId: { ms: number; r: bigint } | null = null;

export function uuidv7(now: number = Date.now(), random?: Uint8Array): string {
  if (!Number.isInteger(now) || now < 0 || now >= 2 ** 48)
    throw new RangeError(`uuidv7: timestamp ${now} does not fit in 48 bits`);
  if (random !== undefined) {
    if (random.length < 10) throw new RangeError("uuidv7: needs ten random bytes");
    return encode(now, randomBits(random));
  }
  const fresh = () => randomBits(crypto.getRandomValues(new Uint8Array(10))) >> 1n;
  let ms = now;
  let r: bigint;
  if (lastId !== null && ms <= lastId.ms) {
    ms = lastId.ms;
    r = lastId.r + 1n;
    if (r > RAND_MAX) {
      ms += 1;
      r = fresh();
    }
  } else r = fresh();
  lastId = { ms, r };
  return encode(ms, r);
}

// --- from scripts/pdocs/docs-lint/index.ts -----------------------------------------------

export function stripFences(md: string): string {
  return md.replace(/^[ \t]*(`{3,})[^\n]*$[\s\S]*?^[ \t]*\1`*[ \t]*$/gm, (m) =>
    m.replace(/[^\n]/g, " ")
  );
}

export function stripCode(md: string): string {
  return stripFences(md).replace(/(?<!`)`[^`\n]+`(?!`)/g, (m) => " ".repeat(m.length));
}

export const MARKDOWN_LINK_RE = /\]\((<[^>]*>|[^)]+)\)/g;

// --- from scripts/pdocs/links-rewrite.ts -------------------------------------------------

const REFERENCE_DEFINITION_RE =
  /^( {0,3}\[(?!\^)[^\]\n]+\]:[ \t]*)(<[^>\n]*>|[^\s<]\S*)(?=[ \t]*(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\))?[ \t]*$)/gm;

export function movedTo(abs: string, moveMap: ReadonlyMap<string, string>): string {
  const exact = moveMap.get(abs);
  if (exact !== undefined) return exact;
  let best: string | null = null;
  for (const key of moveMap.keys())
    if (abs.startsWith(key + sep) && (best === null || key.length > best.length)) best = key;
  return best === null ? abs : (moveMap.get(best) as string) + abs.slice(best.length);
}

export function rewriteLinks(
  text: string,
  fromFile: string,
  toFile: string,
  moveMap: ReadonlyMap<string, string>,
  exists: (abs: string) => boolean = () => false
): { text: string; changed: number } {
  const fileMoves = fromFile !== toFile;
  const fromDir = dirname(fromFile);
  const toDir = dirname(toFile);
  const edits: Array<{ start: number; end: number; value: string }> = [];

  const stripped = stripCode(text);
  const found: Array<{ start: number; raw: string; definition?: true }> = [];
  for (const m of stripped.matchAll(MARKDOWN_LINK_RE))
    if (m[1] !== undefined && m.index !== undefined)
      found.push({ start: m.index + 2, raw: m[1] });
  for (const m of stripped.matchAll(REFERENCE_DEFINITION_RE))
    if (m[2] !== undefined && m.index !== undefined)
      found.push({ start: m.index + (m[1] as string).length, raw: m[2], definition: true });
  found.sort((a, b) => a.start - b.start);

  for (const { start, raw, definition } of found) {
    const written = text.slice(start, start + raw.length);
    const pointy = /^<.*>$/.test(written.trim());
    const target = written.trim().replace(/^<(.*)>$/, "$1");
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const hash = target.indexOf("#");
    const pathPart = hash === -1 ? target : target.slice(0, hash);
    const anchor = hash === -1 ? "" : target.slice(hash);
    if (pathPart === "" || isAbsolute(pathPart)) continue;

    const oldAbs = resolve(fromDir, pathPart);
    const newAbs = movedTo(oldAbs, moveMap);
    if (definition && newAbs === oldAbs && !exists(oldAbs)) continue;
    if (newAbs === oldAbs && !fileMoves) continue;

    let rel = relative(toDir, newAbs).split(sep).join("/");
    if (rel === "") rel = ".";
    if (pathPart.endsWith("/") && !rel.endsWith("/")) rel += "/";
    if (pathPart.startsWith("./") && !rel.startsWith("../") && !rel.startsWith("./"))
      rel = `./${rel}`;
    if (rel === pathPart) continue;

    const dest = pointy ? `<${rel}${anchor}>` : `${rel}${anchor}`;
    const lead = written.match(/^\s*/)?.[0] ?? "";
    const trail = written.match(/\s*$/)?.[0] ?? "";
    edits.push({ start, end: start + raw.length, value: `${lead}${dest}${trail}` });
  }

  let out = text;
  for (const e of edits.reverse()) out = out.slice(0, e.start) + e.value + out.slice(e.end);
  return { text: out, changed: edits.length };
}

export function rewriteFromField(
  text: string,
  docsRoot: string,
  moveMap: ReadonlyMap<string, string>
): { text: string; changed: number } {
  const fm = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!fm) return { text, changed: 0 };
  const line = /^from:([ \t]*)(["']?)([^"'#\n]*?)\2([ \t]*(?:#.*)?)$/m.exec(fm[1] as string);
  if (!line) return { text, changed: 0 };
  const [whole, gap, quote, value, tail] = line as unknown as [string, string, string, string, string];
  if (!value.endsWith(".md") || /^(feature|cycle|item)\//.test(value) || isAbsolute(value))
    return { text, changed: 0 };
  const abs = join(docsRoot, value);
  const moved = movedTo(abs, moveMap);
  if (moved === abs) return { text, changed: 0 };
  const next = relative(docsRoot, moved).split(sep).join("/");
  const start = 4 + line.index;
  const replaced = `from:${gap}${quote}${next}${quote}${tail}`;
  return {
    text: text.slice(0, start) + replaced + text.slice(start + whole.length),
    changed: 1,
  };
}

// --- from migrate-v2.9-to-v2.10.ts (itself pinned to v2.6's) -----------------------------

export function patchTopLevelVersion(json: string, version: string): string | null {
  const n = json.length;
  const endOfString = (from: number): number => {
    let j = from + 1;
    while (j < n) {
      if (json[j] === "\\") j += 2;
      else if (json[j] === '"') return j + 1;
      else j++;
    }
    return n;
  };
  let depth = 0;
  let i = 0;
  while (i < n) {
    const c = json[i];
    if (c === '"') {
      const end = endOfString(i);
      if (depth === 1 && json.slice(i, end) === '"version"') {
        const colon = /^\s*:\s*/.exec(json.slice(end));
        if (colon) {
          const valueStart = end + colon[0].length;
          const v = json[valueStart];
          if (v === "{" || v === "[" || v === undefined) return null;
          const valueEnd =
            v === '"'
              ? endOfString(valueStart)
              : valueStart + (/^[^\s,}\]]*/.exec(json.slice(valueStart)) as RegExpExecArray)[0].length;
          return json.slice(0, valueStart) + JSON.stringify(version) + json.slice(valueEnd);
        }
      }
      i = end;
    } else {
      if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") depth--;
      i++;
    }
  }
  return null;
}

export function reserialiseLike(cfg: unknown, before: string): string {
  const indent = /^([ \t]+)"/m.exec(before)?.[1] ?? "  ";
  return `${JSON.stringify(cfg, null, indent)}${before.endsWith("\n") ? "\n" : ""}`;
}

export function writeVersionInto(path: string, before: string, version: string): string {
  const intended = JSON.parse(before) as Record<string, unknown>;
  intended.version = version;
  const patched = patchTopLevelVersion(before, version);
  let verified = false;
  if (patched !== null) {
    try {
      verified = Bun.deepEquals(JSON.parse(patched), intended, true);
    } catch {
      verified = false;
    }
  }
  if (verified) {
    writeFileSync(path, patched as string);
    return "that one key; every other byte as it was";
  }
  writeFileSync(path, reserialiseLike(intended, before));
  return 're-serialised, indent kept: no top-level "version" to patch in place';
}

// =======================================================================================
// END OF COPIED LOGIC
// =======================================================================================

// =======================================================================================
// Frontmatter: read and edit a block line by line, keeping every line not edited
// =======================================================================================

/** The frontmatter block (without its fences) and the body after it; `fm` null when none. */
export function splitFrontmatter(text: string): { fm: string | null; body: string } {
  const m = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(text);
  if (!m) return { fm: null, body: text };
  return { fm: m[1] as string, body: text.slice(m[0].length) };
}

/**
 * A block and its body, in the shape Prettier prints them: one blank line between
 * the closing fence and the body, whatever the body began with. A body that is
 * only blank lines leaves the block alone at the end of the file.
 */
export function joinFrontmatter(fm: string, body: string): string {
  const rest = body.replace(/^\n+/, "");
  return rest === "" ? `---\n${fm}\n---\n` : `---\n${fm}\n---\n\n${rest}`;
}

/** Strip a trailing `# comment`, respecting quotes (the lint's rule). */
function stripComment(v: string): string {
  let s = false;
  let d = false;
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (c === "\\" && d) i++;
    else if (c === "'" && !d) s = !s;
    else if (c === '"' && !s) d = !d;
    else if (c === "#" && !s && !d && i > 0 && /\s/.test(v.charAt(i - 1))) return v.slice(0, i);
  }
  return v;
}

function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"')
    return t.slice(1, -1).replace(/\\(.)/g, (_, c: string) => ({ n: "\n", t: "\t" } as Record<string, string>)[c] ?? c);
  if (t.length >= 2 && t[0] === "'" && t[t.length - 1] === "'") return t.slice(1, -1).replace(/''/g, "'");
  return t;
}

/** The line range [start, end) a top-level key occupies, continuation lines included. */
function keyRange(lines: string[], key: string): [number, number] | null {
  const start = lines.findIndex((l) => new RegExp(`^${key.replace(/[-]/g, "\\-")}:(\\s|$)`).test(l));
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && (/^\s+\S/.test(lines[end] as string) || /^-\s/.test(lines[end] as string))) end++;
  return [start, end];
}

/** A key's value, continuation lines joined, comment stripped, unquoted. */
export function fmGet(fm: string, key: string): string | null {
  const lines = fm.split("\n");
  const r = keyRange(lines, key);
  if (!r) return null;
  const first = (lines[r[0]] as string).slice(key.length + 1);
  const all = [first, ...lines.slice(r[0] + 1, r[1]).map((l) => l.trim())].join(" ");
  return unquote(stripComment(all.trim()).trim());
}

/** A list value: `[a, b]` (flow, possibly wrapped) or `- a` lines. */
export function fmList(fm: string, key: string): string[] {
  const lines = fm.split("\n");
  const r = keyRange(lines, key);
  if (!r) return [];
  const first = stripComment((lines[r[0]] as string).slice(key.length + 1)).trim();
  const rest = lines.slice(r[0] + 1, r[1]).map((l) => stripComment(l).trim());
  const all = [first, ...rest].join(" ").trim();
  if (all.startsWith("["))
    return all
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((s) => unquote(s.trim()))
      .filter((s) => s.length > 0);
  return rest.filter((l) => l.startsWith("- ")).map((l) => unquote(l.slice(2)));
}

/** Set `key: value` in place (its continuation lines replaced); append when absent. */
export function fmSet(fm: string, key: string, value: string): string {
  const lines = fm.split("\n");
  const r = keyRange(lines, key);
  if (!r) return [...lines, `${key}: ${value}`].join("\n");
  lines.splice(r[0], r[1] - r[0], `${key}: ${value}`);
  return lines.join("\n");
}

/** Insert `key: value` after `after` (or after `type`, or at the end); replaces an existing key. */
export function fmInsertAfter(fm: string, after: string, key: string, value: string): string {
  if (keyRange(fm.split("\n"), key)) return fmSet(fm, key, value);
  const lines = fm.split("\n");
  const r = keyRange(lines, after) ?? keyRange(lines, "type");
  const at = r ? r[1] : lines.length;
  lines.splice(at, 0, `${key}: ${value}`);
  return lines.join("\n");
}

export function fmRemove(fm: string, key: string): string {
  const lines = fm.split("\n");
  const r = keyRange(lines, key);
  if (!r) return fm;
  lines.splice(r[0], r[1] - r[0]);
  return lines.join("\n");
}

/**
 * A YAML scalar the lint reads back as `s`: plain where safe, quoted otherwise —
 * the quotes Prettier prints: single when `s` holds a double quote and needs no
 * other escape, double otherwise.
 */
export function yamlScalar(s: string): string {
  if (/^[A-Za-z0-9(][^:#\n"'\\]*$/.test(s) && !/\s$/.test(s) && !/: /.test(s)) return s;
  const doubled = JSON.stringify(s);
  if (doubled.slice(1, -1).replace(/\\"/g, "").includes("\\") || !s.includes('"')) return doubled;
  return `'${s.replace(/'/g, "''")}'`;
}

/**
 * The child that formats text with the project's own Prettier: resolved from the
 * project root the way its own scripts resolve it. It runs under
 * `bun --no-install`, so a project with no Prettier gets none: Bun would
 * otherwise auto-install a missing package from npm. Reads
 * `{ root, ignore, ignores, items: [{ path, text }] }` on stdin (`ignore` the
 * `.prettierignore` Prettier 2 reads; `ignores` the `.gitignore` and
 * `.prettierignore` Prettier 3's CLI reads, whichever exist) and prints, as its last
 * line, `{ version, missing, error, out }`: each text as Prettier prints it at
 * its path in `out` (null where Prettier ignores the path, infers no Markdown
 * parser, or fails on it), and the first failure in `error`.
 */
const PRETTIER_CHILD = `
const { createRequire } = require("node:module");
const input = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
const result = { version: null, missing: false, error: null, out: input.items.map(() => null) };
let prettier = null;
try { prettier = createRequire(input.root + "/package.json")("prettier"); }
catch (e) { if (e && e.code === "MODULE_NOT_FOUND") result.missing = true; else result.error = String((e && e.message) || e).split("\\n")[0]; }
// The ignore files the CLI reads by default: Prettier 3 reads .gitignore and .prettierignore,
// Prettier 2 only .prettierignore (and its API takes one path).
const major = prettier ? parseInt(String(prettier.version || "0"), 10) : 0;
const ignorePath = major >= 3 ? (input.ignores.length ? input.ignores : null) : input.ignore;
if (prettier) {
  result.version = prettier.version || null;
  for (const [i, { path, text }] of input.items.entries()) {
    try {
      const info = await prettier.getFileInfo(path, ignorePath ? { ignorePath } : {});
      if (info.ignored || info.inferredParser !== "markdown") continue;
      const config = (await prettier.resolveConfig(path, { editorconfig: true })) || {};
      result.out[i] = await prettier.format(text, { ...config, filepath: path });
    } catch (e) { if (!result.error) result.error = path + ": " + String((e && e.message) || e).split("\\n")[0]; }
  }
}
console.log(JSON.stringify(result));
`;

/** What the project's Prettier made of each text: see PRETTIER_CHILD. `failed` when the child itself could not run. */
export interface PrettierResult {
  version: string | null;
  missing: boolean;
  error: string | null;
  out: Array<string | null>;
  failed: string | null;
}

/**
 * Each `text` formatted by the project's own Prettier as if it sat at `path`
 * — its config, its overrides, its `.prettierignore` — and never a downloaded
 * one: the child runs under `bun --no-install`. Writes nothing. The one door
 * every Prettier pass of this run goes through.
 */
export function prettierFormat(root: string, items: Array<{ path: string; text: string }>): PrettierResult {
  if (items.length === 0) return { version: null, missing: false, error: null, out: [], failed: null };
  // Prettier 2's getFileInfo takes one path, .prettierignore; Prettier 3 takes the list its CLI reads.
  const ignore = existsSync(join(root, ".prettierignore")) ? join(root, ".prettierignore") : null;
  const ignores = [".gitignore", ".prettierignore"].map((f) => join(root, f)).filter((f) => existsSync(f));
  const r = Bun.spawnSync([process.execPath, "--no-install", "-e", PRETTIER_CHILD], {
    cwd: root,
    stdin: Buffer.from(JSON.stringify({ root, ignore, ignores, items })),
    stdout: "pipe",
    stderr: "pipe",
    env: gitEnv(),
  });
  let res: Omit<PrettierResult, "failed"> | null = null;
  try {
    res = r.exitCode === 0 ? JSON.parse(r.stdout.toString().trim().split("\n").pop() ?? "") : null;
  } catch {}
  if (res === null || !Array.isArray(res.out) || res.out.length !== items.length)
    return { version: null, missing: false, error: null, out: items.map(() => null), failed: r.stderr.toString().trim().split("\n")[0] || `exit ${r.exitCode}` };
  return { ...res, failed: null };
}

/**
 * Each frontmatter block, as the project's own Prettier prints it at that
 * document's path. A block is `null` where Prettier leaves it to the run: an
 * ignored path, a failure, or no Prettier in the project. `note` says why, when
 * any block fell back for a reason other than an ignored path; null otherwise.
 */
export function prettierFrontmatter(root: string, items: Array<{ path: string; fm: string }>): { blocks: Array<string | null>; note: string | null } {
  if (items.length === 0) return { blocks: [], note: null };
  const shape = "the frontmatter this run writes is in the shape Prettier's defaults give it";
  const fallback = (why: string) => ({ blocks: items.map(() => null), note: `${why}: ${shape}` });
  const res = prettierFormat(root, items.map(({ path, fm }) => ({ path, text: `---\n${fm}\n---\n` })));
  if (res.failed !== null) return fallback(`your Prettier could not be run (${res.failed})`);
  if (res.missing) return fallback("no Prettier in this project");
  if (res.version === null) return fallback(`your Prettier could not be loaded (${res.error ?? "no version"})`);
  const blocks = res.out.map((t) => (typeof t === "string" ? splitFrontmatter(t).fm : null));
  if (!res.error) return { blocks, note: null };
  const failed = blocks.filter((b) => b === null).length;
  return { blocks, note: `your Prettier ${res.version} failed on a block (${res.error.replaceAll(`${root}/`, "")});${failed} of ${items.length} block(s) are in the shape Prettier's defaults give them` };
}

/** A Markdown table in a text: its lines' range and its text. */
export interface TableBlock {
  start: number;
  end: number;
  text: string;
}

const TABLE_DELIMITER = /^ {0,3}\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** Every pipe table in `text` outside code fences: a header row, a delimiter row, and the rows under them. PURE. */
export function tableBlocks(text: string): TableBlock[] {
  const lines = text.split("\n");
  const bare = stripFences(text).split("\n");
  const out: TableBlock[] = [];
  // A table inside a blockquote or indented under a list item is found too, so that one the
  // run edits can be named: its prefix is read off each line before it is tested.
  const prefix = (l: string) => /^(?:[ \t]*>)+[ \t]?|^[ \t]+/.exec(l)?.[0] ?? "";
  const row = (l: string) => l.slice(prefix(l).length);
  for (let i = 0; i + 1 < bare.length; i++) {
    const head = row(bare[i] as string);
    const delim = row(bare[i + 1] as string);
    if (!head.includes("|") || !TABLE_DELIMITER.test(delim) || !delim.includes("-")) continue;
    let end = i + 2;
    while (end < bare.length && row(bare[end] as string).includes("|") && row(bare[end] as string).trim() !== "") end++;
    out.push({ start: i, end, text: lines.slice(i, end).join("\n") });
    i = end - 1;
  }
  return out;
}

/** The tables of `after` whose text is not in `before`: the ones an edit changed. PURE. */
export function editedTables(before: string, after: string): TableBlock[] {
  return tableBlocks(after).filter((t) => !before.includes(t.text));
}

/** A table's rows split into cells, trimmed, as GFM splits them: on every unescaped pipe, a code span's included. */
const tableRows = (table: string) =>
  table
    .trim()
    .split("\n")
    .map((row) => row.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim()));

/** A table's cells, row by row, the delimiter row left out; and every row's column count, the delimiter row's included. */
const tableCells = (table: string) => tableRows(table).filter((_, i) => i !== 1);
const tableShape = (table: string) => tableRows(table).map((r) => r.length);

/**
 * What a formatted form `out` of the table `block` may do: replace it (`lines`),
 * or not, and why. Only a top-level table whose form is still the same table —
 * as many lines, every row as many columns, the same cells — is replaced. A
 * table in a blockquote or indented under a list item is never: formatted alone
 * it would lose its prefix. PURE.
 */
export function repadVerdict(block: TableBlock, out: string | null | undefined): { lines: string[] } | { why: string } {
  if (/^(?:[ \t]*>)/.test(block.text)) return { why: "in a blockquote" };
  if (/^\s/.test(block.text)) return { why: "indented" };
  const form = out?.replace(/\n+$/, "");
  if (!form) return { why: "no formatted form" };
  // Same header and delimiter width, same cells: a delimiter row Prettier widened under an
  // unchanged header (a pipe inside a code span splits a body cell) is no longer a table.
  if (
    form.split("\n").length !== block.end - block.start ||
    JSON.stringify(tableShape(form)) !== JSON.stringify(tableShape(block.text)) ||
    JSON.stringify(tableCells(form)) !== JSON.stringify(tableCells(block.text))
  )
    return { why: "your Prettier would change more than its padding" };
  return { lines: form.split("\n") };
}

/**
 * `text` with each of `blocks` replaced by its formatted form in `outs` where
 * `repadVerdict` allows it; every other block is left as it is. PURE.
 */
export function repadTables(text: string, blocks: TableBlock[], outs: Array<string | null>): string {
  const lines = text.split("\n");
  for (let b = blocks.length - 1; b >= 0; b--) {
    const block = blocks[b] as TableBlock;
    const v = repadVerdict(block, outs[b]);
    if ("lines" in v) lines.splice(block.start, block.end - block.start, ...v.lines);
  }
  return lines.join("\n");
}

// =======================================================================================
// The pure planning functions
// =======================================================================================

/** A legacy file or folder name's slug, and the date prefix it carried. */
export function slugOf(name: string, kind: "backlog" | "fragment" | "investigation" | "project"): { slug: string; date: string | null } {
  let s = name.replace(/\.md$/, "");
  const d = /^(\d{4}-\d{2}-\d{2})-(.+)$/.exec(s);
  const date = d ? (d[1] as string) : null;
  if (d) s = d[2] as string;
  if (kind === "investigation" && s.endsWith("-investigation") && s !== "investigation") s = s.slice(0, -"-investigation".length);
  return { slug: s, date };
}

/** A proposal's lifecycle as a feature's. `null` = cannot be mapped (a judgment step). */
export function featureLifecycle(proposal: string | null, planActive: boolean, archived: boolean): string | null {
  switch (proposal) {
    case "draft":
    case "deferred":
      return "backlog";
    case "approved":
      return planActive ? "active" : "ready";
    case "implemented":
      return "done";
    case "withdrawn":
    case "superseded":
      return "dropped";
    case null:
      // Legacy archives carry no frontmatter; a legacy archive held finished work.
      return archived ? "done" : null;
    default:
      return null;
  }
}

export function backlogLifecycle(v: string | null, archived: boolean): string | null {
  const m: Record<string, string> = { open: "backlog", done: "done", promoted: "dropped", dropped: "dropped" };
  if (v === null) return archived ? "done" : null;
  return m[v] ?? null;
}

export function fragmentLifecycle(v: string | null, archived: boolean): string | null {
  const m: Record<string, string> = { open: "triage", promoted: "dropped", dropped: "dropped" };
  if (v === null) return archived ? "dropped" : null;
  return m[v] ?? null;
}

export function researchLifecycle(v: string | null, archived: boolean): string | null {
  const m: Record<string, string> = { active: "active", concluded: "done" };
  if (v === null) return archived ? "done" : null;
  return m[v] ?? null;
}

/** A project folder with no proposal becomes an item: the work ran first. */
export function bornItemLifecycle(planActive: boolean): string {
  return planActive ? "active" : "done";
}

/** An owned document that had no frontmatter, found in a legacy archive: its closed state. */
export const ARCHIVED_OWNED_LIFECYCLE: Record<string, string> = {
  plan: "completed",
  "design-resolution": "resolved",
  "test-plan": "completed",
};

const TERMINAL = new Set(["done", "dropped"]);

/** "fix-the-hook" → "Fix the hook". */
export function titleize(slug: string): string {
  const s = slug.replace(/[-_]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Markdown inline syntax removed, for a title or a description. */
function plainText(s: string): string {
  return s
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A setext underline: `===` (H1) or `---` (H2), up to three spaces in. */
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;

/**
 * The text of a document's first H1, ATX (`# Title`) or setext (`Title` over a
 * `===` line), whichever comes first; null when it has none. `md` is fence-free.
 */
export function firstH1(md: string): string | null {
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] as string;
    if (/^ {0,3}#\s+\S/.test(l)) return l.replace(/^ {0,3}#\s+/, "").replace(/\s+#+\s*$/, "");
    const next = lines[i + 1];
    if (next !== undefined && /^ {0,3}=+[ \t]*$/.test(next) && l.trim() !== "" && !/^ {0,3}([-*+>#|]|\d+\.)/.test(l)) {
      // A setext heading's text is the whole paragraph above its underline.
      let start = i;
      while (start > 0 && (lines[start - 1] as string).trim() !== "") start--;
      return lines.slice(start, i + 1).join(" ").trim();
    }
  }
  return null;
}

/**
 * A paragraph block with any setext heading in it removed: the lines up to and
 * including the last underline that follows text. `Alpha\n===\nThe notes.`
 * leaves `The notes.`; a block that is only a heading, or only a thematic break
 * (`---`), leaves nothing.
 */
function withoutSetextHeadings(block: string): string {
  const lines = block.split("\n");
  let cut = -1;
  for (let i = 0; i < lines.length; i++)
    if (SETEXT_UNDERLINE.test(lines[i] as string) && (i === 0 || (lines[i - 1] as string).trim() !== "" || cut === i - 1)) cut = i;
  return cut === -1 ? block : lines.slice(cut + 1).join("\n");
}

/**
 * Frontmatter for a document that has none — a legacy archive was never
 * linted. The type from its new position, the title from its H1 (or its file
 * name), the description from the first sentence of its first paragraph (or
 * its title), `status: stable`, and `generated` by `unknown` at `date`.
 * Returns the whole text: the block, then the body exactly as it was.
 */
export function synthesizeFrontmatter(
  type: string,
  fileName: string,
  body: string,
  o: { date: string; extra?: Array<[string, string]> }
): string {
  const fromName = titleize(slugOf(basename(fileName), "backlog").slug);
  // Read with LF endings; the body is written back as it was, CRLF and all.
  const lf = stripFences(body.replace(/\r\n?/g, "\n"));
  const h1 = firstH1(lf);
  const title = h1 !== null ? plainText(h1) || fromName : fromName;
  let description = "";
  const prose = lf.split(/\n\s*\n/);
  for (const para of prose) {
    const t = withoutSetextHeadings(para).trim();
    if (t === "" || /^(#|[-*+] |\d+\. |\||>|<)/.test(t)) continue;
    if (/^\*\*[^*]+:\*\*/.test(t)) continue; // `**Date:** …` metadata lines
    const plain = plainText(t);
    if (plain === "") continue;
    description = (/^.*?[.!?](?=\s|$)/.exec(plain)?.[0] ?? plain).trim();
    break;
  }
  if (description === "") description = title;
  const fm = [
    `type: ${type}`,
    `title: ${yamlScalar(title)}`,
    `description: ${yamlScalar(description)}`,
    "status: stable",
    ...(o.extra ?? []).map(([k, v]) => `${k}: ${v}`),
    `generated: { by: unknown, at: ${o.date} }`,
  ].join("\n");
  return joinFrontmatter(fm, body);
}

/** Every relative link target in `text` (code stripped), without its anchor. */
export function linkTargets(text: string): string[] {
  const out: string[] = [];
  for (const m of stripCode(text).matchAll(MARKDOWN_LINK_RE)) {
    const t = (m[1] as string).trim().replace(/^<(.*)>$/, "$1");
    if (/^[a-z][a-z0-9+.-]*:/i.test(t)) continue;
    const p = t.split("#")[0] as string;
    if (p !== "" && !isAbsolute(p)) out.push(p);
  }
  return out;
}

/**
 * Links (in a file now at `file`) whose target is EXACTLY a key of `folderMap`
 * — a retired folder itself, `../backlog/` — respelled to its successor. A link
 * to anything inside the folder is left alone: that is the move map's job.
 * PURE; run after `rewriteLinks`, so every link already reads from `file`.
 */
export function rewriteFolderLinks(text: string, file: string, folderMap: ReadonlyMap<string, string>): { text: string; changed: number } {
  const edits: Array<{ start: number; end: number; value: string }> = [];
  for (const m of stripCode(text).matchAll(MARKDOWN_LINK_RE)) {
    if (m[1] === undefined || m.index === undefined) continue;
    const start = m.index + 2;
    const written = text.slice(start, start + m[1].length);
    const target = written.trim().replace(/^<(.*)>$/, "$1");
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const hash = target.indexOf("#");
    const pathPart = hash === -1 ? target : target.slice(0, hash);
    if (pathPart === "" || isAbsolute(pathPart)) continue;
    const to = folderMap.get(resolve(dirname(file), pathPart));
    if (to === undefined) continue;
    let rel = relative(dirname(file), to).split(sep).join("/");
    if (pathPart.endsWith("/")) rel += "/";
    if (pathPart.startsWith("./") && !rel.startsWith(".")) rel = `./${rel}`;
    edits.push({ start, end: start + m[1].length, value: written.replace(pathPart, rel) });
  }
  let out = text;
  for (const e of edits.reverse()) out = out.slice(0, e.start) + e.value + out.slice(e.end);
  return { text: out, changed: edits.length };
}

/** The path `abs` was at before the moves in `moveMap` (old → new): the inverse of `movedTo`. */
export function movedFrom(abs: string, moveMap: ReadonlyMap<string, string>): string {
  let best: [string, string] | null = null;
  for (const [from, to] of moveMap) {
    if (abs === to) return from;
    if (abs.startsWith(to + sep) && (best === null || to.length > best[1].length)) best = [from, to];
  }
  return best === null ? abs : best[0] + abs.slice(best[1].length);
}

/** The project a link is read in: its root (where `.project-docs.json` is) and the docs root's name under it. */
export interface RootReading {
  /** The project root, absolute. No candidate outside it is suggested. */
  root: string;
  /** The docs root, relative to `root` (`docs`). */
  docsRootName: string;
}

/** What phase 10 can say about one broken link. */
export type LinkSuggestion =
  | { fix: string; reading: string }
  | { ambiguous: Array<{ fix: string; reading: string }> }
  | null;

/**
 * `abs`, an old-layout path, with `_archive/` inserted after the retired
 * category folder it sits in (`docs/backlog/x.md` → `docs/backlog/_archive/x.md`):
 * where a document archived AFTER the link to it was written now sits. Null when
 * it is not in a retired category folder, or is already in its `_archive/`.
 */
export function archivedReading(abs: string, docsRoot: string): string | null {
  if (!abs.startsWith(docsRoot + sep)) return null;
  const segs = abs.slice(docsRoot.length + 1).split(sep);
  if (segs.length < 2 || !LEGACY_FOLDERS.includes(segs[0] as string) || segs[1] === "_archive") return null;
  return join(docsRoot, segs[0] as string, "_archive", ...segs.slice(1));
}

/**
 * The link `target`, broken in the file at `fileAbs`, respelled to a document
 * this run's moves account for. Every candidate is an OLD-layout path read
 * through the move record (`movedTo`), and counts only if the file is there.
 *
 *   1. moved — the target itself moved (a link the rewrite could not see).
 *      Exact, not a reading: when it lands, it is the answer.
 *   Otherwise, the READINGS, in this order:
 *   2. one level short — written where the file stood before the run, resolved
 *      from the folder above: a legacy `_archive/` was moved into by hand without
 *      its links being respelled, so every relative link in it lost a level;
 *   3. from the root — a link that starts with the docs root's name
 *      (`docs/projects/x/proposal.md`) written from the PROJECT root (where
 *      `.project-docs.json` is — in a monorepo, the package, not the repository);
 *   4–6. archived since — readings 2, 3 and the link as it resolves now, with
 *      `_archive/` inserted after the retired category folder: the target was
 *      archived after the link was written.
 *
 * Readings that land on the same file agree, and the first names it. Readings
 * that land on DIFFERENT files are ambiguous: nothing is suggested, and the
 * caller names the candidates — a wrong suggestion is worse than none. With
 * `fromRoot`, a candidate outside the project root is never suggested. A
 * suggestion, never a rewrite, relative from the file's new place, its anchor
 * kept. PURE over `exists`.
 */
export function suggestLinkFixes(
  fileAbs: string,
  target: string,
  moveMap: ReadonlyMap<string, string>,
  exists: (abs: string) => boolean,
  fromRoot?: RootReading
): LinkSuggestion {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return null;
  const hash = target.indexOf("#");
  const pathPart = hash === -1 ? target : target.slice(0, hash);
  const anchor = hash === -1 ? "" : target.slice(hash);
  if (pathPart === "" || isAbsolute(pathPart)) return null;
  const dir = dirname(fileAbs);
  const now = resolve(dir, pathPart);
  const spell = (candidate: string) => {
    let rel = relative(dir, candidate).split(sep).join("/");
    if (pathPart.startsWith("./") && !rel.startsWith(".")) rel = `./${rel}`;
    if (pathPart.endsWith("/") && !rel.endsWith("/")) rel += "/";
    return `${rel}${anchor}`;
  };
  // A candidate outside the project is never suggested: a reading that climbs past its root
  // (one level short, from a file near the top) lands wherever the climb ends, and a file
  // there is chance, not the target.
  const inside = (abs: string) => !fromRoot || abs.startsWith(resolve(fromRoot.root) + sep);
  const moved = movedTo(now, moveMap);
  if (moved !== now && inside(moved) && exists(moved)) return { fix: spell(moved), reading: "moved" };

  const before = movedFrom(fileAbs, moveMap);
  // The link as it was written where the file stood: the rewrite kept what it resolved to.
  const written = relative(dirname(before), now);
  const shortBy1 = resolve(dirname(dirname(before)), written);
  const docsRoot = fromRoot ? join(fromRoot.root, fromRoot.docsRootName) : null;
  const rootRead =
    fromRoot && (pathPart === fromRoot.docsRootName || pathPart.replace(/^\.\//, "").startsWith(`${fromRoot.docsRootName}/`))
      ? resolve(fromRoot.root, pathPart)
      : null;
  const readings: Array<[string, string | null]> = [
    ["one level short", shortBy1],
    ["from the root", rootRead],
    ["one level short, archived since", docsRoot ? archivedReading(shortBy1, docsRoot) : null],
    ["from the root, archived since", docsRoot && rootRead ? archivedReading(rootRead, docsRoot) : null],
    ["archived since", docsRoot ? archivedReading(now, docsRoot) : null],
  ];
  const found: Array<{ abs: string; reading: string }> = [];
  for (const [reading, old] of readings) {
    if (old === null) continue;
    const candidate = movedTo(old, moveMap);
    if (candidate === now || !inside(candidate) || !exists(candidate)) continue;
    if (!found.some((f) => f.abs === candidate)) found.push({ abs: candidate, reading });
  }
  if (found.length === 0) return null;
  if (found.length === 1) return { fix: spell((found[0] as { abs: string }).abs), reading: (found[0] as { reading: string }).reading };
  return { ambiguous: found.map((f) => ({ fix: spell(f.abs), reading: f.reading })) };
}

/** `suggestLinkFixes`, as the one suggestion or null (ambiguous is null). */
export function suggestLinkFix(
  fileAbs: string,
  target: string,
  moveMap: ReadonlyMap<string, string>,
  exists: (abs: string) => boolean,
  fromRoot?: RootReading
): string | null {
  const r = suggestLinkFixes(fileAbs, target, moveMap, exists, fromRoot);
  return r !== null && "fix" in r ? r.fix : null;
}

/** Docs-relative path a link in `fromRel` resolves to. */
export const resolveRel = (fromRel: string, link: string) => posix.normalize(posix.join(posix.dirname(fromRel), link));

// =======================================================================================
// `.project-docs.json`: the `lint` arrays, decided as data, then written into the
// file's own text so every other byte is kept
// =======================================================================================

export interface LintKeys {
  durable?: string[];
  workbench?: string[];
  skip?: string[];
  exclude?: string[];
  scopes?: string[];
  types?: Record<string, string>;
  [k: string]: unknown;
}

/**
 * A `lint.exclude` glob with every moved path respelled, as the globs to write
 * in its place — `Bun.Glob` globs, matched against the whole repository-relative
 * path, which is how the lint reads them. `moves` are repository-relative
 * `[from, to]` pairs, a folder or a file, every file under a moved folder listed
 * too. PURE.
 *
 *   · a glob naming no retired folder is returned as it is;
 *   · a path spelled out to (or into) something that moved follows it, longest
 *     move first (`docs/projects/a/**` → `docs/features/a/**`);
 *   · a wildcard where the entity would be, with something inside the entity
 *     after it (`docs/projects/*∕artifacts/**∕*-slides.md`), goes CATEGORY-WIDE:
 *     one glob per folder the retired one's entities go to (`features/` and
 *     `items/` for `projects/`, `items/` for the rest), so an entity filed after
 *     the run stays excluded. When the same glob one level down —
 *     `docs/projects/_archive/*∕…` — matched an archived entity's file, the
 *     `_archive/` forms are added too: the old lint skipped the archive, and
 *     9.x lints it.
 *
 * Returns `null` — left as written, and named — for a whole retired folder or
 * its files (`docs/backlog/*.md` as `docs/items/*.md` would exclude every item),
 * a path nothing moved, or a category-wide respelling that would not reach
 * every moved file the glob matched.
 */
export function rewriteExcludeGlob(glob: string, moves: Array<[string, string]>, docsRootName: string): string[] | null {
  const sorted = [...moves].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    if (glob === from) return [to];
    if (glob.startsWith(`${from}/`)) return [to + glob.slice(from.length)];
  }
  const esc = docsRootName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^${esc}/(${LEGACY_FOLDERS.join("|")})(?:/(.*))?$`).exec(glob);
  if (!m) {
    // A retired folder named in a shape not respelled here — a negation (`!docs/projects/…`), a
    // leading `./` or wildcard (`**/docs/projects/…`), a brace list (`docs/{projects,backlog}/…`):
    // it would go stale silently, so it is named and left for a hand edit.
    const legacy = LEGACY_FOLDERS.join("|");
    const named = new RegExp(`(?:^[!./]*|/)${esc}/(?:\\{[^}]*\\b(?:${legacy})\\b[^}]*\\}|(?:${legacy}))(?:/|$)`);
    return named.test(glob) ? null : [glob];
  }
  const folder = m[1] as string;
  const rest = m[2] ?? "";
  const segs = rest.split("/");
  const archivedOnly = segs[0] === "_archive";
  const entity = archivedOnly ? 1 : 0;
  // A wildcard where the entity would be, and something inside the entity after it.
  if (!GLOB_CHARS.test(segs[entity] ?? "") || segs.length <= entity + 1) return null;
  const categories = folder === "projects" ? ["features", "items"] : [FOLDER_SUCCESSOR[folder] as string];
  const out = categories.map((c) => `${docsRootName}/${c}/${rest}`);
  const froms = moves.map(([f]) => f);
  const leaves = moves.filter(([f]) => !froms.some((o) => o.startsWith(`${f}/`)));
  const matches = (g: string, p: string) => new Bun.Glob(g).match(p);
  const archived = `${docsRootName}/${folder}/_archive/${rest}`;
  const reachesArchive = !archivedOnly && segs[0] !== "**" && leaves.some(([f]) => matches(archived, f));
  if (reachesArchive) out.push(...categories.map((c) => `${docsRootName}/${c}/_archive/${rest}`));
  const matched = leaves.filter(([f]) => matches(glob, f) || (reachesArchive && matches(archived, f)));
  if (matched.some(([, t]) => !out.some((g) => matches(g, t)))) return null;
  return out;
}

/**
 * The `lint` keys after the migration. PURE. The adopter's own entries and
 * their order are kept; only these change:
 *   workbench — the retired folders out; `features`, `items`, `cycles` in (appended if missing)
 *   durable   — `memories`/`lessons-learned` stay only if the folder is still there (D11)
 *   types     — each kept retired library folder declared, so it stays lintable
 *   skip      — `_archive` out: the archive is linted now
 *   exclude   — globs naming moved paths respelled
 *   scopes    — `[]` added when absent
 * Returns the new keys and one line per change.
 */
export function patchLintArrays(
  lint: LintKeys,
  f: { moves: Array<[string, string]>; keptLibrary: string[]; docsRootName: string }
): { lint: LintKeys; changes: string[]; notes: string[] } {
  const out: LintKeys = { ...lint };
  const changes: string[] = [];
  /** What the adopter must look at: a glob this function would not guess at. */
  const notes: string[] = [];
  const legacy = new Set(LEGACY_FOLDERS);

  const wb = [...(lint.workbench ?? [])];
  const removedWb = wb.filter((w) => legacy.has(w));
  const nextWb = wb.filter((w) => !legacy.has(w));
  const addedWb = ["features", "items", "cycles"].filter((w) => !nextWb.includes(w));
  nextWb.push(...addedWb);
  if (removedWb.length || addedWb.length) {
    out.workbench = nextWb;
    changes.push(
      `lint.workbench: ${[...removedWb.map((w) => `-${w}`), ...addedWb.map((w) => `+${w}`)].join(" ")}`
    );
  }

  if (lint.durable) {
    const gone = lint.durable.filter((d) => d in KEPT_LIBRARY && !f.keptLibrary.includes(d));
    if (gone.length) {
      out.durable = lint.durable.filter((d) => !gone.includes(d));
      changes.push(`lint.durable: ${gone.map((d) => `-${d}`).join(" ")} (the folder is not there)`);
    }
  }
  const durableNow = (out.durable ?? lint.durable ?? []) as string[];
  const keptMissing = f.keptLibrary.filter((k) => !durableNow.includes(k));
  if (keptMissing.length) {
    out.durable = [...durableNow, ...keptMissing];
    changes.push(`lint.durable: ${keptMissing.map((d) => `+${d}`).join(" ")} (kept, D11)`);
  }

  const types = { ...(lint.types ?? {}) };
  const addedTypes = f.keptLibrary.filter((k) => types[k] === undefined);
  for (const k of addedTypes) types[k] = KEPT_LIBRARY[k] as string;
  if (addedTypes.length) {
    out.types = types;
    changes.push(`lint.types: ${addedTypes.map((k) => `+${k} → ${KEPT_LIBRARY[k]}`).join(", ")} (kept and lintable, D11)`);
  }

  if (lint.skip?.includes("_archive")) {
    out.skip = lint.skip.filter((s) => s !== "_archive");
    changes.push("lint.skip: -_archive (the archive is linted now)");
  }

  if (lint.exclude) {
    const each = lint.exclude.map((g) => {
      const r = rewriteExcludeGlob(g, f.moves, f.docsRootName);
      if (r === null)
        notes.push(
          `lint.exclude: \`${g}\` names a retired folder, and no respelling of it is certain (a whole retired folder, a path nothing moved, ` +
            `files it matched that a category-wide glob would miss, or a negation, brace list or leading wildcard) — left as written; respell it by hand`
        );
      return r ?? [g];
    });
    const next = each.flat();
    if (each.some((r, i) => r.length !== 1 || r[0] !== lint.exclude?.[i])) {
      out.exclude = next;
      lint.exclude.forEach((g, i) => {
        const r = each[i] as string[];
        if (r.length !== 1 || r[0] !== g) changes.push(`lint.exclude: ${g} → ${r.join(", ")}`);
      });
    }
  }

  if (!Array.isArray(lint.scopes)) {
    out.scopes = [];
    changes.push("lint.scopes: [] added (declare the names `scope:` may take)");
  }
  return { lint: out, changes, notes };
}

/** The index just past the JSON string opening at `from`. */
function endOfJsonString(json: string, from: number): number {
  let j = from + 1;
  while (j < json.length) {
    if (json[j] === "\\") j += 2;
    else if (json[j] === '"') return j + 1;
    else j++;
  }
  return json.length;
}

/** The index just past the JSON value starting at `from`. */
function endOfJsonValue(json: string, from: number): number {
  const c = json[from];
  if (c === '"') return endOfJsonString(json, from);
  if (c === "{" || c === "[") {
    let depth = 0;
    let i = from;
    while (i < json.length) {
      const ch = json[i];
      if (ch === '"') {
        i = endOfJsonString(json, i);
        continue;
      }
      if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) return i + 1;
      }
      i++;
    }
    return json.length;
  }
  return from + ((/^[^\s,}\]]*/.exec(json.slice(from)) as RegExpExecArray)[0].length);
}

/** Members of the object whose `{` is at `open`: key → value span, and where it closes. */
function objectMembers(json: string, open: number): { members: Map<string, [number, number]>; close: number } {
  const members = new Map<string, [number, number]>();
  let i = open + 1;
  while (i < json.length) {
    const ws = /^[\s,]*/.exec(json.slice(i)) as RegExpExecArray;
    i += ws[0].length;
    if (json[i] === "}") return { members, close: i };
    if (json[i] !== '"') break;
    const kEnd = endOfJsonString(json, i);
    const key = JSON.parse(json.slice(i, kEnd)) as string;
    const colon = /^\s*:\s*/.exec(json.slice(kEnd)) as RegExpExecArray;
    const vStart = kEnd + colon[0].length;
    const vEnd = endOfJsonValue(json, vStart);
    members.set(key, [vStart, vEnd]);
    i = vEnd;
  }
  return { members, close: json.length };
}

/** `value` rendered the way `old` was: on one line if it was, else one entry per line. */
function renderLike(value: unknown, old: string | null, indent: string, depthIndent: string): string {
  const oneLine = old === null ? !(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) : !old.includes("\n");
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (oneLine) return `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
    return `[\n${value.map((v) => `${depthIndent}${indent}${JSON.stringify(v)}`).join(",\n")}\n${depthIndent}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    if (oneLine) return `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} }`;
    return `{\n${entries.map(([k, v]) => `${depthIndent}${indent}${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n")}\n${depthIndent}}`;
  }
  return JSON.stringify(value);
}

/**
 * `json` with the `lint` object's keys set to `next`'s values, in the file's
 * own text: a changed key's value replaced in its own style, a new key
 * appended before `lint`'s closing brace, every other byte untouched. `null`
 * when the text cannot be patched that way (no top-level `lint` object); the
 * caller parses the result before trusting it.
 */
export function patchLintText(json: string, next: LintKeys): string | null {
  const top = objectMembers(json, json.indexOf("{"));
  const lintSpan = top.members.get("lint");
  if (!lintSpan || json[lintSpan[0]] !== "{") return null;
  const lintObj = objectMembers(json, lintSpan[0]);
  const indent = /\n([ \t]+)"/.exec(json)?.[1] ?? "  ";
  const memberIndent = /\n([ \t]+)"[^"]+"\s*:/.exec(json.slice(lintSpan[0], lintSpan[1]))?.[1] ?? indent + indent;
  const current = JSON.parse(json.slice(lintSpan[0], lintSpan[1])) as LintKeys;
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const added: string[] = [];
  for (const [k, v] of Object.entries(next)) {
    if (Bun.deepEquals(current[k], v, true)) continue;
    const span = lintObj.members.get(k);
    if (span) edits.push({ start: span[0], end: span[1], text: renderLike(v, json.slice(span[0], span[1]), indent, memberIndent) });
    else added.push(`${memberIndent}${JSON.stringify(k)}: ${renderLike(v, null, indent, memberIndent)}`);
  }
  if (added.length) {
    let end = lintObj.close;
    while (end > lintSpan[0] && /\s/.test(json[end - 1] as string)) end--;
    const hasMembers = lintObj.members.size > 0;
    const closeIndent = /\n([ \t]*)$/.exec(json.slice(0, lintObj.close))?.[1] ?? indent;
    edits.push({ start: end, end: lintObj.close, text: `${hasMembers ? "," : ""}\n${added.join(",\n")}\n${closeIndent}` });
  }
  let out = json;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

// =======================================================================================
// The move map, built over an in-memory file list
// =======================================================================================

export type MoveKind = "feature" | "born-item" | "backlog" | "fragment" | "research" | "report";

export interface EntityMove {
  kind: MoveKind;
  /** Docs-relative. A folder for `feature` and `born-item`; a file otherwise. */
  from: string;
  /** Docs-relative. A folder for `feature`, `born-item` and `research`; a file otherwise. */
  to: string;
  /** The legacy state, and the state it maps to (entities only). */
  was?: string | null;
  lifecycle?: string;
  archived: boolean;
  /** Something a person should read: a state that needs review, an archive that could not stay archived. */
  note?: string;
}

export interface MovePlan {
  moves: EntityMove[];
  /** Judgment steps the run will not take for the adopter. Any one stops the preflight. */
  blockers: string[];
  /** Files in the legacy folders this plan accounts for (moved, or removed as the scaffold's). */
  handled: Set<string>;
  /** Legacy files that are not documents, removed: `.gitkeep`, `.DS_Store`. */
  junk: string[];
  /**
   * `[from, to]`: a template of the adopter's own — one the scaffold never
   * shipped — moved as it is into `TEMPLATES/`, where 9.0.0 keeps every template.
   */
  ownTemplates: Array<[string, string]>;
}

const isJunk = (rel: string) => basename(rel) === ".gitkeep" || basename(rel) === ".DS_Store";

/**
 * Every conversion the retired folders need, and every judgment blocker, from
 * a list of docs-relative file paths and a reader. PURE over its inputs.
 */
export function buildMoveMap(files: string[], textOf: (rel: string) => string | null): MovePlan {
  const set = new Set(files);
  const handled = new Set<string>();
  const junk: string[] = [];
  const blockers: string[] = [];
  const moves: EntityMove[] = [];
  const fmOf = (rel: string) => splitFrontmatter(textOf(rel) ?? "").fm;
  const lifecycleOf = (rel: string) => {
    const fm = fmOf(rel);
    return fm === null ? null : fmGet(fm, "lifecycle");
  };
  const skipName = (rel: string) => {
    if (isJunk(rel)) {
      junk.push(rel);
      handled.add(rel);
      return true;
    }
    if (rel in RETIRED_READMES || rel in RETIRED_TEMPLATES || rel in TEMPLATE_RENAMES) return true;
    return false;
  };

  // --- claims on a slug: items and features each form one namespace, live and archived together
  interface Claim { key: string; slug: string; date: string | null; fixed: boolean }
  const itemClaims: Claim[] = [];
  const featureClaims: Claim[] = [];
  for (const rel of files) {
    const p = rel.split("/");
    if (p[0] === "items" || p[0] === "features") {
      const name = p[1] === "_archive" ? p[2] : p[1];
      if (!name || name === "README.md" || name === ".gitkeep" || (p[1] === "_archive" && p.length === 2)) continue;
      const slug = name.replace(/\.md$/, "");
      const list = p[0] === "items" ? itemClaims : featureClaims;
      if (!list.some((c) => c.key === `existing:${p[0]}/${slug}`))
        list.push({ key: `existing:${p[0]}/${slug}`, slug, date: null, fixed: true });
    }
  }

  // --- projects/
  const projectFolders = new Map<string, boolean>(); // folder → archived
  for (const rel of files) {
    if (!rel.startsWith("projects/") || skipName(rel)) continue;
    const p = rel.split("/");
    if (p[1] === "TEMPLATES") continue; // the seeds phase handles every template there
    if (p[1] === "_archive" && p.length >= 4) projectFolders.set(`projects/_archive/${p[2]}`, true);
    else if (p[1] !== "_archive" && p.length >= 3) projectFolders.set(`projects/${p[1]}`, false);
  }
  const pending: Array<{ move: EntityMove; claim?: Claim; slug: string }> = [];
  for (const [folder, archived] of [...projectFolders].sort()) {
    for (const rel of files) if (rel.startsWith(`${folder}/`)) handled.add(rel);
    const name = basename(folder);
    const planActive = set.has(`${folder}/plan.md`) && lifecycleOf(`${folder}/plan.md`) === "active";
    if (set.has(`${folder}/proposal.md`)) {
      const was = lifecycleOf(`${folder}/proposal.md`);
      const lc = featureLifecycle(was, planActive, archived);
      if (lc === null) {
        blockers.push(`${folder}/proposal.md — lifecycle ${JSON.stringify(was)} has no feature state this migration can map. Set it to one of draft, approved, deferred, implemented, withdrawn or superseded.`);
        continue;
      }
      const stays = archived && TERMINAL.has(lc);
      const move: EntityMove = {
        kind: "feature", from: folder, to: "", was, lifecycle: lc, archived,
        ...(archived && !stays ? { note: `archived, but ${lc} is not done or dropped, so it goes to the live folder` } : {}),
      };
      const claim: Claim = { key: folder, slug: name, date: null, fixed: false };
      featureClaims.push(claim);
      pending.push({ move, claim, slug: name });
    } else {
      const lc = archived ? "done" : bornItemLifecycle(planActive);
      const move: EntityMove = { kind: "born-item", from: folder, to: "", was: null, lifecycle: lc, archived };
      const claim: Claim = { key: folder, slug: name, date: null, fixed: false };
      itemClaims.push(claim);
      pending.push({ move, claim, slug: name });
    }
  }

  // --- backlog/, fragments/, investigations/: one file each
  const singles: Array<[string, "backlog" | "fragment" | "research"]> = [
    ["backlog", "backlog"],
    ["fragments", "fragment"],
    ["investigations", "research"],
  ];
  for (const [folder, kind] of singles) {
    for (const rel of files) {
      if (!rel.startsWith(`${folder}/`) || skipName(rel)) continue;
      const p = rel.split("/");
      const archived = p[1] === "_archive";
      // A template of the adopter's own is left unhandled: a blocker below.
      if (!rel.endsWith(".md") || p.length !== (archived ? 3 : 2) || isSeeded(rel)) continue;
      handled.add(rel);
      const was = lifecycleOf(rel);
      const lc =
        kind === "backlog" ? backlogLifecycle(was, archived)
        : kind === "fragment" ? fragmentLifecycle(was, archived)
        : researchLifecycle(was, archived);
      if (lc === null) {
        blockers.push(`${rel} — lifecycle ${JSON.stringify(was)} has no item state this migration can map.`);
        continue;
      }
      const { slug, date } = slugOf(basename(rel), kind === "research" ? "investigation" : "backlog");
      const stays = archived && TERMINAL.has(lc);
      const note =
        was === "promoted" ? "promoted → dropped: listed for review — the work it was promoted into is its successor"
        : archived && !stays ? `archived, but ${lc} is not done or dropped, so it goes to the live folder`
        : undefined;
      const move: EntityMove = { kind, from: rel, to: "", was, lifecycle: lc, archived, ...(note ? { note } : {}) };
      const claim: Claim = { key: rel, slug, date, fixed: false };
      itemClaims.push(claim);
      pending.push({ move, claim, slug });
    }
  }

  // --- slugs: a collision keeps the date; what still collides is a judgment step
  const assign = (claims: Claim[]): Map<string, string> => {
    const out = new Map<string, string>();
    const bySlug = new Map<string, Claim[]>();
    for (const c of claims) bySlug.set(c.slug, [...(bySlug.get(c.slug) ?? []), c]);
    for (const [slug, cs] of bySlug)
      for (const c of cs) out.set(c.key, cs.length > 1 && c.date ? `${c.date}-${slug}` : slug);
    const seen = new Map<string, string[]>();
    for (const [k, v] of out) seen.set(v, [...(seen.get(v) ?? []), k]);
    for (const [v, keys] of seen)
      if (keys.length > 1)
        blockers.push(
          `slug \`${v}\` is claimed by ${keys.map((k) => (k.startsWith("existing:") ? k.slice(9) : k)).join(" and ")} — rename one before the run, so each entity has a slug of its own`
        );
    return out;
  };
  const itemSlugs = assign(itemClaims);
  const featureSlugs = assign(featureClaims);

  for (const { move, claim } of pending) {
    const archiveIt = move.archived && TERMINAL.has(move.lifecycle as string);
    if (move.kind === "feature") {
      const s = featureSlugs.get(claim!.key) as string;
      move.to = archiveIt ? `features/_archive/${s}` : `features/${s}`;
    } else {
      const s = itemSlugs.get(claim!.key) as string;
      const base = archiveIt ? "items/_archive" : "items";
      move.to = move.kind === "backlog" || move.kind === "fragment" ? `${base}/${s}.md` : `${base}/${s}`;
    }
    moves.push(move);
  }

  // --- reports/: owned by the one research item linked with it
  const research = moves.filter((m) => m.kind === "research");
  for (const rel of files) {
    if (!rel.startsWith("reports/") || skipName(rel)) continue;
    const p = rel.split("/");
    const archived = p[1] === "_archive";
    if (!rel.endsWith(".md") || p.length !== (archived ? 3 : 2) || isSeeded(rel)) continue;
    handled.add(rel);
    const text = textOf(rel) ?? "";
    const out = new Set(linkTargets(text).map((l) => resolveRel(rel, l)));
    // The report's own link decides: a report that links to exactly one investigation
    // belongs to it, whatever else links to the report. Otherwise, any link either way.
    const linkedFrom = research.filter((r) => out.has(r.from));
    const owners =
      linkedFrom.length === 1
        ? linkedFrom
        : research.filter((r) => out.has(r.from) || linkTargets(textOf(r.from) ?? "").some((l) => resolveRel(r.from, l) === rel));
    if (owners.length === 1) {
      moves.push({ kind: "report", from: rel, to: `${owners[0]!.to}/reports/${basename(rel)}`, archived });
      continue;
    }
    blockers.push(
      owners.length === 0
        ? `${rel} — a report with no owner: no investigation is linked with it — none links to it, and it links to none; links from other documents do not decide. Add a link from the report to the investigation it belongs to, or move it into the owning project's reports/ folder (docs/projects/<slug>/reports/) with its type set to \`artifact\` — the v2.10 lint types everything there as an artifact — and the run makes it a report again.`
        : `${rel} — a report with ${owners.length} possible owners (${owners.map((o) => o.from).join(", ")}). Add a link from the report to the investigation it belongs to — the report's own link decides — or move it into the owning project's reports/ folder.`
    );
  }

  // --- briefs/: always a judgment step
  const features = moves.filter((m) => m.kind === "feature");
  for (const rel of files) {
    if (!rel.startsWith("briefs/") || skipName(rel) || rel.startsWith("briefs/TEMPLATES/")) continue;
    const p = rel.split("/");
    const archived = p[1] === "_archive";
    if (!rel.endsWith(".md") || p.length !== (archived ? 3 : 2) || isSeeded(rel)) continue;
    handled.add(rel);
    const out = new Set(linkTargets(textOf(rel) ?? "").map((l) => resolveRel(rel, l)));
    const linked = features.filter((f) => [...out].some((t) => t === f.from || t.startsWith(`${f.from}/`)));
    blockers.push(
      `${rel} — a brief. Move it into its owner's artifacts/ folder${linked.length === 1 ? ` (suggested: the one project it links to, ${linked[0]!.from}/artifacts/)` : ""}, or delete it. The run turns an artifact's type to \`artifact\`.`
    );
  }

  // --- a template the scaffold never shipped is the adopter's own. Every template lives in
  // TEMPLATES/ from 9.0.0, so that is where it goes, as it is — no judgment in that. Only a
  // name already taken there, or a copy in an archive, is left to the adopter. The scaffold's
  // own templates are the seeds phase's (`planTemplates`); an earlier migration may have
  // recorded one of these by its name, which is why the record is not what decides.
  const ownTemplates: Array<[string, string]> = [];
  // Compared without case: on a case-insensitive filesystem (macOS, Windows) `plan.template.md`
  // and `PLAN.template.md` are one file, and a clash found only mid-phase 8 stops a half-done run.
  const fold = (x: string) => x.toLowerCase();
  const scaffoldNamed = new Map([...SCAFFOLD_TEMPLATES].map((t) => [fold(t), t]));
  const presentNamed = new Map(files.map((f) => [fold(f), f]));
  const goesTo = new Map<string, { rel: string; to: string }>();
  for (const rel of files) {
    const top = rel.split("/")[0] as string;
    if (!LEGACY_FOLDERS.includes(top) || handled.has(rel) || !isSeeded(rel)) continue;
    if (rel in RETIRED_TEMPLATES || rel in TEMPLATE_RENAMES || isJunk(rel)) continue;
    handled.add(rel);
    const p = rel.split("/");
    if (p.includes("_archive")) {
      blockers.push(`${rel} — a template of yours, in an archive: the scaffold never shipped it. Keep it outside ${top}/, or delete it, before the run.`);
      continue;
    }
    const at = p.lastIndexOf("TEMPLATES");
    const to = `TEMPLATES/${at === -1 ? basename(rel) : p.slice(at + 1).join("/")}`;
    const other = goesTo.get(fold(to));
    const [clash, named] = scaffoldNamed.has(fold(to))
      ? ["is the scaffold's own", scaffoldNamed.get(fold(to)) as string]
      : presentNamed.has(fold(to))
        ? ["is already there", presentNamed.get(fold(to)) as string]
        : other
          ? [`is where ${other.rel} goes`, other.to]
          : [null, to];
    if (clash) {
      const caseOnly = named !== to;
      const what =
        clash === "is the scaffold's own" && caseOnly ? `is the scaffold's own ${named}`
        : clash === "is already there" && caseOnly ? `is already there as ${named}`
        : clash;
      blockers.push(
        `${rel} — a template of yours: the scaffold never shipped it. It would move to ${to}, which ${what}` +
          (caseOnly ? " — the names differ only in case, and on a case-insensitive filesystem (macOS, Windows) they are one file" : "") +
          `. Rename it, or keep it outside ${top}/ (or delete it), before the run.`
      );
      continue;
    }
    goesTo.set(fold(to), { rel, to });
    ownTemplates.push([rel, to]);
  }
  ownTemplates.sort((a, b) => (a[0] < b[0] ? -1 : 1));

  // --- anything else in a retired folder is a file this migration cannot place
  for (const rel of files) {
    const top = rel.split("/")[0] as string;
    if (!LEGACY_FOLDERS.includes(top) || handled.has(rel)) continue;
    if (rel in RETIRED_READMES || rel in RETIRED_TEMPLATES || rel in TEMPLATE_RENAMES) continue;
    blockers.push(`${rel} — not a document this migration knows where to put. Move it out of ${top}/ (or delete it) before the run.`);
  }

  return { moves, blockers, handled, junk, ownTemplates };
}

/** What the seeds phase does with the templates that moved or retired. PURE over its inputs. */
export interface TemplatePlan {
  /** `[from, to]`: a file to move (the destination is free). */
  moves: Array<[string, string]>;
  /** `[from, to]`: every record to carry, whether or not a file moves. */
  records: Array<[string, string]>;
  /** Scaffold templates removed: untouched since the scaffold recorded them. */
  removals: string[];
  /** Records dropped: the template is gone (removed here, or before). */
  dropped: string[];
  blockers: string[];
}

export function planTemplates(present: (rel: string) => boolean, verdict: (rel: string) => Verdict, recorded: (rel: string) => boolean): TemplatePlan {
  const out: TemplatePlan = { moves: [], records: [], removals: [], dropped: [], blockers: [] };
  const retire = (rel: string, why: string) => {
    if (!present(rel)) {
      if (recorded(rel)) out.dropped.push(rel);
      return;
    }
    if (verdict(rel) === "update") {
      out.removals.push(rel);
      out.dropped.push(rel);
    } else
      out.blockers.push(
        `${rel} — ${why}, and you have edited it (or it was never recorded), so it is yours: move it out of its retired folder, or delete it, before the run.`
      );
  };
  for (const [from, to] of Object.entries(TEMPLATE_RENAMES)) {
    out.records.push([from, to]);
    if (!present(from)) continue;
    if (present(to)) retire(from, `a template the scaffold moved to ${to}, which is already there`);
    else out.moves.push([from, to]);
  }
  for (const rel of Object.keys(RETIRED_TEMPLATES)) retire(rel, "the form for a type 9.0.0 retires");
  return out;
}

/** A cycle's `scope:` entry → the legacy path it names (a file or a folder), or null. */
export function scopeEntryPath(entry: string): string | null {
  const m = /^(backlog|fragments?|investigations?|projects?)\/(.+)$/.exec(entry.trim());
  if (!m) return null;
  const folder = { backlog: "backlog", fragment: "fragments", fragments: "fragments", investigation: "investigations", investigations: "investigations", project: "projects", projects: "projects" }[m[1] as string] as string;
  return `${folder}/${(m[2] as string).replace(/\.md$/, "")}`;
}

export interface CyclePlan {
  /** Cycle file → its new text (`scope:` removed; a feature added to the Scope section when missing). */
  texts: Map<string, string>;
  /** A moved item's `from` → the cycle slug it carries in `cycle:`. */
  itemCycle: Map<string, string>;
  notes: string[];
}

/**
 * `scope:` on cycles is retired: membership moves onto the items (`cycle:`), a
 * feature — which has no `cycle:` — is listed in the cycle's Scope section,
 * and the key is removed. PURE over its inputs.
 */
export function planCycles(files: string[], textOf: (rel: string) => string | null, moves: EntityMove[]): CyclePlan {
  const texts = new Map<string, string>();
  const itemCycle = new Map<string, string>();
  const notes: string[] = [];
  const claimedBy = new Map<string, { slug: string; active: boolean }>();
  const cycles = files.filter((r) => /^cycles\/[^/]+\.md$/.test(r) && !isSeeded(r) && basename(r) !== "README.md").sort();
  for (const rel of cycles) {
    const text = textOf(rel) ?? "";
    const { fm, body } = splitFrontmatter(text);
    if (fm === null || !keyRange(fm.split("\n"), "scope")) continue;
    const slug = basename(rel, ".md");
    const active = fmGet(fm, "lifecycle") === "active";
    let newBody = body;
    for (const entry of fmList(fm, "scope")) {
      const path = scopeEntryPath(entry);
      const hit =
        path === null ? undefined
        : moves.find((m) => m.from === path || m.from === `${path}.md` || m.from === path.replace(/^(\w+)\//, "$1/_archive/") || m.from === `${path.replace(/^(\w+)\//, "$1/_archive/")}.md`);
      if (!hit) {
        notes.push(`${rel}: scope entry \`${entry}\` names nothing this run moves — dropped with the key; the cycle's body is unchanged`);
        continue;
      }
      if (hit.kind === "feature") {
        const listed = linkTargets(body).some((l) => {
          const t = resolveRel(rel, l);
          return t === hit.from || t.startsWith(`${hit.from}/`);
        });
        if (listed) notes.push(`${rel}: \`${entry}\` is a feature, which carries no \`cycle:\` — already listed in the cycle's Scope section`);
        else {
          newBody = addToScope(newBody, `- [${hit.from.split("/").pop()}](../${hit.from}/proposal.md)`);
          notes.push(`${rel}: \`${entry}\` is a feature, which carries no \`cycle:\` — added to the cycle's Scope section`);
        }
        if (active) notes.push(`${rel} is active and names ${entry} — file the items that carry its work with \`cycle: ${slug}\` (a judgment step)`);
        continue;
      }
      const prior = claimedBy.get(hit.from);
      if (prior && (prior.active || !active)) {
        notes.push(`${hit.from} is in the scope of both ${prior.slug} and ${slug}; it carries \`cycle: ${prior.slug}\``);
        continue;
      }
      if (prior) notes.push(`${hit.from} is in the scope of both ${prior.slug} and ${slug}; it carries \`cycle: ${slug}\`, the active one`);
      claimedBy.set(hit.from, { slug, active });
      itemCycle.set(hit.from, slug);
    }
    texts.set(rel, joinFrontmatter(fmRemove(fm, "scope"), newBody));
  }
  return { texts, itemCycle, notes };
}

/** `body` with `line` appended to its `## Scope` section (a section is added at the end when there is none). */
export function addToScope(body: string, line: string): string {
  const lines = body.split("\n");
  const at = lines.findIndex((l) => /^##\s+Scope\s*$/.test(l));
  if (at === -1) return `${body.replace(/\n*$/, "")}\n\n## Scope\n\n${line}\n`;
  let end = lines.findIndex((l, i) => i > at && /^##\s/.test(l));
  if (end === -1) end = lines.length;
  let last = end - 1;
  while (last > at && (lines[last] as string).trim() === "") last--;
  lines.splice(last + 1, 0, ...(last === at ? ["", line] : [line]));
  return lines.join("\n");
}

// =======================================================================================
// Reporting. Every phase says what it did; a failure throws and stops the run.
// =======================================================================================

class MigrationError extends Error {}

const say = (s: string) => console.log(s);
const step = (n: number, title: string) => say(`\n[${n}/${PHASES}] ${title}`);
const ok = (s: string) => say(`   ✓ ${s}`);
const note = (s: string) => say(`   · ${s}`);
const fail = (s: string): never => {
  throw new MigrationError(s);
};
const indented = (text: string) =>
  text
    .split("\n")
    .map((l) => `       ${l}`)
    .join("\n");

/** Every child gets `gitEnv()`: a `git` — or a `pdocs check` that spawns one — run
 *  from inside a commit hook must find the repository from its `cwd`. */
function run(cmd: string[], cwd: string): { code: number; stdout: string; stderr: string } {
  const p = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe", env: gitEnv() });
  return { code: p.exitCode ?? 1, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}

const have = (bin: string) => run(["sh", "-c", `command -v ${bin}`], ".").code === 0;

const fileHas = (abs: string, marker: string) => existsSync(abs) && readFileSync(abs, "utf8").includes(marker);

const sameBytes = (a: string, b: string) => existsSync(a) && existsSync(b) && hashOf(a) === hashOf(b);

/** Folders no walk descends into: version control's own, and installed dependencies. */
const NOT_WALKED = new Set([".git", ".hg", ".svn", "node_modules"]);

/** Every file under `dir`, relative to it, sorted. A NOT_WALKED folder is not walked. */
function filesIn(dir: string, out: string[] = [], base = dir): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (NOT_WALKED.has(entry.name)) continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) filesIn(abs, out, base);
    else if (entry.isFile()) out.push(relative(base, abs).split(sep).join("/"));
  }
  return out.sort();
}

export function docsVersionOf(readme: string): string | null {
  if (!existsSync(readme)) return null;
  return /^docs_version:\s*"([^"]+)"/m.exec(readFileSync(readme, "utf8"))?.[1] ?? null;
}

/**
 * Whether the root agent file points at the CLI: `update-project-docs` Step 6's
 * "Documentation CLI pointer" row, the same two patterns over AGENTS.md and
 * CLAUDE.md read as one stream. The test beside this file runs the row's own
 * shell check against the same cases and holds the two equal.
 */
export function rootPointsAtCli(root: string): boolean {
  const text = ["AGENTS.md", "CLAUDE.md"]
    .map((f) => join(root, f))
    .filter((f) => existsSync(f))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  return /pdocs(\/cli\.ts)? new/.test(text) && !/docs\/lint(\.test)?\.ts/.test(text);
}

/** `a` against `b` as release numbers, part by part: negative, zero or positive. Null when either is not `X.Y.Z`. */
export function compareReleases(a: string, b: string): number | null {
  const parse = (v: string) => (/^\d+\.\d+\.\d+$/.test(v) ? v.split(".").map(Number) : null);
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] as number) - (y[i] as number);
  return 0;
}

/**
 * The later of the tree's two version markers — `.project-docs.json` `version`
 * and `docs_version` in the docs README — and which one it came from. The later
 * one, because a run sets BOTH: either marker past the release it installs is a
 * marker the run would set back. Null when neither is an `X.Y.Z` release.
 */
export function treeRelease(configVersion: unknown, docsVersion: string | null): { version: string; from: string } | null {
  const found: Array<{ version: string; from: string }> = [];
  if (typeof configVersion === "string" && compareReleases(configVersion, configVersion) !== null)
    found.push({ version: configVersion, from: ".project-docs.json version" });
  if (docsVersion && compareReleases(docsVersion, docsVersion) !== null) found.push({ version: docsVersion, from: "docs_version" });
  return found.reduce<{ version: string; from: string } | null>((best, f) => (!best || (compareReleases(f.version, best.version) as number) > 0 ? f : best), null);
}

export function serialiseManifest(m: SeedManifest, before: string | null): string {
  const indent = (before && /^([ \t]+)"/m.exec(before)?.[1]) || "  ";
  const files: Record<string, string> = {};
  for (const k of Object.keys(m.files).sort()) files[k] = m.files[k] as string;
  return `${JSON.stringify({ version: m.version, files }, null, indent)}\n`;
}

// =======================================================================================
// `--respell`: retired paths outside the docs root, from the move record
// =======================================================================================

/**
 * `text` with every retired docs path it spells — `docs/projects/alpha/proposal.md`
 * in a code comment, `docs/backlog/` in a JSON config — respelled from `moves`
 * (repository-relative, old → new; a folder carries what is inside it), and
 * each hit by line. A path is only whole when nothing path-like touches it:
 * `docs/projects/alpha` is not a prefix of `docs/projects/alpha-two`, and
 * `mydocs/backlog` is not `docs/backlog`. A retired folder itself goes to its
 * successor; a retired path nothing moved is reported and left as written
 * (`to: null`). PURE.
 */
export function respellText(
  text: string,
  docsRootName: string,
  moves: ReadonlyMap<string, string>
): { text: string; hits: Array<{ line: number; from: string; to: string | null }> } {
  const esc = docsRootName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![A-Za-z0-9_-])${esc}/(?:${LEGACY_FOLDERS.join("|")})(?![A-Za-z0-9_-])(?:/[A-Za-z0-9._@+~-]*)*`, "g");
  const keys = [...moves.keys()].sort((a, b) => b.length - a.length);
  const hits: Array<{ line: number; from: string; to: string | null }> = [];
  const edits: Array<{ start: number; end: number; value: string }> = [];
  for (const m of text.matchAll(re)) {
    const from = m[0].replace(/\.+$/, "");
    const start = m.index as number;
    const slash = from.endsWith("/") ? "/" : "";
    const bare = slash ? from.slice(0, -1) : from;
    let to: string | null = null;
    const k = keys.find((key) => bare === key || bare.startsWith(`${key}/`));
    if (k !== undefined) to = (moves.get(k) as string) + bare.slice(k.length) + slash;
    else {
      const folder = bare.slice(docsRootName.length + 1);
      if (folder in FOLDER_SUCCESSOR) to = `${docsRootName}/${FOLDER_SUCCESSOR[folder]}${slash}`;
    }
    const line = text.slice(0, start).split("\n").length;
    hits.push({ line, from, to });
    if (to !== null && to !== from) edits.push({ start, end: start + from.length, value: to });
  }
  let out = text;
  for (const e of edits.reverse()) out = out.slice(0, e.start) + e.value + out.slice(e.end);
  return { text: out, hits };
}

/** Every regular text file a `--respell` argument names: the file, or every file under the folder. */
function respellFiles(ctx: Ctx, args: string[]): string[] {
  const out = new Set<string>();
  for (const arg of args) {
    const abs = resolve(arg);
    if (!existsSync(abs)) fail(`--respell: ${arg} does not exist.`);
    const all = statSync(abs).isDirectory() ? filesIn(abs).map((r) => join(abs, r)) : [abs];
    for (const f of all) {
      if (relative(realIfPossible(ctx.root), realIfPossible(f)).split(sep).some((part) => NOT_WALKED.has(part))) continue;
      const bytes = readFileSync(f);
      if (bytes.length > 5_000_000 || bytes.includes(0)) continue; // not text
      out.add(f);
    }
  }
  return [...out].sort();
}

/**
 * `--respell <path>...`: list every retired docs path the named files spell,
 * and what the move record respells it to; with `--write`, write those files
 * — and only those. The migration's link rewrite covers Markdown links; this
 * covers the rest (a code comment, `.anthill/`, a root DEV_KICKOFF.md).
 */
function respell(ctx: Ctx, args: string[], writeIt: boolean): void {
  if (!existsSync(ctx.movesPath))
    fail(
      `--respell: there is no move record at ${ctx.movesPath}. It is written when this migration first moves\n` +
        `   something in this repository, and kept after the run. Run the migration first, from this project's root (or pass --root).`
    );
  let rec: { docsRoot?: unknown; moves?: unknown };
  try {
    rec = JSON.parse(readFileSync(ctx.movesPath, "utf8"));
  } catch (e) {
    return fail(`--respell: the move record ${ctx.movesPath} is not valid JSON: ${(e as Error).message}`);
  }
  const docsRootName = typeof rec.docsRoot === "string" ? rec.docsRoot : ctx.docsRootName;
  const pairs = Array.isArray(rec.moves) ? (rec.moves as Array<[string, string]>) : [];
  const moves = new Map(pairs.map(([f, t]) => [`${docsRootName}/${f}`, `${docsRootName}/${t}`]));
  const files = respellFiles(ctx, args);
  let changed = 0;
  let respelled = 0;
  let left = 0;
  const lines: string[] = [];
  for (const f of files) {
    const before = readFileSync(f, "utf8");
    const { text, hits } = respellText(before, docsRootName, moves);
    if (hits.length === 0) continue;
    // Named from the real root: one reached through a symlink (/tmp, /var on macOS) would
    // otherwise name every file by a climb out and back in.
    const at = relative(realIfPossible(ctx.root), realIfPossible(f)).split(sep).join("/");
    for (const h of hits) {
      if (h.to === null) left++;
      else respelled++;
      lines.push(h.to === null ? `${at}:${h.line}: ${h.from} — left as written: nothing this migration moved is there` : `${at}:${h.line}: ${h.from} → ${h.to}`);
    }
    if (text !== before) {
      changed++;
      if (writeIt) writeFileSync(f, text);
    }
  }
  say(`Retired ${docsRootName}/ paths in the ${files.length} file(s) named, from the move record ${ctx.movesPath}:`);
  for (const l of lines) say(`   ${l}`);
  say(
    `\n${respelled} path(s) respelled in ${changed} file(s)${left ? `, ${left} left as written` : ""} — ` +
      (writeIt ? "written. Review the diff before you commit." : "nothing written. Read the list, then run the same command with --write.")
  );
}

// =======================================================================================
// Ignore files: a formatter's or linter's exclusions follow what moved
// =======================================================================================

/**
 * Ignore files in gitignore syntax the run respells, at the project root.
 * `.gitignore` is one: Prettier 3 reads it as an ignore file, and a folder git
 * ignored moves with its entity and would otherwise be committed from there.
 */
export const IGNORE_FILES = [".prettierignore", ".eslintignore", ".gitignore"];
/** Biome's config: JSON, so its glob strings are respelled in the file's own text. */
export const BIOME_FILES = ["biome.json", "biome.jsonc"];
/** Configs that are code, or carry globs in shapes too varied to rewrite safely: a retired path in one is named, never rewritten. */
const FLAG_ONLY_RE = /^(?:eslint\.config\.[cm]?[jt]s|\.eslintrc(?:\.(?:js|cjs|json|ya?ml))?|prettier\.config\.[cm]?[jt]s|\.prettierrc(?:\.(?:json5?|ya?ml|toml|[cm]?js|ts))?)$/;

const GLOB_CHARS = /[*?[\]{}\\]/;

/**
 * Whether `pattern` — repository-relative, anchored, no `!` — ignores `path`,
 * as gitignore reads it: the path itself, or any folder above it. `dirOnly` (a
 * trailing `/`) matches only a folder above it.
 */
export function ignoreMatches(pattern: string, dirOnly: boolean, path: string): boolean {
  const g = new Bun.Glob(pattern);
  const segs = path.split("/");
  for (let i = 1; i <= segs.length; i++) {
    if (dirOnly && i === segs.length) break;
    if (g.match(segs.slice(0, i).join("/"))) return true;
  }
  return false;
}

/**
 * `pattern` bound to the move `[from, to]`: the part of it that matched `from`
 * replaced by `to`, the rest kept. `docs/projects/*∕canon/` and the move
 * `docs/projects/alpha` → `docs/features/alpha` give `docs/features/alpha/canon/`.
 * `null` when the pattern cannot match `from` or anything under it.
 */
function bindPattern(pattern: string, from: string, to: string): string | null {
  const p = pattern.split("/");
  const f = from.split("/");
  for (let i = 0; i < f.length; i++) {
    if (i >= p.length) return to; // the pattern names a folder above `from`: all of it follows
    if (p[i] === "**") return `${to}/${p.slice(i).join("/")}`;
    if (!new Bun.Glob(p[i] as string).match(f[i] as string)) return null;
  }
  return p.length === f.length ? to : `${to}/${p.slice(f.length).join("/")}`;
}

/**
 * One ignore pattern — `.prettierignore` syntax, or a Biome glob — with every
 * retired path respelled from `moves` (repository-relative `[from, to]`, a
 * folder or a file, every file under a moved folder listed as well). PURE.
 *
 *   · a pattern naming no retired folder is returned as it is;
 *   · a path spelled out to (or into) something that moved follows it —
 *     `docs/projects/alpha/checkpoint/canon/` → `docs/features/alpha/checkpoint/canon/` —
 *     so long as the new spelling still ignores every moved file the old one did
 *     (`docs/projects/alpha/proposal.*` would miss `feature.md`: named instead);
 *   · a wildcard where the entity would be (`docs/projects/*∕canon/`), or the
 *     retired folder itself (`docs/projects/`), becomes one pattern per moved
 *     entity whose files it ignored, each spelled out: an entity may now sit in
 *     `features/` or `items/`, and `docs/features/*∕canon/` would also ignore
 *     every feature filed after the run;
 *   · with `wide` (`.gitignore`), a wildcard where the entity would be instead
 *     becomes one glob per category the retired folder's entities go to
 *     (`docs/features/*∕scratch/`, `docs/items/*∕scratch/`): what git ignores
 *     must stay ignored on every machine and for entities filed later, not only
 *     for the ones this checkout holds;
 *   · a `!` negation (Biome's `!!` too), a leading `/` or `./` and a trailing `/`
 *     are kept on every line it becomes.
 *
 * Returns the lines to write in its place, or `lines: null` and `why` when it
 * names a retired path this function will not guess at (a retired folder behind
 * a leading wildcard, a brace pattern, an escaped `\!` or `\#`, a pattern whose
 * files it cannot cover exactly, one that matched nothing the run moved): the
 * caller leaves it as written and names it.
 */
export function respellIgnorePattern(
  pattern: string,
  moves: ReadonlyArray<[string, string]>,
  docsRootName: string,
  o: { wide?: boolean } = {}
): { lines: string[] | null; why?: string } {
  const esc = docsRootName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const legacy = LEGACY_FOLDERS.join("|");
  const namesRetired = new RegExp(`(?:^|/)${esc}/(?:${legacy})(?:/|$)`);
  if (pattern.startsWith("\\"))
    return namesRetired.test(pattern.slice(1).replace(/^[!#]?(?:\.?\/)?/, "")) ? { lines: null, why: "an escaped pattern (`\\!`, `\\#`) naming a retired path" } : { lines: [pattern] };
  const m = /^(!{0,2})(\/|\.\/)?(.*?)(\/?)$/.exec(pattern) as RegExpExecArray;
  const [, neg = "", lead = "", body = "", trail = ""] = m;
  if (!new RegExp(`^${esc}/(?:${legacy})(?:/|$)`).test(body)) {
    if (namesRetired.test(body)) return { lines: null, why: "it names a retired folder behind a wildcard" };
    return { lines: [pattern] };
  }
  if (/[{}]/.test(body)) return { lines: null, why: "a brace pattern: gitignore reads `{` and `}` literally, so it is not respelled into several lines" };
  const segs = body.split("/");
  const firstGlob = segs.findIndex((s) => GLOB_CHARS.test(s));
  const literal = (firstGlob === -1 ? segs : segs.slice(0, firstGlob)).join("/");
  const dress = (p: string, dir: boolean) => `${neg}${lead}${p}${dir ? trail : ""}`;
  const froms = new Set(moves.map(([f]) => f));
  const isFile = (from: string) => ![...froms].some((o) => o.startsWith(`${from}/`));
  const leaves = moves.filter(([f]) => isFile(f));
  const dirOnly = trail === "/";
  const ignored = leaves.filter(([f]) => ignoreMatches(body, dirOnly, f));
  const missed = (pat: string, dir: boolean) => ignored.filter(([, t]) => !ignoreMatches(pat, dir, t)).length;

  // Spelled out to something that moved: it follows that move, longest first — if the
  // new spelling still ignores every moved file the old one did.
  const byLength = [...moves].sort((a, b) => b[0].length - a[0].length);
  const k = byLength.find(([from]) => literal === from || literal.startsWith(`${from}/`));
  if (k) {
    const next = k[1] + body.slice(k[0].length);
    const lost = missed(next, dirOnly);
    if (lost > 0) return { lines: null, why: `respelled to \`${next}\` it would no longer ignore ${lost} moved file(s) it ignored (a file the run renamed)` };
    return { lines: [dress(next, true)] };
  }

  // `.gitignore`: a wildcard where the entity would be goes category-wide.
  const atEntity = firstGlob === 2 || (firstGlob === 3 && segs[2] === "_archive");
  if (o.wide && atEntity) {
    const folder = segs[1] as string;
    const categories = folder === "projects" ? ["features", "items"] : [FOLDER_SUCCESSOR[folder] as string];
    const lines = categories.map((cat) => `${docsRootName}/${cat}${body.slice(`${docsRootName}/${folder}`.length)}`);
    const lost = ignored.filter(([, t]) => !lines.some((l) => ignoreMatches(l, dirOnly, t))).length;
    if (lost > 0) return { lines: null, why: `${lost} moved file(s) it ignored would not be ignored by the same glob under ${categories.join("/ or ")}/` };
    return { lines: lines.map((l) => dress(l, true)) };
  }
  if (o.wide)
    return literal === segs.slice(0, 2).join("/") && firstGlob === -1
      ? { lines: null, why: "it ignores a whole retired folder, and its successor holds far more than it did" }
      : { lines: null, why: "it names a retired path, and nothing the run moved matched it" };

  // A wildcard at or above the entity: bound to each move under the literal part,
  // shallowest first (then by name), keeping a binding only when it ignores a moved file the
  // pattern ignored that no earlier binding covers.
  if (ignored.length === 0) return { lines: null, why: "it names a retired path, and nothing the run moved matched it" };
  const uncovered = new Map(ignored.map(([f, t]) => [f, t]));
  const out: string[] = [];
  const under = [...moves].filter(([f]) => f.startsWith(`${literal}/`)).sort((a, b) => a[0].split("/").length - b[0].split("/").length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  for (const [from, to] of under) {
    if (uncovered.size === 0) break;
    const bound = bindPattern(body, from, to);
    if (bound === null) continue;
    // A folder-only pattern bound to a moved FILE itself names that file: no trailing `/`.
    const boundDir = dirOnly && !(bound === to && isFile(from));
    const covers = [...uncovered].filter(([, t]) => ignoreMatches(bound, boundDir, t));
    if (covers.length === 0) continue;
    for (const [f] of covers) uncovered.delete(f);
    out.push(dress(bound, boundDir));
  }
  if (uncovered.size > 0) return { lines: null, why: `${uncovered.size} file(s) it ignored could not be followed exactly` };
  return { lines: [...new Set(out)] };
}

export interface IgnoreRespell {
  /** The file's text after the pass; the input when nothing changed. */
  text: string;
  /** One line per pattern the pass changed: `line N: …`. */
  changes: string[];
  /** One line per pattern left as written that names a retired path: for a hand edit. */
  flags: string[];
}

/**
 * How a pass writes a respelled pattern:
 *   replace — the new lines in the old one's place (what the file will say once the run is done);
 *   add     — the new lines just after the old one, which stays: written BEFORE the first
 *             move, so whatever the old line protected is protected at both spellings through
 *             a stop mid-move. A new line already in the file is not added again;
 *   drop    — the old line removed, once nothing is left at the old path (phase 7). A new
 *             line missing from the file (taken out during a stop) is put back in its place.
 */
export type IgnoreMode = "replace" | "add" | "drop";

/**
 * An ignore file in gitignore syntax (`.prettierignore`, `.eslintignore`,
 * `.gitignore` — with `wide`) with each pattern that names a retired path
 * respelled by `respellIgnorePattern`, as `mode` says; a pattern that becomes
 * several lines keeps its position, so a later `!` negation still follows it.
 * Comments, blank lines and every other line are kept byte for byte. Each mode
 * is idempotent, and `add` then `drop` leaves what `replace` would. PURE.
 */
export function respellIgnoreText(
  text: string,
  moves: ReadonlyArray<[string, string]>,
  docsRootName: string,
  o: { wide?: boolean; mode?: IgnoreMode } = {}
): IgnoreRespell {
  const mode = o.mode ?? "replace";
  const changes: string[] = [];
  const flags: string[] = [];
  const bare = (raw: string) => raw.replace(/\r$/, "").replace(/(?<!\\)[ \t]+$/, "");
  const present = new Set(text.split("\n").map(bare));
  // `drop`: every new spelling goes where its old line stood, in order; a copy of it
  // elsewhere (phase 5's, just below, or one the adopter added) is taken out.
  const respelled = new Set<string>();
  if (mode === "drop")
    for (const raw of text.split("\n")) {
      const pat = bare(raw);
      if (pat === "" || pat.startsWith("#")) continue;
      const r = respellIgnorePattern(pat, moves, docsRootName, { wide: o.wide });
      if (r.lines && !(r.lines.length === 1 && r.lines[0] === pat)) for (const l of r.lines) respelled.add(l);
    }
  const emitted = new Set<string>();
  const out = text.split("\n").map((raw, i) => {
    const cr = raw.endsWith("\r") ? "\r" : "";
    const pat = bare(raw);
    if (pat === "" || pat.startsWith("#")) return raw;
    const r = respellIgnorePattern(pat, moves, docsRootName, { wide: o.wide });
    if (r.lines === null) {
      flags.push(`line ${i + 1}: \`${pat}\` — ${r.why}; left as written`);
      return raw;
    }
    if (r.lines.length === 1 && r.lines[0] === pat) return respelled.has(pat) ? null : raw;
    if (mode === "replace") {
      changes.push(`line ${i + 1}: ${pat} → ${r.lines.join(", ")}`);
      return r.lines.map((l) => l + cr).join("\n");
    }
    const missing = r.lines.filter((l) => !present.has(l));
    if (mode === "add") {
      if (missing.length === 0) return raw;
      changes.push(`line ${i + 1}: ${missing.join(", ")} added beside ${pat}`);
      for (const l of missing) present.add(l);
      return [raw, ...missing.map((l) => l + cr)].join("\n");
    }
    changes.push(`line ${i + 1}: ${pat} dropped — ${r.lines.join(", ")} ${r.lines.length > 1 ? "stand" : "stands"} in its place`);
    const here = r.lines.filter((l) => !emitted.has(l));
    for (const l of here) emitted.add(l);
    return here.length ? here.map((l) => l + cr).join("\n") : null;
  });
  return { text: out.filter((l): l is string => l !== null).join("\n"), changes, flags };
}

/** Every JSON string token in `text` outside comments: where it sits, its value, and whether it is an array element (not a key, not an object's value). */
function jsonStrings(text: string): Array<{ start: number; end: number; value: string; inArray: boolean }> {
  const out: Array<{ start: number; end: number; value: string; inArray: boolean }> = [];
  const stack: string[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i] as string;
    if (ch === "/" && text[i + 1] === "/") {
      const nl = text.indexOf("\n", i);
      i = nl === -1 ? text.length : nl;
    } else if (ch === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      i = close === -1 ? text.length : close + 2;
    } else if (ch === "[" || ch === "{") {
      stack.push(ch);
      i++;
    } else if (ch === "]" || ch === "}") {
      stack.pop();
      i++;
    } else if (ch === '"') {
      const end = endOfJsonString(text, i);
      let value: unknown = null;
      try {
        value = JSON.parse(text.slice(i, end));
      } catch {
        value = null;
      }
      if (typeof value === "string") out.push({ start: i, end, value, inArray: stack[stack.length - 1] === "[" });
      i = end;
    } else i++;
  }
  return out;
}

/** JSONC as JSON: comments and trailing commas out, strings untouched — to prove a rewrite still parses. */
export function jsoncToJson(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i] as string;
    if (ch === '"') {
      const end = endOfJsonString(text, i);
      out += text.slice(i, end);
      i = end;
    } else if (ch === "/" && text[i + 1] === "/") {
      const nl = text.indexOf("\n", i);
      i = nl === -1 ? text.length : nl;
    } else if (ch === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      i = close === -1 ? text.length : close + 2;
    } else {
      out += ch;
      i++;
    }
  }
  return out.replace(/,(\s*[\]}])/g, "$1");
}

/**
 * A Biome config (`biome.json`, `biome.jsonc`) with every glob string that names
 * a retired path respelled in the file's own text — `files.ignore`/`include`
 * (v1), `files.includes` with its `!` negations (v2), an override's — and every
 * other byte kept, in the three modes of `respellIgnoreText`. Only an array
 * element may become several strings (or be dropped); a string that is an
 * object's value is respelled only to a single string, and named otherwise.
 * Comments are skipped, never read as strings. PURE.
 */
export function respellBiomeText(
  text: string,
  moves: ReadonlyArray<[string, string]>,
  docsRootName: string,
  o: { mode?: IgnoreMode } = {}
): IgnoreRespell {
  const mode = o.mode ?? "replace";
  const changes: string[] = [];
  const flags: string[] = [];
  const edits: Array<{ start: number; end: number; value: string }> = [];
  const tokens = jsonStrings(text);
  const present = new Set(tokens.filter((t) => t.inArray).map((t) => t.value));
  for (const t of tokens) {
    // A key is followed by `:`; it is not a glob.
    if (/^\s*:/.test(text.slice(t.end))) continue;
    const r = respellIgnorePattern(t.value, moves, docsRootName);
    const line = text.slice(0, t.start).split("\n").length;
    if (r.lines === null) {
      flags.push(`line ${line}: \`${t.value}\` — ${r.why}; left as written`);
      continue;
    }
    if (r.lines.length === 1 && r.lines[0] === t.value) continue;
    const quote = (ls: string[]) => ls.map((l) => JSON.stringify(l)).join(", ");
    if (!t.inArray) {
      if (r.lines.length > 1) flags.push(`line ${line}: \`${t.value}\` — becomes ${r.lines.join(", ")}, and it is not in a list to hold several; left as written`);
      else if (mode !== "add") {
        changes.push(`line ${line}: ${t.value} → ${r.lines[0]}`);
        edits.push({ start: t.start, end: t.end, value: quote(r.lines) });
      }
      continue;
    }
    if (mode === "replace") {
      changes.push(`line ${line}: ${t.value} → ${r.lines.join(", ")}`);
      edits.push({ start: t.start, end: t.end, value: quote(r.lines) });
      continue;
    }
    const missing = r.lines.filter((l) => !present.has(l));
    for (const l of missing) present.add(l);
    if (mode === "add") {
      if (missing.length === 0) continue;
      changes.push(`line ${line}: ${missing.join(", ")} added beside ${t.value}`);
      edits.push({ start: t.start, end: t.end, value: quote([t.value, ...missing]) });
      continue;
    }
    changes.push(`line ${line}: ${t.value} dropped — ${r.lines.join(", ")} ${r.lines.length > 1 ? "stand" : "stands"} in its place`);
    if (missing.length) edits.push({ start: t.start, end: t.end, value: quote(missing) });
    else {
      // The element and one comma beside it: the one after, else the one before.
      const after = /^\s*,[ \t]*/.exec(text.slice(t.end));
      if (after) edits.push({ start: t.start, end: t.end + after[0].length, value: "" });
      else {
        const before = /,\s*$/.exec(text.slice(0, t.start));
        edits.push({ start: before ? t.start - before[0].length : t.start, end: t.end, value: "" });
      }
    }
  }
  let out = text;
  for (const e of edits.sort((a, b) => a.start - b.start).reverse()) out = out.slice(0, e.start) + e.value + out.slice(e.end);
  return { text: out, changes, flags };
}

/** One ignore file or tool config at the project root, and what the run makes of it. */
interface IgnorePlan {
  /** Project-relative. */
  rel: string;
  /** The text to write; null when the file is only named (code, or nothing changes). */
  text: string | null;
  changes: string[];
  flags: string[];
}

/**
 * Every ignore file and tool config at the project root that names a retired
 * path, planned from `moves` (repository-relative, from the plan) against the
 * file's CURRENT text — so a resumed run, and a run over an ignore file edited
 * during a stop, respell what is there now. Read-only.
 */
function planIgnoreFiles(ctx: Ctx, moves: ReadonlyArray<[string, string]>, mode: IgnoreMode): IgnorePlan[] {
  const out: IgnorePlan[] = [];
  const names = existsSync(ctx.root) ? readdirSync(ctx.root).sort() : [];
  for (const name of names) {
    const abs = join(ctx.root, name);
    if (!statSync(abs).isFile()) continue;
    const before = () => readFileSync(abs, "utf8");
    if (IGNORE_FILES.includes(name) || BIOME_FILES.includes(name)) {
      const text = before();
      const biome = BIOME_FILES.includes(name);
      const r = biome
        ? respellBiomeText(text, moves, ctx.docsRootName, { mode })
        : respellIgnoreText(text, moves, ctx.docsRootName, { mode, wide: name === ".gitignore" });
      if (biome && r.text !== text) {
        try {
          JSON.parse(name === "biome.json" ? r.text : jsoncToJson(r.text));
        } catch {
          out.push({ rel: name, text: null, changes: [], flags: [...r.changes.map((c) => `${c} — not written: the result would not parse; respell it by hand`), ...r.flags] });
          continue;
        }
      }
      if (r.changes.length || r.flags.length) out.push({ rel: name, text: r.text === text ? null : r.text, changes: r.changes, flags: r.flags });
    } else if (FLAG_ONLY_RE.test(name)) {
      const map = new Map(moves.map(([f, t]) => [f, t]));
      const { hits } = respellText(before(), ctx.docsRootName, map);
      if (hits.length)
        out.push({
          rel: name,
          text: null,
          changes: [],
          flags: hits.map((h) => `line ${h.line}: \`${h.from}\` — ${h.to === null ? "nothing this migration moved is there" : `now ${h.to}`}; a config in code is not rewritten, respell it by hand`),
        });
    }
  }
  return out;
}

/**
 * The "For you to check" lines for an ignore plan (made with `replace`): one per
 * file, naming each pattern. Without line numbers, so a resumed run — whose file
 * holds the lines phase 5 added — names each the same way and adds nothing twice.
 */
function ignoreNotices(ctx: Ctx, plans: IgnorePlan[]): void {
  const strip = (l: string) => l.replace(/^line \d+: /, "");
  for (const p of plans) {
    if (p.changes.length && p.text !== null)
      notice(ctx, `${p.rel}: ${p.changes.length} pattern(s) naming a moved path respelled, so what it excluded stays excluded — check them:${p.changes.map((c) => `\n       ${strip(c)}`).join("")}`);
    if (p.flags.length)
      notice(ctx, `${p.rel}: ${p.flags.length} pattern(s) naming a retired path left as written — respell each by hand, or a file it protected is no longer excluded:${p.flags.map((c) => `\n       ${strip(c)}`).join("")}`);
  }
}

/** Write each planned ignore file, and print what changed; flags print only when `flags` is set. */
function writeIgnorePlans(ctx: Ctx, plans: IgnorePlan[], flags: boolean): number {
  let wrote = 0;
  for (const p of plans) {
    if (p.text !== null) {
      writeFileSync(join(ctx.root, p.rel), p.text);
      track(ctx, join(ctx.root, p.rel));
      wrote++;
      for (const c of p.changes) ok(`${p.rel}: ${c}`);
    }
    if (flags) for (const f of p.flags) note(`for you: ${p.rel}: ${f}`);
  }
  return wrote;
}

/**
 * Phase 5, before the first move: each ignore file gains the new spelling of every
 * pattern naming a path about to move, beside the old one. From here to the end
 * of the run — a stop mid-move and its re-run included — what the file protected
 * is protected wherever it sits.
 */
function addIgnoreSpellings(ctx: Ctx): void {
  const plans = planIgnoreFiles(ctx, (ctx.changes as Changes).repoMoves, "add");
  if (writeIgnorePlans(ctx, plans, false) > 0) saveState(ctx);
}

/** Phase 7, first: every move is made, so each old spelling phase 5 kept is dropped; what the run only flags is named. */
function respellIgnoreFiles(ctx: Ctx): void {
  const plans = planIgnoreFiles(ctx, (ctx.changes as Changes).repoMoves, "drop");
  if (plans.length === 0) {
    ok("no ignore file or tool config at the root names a retired path");
    return;
  }
  writeIgnorePlans(ctx, plans, true);
}

// =======================================================================================
// Invocation and context
// =======================================================================================

interface Options {
  root: string;
  dryRun: boolean;
  scaffold: string | null;
  skipFormat: boolean;
  force: boolean;
  /** `--respell <path>...`: the paths named; null when not respelling. */
  respell: string[] | null;
  /** With `--respell`: write, rather than list. */
  write: boolean;
}

export function parseArgs(argv: string[]): Options {
  const opts: Options = { root: ".", dryRun: false, scaffold: null, skipFormat: false, force: false, respell: null, write: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = (): string => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) fail(`${a} needs a value. Usage is in the header of this script.`);
      i++;
      return v as string;
    };
    if (a === "--root") {
      const v = value();
      if (v.trim() === "") fail("--root was given an empty value.");
      opts.root = v;
    } else if (a === "--scaffold-dir" || a === "--scaffold") {
      const v = value();
      if (v.trim() === "") fail(`${a} was given an empty value.`);
      opts.scaffold = v;
    } else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--skip-format") opts.skipFormat = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--respell") opts.respell = opts.respell ?? [];
    else if (a === "--write") opts.write = true;
    else if (opts.respell !== null && a !== undefined && !a.startsWith("--")) opts.respell.push(a);
    else fail(`unknown argument \`${a}\`. Valid: --root, --dry-run, --scaffold-dir (--scaffold), --skip-format, --force; or --respell <path>... [--write].`);
  }
  if (opts.write && opts.respell === null) fail("--write only goes with --respell <path>...: the migration itself writes without it.");
  if (opts.respell !== null) {
    if (opts.respell.length === 0) fail("--respell needs the files or folders to look in: --respell <path>... — it reads nothing you did not name.");
    if (opts.dryRun || opts.scaffold !== null || opts.skipFormat || opts.force) fail("--respell takes only --root and --write.");
  }
  return opts;
}

interface CheckResult {
  code: number;
  total: number;
  adopting: boolean;
  problems: string[];
}

/** One document this run writes: where it was (null when created), where it goes, its final text. */
interface Write {
  from: string | null;
  to: string;
  text: string;
  /** Links respelled in it. */
  links: number;
  /** What happened to its frontmatter, for the phase line; null when untouched. */
  fm: string | null;
  /** Created by this run (a synthesized entity file): formatted before the record. */
  created: boolean;
  /** The sha256 of the bytes this write replaces, taken when the plan is recorded
   *  (null for a file the run creates). A resumed run writes only over these bytes,
   *  over its own planned text, or over what it itself left — never over an edit. */
  pre?: string | null;
}

interface Changes {
  plan: MovePlan;
  templates: TemplatePlan;
  cycles: CyclePlan;
  /** Physical moves, in order: absolute `[from, to]`, a folder or a file. */
  physical: Array<[string, string]>;
  /** Every document write: moved, created, or edited in place. */
  writes: Write[];
  /** Repository-relative `[from, to]` for every path that moves — for `lint.exclude`. */
  repoMoves: Array<[string, string]>;
  /** Docs-relative `[from, to]`: every path the links follow — the move record. */
  linkMoves: Array<[string, string]>;
  keptLibrary: string[];
  /** Why the frontmatter this run writes is not all in the project's own Prettier's shape; null when it is, or not asked for. */
  shaping?: string | null;
  /** Why a table whose links the run respells is left unpadded; null when every one was re-padded (or none was edited). */
  tables?: string | null;
  /** Documents in `lint.exclude` (project-relative, where they end up): moved with their folder, never edited. */
  excludedKept?: string[];
}

interface Ctx extends Options {
  docsRootName: string;
  docsRoot: string;
  configPath: string;
  config: Record<string, unknown> | null;
  scaffoldDir: string;
  generatedTmp: string;
  wrote: boolean;
  baseline: CheckResult | null;
  changes: Changes | null;
  /** Docs-relative seeded paths recorded this run — the ones the invariant re-reads. */
  recorded: string[];
  /** Docs-relative paths phase 8 wrote or phase 5 created, for phase 9 to format. */
  toFormat: string[];
  /** The record phase 8 builds and phase 9 writes; the manifest's text before. */
  manifest: SeedManifest | null;
  manifestBefore: string | null;
  /** The run's record (see STATE_NAME); read at the start, saved as the run writes. */
  state: RunState;
  /** Where the record lives: inside `.git/` when there is one. */
  statePath: string;
  /** Where the move record lives: beside the record. */
  movesPath: string;
  /** Whether this run is finishing an interrupted one from its recorded plan. */
  resumed: boolean;
  /** What this run removed that was not a document of the adopter's, for the last line. */
  removed: { templates: number; readmes: number; junk: number; folders: number };
}

interface Journal {
  plan: { moves: EntityMove[]; blockers: string[]; handled: string[]; junk: string[]; ownTemplates?: Array<[string, string]> };
  templates: TemplatePlan;
  cycles: { texts: Array<[string, string]>; itemCycle: Array<[string, string]>; notes: string[] };
  physical: Array<[string, string]>;
  writes: Write[];
  repoMoves: Array<[string, string]>;
  linkMoves?: Array<[string, string]>;
  keptLibrary: string[];
  excludedKept?: string[];
}

interface RunState {
  /** Project-relative path → the sha256 this run left there, or null for a path it removed. */
  written: Record<string, string | null>;
  /** The plan, while phases 5 to 7 are writing it. */
  journal: Journal | null;
  /** What the whole migration has removed so far, across a stop and its re-run. */
  removed: { templates: number; readmes: number; junk: number; folders: number };
  /** The commit HEAD pointed at when the first run began — where to go back to. */
  base?: string;
  /** What the run did for the adopter that they should check, kept across a stop so the run that completes still says it. */
  notices?: string[];
}

const toJournal = (c: Changes): Journal => ({
  plan: { ...c.plan, handled: [...c.plan.handled] },
  templates: c.templates,
  cycles: { texts: [...c.cycles.texts], itemCycle: [...c.cycles.itemCycle], notes: c.cycles.notes },
  physical: c.physical,
  writes: c.writes,
  repoMoves: c.repoMoves,
  linkMoves: c.linkMoves,
  keptLibrary: c.keptLibrary,
  excludedKept: c.excludedKept ?? [],
});

const fromJournal = (j: Journal): Changes => ({
  plan: { ...j.plan, handled: new Set(j.plan.handled), ownTemplates: j.plan.ownTemplates ?? [] },
  templates: j.templates,
  cycles: { texts: new Map(j.cycles.texts), itemCycle: new Map(j.cycles.itemCycle), notes: j.cycles.notes },
  physical: j.physical,
  writes: j.writes,
  repoMoves: j.repoMoves,
  linkMoves: j.linkMoves ?? [],
  keptLibrary: j.keptLibrary,
  excludedKept: j.excludedKept ?? [],
});

const projectRel = (ctx: Ctx, abs: string) => relative(ctx.root, abs).split(sep).join("/");

/** Record what this run left at `abs` (its hash, or null when it removed it). */
function track(ctx: Ctx, abs: string): void {
  ctx.wrote = true;
  ctx.state.written[projectRel(ctx, abs)] = hashOf(abs);
}

/** Atomic: written beside the record, then renamed over it, so a save that fails leaves the last record whole. */
function saveState(ctx: Ctx): void {
  const tmp = `${ctx.statePath}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(ctx.state)}\n`);
  renameSync(tmp, ctx.statePath);
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/** A path whose bytes are the ones this run left there — its own output, not an edit of yours. */
const ours = (ctx: Ctx, rel: string) =>
  Object.hasOwn(ctx.state.written, rel) && ctx.state.written[rel] === hashOf(join(ctx.root, rel));

/** Something the adopter should check, printed at the end of the run (and kept across a stop). */
function notice(ctx: Ctx, line: string): void {
  const all = (ctx.state.notices ??= []);
  if (!all.includes(line)) all.push(line);
}

function printNotices(ctx: Ctx): void {
  const all = ctx.state.notices ?? [];
  if (all.length === 0) return;
  say(`\nFor you to check — calls the run made for you, and text of yours it replaced (${all.length}):`);
  for (const line of all) say(`   · ${line}`);
}

/** The command that prints `docsRel` as it was when the migration began; null without git. */
function recoverCommand(ctx: Ctx, docsRel: string): string | null {
  if (!ctx.state.base) return null;
  const prefix = run(["git", "rev-parse", "--show-prefix"], ctx.root).stdout.trim();
  return `git show ${ctx.state.base}:${prefix}${ctx.docsRootName}/${docsRel}`;
}

/**
 * The owned files the refresh will replace or remove that hold edits of the
 * adopter's: present, their text in no scaffold release up to the pinned one
 * (`OWNED_RELEASES`), and — for one the refresh replaces — not already the
 * fetched scaffold's.
 */
function editedOwned(ctx: Ctx): Array<{ rel: string; removed: boolean }> {
  const sDocs = join(ctx.scaffoldDir, "docs");
  const out: Array<{ rel: string; removed: boolean }> = [];
  for (const [rel, keys] of Object.entries(OWNED_RELEASES)) {
    const abs = join(ctx.docsRoot, rel);
    if (!existsSync(abs) || !statSync(abs).isFile()) continue;
    const key = proseKey(readFileSync(abs, "utf8"));
    if (keys.includes(key)) continue;
    const removed = rel in RETIRED_READMES;
    if (!removed && (!existsSync(join(sDocs, rel)) || proseKey(readFileSync(join(sDocs, rel), "utf8")) === key)) continue;
    out.push({ rel, removed });
  }
  return out;
}

/** The line that names an edited owned file, and how to get its text back. */
function editedOwnedLine(ctx: Ctx, e: { rel: string; removed: boolean }): string {
  const cmd = recoverCommand(ctx, e.rel);
  return (
    `${ctx.docsRootName}/${e.rel} differs from every release of the scaffold, so it holds edits of yours: ` +
    `the refresh ${e.removed ? "removes it with its folder" : `replaces it with ${SCAFFOLD_RELEASE}'s`}. ` +
    `An owned file is replaced whole on every refresh, so keep what you added in a page of your own (a playbook, or your root AGENTS.md). ` +
    (cmd ? `Recover your text with: ${cmd}` : "There is no git history to recover it from: copy it aside before the run.")
  );
}

function resolveContext(o: Options): Ctx {
  const root = resolve(o.root);
  const configPath = join(root, ".project-docs.json");
  let config: Record<string, unknown> | null = null;
  if (existsSync(configPath)) {
    const text = readFileSync(configPath, "utf8");
    if (text.startsWith("﻿"))
      fail(
        ".project-docs.json starts with a UTF-8 byte-order mark (BOM), which JSON does not allow. Save the file without one and re-run."
      );
    try {
      config = JSON.parse(text);
    } catch (e) {
      fail(`.project-docs.json is not valid JSON: ${(e as Error).message}`);
    }
  }
  const docsRootName = typeof config?.docsRoot === "string" ? config.docsRoot : "docs";
  const zero = () => ({ templates: 0, readmes: 0, junk: 0, folders: 0 });
  let state: RunState = { written: {}, journal: null, removed: zero() };
  const gitDir = Bun.spawnSync(["git", "rev-parse", "--absolute-git-dir"], { cwd: existsSync(root) ? root : ".", stdout: "pipe", stderr: "pipe", env: gitEnv() });
  const inGit = gitDir.exitCode === 0 && gitDir.stdout.toString().trim() !== "";
  const statePath = inGit ? join(gitDir.stdout.toString().trim(), STATE_NAME) : join(root, `.${STATE_NAME}`);
  const movesPath = inGit ? join(gitDir.stdout.toString().trim(), MOVES_NAME) : join(root, `.${MOVES_NAME}`);
  if (existsSync(statePath)) {
    try {
      const parsed = JSON.parse(readFileSync(statePath, "utf8")) as Partial<RunState>;
      state = {
        written: parsed.written ?? {},
        journal: parsed.journal ?? null,
        removed: parsed.removed ?? zero(),
        ...(parsed.base ? { base: parsed.base } : {}),
        ...(Array.isArray(parsed.notices) ? { notices: parsed.notices } : {}),
      };
    } catch (e) {
      fail(
        `${statePath} — the record an earlier run of this migration left — is not valid JSON: ${(e as Error).message}.\n` +
          `   Without it a re-run cannot tell its own changes from yours, nor finish a run stopped in phases 5 to 7.\n` +
          `   Go back to where the migration began WITHOUT losing anything, then run it from the start:\n` +
          `     1. git stash push --include-untracked -m "before re-running the v3.0 migration"\n` +
          `        — sets aside everything uncommitted: the migration's partial output and any work of yours.\n` +
          `     2. Only if you committed during the migration: git reset --hard <the commit before the first run>\n` +
          `        — the first run printed it as "starting from commit <sha>"; \`git log\` shows it otherwise. This also\n` +
          `        drops commits of your own made after it: find them with \`git reflog\` and re-apply them with\n` +
          `        \`git cherry-pick <sha>\` after step 3.\n` +
          `     3. Delete this record, and run the migration again from the start.\n` +
          `     4. Take back your own work from the stash. List all of it with\n` +
          `        \`git stash show --include-untracked stash@{0}\` (git 2.32+), or the untracked part with\n` +
          `        \`git show --stat 'stash@{0}^3'\`. Restore a tracked file with git checkout stash@{0} -- <path>, and an\n` +
          `        untracked one (a draft that predated the run, a file the migration created) with\n` +
          `        git checkout 'stash@{0}^3' -- <path>. For a document the migration also rewrites — one it moves, or\n` +
          `        whose links it respells — do not restore the stashed copy: it is the half-migrated version. See your\n` +
          `        edit with \`git diff stash@{0} -- <path>\` (or against 'stash@{0}^3' for an untracked file) and re-apply\n` +
          `        it by hand. Don't drop the stash until everything of yours is back; the migration's partial output\n` +
          `        stays in it.\n` +
          `   Without git: restore the tree from a backup taken before the first run, or finish the conversion by hand.`
      );
    }
  }
  return {
    ...o,
    root,
    docsRootName,
    docsRoot: join(root, docsRootName),
    configPath,
    config,
    scaffoldDir: "",
    generatedTmp: "",
    wrote: false,
    baseline: null,
    changes: null,
    recorded: [],
    toFormat: [],
    manifest: null,
    manifestBefore: null,
    state,
    statePath,
    movesPath,
    resumed: false,
    removed: state.removed,
  };
}

function readManifest(ctx: Ctx): SeedManifest {
  try {
    return loadManifest(ctx.docsRoot);
  } catch (e) {
    return fail(`${ctx.docsRootName}/${(e as Error).message}`);
  }
}

function pdocsCheck(root: string): { result: CheckResult | null; raw: string } {
  const r = run(["bun", join(root, "scripts/pdocs/cli.ts"), "check", "--format", "json"], root);
  try {
    const env = JSON.parse(r.stdout) as { data?: { total?: unknown; adopting?: unknown; problems?: Array<{ message?: unknown }> } };
    const d = env.data;
    if (!d || typeof d.total !== "number" || !Array.isArray(d.problems)) return { result: null, raw: r.stderr || r.stdout };
    return {
      result: { code: r.code, total: d.total, adopting: d.adopting === true, problems: d.problems.map((p) => String(p.message ?? "")) },
      raw: r.stdout,
    };
  } catch {
    return { result: null, raw: r.stderr || r.stdout };
  }
}

/**
 * Every project-relative path this run may write: the owned files, the config and
 * the record, the templates it may update, move or remove, and every document the
 * plan moves or rewrites.
 */
function writeCandidates(ctx: Ctx): string[] {
  const c = ctx.changes as Changes;
  const dn = (p: string) => `${ctx.docsRootName}/${p}`;
  const out = new Set<string>([
    "scripts/pdocs",
    ".project-docs.json",
    dn(MANIFEST_NAME),
    ...OWNED_ROOT.map(dn),
    ...OWNED_CATEGORIES.map((f) => dn(`${f}/README.md`)),
    ...Object.keys(RETIRED_READMES).map(dn),
    ...c.templates.moves.flat().map(dn),
    ...c.templates.removals.map(dn),
    ...c.plan.ownTemplates.flat().map(dn),
  ]);
  const m = readManifest(ctx);
  for (const rel of Object.keys(m.files)) if (verdictFor(m, ctx.docsRoot, rel) === "update") out.add(dn(rel));
  for (const w of c.writes) for (const p of [w.from, w.to]) if (p) out.add(projectRel(ctx, p));
  // A first run moves whole folders, so dirt anywhere in one is in its way. A resumed run
  // writes only the plan's files: a file of yours made inside a moved folder since is not.
  if (!ctx.resumed) for (const [f, t] of c.physical) for (const p of [f, t]) out.add(projectRel(ctx, p));
  return [...out];
}

/** Repository-relative paths git reports dirty under `paths` (project-relative). */
function dirtyUnder(ctx: Ctx, paths: string[]): string[] {
  const present = paths.filter((c) => existsSync(join(ctx.root, c)));
  if (present.length === 0) return [];
  const st = run(["git", "status", "--porcelain", "--untracked-files=all", "--", ...present], ctx.root);
  const top = run(["git", "rev-parse", "--show-toplevel"], ctx.root).stdout.trim();
  if (st.code !== 0 || !top) return [];
  const root = realpathSync(ctx.root);
  return st.stdout
    .split("\n")
    .filter((l) => l.length > 3)
    .map((l) => l.slice(3).split(" -> ").pop() as string)
    .map((p) => p.replace(/^"(.*)"$/, "$1"))
    .map((p) => relative(root, join(realpathSync(top), p)))
    .sort();
}

/** The date a document was first committed; else the date in its name; else today. */
/**
 * The time, in ms, of the commit that first added `abs` — through any rename
 * (`--follow`), so a document moved before the run keeps its own history.
 * `null` when git has no history for it.
 *
 * Not `--diff-filter=A`: `--follow` also detects COPIES, and a new document
 * that resembles an older sibling (two backlog items from one template) reads
 * as a copy of it, which would hand it the sibling's time. The log is walked
 * newest first instead, through renames only: a copy is where this file was
 * added.
 */
export function commitTime(root: string, abs: string): number | null {
  const r = run(["git", "log", "--follow", "--name-status", "--format=%x00%aI", "--", abs], root);
  if (r.code !== 0) return null;
  for (const entry of r.stdout.split("\0").filter((e) => e.trim())) {
    const [time, ...rest] = entry.split("\n");
    const status = rest.find((l) => /^[A-Z]/.test(l))?.[0];
    if (status === "A" || status === "C") {
      const ms = Date.parse(time as string);
      return Number.isFinite(ms) ? ms : null;
    }
  }
  return null;
}

/**
 * One UUIDv7 per key, minted at its time (D25): ordered by time, then key, and
 * strictly increasing — a tie, or a time not after the previous one, takes the
 * previous millisecond plus one — so no two ids share a timestamp.
 */
export function mintIds(dated: ReadonlyArray<{ key: string; ms: number }>): Map<string, string> {
  const ids = new Map<string, string>();
  let prev = -1;
  for (const { key, ms } of [...dated].sort((a, b) => a.ms - b.ms || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))) {
    const at = Number.isFinite(ms) && ms > prev ? ms : prev + 1;
    prev = at;
    ids.set(key, uuidv7(at, crypto.getRandomValues(new Uint8Array(10))));
  }
  return ids;
}

function firstDate(ctx: Ctx, abs: string): string {
  const r = run(["git", "log", "--diff-filter=A", "--format=%as", "--", abs], ctx.root);
  const dates = r.code === 0 ? r.stdout.trim().split("\n").filter(Boolean) : [];
  if (dates.length) return dates[dates.length - 1] as string;
  const named = /(\d{4}-\d{2}-\d{2})/.exec(basename(abs))?.[1];
  return named ?? new Date().toISOString().slice(0, 10);
}

// =======================================================================================
// The whole plan: every move, every frontmatter rewrite, every link — computed
// before anything is written, from the tree as it stands
// =======================================================================================

// The 9.x lint's positional typing, MIRRORED: this script runs against a tree whose
// scripts/pdocs/ is the adopter's older copy until phase 4, and against a pinned scaffold,
// so it cannot import the lint. The test pins each table to scripts/pdocs/lint/registry.ts
// and `ownedType` to scripts/pdocs/lint/rules.ts's over every shape of path.

/** MIRROR of `ENTITY_FILE` (registry.ts): an owner folder's entry file, by name. */
export const ENTITY_FILE_TYPE: Record<string, string> = { "feature.md": "feature", "item.md": "item" };
/** MIRROR of `OWNED_FILE_TYPE` (registry.ts): the owned documents with a fixed name. */
export const OWNED_FILE_TYPE: Record<string, string> = {
  "plan.md": "plan",
  "design-resolution.md": "design-resolution",
  "test-plan.md": "test-plan",
  "DEV_KICKOFF.md": "kickoff",
  "handoff.md": "handoff",
  "write-up.md": "write-up",
};
/** MIRROR of `OWNER_SUBFOLDER` (registry.ts): where an owned type sits when not at its owner's top. */
export const OWNER_SUBFOLDER: Record<string, string> = { session: "sessions", artifact: "artifacts", report: "reports" };
const SUBFOLDER_TYPE: Record<string, string> = Object.fromEntries(Object.entries(OWNER_SUBFOLDER).map(([t, f]) => [f, t]));

/**
 * MIRROR of `ownedType` (rules.ts): the type a document's position inside an owner
 * folder gives it. `owner` is `features` or `items`; `within` is the path under
 * it. A leading `_archive/` is stripped; only the entity's own top-level fixed
 * names and its own `sessions/`, `reports/` and `artifacts/` are typed — anything
 * deeper (`workstreams/<ws>/plan.md`, `workstreams/<ws>/sessions/…`) is an
 * `artifact`. An entry file where its entity cannot sit keeps its entity type:
 * the lint reports it as misplaced, and a retype would not answer that.
 */
export function ownedType(owner: string, within: string): string {
  let segs = within.split("/");
  if (segs[0] === "_archive" && segs.length > 1) segs = segs.slice(1);
  if (segs.length === 1) {
    const name = segs[0] as string;
    if (owner === "items") return name === "feature.md" ? "feature" : "item";
    return ENTITY_FILE_TYPE[name] ?? "";
  }
  const rest = segs.slice(1);
  const name = rest[rest.length - 1] as string;
  const entity = ENTITY_FILE_TYPE[name];
  if (rest.length === 1) {
    if (entity) return entity;
    return OWNED_FILE_TYPE[name] ?? "artifact";
  }
  if (entity) return entity;
  return SUBFOLDER_TYPE[rest[0] as string] ?? "artifact";
}

/**
 * The fields an `artifact` may carry: the lint's universal required and optional
 * ones, and nothing an artifact's registry row adds (it adds none). A document
 * retyped to `artifact` keeps these and drops the rest. Pinned by the test to the
 * lint's own `allowedFields("artifact")`, as a set.
 */
export const ARTIFACT_FIELDS = ["type", "title", "description", "status", "generated", "tags", "related", "supersedes"];

/**
 * `fm` retyped as an `artifact`: `type` set, every key an artifact may not carry
 * removed, the rest kept in place. Returns the block and each dropped key with
 * its value, for the plan to name. PURE.
 */
export function retypeAsArtifact(fm: string): { fm: string; dropped: Array<[string, string]> } {
  let f = fmSet(fm, "type", "artifact");
  const dropped: Array<[string, string]> = [];
  for (const line of f.split("\n")) {
    const key = /^([A-Za-z_][\w-]*):/.exec(line)?.[1];
    if (key && !ARTIFACT_FIELDS.includes(key) && !dropped.some(([k]) => k === key)) dropped.push([key, fmGet(f, key) ?? ""]);
  }
  for (const [key] of dropped) f = fmRemove(f, key);
  return { fm: f, dropped };
}

const RETIRED_TYPE_NAMES = new Set(["proposal", "backlog", "fragment", "brief", "investigation", "memory", "lesson"]);
const HAS_LIFECYCLE = new Set(["feature", "item", "plan", "design-resolution", "test-plan"]);

function computeChanges(ctx: Ctx): Changes {
  const d = ctx.docsRoot;
  const files = filesIn(d);
  const cache = new Map<string, string | null>();
  const textOf = (rel: string): string | null => {
    if (!cache.has(rel)) {
      const abs = join(d, rel);
      cache.set(rel, rel.endsWith(".md") && existsSync(abs) ? readFileSync(abs, "utf8") : null);
    }
    return cache.get(rel) as string | null;
  };
  const plan = buildMoveMap(files, textOf);
  const m = readManifest(ctx);
  const templates = planTemplates(
    (rel) => existsSync(join(d, rel)),
    (rel) => verdictFor(m, d, rel),
    (rel) => m.files[rel] !== undefined
  );
  const cycles = planCycles(files, textOf, plan.moves);
  const keptLibrary = Object.keys(KEPT_LIBRARY).filter((f) => existsSync(join(d, f)));

  // --- file-level map (docs-relative, old → new) and the link map (absolute)
  const fileMap = new Map<string, string>();
  const linkMap = new Map<string, string>();
  const physical: Array<[string, string]> = [];
  const created: Write[] = [];
  const entityOf = new Map<string, { move: EntityMove; role: "entry" | "owned" }>();
  const ids = new Map<string, string>();
  for (const mv of plan.moves) {
    if (mv.kind === "feature" || mv.kind === "born-item") {
      physical.push([join(d, mv.from), join(d, mv.to)]);
      linkMap.set(join(d, mv.from), join(d, mv.to));
      for (const rel of files)
        if (rel.startsWith(`${mv.from}/`)) {
          const inner = rel.slice(mv.from.length + 1);
          const to = mv.kind === "feature" && inner === "proposal.md" ? `${mv.to}/feature.md` : `${mv.to}/${inner}`;
          fileMap.set(rel, to);
          entityOf.set(rel, { move: mv, role: mv.kind === "feature" && inner === "proposal.md" ? "entry" : "owned" });
        }
      if (mv.kind === "feature") {
        physical.push([join(d, mv.to, "proposal.md"), join(d, mv.to, "feature.md")]);
        linkMap.set(join(d, mv.from, "proposal.md"), join(d, mv.to, "feature.md"));
      }
    } else {
      const to = mv.kind === "research" ? `${mv.to}/write-up.md` : mv.to;
      physical.push([join(d, mv.from), join(d, to)]);
      linkMap.set(join(d, mv.from), join(d, to));
      fileMap.set(mv.from, to);
      entityOf.set(mv.from, { move: mv, role: mv.kind === "report" ? "owned" : "entry" });
    }
  }
  for (const [from, to] of Object.entries(TEMPLATE_RENAMES)) linkMap.set(join(d, from), join(d, to));
  for (const [from, to] of Object.entries(RETIRED_TEMPLATES)) linkMap.set(join(d, from), join(d, to));
  for (const [from, to] of Object.entries(RETIRED_READMES)) linkMap.set(join(d, from), join(d, to));
  for (const [from, to] of plan.ownTemplates) linkMap.set(join(d, from), join(d, to));
  // A link to a retired FOLDER itself goes to its successor. Only the folder: the link map
  // carries descendants too, and a link into a retired folder that nothing moved — one
  // already broken, or to a brief the adopter deleted — must stay as written, for the
  // verify phase to name, rather than be respelled into a second broken path.
  const folderMap = new Map(Object.entries(FOLDER_SUCCESSOR).map(([f, t]) => [join(d, f), join(d, t)]));

  // --- the frontmatter each moved document ends with
  const dateOf = (rel: string) => firstDate(ctx, join(d, rel));

  // --- the ids, minted from each item's own time (D25): a UUIDv7 begins with
  // its timestamp, so ids minted in one burst share every character pdocs
  // prints and sort in no useful order. Each id takes the time of the commit
  // that first added its document — a born item's, its latest session — and
  // only when git has no history for it, `generated.at` (a date, so a day's
  // items fall back to midnight). `mintIds` keeps them strictly increasing.
  const genAt = (rel: string) => {
    const fm = splitFrontmatter(textOf(rel) ?? "").fm;
    return (fm && /\bat:\s*(\d{4}-\d{2}-\d{2})/.exec(fmGet(fm, "generated") ?? "")?.[1]) || null;
  };
  const midnight = (date: string) => Date.parse(`${date}T00:00:00Z`);
  const dated = plan.moves
    .filter((mv) => mv.kind !== "feature" && mv.kind !== "report")
    .map((mv) => {
      if (mv.kind === "born-item") {
        const sessions = files.filter((r) => r.startsWith(`${mv.from}/sessions/`)).sort();
        const latest = sessions[sessions.length - 1];
        const first = latest ?? files.filter((r) => r.startsWith(`${mv.from}/`)).sort()[0] ?? mv.from;
        const ms = commitTime(ctx.root, join(d, first));
        if (ms !== null) return { key: mv.from, ms };
        const named = latest ? /(\d{4}-\d{2}-\d{2})/.exec(basename(latest))?.[1] : undefined;
        return { key: mv.from, ms: midnight(genAt(first) ?? named ?? dateOf(first)) };
      }
      const ms = commitTime(ctx.root, join(d, mv.from));
      return { key: mv.from, ms: ms ?? midnight(genAt(mv.from) ?? dateOf(mv.from)) };
    });
  for (const [k, v] of mintIds(dated)) ids.set(k, v);
  const frontmatterFor = (rel: string, text: string): { text: string; what: string | null } => {
    const e = entityOf.get(rel);
    const cycle = cycles.texts.get(rel);
    if (cycle !== undefined) return { text: cycle, what: "scope: removed (membership is on the items now)" };
    if (!e) return { text, what: null };
    const { fm, body } = splitFrontmatter(text);
    const mv = e.move;
    const newRel = fileMap.get(rel) as string;
    if (e.role === "entry") {
      const itemCycle = cycles.itemCycle.get(mv.from);
      if (mv.kind === "feature") {
        if (fm === null)
          return { text: synthesizeFrontmatter("feature", rel, body, { date: dateOf(rel), extra: [["lifecycle", mv.lifecycle as string]] }), what: `synthesized (feature, ${mv.lifecycle})` };
        let f = fmSet(fm, "type", "feature");
        f = keyRange(f.split("\n"), "lifecycle") ? fmSet(f, "lifecycle", mv.lifecycle as string) : fmInsertAfter(f, "status", "lifecycle", mv.lifecycle as string);
        return { text: joinFrontmatter(f, body), what: `type: proposal → feature, lifecycle: ${mv.was ?? "(none)"} → ${mv.lifecycle}` };
      }
      if (mv.kind === "research") {
        if (fm === null) return { text: synthesizeFrontmatter("write-up", rel, body, { date: dateOf(rel) }), what: "synthesized (write-up)" };
        return { text: joinFrontmatter(fmRemove(fmSet(fm, "type", "write-up"), "lifecycle"), body), what: "type: investigation → write-up, lifecycle moved to the item" };
      }
      // backlog, fragment → item
      const id = ids.get(mv.from) as string;
      const extra: Array<[string, string]> = [["lifecycle", mv.lifecycle as string], ["id", id], ["kind", "task"], ...(itemCycle ? ([["cycle", itemCycle]] as Array<[string, string]>) : [])];
      if (fm === null) return { text: synthesizeFrontmatter("item", rel, body, { date: dateOf(rel), extra }), what: `synthesized (item, ${mv.lifecycle})` };
      let f = fmSet(fm, "type", "item");
      f = keyRange(f.split("\n"), "lifecycle") ? fmSet(f, "lifecycle", mv.lifecycle as string) : fmInsertAfter(f, "status", "lifecycle", mv.lifecycle as string);
      f = fmInsertAfter(f, "lifecycle", "id", id);
      f = fmInsertAfter(f, "id", "kind", "task");
      if (itemCycle) f = fmInsertAfter(f, "kind", "cycle", itemCycle);
      return { text: joinFrontmatter(f, body), what: `type: ${mv.kind} → item, lifecycle: ${mv.was ?? "(none)"} → ${mv.lifecycle}, id and kind added${itemCycle ? `, cycle: ${itemCycle}` : ""}` };
    }
    // An owned document: typed by position, as the 9.x lint types it. Untouched unless it has
    // no frontmatter, a retired type, or a type its new position does not allow.
    const owner = newRel.slice(0, newRel.indexOf("/"));
    const type = ownedType(owner, newRel.slice(owner.length + 1));
    if (fm === null) {
      const lc = ARCHIVED_OWNED_LIFECYCLE[type];
      return {
        text: synthesizeFrontmatter(type, rel, body, { date: dateOf(rel), extra: lc ? [["lifecycle", lc]] : [] }),
        what: `synthesized (${type}${lc ? `, ${lc}` : ""})`,
      };
    }
    const was = fmGet(fm, "type");
    // A document whose new position says `artifact` — a workstream's own plan.md, a
    // session nested under one, a report two folders down — is one there: 9.x types
    // only the entity's own top-level documents. It keeps its body and the fields an
    // artifact may carry; the rest (a completed plan's lifecycle, say) is dropped and named.
    // One already typed `artifact` is left as it is: a key a tool reads (a deck's `marp`,
    // `theme`) is the adopter's, and the lint names it rather than the run dropping it.
    if (type === "artifact" && was !== null && was !== "artifact") {
      const r = retypeAsArtifact(fm);
      if (r.fm !== fm) {
        const dropped = r.dropped.map(([k, v]) => `${k}: ${v}`).join(", ");
        return {
          text: joinFrontmatter(r.fm, body),
          what: `type: ${was} → artifact (its position)${dropped ? `, dropped ${dropped}` : ""}`,
        };
      }
      return { text, what: null };
    }
    // The v2.10 lint typed everything in a project folder but its fixed names and sessions/ as an
    // `artifact`, so a report the adopter moved into projects/<slug>/reports/ — the guide's step for
    // a report with no owner — is one there. Its new position says what it is.
    const positional = was === "artifact" && (type === "report" || type === "write-up");
    if (was !== null && ((RETIRED_TYPE_NAMES.has(was) && was !== type) || positional)) {
      let f = fmSet(fm, "type", type);
      if (!HAS_LIFECYCLE.has(type)) f = fmRemove(f, "lifecycle");
      return { text: joinFrontmatter(f, body), what: `type: ${was} → ${type} (its position)` };
    }
    return { text, what: null };
  };

  // --- every markdown file whose text changes, at its final path
  // Owned files the refresh replaces are not rewritten: phase 4 installs the scaffold's, and a
  // rewrite computed from the old text would put the old text back after it.
  const removed = new Set([
    ...Object.keys(RETIRED_READMES),
    ...templates.removals,
    ...templates.moves.map(([f]) => f),
    // A template moves byte for byte: its links are placeholders, relative to where a copy of it will sit.
    ...plan.ownTemplates.map(([f]) => f),
    ...OWNED_ROOT,
    ...OWNED_CATEGORIES.map((c) => `${c}/README.md`),
  ]);
  const writes: Write[] = [];
  const docsFiles = files.filter((r) => r.endsWith(".md") && !removed.has(r));
  const excluded = (() => {
    const globs = ((ctx.config?.lint as { exclude?: unknown } | undefined)?.exclude as string[] | undefined ?? []).filter((g) => typeof g === "string").map((g) => new Bun.Glob(g));
    return (p: string) => globs.some((g) => g.match(p));
  })();
  const tracked = run(["git", "ls-files", "-z", "--", "*.md"], ctx.root);
  const outside = tracked.code === 0
    ? tracked.stdout.split("\0").filter((p) => p && !p.startsWith(`${ctx.docsRootName}/`) && !excluded(p) && existsSync(join(ctx.root, p)))
    : [];
  const candidates: Array<[string, string]> = [
    ...docsFiles.map((r) => [join(d, r), join(d, fileMap.get(r) ?? r)] as [string, string]),
    ...outside.map((p) => [join(ctx.root, p), join(ctx.root, p)] as [string, string]),
  ];
  // A file `lint.exclude` names — at its old spelling or its new one — is the adopter's to
  // keep byte for byte (canon a tool reads back, a Slidev deck): it moves with its folder,
  // and nothing in it is rewritten, frontmatter or links.
  const repoRel = (abs: string) => relative(ctx.root, abs).split(sep).join("/");
  const excludedKept: string[] = [];
  for (const [fromAbs, toAbs] of candidates) {
    if (fromAbs.startsWith(`${d}${sep}`) && (excluded(repoRel(fromAbs)) || excluded(repoRel(toAbs)))) {
      excludedKept.push(repoRel(toAbs));
      continue;
    }
    const original = readFileSync(fromAbs, "utf8");
    const rel = fromAbs.startsWith(`${d}${sep}`) ? relative(d, fromAbs).split(sep).join("/") : null;
    const fmStep = rel ? frontmatterFor(rel, original) : { text: original, what: null };
    const l = rewriteLinks(fmStep.text, fromAbs, toAbs, linkMap, existsSync);
    const g = rewriteFolderLinks(l.text, toAbs, folderMap);
    const f = rewriteFromField(g.text, d, linkMap);
    if (fromAbs === toAbs && f.text === original) continue;
    writes.push({ from: fromAbs, to: toAbs, text: f.text, links: l.changed + g.changed + f.changed, fm: fmStep.what, created: false });
  }

  // --- the entity files this run creates
  for (const mv of plan.moves) {
    if (mv.kind !== "born-item" && mv.kind !== "research") continue;
    const id = ids.get(mv.from) as string;
    const itemCycle = cycles.itemCycle.get(mv.from);
    let title: string;
    let description: string;
    let line: string;
    let kind: string;
    let date: string;
    /** The document a born item with no session or plan is titled and described from. */
    let heldFrom: string | null = null;
    if (mv.kind === "research") {
      const fm = splitFrontmatter(textOf(mv.from) ?? "").fm ?? "";
      title = fmGet(fm, "title") ?? titleize(slugOf(basename(mv.from), "investigation").slug);
      description = fmGet(fm, "description") ?? title;
      kind = "research";
      date = /\bat:\s*(\d{4}-\d{2}-\d{2})/.exec(fmGet(fm, "generated") ?? "")?.[1] ?? dateOf(mv.from);
      line = "The question this research asked, and where it got to. The answer is in [the write-up](./write-up.md).";
    } else {
      const inside = files.filter((r) => r.startsWith(`${mv.from}/`) && r.endsWith(".md"));
      const sessions = inside.filter((r) => r.startsWith(`${mv.from}/sessions/`)).sort();
      const source = [...[...sessions].reverse(), `${mv.from}/plan.md`].find((r) => splitFrontmatter(textOf(r) ?? "").fm !== null && fmGet(splitFrontmatter(textOf(r) ?? "").fm as string, "description"));
      title = titleize(basename(mv.from));
      description = `Work recorded in ${basename(mv.from)} before it had an item.`;
      if (source) description = fmGet(splitFrontmatter(textOf(source) ?? "").fm as string, "description") as string;
      else {
        // No session or plan to describe it: a folder that held only a brief or a report is the
        // work that document names, so the item takes that document's title and description —
        // its frontmatter's, or what the run synthesizes for a legacy document with none.
        const held = inside
          .filter((r) => !r.startsWith(`${mv.from}/sessions/`) && r !== `${mv.from}/plan.md`)
          .sort()
          .map((r) => {
            const text = textOf(r) ?? "";
            const fm = splitFrontmatter(text).fm ?? (splitFrontmatter(synthesizeFrontmatter("artifact", r, text, { date: "1970-01-01" })).fm as string);
            return { r, title: fmGet(fm, "title"), description: fmGet(fm, "description") };
          })
          .find((h) => h.title && h.description);
        if (held) {
          title = held.title as string;
          description = held.description as string;
          heldFrom = held.r.slice(mv.from.length + 1);
        }
      }
      kind = "task";
      date = sessions.length ? (/(\d{4}-\d{2}-\d{2})/.exec(basename(sessions[sessions.length - 1] as string))?.[1] ?? dateOf(mv.from)) : dateOf(inside[0] ?? mv.from);
      line = `Work that ran before it had an item. Its record is the documents in this folder; the migration to ${SCAFFOLD_RELEASE} filed this item for it.`;
    }
    const fm = [
      "type: item",
      `title: ${yamlScalar(title)}`,
      `description: ${yamlScalar(description)}`,
      "status: stable",
      `lifecycle: ${mv.lifecycle}`,
      `id: ${id}`,
      `kind: ${kind}`,
      ...(itemCycle ? [`cycle: ${itemCycle}`] : []),
      `generated: { by: ${ACTOR}, at: ${date} }`,
    ].join("\n");
    created.push({ from: null, to: join(d, mv.to, "item.md"), text: joinFrontmatter(fm, `\n# ${title}\n\n${line}\n`), links: 0, fm: `created (item, ${kind}, ${mv.lifecycle})${heldFrom ? `, titled and described from ${heldFrom}` : ""}`, created: true });
  }

  // --- every block the run wrote, as the project's own Prettier prints it. Without one
  // (or with --skip-format) each keeps the shape above: Prettier's for its defaults.
  let shaping: string | null = null;
  if (!ctx.skipFormat) {
    const fmOf = (text: string) => splitFrontmatter(text).fm;
    const shaped = [...writes, ...created].filter((w) => fmOf(w.text) !== null && (w.from === null || fmOf(w.text) !== fmOf(readFileSync(w.from, "utf8"))));
    const { blocks, note: why } = prettierFrontmatter(ctx.root, shaped.map((w) => ({ path: w.to, fm: fmOf(w.text) as string })));
    shaping = why;
    shaped.forEach((w, i) => {
      const block = blocks[i];
      if (block != null) w.text = joinFrontmatter(block, splitFrontmatter(w.text).body);
    });
  }

  // --- a table whose links the run respelled, re-padded by the project's own Prettier: a
  // longer or shorter link leaves the padded columns out of line, which `prettier --check`
  // rejects. Only those tables, never the rest of the document.
  const tabled = writes.filter((w) => w.from !== null && w.links > 0);
  const edited = tabled.map((w) => editedTables(readFileSync(w.from as string, "utf8"), w.text));
  let tables: string | null = null;
  const count = edited.reduce((n, t) => n + t.length, 0);
  if (count > 0) {
    /** Every edited table left as it is: its file, its first line, and why. */
    const left: string[] = [];
    const leave = (w: Write, t: TableBlock, why: string) => left.push(`${relative(ctx.root, w.to)}:${t.start + 1} (${why})`);
    const res = ctx.skipFormat ? null : prettierFormat(ctx.root, tabled.flatMap((w, i) => (edited[i] as TableBlock[]).map((t) => ({ path: w.to, text: `${t.text}\n` }))));
    const none = ctx.skipFormat
      ? "--skip-format"
      : res && (res.failed !== null || res.missing || res.version === null)
        ? res.failed ?? (res.missing ? "no Prettier in this project" : res.error ?? "your Prettier did not load")
        : null;
    let k = 0;
    tabled.forEach((w, i) => {
      const blocks = edited[i] as TableBlock[];
      const outs = blocks.map(() => (none === null ? res?.out[k++] ?? null : null));
      blocks.forEach((t, j) => {
        const v = repadVerdict(t, outs[j]);
        if ("lines" in v) return;
        // A path your Prettier ignores is not one its check will name.
        if (none === null && v.why === "no formatted form" && !res?.error) return;
        leave(w, t, none ?? v.why);
      });
      if (none === null) w.text = repadTables(w.text, blocks, outs);
    });
    if (left.length)
      tables =
        `${left.length} table(s) whose links this run respells are left as they are, their columns possibly out of line — ` +
        `format them yourself: ${left.join(", ")}`;
  }

  const repoMoves: Array<[string, string]> = [...fileMap.entries(), ...plan.ownTemplates, ...plan.moves.filter((m) => m.kind === "feature" || m.kind === "born-item").map((m) => [m.from, m.to] as [string, string])]
    .map(([f, t]) => [`${ctx.docsRootName}/${f}`, `${ctx.docsRootName}/${t}`]);
  const docsRel = (abs: string) => relative(d, abs).split(sep).join("/");
  const linkMoves = [...linkMap].map(([f, t]) => [docsRel(f), docsRel(t)] as [string, string]);
  return { plan, templates, cycles, physical, writes: [...writes, ...created], repoMoves, linkMoves, keptLibrary, shaping, tables, excludedKept };
}

// =======================================================================================
// The phases
// =======================================================================================

function preflight(ctx: Ctx): void {
  step(1, "Preflight");
  // A TREE PAST THE RELEASE THIS RUN INSTALLS. The run would complete, replace
  // the owned files with the older release's and set every marker back to it.
  // The release installed is SCAFFOLD_RELEASE, or a --scaffold-dir's own.
  const installs = (ctx.scaffold && docsVersionOf(join(resolve(ctx.scaffold), "docs/README.md"))) || SCAFFOLD_RELEASE;
  const docsVersion = docsVersionOf(join(ctx.docsRoot, "README.md"));
  const at = treeRelease(ctx.config?.version, docsVersion);
  if (at && (compareReleases(at.version, installs) ?? 0) > 0) {
    // One marker stale: name the other, so the stop does not read as if both said it.
    const other = at.from === "docs_version" ? { from: ".project-docs.json version", v: ctx.config?.version } : { from: "docs_version", v: docsVersion };
    const disagree =
      typeof other.v === "string" && other.v !== at.version
        ? ` (its ${other.from} says ${other.v}: the markers disagree, and the later one is what a run would set back)`
        : "";
    fail(
      `this tree is already past what this migration installs: its ${at.from} is ${at.version}${disagree}, and this\n` +
        `   migration installs ${installs}. There is nothing for it to do, and running it would set the tree back.\n\n` +
        `   A newer project-docs plugin may carry a newer migration. Without one there is nothing to migrate:\n` +
        `   update-project-docs goes on to its root-file and verify steps.`
    );
  }
  const missing: string[] = [];
  if (!ctx.config) missing.push(".project-docs.json (v2.6-to-v2.7 writes it)");
  if (!existsSync(join(ctx.docsRoot, "SCHEMA.md"))) missing.push(`${ctx.docsRootName}/SCHEMA.md (v2.6-to-v2.7 installs it)`);
  if (!existsSync(join(ctx.root, "scripts/pdocs/cli.ts"))) missing.push("scripts/pdocs/cli.ts (v2.6-to-v2.7 installs it)");
  if (!existsSync(join(ctx.docsRoot, MANIFEST_NAME))) missing.push(`${ctx.docsRootName}/${MANIFEST_NAME} (v2.8-to-v2.9 records it)`);
  else if (!fileHas(join(ctx.root, "scripts/pdocs/lint/rules.ts"), "isSeeded"))
    missing.push("scripts/pdocs/lint/rules.ts carrying `isSeeded` (v2.9-to-v2.10 refreshes it)");
  if (missing.length > 0)
    fail(
      `this is not a v2.10 tree at ${ctx.root} — ${missing.length} of the things a v2.10 tree has ${missing.length === 1 ? "is" : "are"} missing:\n` +
        missing.map((m) => `       ${m}`).join("\n") +
        `\n\n   Migrations run in sequence: run the one named first, then this one. If ${ctx.root}\n` +
        `   is not the project root, pass --root <project root>.`
    );
  ok(
    `v2.10 tree at ${ctx.root}, docsRoot ${ctx.docsRootName}/, docs_version ${docsVersionOf(join(ctx.docsRoot, "README.md")) ?? "(no line)"}, ` +
      `.project-docs.json version ${JSON.stringify(ctx.config?.version ?? null)}`
  );

  if (!have("bun"))
    fail("bun is not on PATH. This script is running under it, but the verify phase and the gate run `bun scripts/pdocs/cli.ts` — put bun on PATH first.");
  if (!ctx.scaffold && !have("cookiecutter"))
    fail("cookiecutter is not installed, and no --scaffold-dir <path> was given. Install it, or generate the scaffold yourself and pass its path.");

  // THE PLAN, read-only. Built here so a judgment blocker stops the run before
  // the network is touched, and so the dirt check knows every file it writes.
  const head = run(["git", "rev-parse", "HEAD"], ctx.root);
  if (!ctx.state.base && head.code === 0) {
    ctx.state.base = head.stdout.trim();
    ok(`starting from commit ${ctx.state.base} — the commit to go back to, should you ever need to`);
  } else if (ctx.state.base) note(`this migration started from commit ${ctx.state.base}`);
  if (ctx.state.journal) {
    // An earlier run stopped between the first move and the last link: finish ITS
    // plan. A new plan made from a half-moved tree would find nothing to move.
    ctx.changes = fromJournal(ctx.state.journal);
    ctx.resumed = true;
    ok(`resuming an interrupted run: the plan it recorded in ${ctx.statePath} is finished, not remade`);
    // The recorded plan was made before the stop. It may write only over the bytes it
    // planned to replace, over its own text, or over what this migration left there —
    // never over an edit made since.
    const changed: string[] = [];
    const restore: string[] = [];
    const headSha = head.code === 0 ? head.stdout.trim() : null;
    const ref = !ctx.state.base || ctx.state.base === headSha ? "HEAD" : ctx.state.base;
    const prefix = run(["git", "rev-parse", "--show-prefix"], ctx.root).stdout.trim();
    for (const w of ctx.changes.writes) {
      const at = existsSync(w.to) ? w.to : w.from && existsSync(w.from) ? w.from : null;
      const now = at ? hashOf(at) : null;
      const allowed = new Set<string | null>([w.pre ?? null, sha256(w.text)]);
      for (const p of [w.to, w.from])
        if (p && Object.hasOwn(ctx.state.written, projectRel(ctx, p))) allowed.add(ctx.state.written[projectRel(ctx, p)] as string | null);
      if (w.created && now === null) continue;
      if (!allowed.has(now)) {
        changed.push(projectRel(ctx, at ?? w.to));
        if (w.from) restore.push(`git show ${ref}:${prefix}${projectRel(ctx, w.from)} > ${projectRel(ctx, at ?? w.to)}`);
      }
    }
    if (changed.length > 0 && !ctx.force)
      fail(
        `${changed.length} path(s) the recorded plan would write have changed since the run stopped:\n` +
          changed.map((p) => `       ${p}`).join("\n") +
          `\n\n   The plan was made before the stop, so finishing it would write over those edits (committed or not).\n` +
          `   To keep an edit: copy the file aside, put back the bytes the plan expects, re-run, then re-apply it:\n` +
          restore.map((l) => `       ${l}`).join("\n") +
          `\n   Or pass --force to write the recorded plan over them; the edits are lost.`
      );
    if (changed.length > 0) note(`--force: the recorded plan is written over ${changed.length} path(s) changed since the stop: ${changed.join(", ")}`);
  } else ctx.changes = computeChanges(ctx);
  const changes = ctx.changes;
  const blockers = ctx.resumed ? [] : [...changes.plan.blockers, ...changes.templates.blockers];
  if (blockers.length > 0)
    fail(
      `${blockers.length} judgment step(s) this migration will not take for you. Resolve each before the run —\n` +
        `   the guide's "Before you run it" says how — then run it again:\n\n` +
        blockers.map((b) => `     · ${b.startsWith("slug ") ? b : `${ctx.docsRootName}/${b}`}`).join("\n")
    );
  ok("no judgment steps outstanding: every document in a retired folder has a place");

  const git = run(["git", "status", "--porcelain"], ctx.root);
  if (git.code !== 0) note("not a git repository — nothing to report");
  else if (git.stdout.trim() === "") ok("git tree clean");
  else {
    // Dirt counts only in a path this run will write, and only when it is not this
    // migration's own uncommitted output — so a re-run after a stop, uncommitted,
    // is not stopped by what the earlier run did, nor by fixes made elsewhere.
    // A file already holding the planned text is the run's own, however it got there.
    const planned = new Map<string, string>();
    for (const w of changes.writes) planned.set(projectRel(ctx, w.to), sha256(w.text));
    const dirty = dirtyUnder(ctx, writeCandidates(ctx)).filter(
      (p) => p !== `.${STATE_NAME}` && !ours(ctx, p) && planned.get(p) !== hashOf(join(ctx.root, p))
    );
    if (dirty.length > 0 && !ctx.force)
      fail(
        `${dirty.length} path(s) this run would write have uncommitted changes:\n` +
          dirty.map((p) => `       ${p}`).join("\n") +
          `\n\n   This run moves documents and rewrites their frontmatter and links; an uncommitted edit in any of\n` +
          `   these cannot be told apart from what it did. Commit or stash them first — or pass --force.`
      );
    if (dirty.length > 0) note(`--force: writing over ${dirty.length} uncommitted path(s): ${dirty.join(", ")}`);
    note(`working tree is dirty (${git.stdout.trim().split("\n").length} path(s)) — commit or stash first if you want this migration isolated`);
  }

  const { result } = pdocsCheck(ctx.root);
  ctx.baseline = result;
  if (!result) note("`pdocs check` under the installed CLI printed nothing this script can read — no baseline");
  else if (result.code === 0 && result.total === 0) note("`pdocs check` under the installed CLI: clean — the baseline the verify phase compares against");
  else note(`\`pdocs check\` under the installed CLI: exit ${result.code}, ${result.total} problem(s) — the baseline the verify phase compares against`);
}

function getScaffold(ctx: Ctx): string {
  step(2, "Current scaffold");
  if (ctx.scaffold) {
    const s = resolve(ctx.scaffold);
    if (!existsSync(join(s, "docs/SCHEMA.md")) || !existsSync(join(s, "scripts/pdocs")))
      fail(`--scaffold-dir ${s} is not a generated project root (expected docs/SCHEMA.md and scripts/pdocs/ inside it).`);
    ok(`using ${s}`);
    return s;
  }
  const out = mkdtempSync(join(tmpdir(), "pdocs-scaffold-"));
  ctx.generatedTmp = out;
  const r = run(
    ["cookiecutter", TEMPLATE_REPO, "--checkout", SCAFFOLD_TAG, "--no-input", "-o", out, "install_target=New project folder"],
    ctx.root
  );
  if (r.code !== 0) fail(`cookiecutter failed (exit ${r.code}):\n${r.stderr || r.stdout}`);
  const dirs = readdirSync(out, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (dirs.length !== 1) fail(`expected one generated project in ${out}, found ${dirs.length}`);
  const s = join(out, dirs[0]!.name);
  if (!existsSync(join(s, "docs/SCHEMA.md")) || !existsSync(join(s, "scripts/pdocs")))
    fail(`generated scaffold at ${s} is missing docs/SCHEMA.md or scripts/pdocs/`);
  ok(`generated at ${s}`);
  return s;
}

/** Everything the later phases require of the scaffold, verified before anything is written. */
function verifyScaffold(ctx: Ctx): string {
  if (!ctx.scaffoldDir) fail("no scaffold to verify — the scaffold phase did not run.");
  const s = ctx.scaffoldDir;
  const source = ctx.scaffold ? `--scaffold-dir ${s}` : `${TEMPLATE_REPO} at ${SCAFFOLD_TAG}`;
  const readme = join(s, "docs/README.md");
  if (!existsSync(readme)) fail(`the scaffold has no docs/README.md at ${readme}`);
  const version = docsVersionOf(readme);
  if (!version || !/^\d+\.\d+\.\d+$/.test(version))
    fail(`could not read a version from the scaffold's docs/README.md (got ${JSON.stringify(version ?? null)})`);
  const missing = SCAFFOLD_MARKERS.filter(([f, m]) => (m === null ? !existsSync(join(s, f)) : !fileHas(join(s, f), m))).map(
    ([f, m]) => (m === null ? f : `${f} carrying \`${m}\``)
  );
  if (missing.length > 0)
    fail(
      `the scaffold at ${source} is older than this migration requires (release ${version}, missing ${missing.join(", ")}).\n` +
        `   Pass --scaffold-dir pointing at a scaffold generated from a checkout that has the 9.0.0 layout — the guide's\n` +
        `   "Run it" section says how.`
    );
  ok(`release ${version}, carrying the 9.0.0 layout (features/, items/, TEMPLATES/, the state groups, lint/work.ts)`);
  return version as string;
}

function printPlan(ctx: Ctx): void {
  step(3, "Plan");
  const c = ctx.changes as Changes;
  const d = (p: string) => `${ctx.docsRootName}/${p}`;
  const counts: Record<string, number> = {};
  for (const mv of c.plan.moves) {
    counts[mv.kind] = (counts[mv.kind] ?? 0) + 1;
    const state = mv.lifecycle ? `, ${mv.was ?? "(none)"} → ${mv.lifecycle}` : "";
    const folder = mv.kind === "feature" || mv.kind === "born-item";
    const label = { feature: "feature", "born-item": "item, born from a project with no proposal", backlog: "item", fragment: "item", research: "research item + write-up", report: "report" }[mv.kind];
    note(`${ctx.dryRun ? "would move" : "moves"} ${d(mv.from)}${folder ? "/" : ""} → ${d(mv.kind === "research" ? `${mv.to}/write-up.md` : mv.to)}${folder || mv.kind === "research" ? "/" : ""}`.replace(/write-up\.md\/$/, "write-up.md") + ` (${label}${state})`);
    if (mv.note) note(`  ${d(mv.from)}: ${mv.note}`);
  }
  for (const w of c.writes.filter((x) => x.fm)) note(`frontmatter: ${relative(ctx.root, w.to)} — ${w.fm}`);
  const retyped = c.writes.filter((w) => w.fm?.includes("→ artifact (its position), dropped"));
  if (retyped.length)
    notice(
      ctx,
      `${retyped.length} document(s) retyped \`artifact\` by position — a brief in artifacts/, or a plan or session nested below its owner's own ` +
        `(a workstream's): 9.x types only an entity's top-level documents. The fields an artifact cannot carry were dropped; what each held, should you want it in the body:` +
        retyped.map((w) => `\n       ${relative(ctx.root, w.to)} — ${(w.fm as string).slice((w.fm as string).indexOf("dropped ") + 8)}`).join("")
    );
  if (c.shaping) note(c.shaping);
  if (c.tables) note(c.tables);
  for (const [f, t] of c.templates.moves) note(`template: ${d(f)} → ${d(t)}, its seed record carried with it`);
  for (const r of c.templates.removals) note(`template: ${d(r)} removed — the form for a retired type, untouched since the scaffold recorded it`);
  const recordedNow = readManifest(ctx).files;
  for (const [f, t] of c.plan.ownTemplates) {
    const dropped = recordedNow[f] !== undefined ? ", and the seed record an earlier migration took of it by its name dropped" : "";
    note(`template of yours: ${d(f)} → ${d(t)} — the scaffold never shipped it, so it is yours: moved as it is${dropped}`);
    notice(ctx, `${d(t)} is a template of yours, moved as it is from ${d(f)}: the scaffold never shipped it${dropped}.`);
  }
  for (const r of Object.keys(RETIRED_READMES).filter((x) => existsSync(join(ctx.docsRoot, x)))) note(`owned: ${d(r)} removed (retired with its folder)`);
  // A project folder with no proposal records work that already ran; with no plan active the run
  // reads it as finished. That is right for most, and a guess for each: say so where it is read.
  const bornDone = c.plan.moves.filter((m) => m.kind === "born-item" && m.lifecycle === "done" && !m.archived);
  if (bornDone.length > 0)
    notice(
      ctx,
      `${bornDone.length} item(s) born from a project folder with no proposal were set \`done\`: with no plan active, the run read the work as finished, ` +
        `and it cannot tell finished from stopped. Check each, and set one that is not finished: ` +
        `bun scripts/pdocs/cli.ts set item/<slug> --lifecycle backlog (or ready, active, dropped)` +
        bornDone.map((m) => `\n       ${d(`${m.to}/item.md`)}`).join("")
    );
  for (const e of editedOwned(ctx)) {
    const line = editedOwnedLine(ctx, e);
    note(`yours, in an owned file: ${line}`);
    notice(ctx, line);
  }
  for (const j of c.plan.junk) note(`not a document: ${d(j)} removed`);
  for (const n of c.cycles.notes) note(n);
  const links = c.writes.reduce((n, w) => n + w.links, 0);
  const inPlace = c.writes.filter((w) => w.from === w.to && w.links > 0).length;
  note(`links: ${links} respelled across ${c.writes.filter((w) => w.links > 0).length} file(s), ${inPlace} of them in place`);
  const cfg = patchLintArrays((ctx.config?.lint ?? {}) as LintKeys, { moves: c.repoMoves, keptLibrary: c.keptLibrary, docsRootName: ctx.docsRootName });
  for (const ch of cfg.changes) note(`config: ${ch}`);
  for (const n of cfg.notes) note(`config — for you: ${n}`);
  const ignores = planIgnoreFiles(ctx, c.repoMoves, "replace");
  for (const p of ignores) {
    if (p.text !== null) for (const ch of p.changes) note(`ignore file: ${p.rel}: ${ch}`);
    for (const f of p.flags) note(`ignore file — for you: ${p.rel}: ${f}`);
  }
  ignoreNotices(ctx, ignores);
  const kept = (c.excludedKept ?? []).filter((p) => c.physical.some(([f, t]) => f !== t && (join(ctx.root, p) === t || join(ctx.root, p).startsWith(`${t}${sep}`))));
  if (kept.length) {
    const line =
      `${kept.length} document(s) in lint.exclude ${ctx.dryRun ? "would be" : "were"} moved with their folder but not edited — no frontmatter written, no link respelled; ` +
      `a link in one to a moved document is yours to fix:${kept.map((p) => `\n       ${p}`).join("")}`;
    note(line);
    notice(ctx, line);
  }
  for (const k of c.keptLibrary) note(`kept: ${d(k)}/ — a retired library folder, declared in lint.types so it stays lintable (D11)`);
  ok(
    `${c.plan.moves.length} move(s): ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ") || "none — nothing left in a retired folder"}; ` +
      `${c.writes.filter((w) => w.created).length} item file(s) to create`
  );
}

function refreshOwned(ctx: Ctx): void {
  step(4, "Refresh the owned files");
  const s = ctx.scaffoldDir;
  const cliSrc = join(s, "scripts/pdocs");
  const cliDst = join(ctx.root, "scripts/pdocs");
  const stale = filesIn(cliSrc).filter((rel) => !sameBytes(join(cliSrc, rel), join(cliDst, rel)));
  if (stale.length === 0) ok("scripts/pdocs/ already identical to the scaffold's");
  else {
    cpSync(cliSrc, cliDst, { recursive: true });
    for (const rel of stale) track(ctx, join(cliDst, rel));
    ok(`scripts/pdocs/ refreshed (${stale.length} file(s) written; the copy merges, so a file of your own there survives)`);
  }

  const sDocs = join(s, "docs");
  // Read before anything below replaces them.
  const edited = new Map(editedOwned(ctx).map((e) => [e.rel, e]));
  const owned = [
    ...OWNED_ROOT,
    ...readdirSync(sDocs, { withFileTypes: true })
      .filter((e) => e.isDirectory() && OWNED_CATEGORIES.includes(e.name) && existsSync(join(sDocs, e.name, "README.md")))
      .map((e) => `${e.name}/README.md`),
  ];
  const currentVersionLine = existsSync(join(ctx.docsRoot, "README.md"))
    ? /^docs_version:.*$/m.exec(readFileSync(join(ctx.docsRoot, "README.md"), "utf8"))?.[0] ?? null
    : null;
  let same = 0;
  const texts = owned.map((rel) => {
    const text = readFileSync(join(sDocs, rel), "utf8");
    // The version marker moves in phase 11, after the verify phase passes — not here.
    return rel === "README.md" && currentVersionLine ? text.replace(/^docs_version:.*$/m, currentVersionLine) : text;
  });
  // Each as the project's own Prettier prints it at its path (never a downloaded one): the
  // scaffold's bytes are formatted by the template repository's Prettier and config, and
  // another version or config can reject them. Safe for every later migration: an owned
  // file is compared by `proseKey`, which ignores what a formatter changes.
  let shapedBy: string | null = null;
  /** Owned files your Prettier would change beyond what `proseKey` ignores: left at the scaffold's bytes. */
  const unshaped: string[] = [];
  if (!ctx.skipFormat) {
    const res = prettierFormat(ctx.root, owned.map((rel, i) => ({ path: join(ctx.docsRoot, rel), text: texts[i] as string })));
    if (res.failed === null && !res.missing && res.version !== null) {
      res.out.forEach((t, i) => {
        if (typeof t !== "string") return;
        // Only a change the owned-file comparison cannot see: a narrow print width that adds a
        // trailing comma to a YAML list would read as an edit of yours to the next migration.
        if (proseKey(t) === proseKey(texts[i] as string)) texts[i] = t;
        else if (t !== texts[i]) unshaped.push(owned[i] as string);
      });
      shapedBy = res.version;
    }
  }
  for (const [i, rel] of owned.entries()) {
    const dst = join(ctx.docsRoot, rel);
    const text = texts[i] as string;
    if (existsSync(dst) && readFileSync(dst, "utf8") === text) {
      same++;
      continue;
    }
    const existed = existsSync(dst);
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, text);
    track(ctx, dst);
    ok(`${ctx.docsRootName}/${rel} ${existed ? "replaced" : "installed"} (owned)`);
    const e = edited.get(rel);
    if (e) note(`  yours: ${editedOwnedLine(ctx, e)}`);
  }
  if (same) ok(`${same} owned file(s) already identical to the scaffold's${shapedBy ? ", as your Prettier prints it" : ""}`);
  if (shapedBy) note(`the owned files are written as your Prettier ${shapedBy} prints them: their words are the scaffold's, their wrapping is yours`);
  if (unshaped.length)
    note(
      `left at the scaffold's bytes, because your Prettier would change more than wrapping (a trailing comma in a list, say), which the next ` +
        `migration would read as an edit of yours: ${unshaped.map((r) => `${ctx.docsRootName}/${r}`).join(", ")}. Your \`prettier --check\` may name them; ` +
        `formatting them is harmless, and a later migration shows what it compared with the \`git show\` it prints.`
    );
  for (const rel of filesIn(sDocs).filter((r) => basename(r) === ".gitkeep")) {
    if (existsSync(join(ctx.docsRoot, rel))) continue;
    mkdirSync(dirname(join(ctx.docsRoot, rel)), { recursive: true });
    writeFileSync(join(ctx.docsRoot, rel), "");
    track(ctx, join(ctx.docsRoot, rel));
    ok(`${ctx.docsRootName}/${rel} installed (structural)`);
  }
  for (const rel of Object.keys(RETIRED_READMES)) {
    if (!existsSync(join(ctx.docsRoot, rel))) continue;
    rmSync(join(ctx.docsRoot, rel));
    track(ctx, join(ctx.docsRoot, rel));
    ctx.removed.readmes++;
    ok(`${ctx.docsRootName}/${rel} removed — owned, and its folder is retired; links to it now point at ${ctx.docsRootName}/${RETIRED_READMES[rel]}`);
    const e = edited.get(rel);
    if (e) note(`  yours: ${editedOwnedLine(ctx, e)}`);
  }
}

/**
 * The move record (MOVES_NAME), written when this run has something to move,
 * and kept after the run completes.
 *
 * MERGED, NEVER REPLACED, within one migration. A re-run after a stop late in
 * the run (phase 8) plans afresh from the half-migrated tree, where only the
 * templates are left to move: written whole, its record would lose every
 * document move the first run made. So a record from the same starting commit
 * (`base`) keeps its pairs, and this run's are added — keyed by `from`, a
 * later plan's `to` winning, which only ever restates the same move. A record
 * from another base is another migration's, and is replaced.
 */
function recordMoves(ctx: Ctx): void {
  const c = ctx.changes as Changes;
  if (c.physical.length === 0 && c.templates.moves.length === 0 && c.plan.ownTemplates.length === 0) return;
  const base = ctx.state.base ?? null;
  const merged = new Map<string, string>();
  if (existsSync(ctx.movesPath))
    try {
      const rec = JSON.parse(readFileSync(ctx.movesPath, "utf8")) as { base?: unknown; docsRoot?: unknown; moves?: unknown };
      if (rec.base === base && rec.docsRoot === ctx.docsRootName && Array.isArray(rec.moves))
        for (const [f, t] of rec.moves as Array<[string, string]>) merged.set(f, t);
    } catch {
      // An unreadable record is replaced by this run's.
    }
  for (const [f, t] of c.linkMoves) merged.set(f, t);
  const tmp = `${ctx.movesPath}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ docsRoot: ctx.docsRootName, base, moves: [...merged] }, null, 1)}\n`);
  renameSync(tmp, ctx.movesPath);
}

/** The move record as absolute old → new paths: the file a run wrote, else this run's plan. */
function moveTable(ctx: Ctx): Map<string, string> {
  let moves: Array<[string, string]> = (ctx.changes as Changes | null)?.linkMoves ?? [];
  if (existsSync(ctx.movesPath))
    try {
      const rec = JSON.parse(readFileSync(ctx.movesPath, "utf8")) as { moves?: Array<[string, string]> };
      if (Array.isArray(rec.moves) && rec.moves.length > 0) moves = rec.moves;
    } catch {
      // An unreadable record only costs the suggestions; the plan's moves stand in.
    }
  return new Map(moves.map(([f, t]) => [join(ctx.docsRoot, f), join(ctx.docsRoot, t)]));
}

function moveDocuments(ctx: Ctx): void {
  step(5, "Move the documents and rewrite their frontmatter");
  const c = ctx.changes as Changes;
  recordMoves(ctx);
  if (c.physical.length === 0 && !c.writes.some((w) => w.fm)) {
    ok("nothing to move — no document is left in a retired folder");
    return;
  }
  const r = (p: string) => relative(ctx.root, p);
  // The plan is recorded BEFORE the first move, so a run stopped anywhere from here
  // to the end of phase 6 is finished by the next one from this same plan.
  if (!ctx.resumed) {
    for (const w of c.writes) w.pre = w.from && existsSync(w.from) ? hashOf(w.from) : null;
    ctx.state.journal = toJournal(c);
    saveState(ctx);
  }
  // Before the first move: an ignore file must protect a moved file at both spellings
  // until phase 7, whatever stops the run in between.
  addIgnoreSpellings(ctx);
  for (const [from, to] of c.physical) {
    const fromThere = existsSync(from);
    const toThere = existsSync(to);
    if (!fromThere && toThere) {
      note(`already moved: ${r(from)} → ${r(to)}`);
      continue;
    }
    if (!fromThere) fail(`${r(from)} is not there to move, and ${r(to)} is not there either — the tree changed after the plan was made.`);
    if (toThere) fail(`${r(to)} already exists — this run will not move ${r(from)} over it.`);
    const inner = statSync(from).isDirectory() ? filesIn(from) : [""];
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
    for (const f of inner) {
      track(ctx, f ? join(from, f) : from);
      track(ctx, f ? join(to, f) : to);
    }
    ok(`moved ${r(from)}${statSync(to).isDirectory() ? "/" : ""} → ${r(to)}${statSync(to).isDirectory() ? "/" : ""}`);
  }
  let fm = 0;
  for (const w of c.writes.filter((x) => x.from !== x.to || x.fm)) {
    if (!existsSync(w.to) || readFileSync(w.to, "utf8") !== w.text) {
      mkdirSync(dirname(w.to), { recursive: true });
      writeFileSync(w.to, w.text);
      track(ctx, w.to);
    }
    if (w.fm) {
      fm++;
      ok(`${w.created ? "created" : "frontmatter"} ${r(w.to)} — ${w.fm}`);
    }
    if (w.created) ctx.toFormat.push(relative(ctx.docsRoot, w.to).split(sep).join("/"));
  }
  const lost = c.physical.filter(([f, t]) => existsSync(f) || !existsSync(t));
  if (lost.length) fail(`${lost.length} move(s) did not land: ${lost.map(([f]) => r(f)).join(", ")}`);
  const unwritten = c.writes.filter((w) => (w.from !== w.to || w.fm) && readFileSync(w.to, "utf8") !== w.text);
  if (unwritten.length) fail(`${unwritten.length} document(s) do not hold the text written: ${unwritten.map((w) => r(w.to)).join(", ")}`);
  ok(`${c.physical.length} move(s) made, ${fm} frontmatter block(s) rewritten or created — no document deleted`);
}

function rewriteInPlace(ctx: Ctx): void {
  step(6, "Rewrite the links that pointed at moved documents");
  const c = ctx.changes as Changes;
  const inPlace = c.writes.filter((w) => w.from === w.to && !w.fm);
  for (const w of inPlace) {
    if (readFileSync(w.to, "utf8") === w.text) continue;
    writeFileSync(w.to, w.text);
    track(ctx, w.to);
  }
  const wrong = inPlace.filter((w) => readFileSync(w.to, "utf8") !== w.text);
  if (wrong.length) fail(`${wrong.length} file(s) do not hold the rewritten links: ${wrong.map((w) => relative(ctx.root, w.to)).join(", ")}`);

  const total = c.writes.reduce((n, w) => n + w.links, 0);
  ok(
    total === 0
      ? "no link pointed at a moved document"
      : `${total} link(s) respelled: ${c.writes.filter((w) => w.from !== w.to && w.links > 0).length} moved file(s) (written in phase 5), ${inPlace.length} in place`
  );
  for (const w of inPlace) note(`${relative(ctx.root, w.to)}: ${w.links} link(s)`);
}

/** Every move, text and exclude glob of the plan is on disk: from here a re-run plans afresh. */
function closeJournal(ctx: Ctx): void {
  if (!ctx.state.journal) return;
  ctx.state.journal = null;
  saveState(ctx);
}

function patchConfig(ctx: Ctx): void {
  step(7, "Patch .project-docs.json and the ignore files");
  const c = ctx.changes as Changes;
  // Before the config, and so before the journal closes: a re-plan of a moved tree
  // has no moves to respell an ignore file from.
  respellIgnoreFiles(ctx);
  const before = readFileSync(ctx.configPath, "utf8");
  const cfg = JSON.parse(before) as Record<string, unknown>;
  const lint = (cfg.lint ?? {}) as LintKeys;
  const { lint: next, changes, notes } = patchLintArrays(lint, { moves: c.repoMoves, keptLibrary: c.keptLibrary, docsRootName: ctx.docsRootName });
  for (const n of notes) note(`for you: ${n}`);
  if (changes.length === 0) {
    ok(".project-docs.json already carries the 9.0.0 lint keys");
    closeJournal(ctx);
    return;
  }
  const intended = { ...cfg, lint: next };
  const patched = patchLintText(before, next);
  let verified = false;
  try {
    verified = patched !== null && Bun.deepEquals(JSON.parse(patched), intended, true);
  } catch {
    verified = false;
  }
  if (verified) writeFileSync(ctx.configPath, patched as string);
  else writeFileSync(ctx.configPath, reserialiseLike(intended, before));
  track(ctx, ctx.configPath);
  // Kept until here, not phase 6: an exclude glob is respelled from the plan's moves,
  // and a re-plan of a moved tree has none to respell it from.
  closeJournal(ctx);
  for (const ch of changes) ok(ch);
  ok(verified ? "written in the file's own text; every other byte as it was" : "re-serialised, indent kept: the lint keys could not be patched in place");
}

const WHY_KEPT: Record<Exclude<Verdict, "update" | "install">, string> = {
  "keep-modified": "you edited it since it was recorded; the scaffold's moved, yours stays",
  "keep-unknown": "on disk but never recorded; unknown is not permission",
  "keep-deleted": "recorded, and you deleted it; deleting is an edit",
};

function reconcileSeeds(ctx: Ctx, version: string): void {
  step(8, "Seeds: moved templates, retired ones, and the rest by verdict");
  const c = ctx.changes as Changes;
  const d = ctx.docsRoot;
  const dn = (p: string) => `${ctx.docsRootName}/${p}`;
  const manifestPath = join(d, MANIFEST_NAME);
  ctx.manifestBefore = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : null;
  let m = readManifest(ctx);
  for (const [from, to] of c.templates.records) {
    const had = m.files[from] !== undefined;
    m = renameRecord(m, from, to);
    if (had) note(`record ${dn(from)} → ${dn(to)} (renameRecord)`);
  }
  for (const [from, to] of c.templates.moves) {
    if (!existsSync(join(d, from))) continue;
    if (existsSync(join(d, to))) fail(`${dn(to)} already exists — this run will not move ${dn(from)} over it.`);
    mkdirSync(dirname(join(d, to)), { recursive: true });
    renameSync(join(d, from), join(d, to));
    track(ctx, join(d, from));
    track(ctx, join(d, to));
    ok(`template moved: ${dn(from)} → ${dn(to)}`);
  }
  for (const rel of c.templates.removals) {
    if (!existsSync(join(d, rel))) continue;
    rmSync(join(d, rel));
    track(ctx, join(d, rel));
    ctx.removed.templates++;
    ok(`template removed: ${dn(rel)} — untouched since the scaffold recorded it; its type is retired`);
  }
  for (const [from, to] of c.plan.ownTemplates) {
    if (!existsSync(join(d, from))) continue;
    if (existsSync(join(d, to))) fail(`${dn(to)} already exists — this run will not move your template ${dn(from)} over it.`);
    mkdirSync(dirname(join(d, to)), { recursive: true });
    renameSync(join(d, from), join(d, to));
    track(ctx, join(d, from));
    track(ctx, join(d, to));
    ok(`template of yours moved: ${dn(from)} → ${dn(to)} — as it is; the scaffold never shipped it`);
  }
  for (const rel of c.templates.dropped) delete m.files[rel];
  // No record may name a path in a retired folder once it is gone: the scaffold's templates
  // there were carried or dropped above, so what is left is a record an earlier migration
  // took of an adopter's template by its name, as v2.8-to-v2.9 once did.
  for (const rel of Object.keys(m.files))
    if (LEGACY_FOLDERS.includes(rel.split("/")[0] as string) && !existsSync(join(d, rel))) {
      delete m.files[rel];
      note(`record ${dn(rel)} dropped — the scaffold never shipped it; an earlier migration recorded your template by its name`);
    }
  // A retired library folder the adopter deleted before the run (the guide's
  // "Delete" option) takes its template's record with it: the record describes
  // a file that is gone on purpose, in a folder that is not coming back.
  for (const folder of Object.keys(KEPT_LIBRARY))
    if (!existsSync(join(d, folder)))
      for (const rel of Object.keys(m.files))
        if (rel.startsWith(`${folder}/`)) {
          delete m.files[rel];
          note(`record ${dn(rel)} dropped — ${dn(folder)}/ was deleted before the run`);
        }
  for (const rel of c.plan.junk) {
    if (!existsSync(join(d, rel))) continue;
    rmSync(join(d, rel));
    track(ctx, join(d, rel));
    ctx.removed.junk++;
    note(`removed ${dn(rel)} — not a document`);
  }
  // Emptied legacy folders go; one that still holds anything stays, for the verify phase to name.
  const prune = (abs: string): boolean => {
    if (!existsSync(abs) || !statSync(abs).isDirectory()) return false;
    const empty = readdirSync(abs).map((e) => prune(join(abs, e))).every(Boolean) && readdirSync(abs).length === 0;
    if (empty) rmdirSync(abs);
    return empty;
  };
  for (const f of LEGACY_FOLDERS)
    if (existsSync(join(d, f)) && prune(join(d, f))) {
      ctx.removed.folders++;
      ok(`${dn(f)}/ removed — empty`);
    }

  const sDocs = join(ctx.scaffoldDir, "docs");
  const shipped = [...filesIn(sDocs).filter((r) => isSeeded(r) && !r.split("/").includes("_archive")), ...[...SEEDED_PAGES].filter((p) => existsSync(join(sDocs, p)))].sort();
  if (shipped.length === 0) fail("the scaffold ships no templates. Is --scaffold-dir a generated project root?");
  const tally: Record<string, number> = { update: 0, identical: 0, install: 0, "keep-modified": 0, "keep-unknown": 0, "keep-deleted": 0 };
  const recorded: string[] = [];
  for (const rel of shipped) {
    const v = verdictFor(m, d, rel);
    if (sameBytes(join(sDocs, rel), join(d, rel))) {
      tally.identical = (tally.identical ?? 0) + 1;
      recorded.push(rel);
      if (v !== "update") note(`${dn(rel)} already at the scaffold's bytes — recorded (${v})`);
      continue;
    }
    tally[v] = (tally[v] ?? 0) + 1;
    if (mayWrite(v)) {
      const dst = within(d, rel) ?? join(d, rel);
      mkdirSync(dirname(dst), { recursive: true });
      cpSync(join(sDocs, rel), dst);
      track(ctx, join(d, rel)); // `dst` is the real path; the record is keyed as git reports it
      recorded.push(rel);
      ctx.toFormat.push(rel);
      ok(`${v === "update" ? "updated" : "installed"} ${dn(rel)}`);
    } else note(`kept ${dn(rel)} — ${v}: ${WHY_KEPT[v as Exclude<Verdict, "update" | "install">]}`);
  }
  ctx.recorded = recorded;
  ctx.manifest = { version, files: m.files };
  ok(
    `${shipped.length} seeded file(s) in the scaffold: ${tally.update} updated, ${tally.identical} already at the scaffold's bytes, ` +
      `${tally.install} installed, ${tally["keep-modified"]} kept (modified), ${tally["keep-unknown"]} kept (unknown), ${tally["keep-deleted"]} kept (deleted)`
  );
}

function formatAndRecord(ctx: Ctx): void {
  step(9, "Format what this run created, then record");
  const rel = [...new Set(ctx.toFormat)].map((w) => relative(ctx.root, join(ctx.docsRoot, w)));
  if (rel.length === 0) note("nothing created or installed, so nothing to format");
  else if (ctx.skipFormat) note("formatting skipped (--skip-format)");
  else {
    // The project's own Prettier, never a downloaded one (prettierFormat).
    const abs = rel.map((f) => join(ctx.root, f));
    const res = prettierFormat(ctx.root, abs.map((path) => ({ path, text: readFileSync(path, "utf8") })));
    const why = res.failed ?? (res.missing ? null : res.version === null ? res.error ?? "it did not load" : res.error);
    if (res.missing) note(`no Prettier in this project, so the ${rel.length} file(s) this run created or installed are not formatted — none is downloaded`);
    else if (why !== null)
      fail(
        `your Prettier failed over the ${rel.length} file(s) this run created or installed (${why.replaceAll(`${ctx.root}/`, "")}). Recording their\n` +
          `   hashes now would produce a record your own formatter invalidates. Fix the formatter, or pass --skip-format; re-running is safe.`
      );
    else {
      let changed = 0;
      abs.forEach((path, i) => {
        const out = res.out[i];
        if (typeof out === "string" && out !== readFileSync(path, "utf8")) {
          writeFileSync(path, out);
          changed++;
        }
        track(ctx, path);
      });
      ok(`formatted ${rel.length} file(s) this run created or installed with your Prettier ${res.version} (${changed} changed) — before recording, never after; no document of yours was formatted`);
    }
  }
  if (ctx.manifest === null) fail("no record to write — the seeds phase did not run.");
  const m = ctx.manifest as SeedManifest;
  // What the formatter changed in a file this run created is now its planned text.
  for (const w of (ctx.changes as Changes).writes) if (w.created && existsSync(w.to)) w.text = readFileSync(w.to, "utf8");
  for (const r of ctx.recorded) m.files[r] = hashOf(join(ctx.docsRoot, r)) as string;
  const after = serialiseManifest(m, ctx.manifestBefore);
  if (after === ctx.manifestBefore) ok(`${ctx.docsRootName}/${MANIFEST_NAME} unchanged (${Object.keys(m.files).length} entries, version ${m.version})`);
  else {
    writeFileSync(join(ctx.docsRoot, MANIFEST_NAME), after);
    track(ctx, join(ctx.docsRoot, MANIFEST_NAME));
    ok(`${ctx.docsRootName}/${MANIFEST_NAME} written: ${ctx.recorded.length} recorded at version ${m.version}, ${Object.keys(m.files).length} entries`);
  }
}

/** Every file still under a retired workbench folder, docs-relative. */
function legacyLeft(ctx: Ctx): string[] {
  return LEGACY_FOLDERS.flatMap((f) => (existsSync(join(ctx.docsRoot, f)) ? filesIn(join(ctx.docsRoot, f)).map((r) => `${f}/${r}`).concat(filesIn(join(ctx.docsRoot, f)).length === 0 ? [`${f}/`] : []) : []));
}

function verify(ctx: Ctx): void {
  step(10, "Verify: no retired folder remains, and the refreshed CLI passes the tree");
  const left = legacyLeft(ctx);
  if (left.length > 0)
    fail(
      `${left.length} path(s) remain in a retired folder, so the move is not complete (the refreshed CLI still lints the\n` +
        `   retired types until they are removed, so a clean check alone cannot prove it):\n` +
        indented(left.map((l) => `${ctx.docsRootName}/${l}`).join("\n")) +
        `\n\n   Move or delete each, then re-run; the version markers were NOT moved.`
    );
  ok(`no retired folder remains (${LEGACY_FOLDERS.join(", ")})`);
  const { result, raw } = pdocsCheck(ctx.root);
  if (!result) fail(`\`pdocs check\` under the refreshed CLI printed nothing this script can read:\n\n${indented(raw.trimEnd())}`);
  const r = result as CheckResult;
  if (r.code === 0) {
    ok(r.total === 0 ? "pdocs check: clean (exit 0)" : `pdocs check: exit 0 — ${r.total} problem(s), and lint.adopting is true so the gate does not fail on them`);
    return;
  }
  const b = ctx.baseline;
  let newer = "The CLI before the refresh gave no baseline, so this script cannot say which of them are new.";
  if (b) {
    const was = new Set(b.problems);
    const now = new Set(r.problems);
    newer = `Against the baseline the older lint reported (${b.total}): ${r.problems.filter((p) => !was.has(p)).length} new, ${b.problems.filter((p) => !now.has(p)).length} no longer reported, ${r.problems.filter((p) => was.has(p)).length} unchanged.`;
  }
  // A MISSING FILE the move record accounts for gets its correction, suggested — never written.
  const table = moveTable(ctx);
  const fixes: string[] = [];
  const ambiguous: string[] = [];
  const fromRoot = { root: ctx.root, docsRootName: ctx.docsRootName };
  for (const p of r.problems) {
    const m = /^MISSING FILE\s+(.+?): (\S.*?)(?: {2}\(not portable.*)?$/.exec(p);
    if (!m) continue;
    const s = suggestLinkFixes(join(ctx.root, m[1] as string), m[2] as string, table, existsSync, fromRoot);
    if (s === null) continue;
    if ("fix" in s) fixes.push(`${m[1]}: ${m[2]} → ${s.fix}  (${s.reading})`);
    else ambiguous.push(`${m[1]}: ${m[2]} — ${s.ambiguous.map((a) => `${a.fix} (${a.reading})`).join(" or ")}`);
  }
  const suggested =
    (fixes.length === 0
      ? ""
      : `\n\n   Suggested corrections for ${fixes.length} MISSING FILE link(s), each target found through this run's moves. Each names\n` +
        `   its reading: moved (the target moved), one level short (a legacy _archive/ moved in by hand), from the root\n` +
        `   (a link written from the project root), archived since (the target was archived after the link was\n` +
        `   written). Check each, then make it by hand; the run rewrites none:\n\n` +
        indented(fixes.join("\n"))) +
    (ambiguous.length === 0
      ? ""
      : `\n\n   Ambiguous — two readings of each of these ${ambiguous.length} link(s) land on different documents, so none is suggested.\n` +
        `   Pick the one you meant:\n\n` +
        indented(ambiguous.join("\n")));
  fail(
    `\`pdocs check\` exits ${r.code} on the migrated tree: ${r.total} problem(s). ${newer}\n` +
      `\n   The moves STAY — every one is named above — and the version markers were NOT moved: this tree is not at\n` +
      `   ${SCAFFOLD_RELEASE} until the check passes. The worklist is \`bun scripts/pdocs/cli.ts report --format text\`; the problems are:\n\n` +
      indented(r.problems.join("\n")) +
      suggested +
      `\n\n   Work them without committing, then run the same command: every phase finds its work done, the\n` +
      `   uncommitted changes this run made are recognised as its own, and the run passes once these are worked.`
  );
}

function bumpVersion(ctx: Ctx, version: string): void {
  step(11, "Version markers");
  const readme = join(ctx.docsRoot, "README.md");
  const RE = /^docs_version:\s*"[^"]*"/m;
  if (!existsSync(readme)) note(`${ctx.docsRootName}/README.md is not there — nothing to set`);
  else {
    const before = readFileSync(readme, "utf8");
    if (!RE.test(before)) note(`${ctx.docsRootName}/README.md carries no docs_version line — nothing to set`);
    else {
      const after = before.replace(RE, `docs_version: "${version}"`);
      if (after === before) ok(`${ctx.docsRootName}/README.md already at ${version}`);
      else {
        writeFileSync(readme, after);
        track(ctx, readme);
        ok(`${ctx.docsRootName}/README.md set to ${version}`);
      }
    }
  }
  const before = readFileSync(ctx.configPath, "utf8");
  if (JSON.parse(before).version === version) {
    ok(`.project-docs.json already at ${version}`);
    return;
  }
  const how = writeVersionInto(ctx.configPath, before, version);
  track(ctx, ctx.configPath);
  ok(`.project-docs.json set to ${version} — ${how}`);
}

function cleanup(ctx: Ctx): void {
  step(12, "Clean up");
  if (ctx.scaffold) {
    note("scaffold was supplied with --scaffold-dir — left in place");
    return;
  }
  if (!ctx.scaffoldDir) {
    note("nothing to remove");
    return;
  }
  rmSync(resolve(ctx.scaffoldDir, ".."), { recursive: true, force: true });
  ok("generated scaffold removed");
}

/**
 * THE INVARIANTS, CHECKED BY THE PROGRAM ITSELF, after the last phase. Each
 * line names the phase whose work or position it protects.
 */
export function migrationHolds(ctx: Ctx, version: string): string[] {
  const v: string[] = [];
  const c = ctx.changes as Changes;
  for (const [f, m] of SCAFFOLD_MARKERS.filter(([f]) => f.startsWith("scripts/")))
    if (m === null ? !existsSync(join(ctx.root, f)) : !fileHas(join(ctx.root, f), m))
      v.push(`${f}${m ? ` carrying \`${m}\`` : ""} is not installed — the refresh phase installs the scaffold's 9.0.0 CLI`);
  if (!fileHas(join(ctx.docsRoot, "SCHEMA.md"), "## State groups"))
    v.push(`${ctx.docsRootName}/SCHEMA.md has no State groups section — the refresh phase installs the scaffold's`);

  const unmoved = c.physical.filter(([f, t]) => existsSync(f) || !existsSync(t));
  if (unmoved.length) v.push(`${unmoved.length} planned move(s) are not on disk, e.g. ${relative(ctx.root, unmoved[0]![0])} — the move phase makes them`);
  const stale = c.writes.filter((w) => !existsSync(w.to) || readFileSync(w.to, "utf8") !== w.text);
  if (stale.length) v.push(`${stale.length} document(s) do not hold their planned text, e.g. ${relative(ctx.root, stale[0]!.to)} — the move and link phases write them, and nothing after may`);
  const left = legacyLeft(ctx);
  if (left.length) v.push(`${left.length} path(s) remain in a retired folder — the verify phase stops the run on this`);

  let cfg: { lint?: LintKeys; version?: unknown } = {};
  try {
    cfg = JSON.parse(readFileSync(ctx.configPath, "utf8"));
  } catch (e) {
    v.push(`.project-docs.json does not parse: ${(e as Error).message}`);
  }
  const lint = cfg.lint ?? {};
  if ((lint.skip ?? []).includes("_archive") || !Array.isArray(lint.scopes) || !["features", "items"].every((f) => (lint.workbench ?? []).includes(f)) || (lint.workbench ?? []).some((f) => LEGACY_FOLDERS.includes(f)))
    v.push(".project-docs.json's lint keys are not the 9.0.0 ones (workbench, skip, scopes) — the config phase patches them");

  let m: SeedManifest | null = null;
  try {
    m = loadManifest(ctx.docsRoot);
  } catch (e) {
    v.push(`${ctx.docsRootName}/${(e as Error).message} — the record step writes it whole`);
  }
  if (m) {
    if (m.version !== version) v.push(`${ctx.docsRootName}/${MANIFEST_NAME} version is ${JSON.stringify(m.version)}, not ${version} — the seeds phase records against the scaffold's release`);
    const drift = ctx.recorded.filter((r) => hashOf(join(ctx.docsRoot, r)) !== m!.files[r]);
    if (drift.length) v.push(`${drift.length} seeded file(s) this run recorded no longer match the record, e.g. ${ctx.docsRootName}/${drift[0]} — the format step must come before the record, and nothing after it may touch them`);
    const missing = filesIn(join(ctx.scaffoldDir, "docs")).filter((r) => isSeeded(r) && verdictFor(m!, ctx.docsRoot, r) === "install");
    if (missing.length) v.push(`${missing.length} template(s) the scaffold ships are neither on disk nor recorded, e.g. ${ctx.docsRootName}/${missing[0]} — the seeds phase installs them`);
  }

  if (docsVersionOf(join(ctx.docsRoot, "README.md")) !== version)
    v.push(`${ctx.docsRootName}/README.md docs_version is ${docsVersionOf(join(ctx.docsRoot, "README.md")) ?? "(no line)"}, not ${version} — the version phase sets both markers together`);
  if (cfg.version !== version) v.push(`.project-docs.json version is ${JSON.stringify(cfg.version ?? null)}, not ${version} — the version phase sets both markers together`);

  const check = pdocsCheck(ctx.root);
  if (!check.result || check.result.code !== 0)
    v.push(`\`pdocs check\` exits ${check.result?.code ?? "unreadably"} on the migrated tree — the verify phase stops the run before the markers move, so something after it changed a document`);
  if (!ctx.scaffold && ctx.scaffoldDir && existsSync(ctx.scaffoldDir)) v.push("the generated scaffold is still on disk — the cleanup phase removes it");
  return v;
}

// =======================================================================================

export function main(argv: string[]): number {
  let opts: Options;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(`${(e as Error).message}`);
    return 2;
  }
  let ctx: Ctx | null = null;
  try {
    ctx = resolveContext(opts);
    if (opts.respell !== null) {
      respell(ctx, opts.respell, opts.write);
      return 0;
    }
    preflight(ctx);
    ctx.scaffoldDir = getScaffold(ctx);
    const version = verifyScaffold(ctx);
    printPlan(ctx);
    if (ctx.dryRun) {
      say("\n   Dry run — phases 4 to 11 would apply the plan above.");
      cleanup(ctx);
      printNotices(ctx);
      const c = ctx.changes as Changes;
      say(`\nDry run complete — nothing was changed. ${c.plan.moves.length} move(s) planned, ${c.writes.length} document(s) to write.`);
      return 0;
    }
    refreshOwned(ctx);
    moveDocuments(ctx);
    rewriteInPlace(ctx);
    patchConfig(ctx);
    reconcileSeeds(ctx, version);
    formatAndRecord(ctx);

    // TEST SEAM, and the only one: a docs-relative path overwritten after the
    // record is written, so a test can show the end-of-run invariants are wired.
    const mutate = process.env.PDOCS_MIGRATE_TEST_MUTATE;
    if (mutate) {
      const target = within(ctx.docsRoot, mutate);
      if (target === null) fail("PDOCS_MIGRATE_TEST_MUTATE must name a path inside the docs root.");
      ctx.wrote = true;
      writeFileSync(target as string, `${readFileSync(target as string, "utf8")}\n<!-- mutated by the test seam -->\n`);
    }

    verify(ctx);
    bumpVersion(ctx, version);
    cleanup(ctx);

    const broken = migrationHolds(ctx, version);
    if (broken.length > 0)
      fail(
        `the migration's own invariants do not hold after this run:\n` +
          broken.map((b) => `     · ${b}`).join("\n") +
          `\n\n   Nothing was rolled back. Fix the phase the line names and re-run.`
      );
    const c = ctx.changes as Changes;
    // The run is whole: its record has nothing left to tell a re-run.
    rmSync(ctx.statePath, { force: true });
    const rm = ctx.removed;
    printNotices(ctx);
    say(
      `\nMigration complete. ${c.plan.moves.length} move(s), ${c.writes.length} document(s) written, no document of yours deleted; ` +
        `removed: ${rm.templates} untouched retired template(s), ${rm.readmes} retired owned README(s), ${rm.junk} non-document file(s) (.gitkeep, .DS_Store), ` +
        `${rm.folders} emptied retired folder(s). The tree is at release ${version}.`
    );
    if (!rootPointsAtCli(ctx.root))
      say(
        `\nYour root AGENTS.md / CLAUDE.md does not point at the pdocs CLI, so an agent that starts there may write\n` +
          `documents by hand. update-project-docs Step 6 ("Documentation CLI pointer") has the section to add.`
      );
    return 0;
  } catch (e) {
    if (ctx?.wrote)
      try {
        saveState(ctx);
      } catch {
        // The stop below is still the thing to report.
      }
    const state = ctx?.wrote
      ? `\n   The tree may be partly migrated. Re-running is safe: fix what the stop names — no need to commit first —\n` +
        `   and run the same command. It recognises its own uncommitted changes from ${ctx.statePath}, finishes an\n` +
        `   interrupted move from the plan recorded there, and stops only on an edit of yours in a path it would write.`
      : `\n   Nothing was written.`;
    if (e instanceof MigrationError) {
      console.error(`\nSTOPPED: ${(e as Error).message}${state}`);
      return 1;
    }
    console.error(`\nSTOPPED: unexpected failure — ${(e as Error).message}${state}`);
    return 1;
  } finally {
    if (ctx?.generatedTmp && existsSync(ctx.generatedTmp)) rmSync(ctx.generatedTmp, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
