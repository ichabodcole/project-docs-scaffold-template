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
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { buildRegistry } from "./pdocs/lint/registry.ts";
import { DEFAULT_CONFIG } from "./pdocs/docs-lint/config.ts";
import { isSeeded as migrationIsSeeded } from "../plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.8-to-v2.9.ts";

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

  // Both other homes are EXECUTED against a shared fixture list, not matched as
  // source text. An earlier version asserted exact line wrapping, so reflowing
  // the Python predicate — behaviour identical — failed the test. A guard that
  // fires on a formatting edit is the other way to lose a guard.
  const FIXTURES = [
    ["TEMPLATE.md", true],
    ["TEMPLATE-domain.md", true],
    ["YYYY-MM-DD-TEMPLATE-investigation.md", true],
    ["YYYY-MM-DD-TEMPLATE-report.md", true],
    ["PLAN.template.md", true],
    ["BRIEF.template.md", true],
    ["README.md", false],
    ["a-real-playbook.md", false],
    ["TEMPLATE.txt", false],
    ["2026-01-01-a-session.md", false],
  ] as const;

  test("this rule matches the fixtures", () => {
    expect(FIXTURES.map(([n]) => isSeeded(n))).toEqual(FIXTURES.map(([, e]) => e));
  });

  test("the Python hook's copy behaves identically", () => {
    const names = FIXTURES.map(([n]) => n);
    const driver = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("hook", ${JSON.stringify(
      join(REPO, "hooks/post_gen_project.py")
    )})
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
print(json.dumps([m._is_seeded(n) for n in ${JSON.stringify(names)}]))
`;
    const r = Bun.spawnSync(["python3", "-c", driver], { stdout: "pipe", stderr: "pipe" });
    expect(r.stderr.toString()).toBe("");
    expect(JSON.parse(r.stdout.toString())).toEqual(FIXTURES.map(([, e]) => e));
  });

  test("the migration script's copy behaves identically", () => {
    expect(FIXTURES.map(([n]) => migrationIsSeeded(n))).toEqual(
      FIXTURES.map(([, e]) => e)
    );
  });

  test("every declared template actually exists in this repo", () => {
    const gone = declaredTemplates().filter(
      (t) => !existsSync(join(REPO, DEFAULT_CONFIG.docsRoot, t.replace(/^docs\//, "")))
    );
    expect(gone).toEqual([]);
  });
});
