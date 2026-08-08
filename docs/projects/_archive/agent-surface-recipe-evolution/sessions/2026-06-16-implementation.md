# Recipe Evolution — Implementation — 2026-06-16

## Context

Implemented the [plan](../plan.md) in one pass: rewrote
`plugins/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md`'s duplex
half into the standing daemon + thin-CLI pattern from issue #145, keeping the
one-shot half intact. Branch `feat/agent-surface-recipe-evolution` (the same
branch carrying the proposal + plan).

## What Happened

A single-file documentation rewrite, executed against the plan's five phases but
committed as one cohesive change (the phases are sections of one file, not
independent units):

- **Reframe (Phase 1):** Purpose now introduces two shapes — **one-shot** and
  **standing** (neutral names, no spellbook "cantrip/conjuration"). Added a
  "Which shape when" decision table in _When to Use_, with a rule of thumb
  (start one-shot; go standing the moment you want to re-open the same surface).
- **Standing contract (Phase 2):** new Architecture sub-section with a redrawn
  diagram (agent→daemon over HTTP, browser→daemon over WS, daemon launched
  detached). Documented all four contract surfaces: `POST /cmd` (+`--stdin`),
  `GET /state[?lean=1]`, `GET /events?since=` (monotonic cursor + resume +
  wake-set), and WS full-state broadcast. Positioned stdio JSON-lines as the
  prior generation rather than deleting it.
- **Gotchas + substrate (Phase 3):** the load-bearing correction —
  `node:child_process` `spawn(detached:true)+unref()` for the daemon, with the
  explicit reason `Bun.spawn` can't express a standing surface. Both
  `/events`-frame gotchas added with before/after fragments. Kept the existing
  Bun gotchas (FileSink, server.stop stall, submit/teardown race, EPIPE, test
  filename) — still valid, mostly for the one-shot path.
- **Ladder + repoint (Phase 4):** anti-flood stdout/stderr discipline as a
  reusable pattern citing grapevine #140; surface-tech ladder (vanilla →
  Alpine-CDN → React via Bun HTML-import) that **links** to Bun docs + cites
  imago rather than reproducing docs. Reference Implementations repointed to
  imago (richest standing) + grapevine (cleanest CLI) + bounty (worked board) +
  digestify (one-shot); persistence claim split one-shot-ephemeral vs.
  standing-durable.
- **Gate (Phase 5):** recipes `2.1.1 → 2.2.0`, dist rebuilt and **byte-matches**
  source, format clean.

## Notable Discoveries

- **The two open questions resolved themselves naturally during the write.**
  Anti-flood discipline read best as its own _Patterns Worth Reusing_ subsection
  (not folded into the gotchas), and I kept a brief prior-generation stdio
  pointer rather than dropping it — both the leanings recorded in the plan.
- **Anchor link to a heading with backticks/colons.** The "Why Bun" bullet links
  to the substrate gotcha whose heading contains `` `node:child_process` `` and
  `` `Bun.spawn` ``. GitHub slugifies that to
  `#standing-daemons-launch-with-nodechild_process-not-bunspawn` (punctuation
  dropped, underscore kept) — verified by hand.
- **Verification gates all green:** grep confirmed zero `cantrip`/`conjuration`,
  zero hardcoded spellbook paths, and every surviving `Bun.spawn` mention scoped
  to the one-shot path or the correction itself (none framing it as the standing
  contract).

## Changes Made

- `plugins/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md` — the
  rewrite (commit `63785d1`).
- `plugins/recipes/.claude-plugin/plugin.json` — `2.1.1 → 2.2.0`.
- `dist/recipes/...` — regenerated mirror.

## Follow-up

- Issue #145 is addressed; the implementation commit closes it. Confirm/close on
  GitHub after merge.
- Future: if the daemon + thin-CLI pattern outgrows being one section, split it
  into a standalone recipe (noted in the proposal's Future Considerations).

---

**Related Documents:**

- [Plan](../plan.md) · [Proposal](../proposal.md)
- Commit `63785d1` — the recipe rewrite
- Issue #145 — the authored spec
