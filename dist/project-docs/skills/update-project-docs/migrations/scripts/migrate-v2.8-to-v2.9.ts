#!/usr/bin/env bun
/**
 * v2.8 → v2.9: write the seed manifest for a project that has never had one.
 *
 * WHAT IT DOES, AND WHAT IT DELIBERATELY DOES NOT. It records the sha256 of
 * every template ALREADY IN THE PROJECT — not the scaffold's copies. Nothing is
 * compared and nothing is replaced, because on this run nothing is known: a
 * project arriving at v2.9 has no record of what the scaffold once installed,
 * so every template reads as the adopter's and is adopted as it stands.
 *
 * That is the manifest's rule working, not an exception to it. Unknown is not
 * permission. From the NEXT migration on, `scripts/pdocs/seed.ts` compares
 * these hashes and an untouched template moves forward while an edited one is
 * reported and kept.
 *
 * A template the project edited three versions ago is therefore recorded as
 * though the scaffold had shipped it that way. That is the honest answer — we
 * cannot reconstruct what they started from — and it is why this is a one-time
 * adoption rather than a reconciliation.
 *
 * Usage:
 *   bun migrate-v2.8-to-v2.9.ts [--dry-run] [--root <path>]
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const MANIFEST_NAME = ".pdocs-seed.json";

/**
 * `TEMPLATE` ANYWHERE in the name, not as a prefix — the prefix form missed
 * `YYYY-MM-DD-TEMPLATE-investigation.md` and `YYYY-MM-DD-TEMPLATE-report.md`,
 * both of which the registry has always declared as templates.
 *
 * Kept in step with `_is_seeded` in `hooks/post_gen_project.py`. Two copies,
 * because the hook runs under cookiecutter with the stdlib and no project on
 * disk. Erring wide is safe: recording a path the scaffold never writes is a
 * no-op, where missing one silently drops a file out of the mechanism.
 */
function isSeeded(name: string): boolean {
  return (
    (name.includes("TEMPLATE") && name.endsWith(".md")) ||
    name.endsWith(".template.md")
  );
}

/** `_archive/` is the adopter's own history; a file named `TEMPLATE*.md` in
 *  there is theirs, not a scaffold template we installed. */
const SKIP_DIRS = new Set(["_archive", "node_modules", ".git"]);

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

function main(): number {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const rootIndex = argv.indexOf("--root");
  const root = resolve(rootIndex === -1 ? "." : (argv[rootIndex + 1] ?? "."));

  const configPath = join(root, ".project-docs.json");
  let docsRootName = "docs";
  let version: string | null = null;
  if (existsSync(configPath)) {
    try {
      const c = JSON.parse(readFileSync(configPath, "utf8"));
      if (typeof c.docsRoot === "string") docsRootName = c.docsRoot;
      if (typeof c.version === "string") version = c.version;
    } catch {
      console.error(`.project-docs.json is not valid JSON — fix it first.`);
      return 1;
    }
  }

  const docsRoot = join(root, docsRootName);
  if (!existsSync(docsRoot)) {
    console.error(`no ${docsRootName}/ at ${root} — is this a project-docs tree?`);
    return 1;
  }

  const manifestPath = join(docsRoot, MANIFEST_NAME);
  if (existsSync(manifestPath)) {
    console.log(`${docsRootName}/${MANIFEST_NAME} already exists — nothing to do.`);
    return 0; // Idempotent: a second run is a no-op, not a rewrite.
  }

  const files: Record<string, string> = {};
  for (const abs of walk(docsRoot).sort()) {
    files[relative(docsRoot, abs)] = createHash("sha256")
      .update(readFileSync(abs))
      .digest("hex");
  }

  const count = Object.keys(files).length;
  if (dryRun) {
    console.log(`would record ${count} template(s) at version ${version ?? "unknown"}:`);
    for (const rel of Object.keys(files)) console.log(`  ${rel}`);
    return 0;
  }

  writeFileSync(
    manifestPath,
    `${JSON.stringify({ version, files }, null, 2)}\n`
  );
  console.log(`recorded ${count} template(s) in ${docsRootName}/${MANIFEST_NAME}`);
  console.log(
    "Your templates are now yours: a later migration updates one only while you have not touched it."
  );
  return 0;
}

process.exit(main());
