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
import { collect } from "../lint/collect.ts";
import { context } from "../lint/rules.ts";

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
          workbench: [
            "backlog",
            "briefs",
            "investigations",
            "projects",
            "reports",
            "fragments",
            "cycles",
          ],
          skip: ["_archive", "superpowers"],
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
  Bun.spawnSync(["git", "init", "-q"], { cwd: root });
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

  "docs/projects/alpha/proposal.md": page(
    {
      type: "proposal",
      title: "Alpha",
      description: "A proposal that shipped.",
      status: "stable",
      lifecycle: "implemented",
      tags: "[alpha]",
      related: "[playbook/a-playbook]",
      generated: "{ by: read-test, at: 2026-04-01 }",
    },
    `# Alpha

Built on [the playbook](../../playbooks/a-playbook.md).
`
  ),

  "docs/projects/beta/proposal.md": page({
    type: "proposal",
    title: "Beta",
    description: "A proposal still being written.",
    status: "draft",
    lifecycle: "draft",
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
  "docs/backlog/undated.md": page({
    type: "backlog",
    title: "Undated",
    description: "A backlog item with no generated block.",
    status: "draft",
    lifecycle: "open",
  }),
};

const ROOT = tree(FIXTURE);

// ---------------------------------------------------------------------------------------

describe("pdocs find", () => {
  test("a filter that matches, in both formats", () => {
    const json = run([
      "find",
      "--type",
      "proposal",
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
      "docs/projects/alpha/proposal.md",
      "docs/projects/beta/proposal.md",
    ]);

    const text = run([
      "find",
      "--type",
      "proposal",
      "--format",
      "text",
      "--root",
      ROOT,
    ]);
    expect(text.code).toBe(ExitCode.Success);
    expect(text.stdout).toContain("docs/projects/alpha/proposal.md");
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
        "proposal",
        "--lifecycle",
        "implemented",
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
    expect(paths).toContain("docs/projects/alpha/proposal.md");
    expect(paths).toContain("docs/cycles/2026-01-a-cycle.md");
    expect(paths).not.toContain("docs/playbooks/a-playbook.md");
    // No `generated` block at all: absence of a date is not evidence of
    // recency, so it is excluded rather than passed through.
    expect(paths).not.toContain("docs/backlog/undated.md");
  });

  test("a filter that matches nothing exits 0 — no matches is an answer", () => {
    const json = run([
      "find",
      "--type",
      "nosuchtype",
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
      "nosuchtype",
      "--format",
      "text",
      "--root",
      ROOT,
    ]);
    expect(text.code).toBe(ExitCode.Success);
    expect(text.stdout.trim()).toBe("no matches");
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
      "docs/projects/alpha/proposal.md",
    ]);
    // Body links — addressed by path, and the catalog is one of them.
    expect(out.data.links.map((r: { path: string }) => r.path)).toEqual([
      "docs/index.md",
      "docs/projects/alpha/proposal.md",
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
    // `proposal/proposal` is every project's proposal. Answerable — the caller
    // just has to say which — so it is 2, not 5.
    const { code, stderr } = run([
      "backlinks",
      "proposal/proposal",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(code).toBe(ExitCode.Usage);
    expect(JSON.parse(stderr).error.message).toContain(
      "docs/projects/alpha/proposal.md"
    );
  });

  test("`project/<name>` resolves where `proposal/<name>` cannot", () => {
    // The form a caller reaches for when `proposal/proposal` turns out to name
    // every project in the tree. Same document, same answer as by path — and
    // the same grammar `pdocs new cycle --scope` takes, so an agent never has
    // to convert between two spellings this CLI already understands.
    const byAlias = JSON.parse(
      run(["backlinks", "project/alpha", "--format", "json", "--root", ROOT])
        .stdout
    );
    const byPath = JSON.parse(
      run([
        "backlinks",
        "docs/projects/alpha/proposal.md",
        "--format",
        "json",
        "--root",
        ROOT,
      ]).stdout
    );
    expect(byAlias).toEqual(byPath);
    expect(byAlias.data.target.path).toBe("docs/projects/alpha/proposal.md");
  });

  test("`proposal/<name>` is not invented as a second spelling", () => {
    // `project/<name>` is the ONE addition. `proposal/alpha` is a key nothing
    // emits and nothing writes; accepting it would mean two ways to say the
    // same thing and a `pageKey` that answers with neither.
    const { code, stderr } = run([
      "backlinks",
      "proposal/alpha",
      "--format",
      "json",
      "--root",
      ROOT,
    ]);
    expect(code).toBe(ExitCode.NotFound);
    expect(JSON.parse(stderr).error.message).toContain("project/<name>");
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
   * paths the command reports is exactly the set the lint's `ORPHAN` lines name.
   *
   * If they ever disagree, the tool telling you what to fix and the gate
   * refusing to let you land are naming different files.
   */
  test("reports exactly the paths `collect` reports as ORPHAN", () => {
    const ctx = context(ROOT);
    const fromLint = new Set(
      collect(ctx)
        .library.graph.problems.filter((p) => p.startsWith("ORPHAN"))
        // `ORPHAN         playbooks/x.md  (unreachable from index.md — …)`.
        // The lint's paths are DOCS-root-relative; the command speaks
        // repo-relative, so the mapping is explicit here rather than assumed.
        .map((p) => join(ctx.config.docsRoot, p.split(/\s+/)[1] as string))
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
      expect(o.path).not.toContain("/projects/");
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
    expect(out.data.byType.proposal).toBe(2);
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
      "docs/index.md",
      "docs/projects/alpha/proposal.md",
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
