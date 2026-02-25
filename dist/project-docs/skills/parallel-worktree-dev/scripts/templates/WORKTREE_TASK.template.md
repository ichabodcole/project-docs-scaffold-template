# Worktree Task: [Task Title]

**Branch:** `{{BRANCH}}`\
**Based on:** `{{BASE_BRANCH}}`\
**Created:** {{DATE}}

---

## Your Mission

[2-4 sentences describing what to build and why. What problem does it solve?]

## Source Documents

**Project:**

- [Proposal](docs/projects/<project-name>/proposal.md)
- [Design Resolution](docs/projects/<project-name>/design-resolution.md) (if
  applicable)
- [Plan](docs/projects/<project-name>/plan.md) (if applicable)
- [Test Plan](docs/projects/<project-name>/test-plan.md) (if applicable)

**Background context:**

- [Project Manifesto](docs/PROJECT_MANIFESTO.md) - Design principles

## Constraints

[Any decisions already made, patterns to follow, things to avoid]

- [Constraint 1]
- [Constraint 2]

## Your Workflow

1. Read the project documents linked above
2. Install dependencies
3. Use the `dev-discovery` skill to understand the relevant codebase areas
4. Create a development plan in the project folder using the `generate-dev-plan`
   skill
5. Have the user review the development plan and provide feedback
6. Assess whether a test plan is needed — if the feature is complex (multiple
   systems, complex state, 3+ phases), use the `generate-test-plan` skill; if
   simple, testing strategy in the plan itself is sufficient
7. Implement according to the plan using your best judgement on how to execute
   the plan efficiently i.e. parallel sub-agents development, agent team, etc.
8. Test and verify
9. Commit with clear messages
10. Update this file with completion status

## Completion Status

- [ ] Discovery complete
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Ready for merge

## Notes

[Any additional context, warnings, or tips]
