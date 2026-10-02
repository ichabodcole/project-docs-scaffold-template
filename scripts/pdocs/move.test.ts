// A move respells links in files `pdocs` did not write, and a respelled link
// is longer or shorter than it was. In a project that formats its Markdown
// with Prettier, the paragraph, list item or table around it must come out the
// way Prettier prints it — or the next `prettier --check` fails on a file the
// person never touched, which is what landing the placeholder-lint branch hit
// when `pdocs new session --owner` promoted an item linked from a cycle.
//
// Checked with this repository's Prettier, installed into each fixture the way
// a project has it, and its `.prettierrc`.

import { afterAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { ExitCode } from "./envelope.ts";
import { childEnv } from "./test-env.ts";

const REPO_ROOT = resolve(import.meta.dir, "../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");
const PAYLOAD = join(REPO_ROOT, "{{cookiecutter.project_slug}}");
const PRETTIER = join(REPO_ROOT, "node_modules/.bin/prettier");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function run(args: string[], env: Record<string, string> = {}) {
  const p = Bun.spawnSync(["bun", CLI, ...args], { cwd: REPO_ROOT, env: { ...childEnv(), ...env } });
  return { code: p.exitCode, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}

const prettier = (root: string, ...args: string[]) => {
  const p = Bun.spawnSync([PRETTIER, ...args], { cwd: root, env: childEnv() });
  return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
};

const GENERATED = "{ by: test, at: 2026-09-22 }";
const ID = "0190f4b2-7c3a-7d4e-8f00-00000000000a";

const doc = (fields: Record<string, string>, body: string) =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n${body}\n`;

/** The files that link the item, each in Prettier's shape before the move. */
const LINKING = [
  "docs/cycles/2026-10-tidy.md",
  "docs/features/a/feature.md",
  "docs/features/a/plan.md",
];
/** A file Prettier would change before any move: not Prettier's to keep. */
const UNFORMATTED = "docs/features/a/notes.md";
/** The moved item's own links are respelled too. */
const ITEM = "docs/items/outcome-lint-old.md";

function tree(lifecycle: string, withPrettier = true): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-move-"));
  roots.push(root);
  cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
  copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
  const write = (rel: string, body: string) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  if (withPrettier) {
    mkdirSync(join(root, "node_modules"), { recursive: true });
    symlinkSync(realpathSync(join(REPO_ROOT, "node_modules/prettier")), join(root, "node_modules/prettier"));
    copyFileSync(join(REPO_ROOT, ".prettierrc"), join(root, ".prettierrc"));
  }
  write(".gitignore", "node_modules/\n");

  const page = (type: string, title: string, body: string) =>
    doc(
      {
        type,
        title,
        description: `The ${title.toLowerCase()}.`,
        status: "draft",
        lifecycle: "active",
        generated: GENERATED,
      },
      `# ${title}\n\n${body}`
    );
  write(
    ITEM,
    doc(
      {
        type: "item",
        title: "The outcome lint misses old placeholders",
        description: "An item.",
        status: "draft",
        lifecycle,
        id: ID,
        kind: "bug",
        generated: GENERATED,
      },
      "# The outcome lint misses old placeholders\n\n" +
        "Found while working on [the plan for feature A, which is long](../features/a/plan.md) and its notes.\n"
    )
  );
  // The shape the landing hit: a cycle's list line that fits until the link
  // grows by `/item`.
  write(
    LINKING[0] as string,
    doc(
      {
        type: "cycle",
        title: "Tidy",
        description: "A cycle.",
        status: "draft",
        lifecycle: "active",
        started: "2026-10-01",
        generated: GENERATED,
      },
      "# Tidy\n\n## Items\n\n" +
        "- [The outcome lint misses old placeholders](../items/outcome-lint-old.md) — x\n" +
        "- [Another](../items/outcome-lint-old.md#definition-of-done) — a second line here.\n"
    )
  );
  // A link in the middle of a filled paragraph, and one in a padded table.
  write(
    LINKING[1] as string,
    page(
      "feature",
      "A",
      "The work is tracked as an item, [the outcome lint misses old placeholders](../../items/outcome-lint-old.md),\n" +
        "and nothing else is in flight for this feature at the moment, so it can wait.\n"
    )
  );
  write(
    LINKING[2] as string,
    page(
      "plan",
      "Plan",
      "| Step | Item |\n| --- | --- |\n| One | [old](../../items/outcome-lint-old.md) |\n| Two | none |\n"
    )
  );
  // Formatted now, so every file above is in the shape Prettier prints.
  if (withPrettier) expect(prettier(root, "--write", ITEM, ...LINKING).code).toBe(0);
  write(
    UNFORMATTED,
    "# Notes\n\n*Left as written*, with [the item](../../items/outcome-lint-old.md)   and   spaces.\n"
  );
  Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
  Bun.spawnSync(["git", "add", "-A"], { cwd: root, env: childEnv() });
  return root;
}

describe("a rewritten link leaves a Prettier-formatted file Prettier-formatted", () => {
  test("the fixture: every linking file is in Prettier's shape, the notes are not", () => {
    const root = tree("backlog");
    expect(prettier(root, "--check", ITEM, ...LINKING).code).toBe(0);
    expect(prettier(root, "--check", UNFORMATTED).code).not.toBe(0);
  });

  test("`pdocs new session --owner` promoting the item: every file it rewrote passes `prettier --check`", () => {
    const root = tree("active");
    const r = run(["new", "session", "first", "--owner", "item/outcome-lint-old", "--root", root, "--format", "json"]);
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    const moved = "docs/items/outcome-lint-old/item.md";
    const check = prettier(root, "--check", moved, ...LINKING);
    if (check.code !== 0) console.log(check.out);
    expect(check.code).toBe(0);
    // The line that grew past 80 columns was re-wrapped, not left long.
    expect(readFileSync(join(root, LINKING[0] as string), "utf8")).toContain(
      "- [The outcome lint misses old placeholders](../items/outcome-lint-old/item.md)\n  — x\n"
    );
  });

  test("`pdocs promote`: the same", () => {
    const root = tree("backlog");
    expect(run(["promote", "item/outcome-lint-old", "--root", root, "--format", "json"]).code).toBe(ExitCode.Success);
    const check = prettier(root, "--check", "docs/items/outcome-lint-old/item.md", ...LINKING);
    if (check.code !== 0) console.log(check.out);
    expect(check.code).toBe(0);
  });

  test("`pdocs archive`: every file it rewrote passes `prettier --check`", () => {
    const root = tree("done");
    const r = run(["archive", "item/outcome-lint-old", "--root", root, "--format", "json"]);
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    const check = prettier(root, "--check", "docs/items/_archive/outcome-lint-old.md", ...LINKING);
    if (check.code !== 0) console.log(check.out);
    expect(check.code).toBe(0);
  });

  test("a file Prettier would already change keeps every byte but its link", () => {
    const root = tree("done");
    const before = readFileSync(join(root, UNFORMATTED), "utf8");
    run(["archive", "item/outcome-lint-old", "--root", root, "--format", "json"]);
    expect(readFileSync(join(root, UNFORMATTED), "utf8")).toBe(
      before.replace("../../items/outcome-lint-old.md", "../../items/_archive/outcome-lint-old.md")
    );
  });

  // Each way the project's Prettier can decline or fail: the move still
  // happens, and the file gets the link-only rewrite.
  const linkOnly = (before: string) =>
    before.replaceAll("../items/outcome-lint-old.md", "../items/_archive/outcome-lint-old.md");

  test("a rewritten file `.prettierignore` names keeps every byte but its links", () => {
    const root = tree("done");
    writeFileSync(join(root, ".prettierignore"), "docs/cycles/\n");
    const before = readFileSync(join(root, LINKING[0] as string), "utf8");
    expect(run(["archive", "item/outcome-lint-old", "--root", root, "--format", "json"]).code).toBe(ExitCode.Success);
    expect(readFileSync(join(root, LINKING[0] as string), "utf8")).toBe(linkOnly(before));
    // The files it does not ignore are still put in Prettier's shape.
    expect(prettier(root, "--check", ...LINKING.slice(1)).code).toBe(0);
  });

  test("a broken Prettier config: nothing is formatted, and the move still succeeds", () => {
    const root = tree("done");
    writeFileSync(join(root, ".prettierrc"), "{ not json\n");
    const before = readFileSync(join(root, LINKING[0] as string), "utf8");
    const r = run(["archive", "item/outcome-lint-old", "--root", root, "--format", "json"]);
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    expect(readFileSync(join(root, LINKING[0] as string), "utf8")).toBe(linkOnly(before));
  });

  test("a config that never returns does not hang the move: past the timeout, nothing is formatted", () => {
    const root = tree("done");
    rmSync(join(root, ".prettierrc"));
    writeFileSync(join(root, "prettier.config.cjs"), "while (true) {}\n");
    const before = readFileSync(join(root, LINKING[0] as string), "utf8");
    const started = Date.now();
    const r = run(["archive", "item/outcome-lint-old", "--root", root, "--format", "json"], {
      PDOCS_PRETTIER_TIMEOUT_MS: "1500",
    });
    expect(Date.now() - started).toBeLessThan(15_000);
    expect(r.code).toBe(ExitCode.Success);
    expect(readFileSync(join(root, LINKING[0] as string), "utf8")).toBe(linkOnly(before));
  });

  test("with no Prettier in the project, the links are still rewritten and nothing is formatted", () => {
    const root = tree("done", false);
    const before = readFileSync(join(root, LINKING[0] as string), "utf8");
    const r = run(["archive", "item/outcome-lint-old", "--root", root, "--format", "json"]);
    expect(r.code).toBe(ExitCode.Success);
    expect(readFileSync(join(root, LINKING[0] as string), "utf8")).toBe(
      before.replaceAll("../items/outcome-lint-old.md", "../items/_archive/outcome-lint-old.md")
    );
  });
});
