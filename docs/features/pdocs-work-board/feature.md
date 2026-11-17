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

Not settled, on purpose. The
[research item](../../items/pdocs-board-landscape/item.md) decides what belongs
in the app and what stays out; the
[design item](../../items/pdocs-work-board-mockups.md) turns that into mockups
in a few variations, lighter and more robust, to pick a direction from.

Ideas on the table, none committed:

- A dashboard of what is in `triage`, what is `active`, and what is waiting.
- A Kanban view of a cycle, including one an agent has proposed and that is
  still `planned`, where the items to bring in are chosen.
- Some interaction, not read-only: the board can change state, within limits the
  research sets.

## Scope

**In scope:** the research, the mockups, and after a direction is chosen, the
skill and the application.

**Out of scope:** editing a document's prose. Scriptorium does that, and the
board hands off to it.

## Open Questions

- Where the app lives: in this repository beside `pdocs`, or in Spellbook with
  the other surfaces.
- Which writes the board may make, and whether every one goes through `pdocs`.
- Whether a lighter version is worth shipping before a robust one.
