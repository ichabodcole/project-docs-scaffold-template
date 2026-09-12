/**
 * The seeded-file predicate must cover every template the registry declares.
 *
 * THIS IS THE TEST THAT WAS MISSING. The predicate matched `TEMPLATE` as a
 * PREFIX, which silently dropped `YYYY-MM-DD-TEMPLATE-investigation.md` and
 * `YYYY-MM-DD-TEMPLATE-report.md` — two templates the registry has always
 * declared. 17 of 19 were recorded, and the code comment claimed shape matching
 * meant nothing could be forgotten. Nothing exercised the claim.
 *
 * The registry is the authority. The predicate lives in two other places that
 * cannot read it — `hooks/post_gen_project.py` (stdlib, runs under cookiecutter
 * before a project exists) and the migration script (runs in someone else's
 * repo) — so this test is what holds all three in step.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { buildRegistry } from "./pdocs/lint/registry.ts";
import { DEFAULT_CONFIG } from "./pdocs/docs-lint/config.ts";

const REPO = join(import.meta.dir, "..");

/** The rule, stated once here and asserted against both real implementations. */
const isSeeded = (name: string): boolean =>
  (name.includes("TEMPLATE") && name.endsWith(".md")) ||
  name.endsWith(".template.md");

/** Every template the registry declares, as a docs-root-relative path. */
function declaredTemplates(): string[] {
  const out: string[] = [];
  for (const row of buildRegistry(DEFAULT_CONFIG)) {
    if (row.template === null || row.externalTemplate) continue;
    for (const t of Array.isArray(row.template) ? row.template : [row.template])
      out.push(t);
  }
  return [...new Set(out)];
}

describe("the seeded predicate covers the registry", () => {
  test("every declared template is seeded-shaped", () => {
    const missed = declaredTemplates().filter((t) => !isSeeded(basename(t)));
    expect(missed).toEqual([]);
  });

  test("it really would have caught the prefix bug", () => {
    // Perturbation, inline: the old predicate, against today's registry.
    const oldPredicate = (n: string) =>
      (n.startsWith("TEMPLATE") && n.endsWith(".md")) || n.endsWith(".template.md");
    const missedByOld = declaredTemplates().filter(
      (t) => !oldPredicate(basename(t))
    );
    expect(missedByOld.length).toBeGreaterThan(0);
  });

  test("the Python hook's copy agrees with this rule", () => {
    const hook = readFileSync(join(REPO, "hooks/post_gen_project.py"), "utf8");
    expect(hook).toContain('"TEMPLATE" in name and name.endswith(".md")');
    expect(hook).toContain('name.endswith(\n        ".template.md"\n    )');
  });

  test("the migration script's copy agrees with this rule", () => {
    const script = readFileSync(
      join(
        REPO,
        "plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.8-to-v2.9.ts"
      ),
      "utf8"
    );
    expect(script).toContain('name.includes("TEMPLATE") && name.endsWith(".md")');
    expect(script).toContain('name.endsWith(".template.md")');
  });

  test("every declared template actually exists in this repo", () => {
    const gone = declaredTemplates().filter(
      (t) => !existsSync(join(REPO, DEFAULT_CONFIG.docsRoot, t.replace(/^docs\//, "")))
    );
    expect(gone).toEqual([]);
  });
});
