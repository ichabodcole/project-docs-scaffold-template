// The read commands — `graph`, `find`, `backlinks`, `orphans` — end to end.
//
// Spawning the real process rather than calling the functions, for the same
// reason `cli.test.ts` does: dispatch, flag parsing and format resolution are
// three places a command can be wrong while every function it calls is right.
// A `find` whose `--since` never reaches `parseFilters` because `options` did
// not declare the flag is a real failure mode, and it is invisible to a unit
// test of `matches()`.
//
// The fixture tree is built here, not committed. `lint/golden.test.ts` explains
// why at length: a dirty `.md` inside this repository would be linted by the
// live gate and REPAIRED by `npm run format`.

import { afterAll, describe, expect, test } from "bun:test";
import {
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
import { context } from "../lint/rules.ts";
import { collectPages, pageKeys } from "../pages.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");
const SCHEMA = readFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), "utf8");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function run(args: string[]) {
  const p = Bun.spawnSync(["bun", CLI, ...args], {
    cwd: REPO_ROOT,
    env: childEnv(),
  });
  return {
    code: p.exitCode,
    stdout: p.stdout.toString(),
    stderr: p.stderr.toString(),
  };
}

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-read-"));
  roots.push(root);
  writeFileSync(
    join(root, ".project-docs.json"),
    `${JSON.stringify(
      {
        docsRoot: "docs",
        version: "1.0.0",
        lint: {
          adopting: false,
          exclude: [],
          durable: [
            "architecture",
            "specifications",
            "interaction-design",
            "playbooks",
            "lessons-learned",
            "memories",
          ],
          workbench: ["features", "items", "cycles"],
          // Kept, the way an adopter keeps a retired library folder (D11).
          types: { memories: "memory", "lessons-learned": "lesson" },
          skip: ["superpowers"],
        },
      },
      null,
      2
    )}\n`
  );
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  // `trackedMarkdown` shells out to git, and `pdocs check` calls it. An empty
  // repo pins that tier to "no tracked files" instead of letting it wander into
  // whatever checkout /tmp happens to live inside.
  Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
  return root;
}

const page = (fm: Record<string, string>, body = ""): string =>
  `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n${body}\n`;

/**
 * One tree exercising everything at once: two tiers, an orphan, a `related:`
 * edge, a body link, two proposals with different lifecycles, and two pages
 * sharing a basename so ambiguity is reachable.
 */
const FIXTURE = {
  "docs/SCHEMA.md": SCHEMA,

  "docs/index.md": page(
    {
      type: "index",
      title: "Fixture Catalog",
      description: "The catalog for the read-command fixture.",
      status: "stable",
      tags: "[fixture]",
      generated: "{ by: read-test, at: 2026-01-01 }",
    },
    `# Fixture Catalog

- [A Playbook](./playbooks/a-playbook.md) — How the fixture exercises the graph.
`
  ),

  // In the catalog: reachable.
  "docs/playbooks/a-playbook.md": page({
    type: "playbook",
    title: "A Playbook",
    description: "How the fixture exercises the graph.",
    status: "stable",
    tags: "[fixture, graph]",
    generated: "{ by: read-test, at: 2026-02-01 }",
  }),

  // NOT in the catalog: an orphan, and the only one.
  "docs/memories/a-memory.md": page({
    type: "memory",
    title: "A Memory",
    description: "A library page nothing links to.",
    status: "stable",
    tags: "[fixture]",
    generated: "{ by: read-test, at: 2026-03-01 }",
  }),

  "docs/features/alpha/feature.md": page(
    {
      type: "feature",
      title: "Alpha",
      description: "A feature that shipped.",
      status: "stable",
      lifecycle: "done",
      tags: "[alpha]",
      related: "[playbook/a-playbook]",
      generated: "{ by: read-test, at: 2026-04-01 }",
    },
    `# Alpha

Built on [the playbook](../../playbooks/a-playbook.md).
`
  ),

  "docs/features/beta/feature.md": page({
    type: "feature",
    title: "Beta",
    description: "A feature still being written.",
    status: "draft",
    lifecycle: "backlog",
    tags: "[beta]",
    generated: "{ by: read-test, at: 2026-05-01 }",
  }),

  "docs/cycles/2026-01-a-cycle.md": page({
    type: "cycle",
    title: "A Cycle",
    description: "The one active cycle.",
    status: "stable",
    lifecycle: "active",
    tags: "[fixture]",
    generated: "{ by: read-test, at: 2026-06-01 }",
  }),

  // No `generated`, so no date: it can never match `--since`.
  "docs/items/undated.md": page({
    type: "item",
    title: "Undated",
    description: "An item with no generated block.",
    status: "draft",
    lifecycle: "backlog",
    id: "0190f4b2-7c3a-7d4e-8f00-00000000000a",
    kind: "task",
  }),
};

const ROOT = tree(FIXTURE);

// ---------------------------------------------------------------------------------------

describe("pdocs find", () => {
  test("a filter that matches, in both formats", () => {
    const json = run([
      "find",
      "--type",
      "feature",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(json.code).toBe(ExitCode.Success);
    const out = JSON.parse(json.stdout);
    expect(out.ok).toBe(true);
    expect(out.meta.command).toBe("find");
    expect(out.data.count).toBe(2);
    expect(out.data.matches.map((m: { path: string }) => m.path)).toEqual([
      "docs/features/alpha/feature.md",
      "docs/features/beta/feature.md",
    ]);

    const text = run([
      "find",
      "--type",
      "feature",
      "--format",
      "text",
      "--root",
      ROOT,
    ]);
    expect(text.code).toBe(ExitCode.Success);
    expect(text.stdout).toContain("docs/features/alpha/feature.md");
    expect(text.stdout).toContain("2 document(s)");
  });

  test("it reaches the workbench, which a library-tier graph never would", () => {
    // The whole reason `pages.ts` exists. `--type cycle` on a `graphTier`-backed
    // find returns nothing, because `cycles/` is a `nonPageDir`.
    const out = JSON.parse(
      run([
        "find",
        "--type",
        "cycle",
        "--lifecycle",
        "active",
        "--format",
        "json",
        "--root",
        ROOT,
      ]).stdout
    );
    expect(out.data.count).toBe(1);
    expect(out.data.matches[0].path).toBe("docs/cycles/2026-01-a-cycle.md");
  });

  test("filters AND together", () => {
    const both = JSON.parse(
      run([
        "find",
        "--type",
        "feature",
        "--lifecycle",
        "done",
        "--format",
        "json",
        "--root",
        ROOT,
      ]).stdout
    );
    expect(both.data.count).toBe(1);
    expect(both.data.matches[0].title).toBe("Alpha");
  });

  test("--tag matches membership", () => {
    const out = JSON.parse(
      run(["find", "--tag", "fixture", "--format", "json", "--root", ROOT])
        .stdout
    );
    expect(out.data.matches.map((m: { path: string }) => m.path)).toEqual([
      "docs/cycles/2026-01-a-cycle.md",
      "docs/index.md",
      "docs/memories/a-memory.md",
      "docs/playbooks/a-playbook.md",
    ]);
  });

  test("--since compares generated.at, and an undated page never matches", () => {
    const out = JSON.parse(
      run(["find", "--since", "2026-04-01", "--format", "json", "--root", ROOT])
        .stdout
    );
    const paths = out.data.matches.map((m: { path: string }) => m.path);
    // On the boundary date, inclusive.
    expect(paths).toContain("docs/features/alpha/feature.md");
    expect(paths).toContain("docs/cycles/2026-01-a-cycle.md");
    expect(paths).not.toContain("docs/playbooks/a-playbook.md");
    // No `generated` block at all: absence of a date is not evidence of
    // recency, so it is excluded rather than passed through.
    expect(paths).not.toContain("docs/items/undated.md");
  });

  test("a filter that matches nothing exits 0 — no matches is an answer", () => {
    // `architecture` is a REAL type that this fixture has no pages of. It used
    // to say `nosuchtype`, which conflated two different answers: a valid
    // filter with nothing to match, and a filter that could never match. Only
    // the first is an answer; the second is now a rejection, below.
    const json = run([
      "find",
      "--type",
      "architecture",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(json.code).toBe(ExitCode.Success);
    const out = JSON.parse(json.stdout);
    expect(out.ok).toBe(true);
    expect(out.data.matches).toEqual([]);
    expect(out.data.count).toBe(0);

    const text = run([
      "find",
      "--type",
      "architecture",
      "--format",
      "text",
      "--root",
      ROOT,
    ]);
    expect(text.code).toBe(ExitCode.Success);
    expect(text.stdout.trim()).toBe("no matches");
  });

  test("an unknown --type exits 2 rather than matching nothing", () => {
    // The same refusal as `--since` below, for the same reason: a filter that
    // can never match returns an empty list an agent reads as "there are none".
    const { code, stderr } = run([
      "find",
      "--type",
      "nosuchtype",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(code).toBe(ExitCode.Usage);
    expect(JSON.parse(stderr).error.details.token).toBe("nosuchtype");
  });

  test("an invalid --since exits 2 rather than matching nothing", () => {
    // The failure this refuses to have: a silently-inapplicable filter returns
    // an empty list, which an agent reads as "there are no recent documents".
    const { code, stdout, stderr } = run([
      "find",
      "--since",
      "notadate",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(code).toBe(ExitCode.Usage);
    expect(stdout).toBe("");
    expect(JSON.parse(stderr).error.kind).toBe("usage");
    expect(JSON.parse(stderr).error.message).toContain("notadate");
  });

  test("a bare find lists the tree", () => {
    const out = JSON.parse(
      run(["find", "--format", "json", "--root", ROOT]).stdout
    );
    // Every fixture file except SCHEMA.md, which is a contract page.
    expect(out.data.count).toBe(Object.keys(FIXTURE).length - 1);
  });
});

// ---------------------------------------------------------------------------------------

describe("pdocs backlinks", () => {
  test("by repo-relative path, with the two edge kinds kept apart", () => {
    const { code, stdout } = run([
      "backlinks",
      "docs/playbooks/a-playbook.md",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(code).toBe(ExitCode.Success);
    const out = JSON.parse(stdout);
    expect(out.meta.command).toBe("backlinks");
    expect(out.data.target.key).toBe("playbook/a-playbook");
    // `related:` on alpha's proposal — a frontmatter claim, addressed by key.
    expect(out.data.related.map((r: { path: string }) => r.path)).toEqual([
      "docs/features/alpha/feature.md",
    ]);
    // Body links — addressed by path, and the catalog is one of them.
    expect(out.data.links.map((r: { path: string }) => r.path)).toEqual([
      "docs/features/alpha/feature.md",
      "docs/index.md",
    ]);
    expect(out.data.count).toBe(3);
  });

  test("by `type/slug` key, resolving to the same answer", () => {
    const byKey = JSON.parse(
      run([
        "backlinks",
        "playbook/a-playbook",
        "--format",
        "json",
        "--root",
        ROOT,
      ]).stdout
    );
    const byPath = JSON.parse(
      run([
        "backlinks",
        "docs/playbooks/a-playbook.md",
        "--format",
        "json",
        "--root",
        ROOT,
      ]).stdout
    );
    expect(byKey).toEqual(byPath);
  });

  test("a document nothing cites exits 0 and says so", () => {
    const json = run([
      "backlinks",
      "memory/a-memory",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(json.code).toBe(ExitCode.Success);
    const out = JSON.parse(json.stdout);
    expect(out.data.count).toBe(0);
    expect(out.data.related).toEqual([]);
    expect(out.data.links).toEqual([]);

    const text = run([
      "backlinks",
      "memory/a-memory",
      "--format",
      "text",
      "--root",
      ROOT,
    ]);
    expect(text.stdout).toContain("no inbound edges");
  });

  test("an unknown target exits 5 and names both accepted forms", () => {
    const { code, stdout, stderr } = run([
      "backlinks",
      "bogus/thing",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(code).toBe(ExitCode.NotFound);
    expect(stdout).toBe("");
    const err = JSON.parse(stderr);
    expect(err.error.kind).toBe("not_found");
    expect(err.error.message).toContain("bogus/thing");
    expect(err.error.message).toContain("type/slug");
    expect(err.error.message).toContain("repo-relative path");
  });

  test("an ambiguous key is a usage error naming the candidates", () => {
    // `feature/feature` is every feature's entry file. Answerable — the caller
    // just has to say which — so it is 2, not 5.
    const { code, stderr } = run([
      "backlinks",
      "feature/feature",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(code).toBe(ExitCode.Usage);
    expect(JSON.parse(stderr).error.message).toContain(
      "docs/features/alpha/feature.md"
    );
  });

  test("`feature/<slug>` resolves where `feature/feature` cannot", () => {
    // The form a caller reaches for when `feature/feature` turns out to name
    // every feature in the tree. Same document, same answer as by path — and
    // the same grammar `--owner` and `pdocs set` take.
    const byAlias = JSON.parse(
      run(["backlinks", "feature/alpha", "--format", "json", "--root", ROOT])
        .stdout
    );
    const byPath = JSON.parse(
      run([
        "backlinks",
        "docs/features/alpha/feature.md",
        "--format",
        "json",
        "--root",
        ROOT,
      ]).stdout
    );
    expect(byAlias).toEqual(byPath);
    expect(byAlias.data.target.path).toBe("docs/features/alpha/feature.md");
  });

  test("an entity's key is its own address, which backlinks then accepts", () => {
    const out = JSON.parse(
      run(["backlinks", "docs/features/alpha/feature.md", "--format", "json", "--root", ROOT]).stdout
    );
    expect(out.data.target.key).toBe("feature/alpha");
    const again = run(["backlinks", out.data.target.key, "--format", "json", "--root", ROOT]);
    expect(again.code).toBe(ExitCode.Success);
    const item = JSON.parse(
      run(["backlinks", "docs/items/undated.md", "--format", "json", "--root", ROOT]).stdout
    );
    expect(item.data.target.key).toBe("item/undated");
  });

  test("the retired `project/<name>` form is gone, and the refusal names the one that replaced it", () => {
    const { code, stderr } = run([
      "backlinks",
      "project/alpha",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(code).toBe(ExitCode.NotFound);
    expect(JSON.parse(stderr).error.message).toContain("feature/<slug>");
  });

  test("a contract page is answerable by path, with no key and no related", () => {
    // `collectPages` does not type SCHEMA.md — it is a document ABOUT the tree
    // — but it is the most-cited file in a real repository and "what breaks if
    // I move this" is exactly the question asked of it.
    const { code, stdout } = run([
      "backlinks",
      "docs/SCHEMA.md",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(code).toBe(ExitCode.Success);
    const out = JSON.parse(stdout);
    expect(out.data.target.key).toBeNull();
    expect(out.data.related).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------

describe("pdocs orphans", () => {
  /**
   * THE PROPERTY THAT KEEPS THE COMMAND AND THE GATE FROM DRIFTING.
   *
   * `orphans` is sourced from `graphTier` precisely so it cannot compute
   * reachability a second way — but "sourced from" is a claim about the imports,
   * and imports are easy to change. This asserts the OUTPUTS agree: the set of
   * paths the command reports is exactly the set the gate's `ORPHAN` lines name.
   *
   * If they ever disagree, the tool telling you what to fix and the gate
   * refusing to let you land are naming different files.
   */
  test("reports exactly the paths `check` reports as ORPHAN", () => {
    // The gate is SPAWNED, not `collect()` called here: `collect` runs
    // `git ls-files` with the environment this process started with, and in a
    // pre-commit hook that environment names this repository's index — see
    // `../test-env.ts`. `check` prints `collect`'s problems verbatim.
    const gate = JSON.parse(
      run(["check", "--format", "json", "--root", ROOT]).stdout
    );
    const docsRoot = context(ROOT).config.docsRoot;
    const fromLint = new Set<string>(
      gate.data.problems
        .map((p: { message: string }) => p.message)
        .filter((m: string) => m.startsWith("ORPHAN"))
        // `ORPHAN         playbooks/x.md  (unreachable from index.md — …)`.
        // The lint's paths are DOCS-root-relative; the command speaks
        // repo-relative, so the mapping is explicit here rather than assumed.
        .map((m: string) => join(docsRoot, m.split(/\s+/)[1] as string))
    );

    const out = JSON.parse(
      run(["orphans", "--format", "json", "--root", ROOT]).stdout
    );
    const fromCommand = new Set<string>(
      out.data.orphans.map((o: { path: string }) => o.path)
    );

    // The fixture has one, so this is not vacuously true.
    expect(fromLint.size).toBe(1);
    expect([...fromCommand].sort()).toEqual([...fromLint].sort());
  });

  test("exits 0 and says which tier it searched", () => {
    const json = run(["orphans", "--format", "json", "--root", ROOT]);
    expect(json.code).toBe(ExitCode.Success);
    const out = JSON.parse(json.stdout);
    expect(out.meta.command).toBe("orphans");
    expect(out.data.tier).toBe("library");
    expect(out.data.catalog).toBe("docs/index.md");
    expect(out.data.count).toBe(1);
    expect(out.data.orphans[0].path).toBe("docs/memories/a-memory.md");

    const text = run(["orphans", "--format", "text", "--root", ROOT]);
    expect(text.code).toBe(ExitCode.Success);
    // The header has to say the workbench is out of scope: an agent reading
    // "no orphans" must not conclude the whole tree is reachable.
    expect(text.stdout).toContain("library tier only");
    expect(text.stdout).toContain("workbench");
    expect(text.stdout).toContain("docs/memories/a-memory.md");
  });

  test("no workbench document is ever reported as an orphan", () => {
    // The fixture's proposals and backlog item are linked from nothing. They
    // are not orphans, because orphan-ness is measured against a catalog and
    // the workbench has none.
    const out = JSON.parse(
      run(["orphans", "--format", "json", "--root", ROOT]).stdout
    );
    for (const o of out.data.orphans as Array<{ path: string }>)
      expect(o.path).not.toContain("/features/");
  });
});

// ---------------------------------------------------------------------------------------

describe("pdocs graph", () => {
  test("--format json is enveloped and spans both tiers", () => {
    const { code, stdout } = run(["graph", "--format", "json", "--root", ROOT]);
    expect(code).toBe(ExitCode.Success);
    const out = JSON.parse(stdout);

    expect(out.ok).toBe(true);
    expect(out.meta.command).toBe("graph");
    expect(Object.keys(out.data).sort()).toEqual([
      "byTier",
      "byType",
      "hubs",
      "nodes",
      "pages",
      "tags",
    ]);

    // The lint's own report leaked `problems`, `reachable` and `contractExempt`
    // into what was supposed to be a graph. It no longer does.
    expect(out.data.problems).toBeUndefined();

    expect(out.data.pages).toBe(Object.keys(FIXTURE).length - 1);
    expect(out.data.byTier.library).toBe(3);
    expect(out.data.byTier.workbench).toBe(4);
    expect(out.data.byType.feature).toBe(2);
    expect(out.data.tags.fixture).toEqual([
      "docs/cycles/2026-01-a-cycle.md",
      "docs/index.md",
      "docs/memories/a-memory.md",
      "docs/playbooks/a-playbook.md",
    ]);
  });

  test("linksIn is linksOut inverted", () => {
    const out = JSON.parse(
      run(["graph", "--format", "json", "--root", ROOT]).stdout
    );
    const node = (
      out.data.nodes as Array<{ path: string; linksIn: string[] }>
    ).find((n) => n.path === "docs/playbooks/a-playbook.md");
    expect(node?.linksIn).toEqual([
      "docs/features/alpha/feature.md",
      "docs/index.md",
    ]);
    expect(out.data.hubs[0].path).toBe("docs/playbooks/a-playbook.md");
    expect(out.data.hubs[0].linksIn).toBe(2);
  });

  test("the output is stable across runs", () => {
    // It is a machine surface; `readdirSync` order is not a promise anybody
    // made, and an unstable tail makes every run look like a change.
    const a = run(["graph", "--format", "json", "--root", ROOT]).stdout;
    const b = run(["graph", "--format", "json", "--root", ROOT]).stdout;
    expect(a).toBe(b);
  });

  test("text mode summarises rather than dumping", () => {
    const { code, stdout } = run(["graph", "--format", "text", "--root", ROOT]);
    expect(code).toBe(ExitCode.Success);
    expect(stdout).toContain("pages");
    expect(stdout).toContain("by type");
    expect(stdout).not.toContain('"nodes"');
  });
});

// ---------------------------------------------------------------------------------------
// Addresses on the work-taxonomy layout
// ---------------------------------------------------------------------------------------

describe("pageKeys — features and items", () => {
  const ID_FILE = "0190f4b2-7c3a-7d4e-8f00-00000000000a";
  const ID_FOLDER = "0190f4b2-7c3a-7d4e-8f00-00000000000b";
  const ID_ARCHIVED = "0190f4b2-7c3a-7d4e-8f00-00000000000c";
  const G = "{ by: read-test, at: 2026-09-22 }";
  const entity = (type: string, extra: Record<string, string> = {}) =>
    page(
      { type, title: "E", description: "An entity.", status: "draft", generated: G, ...extra },
      "# E"
    );

  const keysByPath = () => {
    const root = mkdtempSync(join(tmpdir(), "pdocs-keys-"));
    roots.push(root);
    writeFileSync(
      join(root, ".project-docs.json"),
      JSON.stringify({
        docsRoot: "docs",
        version: "1.0.0",
        lint: { workbench: ["features", "items", "cycles"], skip: [] },
      })
    );
    const files: Record<string, string> = {
      "docs/features/auth/feature.md": entity("feature", { lifecycle: "active" }),
      "docs/features/_archive/old/feature.md": entity("feature", { lifecycle: "done" }),
      "docs/items/fix-hook.md": entity("item", { id: ID_FILE, kind: "bug" }),
      "docs/items/big/item.md": entity("item", { id: ID_FOLDER, kind: "task" }),
      "docs/items/_archive/gone.md": entity("item", { id: ID_ARCHIVED, kind: "chore" }),
      // An item folder that happens to be called `items`.
      "docs/items/items/item.md": entity("item", {
        id: "0190f4b2-7c3a-7d4e-8f00-00000000000d",
        kind: "task",
      }),
    };
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    }
    return new Map(
      collectPages(context(root)).map((p) => [p.path, pageKeys(p)] as const)
    );
  };

  test("a feature answers to feature/<folder>, live or archived", () => {
    const keys = keysByPath();
    expect(keys.get("docs/features/auth/feature.md")).toContain("feature/auth");
    expect(keys.get("docs/features/_archive/old/feature.md")).toContain("feature/old");
  });

  test("an item answers to item/<slug> and item/<uuid>, as a file or a folder, live or archived", () => {
    const keys = keysByPath();
    expect(keys.get("docs/items/fix-hook.md")).toEqual(
      expect.arrayContaining(["item/fix-hook", `item/${ID_FILE}`])
    );
    expect(keys.get("docs/items/big/item.md")).toEqual(
      expect.arrayContaining(["item/big", `item/${ID_FOLDER}`])
    );
    expect(keys.get("docs/items/_archive/gone.md")).toEqual(
      expect.arrayContaining(["item/gone", `item/${ID_ARCHIVED}`])
    );
  });

  // `item/item` and `feature/feature` name every folder entity and identify
  // none — the `proposal/proposal` trap again.
  test("a folder entity does not answer to its entry file's basename (review G)", () => {
    const keys = keysByPath();
    expect(keys.get("docs/items/big/item.md")).not.toContain("item/item");
    expect(keys.get("docs/features/auth/feature.md")).not.toContain("feature/feature");
    expect(keys.get("docs/features/_archive/old/feature.md")).not.toContain("feature/feature");
  });

  test("the owner is the folder directly under the docs root (review G)", () => {
    const keys = keysByPath().get("docs/items/items/item.md");
    expect(keys).toContain("item/items");
    expect(keys).not.toContain("item/item");
  });

  test("no key is listed twice", () => {
    for (const keys of keysByPath().values())
      expect(new Set(keys).size).toBe(keys.length);
  });

  test("no page answers to the retired project/<folder> form", () => {
    for (const keys of keysByPath().values())
      expect(keys.some((k) => k.startsWith("project/"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------
// find over the work taxonomy (plan Task 2.9)
// ---------------------------------------------------------------------------------------

describe("pdocs find — work filters", () => {
  const BUG = "0190f4b2-7c3a-7d4e-8f00-00000000000a";
  const TASK = "0190f4c9-1d2e-7f00-8a00-00000000000b";
  const item = (id: string, extra: Record<string, string>) =>
    page({
      type: "item",
      title: "An item",
      description: "Something to do.",
      status: "draft",
      lifecycle: "backlog",
      id,
      generated: "{ by: read-test, at: 2026-09-01 }",
      ...extra,
    });
  const WORK = tree({
    "docs/SCHEMA.md": SCHEMA,
    "docs/features/a/feature.md": page({
      type: "feature",
      title: "A",
      description: "A feature.",
      status: "draft",
      lifecycle: "active",
      scope: "cli",
      generated: "{ by: read-test, at: 2026-09-01 }",
    }),
    "docs/cycles/2026-09-x.md": page({
      type: "cycle",
      title: "X",
      description: "A cycle.",
      status: "draft",
      lifecycle: "active",
      generated: "{ by: read-test, at: 2026-09-01 }",
    }),
    "docs/items/the-bug.md": item(BUG, {
      kind: "bug",
      cycle: "2026-09-x",
      parent: "feature/a",
      scope: "cli",
    }),
    "docs/items/the-task/item.md": item(TASK, { kind: "task", cycle: "2026-09-x" }),
  });
  // The tree above uses the legacy config; add the new owners to it.
  const cfgPath = join(WORK, ".project-docs.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  cfg.lint.workbench.push("features", "items");
  cfg.lint.scopes = ["cli"];
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

  const find = (...args: string[]) => {
    const r = run(["find", ...args, "--format", "json", "--root", WORK]);
    return { ...r, out: r.code === 0 ? JSON.parse(r.stdout).data : null };
  };
  const paths = (...args: string[]) =>
    find(...args).out.matches.map((m: { path: string }) => m.path);

  test("--kind and --cycle, ANDed", () => {
    expect(paths("--kind", "bug", "--cycle", "2026-09-x")).toEqual(["docs/items/the-bug.md"]);
    expect(paths("--cycle", "2026-09-x")).toEqual([
      "docs/items/the-bug.md",
      "docs/items/the-task/item.md",
    ]);
  });

  test("--parent, --scope", () => {
    expect(paths("--parent", "feature/a")).toEqual(["docs/items/the-bug.md"]);
    expect(paths("--scope", "cli")).toEqual([
      "docs/features/a/feature.md",
      "docs/items/the-bug.md",
    ]);
  });

  test("--id takes a prefix, in any case", () => {
    expect(paths("--id", "0190f4c9")).toEqual(["docs/items/the-task/item.md"]);
    expect(paths("--id", TASK.toUpperCase())).toEqual(["docs/items/the-task/item.md"]);
    expect(paths("--id", "0190f4")).toHaveLength(2);
  });

  test("a match carries id, kind, parent, cycle and scope", () => {
    const [m] = find("--kind", "bug").out.matches;
    expect(m).toMatchObject({
      id: BUG,
      kind: "bug",
      parent: "feature/a",
      cycle: "2026-09-x",
      scope: "cli",
    });
    const [f] = find("--type", "feature").out.matches;
    expect(f).toMatchObject({ id: null, kind: null, parent: null, cycle: null, scope: "cli" });
  });

  test("a filter that cannot be applied is refused, not answered with nothing", () => {
    expect(find("--kind", "story").code).toBe(ExitCode.Usage);
    expect(find("--parent", "a").code).toBe(ExitCode.Usage);
    expect(find("--id", "not-hex!").code).toBe(ExitCode.Usage);
  });
});
