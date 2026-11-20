---
type: session
title: The board's model and selection rules — 2026-11-19
description:
  Built layout D's behaviour as pure functions over a four-part snapshot, and
  recorded in the plan that the snapshot reads each current cycle.
tags: [work-board, pdocs]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-19 }
---

# The board's model and selection rules — 2026-11-19

Part of [The work board](../../../cycles/2026-11-work-board.md).

## Context

Phase 3 of the [work board plan](../../../features/pdocs-work-board/plan.md):
layout D's behaviour as pure functions, so the UI in Phase 4 only binds them.

## What Happened

`app/model.ts` and `app/selection.ts` under
`plugins/project-docs/skills/work-board/` hold the rules, with 110 tests and no
DOM. Each rule was reverted on its own in a scratch copy, and each revert turned
a test red (66 reverts).

Where the plan and the prototype disagreed, or the plan was silent:

- **Changing cycle clears the selection.** The prototype moves the highlight to
  the same index in the other cycle. The plan wins.
- **Every snooze wakes when the active cycle changes**, as the plan words it. A
  "for a week" snooze ends early at a cycle change, including the moment between
  closing one cycle and starting the next.
- **Priority order is the CLI's**, with `urgent` first. The prototype knew only
  high, medium and low.
- **An advisory row** is labelled by its `message`, described by its `action`,
  and listed once when more than one view returns it.
- **Dropped items** appear in no group, so a page can show fewer rows than the
  portfolio's total.
- **Blocked, draft-started and stale-blocker rows** show only the first item
  when several match, as the prototype does.

## Notable Discoveries

- **The snapshot has four parts, not three.** A planned cycle's `status` is in
  none of `view board --features --all`, `view portfolio` and `view unreviewed`,
  so the snapshot carries a `cycles` part read from `view cycle <slug>` for each
  current cycle. A planned cycle with no entry counts as not reviewed. The plan
  now says so in its approach, Phase 2 and Phase 3.
- **The build copies a skill folder whole**, so test files and the fixture ship
  in the plugin. The first fixture was a 127 KB recording of every work document
  in this repository. It is now 10 KB: the work board feature, seven of its
  items, both current cycles and two advisories, cut to those entries.
- **The fixture has no `cycles` entry for the planned cycle**, because that
  cycle's description names other projects. Its Inbox row appears through the
  "no entry" path. Synthetic tests cover the `draft` path.
- **The built plugin README counts 28 skills** until `work-board` gets its
  `SKILL.md` in Phase 6, because the build counts folders. The root README, the
  manifesto and one item say 27, and no check compares them.
- **`work-board` is already excluded from the Codex package.** The plan gave
  that to Phase 2, but this branch created the folder first.

## Review

- **Roster:** read from the agent types this session can dispatch.
- **Chosen:** `general-purpose` (tools `*`, so it has shell access), briefed
  against Phase 3 of the plan, the item, the feature and the prototype, and told
  to report only.
- **Rejected on capability:** `feature-dev:code-reviewer`. Its tool list has
  `BashOutput` and `KillShell` but no `Bash`.
- **What it ran, from its execution log:** the app tests under six time zones
  (107 pass each); `npx tsc --noEmit`; `npm run format:check`, `docs:lint`,
  `check:version`, `check:mirror`, `check:dist` and `npm test` (1722 pass); six
  `pdocs view … --json` reads compared against the model's types; 66 mutations
  in a scratch copy, 62 of 64 real ones red; edge-case and daylight-saving
  probes; scans of the fixture for emails, usernames, paths and descriptions.
- **Not run:** `uv run scripts/validate-skills-dist.py`. One command that would
  have rebuilt `dist/` in the checkout was denied by the permission system.
- **Verdict:** ready to merge with fixes. All were made on the branch before
  landing: the plan records the four-part snapshot; the fixture is trimmed; the
  hidden id cache in `blockers` is gone; the feature-page test now fails when
  its rule is reverted; an advisory with no action shows its message alone; and
  a live entry wins over an archived one that shares its id.
- **Left as found:** two entries sharing a slug get the same row key. None
  exists in this repository.

---

**Related Documents:**

- [Build the work board's model and selection rules](../item.md)
