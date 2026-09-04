---
type: memory
title: Documentation restructured to project folders
description:
  Flat proposals/, plans/ and sessions/ folders became co-located
  projects/<name>/ folders, so a feature's whole record opens in one place.
tags: [documentation, restructure, projects]
status: stable
generated: { by: unknown, at: 2026-02-09 }
---

# Documentation restructured to project folders

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

**Docs:**
[Proposal](../projects/_archive/documentation-restructuring/proposal.md),
[Plan](../projects/_archive/documentation-restructuring/plan.md)
