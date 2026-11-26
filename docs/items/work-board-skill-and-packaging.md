---
type: item
title: Write the work-board skill and package it
description:
  A skill that lets an agent who has never seen the board open it, explain it,
  act on what the user asks from it and stop it, shipped in a plugin release.
status: stable
lifecycle: active
id: 01a1f70e-fd57-7161-9b14-eb5927e17434
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-19 }
cycle: 2026-11-work-board
parent: feature/pdocs-work-board
from: features/pdocs-work-board/plan.md
blocked_by:
  [01a1f70e-fcfb-71a7-a8c7-2b9c09152e10, 01a1eaa7-44f9-7007-849c-b966874e830e]
---

# Write the work-board skill and package it

`plugins/project-docs/skills/work-board/SKILL.md`: how an agent opens the board,
what to do with each refusal `open` prints, that the board's writes are the
user's and arrive as changed files, how to act on the lines a user pastes from
the board, and `status` and `stop`. It names `triage-items` as the skill for
agent-proposed triage so the two do not compete. With it: a minor plugin version
bump, the plugin README, the `scaffold-update-checklist` pass, and a rebuilt
`dist/`.

This is Phase 6 of the [plan](../features/pdocs-work-board/plan.md). It needs
[the writes](./board-two-writes-with-undo/item.md), and
[#210](./research-items-parent-feature/item.md) landed, because the Inbox and
Feature pages are checked again on its result. It ships in the same plugin
release as [the re-pin](./repin-migration-for-board-fields.md).

## Definition of done

- [ ] A fresh agent given only the skill opens the board in a project generated
      with cookiecutter. The user accepts one triage item and brings it into a
      cycle. The transcript is kept in the session.
- [ ] The same walk on a project with a 9.4.1 CLI stops at `open` with the
      `update-project-docs` message.
- [ ] The skill opens the board through its own directory, never a `plugins/…`
      path.
- [ ] Building `dist/` twice leaves it unchanged after the first build, with
      nothing under `dist/codex-project-docs/skills/work-board/`.
- [ ] The plugin version has a minor bump and the plugin README lists the skill.
- [ ] After #210 lands, the Inbox and Feature pages are checked again on this
      tree.
- [ ] `npm run check` passes.

## Related Documents

- [pdocs Work Board Implementation Plan](../features/pdocs-work-board/plan.md)
