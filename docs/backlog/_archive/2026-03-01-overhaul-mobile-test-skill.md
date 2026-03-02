# Overhaul mobile-test Skill for General Maestro Testing

**Added:** 2026-03-01

The `mobile-test` skill has two issues: its frontmatter description is too
limited (routing problem), and its content is too specific to the Operator
project. It should be a general-purpose Maestro testing skill that any project
can use.

Rewrite to focus on:

- General Maestro setup and usage (not Operator-specific flows)
- Documentation links and Context7 integration for up-to-date Maestro docs
- Common patterns: launch flows, element selection, assertions, screenshots
- Simulator management (iOS) and emulator management (Android)
- How to structure Maestro test files in a project
- Running tests from the command line
- Debugging failed flows

The skill should be the comprehensive entry point an agent needs to use Maestro
effectively, similar to how `dev-discovery` is comprehensive for codebase
exploration.

## Acceptance Criteria

- [ ] Description rewritten with trigger phrases and "Use when" guidance
- [ ] Operator-specific content removed or generalized
- [ ] Maestro documentation links and Context7 references included
- [ ] Common Maestro patterns and commands documented
- [ ] Simulator/emulator setup guidance included
- [ ] dist/ rebuilt after changes

## References

- `plugins/project-docs/skills/mobile-test/SKILL.md`
- [Maestro documentation](https://maestro.mobile.dev)
