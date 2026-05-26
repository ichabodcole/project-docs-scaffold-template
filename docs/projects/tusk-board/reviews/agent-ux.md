# Agent UX Review — Tusk Board SKILL.md

## Verdict

A fresh agent can probably get a **static** host working from this doc, and a
**joiner** working with mild fumbling. The **monitored** path is the weakest —
the 6-step setup hand-waves at the most novel and error-prone parts (how the
Monitor notification actually surfaces, where event-offset bookkeeping lives
across turns, how to react if the Monitor wakes you with multiple buffered
lines, and what "TaskStop the Monitor's task id you got from the Monitor tool's
initial return" actually means when you've never called `Monitor` before).
Triggering is mostly clear but the "5+ TODOs" suggestion threshold competes with
sibling skills (e.g. plain TODO tracking in chat) without an obvious tiebreaker.
The doc is dense and front-loads protocol reference before the agent has built a
mental model of which mode it's in — section ordering bites twice (static and
monitored protocols are interleaved with the join protocol, making "which
message shape do I use right now?" harder than it should be).

## Confusion Points

_(ordered by how likely a fresh agent is to hit them)_

1. **Monitored mode: the Monitor return value is referenced but never shown.**
   Step 5 says "call `TaskStop` on the Monitor's task id (you got it from the
   Monitor tool's initial return)" — but Step 3's Monitor invocation block shows
   only the arguments, never the return. A fresh agent who has never used
   Monitor won't know what field to capture. Worse, there's no example of what a
   `task-notification` actually looks like, so the agent doesn't know whether it
   gets the raw JSON line, a wrapped object, or just a heads-up ping requiring
   it to re-read the file.

2. **Event-offset bookkeeping across turns is unaddressed.** If the Monitor
   wakes the agent multiple times, or wakes it with several buffered lines, or
   the agent has to resume after a session interruption — does it re-read the
   whole events file? Track a byte offset? Trust that each notification is
   exactly one new line? Section "Step 4 — React to each event" says "The
   notification contains the raw event JSON" (singular), but `tail -F | grep`
   can emit multiple lines per wake in burst conditions. No guidance.

3. **Static-mode stdout reading contradicts itself.** Pitfalls says "for
   static-mode reads happen via `Bun.spawn` + `proc.stdout` in your agent code,
   not via the Bash tool." But the Invocation section says "Then write
   JSON-lines to its stdin to push state" via a plain `bun run` Bash call. These
   can't both work — the Bash tool doesn't expose stdin/stdout streaming to
   agent code. A fresh agent has no idea what "agent code" means here. Is there
   a host harness this skill assumes exists? The recipe link is the only escape
   hatch and it's buried.

4. **Trigger overlap with chat-native TODO tracking.** The "5+ discrete TODOs"
   suggestion threshold is reasonable in isolation, but every multi-step feature
   spec produces 5+ TODOs. Without a "don't propose if the user is
   mid-implementation and just needs to remember things" carve-out, agents will
   over-propose. Compare digestify's tighter guard ("substantive synthesis the
   user needs to consume carefully, plus specific questions only the user can
   answer").

5. **Static vs monitored guidance under-specifies common cases.** "Default to
   monitored when the user hasn't been explicit and the work feels open-ended"
   biases toward spawning a long-lived background process plus Monitor for what
   may be a 10-minute interaction. No cost discussion: is leaving `bg.ts` + a
   Monitor armed for an hour cheap or expensive? Does it cost agent turns even
   when idle? Without that, "default to monitored" feels arbitrary.

6. **Host protocol vs joiner protocol look almost identical but aren't.** Host
   stdout emits bare event objects (`{"type":"task.toggle", ...}`); joiner
   stdout wraps them in `{"type":"event", "payload":{...}}`. The doc calls this
   out clearly in one paragraph late in the Join section, but the two protocol
   code-blocks are visually similar enough that a fresh agent skimming to find
   "the shape" can grab the wrong one. Especially because the host protocol has
   its own `task.add` event that looks structurally identical to the joiner's
   command of the same name.

7. **`task.move` vs `task.toggle` ambiguity.** The static-mode events list shows
   `task.toggle` but the monitored-mode events list shows both `task.toggle` and
   `task.move`. Does static not emit `task.move`? Does the server actually
   distinguish them, or is one a subset? An agent that writes handler logic
   against static's list will silently miss reorder events in monitored mode, or
   vice versa.

8. **Discovery file is described but not the failure mode.** "Both files are
   cleaned up on normal exit" — what about abnormal exit (Ctrl-C, crash)? If
   `tuskboard-latest.json` is stale and points at a dead port, does `join.ts`
   detect that gracefully or hang? The Join section says it exits 2 with
   "connection refused" — good — but a fresh agent doesn't know whether to
   pre-flight that file or just try.

## Foot-Guns

_(things the doc doesn't warn about but should)_

- **`run_in_background: true` + capturing the first stdout line.** The doc says
  "Capture its meta JSON line" but doesn't explain how. Background Bash calls
  don't return stdout synchronously. Does the agent need to poll the background
  output? Use Monitor on the bg process itself first to grab the meta line? This
  is the very first thing a monitored-mode agent has to do and there's no
  recipe.
- **Sending commands before `connected`.** Nothing says whether the host can
  send `init` before the browser has connected. If commands are queued, fine —
  but if they're dropped silently (similar to joiner-side host-only commands
  being "silently ignored"), the agent will seed a board that looks empty.
- **Idle timeout resets on agent activity (static) but it's unclear for
  monitored.** Static's `--timeout` flag note says "Resets on any agent or
  browser activity." Monitored doesn't repeat this. Does appending to
  `cmds_file` count as activity? If the agent reacts to one event then the user
  goes quiet, will `bg.ts` time out under them?
- **Multiple monitored boards at once.** Nothing in the doc says you can or
  can't. The discovery file `tuskboard-latest.json` clearly assumes one. A
  joiner falling back to "latest" with two boards live is a coin flip.
- **Quoting hell in the Monitor grep.** The example grep uses escaped quotes and
  backslashes spread across three continuation lines. Pasting that into a real
  Monitor `command` field is a known foot-gun. No "here's the literal one-liner"
  version.
- **`task.update` exists in commands but isn't in the host events list.** If
  another agent (joiner) sends `task.update`, does the host see it? As what?
  Presumably it's broadcast as `task.update` to the browser and joiners but the
  host stdout only shows `task.toggle`/`task.edit`/etc. The asymmetry is
  unexplained.

## Missing Guidance

- **A worked end-to-end example for monitored mode.** The doc has a step list
  and protocol tables but no narrative "you ran X, got Y back, then appended Z
  to cmds_file, then Monitor woke you with W." Digestify gets away without one
  because it's one-shot; monitored really needs one.
- **How to recover from a stale Monitor.** If the session ends and the agent
  forgets to TaskStop, what does the next turn look like? Is there a way to list
  active Monitors and reap them?
- **Whether to read `events_file` directly vs trust the Monitor stream.** Both
  are technically available. Which is canonical? When would you ever re-read the
  file?
- **What "session ends" means in monitored mode.** The Bash call returned long
  ago (it was backgrounded). When `submit` arrives, the agent reacts — but is
  `bg.ts` itself still running? Should the agent send `{"type":"close"}` to be
  safe? Wait for it to self-terminate?
- **Joiner discovery on a remote host.** The discovery files live in `<tmpdir>`
  — implicitly the same machine. Nothing addresses a user with two agents on two
  boxes ("the board is at <URL>"). Presumably `--url` works, but the failure
  mode (cross-machine) isn't called out.
- **Concurrency model.** "Conflicting concurrent edits resolve to whoever's
  message arrived first" — fine, but if a joiner moves a task and the host agent
  simultaneously updates its title, do both apply? Or does last-write win on the
  whole task object?

## What Works Well

- **The mode-comparison table at the top** lands the static/monitored/joiner
  distinction cleanly and is the most useful piece of the doc.
- **The "Why two host modes?" paragraph** is genuinely illuminating about _why_
  a turn-based agent needs the bg.ts indirection. Worth keeping near the front.
- **The host-only commands callout in the Join section** ("Joiners CAN'T push
  toasts... server silently ignores them") prevents a real foot-gun.
- **Exit code tables** are crisp and actionable.
- **The "Events are not commands" pattern note** preempts a real class of bug
  (agent re-applying state it's just been told about).
- **The reference to the agent-surface-bun recipe** is well placed for agents
  who need to go deeper.

## Suggested Edits

1. **Add a worked monitored-mode example.** A literal turn-by-turn walkthrough
   with verbatim tool call payloads (Bash with `run_in_background`, the meta
   line captured, the Monitor call with its return, one wake cycle, one
   `appendFileSync`, and the TaskStop). Mirror the static section's tighter feel
   but with the indirection laid bare.

2. **Show the Monitor return shape.** Add a one-line code snippet:
   `// Monitor returns { task_id: "...", ... } — capture task_id for TaskStop`.
   And show what a notification looks like (raw JSON line vs. wrapped).

3. **Address offset/burst semantics explicitly.** One sentence: "Each Monitor
   wake delivers one matching line. If multiple events queued, you get multiple
   wakes — process them in order." (Or whatever the actual behavior is.)

4. **Reconcile the static-mode contradiction.** Either the static path is meant
   to be driven by `Bun.spawn` from a separate harness (in which case say so up
   front and demote the plain `bun run` example), or the Bash tool really is the
   entry point (in which case strike the pitfall about `Bun.spawn`). As written,
   an agent reading top-to-bottom hits an irreconcilable contradiction near the
   end.

5. **Tighten the 5+ TODOs trigger.** Add a carve-out: "Don't propose if the user
   is actively implementing and just needs a memory aid — the chat-native TODO
   tracker is better for that. Propose only when the _user_ is going to
   manipulate the tasks (reorder, prioritize, drag, edit), not just consume
   them."

6. **Move the Join section's "wrapping" callout into the protocol header.**
   Currently it's a paragraph after the protocol code-block. Put a one-line
   banner _above_ the joiner protocol code-block: "**Note: incoming events are
   wrapped in `{type:event, payload:...}`** — unlike the host stdout."

7. **Consolidate event lists.** Have one canonical "events the server emits"
   table with columns for: host-stdio shape, monitored events-file shape,
   joiner-wrapped shape. The three current lists invite mismatch bugs.

8. **Document multi-board collisions and stale discovery files.** Even one
   sentence: "If multiple boards are active, `tuskboard-latest.json` points at
   the most recent — prefer explicit `--id` when ambiguity matters. Stale
   discovery files survive crashes; `join.ts` detects this and exits 2."

9. **Add a `bg.ts` lifecycle note.** When does `bg.ts` self-terminate? Does the
   agent need to `close` it after `submit`, or does it tear itself down? One
   sentence at the end of "Notes on `bg.ts`".

10. **Consider trimming.** At ~480 lines the SKILL.md is long. The "Pattern
    Notes" and "Common Pitfalls" sections have real overlap with content earlier
    in the doc and could be the trim target. A fresh agent skimming for "what do
    I type" hits a lot of preamble first.
