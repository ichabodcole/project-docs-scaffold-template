---
type: item
title: Fix Lowercase skill.md Filenames
description:
  Five skills use lowercase skill.md instead of the Claude Code convention
  SKILL.md.
status: stable
lifecycle: done
id: 01a0da55-e3a2-7383-9534-68a0893d1ce0
kind: task
generated: { by: unknown, at: 2026-03-01 }
---

# Fix Lowercase skill.md Filenames

**Added:** 2026-03-01

Five skills use lowercase `skill.md` instead of the Claude Code convention
`SKILL.md`. This may affect skill discovery on case-sensitive systems and
doesn't match the spec. Rename files using `git mv` to preserve history.

## Acceptance Criteria

- [ ] All `skill.md` files renamed to `SKILL.md` via `git mv`
- [ ] dist/ copies updated (rebuild via `npm run build:dist`)
- [ ] No broken references

## References

- `plugins/project-docs/skills/dev-discovery/skill.md`
- `plugins/project-docs/skills/evaluative-research/skill.md`
- `plugins/project-docs/skills/gap-analysis/skill.md`
- `plugins/project-docs/skills/investigation-methodology/skill.md`
- `plugins/project-docs/skills/update-project-docs/skill.md`
