---
description:
  "Code review, documentation, and merge workflow for completed branches"
allowed_tools:
  ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "Task", "AskUserQuestion"]
---

You are tasked with finalizing a feature/fix/refactor/chore branch before
merging to develop.

**Playbook reference:** Follow the workflow in
[docs/playbooks/branch-finalization-playbook.md](../../docs/playbooks/branch-finalization-playbook.md)

## Workflow Summary

1. **Understand Branch Scope** - Review commits, files changed, overall
   accomplishment
2. **Code Review** - Review all commits, check new/modified files against
   patterns
3. **Run Quality Tools** - `pnpm run format`, `lint`, `check-types`, `test`
4. **Create Session Document** - Always create in the relevant project's
   `docs/projects/<project-name>/sessions/` folder. If no project folder exists
   for this work, create the session in a new or existing project folder. See
   `docs/projects/README.md` for conventions.
5. **Create Memory** - Create a short memory in `docs/memories/` summarizing
   what was done. Use the template at `docs/memories/TEMPLATE.md`. Name it
   `YYYY-MM-DD-short-description.md`. Skip for trivial changes where the commit
   message alone provides sufficient context.
6. **Assess Additional Docs** - Architecture, interaction design,
   specifications, lessons learned, playbooks
7. **Commit Documentation** - Stage and commit any new docs
8. **Squash Commits** - `git reset --soft develop` then single commit
9. **Merge to Develop with Approval** - Ask for user approval before merging
   `git merge --ff-only <branch>`
10. **Cleanup** - Delete branch, remove worktree if applicable

## Claude-Specific Guidance

### Code Review Approach

- Use Grep/Glob to find similar implementations for comparison
- Read files to understand established patterns before judging new code
- Use Task tool with Explore agent for broader codebase understanding if needed

### Quality Checks

Run these in sequence, fixing issues as they arise:

```bash
pnpm run format
pnpm run lint
pnpm run check-types
pnpm run test
```

### Documentation

- Session docs: Reference
  [docs/projects/README.md](../../docs/projects/README.md) (see Sessions
  section)
- Memories: Reference [docs/memories/README.md](../../docs/memories/README.md)
  and use [docs/memories/TEMPLATE.md](../../docs/memories/TEMPLATE.md). Keep it
  short — a heading, 1-3 sentences, key files, and a link to deeper docs.
- Architecture: Reference
  [docs/architecture/README.md](../../docs/architecture/README.md)
- Interaction design: Reference
  [docs/interaction-design/README.md](../../docs/interaction-design/README.md)
- Specifications: Check if `docs/specifications/` exists and whether changes on
  this branch affect documented behavior. If specs exist, flag any that may need
  updating based on the implemented changes.
- Present documentation recommendations to user and get confirmation before
  creating

### User Checkpoints

Ask for user confirmation at these points:

- After code review findings (before proceeding)
- Before creating additional documentation (beyond session)
- Before squashing commits (review commit message)
- Before merging to develop

### Important Constraints

- **Stay local** - Do NOT push to remote repositories
- **Fast-forward only** - Never create merge commits
- **Squash before merge** - One clean commit per branch on develop
- **Always create session doc** - Even for smooth work

## Output

At completion, summarize:

- Branch finalized
- Code review findings and resolutions
- Quality check results
- Documentation created/updated
- Final commit message
- Any follow-up items
