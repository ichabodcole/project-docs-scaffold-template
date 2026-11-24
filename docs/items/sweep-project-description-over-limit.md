---
type: item
title: Bring sweep-project's description under 1024 characters
description:
  sweep-project's frontmatter description is 1102 characters, over the 1024
  limit the dist validator reports.
status: draft
lifecycle: triage
id: 01a20f8b-1b1f-7448-9c7d-776c6356a0bd
kind: chore
generated: { by: claude-fable-5-2, at: 2026-11-24 }
from: items/research-items-parent-feature/sessions/2026-11-24-ask-before-archiving.md
---

# Bring sweep-project's description under 1024 characters

The `description` in `plugins/project-docs/skills/sweep-project/SKILL.md` is
1102 characters. `scripts/validate-skills-dist.py` reports it in both packages.
The validator warns only and is not part of `npm run check`.

## Definition of done

- [ ] The description is 1024 characters or fewer and still names every case the
      skill triggers on.
- [ ] `uv run scripts/validate-skills-dist.py` no longer reports it.
- [ ] The plugin version is bumped and `dist/` rebuilt.
