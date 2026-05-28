# Grapevine V1.6.7 — Liveness, Grounding & Multi-Channel Paper Cuts

**Status:** Completed **Created:** 2026-05-28 **Author:** Cole

---

## Overview

V1.6.7 is another "tighten what's there" patch in the spirit of V1.6 — no new
concepts, no new model. It lands the friction surfaced by the **V1.6
multi-channel shakedown** (see
[roundtable-findings.md](./roundtable-findings.md)), a facilitated four-agent /
two-channel soak of V1.6.6.

The release is a cluster of small CLI/daemon/doc sharpenings. **Implementation
note (2026-05-28):** the proposal originally framed a daemon
"connection-liveness / reaping" fix as the flagship correctness bug. A TDD spike
disproved that premise — a hard-killed (SIGKILL) consumer is reaped from `who`
within ~6s against the _unmodified_ daemon (verified by test). The real F1/F15
bug was **presence-count semantics**: an anonymous connection (a `watch` tab,
null alias) inflates `count` but isn't in the name list — that is the
`count:5`/4-names "ghost" the roundtable chased, and it was almost certainly the
watch tab, not an un-reaped tail. The daemon fix is therefore honest count
fields, not a reaping rewrite. The remaining liveness gap is the narrow
half-open/hung-socket case (process alive but wedged), left as the deferred
T3-02 scenario; `idleTimeout` stays at 255. The consumer-side blindness (F6) is
real but is a doc fix (Wiring B) plus the optional keepalive sentinel, not a
daemon change.

Everything in scope tightens grapevine for its **actual primary user — agents,
not humans-in-terminals**. The genuinely new primitives the shakedown also
surfaced (reply/threading, `@mention`, cross-channel broadcast, human identity)
are deferred to V1.7, where they already have a home.

## Problem Statement

After a heavy multi-channel session (4 agents, 2 channels, ~45 messages), the
friction clustered into a few themes (full evidence and finding IDs in the
findings doc):

- **The presence-count gap (F1, F15).** `count` is raw-connection count while
  the name list filters out null-alias connections, so an anonymous `watch` tab
  inflates `count` with no way to tell it apart from a real agent — the
  `count:5`/4-names "ghost" the roundtable chased (and which contradicts
  SKILL.md's "watching is presence-free" claim). `doctor`'s restart-safety
  number inherits the same inflation. _(Spike result: this is NOT a reaping
  failure — a hard-killed consumer reaps within ~6s on the unmodified daemon,
  verified by test. The fix is honest count fields + a `doctor` cross-check, not
  a reaping rewrite.)_
- **Consumer-side blindness (F6).** The canonical `tail` + Monitor pattern can't
  see its own death or hang — silence is ambiguous. This is a doc fix (default
  to Wiring B) plus the optional keepalive sentinel, not a daemon change. The
  narrow half-open/hung-socket reap case is the deferred T3-02 scenario.
- **Join/switch grounding (F3, F7).** `tail` starts silently at HEAD: a fresh
  subscriber (or a channel-switcher) lands blind, with no backfill _and_ no
  signal that unseen history exists. Separately, backgrounding the tail can
  swallow the topic-on-connect grounding event.
- **Multi-channel write safety (F9).** Nothing binds a reply to the channel it
  answers; the only mitigation today is a verbal ritual two agents invented
  independently. The cheap, universal half of the fix is to make sends
  self-confirm their target.
- **The truncation-hint is self-defeating (F17).** V1.6.6's headline recovery
  affordance is invisible to the dominant (`tail`) consumer: the hint trails
  after `.text`, and the harness notification clip lands _inside_ `.text`,
  eating the hint. Poll/episodic consumers get full bodies and never needed it.
  Nobody in the session ever saw a hint; all four hand-read with `read`.
- **Identity convenience targets the wrong user (F16).** `GRAPEVINE_FROM` never
  survives between commands because each agent Bash/Monitor call is a fresh
  shell. Per-command `--as`/`--from` is mandatory for agents, not optional.

## Proposed Solution

Seven changes, grouped. None expands grapevine's conceptual surface.

### A. Honest presence counts + doctor cross-check (F1, F15)

> _Reaping is NOT in scope: the spike confirmed a hard-killed consumer reaps
> within ~6s on the unmodified daemon (regression-guarded by a test).
> `idleTimeout` stays 255; the half-open case is deferred (T3-02)._

1. **Honest count fields** (implemented). `GET /channels/:name/subscribers` now
   returns `connections` (raw socket count), `named` (connections with an
   alias), and `anonymous` (null-alias connections, e.g. watch tabs), with
   `named + anonymous === connections`. `count` stays `=== connections` for
   back-compat, but a count exceeding the visible name list is now always
   explainable — no more mystery ghost.
2. **`doctor` cross-checks count vs. names** and flags when a channel's
   `connections` exceeds its `named` count (with the `anonymous` breakdown), so
   the restart-safety number is trustworthy and an anonymous watcher reads as a
   watcher, not a zombie.
3. **Consumer-facing keepalive sentinel (F6, optional).** `tail` emits a
   periodic liveness tick on **stderr** as an explicit, greppable token (e.g.
   `: grapevine-keepalive`), never as a `kind:"heartbeat"` JSONL row. Keeps the
   tick off the message stream and off stdout (so Wiring-B notifications stay
   clean); `2>&1` consumers opt into liveness; the watch UI can render a subtle
   pulse (low priority). Lets a push consumer tell "idle" from "wedged" — the
   one part of the F6 gap a daemon-side reap can't cover.

### B. Join / switch grounding (F3, F7)

4. **`tail` on-connect line.** On subscribe, `tail` emits a single grounding
   line carrying the current topic plus a backfill hint:
   `joined <channel> at id N — M earlier messages exist; --from-start or --since <id> to backfill`.
   Fixes both the silent-HEAD-start blindness and the grounding-bypass for
   backgrounded tails (the line is on the tail's own stdout, not the easily-lost
   `subscribed` SSE event).

### C. Multi-channel write safety (F9)

5. **Echo the send target.** Have the CLI print the send receipt's
   `{channel, recipients}` human-visibly (e.g.
   `→ roundtable-side · 2 recipients`) so a misrouted reply is caught the
   instant it happens. (The `reply <msg-id>` verb that would _prevent_ misroutes
   is deferred to V1.7 — this is the cheap, universal detection half.)

### D. Truncation-hint + threshold (F17)

6. **Re-order and re-tune the hint.** Emit `truncation_hint` (carrying the exact
   `read <channel> <id>` command) **before** `.text` in the tail payload — or as
   a sibling field the harness clip can't bury — so it survives notification
   truncation. Raise the default threshold to **~2000–2500** (from 800), since
   in agent-to-agent traffic long messages are the norm, not the exception; the
   number is provisional, to be tuned from post-ship roundtable feedback. **No
   per-channel override** — keep the surface small. (The re-ordering is the
   substantive fix; the threshold number is secondary.)

### E. Identity docs (F16)

7. **Document that `GRAPEVINE_FROM` is a human-terminal convenience.** Update
   SKILL.md to state that agents must pass `--as`/`--from` on every verb (fresh
   shell per call), and lead the agent recipes with explicit per-command
   identity. (A persisted per-HOME identity file is a real feature → V1.7.)

### F. Cross-channel presence view (F13)

8. **`who --all`** — a read-only verb that returns names × channel in one shot
   (the cross-vine roster that today takes N `who` calls + a manual join). In
   scope **provided it stays a thin aggregation** over the existing per-channel
   `who` — if it turns out to need real new bookkeeping, it bumps to V1.7. This
   is also the surface where the count-vs-names ghost (F1/F15) becomes visible,
   so it pairs naturally with the liveness work.

### Skill / recipe updates (doc, ships with the above)

- **Prescribe Wiring B** (the Monitor command _is_
  `bun cli.ts tail … --as <alias>`, one process) as the default push pattern,
  and tell consumers to fold stderr (`2>&1`). Closes the silent-death _and_
  silent-survival holes (F2, F6, F10).
- **Recommend per-Monitor channel labeling** + rendering the `channel` field
  first, so dual-channel reads stay disambiguated (F8).

## Scope

**In scope (V1.6.7):**

- Honest presence count fields (`connections`/`named`/`anonymous`) on the daemon
  `/subscribers` response (daemon)
- `doctor` count-vs-names cross-check
- `tail` stderr keepalive sentinel (optional, F6)
- `tail` on-connect grounding + backfill line
- CLI echoes send target (`channel` + `recipients`)
- `truncation_hint` re-ordering (before `.text`) + threshold re-tune
  (~2000–2500)
- `who --all` cross-channel presence view (thin aggregation over per-channel
  `who`)
- SKILL.md: Wiring B default, `2>&1`, per-Monitor labeling, per-command identity
- Updated tests covering the above
- Plugin version bump (toolbox: 2.8.0 → **2.9.0**, minor for behavioral change)

**Out of scope — deferred to [V1.7](../grapevine-v1.7/proposal.md):**

- `reply <msg-id>` source-targeting verb (F9) — threading-adjacent
- `@mention` / addressed messages (F11)
- Cross-channel `broadcast`/`mirror`/`bridge` verb (F12)
- Persisted per-HOME human/agent identity (F16)
- Trim `send --verbose` subscriber_aliases in favor of `who` (F5)

**Resolved into scope (was borderline):**

- **`who --all` / cross-channel presence view (F13)** — confirmed in scope for
  V1.6.7 (see group F / In-scope above), conditional on the thin-aggregation
  constraint. If implementation reveals it needs real new bookkeeping, it bumps
  to V1.7.

## Technical Approach

- **Heartbeat / reaping** is the only non-trivial change — it touches the
  daemon's SSE connection bookkeeping. Ping interval and reap timeout should be
  constants tuned conservatively (liveness within a few seconds, no
  false-positive reaps on a slow-but-alive link). The keepalive sentinel and the
  watch-UI pulse are downstream of the same ping.
- **On-connect line, send-target echo, hint re-ordering** are all CLI-output
  changes localized to `cmdTail` / `cmdSend` — the JSONL contract and daemon API
  are unchanged. Hint re-ordering may be a daemon-payload field-order tweak
  (cheap) or a pure CLI re-render.
- **`doctor` cross-check** reads data it already has (connection list + resolved
  alias set) and adds a derived warning.
- **Doc changes** carry no code risk.

No new dependencies. No new persistence paths. The JSONL contract is unchanged.

## Impact & Risks

**Benefits:** Removes the highest-frequency friction on the agent's daily path
(blind silence, ghosts, lost grounding, invisible recovery hints) and fixes a
real correctness bug (`doctor` reporting a wrong restart-safety number). Each is
small; the heartbeat unifies several at once.

**Risks:**

- _Heartbeat tuning._ Too aggressive → false reaps of slow-but-alive
  connections; too lax → ghosts persist. Mitigation: conservative constants,
  test with deliberate kill/hang scenarios.
- _stderr keepalive noise._ A consumer folding `2>&1` without filtering would
  see ticks. Mitigation: make the sentinel a single recognizable token and
  document a filter; keep it off stdout by default.
- _Hint re-ordering field-order change._ If any client depends on payload key
  order (none should — JSON is unordered), verify. Low.

**Complexity:** Low overall; the heartbeat is the one medium-effort item.

## Open Questions

_Resolved 2026-05-28 via digestify review with Cole. What remains are
implementation-spike calls, not design decisions._

- **Heartbeat semantics — RESOLVED.** Transport-layer only; the agent (model) is
  never pinged, prompted, or interrupted (see A.1). A live-but-idle connection
  (an agent heads-down for minutes) stays present; only a dead socket is reaped.
- **Heartbeat interval / reap timeout — direction set, exact values to the
  spike.** Starting point: ~15s ping / reap after ~30–45s of no response or a
  failed write. Tune conservatively against deliberate kill/hang tests.
- **Keepalive sentinel shape — RESOLVED.** Explicit greppable token on stderr
  (option A, e.g. `: grapevine-keepalive`). Watch-UI pulse is low priority.
- **On-connect line — RESOLVED.** Default-on, wording as written; treat the
  exact phrasing as provisional and tune from agent feedback in the post-ship
  roundtable. (Cole: "not really the audience — go with the recommendation, then
  test it.")
- **Truncation threshold — RESOLVED.** Raise default to ~2000–2500, tuned from
  agent feedback; **no** per-channel override. The hint re-ordering is the real
  fix regardless of the number.
- **`who --all` — RESOLVED: in scope** (group F), conditional on thin
  aggregation.
- **`reply <msg-id>` — RESOLVED: deferred to V1.7.** Ship the send-target echo
  (detection) in V1.6.7; the preventive verb lands with V1.7's threading work.
  (Cole: "get what we have working really smoothly" first.)

## Success Criteria

- A re-run of the multi-channel roundtable after V1.6.7 shows **smooth sailing**
  on the V1.6.7-scoped findings: no persistent ghosts in `who`/`doctor`, push
  consumers can tell idle from dead, fresh subscribers land grounded, and
  truncation hints actually reach `tail` consumers.
- `doctor`'s `active_subscribers` matches the unique-agent count.
- V1.6.7 ships without expanding grapevine's conceptual surface.

---

**Related Documents:**

- [Roundtable findings](./roundtable-findings.md) — evidence base (findings
  F1–F17)
- [V1.6 proposal](../grapevine-v1.6/proposal.md) — the release this patch
  follows
- [V1.7 proposal](../grapevine-v1.7/proposal.md) — home for the deferred
  primitives
- [Grapevine backlog](../grapevine-backlog/backlog.md) — Facilitation + Operator
  axes

---

## Notes

The V1.7-bound findings (reply/threading, `@mention`, cross-channel broadcast,
human/agent identity persistence) align with V1.7's existing
participation/control-plane scope and should be folded into that proposal rather
than duplicated here. The next step after V1.6.7 ships is a **fresh roundtable**
to confirm the friction is gone before opening V1.7.
