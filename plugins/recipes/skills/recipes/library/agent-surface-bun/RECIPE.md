# Agent Surface (Bun) Recipe

## Purpose

Build a small browser-based UI that an AI agent can drive — a "surface" the
agent opens for the user, exchanges messages with, and tears down when the
interaction is over. Examples: a doc-review page with embedded questions
(`digestify`), a task board the agent posts work into and the user drags around
(`taskboard`), a side-by-side comparison view, a configurator, a live editor.

The common shape is:

1. The agent spawns a subprocess.
2. The subprocess starts a local HTTP server and opens the user's browser.
3. The agent and the browser exchange messages until the user is done.
4. The subprocess prints a JSON result on stdout, exits, and the agent
   continues.

This recipe gives you a **Bun + TypeScript scaffold** for both the **one-shot**
flavor (agent writes → user reads + responds → submit ends the session) and the
**duplex / streaming** flavor (agent and user pass messages back and forth while
the surface stays open).

Two reference implementations live in this repo and exercise the patterns end to
end:

- **`plugins/toolbox/skills/digestify/scripts/review.ts`** — one-shot.
- **`plugins/toolbox/skills/digestify/scripts/stream.ts`** — duplex / streaming.

Read those when you want to see the full pattern; this recipe walks through what
they share and why.

## When to Use

- You need the user to **see something rendered** (markdown, a custom UI, a
  diagram) rather than read it in chat.
- You want the user to **interact with state** the agent is shaping — pick from
  options, drag, type into specific fields, leave inline comments.
- A single round trip isn't enough — or the interaction is short but the page
  needs to be more than a text reply.
- You want the work to feel like a tiny dedicated mini-app, not a wall of chat.

Not the right fit for: lengthy iterative chat, anything that needs to survive
across separate agent sessions without coordination, anything where the user is
the primary author of the document (this is for agent-driven surfaces).

## Technology Stack

| Layer       | Technology                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Runtime     | [Bun](https://bun.sh) 1.3+                                                                       |
| Language    | TypeScript (Bun runs `.ts` natively, no build step)                                              |
| HTTP server | `Bun.serve` (built-in)                                                                           |
| WebSockets  | `Bun.serve` `websocket` handler (built-in; duplex variant only)                                  |
| Browser API | Standard fetch / `WebSocket` / DOM. **No build pipeline** — template HTML loads CDN libs if any. |
| Test runner | `bun test` (built-in)                                                                            |

**Why Bun, not Node / Deno / Python:**

- **Single-runtime install for the user.** Anyone running an agent surface needs
  `bun` on PATH — and that's the entire dependency. No `npm install`, no
  `pip install`, no per-skill node_modules.
- **Built-in `Bun.serve` is great** — no Express / Fastify / Hono required.
  HTTP + WebSocket + path-traversal-safe asset serving in ~30 lines.
- **Native TS** — protocol message types live in the same file as the handler;
  no transpile step.
- **`Bun.spawn` + JSON-lines stdio is the agent contract.** No need for the
  agent to manage WebSocket clients; the runtime handles the duplex side and
  proxies to/from the agent's stdin/stdout.
- Python's stdlib `http.server` works fine for the one-shot case but lacks
  built-in WebSockets, requiring a third-party install — defeats the zero-dep
  goal.

## Architecture

### Shared shape

Every surface — one-shot or duplex — has the same three actors:

```
┌──────────────┐  spawn + stdin/stdout (JSON lines)  ┌──────────────┐
│    AGENT     │ ◄─────────────────────────────────► │   SURFACE    │
└──────────────┘                                     │  (Bun .ts)   │
                                                     └──────┬───────┘
                                                            │ HTTP(+WS) on
                                                            │ 127.0.0.1:<port>
                                                            ▼
                                                     ┌──────────────┐
                                                     │   BROWSER    │
                                                     └──────────────┘
```

The agent never talks to the browser directly — the surface script is the proxy.

### One-shot variant (`review.ts` shape)

```
agent ──spawn──► surface ──http──► browser
                                  ◄──submit── (POST /submit)
agent ◄──stdout (JSON)── surface  (exits)
```

- Agent passes the full content up-front (stdin or `--file`).
- Surface serves a single page; browser does its thing.
- One POST `/submit` ends the session.
- Surface prints a JSON result and exits.

Exit codes:

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| 0    | User submitted                                |
| 2    | Bad input (no content, parse error, bad args) |
| 124  | Idle timeout                                  |
| 130  | User cancelled (closed tab after interacting) |

### Duplex / streaming variant (`stream.ts` shape)

```
agent ──stdin (JSON-lines: init|patch|message|close)──► surface
agent ◄──stdout (JSON-lines: ready|connected|event|disconnected|closed)── surface
                                                       │
                                          surface ◄──WS── browser
                                          surface ──WS─► browser
                                            (init|patch|message)
                                            (event|submit|cancel)
```

Same agent-facing model — JSON-lines on stdio — but the protocol is bigger and
the surface keeps a **state snapshot** so late-joining browsers receive a
synthetic `init` on connect without the agent having to replay.

Exit codes mirror the one-shot variant.

## Build a New Surface — Step by Step

1. **Copy `review.ts` or `stream.ts`** depending on whether you want one-shot or
   duplex. Drop it into your skill folder as `scripts/<name>.ts`.
2. **Edit the protocol types.** For one-shot, decide what shape the agent passes
   in (markdown? config object?) and what the submit response looks like. For
   duplex, decide the `init`/`patch`/`event` shapes for your domain. Keep them
   at the top of the file so anyone reading the script sees the contract first.
3. **Write your `template.html`.** Keep it self-contained — no build step. Use
   `__TITLE__`, `__PAYLOAD__`, or whatever placeholder tokens you need; the
   script substitutes them before serving. For CDN libraries (Marked, DOMPurify,
   Lucide, etc.), `<link>` and `<script>` them inline in the template.
4. **Wire up `Bun.serve`.** For one-shot you need `GET /`, `GET /assets/*` (with
   a path-traversal guard), `POST /submit`, `POST /cancel`, `POST /heartbeat`.
   For duplex you also need a `/ws` upgrade route and a
   `websocket: { open, message, close }` handler.
5. **Connect agent stdio to the script.**
   - One-shot: read once at startup (with a 100ms timeout on stdin so a
     dead/empty stdin doesn't hang forever).
   - Duplex: stream stdin as JSON-lines, forward each to the browser; emit
     browser events to stdout as JSON-lines.
6. **Write the SKILL.md** — describe the trigger conditions, the agent's
   invocation, the response format, exit codes, and a Prerequisite section
   noting Bun on PATH.
7. **Add a `bun test` file** with at least the pure-function coverage of your
   parser / state-merge logic, plus a few subprocess integration tests covering
   submit / cancel / timeout.

## Bun 1.3.x Gotchas (read these once)

These bit during the `digestify` port; capturing them so you don't have to
re-discover.

### 1. `Bun.spawn({ stdin: "pipe" })` returns a `FileSink`, not a `WritableStream`

Use `proc.stdin.write(bytes)` directly. `proc.stdin.getWriter()` will throw
`TypeError: proc.stdin.getWriter is not a function`. End the stream with
`proc.stdin.end()`.

```ts
const proc = Bun.spawn({ cmd: [...], stdin: "pipe", stdout: "pipe" });
const enc = new TextEncoder();
proc.stdin.write(enc.encode(JSON.stringify({ type: "init", ... }) + "\n"));
proc.stdin.end(); // close on EOF
```

### 2. `server.stop()` can stall on WebSocket handshake even with `true`

In `Bun.serve`, both `server.stop()` (graceful) and `server.stop(true)` (force)
can hang for several seconds when there's an outgoing WS close in flight. The
fix is to race it against a short timer:

```ts
await Promise.race([server.stop(true), new Promise((r) => setTimeout(r, 200))]);
```

Then let `process.exit(code)` finish the job.

### 3. Browser races against teardown when submit triggers a new asset fetch

After `POST /submit` returns, your client-side handler may render a "done" state
that loads new assets (e.g. a celebratory mascot image from `/assets/...`). If
you call `server.stop()` immediately after the submit resolves, the asset
request lands on a dead server and the done-screen renders broken.

The fix is a short grace period — only on the submit path; cancel / timeout
don't load new assets:

```ts
const { code } = await done;
if (code === 0) await new Promise((r) => setTimeout(r, 700));
await Promise.race([server.stop(true), new Promise((r) => setTimeout(r, 200))]);
```

### 4. `process.stdout.write` can throw `EPIPE` if the agent died first

Wrap your write helper so a dead parent can't crash you during cleanup:

```ts
function emitToAgent(msg: ServerToAgentMsg): void {
  try {
    process.stdout.write(JSON.stringify(msg) + "\n");
  } catch (e: any) {
    if (e?.code !== "EPIPE") throw e;
  }
}
```

### 5. `bun test` requires `.test.` or `.spec.` in the filename

Bun won't pick up `test_review.ts` — rename to `review.test.ts`.

## Patterns Worth Reusing

### Session id with embedded port

`digestify-<8-hex>-p<port>` lets a relaunch reuse the same port. Same origin →
same browser `localStorage` namespace → in-progress drafts survive. The script
parses the port out of `--id` and tries to bind to it; falls through to a random
port if it's taken. See `parsePortFromSessionId` in `review.ts`.

### Sliding-window idle timeout

`--timeout` is the **idle** threshold, not absolute. Heartbeats (a POST or WS
message) reset the clock. A user actively working stays past the original
window; an abandoned page exits at the configured idle interval. Simpler than
tracking absolute deadlines and matches user intuition.

### `/heartbeat` as a separate endpoint (one-shot only)

Keeps the activity signal out of band so it doesn't interleave with the real
submit/cancel paths. In the duplex variant, any inbound message bumps the
activity clock — no separate endpoint needed.

### Path-traversal guard for assets

```ts
if (assetName.includes("..") || assetName.startsWith("/")) {
  return new Response('{"error":"not found"}', { status: 404 });
}
```

`Bun.file(join(assetsDir, assetName)).exists()` then handles the
not-found-but-real-path case.

### JSON payload `</` escaping

If you inline a JSON payload into an HTML `<script>` tag, escape `</` so content
like `"</script>"` in a title can't close the surrounding tag:

```ts
const payloadJson = JSON.stringify(payload).replace(/<\//g, "<\\/");
```

The browser still parses it as valid JSON.

## Examples in This Repo

- **`plugins/toolbox/skills/digestify/scripts/review.ts`** + `template.html` —
  full one-shot implementation. Markdown with `:::question` fences, themed UI,
  inline comments, session recovery via `localStorage`. Read this first for a
  complete one-shot reference.
- **`plugins/toolbox/skills/digestify/scripts/stream.ts`** + minimal
  `stream-template.html` — duplex scaffold. The template here is intentionally
  minimal so you can see the protocol clearly. A real surface (e.g. a task
  board) replaces the template with its own UI but keeps the same client-side WS
  message handler.
- **`plugins/toolbox/skills/digestify/scripts/review.test.ts`** — `bun test`
  patterns: pure-function tests, subprocess integration tests, helpers like
  `spawnAndWaitForReady` and `postSubmit`. Copy these as a starting point.

## What This Recipe Doesn't Cover

- **Multi-user / remote surfaces.** Everything here binds to `127.0.0.1`. If you
  want a surface the user can hit from another device, that's a different
  problem (tunneling, auth, TLS).
- **Persistence across sessions** beyond `localStorage`. The surface is
  ephemeral; if you need durable state, that belongs in the agent or a separate
  store.
- **Rich UI frameworks.** The templates here are vanilla DOM. If you want Vue /
  React, you can — but resist build steps. Either inline a CDN build
  (`<script src="https://unpkg.com/vue@3">`) or accept a `bun build` step in the
  skill's own setup.
