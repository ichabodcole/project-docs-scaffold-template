---
type: item
title: Mock up the work board in a few variations
description:
  HTML mockups of the project-docs work board, from a light version to a robust
  one, to choose a direction from.
status: stable
lifecycle: done
id: 01a1eacc-032e-7392-8de3-ac699207237b
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-17 }
blocked_by: [01a0e970-e72d-70d2-b506-ae4899a7d04e]
parent: feature/pdocs-work-board
from: 01a0e970-e72d-70d2-b506-ae4899a7d04e
---

# Mock up the work board in a few variations

Take what the [board research](../pdocs-board-landscape/item.md) recommends and
make it visible: interactive HTML mockups of the work board in a few variations,
so a direction can be chosen by looking, not by reading.

The variations should differ in how much they include, not only in styling: a
light version, a robust version, and what each leaves out. Candidate views, to
be confirmed by the research: what is in triage, what is active, and a Kanban of
a cycle where an agent has proposed a `planned` cycle and the items to bring in
are chosen.

## Definition of done

- [x] At least a light and a robust variation exist as self-contained HTML
      mockups, built on real data from this repository's own docs tree.
- [x] Each variation says what it includes, what it leaves out, and which
      `pdocs` reads and writes it would need.
- [x] Cole has looked at them and picked a direction, or said what to change.

## Direction chosen

Chosen 2026-11-19: layout D ("D — Combined") in
[work-board-layouts.html](artifacts/work-board-layouts.html), at the "In
between" capability level. Its "About this layout" state lists the shell rules.

- Three regions at most: nav, one centre column, and an inspector that opens on
  selection and pushes the centre narrower. Nothing overlays the work.
- A cycle or feature is a page: a short pinned header, then one grouped list.
  Its secondary lists are tabs ("In this cycle", "Candidates"). No Kanban.
- Items open in the inspector, which carries every write for the selected item.
  Triage's decision form is the inspector's content for a triage item.
- Attention is the Inbox page in the nav, split into "Needs a decision" and
  "Housekeeping". Only the first feeds the nav's one count.

[work-board-mockup.html](artifacts/work-board-mockup.html) is the earlier
three-version mockup (lighter, in between, robust). It still records what each
capability level includes and which `pdocs` reads and writes it needs. Layouts
A, B and C in the layouts file are the alternatives D was combined from.

Not mocked up in D: the robust version's "Plan next cycle" page, a cycle of more
than 11 items, and widths under 1280px.
