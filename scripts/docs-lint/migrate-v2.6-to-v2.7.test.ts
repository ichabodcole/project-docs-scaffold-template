// The migration script carries its own copy of the folder → type table, because
// it runs inside a repository that has not adopted the layer yet and can import
// nothing from it. A copy that nobody compares is a copy that drifts, and the
// half that drifts is always the one further from the tests — so this compares
// them, and derives the rest of its cases from the same tables.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  DURABLE_TYPE as LINT_DURABLE,
  PROJECT_FILE_TYPE as LINT_PROJECT_FILE,
  PROJECT_SPEC,
  ROOT_PAGE_TYPE as LINT_ROOT_PAGE,
  SPEC,
} from "../../docs/lint.ts";
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
  main,
  stripConsumedMetadata,
  titleOf,
  typeOf,
} from "../../plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.6-to-v2.7.ts";

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
      Object.entries(SPEC).map(([folder, spec]) => [folder, spec.type]),
    );
    expect(WORKBENCH_TYPE).toEqual(fromLint);
  });

  test("every lifecycle vocabulary", () => {
    const fromLint: Record<string, string[]> = {};
    for (const spec of Object.values(SPEC)) if (spec.lifecycle) fromLint[spec.type] = spec.lifecycle;
    for (const [type, spec] of Object.entries(PROJECT_SPEC))
      if (spec.lifecycle) fromLint[type] = spec.lifecycle;
    expect(LIFECYCLE).toEqual(fromLint);
  });

  test("the types that carry none", () => {
    const fromLint = new Set<string>([
      ...Object.values(LINT_DURABLE),
      ...Object.values(LINT_ROOT_PAGE),
    ]);
    for (const spec of Object.values(SPEC)) if (spec.lifecycle === null) fromLint.add(spec.type);
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
        expect({ type, raw, mapped, ok: LIFECYCLE[type]?.includes(mapped) }).toEqual({
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
    expect(titleOf("# Investigation: Wiki tooling boundary\n", "investigation")).toBe(
      "Wiki tooling boundary",
    );
  });

  test("keeps a subject that merely looks like a label", () => {
    expect(titleOf("# Investigation tooling boundary\n", "proposal")).toBe(
      "Investigation tooling boundary",
    );
  });

  test("handles the hyphenated types", () => {
    expect(titleOf("# Design Resolution: Sync model\n", "design-resolution")).toBe("Sync model");
  });

  test("no H1, no title", () => {
    expect(titleOf("Just prose.\n", "memory")).toBeNull();
  });
});

describe("lifecycleOf — the bold status line it is about to remove", () => {
  test("the same word means different things in different folders", () => {
    expect(lifecycleOf("**Status:** Completed\n", "proposal").value).toBe("implemented");
    expect(lifecycleOf("**Status:** Completed\n", "plan").value).toBe("completed");
    expect(lifecycleOf("**Status:** Completed\n", "investigation").value).toBe("concluded");
  });

  // Invented by hand in three proposals because the vocabulary had no word.
  test("the hand-invented values the tree actually contains", () => {
    expect(lifecycleOf("**Status:** Approved (in flight)\n", "proposal").value).toBe("approved");
    expect(lifecycleOf("**Status:** Approved (shipped)\n", "proposal").value).toBe("implemented");
  });

  // A wrong lifecycle is worse than a missing one: the missing one shows up in
  // --report, and the wrong one looks like an answer.
  test("an unmapped status is reported, never guessed", () => {
    const { value, raw } = lifecycleOf("**Status:** Percolating\n", "proposal");
    expect(value).toBeNull();
    expect(raw).toBe("Percolating");
  });

  test("an unfilled template pick-list is not a status", () => {
    expect(lifecycleOf("**Status:** Draft | Active | Completed\n", "plan").value).toBe("draft");
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
    expect(stripConsumedMetadata(body)).toBe("# A Proposal\n\n## Overview\n\nText.\n");
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
    expect(readFileSync(join(root, "docs/projects/x/proposal.md"), "utf8")).toBe(proposal);
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
    expect(readFileSync(join(root, "docs/projects/x/proposal.md"), "utf8")).not.toContain(
      "description:",
    );
  });

  test("running it twice changes nothing the second time", () => {
    const root = fixture({ "docs/projects/x/proposal.md": proposal });
    run(root);
    const once = readFileSync(join(root, "docs/projects/x/proposal.md"), "utf8");
    run(root);
    expect(readFileSync(join(root, "docs/projects/x/proposal.md"), "utf8")).toBe(once);
  });

  test("READMEs, templates and contract pages are left alone", () => {
    const readme = "# Memories\n\nWhat goes here.\n";
    const root = fixture({
      "docs/memories/README.md": readme,
      "docs/memories/TEMPLATE.md": "# [Title]\n",
      "docs/README.md": readme,
    });
    run(root);
    expect(readFileSync(join(root, "docs/memories/README.md"), "utf8")).toBe(readme);
    expect(readFileSync(join(root, "docs/README.md"), "utf8")).toBe(readme);
  });

  test("_archive is not touched", () => {
    const old = "# Old thing\n\n**Status:** Completed\n";
    const root = fixture({ "docs/projects/_archive/y/proposal.md": old });
    run(root);
    expect(readFileSync(join(root, "docs/projects/_archive/y/proposal.md"), "utf8")).toBe(old);
  });

  test("a file that already has frontmatter is skipped, not rewritten", () => {
    const marked = "---\ntype: proposal\ntitle: Already\n---\n\n# Already\n";
    const root = fixture({ "docs/projects/x/proposal.md": marked });
    run(root);
    expect(readFileSync(join(root, "docs/projects/x/proposal.md"), "utf8")).toBe(marked);
  });

  // The config's own backfill: a project that has never seen the file gets one,
  // set to `adopting` so its first lint reports rather than blocks.
  test("it creates .project-docs.json when there is none", () => {
    const root = fixture({ "docs/memories/a.md": "# A\n" });
    run(root);
    const cfg = JSON.parse(readFileSync(join(root, ".project-docs.json"), "utf8"));
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
    expect(readFileSync(join(root, "documentation/memories/a.md"), "utf8")).toContain("type: memory");
  });

  test("and lint.exclude, so one list governs both tools", () => {
    const root = fixture({
      ".project-docs.json": JSON.stringify({
        docsRoot: "docs",
        lint: { exclude: ["docs/**/*-prototype.md"] },
      }),
      "docs/projects/x/artifacts/marp-prototype.md": "---\nmarp: true\n---\n\n# Deck\n",
      "docs/memories/a.md": "# A\n",
    });
    run(root);
    expect(readFileSync(join(root, "docs/projects/x/artifacts/marp-prototype.md"), "utf8")).toBe(
      "---\nmarp: true\n---\n\n# Deck\n",
    );
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
    expect(block).toBe("---\ntype: memory\nstatus: stable\ngenerated: { by: unknown, at: 2026-01-01 }\n---\n\n");
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
