# Dev Kickoff: [Project name — derive from proposal title]

**Branch:** `{{BRANCH}}`\
**Created:** {{DATE}}\
**Strategy:** [Worktree | Main repo]

---

## Mission

[2-4 sentences describing what to build and why. Pre-fill from proposal — do not
leave this as a placeholder.]

## Source Documents

**Project:**

[Replace `<project-name>` with the actual project folder name in the links
below]

- [Proposal](docs/projects/<project-name>/proposal.md)
- [Design Resolution](docs/projects/<project-name>/design-resolution.md) (if
  applicable)
- [Plan](docs/projects/<project-name>/plan.md) (created during kickoff)
- [Test Plan](docs/projects/<project-name>/test-plan.md) (if applicable)

**Background context:**

- [Project Manifesto](docs/PROJECT_MANIFESTO.md) - Design principles

## Constraints

[Decisions already made, patterns to follow, things to avoid — check proposal
and design-resolution.md. Write "None at this time" if there are no
constraints.]

- [Constraint 1]
- [Constraint 2]

## Your Workflow

1. Read the project documents linked above
2. Install dependencies (if starting in a fresh worktree or environment)
3. Use the `dev-discovery` skill to understand the relevant codebase areas
4. Create a development plan in the project folder using the `generate-dev-plan`
   skill
5. Have the user review the development plan and provide feedback
6. Assess whether a test plan is needed — if the feature is complex (multiple
   systems, complex state, 3+ phases), use the `generate-test-plan` skill; if
   simple, testing strategy in the plan itself is sufficient
7. Implement according to the plan using your best judgement on how to execute
   efficiently (parallel sub-agents, agent team, etc.)
8. Test and verify
9. Commit with clear messages
10. Update the Completion Status checklist below

## Completion Status

- [ ] Discovery complete
- [ ] Plan created and user-reviewed
- [ ] Test plan created (if applicable)
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Ready for merge

## Completion

> **When filling this document:** Keep ONLY the block that matches the Strategy
> field above. Delete the other block entirely.

**Worktree strategy:** When implementation is complete and all tests pass:

1. Run `/project-docs:finalize-branch` to perform code review, create a session
   document, and prepare the branch for merge
2. Do NOT merge or remove the worktree — the orchestrator handles integration

**Main-repo strategy:** When implementation is complete and all tests pass:

1. Run `/project-docs:finalize-branch` to perform code review, create a session
   document, and prepare the branch for merge
2. Finalize-branch will present merge options — proceed with the appropriate
   option

## Notes

[Any additional context, warnings, or tips]
