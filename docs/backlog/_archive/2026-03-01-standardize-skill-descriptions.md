# Standardize Skill Frontmatter Descriptions

**Added:** 2026-03-01

Some skill descriptions in the frontmatter `description` field are too brief and
don't follow the recommended format from the skill-development skill. A good
description should: explain what the skill does, include "Use when..." guidance,
and list example trigger phrases ("user says X", "triggers when..."). The
description is what drives agent routing — a thin description means the skill
won't surface when it should.

Audit all skills in `plugins/project-docs/skills/` and `plugins/recipes/skills/`
for descriptions that are missing trigger phrases or "Use when" guidance.
Rewrite to follow the pattern used by well-described skills like
`finalize-branch`, `parallel-worktree-dev`, and `create-investigation`.

## Acceptance Criteria

- [ ] All skills audited for description quality
- [ ] Thin descriptions rewritten with trigger phrases and "Use when" guidance
- [ ] Consistent format across all skills
- [ ] dist/ rebuilt after changes

## References

- `plugins/project-docs/skills/` — all skill SKILL.md frontmatter
- `plugins/recipes/skills/` — all skill SKILL.md frontmatter
- Skill-development skill for recommended description format
