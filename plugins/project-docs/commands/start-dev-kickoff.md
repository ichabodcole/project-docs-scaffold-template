---
description:
  "Start development work from a DEV_KICKOFF.md file. Use when opening a fresh
  session to begin or resume implementation — finds DEV_KICKOFF.md, reads the
  mission, and follows the workflow defined in the document."
allowed_tools:
  ["Read", "Glob", "Bash", "AskUserQuestion", "Task", "Write", "Edit", "Grep"]
---

You are starting a development session from a DEV_KICKOFF.md handoff document.

## Step 1: Find DEV_KICKOFF.md

Check in order:

1. **Repo root / worktree root** — look for `DEV_KICKOFF.md` in the current
   directory

   ```bash
   ls DEV_KICKOFF.md 2>/dev/null
   ```

2. **Project folders** — use the Glob tool with pattern
   `docs/projects/*/DEV_KICKOFF.md`

If multiple files are found, ask: "I found DEV_KICKOFF.md in multiple projects.
Which one should I start?"

If none found, tell the user: "No DEV_KICKOFF.md found. Run
`/project-docs:dev-kickoff` to create one first."

## Step 2: Read and Acknowledge

Read the `DEV_KICKOFF.md`. Note the Strategy field and any Constraints.
Summarize the mission in 1-2 sentences so the user knows you've understood the
task before proceeding.

## Step 3: Read Source Documents

Read all documents listed in the Source Documents section that currently exist:

- Proposal (always read — required)
- Design resolution (if present)
- Plan (if already created — skip the planning steps below if so)
- Test plan (if already created)

## Step 4: Install Dependencies

Check the project's standard dependency installation method and run it (e.g.,
`npm install`, `pnpm install`, `bun install`). If unclear, check `package.json`,
`bun.lockb`, or similar.

## Step 5: Follow the Workflow Section

Execute the steps in the Workflow section of DEV_KICKOFF.md in order. Standard
steps:

1. Use the `dev-discovery` skill to understand relevant codebase areas
2. Use the `generate-dev-plan` skill to create the plan — wait for user review
3. Assess test plan need — use `generate-test-plan` if complex
4. Implement according to the plan
5. Test and verify
6. Commit with clear messages
7. Update the Completion Status checklist in DEV_KICKOFF.md

**Skip any steps already done** — if a plan.md exists, skip discovery and
planning and proceed to implementation.

## Step 6: Follow the Completion Section

When implementation is complete and all tests pass, follow the completion
instructions in DEV_KICKOFF.md:

- **Worktree strategy**: Run `/project-docs:finalize-branch`, then do NOT merge
  — notify the orchestrator
- **Main-repo strategy**: Run `/project-docs:finalize-branch`, then proceed with
  the merge options it presents
