# dev-kickoff skill replaces parallel-worktree-dev

**Date:** 2026-03-03

Added the `dev-kickoff` skill — a unified orchestrator for the full
proposal-to-implementation workflow that handles both worktree and main-repo
strategies. It replaces `parallel-worktree-dev` (worktree-only) and introduces
`DEV_KICKOFF.md` as a handoff document for both paths. The `start-dev-kickoff`
command replaces `start-worktree`.

**Key files:** `plugins/project-docs/skills/dev-kickoff/SKILL.md`,
`plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md`,
`plugins/project-docs/commands/start-dev-kickoff.md`,
`plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh`

**Docs:** `docs/projects/dev-kickoff/proposal.md`,
`docs/projects/dev-kickoff/sessions/2026-03-03-implementation.md`
