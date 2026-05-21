---
name: taskboard
description:
  Taskboard is a duplex agent ↔ user surface — a browser-based task board the
  agent posts work into and the user interacts with in real time. The agent
  drives a list of tasks (title, status: todo/doing/done, optional notes); the
  user can reorder via status pills, edit titles inline, add their own tasks,
  delete tasks, or submit the board to end the session. Both sides see updates
  live. Trigger when the user says "open a task board", "spin up a taskboard",
  "give me a board to track this", or any obvious variant, AND the work is a
  real list of discrete tasks the user wants to manage interactively. Also
  consider proposing it when the agent has produced 5+ discrete TODOs in a
  conversation and the user might want a workspace rather than a chat list. Do
  NOT use for single tasks, narrative todos that aren't actually trackable, or
  anything the user would rather just see in chat. Requires Bun on PATH.
---

# Taskboard

A duplex agent ↔ user surface: the agent posts a list of tasks into a browser
board, the user interacts with it (edit, reorder via status pills, add, delete,
submit), and both sides receive updates in real time. Built on the
[`agent-surface-bun` recipe](../../../../recipes/skills/recipes/library/agent-surface-bun/RECIPE.md)
— see that for the underlying pattern.

## When to Use

Fire on the magic word — "task board", "taskboard", "open a board", "spin up a
board to track this", or any obvious variant.

Suggested invocation (propose first, don't fire): the agent has produced 5+
discrete TODOs that the user might want to manage interactively instead of
scrolling chat. Example:

> "I've got six discrete tasks from this session. Want me to spin up a taskboard
> so you can drag them around as you work through them?"

Don't use for:

- A single task or short narrative todo — chat is fine.
- "Tasks" that are really one big amorphous thing (e.g. "refactor everything") —
  break it down first, then maybe a board.
- Anything the user explicitly said they want in chat.

## Prerequisite

`server.ts` runs under [Bun](https://bun.sh) — assume the user has `bun` on
their PATH (it's the runtime this skill commits to). If `bun` is missing, the
Bash call fails fast with `command not found: bun`; surface that to the user and
stop. Don't try to install Bun for them.

## How It Works

1. You spawn the script via the Bash tool. The script opens the user's browser
   to a local board.
2. **You send updates via stdin** (JSON-lines, one object per line) — initial
   tasks, new tasks, edits, removals, toasts.
3. **You read events from stdout** (JSON-lines) — every user interaction is a
   line: `task.toggle`, `task.edit`, `task.add`, `task.remove`.
4. The session ends when the user clicks **Submit** (you receive a final
   `submit` event with the full task list, then `closed reason=submit`, exit 0)
   or **Close without submitting** (exit 130). The script also exits on idle
   timeout (exit 124) or when you send `{"type":"close"}`.

Unlike digestify (one-shot), the script **stays running for the duration of the
interaction**. The Bash tool call blocks until the session ends.

## Protocol

### Agent → script (write to stdin, one JSON line per message)

```
{"type":"init",        "title": "...", "tasks": Task[]}
{"type":"task.add",    "task": Task}
{"type":"task.update", "id": "...", "patch": Partial<Task>}
{"type":"task.remove", "id": "..."}
{"type":"message",     "text": "..."}   // toast notification on the board
{"type":"close"}                        // end session cleanly (exit 0)
```

### Script → agent (read from stdout, one JSON line per message)

```
{"type":"ready",        "url":"...", "port":..., "session_id":"..."}
{"type":"connected"}                              // browser opened WS
{"type":"disconnected"}                           // browser closed WS
{"type":"task.toggle", "id":"...", "status":"todo|doing|done"}
{"type":"task.edit",   "id":"...", "title":"..."}
{"type":"task.add",    "task": Task}              // user added a task
{"type":"task.remove", "id":"..."}                // user deleted
{"type":"submit",      "tasks": Task[]}           // final state, session ending
{"type":"closed",      "reason":"submit|cancel|timeout|stdin_eof|close"}
```

### Task shape

```ts
type Task = {
  id: string; // any unique string (you choose the scheme)
  title: string;
  status: "todo" | "doing" | "done";
  notes?: string; // optional, shown under the title
};
```

## Invocation

```bash
bun run ${CLAUDE_PLUGIN_ROOT}/skills/taskboard/scripts/server.ts \
  --title "Refactor sprint" \
  --timeout 1800
```

Then write JSON-lines to its stdin to push state. The standard agent harness
pattern is to spawn the script with stdin piped and feed it events as they
happen — see the recipe's "Build a New Surface" walkthrough for the spawn
pattern.

## Flags

- `--title TEXT` — page/tab title (default `"Task Board"`)
- `--timeout SECONDS` — idle timeout (default `1800` / 30 min). Resets on any
  agent or browser activity.
- `--no-open` — don't auto-open the browser; useful in headless / SSH setups
- `--port N` — bind specific port (default: random free port)
- `--host HOST` — bind host (default `127.0.0.1`)
- `--id SLUG` — stable session id. Auto-generated as `taskboard-<rand>-p<port>`
  if omitted (the `-p<port>` suffix encodes the bound port for session-recovery
  semantics matching digestify).

The script prints `{"type":"ready", "url":..., "port":N, "session_id":"..."}` to
**stdout** as soon as the server is listening (note: stdout, not stderr — the
JSON-lines protocol uses stdout for everything).

## Exit Code Contract

| Code | Meaning                                     | What to do                                 |
| ---- | ------------------------------------------- | ------------------------------------------ |
| 0    | Submitted (or agent sent `close`)           | Parse the final `submit` event from stdout |
| 2    | Bad input (bad CLI args, port bind failure) | stderr explains; fix args and retry        |
| 124  | Idle timeout                                | Session expired; tell the user             |
| 130  | User clicked "Close without submitting"     | Session cancelled                          |

## Pattern Notes

- **Server is source of truth.** The script holds the canonical task list and
  broadcasts updates to the browser. Conflicting concurrent edits resolve to
  whoever's message arrived first.
- **Events are not commands.** When you receive `task.toggle`, the server has
  already applied it and broadcast to the browser. You're just being informed.
- **`init` resets the list.** Use `task.update` / `task.add` / `task.remove` for
  incremental changes once the board is live.
- **`message` is a toast, not a chat replacement.** Use sparingly — small status
  updates ("two tasks marked done", "added a new section").

## Common Pitfalls

- **Don't read stdout line-by-line on the main thread.** The Bash tool blocks on
  the subprocess; reads happen via `Bun.spawn` + `proc.stdout` in your agent
  code, not via the Bash tool. If you're driving from inside a Bash command,
  redirect stdout to a file and tail it concurrently.
- **Don't send `init` more than once mid-session.** It blows away the user's
  in-progress edits. Use `task.update` / `task.add` / `task.remove` instead.
- **Set Bash timeout high enough.** Default Bash tool timeout is short. Pass a
  long timeout (in ms) on the Bash call, or shorten `--timeout` to match.
