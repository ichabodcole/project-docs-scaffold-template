# Grapevine V1.6.7 Implementation Plan

**Created:** 2026-05-28 **Related Proposal:** [proposal.md](./proposal.md)
**Status:** Draft

---

## Overview

This plan implements the V1.6.7 scope derived from the
[multi-channel roundtable](./roundtable-findings.md): a flagship
connection-liveness correctness fix plus a cluster of small CLI/daemon/doc
sharpenings. All work is in `plugins/toolbox/skills/grapevine/scripts/`
(`daemon.ts`, `cli.ts`, `cli.test.ts`) and `SKILL.md`.

**Important grounding correction discovered while reading the source** — the
proposal was written before close code-reading and slightly mis-framed two
items:

1. **Reaping already works — disproven by a TDD spike (2026-05-28).** A
   heartbeat already exists (`daemon.ts:586-596`, 3s, `: hb <ts>` with a
   `catch`→`cleanup()`). The original hypothesis was that `controller.enqueue`
   into a dead Bun stream doesn't throw, leaving `idleTimeout: 255` as the only
   reaper. **The spike proved otherwise:** a SIGKILL'd consumer is reaped from
   `who` within ~6s on the unmodified daemon (test:
   `"a hard-killed tail is reaped from who within a few seconds"`). So there is
   **no reaping fix to make** for the common case; `idleTimeout` stays 255 and
   the narrow half-open/hung-socket case is the deferred T3-02 scenario. The
   roundtable's persistent `count:5`/4-names "ghost" was almost certainly the
   anonymous `watch` tab (see #2), not an un-reaped tail.
2. **`count` diverges from names by construction — this was the real bug.** The
   `/subscribers` handler returned `count: ch.subscribers.size` (raw
   connections) while the `subscribers` array came from `subscriberAliases()`,
   which **skips null-alias connections** (`daemon.ts:246`). An anonymous
   `watch` tab connects to `/tail` with no `as=` param and registers as a
   null-alias subscriber (`daemon.ts:575-576`), inflating `count` but not the
   name list. **Fixed:** `/subscribers` now returns
   `connections`/`named`/`anonymous` (`named + anonymous === connections`), so
   the divergence is always explainable.

The plan reflects the real code and the spike's findings, not the proposal's
pre-reading framing.

## Outcome & Success Criteria

**Definition of Done:**

- [ ] A killed push consumer (SIGKILL on a `tail` process) disappears from `who`
      within a few seconds — not minutes. Verified by a kill-then-`who` test.
- [ ] `who`/`doctor` never report a `count` higher than the true unique-agent
      count without explaining the difference (anonymous watchers and duplicate
      connections are accounted for, not silently summed).
- [ ] `doctor`'s `active_subscribers` reflects reality and flags any
      count-vs-names divergence.
- [ ] A fresh `tail` subscriber receives, **on its own stdout**, the topic and a
      backfill hint (`joined … at id N — M earlier messages exist`).
- [ ] A long message's `truncation_hint` survives notification clipping (emitted
      **before** `.text`), and the default threshold is raised.
- [ ] `send` confirms its target channel + recipient count visibly.
- [ ] `who --all` returns names × channel in one call.
- [ ] SKILL.md prescribes Wiring B, `2>&1`, per-Monitor labeling, and
      per-command identity; the `GRAPEVINE_FROM` limitation is documented.
- [ ] `cli.test.ts` covers all CLI-observable changes; full suite green.
- [ ] toolbox plugin version bumped 2.8.0 → 2.9.0.

**Non-Goals:**

- `reply <msg-id>`, `@mention`, cross-channel broadcast, persisted agent
  identity, `send --verbose` trim — all deferred to V1.7.
- Any change to the JSONL message contract or the channel-name grammar.
- A watch-UI liveness pulse beyond a minimal hook (low priority; can trail).

## Approach Summary

Sequence by risk and dependency. The **daemon liveness fix (Phase 1)** is the
one medium-effort, spike-shaped item — it gates the presence-observability work
(Phase 2) because both `who --all` and `doctor`'s cross-check need a daemon
endpoint that exposes per-channel aliases. The **CLI consume-path changes
(Phase 3)** are independent and TDD-friendly against `cli.test.ts`. The
**send-echo (Phase 4)** and **docs + version bump (Phase 5)** are small and land
last.

Current → target, by file:

- `daemon.ts` — fix reap detection in the `/tail` handler; add a presence
  endpoint exposing aliases per channel; optionally expose a `latest_id` on the
  `subscribed` SSE event for the backfill hint.
- `cli.ts` — `cmdTail` on-connect grounding line + keepalive sentinel +
  truncation re-order/threshold; `cmdSend` target echo; new `cmdWhoAll`;
  `cmdDoctor` count-vs-names cross-check.
- `cli.test.ts` — new/updated coverage.
- `SKILL.md` — recipe and convenience doc updates.

## Phases

### Phase 1: Honest presence counts (DONE) — reaping verified, not rewritten

**Goal:** `count` over the name list is always explainable; confirm (don't
rewrite) that dead connections are reaped promptly.

**Spike outcome (2026-05-28):** Reaping was the presumed flagship bug; the spike
disproved it. A SIGKILL'd consumer reaps within ~6s on the unmodified daemon, so
the `/tail` handler, the 3s heartbeat, and `idleTimeout: 255` are left
unchanged. The real, test-confirmed bug was count semantics.

**Key Changes (implemented):**

- `daemon.ts` `/subscribers` handler: added `connections` (raw `size`), `named`
  (alias-bearing connections), `anonymous` (null-alias, e.g. watch tabs), with
  `named + anonymous === connections`. `count` stays `=== connections` for
  back-compat. `cmdWho` passes the new fields through unchanged
  (`printJson({ ok: true, ...data })`). This is the data `doctor` and
  `who --all` consume in Phase 2.
- Watch-tab question resolved (a): anonymous watchers are honestly accounted in
  `anonymous`/`connections`, not special-cased out. SKILL.md's "watching is
  presence-free" claim gets corrected in Phase 5.
- **Not done (by decision):** no `idleTimeout` change, no abort-signal rewrite —
  reaping works for the common case; the half-open/hung-socket reap is the
  deferred T3-02 scenario.

**Validation:**

- [x] `"a hard-killed tail is reaped from who within a few seconds"` — passes
      against the unmodified daemon (regression guard that reaping works).
- [x] `"who distinguishes named subscribers from anonymous connections"` — RED
      first (`named` undefined), then GREEN after the count-field change.
- [x] Full suite green (47/47), `count` back-compat intact.

**Dependencies:** none. This is the foundation.

---

### Phase 2: Presence observability — `who --all` + `doctor` cross-check

**Goal:** Give the human one-shot cross-channel presence, and make `doctor`'s
restart-safety number trustworthy.

**Key Changes:**

- `daemon.ts`: add a presence-aggregation endpoint, e.g. `GET /presence` →
  `{ channels: [{ name, named: [...], anonymous: N, connections: N }] }`,
  reusing `subscriberAliases()` + the Phase-1 counts over all loaded channels.
  Thin map over `channels`.
- `cli.ts`: new `cmdWhoAll()` + `who --all` routing (`main()` `who` case
  `:809-811`, `parseFlags` already supports `--all` as a boolean — add to
  `BOOLEAN_FLAGS` `:711-718`). Render names × channel in one shot.
- `cli.ts` `cmdDoctor()` (`:568-699`): consume `/presence`; when a channel's
  `connections` > `named` + `anonymous`-explained, add a hint
  (`"<chan>: N connections but M named agents — possible ghost; see who --all"`).
  Make `active_subscribers` report named-vs-connection counts, not just the raw
  sum (`:594-597`).

**Validation:**

- [x] `who --all` lists every channel with its agents in a single call (test:
      `"who --all returns subscribers across all channels in one call"`).
- [x] A still-connected anonymous watch tab makes `doctor` flag the divergence
      (`connections` > `named`) instead of silently inflating the total (test:
      `"doctor reports named/anonymous breakdown and flags count-vs-names divergence"`).
- [x] Constraint honored: `who --all` is a thin aggregation over a new read-only
      `GET /presence` endpoint (in-memory map of loaded channels) — no new
      bookkeeping, so it stayed in V1.6.7.

**Status:** DONE. Full suite 49/49.

**Dependencies:** Phase 1 (the presence fields + endpoint shape).

---

### Phase 3: `tail` consume-path — grounding, keepalive, truncation

**Goal:** A push consumer lands grounded, can tell idle from dead, and actually
receives truncation hints.

**Key Changes (TDD against `cli.test.ts`):**

- **On-connect grounding + backfill (F3, F7).** Today `cmdTail` writes
  `# subscribed` / `# topic` to **stderr** (`cli.ts:436-441`) — invisible to
  stdout-grepping consumers. Emit instead a structured **stdout** line the JSONL
  reader can parse and skip, e.g.
  `{"kind":"grounding","channel":N,"joined_at":H,"earlier":M,"topic":...,"hint":"--from-start or --since <id> to backfill"}`.
  Requires the daemon's `subscribed` event (`daemon.ts:569`) to carry the
  channel's latest id (`next_id - 1`) so `cmdTail` can compute
  `M = latest - highestSeen`. Default-on.
- **Keepalive sentinel (F6).** The daemon already sends `: hb <ts>` comments;
  `cmdTail` currently drops all `:` lines (`cli.ts:428`). On seeing a heartbeat
  comment, optionally emit a recognizable token to **stderr**
  (`: grapevine-keepalive`) so `2>&1` consumers get a liveness tick. Keep it off
  stdout (don't pollute JSONL).
- **Truncation re-order + threshold (F17).** `cli.ts:454-459` adds
  `payload.truncation_hint` to the already-parsed object → it serializes
  **after** `.text` and gets eaten by notification clipping. Fix: serialize with
  the hint **first**, e.g.
  `process.stdout.write(JSON.stringify({ truncation_hint, ...payload }) + "\n")`.
  Raise `TRUNCATION_HINT_THRESHOLD` default (`cli.ts:106-109`) from `800` to
  ~`2000` (env override stays). No per-channel override.

**Validation:**

- [ ] Test: a `tail` with `--since` below the latest id emits a
      `kind:"grounding"` stdout line reporting the correct `earlier` count and
      topic.
- [ ] Test: a message > threshold serializes with `truncation_hint` as the first
      key (assert on key order / substring position before `"text"`).
- [ ] Test: threshold default is ~2000 (short roundtable-style status messages
      no longer trip it; multi-paragraph ones do).
- [ ] Manual: `2>&1` consumer sees periodic `: grapevine-keepalive`; a clean
      `tail` (stdout only) sees none.

**Dependencies:** Phase 1 only if the grounding line reuses the
`subscribed`-event `latest_id` addition (small, can be done alongside P1).

---

### Phase 4: `send` target echo (F9 detection half)

**Goal:** A misrouted reply is caught the instant it happens.

**Key Changes:**

- `cli.ts` `cmdSend()` (`:228-263`): after a successful send, write a
  human-visible confirmation to **stderr** (keeping stdout JSON intact), e.g.
  `# → ${data.channel} · ${recipients} recipient(s)`. The data already exists in
  the response (`channel`, `recipients`); this just surfaces it.

**Validation:**

- [ ] Test: `send` to a channel emits the `# → <channel> · N recipient(s)`
      stderr line; stdout JSON shape unchanged (back-compat).

**Dependencies:** none.

---

### Phase 5: Docs + version bump

**Goal:** Formalize the operator-discipline fixes and ship.

**Key Changes:**

- `SKILL.md`:
  - Prescribe **Wiring B** (Monitor command _is_
    `bun cli.ts tail … --as <alias>`, one process) as the default push pattern;
    show the `2>&1` fold for stderr liveness; recommend labeling each Monitor
    with its channel and rendering `channel` first (F2, F6, F8, F10).
  - Document that **`GRAPEVINE_FROM` is a human-terminal convenience** — agents
    spawn a fresh shell per call, so pass `--as`/`--from` on every verb (F16).
  - Update the **"watching is presence-free"** claim to match the Phase-1
    decision on anonymous watch-tab accounting.
  - Note the new `who --all`, the grounding line, the keepalive sentinel, and
    the raised truncation threshold in the verbs table / banner (bump banner to
    V1.6.7).
- `plugins/toolbox/.claude-plugin/plugin.json`: `2.8.0` → `2.9.0`.

**Validation:**

- [ ] `bun test` green for the full `cli.test.ts` suite.
- [ ] SKILL.md banner + verbs table reflect V1.6.7; prettier clean.
- [ ] `info`/`doctor` report version `2.9.0` after a daemon roll.

**Dependencies:** Phases 1–4 (docs describe shipped behavior).

## Key Risks & Mitigations

- **Reap mechanism doesn't fully cover abrupt half-open sockets** → A
  `kill -9`'d consumer may leave a socket that neither aborts nor fails a write
  until TCP/idle timeout. Mitigation: combine abort-signal wiring with a
  tightened `idleTimeout` backstop; make the kill-then-`who` test the gate, and
  accept "within ~5s" not "instant."
- **Lowering `idleTimeout` false-reaps slow-but-alive links** → The 3s heartbeat
  should keep legit connections alive well inside any 30–45s timeout; verify
  with a deliberately-idle (no traffic) tail held open past the timeout.
- **Grounding line on stdout breaks naive parsers** → It's a `kind:"grounding"`
  JSON object, parseable and skippable like the existing `kind:"topic"` /
  `kind:"message"`; document it. Consumers filtering on `kind:"message"` ignore
  it for free.
- **`truncation_hint` key-order fix is a behavior change** → JSON is unordered
  by spec, but the existing truncation test asserts on the hint; update that
  test (`cli.test.ts`) to assert hint-before-text.
- **`who --all` scope creep** → If it needs more than a thin aggregation, bump
  to V1.7 rather than growing the daemon.

## Testing & Validation Strategy

- **Unit/CLI (TDD):** `cli.test.ts` already spins up a daemon against a temp
  `GRAPEVINE_HOME`; extend that harness. Write failing tests first for:
  grounding line, truncation re-order + threshold, send echo, `who --all` shape,
  doctor cross-check hint.
- **Liveness (integration):** a kill-then-`who` test — spawn a real `tail`
  subprocess, confirm presence, `kill -9`, poll `who` until the alias drops,
  assert ≤ ~5s. This is the flagship gate and won't be a pure unit test.
- **Manual smoke:** a 2-terminal Wiring-B session — confirm grounding on join,
  keepalive ticks under `2>&1`, send echo, and `who --all` across two channels.
- **Post-ship:** a fresh multi-agent roundtable (the proposal's success
  criterion) to confirm the F-IDs are resolved before opening V1.7.

## Assumptions & Constraints

**Assumptions:**

- Bun ≥ 1.3.13 (the V1.6.5 prerequisite) — abort-signal and stream semantics
  behave as documented.
- The `cli.test.ts` temp-HOME harness can spawn and kill real subprocesses for
  the liveness test.

**Constraints:**

- No JSONL contract change; new stdout lines are additive `kind`s.
- `who --all` stays a thin aggregation or it bumps to V1.7.
- One daemon per `$HOME`; changes must not break cross-version cache-pinning
  detection (`/` version advertising, `cli.ts:55-81`).

## Open Questions

- **Exact reap mechanism + timeout values** — resolve in the Phase-1 spike via
  the kill-then-`who` test (abort-signal vs. lowered `idleTimeout` vs. both).
- **Anonymous watch-tab accounting** — surface in `connections`/`anonymous`
  (recommended) vs. exclude at the daemon. Decide in Phase 1; it changes a
  SKILL.md claim.
- **Grounding-line delivery** — structured stdout `kind:"grounding"`
  (recommended, reaches the agent) vs. keeping it on stderr (lost to Wiring-A).
  Confirm the stdout choice doesn't surprise existing consumers.
- **Keepalive sentinel default** — always-on stderr tick vs. behind a
  `--liveness` flag. Lean always-on (it's stderr-only, cheap to ignore).

---

**Related Documents:**

- [Proposal](./proposal.md)
- [Roundtable findings](./roundtable-findings.md)
- [V1.7 proposal](../grapevine-v1.7/proposal.md) — deferred primitives
- [Sessions](./sessions/) (created during implementation)
