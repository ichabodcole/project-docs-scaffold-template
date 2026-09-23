// `pdocs promote` and the link rewriter it shares with `archive` (plan Task
// 2.5). Promotion moves a file `pdocs` did not write and rewrites links in
// files it did not write either, so it is tested hardest: the pure rewriter on
// its own, then the command end to end, then the gate over the result.

import { afterAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { ExitCode } from "../envelope.ts";
import { rewriteFromField, rewriteLinks } from "../links-rewrite.ts";
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

// ---------------------------------------------------------------------------------------
// The pure rewriter
// ---------------------------------------------------------------------------------------

describe("rewriteLinks", () => {
  const map = new Map([["/r/docs/items/x.md", "/r/docs/items/x/item.md"]]);

  test("an inbound link follows the moved file", () => {
    const r = rewriteLinks(
      "See [x](../../items/x.md) and [x again](../../items/x.md#why).\n",
      "/r/docs/features/a/plan.md",
      "/r/docs/features/a/plan.md",
      map
    );
    expect(r.text).toBe(
      "See [x](../../items/x/item.md) and [x again](../../items/x/item.md#why).\n"
    );
    expect(r.changed).toBe(2);
  });

  test("the moved file's own relative links gain a `../`", () => {
    const r = rewriteLinks(
      "[plan](../features/a/plan.md) [readme](./README.md) [self](#top)\n",
      "/r/docs/items/x.md",
      "/r/docs/items/x/item.md",
      map
    );
    expect(r.text).toBe(
      "[plan](../../features/a/plan.md) [readme](../README.md) [self](#top)\n"
    );
    expect(r.changed).toBe(2);
  });

  test("URLs, absolute paths, code and unrelated links are left exactly as written", () => {
    const text = [
      "[web](https://example.com/items/x.md)",
      "[mail](mailto:a@b.c)",
      "`[code](../../items/x.md)`",
      "```",
      "[fenced](../../items/x.md)",
      "```",
      "[other](./other.md)",
      "",
    ].join("\n");
    const r = rewriteLinks(text, "/r/docs/features/a/plan.md", "/r/docs/features/a/plan.md", map);
    expect(r.text).toBe(text);
    expect(r.changed).toBe(0);
  });

  test("a folder in the move map carries every path under it", () => {
    const folder = new Map([["/r/docs/items/y", "/r/docs/items/_archive/y"]]);
    const r = rewriteLinks(
      "[y](../../items/y/item.md) [s](../../items/y/sessions/2026-01-01-s.md) [dir](../../items/y/)\n",
      "/r/docs/features/a/plan.md",
      "/r/docs/features/a/plan.md",
      folder
    );
    expect(r.text).toBe(
      "[y](../../items/_archive/y/item.md) [s](../../items/_archive/y/sessions/2026-01-01-s.md) [dir](../../items/_archive/y/)\n"
    );
  });

  test("a reference-style definition is rewritten; one inside a fence is not", () => {
    const text = [
      "See [x][ref].",
      "",
      "[ref]: ../../items/x.md#why",
      '  [other]: <../../items/x.md> "Title"',
      "",
      "```",
      "[fenced]: ../../items/x.md",
      "```",
      "",
    ].join("\n");
    const r = rewriteLinks(text, "/r/docs/features/a/plan.md", "/r/docs/features/a/plan.md", map);
    expect(r.text).toBe(
      text
        .replace("[ref]: ../../items/x.md#why", "[ref]: ../../items/x/item.md#why")
        .replace("[other]: <../../items/x.md>", "[other]: <../../items/x/item.md>")
    );
    expect(r.changed).toBe(2);
  });

  test("a pointy-bracket destination keeps its brackets", () => {
    const r = rewriteLinks(
      "[x](<../../items/x.md>)\n",
      "/r/docs/features/a/plan.md",
      "/r/docs/features/a/plan.md",
      map
    );
    expect(r.text).toBe("[x](<../../items/x/item.md>)\n");
  });
});

// ---------------------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------------------

const GENERATED = "{ by: test, at: 2026-09-22 }";
const ID = "0190f4b2-7c3a-7d4e-8f00-00000000000a";

const doc = (fields: Record<string, string>, body: string) =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n${body}\n`;

function tree(): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-promote-"));
  roots.push(root);
  // The payload's own docs tree and config: what a generated project starts from.
  cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
  copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
  const write = (rel: string, body: string) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  write("docs/items/README.md", "# Items\n\nSee [x](./x.md).\n");
  write(
    "docs/features/a/feature.md",
    doc(
      {
        type: "feature",
        title: "A",
        description: "A feature.",
        status: "draft",
        lifecycle: "active",
        generated: GENERATED,
      },
      "# A\n\nWork: [the x item](../../items/x.md).\n"
    )
  );
  write(
    "docs/features/a/plan.md",
    doc(
      {
        type: "plan",
        title: "Plan",
        description: "A plan.",
        status: "draft",
        lifecycle: "active",
        generated: GENERATED,
      },
      "# Plan\n\n[Feature](./feature.md). Blocked on [x](../../items/x.md#definition-of-done).\n"
    )
  );
  write(
    "docs/items/x.md",
    doc(
      {
        type: "item",
        title: "X",
        description: "An item.",
        status: "draft",
        lifecycle: "backlog",
        id: ID,
        kind: "task",
        parent: "feature/a",
        generated: GENERATED,
      },
      "# X\n\nFor [the plan](../features/a/plan.md) and [the items README](./README.md).\n\n## Definition of done\n\n- [ ] done\n"
    )
  );
  write("README.md", "# Repo\n\nThe [x item](docs/items/x.md).\n");
  Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
  Bun.spawnSync(["git", "add", "-A"], { cwd: root, env: childEnv() });
  return root;
}

const promote = (root: string, ref: string) =>
  run(["promote", ref, "--root", root, "--format", "json"]);

describe("pdocs promote", () => {
  test("the gate is clean before anything moves", () => {
    const root = tree();
    const r = run(["check", "--root", root, "--format", "text"]);
    expect(r.stdout).toContain("docs-lint: clean");
  });

  test("moves items/x.md to items/x/item.md", () => {
    const root = tree();
    const r = promote(root, "item/x");
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    const data = JSON.parse(r.stdout).data;
    expect(data.from).toBe("docs/items/x.md");
    expect(data.to).toBe("docs/items/x/item.md");
    expect(existsSync(join(root, "docs/items/x.md"))).toBe(false);
    expect(existsSync(join(root, "docs/items/x/item.md"))).toBe(true);
  });

  test("the moved file's own relative links gain a `../`", () => {
    const root = tree();
    promote(root, "item/x");
    const body = readFileSync(join(root, "docs/items/x/item.md"), "utf8");
    expect(body).toContain("[the plan](../../features/a/plan.md)");
    expect(body).toContain("[the items README](../README.md)");
  });

  test("links to it are rewritten and resolve — from a plan, a README, and the repo root", () => {
    const root = tree();
    const data = JSON.parse(promote(root, ID.slice(0, 8)).stdout).data;
    expect(readFileSync(join(root, "docs/features/a/plan.md"), "utf8")).toContain(
      "[x](../../items/x/item.md#definition-of-done)"
    );
    expect(readFileSync(join(root, "docs/features/a/feature.md"), "utf8")).toContain(
      "[the x item](../../items/x/item.md)"
    );
    expect(readFileSync(join(root, "docs/items/README.md"), "utf8")).toContain("(./x/item.md)");
    expect(readFileSync(join(root, "README.md"), "utf8")).toContain("(docs/items/x/item.md)");
    expect(data.rewritten).toEqual(
      [
        "README.md",
        "docs/features/a/feature.md",
        "docs/features/a/plan.md",
        "docs/items/README.md",
        "docs/items/x/item.md",
      ].sort()
    );
  });

  test("a path-form `from:` naming the promoted file follows it", () => {
    const root = tree();
    writeFileSync(
      join(root, "docs/items/y.md"),
      doc(
        {
          type: "item",
          title: "Y",
          description: "Another item.",
          status: "draft",
          lifecycle: "backlog",
          id: "0190f4c9-1d2e-7f00-8a00-00000000000b",
          kind: "task",
          from: '"items/x.md" # where it came from',
          generated: GENERATED,
        },
        "# Y"
      )
    );
    expect(run(["check", "--root", root, "--format", "text"]).stdout).toContain("docs-lint: clean");
    const data = JSON.parse(promote(root, "item/x").stdout).data;
    expect(data.rewritten).toContain("docs/items/y.md");
    expect(readFileSync(join(root, "docs/items/y.md"), "utf8")).toContain(
      'from: "items/x/item.md" # where it came from\n'
    );
    expect(run(["check", "--root", root, "--format", "text"]).stdout).toContain("docs-lint: clean");
  });

  test("rewriteFromField leaves the id and entity forms alone, and touches only the frontmatter", () => {
    const map = new Map([["/r/docs/items/x.md", "/r/docs/items/x/item.md"]]);
    for (const value of ["0190f4b2-7c3a-7d4e-8f00-00000000000a", "feature/x", "cycle/x", "items/other.md"]) {
      const text = `---\ntype: item\nfrom: ${value}\n---\n\nfrom: items/x.md\n`;
      expect(rewriteFromField(text, "/r/docs", map)).toEqual({ text, changed: 0 });
    }
  });

  test("`pdocs check` is clean afterwards, against HEAD's tree too", () => {
    const root = tree();
    Bun.spawnSync(
      ["git", "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "init"],
      { cwd: root, env: childEnv() }
    );
    promote(root, "item/x");
    const r = run(["check", "--root", root, "--format", "text"]);
    expect(r.stdout).toContain("docs-lint: clean");
    expect(r.code).toBe(ExitCode.Success);
  });

  test("promoting an item that is already a folder is a no-op and exits 0", () => {
    const root = tree();
    promote(root, "item/x");
    const before = readFileSync(join(root, "docs/features/a/plan.md"), "utf8");
    const r = promote(root, "item/x");
    expect(r.code).toBe(ExitCode.Success);
    const data = JSON.parse(r.stdout).data;
    expect(data.moved).toBe(false);
    expect(data.rewritten).toEqual([]);
    expect(readFileSync(join(root, "docs/features/a/plan.md"), "utf8")).toBe(before);
  });

  test("a reference that is not an item exits 2 and moves nothing", () => {
    const root = tree();
    expect(promote(root, "feature/a").code).toBe(ExitCode.Usage);
    expect(promote(root, "item/nope").code).toBe(ExitCode.Usage);
    expect(existsSync(join(root, "docs/items/x.md"))).toBe(true);
  });
});
