#!/usr/bin/env bun
// taskboard — agent-driven task board the user can interact with.
//
// Built on the agent-surface-bun recipe's duplex pattern:
//   - Agent ↔ server via JSON-lines on stdio
//   - Server ↔ browser via WebSocket
//   - Server holds the canonical state; late-joining browsers receive
//     a synthetic init on connect.
//
// Protocol — agent → server (one JSON object per line on stdin):
//   {"type":"init",        "title": "...", "tasks": Task[]}
//   {"type":"task.add",    "task": Task}              // append
//   {"type":"task.update", "id": "...", "patch": Partial<Task>}
//   {"type":"task.remove", "id": "..."}
//   {"type":"message",     "text": "..."}             // toast
//   {"type":"close"}                                  // end session
//
// Protocol — server → agent (one JSON object per line on stdout):
//   {"type":"ready",          "url":"...", "port":..., "session_id":"..."}
//   {"type":"connected"}                              // browser opened WS
//   {"type":"disconnected"}                           // browser closed WS
//   {"type":"task.toggle",    "id":"...", "status":"todo|doing|done"}
//   {"type":"task.edit",      "id":"...", "title":"..."}
//   {"type":"task.add",       "task": Task}           // user added
//   {"type":"task.remove",    "id":"..."}             // user deleted
//   {"type":"submit",         "tasks": Task[]}        // final state on submit
//   {"type":"closed",         "reason":"submit|cancel|timeout|stdin_eof|close"}
//
// Protocol — server ↔ browser (WebSocket): same task.* events flow
// in both directions; the server is a proxy that mutates the state
// snapshot when either side speaks.
//
// Exit codes mirror digestify's review.ts: 0 submit, 2 bad args,
// 124 idle timeout, 130 cancel.

import { parseArgs } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

type TaskStatus = "todo" | "doing" | "done";
type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  notes?: string;
};
type BoardState = { title: string; tasks: Task[] };

type AgentMsg =
  | { type: "init"; title?: string; tasks?: Task[] }
  | { type: "task.add"; task: Task }
  | { type: "task.update"; id: string; patch: Partial<Task> }
  | { type: "task.remove"; id: string }
  | { type: "message"; text: string }
  | { type: "close" };

type ServerToAgentMsg =
  | { type: "ready"; url: string; port: number; session_id: string }
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "task.toggle"; id: string; status: TaskStatus }
  | { type: "task.edit"; id: string; title: string }
  | { type: "task.add"; task: Task }
  | { type: "task.remove"; id: string }
  | { type: "submit"; tasks: Task[] }
  | { type: "closed"; reason: "submit" | "cancel" | "timeout" | "stdin_eof" | "close" };

type BrowserMsg =
  | { type: "task.toggle"; id: string; status: TaskStatus }
  | { type: "task.edit"; id: string; title: string }
  | { type: "task.add"; task: Task }
  | { type: "task.remove"; id: string }
  | { type: "submit" }
  | { type: "cancel" };

const PORT_SUFFIX_RE = /-p(\d{2,5})$/;
const VALID_STATUS: TaskStatus[] = ["todo", "doing", "done"];

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
    if (e?.code !== "EPIPE") throw e;
  }
}

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
        catch (e: any) { process.stderr.write(`taskboard: bad json on stdin: ${e.message}\n`); }
      }
      if (done) {
        buffer = buffer.trim();
        if (buffer) {
          try { yield JSON.parse(buffer) as AgentMsg; }
          catch (e: any) { process.stderr.write(`taskboard: bad json on stdin (final): ${e.message}\n`); }
        }
        yield null;
        return;
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

// State mutation helpers. All keep `state.tasks` in place (replace by id)
// so the agent and browser see consistent ordering.
function applyTaskAdd(state: BoardState, task: Task): boolean {
  if (state.tasks.some((t) => t.id === task.id)) return false;
  state.tasks.push(task);
  return true;
}

function applyTaskUpdate(state: BoardState, id: string, patch: Partial<Task>): boolean {
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  // Status guard: drop invalid status values quietly so a malformed agent
  // message can't corrupt the board.
  if (patch.status && !VALID_STATUS.includes(patch.status)) {
    const { status: _drop, ...rest } = patch;
    patch = rest;
  }
  state.tasks[idx] = { ...state.tasks[idx], ...patch };
  return true;
}

function applyTaskRemove(state: BoardState, id: string): boolean {
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  state.tasks.splice(idx, 1);
  return true;
}

async function main(argv: string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        title: { type: "string", default: "Task Board" },
        timeout: { type: "string", default: "1800" },
        "no-open": { type: "boolean", default: false },
        port: { type: "string", default: "0" },
        host: { type: "string", default: "127.0.0.1" },
        id: { type: "string" },
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

  const template = await Bun.file(join(SCRIPT_DIR, "template.html")).text();

  const state: BoardState = { title: v.title as string, tasks: [] };
  const sockets = new Set<any>();

  let resolveDone!: (val: { code: number; reason: ServerToAgentMsg["reason"] extends infer R ? R : never }) => void;
  let settled = false;
  const done = new Promise<{ code: number; reason: any }>((res) => {
    resolveDone = (v) => { if (settled) return; settled = true; res(v); };
  });

  let lastActivity = performance.now();
  const touch = () => { lastActivity = performance.now(); };

  function broadcast(msg: object) {
    const s = JSON.stringify(msg);
    for (const ws of sockets) {
      try { ws.send(s); } catch { /* socket closed */ }
    }
  }

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
          ws.send(JSON.stringify({ type: "init", title: state.title, tasks: state.tasks }));
        },
        message(ws, raw) {
          touch();
          let msg: BrowserMsg;
          try { msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)); }
          catch (e: any) {
            process.stderr.write(`taskboard: bad json from browser: ${e.message}\n`);
            return;
          }
          if (msg.type === "task.toggle") {
            if (!VALID_STATUS.includes(msg.status)) return;
            if (applyTaskUpdate(state, msg.id, { status: msg.status })) {
              broadcast({ type: "task.update", id: msg.id, patch: { status: msg.status } });
              emitToAgent({ type: "task.toggle", id: msg.id, status: msg.status });
            }
          } else if (msg.type === "task.edit") {
            if (applyTaskUpdate(state, msg.id, { title: msg.title })) {
              broadcast({ type: "task.update", id: msg.id, patch: { title: msg.title } });
              emitToAgent({ type: "task.edit", id: msg.id, title: msg.title });
            }
          } else if (msg.type === "task.add") {
            if (applyTaskAdd(state, msg.task)) {
              broadcast({ type: "task.add", task: msg.task });
              emitToAgent({ type: "task.add", task: msg.task });
            }
          } else if (msg.type === "task.remove") {
            if (applyTaskRemove(state, msg.id)) {
              broadcast({ type: "task.remove", id: msg.id });
              emitToAgent({ type: "task.remove", id: msg.id });
            }
          } else if (msg.type === "submit") {
            emitToAgent({ type: "submit", tasks: state.tasks });
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
  if (!sessionId) sessionId = `taskboard-${randHex(4)}-p${boundPort}`;
  const wsUrl = `ws://${host}:${boundPort}/ws`;
  pageHtml = template
    .replace(/__TITLE__/g, htmlEscape(state.title))
    .replace(/__WS_URL__/g, htmlEscape(wsUrl))
    .replace(/__SESSION_ID__/g, htmlEscape(sessionId));

  const url = `http://${host}:${boundPort}`;
  emitToAgent({ type: "ready", url, port: boundPort, session_id: sessionId });
  if (!v["no-open"]) openBrowser(url);

  (async () => {
    for await (const msg of readJsonLines()) {
      if (msg === null) break; // stdin EOF — leave the surface up
      touch();
      if (msg.type === "init") {
        if (typeof msg.title === "string") state.title = msg.title;
        if (Array.isArray(msg.tasks)) state.tasks = msg.tasks.filter((t) => VALID_STATUS.includes(t.status));
        broadcast({ type: "init", title: state.title, tasks: state.tasks });
      } else if (msg.type === "task.add") {
        if (applyTaskAdd(state, msg.task)) broadcast({ type: "task.add", task: msg.task });
      } else if (msg.type === "task.update") {
        if (applyTaskUpdate(state, msg.id, msg.patch)) {
          broadcast({ type: "task.update", id: msg.id, patch: msg.patch });
        }
      } else if (msg.type === "task.remove") {
        if (applyTaskRemove(state, msg.id)) broadcast({ type: "task.remove", id: msg.id });
      } else if (msg.type === "message") {
        broadcast({ type: "message", text: msg.text });
      } else if (msg.type === "close") {
        resolveDone({ code: 0, reason: "close" });
        return;
      }
    }
  })();

  const idleTimer = setInterval(() => {
    if ((performance.now() - lastActivity) / 1000 >= timeout) {
      resolveDone({ code: 124, reason: "timeout" });
    }
  }, 250);

  const { code, reason } = await done;
  clearInterval(idleTimer);
  emitToAgent({ type: "closed", reason });
  broadcast({ type: "message", text: `session ended: ${reason}` });
  for (const ws of sockets) { try { ws.close(); } catch {} }
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

export { main, applyTaskAdd, applyTaskUpdate, applyTaskRemove, parsePortFromSessionId, htmlEscape };
export type { Task, TaskStatus, BoardState };
