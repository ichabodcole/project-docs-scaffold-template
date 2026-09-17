// `childEnv()` is a guard, so it is tested the way a guard is: by the failure
// it exists to prevent, watched happening without it and not happening with it.
//
// Three claims, one `describe` each:
//   · it strips what git exports to a hook, and nothing a test asked for;
//   · the list it strips is git's own, not one somebody remembered;
//   · every spawn in every test file goes through it — a claim about CALL
//     SITES, which no test of the function can make. It is checked by reading
//     the test files, because the spawn that skips `childEnv()` is by
//     construction one that nobody thought about.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { CHILD_TZ, GIT_LOCAL_ENV, childEnv } from "./test-env.ts";

const REPO_ROOT = resolve(import.meta.dir, "../..");
const temps: string[] = [];
const temp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "pdocs-env-"));
  temps.push(d);
  return d;
};
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

/** Run `fn` with `vars` in THIS process's environment, as a hook would leave them. */
function withEnv<T>(vars: Record<string, string>, fn: () => T): T {
  const before = Object.fromEntries(
    Object.keys(vars).map((k) => [k, process.env[k]])
  );
  Object.assign(process.env, vars);
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("childEnv strips what a git hook exports", () => {
  test("every repository-local variable is gone, and the rest survives", () => {
    const vars = Object.fromEntries(GIT_LOCAL_ENV.map((k) => [k, "/nowhere"]));
    const env = withEnv({ ...vars, PDOCS_ENV_PROBE: "kept" }, () => childEnv());
    for (const k of GIT_LOCAL_ENV) expect(env[k]).toBeUndefined();
    expect(env.PDOCS_ENV_PROBE).toBe("kept");
    expect(env.TZ).toBe(CHILD_TZ);
  });

  test("`extra` is applied last, so a test's own variable wins", () => {
    const env = childEnv({ PATH: "/only/this", CLI_CHECK_EXIT: "9" });
    expect(env.PATH).toBe("/only/this");
    expect(env.CLI_CHECK_EXIT).toBe("9");
  });

  // The failure itself, without a commit: a hook's `GIT_INDEX_FILE` makes
  // `git ls-files` in a brand-new repository list THIS repository's files.
  test("an inherited GIT_INDEX_FILE reaches a temp repository without it, and not with it", () => {
    // `--git-path`, not `.git/index`: in a worktree `.git` is a file.
    const index = Bun.spawnSync(["git", "rev-parse", "--git-path", "index"], {
      cwd: REPO_ROOT,
      env: childEnv(),
    })
      .stdout.toString()
      .trim();
    const idx = join(temp(), "idx");
    writeFileSync(idx, readFileSync(resolve(REPO_ROOT, index)));
    const repo = temp();
    Bun.spawnSync(["git", "init", "-q"], { cwd: repo, env: childEnv() });

    const lsFiles = (env: Record<string, string | undefined>) =>
      Bun.spawnSync(["git", "ls-files"], { cwd: repo, env: childEnv(env) })
        .stdout.toString()
        .trim();

    withEnv({ GIT_INDEX_FILE: idx }, () => {
      // Put back by hand: this is the environment every spawn had before.
      expect(lsFiles({ GIT_INDEX_FILE: idx })).toContain("AGENTS.md");
      expect(lsFiles({})).toBe("");
    });
  });
});

describe("what childEnv cannot reach, so nobody tries", () => {
  // The reason `withoutGitEnv(fn)` does not exist: a Bun spawn with no `env`
  // inherits the STARTUP environment, so scrubbing `process.env` around an
  // in-process `collect()` would read as a fix and change nothing.
  test("an env-less spawn does not see a variable deleted from process.env", () => {
    const probe = ["sh", "-c", 'printf %s "${PDOCS_ENV_PROBE-unset}"'];
    withEnv({ PDOCS_ENV_PROBE: "late" }, () => {
      expect(Bun.spawnSync(probe, { env: undefined }).stdout.toString()).toBe(
        "unset"
      );
      expect(Bun.spawnSync(probe, { env: childEnv() }).stdout.toString()).toBe(
        "late"
      );
    });
  });
});

describe("the list is git's, not ours", () => {
  test("git names no repository-local variable that GIT_LOCAL_ENV lacks", () => {
    const r = Bun.spawnSync(["git", "rev-parse", "--local-env-vars"], {
      cwd: REPO_ROOT,
      env: childEnv(),
    });
    const gits = r.stdout.toString().split("\n").filter(Boolean);
    expect(gits.length).toBeGreaterThan(0);
    expect(
      gits.filter((g) => !(GIT_LOCAL_ENV as readonly string[]).includes(g))
    ).toEqual([]);
  });
});

// ─── Every call site ─────────────────────────────────────────────────────────

/**
 * The text of the call that opens at `open` (the index of its `(`), to the
 * matching `)`. Strings, template literals and comments are skipped, so a
 * parenthesis or an apostrophe inside one cannot end the call early.
 */
export function callText(src: string, open: number): string {
  let i = open;
  const skipTo = (close: string): void => {
    // `i` is on the opening delimiter.
    for (i++; i < src.length; i++) {
      const c = src.charAt(i);
      if (c === "\\") i++;
      else if (c === close) return;
      else if (close === "`" && c === "$" && src.charAt(i + 1) === "{") {
        i++;
        balance("{", "}");
      }
    }
  };
  const balance = (o: string, c: string): void => {
    // `i` is on `o`.
    let depth = 0;
    for (; i < src.length; i++) {
      const ch = src.charAt(i);
      if (ch === '"' || ch === "'" || ch === "`") skipTo(ch);
      else if (ch === "/" && src.charAt(i + 1) === "/") {
        while (i < src.length && src.charAt(i) !== "\n") i++;
      } else if (ch === "/" && src.charAt(i + 1) === "*") {
        i = src.indexOf("*/", i) + 1;
      } else if (ch === o) depth++;
      else if (ch === c && --depth === 0) return;
    }
    throw new Error(`unbalanced ${o}${c} from offset ${open}`);
  };
  balance("(", ")");
  return src.slice(open, i + 1);
}

/**
 * Every call that starts a child, in one file, as `{ line, text }`: node's
 * `spawn`/`spawnSync`/`exec`/`execSync`/`execFile`/`execFileSync`, called bare
 * (a `.exec(` is a regex's), and `Bun.spawn`/`Bun.spawnSync`. A Bun shell
 * template (`` $`…` ``) has nowhere to put an `env` inline, so it is reported
 * with its own text and can never pass.
 */
export function spawnCalls(src: string): { line: number; text: string }[] {
  const calls: { line: number; text: string }[] = [];
  for (const m of src.matchAll(/(?:(?<![.\w$])|\bBun\.)\$`/g)) {
    const at = m.index ?? 0;
    const lineStart = src.lastIndexOf("\n", at) + 1;
    const lead = src.slice(lineStart, at).trimStart();
    if (lead.startsWith("//") || lead.startsWith("*")) continue;
    calls.push({ line: src.slice(0, at).split("\n").length, text: "$`" });
  }
  for (const m of src.matchAll(
    /(?:(?<![.\w])(?:spawn|exec|execFile)(?:Sync)?|\bBun\.spawn(?:Sync)?)\(/g
  )) {
    const at = m.index ?? 0;
    const lineStart = src.lastIndexOf("\n", at) + 1;
    const lead = src.slice(lineStart, at).trimStart();
    if (lead.startsWith("//") || lead.startsWith("*")) continue; // prose about a spawn
    calls.push({
      line: src.slice(0, at).split("\n").length,
      text: callText(src, at + m[0].length - 1),
    });
  }
  return calls;
}

describe("every spawn in every test file goes through childEnv", () => {
  const files = [
    ...new Bun.Glob("scripts/**/*.test.ts").scanSync(REPO_ROOT),
    ...new Bun.Glob("plugins/**/*.test.ts").scanSync(REPO_ROOT),
  ].sort();

  test("the scan finds the spawns it is supposed to be reading", () => {
    expect(files.length).toBeGreaterThan(10);
    const cli = readFileSync(
      join(REPO_ROOT, "scripts/pdocs/cli.test.ts"),
      "utf8"
    );
    expect(spawnCalls(cli).length).toBeGreaterThan(3);
  });

  test("the scan can fail: a spawn with a bare environment is reported", () => {
    const bare = 'const r = Bun.spawnSync(["git", "init"], { cwd: root });\n';
    const spread =
      "Bun.spawnSync(cmd, { env: { ...process.env, A: `${f(1)})` } });\n";
    const clean =
      'Bun.spawnSync(["git", "init"], { cwd: ")", env: childEnv() });\n';
    const bad = (s: string) =>
      spawnCalls(s).filter((c) => !c.text.includes("childEnv("));
    expect(bad(bare).length).toBe(1);
    for (const form of [
      'execSync("git init", { cwd: root });\n',
      'execFileSync("git", ["init"], { cwd: root });\n',
      'const p = spawn("git", ["init"]);\n',
      "await $`git init`;\n",
      "await Bun.$`git init`;\n",
    ])
      expect(bad(form).length).toBe(1);
    // A regex's `.exec(` starts nothing.
    expect(spawnCalls('const m = /^a/.exec("a");\n')).toEqual([]);
    expect(bad(spread).length).toBe(1);
    expect(bad(clean)).toEqual([]);
  });

  test("none of them spawns with an inherited or hand-spread environment", () => {
    const self = relative(REPO_ROOT, import.meta.path);
    const bare = files
      .filter((f) => f !== self) // this file spawns inside strings, above
      .flatMap((f) =>
        spawnCalls(readFileSync(join(REPO_ROOT, f), "utf8"))
          .filter((c) => !c.text.includes("childEnv("))
          .map((c) => `${f}:${c.line}`)
      );
    expect(bare).toEqual([]);
  });
});
