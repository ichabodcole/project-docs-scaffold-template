---
type: memory
title: The project-docs skills write the work model
description:
  init-branch, finalize-branch, sweep-project, triage-items and the planning
  skills now write items' and features' fields through pdocs, and
  finalize-branch reflects into playbooks instead of writing a memory.
tags: [taxonomy, skills, touch-points]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-25 }
---

# The project-docs skills write the work model

Phase 4 of the work-taxonomy release rewrote the project-docs plugin (4.0.0) so
every field of the work model has a named writer: `init-branch` starts a
`backlog` or `ready` item (never `triage`); `finalize-branch` moves it to
`review`, then `done`, writes the session into the owner's folder, puts the
`Work-Item:` trailer on the session-record commit, and reflects into a playbook
or says "nothing this time"; `sweep-project` archives through `pdocs archive`;
`triage-items` replaces `backlog-to-projects`.

When changing a skill: drive the change from `pdocs` commands, not hand-written
paths, and walk it in a generated project — a fresh agent following the skill
literally finds what reading it does not. The plan's decisions D19–D23 say who
writes which state.

**Key files:** `plugins/project-docs/skills/finalize-branch/SKILL.md`,
`plugins/project-docs/skills/triage-items/SKILL.md`,
`plugins/project-docs/commands/init-branch.md`,
`plugins/project-docs/skills/create-project/references/pdocs.md`

**Docs:**
[Session record](../projects/work-taxonomy/sessions/2026-09-25-phase-4-skills.md),
[skill audit](../projects/work-taxonomy/artifacts/skill-audit.md)
