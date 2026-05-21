#!/usr/bin/env bun
// digestify stream — bidirectional agent↔browser surface over WebSocket.
//
// Experimental sibling to review.ts/review.py. The one-shot review tool
// is great when the interaction is "agent writes, user reads, user submits
// once," but a lot of agent-facing surfaces (task boards, live editors,
// progress dashboards) need a real duplex channel: the user does something,
// the agent reacts, the agent pushes an update, the user reacts back.
//
// Architecture: stream.ts is a thin proxy. The agent talks to it via
// JSON-lines on stdio; the browser talks to it via WebSocket. The script
// forwards messages in both directions and adds a tiny amount of state
// management (current `state` snapshot for late-joining browser clients).
//
// Protocol — agent → script (one JSON object per line on stdin):
//   {"type":"init",    "title": "...", "state": {...}}     // first message
//   {"type":"patch",   "state": {...}}                     // merged + broadcast
//   {"type":"message", "text": "..."}                      // toast/log entry
//   {"type":"close"}                                       // shut down
//
// Protocol — script → agent (one JSON object per line on stdout):
//   {"type":"ready",        "url":"...", "session_id":"..."}
//   {"type":"connected"}                                   // browser opened WS
//   {"type":"disconnected"}                                // browser closed WS
//   {"type":"event",        "payload": {...}}              // any browser event
//   {"type":"closed",       "reason":"submit|cancel|timeout|stdin_eof|close"}
//
// Protocol — server → browser (WebSocket):
//   {"type":"init",    "title":"...", "state": {...}}
//   {"type":"patch",   "state": {...}}
//   {"type":"message", "text":"..."}
//
// Protocol — browser → server (WebSocket):
//   {"type":"event",   "payload": {...}}                   // any user event
//   {"type":"submit",  "payload": {...}}                   // ends session, code 0
//   {"type":"cancel"}                                      // ends session, code 130
//
// Exit codes mirror review.ts: 0 submit, 2 bad input, 124 idle timeout,
// 130 cancel (or browser-disconnect when no reconnect arrives in time).

import { parseArgs } from "node:util";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

type AgentMsg =
  | { type: "init"; title?: string; state?: any }
  | { type: "patch"; state: any }
  | { type: "message"; text: string }
  | { type: "close" };

type ServerToAgentMsg =
  | { type: "ready"; url: string; port: number; session_id: string }
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "event"; payload: any }
  | { type: "closed"; reason: "submit" | "cancel" | "timeout" | "stdin_eof" | "close" };

type BrowserMsg =
  | { type: "event"; payload?: any }
  | { type: "submit"; payload?: any }
  | { type: "cancel" };

const PORT_SUFFIX_RE = /-p(\d{2,5})$/;

function parsePortFromSessionId(sid: string): number | null {
  const m = sid?.match(PORT_SUFFIX_RE);
  if (!m) return null;
  const port = parseInt(m[1], 10);
  return port >= 1 && port <= 65535 ? port : null;
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function randHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? ["open", url] :
    process.platform === "win32" ? ["cmd", "/c", "start", "", url] :
    ["xdg-open", url];
  try { Bun.spawn({ cmd, stdout: "ignore", stderr: "ignore" }); }
  catch { /* best-effort */ }
}

function emitToAgent(msg: ServerToAgentMsg): void {
  try {
    process.stdout.write(JSON.stringify(msg) + "\n");
  } catch (e: any) {
    // EPIPE: agent closed our stdout (it died, or it's done listening).
    // Swallow — we still want to finish our own cleanup. Anything more
    // serious will surface via stderr if we crash elsewhere.
    if (e?.code !== "EPIPE") throw e;
  }
}

// Parse stdin as newline-delimited JSON. Yields one object per line; ignores
// blank lines; emits a `null` terminator on EOF so the consumer can exit
// cleanly. Errors are logged to stderr (not stdout — stdout is the agent
// protocol channel) and the offending line is skipped.
async function* readJsonLines(): AsyncGenerator<AgentMsg | null> {
  if (process.stdin.isTTY) { yield null; return; }
  const reader = Bun.stdin.stream().getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try { yield JSON.parse(line) as AgentMsg; }
        catch (e: any) { process.stderr.write(`stream: bad json on stdin: ${e.message}\n`); }
      }
      if (done) {
        buffer = buffer.trim();
        if (buffer) {
          try { yield JSON.parse(buffer) as AgentMsg; }
          catch (e: any) { process.stderr.write(`stream: bad json on stdin (final): ${e.message}\n`); }
        }
        yield null;
        return;
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

async function main(argv: string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        title: { type: "string", default: "Agent Stream" },
        timeout: { type: "string", default: "1800" },
        "no-open": { type: "boolean", default: false },
        port: { type: "string", default: "0" },
        host: { type: "string", default: "127.0.0.1" },
        id: { type: "string" },
        template: { type: "string" },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (e: any) {
    process.stderr.write(`error: ${e.message}\n`);
    return 2;
  }
  const v = parsed.values;
  const timeout = parseFloat(v.timeout as string);
  let port = parseInt(v.port as string, 10);
  const host = v.host as string;
  let sessionId = (v.id as string | undefined) ?? "";
  if (port === 0 && sessionId) {
    const embedded = parsePortFromSessionId(sessionId);
    if (embedded !== null) port = embedded;
  }

  const templatePath = (v.template as string | undefined) ?? join(SCRIPT_DIR, "stream-template.html");
  const template = await Bun.file(templatePath).text();

  // Shared session state, updated by every "init" / "patch" from agent and
  // re-broadcast to all connected browser clients. New clients receive a
  // synthetic init on connect.
  let title = v.title as string;
  let state: any = {};
  const sockets = new Set<any>();

  // Lifecycle: a single Deferred resolves with a final exit code; the main
  // loop awaits it. Multiple sources can resolve (browser submit, cancel,
  // idle timeout, stdin EOF, agent "close"); first one wins.
  let resolveDone!: (val: { code: number; reason: ServerToAgentMsg["reason"] extends infer R ? R : never }) => void;
  let settled = false;
  const done = new Promise<{ code: number; reason: any }>((res) => {
    resolveDone = (v) => { if (settled) return; settled = true; res(v); };
  });

  let lastActivity = performance.now();
  const touch = () => { lastActivity = performance.now(); };

  let pageHtml = "";
  let server;
  try {
    server = Bun.serve({
      port,
      hostname: host,
      fetch: (req, srv) => {
        const url = new URL(req.url);
        const path = url.pathname;
        if (req.method === "GET" && path === "/") {
          return new Response(pageHtml, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
        if (path === "/ws") {
          const upgraded = srv.upgrade(req);
          if (upgraded) return undefined;
          return new Response("upgrade required", { status: 426 });
        }
        return new Response('{"error":"not found"}', { status: 404, headers: { "Content-Type": "application/json" } });
      },
      websocket: {
        open(ws) {
          sockets.add(ws);
          touch();
          emitToAgent({ type: "connected" });
          // Synthetic init for late joiners — gives them the current state
          // snapshot without the agent needing to re-send.
          ws.send(JSON.stringify({ type: "init", title, state }));
        },
        message(ws, raw) {
          touch();
          let msg: BrowserMsg;
          try { msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)); }
          catch (e: any) {
            process.stderr.write(`stream: bad json from browser: ${e.message}\n`);
            return;
          }
          if (msg.type === "event") {
            emitToAgent({ type: "event", payload: msg.payload });
          } else if (msg.type === "submit") {
            emitToAgent({ type: "event", payload: { submit: true, ...(msg.payload ?? {}) } });
            resolveDone({ code: 0, reason: "submit" });
          } else if (msg.type === "cancel") {
            resolveDone({ code: 130, reason: "cancel" });
          }
        },
        close(ws) {
          sockets.delete(ws);
          emitToAgent({ type: "disconnected" });
        },
      },
    });
  } catch (e: any) {
    process.stderr.write(
      JSON.stringify({ event: "bind_error", host, port, error: String(e?.message ?? e) }) + "\n",
    );
    return 2;
  }

  const boundPort = server.port;
  if (!sessionId) sessionId = `digestify-stream-${randHex(4)}-p${boundPort}`;
  const wsUrl = `ws://${host}:${boundPort}/ws`;
  pageHtml = template
    .replace(/__TITLE__/g, htmlEscape(title))
    .replace(/__WS_URL__/g, htmlEscape(wsUrl))
    .replace(/__SESSION_ID__/g, htmlEscape(sessionId));

  const url = `http://${host}:${boundPort}`;
  emitToAgent({ type: "ready", url, port: boundPort, session_id: sessionId });
  if (!v["no-open"]) openBrowser(url);

  // Agent → browser pump. Runs concurrently with the server.
  (async () => {
    for await (const msg of readJsonLines()) {
      if (msg === null) {
        // stdin EOF — leave the surface up until the user closes or times
        // out. The agent may have intentionally closed its side after one
        // batch of updates; we don't want to nuke the page mid-interaction.
        // We only end the session via stdin if the agent explicitly closes.
        break;
      }
      touch();
      if (msg.type === "init") {
        if (typeof msg.title === "string") title = msg.title;
        if (msg.state !== undefined) state = msg.state;
        broadcast({ type: "init", title, state });
      } else if (msg.type === "patch") {
        // Shallow merge by default; deeper merging is the agent's job since
        // it owns the shape of `state`.
        state = { ...state, ...(msg.state ?? {}) };
        broadcast({ type: "patch", state: msg.state });
      } else if (msg.type === "message") {
        broadcast({ type: "message", text: msg.text });
      } else if (msg.type === "close") {
        resolveDone({ code: 0, reason: "close" });
        return;
      }
    }
  })();

  function broadcast(msg: object) {
    const s = JSON.stringify(msg);
    for (const ws of sockets) {
      try { ws.send(s); } catch { /* socket closed */ }
    }
  }

  // Idle timeout — same sliding-window semantics as review.ts, but the
  // activity clock is touched by both agent messages and browser messages
  // (and by WS open/close).
  const idleTimer = setInterval(() => {
    if ((performance.now() - lastActivity) / 1000 >= timeout) {
      resolveDone({ code: 124, reason: "timeout" });
    }
  }, 250);

  const { code, reason } = await done;
  clearInterval(idleTimer);
  emitToAgent({ type: "closed", reason });
  // Best-effort: tell any still-connected browsers we're done so they can
  // show a "session ended" state instead of hanging on a dead socket.
  broadcast({ type: "message", text: `session ended: ${reason}` });
  for (const ws of sockets) { try { ws.close(); } catch {} }
  // Race server.stop against a short timer. In Bun 1.3.x the WebSocket
  // shutdown path can stall even with stop(true); we'd rather exit cleanly
  // a few hundred ms later than hang forever.
  await Promise.race([
    server.stop(true),
    new Promise((r) => setTimeout(r, 200)),
  ]);
  return code;
}

if (import.meta.main) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}

export { main, parsePortFromSessionId, htmlEscape };
