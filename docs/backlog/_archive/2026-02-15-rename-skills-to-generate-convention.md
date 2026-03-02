# Rename X-to-Y skills to generate-X convention

**Added:** 2026-02-15

The `X-to-Y` naming convention for skills (`proposal-to-plan`,
`proposal-to-design-resolution`, `investigation-to-proposal`) encodes lifecycle
sequence into the name. As the lifecycle gains optional stages (design
resolution between proposal and plan, test plan after plan), positional names
become misleading — `proposal-to-plan` doesn't tell you about the design
resolution step that may happen in between.

Rename to `generate-X` convention: `generate-dev-plan`,
`generate-design-resolution`, `generate-proposal`. The skill internally
references its inputs, but the name describes what it produces rather than where
it sits in a sequence.

**Status:** DONE (2026-02-17)

The new `generate-test-plan` skill already uses this convention.

## Acceptance Criteria

- [x] `proposal-to-plan` → `generate-dev-plan` (skill + command)
- [x] `proposal-to-design-resolution` → `generate-design-resolution` (skill +
      command)
- [x] `investigation-to-proposal` → `generate-proposal` (skill + command)
- [x] All cross-references updated (README, manifesto, other skills)
- [ ] Migration guide created for update-project-docs skill
- [x] Old command names preserved in version history for discoverability

## References

- `plugins/project-docs/skills/proposal-to-plan/SKILL.md`
- `plugins/project-docs/skills/proposal-to-design-resolution/SKILL.md`
- `plugins/project-docs/skills/investigation-to-proposal/SKILL.md`
- `plugins/project-docs/commands/proposal-to-plan.md`
- `plugins/project-docs/commands/proposal-to-design-resolution.md`
- `plugins/project-docs/commands/investigation-to-proposal.md`
