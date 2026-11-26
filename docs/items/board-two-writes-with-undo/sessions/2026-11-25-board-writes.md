---
type: session
title: The board's two writes, with Undo — 2026-11-25
description:
  Added the triage decision and cycle membership writes with their Undo bar,
  then closed four ways the page could write what the user did not intend.
tags: [work-board, ui]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-25 }
---

# The board's two writes, with Undo — 2026-11-25

Part of [The work board](../../../cycles/2026-11-work-board.md).

## Context

Phase 5 of the [work board plan](../../../features/pdocs-work-board/plan.md):
the only two writes the board makes to a project's documents, a triage decision
and cycle membership, each one `pdocs set` call, with Undo.

## What Happened

- **Triage form** in the inspector: accept to `ready` or `backlog`, or drop,
  with optional priority, parent feature and "Content reviewed". Applying
  removes the item from the queue, moves the highlight to the next waiting item,
  and lists the item under "Decided". A drop's reason is never sent: the bar
  shows it as a line for the agent to record.
- **Membership:** "Bring in" on a Candidates row and the `b` key; "Take out of
  its cycle" in the inspector and the `t` key. A brought-in item appears under
  "Added just now".
- **The write bar** shows the command that ran, with Undo. The page applies no
  change before the server answers; after the answer it polls, then draws the
  bar and the board together.
- **Below 640px of centre width, a one-line row folds its details under the
  title.** At 1024px with the inspector open, a Triage title shows at least 36
  characters and a Candidates title 38. Rows at 1440px are unchanged.

All write testing ran on temporary copies of this repository's docs. After
accept then Undo, drop then Undo, and bring in then take out, `diff -r` against
an untouched copy printed nothing. The skill's tests number 365.

Screenshots are in [artifacts/screenshots](../artifacts/screenshots/). All but
`12-bar-wrap-1440.webp` were taken before the review fixes below, so the bar in
them does not wrap and the inspector's button does not name the cycle.

## Notable Discoveries

The review found four ways the page could write what the user did not intend.
All four are closed.

- **A held `t` or `b` wrote item after item.** Holding `t` with the inspector
  open took four successive items out of the active cycle, and only the last
  could be undone. Key repeat is now ignored for both keys.
- **"Content reviewed" stayed ticked per item for the life of the page.** After
  tick, Apply, Undo, a later plain Apply sent `reviewed` again. The tick now
  clears every time the inspector comes to an item, and the whole form is
  dropped after a decision and after its Undo.
- **`b` on another page wrote into a cycle nothing on screen named**, the one
  last chosen on the Cycle page. Outside the Cycle page `b` needs the inspector
  open, and the inspector's button names the cycle by its title.
- **A second click half a second after a write landed on the next item's
  controls.** Every control stays disabled for 600 ms after the redraw.

Also from the review:

- **The server accepted a membership write for a `triage` item** when the page
  was stale. It now checks a fresh snapshot and answers 409 unless the item is
  `backlog` or `ready` with no cycle and the cycle is planned or active. The
  plan records it.
- **A refused write and the Scriptorium line each discarded a pending Undo.**
  The Scriptorium line has its own row, and a refusal keeps the earlier write's
  Undo as "Undo previous write". A write that runs still replaces it: there is
  one slot, as in the prototype.
- **The bar cut off the flags.** The command wraps to two lines and, when it
  must be cut, loses the middle of the item ref, never a flag. At 1024px with
  the inspector open the longest accept command still loses the end of its
  second line; the tooltip and a copy carry all of it.
- **A tab left open across a restart** holds the old token. It now says "This
  page's session ended. Open the board again with the `open` command."

## Review

- **Roster:** read from the agent types this session can dispatch.
- **Chosen:** `general-purpose` (tools `*`, so it has shell access and the
  browser tools), briefed to make the page write something unintended, to write
  only to scratch copies, and to report only.
- **Rejected on capability:** `feature-dev:code-reviewer`. Its tool list has
  `BashOutput` and `KillShell` but no `Bash`.
- **What it ran, from its execution log:** the board started three times inside
  a scratch copy; in a browser at 1440 by 900, 1024 by 768 and 800 to 1280 wide,
  the definition-of-done sequence with `diff -r` after each pair, held and
  repeated keys, timed double clicks, form state across items, a stale snapshot
  by interception, intercepted 500, abort and slow writes, and a second tab;
  request bodies captured for every write; `spawn` lines counted against writes
  on two of the three servers; `npx tsc --noEmit`; the skill's tests twice (332
  pass); 23 mutations of write rules (22 red, one equivalent).
- **Not run by the reviewer:** `npm run check`, the dist build, and a 409 on
  Undo after a restart, which a real page cannot produce.
- **Verdict:** ready to merge with fixes. The four above were blocking and are
  fixed, with the server check, the kept Undo, the bar and the 401 message. The
  fixes were not reviewed a second time; the implementer re-ran each
  reproduction in a browser on a scratch copy, and the commit gate passed
  (2002).

## Follow-up

- Upper-case `B` and `T` do nothing, so the keys are dead under Caps Lock.
- Reaching the form by Tab from a row passes every remaining row first.
- The browser logs its own console error for each refused write.
- At 800 and 900px wide with the inspector open, titles show 4 to 19 characters.

---

**Related Documents:**

- [Add the work board's two writes, with Undo](../item.md)
