# Architectural Review — Tusk Board

## Verdict

The Tusk Board is a well-executed first duplex surface. The JSON-lines stdio
contract is clean, the state-mutation helpers in `server.ts` are correct and
tested-friendly, and the file-mediated transport in `bg.ts` is a pragmatic
solution to a real constraint. The three-script split is approximately right,
but it carries a hidden duplication cost that will compound as the recipe
generalizes. The most pressing concern is not a bug — it is that `bg.ts` is a
wrapper of a wrapper, and the monitored path has no way to recover if `bg.ts`
itself is killed mid-session. That brittleness is invisible until it breaks in a
real user session.

## Strengths

- **Single source of truth is clear and well-enforced.** `server.ts` holds
  canonical state; browsers and joiners are read-only consumers. The
  `applyTask*` helpers (`server.ts:186-234`) guard invalid status values quietly
  and handle all mutation — nothing mutates `state.tasks` outside them.
- **Protocol types are co-located with logic.** `AgentMsg`, `ServerToAgentMsg`,
  and `BrowserMsg` are all at the top of `server.ts` (`lines 60-88`). Anyone
  reading the file sees the contract before any implementation. This is the
  right pattern and should be mandated in the recipe.
- **EPIPE handling is consistent.** Both `server.ts:144-150` and `join.ts:53-59`
  wrap stdout writes with `EPIPE` guards. This is a Bun gotcha the recipe
  already documents, and the implementation follows through.
- **Session discovery is practical.** The tmpdir `tuskboard-<id>.json` +
  `tuskboard-latest.json` pattern (`server.ts:406-429`) makes the most common
  join case (same machine, recent board) zero-configuration while still allowing
  explicit `--url`/`--id` overrides.
- **Sliding-window idle timeout applies consistently.** Every activity path —
  agent stdin, browser WS message, joiner stdin — calls `touch()`. Abandoned
  sessions exit cleanly.
- **`bg.ts` file-paths are overridable.** The `--events-file`/`--cmds-file`
  flags (`bg.ts:53-54`) exist for tests. That's good foresight; integration
  tests that want deterministic paths don't have to parse stdout.

## Concerns

**1. `bg.ts` crash orphans a live board with no recovery path. (Severity:
high)** `bg.ts` is the only process that (a) holds `server.ts`'s stdin open and
(b) tails the cmds file. If `bg.ts` is killed — SIGKILL, OOM, watchdog timeout —
`server.ts` continues running (the WS server stays up, the browser board is
still live) but the agent loses all ability to send commands. The events file
keeps growing but nobody is reading it. There is no reconnect primitive. The
only recovery is the user closing the tab, which eventually triggers the idle
timeout. For a "long-lived board the agent reacts to in near real time," this is
a meaningful gap.

**2. 250ms polling loop is fine today, may not stay fine. (Severity: medium)**
The commands pump in `bg.ts:181-215` polls `statSync` every 250ms. For a single
board on a laptop this is negligible. Once this pattern generalizes to multiple
concurrent surfaces (the recipe explicitly anticipates comparison views, live
editors, configurators), you have N×4 `statSync` calls per second where N is
open surfaces. A `fs.watch`/`fs.watchFile` approach — or, better, a named pipe —
would be edge-triggered and zero-overhead when idle. The file-polling loop is a
latency floor as well: average command latency is 125ms, worst case 250ms. For a
task board that is acceptable; for a live editor responding to keystrokes it is
not.

**3. Protocol asymmetry between host and joiner is unjustified and will create
bugs. (Severity: medium)** The host's stdout emits bare event types
(`{"type":"task.toggle", ...}`). The joiner's stdout wraps everything incoming
as `{"type":"event", "payload":{...}}` (`join.ts:182-183`). The SKILL.md notes
this is "the only protocol asymmetry" and calls it justified because it makes
bookend events trivially distinguishable. That is a weak justification. The two
agents writing handlers against this protocol will diverge: a helper function
valid for a host agent cannot be reused by a joiner agent without an unwrap
step. If the recipe ever produces a "monitored joiner" variant — a background
joiner that reacts to events via `Monitor` — the asymmetry doubles the surface
area of that code. The cleaner design is a uniform envelope: every outbound
event from any of the three scripts has the same shape, with a
`role: "host" | "joiner"` discriminant if the agent needs it.

**4. `task.move` broadcasts `init` to all clients, not a diff. (Severity:
medium)** When a drag completes, `server.ts:346` broadcasts
`{"type":"init", title, tasks: [...]}` — the full task list — to every connected
WebSocket. For 10 tasks this is immaterial. For 200 tasks with 5 concurrent
participants (a plausible future board) this is a lot of unnecessary wire
traffic per drag. A `{"type":"task.move", id, status, index}` broadcast would be
smaller and let each client do the same `applyTaskMove` call the server already
does. The state-mutation helpers are already exported (`server.ts:482-484`), so
the browser could import them if the template were a `.ts` file — though it
isn't, which is why the broadcast-init shortcut was taken. This is a known
tradeoff but worth naming explicitly as debt.

**5. `join.ts` idle timeout fires `reason: "server_closed"` when it should say
`"timeout"`. (Severity: low)** `join.ts:229-233` resolves with
`reason: "server_closed"` when the idle timer fires. The agent reading that
event has no way to distinguish a real server teardown from a joiner-side idle
expiry without checking wall time. The reason should be `"timeout"` to match the
host's exit code 124 semantics.

**6. `bg.ts` emits the meta line before `server.ts` has written its discovery
files. (Severity: low)** `bg.ts:108-123` emits the meta JSON to stdout and to
the events file immediately after receiving the `ready` line. `server.ts` writes
its discovery files at `server.ts:409-417`, also immediately after emitting
`ready`. Because these are in separate processes with no synchronization
barrier, a joining agent that reads the `meta` line and immediately calls
`join.ts` with `--id` could hit the tmpdir lookup before `server.ts` has written
the file. In practice the race window is microseconds, but it is a correctness
hazard worth a comment.

## Recommendations

1. **Give `bg.ts` a reconnect or watchdog path.** The simplest fix is making
   `server.ts` accept an optional `--cmds-file` and `--events-file` flag, so a
   restarted `bg.ts` can re-attach to a running server by pointing at the same
   files. Alternatively, replace the file-poll approach with a Unix domain
   socket that `server.ts` owns; `bg.ts` connects to it and can reconnect if it
   crashes.

2. **Replace file-polling with `fs.watch` or a named pipe.** Switch `bg.ts`'s
   commands pump to use `fs.watch` on the cmds file. This eliminates the 250ms
   latency floor and the constant-overhead polling, and makes the pattern scale
   when the recipe grows to multi-surface scenarios.

3. **Unify the event envelope across all three scripts.** Pick one shape — for
   example `{"type": "event", "name": "task.toggle", "payload": {...}}` for all
   observable events and keep `{"type": "joined"}` / `{"type": "disconnected"}`
   / `{"type": "ready"}` as lifecycle messages. Apply it to host, joiner, and
   the monitored events file. Agent code becomes portable across roles.

4. **Fix the joiner idle timeout reason string** from `"server_closed"` to
   `"timeout"` at `join.ts:232`.

5. **Add a brief synchronization comment at `bg.ts:108`** noting the
   discovery-file race and that in practice it is benign because `server.ts`
   writes synchronously via `writeFileSync` before yielding.

## Open Questions

- **What is the intended behavior when two agents both try to `init` on the same
  board?** The SKILL.md says "`init` resets the list," and joiners cannot call
  it — but nothing stops a monitored host agent from sending `init` in response
  to a user event, potentially clobbering in-progress user edits. Is there a
  guard planned, or is this by convention only?
- **Is the recipe's generalization story blocked on resolving the `bg.ts`
  reconnect gap, or is the plan to document the limitation and ship?** The
  recipe RECIPE.md lists "persistence across sessions" as explicitly out of
  scope, but reconnect-after-crash is different from cross-session persistence —
  it is within-session resilience.
- **Should `task.move` stay as a broadcast-init or is the diff broadcast worth
  the browser-side `applyTaskMove` implementation?** This is a UI complexity vs.
  wire efficiency trade, and the right answer depends on anticipated board
  sizes.
- **Is there a story for the `Monitor` getting killed before it sees `submit` or
  `closed`?** The SKILL.md instructs the agent to `TaskStop` the monitor when
  the session ends, but does not address what happens if the agent session ends
  first (crash, `/compact`, timeout). The events file persists, but no one
  re-arms the monitor. Is that acceptable, or should `bg.ts` emit a `closed`
  event on its own exit so a recovery path exists?
