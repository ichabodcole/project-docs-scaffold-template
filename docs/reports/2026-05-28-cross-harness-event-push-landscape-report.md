# Cross-Harness Event/Push Landscape for AI Coding Agents

**Date:** 2026-05-28 **Author:** Research pass (deep-research harness — 105
agents, 22 sources fetched, 78 claims extracted, 25 verified, 20 confirmed)
**Scope:** Claude Code, OpenCode, MCP, A2A, Claude Squad (Pass 1); OpenHands,
Gemini CLI, Aider, Roo Code, + MCP client matrix (Pass 2). Goose, Codex CLI,
Cursor, Cline, Amp, Pi remain unsubstantiated. **Status:** Complete (2 passes).
Pass 2 appended below.

---

## Question

Which AI coding agent harnesses (besides Claude Code) support an event-driven
"monitor"/push mechanism — where a background process or daemon emits events
that the agent receives and responds to in real time, **without** requiring a
polling loop or scheduled check-in?

Claude Code calls this its **Monitor** capability (it re-invokes the agent when
a watched stream/file/process emits an event). For each harness: (1) does it
support agent-facing event subscription / push without polling? (2) what is the
mechanism? (3) can it be used for asynchronous agent-to-agent or
human-operator-to-agent real-time signaling across harnesses?

**End goal:** mix agents from different harnesses together over a shared
event/notification substrate.

---

## The discriminator that matters

There are three escalating tiers. Most tools that _sound_ event-driven only
reach the lower two.

| Tier | Capability                                                                                                       | Who has it                      |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1    | **React to my own actions** — hooks fire on the agent's own tool-use / lifecycle                                 | Most harnesses with "hooks"     |
| 2    | **Subscribe to external events** — agent can observe a file/stream/bus changing (file-watch, SSE)                | OpenCode (and likely others)    |
| 3    | **Push into a running agent + re-wake it** — an external event injects content into the loop and wakes the agent | **Claude Code only (verified)** |

The Monitor capability is tier 3. Tier 2 ≠ tier 3: a harness can _receive_ an
event yet still require the agent to be actively looking, and cannot be _woken_
from outside.

---

## Executive summary

- **Only Claude Code and OpenCode** have documented, harness-native event
  mechanisms that push without polling — and they sit at very different maturity
  levels.
- **The real cross-harness substrate is not inside any single harness.** It is
  two open protocols: **MCP** (agent ↔ tool/resource-server direction) and
  **A2A** (agent ↔ agent direction). These are the actual answer to "how do I
  mix agents across harnesses."
- **Multi-agent session managers** like Claude Squad provide **no** event/push
  substrate — they isolate agents via tmux + git worktrees with a human in the
  loop.

> ⚠️ **Coverage caveat:** the verified claim set in this pass only adjudicated
> **Claude Code, OpenCode, MCP, A2A, and Claude Squad**. The other named
> harnesses — **OpenHands, Pi, OpenAI Codex/Codex CLI, Aider, Cursor, Cline/Roo,
> Gemini CLI, Amp, Goose (Block)** — were searched but did not survive into
> verified findings. No conclusion (positive or negative) should be drawn about
> them from this pass. They are the subject of Pass 2.

---

## Verified findings

### Claude Code — most complete (tier 3) ✅ _(high confidence)_

The only surveyed harness with a true push-into-a-running-agent mechanism. Two
pieces:

- **`async` / `asyncRewake` hooks** — run in the background and **wake the model
  when the hook exits with code 2**. This is the re-invocation-without-polling
  primitive — a push-style signal into an already-running agent. Announced
  2026-01-25, shipping in Claude Code 2.1.x.
- **External / async event sources** beyond the agent's own actions:
  `FileChanged` (native FSEvents on macOS, inotify on Linux — explicitly
  "without any polling overhead"), `CwdChanged`, `ConfigChange`,
  `WorktreeCreate/Remove`, a standalone `Notification` event, and
  agent-coordination events `SubagentStart/Stop`, `TeammateIdle`, `TaskCreated`,
  `TaskCompleted`.

**Caveats:** very new; carries a known rendering bug (issue #44881) and is
reportedly not supported in the VSCode extension yet.

**Sources:** docs.anthropic.com/en/docs/claude-code/hooks ·
code.claude.com/docs/en/hooks · anthropics/claude-code issues #44881, #23545,
#27276

### OpenCode — subscribe-side only (tier 2) ⚠️ _(high confidence)_

The closest competitor, but with a critical asymmetry: it can **receive but not
emit**, and there is no supported way to wake a session from outside.

- Plugins (JS/TS modules) export an `event` hook — a catch-all receiving every
  event from a fixed catalog of **~27 lifecycle/interaction events**
  (`session.created/idle/compacted/deleted`, `file.edited`,
  `file.watcher.updated`, `tool.execute.before/after`, `permission.asked`,
  `server.connected`). Documented example runs `osascript` on `session.idle`.
- The headless server exposes **`GET /event` as a Server-Sent Events stream**
  (first event `server.connected`, then bus events) — genuine push, not polling.
- **Crucially:** the docs describe **no API to publish/emit custom events** and
  **no `POST /event` injection endpoint**. It is a purely subscribe-side
  extension model. OpenCode consumes a bus; it cannot be driven by one.

**Sources:** opencode.ai/docs/plugins/ · opencode.ai/docs/server/

### Claude Squad — no substrate at all ❌ _(high confidence)_

Worth flagging because it is the obvious "mix Claude Code + Codex + Gemini +
Aider" tool. It is a **session manager, not an orchestrator**: tmux for isolated
terminals, git worktrees per branch, human-in-the-loop. No event bus, daemon,
MCP, webhook, or inter-agent channel. Each task runs independently in its own
worktree; inter-agent communication is not supported natively (you would bolt
your own substrate _inside_ each agent).

**Sources:** github.com/smtg-ai/claude-squad · DeepWiki: smtg-ai/claude-squad
architecture

---

## The cross-harness answer: protocols, not harnesses

### A2A (Agent2Agent) — strongest fit for agent ↔ agent ✅ _(high confidence)_

Open, vendor-neutral protocol (Google, Apr 2025 → donated to Linux Foundation
Jun 2025; 150+ orgs). Designed exactly for **opaque agents on different
frameworks** talking without sharing internal memory/logic. Two polling-free
mechanisms:

- **Webhook push notifications** — the client registers a
  `PushNotificationConfig` (HTTPS webhook URL + optional token/auth) via the
  initial `SendMessage` or `tasks/pushNotificationConfig/set`; the server then
  makes authenticated HTTP POSTs to that webhook on significant state changes
  (terminal, input-required, auth-required). Built explicitly for long-running
  tasks and clients (serverless/mobile) that cannot hold persistent connections
  — eliminates polling.
- **SSE streaming** — `message/stream` (with `capabilities.streaming: true`)
  pushes `TaskStatusUpdateEvent` / `TaskArtifactUpdateEvent` in real time.

Both are **optional, advertised** capabilities (in the Agent Card); the receiver
must operate a reachable webhook. Note: exact RPC method names have drifted
across spec versions (`tasks/pushNotification/set` vs
`tasks/pushNotificationConfig/set` vs `CreateTaskPushNotificationConfig`).

**Sources:** github.com/a2aproject/A2A ·
a2a-protocol.org/latest/topics/push-notifications/ ·
a2a-protocol.org/latest/topics/streaming-and-async/

### MCP (Model Context Protocol) — push for the tool/resource direction ✅ _(high confidence)_

- **Resource subscriptions:** `resources/subscribe` (params `{uri}`) → on change
  the server sends an unsolicited JSON-RPC notification
  `notifications/resources/updated` carrying the URI (no id, no response — a
  push). Delivery rides the transport's server→client channel (SSE for
  Streamable HTTP, the server's stdout for stdio).
- **Sampling:** `sampling/createMessage` is a server-initiated request to the
  client that returns an LLM completion — inverts the normal flow direction,
  letting a server _drive_ the agent.

**Big caveat:** both are optional capabilities (server declares
`resources.subscribe: true`; client declares sampling support, often
human-gated), and **real-world client adoption is thin** (e.g., Claude Desktop
reportedly does not support resource subscriptions; a python-sdk bug reportedly
drops subscribe updates). Spec-level capability overstates turnkey availability
in any given harness.

**Sources:** modelcontextprotocol.io/specification/2025-06-18/server/resources ·
.../2025-03-26/server/utilities/notifications ·
modelcontextprotocol.io/docs/learn/client-concepts

---

## Architectural implication

For mixing agents across harnesses, the pattern the research points to:

> **An A2A webhook hub as the shared substrate**, with harness-specific adapters
> on each side. Claude Code participates as a first-class node (asyncRewake
> hooks turn an inbound webhook into a re-wake). OpenCode can _consume_ (SSE
> plugin) but needs a shim to be _woken_ from outside. Human-operator → agent
> signaling fits the same model — your app POSTs to the hub, the hub fans out to
> each agent's adapter.

The asymmetry to design around: **receiving an external event and re-waking on
it are two separate capabilities.** Claude Code is currently the only verified
harness that cleanly does both.

---

## Open questions (carried into Pass 2)

1. Do the uncovered harnesses (OpenHands, Codex CLI, Aider, Cursor, Cline/Roo,
   Gemini CLI, Amp, Goose, Pi) expose any agent-facing event subscription or
   push mechanism, and via what transport (hooks, MCP client support,
   daemon/IPC, file watch, webhooks)? Partial signal that did **not** reach
   verification: Goose has a scheduler; Aider has a `--watch` mode; OpenHands
   has an event-stream backend.
2. Can OpenCode's subscribe-only model be bridged to a shared bus in practice (a
   plugin that consumes `GET /event` SSE and re-POSTs to an external substrate),
   and is there any supported way to inject external events back _into_ an
   OpenCode session to re-invoke the agent?
3. Which of these harnesses act as MCP **clients** that actually implement the
   optional resource subscriptions and/or sampling (the capabilities needed to
   receive server pushes), versus only supporting tool calls?
4. Most practical concrete architecture for mixing agents across harnesses
   today, and the authentication/reachability constraints for each adapter.

---

## Methodology & reliability

- **Harness:** deep-research (fan-out web search → fetch → adversarial 3-vote
  verification → synthesis).
- **Stats:** 6 angles · 22 sources fetched · 78 claims extracted · 25 verified ·
  20 confirmed · 5 killed.
- **Reliability:** high overall — findings rest on primary vendor docs and
  official protocol specs. The only split votes (resolved in favor 2-1,
  corroborated by primary sources) were OpenCode's plugin-hook framing, Claude
  Code's external-event catalog, and A2A's webhook-push config.
- **Killed claims** (did not survive verification): the assertion that Claude
  Code hooks are _purely_ reactive (refuted — async re-wake exists); an
  over-narrow reading of the MCP client extension matrix; an over-specified A2A
  webhook payload shape; and an over-strong "Claude Squad has nothing" phrasing
  (the nuanced version survived).
- **Minor nuance:** for MCP stdio, push is delivered over the server's
  **stdout** (not stdin).

### Source list (primary unless noted)

| URL                                                                             | Quality   | Angle                        |
| ------------------------------------------------------------------------------- | --------- | ---------------------------- |
| opencode.ai/docs/plugins/                                                       | primary   | per-harness capabilities     |
| opencode.ai/docs/server/                                                        | primary   | daemon/background triggers   |
| opencode.ai/docs/                                                               | primary   | polling vs event-driven gaps |
| docs.anthropic.com/en/docs/claude-code/hooks                                    | primary   | mechanism                    |
| github.com/openai/codex/blob/main/docs/config.md                                | primary   | per-harness capabilities     |
| block.github.io/goose/docs/guides/scheduling-agents/                            | secondary | mechanism                    |
| aider.chat/docs/usage/watch.html                                                | primary   | daemon/background triggers   |
| docs.all-hands.dev/usage/architecture/backend                                   | primary   | polling vs event-driven gaps |
| modelcontextprotocol.io/specification/2025-06-18/server/resources               | primary   | MCP substrate                |
| modelcontextprotocol.io/specification/2025-03-26/server/utilities/notifications | primary   | MCP substrate                |
| modelcontextprotocol.io/docs/learn/client-concepts                              | primary   | MCP substrate                |
| modelcontextprotocol.io/clients                                                 | primary   | MCP substrate                |
| modelcontextprotocol.io/docs/concepts/resources                                 | primary   | polling vs event-driven gaps |
| github.com/a2aproject/A2A                                                       | primary   | agent-to-agent interop       |
| a2a-protocol.org/latest/topics/push-notifications/                              | primary   | agent-to-agent interop       |
| a2a-protocol.org/latest/topics/streaming-and-async/                             | primary   | agent-to-agent interop       |
| cloud.google.com/blog/.../agent2agent-protocol-is-getting-an-upgrade            | primary   | agent-to-agent interop       |
| github.com/smtg-ai/claude-squad                                                 | primary   | agent-to-agent interop       |

---

# Pass 2 — Remaining harnesses

**Date:** 2026-05-28 **Method:** deep-research harness — 106 agents, 24 sources
fetched, 110 claims extracted, 25 verified, 23 confirmed, 2 killed. **Targets:**
OpenHands, Goose, Aider, OpenAI Codex / Codex CLI, Gemini CLI, Cursor, Cline,
Roo Code, Amp, Pi.

## Headline

**None of the eleven harnesses has a documented, first-party Tier 3 ("true
Monitor") mechanism** — no external process, daemon, file change, or other agent
can push an event that _wakes/re-invokes a dormant agent loop from outside_. The
best verified mechanisms are **observe-only (Tier 2)** and require the agent to
already be running and watching.

The MCP path that _would_ enable a standardized cross-harness external wake —
server-initiated `sampling/createMessage`, plus optional resource subscriptions
— is **defined in the spec but essentially unimplemented across coding-agent
clients**. Per the official `modelcontextprotocol.io/clients` matrix, only
`fast-agent` (full) and `mcp-agent` (partial) implement Sampling; **Goose,
Cline, Cursor, Continue, Roo Code, Cody, and Claude Code all show ❌**. Roo
Code's own tracker confirms Sampling is an uncommitted feature request. **A
shared cross-harness wake substrate over MCP sampling is therefore not
realizable today with these clients.**

> ⚠️ **Coverage is uneven.** Surviving verified claims cover only **OpenHands,
> Gemini CLI, Aider, Roo Code, and the MCP client matrix**. **Goose, Codex /
> Codex CLI, Cursor, Cline, Amp, and Pi were NOT individually substantiated** by
> any surviving claim — _absence here means "not verified," not "no
> capability."_ Tiers are scoped to the specific mechanism verified (a harness's
> hooks subsystem being Tier 1 does not preclude another subsystem reaching Tier
> 2).

## Verified findings

### Aider — Tier 2 (file watcher) ✅ _(high confidence)_

`--watch-files` watches the whole repo via the **watchfiles** library (Rust
`notify` backend = OS-level inotify/FSEvents/ReadDirectoryChangesW —
event-driven, _not_ agent polling) in a background daemon thread, and acts only
on files containing `AI!`/`ai!` (make changes), `AI?`/`ai?` (answer), or plain
`ai` (context) comment markers. Verified at source level (`class FileWatcher`,
`from watchfiles import watch`, `self.io.interrupt_input()`). **But aider must
already be running and watching**; an external edit triggers a reaction _within
the live process_ — it does not re-invoke or wake a stopped agent. _Sources:_
aider.chat/docs/usage/watch.html ·
github.com/Aider-AI/aider/blob/main/aider/watch.py

### OpenHands — Tier 2 (in-process event bus) ✅ _(high confidence)_

- **Hooks subsystem is Tier 1:** six events (`PreToolUse`, `PostToolUse`,
  `UserPromptSubmit`, `Stop`, `SessionStart`, `SessionEnd`), all tied to the
  agent's own lifecycle; reactive shell scripts, no external trigger. Explicitly
  Claude-Code-compatible. _Source:_
  docs.openhands.dev/openhands/usage/customization/hooks
- **EventStream / SDK callbacks are Tier 2:** source confirms
  `class EventStream(EventStreamSubscriber)` — a real pub/sub bus. The SDK
  `Conversation` accepts a `callbacks` param and exposes
  `conversation.event_stream.subscribe(...)` — an observer pattern, not polling.
  **Crucial caveat:** these callbacks fire _in-process within the SDK's own
  conversation runtime_ — Tier 2, not an external push that wakes a dormant
  agent. _Sources:_ docs.openhands.dev/sdk/arch/events ·
  All-Hands-AI/OpenHands/openhands/events/stream.py
- The official Events architecture page describes the Events→Services edge as
  **read-only** observers, with no inject/feedback path. **Scope caveat:**
  OpenHands separately ships a WebSocket/EventStream runtime elsewhere in the
  codebase, so page-silence is _not_ proof it cannot be externally driven. The
  specific claim of an external `POST /webhooks/events/{conversation_id}`
  ingress was **refuted 1-2 — unresolved.**

### Gemini CLI — Tier 1 (own-lifecycle hooks) ✅ _(high confidence)_

All 11 documented hook events (`BeforeTool`, `AfterTool`, `BeforeAgent`,
`AfterAgent`, `BeforeModel`, `BeforeToolSelection`, `AfterModel`,
`SessionStart`, `SessionEnd`, `Notification`, `PreCompress`) fire from the CLI's
own lifecycle and run synchronously within the agent turn. No external process
can trigger them; no wake path. A mirror of Claude Code's hook model. _Source:_
google-gemini.github.io/gemini-cli/docs/cli/hooks.html

### MCP client matrix — the would-be substrate is unimplemented ✅ _(high confidence)_

Sampling (`sampling/createMessage`) is the server-initiated direction that could
wake a client agent. Per the official matrix it is implemented only by
`fast-agent` (full) and `mcp-agent` (partial); Goose, Cline, Cursor, Continue,
Roo Code, Cody, and Claude Code show ❌ (this matrix claim was the one 2-1 split
in the pass). **Roo Code's Sampling-absence is separately confirmed 3-0** via
its own issue #5372 — an open, uncommitted feature request where sampling
attempts error server-side, not a shipped capability. _Sources:_
modelcontextprotocol.io/clients ·
github.com/modelcontextprotocol/.../clients.mdx ·
github.com/RooCodeInc/Roo-Code/issues/5372

## Consolidated tier table (all 15 harnesses, both passes)

| Harness            | Tier     | Mechanism                                                                                                                           | Can be woken from outside?                        |
| ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Claude Code**    | **3** ✅ | `async`/`asyncRewake` hooks (wake on exit code 2) + external event sources (`FileChanged`, `Notification`, `TeammateIdle`, `Task*`) | **Yes** (only verified harness)                   |
| OpenCode           | 2        | Plugin `event` hook (~27 lifecycle events) + `GET /event` SSE                                                                       | No — receives, cannot be injected/woken           |
| OpenHands          | 2        | EventStream pub/sub + SDK `callbacks` (in-process); hooks = Tier 1                                                                  | No (in-process only; external ingress unresolved) |
| Aider              | 2        | `--watch-files` (watchfiles / OS notify) on `AI!`/`AI?` markers                                                                     | No — reacts while running                         |
| Gemini CLI         | 1        | Own-lifecycle hooks (11 events)                                                                                                     | No                                                |
| Claude Squad       | 0        | None (tmux + git worktrees, human-in-loop)                                                                                          | No                                                |
| Goose              | ?        | Scheduler reported but **unverified**; Sampling ❌ in matrix                                                                        | Unknown                                           |
| Codex / Codex CLI  | ?        | Unsubstantiated this pass                                                                                                           | Unknown                                           |
| Cursor             | ?        | Unsubstantiated; Sampling ❌ in matrix                                                                                              | Unknown                                           |
| Cline              | ?        | Unsubstantiated; Sampling ❌ in matrix                                                                                              | Unknown                                           |
| Roo Code           | 1\*      | Sampling **not** implemented (refuted); hooks-style only                                                                            | No                                                |
| Amp                | ?        | Unsubstantiated this pass                                                                                                           | Unknown                                           |
| Pi                 | ?        | Unsubstantiated this pass                                                                                                           | Unknown                                           |
| **MCP** (protocol) | —        | `resources/subscribe` → `notifications/resources/updated`; `sampling/createMessage`                                                 | Spec yes; **client adoption ~nil**                |
| **A2A** (protocol) | —        | Webhook push (`PushNotificationConfig`) + SSE streaming                                                                             | **Yes, by design** (receiver runs a webhook)      |

\* Roo Code tier reflects only the verified Sampling-absence; its broader hook
surface wasn't fully adjudicated.

## What this means for the end goal

1. **Claude Code remains the only verified Tier 3 node.** It is the natural
   "hub-attached" agent — an inbound webhook/event turns into a re-wake via
   `asyncRewake`.
2. **The cross-harness wake substrate cannot ride MCP sampling today** — the
   clients don't implement it. **A2A webhooks** remain the only protocol-level
   mechanism actually designed for (and capable of) external push, but each
   non-Claude harness needs a **custom adapter** to convert an inbound signal
   into agent action.
3. **The practical "wake" pattern for Tier 2 harnesses is to simulate Tier 3
   with a supervisor:**
   - _Aider:_ an external daemon writes an `AI!` marker into a watched file →
     live aider reacts.
   - _OpenHands:_ a supervisor process pushes into the EventStream (in-process),
     or drive it via its WebSocket runtime (needs verification).
   - Both require the agent to be **already running** — you manage liveness
     externally, not wake from cold.

## Open questions (still unresolved)

1. **Goose:** does its scheduler accept _external_ triggers, or is it
   cron/interval self-polling? (Unverified.)
2. **OpenHands:** is there a real external ingress (WebSocket / REST action /
   webhook) that injects into a live conversation's EventStream from outside the
   process? (Webhook-ingress claim refuted 1-2 — unresolved.) Can SDK callbacks
   be driven by events originating outside the SDK process?
3. **Codex CLI, Cursor, Cline, Amp, Pi:** do any expose _any_
   external-trigger/wake mechanism? None substantiated this pass.
4. Will any major coding-agent MCP client ship Sampling and/or resource
   subscriptions — the thing that would unlock a standardized cross-harness
   external-wake substrate?

## Pass 2 reliability notes

- **Killed (2 of 25 verified):** (a) the claim that Goose's MCP-client row is ❌
  across Resources/Prompts/Sampling/Roots was refuted **0-3** — so Goose's exact
  MCP capabilities are _unresolved_, not established; (b) the claim that
  OpenHands exposes an external `POST /webhooks/events/{conversation_id}`
  ingress was refuted **1-2** — undecided, neither confirmed nor disproven. Both
  are open questions, not settled facts.
- A **community matrix** (apify/mcp-client-capabilities) conflicts with the
  official table, listing Codex and AmpCode as sampling-capable. Not relied on
  here — flagged for primary-source check.
- The MCP client matrix is a **fast-moving page** — capability ticks can change
  between releases.
- No primary-source confirmation was obtained for Goose's scheduler, Codex CLI,
  Cursor, Cline, Amp, or Pi. A Pass 3 targeting just these six (with GitHub
  repo/README/source-level digging rather than docs-site search) would close the
  remaining gaps.
