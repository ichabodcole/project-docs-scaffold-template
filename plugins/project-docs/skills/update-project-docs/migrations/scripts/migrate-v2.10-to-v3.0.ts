#!/usr/bin/env bun
/**
 * v2.10 → v3.0 (scaffold 9.0.0). The migration, not a description of one.
 *
 * WHY THIS IS A SCRIPT. It generates a scaffold and reads a version from it,
 * every later phase consumes the move map an earlier one built, several checks
 * must be able to stop the run, and an adopter may arrive with part of it done.
 *
 * WHAT IT DOES
 *   1  preflight  — a v2.10 tree, the tools, git, the baseline `pdocs check`,
 *                   and every JUDGMENT BLOCKER (briefs, reports without one
 *                   owner, edited retired templates, files it cannot place)
 *   2  scaffold   — the 9.0.0 template, at its own tag (D16), verified
 *   3  plan       — the move map, every frontmatter rewrite, every config key;
 *                   `--dry-run` prints it and stops here
 *   4  refresh    — the owned files; the retired owned READMEs removed
 *   5  move       — every document to its new place, frontmatter rewritten
 *   6  links      — every link that pointed at a moved document, respelled
 *   7  config     — `lint` arrays patched in place; every other byte kept
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
 *   --skip-format          do not run Prettier over the files this run creates.
 *   --force                write over uncommitted changes in the paths this run
 *                          touches — on a re-run after a stop, over edits made
 *                          since the stop. Without it the preflight stops on them.
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
/** The scaffold release this migration was written against (plan D16). */
const SCAFFOLD_TAG = "project-docs-scaffold-template-v9.0.0";
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

const joinFrontmatter = (fm: string, body: string) => `---\n${fm}\n---\n${body}`;

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

/** A YAML scalar the lint reads back as `s`: plain where safe, double-quoted otherwise. */
export function yamlScalar(s: string): string {
  if (/^[A-Za-z0-9(][^:#\n"'\\]*$/.test(s) && !/\s$/.test(s) && !/: /.test(s)) return s;
  return JSON.stringify(s);
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
  const lines = body.split("\n");
  const h1 = lines.find((l) => /^#\s+\S/.test(l));
  const fromName = titleize(slugOf(basename(fileName), "backlog").slug);
  const title = h1 ? plainText(h1.replace(/^#\s+/, "")) || fromName : fromName;
  let description = "";
  const prose = stripFences(body).split(/\n\s*\n/);
  for (const para of prose) {
    const t = para.trim();
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
 * A `lint.exclude` glob with every moved path respelled — only where the new
 * path is certain. `moves` are repository-relative `[from, to]` pairs, a folder
 * or a file: a glob naming one of them, or something under one, follows it.
 * Returns the glob unchanged when it names no retired folder, and `null` when
 * it names a retired folder but no single move: a wildcard where the entity
 * would be (`docs/projects/*` could now be `features/` or `items/`, and
 * `docs/backlog/**` respelled to `docs/items/**` would exclude every item), or
 * a path nothing moved. The caller leaves a `null` as written and names it.
 */
export function rewriteExcludeGlob(glob: string, moves: Array<[string, string]>, docsRootName: string): string | null {
  const sorted = [...moves].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    if (glob === from) return to;
    if (glob.startsWith(`${from}/`)) return to + glob.slice(from.length);
  }
  if (LEGACY_FOLDERS.some((f) => glob === `${docsRootName}/${f}` || glob.startsWith(`${docsRootName}/${f}/`))) return null;
  return glob;
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
    const next = lint.exclude.map((g) => {
      const r = rewriteExcludeGlob(g, f.moves, f.docsRootName);
      if (r === null)
        notes.push(`lint.exclude: \`${g}\` names a retired folder, and what it matched now sits under features/ or items/ — left as written; respell it by hand`);
      return r ?? g;
    });
    const changed = next.filter((g, i) => g !== lint.exclude?.[i]);
    if (changed.length) {
      out.exclude = next;
      lint.exclude.forEach((g, i) => {
        if (g !== next[i]) changes.push(`lint.exclude: ${g} → ${next[i]}`);
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
    const owners = research.filter(
      (r) => out.has(r.from) || linkTargets(textOf(r.from) ?? "").some((l) => resolveRel(r.from, l) === rel)
    );
    if (owners.length === 1) {
      moves.push({ kind: "report", from: rel, to: `${owners[0]!.to}/reports/${basename(rel)}`, archived });
      continue;
    }
    blockers.push(
      owners.length === 0
        ? `${rel} — a report with no owner: no investigation links to it, and it links to none. Link it from the investigation it belongs to, or move it into the owning project's reports/ folder (docs/projects/<slug>/reports/).`
        : `${rel} — a report with ${owners.length} possible owners (${owners.map((o) => o.from).join(", ")}). Leave the link between it and one of them only, or move it into the owning project's reports/ folder.`
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

  // --- anything else in a retired folder is a file this migration cannot place
  for (const rel of files) {
    const top = rel.split("/")[0] as string;
    if (!LEGACY_FOLDERS.includes(top) || handled.has(rel)) continue;
    if (rel in RETIRED_READMES || rel in RETIRED_TEMPLATES || rel in TEMPLATE_RENAMES) continue;
    blockers.push(`${rel} — not a document this migration knows where to put. Move it out of ${top}/ (or delete it) before the run.`);
  }

  return { moves, blockers, handled, junk };
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

/** Every file under `dir`, relative to it, sorted. `.git` and `node_modules` are not walked. */
function filesIn(dir: string, out: string[] = [], base = dir): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
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

export function serialiseManifest(m: SeedManifest, before: string | null): string {
  const indent = (before && /^([ \t]+)"/m.exec(before)?.[1]) || "  ";
  const files: Record<string, string> = {};
  for (const k of Object.keys(m.files).sort()) files[k] = m.files[k] as string;
  return `${JSON.stringify({ version: m.version, files }, null, indent)}\n`;
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
}

export function parseArgs(argv: string[]): Options {
  const opts: Options = { root: ".", dryRun: false, scaffold: null, skipFormat: false, force: false };
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
    else fail(`unknown argument \`${a}\`. Valid: --root, --dry-run, --scaffold-dir (--scaffold), --skip-format, --force.`);
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
  keptLibrary: string[];
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
  /** Whether this run is finishing an interrupted one from its recorded plan. */
  resumed: boolean;
  /** What this run removed that was not a document of the adopter's, for the last line. */
  removed: { templates: number; readmes: number; junk: number; folders: number };
}

interface Journal {
  plan: { moves: EntityMove[]; blockers: string[]; handled: string[]; junk: string[] };
  templates: TemplatePlan;
  cycles: { texts: Array<[string, string]>; itemCycle: Array<[string, string]>; notes: string[] };
  physical: Array<[string, string]>;
  writes: Write[];
  repoMoves: Array<[string, string]>;
  keptLibrary: string[];
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
}

const toJournal = (c: Changes): Journal => ({
  plan: { ...c.plan, handled: [...c.plan.handled] },
  templates: c.templates,
  cycles: { texts: [...c.cycles.texts], itemCycle: [...c.cycles.itemCycle], notes: c.cycles.notes },
  physical: c.physical,
  writes: c.writes,
  repoMoves: c.repoMoves,
  keptLibrary: c.keptLibrary,
});

const fromJournal = (j: Journal): Changes => ({
  plan: { ...j.plan, handled: new Set(j.plan.handled) },
  templates: j.templates,
  cycles: { texts: new Map(j.cycles.texts), itemCycle: new Map(j.cycles.itemCycle), notes: j.cycles.notes },
  physical: j.physical,
  writes: j.writes,
  repoMoves: j.repoMoves,
  keptLibrary: j.keptLibrary,
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
  const statePath =
    gitDir.exitCode === 0 && gitDir.stdout.toString().trim() ? join(gitDir.stdout.toString().trim(), STATE_NAME) : join(root, `.${STATE_NAME}`);
  if (existsSync(statePath)) {
    try {
      const parsed = JSON.parse(readFileSync(statePath, "utf8")) as Partial<RunState>;
      state = { written: parsed.written ?? {}, journal: parsed.journal ?? null, removed: parsed.removed ?? zero(), ...(parsed.base ? { base: parsed.base } : {}) };
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

/** A document's type from its position inside an owner folder (SCHEMA.md § Layout). */
export function positionalType(relInOwner: string): string {
  const fixed: Record<string, string> = {
    "feature.md": "feature",
    "item.md": "item",
    "plan.md": "plan",
    "design-resolution.md": "design-resolution",
    "test-plan.md": "test-plan",
    "DEV_KICKOFF.md": "kickoff",
    "handoff.md": "handoff",
    "write-up.md": "write-up",
  };
  if (fixed[relInOwner]) return fixed[relInOwner] as string;
  if (relInOwner.startsWith("sessions/")) return "session";
  if (relInOwner.startsWith("reports/")) return "report";
  return "artifact";
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
    if (mv.kind !== "feature" && mv.kind !== "report") ids.set(mv.from, uuidv7());
  }
  for (const [from, to] of Object.entries(TEMPLATE_RENAMES)) linkMap.set(join(d, from), join(d, to));
  for (const [from, to] of Object.entries(RETIRED_TEMPLATES)) linkMap.set(join(d, from), join(d, to));
  for (const [from, to] of Object.entries(RETIRED_READMES)) linkMap.set(join(d, from), join(d, to));
  // A link to a retired FOLDER itself goes to its successor. Only the folder: the link map
  // carries descendants too, and a link into a retired folder that nothing moved — one
  // already broken, or to a brief the adopter deleted — must stay as written, for the
  // verify phase to name, rather than be respelled into a second broken path.
  const folderMap = new Map(Object.entries(FOLDER_SUCCESSOR).map(([f, t]) => [join(d, f), join(d, t)]));

  // --- the frontmatter each moved document ends with
  const dateOf = (rel: string) => firstDate(ctx, join(d, rel));
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
    // An owned document: typed by position. Untouched unless it has no frontmatter or a retired type.
    const ownerRoot = mv.kind === "report" ? newRel.slice(0, newRel.indexOf("/reports/")) : mv.to;
    const type = positionalType(newRel.slice(ownerRoot.length + 1));
    if (fm === null) {
      const lc = ARCHIVED_OWNED_LIFECYCLE[type];
      return {
        text: synthesizeFrontmatter(type, rel, body, { date: dateOf(rel), extra: lc ? [["lifecycle", lc]] : [] }),
        what: `synthesized (${type}${lc ? `, ${lc}` : ""})`,
      };
    }
    const was = fmGet(fm, "type");
    if (was !== null && RETIRED_TYPE_NAMES.has(was) && was !== type) {
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
  for (const [fromAbs, toAbs] of candidates) {
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
      const source = [...sessions.reverse(), `${mv.from}/plan.md`].find((r) => splitFrontmatter(textOf(r) ?? "").fm !== null && fmGet(splitFrontmatter(textOf(r) ?? "").fm as string, "description"));
      title = titleize(basename(mv.from));
      description = source ? (fmGet(splitFrontmatter(textOf(source) ?? "").fm as string, "description") as string) : `Work recorded in ${basename(mv.from)} before it had an item.`;
      kind = "task";
      date = sessions.length ? (/(\d{4}-\d{2}-\d{2})/.exec(basename(sessions[sessions.length - 1] as string))?.[1] ?? dateOf(mv.from)) : dateOf(inside[0] ?? mv.from);
      line = "Work that ran before it had an item. Its record is the documents in this folder; the migration to 9.0.0 filed this item for it.";
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
    created.push({ from: null, to: join(d, mv.to, "item.md"), text: joinFrontmatter(fm, `\n# ${title}\n\n${line}\n`), links: 0, fm: `created (item, ${kind}, ${mv.lifecycle})`, created: true });
  }

  const repoMoves: Array<[string, string]> = [...fileMap.entries(), ...plan.moves.filter((m) => m.kind === "feature" || m.kind === "born-item").map((m) => [m.from, m.to] as [string, string])]
    .map(([f, t]) => [`${ctx.docsRootName}/${f}`, `${ctx.docsRootName}/${t}`]);
  return { plan, templates, cycles, physical, writes: [...writes, ...created], repoMoves, keptLibrary };
}

// =======================================================================================
// The phases
// =======================================================================================

function preflight(ctx: Ctx): void {
  step(1, "Preflight");
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
  if (!ctx.skipFormat && !have("npx"))
    fail("npx not found, and --skip-format was not given. What this run creates is formatted with your Prettier before its hash is recorded; install Node/npx, or pass --skip-format if this project does not use Prettier.");

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
  for (const [f, t] of c.templates.moves) note(`template: ${d(f)} → ${d(t)}, its seed record carried with it`);
  for (const r of c.templates.removals) note(`template: ${d(r)} removed — the form for a retired type, untouched since the scaffold recorded it`);
  for (const r of Object.keys(RETIRED_READMES).filter((x) => existsSync(join(ctx.docsRoot, x)))) note(`owned: ${d(r)} removed (retired with its folder)`);
  for (const j of c.plan.junk) note(`not a document: ${d(j)} removed`);
  for (const n of c.cycles.notes) note(n);
  const links = c.writes.reduce((n, w) => n + w.links, 0);
  const inPlace = c.writes.filter((w) => w.from === w.to && w.links > 0).length;
  note(`links: ${links} respelled across ${c.writes.filter((w) => w.links > 0).length} file(s), ${inPlace} of them in place`);
  const cfg = patchLintArrays((ctx.config?.lint ?? {}) as LintKeys, { moves: c.repoMoves, keptLibrary: c.keptLibrary, docsRootName: ctx.docsRootName });
  for (const ch of cfg.changes) note(`config: ${ch}`);
  for (const n of cfg.notes) note(`config — for you: ${n}`);
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
  for (const rel of owned) {
    const src = join(sDocs, rel);
    const dst = join(ctx.docsRoot, rel);
    let text = readFileSync(src, "utf8");
    // The version marker moves in phase 11, after the verify phase passes — not here.
    if (rel === "README.md" && currentVersionLine) text = text.replace(/^docs_version:.*$/m, currentVersionLine);
    if (existsSync(dst) && readFileSync(dst, "utf8") === text) {
      same++;
      continue;
    }
    const existed = existsSync(dst);
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, text);
    track(ctx, dst);
    ok(`${ctx.docsRootName}/${rel} ${existed ? "replaced" : "installed"} (owned)`);
  }
  if (same) ok(`${same} owned file(s) already identical to the scaffold's`);
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
  }
}

function moveDocuments(ctx: Ctx): void {
  step(5, "Move the documents and rewrite their frontmatter");
  const c = ctx.changes as Changes;
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
  step(7, "Patch .project-docs.json");
  const c = ctx.changes as Changes;
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
  for (const rel of c.templates.dropped) delete m.files[rel];
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
    const r = run(["npx", "prettier", "--write", ...rel], ctx.root);
    if (r.code !== 0)
      fail(
        `prettier exited ${r.code} over the ${rel.length} file(s) this run created or installed. Recording their hashes now would\n` +
          `   produce a record your own formatter invalidates. Fix the formatter, or pass --skip-format; re-running is safe.\n\n` +
          indented(r.stderr || r.stdout)
      );
    for (const f of rel) track(ctx, join(ctx.root, f));
    ok(`formatted ${rel.length} file(s) this run created or installed — before recording, never after; no document of yours was formatted`);
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
  fail(
    `\`pdocs check\` exits ${r.code} on the migrated tree: ${r.total} problem(s). ${newer}\n` +
      `\n   The moves STAY — every one is named above — and the version markers were NOT moved: this tree is not at\n` +
      `   9.0.0 until the check passes. The worklist is \`bun scripts/pdocs/cli.ts report --format text\`; the problems are:\n\n` +
      indented(r.problems.join("\n")) +
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
    preflight(ctx);
    ctx.scaffoldDir = getScaffold(ctx);
    const version = verifyScaffold(ctx);
    printPlan(ctx);
    if (ctx.dryRun) {
      say("\n   Dry run — phases 4 to 11 would apply the plan above.");
      cleanup(ctx);
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
    say(
      `\nMigration complete. ${c.plan.moves.length} move(s), ${c.writes.length} document(s) written, no document of yours deleted; ` +
        `removed: ${rm.templates} untouched retired template(s), ${rm.readmes} retired owned README(s), ${rm.junk} non-document file(s) (.gitkeep, .DS_Store), ` +
        `${rm.folders} emptied retired folder(s). The tree is at release ${version}.`
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
