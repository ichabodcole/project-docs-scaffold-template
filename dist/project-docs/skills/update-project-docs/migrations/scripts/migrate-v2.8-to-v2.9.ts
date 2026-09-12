#!/usr/bin/env bun
/**
 * v2.8 → v2.9. The migration, not a description of one.
 *
 * WHY THIS IS A SCRIPT. The previous shape was prose with shell blocks an agent
 * executed separately. That shape produced the same defect three times across
 * two repair rounds: a guard computed in one block and consumed in the next runs
 * in a DIFFERENT PROCESS, so it protects nothing; and a check whose only output
 * is an echoed string cannot fail a run. Both were reintroduced by the repair
 * written to remove them. One process makes the first impossible and a real exit
 * code makes the second impossible, which is cheaper than remembering.
 *
 * WHAT IT DOES
 *   1  preflight   — this is a project-docs tree, the tools exist, git is clean
 *   2  scaffold    — generate the current template to .scaffold-tmp
 *   3  refresh     — replace the OWNED files: scripts/pdocs/, docs/SCHEMA.md
 *   4  format      — templates only, and BEFORE step 5 (see below)
 *   5  adopt       — record every template's sha256 in docs/.pdocs-seed.json
 *   6  verify      — the tree still lints, and the new refusal works
 *   7  version     — bump both markers to the release we migrated to
 *   8  cleanup     — remove .scaffold-tmp
 *
 * STEP 4 BEFORE STEP 5 IS LOAD-BEARING. Step 5 records the bytes of each
 * template. Formatting one afterwards leaves it not matching its own recorded
 * hash, so the next migration reads it as edited by the adopter and never
 * updates it again — the whole mechanism opted out of, for files nobody
 * touched. Formatting is also scoped to the templates rather than all of
 * `docs/**\/*.md`: reformatting a project's entire documentation tree inside a
 * migration billed as content-neutral is collateral the mechanism never needed.
 *
 * WHAT ADOPTION DOES NOT DO. It compares nothing and replaces nothing. On this
 * run nothing is known — the project has no record of what the scaffold once
 * installed — so every template is adopted as it stands. A template edited three
 * versions ago is recorded as though it had shipped that way. That is the honest
 * answer, and it is why this is a one-time adoption rather than a
 * reconciliation. From the next migration on, `scripts/pdocs/seed.ts` compares.
 *
 * Usage:
 *   bun migrate-v2.8-to-v2.9.ts [--root <path>] [--dry-run] [--re-adopt]
 *                               [--scaffold <path>] [--skip-format]
 *
 *   --root <path>      the project to migrate. Default: the current directory.
 *   --dry-run          report every phase's plan; change nothing.
 *   --re-adopt         rewrite an existing manifest from the current bytes.
 *   --scaffold <path>  use an already-generated scaffold instead of fetching
 *                      one. Skips the network; the path must be a generated
 *                      project root, not its docs/.
 *   --skip-format      do not run Prettier. Use when the project does not.
 *
 * Exit codes: 0 success · 1 the migration could not complete · 2 bad invocation.
 */
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const MANIFEST_NAME = ".pdocs-seed.json";
const TEMPLATE_REPO = "gh:ichabodcole/project-docs-scaffold-template";
const SKIP_DIRS = new Set(["_archive", "node_modules", ".git"]);

/**
 * `TEMPLATE` ANYWHERE in the name, not as a prefix — the prefix form missed
 * `YYYY-MM-DD-TEMPLATE-investigation.md` and `YYYY-MM-DD-TEMPLATE-report.md`,
 * both declared as templates by the registry since long before this migration.
 *
 * Kept in step with `_is_seeded` in `hooks/post_gen_project.py`; both are
 * exercised against the registry by `scripts/seeded-coverage.test.ts`. Erring
 * wide is safe — recording a path the scaffold never writes is a no-op — where
 * missing one silently drops a file out of the mechanism.
 */
export function isSeeded(name: string): boolean {
  return (
    (name.includes("TEMPLATE") && name.endsWith(".md")) ||
    name.endsWith(".template.md")
  );
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(abs, out);
      continue;
    }
    if (entry.isFile() && isSeeded(entry.name)) out.push(abs);
  }
  return out;
}

const sha = (abs: string) =>
  createHash("sha256").update(readFileSync(abs)).digest("hex");


/**
 * THE INVARIANT, CHECKED BY THE PROGRAM ITSELF.
 *
 * Every recorded hash must match the bytes on disk when the run ends. Recording
 * before a later phase rewrites a template is the defect this whole migration
 * exists around, and it survived two repair rounds because the ordering was only
 * ever enforced by remembering it. A test would catch a reordering only while
 * the test exists; this catches it on every run, including in someone else's
 * repository months from now.
 */
export function manifestMatchesDisk(docsRoot: string): string[] {
  const manifestPath = join(docsRoot, MANIFEST_NAME);
  if (!existsSync(manifestPath)) return [];
  const m = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    files?: Record<string, string>;
  };
  return Object.entries(m.files ?? {})
    .filter(([rel, hash]) => {
      const abs = join(docsRoot, rel);
      return !existsSync(abs) || sha(abs) !== hash;
    })
    .map(([rel]) => rel);
}

// ---------------------------------------------------------------------------------------
// Reporting. Every phase says what it did; a failure throws and stops the run.
// ---------------------------------------------------------------------------------------

class MigrationError extends Error {}

const say = (s: string) => console.log(s);
const step = (n: number, title: string) => say(`\n[${n}/8] ${title}`);
const ok = (s: string) => say(`   ✓ ${s}`);
const note = (s: string) => say(`   · ${s}`);
const fail = (s: string): never => {
  throw new MigrationError(s);
};

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

const have = (bin: string) => run(["sh", "-c", `command -v ${bin}`], ".").code === 0;

// ---------------------------------------------------------------------------------------

interface Options {
  root: string;
  dryRun: boolean;
  reAdopt: boolean;
  scaffold: string | null;
  skipFormat: boolean;
}

export function parseArgs(argv: string[]): Options {
  const opts: Options = {
    root: ".",
    dryRun: false,
    reAdopt: false,
    scaffold: null,
    skipFormat: false,
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
    // `--scaffold-dir` is the name the other migration scripts in this family
    // use; `--scaffold` is accepted as an alias rather than breaking either.
    else if (a === "--scaffold" || a === "--scaffold-dir") opts.scaffold = value();
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--re-adopt") opts.reAdopt = true;
    else if (a === "--skip-format") opts.skipFormat = true;
    else
      fail(
        `unknown argument \`${a}\`. Valid: --root, --scaffold-dir (--scaffold), --dry-run, --re-adopt, --skip-format.`
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
  scaffoldDir: string;
}

function preflight(o: Options): Ctx {
  step(1, "Preflight");
  const root = resolve(o.root);
  const configPath = join(root, ".project-docs.json");
  if (!existsSync(configPath))
    fail(
      `no .project-docs.json at ${root} — this is not a project-docs tree. Pass --root <project root>.`
    );

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (e) {
    return fail(`.project-docs.json is not valid JSON: ${(e as Error).message}`);
  }
  const docsRootName =
    typeof config.docsRoot === "string" ? config.docsRoot : "docs";
  const docsRoot = join(root, docsRootName);
  if (!existsSync(docsRoot))
    fail(`no ${docsRootName}/ at ${root} — docsRoot names a directory that is not there.`);
  ok(`project at ${root}, docsRoot ${docsRootName}/`);

  if (!o.scaffold && !have("cookiecutter"))
    fail(
      "cookiecutter is not installed, and no --scaffold <path> was given. Install it, or generate the scaffold yourself and pass its path."
    );
  // NOT a downgrade-and-continue. Formatting has to happen before the hashes
  // are taken, so "carried on without it" silently produces a manifest this
  // project's own pre-commit formatter will invalidate on the next commit. The
  // shape being replaced made npx a hard requirement; degrading it to a note
  // moved that backwards. `--skip-format` is how a project that does not use
  // Prettier says so, deliberately.
  if (!o.skipFormat && !have("npx"))
    fail(
      "npx not found, and --skip-format was not given. Formatting must happen before the hashes are recorded; install Node/npx, or pass --skip-format if this project does not use Prettier."
    );

  // A dirty tree makes this migration's changes indistinguishable from the
  // adopter's. Reported, not enforced: it is their repository.
  const git = run(["git", "status", "--porcelain"], root);
  if (git.code === 0 && git.stdout.trim() !== "")
    note(
      `working tree is dirty (${git.stdout.trim().split("\n").length} path(s)) — commit or stash first if you want this migration isolated`
    );
  else if (git.code === 0) ok("git tree clean");

  return {
    ...o,
    root,
    docsRootName,
    docsRoot,
    configPath,
    scaffoldDir: "",
  };
}

function getScaffold(ctx: Ctx): string {
  step(2, "Current scaffold");
  if (ctx.scaffold) {
    const s = resolve(ctx.scaffold);
    if (!existsSync(join(s, "docs/SCHEMA.md")) || !existsSync(join(s, "scripts/pdocs")))
      fail(
        `--scaffold ${s} is not a generated project root (expected docs/SCHEMA.md and scripts/pdocs/ inside it).`
      );
    ok(`using ${s}`);
    return s;
  }

  // Generated into a private temp dir, never into the project — a leftover
  // .scaffold-tmp in the project is how a previous shape silently copied from
  // a STALE scaffold while its own verification passed.
  // A DRY RUN GENERATES THE SCAFFOLD TOO. Returning "" here made
  // `join("", "docs/README.md")` resolve against the process cwd, so the dry run
  // read the ADOPTER's README and reported the version they already have — the
  // guide's first command, printing a no-op plan at exit 0. Generating is
  // read-only with respect to the project, and it is what makes the rest of the
  // dry run describe the run that would actually happen.
  const out = mkdtempSync(join(tmpdir(), "pdocs-scaffold-"));
  const r = run(
    [
      "cookiecutter", TEMPLATE_REPO, "--no-input", "-o", out,
      'install_target=New project folder',
    ],
    ctx.root
  );
  if (r.code !== 0)
    fail(`cookiecutter failed (exit ${r.code}):\n${r.stderr || r.stdout}`);

  const dirs = readdirSync(out, { withFileTypes: true }).filter((d) => d.isDirectory());
  if (dirs.length !== 1)
    fail(`expected one generated project in ${out}, found ${dirs.length}`);
  const s = join(out, dirs[0]!.name);
  if (!existsSync(join(s, "docs/SCHEMA.md")) || !existsSync(join(s, "scripts/pdocs")))
    fail(`generated scaffold at ${s} is missing docs/SCHEMA.md or scripts/pdocs/`);
  ok(`generated at ${s}`);
  return s;
}

function refreshOwned(ctx: Ctx): void {
  step(3, "Refresh the owned files");
  const cliSrc = join(ctx.scaffoldDir, "scripts/pdocs");
  const cliDst = join(ctx.root, "scripts/pdocs");
  const schemaSrc = join(ctx.scaffoldDir, "docs/SCHEMA.md");
  const schemaDst = join(ctx.docsRoot, "SCHEMA.md");

  if (ctx.dryRun) {
    note(`would replace ${relative(ctx.root, cliDst)}/ and ${ctx.docsRootName}/SCHEMA.md`);
    return;
  }

  cpSync(cliSrc, cliDst, { recursive: true });
  if (!existsSync(join(cliDst, "seed.ts")))
    fail("scripts/pdocs/seed.ts did not arrive — the scaffold is older than v2.9.");
  ok("scripts/pdocs/ refreshed (seed.ts present)");

  cpSync(schemaSrc, schemaDst);
  const schema = readFileSync(schemaDst, "utf8");
  for (const marker of ["Who owns which file", "Declaring your own folder"])
    if (!schema.includes(marker))
      fail(
        `${ctx.docsRootName}/SCHEMA.md is missing "${marker}" — the scaffold is older than v2.9.`
      );
  ok(`${ctx.docsRootName}/SCHEMA.md refreshed (both new sections present)`);
}

function formatTemplates(ctx: Ctx, templates: string[]): void {
  step(4, "Format the templates — before recording, never after");
  if (ctx.skipFormat || !have("npx")) {
    note("skipped");
    return;
  }
  if (templates.length === 0) {
    note("no templates to format");
    return;
  }
  const rel = templates.map((t) => relative(ctx.root, t));
  if (ctx.dryRun) {
    note(`would run prettier over ${rel.length} template(s)`);
    return;
  }
  const r = run(["npx", "prettier", "--write", ...rel], ctx.root);
  if (r.code !== 0)
    fail(
      `prettier exited ${r.code}. Recording hashes now would produce a manifest your own formatter invalidates on the next commit.\n` +
        `   Fix the formatter, or pass --skip-format if this project does not use Prettier.\n\n` +
        (r.stderr || r.stdout).split("\n").map((l) => `       ${l}`).join("\n")
    );
  ok(`formatted ${rel.length} template(s)`);
}

function adopt(ctx: Ctx, templates: string[], version: string): number {
  step(5, "Adopt the templates");
  const manifestPath = join(ctx.docsRoot, MANIFEST_NAME);

  if (existsSync(manifestPath) && !ctx.reAdopt) {
    // Not silence. The previous shape printed "nothing to do" and returned 0,
    // so a re-run after a skipped format left every later check passing against
    // stale hashes.
    const existing = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      files?: Record<string, string>;
    };
    const files = existing.files ?? {};
    const stale = Object.entries(files).filter(([rel, hash]) => {
      const abs = join(ctx.docsRoot, rel);
      return !existsSync(abs) || sha(abs) !== hash;
    });
    note(`${ctx.docsRootName}/${MANIFEST_NAME} already exists (${Object.keys(files).length} entries)`);

    // Recorded-vs-disk is only half the question. Asking it alone let a template
    // ADDED after adoption sit in no manifest for ever, which is the exact harm
    // `seed.ts`'s header describes — and the run reported success.
    const unrecorded = templates
      .map((t) => relative(ctx.docsRoot, t))
      .filter((rel) => !(rel in files));

    if (stale.length === 0 && unrecorded.length === 0) {
      ok("every recorded hash still matches, and nothing is unrecorded");
      return Object.keys(files).length;
    }
    if (stale.length === 0)
      fail(
        `${unrecorded.length} template(s) are on disk but in no manifest:\n` +
          unrecorded.map((r) => `       ${r}`).join("\n") +
          `\n\n   They would never be updated by any later migration. Re-run with` +
          `\n   --re-adopt to record them; nothing you wrote is changed.`
      );
    fail(
      `this project has already been migrated, and ${stale.length} recorded hash(es) ` +
        `no longer match:\n` +
        stale.map(([rel]) => `       ${rel}`).join("\n") +
        `\n\n   Two readings, and this script cannot tell them apart:` +
        `\n     · you edited those templates since adopting — working as intended,` +
        `\n       and a later migration will report rather than overwrite them;` +
        `\n     · adoption ran BEFORE formatting, so the record was wrong from the` +
        `\n       start and every one of those files is silently opted out.` +
        `\n\n   \`--re-adopt\` is the right answer to both: it makes the bytes on disk` +
        `\n   now the baseline. Nothing you wrote is changed either way.`
    );
  }

  if (ctx.dryRun) {
    note(`would record ${templates.length} template(s):`);
    for (const t of templates) say(`       ${relative(ctx.docsRoot, t)}`);
    if (templates.length === 0)
      fail("would record 0 templates — wrong docsRoot, or no templates in this tree.");
    return templates.length;
  }

  const files: Record<string, string> = {};
  for (const abs of [...templates].sort())
    files[relative(ctx.docsRoot, abs)] = sha(abs);

  // Counted from the parsed object, never by grepping the file: a count of
  // `": "` occurrences matches the `version` line too, so an empty manifest
  // reported 1 and passed the guard written to catch exactly that.
  const count = Object.keys(files).length;
  if (count === 0)
    fail(
      `found 0 templates under ${ctx.docsRootName}/ — a manifest recording nothing is written, valid and useless. Check --root and docsRoot.`
    );

  writeFileSync(manifestPath, `${JSON.stringify({ version, files }, null, 2)}\n`);
  ok(`recorded ${count} template(s) in ${ctx.docsRootName}/${MANIFEST_NAME}`);
  note("commit it — a manifest that never reaches the repository cannot be read next time");
  return count;
}

function verify(ctx: Ctx): void {
  step(6, "Verify the tree against the refreshed CLI");
  if (ctx.dryRun) {
    note("would run `pdocs check` and the unknown-type refusal");
    return;
  }
  const cli = join(ctx.root, "scripts/pdocs/cli.ts");

  const check = run(["bun", cli, "check", "--format", "text"], ctx.root);
  if (check.code !== 0)
    fail(
      `\`pdocs check\` exits ${check.code}. Nothing here changes a document, so this is a\n` +
        `   pre-existing gap the newer lint now sees. Its output names each file and rule:\n\n` +
        check.stdout.split("\n").map((l) => `       ${l}`).join("\n")
    );
  ok("pdocs check: clean");

  const refusal = run(["bun", cli, "find", "--type", "nosuchtype"], ctx.root);
  if (refusal.code !== 2)
    fail(
      `\`find --type nosuchtype\` exited ${refusal.code}, expected 2. The refreshed CLI should refuse an unknown type rather than return an empty result.`
    );
  ok("unknown --type refused with exit 2");
}

/** The release being migrated TO, read from the generated scaffold. */
function scaffoldVersion(ctx: Ctx): string {
  const readmeSrc = join(ctx.scaffoldDir, "docs/README.md");
  if (!ctx.scaffoldDir || !existsSync(readmeSrc))
    fail(`the scaffold has no docs/README.md at ${readmeSrc || "(no scaffold)"}`);
  const m = /^docs_version:\s*"([^"]+)"/m.exec(readFileSync(readmeSrc, "utf8"));
  const version = m?.[1];
  if (!version || !/^\d+\.\d+\.\d+$/.test(version))
    fail(
      `could not read a version from the scaffold's docs/README.md (got ${JSON.stringify(version ?? null)})`
    );
  return version as string;
}

function bumpVersion(ctx: Ctx, version: string): void {
  step(7, "Version markers");
  if (ctx.dryRun) {
    note(`would set both markers to ${version}`);
    return;
  }

  // Reported per marker. A single unconditional "both markers set" printed even
  // when the README branch had just said there was no line to set — one marker
  // moved, "both" claimed, and the guide's checklist repeated it as a box to
  // tick.
  const readmeDst = join(ctx.docsRoot, "README.md");
  let readme: string;
  if (!existsSync(readmeDst)) {
    readme = `${ctx.docsRootName}/README.md is not there`;
  } else {
    const before = readFileSync(readmeDst, "utf8");
    const RE = /^docs_version:\s*"[^"]*"/m;
    // Whether the LINE EXISTS and whether the VALUE CHANGED are two questions.
    if (!RE.test(before)) {
      readme = `${ctx.docsRootName}/README.md carries no docs_version line`;
    } else {
      const after = before.replace(RE, `docs_version: "${version}"`);
      if (after === before) readme = `${ctx.docsRootName}/README.md already at ${version}`;
      else {
        writeFileSync(readmeDst, after);
        readme = `${ctx.docsRootName}/README.md set to ${version}`;
      }
    }
  }

  // Parsed and re-serialised, not regex-substituted. A line-based expression
  // rewrote EVERY `"version":` in the file, including an adopter's nested key —
  // in a file the ownership table classifies as never touched.
  const cfg = JSON.parse(readFileSync(ctx.configPath, "utf8"));
  const configBefore = cfg.version;
  cfg.version = version;
  writeFileSync(ctx.configPath, `${JSON.stringify(cfg, null, 2)}\n`);
  const config =
    configBefore === version
      ? `.project-docs.json already at ${version}`
      : `.project-docs.json set to ${version}`;

  ok(readme);
  ok(config);
}

function cleanup(ctx: Ctx): void {
  step(8, "Clean up");
  if (ctx.scaffold) {
    note("scaffold was supplied with --scaffold — left in place");
    return;
  }
  // A dry run generates a scaffold now, so it has one to remove. Leaving it
  // behind would make "changes nothing" false in the one direction the phase
  // exists to prevent.
  if (!ctx.scaffoldDir) {
    note("nothing to remove");
    return;
  }
  rmSync(resolve(ctx.scaffoldDir, ".."), { recursive: true, force: true });
  ok("generated scaffold removed");
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

  try {
    const ctx = preflight(opts);
    ctx.scaffoldDir = getScaffold(ctx);
    refreshOwned(ctx);

    const version = scaffoldVersion(ctx);
    formatTemplates(ctx, walk(ctx.docsRoot));
    // `adopt` hashes at call time, so this walk is the one whose bytes are
    // recorded — after formatting, which is the ordering the whole migration
    // turns on.
    const count = adopt(ctx, walk(ctx.docsRoot), version);

    // TEST SEAM, and the only one. `manifestMatchesDisk` is the guard that makes
    // the format-before-record ordering enforce itself, and a unit test of the
    // function does not show it is WIRED — neutering this call site left the
    // suite green. This lets a test corrupt a recorded file after adoption and
    // assert the run still stops.
    const mutate = process.env.PDOCS_MIGRATE_TEST_MUTATE;
    if (mutate && existsSync(join(ctx.docsRoot, mutate)))
      writeFileSync(join(ctx.docsRoot, mutate), "mutated by the test seam\n");

    verify(ctx);
    bumpVersion(ctx, version);
    cleanup(ctx);

    if (!ctx.dryRun) {
      const stale = manifestMatchesDisk(ctx.docsRoot);
      if (stale.length > 0)
        fail(
          `the manifest does not match the files on disk after this run:\n` +
            stale.map((r) => `       ${r}`).join("\n") +
            `\n\n   Some phase changed a template AFTER it was recorded. Adoption must be` +
            `\n   the last phase that touches a template's bytes — formatting included.` +
            `\n   Nothing was rolled back; re-run with --re-adopt once the order is fixed.`
        );
    }

    say(
      ctx.dryRun
        ? `\nDry run complete — nothing was changed. ${count} template(s) would be adopted.`
        : `\nMigration complete. ${count} template(s) adopted; your templates are now yours.`
    );
    return 0;
  } catch (e) {
    if (e instanceof MigrationError) {
      console.error(`\nSTOPPED: ${(e as Error).message}`);
      return 1;
    }
    // Anything else — a malformed existing manifest, EACCES from cpSync — is
    // still a migration that could not complete, not a crash to show the
    // operator. The header promises a named reason on every failure; a raw
    // stack trace is not one.
    console.error(
      `\nSTOPPED: unexpected failure — ${(e as Error).message}\n` +
        `   The tree may be partly migrated. Re-running is safe: completed phases\n` +
        `   are idempotent, and adoption reports rather than overwrites.`
    );
    return 1;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
