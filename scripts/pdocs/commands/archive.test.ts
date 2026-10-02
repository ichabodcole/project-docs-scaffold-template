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
  realpathSync,
  rmSync,
  symlinkSync,
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
const NOTED = "0190f4f3-0000-7000-8000-00000000000e";

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
    "docs/features/a/sessions/2026-09-01-s.md",
    doc(
      { type: "session", title: "S", description: "A session.", status: "stable", generated: GENERATED },
      "# S"
    )
  );
  write(
    "docs/items/noted.md",
    item(NOTED, "backlog", "# Noted", { from: "features/a/sessions/2026-09-01-s.md" })
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

  test("a path-form `from:` into the moved folder follows it; other forms are untouched", () => {
    const root = tree();
    const r = archive(root, "feature/a");
    expect(JSON.parse(r.stdout).data.rewritten).toContain("docs/items/noted.md");
    expect(read(root, "docs/items/noted.md")).toContain(
      "from: features/_archive/a/sessions/2026-09-01-s.md\n"
    );
    expect(read(root, "docs/items/waits.md")).toContain(`from: ${DONE}\n`);
    clean(root);
  });

  test("a footnote and a prose definition survive an archive untouched (re-review 1)", () => {
    const root = tree();
    const path = "docs/items/done-one.md";
    const body = `${read(root, path)}\nNote.[^1]\n\n[^1]: See the other notes\n[plain]: some words here\n`;
    writeFileSync(join(root, path), body);
    archive(root, "item/done-one");
    const after = read(root, "docs/items/_archive/done-one.md");
    expect(after).toContain("[^1]: See the other notes\n");
    expect(after).toContain("[plain]: some words here\n");
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
});

// Cycles follow the same rule (2026-10-01): a `closed` or `abandoned` cycle may
// move to `cycles/_archive/`; a `planned` or `active` one may not. The slug is
// the file name, so an item's `cycle:` still names it after the move.
describe("pdocs archive cycle/<slug>", () => {
  const cycle = (lifecycle: string, body: string) =>
    doc(
      {
        type: "cycle",
        title: "Cycle",
        description: "A cycle.",
        tags: "[test, cycles]",
        status: "draft",
        lifecycle,
        appetite: "When the work lands.",
        started: "2026-09-01",
        generated: GENERATED,
      },
      body
    );
  const OUTCOME = "## Outcome\n\nShipped the done item; cut nothing; learned the archive works.";
  const MEMBER = "0190f501-0000-7000-8000-00000000000f";

  function cycleTree(): string {
    const root = tree();
    const write = (rel: string, body: string) => {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    };
    write(
      "docs/cycles/2026-09-old.md",
      cycle(
        "closed",
        `# Old\n\n## Scope\n\n- [Done](../items/done-one.md) and [b](../features/b/feature.md#b).\n\n${OUTCOME}`
      )
    );
    write(
      "docs/cycles/2026-09-gave-up.md",
      cycle("abandoned", `# Gave up\n\nAfter [the old cycle](./2026-09-old.md).\n\n${OUTCOME}`)
    );
    write("docs/cycles/2026-10-now.md", cycle("active", "# Now\n\nFollows [old](./2026-09-old.md)."));
    write("docs/cycles/2026-11-next.md", cycle("planned", "# Next"));
    write(
      "docs/items/member.md",
      item(MEMBER, "done", "# Member\n\nRan in [the old cycle](../cycles/2026-09-old.md).", {
        cycle: "2026-09-old",
        from: "cycle/2026-09-old",
      })
    );
    git(root, "add", "-A");
    git(root, "commit", "-qm", "cycles");
    return root;
  }

  test("the cycle fixture is clean", () => clean(cycleTree()));

  test("a closed cycle moves to cycles/_archive/, links to and from it rewritten", () => {
    const root = cycleTree();
    const r = archive(root, "cycle/2026-09-old");
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    const data = JSON.parse(r.stdout).data;
    expect(data.from).toBe("docs/cycles/2026-09-old.md");
    expect(data.to).toBe("docs/cycles/_archive/2026-09-old.md");
    expect(data.moved).toBe(true);
    expect(existsSync(join(root, "docs/cycles/2026-09-old.md"))).toBe(false);
    // Outbound: one level deeper now.
    expect(read(root, "docs/cycles/_archive/2026-09-old.md")).toContain(
      "[Done](../../items/done-one.md) and [b](../../features/b/feature.md#b)"
    );
    // Inbound, from a sibling cycle and from an item.
    expect(read(root, "docs/cycles/2026-10-now.md")).toContain("[old](./_archive/2026-09-old.md)");
    expect(read(root, "docs/items/member.md")).toContain(
      "[the old cycle](../cycles/_archive/2026-09-old.md)"
    );
    // The moved file's own two links, and one inbound link from each of three files.
    expect(data.rewritten).toEqual([
      "docs/cycles/2026-09-gave-up.md",
      "docs/cycles/2026-10-now.md",
      "docs/cycles/_archive/2026-09-old.md",
      "docs/items/member.md",
    ]);
    expect(data.links).toBe(5);
    clean(root);
  });

  test("an abandoned cycle moves too", () => {
    const root = cycleTree();
    expect(archive(root, "cycle/2026-09-gave-up").code).toBe(ExitCode.Success);
    expect(existsSync(join(root, "docs/cycles/_archive/2026-09-gave-up.md"))).toBe(true);
    clean(root);
  });

  test("two archived cycles that link each other keep a working link", () => {
    const root = cycleTree();
    archive(root, "cycle/2026-09-old");
    archive(root, "cycle/2026-09-gave-up");
    expect(read(root, "docs/cycles/_archive/2026-09-gave-up.md")).toContain(
      "[the old cycle](./2026-09-old.md)"
    );
    clean(root);
  });

  test("a planned or active cycle exits 2, names its state, and nothing moves", () => {
    const root = cycleTree();
    for (const [ref, state] of [
      ["cycle/2026-10-now", "active"],
      ["cycle/2026-11-next", "planned"],
    ] as const) {
      const r = archive(root, ref);
      expect(r.code).toBe(ExitCode.Usage);
      expect(r.stderr).toContain(state);
      expect(r.stderr).toContain("closed or abandoned");
      expect(r.stderr).toContain("--lifecycle closed");
      expect(r.stderr).toContain("--lifecycle abandoned");
    }
    expect(existsSync(join(root, "docs/cycles/2026-10-now.md"))).toBe(true);
    expect(existsSync(join(root, "docs/cycles/2026-11-next.md"))).toBe(true);
    expect(existsSync(join(root, "docs/cycles/_archive/2026-10-now.md"))).toBe(false);
  });

  test("an item's `cycle:` and `from: cycle/<slug>` still resolve; no frontmatter changed", () => {
    const root = cycleTree();
    const fm = (t: string) => /^---\n[\s\S]*?\n---/.exec(t)![0];
    const before = fm(read(root, "docs/items/member.md"));
    const cycleBefore = fm(read(root, "docs/cycles/2026-09-old.md"));
    archive(root, "cycle/2026-09-old");
    expect(fm(read(root, "docs/items/member.md"))).toBe(before);
    expect(fm(read(root, "docs/cycles/_archive/2026-09-old.md"))).toBe(cycleBefore);
    // `pdocs check` would report BAD CYCLE or BAD FROM if either stopped resolving.
    clean(root);
    const found = run(["find", "--cycle", "2026-09-old", "--root", root, "--format", "json"]);
    expect(JSON.parse(found.stdout).data.matches.map((m: { path: string }) => m.path)).toEqual([
      "docs/items/member.md",
    ]);
  });

  test("`view cycle` still finds an archived cycle by its slug, and says it is archived", () => {
    const root = cycleTree();
    archive(root, "cycle/2026-09-old");
    const r = run(["view", "cycle", "2026-09-old", "--root", root, "--format", "json"]);
    expect(r.code).toBe(ExitCode.Success);
    const data = JSON.parse(r.stdout).data;
    expect(data.cycle.path).toBe("docs/cycles/_archive/2026-09-old.md");
    expect(data.cycle.archived).toBe(true);
    expect(data.items.map((e: { path: string }) => e.path)).toEqual(["docs/items/member.md"]);
    expect(data.closable).toBe(true);
  });

  test("`find --type cycle` still returns an archived cycle", () => {
    const root = cycleTree();
    archive(root, "cycle/2026-09-old");
    const r = run(["find", "--type", "cycle", "--root", root, "--format", "json"]);
    const paths = JSON.parse(r.stdout).data.matches.map((m: { path: string }) => m.path);
    expect(paths).toContain("docs/cycles/_archive/2026-09-old.md");
    expect(paths).toContain("docs/cycles/2026-10-now.md");
  });

  test("archiving an archived cycle is a no-op and exits 0", () => {
    const root = cycleTree();
    archive(root, "cycle/2026-09-old");
    const r = archive(root, "cycle/2026-09-old");
    expect(r.code).toBe(ExitCode.Success);
    expect(JSON.parse(r.stdout).data.moved).toBe(false);
  });

  test("text output names the move and the link count", () => {
    const root = cycleTree();
    const r = run(["archive", "cycle/2026-09-old", "--root", root, "--format", "text"]);
    expect(r.code).toBe(ExitCode.Success);
    expect(r.stdout).toContain("docs/cycles/2026-09-old.md -> docs/cycles/_archive/2026-09-old.md");
    expect(r.stdout).toContain("rewrote 5 link(s) in 4 file(s)");
  });

  test("a new cycle may not reuse an archived cycle's slug", () => {
    const root = cycleTree();
    archive(root, "cycle/2026-09-old");
    const r = run(["new", "cycle", "2026-09-old", "--root", root, "--format", "json"]);
    expect(r.code).toBe(ExitCode.Conflict);
    expect(r.stderr).toContain("cycle/2026-09-old");
    expect(r.stderr).toContain("archived or not");
    expect(existsSync(join(root, "docs/cycles/2026-09-old.md"))).toBe(false);
  });

  test("a rewritten link that pushes a line past 80 columns is reflowed by the project's Prettier", () => {
    const root = cycleTree();
    // The project's own Prettier, as a project that formats its Markdown has it.
    mkdirSync(join(root, "node_modules"), { recursive: true });
    symlinkSync(
      realpathSync(join(REPO_ROOT, "node_modules/prettier")),
      join(root, "node_modules/prettier")
    );
    copyFileSync(join(REPO_ROOT, ".prettierrc"), join(root, ".prettierrc"));
    writeFileSync(join(root, ".gitignore"), "node_modules/\n");
    // 76 columns before the move; inserting `_archive/` makes it 85.
    const LINE = "Ran in [the old cycle](../cycles/2026-09-old.md), which closed in Sept 2026.";
    expect(LINE.length).toBeLessThanOrEqual(80);
    expect(LINE.replace("cycles/", "cycles/_archive/").length).toBeGreaterThan(80);
    writeFileSync(
      join(root, "docs/items/long-line.md"),
      item("0190f502-0000-7000-8000-000000000010", "done", `# Long line\n\n${LINE}`)
    );
    git(root, "add", "-A");
    git(root, "commit", "-qm", "long line");

    const files = [
      "docs/cycles/2026-09-gave-up.md",
      "docs/cycles/2026-10-now.md",
      "docs/items/member.md",
      "docs/items/long-line.md",
    ];
    const prettierCheck = (paths: string[]) =>
      Bun.spawnSync([join(REPO_ROOT, "node_modules/.bin/prettier"), "--check", ...paths], {
        cwd: root,
        env: childEnv(),
      });
    // Precondition: every file the move will rewrite is Prettier-clean before it.
    expect(prettierCheck([...files, "docs/cycles/2026-09-old.md"]).exitCode).toBe(0);

    expect(archive(root, "cycle/2026-09-old").code).toBe(ExitCode.Success);
    expect(read(root, "docs/items/long-line.md")).toContain(
      "[the old cycle](../cycles/_archive/2026-09-old.md)"
    );
    const p = prettierCheck([...files, "docs/cycles/_archive/2026-09-old.md"]);
    expect(p.stderr.toString() + p.stdout.toString()).not.toContain("[warn]");
    expect(p.exitCode).toBe(0);
  });
});
