---
type: session
title: The board's shell and five pages — 2026-11-24
description:
  Built the work board's read-only UI as layout D over live data, and recorded
  how it behaves with a 40-item cycle and at 1024px wide.
tags: [work-board, ui]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-24 }
---

# The board's shell and five pages — 2026-11-24

Part of [The work board](../../../cycles/2026-11-work-board.md).

## Context

Phase 4 of the [work board plan](../../../features/pdocs-work-board/plan.md):
layout D from the
[layouts prototype](../../pdocs-work-board-mockups/artifacts/work-board-layouts.html)
over live data, read-only.

## What Happened

`app/index.html`, `app/board.ts`, `app/client.ts`, `app/styles.css` and a
vendored Alpine 3.17.5 under `plugins/project-docs/skills/work-board/`, served
through Bun's HTML import with no build step. `client.ts` holds everything that
is not drawing, as pure functions with tests; `board.ts` is the Alpine glue. The
skill's tests number 297.

- **Pages:** Now, Inbox, Triage, Cycle (both tabs) and Feature, on this
  repository's data. Band, row, tab and inspector sizes measure the same as the
  prototype's at 1440 by 900.
- **No request leaves `127.0.0.1`.** The prototype loaded Tailwind, Lucide and
  Alpine from CDNs; the app has hand-written CSS, inline icons and the vendored
  Alpine.
- **No write controls are drawn.** The triage form, "Bring in" and "Take out"
  come with Phase 5. Until then the candidate meta column sits about 86px
  further right than the prototype's.
- **Snooze works now**, as view state in `localStorage`.
- **The per-page reads are not used.** The snapshot already carries what the
  Cycle and Feature pages draw.

Screenshots are in [artifacts/screenshots](../artifacts/screenshots/).

## The two recorded checks

**A cycle of 40 items.** Nothing breaks: no horizontal scroll, no clipped text,
and the stepped row stays in view. The list is one long scroller, about 2000px
with `done` folded. Group headings scroll away with their rows, so mid-list
nothing says which state the rows are in, and the folded `done` line is about
two and a half screens down.

**A window 1024px wide.** With the inspector closed the centre is 832px and
every page reads well. With it open the inspector takes its 400px minimum and
the centre drops to 432px. One-line rows then lose their titles: Candidates
titles get 117px beside a fixed 240px meta column, and Triage titles 112px
beside fixed kind and date columns, about 15 characters each. Two-line rows on
Cycle, Feature and Now stay readable. Phase 5 puts the triage decision in the
inspector beside that list, so its item carries this.

## Notable Discoveries

- **Bun's HTML route cannot carry headers or checks.** It answers any method and
  any Host. The board's listener therefore has no routes: it serves `/api/*`
  itself and fetches the page and its chunks from a second listener on
  `127.0.0.1` that holds only the HTML import. The second listener serves the
  app's code to any local caller, with no project data and no token.
- **A random port lost every snooze on restart**, because browser storage is per
  origin. The server now prefers a port derived from the project's path and
  falls back to a free one. This repository gets 59441.
- **The token is kept in `sessionStorage`** so a reload works after it is
  stripped from the address bar. A tab left open across a restart holds the old
  token and shows "not updating" until the new URL is opened.
- **The poll pauses while the tab is hidden.** A poll counts as activity, so a
  visible tab keeps the server alive, as the plan words it.
- **Advisory rows needed short labels.** The CLI's sentence as a label was the
  one place the page was heavier than layout D. Known advisory ids now have a
  label, with the sentence as the description.

## Review

- **Roster:** read from the agent types this session can dispatch.
- **Chosen:** `general-purpose` (tools `*`, so it has shell access and the
  browser tools), briefed against Phase 4, the item, the feature's shell rules
  and the prototype, and told to report only.
- **Rejected on capability:** `feature-dev:code-reviewer`. Its tool list has
  `BashOutput` and `KillShell` but no `Bash`.
- **What it ran, from its execution log:** `npx tsc --noEmit`; the skill's tests
  twice (281 pass); 23 mutations of `client.ts` in a scratch copy (22 red); the
  board on this repository twice and on a copy of the 40-item fixture with an
  item holding `<img onerror>`, `<script>` and `{{ }}`; `curl` for response
  headers; and in a browser, the prototype's seven D states beside the app at
  1440 by 900 and 1024 by 768, with keyboard, tab order, contrast, snooze,
  intercepted 409 and 500 answers, and a restart. It changed one item's priority
  with `pdocs set` and set it back; the file was byte-identical.
- **Not run by the reviewer:** `npm run check`, the dist build, and a 30-minute
  wait for the idle exit.
- **Verdict:** ready to merge with fixes, none blocking. Fixed on the branch
  before landing: the advisory labels; the inspector staying open over a "CLI
  too old" message; focus lost when a poll reorders the highlighted row; the
  stable port; response headers and Host and method checks on the page; the
  health read retried; glue rules moved into tested functions; the poll paused
  on a hidden tab; and basic accessibility attributes. The fixes were not
  reviewed a second time; the implementer re-checked them in a browser and the
  commit gate passed (1934).

## Follow-up

- Sticky group headings for a long cycle.
- `j` and `k` do not step the Features list.
- The Cycle page has no `h1`; its title is a button.
- When the highlighted item leaves the list on a poll, the inspector shows the
  row that takes its place, which reads oddly when an agent finishes the item
  being read. It is the rule the plan chose.
- `askBeforeArchive` is not used to mark a held item on the Feature page.

---

**Related Documents:**

- [Build the work board's shell and five pages, read-only](../item.md)
