// Where a running board is remembered: one pointer file and one log per
// project, in a folder that belongs to the current user alone and is never
// inside the project's repository. The pointer holds the session token, so the
// folder is checked before anything in it is read or written.

import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Pointer {
  pid: number;
  port: number;
  token: string;
  /** Rebuilt from `port` and `token` on every read; never stored. */
  url: string;
  root: string;
  started: string;
}

export const HOST = "127.0.0.1";
const TOKEN = /^[0-9a-f]{64}$/;
/** Create, fail if the name exists, and never follow a link. */
const EXCLUSIVE = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW;

/** A state folder or file that is not what the board made. */
export class StateError extends Error {}

const currentUid = (): number | null => (typeof process.getuid === "function" ? process.getuid() : null);

/**
 * The folder every board's pointer and log live in: the user's runtime folder
 * when the system names one, else a folder in the temp directory named for the
 * user, because that directory is shared on Linux.
 */
export function stateDir(env: Record<string, string | undefined> = process.env): string {
  if (env.XDG_RUNTIME_DIR) return join(env.XDG_RUNTIME_DIR, "pdocs-work-board");
  return join(tmpdir(), `pdocs-work-board-${currentUid() ?? "user"}`);
}

/** A project's key: a hash of its real path, so two paths to one root agree. */
export function rootKey(root: string): string {
  const real = existsSync(root) ? realpathSync(root) : root;
  return createHash("sha256").update(real).digest("hex").slice(0, 16);
}

/**
 * The port a project's board asks for first: the same one every time, taken
 * from the root's key, in the range no service is assigned (49152 to 65535).
 * The page's origin then survives a restart, and with it what the browser
 * keeps for the board. The token is still new on every start.
 */
export function preferredPort(root: string): number {
  return 49152 + (Number.parseInt(rootKey(root).slice(0, 8), 16) % 16384);
}

export const pointerPath = (root: string): string => join(stateDir(), `${rootKey(root)}.json`);
export const logPath = (root: string): string => join(stateDir(), `${rootKey(root)}.log`);

export const validPort = (port: unknown): port is number =>
  typeof port === "number" && Number.isInteger(port) && port >= 1 && port <= 65535;
export const validToken = (token: unknown): token is string => typeof token === "string" && TOKEN.test(token);

/** The URL the user opens: the token rides in it, and the page sends it back as a header. */
export function boardUrl(port: number, token: string): string {
  if (!validPort(port) || !validToken(token)) throw new StateError("not a board's port and token.");
  return `http://${HOST}:${port}/?token=${token}`;
}

/**
 * Make the state folder, then refuse it unless it is a real directory (not a
 * link), owned by the current user, with mode 0700. Where the platform has no
 * user ids, only the kind is checked.
 */
export function ensureStateDir(): string {
  const dir = stateDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stat = lstatSync(dir);
  const uid = currentUid();
  const why = !stat.isDirectory()
    ? "it is not a directory"
    : uid !== null && stat.uid !== uid
      ? "it belongs to another user"
      : uid !== null && (stat.mode & 0o777) !== 0o700
        ? `its mode is ${(stat.mode & 0o777).toString(8).padStart(4, "0")}, not 0700`
        : null;
  if (why) throw new StateError(`the board's state folder ${dir} cannot be used: ${why}. Remove it, or fix it, and run again.`);
  return dir;
}

/** Whether a path is absent, or a regular file the current user owns. */
function ownFileOrAbsent(path: string): "absent" | "own" | "foreign" {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    return "absent";
  }
  const uid = currentUid();
  return stat.isFile() && (uid === null || stat.uid === uid) ? "own" : "foreign";
}

/**
 * Open a project's log, new and empty, and return its descriptor. A log left
 * by an earlier board is removed first, but only if it is a regular file of
 * the user's own: a link or anything else in its place is refused.
 */
export function openLog(root: string): number {
  ensureStateDir();
  const path = logPath(root);
  const kind = ownFileOrAbsent(path);
  if (kind === "foreign") throw new StateError(`the board's log ${path} is not a file the board made. Remove it and run again.`);
  if (kind === "own") rmSync(path);
  return openSync(path, EXCLUSIVE, 0o600);
}

/** Remove a project's log, if it is the board's own file. */
export function removeLog(root: string): void {
  const path = logPath(root);
  if (ownFileOrAbsent(path) === "own") rmSync(path, { force: true });
}

/** The pointer of a project, or `null` when there is none or it is not well formed. */
export function readPointer(root: string): Pointer | null {
  const path = pointerPath(root);
  if (ownFileOrAbsent(path) !== "own") return null;
  try {
    const p = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    if (
      typeof p.pid === "number" &&
      Number.isInteger(p.pid) &&
      p.pid > 0 &&
      validPort(p.port) &&
      validToken(p.token) &&
      typeof p.root === "string" &&
      typeof p.started === "string"
    )
      // The URL is built here, from the checked port and token. One stored in
      // the file would be a string someone else could have written.
      return {
        pid: p.pid,
        port: p.port,
        token: p.token,
        url: boardUrl(p.port, p.token),
        root: p.root,
        started: p.started,
      };
  } catch {
    // Half-written or not JSON: there is no board to point at.
  }
  return null;
}

/**
 * Written whole or not at all: to a temp file of a random name, created
 * exclusively, then renamed over the pointer. `tmpName` is for tests.
 */
export function writePointer(
  pointer: Omit<Pointer, "url">,
  tmpName = `${rootKey(pointer.root)}.${randomBytes(8).toString("hex")}.tmp`
): void {
  const dir = ensureStateDir();
  const tmp = join(dir, tmpName);
  const { pid, port, token, root, started } = pointer;
  const fd = openSync(tmp, EXCLUSIVE, 0o600);
  try {
    writeSync(fd, `${JSON.stringify({ pid, port, token, root, started })}\n`);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, pointerPath(root));
}

/** Remove a project's pointer; with `pid`, only if it is that process's. */
export function removePointer(root: string, pid?: number): void {
  if (pid !== undefined && readPointer(root)?.pid !== pid) return;
  rmSync(pointerPath(root), { force: true });
}

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
