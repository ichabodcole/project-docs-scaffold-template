#!/usr/bin/env bun
// The board's agent verbs: `open`, `status`, `stop`.
//
// Each prints one JSON line on stdout. A failure prints one pdocs-shaped error
// envelope on stderr and exits with pdocs' codes: 2 for a bad invocation, 5
// when there is no project (or no pdocs CLI) here, 6 when the project's CLI is
// too old for the board, 1 for a fault.

import { spawn } from "node:child_process";
import { closeSync } from "node:fs";
import { join } from "node:path";
import { findRoot, pdocsRunner } from "../lib/pdocs.ts";
import { readSnapshot } from "../lib/snapshot.ts";
import {
  boardUrl,
  ensureStateDir,
  HOST,
  isAlive,
  logPath,
  openLog,
  readPointer,
  removeLog,
  removePointer,
  type Pointer,
} from "../lib/state.ts";
import { TOKEN_HEADER } from "./server.ts";

const VERBS = ["open", "status", "stop"];
const KINDS: Record<number, string> = { 1: "internal", 2: "usage", 5: "not_found", 6: "conflict" };
const START_TIMEOUT_MS = 10_000;
const STOP_TIMEOUT_MS = 5_000;

const USAGE = `work-board — the project's work board, in a browser.

Usage
  bun scripts/cli.ts open [--no-browser]   Start the board for this project, or reuse the one running.
  bun scripts/cli.ts status                Say whether a board is running for this project.
  bun scripts/cli.ts stop                  Stop it.

Each prints one JSON line. Run it from inside the project.
`;

class Refusal extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
    readonly extra: { hint?: string; choices?: string[] } = {}
  ) {
    super(message);
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * The pointer's server, if it answers as this project's board: its health
 * route must name the pointer's own pid and root. Nothing else is reused,
 * opened in a browser, or signalled.
 */
async function running(root: string): Promise<Pointer | null> {
  ensureStateDir();
  const pointer = readPointer(root);
  // A pointer filed under this project must name this project.
  if (!pointer || pointer.root !== root || !isAlive(pointer.pid)) return null;
  try {
    const res = await fetch(`http://${HOST}:${pointer.port}/api/health`, {
      headers: { [TOKEN_HEADER]: pointer.token },
      signal: AbortSignal.timeout(2000),
    });
    const body = (await res.json()) as { ok?: boolean; data?: { pid?: number; root?: string } };
    if (res.ok && body.ok && body.data?.pid === pointer.pid && body.data.root === pointer.root) return pointer;
  } catch {
    // Not answering: the pointer is stale.
  }
  return null;
}

function project(): { root: string; cli: string } {
  const found = findRoot(process.cwd());
  if (!found.ok) throw new Refusal(found.message, 5, { hint: found.hint });
  return found;
}

function openBrowser(url: string): void {
  const [cmd, ...args] =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  try {
    spawn(cmd as string, args, { detached: true, stdio: "ignore" })
      .on("error", () => {})
      .unref();
  } catch {
    // No browser to open: the URL is on stdout.
  }
}

async function open(flags: string[]): Promise<object> {
  const { root, cli } = project();
  const run = pdocsRunner(root, cli);
  // The same read the server polls with, so what `open` accepts the board can show.
  const first = await readSnapshot(run, await run(["--version"]));
  if (!first.ok) {
    const { exit_code, message } = first.error;
    const hint = "hint" in first.error ? first.error.hint : undefined;
    throw new Refusal(message, exit_code in KINDS ? exit_code : 1, hint ? { hint } : {});
  }

  let pointer = await running(root);
  const reused = pointer !== null;
  if (!pointer) {
    removePointer(root);
    const log = openLog(root);
    const child = spawn(process.execPath, [join(import.meta.dir, "server.ts"), "--root", root], {
      cwd: root,
      detached: true,
      stdio: ["ignore", log, log],
    });
    child.unref();
    closeSync(log);
    const deadline = Date.now() + START_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const candidate = await running(root);
      if (candidate && candidate.pid === child.pid) {
        pointer = candidate;
        break;
      }
      if (child.exitCode !== null) break;
      await sleep(50);
    }
    if (!pointer) {
      if (child.pid !== undefined && child.exitCode === null) child.kill();
      throw new Refusal(`the board's server did not start. Its log is ${logPath(root)}.`, 1);
    }
  }
  // The URL is built from the checked port and token, never read from a file.
  const url = boardUrl(pointer.port, pointer.token);
  if (!flags.includes("--no-browser")) openBrowser(url);
  return { url, port: pointer.port, pid: pointer.pid, root, reused, log: logPath(root) };
}

async function status(): Promise<object> {
  const { root } = project();
  const pointer = await running(root);
  if (!pointer) return { running: false, root };
  return { running: true, url: pointer.url, port: pointer.port, pid: pointer.pid, root, log: logPath(root) };
}

async function stop(): Promise<object> {
  const { root } = project();
  // Only a process that answered as this project's board is signalled.
  const pointer = await running(root);
  if (!pointer) {
    removePointer(root);
    return { stopped: false, root };
  }
  process.kill(pointer.pid, "SIGTERM");
  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (isAlive(pointer.pid) && Date.now() < deadline) await sleep(50);
  if (isAlive(pointer.pid)) process.kill(pointer.pid, "SIGKILL");
  removePointer(root, pointer.pid);
  removeLog(root);
  return { stopped: true, pid: pointer.pid, root };
}

async function main(argv: string[]): Promise<number> {
  const verb = argv[0] ?? "";
  if (verb === "--help" || verb === "-h" || verb === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  try {
    if (verb === "") throw new Refusal(`a command is needed — ${VERBS.join(", ")}.`, 2, { choices: VERBS });
    if (!VERBS.includes(verb))
      throw new Refusal(`unknown command \`${verb}\` — ${VERBS.join(", ")}.`, 2, { choices: VERBS });
    const flags = argv.slice(1);
    const allowed = verb === "open" ? ["--no-browser"] : [];
    const bad = flags.find((f) => !allowed.includes(f));
    if (bad !== undefined)
      throw new Refusal(`\`${verb}\` takes no \`${bad}\`.`, 2, allowed.length > 0 ? { choices: allowed } : {});
    const out = verb === "open" ? await open(flags) : verb === "status" ? await status() : await stop();
    process.stdout.write(`${JSON.stringify(out)}\n`);
    return 0;
  } catch (error) {
    const refusal = error instanceof Refusal ? error : new Refusal(error instanceof Error ? error.message : String(error), 1);
    const envelope = {
      ok: false,
      error: {
        kind: KINDS[refusal.exitCode] ?? "internal",
        exit_code: refusal.exitCode,
        retryable: false,
        message: refusal.message,
        ...refusal.extra,
      },
      meta: { command: VERBS.includes(verb) ? verb : "work-board" },
    };
    process.stderr.write(`${JSON.stringify(envelope)}\n`);
    return refusal.exitCode;
  }
}

process.exitCode = await main(process.argv.slice(2));
