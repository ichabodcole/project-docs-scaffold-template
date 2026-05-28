# Test Plan: Grapevine V1.6.7

**Status:** Draft\
**Created:** 2026-05-28\
**Related Plan:** [Development Plan](./plan.md)\
**Related Proposal:** [Proposal](./proposal.md)

---

## Overview

Verifies the V1.6.7 scope: the flagship connection-liveness/reaping fix and the
cluster of CLI/daemon paper-cut fixes (honest presence counts, `who --all`,
`doctor` cross-check, `tail` grounding line, keepalive sentinel, truncation-hint
re-order, `send` target echo). Scope is the **agent-facing CLI/daemon
behavior**; the watch-UI liveness pulse is explicitly deferred (Tier 3 /
non-goal). The single most important scenario is **T2-01 (kill-then-`who`
reaping)** — it is the correctness gate the whole release turns on, and it is an
integration test, not a unit test.

Verification runs against the existing `cli.test.ts` harness (temp
`GRAPEVINE_HOME`, real daemon spawn) plus a small number of manual/integration
checks for the liveness and stderr-stream behaviors that unit tests can't
cleanly assert.

## Test Environment

**Prerequisites:**

- Run from `plugins/toolbox/skills/grapevine/scripts/`.
- Test suite: `bun test cli.test.ts` (spawns a daemon against a temp
  `GRAPEVINE_HOME` per the existing harness).
- Manual/integration checks use a throwaway home:
  `GRAPEVINE_HOME=$(mktemp -d) bun cli.ts <verb> …`
- Ability to spawn and `kill -9` real `tail` subprocesses (for T2-01 / T3-02).

**External Dependencies:**

- **Runtime** — Bun ≥ 1.3.13 (`bun --version`) for abort-signal / stream
  semantics relied on by the reaping fix.
- No third-party services, credentials, API keys, or env vars required.
- **Verification command:** `bun --version` → ≥ 1.3.13, and
  `bun test cli.test.ts` runs (baseline suite passes pre-change).

---

## Verification Scenarios

### Tier 1 — Smoke Tests

_Always required. Cheap checks that the feature doesn't break anything._

#### T1-01: Full CLI test suite passes

**Type:** Unit\
**Source:** Baseline

**Steps:**

1. `cd plugins/toolbox/skills/grapevine/scripts`
2. `bun test cli.test.ts`

**Expected:** All tests pass (the pre-change baseline plus the new V1.6.7
cases). No type errors.

---

#### T1-02: Daemon spawns and core verbs round-trip

**Type:** Integration\
**Source:** Baseline

**Steps:**

1. `H=$(mktemp -d)`
2. `GRAPEVINE_HOME=$H bun cli.ts open smoke`
3. `GRAPEVINE_HOME=$H bun cli.ts send smoke --as t "hello"`
4. `GRAPEVINE_HOME=$H bun cli.ts pull smoke --since 0`

**Expected:** Channel opens, send returns `{ok, id, channel}`, pull returns the
message. No errors.

---

#### T1-03: Version reports 2.9.0

**Type:** Smoke\
**Source:** Plan Phase 5

**Steps:**

1. `GRAPEVINE_HOME=$H bun cli.ts info`
2. `GRAPEVINE_HOME=$H bun cli.ts doctor`

**Expected:** Both report daemon/CLI version `2.9.0`.

---

### Tier 2 — Critical Path

_Core behavior mapped from proposal goals and plan phases._

#### T2-01: A killed consumer is reaped from `who` within seconds

**Type:** Integration\
**Source:** Proposal goal — "a killed push consumer disappears from `who` within
a few seconds, not minutes"; Plan Phase 1 (flagship)

**Steps:**

1. `H=$(mktemp -d)`
2. Start a tail subprocess:
   `GRAPEVINE_HOME=$H bun cli.ts tail reap --as ghost &` (record PID)
3. Poll `GRAPEVINE_HOME=$H bun cli.ts who reap` until `ghost` appears.
4. `kill -9 <tail-pid>`
5. Poll `who reap`, timestamping, until `ghost` disappears.

**Expected:** `ghost` drops from `who` within ≤ ~5s of the kill (not the old
~4-minute `idleTimeout` window). `count` returns to the true value.

---

#### T2-02: Presence counts are honest (anonymous vs named)

**Type:** Unit/Integration\
**Source:** Findings F1/F15; Plan Phase 1

**Steps:**

1. Open a channel; connect one `tail --as alice` and one **anonymous** SSE
   consumer (no `as=`, simulating a watch tab).
2. `who <chan>` and inspect the response fields.

**Expected:** The response distinguishes raw connections from named aliases
(e.g. `connections: 2`, `named: ["alice"]`, `anonymous: 1`). The anonymous
connection is accounted for explicitly, not silently summed into a misleading
`count` vs. a 1-name list.

---

#### T2-03: `who --all` returns names × channel in one call

**Type:** Unit\
**Source:** Proposal goal — cross-channel presence (F13); Plan Phase 2

**Steps:**

1. Open two channels with different subscribers (e.g. `alice` on both, `bob` on
   one).
2. `who --all`.

**Expected:** A single response lists every channel with its subscriber aliases
(`{a: ["alice","bob"], b: ["alice"]}`-shaped), no N separate `who` calls needed.

---

#### T2-04: `doctor` flags a count-vs-names divergence

**Type:** Integration\
**Source:** Proposal goal — `doctor` restart-safety number is trustworthy (F15);
Plan Phase 2

**Steps:**

1. Induce a divergence (an anonymous watcher, or a ghost before reaping).
2. `doctor`.

**Expected:** `active_subscribers` reflects named-vs-connection counts, and a
hint calls out the divergence (e.g. "N connections but M named — possible ghost;
see `who --all`") instead of silently reporting an inflated total.

---

#### T2-05: `tail` emits an on-connect grounding line on stdout

**Type:** Unit\
**Source:** Proposal goal — fresh subscribers land grounded (F3, F7); Plan Phase
3

**Steps:**

1. Seed a channel with M messages and a topic.
2. `tail <chan> --since <k>` (k below latest) and capture the first stdout line.

**Expected:** A structured stdout line (e.g. `{"kind":"grounding", …}`)
reporting the topic and the correct `earlier`/backfill count, with the
`--from-start` / `--since` hint. It is on **stdout** (reaches a stdout-grepping
consumer), not only stderr.

---

#### T2-06: `truncation_hint` survives clipping and threshold is raised

**Type:** Unit\
**Source:** Proposal goal — truncation hints reach `tail` consumers (F17); Plan
Phase 3

**Steps:**

1. Tail a channel; send a message > the new threshold.
2. Inspect the emitted tail JSON line.
3. Send a ~1KB message (below the new ~2000 default but above the old 800).

**Expected:** For the long message, `truncation_hint` appears **before**
`"text"` in the serialized line (assert key position). For the ~1KB message,
**no** hint fires (threshold raised to ~2000). The hint carries the
`read <channel> <id>` recovery command.

---

#### T2-07: `send` echoes its target visibly without changing stdout JSON

**Type:** Unit\
**Source:** Proposal goal — misroute detection (F9); Plan Phase 4

**Steps:**

1. `send <chan> --as t "hi"` with stderr captured separately from stdout.

**Expected:** Stderr carries a human-visible `# → <chan> · N recipient(s)`
confirmation; stdout JSON shape is unchanged (back-compat — existing tests still
pass).

---

#### T2-08: Keepalive sentinel surfaces under `2>&1`, absent on clean stdout

**Type:** Integration/Manual\
**Source:** Findings F6; Plan Phase 3

**Steps:**

1. `tail <chan> --as t 2>&1` on an idle channel; observe for one+ heartbeat
   interval.
2. Separately, `tail <chan> --as t` (stdout only) on an idle channel.

**Expected:** Under `2>&1`, a recognizable `: grapevine-keepalive` tick appears
periodically. On clean stdout, no sentinel lines appear (JSONL stream stays pure
messages + grounding).

---

### Tier 3 — Edge Cases & Robustness

_Deferred with rationale._

#### T3-01: Slow-but-alive idle tail is not false-reaped

**Type:** Integration\
**Source:** Plan risk — lowering `idleTimeout` could false-reap\
**Deferred rationale:** Timing-sensitive and slow to run (must hold a connection
idle past the new timeout). Worth a one-off manual check during the Phase-1
spike, not part of the standard suite.

---

#### T3-02: Abrupt half-open socket (no clean FIN) reaping bound

**Type:** Integration\
**Source:** Plan risk — abort may not fire on `kill -9`\
**Deferred rationale:** Hard to simulate deterministically (depends on TCP/OS
behavior). T2-01 covers the common case; this is the adversarial tail.
Spike-time manual verification, then accept the documented bound.

---

#### T3-03: Grounding line doesn't break naive JSONL consumers

**Type:** Unit\
**Source:** Plan risk — new stdout `kind`\
**Deferred rationale:** Low risk — it's a `kind:"grounding"` object, parseable
and skippable like `kind:"topic"`. A single assertion that a
`kind:"message"`-filter ignores it suffices if cheap; otherwise defer.

---

#### T3-04: Cross-version daemon mismatch still detected after changes

**Type:** Integration\
**Source:** Constraint — preserve cache-pinning detection (`cli.ts:55-81`)\
**Deferred rationale:** The version-advertising path is unchanged by this work;
re-verify only if Phase 1 touches the `/` handler.

---

#### T3-05: Watch-UI liveness pulse

**Type:** Manual\
**Source:** Proposal A.2 (watch UI pulse, low priority)\
**Deferred rationale:** Explicit non-goal for V1.6.7 — the pulse is a
nice-to-have that can trail the CLI/daemon work.

---

## Out of Scope

- **`reply`, `@mention`, cross-channel broadcast, persisted agent identity,
  `send --verbose` trim** — deferred to V1.7; not in this release.
- **JSONL message-contract changes** — the contract is unchanged; new stdout
  lines are additive `kind`s only.
- **Performance / load testing** — no perf goals in the proposal; the changes
  are small and localized.
- **Windows path semantics** — unverified per SKILL.md prerequisites; not
  introduced here.

---

## Results Addendum

_Executed 2026-05-28 — automated suite (`bun test cli.test.ts`, 52/52) + live
2-agent smoke (`vintner` + `tesla`) on the real daemon rolled to branch 2.9.0._

| Scenario | Status  | Notes                                                                                                                     |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| T1-01    | Pass    | `bun test cli.test.ts` → 52/52, 165 assertions.                                                                           |
| T1-02    | Pass    | open/send/pull round-trip (suite + smoke).                                                                                |
| T1-03    | Pass    | `info`/`doctor` report `2.9.0` after the daemon roll.                                                                     |
| T2-01    | Pass    | Flagship gate. SIGKILL'd tail reaped from `who` ≤ ~6s — and the spike showed reaping was already working (no fix needed). |
| T2-02    | Pass    | `who` → `connections:2, named:1, anonymous:1`; smoke confirmed the watch tab is the anonymous one.                        |
| T2-03    | Pass    | `who --all` returns names × channel in one call (unit + smoke).                                                           |
| T2-04    | Pass    | `doctor` emits the divergence hint ("…1 anonymous (e.g. a watch tab)… not a ghost").                                      |
| T2-05    | Pass    | Grounding line on join: `tesla` got `earlier:3` + topic + backfill hint (F7).                                             |
| T2-06    | Pass    | 2527-char msg: `truncation_hint` is the **first key** (before `.text`), survived the clip, `read` recovered the body.     |
| T2-07    | Pass    | `# → <chan> · N recipient(s)` on stderr; stdout JSON unchanged.                                                           |
| T2-08    | Pass    | `: grapevine-keepalive` ~every 3s under `2>&1`; absent on the plain stdout tail (off the message stream).                 |
| T3-01    | Skipped | Tier 3 — deferred (slow-idle false-reap; manual spike).                                                                   |
| T3-02    | Skipped | Tier 3 — deferred (abrupt half-open socket; manual spike).                                                                |
| T3-03    | Skipped | Tier 3 — deferred. Grounding is a parseable/skippable `kind`; reviewer confirmed no consumer break.                       |
| T3-04    | Skipped | Tier 3 — deferred. Version-advert path unchanged; the branch CLI correctly flagged the 2.8.0 daemon during the roll.      |
| T3-05    | Skipped | Tier 3 — non-goal (watch-UI pulse).                                                                                       |

**Blocked scenarios:** None. All Tier-1/Tier-2 scenarios executed and passed; an
independent code review (`feature-dev:code-reviewer`) returned **Ready to merge:
Yes** with no blocking findings.

## Visual Artifacts

_This is a CLI/daemon release; verification is textual (CLI output, test
results). No UI screenshots expected unless the deferred watch-UI pulse (T3-05)
is picked up._

**Screenshot directory:**
`docs/projects/grapevine-v1.6.7/artifacts/screenshots/`

**Naming convention:** `<scenario-id>-<description>.png` (e.g.,
`T3-05-watch-pulse.png`)
