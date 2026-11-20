---
type: feature
title: pdocs work board
description:
  A live dashboard an agent opens to show where project-docs work stands, what
  needs triage and what is active, with a skill and a small app behind it.
tags: [pdocs, work-board]
status: draft
lifecycle: backlog
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# pdocs work board

## Overview

Project-docs now has a settled set of document types and states, and
`pdocs view` already derives boards and backlogs from them as text. This feature
is a visual surface over the same data: a dashboard an agent opens, in the style
of the Spellbook applications, that shows what needs triage, what is being
worked on, and where each feature and cycle stands.

It is a skill plus a small application. It is not a document editor.

## Problem Statement

Seeing the state of the work means running `pdocs view` and reading rows of
text, or asking an agent to summarize them. Decisions that are visual by nature
(what to pull into a cycle, which triage items belong together, what a feature
still has open) are made from a list.

## Proposed Solution

The [research item](../../items/pdocs-board-landscape/item.md) settled what
belongs in the app and what stays out. The
[design item](../../items/pdocs-work-board-mockups/item.md) mocked it up, and
its layout D at the "in between" capability level is the chosen direction.

**What the board does.** It reads through the existing `pdocs view` and
`pdocs find` commands and re-reads on a poll. It makes two kinds of write, each
one `pdocs set` call: a triage decision (accept to `backlog` or `ready`, or
drop, with priority and parent), and cycle membership (bring an item in, take it
out). Every other change is asked of the agent.

**The shell.** Every page follows the same rules:

- Three regions at most: the nav, one centre column, and an inspector that opens
  when an item is selected and pushes the centre narrower. Nothing overlays the
  work.
- A cycle or a feature is a page: a short pinned header, then one list grouped
  by state, with done folded. Its secondary lists are tabs ("In this cycle",
  "Candidates"). There is no Kanban.
- An item opens in the inspector, which carries every write for it. A triage
  item's decision form is the inspector's content.
- What needs attention is the Inbox page, split into "Needs a decision" and
  "Housekeeping". Only the first feeds the nav's one count. A row can be
  snoozed; snooze is view state and writes nothing to the docs.

**The pages.** Now (the active cycle and what is started), Inbox, Triage, Cycle
and Feature.

## Scope

**In scope:** the research and the mockups (both done), then the skill and the
application at the in-between capability level.

**Out of scope:**

- Editing a document's prose. Scriptorium does that, and the board hands off to
  it.
- The robust version: changing an item's state or priority from the board, and
  the "Plan next cycle" page where an agent's proposed cycle is accepted item by
  item. Both are mocked up in the design item and can follow.

## Open Questions

- Where the app lives: in this repository beside `pdocs`, or in Spellbook with
  the other surfaces.
- Where the robust version's "Plan next cycle" checklist sits in this shell. D
  does not mock it up.
- How the shell holds up with a cycle of more than 11 items, and at widths under
  1280px. Neither was tested in the mockup.
