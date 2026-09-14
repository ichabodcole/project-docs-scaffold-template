// The migration script carries its own copy of the folder → type table, because
// it runs inside a repository that has not adopted the layer yet and can import
// nothing from it. A copy that nobody compares is a copy that drifts, and the
// half that drifts is always the one further from the tests — so this compares
// them, and derives the rest of its cases from the same tables.
//
// It lives beside the codemod rather than in the portable core, where it
// started, because comparing the copies means importing the CLI's own tables —
// and `scripts/pdocs/docs-lint/` is a core copied verbatim into other
// repositories. A file in there that imports this repository's CLI is a file
// those repositories cannot take.

import { afterAll, describe, expect, test } from "bun:test";
import {
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
import { DEFAULT_CONFIG } from "../../../../../../scripts/pdocs/docs-lint/config.ts";
import {
  DURABLE_TYPE as LINT_DURABLE,
  PROJECT_FILE_TYPE as LINT_PROJECT_FILE,
  PROJECT_SPEC,
  ROOT_PAGE_TYPE as LINT_ROOT_PAGE,
  SPEC,
} from "../../../../../../scripts/pdocs/lint/rules.ts";
import {
  DURABLE_TYPE,
  LIFECYCLE,
  NO_LIFECYCLE,
  PROJECT_FILE_TYPE,
  ROOT_PAGE_TYPE,
  STATUS_MAP,
  WORKBENCH_TYPE,
  derive,
  frontmatterFor,
  lifecycleOf,
  UNKNOWN_VERSION,
  docsVersionOf,
  main,
  stripConsumedMetadata,
  titleOf,
  typeOf,
} from "./migrate-v2.6-to-v2.7.ts";

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "migrate-v27-"));
  roots.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
}

/** Run it quietly; the script writes a progress report nobody needs in a test log. */
function run(root: string, args: string[] = []): number {
  const real = console.log;
  console.log = () => {};
  try {
    return main(args, root);
  } finally {
    console.log = real;
  }
}

// ─── Generated fixtures: real trees, not hand-built ones ─────────────────────
//
// `fixture()` above builds the handful of files one unit test needs. The
// migration's population is every consuming project, and those are generated
// trees — so the whole-script tests also get real ones, produced by
// cookiecutter from this repository's own history rather than checked in as
// snapshots that rot silently.
//
// Everything here is OFFLINE. The v2.6 template is `git archive`d out of this
// repository's object store at the release tag, the current template is the
// working tree, and cookiecutter is pointed at a local directory both times, so
// nothing is cloned or fetched. Generation runs once per test process and each
// fixture is a fresh copy of it, because the tests that consume a tree write
// to it. Measured on a laptop: ~0.15s for the archive and ~0.25s per
// cookiecutter run, so the whole cache costs well under a second.

const REPO_ROOT = resolve(import.meta.dir, "../../../../../..");

/** The last release before the frontmatter layer. Fixture A is what it generated. */
const V26_TAG = "project-docs-scaffold-template-v6.3.0";

/**
 * A0's extra docs-root folder: in neither tier and not in `lint.skip`, so an
 * unlisted folder that would silently get the strictest tier — the case the
 * preflight has to name and stop on. `describe("fixtures")` checks the claim
 * against the lint's own config rather than trusting this comment.
 */
const UNDECLARED_FOLDER = "runbooks";
const UNDECLARED_FILE = `docs/${UNDECLARED_FOLDER}/deploy.md`;

interface Scaffolds {
  /** A generated v2.6 project: `docs/` only, no layer. */
  v26: string;
  /** A generated project from the working tree: `docs/`, `scripts/pdocs/`, config. */
  current: string;
  generationMs: number;
}

let scaffolds: Scaffolds | null = null;

function sh(cmd: string[], cwd?: string): string {
  const r = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0)
    throw new Error(
      `${cmd.join(" ")} exited ${r.exitCode}\n${r.stderr.toString()}${r.stdout.toString()}`
    );
  return r.stdout.toString();
}

/**
 * Generate both templates once. Throws, rather than skipping, when cookiecutter
 * is missing: a fixture that quietly vanishes is a suite that quietly stops
 * testing the migration, and the plan's validation items depend on this one.
 */
function generatedScaffolds(): Scaffolds {
  if (scaffolds) return scaffolds;
  if (!Bun.which("cookiecutter"))
    throw new Error(
      "cookiecutter is not on PATH, so the generated fixtures cannot be built. " +
        "Install it (`uv tool install cookiecutter` or `pipx install cookiecutter`) — " +
        "these tests do not skip without it."
    );
  const started = performance.now();
  const base = mkdtempSync(join(tmpdir(), "migrate-v27-scaffolds-"));
  roots.push(base);

  // cookiecutter records a replay file per template under ~/.cookiecutter_replay
  // and would clone into ~/.cookiecutters; point both at the temp dir so a test
  // run leaves nothing in the home directory.
  const config = join(base, "cookiecutter.yaml");
  writeFileSync(
    config,
    `replay_dir: "${join(base, "replay")}"\ncookiecutters_dir: "${join(base, "cookiecutters")}"\n`
  );

  // A shallow or `--no-tags` clone has no such object, and `git archive` then
  // fails with only `fatal: not a valid object name` — which names the symptom,
  // not the fix.
  const tagPresent =
    Bun.spawnSync(
      [
        "git",
        "-C",
        REPO_ROOT,
        "rev-parse",
        "--verify",
        "--quiet",
        `${V26_TAG}^{commit}`,
      ],
      { stdout: "pipe", stderr: "pipe" }
    ).exitCode === 0;
  if (!tagPresent)
    throw new Error(
      `tag ${V26_TAG} is not in this clone, so fixture A cannot be generated. ` +
        "Run `git fetch --tags` (a shallow or --no-tags clone drops it) and re-run."
    );

  const template26 = join(base, "template-v2.6");
  mkdirSync(template26);
  const tar = join(base, "template-v2.6.tar");
  sh(["git", "-C", REPO_ROOT, "archive", "--format=tar", "-o", tar, V26_TAG]);
  sh(["tar", "-xf", tar, "-C", template26]);

  const generate = (template: string, into: string): string => {
    mkdirSync(into);
    sh([
      "cookiecutter",
      "--config-file",
      config,
      "--no-input",
      "-o",
      into,
      template,
      "install_target=New project folder",
    ]);
    return join(into, "my-project"); // cookiecutter.json's default slug
  };

  scaffolds = {
    v26: generate(template26, join(base, "v2.6")),
    current: generate(REPO_ROOT, join(base, "current")),
    generationMs: performance.now() - started,
  };
  return scaffolds;
}

/** `git`, borrowing no identity, signing or default branch from the machine. */
function git(root: string, ...args: string[]): string {
  return sh(
    [
      "git",
      "-c",
      "user.name=fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "init.defaultBranch=main",
      ...args,
    ],
    root
  );
}

function commitAll(root: string, message: string): void {
  if (!existsSync(join(root, ".git"))) git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", message);
}

/** Every committed path, sorted — what `git status` will judge the tree against. */
function tracked(root: string): string[] {
  return git(root, "ls-files").split("\n").filter(Boolean).sort();
}

/**
 * Fixture A: a real v2.6 tree, generated from the tag and committed, because
 * the migration reports a dirty tree rather than proceeding past one.
 *
 * `undeclaredFolder` is the A0/A1 switch. A0 (`true`) carries a docs-root
 * folder that is in no tier and not skipped, which the preflight must name and
 * stop on — so A0 can never complete a run and is for the preflight test only.
 * A1 (`false`) is the same tree without it, for the full run. One generator,
 * one flag, so the two cannot drift. Removal rather than declaration, because a
 * v2.6 tree has no `.project-docs.json` to declare the folder in — the
 * migration is what writes that file — and pre-declaring would mean hand-
 * building the config the run is supposed to produce.
 */
function fixtureA({ undeclaredFolder }: { undeclaredFolder: boolean }): string {
  const root = mkdtempSync(
    join(tmpdir(), undeclaredFolder ? "migrate-v27-A0-" : "migrate-v27-A1-")
  );
  roots.push(root);
  cpSync(generatedScaffolds().v26, root, { recursive: true });
  if (undeclaredFolder) {
    mkdirSync(join(root, "docs", UNDECLARED_FOLDER));
    writeFileSync(join(root, UNDECLARED_FILE), "# Deploy\n\nHow to deploy.\n");
  }
  commitAll(root, "the v2.6 tree, as generated");
  return root;
}

/** The v2.9 migration's presence check, as `update-project-docs/SKILL.md` lists it. */
const v29Precondition = (root: string): boolean =>
  !existsSync(join(root, "docs", ".pdocs-seed.json"));

/**
 * Fixture B: the orphaned tree. A1 with `docs/` from the current scaffold
 * copied over it and `scripts/` deliberately left out — the layer's contract
 * installed with nothing that checks it. Both presence checks are false on it:
 * `docs/SCHEMA.md` says the layer is in, `scripts/pdocs/cli.ts` says it is not.
 * Committed, like A, so the dirty-tree guard is not what stops a run on it.
 *
 * `update-project-docs/SKILL.md` § Step 7 names three ways a tree gets here:
 * (a) `docs/` copied from a generated project without `scripts/`, (b) a
 * current-directory install interrupted before `scripts/` moved up, and (c)
 * `docs/lint.ts` deleted in a cleanup with nothing put in its place. The
 * generation hook writes `docs/.pdocs-seed.json`, so the default, `seeded`,
 * reproduces (a) and (b). Origin (c) is a v2.7-era layer, and `seeded: false`
 * reproduces it by stripping what such a `docs/` never carried — which is
 * exactly the manifest, per the v2.7 payload at `1dde782^`
 * (`{{cookiecutter.project_slug}}/docs/`): it shipped `SCHEMA.md` and
 * `index.md`, and the hook only began writing the manifest at v2.9. `lint.ts`
 * is not restored, because (c) is the origin where it was deleted. The v2.9
 * precondition `[ ! -f docs/.pdocs-seed.json ]` is false on the seeded variant
 * and true on the unseeded one — a different tree, and phase 3 runs against
 * both.
 *
 * NOTE FOR PHASE 3: on the seeded variant the v2.9 script's adopt phase takes
 * its "manifest already exists, every hash matches" early return
 * (`migrate-v2.8-to-v2.9.ts`, `adopt()`), so a run there can report success
 * from that phase without having installed anything. Confirm the CLI-install
 * phase still fires independently on that tree rather than assuming it.
 */
function fixtureB({ seeded = true }: { seeded?: boolean } = {}): string {
  const root = fixtureA({ undeclaredFolder: false });
  cpSync(join(generatedScaffolds().current, "docs"), join(root, "docs"), {
    recursive: true,
    force: true,
  });
  if (!seeded) rmSync(join(root, "docs", ".pdocs-seed.json"));
  commitAll(
    root,
    seeded
      ? "docs/ from the current scaffold, without scripts/"
      : "docs/ from a v2.7-era scaffold, without scripts/"
  );
  return root;
}

describe("the copied tables equal the ones the lint enforces", () => {
  test("folder → type, for the library", () => {
    expect(DURABLE_TYPE).toEqual(LINT_DURABLE);
  });

  test("filename → type, at the docs root and inside a project", () => {
    expect(ROOT_PAGE_TYPE).toEqual(LINT_ROOT_PAGE);
    expect(PROJECT_FILE_TYPE).toEqual(LINT_PROJECT_FILE);
  });

  test("folder → type, for the workbench", () => {
    const fromLint = Object.fromEntries(
      Object.entries(SPEC).map(([folder, spec]) => [folder, spec.type])
    );
    expect(WORKBENCH_TYPE).toEqual(fromLint);
  });

  test("every lifecycle vocabulary", () => {
    const fromLint: Record<string, string[]> = {};
    for (const spec of Object.values(SPEC))
      if (spec.lifecycle) fromLint[spec.type] = spec.lifecycle;
    for (const [type, spec] of Object.entries(PROJECT_SPEC))
      if (spec.lifecycle) fromLint[type] = spec.lifecycle;
    expect(LIFECYCLE).toEqual(fromLint);
  });

  test("the types that carry none", () => {
    const fromLint = new Set<string>([
      ...Object.values(LINT_DURABLE),
      ...Object.values(LINT_ROOT_PAGE),
    ]);
    for (const spec of Object.values(SPEC))
      if (spec.lifecycle === null) fromLint.add(spec.type);
    for (const [type, spec] of Object.entries(PROJECT_SPEC))
      if (spec.lifecycle === null) fromLint.add(type);
    expect([...NO_LIFECYCLE].sort()).toEqual([...fromLint].sort());
  });

  // A status that maps to a value the vocabulary does not contain would write a
  // document the lint then rejects — the migration's own output failing its own
  // gate, which is the worst possible first impression.
  test("every mapped status lands inside its type's vocabulary", () => {
    for (const [type, map] of Object.entries(STATUS_MAP))
      for (const [raw, mapped] of Object.entries(map))
        expect({
          type,
          raw,
          mapped,
          ok: LIFECYCLE[type]?.includes(mapped),
        }).toEqual({
          type,
          raw,
          mapped,
          ok: true,
        });
  });
});

describe("typeOf — position declares the type", () => {
  test.each([
    ["memories/2026-01-01-a.md", "memory"],
    ["lessons-learned/a-lesson.md", "lesson"],
    ["specifications/domain.md", "specification"],
    ["backlog/2026-01-01-a.md", "backlog"],
    ["reports/2026-01-01-a.md", "report"],
    ["projects/x/proposal.md", "proposal"],
    ["projects/x/plan.md", "plan"],
    ["projects/x/sessions/2026-01-01-a.md", "session"],
    ["projects/x/reviews/code-quality.md", "artifact"],
    ["PROJECT_MANIFESTO.md", "manifesto"],
  ])("%s → %s", (rel, expected) => {
    expect(typeOf(rel)).toBe(expected);
  });

  test.each([
    ["README.md"],
    ["memories/README.md"],
    ["memories/TEMPLATE.md"],
    ["projects/TEMPLATES/PROPOSAL.template.md"],
    ["SCHEMA.md"],
    ["superpowers/plans/a.md"],
    ["AGENTS.md"],
  ])("%s is not ours to touch", (rel) => {
    expect(typeOf(rel)).toBeNull();
  });
});

describe("titleOf — the H1, minus a label the type already carries", () => {
  test("strips a leading label that repeats the type", () => {
    expect(
      titleOf("# Investigation: Wiki tooling boundary\n", "investigation")
    ).toBe("Wiki tooling boundary");
  });

  test("keeps a subject that merely looks like a label", () => {
    expect(titleOf("# Investigation tooling boundary\n", "proposal")).toBe(
      "Investigation tooling boundary"
    );
  });

  test("handles the hyphenated types", () => {
    expect(
      titleOf("# Design Resolution: Sync model\n", "design-resolution")
    ).toBe("Sync model");
  });

  test("no H1, no title", () => {
    expect(titleOf("Just prose.\n", "memory")).toBeNull();
  });
});

describe("lifecycleOf — the bold status line it is about to remove", () => {
  test("the same word means different things in different folders", () => {
    expect(lifecycleOf("**Status:** Completed\n", "proposal").value).toBe(
      "implemented"
    );
    expect(lifecycleOf("**Status:** Completed\n", "plan").value).toBe(
      "completed"
    );
    expect(lifecycleOf("**Status:** Completed\n", "investigation").value).toBe(
      "concluded"
    );
  });

  // Invented by hand in three proposals because the vocabulary had no word.
  test("the hand-invented values the tree actually contains", () => {
    expect(
      lifecycleOf("**Status:** Approved (in flight)\n", "proposal").value
    ).toBe("approved");
    expect(
      lifecycleOf("**Status:** Approved (shipped)\n", "proposal").value
    ).toBe("implemented");
  });

  // A wrong lifecycle is worse than a missing one: the missing one shows up in
  // --report, and the wrong one looks like an answer.
  test("an unmapped status is reported, never guessed", () => {
    const { value, raw } = lifecycleOf("**Status:** Percolating\n", "proposal");
    expect(value).toBeNull();
    expect(raw).toBe("Percolating");
  });

  test("an unfilled template pick-list is not a status", () => {
    expect(
      lifecycleOf("**Status:** Draft | Active | Completed\n", "plan").value
    ).toBe("draft");
  });

  test("no status line at all opens at the type's first value", () => {
    expect(lifecycleOf("# A\n", "investigation").value).toBe("active");
  });

  test("a frozen type never gets one", () => {
    expect(lifecycleOf("**Status:** Completed\n", "session").value).toBeNull();
    expect(lifecycleOf("**Status:** Completed\n", "memory").value).toBeNull();
  });
});

describe("stripConsumedMetadata — say it once", () => {
  test("removes a Prettier-wrapped bold paragraph and its trailing rule", () => {
    const body =
      "# A Proposal\n\n**Status:** Approved **Created:**\n2026-01-01 **Author:** Someone\n\n---\n\n## Overview\n\nText.\n";
    expect(stripConsumedMetadata(body)).toBe(
      "# A Proposal\n\n## Overview\n\nText.\n"
    );
  });

  test("leaves bold prose that is not metadata alone", () => {
    const body = "# A\n\n**Key files:** `src/a.ts`\n\n## B\n";
    expect(stripConsumedMetadata(body)).toBe(body);
  });
});

describe("the whole script, on a fixture repository", () => {
  const proposal =
    "# Proposal: Sync engine\n\n**Status:** Approved (in flight) **Created:** 2026-03-01\n**Author:** Someone\n\n---\n\n## Overview\n\nText.\n";

  test("--dry-run changes nothing", () => {
    const root = fixture({ "docs/projects/x/proposal.md": proposal });
    expect(run(root, ["--dry-run"])).toBe(0);
    expect(
      readFileSync(join(root, "docs/projects/x/proposal.md"), "utf8")
    ).toBe(proposal);
  });

  test("without it, the derived block is written and the old line removed", () => {
    const root = fixture({ "docs/projects/x/proposal.md": proposal });
    expect(run(root)).toBe(0);
    const out = readFileSync(join(root, "docs/projects/x/proposal.md"), "utf8");
    expect(out).toContain("type: proposal");
    expect(out).toContain("title: Sync engine");
    expect(out).toContain("lifecycle: approved");
    expect(out).toContain("status: stable");
    expect(out).toContain("generated: { by: unknown, at: 2026-03-01 }");
    expect(out).not.toContain("**Status:**");
    expect(out).not.toContain("**Author:**");
  });

  // One sentence a person has to mean. A generated paraphrase would be worse
  // than the blank, because nobody could tell which had been thought about.
  test("`description` is never written", () => {
    const root = fixture({ "docs/projects/x/proposal.md": proposal });
    run(root);
    expect(
      readFileSync(join(root, "docs/projects/x/proposal.md"), "utf8")
    ).not.toContain("description:");
  });

  test("running it twice changes nothing the second time", () => {
    const root = fixture({ "docs/projects/x/proposal.md": proposal });
    run(root);
    const once = readFileSync(
      join(root, "docs/projects/x/proposal.md"),
      "utf8"
    );
    run(root);
    expect(
      readFileSync(join(root, "docs/projects/x/proposal.md"), "utf8")
    ).toBe(once);
  });

  test("READMEs, templates and contract pages are left alone", () => {
    const readme = "# Memories\n\nWhat goes here.\n";
    const root = fixture({
      "docs/memories/README.md": readme,
      "docs/memories/TEMPLATE.md": "# [Title]\n",
      "docs/README.md": readme,
    });
    run(root);
    expect(readFileSync(join(root, "docs/memories/README.md"), "utf8")).toBe(
      readme
    );
    expect(readFileSync(join(root, "docs/README.md"), "utf8")).toBe(readme);
  });

  test("_archive is not touched", () => {
    const old = "# Old thing\n\n**Status:** Completed\n";
    const root = fixture({ "docs/projects/_archive/y/proposal.md": old });
    run(root);
    expect(
      readFileSync(join(root, "docs/projects/_archive/y/proposal.md"), "utf8")
    ).toBe(old);
  });

  test("a file that already has frontmatter is skipped, not rewritten", () => {
    const marked = "---\ntype: proposal\ntitle: Already\n---\n\n# Already\n";
    const root = fixture({ "docs/projects/x/proposal.md": marked });
    run(root);
    expect(
      readFileSync(join(root, "docs/projects/x/proposal.md"), "utf8")
    ).toBe(marked);
  });

  // The config's own backfill: a project that has never seen the file gets one,
  // set to `adopting` so its first lint reports rather than blocks.
  test("it creates .project-docs.json when there is none", () => {
    const root = fixture({ "docs/memories/a.md": "# A\n" });
    run(root);
    const cfg = JSON.parse(
      readFileSync(join(root, ".project-docs.json"), "utf8")
    );
    expect(cfg.docsRoot).toBe("docs");
    expect(cfg.lint.adopting).toBe(true);
    expect(cfg.lint.durable).toEqual(Object.keys(DURABLE_TYPE));
  });

  test("and honours a docsRoot that is not `docs`", () => {
    const root = fixture({
      ".project-docs.json": JSON.stringify({ docsRoot: "documentation" }),
      "documentation/memories/a.md": "# A\n",
    });
    expect(run(root)).toBe(0);
    expect(
      readFileSync(join(root, "documentation/memories/a.md"), "utf8")
    ).toContain("type: memory");
  });

  test("and lint.exclude, so one list governs both tools", () => {
    const root = fixture({
      ".project-docs.json": JSON.stringify({
        docsRoot: "docs",
        lint: { exclude: ["docs/**/*-prototype.md"] },
      }),
      "docs/projects/x/artifacts/marp-prototype.md":
        "---\nmarp: true\n---\n\n# Deck\n",
      "docs/memories/a.md": "# A\n",
    });
    run(root);
    expect(
      readFileSync(
        join(root, "docs/projects/x/artifacts/marp-prototype.md"),
        "utf8"
      )
    ).toBe("---\nmarp: true\n---\n\n# Deck\n");
  });

  test("no docs root is an error, not a silent success", () => {
    expect(run(fixture({ "README.md": "# x\n" }))).toBe(1);
  });
});

describe("frontmatterFor", () => {
  test("omits what it does not know rather than inventing it", () => {
    const block = frontmatterFor({
      type: "memory",
      title: null,
      lifecycle: null,
      unmappedStatus: null,
      date: "2026-01-01",
      tags: [],
    });
    expect(block).toBe(
      "---\ntype: memory\nstatus: stable\ngenerated: { by: unknown, at: 2026-01-01 }\n---\n\n"
    );
  });

  test("quotes a title that would not survive as a bare scalar", () => {
    const block = frontmatterFor({
      type: "memory",
      title: "Sync: the hard parts",
      lifecycle: null,
      unmappedStatus: null,
      date: "2026-01-01",
      tags: [],
    });
    expect(block).toContain('title: "Sync: the hard parts"');
  });

  test("carries tags across when the document already had them", () => {
    const root = fixture({
      "docs/lessons-learned/a.md":
        "# A Lesson\n\n**Date:** 2026-02-15 **Tags:** `#migrations` `#agent-execution`\n\n## The Lesson\n",
    });
    run(root);
    const out = readFileSync(join(root, "docs/lessons-learned/a.md"), "utf8");
    expect(out).toContain("tags: [migrations, agent-execution]");
    expect(out).toContain("at: 2026-02-15");
  });
});

describe("the version marker is carried forward, never invented", () => {
  test("reads `docs_version` out of the docs README", () => {
    const root = fixture({
      "docs/README.md":
        '---\ndocs_version: "6.3.0" # x-release-please-version\n---\n\n# Documentation\n',
    });
    expect(docsVersionOf(root, "docs")).toBe("6.3.0");
  });

  test("an unmarked project gets a placeholder, not this migration's own name", () => {
    const root = fixture({ "docs/README.md": "# Documentation\n" });
    expect(docsVersionOf(root, "docs")).toBe(UNKNOWN_VERSION);
    expect(UNKNOWN_VERSION).not.toBe("2.7.0");
  });

  // Two version numbers in one project is the failure this prevents: the config
  // saying 2.7.0 while `docs/README.md` says 6.3.0, with nothing to say which is
  // the project's actual version.
  test("the config it writes agrees with the README it read", () => {
    const root = fixture({
      "docs/README.md": '---\ndocs_version: "6.3.0"\n---\n\n# Documentation\n',
      "docs/memories/a.md": "# A memory\n\nBody.\n",
    });
    run(root);
    const config = JSON.parse(
      readFileSync(join(root, ".project-docs.json"), "utf8")
    );
    expect(config.version).toBe("6.3.0");
    expect(config.lint.adopting).toBe(true);
  });
});

describe("fixtures — the generated trees the whole-script tests run against", () => {
  test("both templates generate offline: the tag from the object store, the current one from the working tree", () => {
    const { v26, current, generationMs } = generatedScaffolds();
    expect(existsSync(join(v26, "docs/README.md"))).toBe(true);
    expect(existsSync(join(current, "docs/README.md"))).toBe(true);
    // Measured at ~0.6s for both. The bound is a sanity check, not proof of
    // hermeticity — a clone of this repository finishes well inside it. The
    // proof is that this file passes with every route to the network dead:
    //   HTTPS_PROXY=http://127.0.0.1:9 HTTP_PROXY=http://127.0.0.1:9 bun test <this file>
    // Re-prove it that way after touching the construction above.
    expect(generationMs).toBeLessThan(30_000);
  });

  test("fixture A is a v2.6 tree: no part of the layer is present", () => {
    const root = fixtureA({ undeclaredFolder: false });
    for (const rel of [
      "docs/SCHEMA.md",
      "scripts/pdocs",
      "docs/.pdocs-seed.json",
      ".project-docs.json",
    ])
      expect({ rel, present: existsSync(join(root, rel)) }).toEqual({
        rel,
        present: false,
      });
    expect(
      existsSync(join(root, "docs/projects/TEMPLATES/PROPOSAL.template.md"))
    ).toBe(true);
  });

  // The plan's stated assumption: if the tag is wrong, fixture A is wrong and
  // every result against it is suspect. The README's marker is the check.
  test("and it is the release the plan assumes — the docs README says 6.3.0", () => {
    expect(docsVersionOf(fixtureA({ undeclaredFolder: false }), "docs")).toBe(
      "6.3.0"
    );
  });

  test("fixture A is committed and clean, so a dirty-tree guard has something to pass", () => {
    const root = fixtureA({ undeclaredFolder: false });
    expect(git(root, "status", "--porcelain")).toBe("");
    expect(tracked(root)).toContain("docs/README.md");
  });

  test("A0's folder is in no tier and not skipped — the lint's own config says so", () => {
    const { durable, workbench, skip } = DEFAULT_CONFIG.lint;
    expect([...durable, ...workbench, ...skip]).not.toContain(
      UNDECLARED_FOLDER
    );
    expect(UNDECLARED_FOLDER in DURABLE_TYPE).toBe(false);
    expect(UNDECLARED_FOLDER in WORKBENCH_TYPE).toBe(false);
  });

  test("A0 carries it, with a document inside; A1 does not", () => {
    expect(
      existsSync(join(fixtureA({ undeclaredFolder: true }), UNDECLARED_FILE))
    ).toBe(true);
    expect(
      existsSync(
        join(fixtureA({ undeclaredFolder: false }), "docs", UNDECLARED_FOLDER)
      )
    ).toBe(false);
  });

  test("A0 and A1 differ by that folder and by nothing else", () => {
    const a0 = tracked(fixtureA({ undeclaredFolder: true }));
    const a1 = tracked(fixtureA({ undeclaredFolder: false }));
    expect(a0.length).toBe(a1.length + 1);
    expect(
      a0.filter((f) => !f.startsWith(`docs/${UNDECLARED_FOLDER}/`))
    ).toEqual(a1);
  });

  test("fixture B has docs/SCHEMA.md and no scripts/pdocs/cli.ts — the pair that makes both presence checks false", () => {
    const root = fixtureB();
    expect(existsSync(join(root, "docs/SCHEMA.md"))).toBe(true);
    expect(existsSync(join(root, "scripts/pdocs/cli.ts"))).toBe(false);
    expect(existsSync(join(root, "scripts"))).toBe(false);
    expect(existsSync(join(root, ".project-docs.json"))).toBe(false);
  });

  test("fixture B is A1 underneath, with the current docs/ on top, and is clean", () => {
    const root = fixtureB();
    const inB = new Set(tracked(root));
    for (const f of tracked(fixtureA({ undeclaredFolder: false })))
      expect({ f, inB: inB.has(f) }).toEqual({ f, inB: true });
    expect(existsSync(join(root, "docs/index.md"))).toBe(true);
    expect(existsSync(join(root, "docs/.pdocs-seed.json"))).toBe(true);
    expect(git(root, "status", "--porcelain")).toBe("");
  });

  test("seeded B carries the manifest, so the v2.9 precondition is false on it", () => {
    const root = fixtureB();
    expect(existsSync(join(root, "docs/.pdocs-seed.json"))).toBe(true);
    expect(v29Precondition(root)).toBe(false);
  });

  test("unseeded B is a v2.7-era layer: no manifest, precondition true, index.md still there", () => {
    const root = fixtureB({ seeded: false });
    expect(existsSync(join(root, "docs/.pdocs-seed.json"))).toBe(false);
    expect(v29Precondition(root)).toBe(true);
    expect(existsSync(join(root, "docs/SCHEMA.md"))).toBe(true);
    expect(existsSync(join(root, "docs/index.md"))).toBe(true);
    expect(existsSync(join(root, "docs/lint.ts"))).toBe(false);
    expect(git(root, "status", "--porcelain")).toBe("");
  });

  test("the two B variants differ by exactly the manifest", () => {
    const seeded = tracked(fixtureB());
    const unseeded = tracked(fixtureB({ seeded: false }));
    expect(seeded.length).toBe(unseeded.length + 1);
    expect(seeded.filter((f) => f !== "docs/.pdocs-seed.json")).toEqual(
      unseeded
    );
  });

  // The codemod is what phase 3 wraps; if it cannot consume the generated tree
  // as it stands, the fixture is the first thing to look at.
  test("the codemod as it stands accepts A1 and carries its version forward", () => {
    const root = fixtureA({ undeclaredFolder: false });
    expect(run(root)).toBe(0);
    const config = JSON.parse(
      readFileSync(join(root, ".project-docs.json"), "utf8")
    );
    expect(config.version).toBe("6.3.0");
    expect(config.lint.adopting).toBe(true);
  });
});
