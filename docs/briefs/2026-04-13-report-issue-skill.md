# Brief: `project-docs:report-issue` skill

**Date:** 2026-04-13 **Status:** Approved for implementation

## Problem

When a user in another project hits a bug or rough edge in something shipped
from the `project-docs-scaffold-template` repo (any plugin skill, recipe,
command, agent, or the scaffold template itself), they have to manually explain
to their agent which repo to file against and what to include. This creates
friction for capturing real-world feedback on the plugins.

## Solution

A lightweight skill, `project-docs:report-issue`, that gives an agent exactly
enough context to file a well-formed GitHub issue against
`ichabodcole/project-docs-scaffold-template`.

## Scope

Covers **any component shipped from this repo**:

- `project-docs` plugin (skills, commands, agents)
- `recipes` plugin (all recipes)
- `toolbox`, `operator`, `agent-bridge` plugins
- The scaffold/cookiecutter template itself
- Repo documentation (README, migration guides, etc.)

## Behavior

1. **Activation triggers** — phrases like "file an issue against project-docs",
   "report this to the project-docs repo", "this is a bug in the X
   recipe/skill", "submit feedback on [component]".
2. **Draft the issue** with this minimal structure:
   - **Component** — plugin + specific item (e.g., `recipes/api-mcp-server`,
     `project-docs/generate-dev-plan`, `scaffold template`)
   - **What happened** — 1-3 sentences
   - **Expected vs actual** — if applicable
   - **Context** — what the user/agent was doing
   - **Suggested fix** — optional, only if the agent has a clear theory
   - **Label suggestion** — one of `bug`, `docs`, `enhancement`
3. **Always confirm before submitting.** Show the user the full draft (or a
   summary if it's long) and wait for explicit approval.
4. **Submit via `gh issue create`** when authenticated; otherwise print a
   prefilled
   `https://github.com/ichabodcole/project-docs-scaffold-template/issues/new?title=...&body=...`
   URL for the user to click.
5. **Return the issue URL** after submission.

## Non-goals

- No PR creation, no issue triage, no deduplication search.
- No bespoke templates per plugin — one shared skeleton.
- No assumption of `gh` being authenticated; URL fallback handles it.

## Deliverables

- `plugins/project-docs/skills/report-issue/SKILL.md` (single file, target ≤ 80
  lines)
- `dist/` mirror updated (per scaffold-update-checklist)
- Registration in `plugins/project-docs/.claude-plugin/plugin.json` if skills
  are listed there
- Plugin version bump (minor — behavioral addition per feedback memory)
