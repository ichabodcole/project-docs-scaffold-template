#!/usr/bin/env bun
/**
 * v2.9 → v2.10. The migration, not a description of one.
 *
 * WHY THIS IS A SCRIPT. It generates a scaffold and reads a version from it,
 * every later phase consumes that path, three checks must be able to stop the
 * run, and an adopter may arrive with part of it done. Any one of those is the
 * rule in `migration-authoring`; this has all four. One process makes a value
 * computed in one block and read in another impossible to lose, and a real
 * exit code makes an echoed "STOP" impossible to ignore.
 *
 * WHAT IT DOES
 *   1  preflight   — this is a v2.9 tree (config, SCHEMA.md, the CLI, the seed
 *                    manifest all present), the tools exist, git is read, and
 *                    the installed `pdocs check` is run once as the BASELINE
 *   2  scaffold    — generate the current template into a private temp dir,
 *                    and verify it carries what phase 3 installs
 *   3  refresh     — the OWNED files: scripts/pdocs/ and docs/SCHEMA.md
 *   4  reconcile   — every SEEDED template, by verdict against the manifest:
 *                    update and install write; keep-modified, keep-unknown and
 *                    keep-deleted are named and left alone; then Prettier over
 *                    what was written, and only then the record
 *   5  verify      — `pdocs check` on the result; see below
 *   6  version     — both markers, only when they move; the JSON's one key
 *                    patched in place, its other bytes kept
 *   7  cleanup     — remove the generated scaffold
 *
 * THE FIRST REAL USE OF THE VERDICTS. `scripts/pdocs/seed.ts` shipped with
 * v2.9 and nothing called it: the v2.9 migration only recorded. This is the
 * migration that compares. The logic is copied here rather than imported —
 * this script runs before the refresh, against a `seed.ts` a release older —
 * and the copy is pinned to the original by the test file beside this one.
 *
 * THE VERIFY PHASE MAY GO RED, AND THE REFRESH STAYS. The lint this migration
 * installs sees what the one it replaces hid — story-loom's real page named
 * `templates.md`, skipped as a template by the old rule and judged by the new
 * one. A tree that was clean under the old lint can be dirty under the new
 * one, and that is the refresh working, not failing. So phase 5 runs
 * `pdocs check`; exit 0 continues; anything else STOPS the run with exit 1
 * AFTER the refresh and BEFORE the markers move: the tree is not at v2.10
 * until the check passes, the worklist is `pdocs report`, and re-running is
 * safe — every phase finds its work done and the run ends at the same place
 * until the problems are worked. Phase 1's baseline is what lets the stop say
 * how many of the problems are new to the refreshed lint.
 *
 * PHASE 4 FORMATS BEFORE IT RECORDS. The record is the sha256 of the bytes on
 * disk; a template reformatted after recording no longer matches its own hash
 * and reads as the adopter's edit for ever. The v2.9 script learned this twice.
 * The end-of-run check re-reads every file this run recorded.
 *
 * Usage:
 *   bun migrate-v2.9-to-v2.10.ts [--root <path>] [--dry-run]
 *                                [--scaffold-dir <path>] [--skip-format] [--force]
 *
 *   --root <path>          the project to migrate. Default: the current directory.
 *   --dry-run              generate the scaffold, print every verdict, change
 *                          nothing in the project.
 *   --scaffold-dir <path>  use an already-generated scaffold instead of fetching
 *                          one. Skips the network; the path must be a generated
 *                          project root, not its docs/. `--scaffold` is an alias.
 *   --skip-format          do not run Prettier over the templates this run
 *                          writes. Use when the project does not use Prettier.
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
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

const TEMPLATE_REPO = "gh:ichabodcole/project-docs-scaffold-template";
const MANIFEST_NAME = ".pdocs-seed.json";
/**
 * What proves the refreshed CLI is the one this migration delivers: the
 * 3.11.0 `lint/rules.ts` imports `isSeeded` from `seed.ts` — one rule for
 * "is this a template" — and the 8.0.0 one does not mention it. The
 * `Applies If` cell of the migrations table tests the same string.
 */
const RULES_MARKER = "isSeeded";
const RULES_FILE = "scripts/pdocs/lint/rules.ts";
/** The Seeded row of SCHEMA.md § "Who owns which file" names the five exact shapes only from 3.11.0. */
const SCHEMA_MARKER = "`TEMPLATE-<variant>.md`";
const SKIP_DIRS = new Set(["_archive", "node_modules", ".git"]);
const PHASES = 7;

// ---------------------------------------------------------------------------------------
// Copied from `scripts/pdocs/seed.ts`, which this script cannot import: it runs
// BEFORE phase 3 replaces the adopter's copy, and the copy on disk is a release
// older. Pinned to the original, function by function, by
// `describe("the copied seed logic equals scripts/pdocs/seed.ts")` in the
// test file beside this one.
// ---------------------------------------------------------------------------------------

/**
 * The five template shapes, exactly: `TEMPLATE.md`, `TEMPLATE-<variant>.md`,
 * `YYYY-MM-DD-TEMPLATE-<type>.md`, `<name>.template.md`, anything under a
 * `TEMPLATES/` directory. Any path form is accepted.
 */
export function isSeeded(path: string): boolean {
  const name = basename(path);
  return (
    /^(?:YYYY-MM-DD-)?TEMPLATE(?:-[^/]+)?\.md$/.test(name) ||
    name.endsWith(".template.md") ||
    path.split("/").includes("TEMPLATES")
  );
}

export interface SeedManifest {
  version: string | null;
  files: Record<string, string>;
}

export type Verdict =
  | "update"
  | "install"
  | "keep-modified"
  | "keep-unknown"
  | "keep-deleted";

export function hashOf(abs: string): string | null {
  if (!existsSync(abs)) return null;
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function realIfPossible(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

/** The absolute path a manifest key names, or `null` if it escapes the docs root. */
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

export function mayWrite(v: Verdict): boolean {
  return v === "update" || v === "install";
}

/**
 * An absent manifest is an empty one. A corrupt one throws — the same text
 * `seed.ts` throws — rather than reading as empty, which would hide the damage
 * until the file is rewritten and the record lost for good.
 */
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

// ---------------------------------------------------------------------------------------

/** Every seeded file under `dir`, as paths relative to it, sorted. */
export function seededIn(dir: string, out: string[] = [], base = dir): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) seededIn(abs, out, base);
      continue;
    }
    if (entry.isFile() && isSeeded(relative(base, abs))) out.push(relative(base, abs));
  }
  return out.sort();
}

/** Every regular file under `dir`, relative to it. */
function filesIn(dir: string, out: string[] = [], base = dir): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) filesIn(abs, out, base);
    else if (entry.isFile()) out.push(relative(base, abs));
  }
  return out.sort();
}

const sameBytes = (a: string, b: string) =>
  existsSync(a) && existsSync(b) && hashOf(a) === hashOf(b);

const fileHas = (abs: string, marker: string) =>
  existsSync(abs) && readFileSync(abs, "utf8").includes(marker);

/** `docs_version` from a README, or null when the line is not there. */
export function docsVersionOf(readme: string): string | null {
  if (!existsSync(readme)) return null;
  return /^docs_version:\s*"([^"]+)"/m.exec(readFileSync(readme, "utf8"))?.[1] ?? null;
}

/**
 * The manifest as text, in the indent the file already uses (two spaces when
 * it does not exist yet), `version` first, keys sorted, trailing newline —
 * the shape the cookiecutter hook and the v2.9 script both write.
 */
export function serialiseManifest(m: SeedManifest, before: string | null): string {
  const indent = (before && /^([ \t]+)"/m.exec(before)?.[1]) || "  ";
  const files: Record<string, string> = {};
  for (const k of Object.keys(m.files).sort()) files[k] = m.files[k] as string;
  return `${JSON.stringify({ version: m.version, files }, null, indent)}\n`;
}

// ---------------------------------------------------------------------------------------
// Reporting. Every phase says what it did; a failure throws and stops the run.
// ---------------------------------------------------------------------------------------

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

function run(
  cmd: string[],
  cwd: string
): { code: number; stdout: string; stderr: string } {
  const p = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    code: p.exitCode ?? 1,
    stdout: p.stdout.toString(),
    stderr: p.stderr.toString(),
  };
}

const have = (bin: string) =>
  run(["sh", "-c", `command -v ${bin}`], ".").code === 0;

// ---------------------------------------------------------------------------------------

interface Options {
  root: string;
  dryRun: boolean;
  scaffold: string | null;
  skipFormat: boolean;
  /** Write over uncommitted changes in paths this run touches. */
  force: boolean;
}

export function parseArgs(argv: string[]): Options {
  const opts: Options = {
    root: ".",
    dryRun: false,
    scaffold: null,
    skipFormat: false,
    force: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = (): string => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--"))
        fail(`${a} needs a value. Usage is in the header of this script.`);
      i++;
      return v as string;
    };
    if (a === "--root") {
      const v = value();
      if (v.trim() === "") fail("--root was given an empty value.");
      opts.root = v;
    }
    // `--scaffold-dir` is the family's name for it; `--scaffold` is the alias
    // the v2.9 script also accepts, so the scripts take the same flags.
    else if (a === "--scaffold-dir" || a === "--scaffold") {
      const v = value();
      if (v.trim() === "") fail(`${a} was given an empty value.`);
      opts.scaffold = v;
    } else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--skip-format") opts.skipFormat = true;
    else if (a === "--force") opts.force = true;
    else
      fail(
        `unknown argument \`${a}\`. Valid: --root, --dry-run, --scaffold-dir (--scaffold), --skip-format, --force.`
      );
  }
  return opts;
}

// ---------------------------------------------------------------------------------------
// `.project-docs.json` is THEIRS. When a run moves `version` it patches that one
// value in the file's own text and verifies the result by parsing it; only when
// there is no top-level `"version"` to patch does it fall back to re-serialising,
// and then in the file's own indent, and the phase line says so. The v2.6 and
// v2.9 scripts carry the same pair; the v2.6 test file pins those two to each
// other, and this script's test file pins this copy to the v2.6 one.
// ---------------------------------------------------------------------------------------

/**
 * The text of `json` with the value of its top-level `"version"` replaced, and
 * every other byte — indent, array style, key order — as it was. `null` when
 * there is no top-level `"version"` key with a scalar value: a nested one, one
 * appearing as a value, or one spelled with an escape is not the match. The
 * caller parses the result before trusting it.
 */
export function patchTopLevelVersion(json: string, version: string): string | null {
  const n = json.length;
  // The index just past the string token that opens at `from`.
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
        // Followed by a colon it is a key; otherwise it is a value — keep going.
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

/**
 * `cfg` serialised in the indent `before` used (the first indented line's
 * leading whitespace; two spaces when there is none), ending in a newline only
 * if `before` did.
 */
export function reserialiseLike(cfg: unknown, before: string): string {
  const indent = /^([ \t]+)"/m.exec(before)?.[1] ?? "  ";
  return `${JSON.stringify(cfg, null, indent)}${before.endsWith("\n") ? "\n" : ""}`;
}

/**
 * Write `.project-docs.json` with `version` moved to `version` and nothing else
 * changed: the in-place patch when it parses to the intended object, else a
 * re-serialisation in the file's indent. Returns the phase line's suffix.
 */
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

// ---------------------------------------------------------------------------------------
// The phases
// ---------------------------------------------------------------------------------------

/** What `pdocs check --format json` said, when it could be read. */
interface CheckResult {
  code: number;
  total: number;
  adopting: boolean;
  problems: string[];
}

interface Ctx extends Options {
  docsRootName: string;
  docsRoot: string;
  configPath: string;
  /** The parsed `.project-docs.json`, or null when there is none. */
  config: Record<string, unknown> | null;
  scaffoldDir: string;
  /** The temp dir phase 2 generated into — "" when --scaffold-dir supplied one. */
  generatedTmp: string;
  /** Whether any phase has written into the project yet; decides what a stop says. */
  wrote: boolean;
  /** `pdocs check` under the CLI the tree had BEFORE the refresh; null if unreadable. */
  baseline: CheckResult | null;
  /** Docs-relative paths phase 4 recorded this run — the ones the invariant re-reads. */
  recorded: string[];
}

/** Paths and config, with no judgment yet — preflight is what judges. */
function resolveContext(o: Options): Ctx {
  const root = resolve(o.root);
  const configPath = join(root, ".project-docs.json");
  let config: Record<string, unknown> | null = null;
  if (existsSync(configPath)) {
    const text = readFileSync(configPath, "utf8");
    // JSON.parse refuses a byte-order mark as `Unrecognized token '﻿'` — an
    // invisible character in a message that reads as nonsense. Name it.
    if (text.startsWith("\uFEFF"))
      fail(
        ".project-docs.json starts with a UTF-8 byte-order mark (BOM), which JSON does not allow. Save the file without one (most editors call this \"UTF-8\" as opposed to \"UTF-8 with BOM\") and re-run."
      );
    try {
      config = JSON.parse(text);
    } catch (e) {
      fail(`.project-docs.json is not valid JSON: ${(e as Error).message}`);
    }
  }
  const docsRootName =
    typeof config?.docsRoot === "string" ? config.docsRoot : "docs";
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
    recorded: [],
  };
}

/** The manifest, or a stop that repeats `seed.ts`'s own reason. */
function readManifest(ctx: Ctx): SeedManifest {
  try {
    return loadManifest(ctx.docsRoot);
  } catch (e) {
    return fail(`${ctx.docsRootName}/${(e as Error).message}`);
  }
}

/** `pdocs check --format json` through the CLI installed at `root`, parsed. */
function pdocsCheck(root: string): { result: CheckResult | null; raw: string } {
  const r = run(["bun", join(root, "scripts/pdocs/cli.ts"), "check", "--format", "json"], root);
  try {
    const env = JSON.parse(r.stdout) as {
      data?: { total?: unknown; adopting?: unknown; problems?: Array<{ message?: unknown }> };
    };
    const d = env.data;
    if (!d || typeof d.total !== "number" || !Array.isArray(d.problems))
      return { result: null, raw: r.stderr || r.stdout };
    return {
      result: {
        code: r.code,
        total: d.total,
        adopting: d.adopting === true,
        problems: d.problems.map((p) => String(p.message ?? "")),
      },
      raw: r.stdout,
    };
  } catch {
    return { result: null, raw: r.stderr || r.stdout };
  }
}

/**
 * The paths this run will write that git says are dirty, relative to the
 * project root: the owned files phase 3 replaces, the manifest phase 4
 * rewrites, and every recorded template whose bytes still match its record —
 * the ones phase 4 would write over if the scaffold ships them. Computed before
 * the scaffold exists, so it errs toward naming a template the scaffold no
 * longer ships; a kept template is never named.
 */
function dirtyPathsTheRunWrites(ctx: Ctx): string[] {
  const candidates = [
    "scripts/pdocs",
    `${ctx.docsRootName}/SCHEMA.md`,
    `${ctx.docsRootName}/${MANIFEST_NAME}`,
  ];
  const m = readManifest(ctx);
  for (const rel of Object.keys(m.files))
    if (verdictFor(m, ctx.docsRoot, rel) === "update")
      candidates.push(`${ctx.docsRootName}/${rel}`);
  const present = candidates.filter((c) => existsSync(join(ctx.root, c)));
  if (present.length === 0) return [];
  // `--untracked-files=all` so an untracked directory is listed file by file
  // rather than collapsed to `dir/`.
  const st = run(
    ["git", "status", "--porcelain", "--untracked-files=all", "--", ...present],
    ctx.root
  );
  const top = run(["git", "rev-parse", "--show-toplevel"], ctx.root).stdout.trim();
  if (st.code !== 0 || !top) return [];
  // Porcelain paths are repo-root relative, whatever the cwd; a rename shows
  // as `old -> new`, and the new name is the one on disk. Both roots are
  // resolved through symlinks — git reports the real path, and on macOS
  // /var is one.
  const root = realpathSync(ctx.root);
  return st.stdout
    .split("\n")
    .filter((l) => l.length > 3)
    .map((l) => l.slice(3).split(" -> ").pop() as string)
    .map((p) => relative(root, join(realpathSync(top), p)))
    .sort();
}

function preflight(ctx: Ctx): void {
  step(1, "Preflight");
  // A v2.9 tree has all four. Each missing one belongs to an earlier
  // migration, and the stop names which — migrations run in sequence.
  const missing: string[] = [];
  if (!ctx.config)
    missing.push(".project-docs.json (v2.6-to-v2.7 writes it)");
  if (!existsSync(join(ctx.docsRoot, "SCHEMA.md")))
    missing.push(`${ctx.docsRootName}/SCHEMA.md (v2.6-to-v2.7 installs it)`);
  if (!existsSync(join(ctx.root, "scripts/pdocs/cli.ts")))
    missing.push("scripts/pdocs/cli.ts (v2.6-to-v2.7 installs it)");
  if (!existsSync(join(ctx.docsRoot, MANIFEST_NAME)))
    missing.push(`${ctx.docsRootName}/${MANIFEST_NAME} (v2.8-to-v2.9 records it)`);
  if (missing.length > 0)
    fail(
      `this is not a v2.9 tree at ${ctx.root} — ${missing.length} of the four files a v2.9 tree has ${missing.length === 1 ? "is" : "are"} missing:\n` +
        missing.map((m) => `       ${m}`).join("\n") +
        `\n\n   Migrations run in sequence: run the one named first, then this one. If ${ctx.root}\n` +
        `   is not the project root, pass --root <project root>.`
    );
  const readmeVersion = docsVersionOf(join(ctx.docsRoot, "README.md"));
  ok(
    `v2.9 tree at ${ctx.root}, docsRoot ${ctx.docsRootName}/, docs_version ${readmeVersion ?? "(no line)"}, ` +
      `.project-docs.json version ${JSON.stringify(ctx.config?.version ?? null)}`
  );

  // This script is running under bun, but the CLI the verify phase runs — and
  // the gate the adopter runs — is `bun scripts/pdocs/cli.ts`, so bun has to
  // be on PATH, not merely somewhere.
  if (!have("bun"))
    fail(
      "bun is not on PATH. This script is running under it, but the CLI it refreshes is run as `bun scripts/pdocs/cli.ts` by the verify phase and by the gate — put bun on PATH first."
    );
  if (!ctx.scaffold && !have("cookiecutter"))
    fail(
      "cookiecutter is not installed, and no --scaffold-dir <path> was given. Install it, or generate the scaffold yourself and pass its path."
    );
  // NOT a downgrade-and-continue. Formatting has to happen before the hashes
  // are taken, so "carried on without it" silently produces a record the
  // project's own pre-commit formatter invalidates on the next commit.
  // `--skip-format` is how a project that does not use Prettier says so.
  if (!ctx.skipFormat && !have("npx"))
    fail(
      "npx not found, and --skip-format was not given. A template this run writes is formatted with your Prettier before its hash is recorded; install Node/npx, or pass --skip-format if this project does not use Prettier."
    );

  // A dirty tree makes this migration's changes indistinguishable from the
  // adopter's. Dirt in a path this run will NOT touch is reported — it is
  // their repository. Dirt in a path it WILL write is a stop: the owned files
  // are replaced wholesale and an updated template is written over, so an
  // uncommitted edit there is gone and was never in git.
  const git = run(["git", "status", "--porcelain"], ctx.root);
  if (git.code !== 0) note("not a git repository — nothing to report");
  else if (git.stdout.trim() === "") ok("git tree clean");
  else {
    const dirty = dirtyPathsTheRunWrites(ctx);
    if (dirty.length > 0 && !ctx.force)
      fail(
        `${dirty.length} path(s) this run would write have uncommitted changes:\n` +
          dirty.map((p) => `       ${p}`).join("\n") +
          `\n\n   The owned files are replaced wholesale and an untouched template is written` +
          `\n   over; an uncommitted edit in any of these cannot be told apart from what this` +
          `\n   migration did, and is lost. Commit or stash them first — or pass --force to` +
          `\n   write over them anyway.`
      );
    if (dirty.length > 0)
      note(
        `--force: writing over ${dirty.length} uncommitted path(s) this run touches: ${dirty.join(", ")}`
      );
    note(
      `working tree is dirty (${git.stdout.trim().split("\n").length} path(s)) — commit or stash first if you want this migration isolated`
    );
  }

  // THE BASELINE. The check the tree passes or fails TODAY, under the CLI it
  // has, so the verify phase can say which problems are new to the refreshed
  // lint rather than pre-existing. Read-only; a CLI that cannot answer is a
  // note here, not a stop — the refreshed one is what has to answer.
  const { result } = pdocsCheck(ctx.root);
  ctx.baseline = result;
  if (!result)
    note("`pdocs check` under the installed CLI printed nothing this script can read — no baseline; the verify phase reports without one");
  else if (result.code === 0 && result.total === 0)
    note("`pdocs check` under the installed CLI: clean — the baseline the verify phase compares against");
  else
    note(
      `\`pdocs check\` under the installed CLI: exit ${result.code}, ${result.total} problem(s)` +
        (result.adopting ? " (lint.adopting is true, so the gate does not fail on them)" : "") +
        " — the baseline the verify phase compares against"
    );
}

function getScaffold(ctx: Ctx): string {
  step(2, "Current scaffold");
  if (ctx.scaffold) {
    const s = resolve(ctx.scaffold);
    if (
      !existsSync(join(s, "docs/SCHEMA.md")) ||
      !existsSync(join(s, "scripts/pdocs"))
    )
      fail(
        `--scaffold-dir ${s} is not a generated project root (expected docs/SCHEMA.md and scripts/pdocs/ inside it).`
      );
    ok(`using ${s}`);
    return s;
  }

  // Generated into a private temp dir, never into the project — a leftover
  // .scaffold-tmp in the project is how the guide shape silently copied from a
  // STALE scaffold while its own verification passed.
  // A DRY RUN GENERATES THE SCAFFOLD TOO: without one the version phase has
  // nothing to read and the reconcile phase has no templates to give verdicts
  // on, so the plan it printed would describe a run that could not happen.
  const out = mkdtempSync(join(tmpdir(), "pdocs-scaffold-"));
  // Recorded before cookiecutter runs, so a stop anywhere from here on — this
  // phase included — lets `main`'s finally remove it.
  ctx.generatedTmp = out;
  const r = run(
    [
      "cookiecutter",
      TEMPLATE_REPO,
      "--no-input",
      "-o",
      out,
      "install_target=New project folder",
    ],
    ctx.root
  );
  if (r.code !== 0)
    fail(`cookiecutter failed (exit ${r.code}):\n${r.stderr || r.stdout}`);

  const dirs = readdirSync(out, { withFileTypes: true }).filter((d) =>
    d.isDirectory()
  );
  if (dirs.length !== 1)
    fail(`expected one generated project in ${out}, found ${dirs.length}`);
  const s = join(out, dirs[0]!.name);
  if (
    !existsSync(join(s, "docs/SCHEMA.md")) ||
    !existsSync(join(s, "scripts/pdocs"))
  )
    fail(
      `generated scaffold at ${s} is missing docs/SCHEMA.md or scripts/pdocs/`
    );
  ok(`generated at ${s}`);
  return s;
}

/**
 * Everything phase 3 will require of the scaffold, verified HERE, in both
 * modes, before anything is written — and the release being migrated TO, read
 * from it. The markers that decide whether a scaffold is new enough belong to
 * the phase that fetches it, not to the phase that copies: on MediaForge the
 * published template was a release behind the v2.6 migration, the dry run
 * printed a green plan, and the real run stopped mid-copy.
 */
function verifyScaffold(ctx: Ctx): string {
  // An empty scaffold path would make `join` produce a path relative to the
  // process cwd — and read a version from whatever tree the script was run
  // from. Checked by itself, so the failure names the phase that did not run.
  if (!ctx.scaffoldDir)
    fail("no scaffold to verify — the scaffold phase did not run.");
  const s = ctx.scaffoldDir;
  const source = ctx.scaffold
    ? `--scaffold-dir ${s}`
    : `${TEMPLATE_REPO} (the published template)`;

  const readmeSrc = join(s, "docs/README.md");
  if (!existsSync(readmeSrc))
    fail(`the scaffold has no docs/README.md at ${readmeSrc}`);
  const version = docsVersionOf(readmeSrc);
  if (!version || !/^\d+\.\d+\.\d+$/.test(version))
    fail(
      `could not read a version from the scaffold's docs/README.md (got ${JSON.stringify(version ?? null)})`
    );

  const missing: string[] = [];
  if (!fileHas(join(s, RULES_FILE), RULES_MARKER))
    missing.push(`${RULES_FILE} carrying \`${RULES_MARKER}\``);
  if (!fileHas(join(s, "docs/SCHEMA.md"), SCHEMA_MARKER))
    missing.push(`docs/SCHEMA.md naming ${SCHEMA_MARKER} in its Seeded row`);
  if (missing.length > 0)
    fail(
      `the scaffold at ${source} is older than this migration requires (release ${version}, missing ${missing.join(" and ")}).\n` +
        `   This migration ships with the plugin; the scaffold is fetched from the published template, and the two\n` +
        `   are at different points whenever develop is ahead of the last release. Pass --scaffold-dir pointing at a\n` +
        `   scaffold generated from a checkout that has it — the guide's "Run it" section says how — or wait for the release.`
    );
  ok(
    `release ${version}, carrying what the refresh installs (${RULES_FILE} with \`${RULES_MARKER}\`, SCHEMA.md's exact-shape Seeded row)`
  );
  return version as string;
}

function refreshOwned(ctx: Ctx): void {
  step(3, "Refresh the owned files");
  const cliSrc = join(ctx.scaffoldDir, "scripts/pdocs");
  const cliDst = join(ctx.root, "scripts/pdocs");
  const schemaSrc = join(ctx.scaffoldDir, "docs/SCHEMA.md");
  const schemaDst = join(ctx.docsRoot, "SCHEMA.md");

  // Owned: replaced, every time — code reads it. Compared first so a re-run
  // can say "already identical" rather than claim a refresh it did not make.
  const cliStale = filesIn(cliSrc).filter(
    (rel) => !sameBytes(join(cliSrc, rel), join(cliDst, rel))
  );
  const schemaSame = sameBytes(schemaSrc, schemaDst);

  if (ctx.dryRun) {
    note(
      cliStale.length === 0
        ? "scripts/pdocs/ is already identical to the scaffold's"
        : `would refresh scripts/pdocs/ (${cliStale.length} file(s) to write: ${cliStale.join(", ")})`
    );
    note(
      schemaSame
        ? `${ctx.docsRootName}/SCHEMA.md is already identical to the scaffold's`
        : `would replace ${ctx.docsRootName}/SCHEMA.md (owned)`
    );
    return;
  }

  if (cliStale.length === 0)
    ok("scripts/pdocs/ already identical to the scaffold's");
  else {
    ctx.wrote = true;
    // The markers were verified on the SOURCE in phase 2, so a check of the
    // same markers here could not fail and is not written; the end-of-run
    // check reads them back from the installed files instead.
    cpSync(cliSrc, cliDst, { recursive: true });
    ok(
      `scripts/pdocs/ refreshed (${cliStale.length} file(s) written; the copy merges, so a file a later release removed would survive)`
    );
  }

  if (schemaSame)
    ok(`${ctx.docsRootName}/SCHEMA.md already identical to the scaffold's`);
  else {
    ctx.wrote = true;
    cpSync(schemaSrc, schemaDst);
    ok(`${ctx.docsRootName}/SCHEMA.md replaced (owned)`);
  }
}

/** Why a kept template is kept, in the words of SCHEMA.md's comparison table. */
const WHY_KEPT: Record<Exclude<Verdict, "update" | "install">, string> = {
  "keep-modified": "you edited it since it was recorded; the scaffold's moved, yours stays",
  "keep-unknown": "on disk but never recorded; unknown is not permission",
  "keep-deleted": "recorded, and you deleted it; deleting is an edit",
};

/**
 * Seeded: negotiated by hash. For every template the scaffold ships, the
 * verdict against the manifest decides; only `update` and `install` write.
 * Then Prettier over what was written, THEN the record — the ordering the
 * end-of-run check enforces. A recorded path the scaffold no longer ships is
 * reported and its record kept: a recorded path stays seeded whatever it is
 * called, and the lint reads the manifest alongside the shapes.
 */
function reconcileSeeded(ctx: Ctx, templates: string[], version: string): void {
  step(4, "Reconcile the seeded templates");
  if (templates.length === 0)
    fail(
      "the scaffold ships no templates — nothing under its docs/ matches the five template shapes. Is --scaffold-dir a generated project root?"
    );
  const scaffoldDocs = join(ctx.scaffoldDir, "docs");
  const manifestPath = join(ctx.docsRoot, MANIFEST_NAME);
  const before = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : null;
  const m = readManifest(ctx);

  const plan: Record<Verdict, string[]> = {
    update: [],
    install: [],
    "keep-modified": [],
    "keep-unknown": [],
    "keep-deleted": [],
  };
  const identical: string[] = [];
  for (const rel of templates) {
    const v = verdictFor(m, ctx.docsRoot, rel);
    if (v === "update" && sameBytes(join(scaffoldDocs, rel), join(ctx.docsRoot, rel)))
      identical.push(rel);
    else plan[v].push(rel);
  }
  const shipped = new Set(templates);
  // The WRITER refuses what the reader refuses, as seed.ts's does: a key that
  // escapes the docs root — a hand-edited manifest is the input this guards —
  // is never a verdict that permits writing, and it is not re-minted either.
  const invalid = Object.keys(m.files).filter((rel) => within(ctx.docsRoot, rel) === null).sort();
  const unshipped = Object.keys(m.files)
    .filter((rel) => !shipped.has(rel) && !invalid.includes(rel))
    .sort();
  const d = (rel: string) => `${ctx.docsRootName}/${rel}`;
  for (const rel of invalid)
    note(
      `${ctx.docsRootName}/${MANIFEST_NAME} records ${JSON.stringify(rel)}, which is not a path inside the docs root — ${ctx.dryRun ? "would be dropped" : "dropped"} from the record`
    );

  const summary = (tense: "would" | "did") =>
    `${templates.length} template(s) in the scaffold: ` +
    `${plan.update.length} ${tense === "would" ? "to update" : "updated"}, ` +
    `${identical.length} already at the scaffold's bytes, ` +
    `${plan.install.length} ${tense === "would" ? "to install" : "installed"}, ` +
    `${plan["keep-modified"].length} kept (modified), ` +
    `${plan["keep-unknown"].length} kept (unknown), ` +
    `${plan["keep-deleted"].length} kept (deleted)`;

  if (ctx.dryRun) {
    note(summary("would"));
    for (const rel of plan.update) note(`would update ${d(rel)} — update: recorded and untouched`);
    for (const rel of identical) note(`${d(rel)} already at the scaffold's bytes — update, nothing to write`);
    for (const rel of plan.install) note(`would install ${d(rel)} — install: neither on disk nor recorded, new in this release`);
    for (const v of ["keep-modified", "keep-unknown", "keep-deleted"] as const)
      for (const rel of plan[v]) note(`would keep ${d(rel)} — ${v}: ${WHY_KEPT[v]}`);
    for (const rel of unshipped)
      note(`${d(rel)} is recorded but the scaffold no longer ships it — left as it is, record kept`);
    const wouldRecord = [...plan.update, ...identical, ...plan.install];
    const wouldWrite = plan.update.length + plan.install.length;
    note(
      `would record ${wouldRecord.length} template(s) in ${ctx.docsRootName}/${MANIFEST_NAME} at version ${version}` +
        (wouldWrite === 0
          ? " (nothing written, so nothing to format)"
          : ctx.skipFormat
            ? " (no formatting: --skip-format)"
            : `, after prettier over the ${wouldWrite} written`)
    );
    return;
  }

  // Write. Only the two verdicts `mayWrite` permits reach this loop, and a
  // verdict that permits writing is only ever given for a path `within` has
  // resolved inside the docs root — so the validated path is what is written,
  // never a `join` recomputed here.
  const written: string[] = [];
  for (const rel of [...plan.update, ...plan.install].filter((rel) => mayWrite(verdictFor(m, ctx.docsRoot, rel)))) {
    const dst = within(ctx.docsRoot, rel) as string;
    ctx.wrote = true;
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(join(scaffoldDocs, rel), dst);
    written.push(rel);
    ok(`${plan.update.includes(rel) ? "updated" : "installed"} ${d(rel)}`);
  }
  for (const rel of identical) note(`${d(rel)} already at the scaffold's bytes — update, nothing to write`);
  for (const v of ["keep-modified", "keep-unknown", "keep-deleted"] as const)
    for (const rel of plan[v]) note(`kept ${d(rel)} — ${v}: ${WHY_KEPT[v]}`);
  for (const rel of unshipped)
    note(`${d(rel)} is recorded but the scaffold no longer ships it — left as it is, record kept`);

  // Format BEFORE recording, and only what this run wrote: reformatting a
  // template the adopter kept, or any document, is collateral the mechanism
  // never needed.
  if (written.length === 0) note("nothing was written, so nothing to format");
  else if (ctx.skipFormat) note("formatting skipped (--skip-format)");
  else {
    const rel = written.map((w) => relative(ctx.root, join(ctx.docsRoot, w)));
    const r = run(["npx", "prettier", "--write", ...rel], ctx.root);
    if (r.code !== 0)
      fail(
        `prettier exited ${r.code} over the ${rel.length} template(s) this run wrote. Recording their hashes now would\n` +
          `   produce a record your own formatter invalidates on the next commit. Fix the formatter, or pass\n` +
          `   --skip-format if this project does not use Prettier; the written templates are on disk, re-running is safe.\n\n` +
          indented(r.stderr || r.stdout)
      );
    ok(`formatted ${rel.length} written template(s) with your Prettier — before recording, never after`);
  }

  // Record: the written and the identical get the bytes on disk NOW; every
  // other entry — kept, deleted, unshipped — keeps the hash it had. A
  // keep-unknown is never recorded: recording it would read as "untouched"
  // next time and permit the overwrite this verdict exists to refuse.
  const files: Record<string, string> = {};
  for (const [rel, h] of Object.entries(m.files)) if (!invalid.includes(rel)) files[rel] = h;
  const recorded = [...plan.update, ...identical, ...plan.install];
  for (const rel of recorded) files[rel] = hashOf(join(ctx.docsRoot, rel)) as string;
  ctx.recorded = recorded;
  const after = serialiseManifest({ version, files }, before);
  if (after === before)
    ok(`${ctx.docsRootName}/${MANIFEST_NAME} unchanged (${Object.keys(files).length} entries, version ${version})`);
  else {
    ctx.wrote = true;
    writeFileSync(manifestPath, after);
    ok(
      `${ctx.docsRootName}/${MANIFEST_NAME} written: ${recorded.length} template(s) recorded at version ${version}, ${Object.keys(files).length} entries — commit it with the rest`
    );
  }
  ok(summary("did"));
}

function verify(ctx: Ctx): void {
  step(5, "Verify the tree against the refreshed CLI");
  if (ctx.dryRun) {
    note(
      "would run `pdocs check` — exit 0 continues; anything else stops the run here, after the refresh and before the markers move"
    );
    return;
  }
  const { result, raw } = pdocsCheck(ctx.root);
  if (!result)
    fail(
      `\`pdocs check\` under the refreshed CLI printed nothing this script can read — the CLI cannot read this tree:\n\n` +
        indented(raw.trimEnd())
    );
  const r = result as CheckResult;
  if (r.code === 0) {
    ok(
      r.total === 0
        ? "pdocs check: clean (exit 0)"
        : `pdocs check: exit 0 — ${r.total} problem(s) reported, and lint.adopting is true so the gate does not fail on them; \`pdocs report\` is the worklist`
    );
    return;
  }

  // THE DESIGNED STOP. See the header: the refresh is correct even when the
  // newer lint then goes red, so nothing is rolled back and the markers do not
  // move. The baseline lets this say which problems are new to it — a SET
  // difference on the problem lines (each carries its rule and path), never a
  // count difference: the two lints can disagree in both directions at once,
  // and a count of 1 → 3 said "2 new" when all three were new and the one was
  // gone.
  const b = ctx.baseline;
  let newer: string;
  if (b === null)
    newer =
      "The CLI before the refresh gave no baseline, so this script cannot say which of them are new to the refreshed lint.";
  else {
    const was = new Set(b.problems);
    const now = new Set(r.problems);
    const fresh = r.problems.filter((p) => !was.has(p)).length;
    const gone = b.problems.filter((p) => !now.has(p)).length;
    const same = r.problems.filter((p) => was.has(p)).length;
    newer =
      `Against the baseline the older lint reported (${b.total}): ${fresh} new to the refreshed lint, ${gone} no longer reported, ${same} unchanged.` +
      (b.total === 0
        ? " Story-loom's real page named `templates.md`, skipped as a template by the old rule, is the case this exists for."
        : fresh === 0
          ? " Nothing here is new to the refreshed lint; the tree was not clean before this run."
          : "");
  }
  fail(
    `\`pdocs check\` exits ${r.code} on the refreshed tree: ${r.total} problem(s). ${newer}\n` +
      `\n   The refresh STAYS — rolling it back would reinstall the lint that hid them — and the version\n` +
      `   markers were NOT moved: this tree is not at v2.10 until the check passes. The worklist is\n` +
      `   \`bun scripts/pdocs/cli.ts report --format text\`; the problems are:\n\n` +
      indented(r.problems.join("\n")) +
      `\n\n   Re-running this migration is safe: every phase finds its work done, and the run passes\n` +
      `   once these are worked.`
  );
}

function bumpVersion(ctx: Ctx, version: string): void {
  step(6, "Version markers");
  // Reported per marker, and whether the LINE EXISTS and whether the VALUE
  // CHANGED are two questions. Written only when the value moves.
  const readmeDst = join(ctx.docsRoot, "README.md");
  const RE = /^docs_version:\s*"[^"]*"/m;
  if (!existsSync(readmeDst)) {
    note(`${ctx.docsRootName}/README.md is not there — nothing to set`);
  } else {
    const before = readFileSync(readmeDst, "utf8");
    if (!RE.test(before)) {
      note(`${ctx.docsRootName}/README.md carries no docs_version line — nothing to set`);
    } else {
      const after = before.replace(RE, `docs_version: "${version}"`);
      if (after === before) ok(`${ctx.docsRootName}/README.md already at ${version}`);
      else if (ctx.dryRun)
        note(`would set ${ctx.docsRootName}/README.md from ${docsVersionOf(readmeDst)} to ${version}`);
      else {
        ctx.wrote = true;
        writeFileSync(readmeDst, after);
        ok(`${ctx.docsRootName}/README.md set to ${version}`);
      }
    }
  }

  // Patched in the file's own text and verified by parsing, not regex-
  // substituted: `.project-docs.json` is theirs. A line-based expression
  // rewrote every nested `"version"` in it, and a re-serialisation rewrote its
  // formatting — an adopter's Biome collapsed a short array to one line and the
  // run expanded it again, failing their gate on a file nobody had edited.
  if (!existsSync(ctx.configPath)) {
    note(".project-docs.json is not there — nothing to set");
    return;
  }
  const before = readFileSync(ctx.configPath, "utf8");
  const current = JSON.parse(before).version;
  if (current === version) {
    ok(`.project-docs.json already at ${version}`);
    return;
  }
  if (ctx.dryRun) {
    note(`would set .project-docs.json from ${JSON.stringify(current ?? null)} to ${version} — that one key, every other byte as it is`);
    return;
  }
  ctx.wrote = true;
  const how = writeVersionInto(ctx.configPath, before, version);
  ok(`.project-docs.json set to ${version} — ${how}`);
}

function cleanup(ctx: Ctx): void {
  step(7, "Clean up");
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
 * THE INVARIANTS, CHECKED BY THE PROGRAM ITSELF.
 *
 * Everything the phase ordering guarantees, re-read from disk after the last
 * phase. A test would catch a reordering only while the test exists; this
 * catches it on every run, in every adopter's repository. Each line names the
 * phase whose position it protects.
 */
export function migrationHolds(ctx: Ctx, version: string, templates: string[]): string[] {
  const v: string[] = [];

  // The refresh phase: the owned files on disk are the ones phase 2 verified.
  if (!fileHas(join(ctx.root, RULES_FILE), RULES_MARKER))
    v.push(
      `${RULES_FILE} is missing or carries no \`${RULES_MARKER}\` — the refresh phase installs the scaffold's, which the scaffold phase verified carries it`
    );
  if (!fileHas(join(ctx.docsRoot, "SCHEMA.md"), SCHEMA_MARKER))
    v.push(
      `${ctx.docsRootName}/SCHEMA.md is missing or does not name ${SCHEMA_MARKER} — the refresh phase installs the scaffold's, which the scaffold phase verified carries it`
    );

  // The reconcile phase: the record is at the scaffold's release; every file
  // it recorded still matches its bytes; and no template the scaffold ships
  // is left neither on disk nor recorded.
  let m: SeedManifest | null = null;
  try {
    m = loadManifest(ctx.docsRoot);
  } catch (e) {
    v.push(`${ctx.docsRootName}/${(e as Error).message} — the reconcile phase writes it whole`);
  }
  if (m) {
    if (m.version !== version)
      v.push(
        `${ctx.docsRootName}/${MANIFEST_NAME} version is ${JSON.stringify(m.version)}, not ${version} — the reconcile phase records against the scaffold's release`
      );
    const stale = ctx.recorded.filter(
      (rel) => hashOf(join(ctx.docsRoot, rel)) !== m!.files[rel]
    );
    if (stale.length > 0)
      v.push(
        `${stale.length} template(s) this run recorded no longer match the record:\n` +
          indented(stale.map((r) => `${ctx.docsRootName}/${r}`).join("\n")) +
          `\n       — the reconcile phase must be the last that touches a template's bytes, formatting included`
      );
    const uninstalled = templates.filter((rel) => verdictFor(m!, ctx.docsRoot, rel) === "install");
    if (uninstalled.length > 0)
      v.push(
        `${uninstalled.length} template(s) the scaffold ships are neither on disk nor recorded:\n` +
          indented(uninstalled.map((r) => `${ctx.docsRootName}/${r}`).join("\n")) +
          `\n       — the reconcile phase installs a template the tree never had`
      );
  }

  // The version phase: both markers moved together, to the scaffold's release.
  const readmeVersion = docsVersionOf(join(ctx.docsRoot, "README.md"));
  if (readmeVersion !== version)
    v.push(
      `${ctx.docsRootName}/README.md docs_version is ${readmeVersion ?? "(no line)"}, not ${version} — the version phase sets both markers together`
    );
  const cfgVersion = existsSync(ctx.configPath)
    ? (JSON.parse(readFileSync(ctx.configPath, "utf8")) as { version?: unknown }).version
    : undefined;
  if (cfgVersion !== version)
    v.push(
      `.project-docs.json version is ${JSON.stringify(cfgVersion ?? null)}, not ${version} — the version phase sets both markers together`
    );

  // The verify phase: the markers moved only because the check passed, and
  // nothing after it changed a document.
  const check = pdocsCheck(ctx.root);
  if (!check.result || check.result.code !== 0)
    v.push(
      `\`pdocs check\` exits ${check.result?.code ?? "unreadably"} on the migrated tree — the verify phase stops the run before the markers move, so something after it changed a document`
    );

  // The cleanup phase: a generated scaffold does not outlive the run.
  if (!ctx.scaffold && ctx.scaffoldDir && existsSync(ctx.scaffoldDir))
    v.push("the generated scaffold is still on disk — the cleanup phase removes it");

  return v;
}

// ---------------------------------------------------------------------------------------

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
    const templates = seededIn(join(ctx.scaffoldDir, "docs"));
    refreshOwned(ctx);
    reconcileSeeded(ctx, templates, version);

    // TEST SEAM, and the only one. `migrationHolds` is the guard that makes
    // the format-before-record ordering enforce itself, and a unit test of the
    // function does not show it is WIRED. This lets a test corrupt a recorded
    // template AFTER the record was written and assert the run still stops.
    // The value is a docs-relative path; one that escapes the docs root is
    // refused rather than written.
    const mutate = process.env.PDOCS_MIGRATE_TEST_MUTATE;
    if (mutate && !ctx.dryRun) {
      const target = within(ctx.docsRoot, mutate);
      if (target === null)
        fail("PDOCS_MIGRATE_TEST_MUTATE must name a path inside the docs root.");
      ctx.wrote = true;
      writeFileSync(target as string, "mutated by the test seam\n");
    }

    verify(ctx);
    bumpVersion(ctx, version);
    cleanup(ctx);

    if (!ctx.dryRun) {
      const broken = migrationHolds(ctx, version, templates);
      if (broken.length > 0)
        fail(
          `the migration's own invariants do not hold after this run:\n` +
            broken.map((b) => `     · ${b}`).join("\n") +
            `\n\n   Nothing was rolled back. Fix the phase the line names and re-run;` +
            `\n   every phase reports rather than repeats work already done.`
        );
    }

    say(
      ctx.dryRun
        ? `\nDry run complete — nothing was changed. ${templates.length} template(s) would be reconciled.`
        : `\nMigration complete. ${templates.length} template(s) reconciled, ${ctx.recorded.length} recorded; the owned files are at release ${version}.`
    );
    return 0;
  } catch (e) {
    // Every stop says whether the tree was touched. A preflight stop and a
    // stop after three writing phases read the same otherwise.
    const state = ctx?.wrote
      ? `\n   The tree may be partly migrated. Re-running is safe: every phase reports\n   rather than repeats work it finds already done.`
      : `\n   Nothing was written.`;
    if (e instanceof MigrationError) {
      console.error(`\nSTOPPED: ${(e as Error).message}${state}`);
      return 1;
    }
    // Anything else — EACCES from cpSync, a malformed README — is still a
    // migration that could not complete, not a crash to show the operator. The
    // header promises a named reason on every failure; a stack trace is not one.
    console.error(`\nSTOPPED: unexpected failure — ${(e as Error).message}${state}`);
    return 1;
  } finally {
    // A generated scaffold must not outlive the run, whichever way it ended.
    // Phase 7 removes it and says so on the success path; this is the net
    // under every other path, a stop in phase 2 included.
    if (ctx?.generatedTmp && existsSync(ctx.generatedTmp))
      rmSync(ctx.generatedTmp, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
