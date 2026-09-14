---
type: memory
title: The v2.6 migration is a script, and the skill teaches the shape
description:
  v2.6-to-v2.7 became a nine-phase self-verifying script authored under a
  rewritten migration-authoring skill, ran for real on MediaForge, and six older
  guides went legacy; project-docs 3.10.0.
tags: [migrations, agent-execution, tooling]
related: [lesson/a-guard-must-be-able-to-fail]
status: stable
generated: { by: claude-fable-5-1, at: 2026-09-13 }
---

# The v2.6 migration is a script, and the skill teaches the shape

`migration-authoring` was rewritten around one rule — a migration is a script
when a later step depends on a computed value, when a check must be able to stop
the run, or when it must be re-runnable — with the script shape described from
the v2.8 → v2.9 reference and a checklist the reference passes and the old prose
guides fail. `v2.6-to-v2.7`, the migration every consuming project has to run,
was then authored under it: nine phases, the existing codemod as a sibling
module, a preflight that stops on undeclared docs-root folders before writing, a
templates phase that keeps an already-edited template, and an end-of-run
invariant. It ran for real on `dreamwood/media-forge`; the six other guides
carry a legacy banner and `v2.7-to-v2.8`'s precondition reads the file rather
than its name.

**Key files:**
`plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.6-to-v2.7.ts`,
`plugins/project-docs/skills/update-project-docs/migrations/v2.6-to-v2.7.md`,
`.claude/skills/migration-authoring/SKILL.md`

**Docs:** [Migration Shape](../projects/migration-shape/proposal.md) — proposal,
plan, kickoff, and the guards-watched-failing record in `artifacts/`

## What was non-obvious

- **The skill grew five times while the script was authored** — preflight on a
  tree with no config yet, arrival checks owned by the invariant, witness
  mechanics, an after-script section, what a precondition cell is for. That is
  what "the script is the test of the skill" meant in practice.
- **46 guards were each neutered in the real script and watched go red** on
  their covering test before being trusted. Ten went red on reason text rather
  than exit code, because the next guard caught the same fault.
- **The published scaffold can lag the migration.** The script fetches from the
  released `main`; the migration ships with the plugin on `develop`. The dry run
  did not catch the gap on MediaForge; the real run stopped in phase 3. The
  scaffold phase now verifies the markers in both modes, and the guide says how
  to pass `--scaffold-dir` from a checkout.
- **A consumer's own pre-commit hook can refuse the migration commit** for
  reasons unrelated to documentation. MediaForge's monorepo typecheck fails on
  `develop`; both migration commits bypassed it with formatters run by hand.
- **Every consuming project is on v2.6**, and `dreamwood/dream-flute`'s
  `docs/lint.ts` is its own lint, not v2.7's — which is why the v2.7 guide's
  precondition now reads content.
