// The state folder and the files in it. `XDG_RUNTIME_DIR` points at a temp
// folder for the length of this file, so nothing here touches a real board.

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  boardUrl,
  ensureStateDir,
  logPath,
  openLog,
  pointerPath,
  readPointer,
  removeLog,
  removePointer,
  rootKey,
  stateDir,
  StateError,
  writePointer,
} from "./state.ts";
import { cleanup, tempDir } from "./test-support.ts";

const saved = process.env.XDG_RUNTIME_DIR;
afterAll(() => {
  if (saved === undefined) delete process.env.XDG_RUNTIME_DIR;
  else process.env.XDG_RUNTIME_DIR = saved;
  cleanup();
});

let runtime = "";
beforeEach(() => {
  runtime = tempDir("work-board-runtime-");
  process.env.XDG_RUNTIME_DIR = runtime;
});

const mode = (path: string): number => lstatSync(path).mode & 0o777;
const TOKEN = "ab".repeat(32);
const ROOT = "/some/project";
const pointer = { pid: 4242, port: 5173, token: TOKEN, root: ROOT, started: "2026-11-19T00:00:00.000Z" };

describe("where the state folder is", () => {
  test("the user's runtime folder when the system names one", () => {
    expect(stateDir({ XDG_RUNTIME_DIR: "/run/user/1000" })).toBe("/run/user/1000/pdocs-work-board");
  });

  test("else a folder in the temp directory named for the user, not a shared name", () => {
    expect(stateDir({})).toBe(join(tmpdir(), `pdocs-work-board-${process.getuid?.()}`));
    expect(stateDir({ XDG_RUNTIME_DIR: "" })).toBe(stateDir({}));
  });
});

describe("the state folder is the user's alone", () => {
  test("it is made with mode 0700", () => {
    const dir = ensureStateDir();
    expect(dir).toBe(join(runtime, "pdocs-work-board"));
    expect(mode(dir)).toBe(0o700);
    expect(ensureStateDir()).toBe(dir);
  });

  test("a folder already there with another mode is refused, naming the path", () => {
    const dir = join(runtime, "pdocs-work-board");
    mkdirSync(dir);
    chmodSync(dir, 0o755);
    expect(() => ensureStateDir()).toThrow(StateError);
    expect(() => ensureStateDir()).toThrow(dir);
    expect(() => ensureStateDir()).toThrow("0755");
    expect(() => writePointer(pointer)).toThrow(StateError);
    expect(() => openLog(ROOT)).toThrow(StateError);
    expect(readdirSync(dir)).toEqual([]);
  });

  test("a link to another folder is refused, and nothing is written through it", () => {
    const elsewhere = tempDir("work-board-elsewhere-");
    chmodSync(elsewhere, 0o700);
    symlinkSync(elsewhere, join(runtime, "pdocs-work-board"));
    expect(() => ensureStateDir()).toThrow("not a directory");
    expect(() => writePointer(pointer)).toThrow(StateError);
    expect(readdirSync(elsewhere)).toEqual([]);
  });

  test("a file in its place is refused", () => {
    writeFileSync(join(runtime, "pdocs-work-board"), "");
    expect(() => ensureStateDir()).toThrow();
  });
});

describe("the pointer", () => {
  test("is written 0600, without a URL, and read back with one rebuilt from port and token", () => {
    writePointer(pointer);
    const path = pointerPath(ROOT);
    expect(mode(path)).toBe(0o600);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(pointer);
    expect(readPointer(ROOT)).toEqual({ ...pointer, url: `http://127.0.0.1:5173/?token=${TOKEN}` });
    expect(readdirSync(stateDir())).toEqual([`${rootKey(ROOT)}.json`]);
  });

  test("a URL stored in the file is never used", () => {
    ensureStateDir();
    writeFileSync(pointerPath(ROOT), JSON.stringify({ ...pointer, url: "http://evil.example/?token=x" }));
    expect(readPointer(ROOT)?.url).toBe(`http://127.0.0.1:5173/?token=${TOKEN}`);
  });

  test("a port or token that is not one makes no pointer", () => {
    ensureStateDir();
    for (const bad of [
      { port: 0 },
      { port: 65536 },
      { port: 80.5 },
      { port: "5173" },
      { port: "5173@evil.example" },
      { token: "abc" },
      { token: `${TOKEN}&x=1` },
      { token: TOKEN.toUpperCase() },
      { token: `${TOKEN.slice(0, 62)}/#` },
      { pid: 0 },
      { pid: -1 },
      { pid: 1.5 },
      { root: 3 },
    ]) {
      writeFileSync(pointerPath(ROOT), JSON.stringify({ ...pointer, ...bad }));
      expect([bad, readPointer(ROOT)]).toEqual([bad, null]);
    }
    writeFileSync(pointerPath(ROOT), "{");
    expect(readPointer(ROOT)).toBeNull();
    expect(() => boardUrl(0, TOKEN)).toThrow(StateError);
    expect(() => boardUrl(5173, "evil.example/")).toThrow(StateError);
  });

  test("a link where the pointer should be is not read", () => {
    ensureStateDir();
    const planted = join(tempDir("work-board-planted-"), "p.json");
    writeFileSync(planted, JSON.stringify(pointer));
    symlinkSync(planted, pointerPath(ROOT));
    expect(readPointer(ROOT)).toBeNull();
  });

  test("a temp file planted under its name is refused, and the pointer is left alone", () => {
    writePointer(pointer);
    const dir = stateDir();
    writeFileSync(join(dir, "planted.tmp"), "theirs");
    expect(() => writePointer({ ...pointer, pid: 7 }, "planted.tmp")).toThrow();
    expect(readFileSync(join(dir, "planted.tmp"), "utf8")).toBe("theirs");
    expect(readPointer(ROOT)?.pid).toBe(4242);
  });

  test("a link planted under its temp name is refused, and nothing is written through it", () => {
    const target = join(tempDir("work-board-target-"), "target");
    symlinkSync(target, join(ensureStateDir(), "planted.tmp"));
    expect(() => writePointer(pointer, "planted.tmp")).toThrow();
    expect(existsSync(target)).toBe(false);
    expect(readPointer(ROOT)).toBeNull();
  });

  test("is removed only for the process it names, when a pid is given", () => {
    writePointer(pointer);
    removePointer(ROOT, 1);
    expect(readPointer(ROOT)?.pid).toBe(4242);
    removePointer(ROOT, 4242);
    expect(readPointer(ROOT)).toBeNull();
  });
});

describe("the log", () => {
  test("is created new, 0600, and replaces the board's own earlier log", () => {
    let fd = openLog(ROOT);
    writeSync(fd, "first run\n");
    closeSync(fd);
    expect(mode(logPath(ROOT))).toBe(0o600);
    fd = openLog(ROOT);
    closeSync(fd);
    expect(readFileSync(logPath(ROOT), "utf8")).toBe("");
    removeLog(ROOT);
    expect(existsSync(logPath(ROOT))).toBe(false);
    removeLog(ROOT);
  });

  test("a link where the log should be is refused, and its target is untouched", () => {
    ensureStateDir();
    const target = join(tempDir("work-board-target-"), "precious");
    writeFileSync(target, "precious");
    symlinkSync(target, logPath(ROOT));
    expect(() => openLog(ROOT)).toThrow(StateError);
    expect(readFileSync(target, "utf8")).toBe("precious");
    removeLog(ROOT);
    expect(readFileSync(target, "utf8")).toBe("precious");
    expect(lstatSync(logPath(ROOT)).isSymbolicLink()).toBe(true);
  });

  test("a dangling link or a folder where the log should be is refused", () => {
    ensureStateDir();
    const target = join(tempDir("work-board-target-"), "not-yet");
    symlinkSync(target, logPath(ROOT));
    expect(() => openLog(ROOT)).toThrow(StateError);
    expect(existsSync(target)).toBe(false);
    mkdirSync(logPath("/another/project"));
    expect(() => openLog("/another/project")).toThrow(StateError);
  });
});
