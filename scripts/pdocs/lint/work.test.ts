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
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { childEnv } from "../test-env.ts";
import { type Ctx, context, thinTier } from "./rules.ts";
import { collect } from "./collect.ts";
import { configProblems, workProblems } from "./work.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

/** A fixture on the new layout: features, items and cycles, archive linted. */
function fixture(
  files: Record<string, string>,
  lint: Record<string, unknown> = {},
  docsRoot = "docs"
): Ctx {
  const root = mkdtempSync(join(tmpdir(), "pdocs-work-"));
  roots.push(root);
  writeFileSync(
    join(root, ".project-docs.json"),
    JSON.stringify({
      docsRoot,
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

describe("NO OUTCOME — a closed or abandoned cycle records what happened", () => {
  // The cycle template this repository ships, byte for byte: the placeholder is
  // read from it, never written into the rule.
  const TEMPLATE = readFileSync(join(REPO_ROOT, "docs/cycles/TEMPLATE.md"), "utf8");
  const tplOutcome = /## Outcome\n([\s\S]*?)\n## /.exec(TEMPLATE.replace(/^---\n[\s\S]*?\n---\n/, ""))?.[1] as string;
  const cycleAt = (lifecycle: string, body: string, extra: Record<string, string> = {}) =>
    `${doc({
      type: "cycle",
      title: "A cycle",
      description: "A stretch of work.",
      status: "draft",
      lifecycle,
      started: "2026-09-01",
      ...(lifecycle === "closed" ? { closed: "2026-09-20" } : {}),
      generated: GENERATED,
      ...extra,
    }).replace("# X\n", "# A cycle\n")}\n## Why now\n\nBecause.\n\n${body}`;
  const WRITTEN = "## Outcome\n\nBoth items shipped. The lint rule was cut and carried over.\n\n## Sessions\n";
  const rows = (ctx: Ctx) => only(ctx, "NO OUTCOME");

  test("the template's Outcome placeholder is a real one: it is what this test puts in a cycle", () => {
    expect(tplOutcome).toContain("_Written at close, not before");
  });

  test("closed with the template's placeholder, abandoned with no Outcome, closed with an empty one: each reported", () => {
    const ctx = fixture({
      "docs/cycles/TEMPLATE.md": TEMPLATE,
      "docs/cycles/2026-07-placeholder.md": cycleAt("closed", `## Outcome\n${tplOutcome}\n## Sessions\n`),
      "docs/cycles/2026-08-missing.md": cycleAt("abandoned", "## Sessions\n"),
      "docs/cycles/2026-06-empty.md": cycleAt("closed", "## Outcome\n\n<!-- later -->\n\n## Sessions\n"),
    });
    expect(rows(ctx).sort()).toEqual([
      "NO OUTCOME  docs/cycles/2026-06-empty.md: closed, but has an empty `## Outcome`  (write what shipped, what was cut and what was learned)",
      "NO OUTCOME  docs/cycles/2026-07-placeholder.md: closed, but still has the template's placeholder under `## Outcome`  (write what shipped, what was cut and what was learned)",
      "NO OUTCOME  docs/cycles/2026-08-missing.md: abandoned, but has no `## Outcome` section  (write what shipped, what was cut and what was learned)",
    ]);
  });

  test("a written Outcome is clean — also when the italic prompt was left above it", () => {
    const ctx = fixture({
      "docs/cycles/TEMPLATE.md": TEMPLATE,
      "docs/cycles/2026-07-done.md": cycleAt("closed", WRITTEN),
      "docs/cycles/2026-08-kept-prompt.md": cycleAt(
        "abandoned",
        "## Outcome\n\n_Written at close, not before — and for an `abandoned` cycle too._\n\nFalsified: the consumer never migrated.\n"
      ),
    });
    expect(rows(ctx)).toEqual([]);
  });

  test("a planned or active cycle with the placeholder is not reported: the Outcome is written at close", () => {
    const ctx = fixture({
      "docs/cycles/TEMPLATE.md": TEMPLATE,
      "docs/cycles/2026-09-now.md": cycleAt("active", `## Outcome\n${tplOutcome}\n## Sessions\n`),
      "docs/cycles/2026-10-next.md": cycleAt("planned", "## Sessions\n"),
    });
    expect(rows(ctx)).toEqual([]);
  });

  test("the placeholder is the project's own template's: an edited one counts, and the stock prompt is then prose", () => {
    const edited = TEMPLATE.replace(tplOutcome, "\n[Fill in at close.]\n\n");
    const ctx = fixture({
      "docs/cycles/TEMPLATE.md": edited,
      "docs/cycles/2026-07-theirs.md": cycleAt("closed", "## Outcome\n\n[Fill in at close.]\n\n## Sessions\n"),
      "docs/cycles/2026-08-stock.md": cycleAt("closed", `## Outcome\n${tplOutcome}\n## Sessions\n`),
    });
    expect(rows(ctx)).toEqual([
      "NO OUTCOME  docs/cycles/2026-07-theirs.md: closed, but still has the template's placeholder under `## Outcome`  (write what shipped, what was cut and what was learned)",
    ]);
  });

  test("an Outcome heading with text after it, and `## Outcomes`, are the section", () => {
    const ctx = fixture({
      "docs/cycles/TEMPLATE.md": TEMPLATE,
      "docs/cycles/2026-07-dash.md": cycleAt("closed", "## Outcome — shipped\n\nBoth items landed.\n\n## Sessions\n"),
      "docs/cycles/2026-08-plural.md": cycleAt("closed", "## Outcomes\n\nThe lint rule shipped; the CLI flag was cut.\n"),
      "docs/cycles/2026-06-dash-placeholder.md": cycleAt("closed", `## Outcome — shipped\n${tplOutcome}\n## Sessions\n`),
      "docs/cycles/2026-05-outcomes-based.md": cycleAt("closed", "## Outcome-based planning\n\nNot an Outcome.\n"),
    });
    expect(rows(ctx).sort()).toEqual([
      "NO OUTCOME  docs/cycles/2026-05-outcomes-based.md: closed, but has no `## Outcome` section  (write what shipped, what was cut and what was learned)",
      "NO OUTCOME  docs/cycles/2026-06-dash-placeholder.md: closed, but still has the template's placeholder under `## Outcome`  (write what shipped, what was cut and what was learned)",
    ]);
  });

  test("a `## Outcome` inside a fenced code block is not the section", () => {
    const fenced = "## Why now\n\n```markdown\n## Outcome\n\nAn example, not a record.\n```\n\n";
    const ctx = fixture({
      "docs/cycles/TEMPLATE.md": TEMPLATE,
      "docs/cycles/2026-07-fenced-placeholder.md": cycleAt("closed", `${fenced}## Outcome\n${tplOutcome}\n## Sessions\n`),
      "docs/cycles/2026-08-fenced-only.md": cycleAt("abandoned", `${fenced}~~~\n## Outcome\n\nAlso an example.\n~~~\n`),
    });
    expect(rows(ctx).sort()).toEqual([
      "NO OUTCOME  docs/cycles/2026-07-fenced-placeholder.md: closed, but still has the template's placeholder under `## Outcome`  (write what shipped, what was cut and what was learned)",
      "NO OUTCOME  docs/cycles/2026-08-fenced-only.md: abandoned, but has no `## Outcome` section  (write what shipped, what was cut and what was learned)",
    ]);
  });

  test("`pdocs check` fails on it, under a docs root of another name", () => {
    const ctx = fixture(
      {
        "handbook/SCHEMA.md": readFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), "utf8"),
        "handbook/cycles/TEMPLATE.md": TEMPLATE,
        "handbook/cycles/2026-07-placeholder.md": cycleAt("closed", `## Outcome\n${tplOutcome}\n## Sessions\n`),
      },
      {},
      "handbook"
    );
    const r = Bun.spawnSync(["bun", CLI, "check", "--root", ctx.repoRoot, "--format", "json"], { env: childEnv(), stdout: "pipe", stderr: "pipe" });
    const messages = (JSON.parse(r.stdout.toString()).data.problems as Array<{ message: string }>).map((p) => p.message);
    expect(r.exitCode).toBe(9);
    expect(messages).toContain(
      "NO OUTCOME  handbook/cycles/2026-07-placeholder.md: closed, but still has the template's placeholder under `## Outcome`  (write what shipped, what was cut and what was learned)"
    );
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

  test("lowercasing an uppercase id is not a deletion (review C)", () => {
    // Moved as well as lowercased, so the item is not at its old path and the
    // ids really are compared: only the case-insensitive comparison keeps this
    // from reading as a deletion.
    const root = repo("backlog", {}, { "docs/items/x.md": item(A.toUpperCase()) });
    rmSync(join(root, "docs/items/x.md"));
    mkdirSync(join(root, "docs/items/x"));
    writeFileSync(join(root, "docs/items/x/item.md"), item(A));
    expect(check(root).deleted).toEqual([]);
  });

  test("rewriting an item's id in place drops the old id: that is a deletion", () => {
    const root = repo();
    writeFileSync(join(root, "docs/items/x.md"), item(`${A.slice(0, -1)}e`));
    const { deleted } = check(root);
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toContain(A);
  });

  test("reusing a slug for a new item drops the old one: that is a deletion", () => {
    const root = repo();
    writeFileSync(join(root, "docs/items/x.md"), item(B));
    const { deleted } = check(root);
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toContain(A);
  });

  test("deleting an item with a non-ASCII filename is found (review D)", () => {
    const root = repo("backlog", {}, { "docs/items/café.md": item(A) });
    rmSync(join(root, "docs/items/café.md"));
    const { deleted } = check(root);
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toContain("docs/items/café.md");
  });

  test("an item still at its path but unparsable is not reported deleted (review H)", () => {
    const root = repo();
    // CRLF line endings: the frontmatter no longer parses. That is the file's
    // own finding (NO FRONTMATTER), not a deletion.
    const path = join(root, "docs/items/x.md");
    writeFileSync(path, item(A).replace(/\n/g, "\r\n"));
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

describe("the docs root may be spelled ./docs or docs/ (review B)", () => {
  const files = {
    "docs/items/a.md": item(A, { parent: "feature/nope" }),
    "docs/items/_archive/z.md": item(B, { lifecycle: "active" }),
    "docs/features/x/plan.md": doc({
      type: "plan",
      title: "P",
      description: "A plan.",
      status: "draft",
      lifecycle: "draft",
      generated: GENERATED,
    }),
  };

  test("every spelling finds what `docs` finds", () => {
    const want = workProblems(fixture(files));
    expect(want.length).toBe(3);
    for (const spelling of ["./docs", "docs/", "./docs/"])
      expect({ spelling, found: workProblems(fixture(files, {}, spelling)) }).toEqual({
        spelling,
        found: want,
      });
  });
});

describe("the deletion check's git spawns ignore a hook's environment (review E)", () => {
  // A pre-commit hook in a LINKED worktree is handed `GIT_DIR`. A git told its
  // directory but not its work tree takes the working directory as the top
  // level, so from `packages/app` an inherited environment makes `ls-tree --
  // docs/items` look for the monorepo root's `docs/items` — nothing there,
  // and the deleted item goes unreported. `gitEnv()` is what prevents it.
  test("a monorepo package's deleted item is reported by a hook in a linked worktree", () => {
    const base = mkdtempSync(join(tmpdir(), "pdocs-work-hook-"));
    roots.push(base);
    const main = join(base, "main");
    const app = join(main, "packages/app");
    const files: Record<string, string> = {
      ".project-docs.json": JSON.stringify({
        docsRoot: "docs",
        version: "1.0.0",
        lint: { adopting: false, workbench: ["features", "items", "cycles"], skip: [] },
      }),
      "docs/items/x.md": item(A),
    };
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(dirname(join(app, rel)), { recursive: true });
      writeFileSync(join(app, rel), body);
    }
    copyFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), join(app, "docs/SCHEMA.md"));

    const git = (cwd: string, ...args: string[]) => {
      const r = Bun.spawnSync(
        [
          "git",
          "-c",
          "user.name=t",
          "-c",
          "user.email=t@t",
          "-c",
          "commit.gpgsign=false",
          "-c",
          `core.hooksPath=${join(main, ".git/hooks")}`,
          ...args,
        ],
        { cwd, env: childEnv(), stdout: "pipe", stderr: "pipe" }
      );
      if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
    };
    mkdirSync(main, { recursive: true });
    git(main, "init", "-q");
    git(main, "add", "-A");
    git(main, "commit", "-q", "--no-verify", "-m", "init");
    const wt = join(base, "wt");
    git(main, "worktree", "add", "-q", wt);

    const out = join(base, "hook");
    mkdirSync(join(main, ".git/hooks"), { recursive: true });
    writeFileSync(
      join(main, ".git/hooks/pre-commit"),
      `#!/bin/sh\ncd packages/app && bun "${CLI}" check --format json --root . > "${out}.stdout" 2> "${out}.stderr"\nexit 0\n`,
      { mode: 0o755 }
    );
    git(wt, "rm", "-q", "packages/app/docs/items/x.md");
    git(wt, "commit", "-q", "-m", "delete the item");

    const report = JSON.parse(readFileSync(`${out}.stdout`, "utf8"));
    const deleted = (report.data.problems as Array<{ message: string }>)
      .map((p) => p.message)
      .filter((m) => m.startsWith("ITEM DELETED"));
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toContain(A);
  });
});

describe("a lint.scopes that is not a list of strings is reported (review I)", () => {
  test("a string, a number and a mixed list each name the bad value", () => {
    for (const bad of ["lint", 7, ["lint", 7]]) {
      const problems = configProblems(fixture({}, { scopes: bad }));
      expect(problems).toHaveLength(1);
      expect(problems[0]).toStartWith("BAD CONFIG  .project-docs.json");
      expect(problems[0]).toContain(JSON.stringify(bad));
    }
  });

  test("the fallback stays: no scope is declared, and the config says why", () => {
    const ctx = fixture(
      { "docs/items/a.md": item(A, { scope: "lint" }), "docs/SCHEMA.md": readFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), "utf8") },
      { scopes: "lint" }
    );
    const rows = collect(ctx).workbench;
    expect(rows.filter((r) => r.startsWith("BAD CONFIG"))).toHaveLength(1);
    expect(rows.filter((r) => r.startsWith("BAD SCOPE"))).toHaveLength(1);
  });

  test("an absent key and a good list are silent", () => {
    expect(configProblems(fixture({}))).toEqual([]);
    expect(configProblems(fixture({}, { scopes: ["lint"] }))).toEqual([]);
  });
});
