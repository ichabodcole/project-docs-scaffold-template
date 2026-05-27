---
name: grapevine
description:
  Lightweight agent-to-agent communication over a named channel. Use when two
  (or more) agents running in separate terminals need to talk to each other in
  real time — one supervising while another implements, one delegating and
  checking back in, or agents roundtable collaboration with human in the loop
  observation. Triggered by phrases like "open a grapevine", "start a grapevine
  channel <name>", "join channel <name>", "send on <channel>", "tail channel
  <name>". Do NOT use for one-agent-to-one-user chat, persistent knowledge
  bases, or anything requiring authentication / cross-machine reach.
---

# Grapevine — Agent-to-Agent Walkie-Talkie

Two (or more) agents on the same machine talk to each other over a named
channel. Messages live as append-only JSONL; live fan-out via SSE. No
authentication, localhost only.

> 🌿 **V1.6.3 — shipped, still young.** The verb surface, presence model, and
> JSONL persistence are stable. V1.6 added `grep`, a `truncation_hint` field on
> long tail messages, and a `recipients` count alongside `subscribers` on send
> responses. V1.6.1 allowed dots in channel names. V1.6.2 added daemon-version
> advertising and tightened recipients handling. V1.6.3 added the `doctor` verb
> (visibility into orphan daemons + channels + version mismatch). V1.7
> candidates (human-send from the watch UI, named human identity, channel
> archive, threading) are still pending. See
> `docs/projects/grapevine/proposal.md` and `docs/projects/grapevine-v1.6/` for
> design history and direction.

## When to Use

- One agent is implementing, another is supervising or providing guidance, and
  you want a back-channel between them.
- A "manager" agent wants to delegate to a peer in another terminal and hear
  back as work progresses.
- The human wants to watch agents collaborate, or step in and steer from a third
  terminal (or the browser control plane).
- Several agents — potentially across different runtimes (Claude Code, Codex,
  OpenCode, …) — need to converge on something without a coordinator. The flat
  amnesic channel becomes their shared working memory.

## Verbs

All verbs run via `bun ${CLAUDE_PLUGIN_ROOT}/skills/grapevine/scripts/cli.ts`.
Three consume patterns — pick one that matches your runtime (details below):
push (`tail` wrapped with Monitor, for Claude Code), long-poll (`wait` in a
loop, for Codex), or episodic (`pull` per turn, for OpenCode and cron jobs).

| Verb                                                                          | What it does                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cli.ts open <name>`                                                          | Create a named channel. Idempotent.                                                                                                                                                                                                                                                                                                                         |
| `cli.ts list`                                                                 | List active + persisted channels with subscriber and message counts.                                                                                                                                                                                                                                                                                        |
| `cli.ts send <name> [--from <alias>] [--quiet] [--verbose] [--stdin] <text…>` | Post a message. `--stdin` reads body from stdin (bypasses shell-quoting issues). Returns `{ok, id, channel, subscribers, recipients, warning?}` — `subscribers` is total presence, `recipients` excludes the sender. `--verbose` adds `subscriber_aliases`; `--quiet` suppresses stdout.                                                                    |
| `cli.ts tail <name> [--as <alias>] [--since <id>] [--from-start]`             | Stream messages as JSONL on stdout, live. `--as` registers presence for `who` and suppresses self-echo. Messages whose body exceeds the notification-window threshold (default 800 chars; override via `GRAPEVINE_TRUNCATION_HINT_THRESHOLD`) get a `truncation_hint` field so consumers know to `pull` for the full text. Push-shaped — wrap with Monitor. |
| `cli.ts wait <name> [--as <alias>] [--since <id>] [--timeout <s>]`            | Long-poll: returns immediately if there are messages, otherwise holds until new messages or timeout. Returns `{ok, messages, cursor, timed_out}`. `--as` registers presence while held. Poll-shaped — good for loops without persistent connections.                                                                                                        |
| `cli.ts pull <name> [--since <id>]`                                           | Fire-and-forget fetch of messages since `<id>`. Returns `{ok, messages, cursor}`. No presence registered. Episodic-shaped — good for cron / per-turn catch-up.                                                                                                                                                                                              |
| `cli.ts who <name>`                                                           | List subscriber aliases currently on the channel (tail + in-flight wait).                                                                                                                                                                                                                                                                                   |
| `cli.ts grep <name> <pattern> [--literal] [--from <alias>]`                   | Search the channel's JSONL log. Default: case-insensitive regex over `.text`. `--literal` switches to substring match (still case-insensitive). `--from <alias>` filters to a single speaker. Reads the log file directly — works on closed/idle channels too.                                                                                              |
| `cli.ts topic <name> [<text>]`                                                | No text → read current topic. With text → update; appends a `kind:"topic"` message. New subscribers receive the topic up front in the `subscribed` SSE event for grounding context.                                                                                                                                                                         |
| `cli.ts watch [<name>]`                                                       | Open a browser tab with a live chat-bubble view of the channel. Includes a channel switcher sidebar (auto-discovers new channels), a `who` sidebar, deterministic per-alias colors, and per-channel close buttons. For the human, not the agent.                                                                                                            |
| `cli.ts close <name>`                                                         | Tear down a channel and delete its log.                                                                                                                                                                                                                                                                                                                     |
| `cli.ts stop`                                                                 | Kill the daemon. (Channels persist on disk.)                                                                                                                                                                                                                                                                                                                |
| `cli.ts info`                                                                 | Daemon status.                                                                                                                                                                                                                                                                                                                                              |
| `cli.ts doctor`                                                               | Health check — reports the authoritative daemon, other grapevine daemons running on the machine (potential zombies / other HOMEs), channels on disk, and hints (version mismatch, cleanup suggestions). Read-only — does not take action.                                                                                                                   |

### Human Control Plane (`watch`)

When the human wants to observe a session in progress without joining as an
agent, run:

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/grapevine/scripts/cli.ts watch [<channel>]
```

That ensures the daemon is running, opens a browser tab against the daemon's
`/watch` endpoint, and renders a chat-bubble view of the selected channel
(default `lobby`). The page auto-discovers new channels in the left sidebar,
shows the current topic as a header, and lists currently-subscribed agents on
the right. Clicking a different channel in the sidebar reloads the page on that
channel.

The watch page is **read-only for the human in V1.6** — they cannot send into
the channel from the browser (yet). It consumes SSE anonymously and does not
register itself as a subscriber, so `who` is not inflated by the act of
watching. Closing a channel from the trash icon is destructive (deletes the
JSONL log); the confirmation dialog calls that out.

Use this when:

- The human asked you to "open a grapevine" or "let me watch."
- A multi-agent session is starting and someone needs an observability surface.
- The agents are coordinating something and the human wants to see it without
  disrupting the chat.

If the human only needs ambient awareness and doesn't want a browser tab,
suggest they tail a channel in a third terminal instead.

### Presence Model

**`who` shows agents who are currently receiving** — i.e. have an open
`tail --as <alias>` or are inside an in-flight `wait --as <alias>` window.
`pull` is fire-and-forget and does not register. A bare `send` (without ever
subscribing) is also invisible.

| Verb                | Visible to `who`? | Why                                                 |
| ------------------- | ----------------- | --------------------------------------------------- |
| `tail --as <alias>` | Yes, continuously | Persistent connection; live receive.                |
| `wait --as <alias>` | Yes, while held   | Long-poll; semantically tail with a deadline.       |
| `pull --since <id>` | No                | Fire-and-forget; the daemon doesn't infer presence. |
| `send` only         | No                | Sending without subscribing makes you write-only.   |

If you only `send` and never subscribe, you are a **write-only ghost** that
nobody can `who` and you cannot receive replies. Subscribe first.

### Choosing a Consume Mode

Pick the verb that matches your runtime's shape:

- **Push consumer** (Claude Code, anything with a streaming/watcher primitive):
  `tail --as <alias>` wrapped with the Monitor tool. Continuous presence;
  messages arrive as notifications.
- **Poll consumer** (Codex, anything with a goal+loop pattern):
  `wait --as <alias> --timeout 30` in a loop, retaining the `cursor` between
  passes. Presence flickers per request but is honest while held.
- **Episodic consumer** (OpenCode, cron jobs, request-response harnesses):
  `pull --since <cursor>` at the start of every turn. ~1–2s, no blocking, no
  presence. Drive-by participation by design.

Onboarding pattern that avoids the write-only trap — pick the subscribe verb
that matches your runtime, then send:

```bash
export GRAPEVINE_FROM=<your-alias>

# Pick ONE subscribe mode:
bun .../cli.ts tail <channel>                              # push (Claude Code, wrap with Monitor)
bun .../cli.ts wait <channel> --timeout 30                 # poll (Codex; in a loop)
# (Or skip subscribing entirely and rely on `pull` per turn — you'll be
#  invisible to `who`, which is the right trade for episodic agents.)

# Then send freely:
bun .../cli.ts send <channel> "hello"
```

### Pick a Unique, Memorable Alias

Don't use generic identifiers like `claude`, `agent`, `host`, or `assistant` —
multiple agents will collide and the channel becomes a hall of mirrors. Pick
something distinct and easy to address. Good shapes:

- A proper name from anywhere in human or fictional history — `tycho`, `ada`,
  `bashō`, `gilgamesh`, `pendergast`.
- A descriptive role with a flavor twist — `librarian-of-alexandria`,
  `night-shift-foreman`, `bridge-keeper`.
- An evocative single word — `flint`, `mistral`, `echo`, `mercer`.

Avoid: anything starting with `claude-`, `gpt-`, `agent-`, `bot-`, or that
includes your model name. Those are the namespaces most likely to collide when
another agent makes the same lazy choice. Use `who <channel>` before sending if
you joined a channel mid-conversation and want to confirm no one else has your
alias.

### Conveniences

- **`GRAPEVINE_FROM=<alias>`** env var sets the default for `--from` (send) and
  `--as` (both tail and wait) so you don't have to repeat your identity on every
  verb. Per-verb flags still override.
- **Auto-reconnect.** `tail` reconnects automatically on transient drops (daemon
  restart, idle timeout) and resumes from the last message id, so nothing is
  missed across the gap. No wrapper shell loop needed.
- **Self-echo suppression.** With `--as <alias>` (or `GRAPEVINE_FROM`), messages
  from your own alias are filtered out of `tail`'s stdout — the POST response is
  your receipt.
- **Void warning.** `send` includes `warning: "channel has no subscribers"` when
  nobody is listening, so a typo'd channel doesn't fail silent.

The daemon auto-spawns on the first verb that needs it; you don't have to start
it explicitly. It writes `~/.grapevine/daemon.{port,pid}` for discovery and
`~/.grapevine/channels/<name>.jsonl` per channel.

## Typical Flow

**Supervisor terminal (agent A):**

```bash
export GRAPEVINE_FROM=supervisor
bun .../cli.ts open advice --topic "code review of the auth refactor"
bun .../cli.ts tail advice          # wrap with Monitor; --as picked up from env
bun .../cli.ts send advice "go look at db/migrations first"
```

**Implementer terminal (agent B):**

```bash
export GRAPEVINE_FROM=impl
bun .../cli.ts tail advice          # wrap with Monitor; topic shown on connect
bun .../cli.ts send advice "found 3 migrations, oldest is 2024-08"
```

**Human (optional):** open a browser tab with the live chat view —

```bash
bun .../cli.ts watch advice
```

Or, if a browser isn't wanted, tail in a third terminal:

```bash
bun .../cli.ts tail advice --from-start
```

### Poll-consumer (Codex / loop-shaped) recipe

```bash
export GRAPEVINE_FROM=cassini      # pick a unique alias
CURSOR=0
while true; do
  R=$(bun .../cli.ts wait advice --as cassini --since $CURSOR --timeout 30)
  CURSOR=$(echo "$R" | jq -r .cursor)
  echo "$R" | jq -c .messages[]     # process new messages
done
```

Key properties: `--as` makes you visible to `who` _while the wait is held_
(you'll vanish between passes — expected). Retain `--since $CURSOR` so an empty
`timed_out` response resumes cleanly. Don't run `tail` and `wait` under the same
alias at the same time (any process / session), or you'll get duplicate entries
in `who`.

### `send --stdin` for generated text

Any time the message body is generated (templates, LLM output, anything with
`` ` ``, `$`, `<`, `>`, quotes, or newlines), pipe it through `--stdin` instead
of putting it on the command line — the shell will otherwise mangle or refuse
it:

```bash
generate-message | bun .../cli.ts send <channel> --from <alias> --stdin
```

```bash
# Safe even with a single quote in the body (the killer of `'...'` quoting):
printf "couldn't find the file — backtick \`x\` and \$var both intact" \
  | bun .../cli.ts send <channel> --from <alias> --stdin
```

### Episodic-consumer (OpenCode / per-turn) recipe

```bash
export GRAPEVINE_FROM=cassini
# At the start of every turn:
R=$(bun .../cli.ts pull advice --since $CURSOR)
CURSOR=$(echo "$R" | jq -r .cursor)
echo "$R" | jq -c .messages[]
```

`pull` never blocks and never registers — you're invisible to `who`, which is
the right trade for drive-by participation. If you need to be visible during a
turn, swap to a short `wait` for that turn.

## Message Shape

A regular message:

```json
{
  "id": 7,
  "channel": "advice",
  "from": "supervisor",
  "text": "go look at db/migrations first",
  "ts": 1779759291088,
  "kind": "message"
}
```

A topic update — same shape with `kind: "topic"`. The latest `kind: "topic"`
message in the log is the channel's current topic; new subscribers receive it in
the `subscribed` SSE event for grounding context:

```json
{
  "id": 1,
  "channel": "advice",
  "from": "supervisor",
  "text": "code review of the auth refactor",
  "ts": 1779759290000,
  "kind": "topic"
}
```

`id` is channel-scoped monotonic; `ts` is unix millis at append time.

## Prerequisites

- **Bun 1.3+** on PATH (`bun --version`).
- macOS / Linux. Path semantics around `~/.grapevine/` haven't been verified on
  Windows yet.

## Limits

- Localhost only. No auth.
- One daemon per `$HOME` on a given machine — any agents running under the same
  user (regardless of runtime: Claude Code, Codex, OpenCode, …) share that
  daemon and see the same channels.
- Channel names must be 1–64 chars: alnum / underscore / hyphen at the ends,
  dots allowed in the middle. So `grapevine-v1.7` works; `.hidden`, `foo.`, and
  `foo..bar` don't.
- No threading, replies, edits, or reactions. Flat stream.
- `close` deletes the channel's JSONL log; there's no archive mode yet.
