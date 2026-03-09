# Dev Kickoff: Migration Script Improvements for update-project-docs

**Branch:** `feature/migration-script-improvements`\
**Created:** 2026-03-08\
**Strategy:** Main repo

---

## Mission

Fix five concrete issues in the `update-project-docs` skill's migration scripts
discovered during a real v1.8.0 → v2.6.0 upgrade: incorrect path examples in
migration guides, a `git mv` failure on empty archive directories, incomplete
archive directory coverage (only 5 hardcoded paths when projects may have more),
a scaffold lifecycle problem that breaks multi-hop migrations, and missing
documentation for chaining multiple version upgrades in sequence.

## Source Documents

**Project:**

- [Proposal](docs/projects/migration-script-improvements/proposal.md)
- [Plan](docs/projects/migration-script-improvements/plan.md) (created during
  kickoff)

**Background context:**

- [Project Manifesto](docs/PROJECT_MANIFESTO.md) - Design principles

## Constraints

- Fix scope is narrow — only touch migration scripts and skill documentation; no
  new abstractions
- Dynamic archive discovery must be scoped to `docs/` only to avoid unintended
  renames
- Dry-run mode must continue to work correctly after script changes
- The `--keep-scaffold` flag is out of scope for MVP; document the backup
  workaround instead

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

**Main-repo strategy:** When implementation is complete and all tests pass:

1. Run `/project-docs:finalize-branch` to perform code review, create a session
   document, and prepare the branch for merge
2. Finalize-branch will present merge options — proceed with the appropriate
   option

## Notes

Issues sourced from real migration run: v1.8.0 → v2.6.0, 2026-03-08. All five
issues have confirmed workarounds documented in the Operator feedback doc.
