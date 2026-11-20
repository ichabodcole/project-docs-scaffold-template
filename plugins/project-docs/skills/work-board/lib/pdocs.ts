// The bridge to a project's own `pdocs` CLI. The board reads and writes a
// project only through `bun <root>/scripts/pdocs/cli.ts … --json`; nothing here
// imports the CLI's modules, so the JSON envelope is the whole contract.

import { existsSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** What one `pdocs` call came back with. A failure keeps the CLI's own words. */
export type PdocsResult<T = unknown> =
  | { ok: true; data: T }
  | {
      ok: false;
      kind: string;
      exit_code: number;
      message: string;
      choices?: string[];
      details?: Record<string, unknown>;
    };

export type PdocsFailure = Extract<PdocsResult, { ok: false }>;

/** Runs one `pdocs` command (`--json` is added by the runner). */
export type PdocsRunner = (args: string[]) => Promise<PdocsResult>;

export type RootResult =
  { ok: true; root: string; cli: string } | { ok: false; message: string; hint: string };

/**
 * A slug the board will put in an argv: it starts with a letter or a digit, so
 * it can never be read as a flag, and holds nothing a filename would not.
 */
export const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const CONFIG = ".project-docs.json";
const CLI_REL = join("scripts", "pdocs", "cli.ts");

/**
 * The project a working directory belongs to: the first folder, walking up,
 * that holds `.project-docs.json`. Its CLI must sit beside it.
 */
export function findRoot(cwd: string): RootResult {
  let dir = resolve(cwd);
  if (existsSync(dir)) dir = realpathSync(dir);
  for (;;) {
    if (existsSync(join(dir, CONFIG))) {
      const cli = join(dir, CLI_REL);
      if (existsSync(cli)) return { ok: true, root: dir, cli };
      return {
        ok: false,
        message: `${dir} has a ${CONFIG} but no ${CLI_REL}: this project has no pdocs CLI for the board to read.`,
        hint: "Run the `update-project-docs` skill to install it, then open the board again.",
      };
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return {
    ok: false,
    message: `no ${CONFIG} in ${resolve(cwd)} or any folder above it: this is not a project-docs project.`,
    hint: "Run the board from inside a project that uses project-docs.",
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Read one finished `pdocs … --json` call: the envelope on stdout when it
 * succeeded, the error envelope on stderr when it did not. Output that is not
 * an envelope (an older CLI, a crash) still yields a failure with the exit code.
 */
export function parseResult(exitCode: number, stdout: string, stderr: string): PdocsResult {
  if (exitCode === 0) {
    const env = parseJson(stdout);
    if (isRecord(env) && env.ok === true && "data" in env) return { ok: true, data: env.data };
    return {
      ok: false,
      kind: "internal",
      exit_code: 1,
      message: "pdocs exited 0 but did not print a JSON envelope.",
    };
  }
  for (const text of [stderr, stdout]) {
    const env = parseJson(text);
    if (!isRecord(env) || !isRecord(env.error)) continue;
    const e = env.error;
    const failure: PdocsFailure = {
      ok: false,
      kind: typeof e.kind === "string" ? e.kind : "internal",
      exit_code: typeof e.exit_code === "number" ? e.exit_code : exitCode,
      message: typeof e.message === "string" ? e.message : `pdocs exited ${exitCode}.`,
    };
    if (Array.isArray(e.choices)) failure.choices = e.choices.filter((c) => typeof c === "string");
    if (isRecord(e.details)) failure.details = e.details;
    return failure;
  }
  const line = (stderr.trim() || stdout.trim()).split("\n")[0] ?? "";
  return {
    ok: false,
    kind: exitCode === 2 ? "usage" : "internal",
    exit_code: exitCode,
    message: line || `pdocs exited ${exitCode}.`,
  };
}

/** The argv of one call. An array, never a shell string. */
export function pdocsArgv(cli: string, args: string[]): string[] {
  return [process.execPath, cli, ...args, "--json"];
}

/** How long one call may take before its child is stopped. */
export const READ_TIMEOUT_MS = 10_000;
export const SET_TIMEOUT_MS = 15_000;
/** The exit code of a call that was stopped for taking too long: `timeout`'s own. */
export const TIMEOUT_EXIT = 124;

/** A runner that spawns, and can stop every child it still has. */
export type SpawningRunner = PdocsRunner & { killAll(): void };

/**
 * A runner for one project. The CLI works on its own repository by default, so
 * no `--root` is passed; the working directory is the root all the same.
 *
 * Every call has a limit: a child still running when it passes is killed, and
 * the call returns a failure. `killAll` does the same to every live child at
 * once, for a server that is shutting down.
 */
export function pdocsRunner(
  root: string,
  cli: string,
  env: Record<string, string | undefined> = process.env,
  timeouts: { read: number; set: number } = { read: READ_TIMEOUT_MS, set: SET_TIMEOUT_MS }
): SpawningRunner {
  const live = new Set<{ kill(signal?: number | NodeJS.Signals): void }>();
  const run: PdocsRunner = async (args) => {
    const child = Bun.spawn(pdocsArgv(cli, args), {
      cwd: root,
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    live.add(child);
    const limit = args[0] === "set" ? timeouts.set : timeouts.read;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, limit);
    try {
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      if (timedOut)
        return {
          ok: false,
          kind: "timeout",
          exit_code: TIMEOUT_EXIT,
          message: `\`pdocs ${args.join(" ")}\` did not finish within ${limit / 1000} s and was stopped.`,
        };
      return parseResult(exitCode, stdout, stderr);
    } finally {
      clearTimeout(timer);
      live.delete(child);
    }
  };
  return Object.assign(run, {
    killAll: () => {
      for (const child of live) child.kill("SIGKILL");
    },
  });
}
