# Test Plan Document Type — Implementation — 2026-02-15

## Context

Implementing the test plan document type per the 5-phase plan. This adds an
optional stage between Plan and Sessions in the project lifecycle — structured,
tiered verification scenarios for agent-implemented features.

Related: [Proposal](../proposal.md) |
[Design Resolution](../design-resolution.md) | [Plan](../plan.md)

## What Happened

The implementation followed the plan's 5 phases cleanly: template, agent,
skill/command, integration updates, documentation/plugin updates. The work also
included external dependencies awareness updates to the DR template and two
existing skills (proposal-to-design-resolution, proposal-to-plan) that emerged
during the design resolution phase.

A key process decision was made mid-implementation: root-level `docs/` files
(README.md, projects/README.md, templates) are intentionally NOT updated on this
branch. Instead, only the cookiecutter copies (source of truth) and plugin files
are updated. The root-level docs will be updated by running the `v2.3-to-v2.4`
migration skill on this project — dogfooding the migration path before other
projects use it.

Scaffold update checklist caught stale lifecycle references in
`{{cookiecutter}}/docs/reports/README.md` and `{{cookiecutter}}/docs/AGENTS.md`
that were never updated during the v2.3 (design-resolution) release. Fixed those
while updating for v2.4.

Code review caught 4 issues:

1. Missing `Task` in generate-test-plan command's `allowed_tools` — fixed
2. proposal-to-plan command not updated with external dependencies text (skill
   was, command wasn't) — fixed
3. `docs_version` not updated — deferred to release-please (managed
   automatically)
4. Agent color collision (green used by both gopher-dev and test-plan-generator)
   — changed to yellow

## Changes Made

**New files:**

- `{{cookiecutter}}/docs/projects/TEMPLATES/TEST-PLAN.template.md` — template
- `plugins/project-docs/agents/test-plan-generator.md` — agent
- `plugins/project-docs/skills/generate-test-plan/SKILL.md` — skill
- `plugins/project-docs/commands/generate-test-plan.md` — command
- `plugins/project-docs/skills/update-project-docs/migrations/v2.3-to-v2.4.md` —
  migration guide
- `docs/projects/test-plan-doc-type/` — proposal, DR, plan, session
- `docs/backlog/2026-02-15-rename-skills-to-generate-convention.md` — backlog

**Modified files:**

- Plugin: version 1.3.0 → 1.4.0, README with command docs + version history
- Integration: WORKTREE_TASK.md (+test-plan reference), finalize-branch (+soft
  check)
- Skills: proposal-to-design-resolution (+external deps Q&A), proposal-to-plan
  (+external deps awareness), update-project-docs (+migration table)
- Cookiecutter: DR template (+External Dependencies), docs/README.md,
  projects/README.md, AGENTS.md, reports/README.md — lifecycle strings updated
- Root: PROJECT_MANIFESTO.md (counts, pipeline), README.md (command list)

## Follow-up

- Run `v2.3-to-v2.4` migration on this project to dogfood the upgrade path
- Rename existing skills to `generate-X` convention (backlog item created)
