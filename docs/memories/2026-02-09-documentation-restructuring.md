# Documentation restructured to project folders

**Date:** 2026-02-09

Replaced flat `proposals/`, `plans/`, `sessions/` directories with co-located
`projects/<name>/` folders. Each project folder holds its proposal, plan,
sessions, and artifacts together. Added `backlog/` for small tasks, `memories/`
for onboarding context, and a versioned migration system (`update-project-docs`
skill) so existing users can upgrade. Consolidated 3 investigation agents into 1
with evaluative and diagnostic modes. All three phases complete: cookiecutter
template, dogfood docs, and plugin tooling.

**Key files:** `docs/README.md`, `docs/projects/README.md`,
`plugins/project-docs/skills/update-project-docs/skill.md`,
`release-please-config.json`

**Docs:** [Proposal](../projects/documentation-restructuring/proposal.md),
[Plan](../projects/documentation-restructuring/plan.md)
