# Grapevine V1.6.7 implementation — 2026-05-28

## Context

Implemented the V1.6.7 patch scoped from the V1.6 multi-channel roundtable (see
[../proposal.md](../proposal.md), [../plan.md](../plan.md),
[../roundtable-findings.md](../roundtable-findings.md)). Built on
`feat/grapevine-v1.6.7` off `develop`, TDD-first, phase by phase with user
checkpoints.

## What Happened

Went phase by phase; the headline event was Phase 1 overturning its own premise.

- **Phase 1 — the spike that changed the plan.** The proposal called a daemon
  "connection-liveness / reaping" fix the flagship correctness bug, on the
  code-reading hypothesis that `controller.enqueue` into a dead Bun SSE stream
  doesn't throw (so `idleTimeout: 255` was the only reaper). The first TDD test
  — a real SIGKILL-then-`who` reaping test — **passed against the unmodified
  daemon** (reaped ≤ ~6s). So reaping already works; there was no reaping fix to
  make. The _real_ F1/F15 bug was presence-count semantics: `who.count` is
  `ch.subscribers.size` (raw connections) while the name list filters out
  null-alias connections, so an anonymous `watch` tab inflates `count` — that
  was the roundtable's `count:5`/4-names "ghost," almost certainly the watch tab
  itself. Fixed with explicit `connections`/`named`/`anonymous` fields. Checked
  in with the human, who accepted the reframe (skip the `idleTimeout` change;
  the half-open case stays deferred as T3-02). Corrected the proposal + plan to
  match the evidence.
- **Phase 2** — `GET /presence` (thin aggregation over loaded channels) +
  `who --all` + `doctor` count-vs-names cross-check, all consuming the Phase-1
  fields.
- **Phase 3** — `tail` on-connect `kind:"grounding"` stdout line (needed a new
  `latest_id` on the daemon `subscribed` event; gated to history-or-topic and
  first-subscribe-only via a `grounded` flag so reconnects don't re-emit);
  `: grapevine-keepalive` stderr tick off the daemon's existing 3s heartbeat;
  truncation_hint re-ordered **before** `.text`
  (`{ truncation_hint, ...payload }`) and the default threshold raised 800
  → 2000. Grounding-delivery (stdout vs stderr) was a flagged design fork — the
  human chose structured stdout so it surfaces as a notification under Wiring B.
- **Phase 4** — `send` target echo on stderr (`# → <channel> · N recipient(s)`).
- **Phase 5** — SKILL.md rewrite (banner → V1.6.7, verbs table, presence model,
  Wiring-B/`2>&1`/labeling consume guidance, `GRAPEVINE_FROM` fresh-shell
  caveat, corrected the watch "presence-free" claim) + toolbox `2.8.0 → 2.9.0`.
- **Phase 6** — live 2-agent smoke (`vintner` + `tesla`) on the real daemon
  rolled to branch 2.9.0: **5/5 green**. `tesla` raised two observations; both
  resolved (stream routing is working-as-designed — grounding is stdout-only at
  `cli.ts:499`, source-confirmed; per-connect `earlier` recompute is correct).

## Outcome

- 6 implementation commits; full suite **52/52**; live smoke **5/5**.
- Independent review (`feature-dev:code-reviewer`) on the net diff: **Ready to
  merge: Yes**, no blocking findings. All 8 new tests judged substantive
  (non-vacuous).
- Test plan Results Addendum filled (all Tier-1/Tier-2 Pass).

## Notable / Lessons

- **The spike earned its keep.** Writing the reaping test first (rather than
  implementing the presumed fix) disproved the flagship premise in one run and
  saved a needless daemon rewrite. Verify-before-implement.
- **Doc/code coherence:** the proposal was authored before close code-reading,
  so it mis-framed two items (reaping "broken"; "no liveness detection").
  Corrected both proposal and plan once the source/spike showed reality.
- **Known minor edge (not fixed):** a stale `--since N` cursor where
  `N > latest` produces a slightly misleading grounding `earlier` hint.
  Low-probability, low-impact; the reviewer rated it below threshold. Left
  as-is.

## Follow-ups

- Cached plugin stays 2.8.0 until 2.9.0 ships (release-please) + reinstall; the
  running daemon is already 2.9.0, so other sessions get the version-mismatch
  nudge in the interim.
- Deferred to V1.7 (folded into `../../grapevine-v1.7/proposal.md`): `reply`,
  `@mention`, cross-channel `announce`, persisted agent identity,
  `send --verbose` trim. Plan a fresh roundtable after 2.9.0 ships to confirm
  smooth sailing.
