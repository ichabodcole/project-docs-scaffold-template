# Tusk Board

**Status:** Draft **Created:** 2026-05-21 **Author:** Cole Reed

---

## Overview

Tusk Board is the first branded duplex agent surface built on the
`agent-surface-bun` recipe — a browser-rendered task board an AI agent can post
work into while the user (and any number of additional agents) drag, edit, add,
and remove tasks in real time. Where digestify validates the one-shot variant of
the recipe, Tusk Board validates the duplex / streaming variant and proves out
the multi-agent participation model.

The visual identity (woolly mammoth mascot, warm-brown + ice-blue palette)
exists because these surfaces are meant to feel like dedicated mini-apps, not
boilerplate scaffolds. Branding is the load-bearing signal that the
agent-surface-bun pattern is meant to support a _family_ of distinct products,
not a single template.

## Problem Statement

The agent-surface-bun recipe needs a flagship example of its duplex variant.
Without one, the recipe documents a pattern but doesn't _prove_ it.
Specifically, the recipe makes three claims that need a real surface to
validate:

1. **Duplex streaming works in practice** — not just in a contrived demo. Both
   sides edit the same state, concurrently, without races or dropped events.
2. **Multi-agent participation is possible.** Two agents in two terminals (or a
   human in a browser plus an agent in a terminal) can share one board through
   the same protocol.
3. **The pattern feels like a real product** when fully styled, not like an
   unfinished scaffold.

Tusk Board is the surface that exercises all three claims at once. It also
surfaces concrete refinements to the recipe — gotchas, protocol gaps, and
reusable patterns — that wouldn't appear without building a real instance.

## Proposed Solution

A duplex agent surface scoped to a task-board domain:

- **Three columns** — todo / doing / done, with task cards that hold title,
  status, and optional notes.
- **Both sides can mutate state** — the host agent (spawning `server.ts`) and
  any participants (browsers, plus other agents via `join.ts`) can add, edit,
  move, and delete tasks. Reorder happens via drag-and-drop in the browser;
  agents can move tasks programmatically.
- **State is broadcast** — the server is the source of truth; every change goes
  out to every connected client so the board stays in sync.
- **Branded as Tusk Board** — woolly mammoth mascot, warm-brown panels,
  mammoth-gold accents for "doing," ice-blue accents for "done" and drop
  indicators. The visual identity is the proof that these surfaces can be
  products, not templates.

**User experience:**

- _Agent says:_ "I'll spin up a tusk board for that." → browser pops open to a
  styled three-column board, seeded with tasks the agent drove from context.
- _User drags a task between columns_ → the agent sees a `task.move` event on
  its stdout in real time, can react.
- _User in a second terminal:_ "join my tusk board" → that agent runs `join.ts`,
  picks up the latest session from a temp-file discovery pointer, opens a
  WebSocket, and now has the same powers a browser has. Three actors share one
  board.
- _User clicks Submit_ → the spawning agent receives the final task list as a
  JSON line and continues the conversation with the result.

## Scope

**In Scope (MVP — already implemented in `feat/tuskboard-drag-drop` branch):**

- Three-column board (`todo` / `doing` / `done`) with click-to-edit titles,
  inline notes, status pills, and per-column add inputs.
- Drag-and-drop reorder via the new `task.move` protocol message (status +
  index). Drop indicators (blue line, column highlight) show the destination.
- Multi-agent join flow via `join.ts` + temp-file discovery
  (`tuskboard-<id>.json` / `tuskboard-latest.json` in the system temp dir).
- Tusk Board visual identity: woolly mammoth mascot slots (header + empty-state
  hero + footer watermark), warm-brown + ice-blue palette, brand-mark next to
  title, "Tusk Board" subtitle.
- `assets/` folder with a README listing required graphics (the user creates and
  drops in `mascot.webp`, `mascot-large.webp`, `favicon.png`).
- Updated SKILL.md describing both host and join flows with trigger conditions.

**Out of Scope (intentional — not in this project):**

- **Notes editor in-page.** Notes can be set via agent `task.update` but not
  edited by the user in the browser. Drag, status, and title cover ~95% of
  tuskboard interactions.
- **Multi-board / board switching.** A single host serves one board. Multi-board
  is feasible but adds complexity to discovery.
- **Persistence across host restarts.** Sessions die when the host process
  exits. Recovery is out of scope.
- **Drag-to-trash.** Delete is a button on each task; drag-to-trash is fancier
  but not needed.
- **Touch / mobile support.** Native HTML5 drag-and-drop is desktop-only by
  default. A mobile path would need a small library (Sortable.js, etc.) or a
  manual touch-event polyfill.

**Future Considerations:**

- Optional `Alpine.js` rewrite to reduce template imperative complexity (see the
  agent-surface-bun recipe's future-work note).
- A "control channel" WS endpoint that grants joining agents host-level
  authority (push toasts, reset board) — would unlock true peer-to-peer
  multi-agent. Not needed for game / collaborative-editing scenarios where one
  agent is the natural host.
- Drag-to-trash / drag-to-edit hover regions for more discoverable interactions.

## Technical Approach

Tusk Board is an _instance_ of the `agent-surface-bun` recipe (see
`plugins/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md`). That
recipe's duplex pattern is the entire architecture:

- `server.ts` — Bun + `Bun.serve` HTTP + WebSocket; stdio↔WS proxy with state
  snapshot for late-joining browsers.
- `join.ts` — symmetric stdio↔WS client; lets a second agent participate.
- `template.html` — vanilla DOM rendering of the board state. Native HTML5
  drag-and-drop, no library.

**Key dependencies:**

- Bun 1.3+ on PATH (single-runtime install — the agent-surface-bun recipe
  commits to this for portability).
- No `npm install` or `pip install` per skill. The recipe explicitly forbids
  per-skill native deps.

**New protocol additions vs. tuskboard MVP:**

- `task.move` (browser → server, server → host) — explicit status + index for
  drag-and-drop reorder. Coexists with `task.toggle` (which still works for
  click-pill UX where position doesn't matter).
- `join.ts` JSON-lines protocol — agent-side bridge for joining clients. Wraps
  incoming WS broadcasts as `{type:"event", payload:{…}}` so joiners can
  distinguish bookend events (`joined` / `disconnected`) from board updates.

**Branding mechanics:**

- Asset slots referenced by fixed paths in `template.html`.
- Server route `/assets/*` (with path-traversal guard) serves the `assets/`
  directory.
- CSS custom properties for the entire palette in `:root` so future themes can
  override without touching markup.
- Graceful degradation: missing assets show a CSS gradient fallback in the
  brand-mark and empty-state slots; the board remains functional.

## Impact & Risks

**Benefits:**

- Concrete reference implementation of the duplex agent-surface pattern —
  strengthens the recipe by giving it a non-trivial example to point at.
- Demonstrates multi-agent participation (a category Cole called out as "really
  interesting" — games, collaborative editing).
- Proves the recipe philosophy: a real branded mini-app from a ~600-line Bun
  script + ~400-line template, no build step, no framework. Sets the bar for
  future agent-surface tools.

**Risks:**

- _The drag-and-drop UX has touch-device blind spots._ HTML5 native DND doesn't
  work on mobile by default. Acceptable for a desktop-first surface but worth
  documenting.
- _Multi-agent semantics are asymmetric_ — joiners can't push toasts or patch
  arbitrary state. This is correct for the host/player model but might confuse
  agents that expect symmetry. The SKILL.md explicitly calls this out.
- _The branding work is content-dependent._ Without the actual mascot graphics,
  the surface ships with a gradient placeholder. Functional but visually
  incomplete.

**Complexity:** Medium. The recipe absorbs most of the difficulty; this
project's novelty is the drag-and-drop protocol extension, the multi-agent
discovery layer, and the brand identity. Each is small; the integration is the
work.

## Open Questions

- **Touch / mobile.** Worth investing in a touch-event polyfill, or document
  desktop-only and move on? Current answer: document, move on.
- **Whether to rename the folder/skill id to `tusk-board`.** Current decision:
  keep `tuskboard` internally, brand "Tusk Board" everywhere user-visible. Less
  refactor churn; the brand is what the user types.
- **Sharing across sessions** (e.g., a board the user can come back to
  tomorrow). Currently out of scope; future work if a use case emerges.

## Success Criteria

- Both host-only and host+joiner flows complete end-to-end without errors
  (verified by smoke tests).
- Drag-and-drop produces correct reorders across all six column-pair transitions
  (verified by the move-protocol test).
- The branded UI renders coherently with assets in place. Without assets, the
  gradient fallback is clean (no broken-image icons).
- The work informs at least one concrete refinement to the `agent-surface-bun`
  recipe (e.g., the gotchas, the `client.ts` refactor opportunity).

---

**Related Documents:**

- [agent-surface-bun recipe](../../../plugins/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md)
  — the underlying pattern.
- [tuskboard SKILL.md](../../../plugins/toolbox/skills/tuskboard/SKILL.md) —
  current invocation contract for both flows.
- [digestify recipe-sibling](../../../plugins/toolbox/skills/digestify/SKILL.md)
  — the one-shot variant that paired with Tusk Board to define the
  agent-surface-bun pattern.

---

## Notes

This project formalizes work already in flight on the `feat/tuskboard-drag-drop`
branch (2 commits ahead of develop at time of writing). The proposal documents
the as-built architecture rather than a forward plan, since the implementation
came first; the value of the project folder here is to capture the design
moodboard the user is preparing, track session notes, and document the brand
decisions in one durable place.

The user will drop:

- A **design moodboard / palette reference image** in `artifacts/moodboard.*`
  (any format) for visual reference.
- **Actual graphics** (`mascot.webp`, `mascot-large.webp`, `favicon.png`) in
  `../../../plugins/toolbox/skills/tuskboard/assets/` per that folder's README.

Once both are in, this project can be marked Approved and the branch finalized.
