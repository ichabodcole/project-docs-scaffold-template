// The board's daemon: `Bun.serve` on 127.0.0.1, started by `scripts/cli.ts`.
//
// It reads the project only through the project's own `pdocs` CLI, and writes
// only by spawning `pdocs set`, once per request, for a triage decision, a
// cycle membership, or the Undo of one of those. It writes no file of its own
// into the project.

import { randomBytes, timingSafeEqual } from "node:crypto";
import { featureArgs, cycleArgs, readSnapshot, type SnapshotResult } from "../lib/snapshot.ts";
import {
  findRoot,
  pdocsRunner,
  SLUG,
  TIMEOUT_EXIT,
  type PdocsFailure,
  type PdocsRunner,
} from "../lib/pdocs.ts";
import { HOST, removeLog, removePointer, writePointer } from "../lib/state.ts";
import {
  buildRestore,
  parseWrite,
  planWrite,
  undoStillApplies,
  writtenValues,
  type RestoreKey,
} from "../lib/writes.ts";

export const TOKEN_HEADER = "x-board-token";
export const IDLE_LIMIT_MS = 30 * 60 * 1000;
const SNAPSHOT_TTL_MS = 1000;
const MAX_BODY_BYTES = 8 * 1024;
const MAX_UNDOS = 100;

export interface BoardOptions {
  root: string;
  run: PdocsRunner;
  token: string;
  /** The port the server is bound to; set once it is listening. */
  port: number;
  log?: (line: string) => void;
  now?: () => number;
}

export interface Board {
  fetch(req: Request): Promise<Response>;
  /** When the board's own page last called, in `now()`'s milliseconds. */
  lastRequest(): number;
  options: BoardOptions;
}

/** Whether the server has gone long enough without a request to exit. */
export function idleExpired(lastRequest: number, now: number, limit = IDLE_LIMIT_MS): boolean {
  return now - lastRequest >= limit;
}

/** Compare a presented token with the session's, in constant time. */
export function tokenMatches(given: string | null, token: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

const HEADERS = { "cache-control": "no-store", "x-content-type-options": "nosniff" };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...HEADERS, "content-type": "application/json; charset=utf-8" },
  });
}

function refuse(
  status: number,
  kind: string,
  message: string,
  extra: Record<string, unknown> = {}
): Response {
  return json(status, { ok: false, error: { kind, message, ...extra } });
}

/** A `pdocs` failure, passed on in its own words. */
function pdocsRefusal(failure: PdocsFailure, extra: Record<string, unknown> = {}): Response {
  const status =
    failure.exit_code === 5 ? 404 : failure.exit_code === 6 ? 409 : failure.exit_code === TIMEOUT_EXIT ? 504 : 422;
  const { ok: _ok, ...error } = failure;
  return json(status, { ok: false, error, ...extra });
}

// Stands in until the shell is built.
const PLACEHOLDER = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Work board</title>
  </head>
  <body>
    <h1>Work board</h1>
    <p>The board's server is running. Its pages are not built yet.</p>
  </body>
</html>
`;

/** An Undo this server handed out: its body, and what its write left behind. */
interface IssuedUndo {
  body: string;
  written: Partial<Record<RestoreKey, string | null>>;
}

/**
 * Read a request body of at most `MAX_BODY_BYTES`. A declared length over the
 * cap is refused before anything is read, and the read itself stops at the cap.
 */
async function boundedBody(req: Request): Promise<string | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > MAX_BODY_BYTES) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export function createBoard(options: BoardOptions): Board {
  const now = options.now ?? Date.now;
  const log = options.log ?? (() => {});
  let last = now();
  // One read at a time: polls that arrive while a read is running share it,
  // and its result is served for a second after it finishes.
  let pending: Promise<SnapshotResult> | null = null;
  let cached: { at: number; result: SnapshotResult } | null = null;
  /** The Undos this server handed out and has not seen used, oldest first. */
  const undos: IssuedUndo[] = [];
  let writing: Promise<unknown> = Promise.resolve();

  const read = (): Promise<SnapshotResult> => {
    const mine: Promise<SnapshotResult> = readSnapshot(options.run)
      .then((result) => {
        cached = { at: now(), result };
        return result;
      })
      .finally(() => {
        if (pending === mine) pending = null;
      });
    pending = mine;
    return mine;
  };

  const snapshot = async (fresh = false): Promise<SnapshotResult> => {
    if (!fresh) {
      if (pending) return pending;
      if (cached && now() - cached.at < SNAPSHOT_TTL_MS) return cached.result;
      return read();
    }
    // A write needs a read that started after the write arrived.
    if (pending) await pending.catch(() => {});
    return pending ?? read();
  };

  const snapshotRefusal = (result: Extract<SnapshotResult, { ok: false }>): Response => {
    const { ok: _ok, ...error } = result.error;
    const status =
      result.error.reason !== "cli-error" ? 409 : result.error.exit_code === TIMEOUT_EXIT ? 504 : 502;
    return json(status, { ok: false, error });
  };

  /** Why an `/api/` request is not the board's own page calling, or `null`. */
  const foreign = (req: Request, urlHost: string | null): Response | null => {
    const expected = `${HOST}:${options.port}`;
    const host = req.headers.get("host") ?? urlHost;
    if (host !== expected) return refuse(403, "forbidden", "this server answers only as " + expected + ".");
    const origin = req.headers.get("origin");
    if (origin !== null && origin !== `http://${expected}`)
      return refuse(403, "forbidden", "requests from another origin are refused.");
    // The header only: a token in the query string is never read.
    if (!tokenMatches(req.headers.get(TOKEN_HEADER), options.token))
      return refuse(401, "unauthorized", `the \`${TOKEN_HEADER}\` header is missing or wrong.`);
    return null;
  };

  const write = async (req: Request): Promise<Response> => {
    const text = await boundedBody(req);
    if (text === null) return refuse(413, "usage", "the body is too large.");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return refuse(400, "usage", "the body is not JSON.");
    }
    const parsed = parseWrite(body);
    if (!parsed.ok) return refuse(400, "usage", parsed.message);
    const undo =
      parsed.write.kind === "restore" ? undos.find((u) => u.body === JSON.stringify(parsed.write)) : undefined;
    if (parsed.write.kind === "restore" && !undo)
      return refuse(409, "conflict", "this is not an Undo this board handed out; Undo is no longer available.");

    const current = await snapshot(true);
    if (!current.ok) return snapshotRefusal(current);
    const plan = planWrite(parsed.write, current.snapshot);
    if (!plan.ok) return refuse(plan.status, plan.kind, plan.message);
    if (parsed.write.kind === "restore" && undo && !undoStillApplies(plan.item, parsed.write, undo.written))
      return refuse(409, "conflict", "the item changed since this write; Undo is no longer available.");

    log(`spawn ${plan.command}`);
    const result = await options.run(plan.argv);
    cached = null;
    if (!result.ok) {
      log(`refused by pdocs (exit ${result.exit_code}): ${result.message}`);
      return pdocsRefusal(result, { command: plan.command });
    }
    const data = (result.data ?? {}) as { path?: unknown; changes?: unknown; advisories?: unknown };
    // An Undo is used once, and is not itself undone.
    let restore = null;
    if (undo) undos.splice(undos.indexOf(undo), 1);
    else {
      restore = buildRestore(parsed.write.ref, data.changes);
      if (restore) {
        undos.push({ body: JSON.stringify(restore), written: writtenValues(data.changes) });
        if (undos.length > MAX_UNDOS) undos.shift();
      }
    }
    return json(200, {
      ok: true,
      data: {
        command: plan.command,
        path: data.path ?? plan.item.path,
        changes: data.changes ?? [],
        advisories: data.advisories ?? [],
        restore,
      },
    });
  };

  const route = async (req: Request): Promise<Response> => {
    let url: URL | null = null;
    try {
      url = new URL(req.url);
    } catch {
      // A Host that makes no URL: not the board's own page.
    }
    if (!url) return refuse(403, "forbidden", "this server answers only as " + `${HOST}:${options.port}.`);
    const { pathname } = url;
    if (!pathname.startsWith("/api/")) {
      if (pathname !== "/") return refuse(404, "not_found", "no such page.");
      if (req.method !== "GET" && req.method !== "HEAD") return refuse(405, "usage", "GET only.");
      return new Response(PLACEHOLDER, {
        headers: { ...HEADERS, "content-type": "text/html; charset=utf-8", "referrer-policy": "no-referrer" },
      });
    }

    const refusal = foreign(req, url.host);
    if (refusal) {
      log(`refused ${refusal.status} ${req.method} ${pathname}`);
      return refusal;
    }
    // Only the board's own page keeps the server alive.
    last = now();

    if (pathname === "/api/write") {
      if (req.method !== "POST") return refuse(405, "usage", "POST only.");
      // One write at a time: each is one file and one call.
      const next = writing.then(() => write(req));
      writing = next.catch(() => {});
      const res = await next;
      if (res.status !== 200) log(`refused ${res.status} POST /api/write`);
      return res;
    }

    if (req.method !== "GET") return refuse(405, "usage", "GET only.");
    if (pathname === "/api/health")
      return json(200, { ok: true, data: { pid: process.pid, root: options.root } });
    if (pathname === "/api/snapshot") {
      const result = await snapshot();
      if (!result.ok) return snapshotRefusal(result);
      return json(200, { ok: true, data: { hash: result.hash, snapshot: result.snapshot } });
    }
    const page = /^\/api\/(cycle|feature)\/([^/]+)$/.exec(pathname);
    if (page) {
      const slug = page[2] ?? "";
      if (!SLUG.test(slug)) return refuse(400, "usage", "that is not a slug.");
      const result = await options.run(page[1] === "cycle" ? cycleArgs(slug) : featureArgs(slug));
      return result.ok ? json(200, { ok: true, data: result.data }) : pdocsRefusal(result);
    }
    return refuse(404, "not_found", "no such route.");
  };

  return {
    options,
    lastRequest: () => last,
    fetch: async (req) => {
      try {
        return await route(req);
      } catch (error) {
        log(`fault ${error instanceof Error ? error.message : String(error)}`);
        return refuse(500, "internal", "the board's server failed on this request.");
      }
    },
  };
}

// ---- the daemon --------------------------------------------------------------

function main(argv: string[]): void {
  const at = argv.indexOf("--root");
  const found = findRoot(at === -1 ? process.cwd() : (argv[at + 1] ?? ""));
  if (!found.ok) {
    console.error(found.message);
    process.exit(5);
  }
  const { root, cli } = found;
  const log = (line: string): void => console.log(`${new Date().toISOString()} ${line}`);

  const run = pdocsRunner(root, cli);
  const board = createBoard({
    root,
    run,
    token: randomBytes(32).toString("hex"),
    port: 0,
    log,
  });
  const server = Bun.serve({ hostname: HOST, port: 0, fetch: board.fetch });
  const port = server.port ?? 0;
  board.options.port = port;

  const shutdown = (why: string): void => {
    log(`stop ${why}`);
    run.killAll();
    removePointer(root, process.pid);
    removeLog(root);
    void server.stop(true);
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("on request"));
  process.on("SIGINT", () => shutdown("on interrupt"));
  setInterval(() => {
    if (idleExpired(board.lastRequest(), Date.now())) shutdown("after 30 minutes with no request");
  }, 30 * 1000);

  writePointer({
    pid: process.pid,
    port,
    token: board.options.token,
    root,
    started: new Date().toISOString(),
  });
  log(`start pid ${process.pid} on ${HOST}:${port} for ${root}`);
}

if (import.meta.main) main(process.argv.slice(2));
