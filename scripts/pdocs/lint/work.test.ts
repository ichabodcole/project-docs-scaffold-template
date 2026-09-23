// The corpus rules of the work taxonomy: what can only be decided by looking
// at more than one document — references that must resolve, ids that must be
// unique, entity folders that must hold their entity file, and an archive that
// holds only finished work.
//
// Every case is a fixture tree, built the way `rules.test.ts` builds its own.

import { afterAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { childEnv } from "../test-env.ts";
import { type Ctx, context, thinTier } from "./rules.ts";
import { workProblems } from "./work.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

/** A fixture on the new layout: features, items and cycles, archive linted. */
function fixture(
  files: Record<string, string>,
  lint: Record<string, unknown> = {}
): Ctx {
  const root = mkdtempSync(join(tmpdir(), "pdocs-work-"));
  roots.push(root);
  writeFileSync(
    join(root, ".project-docs.json"),
    JSON.stringify({
      docsRoot: "docs",
      version: "1.0.0",
      lint: {
        adopting: false,
        workbench: ["features", "items", "cycles"],
        skip: [],
        scopes: ["lint", "cli"],
        ...lint,
      },
    })
  );
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return context(root);
}

const GENERATED = "{ by: test, at: 2026-09-22 }";
const A = "0190f4b2-7c3a-7d4e-8f00-00000000000a";
const B = "0190f4b2-7c3a-7d4e-8f00-00000000000b";
const C = "0190f4b2-7c3a-7d4e-8f00-00000000000c";
const NOBODY = "0190f4b2-7c3a-7d4e-8f00-0000000000ff";

const doc = (fields: Record<string, string>) =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n# X\n`;

const item = (id: string, extra: Record<string, string> = {}) =>
  doc({
    type: "item",
    title: "An item",
    description: "Something to do.",
    status: "draft",
    lifecycle: "backlog",
    id,
    kind: "task",
    generated: GENERATED,
    ...extra,
  });

const feature = (extra: Record<string, string> = {}) =>
  doc({
    type: "feature",
    title: "A feature",
    description: "Something to build.",
    status: "draft",
    lifecycle: "active",
    generated: GENERATED,
    ...extra,
  });

const cycle = doc({
  type: "cycle",
  title: "A cycle",
  description: "A stretch of work.",
  status: "draft",
  lifecycle: "active",
  generated: GENERATED,
});

const only = (ctx: Ctx, prefix: string) =>
  workProblems(ctx).filter((p) => p.startsWith(prefix));

describe("workProblems — references resolve", () => {
  test("a clean tree with every field set reports nothing", () => {
    const ctx = fixture({
      "docs/features/auth/feature.md": feature({ scope: "lint" }),
      "docs/features/auth/sessions/2026-09-22-a.md": doc({
        type: "session",
        title: "S",
        description: "A session.",
        status: "stable",
        generated: GENERATED,
      }),
      "docs/cycles/2026-09-work.md": cycle,
      "docs/items/a.md": item(A, {
        parent: "feature/auth",
        scope: "cli",
        cycle: "2026-09-work",
        from: "features/auth/sessions/2026-09-22-a.md",
        priority: "high",
        assignee: "dev",
        source: "operator:42",
      }),
      "docs/items/b/item.md": item(B, {
        blocked_by: `[${A}]`,
        from: A,
      }),
      "docs/items/b/write-up.md": doc({
        type: "write-up",
        title: "W",
        description: "The answer.",
        status: "draft",
        generated: GENERATED,
      }),
      "docs/items/c.md": item(C, { from: "cycle/2026-09-work", lifecycle: "done" }),
      "docs/items/_archive/d.md": item(NOBODY, {
        lifecycle: "dropped",
        from: "feature/auth",
      }),
      "docs/features/_archive/old/feature.md": feature({ lifecycle: "done" }),
    });
    expect(workProblems(ctx)).toEqual([]);
    expect(thinTier(ctx)).toEqual([]);
  });

  test("two items with one id report DUPLICATE ID, naming both paths", () => {
    const ctx = fixture({
      "docs/items/a.md": item(A),
      "docs/items/b.md": item(A),
    });
    const rows = only(ctx, "DUPLICATE ID");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain(A);
    expect(rows[0]).toContain("docs/items/a.md");
    expect(rows[0]).toContain("docs/items/b.md");
  });

  test("a parent that is not a feature in the tree is BAD PARENT", () => {
    const ctx = fixture({
      "docs/features/auth/feature.md": feature(),
      "docs/items/a.md": item(A, { parent: "feature/nope" }),
      "docs/items/b.md": item(B, { parent: `item/${A}` }),
      "docs/items/c.md": item(C, { parent: "feature/auth" }),
    });
    const rows = only(ctx, "BAD PARENT");
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.includes("docs/items/a.md"))).toBe(true);
    expect(rows.some((r) => r.includes("docs/items/b.md"))).toBe(true);
  });

  test("a cycle that names no cycle file is BAD CYCLE", () => {
    const ctx = fixture({
      "docs/cycles/2026-09-work.md": cycle,
      "docs/items/a.md": item(A, { cycle: "2099-01-nope" }),
    });
    const rows = only(ctx, "BAD CYCLE");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("2099-01-nope");
  });

  test("blocked_by an unknown id is BAD BLOCKED_BY", () => {
    const ctx = fixture({ "docs/items/a.md": item(A, { blocked_by: `[${NOBODY}]` }) });
    const rows = only(ctx, "BAD BLOCKED_BY");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain(NOBODY);
  });

  test("A blocked by B blocked by A is a BLOCKED CYCLE, reported once", () => {
    const ctx = fixture({
      "docs/items/a.md": item(A, { blocked_by: `[${B}]` }),
      "docs/items/b.md": item(B, { blocked_by: `[${A}]` }),
    });
    const rows = only(ctx, "BLOCKED CYCLE");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("docs/items/a.md");
    expect(rows[0]).toContain("docs/items/b.md");
  });

  test("an item blocking itself is a BLOCKED CYCLE too", () => {
    const ctx = fixture({ "docs/items/a.md": item(A, { blocked_by: `[${A}]` }) });
    expect(only(ctx, "BLOCKED CYCLE")).toHaveLength(1);
  });

  test("a from that is none of the four forms, or names nothing, is BAD FROM", () => {
    const ctx = fixture({
      "docs/features/auth/feature.md": feature(),
      "docs/cycles/2026-09-work.md": cycle,
      "docs/items/a.md": item(A, { from: "somewhere over the rainbow" }),
      "docs/items/b.md": item(B, { from: "features/auth/sessions/2026-01-01-gone.md" }),
      "docs/items/c.md": item(C, { from: NOBODY }),
      "docs/items/d.md": item("0190f4b2-7c3a-7d4e-8f00-00000000000d", {
        from: "feature/nope",
      }),
      "docs/items/e.md": item("0190f4b2-7c3a-7d4e-8f00-00000000000e", {
        from: "cycle/2099-01-nope",
      }),
      // The four good forms, for contrast.
      "docs/items/f.md": item("0190f4b2-7c3a-7d4e-8f00-00000000000f", {
        from: "feature/auth",
      }),
      "docs/items/g.md": item("0190f4b2-7c3a-7d4e-8f00-000000000010", {
        from: A,
      }),
      "docs/items/h.md": item("0190f4b2-7c3a-7d4e-8f00-000000000011", {
        from: "cycle/2026-09-work",
      }),
      "docs/items/i.md": item("0190f4b2-7c3a-7d4e-8f00-000000000012", {
        from: "features/auth/feature.md",
      }),
    });
    const rows = only(ctx, "BAD FROM");
    expect(rows.map((r) => /docs\/items\/(\w)\.md/.exec(r)?.[1]).sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  test("an undeclared scope, and a scope with two values, are BAD SCOPE", () => {
    const undeclared = fixture(
      { "docs/items/a.md": item(A, { scope: "lint" }) },
      { scopes: [] }
    );
    const rows = only(undeclared, "BAD SCOPE");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain(
      "(declare it in lint.scopes in .project-docs.json)"
    );

    const two = fixture({ "docs/items/a.md": item(A, { scope: "[lint, cli]" }) });
    const listRows = only(two, "BAD SCOPE");
    expect(listRows).toHaveLength(1);
    expect(listRows[0]).toContain("takes one value");
  });

  test("a feature's scope is checked the same way", () => {
    const ctx = fixture({ "docs/features/a/feature.md": feature({ scope: "ui" }) });
    expect(only(ctx, "BAD SCOPE")).toHaveLength(1);
  });
});

describe("workProblems — entity folders and the archive", () => {
  test("a feature folder with no feature.md, and an item folder with no item.md", () => {
    const ctx = fixture({
      "docs/features/x/plan.md": doc({
        type: "plan",
        title: "P",
        description: "A plan.",
        status: "draft",
        lifecycle: "draft",
        generated: GENERATED,
      }),
      "docs/items/y/write-up.md": doc({
        type: "write-up",
        title: "W",
        description: "An answer.",
        status: "draft",
        generated: GENERATED,
      }),
    });
    const rows = only(ctx, "MISSING ENTITY FILE");
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.includes("docs/features/x/") && r.includes("feature.md"))).toBe(
      true
    );
    expect(rows.some((r) => r.includes("docs/items/y/") && r.includes("item.md"))).toBe(true);
  });

  test("an archived entity that is not done or dropped is ARCHIVED NOT TERMINAL (D15)", () => {
    const ctx = fixture({
      "docs/items/_archive/z.md": item(A, { lifecycle: "active" }),
      "docs/features/_archive/f/feature.md": feature({ lifecycle: "review" }),
      "docs/items/_archive/ok.md": item(B, { lifecycle: "done" }),
      "docs/features/_archive/g/feature.md": feature({ lifecycle: "dropped" }),
    });
    const rows = only(ctx, "ARCHIVED NOT TERMINAL");
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.includes("docs/items/_archive/z.md"))).toBe(true);
    expect(rows.some((r) => r.includes("docs/features/_archive/f/feature.md"))).toBe(true);
  });

  test("a slug both live and archived is DUPLICATE SLUG", () => {
    const ctx = fixture({
      "docs/items/z.md": item(A),
      "docs/items/_archive/z.md": item(B, { lifecycle: "done" }),
      "docs/features/f/feature.md": feature(),
      "docs/features/_archive/f/feature.md": feature({ lifecycle: "done" }),
    });
    const rows = only(ctx, "DUPLICATE SLUG");
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.includes("item/z"))).toBe(true);
    expect(rows.some((r) => r.includes("feature/f"))).toBe(true);
  });
});

describe("workProblems — a fixture with every defect reports each once", () => {
  test("every Task 1.7 defect, each exactly once", () => {
    const ctx = fixture(
      {
        "docs/cycles/2026-09-work.md": cycle,
        "docs/items/dup1.md": item(A),
        "docs/items/dup2.md": item(A, { parent: "feature/nope" }),
        "docs/items/c.md": item(C, {
          cycle: "2099-01-nope",
          blocked_by: `[${NOBODY}]`,
          from: "nowhere",
          scope: "ui",
        }),
        "docs/items/s1.md": item("0190f4b2-7c3a-7d4e-8f00-000000000021", {
          blocked_by: "[0190f4b2-7c3a-7d4e-8f00-000000000021]",
        }),
        "docs/features/x/plan.md": doc({
          type: "plan",
          title: "P",
          description: "A plan.",
          status: "draft",
          lifecycle: "draft",
          generated: GENERATED,
        }),
        "docs/items/_archive/z.md": item("0190f4b2-7c3a-7d4e-8f00-000000000022", {
          lifecycle: "active",
        }),
        "docs/items/z.md": item("0190f4b2-7c3a-7d4e-8f00-000000000023"),
      },
      { scopes: ["lint"] }
    );
    const kinds = workProblems(ctx).map((p) => p.split(/\s{2,}/)[0]);
    expect(kinds.sort()).toEqual(
      [
        "ARCHIVED NOT TERMINAL",
        "BAD BLOCKED_BY",
        "BAD CYCLE",
        "BAD FROM",
        "BAD PARENT",
        "BAD SCOPE",
        "BLOCKED CYCLE",
        "DUPLICATE ID",
        "DUPLICATE SLUG",
        "MISSING ENTITY FILE",
      ].sort()
    );
  });
});

// ---------------------------------------------------------------------------------------
// No silent deletion (D9)
// ---------------------------------------------------------------------------------------

describe("no silent deletion — an item leaves the tree only through dropped", () => {
  // Every git call and every check is a child process through `childEnv()`: a
  // git spawned in-process from a hook environment inherits GIT_INDEX_FILE and
  // reads the wrong index.
  const git = (root: string, ...args: string[]) => {
    const r = Bun.spawnSync(
      ["git", "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args],
      { cwd: root, env: childEnv(), stdout: "pipe", stderr: "pipe" }
    );
    if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  };

  const check = (root: string, ...extra: string[]) => {
    const r = Bun.spawnSync(
      ["bun", CLI, "check", "--root", root, "--format", "json", ...extra],
      { env: childEnv(), stdout: "pipe", stderr: "pipe" }
    );
    const out = JSON.parse(r.stdout.toString());
    return {
      code: r.exitCode,
      deleted: (out.data.problems as Array<{ message: string }>)
        .map((p) => p.message)
        .filter((m) => m.startsWith("ITEM DELETED")),
    };
  };

  /** A committed repository holding one item, `docs/items/x.md`. */
  const repo = (
    lifecycle = "backlog",
    lint: Record<string, unknown> = {},
    files: Record<string, string> = { "docs/items/x.md": item(A, { lifecycle }) }
  ): string => {
    const ctx = fixture(files, lint);
    copyFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), join(ctx.docsRoot, "SCHEMA.md"));
    git(ctx.repoRoot, "init", "-q");
    git(ctx.repoRoot, "add", "-A");
    git(ctx.repoRoot, "commit", "-q", "--no-verify", "-m", "an item");
    return ctx.repoRoot;
  };

  test("the committed tree itself is clean", () => {
    expect(check(repo()).deleted).toEqual([]);
  });

  test("deleting an item that is not dropped reports it, with its path and id", () => {
    const root = repo();
    rmSync(join(root, "docs/items/x.md"));
    const { code, deleted } = check(root);
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toContain("docs/items/x.md");
    expect(deleted[0]).toContain(A);
    expect(deleted[0]).toContain("dropped");
    expect(code).toBe(9);
  });

  test("an item committed as dropped may then be deleted", () => {
    const root = repo("dropped");
    rmSync(join(root, "docs/items/x.md"));
    expect(check(root).deleted).toEqual([]);
  });

  test("promoting an item to a folder keeps its id, and is not a deletion", () => {
    const root = repo();
    mkdirSync(join(root, "docs/items/x"));
    renameSync(join(root, "docs/items/x.md"), join(root, "docs/items/x/item.md"));
    expect(check(root).deleted).toEqual([]);
  });

  test("archiving a done item is a move, not a deletion", () => {
    const root = repo("done");
    mkdirSync(join(root, "docs/items/_archive"));
    renameSync(join(root, "docs/items/x.md"), join(root, "docs/items/_archive/x.md"));
    expect(check(root).deleted).toEqual([]);
  });

  test("a committed deletion is still found with --against the base", () => {
    const root = repo();
    git(root, "rm", "-q", "docs/items/x.md");
    git(root, "commit", "-q", "--no-verify", "-m", "gone");
    // Against HEAD the working tree equals the ref: nothing to compare.
    expect(check(root).deleted).toEqual([]);
    expect(check(root, "--against", "HEAD~1").deleted).toHaveLength(1);
  });

  test("archiving a done item is not a deletion when lint.skip names _archive (review A)", () => {
    const root = repo("done", { skip: ["_archive"] });
    mkdirSync(join(root, "docs/items/_archive"));
    renameSync(join(root, "docs/items/x.md"), join(root, "docs/items/_archive/x.md"));
    expect(check(root).deleted).toEqual([]);
  });

  test("a tree that is not a git repository has no finding and no crash", () => {
    const ctx = fixture({ "docs/items/x.md": item(A) });
    copyFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), join(ctx.docsRoot, "SCHEMA.md"));
    const r = check(ctx.repoRoot);
    expect(r.deleted).toEqual([]);
  });

  test("a ref that does not exist is a usage error, not a clean report", () => {
    const root = repo();
    const r = Bun.spawnSync(
      ["bun", CLI, "check", "--root", root, "--format", "json", "--against", "no-such-ref"],
      { env: childEnv(), stdout: "pipe", stderr: "pipe" }
    );
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("no-such-ref");
  });
});

// ---------------------------------------------------------------------------------------
// Review findings
// ---------------------------------------------------------------------------------------

describe("the archive is read even when lint.skip names _archive (review A)", () => {
  // This repository skips `_archive` until it migrates. The work rules must
  // see `features/_archive/` and `items/_archive/` regardless: the deletion
  // check compares ids against them, and the terminal-state rule is about them.
  test("a non-terminal item in _archive is still flagged", () => {
    const ctx = fixture(
      { "docs/items/_archive/z.md": item(A, { lifecycle: "active" }) },
      { skip: ["_archive"] }
    );
    expect(only(ctx, "ARCHIVED NOT TERMINAL")).toHaveLength(1);
  });

  test("a slug both live and archived is still a DUPLICATE SLUG", () => {
    const ctx = fixture(
      {
        "docs/items/z.md": item(A),
        "docs/items/_archive/z.md": item(B, { lifecycle: "done" }),
      },
      { skip: ["_archive"] }
    );
    expect(only(ctx, "DUPLICATE SLUG")).toHaveLength(1);
  });
});
