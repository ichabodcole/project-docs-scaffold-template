/**
 * ONE rule decides what a template is, and it has to be the same rule in the
 * two places that act on the answer: `scripts/pdocs/seed.ts`, which the next
 * migration reconciles templates through, and the lint, which judges every
 * other file. They were two rules. The lint matched `/template/i` on the
 * basename and hid a real page named `templates.md` (#163); the seeded rule
 * matched `TEMPLATE` anywhere in the name. Both are now `isSeeded` in
 * `seed.ts` — five exact shapes — and `rules.ts`'s `isTemplate` IS that
 * function, which this file pins.
 *
 * Two copies stay frozen on purpose and are tested for DIVERGENCE, not
 * equality: the v2.9 migration script's `isSeeded` and the cookiecutter hook's
 * `_is_seeded`. Each is the adoption-time rule that already ran on real trees
 * and wrote real manifests, so what matters is that a manifest they wrote is
 * fully covered by the rule that now reads it — every path the new rule calls
 * a template, the old rules called one too, on everything the scaffold ships.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { buildRegistry } from "./pdocs/lint/registry.ts";
import { DEFAULT_CONFIG } from "./pdocs/docs-lint/config.ts";
import { isTemplate } from "./pdocs/lint/rules.ts";
import { isSeeded } from "./pdocs/seed.ts";
import { childEnv } from "./pdocs/test-env.ts";
import { isSeeded as v29IsSeeded } from "../plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.8-to-v2.9.ts";

const REPO = join(import.meta.dir, "..");

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

/** The hook's `_is_seeded`, executed rather than matched as source text. */
function hookIsSeeded(names: string[]): boolean[] {
  const driver = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("hook", ${JSON.stringify(
    join(REPO, "hooks/post_gen_project.py")
  )})
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
print(json.dumps([m._is_seeded(n) for n in ${JSON.stringify(names)}]))
`;
  const r = Bun.spawnSync(["python3", "-c", driver], { stdout: "pipe", stderr: "pipe", env: childEnv() });
  expect(r.stderr.toString()).toBe("");
  return JSON.parse(r.stdout.toString());
}

describe("seed.ts and the lint decide \"template\" by one rule", () => {
  test("`isTemplate` is `isSeeded`, not a copy of it", () => {
    expect(isTemplate).toBe(isSeeded);
  });

  // The shapes, and the names a substring rule got wrong.
  const FIXTURES = [
    ["TEMPLATE.md", true],
    ["TEMPLATE-domain.md", true],
    ["YYYY-MM-DD-TEMPLATE-investigation.md", true],
    ["YYYY-MM-DD-TEMPLATE-report.md", true],
    ["PLAN.template.md", true],
    ["BRIEF.template.md", true],
    ["projects/TEMPLATES/anything.md", true],
    ["README.md", false],
    ["a-real-playbook.md", false],
    ["TEMPLATE.txt", false],
    ["2026-01-01-a-session.md", false],
    ["templates.md", false],
    ["email-templates.md", false],
    ["EMAIL-TEMPLATES.md", false],
    ["TEMPLATES.md", false],
  ] as const;

  test("the rule matches the fixtures", () => {
    expect(FIXTURES.map(([n]) => [n, isSeeded(n)])).toEqual(
      FIXTURES.map(([n, e]) => [n, e])
    );
  });

  test("every declared template is seeded-shaped", () => {
    expect(declaredTemplates().filter((t) => !isSeeded(basename(t)))).toEqual([]);
  });

  test("it really would have caught the prefix bug", () => {
    // Perturbation, inline: the original predicate, against today's registry.
    const oldPredicate = (n: string) =>
      (n.startsWith("TEMPLATE") && n.endsWith(".md")) || n.endsWith(".template.md");
    expect(
      declaredTemplates().filter((t) => !oldPredicate(basename(t))).length
    ).toBeGreaterThan(0);
  });

  test("every declared template actually exists in this repo", () => {
    const gone = declaredTemplates().filter(
      (t) => !existsSync(join(REPO, DEFAULT_CONFIG.docsRoot, t.replace(/^docs\//, "")))
    );
    expect(gone).toEqual([]);
  });
});

describe("the frozen adoption-time rules still cover what the new rule reads", () => {
  const shipped = declaredTemplates().map((t) => basename(t));

  test("a manifest the v2.9 script wrote holds every template the new rule expects", () => {
    // Superset on the shipped set, not equality: the old rule is wider.
    expect(shipped.filter((n) => isSeeded(n) && !v29IsSeeded(n))).toEqual([]);
  });

  test("and so does one the cookiecutter hook wrote", () => {
    const hook = hookIsSeeded(shipped);
    expect(shipped.filter((n, i) => isSeeded(n) && !hook[i])).toEqual([]);
  });

  test("the documented divergence: a name that merely contains TEMPLATE was seeded, and is no longer a template", () => {
    // Wider, so a manifest they wrote can only carry MORE than the new rule
    // recognises — never less. An extra recorded path stays a template: the
    // manifest is authoritative, so a migration keeps its `keep-*` verdict and
    // the lint (`templateTest`) skips it on every tier, as it always did.
    // Narrower than before, never a regression — and visible, as
    // `data.templates` in `pdocs check --format json`.
    expect(v29IsSeeded("EMAIL-TEMPLATES.md")).toBe(true);
    expect(hookIsSeeded(["EMAIL-TEMPLATES.md"])).toEqual([true]);
    expect(isSeeded("EMAIL-TEMPLATES.md")).toBe(false);
    // And neither ever recorded story-loom's lowercase page, so nothing that
    // exists disagrees with the lint reading it as a document.
    expect(v29IsSeeded("templates.md")).toBe(false);
    expect(isSeeded("templates.md")).toBe(false);
  });
});

/**
 * A delivered template must be Prettier-clean AS INSTALLED, under Prettier's
 * DEFAULTS — the adopter's Prettier, not this repository's. The two disagree
 * about one thing: this repo sets `proseWrap: always`, which wraps a long
 * `description:` onto a continuation line, and the default (`preserve`)
 * re-joins it. So a template that is clean here was a diff in every adopter
 * that runs `prettier --check docs/**` — and story-loom's lint-staged refused
 * the migration commit on the templates the migration had just installed.
 *
 * Copied out of the repo so no `.prettierrc` is found, and checked in ONE
 * Prettier process; the per-file version is the nine-second hook that teaches
 * people `--no-verify`.
 */
describe("every shipped template is Prettier-clean under default options", () => {
  const roots: string[] = [];
  afterAll(() => {
    for (const r of roots) rmSync(r, { recursive: true, force: true });
  });

  test("prettier --check, no config, passes on all of them", () => {
    const stage = mkdtempSync(join(tmpdir(), "seeded-prettier-"));
    roots.push(stage);
    const rels = declaredTemplates().map((t) => t.replace(/^docs\//, ""));
    for (const rel of rels) {
      mkdirSync(join(stage, dirname(rel)), { recursive: true });
      cpSync(join(REPO, DEFAULT_CONFIG.docsRoot, rel), join(stage, rel));
    }
    const r = Bun.spawnSync(
      [join(REPO, "node_modules/.bin/prettier"), "--check", ...rels],
      { cwd: stage, stdout: "pipe", stderr: "pipe", env: childEnv() }
    );
    const dirty = r.stderr
      .toString()
      .split("\n")
      .filter((l) => l.startsWith("[warn] ") && l.endsWith(".md"))
      .map((l) => l.slice("[warn] ".length));
    expect({ code: r.exitCode, dirty }).toEqual({ code: 0, dirty: [] });
  });
});
