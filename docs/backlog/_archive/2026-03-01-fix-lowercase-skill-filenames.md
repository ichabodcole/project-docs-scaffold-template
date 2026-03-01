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
