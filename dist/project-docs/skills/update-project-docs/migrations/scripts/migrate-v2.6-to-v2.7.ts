#!/usr/bin/env bun
/**
 * v2.6 → v2.7. The migration, not a description of one.
 *
 * WHY THIS IS A SCRIPT. The previous shape was a thirteen-step guide with shell
 * blocks an agent executed separately, and one codemod in the middle of it.
 * Step 3 set `SCAFFOLD=$(ls -d .scaffold-tmp/*\/ | head -1)`; steps 4, 5 and 13
 * read `$SCAFFOLD`. An agent runs each block in a DIFFERENT PROCESS, so by step
 * 4 the value is empty, `cp "$SCAFFOLD/docs/SCHEMA.md"` copies from
 * `/docs/SCHEMA.md`, and the block exits 0. A check whose only output is an
 * echoed string cannot fail a run either. One process makes the first
 * impossible and a real exit code makes the second impossible, which is
 * cheaper than remembering.
 *
 * WHAT IT DOES
 *   1  preflight   — this is a v2.6 project-docs tree, the tools exist, git is
 *                    clean, and EVERY docs-root folder is in a lint tier
 *   2  scaffold    — generate the current template into a private temp dir
 *   3  layer       — scripts/pdocs/, docs/SCHEMA.md, docs/index.md if absent,
 *                    and any category folder the project does not have
 *   4  templates   — every template the scaffold ships, verified per file
 *   5  frontmatter — the codemod: a derived block on every document
 *   6  config      — .project-docs.json, lint.adopting: true, version carried
 *   7  report      — `pdocs report`, printed: the backfill's worklist
 *   8  version     — both markers, set together to the scaffold's release
 *   9  cleanup     — remove the generated scaffold
 *
 * WHERE IT STOPS. Tooling installed, codemod run, report printed, exit 0, and
 * the GATE OFF (`lint.adopting: true`). The lint requires `description` on
 * every document and the codemod deliberately does not write one — that is one
 * sentence a person has to mean — so a fresh migration cannot pass the gate.
 * The backfill, the catalog and turning the gate on are the guide's after-script
 * steps, not phases here.
 *
 * THE PREFLIGHT TIER CHECK IS A HARD STOP. The lint reads any docs-root folder
 * that is in neither `lint.durable` nor `lint.workbench` and not in `lint.skip`
 * as library — the graph tier, the strictest checks — with every page in it of
 * unknown type. A consumer should declare or skip such a folder knowingly rather
 * than discover it from the first failing run, so phase 1 names each one that
 * holds markdown the lint would read and exits 1 before anything is written; a
 * folder holding none is only reported. Phase 3 applies the same stop to the
 * category folders it would create, and the end-of-run check re-asks the
 * question of the config the run leaves behind.
 *
 * Usage:
 *   bun migrate-v2.6-to-v2.7.ts [--root <path>] [--dry-run]
 *                               [--scaffold-dir <path>]
 *
 *   --root <path>          the project to migrate. Default: the current directory.
 *   --dry-run              report every phase's plan; change nothing.
 *   --scaffold-dir <path>  use an already-generated scaffold instead of fetching
 *                          one. Skips the network; the path must be a generated
 *                          project root, not its docs/. `--scaffold` is an alias.
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
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

import {
  DEFAULT_SKIP,
  DURABLE_TYPE,
  UNKNOWN_VERSION,
  WORKBENCH_TYPE,
  defaultConfig,
  docsVersionOf,
  runCodemod,
} from "./migrate-v2.6-to-v2.7.codemod.ts";

const TEMPLATE_REPO = "gh:ichabodcole/project-docs-scaffold-template";
const MANIFEST_NAME = ".pdocs-seed.json";
/** A section only a v2.9-or-later SCHEMA.md carries; what proves the copy is current. */
const SCHEMA_MARKER = "Who owns which file";
const SKIP_DIRS = new Set(["_archive", "node_modules", ".git"]);
const PHASES = 9;

/**
 * The seeded-file predicate: `TEMPLATE` anywhere in the name, or
 * `*.template.md`. A copy of the one in `migrate-v2.8-to-v2.9.ts`, which
 * `scripts/seeded-coverage.test.ts` pins to the registry; this copy is pinned
 * to that one by `describe("the copied predicate ...")` in the test beside this
 * file. Erring wide is safe — installing a file the registry does not declare
 * costs one template — where missing one leaves a `TEMPLATE MISSING` the gate
 * reports on every run.
 */
export function isSeeded(name: string): boolean {
  return (
    (name.includes("TEMPLATE") && name.endsWith(".md")) ||
    name.endsWith(".template.md")
  );
}

/** Every seeded file under `dir`, as paths relative to it, sorted. */
export function seededIn(dir: string, out: string[] = [], base = dir): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) seededIn(abs, out, base);
      continue;
    }
    if (entry.isFile() && isSeeded(entry.name)) out.push(relative(base, abs));
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

const sha = (abs: string) =>
  createHash("sha256").update(readFileSync(abs)).digest("hex");

const sameBytes = (a: string, b: string) =>
  existsSync(a) && existsSync(b) && sha(a) === sha(b);

const hasFrontmatter = (abs: string) =>
  readFileSync(abs, "utf8").startsWith("---\n");

const strings = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === "string")
    ? (v as string[])
    : null;

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
}

export function parseArgs(argv: string[]): Options {
  const opts: Options = { root: ".", dryRun: false, scaffold: null };
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
    // the v2.9 script also accepts, so the two scripts take the same flags.
    else if (a === "--scaffold-dir" || a === "--scaffold") {
      const v = value();
      if (v.trim() === "") fail(`${a} was given an empty value.`);
      opts.scaffold = v;
    } else if (a === "--dry-run") opts.dryRun = true;
    else
      fail(
        `unknown argument \`${a}\`. Valid: --root, --dry-run, --scaffold-dir (--scaffold).`
      );
  }
  return opts;
}

// ---------------------------------------------------------------------------------------
// The phases
// ---------------------------------------------------------------------------------------

interface Ctx extends Options {
  docsRootName: string;
  docsRoot: string;
  configPath: string;
  /** The parsed `.project-docs.json`, or null when the project has none yet. */
  config: Record<string, unknown> | null;
  /** `docs_version` as found in the project's README — carried, never invented. */
  carriedVersion: string;
  scaffoldDir: string;
  /** The temp dir phase 2 generated into — "" when --scaffold-dir supplied one. */
  generatedTmp: string;
  /** Whether any phase has written into the project yet; decides what a stop says. */
  wrote: boolean;
  /** What phase 7 printed; the end-of-run check re-reads the tree against it. */
  reportText: string | null;
}

/** Paths and config, with no judgment yet — preflight is what judges. */
function resolveContext(o: Options): Ctx {
  const root = resolve(o.root);
  const configPath = join(root, ".project-docs.json");
  let config: Record<string, unknown> | null = null;
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf8"));
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
    carriedVersion: docsVersionOf(root, docsRootName),
    scaffoldDir: "",
    generatedTmp: "",
    wrote: false,
    reportText: null,
  };
}

/** The tier arrays this project's lint will use: its own, or the defaults. */
function tiersOf(config: Record<string, unknown> | null): {
  durable: string[];
  workbench: string[];
  skip: string[];
} {
  const lint = (config?.lint ?? {}) as Record<string, unknown>;
  return {
    durable: strings(lint.durable) ?? Object.keys(DURABLE_TYPE),
    workbench: strings(lint.workbench) ?? [
      ...Object.keys(WORKBENCH_TYPE),
      "projects",
    ],
    skip: strings(lint.skip) ?? DEFAULT_SKIP,
  };
}

/**
 * Whether `dir` holds any markdown the lint would read: a `.md` file, at any
 * depth, not under a `lint.skip` name and not matched by a `lint.exclude`
 * glob. The lint's walker collects only `.md`, so a folder without one — an
 * empty placeholder, an `.obsidian/` of JSON — contributes nothing and is not
 * worth a stop.
 */
function lintedMarkdownIn(
  dir: string,
  repoRoot: string,
  skip: Set<string>,
  excluded: Bun.Glob[]
): boolean {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skip.has(entry.name) && lintedMarkdownIn(abs, repoRoot, skip, excluded))
        return true;
      continue;
    }
    if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      !excluded.some((g) => g.match(relative(repoRoot, abs)))
    )
      return true;
  }
  return false;
}

/**
 * Docs-root folders in no tier and not skipped. `judged` hold markdown the
 * lint would read as library — the graph tier, unknown type — and are a stop;
 * `inert` hold none and are only reported.
 */
export function undeclaredFolders(
  docsRoot: string,
  config: Record<string, unknown> | null,
  repoRoot: string
): { judged: string[]; inert: string[] } {
  const tiers = tiersOf(config);
  const declared = new Set([...tiers.durable, ...tiers.workbench, ...tiers.skip]);
  const lint = (config?.lint ?? {}) as Record<string, unknown>;
  const excluded = (strings(lint.exclude) ?? []).map((g) => new Bun.Glob(g));
  const skip = new Set(tiers.skip);
  const judged: string[] = [];
  const inert: string[] = [];
  for (const d of readdirSync(docsRoot, { withFileTypes: true })) {
    if (!d.isDirectory() || declared.has(d.name)) continue;
    (lintedMarkdownIn(join(docsRoot, d.name), repoRoot, skip, excluded)
      ? judged
      : inert
    ).push(d.name);
  }
  return { judged: judged.sort(), inert: inert.sort() };
}

/** The lines to paste into `.project-docs.json` to declare or skip `folders`. */
function declareHint(
  folders: string[],
  config: Record<string, unknown> | null
): string {
  const tiers = tiersOf(config);
  return (
    `\n\n   The lint reads an unlisted folder as library — the graph tier, the strictest` +
    `\n   checks — and every page in it as having an unknown type. Declare each one in` +
    `\n   .project-docs.json (create the file if the project has none; this migration` +
    `\n   fills in whatever you leave out). A tier array REPLACES the default list, so` +
    `\n   paste the whole line:` +
    `\n     "lint": {` +
    `\n       "workbench": ${JSON.stringify([...tiers.workbench, ...folders])},` +
    `\n       "types": ${JSON.stringify(Object.fromEntries(folders.map((f) => [f, f.replace(/s$/, "")])))}` +
    `\n     }` +
    `\n   — or list it under "durable" for the graph tier — or leave it unchecked:` +
    `\n     "skip": ${JSON.stringify([...tiers.skip, ...folders])}` +
    `\n   Then re-run.`
  );
}

function preflight(ctx: Ctx): void {
  step(1, "Preflight");
  // A v2.6 tree has no .project-docs.json yet — this migration writes it — so
  // "is this a project-docs tree" is judged by the docs root and its README.
  if (!existsSync(ctx.docsRoot))
    fail(
      `no ${ctx.docsRootName}/ at ${ctx.root} — ${
        ctx.config ? "docsRoot names a directory that is not there" : "this is not a project-docs tree"
      }. Pass --root <project root>.`
    );
  if (!existsSync(join(ctx.docsRoot, "README.md")))
    fail(
      `no ${ctx.docsRootName}/README.md at ${ctx.root} — this is not a project-docs tree. Pass --root <project root>.`
    );
  if (ctx.carriedVersion === UNKNOWN_VERSION)
    fail(
      `${ctx.docsRootName}/README.md carries no docs_version line — a pre-2.0 tree, or not a project-docs one. ` +
        `Migrations run in sequence: v1-to-v2 comes first.`
    );
  ok(
    `project at ${ctx.root}, docsRoot ${ctx.docsRootName}/, docs_version ${ctx.carriedVersion}` +
      (ctx.config ? " (.project-docs.json present)" : "")
  );
  // A gate that is ON is a tree that finished adopting. This migration puts
  // the layer on a tree that has none; refreshing one is v2.8-to-v2.9's job.
  if ((ctx.config?.lint as Record<string, unknown> | undefined)?.adopting === false)
    fail(
      "lint.adopting is false in .project-docs.json — the gate is on, so this tree has finished adopting the layer. " +
        "This migration installs the layer on a tree that has none; refreshing scripts/pdocs/ and docs/SCHEMA.md on one that has is v2.8-to-v2.9's job. " +
        "If the gate was turned on by mistake, set lint.adopting to true and re-run."
    );

  // This script is running under bun, but the gate it installs is run as
  // `bun scripts/pdocs/cli.ts` from a hook and from CI, so bun has to be on
  // PATH, not merely somewhere.
  if (!have("bun"))
    fail(
      "bun is not on PATH. This script is running under it, but the CLI it installs is run as `bun scripts/pdocs/cli.ts` by the gate — put bun on PATH first."
    );
  if (!ctx.scaffold && !have("cookiecutter"))
    fail(
      "cookiecutter is not installed, and no --scaffold-dir <path> was given. Install it, or generate the scaffold yourself and pass its path."
    );

  // A dirty tree makes this migration's changes indistinguishable from the
  // adopter's. Reported, not enforced: it is their repository.
  const git = run(["git", "status", "--porcelain"], ctx.root);
  if (git.code === 0 && git.stdout.trim() !== "")
    note(
      `working tree is dirty (${git.stdout.trim().split("\n").length} path(s)) — commit or stash first if you want this migration isolated`
    );
  else if (git.code === 0) ok("git tree clean");
  else note("not a git repository — nothing to report");

  // THE HARD STOP. See the header. Only a folder the lint would actually read
  // stops the run; one holding no markdown is reported and left alone.
  const { judged, inert } = undeclaredFolders(ctx.docsRoot, ctx.config, ctx.root);
  for (const f of inert)
    note(
      `${ctx.docsRootName}/${f}/ is in no tier, and holds no markdown the lint reads — nothing to declare`
    );
  if (judged.length > 0)
    fail(
      `${judged.length} folder(s) under ${ctx.docsRootName}/ hold markdown and are in no lint tier and not skipped:\n` +
        judged.map((f) => `       ${ctx.docsRootName}/${f}/`).join("\n") +
        declareHint(judged, ctx.config)
    );
  const tiers = tiersOf(ctx.config);
  ok(
    `every folder under ${ctx.docsRootName}/ the lint reads is in a tier or skipped (${tiers.durable.length} durable, ${tiers.workbench.length} workbench, ${tiers.skip.length} skipped)`
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
  // A DRY RUN GENERATES THE SCAFFOLD TOO: without one, the version phase has
  // nothing to read and the template list is empty, so the plan it printed
  // would describe a run that could not happen.
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

/** The release being migrated TO, read from the generated scaffold. */
function scaffoldVersion(ctx: Ctx): string {
  // An empty scaffold path would make `join` produce a path relative to the
  // process cwd — and read a version from whatever tree the script was run
  // from. Checked by itself, so the failure names the phase that did not run.
  if (!ctx.scaffoldDir)
    fail(
      "no scaffold to read a version from — the scaffold phase did not run."
    );
  const readmeSrc = join(ctx.scaffoldDir, "docs/README.md");
  if (!existsSync(readmeSrc))
    fail(`the scaffold has no docs/README.md at ${readmeSrc}`);
  const m = /^docs_version:\s*"([^"]+)"/m.exec(readFileSync(readmeSrc, "utf8"));
  const version = m?.[1];
  if (!version || !/^\d+\.\d+\.\d+$/.test(version))
    fail(
      `could not read a version from the scaffold's docs/README.md (got ${JSON.stringify(version ?? null)})`
    );
  return version as string;
}

function installLayer(ctx: Ctx): void {
  step(3, "Install the layer");
  const scaffoldDocs = join(ctx.scaffoldDir, "docs");
  const cliSrc = join(ctx.scaffoldDir, "scripts/pdocs");
  const cliDst = join(ctx.root, "scripts/pdocs");
  const schemaSrc = join(scaffoldDocs, "SCHEMA.md");
  const schemaDst = join(ctx.docsRoot, "SCHEMA.md");
  const indexSrc = join(scaffoldDocs, "index.md");
  const indexDst = join(ctx.docsRoot, "index.md");

  // Owned: replaced, every time — code reads it. Compared first so a re-run
  // can say "already identical" rather than claim a refresh it did not make.
  const cliFiles = filesIn(cliSrc);
  const cliStale = cliFiles.filter(
    (rel) => !sameBytes(join(cliSrc, rel), join(cliDst, rel))
  );
  const schemaSame = sameBytes(schemaSrc, schemaDst);
  const indexThere = existsSync(indexDst);
  // A category folder the project does not have — `cycles/` is new to a v2.6
  // tree, and a project may have skipped one earlier — is created with its
  // README.md. An existing folder's README is the project's business.
  const newFolders = readdirSync(scaffoldDocs, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !existsSync(join(ctx.docsRoot, d.name)))
    .map((d) => d.name)
    .sort();

  // The same stop as the preflight's, for the folders THIS phase would add: a
  // project config whose tier arrays predate `cycles/` would otherwise end the
  // run with exactly the undeclared folder the preflight exists to prevent.
  // Checked before anything below writes.
  const tiers = tiersOf(ctx.config);
  const declared = new Set([...tiers.durable, ...tiers.workbench, ...tiers.skip]);
  const undeclaredNew = newFolders.filter((f) => !declared.has(f));
  if (undeclaredNew.length > 0)
    fail(
      `${undeclaredNew.length} category folder(s) the scaffold ships would be created under ${ctx.docsRootName}/ but are in no lint tier of this project's .project-docs.json:\n` +
        undeclaredNew.map((f) => `       ${ctx.docsRootName}/${f}/`).join("\n") +
        declareHint(undeclaredNew, ctx.config)
    );

  if (ctx.dryRun) {
    note(
      cliStale.length === 0
        ? "scripts/pdocs/ is already installed and identical to the scaffold's"
        : `would ${existsSync(join(cliDst, "cli.ts")) ? "refresh" : "install"} scripts/pdocs/ (${cliStale.length} file(s) to write)`
    );
    note(
      schemaSame
        ? `${ctx.docsRootName}/SCHEMA.md is already identical to the scaffold's`
        : `would ${existsSync(schemaDst) ? "replace" : "install"} ${ctx.docsRootName}/SCHEMA.md`
    );
    note(
      indexThere
        ? `${ctx.docsRootName}/index.md is there — left alone, it is yours`
        : `would install ${ctx.docsRootName}/index.md (a skeleton; yours from then on)`
    );
    for (const f of newFolders)
      note(`would create ${ctx.docsRootName}/${f}/ with its README.md`);
    return;
  }

  if (cliStale.length === 0)
    ok("scripts/pdocs/ already installed and identical to the scaffold's");
  else {
    const refreshing = existsSync(join(cliDst, "cli.ts"));
    ctx.wrote = true;
    cpSync(cliSrc, cliDst, { recursive: true });
    if (!existsSync(join(cliDst, "cli.ts")))
      fail(
        "scripts/pdocs/cli.ts did not arrive — the scaffold's scripts/pdocs/ carries no cli.ts. Is --scaffold-dir a generated project root?"
      );
    ok(
      `scripts/pdocs/ ${refreshing ? "refreshed" : "installed"} (${cliStale.length} file(s) written; the copy merges, so a file a later release removed would survive)`
    );
  }

  if (schemaSame)
    ok(`${ctx.docsRootName}/SCHEMA.md already identical to the scaffold's`);
  else {
    const replacing = existsSync(schemaDst);
    ctx.wrote = true;
    cpSync(schemaSrc, schemaDst);
    if (!readFileSync(schemaDst, "utf8").includes(SCHEMA_MARKER))
      fail(
        `${ctx.docsRootName}/SCHEMA.md is missing "${SCHEMA_MARKER}" — the scaffold is older than v2.9. This migration installs the current layer, not a v2.7 snapshot.`
      );
    ok(
      `${ctx.docsRootName}/SCHEMA.md ${replacing ? "replaced (owned)" : "installed"}`
    );
  }

  // Theirs: installed once when absent, never overwritten. A v2.6 tree has no
  // catalog, and the graph tier's reachability check needs one to start from.
  if (indexThere)
    note(`${ctx.docsRootName}/index.md is there — left alone, it is yours`);
  else {
    if (!existsSync(indexSrc))
      fail(
        "the scaffold has no docs/index.md — the catalog skeleton the graph tier reads from. Is --scaffold-dir a generated project root?"
      );
    ctx.wrote = true;
    cpSync(indexSrc, indexDst);
    ok(`${ctx.docsRootName}/index.md installed (a skeleton; yours from now on)`);
  }

  for (const f of newFolders) {
    const readmeSrc = join(scaffoldDocs, f, "README.md");
    if (!existsSync(readmeSrc))
      fail(
        `the scaffold has no README.md for docs/${f}/ — a category folder without its README is not one this migration can create.`
      );
    ctx.wrote = true;
    mkdirSync(join(ctx.docsRoot, f), { recursive: true });
    cpSync(readmeSrc, join(ctx.docsRoot, f, "README.md"));
    ok(`${ctx.docsRootName}/${f}/ created, with its README.md`);
  }
  if (newFolders.length === 0)
    note("every category folder the scaffold ships is already here");
}

/**
 * Seeded: installed once, then negotiated by hash. This script writes no
 * `docs/.pdocs-seed.json` — `v2.8-to-v2.9` records the templates and only then
 * does `scripts/pdocs/seed.ts` negotiate — so what it can do here is what
 * SCHEMA.md § "Who owns which file" says of a first migration: adopt the tree
 * as it stands. A template with no frontmatter block is a v2.6 one and is
 * replaced, because it fails the lint as it is; a template that already
 * carries a block is someone's edit and is kept, whether or not a manifest
 * exists yet. Kept templates are named, so the decision is visible.
 */
function installTemplates(ctx: Ctx, templates: string[]): void {
  step(4, "Install the templates");
  if (templates.length === 0)
    fail(
      "the scaffold ships no templates — nothing under its docs/ is named TEMPLATE or *.template.md. Is --scaffold-dir a generated project root?"
    );
  const scaffoldDocs = join(ctx.scaffoldDir, "docs");
  const adopted = existsSync(join(ctx.docsRoot, MANIFEST_NAME));

  const plan: Record<"install" | "replace" | "same" | "keep", string[]> = {
    install: [],
    replace: [],
    same: [],
    keep: [],
  };
  for (const rel of templates) {
    const src = join(scaffoldDocs, rel);
    const dst = join(ctx.docsRoot, rel);
    // A marker only a v2.7-or-later template carries. Checked on the source,
    // so a scaffold that would install a bare template stops the run whether
    // or not the project's copy happens to be identical.
    if (!hasFrontmatter(src))
      fail(
        `the scaffold's docs/${rel} has no frontmatter block — the scaffold is older than v2.7.`
      );
    if (!existsSync(dst)) plan.install.push(rel);
    else if (sameBytes(src, dst)) plan.same.push(rel);
    else if (adopted || hasFrontmatter(dst)) plan.keep.push(rel);
    else plan.replace.push(rel);
  }
  const whyKept = (rel: string) =>
    adopted
      ? `${ctx.docsRootName}/${MANIFEST_NAME} is present, so it is adopted and seed.ts negotiates it from here`
      : `it already carries a frontmatter block and is not the scaffold's — your edit, adopted as it stands`;

  const summary = (tense: "would" | "did") => {
    const [i, r] = tense === "would" ? ["to install", "to replace"] : ["installed", "replaced"];
    const why = plan.replace.length ? " (a v2.6 template has no frontmatter block)" : "";
    return `${plan.install.length} ${i}, ${plan.replace.length} ${r}${why}, ${plan.same.length} already in place, ${plan.keep.length} kept`;
  };

  if (ctx.dryRun) {
    note(`${templates.length} template(s) in the scaffold: ${summary("would")}`);
    for (const rel of plan.install) note(`would install ${ctx.docsRootName}/${rel}`);
    for (const rel of plan.replace) note(`would replace ${ctx.docsRootName}/${rel}`);
    for (const rel of plan.keep)
      note(`would keep ${ctx.docsRootName}/${rel} — ${whyKept(rel)}`);
    return;
  }

  for (const rel of [...plan.install, ...plan.replace]) {
    const dst = join(ctx.docsRoot, rel);
    ctx.wrote = true;
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(join(scaffoldDocs, rel), dst);
    ok(`${plan.install.includes(rel) ? "installed" : "replaced"} ${ctx.docsRootName}/${rel}`);
  }
  for (const rel of plan.keep)
    note(`kept ${ctx.docsRootName}/${rel} — ${whyKept(rel)}`);
  ok(`${templates.length} template(s): ${summary("did")}`);
}

function frontmatter(ctx: Ctx): void {
  step(5, "Frontmatter on every document");
  const lint = (ctx.config?.lint ?? {}) as Record<string, unknown>;
  const r = runCodemod({
    repoRoot: ctx.root,
    docsRootName: ctx.docsRootName,
    exclude: strings(lint.exclude) ?? [],
    dryRun: ctx.dryRun,
    onFile: (rel, d) =>
      say(
        `   ${ctx.dryRun ? "·" : "✓"} ${ctx.dryRun ? "would mark " : ""}${rel}  type: ${d.type}${d.lifecycle ? `, lifecycle: ${d.lifecycle}` : ""}`
      ),
  });
  if (r.changed.length > 0 && !ctx.dryRun) ctx.wrote = true;
  if (r.changed.length === 0)
    note("nothing to mark — every document already has a frontmatter block");
  ok(
    `${r.changed.length} document(s) ${ctx.dryRun ? "would gain" : "gained"} frontmatter; ${r.skipped.length} skipped (already marked, or a README, template or contract page)`
  );
  if (r.unmapped.length) {
    note(
      `${r.unmapped.length} document(s) had a **Status:** nobody could map — lifecycle left blank, for you to decide:`
    );
    for (const [rel, raw] of r.unmapped) say(`       ${rel}  ("${raw}")`);
  }
  if (r.undated.length) {
    note(
      `${r.undated.length} document(s) had no date and no first commit — generated.at set to 1970-01-01:`
    );
    for (const rel of r.undated) say(`       ${rel}`);
  }
  note(
    "`description` is never written — one sentence a person has to mean. `status: stable` is written everywhere; a page you would not want relied on is `draft`."
  );
}

function writeConfig(ctx: Ctx): void {
  step(6, ".project-docs.json");
  const defaults = defaultConfig(ctx.root, ctx.docsRootName);

  if (!ctx.config) {
    if (ctx.dryRun) {
      note(
        `would create it — lint.adopting: true, version ${ctx.carriedVersion} carried from ${ctx.docsRootName}/README.md`
      );
      return;
    }
    ctx.wrote = true;
    writeFileSync(ctx.configPath, `${JSON.stringify(defaults, null, 2)}\n`);
    ok(
      `created — lint.adopting: true (the gate reports rather than blocks), version ${ctx.carriedVersion} carried from ${ctx.docsRootName}/README.md`
    );
    return;
  }

  // Theirs. Parsed and re-serialised, and only ABSENT keys are added: the
  // project wrote this file, and everything it says stays said.
  const cfg = JSON.parse(JSON.stringify(ctx.config)) as Record<string, unknown>;
  const lint = ((cfg.lint ??= {}) as Record<string, unknown>);
  const lintDefaults = defaults.lint as Record<string, unknown>;
  const added: string[] = [];

  // `adopting: false` stopped the run in preflight, before anything was written.
  if (lint.adopting !== true) {
    lint.adopting = true;
    added.push("lint.adopting: true");
  } else note("lint.adopting already true — this project is mid-adoption");
  for (const key of ["exclude", "durable", "workbench", "skip"])
    if (!Array.isArray(lint[key])) {
      lint[key] = lintDefaults[key];
      added.push(`lint.${key}`);
    }
  if (typeof cfg.version !== "string") {
    cfg.version = ctx.carriedVersion;
    added.push(`version: ${ctx.carriedVersion}`);
  }

  if (added.length === 0) {
    ok("already complete — nothing to add");
    return;
  }
  if (ctx.dryRun) {
    note(`would add ${added.join(", ")}, leaving every existing key as it is`);
    return;
  }
  ctx.wrote = true;
  writeFileSync(ctx.configPath, `${JSON.stringify(cfg, null, 2)}\n`);
  ok(`added ${added.join(", ")} — every existing key left as it was`);
}

function report(ctx: Ctx): void {
  step(7, "The worklist");
  if (ctx.dryRun) {
    note(
      "would run `pdocs report --format text` — every field still missing, worst first; the backfill works from it"
    );
    return;
  }
  const cli = join(ctx.root, "scripts/pdocs/cli.ts");
  if (!existsSync(cli))
    fail(
      "scripts/pdocs/cli.ts is not there — the layer phase did not install it, so there is nothing to run the report with."
    );
  const r = run(["bun", cli, "report", "--format", "text"], ctx.root);
  if (r.code !== 0)
    fail(
      `\`pdocs report\` exited ${r.code}. It always exits 0 on a tree it can read, so the installed CLI cannot read this one:\n\n` +
        indented(r.stderr || r.stdout)
    );
  ctx.reportText = r.stdout;
  ok(
    "`pdocs report --format text` — the backfill's worklist. It always exits 0; read the lines, not the code:"
  );
  say(indented(r.stdout.trimEnd()));
}

function bumpVersion(ctx: Ctx, version: string): void {
  step(8, "Version markers");
  if (ctx.dryRun) {
    note(
      `would set both markers to ${version} (from ${ctx.carriedVersion}: the config phase carries the old value so the two never disagree mid-run)`
    );
    return;
  }

  // Reported per marker, and whether the LINE EXISTS and whether the VALUE
  // CHANGED are two questions.
  // A marker that could not be set is a `·`, not a `✓`; the end-of-run check
  // then fails the run, since the preflight required the line to exist.
  const readmeDst = join(ctx.docsRoot, "README.md");
  if (!existsSync(readmeDst)) {
    note(`${ctx.docsRootName}/README.md is not there — nothing to set`);
  } else {
    const before = readFileSync(readmeDst, "utf8");
    const RE = /^docs_version:\s*"[^"]*"/m;
    if (!RE.test(before)) {
      note(`${ctx.docsRootName}/README.md carries no docs_version line — nothing to set`);
    } else {
      const after = before.replace(RE, `docs_version: "${version}"`);
      if (after === before)
        ok(`${ctx.docsRootName}/README.md already at ${version}`);
      else {
        ctx.wrote = true;
        writeFileSync(readmeDst, after);
        ok(`${ctx.docsRootName}/README.md set to ${version}`);
      }
    }
  }

  // Parsed and re-serialised, not regex-substituted: `.project-docs.json` is
  // theirs, and a line-based expression rewrote every nested `"version"` in it.
  if (!existsSync(ctx.configPath)) {
    note(".project-docs.json is not there — nothing to set");
    return;
  }
  const cfg = JSON.parse(readFileSync(ctx.configPath, "utf8"));
  const configBefore = cfg.version;
  cfg.version = version;
  if (configBefore !== version) ctx.wrote = true;
  writeFileSync(ctx.configPath, `${JSON.stringify(cfg, null, 2)}\n`);
  ok(
    configBefore === version
      ? `.project-docs.json already at ${version}`
      : `.project-docs.json set to ${version}`
  );
}

function cleanup(ctx: Ctx): void {
  step(9, "Clean up");
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
export function migrationHolds(
  ctx: Ctx,
  version: string,
  templates: string[]
): string[] {
  const v: string[] = [];
  const cli = join(ctx.root, "scripts/pdocs/cli.ts");
  const cfgOnDisk = existsSync(ctx.configPath)
    ? (JSON.parse(readFileSync(ctx.configPath, "utf8")) as Record<string, unknown>)
    : null;

  // The config phase: the gate must be OFF when this run ends.
  if (!cfgOnDisk)
    v.push(
      ".project-docs.json is not there — the config phase must run, and before the report is read as this project's worklist"
    );
  else {
    const cfg = cfgOnDisk as { lint?: { adopting?: unknown }; version?: unknown };
    const adopting = cfg?.lint?.adopting;
    if (adopting !== true)
      v.push(
        `.project-docs.json has lint.adopting ${JSON.stringify(adopting ?? null)}, not true — this migration ends with the gate off`
      );
    if (cfg?.version !== version)
      v.push(
        `.project-docs.json version is ${JSON.stringify(cfg?.version ?? null)}, not ${version} — the version phase sets both markers together`
      );
  }

  // The preflight and the layer phase: no folder the lint would read is left
  // undeclared by the config on disk — including the ones the layer created.
  const { judged } = undeclaredFolders(ctx.docsRoot, cfgOnDisk, ctx.root);
  if (judged.length > 0)
    v.push(
      `${judged.length} folder(s) under ${ctx.docsRootName}/ hold markdown the lint reads and are in no tier of the .project-docs.json on disk:\n` +
        indented(judged.map((f) => `${ctx.docsRootName}/${f}/`).join("\n")) +
        `\n       — the preflight stops on these, and the layer phase stops before creating one; something after them added or undeclared a folder`
    );

  // The templates phase: every template the scaffold ships is here, with a
  // frontmatter block — the templates phase ran, and ran before the report.
  for (const rel of templates) {
    const dst = join(ctx.docsRoot, rel);
    if (!existsSync(dst))
      v.push(`${ctx.docsRootName}/${rel} is missing — the templates phase installs every template the scaffold ships`);
    else if (!hasFrontmatter(dst))
      v.push(`${ctx.docsRootName}/${rel} has no frontmatter block — the templates phase replaces a v2.6 template, before the report`);
  }

  // The codemod phase: nothing is left for it to do — it ran, and nothing
  // after it added a document.
  const lint = (ctx.config?.lint ?? {}) as Record<string, unknown>;
  const left = runCodemod({
    repoRoot: ctx.root,
    docsRootName: ctx.docsRootName,
    exclude: strings(lint.exclude) ?? [],
    dryRun: true,
  }).changed;
  if (left.length > 0)
    v.push(
      `${left.length} document(s) still have no frontmatter block after the run:\n` +
        indented(left.join("\n")) +
        `\n       — the codemod phase must run before the report, and nothing after it may add a document`
    );

  // The report phase: the worklist it printed is the tree's worklist NOW —
  // the report ran, and no later phase changed a document.
  if (ctx.reportText === null)
    v.push(
      "the report phase did not run — the worklist it prints is what the backfill works from"
    );
  else {
    const again = run(["bun", cli, "report", "--format", "text"], ctx.root);
    if (again.code !== 0 || again.stdout !== ctx.reportText)
      v.push(
        "the worklist printed by the report phase no longer matches the tree — some phase changed a document after it was read; the report must be the last phase that looks at a document"
      );
  }

  // The version phase: the README marker moved with the config's.
  const readmeVersion = docsVersionOf(ctx.root, ctx.docsRootName);
  if (readmeVersion !== version)
    v.push(
      `${ctx.docsRootName}/README.md docs_version is ${readmeVersion}, not ${version} — the version phase sets both markers together`
    );

  // The whole run: the installed gate can read the result, and — with
  // lint.adopting true — reports rather than blocks.
  const check = run(["bun", cli, "check", "--format", "text"], ctx.root);
  if (check.code !== 0)
    v.push(
      `\`pdocs check\` exits ${check.code} on the migrated tree — with lint.adopting true it should report and exit 0:\n` +
        indented(check.stdout || check.stderr)
    );

  // The cleanup phase: a generated scaffold does not outlive the run.
  if (!ctx.scaffold && ctx.scaffoldDir && existsSync(ctx.scaffoldDir))
    v.push(
      "the generated scaffold is still on disk — the cleanup phase removes it"
    );

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
    const version = scaffoldVersion(ctx);
    const templates = seededIn(join(ctx.scaffoldDir, "docs"));
    installLayer(ctx);
    installTemplates(ctx, templates);
    frontmatter(ctx);
    writeConfig(ctx);
    report(ctx);

    // TEST SEAM, and the only one. `migrationHolds` is the guard that makes the
    // phase ordering enforce itself, and a unit test of the function does not
    // show it is WIRED. This lets a test add a bare document AFTER the report
    // was read and assert the run still stops.
    const mutate = process.env.PDOCS_MIGRATE_TEST_MUTATE;
    if (mutate && !ctx.dryRun) {
      ctx.wrote = true;
      mkdirSync(dirname(join(ctx.docsRoot, mutate)), { recursive: true });
      writeFileSync(join(ctx.docsRoot, mutate), "# Added by the test seam\n");
    }

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
        ? `\nDry run complete — nothing was changed. ${templates.length} template(s) would be installed or checked.`
        : `\nMigration complete. The gate is off (lint.adopting: true); the worklist above is what the backfill works from.`
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
    console.error(
      `\nSTOPPED: unexpected failure — ${(e as Error).message}${state}`
    );
    return 1;
  } finally {
    // A generated scaffold must not outlive the run, whichever way it ended.
    // Phase 9 removes it and says so on the success path; this is the net
    // under every other path, a stop in phase 2 included.
    if (ctx?.generatedTmp && existsSync(ctx.generatedTmp))
      rmSync(ctx.generatedTmp, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
