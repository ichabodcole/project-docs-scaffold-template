// A cycle's identity is its filename. `view cycle`, and every other place a
// cycle is named on the command line, takes that filename with or without
// `.md` — live or under `cycles/_archive/` — and says "filename" when the name
// matches nothing or more than one file.

import { afterAll, describe, expect, test } from "bun:test";
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { ExitCode } from "../envelope.ts";
import { childEnv } from "../test-env.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");
const PAYLOAD = join(REPO_ROOT, "{{cookiecutter.project_slug}}");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function run(args: string[]) {
  const p = Bun.spawnSync(["bun", CLI, ...args], { cwd: REPO_ROOT, env: childEnv() });
  return { code: p.exitCode, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}

const doc = (fields: Record<string, string>) =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n# X\n`;

const cycle = (lifecycle: string) =>
  doc({
    type: "cycle",
    title: "C",
    description: "A cycle.",
    status: "draft",
    lifecycle,
    generated: "{ by: test, at: 2026-09-01 }",
  }) + (lifecycle === "closed" ? "\n## Outcome\n\nShipped.\n" : "");

let n = 0;
const item = (slug: string, extra: Record<string, string> = {}) =>
  doc({
    type: "item",
    title: slug,
    description: "An item.",
    status: "draft",
    lifecycle: "backlog",
    id: `0190f4b2-7c3a-7d4e-8f00-${String(++n).padStart(12, "0")}`,
    kind: "task",
    generated: "{ by: test, at: 2026-09-01 }",
    ...extra,
  });

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-cycle-name-"));
  roots.push(root);
  cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
  copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
  return root;
}

const ROOT = tree({
  "docs/cycles/2026-10-live.md": cycle("active"),
  "docs/cycles/_archive/2026-09-old.md": cycle("closed"),
  "docs/items/in-live.md": item("in-live", { cycle: "2026-10-live" }),
  "docs/items/in-old.md": item("in-old", { cycle: "2026-09-old" }),
  "docs/items/loose.md": item("loose"),
});

const json = (root: string, ...args: string[]) => {
  const r = run([...args, "--root", root, "--format", "json"]);
  return { ...r, body: JSON.parse(r.stdout || r.stderr) };
};
const ok = (root: string, ...args: string[]) => {
  const r = json(root, ...args);
  expect(r.stderr).toBe("");
  expect(r.code).toBe(ExitCode.Success);
  return r.body.data;
};
const usage = (root: string, ...args: string[]) => {
  const r = json(root, ...args);
  expect(r.code).toBe(ExitCode.Usage);
  return r.body.error.message as string;
};
const slugs = (list: Array<{ slug: string }>) => list.map((e) => e.slug);

describe("view cycle takes the cycle's filename, `.md` optional", () => {
  test("the fixture is clean", () => {
    expect(run(["check", "--root", ROOT, "--format", "text"]).stdout).toContain("docs-lint: clean");
  });

  test("the stem and the filename name the same live cycle", () => {
    const stem = ok(ROOT, "view", "cycle", "2026-10-live");
    const file = ok(ROOT, "view", "cycle", "2026-10-live.md");
    expect(file).toEqual(stem);
    expect(stem.cycle.path).toBe("docs/cycles/2026-10-live.md");
    expect(slugs(stem.items)).toEqual(["in-live"]);
  });

  test("an archived cycle resolves by both spellings", () => {
    const stem = ok(ROOT, "view", "cycle", "2026-09-old");
    expect(ok(ROOT, "view", "cycle", "2026-09-old.md")).toEqual(stem);
    expect(stem.cycle.path).toBe("docs/cycles/_archive/2026-09-old.md");
    expect(slugs(stem.items)).toEqual(["in-old"]);
  });

  test("an unknown filename names the file it looked for, and where", () => {
    for (const name of ["2026-10-nope", "2026-10-nope.md"]) {
      const msg = usage(ROOT, "view", "cycle", name);
      expect(msg).toContain("no cycle file is named `2026-10-nope.md`");
      expect(msg).toContain("cycles/ and cycles/_archive/");
      expect(msg).toContain("filename, with or without `.md`");
      expect(msg).toContain("pdocs find --type cycle");
    }
  });

  test("help and usage call the argument a filename", () => {
    expect(usage(ROOT, "view", "cycle")).toContain("needs a filename — `pdocs view cycle <filename>`");
    expect(run(["find", "--help"]).stdout).toContain("--cycle <filename>");
    expect(run(["set", "--help"]).stdout).toContain("--cycle <filename>");
  });
});

describe("ambiguity the two spellings can produce", () => {
  test("the same filename live and archived: ambiguous by both spellings, rename one", () => {
    const root = tree({
      "docs/cycles/2026-10-twin.md": cycle("active"),
      "docs/cycles/_archive/2026-10-twin.md": cycle("closed"),
    });
    for (const name of ["2026-10-twin", "2026-10-twin.md"]) {
      const msg = usage(root, "view", "cycle", name);
      expect(msg).toContain(`cycle \`${name}\` is ambiguous — it names 2 cycle files`);
      expect(msg).toContain("docs/cycles/2026-10-twin.md");
      expect(msg).toContain("docs/cycles/_archive/2026-10-twin.md");
      expect(msg).toContain("must be unique across cycles/ and cycles/_archive/ — rename one");
    }
  });

  test("`x.md` naming both `x.md` and `x.md.md` is ambiguous, and each has a spelling of its own", () => {
    const root = tree({
      "docs/cycles/2026-10-z.md": cycle("active"),
      "docs/cycles/2026-10-z.md.md": cycle("planned"),
    });
    const msg = usage(root, "view", "cycle", "2026-10-z.md");
    expect(msg).toContain("cycle `2026-10-z.md` is ambiguous — it names 2 cycle files");
    expect(msg).toContain("`2026-10-z` (docs/cycles/2026-10-z.md)");
    expect(msg).toContain("`2026-10-z.md.md` (docs/cycles/2026-10-z.md.md)");
    // ...and the spellings it offers each name exactly one.
    expect(ok(root, "view", "cycle", "2026-10-z").cycle.path).toBe("docs/cycles/2026-10-z.md");
    expect(ok(root, "view", "cycle", "2026-10-z.md.md").cycle.path).toBe("docs/cycles/2026-10-z.md.md");
  });
});

describe("the other places a cycle is named accept the filename too", () => {
  test("set cycle/<filename>.md and set --cycle <filename>.md, written back as the stem", () => {
    const root = tree({
      "docs/cycles/2026-10-live.md": cycle("active"),
      "docs/items/loose.md": item("loose"),
    });
    ok(root, "set", "cycle/2026-10-live.md", "--title", "Renamed");
    expect(readFileSync(join(root, "docs/cycles/2026-10-live.md"), "utf8")).toContain("title: Renamed");
    ok(root, "set", "item/loose", "--cycle", "2026-10-live.md");
    expect(readFileSync(join(root, "docs/items/loose.md"), "utf8")).toContain("cycle: 2026-10-live\n");
  });

  test("new item --cycle <filename>.md writes the stem", () => {
    const root = tree({ "docs/cycles/2026-10-live.md": cycle("active") });
    ok(root, "new", "item", "fresh", "--kind", "task", "--cycle", "2026-10-live.md");
    expect(readFileSync(join(root, "docs/items/fresh.md"), "utf8")).toContain("cycle: 2026-10-live\n");
  });

  test("new cycle <filename>.md drops the `.md`", () => {
    const root = tree({});
    const d = ok(root, "new", "cycle", "2026-10-fresh.md");
    expect(d.path).toBe("docs/cycles/2026-10-fresh.md");
    expect(ok(root, "view", "cycle", "2026-10-fresh").cycle.path).toBe("docs/cycles/2026-10-fresh.md");
  });

  test("new cycle refuses a name an archived cycle holds, by either spelling", () => {
    for (const name of ["2026-09-old", "2026-09-old.md"]) {
      const r = json(ROOT, "new", "cycle", name);
      expect(r.code).toBe(ExitCode.Conflict);
      expect(r.body.error.message).toContain("`cycle/2026-09-old` is taken by docs/cycles/_archive/2026-09-old.md");
      expect(r.body.error.message).toContain("a cycle's filename names one cycle");
    }
  });

  test("new cycle refuses a name that would make a `.md`-suffixed name ambiguous", () => {
    // `x.md.md` exists, so a new `x` would leave `x.md` naming both.
    const suffixed = tree({ "docs/cycles/2026-10-z.md.md": cycle("planned") });
    const r = json(suffixed, "new", "cycle", "2026-10-z");
    expect(r.code).toBe(ExitCode.Conflict);
    expect(r.body.error.message).toContain("is taken by docs/cycles/2026-10-z.md.md");
    // ...and the other way round: `x` exists, so a new `x.md.md` is refused.
    const plain = tree({ "docs/cycles/2026-10-z.md": cycle("planned") });
    const r2 = json(plain, "new", "cycle", "2026-10-z.md.md");
    expect(r2.code).toBe(ExitCode.Conflict);
    expect(r2.body.error.message).toContain("is taken by docs/cycles/2026-10-z.md");
  });

  test("find --cycle refuses a name that matches two cycle files, as view cycle does", () => {
    const root = tree({
      "docs/cycles/2026-10-twin.md": cycle("active"),
      "docs/cycles/_archive/2026-10-twin.md": cycle("closed"),
    });
    for (const name of ["2026-10-twin", "2026-10-twin.md"]) {
      const msg = usage(root, "find", "--cycle", name);
      expect(msg).toBe(usage(root, "view", "cycle", name));
      expect(msg).toContain(`cycle \`${name}\` is ambiguous — it names 2 cycle files`);
    }
  });

  test("find --cycle matches by both spellings", () => {
    const paths = (d: { matches: Array<{ path: string }> }) => d.matches.map((m) => m.path);
    const stem = paths(ok(ROOT, "find", "--cycle", "2026-09-old"));
    expect(stem).toEqual(["docs/items/in-old.md"]);
    expect(paths(ok(ROOT, "find", "--cycle", "2026-09-old.md"))).toEqual(stem);
  });

  test("archive cycle/<filename>.md moves a closed cycle", () => {
    const root = tree({ "docs/cycles/2026-08-done.md": cycle("closed") });
    ok(root, "archive", "cycle/2026-08-done.md");
    expect(ok(root, "view", "cycle", "2026-08-done.md").cycle.path).toBe("docs/cycles/_archive/2026-08-done.md");
  });
});
