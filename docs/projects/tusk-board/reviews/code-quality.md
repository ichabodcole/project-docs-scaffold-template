# Code Quality Review — Tusk Board

## Verdict

The surface scripts are well-structured for their scope: clean type separation,
consistent EPIPE guards on stdout, idiomatic `done`-promise + `settled` flag for
one-shot resolution, and a workable path-traversal guard on asset serving. The
main risks cluster around three areas: (1) the browser's submit handler doesn't
set `closedByServer` before the server closes the WS, which causes an immediate
reconnect loop after submit; (2) the bg.ts ready-wait loop has a TOCTOU gap
between checking `metaEmitted` and `server.exitCode`; and (3) the join.ts
idle-timeout fires with the wrong reason. The submit-broadcast addition is
correct but incomplete — the cancel path was not updated in parallel. Test
coverage is the biggest structural gap.

---

## Real Issues

**1. [Critical] Browser reconnects after submit — template.html line 454**

When the server receives `submit`, it calls
`broadcast({ type: "submit", tasks })`, then eventually calls `ws.close()` on
all sockets (server.ts line 468). The browser's `socket.onclose` fires and,
because `closedByServer` is `false` at that point (nothing ever sets it to
`true` in the `onmessage` handler for a `submit` payload), the `connect()`
function is scheduled again after 1 second. The browser then lands on a dead
server and retries indefinitely.

Fix shape: in `socket.onmessage`, when `msg.type === "submit"`, set
`closedByServer = true` and disable the buttons (same as the `"session ended:"`
toast path). Alternatively, handle `submit` as a first-class message type in the
WS handler instead of depending solely on the closing toast.

**2. [Critical] Submit broadcast is incomplete — the cancel path was skipped
(server.ts line 373)**

The new broadcast on submit was the explicit change being reviewed. The cancel
handler (`msg.type === "cancel"`) calls
`resolveDone({ code: 130, reason: "cancel" })` but does not broadcast anything
before doing so. The server then sends a `message` toast "session ended: cancel"
and closes all sockets, but join.ts clients receive the close before the
`message` event propagates because the server immediately calls `ws.close()` for
all sockets in the teardown loop (line 468). A joining agent has no way to
distinguish "host submitted" from "host cancelled" from a plain disconnect
unless the cancel path also broadcasts a structured event (e.g.
`{ type: "cancel" }`) before resolving done.

Fix shape: mirror the submit broadcast — `broadcast({ type: "cancel" })`
immediately inside the `cancel` branch before calling `resolveDone`, the same
way submit now does.

**3. [High] bg.ts ready-wait busy-poll loop has a race — bg.ts lines 166–172**

```ts
while (!metaEmitted && server.exitCode === null) {
  await new Promise((r) => setTimeout(r, 50));
}
```

`metaEmitted` is set inside `stdoutPump`, which is an unwaited async IIFE. The
`server.exitCode` check races against that pump: if the server exits very fast
(e.g. port already in use, exits 2 before the first `ready` line is written),
the loop exits with `metaEmitted === false` and the code returns early with the
correct error message. That part is fine. The subtle issue is that `stdoutPump`
may still be in-flight after the loop exits — it is only `await`ed later at
line 222. If the poll loop exits because `server.exitCode !== null` but the pump
hasn't yet processed the buffer, the function exits with exit code
`server.exitCode ?? 0` without draining remaining events. The `await stdoutPump`
on line 222 covers this for the normal exit path, but not for the early-return
on line 170.

Fix shape: `await stdoutPump` before the early return at line 170, or
restructure so early failure also drains the pump.

**4. [High] join.ts idle timeout reports wrong reason — join.ts line 232**

When the idle timer fires, it calls
`resolveDone({ code: 0, reason: "server_closed" })`. The correct reason for an
idle timeout is neither `server_closed` nor `stdin_close`. The agent on the
other end sees `{ type: "disconnected", reason: "server_closed" }` when in fact
the session expired locally. server.ts uses a dedicated `"timeout"` reason for
this case. join.ts has no equivalent; using `"server_closed"` here is actively
misleading.

Fix shape: add `"timeout"` to the `reason` union in join.ts's `done` promise
type and use it in the idle timer callback.

**5. [High] task.edit from browser: no title length or content guard — server.ts
line 350**

All other browser-originated mutations validate `status` values against
`VALID_STATUS`. `task.edit` applies `msg.title` directly to state via
`applyTaskUpdate` with no length check and no rejection of null/undefined. A
browser (or a malicious tab) can push a `task.edit` with `title: null` and the
task's title becomes `null` in state, which then gets JSON-stringified and
broadcast to all clients, causing `task.title` to be `null` on reconnect and
`title.textContent = task.title` in `renderTask` to become a silent no-op
(setting `.textContent` to null is fine in browsers, but the state is now
corrupted for the agent). Same concern applies to `task.add` from the browser —
the `task` object is used directly with no shape validation.

Fix shape: in the `task.edit` handler, check `typeof msg.title === "string"`
before applying the patch. In `task.add` from browser, validate that `msg.task`
has string `id`, `title`, and valid `status` before calling `applyTaskAdd`.

**6. [High] `__TITLE__` is double-rendered unescaped — template.html lines 6 and
216**

`server.ts` substitutes `__TITLE__` with `htmlEscape(state.title)` (line 394).
The `<title>` tag on HTML line 6 is `<title>Tusk Board · __TITLE__</title>` —
that gets the escaped version correctly. The `<h1 id="title">__TITLE__</h1>` on
line 216 also receives the HTML-escaped version. This is correct as long as the
browser treats the content as text. However the JS block at line 269 inlines
`__WS_URL__` directly into a `const wsUrl = "__WS_URL__"` string literal inside
a `<script>` tag. `htmlEscape` converts `"` to `&quot;`, which is correct in
HTML attribute context but wrong inside a JS string — `&quot;` is a literal
six-character sequence in JS, not a quote. In practice wsUrl is always
`ws://127.0.0.1:<port>/ws` with no special characters, so this doesn't currently
cause a breakage, but the escaping function used is the wrong one for a JS
string context. If the `host` argument ever contained a `"` or `<`, the JS would
either break or be injectable.

Fix shape: for values injected into script context, use JSON.stringify instead
of htmlEscape. `__WS_URL__` and `__SESSION_ID__` should use
`JSON.stringify(value)` in the template replacement, or the template should use
a data attribute rather than an inline JS literal.

---

## Nits / Style

- `applyTaskMove` clamps `index` with `Math.max(0, Math.floor(index))` but
  `applyTaskUpdate` and `applyTaskAdd` do no clamping — that's fine but worth
  noting the asymmetry.
- bg.ts default title is "Tusk Board" (line 46) while server.ts default is "Task
  Board" (line 242). Inconsistency could confuse consumers.
- join.ts `wsUrl` construction (`info.url.replace(/^http/, "ws") + "/ws"`) will
  produce `wss://` if `info.url` starts with `https://` — that's actually
  correct behavior and is fine, but a comment noting this would help.
- The `sockets` Set is typed as `Set<any>` (server.ts line 270). Bun exposes
  `ServerWebSocket<undefined>` — using the concrete type would surface the
  `send`/`close` API without casts.

---

## Test Gaps

In priority order:

**1. server.ts: submit broadcasts to all WS clients (the explicit change)**
Spawn the server, open two WebSocket connections, send `submit` from one, assert
both receive `{ type: "submit", tasks: [...] }`. This is the change's own
acceptance test and it doesn't exist.

**2. server.ts: cancel does NOT broadcast a structured event (the missing
companion)** Same setup, send `cancel`, assert join-side receives enough signal
to identify the reason. This test would expose the gap identified in Issue 2
above.

**3. browser reconnect-after-submit** This is hard to test without a headless
browser, but an integration test from the WS-client side can verify the close
sequence: after `submit`, the server should close the WS with a recognized close
code, and a test WS client can assert it does not receive a new `init` ping
(i.e., the server is truly stopped).

**4. bg.ts: meta emission and file creation** Spawn `bg.ts` with `--no-open`,
read stdout, parse the `meta` JSON, assert `events_file` and `cmds_file` exist
on disk and that `events_file` contains a `ready` line. Then write a `task.add`
line to `cmds_file` and poll `events_file` for the echo. This covers the core
file-mediated protocol that currently has zero coverage.

**5. bg.ts: early server failure returns exit code 2** Spawn `bg.ts` with
`--port` already in use, assert `bg.ts` exits 2 without hanging.

**6. join.ts: discovery file fallback** Write a fake `tuskboard-latest.json` to
tmpdir, spawn `join.ts` with no flags, assert it attempts the correct WS URL.
Also test the `--id` lookup and the "no session file" error path.

**7. join.ts: stdin `close` message closes WS cleanly, exits 0** Spawn join.ts
against a live test server, send `{ type: "close" }` on its stdin, assert exit
code 0 and `disconnected` event with reason `"stdin_close"`.

**8. server.ts: applyTaskMove column-index boundary** `applyTaskMove` is
exported and pure. Tests for: move to empty column (index 0, index 5), move
within same column, move to end (index > column length), move a nonexistent id
returns -1. These are cheap pure-function tests in the digestify pattern.

---

## What's Solid

- The `done`-promise + `settled` guard pattern is correct: multiple callers of
  `resolveDone` (idle timer, WS handler, stdin loop) cannot double-settle.
- EPIPE guard on `emitToAgent` in both server.ts and join.ts — this is the right
  shape for stdio surfaces.
- The `readJsonLines` generator handles partial lines, trailing buffer on EOF,
  and TTY detection correctly in both server.ts and join.ts.
- `applyTaskMove` correctly handles the source-column index shift by splicing
  before computing the target insertion point.
- Path-traversal guard is sufficient for the threat model: `..` segment check
  plus leading-`/` rejection after `decodeURIComponent`, serving from a static
  `assetsDir` constructed at startup. There is no symlink concern because the
  assets are agent-controlled.
- The bg.ts commands pump uses a byte-offset cursor (`cmdOffset`) rather than
  re-reading the whole file on each poll — correct and efficient for append-only
  files.
- `clearDropMarkers()` is called from both `dragend` and `drop` handlers, so
  markers never leak across drag sessions.
- The `draggable=false` during `contenteditable` title edit is correctly set on
  `mousedown` and restored on `blur` — the known interaction hazard is actively
  mitigated.
