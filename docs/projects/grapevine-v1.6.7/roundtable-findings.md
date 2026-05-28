# Grapevine V1.6 Multi-Channel Shakedown — Roundtable Findings

**Date:** 2026-05-28 **Type:** Soak / friction-audit session **Facilitator:**
Claude (alias `vintner`) **Participants:** `tannin`, `marconi`, `claret` (three
independent Claude Code instances, each in a separate terminal) **Daemon:**
toolbox 2.8.0 / grapevine V1.6.6

---

## Purpose

A facilitated roundtable to find remaining friction in the grapevine **V1.6
series** before committing to V1.7. The human's specific interest was
**multi-channel ergonomics** — switching between channels and monitoring two at
once — on top of baseline single-channel communication.

Method: four agents on a shared channel (`roundtable-main`), driven through five
scenarios — (1) single-channel warm-up/onboarding, (2) dual-channel monitoring,
(3) channel switching, (4) cross-channel relay/bridging, (5) "where is
everyone?" cross-channel presence — with a second channel (`roundtable-side`)
introduced at phase 2. Each agent kept a running friction log. Both channel logs
were read in full for this report; the channels were then closed and deleted.

## Headline: one root cause behind half the findings

The single most valuable result is a **unification**. The daemon has **no
connection-liveness detection**, and that one gap radiates in two directions:

- **Server-side (the "ghost"):** dead / half-open SSE connections are not reaped
  promptly — they linger on a lazy idle-timeout for _minutes_. So `who`, `list`,
  and `doctor` all over-report presence during that window.
- **Consumer-side (the "blindness"):** a push consumer (Claude Code `tail` +
  Monitor) cannot distinguish "idle" from "dead/hung" — both are byte-identical
  silence.

**Verified live during the session:** `who roundtable-main` returned 4 unique
names but `count: 5`; `doctor` reported `active_subscribers total: 8` when the
true distinct-agent count was 7 (main 4 + side 3); a few minutes later the ghost
self-reaped and `who` dropped to 4. The lingering connection was `tannin`'s
torn-down Wiring-A tail (see F10) — un-reaped on the daemon's timer.

**A single fix — a server-side heartbeat ping + idle/dead-socket reaping —
closes both directions.** `marconi`'s stderr-keepalive proposal (F6) is the
consumer-facing half of the same mechanism.

## Findings

Severity key: **High** = correctness bug or frequent friction on a core path ·
**Med** = real paper cut · **Low** = minor / doc-only · **Resolved** = no change
needed.

| ID  | Finding                                                                                                                                                                                                                                                                                                                                          | Sev      | Disposition            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------- |
| F1  | **Presence accounting drift.** `who.count`, `send.subscribers`, `list.subscribers` count different things (held tails vs. +sender's transient POST). One field name, three denominators.                                                                                                                                                         | Med      | V1.6.7 (+ root fix)    |
| F2  | **Push-consumer subscribe is N-steps** (load Monitor schema → wrap/background `tail` → only then present). 3-for-3. The "write-only ghost" trap is dodged only because the skill warns.                                                                                                                                                          | Med      | V1.6.7 (doc)           |
| F3  | **Topic-on-connect grounding is unreliable for backgrounded push-tails.** `marconi` received it; `tannin` did not (backgrounding swallowed the `subscribed` SSE event). Same runtime.                                                                                                                                                            | Med      | V1.6.7                 |
| F4  | ~~`read --text` prints nothing~~ **RETRACTED.** Operator error: channel arg dropped (`read 5 --text`) → `usage`, exit 2, to **stderr** → empty stdout. Renderer is fine.                                                                                                                                                                         | —        | Lesson only            |
| F5  | **Roster-at-join + `send --verbose` is the wrong home for a roster.** You learn the count from a send receipt but not the names until traffic flows; `who` is the read-only home.                                                                                                                                                                | Low      | V1.7 (trim)            |
| F6  | **Consumer-side liveness blindness.** The canonical `tail`+Monitor pattern can't see its own failures. Sharpened into the **Wiring A vs. B** taxonomy (below) + the hang band.                                                                                                                                                                   | **High** | V1.6.7 (root fix)      |
| F7  | **`tail` starts silently at HEAD; no backfill, no "unread exists" signal.** A fresh subscriber to a live channel gets no history _and_ no hint that history exists.                                                                                                                                                                              | **High** | V1.6.7                 |
| F8  | **Dual-monitor read-disambiguation works — but via consumer labeling, not payload.** Salience came from naming the Monitor (`⟢ roundtable-SIDE`); the `channel` field is buried mid-JSON.                                                                                                                                                        | Resolved | V1.6.7 (doc)           |
| F9  | **No source-channel binding for replies (headline multi-channel hazard, write-side).** Replying = typing `send <channel>` by hand; nothing binds a reply to the channel it answers.                                                                                                                                                              | **High** | split: see below       |
| F10 | **Wiring A also has a silent-_survival_ hole.** Killing a file-grep Monitor leaves the background `tail` (and presence) alive → ghost in `who`. Root-causes F1's phantom. Wiring B fixes both.                                                                                                                                                   | **High** | V1.6.7 (root fix)      |
| F11 | **No addressing / `@mention`.** A per-agent instruction buried in a group message was skimmed past. No way to target one agent in a shared channel.                                                                                                                                                                                              | Low      | V1.7                   |
| F12 | **A dual-homed agent is a bridge that can't bridge.** Relay = manual re-fetch + re-type, with **authorship laundering** and **context re-teaching**. No broadcast/mirror verb.                                                                                                                                                                   | Med      | V1.7                   |
| F13 | **No cross-channel presence view.** `who` is names-but-single-vine; `list` is all-vines-but-no-names. A cross-vine roster takes N `who` calls + a manual mental join.                                                                                                                                                                            | Med      | borderline (see below) |
| F14 | **Channel switching is non-atomic.** Drop-then-retail leaves two overlapping connections for a beat (ghost), or a gap where traffic is missed. Same root as F1/F10.                                                                                                                                                                              | Med      | V1.6.7 (root fix)      |
| F15 | **`doctor` counts connections, not agents.** Its restart-safety number (`active_subscribers`) — the one thing it exists to provide — is silently inflated by the ghost; no count-vs-names check.                                                                                                                                                 | **High** | V1.6.7                 |
| F16 | **`GRAPEVINE_FROM` is near-useless for agents.** Every Bash/Monitor call is a fresh shell, so the env var never survives between commands. Per-command `--as`/`--from` is mandatory, not optional.                                                                                                                                               | Med      | V1.6.7 (doc) + V1.7    |
| F17 | **`truncation_hint` is structurally self-defeating for tail consumers.** `wait`/`pull` return full bodies (no hint, don't need it); `tail` injects the hint _after_ `.text`, and the harness clips _inside_ `.text`, eating the hint. Nobody ever saw a hint. The 800-char threshold also inverts in agent traffic (long messages are the norm). | **High** | V1.6.7                 |

### F6 detail — the Wiring A vs. B taxonomy

Two distinct Claude Code push wirings appeared in the room:

- **Wiring A (decoupled):** `tail > file &` in the background, then a Monitor
  running `tail -f file | grep …`. Two processes. The grep watches a _file_,
  divorced from the tail's lifecycle. If the `bun tail` dies, the file goes
  quiet and the Monitor stays **silent** — and if the watcher is killed, the
  background tail (and presence) **survives** (F10). Has both the silent-death
  _and_ silent-survival holes.
- **Wiring B (direct):** the Monitor command _is_
  `bun cli.ts tail … --as <alias>`. One process. Its stdout is the event stream
  and its **exit** is a terminal event the harness reports ("monitor ended, exit
  code N") — process death shows up as a notification, not silence. Teardown is
  clean: kill the Monitor → tail dies → presence drops from `who` **instantly**.
  Auto-reconnect self-heals transient daemon blips under B with no wrapper.
- **The residual band (both wirings):** a process _hang_ (alive-but-wedged
  socket, half-open reconnect) emits no output and no exit, so both read it as
  healthy idle. Only a **server-side heartbeat** (or an external `who`-based
  liveness probe) distinguishes idle from hung.

`marconi`'s heartbeat design: keep it at the **transport/CLI layer**, never as a
`kind:"heartbeat"` JSONL row (that would pollute the log, inflate ids, spam
notifications, bloat `grep`). Mirror SSE comment-frame keepalives (`:\n`) — have
`tail` translate "connection alive, no new data" into a periodic **sentinel on
stderr**. That keeps the tick off both the JSONL stream and stdout, lets `2>&1`
consumers opt into liveness, and lets the watch UI render it as a subtle pulse.

### F9 detail — the write-side hazard and its fix triage

Reads were label-protected (Monitor banners); the genuine near-miss was
answering the right prompt into the **wrong channel**. Two agents
_independently_ invented the same mitigation — naming their target channel at
the top of every message ("marconi on SIDE", "tannin routing deliberately").
That convergent, unprompted ritual is proof-by-behavior of the missing
primitive.

Fix triage (from `marconi`):

- **`reply <msg-id>`** that auto-targets the source channel → closes the reply
  case cleanly. _(New verb → V1.7, threading-adjacent.)_
- **Per-terminal default-channel lock** → helps single-channel terminals but
  _fights_ true dual-channel work (misroutes the moment you address the other
  vine). **Rejected.**
- **Cheapest win, already half-exists → V1.6.7:** the send receipt already
  returns `{channel, recipients}`. Have the CLI **echo it human-visibly** ("→
  roundtable-side, 2 recipients") so a misroute is caught the instant it
  happens, even without a reply verb. Prevention is nice; fast detection is
  cheap and universal.

## What's solid (no change needed)

- **Dual-channel identity is friction-free.** One alias served both vines —
  `--as marconi` on both tails, `who` shows him on main _and_ side
  simultaneously, no collision, no per-channel identity needed.
- **`read --text` works** (F4 retracted) — flag before or after the id, on
  messages and topics, exit 0.
- **`grep`, `doctor`, `topic`, auto-reconnect (under Wiring B)** all behaved as
  designed. `grep --from <alias>` correctly narrowed to one speaker.
- **The flat-channel model stayed legible** with 4 voices across 2 channels.
- **Poll/episodic consumers (`wait`/`pull`) never truncate** — they return full
  bodies, so they need none of the F17 work.

## Cross-cutting theme — safety offloaded to operator discipline

Three of the _smoothest_ results were smooth only because agents compensated:
alias collisions were dodged because the skill warns; dual-channel writes stayed
correct because two agents invented the same naming ritual; channel
disambiguation worked because they labeled their Monitors. The tool keeps
offloading safety to operator discipline. The V1.6.7 doc fixes (Wiring B,
labeling, per-command identity) **formalize** that discipline; the V1.7
primitives (reply, mention, broadcast, cross-channel presence) move it **into
the tool**.

## Meta-observations on the format

- The roundtable **self-corrected in real time**: `claret` filed a confident bug
  (F4), two peers reproduced and refuted it in ~30 seconds, and it became a
  clean retraction — which then flushed out the session's richest thread (F6).
  Verify-before-report, demonstrated.
- Independent corroboration was the norm — the strongest findings (F6, F7, F9)
  were landed by two or three agents separately, which is far higher-confidence
  than a single report.
- The facilitator hit the multi-channel friction firsthand: deciding _which_
  channel to post on, with no cross-channel address (F12/F13), fragmented the
  conversation exactly as predicted.

---

**Related documents:**

- [V1.6.7 proposal](./proposal.md) — the ship-now scope derived from these
  findings
- [V1.6 proposal](../grapevine-v1.6/proposal.md) — the release this soak tested
- [V1.7 proposal](../grapevine-v1.7/proposal.md) — absorbs the
  participation/addressing findings
- [Grapevine backlog](../grapevine-backlog/backlog.md) — Facilitation + Operator
  axes
