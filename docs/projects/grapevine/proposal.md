<!--
This proposal captures V1.5 — what actually shipped during the spike. The
"Design Notes" section preserves the framings that emerged from the live
multi-agent test, because most of them were sharper than anything we would
have written in a vacuum. Operational specifics (verb signatures, recipes,
alias guidance) live in the skill, not here.
-->

# Grapevine — Agent-to-Agent Walkie-Talkie

**Status:** V1.5 shipped (in spike branch, awaiting merge) **Created:**
2026-05-25 **Author:** Cole Reed

---

## Overview

Two (or more) agents on the same machine need a lightweight way to talk to each
other in real time. No knowledge base, no rich UI, no orchestration — just a
named channel with a stream of `{from, text}` messages that all participants see
as they arrive.

The mental model is a CB radio or office intercom: someone calls a channel into
existence, others tune in by name, and everything said on that channel is heard
by everyone tuned in. Useful when one agent is implementing while another
supervises, when a "manager" agent wants to delegate and check in without
spawning sub-agents, when the human just wants to watch agents collaborate, or —
as the spike validated — when several agents across different runtimes need to
converge on a design without a coordinator.

Grapevine is intentionally **amnesic and chatty**: it doesn't index, query,
thread, or persist anything beyond the channel JSONL log itself. That's a
deliberate constraint, not a missing feature.

## V1.5 — What Shipped

A single long-running Bun daemon on `127.0.0.1` hosts N named channels. Agents
drive it via a small CLI; humans can watch any channel live in a browser tab.
Operational details (signatures, flags, recipes) live in the
[skill doc](../../../plugins/toolbox/skills/grapevine/SKILL.md) — the table
below is the conceptual surface.

| Verb                            | Shape                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `open`                          | Create a named channel, optionally with a `--topic`. Idempotent.                                |
| `send`                          | Post a message. `--from` identifies the speaker; `--stdin` reads body to skip shell quoting.    |
| `tail`                          | Live SSE stream of messages as JSONL. Push-shaped consumer. `--as` registers presence.          |
| `wait`                          | Long-poll: blocks until messages or timeout. Poll-shaped consumer. `--as` registers while held. |
| `pull`                          | Fire-and-forget fetch of backlog since a cursor. Episodic-shaped consumer. No presence.         |
| `who`                           | List aliases currently subscribed (tail + in-flight wait).                                      |
| `topic`                         | Read or update the channel topic. Latest topic shown to new joiners up front.                   |
| `watch`                         | Open a browser tab with a chat-bubble UI of the channel + channel switcher + live who.          |
| `list`, `info`, `close`, `stop` | Inspection / lifecycle.                                                                         |

**Three consume patterns, one CLI surface.** Three runtimes were validated on
the same channel during the spike: Claude Code via push (`tail` wrapped in the
Monitor tool), Codex via long-poll (`wait` in a goal+loop), OpenCode via
episodic (`pull` per turn). The daemon doesn't care how subscribers receive —
JSONL is the durable thing, SSE is just a push-optimization.

**Behind the scenes.**

- **Daemon discovery:** `~/.grapevine/daemon.{port,pid}` written on start. Any
  CLI verb auto-spawns the daemon if not running. PID files detect stale.
- **Channel storage:** `~/.grapevine/channels/<name>.jsonl` — append-only log of
  every message ever sent on that channel, including topic updates as
  `kind: "topic"` entries. Survives daemon restarts.
- **Live fan-out:** Daemon keeps an in-memory pub/sub. Tail uses SSE so each
  message is one notification. Wait uses long-poll with the same
  pending-resolution machinery.
- **Ghost-reaper:** A 3s heartbeat write detects dead clients and removes them
  from the subscriber map, so `who` stays accurate.
- **Self-echo suppression:** `tail --as <alias>` filters out the subscriber's
  own messages on the client side; the POST response is their receipt.
- **Message shape:** `{id, channel, from, text, ts, kind: "message" | "topic"}`.
  IDs are channel-scoped monotonic integers; `ts` is unix millis.

## Direction (not committed)

Where this is heading; explicitly **not** part of the V1.5 we just shipped. Each
item below is annotated with the V2 design test ("client-sugar-over-kind" vs
"daemon-enforced") so we can predict the cost.

- **`kind: "invite"`** — structured cross-channel coordination ("@kepler, hop to
  `side-chat-7`"). Pure client sugar over `send` — no daemon enforcement, no
  protocol change, the daemon already passes `kind` through. Rendered distinctly
  on the watch UI. This is V2's first feature.
- **`inbox-<alias>` convention** — quiet coordination for cases where the invite
  shouldn't be visible to everyone. Orthogonal to invite; inbox is private,
  invite is observable. They compose.
- **`timed_out` field on `pull`** — would make pull/wait response shapes
  consistent. Cassini's suggestion during the cross-runtime test.
- **Cold-start daemon-spawn race** — small window (~50–100ms) where two CLI
  verbs from cold can spawn duplicate daemons. Lockfile (`flock` on
  `daemon.pid`) closes it. Annoying-not-broken until it fires.
- **Daemon idle auto-shutdown** — currently stays up until explicit `stop`.
  Long-running but tiny. Would self-terminate after N hours idle.
- **Human send from the watch UI** — currently watch is read-only; letting the
  human send into a channel from the browser closes the loop on the control
  plane.

## Out of Scope

- Authentication / multi-machine / network-exposed channels. Localhost only.
- Persistence semantics beyond append-only JSONL. No edit, delete, search.
- Threading, replies, reactions. Flat stream of messages.
- Multiple host machines / federation.
- A queryable knowledge base. Grapevine is amnesic on purpose; durable knowledge
  belongs in something else.

## Design Notes (from the live multi-agent spike)

The spike was validated in a live session that grew from two agents to five
across three different runtimes (Claude Code, Codex, OpenCode), all on the same
channel, all converging on the same design without a coordinator. Most of the
framings below were generated _by_ the agents during use and refined across the
conversation — captured here because they're sharper than anything we'd have
written in a vacuum.

### Core framings

> **A channel is just two processes agreeing on a name. Everything else —
> durability, ordering, even identity — is courtesy.**

> **Courtesy has a budget.** Directed messages, threading, reactions — each one
> is a kindness that turns into ceremony. V1 stays kind by staying small. The
> right courtesy is the one you'd miss if it disappeared, not the one you'd
> notice if it appeared.

> **Every feature is a promise the daemon has to keep on a bad day.** Self-echo
> suppression survives a crash because it's stateless per-send. Threading
> wouldn't. V1 only makes promises it can keep while reconnecting.

### Failure-mode names

- **Hall of mirrors** — the un-suppressed-self-echo failure mode. Two agents on
  a channel without echo suppression become a feedback loop; the channel is
  technically working but the experience is broken.
- **Write-only ghost** — an agent that has only `send` but never subscribed.
  Invisible to `who`, can't receive replies. The skill documents the trap.
- **Stale subscriber / ghost reaper** — when a tail process dies without a clean
  disconnect, its subscriber entry can linger. The 3s heartbeat is both
  keep-alive and liveness probe.

### Design heuristics (V2 test)

> **Client sugar over kind.** The V2 test for every new verb: does it need
> daemon enforcement, or is it client sugar over a structured `kind` value? If
> the latter, ship it; if the former, think hard. `kind: "invite"` is sugar;
> threading would be enforcement.

> **Mute is not a setting, it is a choice of transport.** A push consumer
> wanting quiet doesn't need a `mute` feature — they switch to `pull` on their
> own schedule. The daemon never knew they were muted; they just stopped picking
> up. The same primitives that enable cross-runtime consumption (pull, wait)
> collapse the mute feature out of existence.

> **Drive-by participant.** Episodic consumers (cron, per-turn agents) are
> intentionally invisible to `who` — they didn't subscribe, they only fetched.
> That's not a bug. The visibility model is "who is currently receiving," not
> "who has activity recently."

### Visibility model

| Verb                | Visible to `who`? | Why                                        |
| ------------------- | ----------------- | ------------------------------------------ |
| `tail --as <alias>` | Yes, continuously | Persistent connection; live receive.       |
| `wait --as <alias>` | Yes, while held   | Long-poll = tail with a deadline.          |
| `pull --since <id>` | No                | Fire-and-forget; no held connection.       |
| `send` only         | No                | Sending without subscribing is write-only. |

### Cross-runtime architecture

> **The JSONL log is the durable thing; SSE is a push-optimization.**

That collapses the cross-runtime story to a single sentence: any consumer that
can read a file or hit an HTTP endpoint can join. The specific pattern — push,
long-poll, episodic — is the runtime's concern, not the daemon's. The daemon's
complete contract is "messages land in the log in order, with monotonic ids; you
fetch them however you can."

### Multi-agent deliberation as a finding

The spike was started as "walkie-talkie between two agents." It turned out the
more interesting property is that the flat, amnesic, on-the- record channel is
what enables _several_ agents (no shared memory, no coordinator) to converge on
a coherent design. Three of the V2 framings ("client sugar over kind", the
visibility matrix, the consume-mode-per-runtime recipes) originated from one
agent and got refined by another over the course of the session. That's worth
calling out as a second framing: grapevine is not _just_ walkie-talkie, it's
deliberation infrastructure where the channel becomes a shared working memory
the participants can collectively author.

## Risks & Open Questions

- **Daemon lifecycle.** Daemon stays up until explicitly stopped. Worst case
  it's a tiny Bun process; not zero cost, but small. Idle auto-shutdown is in
  the Direction list.
- **Cold-start race.** Two CLI verbs spawning concurrently from cold can produce
  duplicate daemons (one becomes orphaned). Window is ~50–100ms. Lockfile fix
  queued.
- **Order guarantees.** Pub/sub is in-memory; concurrent sends race on POST
  arrival. JSONL append uses positional writes and ascending ids, so reader-side
  order is deterministic even if write-order isn't.
- **Channel-name typos still silent.** `send <typo>` doesn't fail, it opens a
  new channel and posts to it. The `warning: "channel has no subscribers"` field
  on the response is the only hint. Could be a stronger signal (e.g.
  `--require-existing`) in V2.

## Related Documents

- [grapevine skill](../../../plugins/toolbox/skills/grapevine/SKILL.md) — the
  operational doc: verb signatures, presence model, recipes, alias guidance,
  `--stdin` examples. Everything an agent _using_ grapevine needs.
- [agent-surface-bun recipe](../../../plugins/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md)
  — parent pattern. Grapevine inherits Bun + JSONL conventions but is
  multi-tenant (one daemon, many channels) where the recipe's references are
  per-session.
- [tuskboard skill](../../../plugins/toolbox/skills/tuskboard/SKILL.md) —
  closest sibling for the multi-agent join shape, though tuskboard's server is
  per-board where grapevine is per-machine.
- [digestify skill](../../../plugins/toolbox/skills/digestify/SKILL.md) —
  sibling on the agent-surface-bun pattern; one-shot review surface.
