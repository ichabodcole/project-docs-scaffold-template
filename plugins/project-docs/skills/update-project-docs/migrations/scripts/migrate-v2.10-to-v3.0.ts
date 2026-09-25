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
 *                          touches. Without it the preflight stops on them.
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
 * A `lint.exclude` glob with every moved path respelled. `moves` are
 * repository-relative `[from, to]` pairs, a folder or a file. A glob that
 * names a retired folder with a wildcard where the entity would be
 * (`docs/projects/*` …) is pointed at its successor folder. Returns the glob
 * unchanged when it names nothing that moved.
 */
export function rewriteExcludeGlob(glob: string, moves: Array<[string, string]>, docsRootName: string): string {
  const sorted = [...moves].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    if (glob === from) return to;
    if (glob.startsWith(`${from}/`)) return to + glob.slice(from.length);
  }
  for (const [folder, successor] of Object.entries(FOLDER_SUCCESSOR)) {
    const prefix = `${docsRootName}/${folder}/`;
    if (glob.startsWith(prefix)) return `${docsRootName}/${successor}/${glob.slice(prefix.length)}`;
  }
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
): { lint: LintKeys; changes: string[] } {
  const out: LintKeys = { ...lint };
  const changes: string[] = [];
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
    const next = lint.exclude.map((g) => rewriteExcludeGlob(g, f.moves, f.docsRootName));
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
  return { lint: out, changes };
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
      `${rel} — a brief. Move it into its owner's artifacts/ folder${linked.length === 1 ? ` (suggested: ${linked[0]!.from}/artifacts/, the one project it links to)` : ""}, or delete it. The run turns an artifact's type to \`artifact\`.`
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
