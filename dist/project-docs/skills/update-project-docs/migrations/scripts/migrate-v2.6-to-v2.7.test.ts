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
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { DEFAULT_CONFIG } from "../../../../../../scripts/pdocs/docs-lint/config.ts";
import { buildRegistry } from "../../../../../../scripts/pdocs/lint/registry.ts";
import {
  isSeeded,
  patchTopLevelVersion,
  reserialiseLike,
  seededIn,
  undeclaredFolders,
} from "./migrate-v2.6-to-v2.7.ts";
import {
  isSeeded as v29IsSeeded,
  patchTopLevelVersion as v29Patch,
  reserialiseLike as v29Reserialise,
} from "./migrate-v2.8-to-v2.9.ts";
import {
  CONTRACT_BASENAMES as LINT_CONTRACT_BASENAMES,
  DURABLE_TYPE as LINT_DURABLE,
  PROJECT_FILE_TYPE as LINT_PROJECT_FILE,
  PROJECT_SPEC,
  RENDERER_KEYS as LINT_RENDERER_KEYS,
  ROOT_PAGE_TYPE as LINT_ROOT_PAGE,
  SPEC,
  isTemplate as lintIsTemplate,
} from "../../../../../../scripts/pdocs/lint/rules.ts";
import {
  DURABLE_TYPE,
  LIFECYCLE,
  NO_LIFECYCLE,
  PROJECT_FILE_TYPE,
  RENDERER_KEYS,
  ROOT_PAGE_TYPE,
  STATUS_MAP,
  WORKBENCH_TYPE,
  derive,
  frontmatterFor,
  isContractPage,
  lifecycleOf,
  UNKNOWN_VERSION,
  docsVersionOf,
  main,
  runCodemod,
  stripConsumedMetadata,
  tagsOf,
  titleOf,
  typeOf,
} from "./migrate-v2.6-to-v2.7.codemod.ts";

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

/** Run it and keep what it printed, for the tests that are about the summary. */
function runCapturing(root: string, args: string[] = []): { code: number; out: string } {
  const real = console.log;
  const lines: string[] = [];
  console.log = (...a: unknown[]) => lines.push(a.map(String).join(" "));
  try {
    return { code: main(args, root), out: lines.join("\n") };
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
  test("the slide-renderer keys `pdocs report` looks for", () => {
    expect(RENDERER_KEYS).toEqual(LINT_RENDERER_KEYS);
  });

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
    ["specifications/TEMPLATE-domain.md"],
    ["investigations/YYYY-MM-DD-TEMPLATE-investigation.md"],
    ["projects/TEMPLATES/PROPOSAL.template.md"],
    ["SCHEMA.md"],
    ["superpowers/plans/a.md"],
    ["AGENTS.md"],
  ])("%s is not ours to touch", (rel) => {
    expect(typeOf(rel)).toBeNull();
  });

  // A substring match on "template" made a specification named `templates.md`
  // the one document the codemod left bare — and then invisible to the lint
  // that would have said so. A template is an exact shape, not a word.
  test.each([
    ["specifications/templates.md", "specification"],
    ["specifications/experience-engine/templates.md", "specification"],
    ["playbooks/email-templates.md", "playbook"],
    ["reports/2026-09-14-template-library.md", "report"],
  ])("%s → %s, a document whose name merely contains the word", (rel, expected) => {
    expect(typeOf(rel)).toBe(expected);
  });

  test("the copied template rule equals the lint's, name for name", () => {
    const names = [
      "TEMPLATE.md",
      "TEMPLATE-domain.md",
      "YYYY-MM-DD-TEMPLATE-report.md",
      "PLAN.template.md",
      "projects/TEMPLATES/x.md",
      "templates.md",
      "email-templates.md",
      "TEMPLATES.md",
      "README.md",
      "SCHEMA.md",
      "control.md",
    ];
    for (const name of names)
      expect({ name, contract: isContractPage(name) }).toEqual({
        name,
        contract: LINT_CONTRACT_BASENAMES.has(basename(name)) || lintIsTemplate(name),
      });
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

// Five of story-loom's 161 documents came out with `tags:` built from sentence
// fragments — `[clickable, tag, chips, licking, adds, …]` — because the label
// was matched anywhere in a line and every lowercase run after it was a token.
// The values pass the lint, so nothing downstream would ever have said so.
describe("tagsOf — only what is already written down as a tag", () => {
  test("a body bullet that happens to say **Tags** is prose, not metadata", () => {
    const body =
      "# Gallery filters\n\n**Status:** Draft\n\n## Behaviour\n\n" +
      "- **Tags**: Clickable tag chips: Clicking adds or removes the tag from the active gallery filters.\n";
    expect(tagsOf(body)).toEqual([]);
  });

  // The token rule alone would accept this one: real backticked tags, in a
  // sentence, outside the metadata paragraph. Only the anchoring rejects it.
  test("backticked tokens after a **Tags:** in body prose are still prose", () => {
    expect(
      tagsOf(
        "# Filters\n\n**Status:** Draft\n\nThe UI shows a **Tags:** row with `#chips` and `#filters`.\n"
      )
    ).toEqual([]);
  });

  test("a bold Tags line whose value is prose rather than tokens yields nothing", () => {
    expect(tagsOf("# A\n\n**Tags:** Clickable tag chips, and what clicking does\n")).toEqual([]);
  });

  test("the packed Prettier form keeps working", () => {
    expect(
      tagsOf("# A\n\n**Date:** 2026-02-15 **Tags:** `#migrations` `#agent-execution`\n")
    ).toEqual(["migrations", "agent-execution"]);
  });

  test("the line-start form, backticked or bare-hash", () => {
    expect(tagsOf("# A\n\n**Tags:** `#a-tag` `b-tag`\n")).toEqual(["a-tag", "b-tag"]);
    expect(tagsOf("# A\n\n**Tags:** #a-tag #b-tag\n")).toEqual(["a-tag", "b-tag"]);
  });

  test("a capitalised token is lowered whole, not truncated to its lowercase tail", () => {
    expect(tagsOf("# A\n\n**Tags:** `#Clicking` `#AgentExecution`\n")).toEqual([
      "clicking",
      "agentexecution",
    ]);
  });

  test("a wrapped metadata paragraph is read across its lines", () => {
    expect(
      tagsOf("# A\n\n**Date:** 2026-02-15 **Tags:** `#one`\n`#two` `#three`\n\nBody.\n")
    ).toEqual(["one", "two", "three"]);
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

  test("a real page named templates.md is marked like the page beside it", () => {
    const root = fixture({
      "docs/specifications/control.md": "# Control\n\nText.\n",
      "docs/specifications/templates.md":
        "# Templates\n\n**Status:** Draft\n\nText.\n",
    });
    expect(run(root)).toBe(0);
    for (const rel of ["control.md", "templates.md"]) {
      const out = readFileSync(join(root, "docs/specifications", rel), "utf8");
      expect({ rel, marked: out.startsWith("---\ntype: specification\n") }).toEqual({
        rel,
        marked: true,
      });
    }
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

// The codemod skips any file that already opens with `---`, which is right,
// but it cannot tell "already migrated" from "carries a frontmatter block from
// some other system". Story-loom had four of the second kind — an older memory
// format with `name:` and `type: project` — and they surfaced only later, in
// `pdocs report`, as three ordinary missing-field rows each, indistinguishable
// from documents that merely want a backfill. They need a CONVERSION, and the
// difference has to be visible where the skip happens.
describe("a skipped file whose block is not this contract's is named, not hidden", () => {
  const foreign =
    "---\nname: auth-flows-implementation\ndescription: How auth flows are wired.\ntags: [auth, betterauth]\ntype: project\n---\n\n# Auth flows\n";
  const typeless = "---\nname: cache-notes\ntags: [cache]\n---\n\n# Cache notes\n";
  const marked =
    "---\ntype: proposal\ntitle: Already\nstatus: stable\ngenerated: { by: unknown, at: 2026-01-01 }\n---\n\n# Already\n";

  const tree = () =>
    fixture({
      "docs/memories/auth-flows.md": foreign,
      "docs/memories/cache-notes.md": typeless,
      "docs/projects/x/proposal.md": marked,
      "docs/memories/TEMPLATE.md": "---\ntype: memory\ntitle: \"[Title]\"\n---\n\n# [Title]\n",
      "docs/memories/README.md": "# Memories\n",
    });

  test("runCodemod counts them separately, with the reason, and leaves them untouched", () => {
    const root = tree();
    const r = runCodemod({ repoRoot: root, docsRootName: "docs", exclude: [], dryRun: false });
    expect(r.needsConversion).toEqual([
      ["docs/memories/auth-flows.md", "type: project — its position says memory"],
      ["docs/memories/cache-notes.md", "no type"],
    ]);
    // Still skipped: naming is the whole fix, conversion is a separate question.
    expect(r.skipped).toContain("docs/memories/auth-flows.md");
    expect(r.skipped).toContain("docs/memories/cache-notes.md");
    expect(readFileSync(join(root, "docs/memories/auth-flows.md"), "utf8")).toBe(foreign);
    expect(readFileSync(join(root, "docs/memories/cache-notes.md"), "utf8")).toBe(typeless);
  });

  test("a quoted type is read unquoted, the way the lint's parser reads it", () => {
    const root = fixture({
      "docs/memories/dq.md": '---\ntype: "memory"\ntitle: DQ\n---\n\n# DQ\n',
      "docs/memories/sq.md": "---\ntype: 'memory'\ntitle: SQ\n---\n\n# SQ\n",
      "docs/memories/wrong.md": '---\ntype: "project"\ntitle: W\n---\n\n# W\n',
    });
    const r = runCodemod({ repoRoot: root, docsRootName: "docs", exclude: [], dryRun: true });
    expect(r.needsConversion).toEqual([
      ["docs/memories/wrong.md", "type: project — its position says memory"],
    ]);
  });

  test("a block that already carries the right type is not conversion work, and neither is a template's", () => {
    const r = runCodemod({ repoRoot: tree(), docsRootName: "docs", exclude: [], dryRun: true });
    const named = r.needsConversion.map(([rel]) => rel);
    expect(named).not.toContain("docs/projects/x/proposal.md");
    expect(named).not.toContain("docs/memories/TEMPLATE.md");
  });

  test("the summary names them under their own count", () => {
    const { code, out } = runCapturing(tree());
    expect(code).toBe(0);
    expect(out).toContain("2 skipped file(s) need conversion");
    expect(out).toContain("docs/memories/auth-flows.md");
    expect(out).toContain("type: project — its position says memory");
    expect(out).toContain("docs/memories/cache-notes.md");
    expect(out).toContain("no type");
  });

  test("and says nothing when there are none", () => {
    const { out } = runCapturing(fixture({ "docs/projects/x/proposal.md": marked }));
    expect(out).not.toContain("need conversion");
  });

  // A Slidev or Marp deck has a frontmatter block, so the skip sees "already
  // marked"; it has no `type`, so the report sees "needs a type"; and an agent
  // working that list would write `type: artifact` into a deck. SCHEMA.md
  // § "Files that are not documentation" is the answer, and it has to be
  // reachable from here.
  const slidev =
    "---\ntheme: default\ntitle: Context Library Gap Analysis\ncolorSchema: dark\nhighlighter: shiki\nlayout: cover\n---\n\n# Slide one\n";
  const marp = "---\nmarp: true\npaginate: true\n---\n\n# Slide one\n";

  test("a block with no type but a renderer's keys is a likely slide deck, not conversion work", () => {
    const root = fixture({
      "docs/projects/x/artifacts/slides.md": slidev,
      "docs/projects/x/artifacts/deck.md": marp,
      "docs/memories/cache-notes.md": typeless,
    });
    const r = runCodemod({ repoRoot: root, docsRootName: "docs", exclude: [], dryRun: true });
    expect(r.slideDecks).toEqual([
      "docs/projects/x/artifacts/deck.md",
      "docs/projects/x/artifacts/slides.md",
    ]);
    expect(r.needsConversion).toEqual([["docs/memories/cache-notes.md", "no type"]]);
  });

  test("the summary sets them apart and points at lint.exclude and the SCHEMA section", () => {
    const { out } = runCapturing(fixture({ "docs/projects/x/artifacts/slides.md": slidev }));
    expect(out).toContain(
      "1 file(s) look like slide decks rather than documents — consider `lint.exclude`:"
    );
    expect(out).toContain("docs/projects/x/artifacts/slides.md");
    expect(out).toContain('See docs/SCHEMA.md § "Files that are not documentation".');
    expect(out).not.toContain("need conversion");
  });

  test("a deck already in lint.exclude is not mentioned", () => {
    const { out } = runCapturing(
      fixture({
        ".project-docs.json": JSON.stringify({
          docsRoot: "docs",
          lint: { exclude: ["docs/projects/*/artifacts/*-slides.md"] },
        }),
        "docs/projects/x/artifacts/gap-slides.md": slidev,
      })
    );
    expect(out).not.toContain("slide decks");
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

  test("writes no tags for a document whose only Tags line is prose", () => {
    const root = fixture({
      "docs/interaction-design/gallery.md":
        "# Gallery filters\n\n**Status:** Draft\n\n## Behaviour\n\n" +
        "- **Tags**: Clickable tag chips: Clicking adds or removes the tag from the active gallery filters.\n",
    });
    run(root);
    const out = readFileSync(join(root, "docs/interaction-design/gallery.md"), "utf8");
    expect(out).toContain("type: interaction");
    expect(out).not.toContain("tags:");
  });

  // Prettier formats the YAML in Markdown frontmatter, and it writes a scalar
  // that holds a double quote in SINGLE quotes. The codemod wrote
  // `"AudioSidebar \"Select a voice\" tooltip"`, so every such title was a
  // diff on a file the migration had just touched — and story-loom's
  // lint-staged `prettier --check` refused the migration commit on its own
  // output.
  test("a title holding a double quote is single-quoted, the way Prettier writes it", () => {
    const block = frontmatterFor({
      type: "memory",
      title: 'AudioSidebar "Select a voice" tooltip likely dead on a disabled button',
      lifecycle: null,
      unmappedStatus: null,
      date: "2026-01-01",
      tags: [],
    });
    expect(block).toContain(
      `title: 'AudioSidebar "Select a voice" tooltip likely dead on a disabled button'`
    );
  });

  test("a title holding both kinds of quote stays double-quoted, escaped", () => {
    const block = frontmatterFor({
      type: "memory",
      title: `Don't say "no": the hard parts`,
      lifecycle: null,
      unmappedStatus: null,
      date: "2026-01-01",
      tags: [],
    });
    expect(block).toContain(`title: "Don't say \\"no\\": the hard parts"`);
  });

  test("and `prettier --check`, with default options, accepts what the codemod wrote", () => {
    const root = fixture({
      "docs/memories/tooltip.md":
        '# AudioSidebar "Select a voice" tooltip likely dead on a disabled button\n\n**Date:** 2026-02-15 **Tags:** `#audio` `#a11y`\n\nBody.\n',
    });
    expect(run(root)).toBe(0);
    // Run from the fixture, which has no `.prettierrc`, so this is Prettier as
    // an adopter with no config would run it.
    const r = Bun.spawnSync(
      [join(REPO_ROOT, "node_modules/.bin/prettier"), "--check", "docs/memories/tooltip.md"],
      { cwd: root, stdout: "pipe", stderr: "pipe" }
    );
    expect({
      code: r.exitCode,
      file: readFileSync(join(root, "docs/memories/tooltip.md"), "utf8"),
    }).toEqual({ code: 0, file: expect.stringContaining("title: '") });
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

describe("the standalone driver's own guard — a dirty docs/ without --force", () => {
  /** `main` with its output captured rather than silenced. */
  function runCapturing(root: string, args: string[] = []): { code: number; out: string } {
    const real = console.log;
    const lines: string[] = [];
    console.log = (...a: unknown[]) => lines.push(a.join(" "));
    try {
      return { code: main(args, root), out: lines.join("\n") };
    } finally {
      console.log = real;
    }
  }

  test("refuses a dirty docs/ and names the way out; --force and --dry-run go through", () => {
    const root = fixture({ "docs/memories/a.md": "# A\n\n**Status:** Done\n" });
    commitAll(root, "a document");
    writeFileSync(join(root, "docs/memories/a.md"), "# A\n\nEdited, uncommitted.\n");
    const refused = runCapturing(root);
    expect(refused.code).toBe(1);
    expect(refused.out).toContain("docs/ has uncommitted changes.");
    expect(refused.out).toContain("--force");
    expect(readFileSync(join(root, "docs/memories/a.md"), "utf8")).not.toContain("type: memory");
    expect(runCapturing(root, ["--dry-run"]).code).toBe(0);
    expect(runCapturing(root, ["--force"]).code).toBe(0);
    expect(readFileSync(join(root, "docs/memories/a.md"), "utf8")).toContain("type: memory");
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

// ─── Phase 3: the whole migration ────────────────────────────────────────────
//
// Everything above tests the codemod as a unit. From here the subject is
// `migrate-v2.6-to-v2.7.ts` — nine phases, one command — run as a process
// against the generated fixtures, exactly as an adopter runs it. Three things
// the plan requires of this section, in its words: every guard has a test that
// was WATCHED FAILING (break the guarded thing, see exit 1 and the reason,
// restore); every phase has a WIRING WITNESS (neuter its call site in a
// disposable copy, expect the end-to-end run to fail); and fixture B — the
// orphaned tree — goes through the SAME command with no flag, which is what
// decides § Step 7's repair path.

const SCRIPT = join(import.meta.dir, "migrate-v2.6-to-v2.7.ts");
const CODEMOD = join(import.meta.dir, "migrate-v2.6-to-v2.7.codemod.ts");
const V29_SCRIPT = join(import.meta.dir, "migrate-v2.8-to-v2.9.ts");

/** The release the current scaffold carries — what both markers end at. */
const target = () => docsVersionOf(generatedScaffolds().current, "docs");

interface Run {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  out: string;
}

/**
 * Run the script as a process. The current generated scaffold is passed with
 * `--scaffold-dir` unless `scaffold` is given (`null` omits the flag, so the
 * script fetches — or tries to). Nothing here calls `main` in-process: the
 * exit code is the contract, and only a process has one.
 */
function migrate(
  root: string,
  args: string[] = [],
  o: {
    script?: string;
    env?: Record<string, string>;
    scaffold?: string | null;
    bun?: string;
  } = {}
): Run {
  const scaffold =
    o.scaffold === undefined ? generatedScaffolds().current : o.scaffold;
  const r = Bun.spawnSync(
    [
      o.bun ?? "bun",
      o.script ?? SCRIPT,
      "--root",
      root,
      ...(scaffold ? ["--scaffold-dir", scaffold] : []),
      ...args,
    ],
    { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...o.env } }
  );
  const stdout = r.stdout.toString();
  const stderr = r.stderr.toString();
  return { exitCode: r.exitCode, stdout, stderr, out: stdout + stderr };
}

/** Add files to a fixture and commit them, so the tree stays clean. */
function withFiles(root: string, files: Record<string, string>): string {
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  commitAll(root, "fixture additions");
  return root;
}

/** Every file's sha256, `.git/` excluded — what "byte-identical" means here. */
function treeDigest(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else
        out[relative(root, abs)] = createHash("sha256")
          .update(readFileSync(abs))
          .digest("hex");
    }
  };
  walk(root);
  return out;
}

/** A document the codemod has something to do with. */
const PROPOSAL = {
  "docs/projects/sync/proposal.md":
    "# Proposal: Sync engine\n\n**Status:** Approved (in flight) **Created:** 2026-03-01\n\n---\n\n## Overview\n\nText.\n",
};

const readJson = (abs: string) => JSON.parse(readFileSync(abs, "utf8"));

/**
 * A stub CLI answering only what the script asks of it: `report` prints a
 * worklist and `check` exits 0, each overridable by an environment variable so
 * the phases that read them can be made to fail.
 */
const STUB_CLI = `const a = process.argv.slice(2);
if (a[0] === "report") { console.log("stub worklist"); process.exit(Number(process.env.CLI_REPORT_EXIT ?? 0)); }
if (a[0] === "check") process.exit(Number(process.env.CLI_CHECK_EXIT ?? 0));
process.exit(0);
`;

/**
 * A hand-built scaffold with only the parts the script reads, each removable
 * so one guard at a time can be tripped. The generated scaffold is the subject
 * of the full-run tests; this is for the guards, where a missing piece has to
 * be a scaffold defect rather than a fixture accident.
 */
function stubScaffold(
  o: {
    schemaMarker?: boolean;
    readme?: string | null;
    index?: boolean;
    cyclesReadme?: boolean;
    template?: string | null;
    cli?: boolean;
    /** `scripts/pdocs/seed.ts`, the marker phase 2 reads as "new enough". */
    seed?: boolean;
  } = {}
): string {
  const s = mkdtempSync(join(tmpdir(), "migrate-v27-stub-"));
  roots.push(s);
  const files: Record<string, string> = {
    "docs/SCHEMA.md": `# Schema\n\n${o.schemaMarker === false ? "" : "## Who owns which file\n"}`,
  };
  const readme =
    o.readme === undefined
      ? '---\ndocs_version: "9.9.9" # x-release-please-version\n---\n\n# Documentation\n'
      : o.readme;
  if (readme !== null) files["docs/README.md"] = readme;
  if (o.index !== false)
    files["docs/index.md"] = "---\ntype: index\n---\n\n# Catalog\n";
  if (o.cyclesReadme !== false) files["docs/cycles/README.md"] = "# Cycles\n";
  const template =
    o.template === undefined ? "---\ntype: cycle\n---\n\n# Cycle\n" : o.template;
  if (template !== null) files["docs/cycles/TEMPLATE.md"] = template;
  if (o.cli !== false) files["scripts/pdocs/cli.ts"] = STUB_CLI;
  else files["scripts/pdocs/other.ts"] = "// no cli here\n";
  if (o.seed !== false) files["scripts/pdocs/seed.ts"] = "// seed\n";
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(s, rel)), { recursive: true });
    writeFileSync(join(s, rel), body);
  }
  return s;
}

/**
 * A `cookiecutter` on PATH that does what the mode says, so the generate path
 * of phase 2 — and every guard on it — runs without the network. `copy`
 * produces a real scaffold by copying the generated current one.
 */
function stubCookiecutter(
  mode: "fail" | "two" | "empty" | "copy",
  source: string = generatedScaffolds().current
): string {
  const dir = mkdtempSync(join(tmpdir(), "migrate-v27-stubcc-"));
  roots.push(dir);
  const bin = join(dir, "cookiecutter");
  writeFileSync(
    bin,
    `#!/bin/sh
out=""
while [ $# -gt 0 ]; do
  if [ "$1" = "-o" ]; then out="$2"; shift; fi
  shift
done
case "${mode}" in
  fail) echo "stub cookiecutter: boom" >&2; exit 3 ;;
  two) mkdir -p "$out/a" "$out/b" ;;
  empty) mkdir -p "$out/only" ;;
  copy) cp -R "${source}" "$out/my-project" ;;
esac
exit 0
`
  );
  chmodSync(bin, 0o755);
  return `${dir}:${process.env.PATH}`;
}

/** Where a generated (not supplied) scaffold went, from the phase-2 line. */
const generatedAt = (r: Run): string | null =>
  /✓ generated at (.+)$/m.exec(r.out)?.[1] ?? null;

/**
 * A disposable copy of the script with one edit applied — the neutered call
 * site, or a sub-check removed — beside a copy of the codemod so its import
 * resolves. Throws if the text to edit is not in the script, so a refactor
 * that renames a call site fails the witness loudly rather than neutering
 * nothing and passing.
 */
function patchedScript(edits: Array<[string, string]>): string {
  const dir = mkdtempSync(join(tmpdir(), "migrate-v27-patched-"));
  roots.push(dir);
  let src = readFileSync(SCRIPT, "utf8");
  for (const [find, replace] of edits) {
    if (!src.includes(find))
      throw new Error(`not in the script, so nothing was neutered: ${find}`);
    src = src.replace(find, replace);
  }
  const copy = join(dir, basename(SCRIPT));
  writeFileSync(copy, src);
  cpSync(CODEMOD, join(dir, basename(CODEMOD)));
  return copy;
}

const neutered = (callSite: string) =>
  patchedScript([[callSite, `/* neutered: ${callSite.trim()} */`]]);

describe("the copied predicate equals the v2.9 one, and covers the registry", () => {
  test("isSeeded agrees with migrate-v2.8-to-v2.9's on every name in the current scaffold", () => {
    const names = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(join(dir, entry.name));
        else names.add(entry.name);
      }
    };
    walk(join(generatedScaffolds().current, "docs"));
    // Distinct basenames: the READMEs collapse to one, the templates do not.
    expect(names.size).toBeGreaterThan(15);
    for (const name of names)
      expect({ name, seeded: isSeeded(name) }).toEqual({
        name,
        seeded: v29IsSeeded(name),
      });
  });

  test("every template the registry declares is one the templates phase would install", () => {
    const declared: string[] = [];
    for (const row of buildRegistry(DEFAULT_CONFIG)) {
      if (row.template === null || row.externalTemplate) continue;
      for (const t of Array.isArray(row.template) ? row.template : [row.template])
        declared.push(t);
    }
    expect(declared.length).toBeGreaterThan(0);
    expect(declared.filter((t) => !isSeeded(basename(t)))).toEqual([]);
  });

  test("seededIn finds the scaffold's nineteen, and nothing under _archive", () => {
    const found = seededIn(join(generatedScaffolds().current, "docs"));
    expect(found).toContain("cycles/TEMPLATE.md");
    expect(found).toContain("projects/TEMPLATES/PROPOSAL.template.md");
    expect(found).toContain("reports/YYYY-MM-DD-TEMPLATE-report.md");
    expect(found.some((f) => f.includes("_archive"))).toBe(false);
  });
});

describe("undeclaredFolders — what the preflight stops on", () => {
  test("names A0's folder as judged, and nothing on A1", () => {
    const a0 = fixtureA({ undeclaredFolder: true });
    expect(undeclaredFolders(join(a0, "docs"), null, a0).judged).toEqual([
      UNDECLARED_FOLDER,
    ]);
    const a1 = fixtureA({ undeclaredFolder: false });
    expect(undeclaredFolders(join(a1, "docs"), null, a1)).toEqual({
      judged: [],
      inert: [],
    });
  });

  test("a folder declared in a tier, or skipped, is not undeclared", () => {
    const root = fixtureA({ undeclaredFolder: true });
    const docs = join(root, "docs");
    const wb = [...DEFAULT_CONFIG.lint.workbench, UNDECLARED_FOLDER];
    expect(undeclaredFolders(docs, { lint: { workbench: wb } }, root).judged).toEqual([]);
    expect(
      undeclaredFolders(docs, { lint: { skip: ["_archive", UNDECLARED_FOLDER] } }, root).judged
    ).toEqual([]);
    // A tier array REPLACES the default list — the failure the preflight
    // message warns about, reproduced: declare only the new folder and every
    // default folder becomes undeclared.
    expect(
      undeclaredFolders(docs, { lint: { workbench: [UNDECLARED_FOLDER] } }, root).judged
    ).toContain("backlog");
  });

  test("a folder the lint would read nothing from is inert: empty, markdown-less, skipped underneath, or excluded", () => {
    const root = fixtureA({ undeclaredFolder: false });
    mkdirSync(join(root, "docs/empty"));
    mkdirSync(join(root, "docs/.obsidian"));
    writeFileSync(join(root, "docs/.obsidian/workspace.json"), "{}\n");
    mkdirSync(join(root, "docs/old/_archive"), { recursive: true });
    writeFileSync(join(root, "docs/old/_archive/gone.md"), "# Gone\n");
    mkdirSync(join(root, "docs/decks"));
    writeFileSync(join(root, "docs/decks/talk.md"), "---\nmarp: true\n---\n");
    const config = { lint: { exclude: ["docs/decks/**"] } };
    expect(undeclaredFolders(join(root, "docs"), config, root)).toEqual({
      judged: [],
      inert: [".obsidian", "decks", "empty", "old"],
    });
    // The same dot folder with a markdown file in it IS read, and is judged.
    writeFileSync(join(root, "docs/.obsidian/note.md"), "# Note\n");
    expect(undeclaredFolders(join(root, "docs"), config, root).judged).toEqual([
      ".obsidian",
    ]);
  });
});

// ─── The whole migration, phase by phase, on each fixture ────────────────────

type Kind = "A1" | "B seeded" | "B unseeded";

interface Outcome {
  root: string;
  run: Run;
  manifestBefore: string | null;
}

const outcomes = new Map<Kind, Outcome>();

/** One real run per fixture, shared by the phase tests that read its output. */
function migrated(kind: Kind): Outcome {
  const have = outcomes.get(kind);
  if (have) return have;
  const root =
    kind === "A1"
      ? fixtureA({ undeclaredFolder: false })
      : fixtureB({ seeded: kind === "B seeded" });
  withFiles(root, PROPOSAL);
  const manifest = join(root, "docs/.pdocs-seed.json");
  const manifestBefore = existsSync(manifest)
    ? readFileSync(manifest, "utf8")
    : null;
  const o = { root, run: migrate(root), manifestBefore };
  outcomes.set(kind, o);
  return o;
}

for (const kind of ["A1", "B seeded", "B unseeded"] as Kind[]) {
  const fresh = kind === "A1";
  describe(`the whole migration on ${kind}${fresh ? " (a v2.6 tree)" : " (the orphaned tree — the same command, no flag)"}`, () => {
    test("exits 0 with the gate off and the worklist printed", () => {
      const { root, run } = migrated(kind);
      expect(run.exitCode).toBe(0);
      expect(run.out).toContain("Migration complete.");
      expect(run.out).toContain("The gate is off");
      expect(readJson(join(root, ".project-docs.json")).lint.adopting).toBe(true);
    });

    test("phase 1 — preflight: a project-docs tree, tools present, git clean, every folder in a tier", () => {
      const { run } = migrated(kind);
      expect(run.out).toContain("[1/9] Preflight");
      expect(run.out).toContain("git tree clean");
      expect(run.out).toContain("every folder under docs/ the lint reads is in a tier or skipped");
    });

    test("phase 2 — scaffold: the supplied one is used", () => {
      expect(migrated(kind).run.out).toContain(
        `✓ using ${generatedScaffolds().current}`
      );
    });

    test("phase 3 — layer: scripts/pdocs/ is installed on every fixture, and the rest says what it found", () => {
      const { root, run } = migrated(kind);
      // THE ORPHANED TREE'S WHOLE POINT. On seeded B the v2.9 script's adopt
      // phase would early-return on a matching manifest; the layer install
      // here is a separate phase with its own precondition, and it fires.
      expect(run.out).toContain("scripts/pdocs/ installed (");
      expect(existsSync(join(root, "scripts/pdocs/cli.ts"))).toBe(true);
      if (fresh) {
        expect(run.out).toContain("docs/SCHEMA.md installed");
        expect(run.out).toContain("docs/index.md installed");
        expect(run.out).toContain("docs/cycles/ created, with its README.md");
      } else {
        expect(run.out).toContain("docs/SCHEMA.md already identical to the scaffold's");
        expect(run.out).toContain("docs/index.md is there — left alone, it is yours");
        expect(run.out).toContain("every category folder the scaffold ships is already here");
      }
      expect(existsSync(join(root, "docs/SCHEMA.md"))).toBe(true);
      expect(existsSync(join(root, "docs/cycles/README.md"))).toBe(true);
    });

    test("phase 4 — templates: installed and replaced on a v2.6 tree, already in place on the orphaned one", () => {
      const { root, run } = migrated(kind);
      expect(run.out).toContain(
        fresh
          ? "1 installed, 18 replaced (a v2.6 template has no frontmatter block), 0 already in place, 0 kept"
          : "0 installed, 0 replaced, 19 already in place, 0 kept"
      );
      for (const rel of seededIn(join(generatedScaffolds().current, "docs")))
        expect({
          rel,
          frontmatter: readFileSync(join(root, "docs", rel), "utf8").startsWith("---\n"),
        }).toEqual({ rel, frontmatter: true });
    });

    test("phase 5 — frontmatter: the documents gain a block, description is never written", () => {
      const { root, run } = migrated(kind);
      // A1 also has PROJECT_MANIFESTO.md to mark; on B the current scaffold's
      // copy — already marked — sits over it.
      expect(run.out).toContain(
        fresh ? "2 document(s) gained frontmatter" : "1 document(s) gained frontmatter"
      );
      const proposal = readFileSync(join(root, "docs/projects/sync/proposal.md"), "utf8");
      expect(proposal).toContain("type: proposal");
      expect(proposal).toContain("lifecycle: approved");
      expect(proposal).not.toContain("description:");
      expect(proposal).not.toContain("**Status:**");
    });

    test("phase 6 — config: created with lint.adopting true and the version carried, not invented", () => {
      const { root, run } = migrated(kind);
      expect(run.out).toContain("created — lint.adopting: true");
      // A1's README says 6.3.0; B's docs/ came from the current scaffold.
      expect(run.out).toContain(
        `version ${fresh ? "6.3.0" : target()} carried from docs/README.md`
      );
      const cfg = readJson(join(root, ".project-docs.json"));
      expect(cfg.docsRoot).toBe("docs");
      expect(cfg.lint.durable).toEqual(Object.keys(DURABLE_TYPE));
    });

    test("phase 7 — report: pdocs report is run from the migrated tree and printed", () => {
      const { run } = migrated(kind);
      expect(run.out).toContain("[7/9] The worklist");
      expect(run.out).toContain("`pdocs report --format text` — the backfill's worklist");
      expect(run.out).toContain("missing field(s)");
      expect(run.out).toContain("description");
      expect(run.out).toContain("proposal.md");
    });

    test("phase 8 — version markers: both end at the scaffold's release, reported separately", () => {
      const { root, run } = migrated(kind);
      expect(run.out).toContain(
        fresh
          ? `docs/README.md set to ${target()}`
          : `docs/README.md already at ${target()}`
      );
      expect(run.out).toContain(
        fresh
          ? `.project-docs.json set to ${target()}`
          : `.project-docs.json already at ${target()}`
      );
      expect(docsVersionOf(root, "docs")).toBe(target());
      expect(readJson(join(root, ".project-docs.json")).version).toBe(target());
    });

    test("phase 9 — cleanup: a supplied scaffold is left in place", () => {
      const { run } = migrated(kind);
      expect(run.out).toContain("scaffold was supplied with --scaffold-dir — left in place");
      expect(existsSync(join(generatedScaffolds().current, "docs/SCHEMA.md"))).toBe(true);
    });

    test("the installed gate reads the result: pdocs check reports the missing descriptions and exits 0", () => {
      const { root } = migrated(kind);
      const check = Bun.spawnSync(
        ["bun", "scripts/pdocs/cli.ts", "check", "--format", "text"],
        { cwd: root, stdout: "pipe", stderr: "pipe" }
      );
      expect(check.exitCode).toBe(0);
      const o = check.stdout.toString();
      expect(o).toContain("exiting 0");
      expect(o).toContain("lint.adopting");
      expect(o).toContain("description");
    });

    if (kind === "B seeded")
      test("the manifest it arrived with is untouched, and the v2.9 script's adopt phase then early-returns on it", () => {
        const { root, manifestBefore } = migrated(kind);
        expect(readFileSync(join(root, "docs/.pdocs-seed.json"), "utf8")).toBe(
          manifestBefore as string
        );
        const v29 = Bun.spawnSync(
          ["bun", V29_SCRIPT, "--root", root, "--scaffold-dir", generatedScaffolds().current, "--skip-format"],
          { stdout: "pipe", stderr: "pipe" }
        );
        expect(v29.exitCode).toBe(0);
        expect(v29.stdout.toString()).toContain("every recorded hash still matches");
      });
    else
      test("the hand-off: the v2.9 script runs next, on the tree this one leaves", () => {
        const { root } = migrated(kind);
        expect(existsSync(join(root, "docs/.pdocs-seed.json"))).toBe(false);
        const v29 = Bun.spawnSync(
          ["bun", V29_SCRIPT, "--root", root, "--scaffold-dir", generatedScaffolds().current, "--skip-format"],
          { stdout: "pipe", stderr: "pipe" }
        );
        expect(v29.exitCode).toBe(0);
        expect(Object.keys(readJson(join(root, "docs/.pdocs-seed.json")).files).length).toBe(19);
      });
  });
}

describe("fixture B decides Decision 2", () => {
  test("both B variants pass through the same command with no repair flag", () => {
    expect(migrated("B seeded").run.exitCode).toBe(0);
    expect(migrated("B unseeded").run.exitCode).toBe(0);
    expect(existsSync(join(migrated("B seeded").root, "scripts/pdocs/cli.ts"))).toBe(true);
    expect(existsSync(join(migrated("B unseeded").root, "scripts/pdocs/cli.ts"))).toBe(true);
  });
});

describe("A0 — the preflight stop", () => {
  test("names the undeclared folder, says how to declare or skip it, exits 1, and writes nothing", () => {
    const root = fixtureA({ undeclaredFolder: true });
    const before = treeDigest(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: 1 folder(s) under docs/ hold markdown and are in no lint tier and not skipped");
    expect(r.out).toContain(`docs/${UNDECLARED_FOLDER}/`);
    expect(r.out).toContain('"workbench":');
    expect(r.out).toContain('"skip":');
    expect(r.out).toContain("Nothing was written.");
    expect(r.out).not.toContain("[2/9]");
    expect(treeDigest(root)).toEqual(before);
  });

  test("--dry-run stops there too, and is byte-identical", () => {
    const root = fixtureA({ undeclaredFolder: true });
    const before = treeDigest(root);
    const r = migrate(root, ["--dry-run"]);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain(`docs/${UNDECLARED_FOLDER}/`);
    expect(treeDigest(root)).toEqual(before);
  });
});

describe("idempotence and dry run", () => {
  test("--dry-run on A1 reports every phase's plan and leaves the tree byte-identical", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), PROPOSAL);
    const before = treeDigest(root);
    const r = migrate(root, ["--dry-run"]);
    expect(r.exitCode).toBe(0);
    for (const line of [
      "would install scripts/pdocs/",
      "would install docs/SCHEMA.md",
      "would create docs/cycles/ with its README.md",
      "would install docs/cycles/TEMPLATE.md",
      "would replace docs/playbooks/TEMPLATE.md",
      "would mark docs/projects/sync/proposal.md  type: proposal, lifecycle: approved",
      "would create it — lint.adopting: true",
      "would run `pdocs report --format text`",
      `would set both markers to ${target()}`,
      "Dry run complete — nothing was changed.",
    ])
      expect(r.out).toContain(line);
    expect(treeDigest(root)).toEqual(before);
    expect(existsSync(join(root, ".project-docs.json"))).toBe(false);
  });

  test("a second run on a migrated A1 verifies rather than rewrites", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), PROPOSAL);
    expect(migrate(root).exitCode).toBe(0);
    commitAll(root, "the migration");
    const after = treeDigest(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    for (const line of [
      "scripts/pdocs/ already installed and identical to the scaffold's",
      "docs/SCHEMA.md already identical to the scaffold's",
      "docs/index.md is there — left alone, it is yours",
      "19 already in place",
      "nothing to mark — every document already has a frontmatter block",
      "lint.adopting already true — this project is mid-adoption",
      "already complete — nothing to add",
      `docs/README.md already at ${target()}`,
      `.project-docs.json already at ${target()}`,
    ])
      expect(r.out).toContain(line);
    expect(treeDigest(root)).toEqual(after);
  });

  test("a dirty tree is reported, not enforced", () => {
    const root = fixtureA({ undeclaredFolder: false });
    // Dirt in a path the run will not touch: reported, and the run goes on.
    writeFileSync(join(root, "notes.txt"), "scratch\n");
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("working tree is dirty (1 path(s))");
    expect(r.out).not.toContain("--force");
  });

  test("a no-op re-run leaves a hand-formatted .project-docs.json byte-identical", () => {
    // `.project-docs.json` is theirs; the version phase used to re-serialise
    // it even when the value was already right.
    const root = withFiles(fixtureA({ undeclaredFolder: false }), PROPOSAL);
    expect(migrate(root).exitCode).toBe(0);
    const cfgPath = join(root, ".project-docs.json");
    const handFormatted = `${JSON.stringify(readJson(cfgPath), null, 4)}\n`;
    writeFileSync(cfgPath, handFormatted);
    commitAll(root, "the migration, config hand-formatted");
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(readFileSync(cfgPath, "utf8")).toBe(handFormatted);
    expect(git(root, "status", "--porcelain")).toBe("");
  });

  test("an existing .project-docs.json gains only what it lacks, and its lint.types reach the codemod", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      ".project-docs.json": JSON.stringify(
        { docsRoot: "docs", custom: { version: "keep-me" }, lint: { types: { runbooks: "runbook" }, workbench: [...DEFAULT_CONFIG.lint.workbench, "runbooks"] } },
        null,
        2
      ),
      "docs/runbooks/deploy.md": "# Deploy\n\n**Status:** Draft\n\nHow to deploy.\n",
    });
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("added lint.adopting: true, lint.exclude, lint.durable, lint.skip, version: 6.3.0 — every existing key left as it was");
    expect(r.out).toContain("docs/runbooks/deploy.md  type: runbook");
    const deploy = readFileSync(join(root, "docs/runbooks/deploy.md"), "utf8");
    expect(deploy).toContain("type: runbook");
    expect(deploy).not.toContain("lifecycle:");
    const cfg = readJson(join(root, ".project-docs.json"));
    expect(cfg.custom.version).toBe("keep-me");
    expect(cfg.lint.types).toEqual({ runbooks: "runbook" });
    expect(cfg.lint.adopting).toBe(true);
    expect(cfg.lint.durable).toEqual(Object.keys(DURABLE_TYPE));
    expect(cfg.version).toBe(target());
  });

  test("a generated scaffold is removed by a dry run and by a real run", () => {
    const PATH = stubCookiecutter("copy");
    for (const args of [["--dry-run"], []]) {
      const root = fixtureA({ undeclaredFolder: false });
      const r = migrate(root, args, { scaffold: null, env: { PATH } });
      expect(r.exitCode).toBe(0);
      const at = generatedAt(r);
      expect(at).not.toBeNull();
      expect(r.out).toContain("generated scaffold removed");
      expect(existsSync(at as string)).toBe(false);
    }
  });
});

describe("bad invocation exits 2, not 1", () => {
  // Every case names a disposable root (or a dry run against one), so a parser
  // guard that stopped firing could never reach this repository's own tree —
  // the default `--root` is the current directory, and `bun test` runs here.
  const bare = () => {
    const d = mkdtempSync(join(tmpdir(), "migrate-v27-bare-"));
    roots.push(d);
    return d;
  };
  test.each([
    ["an unknown flag", () => ["--root", bare(), "--nope"], "unknown argument"],
    ["--root without a value", () => ["--root"], "--root needs a value"],
    [
      "--root with an empty value",
      () => ["--root", "", "--dry-run", "--scaffold-dir", stubScaffold()],
      "--root was given an empty value",
    ],
    [
      "--scaffold-dir with an empty value",
      () => ["--root", bare(), "--scaffold-dir", ""],
      "--scaffold-dir was given an empty value",
    ],
    [
      "--scaffold-dir followed by another flag",
      () => ["--root", bare(), "--scaffold-dir", "--dry-run"],
      "--scaffold-dir needs a value",
    ],
  ])("%s", (_name, args, reason) => {
    const r = Bun.spawnSync(["bun", SCRIPT, ...args()], { stdout: "pipe", stderr: "pipe" });
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain(reason);
  });
});

// ─── Every guard, made to fire ───────────────────────────────────────────────
//
// One test per `fail(` site in the script (the invariant check counts one per
// line it can produce). Each breaks the guarded thing and asserts exit 1 and
// the reason text. The observation that each one was watched failing — the
// guard removed from a copy, the test going red, the copy discarded — is in
// the project's session note under `Guards watched failing`, one line per
// test name below.

describe("guards that must be able to fire", () => {
  test("preflight: a .project-docs.json that is not valid JSON stops the run", () => {
    const root = fixtureA({ undeclaredFolder: false });
    writeFileSync(join(root, ".project-docs.json"), "{ not json");
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: .project-docs.json is not valid JSON");
  });

  test("preflight: a docsRoot naming a directory that is not there stops the run", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      ".project-docs.json": '{ "docsRoot": "documentation" }\n',
    });
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: no documentation/ at");
    expect(r.out).toContain("docsRoot names a directory that is not there");
  });

  test("preflight: a tree with no docs/README.md is not a project-docs tree", () => {
    const root = fixtureA({ undeclaredFolder: false });
    rmSync(join(root, "docs/README.md"));
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: no docs/README.md at");
    expect(r.out).toContain("not a project-docs tree");
  });

  test("preflight: a docs/ that is not there at all is not a project-docs tree", () => {
    const root = mkdtempSync(join(tmpdir(), "migrate-v27-bare-"));
    roots.push(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: no docs/ at");
    expect(r.out).toContain("this is not a project-docs tree");
  });

  test("preflight: a README with no docs_version is pre-2.0 and stops the run", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      "docs/README.md": "# Documentation\n\nNo marker here.\n",
    });
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: docs/README.md carries no docs_version line");
    expect(r.out).toContain("v1-to-v2 comes first");
  });

  test("preflight: bun off PATH stops the run, even though the script itself is running under it", () => {
    const bun = Bun.which("bun") as string;
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      bun,
      env: { PATH: "/usr/bin:/bin" },
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: bun is not on PATH");
  });

  test("preflight: cookiecutter missing with no --scaffold-dir stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: null,
      env: { PATH: `${dirname(Bun.which("bun") as string)}:/usr/bin:/bin` },
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: cookiecutter is not installed, and no --scaffold-dir");
  });

  test("preflight: an uncommitted edit to a path the run would write stops the run — the v2.6 template repro", () => {
    // The exact reproduction: a section appended to a v2.6 template, not
    // committed. Without the stop the template was replaced, exit 0, and the
    // section was gone and never in git.
    const root = fixtureA({ undeclaredFolder: false });
    const tpl = join(root, "docs/playbooks/TEMPLATE.md");
    const edited = `${readFileSync(tpl, "utf8")}\n## My section\n\nNot committed.\n`;
    writeFileSync(tpl, edited);
    const before = treeDigest(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: 1 path(s) this run would write have uncommitted changes:");
    expect(r.out).toContain("docs/playbooks/TEMPLATE.md");
    expect(r.out).toContain("Commit or stash them");
    expect(r.out).toContain("--force");
    expect(r.out).toContain("Nothing was written.");
    expect(r.out).not.toContain("[2/9]");
    expect(treeDigest(root)).toEqual(before);
    expect(readFileSync(tpl, "utf8")).toBe(edited);

    // --force is the documented override, and says what it is writing over.
    const forced = migrate(root, ["--force"]);
    expect(forced.exitCode).toBe(0);
    expect(forced.out).toContain("--force: writing over 1 uncommitted path(s) this run touches: docs/playbooks/TEMPLATE.md");
    expect(readFileSync(tpl, "utf8")).toBe(
      readFileSync(join(generatedScaffolds().current, "docs/playbooks/TEMPLATE.md"), "utf8")
    );
  });

  test("preflight: the dirty-write stop covers the layer and the documents the codemod would mark, not a template it would keep", () => {
    const layer = withFiles(fixtureA({ undeclaredFolder: false }), PROPOSAL);
    mkdirSync(join(layer, "scripts/pdocs"), { recursive: true });
    writeFileSync(join(layer, "scripts/pdocs/mine.ts"), "// untracked\n");
    writeFileSync(join(layer, "docs/projects/sync/proposal.md"), "# Proposal: Sync engine\n\nEdited, uncommitted.\n");
    const r = migrate(layer);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("2 path(s) this run would write have uncommitted changes");
    expect(r.out).toContain("scripts/pdocs/mine.ts");
    expect(r.out).toContain("docs/projects/sync/proposal.md");

    // A template that already carries a frontmatter block is kept, so an
    // uncommitted edit to it is dirt the run will not touch.
    const kept = fixtureA({ undeclaredFolder: false });
    writeFileSync(join(kept, "docs/playbooks/TEMPLATE.md"), "---\ntype: playbook\n---\n\n# Mine, uncommitted\n");
    const k = migrate(kept);
    expect(k.exitCode).toBe(0);
    expect(k.out).toContain("working tree is dirty (1 path(s))");
    expect(k.out).toContain("kept docs/playbooks/TEMPLATE.md");
  });

  test("the seam refuses a path, and takes only a bare file name", () => {
    const r = migrate(withFiles(fixtureA({ undeclaredFolder: false }), PROPOSAL), [], {
      env: { PDOCS_MIGRATE_TEST_MUTATE: "../outside/late.md" },
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: PDOCS_MIGRATE_TEST_MUTATE must be a bare file name, not a path.");
  });

  test("codemod: a folder declared in lint.types is typed, a folder in lint.skip is left alone, and a bare document in a folder with no type is reported under its own count", () => {
    // The lines the preflight tells the adopter to paste, followed.
    const declared = withFiles(fixtureA({ undeclaredFolder: true }), {
      ".project-docs.json": JSON.stringify(
        { docsRoot: "docs", lint: { workbench: [...DEFAULT_CONFIG.lint.workbench, UNDECLARED_FOLDER], types: { [UNDECLARED_FOLDER]: "runbook" } } },
        null,
        2
      ),
    });
    const d = migrate(declared);
    expect(d.exitCode).toBe(0);
    expect(d.out).toContain(`${UNDECLARED_FILE}  type: runbook`);
    expect(readFileSync(join(declared, UNDECLARED_FILE), "utf8")).toContain("type: runbook");
    expect(d.out).not.toContain("not typed by this codemod");

    const skipped = withFiles(fixtureA({ undeclaredFolder: true }), {
      ".project-docs.json": JSON.stringify(
        { docsRoot: "docs", lint: { skip: ["_archive", "superpowers", UNDECLARED_FOLDER] } },
        null,
        2
      ),
    });
    const bare = readFileSync(join(skipped, UNDECLARED_FILE), "utf8");
    const s = migrate(skipped);
    expect(s.exitCode).toBe(0);
    expect(readFileSync(join(skipped, UNDECLARED_FILE), "utf8")).toBe(bare);
    expect(s.out).not.toContain("not typed by this codemod");

    // Declared in a tier but given no type: the lint reads it, the codemod
    // cannot type it, and it must not hide under "skipped".
    const untyped = withFiles(fixtureA({ undeclaredFolder: true }), {
      ".project-docs.json": JSON.stringify(
        { docsRoot: "docs", lint: { workbench: [...DEFAULT_CONFIG.lint.workbench, UNDECLARED_FOLDER] } },
        null,
        2
      ),
    });
    const u = migrate(untyped);
    expect(u.exitCode).toBe(0);
    expect(u.out).toContain("1 document(s) not typed by this codemod");
    expect(u.out).toContain(UNDECLARED_FILE);
    expect(u.out).toContain("1 document(s) gained frontmatter");
  });

  test("preflight: an undeclared docs-root folder stops the run (A0)", () => {
    const r = migrate(fixtureA({ undeclaredFolder: true }));
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("in no lint tier and not skipped");
    expect(r.out).toContain(`docs/${UNDECLARED_FOLDER}/`);
  });

  test("scaffold: a --scaffold-dir that is not a generated project root stops the run", () => {
    const notARoot = mkdtempSync(join(tmpdir(), "migrate-v27-notroot-"));
    roots.push(notARoot);
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], { scaffold: notARoot });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("is not a generated project root");
  });

  test("scaffold: cookiecutter exiting non-zero stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: null,
      env: { PATH: stubCookiecutter("fail") },
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: cookiecutter failed (exit 3)");
    expect(r.out).toContain("stub cookiecutter: boom");
  });

  test("scaffold: more than one generated project stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: null,
      env: { PATH: stubCookiecutter("two") },
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("expected one generated project in");
    expect(r.out).toContain("found 2");
  });

  test("scaffold: a generated project missing SCHEMA.md or scripts/pdocs/ stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: null,
      env: { PATH: stubCookiecutter("empty") },
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("is missing docs/SCHEMA.md or scripts/pdocs/");
  });

  test("scaffold version: a scaffold with no docs/README.md stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold({ readme: null }),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: the scaffold has no docs/README.md at");
  });

  test("scaffold version: an unreadable version stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold({ readme: "---\ndocs_version: not-a-version\n---\n" }),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("could not read a version from the scaffold's docs/README.md");
  });

  test("layer: a scaffold whose scripts/pdocs/ has no cli.ts stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold({ cli: false }),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: scripts/pdocs/cli.ts did not arrive");
  });

  test("scaffold: a scaffold older than this migration — SCHEMA.md without the ownership section — stops in phase 2, in both modes, before anything is written", () => {
    // MediaForge: the published template was a release behind. The dry run
    // must stop where the real run would, not print a green plan.
    const old = stubScaffold({ schemaMarker: false });
    for (const args of [["--dry-run"], []]) {
      const root = fixtureA({ undeclaredFolder: false });
      const before = treeDigest(root);
      const r = migrate(root, args, { scaffold: old });
      expect(r.exitCode).toBe(1);
      expect(r.out).toContain(
        `STOPPED: the scaffold at --scaffold-dir ${old} is older than this migration requires (release 9.9.9, missing docs/SCHEMA.md § "Who owns which file")`
      );
      expect(r.out).toContain("Pass --scaffold-dir pointing at a");
      expect(r.out).toContain("generated from a checkout that has it");
      expect(r.out).toContain("Nothing was written.");
      expect(r.out).not.toContain("[3/9]");
      expect(treeDigest(root)).toEqual(before);
    }
    // Fetched rather than supplied, the stop names the published template.
    const fetched = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: null,
      env: { PATH: stubCookiecutter("copy", old) },
    });
    expect(fetched.exitCode).toBe(1);
    expect(fetched.out).toContain(
      "the scaffold at gh:ichabodcole/project-docs-scaffold-template (the published template) is older than this migration requires"
    );
  });

  test("scaffold: a scaffold without scripts/pdocs/seed.ts is older than this migration and stops in phase 2", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold({ seed: false }),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("older than this migration requires (release 9.9.9, missing scripts/pdocs/seed.ts)");
    expect(r.out).not.toContain("[3/9]");
  });

  test("invariant: a docs/SCHEMA.md on disk without the ownership section is caught", () => {
    // The layer phase copies a file phase 2 verified; a phase that wrote a
    // different SCHEMA.md would be caught by the end-of-run check.
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: patchedScript([
        ["    cpSync(schemaSrc, schemaDst);\n", '    writeFileSync(schemaDst, "# bare\\n");\n'],
      ]),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain('docs/SCHEMA.md is missing or has no "Who owns which file" section');
  });

  test("layer: a scaffold with no docs/index.md stops the run on a tree that has none", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold({ index: false }),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: the scaffold has no docs/index.md");
  });

  test("layer: a new category folder without a README.md in the scaffold stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold({ cyclesReadme: false }),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: the scaffold has no README.md for docs/cycles/");
  });

  test("templates: a scaffold that ships no templates stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold({ template: null }),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: the scaffold ships no templates");
  });

  test("templates: a scaffold template without a frontmatter block is older than v2.7 and stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold({ template: "# Cycle\n\nNo frontmatter.\n" }),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("docs/cycles/TEMPLATE.md has no frontmatter block — the scaffold is older than v2.7");
  });

  test("preflight: an existing lint.adopting: false is a finished adoption and stops the run before anything is written", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      ".project-docs.json": '{ "docsRoot": "docs", "lint": { "adopting": false } }\n',
    });
    const before = treeDigest(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: lint.adopting is false in .project-docs.json — the gate is on, so this tree has finished adopting");
    expect(r.out).toContain("v2.8-to-v2.9's job");
    expect(r.out).toContain("Nothing was written.");
    expect(r.out).not.toContain("[2/9]");
    expect(treeDigest(root)).toEqual(before);
  });

  test("a stop after a writing phase says the tree may be partly migrated; a preflight stop says nothing was written", () => {
    const late = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold(),
      env: { CLI_REPORT_EXIT: "4" },
    });
    expect(late.exitCode).toBe(1);
    expect(late.out).toContain("The tree may be partly migrated. Re-running is safe");
    expect(late.out).not.toContain("Nothing was written.");
    const early = migrate(fixtureA({ undeclaredFolder: true }));
    expect(early.exitCode).toBe(1);
    expect(early.out).toContain("Nothing was written.");
    expect(early.out).not.toContain("partly migrated");
  });

  test("scaffold: a stop after phase 2 does not leave the generated scaffold's temp dir behind", () => {
    // A stub cookiecutter copies a stub scaffold whose CLI fails the report,
    // so the run generates, gets to phase 7, and stops there.
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: null,
      env: { PATH: stubCookiecutter("copy", stubScaffold()), CLI_REPORT_EXIT: "4" },
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: `pdocs report` exited 4");
    const at = generatedAt(r);
    expect(at).not.toBeNull();
    expect(existsSync(dirname(at as string))).toBe(false);
  });

  test("layer: a category folder the scaffold would create that is in no tier of the project's config stops the run before writing", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      ".project-docs.json": JSON.stringify(
        { docsRoot: "docs", lint: { workbench: DEFAULT_CONFIG.lint.workbench.filter((w) => w !== "cycles") } },
        null,
        2
      ),
    });
    const before = treeDigest(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: 1 category folder(s) the scaffold ships would be created under docs/ but are in no lint tier");
    expect(r.out).toContain("docs/cycles/");
    expect(r.out).toContain('"workbench":');
    expect(r.out).toContain("Nothing was written.");
    expect(treeDigest(root)).toEqual(before);
    // The dry run stops there too.
    expect(migrate(root, ["--dry-run"]).exitCode).toBe(1);
  });

  // The three below inject a mutation into the version phase's write. Since
  // #167 that write is `writeVersionInto`, whose `intended` object is what the
  // in-place patch is verified against — a mutated `intended` fails that check,
  // so the fallback re-serialises and writes the mutation, which is the point.
  test("invariant: a folder the lint reads that the config on disk leaves undeclared is caught", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: patchedScript([
        [
          "  intended.version = version;\n",
          '  intended.version = version; (intended.lint as any).workbench = (intended.lint as any).workbench.filter((w: string) => w !== "cycles");\n',
        ],
      ]),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("hold markdown the lint reads and are in no tier of the .project-docs.json on disk");
    expect(r.out).toContain("docs/cycles/");
  });

  test("preflight: an empty undeclared folder and a markdown-less dot folder are reported, not stopped; a dot folder with a .md is", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      "docs/.obsidian/workspace.json": "{}\n",
    });
    mkdirSync(join(root, "docs/empty"));
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("· docs/.obsidian/ is in no tier, and holds no markdown the lint reads — nothing to declare");
    expect(r.out).toContain("· docs/empty/ is in no tier, and holds no markdown the lint reads — nothing to declare");

    const judged = withFiles(fixtureA({ undeclaredFolder: false }), {
      "docs/.obsidian/note.md": "# Note\n",
    });
    const s = migrate(judged);
    expect(s.exitCode).toBe(1);
    expect(s.out).toContain("docs/.obsidian/");
    expect(s.out).toContain("in no lint tier and not skipped");
  });

  test("preflight: a folder whose markdown a lint.exclude glob covers is not a stop", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      ".project-docs.json": '{ "docsRoot": "docs", "lint": { "exclude": ["docs/decks/**"] } }\n',
      "docs/decks/talk.md": "---\nmarp: true\n---\n\n# Deck\n",
    });
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("· docs/decks/ is in no tier, and holds no markdown the lint reads");
  });

  test("templates: a template that already carries a frontmatter block is kept and named, manifest or no manifest", () => {
    const mine = "---\ntype: playbook\ntitle: Mine\n---\n\n# My playbook template\n";
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      "docs/playbooks/TEMPLATE.md": mine,
    });
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("· kept docs/playbooks/TEMPLATE.md — it already carries a frontmatter block and is not the scaffold's");
    expect(r.out).toContain("17 replaced (a v2.6 template has no frontmatter block), 0 already in place, 1 kept");
    expect(readFileSync(join(root, "docs/playbooks/TEMPLATE.md"), "utf8")).toBe(mine);
  });

  test("main: an unexpected exception is still exit 1 with a named reason", () => {
    // `scripts/pdocs` as a FILE: cpSync cannot copy a directory over it.
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      "scripts/pdocs": "not a directory\n",
    });
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: unexpected failure —");
    expect(r.out).not.toContain("    at ");
  });

  test("report: scripts/pdocs/cli.ts absent when the report runs stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: neutered("\n    installLayer(ctx);\n"),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: scripts/pdocs/cli.ts is not there — the layer phase did not install it");
  });

  test("report: pdocs report exiting non-zero stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold(),
      env: { CLI_REPORT_EXIT: "4" },
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: `pdocs report` exited 4");
  });

  test("invariant: pdocs check exiting non-zero on the result stops the run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      scaffold: stubScaffold(),
      env: { CLI_CHECK_EXIT: "9" },
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("the migration's own invariants do not hold");
    expect(r.out).toContain("`pdocs check` exits 9 on the migrated tree");
  });

  test("invariant: a document added after the report was read stops the run — the self-check is WIRED", () => {
    // The seam: a bare document lands between the report phase and the
    // version phase. Only a wired end-of-run check can see it.
    const r = migrate(withFiles(fixtureA({ undeclaredFolder: false }), PROPOSAL), [], {
      env: { PDOCS_MIGRATE_TEST_MUTATE: "late.md" },
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("the migration's own invariants do not hold");
    expect(r.out).toContain("1 document(s) still have no frontmatter block after the run");
    expect(r.out).toContain("docs/memories/late.md");
    expect(r.out).toContain("the worklist printed by the report phase no longer matches the tree");
  });

  test("invariant: a later phase flipping lint.adopting off is caught", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: patchedScript([
        ["  intended.version = version;\n", "  intended.version = version; (intended.lint as any).adopting = false;\n"],
      ]),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain(".project-docs.json has lint.adopting false, not true");
  });

  test("invariant: a config version that is not the scaffold's is caught", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: patchedScript([
        ["  intended.version = version;\n", '  intended.version = "0.0.0";\n'],
      ]),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain(`.project-docs.json version is "0.0.0", not ${target()}`);
  });
});

// ─── Wiring witnesses ────────────────────────────────────────────────────────
//
// A unit test of a phase never shows that anything calls it. Each test below
// neuters one phase's call site in a disposable copy of the script and expects
// the end-to-end run to fail — or, for the preflight, to stop failing where it
// must fail.

describe("wiring witnesses — each phase's call site, neutered", () => {
  test("phase 1 preflight: neutered, A0 is written to and only the end-of-run check catches it", () => {
    // Intact, the preflight stops A0 before anything is written. Neutered,
    // every phase runs — the tree gains the layer — and the undeclared folder
    // is caught only by the invariant at the end, after the writes.
    const intact = migrate(fixtureA({ undeclaredFolder: true }));
    expect(intact.exitCode).toBe(1);
    expect(intact.out).not.toContain("[2/9]");
    const root = fixtureA({ undeclaredFolder: true });
    const r = migrate(root, [], { script: neutered("\n    preflight(ctx);\n") });
    expect(r.out).not.toContain("[1/9]");
    expect(r.out).toContain("[9/9]");
    expect(existsSync(join(root, "scripts/pdocs/cli.ts"))).toBe(true);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("in no tier of the .project-docs.json on disk");
    expect(r.out).toContain(`docs/${UNDECLARED_FOLDER}/`);
    expect(r.out).toContain("The tree may be partly migrated");
  });

  test("phase 2 scaffold: neutered, there is nothing to read a version from", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: neutered("\n    ctx.scaffoldDir = getScaffold(ctx);\n"),
    });
    expect(r.exitCode).toBe(1);
    // Not a cwd-relative read of docs/README.md — this repository has one,
    // and a `join("", ...)` would have found it and reported ITS version.
    expect(r.out).toContain("STOPPED: no scaffold to verify — the scaffold phase did not run");
  });

  test("phase 3 layer: neutered, the report has no CLI to run", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: neutered("\n    installLayer(ctx);\n"),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("scripts/pdocs/cli.ts is not there");
  });

  test("phase 4 templates: neutered, the invariant names the bare and missing templates", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: neutered("\n    installTemplates(ctx, templates);\n"),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("docs/cycles/TEMPLATE.md is missing — the templates phase installs");
    expect(r.out).toContain("docs/playbooks/TEMPLATE.md has no frontmatter block — the templates phase replaces");
  });

  test("phase 5 frontmatter: neutered, the invariant finds documents still bare", () => {
    const r = migrate(withFiles(fixtureA({ undeclaredFolder: false }), PROPOSAL), [], {
      script: neutered("\n    frontmatter(ctx);\n"),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("2 document(s) still have no frontmatter block after the run");
    expect(r.out).toContain("docs/projects/sync/proposal.md");
  });

  test("phase 6 config: neutered, the real CLI refuses the tree at the report, and the invariant names the phase", () => {
    // The real CLI exits 5 on a tree with no .project-docs.json, so with the
    // generated scaffold the run stops one phase later, at the report.
    const real = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: neutered("\n    writeConfig(ctx);\n"),
    });
    expect(real.exitCode).toBe(1);
    expect(real.out).toContain("STOPPED: `pdocs report` exited 5");
    expect(real.out).toContain("no .project-docs.json");
    // A CLI that does not refuse lets the run reach the end-of-run check,
    // which names the phase.
    const stub = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: neutered("\n    writeConfig(ctx);\n"),
      scaffold: stubScaffold(),
    });
    expect(stub.exitCode).toBe(1);
    expect(stub.out).toContain(".project-docs.json is not there — the config phase must run");
  });

  test("phase 7 report: neutered, the invariant says the worklist was never read", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: neutered("\n    report(ctx);\n"),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("the report phase did not run");
  });

  test("phase 8 version: neutered, both markers are found short of the scaffold's release", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: neutered("\n    bumpVersion(ctx, version);\n"),
    });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain(`docs/README.md docs_version is 6.3.0, not ${target()}`);
    expect(r.out).toContain(`.project-docs.json version is "6.3.0", not ${target()}`);
  });

  test("phase 9 cleanup: neutered, the generated scaffold is found still on disk", () => {
    const r = migrate(fixtureA({ undeclaredFolder: false }), [], {
      script: neutered("\n    cleanup(ctx);\n"),
      scaffold: null,
      env: { PATH: stubCookiecutter("copy") },
    });
    const at = generatedAt(r);
    if (at) roots.push(resolve(at, ".."));
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("the generated scaffold is still on disk — the cleanup phase removes it");
  });
});

// ---------------------------------------------------------------------------------------
// #167 — `.project-docs.json` is theirs: a run that moves `version` moves that
// one line and nothing else. The file used to come back re-serialised in the
// script's own style, so a Biome-formatted file (short arrays on one line)
// failed the adopter's own gate one commit after it had been formatted.
// ---------------------------------------------------------------------------------------

/** The file as Biome leaves it: 2-space, short arrays collapsed, long ones expanded. */
const BIOME_STYLE_CONFIG = `{
  "docsRoot": "docs",
  "version": "6.3.0",
  "lint": {
    "adopting": true,
    "exclude": [],
    "durable": [
      "architecture",
      "specifications",
      "interaction-design",
      "playbooks",
      "lessons-learned",
      "memories"
    ],
    "workbench": [
      "backlog",
      "briefs",
      "investigations",
      "projects",
      "reports",
      "fragments",
      "cycles"
    ],
    "types": {},
    "skip": ["_archive", "superpowers"]
  }
}
`;

/** The lines that differ between two texts, as [index, before, after]. */
const changedLines = (before: string, after: string): Array<[number, string, string]> => {
  const a = before.split("\n");
  const b = after.split("\n");
  const out: Array<[number, string, string]> = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    if (a[i] !== b[i]) out.push([i, a[i] ?? "<none>", b[i] ?? "<none>"]);
  return out;
};

describe("#167 — .project-docs.json keeps its bytes when only `version` moves", () => {
  test("a Biome-style file, committed: the run changes the version line and no other", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      ...PROPOSAL,
      ".project-docs.json": BIOME_STYLE_CONFIG,
    });
    const cfgPath = join(root, ".project-docs.json");
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    const after = readFileSync(cfgPath, "utf8");
    expect(changedLines(BIOME_STYLE_CONFIG, after)).toEqual([
      [2, '  "version": "6.3.0",', `  "version": "${target()}",`],
    ]);
    expect(after).toContain('"skip": ["_archive", "superpowers"]');
    expect(readJson(cfgPath).version).toBe(target());
    expect(r.out).toContain(`.project-docs.json set to ${target()} — that one key; every other byte as it was`);
    // The config phase had nothing to add, so it is the version phase alone that wrote.
    expect(r.out).toContain("already complete — nothing to add");
  });

  test("a nested `version` ahead of the top-level one, and a value that reads `version`, are left alone", () => {
    const text = BIOME_STYLE_CONFIG.replace(
      '  "docsRoot": "docs",\n',
      '  "custom": { "version": "keep-me" },\n  "note": "version",\n  "docsRoot": "docs",\n'
    );
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      ...PROPOSAL,
      ".project-docs.json": text,
    });
    const cfgPath = join(root, ".project-docs.json");
    expect(migrate(root).exitCode).toBe(0);
    const after = readFileSync(cfgPath, "utf8");
    expect(changedLines(text, after)).toEqual([
      [4, '  "version": "6.3.0",', `  "version": "${target()}",`],
    ]);
    const cfg = readJson(cfgPath);
    expect(cfg.custom.version).toBe("keep-me");
    expect(cfg.note).toBe("version");
  });

  test("when the key cannot be patched in place the file is re-serialised, the phase says so, and the indent is kept", () => {
    // `"version"` is `"version"` to JSON.parse and to nothing that reads
    // the text — the one shape a valid file can take that the patch must
    // decline, so this is the fallback's witness.
    const text = `${JSON.stringify(JSON.parse(BIOME_STYLE_CONFIG), null, 4)}\n`.replace(
      '"version"',
      '"\\u0076ersion"'
    );
    expect(JSON.parse(text).version).toBe("6.3.0");
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      ...PROPOSAL,
      ".project-docs.json": text,
    });
    const cfgPath = join(root, ".project-docs.json");
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain(
      `.project-docs.json set to ${target()} — re-serialised, indent kept: no top-level "version" to patch in place`
    );
    const after = readFileSync(cfgPath, "utf8");
    expect(readJson(cfgPath).version).toBe(target());
    expect(after.startsWith('{\n    "docsRoot"')).toBe(true);
  });

  test("the config phase adding keys to a tab-indented file keeps the tabs", () => {
    const text = `{\n\t"docsRoot": "docs",\n\t"custom": {\n\t\t"version": "keep-me"\n\t}\n}\n`;
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      ...PROPOSAL,
      ".project-docs.json": text,
    });
    const cfgPath = join(root, ".project-docs.json");
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("every existing key left as it was, indent kept");
    const after = readFileSync(cfgPath, "utf8");
    expect(after.startsWith('{\n\t"docsRoot": "docs",\n\t"custom": {\n\t\t"version": "keep-me"\n\t},')).toBe(true);
    expect(after.endsWith("\n")).toBe(true);
    const cfg = readJson(cfgPath);
    expect(cfg.custom.version).toBe("keep-me");
    expect(cfg.lint.adopting).toBe(true);
    expect(cfg.version).toBe(target());
  });
});

describe("#167 — patchTopLevelVersion, and the v2.9 copy of it", () => {
  /** Every shape the patch must handle; the pin below runs each through both copies. */
  const CASES: Array<[string, string, string | null]> = [
    ["2-space, first key", '{\n  "version": "1",\n  "a": 1\n}\n', '{\n  "version": "2",\n  "a": 1\n}\n'],
    ["4-space, last key, no final newline", '{\n    "a": [1, 2],\n    "version": "1"\n}', '{\n    "a": [1, 2],\n    "version": "2"\n}'],
    ["tabs", '{\n\t"version":\t"1"\n}\n', '{\n\t"version":\t"2"\n}\n'],
    ["minified", '{"a":{"version":"x"},"version":"1"}', '{"a":{"version":"x"},"version":"2"}'],
    ["a nested key before the top-level one", '{\n  "c": { "version": "keep" },\n  "version": "1"\n}\n', '{\n  "c": { "version": "keep" },\n  "version": "2"\n}\n'],
    ["a value that reads version", '{\n  "note": "version",\n  "version": "1"\n}\n', '{\n  "note": "version",\n  "version": "2"\n}\n'],
    ["an escaped quote in an earlier value", '{\n  "t": "say \\"version\\": no",\n  "version": "1"\n}\n', '{\n  "t": "say \\"version\\": no",\n  "version": "2"\n}\n'],
    ["a null value", '{ "version": null, "a": 1 }', '{ "version": "2", "a": 1 }'],
    ["a number value", '{ "version": 7 }', '{ "version": "2" }'],
    ["the key inside an array element", '{ "list": ["version"], "version": "1" }', '{ "list": ["version"], "version": "2" }'],
    ["no top-level key", '{ "a": { "version": "1" } }', null],
    ["a key spelled with an escape", '{ "\\u0076ersion": "1" }', null],
    ["an object value", '{ "version": { "x": 1 } }', null],
    ["a top-level array", '["version", "1"]', null],
  ];

  test.each(CASES)("%s", (_name, before, after) => {
    const patched = patchTopLevelVersion(before, "2");
    expect(patched).toBe(after);
    if (after !== null) {
      const want = JSON.parse(before);
      want.version = "2";
      expect(JSON.parse(patched as string)).toEqual(want);
    }
  });

  test("the v2.9 script's copy agrees on every case, and so does reserialiseLike", () => {
    for (const [, before] of CASES) expect(v29Patch(before, "2")).toBe(patchTopLevelVersion(before, "2"));
    for (const before of ['{\n    "a": 1\n}\n', '{\n\t"a": 1\n}', "{}", '{"a":1}'])
      expect(v29Reserialise({ a: 1, version: "2" }, before)).toBe(reserialiseLike({ a: 1, version: "2" }, before));
  });

  test("reserialiseLike takes the indent and the final newline from the file", () => {
    expect(reserialiseLike({ a: 1 }, '{\n    "z": 0\n}\n')).toBe('{\n    "a": 1\n}\n');
    expect(reserialiseLike({ a: 1 }, '{\n\t"z": 0\n}')).toBe('{\n\t"a": 1\n}');
    expect(reserialiseLike({ a: 1 }, "{}")).toBe('{\n  "a": 1\n}');
  });
});

// ---------------------------------------------------------------------------------------
// The codemod's two newest buckets (#165 needsConversion, #169 slideDecks) are
// printed by the script's phase 5 as their own lines, in the driver's words —
// never folded into "skipped". Both are "nothing left to mark", so the
// end-of-run invariant that the codemod has nothing left to do still holds.
// ---------------------------------------------------------------------------------------

describe("phase 5 prints the codemod's needsConversion and slideDecks buckets", () => {
  test("a foreign-frontmatter file and a Slidev deck each get their own lines, and the run still completes", () => {
    const root = withFiles(fixtureA({ undeclaredFolder: false }), {
      ...PROPOSAL,
      "docs/playbooks/deploy.md": "---\nowner: ops\n---\n\n# Deploy\n\nHow.\n",
      "docs/reports/2026-09-01-deck.md": "---\ntheme: seriph\nlayout: cover\n---\n\n# Deck\n",
    });
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("Migration complete.");
    expect(r.out).toContain(
      "1 skipped file(s) need conversion — an existing block with no `type`, or a `type` this folder does not allow. Not a backfill: rewrite the block by hand, then re-run:"
    );
    expect(r.out).toContain("docs/playbooks/deploy.md  (no type)");
    expect(r.out).toContain(
      "1 file(s) look like slide decks rather than documents — consider `lint.exclude`:"
    );
    expect(r.out).toContain("docs/reports/2026-09-01-deck.md");
    expect(r.out).toContain('See docs/SCHEMA.md § "Files that are not documentation".');
    // Neither file was marked: both blocks are left exactly as they were.
    expect(readFileSync(join(root, "docs/playbooks/deploy.md"), "utf8")).toStartWith("---\nowner: ops\n---\n");
    expect(readFileSync(join(root, "docs/reports/2026-09-01-deck.md"), "utf8")).toStartWith("---\ntheme: seriph\n");
  });
});
