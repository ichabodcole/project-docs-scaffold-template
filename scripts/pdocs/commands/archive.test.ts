// `pdocs archive` (plan Task 2.7, D15): a finished entity moves into its
// owner's `_archive/`, and every link into it and out of it is rewritten. The
// `lifecycle` field is the source of truth; the folder is a mirror only this
// command maintains.

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

const git = (root: string, ...args: string[]) =>
  Bun.spawnSync(["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args], {
    cwd: root,
    env: childEnv(),
  });

const GENERATED = "{ by: test, at: 2026-09-22 }";
const DONE = "0190f4b2-7c3a-7d4e-8f00-00000000000a";
const FOLDER = "0190f4c9-1d2e-7f00-8a00-00000000000b";
const ACTIVE = "0190f4d7-0000-7000-8000-00000000000c";
const WAITS = "0190f4e1-0000-7000-8000-00000000000d";

const doc = (fields: Record<string, string>, body: string) =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n${body}\n`;

const item = (id: string, lifecycle: string, body: string, extra: Record<string, string> = {}) =>
  doc(
    {
      type: "item",
      title: "Item",
      description: "An item.",
      status: "draft",
      lifecycle,
      id,
      kind: "task",
      generated: GENERATED,
      ...extra,
    },
    body
  );

const feature = (lifecycle: string, body: string) =>
  doc(
    {
      type: "feature",
      title: "Feature",
      description: "A feature.",
      status: "draft",
      lifecycle,
      generated: GENERATED,
    },
    body
  );

function tree(): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-archive-"));
  roots.push(root);
  cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
  copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
  const write = (rel: string, body: string) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  write(
    "docs/items/done-one.md",
    item(DONE, "done", "# Done\n\nFrom [feature b](../features/b/feature.md).")
  );
  write(
    "docs/items/big/item.md",
    item(FOLDER, "done", "# Big\n\nSee [its write-up](./write-up.md) and [feature b](../../features/b/feature.md).")
  );
  write(
    "docs/items/big/write-up.md",
    doc(
      { type: "write-up", title: "W", description: "A write-up.", status: "stable", generated: GENERATED },
      "# W\n\nFor [the item](./item.md) and [the other item](../done-one.md)."
    )
  );
  write("docs/items/busy.md", item(ACTIVE, "active", "# Busy"));
  write(
    "docs/items/waits.md",
    item(WAITS, "backlog", "# Waits", { blocked_by: `[${DONE}]`, from: DONE })
  );
  write(
    "docs/features/a/feature.md",
    feature("dropped", "# A\n\nSee [its plan](./plan.md) and [b](../b/feature.md).")
  );
  write(
    "docs/features/a/plan.md",
    doc(
      { type: "plan", title: "P", description: "A plan.", status: "draft", lifecycle: "abandoned", generated: GENERATED },
      "# P\n\n[Feature](./feature.md)."
    )
  );
  write(
    "docs/features/b/feature.md",
    feature(
      "active",
      "# B\n\nBuilt on [a](../a/feature.md) and [a's plan](../a/plan.md#p); items [done](../../items/done-one.md), [big](../../items/big/item.md)."
    )
  );
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "init");
  return root;
}

const archive = (root: string, ref: string) =>
  run(["archive", ref, "--root", root, "--format", "json"]);
const read = (root: string, rel: string) => readFileSync(join(root, rel), "utf8");
const clean = (root: string) => {
  const r = run(["check", "--root", root, "--format", "text"]);
  expect(r.stdout).toContain("docs-lint: clean");
  expect(r.code).toBe(ExitCode.Success);
};

describe("pdocs archive", () => {
  test("the fixture is clean", () => clean(tree()));

  test("a done single-file item moves to items/_archive/", () => {
    const root = tree();
    const r = archive(root, "item/done-one");
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    const data = JSON.parse(r.stdout).data;
    expect(data.from).toBe("docs/items/done-one.md");
    expect(data.to).toBe("docs/items/_archive/done-one.md");
    expect(existsSync(join(root, "docs/items/done-one.md"))).toBe(false);
    expect(read(root, "docs/items/_archive/done-one.md")).toContain(
      "[feature b](../../features/b/feature.md)"
    );
    expect(read(root, "docs/features/b/feature.md")).toContain(
      "[done](../../items/_archive/done-one.md)"
    );
    clean(root);
  });

  test("a folder item moves as a whole folder, its own links intact", () => {
    const root = tree();
    expect(archive(root, FOLDER.slice(0, 8)).code).toBe(ExitCode.Success);
    expect(existsSync(join(root, "docs/items/big"))).toBe(false);
    expect(read(root, "docs/items/_archive/big/item.md")).toContain(
      "[its write-up](./write-up.md) and [feature b](../../../features/b/feature.md)"
    );
    expect(read(root, "docs/items/_archive/big/write-up.md")).toContain(
      "[the other item](../../done-one.md)"
    );
    expect(read(root, "docs/features/b/feature.md")).toContain(
      "[big](../../items/_archive/big/item.md)"
    );
    clean(root);
  });

  test("a dropped feature moves features/a/ to features/_archive/a/, inbound and outbound", () => {
    const root = tree();
    expect(archive(root, "feature/a").code).toBe(ExitCode.Success);
    expect(existsSync(join(root, "docs/features/_archive/a/feature.md"))).toBe(true);
    expect(existsSync(join(root, "docs/features/_archive/a/plan.md"))).toBe(true);
    expect(read(root, "docs/features/_archive/a/feature.md")).toContain(
      "[its plan](./plan.md) and [b](../../b/feature.md)"
    );
    expect(read(root, "docs/features/b/feature.md")).toContain(
      "[a](../_archive/a/feature.md) and [a's plan](../_archive/a/plan.md#p)"
    );
    clean(root);
  });

  test("an active entity exits 2, names its state, and nothing moves", () => {
    const root = tree();
    for (const ref of ["item/busy", "feature/b"]) {
      const r = archive(root, ref);
      expect(r.code).toBe(ExitCode.Usage);
      expect(r.stderr).toContain("active");
    }
    expect(existsSync(join(root, "docs/items/busy.md"))).toBe(true);
    expect(existsSync(join(root, "docs/features/b/feature.md"))).toBe(true);
  });

  test("a UUID reference to the archived item still resolves, and no frontmatter changed", () => {
    const root = tree();
    const before = read(root, "docs/items/waits.md");
    archive(root, "item/done-one");
    expect(read(root, "docs/items/waits.md")).toBe(before);
    const fm = (t: string) => /^---\n[\s\S]*?\n---/.exec(t)![0];
    expect(fm(read(root, "docs/items/_archive/done-one.md"))).toBe(
      fm(item(DONE, "done", ""))
    );
    clean(root);
  });

  test("archiving what is already archived is a no-op and exits 0", () => {
    const root = tree();
    archive(root, "item/done-one");
    const r = archive(root, "item/done-one");
    expect(r.code).toBe(ExitCode.Success);
    expect(JSON.parse(r.stdout).data.moved).toBe(false);
  });

  test("`pdocs check --against HEAD` after the move reports no ITEM DELETED", () => {
    const root = tree();
    archive(root, "item/done-one");
    archive(root, "item/big");
    const r = run(["check", "--root", root, "--against", "HEAD", "--format", "text"]);
    expect(r.stdout).not.toContain("ITEM DELETED");
    expect(r.stdout).toContain("docs-lint: clean");
  });

  test("a cycle is not archived", () => {
    const root = tree();
    writeFileSync(
      join(root, "docs/cycles/2026-09-x.md"),
      doc(
        { type: "cycle", title: "C", description: "A cycle.", status: "draft", lifecycle: "closed", generated: GENERATED },
        "# C"
      )
    );
    expect(archive(root, "cycle/2026-09-x").code).toBe(ExitCode.Usage);
  });
});
