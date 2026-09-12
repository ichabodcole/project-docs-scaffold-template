/**
 * The seed manifest: which files the scaffold installed, and what they looked
 * like when it did.
 *
 * WHY IT EXISTS. A scaffold file is in one of three ownership classes. *Owned*
 * files are overwritten on every migration — `SCHEMA.md`, the category READMEs,
 * this CLI. *Theirs* are never touched — `.project-docs.json`, root `AGENTS.md`,
 * every document. *Seeded* files sit between: the scaffold installs a working
 * default, and the adopter may take it over. Templates are the case this is for.
 *
 * Seeding without this record gives an adopter "never updated again", which is
 * worse than owned: they sit on a three-versions-old template and nothing ever
 * says so. Recording a hash at install time lets a migration ask what actually
 * changed, so the untouched files move forward and the edited ones do not.
 *
 * THE RULE THAT MATTERS: when we are not certain a file was left alone, we keep
 * the copy on disk. Unknown is not permission. That is also what every file
 * looks like on the first migration, before any manifest existed, which is why
 * the first run adopts a project as it stands rather than rewriting it.
 *
 * NOTHING SHIPPED CALLS THIS YET, and that is deliberate rather than an
 * oversight. The v2.9 migration only ADOPTS a project — it records hashes and
 * compares nothing, because on that run nothing is known. These five verdicts
 * are the API the NEXT migration consumes, which is why they ship now: the
 * record has to exist before there is anything to reconcile against.
 *
 * Zero dependencies, like the rest of `pdocs` — `node:crypto` and `node:fs`.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/** Lives inside the docs root, so it travels with what it describes — including
 *  across the cookiecutter install that moves `docs/` up into the parent. */
export const MANIFEST_NAME = ".pdocs-seed.json";

export interface SeedManifest {
  /** The scaffold version that wrote these hashes. `null` when there is no manifest. */
  version: string | null;
  /** Docs-root-relative path → sha256 of the bytes we installed. */
  files: Record<string, string>;
}

/**
 * What a migration may do with one seeded file.
 *
 * Only two of the five let the scaffold write: `update` (we installed it and it
 * is untouched) and `install` (it is not there and we never recorded it, so it
 * is new in this version and there is nothing to lose). The other three keep
 * what the adopter has, for three different reasons worth reporting apart.
 */
export type Verdict =
  | "update"
  | "install"
  | "keep-modified"
  | "keep-unknown"
  | "keep-deleted";

/** The sha256 of a file's bytes, or `null` if it is not there. */
export function hashOf(abs: string): string | null {
  if (!existsSync(abs)) return null;
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

/** Hash each path that exists, and call the result the record for `version`. */
export function recordSeeded(
  docsRoot: string,
  rels: readonly string[],
  version: string | null
): SeedManifest {
  const files: Record<string, string> = {};
  for (const rel of [...rels].sort()) {
    const h = hashOf(join(docsRoot, rel));
    if (h !== null) files[rel] = h;
  }
  return { version, files };
}

export function writeManifest(docsRoot: string, m: SeedManifest): void {
  writeFileSync(
    join(docsRoot, MANIFEST_NAME),
    `${JSON.stringify({ version: m.version, files: m.files }, null, 2)}\n`
  );
}

/**
 * An absent manifest is an empty one — every file then reads as `keep-unknown`,
 * which is the safe answer. A CORRUPT manifest is not: falling back to empty
 * would hide the damage until the file is rewritten and the record lost for
 * good, so it throws.
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

/** See `Verdict`. */
/** A manifest key must name a file INSIDE the docs root. A key carrying `../`
 *  would otherwise let a hand-edited manifest point the mechanism at any file
 *  on disk. Nothing writes from this module today; the containment check is
 *  here so that it cannot start doing so unsafely. */
function within(docsRoot: string, rel: string): string | null {
  const abs = resolve(docsRoot, rel);
  const back = relative(resolve(docsRoot), abs);
  if (back === "" || back.startsWith("..") || resolve(back) === back) return null;
  return abs;
}

export function verdictFor(
  m: SeedManifest,
  docsRoot: string,
  rel: string
): Verdict {
  const abs = within(docsRoot, rel);
  // An escaping key is treated as the adopter's — the same answer every other
  // uncertainty gets. It is never a verdict that permits writing.
  if (abs === null) return "keep-unknown";
  const recorded = m.files[rel];
  const current = hashOf(abs);

  if (recorded === undefined) return current === null ? "install" : "keep-unknown";
  if (current === null) return "keep-deleted";
  return current === recorded ? "update" : "keep-modified";
}

/** True when the scaffold is allowed to write this file. */
export function mayWrite(v: Verdict): boolean {
  return v === "update" || v === "install";
}
