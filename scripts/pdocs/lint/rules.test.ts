// The gate's own tests.
//
// Each case below is a fixture tree in a temp directory, because the thing
// worth testing is what the lint says about a SHAPE of document, and asserting
// that against this repository's real corpus would mean rewriting the test
// every time a document is added.
//
// Every rule takes a `Ctx` for exactly this reason.

import { afterAll, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import {
  type Ctx,
  DURABLE_TYPE,
  PROJECT_FILE_TYPE,
  SPEC,
  catalogEntries,
  context,
  frontmatterSyntaxProblems,
  graphTier,
  hookChecks,
  isTemplate,
  libraryFieldChecks,
  reportLines,
  schemaLifecycles,
  schemaTableChecks,
  thinTier,
} from "./rules.ts";
import { DEFAULT_CONFIG } from "../docs-lint/config.ts";
import { childEnv } from "../test-env.ts";
import { buildRegistry } from "./registry.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const SCHEMA = readFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), "utf8");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

/** A fixture repository: `.project-docs.json`, a docs root, and the files given. */
function fixture(
  files: Record<string, string>,
  config?: Record<string, unknown>
): Ctx {
  const root = mkdtempSync(join(tmpdir(), "docs-lint-"));
  roots.push(root);
  writeFileSync(
    join(root, ".project-docs.json"),
    JSON.stringify({
      docsRoot: "docs",
      version: "1.0.0",
      lint: { adopting: false, ...config },
    })
  );
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return context(root);
}

const fm = (fields: Record<string, string>) =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n`;

const GENERATED = "{ by: test, at: 2026-09-03 }";

// ---------------------------------------------------------------------------------------

describe("the thin tier — presence and vocabulary", () => {
  test("a proposal with a lifecycle outside its vocabulary", () => {
    const ctx = fixture({
      "docs/projects/x/proposal.md":
        fm({
          type: "proposal",
          title: "X",
          description: "A thing.",
          status: "stable",
          lifecycle: "shipped",
          generated: GENERATED,
        }) + "# X\n",
    });
    const problems = thinTier(ctx);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("BAD LIFECYCLE");
    expect(problems[0]).toContain('"shipped"');
    // The message names the vocabulary, because a reader who got it wrong does
    // not know what the right answers are.
    expect(problems[0]).toContain("implemented");
  });

  test("the same value is fine on a plan, which has a different vocabulary", () => {
    const ctx = fixture({
      "docs/projects/x/plan.md":
        fm({
          type: "plan",
          title: "X",
          description: "A thing.",
          status: "stable",
          lifecycle: "active",
          generated: GENERATED,
        }) + "# X\n",
    });
    expect(thinTier(ctx)).toEqual([]);
  });

  // A session is a record of a moment. A lifecycle on it invites the edit that
  // destroys what the document is for, so it is an error rather than an option.
  test("a session carrying a lifecycle at all", () => {
    const ctx = fixture({
      "docs/projects/x/sessions/2026-09-03-a.md":
        fm({
          type: "session",
          title: "A",
          description: "A session.",
          status: "stable",
          lifecycle: "completed",
          generated: GENERATED,
        }) + "# A\n",
    });
    const problems = thinTier(ctx);
    expect(problems.some((p) => p.startsWith("LIFECYCLE"))).toBe(true);
  });

  test("a document whose type does not match its position", () => {
    const ctx = fixture({
      "docs/briefs/2026-09-03-a.md":
        fm({
          type: "investigation",
          title: "A",
          description: "A brief.",
          status: "stable",
          lifecycle: "active",
          generated: GENERATED,
        }) + "# A\n",
    });
    expect(thinTier(ctx).some((p) => p.startsWith("WRONG TYPE"))).toBe(true);
  });

  test("`status` accepts only OKF's three values", () => {
    const ctx = fixture({
      "docs/reports/2026-09-03-a.md":
        fm({
          type: "report",
          title: "A",
          description: "A report.",
          status: "approved",
          generated: GENERATED,
        }) + "# A\n",
    });
    const problems = thinTier(ctx);
    expect(problems.some((p) => p.startsWith("BAD STATUS"))).toBe(true);
  });

  test("a field nobody declared", () => {
    const ctx = fixture({
      "docs/reports/2026-09-03-a.md":
        fm({
          type: "report",
          title: "A",
          description: "A report.",
          status: "stable",
          generated: GENERATED,
          reviewer: "someone",
        }) + "# A\n",
    });
    expect(
      thinTier(ctx).some(
        (p) => p.includes("UNKNOWN FIELD") && p.includes('"reviewer"')
      )
    ).toBe(true);
  });

  // `updated` means "when the content last changed", which is the one thing a
  // frozen record never does. Rejected rather than ignored so a document cannot
  // carry two disagreeing dates.
  test("a legacy date field is rejected, not ignored", () => {
    const ctx = fixture({
      "docs/reports/2026-09-03-a.md":
        fm({
          type: "report",
          title: "A",
          description: "A report.",
          status: "stable",
          generated: GENERATED,
          updated: "2026-09-04",
        }) + "# A\n",
    });
    expect(thinTier(ctx).some((p) => p.startsWith("LEGACY FIELD"))).toBe(true);
  });

  test("`generated` must be the OKF 0.2 mapping, not a scalar", () => {
    const ctx = fixture({
      "docs/reports/2026-09-03-a.md":
        fm({
          type: "report",
          title: "A",
          description: "A report.",
          status: "stable",
          generated: "2026-09-03",
        }) + "# A\n",
    });
    expect(thinTier(ctx).some((p) => p.startsWith("BAD GENERATED"))).toBe(true);
  });

  test("a README carries no frontmatter and is not asked for any", () => {
    const ctx = fixture({
      "docs/reports/README.md": "# Reports\n\nWhat goes here.\n",
    });
    expect(thinTier(ctx)).toEqual([]);
  });

  test("a template is skipped entirely, placeholder links and all", () => {
    const ctx = fixture({
      "docs/reports/TEMPLATE.md":
        "# [Title]\n\nSee [the plan](../projects/<name>/plan.md).\n",
    });
    expect(thinTier(ctx)).toEqual([]);
    expect(isTemplate("YYYY-MM-DD-TEMPLATE-investigation.md")).toBe(true);
    expect(isTemplate("DEV_KICKOFF.template.md")).toBe(true);
    expect(isTemplate("proposal.md")).toBe(false);
  });

  test("links are checked on documents and on the folder READMEs alike", () => {
    const ctx = fixture({
      "docs/reports/README.md": "# Reports\n\nSee [nothing](./nowhere.md).\n",
    });
    expect(thinTier(ctx).some((p) => p.startsWith("MISSING FILE"))).toBe(true);
  });
});

describe("lint.exclude — files that are not documentation", () => {
  // A Slidev deck is a program that happens to be Markdown: `theme`,
  // `paginate` and `layout` belong to the slide renderer, not to this schema.
  // The honest move is to say it is not a document, rather than widen the
  // vocabulary until it fits.
  const deck =
    "---\nmarp: true\ntheme: default\npaginate: true\n---\n\n# Slide one\n";

  test("an excluded file is invisible to the thin tier", () => {
    const ctx = fixture(
      { "docs/projects/x/artifacts/marp-prototype.md": deck },
      { exclude: ["docs/projects/*/artifacts/*-prototype.md"] }
    );
    expect(thinTier(ctx)).toEqual([]);
  });

  test("without the exclusion the same file is a wall of unknown fields", () => {
    const ctx = fixture({
      "docs/projects/x/artifacts/marp-prototype.md": deck,
    });
    const problems = thinTier(ctx);
    expect(problems.some((p) => p.startsWith("UNKNOWN FIELD"))).toBe(true);
    expect(problems.some((p) => p.startsWith("MISSING type"))).toBe(true);
  });

  test("an excluded file is invisible to the library tier too", () => {
    const ctx = fixture(
      {
        "docs/index.md":
          fm({
            type: "index",
            title: "Catalog",
            description: "The catalog.",
            tags: "[catalog]",
            status: "stable",
            generated: GENERATED,
          }) + "# Catalog\n",
        "docs/memories/deck.md": deck,
        "docs/SCHEMA.md": "# Contract\n",
      },
      { exclude: ["docs/memories/deck.md"] }
    );
    expect(graphTier(ctx).problems).toEqual([]);
  });

  test("and to --report, which must agree with the tiers about what exists", () => {
    const ctx = fixture(
      { "docs/memories/deck.md": deck, "docs/briefs/2026-09-03-a.md": "# A\n" },
      { exclude: ["docs/memories/**"] }
    );
    expect(libraryFieldChecks(ctx)).toEqual([]);
    expect(reportLines(ctx).join("\n")).toContain("1 missing field(s)");
  });

  test("`**` crosses segments, `*` does not", () => {
    const files = {
      "docs/briefs/2026-09-03-a.md": "# A\n",
      "docs/projects/x/sessions/2026-09-03-b.md": "# B\n",
    };
    expect(thinTier(fixture(files, { exclude: ["docs/**"] }))).toEqual([]);
    // One segment deep only: the session two levels down is still walked.
    expect(thinTier(fixture(files, { exclude: ["docs/*/*.md"] }))).toHaveLength(
      1
    );
  });

  test("no exclusions is the default, and costs nothing", () => {
    const ctx = fixture({ "docs/briefs/2026-09-03-a.md": "# A\n" });
    expect(ctx.config.lint.exclude).toEqual([]);
    expect(thinTier(ctx)).toHaveLength(1);
  });

  // The two cases about THIS repository's own exclusions — that its
  // `.project-docs.json` carries them, and that the cookiecutter payload's
  // literal braces are escaped — live in `repo-config.test.ts`, which is not
  // mirrored. They are claims about one repository: a generated project has
  // neither a `dist/` nor a payload directory to exclude.
  //
  // And the brace case CANNOT live here. Cookiecutter renders every payload
  // file through Jinja, so a mirrored source file carrying Jinja's own
  // double-brace delimiters is rewritten on generation: the literal this test
  // needs came out the other side as the generated project's slug, and the
  // assertion failed there while passing here. Nothing under `scripts/` in the
  // payload may contain those delimiters, and `check-mirror.sh` now says so.
});

describe("frontmatter a real YAML parser would reject", () => {
  const doc = (description: string) =>
    `---\ntype: report\ntitle: A\ndescription: ${description}\nstatus: stable\ngenerated: { by: t, at: 2026-09-03 }\n---\n\n# A\n`;

  // The lenient parser here splits on the first colon and hands back the rest
  // as a string, so the document passes the gate and breaks in the next tool.
  test("an unquoted value containing a colon-space", () => {
    const ctx = fixture({
      "docs/reports/2026-09-03-a.md": doc(
        "finalize-branch stopped assuming: it verifies capability."
      ),
    });
    const problems = frontmatterSyntaxProblems(ctx);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("BAD SCALAR");
    expect(problems[0]).toContain("`description`");
  });

  test("the same value, quoted, is fine", () => {
    const ctx = fixture({
      "docs/reports/2026-09-03-a.md": doc(
        '"finalize-branch stopped assuming: it verifies capability."'
      ),
    });
    expect(frontmatterSyntaxProblems(ctx)).toEqual([]);
  });

  test("a colon with no space after it is not a mapping", () => {
    const ctx = fixture({
      "docs/reports/2026-09-03-a.md": doc("Ratios of 3:1 and up."),
    });
    expect(frontmatterSyntaxProblems(ctx)).toEqual([]);
  });

  test("`generated: { by, at }` is a flow mapping, not a loose scalar", () => {
    const ctx = fixture({
      "docs/reports/2026-09-03-a.md": doc("A plain sentence."),
    });
    expect(frontmatterSyntaxProblems(ctx)).toEqual([]);
  });

  test("templates and READMEs are not read here either", () => {
    const ctx = fixture({ "docs/reports/TEMPLATE.md": doc("Broken: yes.") });
    expect(frontmatterSyntaxProblems(ctx)).toEqual([]);
  });

  // A trailing comment is not part of the value. This check used to test the raw
  // text after the colon, so the first real page to carry `status: draft # OKF
  // §5.4: draft | stable | deprecated` was reported as broken frontmatter — by a
  // rule about a hazard that was in the comment, not in the value.
  test("an inline comment containing a colon is not part of the scalar", () => {
    const ctx = fixture({
      "docs/reports/2026-09-04-a.md":
        "---\ntype: report\ntitle: A\ndescription: A report.\n" +
        "status: draft # OKF \u00a75.4: draft | stable | deprecated\n" +
        "generated: { by: t, at: 2026-09-03 }\n---\n\n# A\n",
    });
    expect(frontmatterSyntaxProblems(ctx)).toEqual([]);
    expect(thinTier(ctx)).toEqual([]);
  });

  test("a `#` inside a quoted value is still part of the value, not a comment", () => {
    const ctx = fixture({
      "docs/reports/2026-09-04-b.md":
        '---\ntype: report\ntitle: B\ndescription: "Tagged #urgent: act now"\n' +
        "status: stable\ngenerated: { by: t, at: 2026-09-03 }\n---\n\n# B\n",
    });
    expect(frontmatterSyntaxProblems(ctx)).toEqual([]);
  });
});

describe("at most one cycle is active", () => {
  const cycle = (title: string, lifecycle: string) =>
    fm({
      type: "cycle",
      title,
      description: `The ${title} cycle.`,
      status: "stable",
      lifecycle,
      generated: GENERATED,
      scope: "[project/x]",
    }) + `# ${title}\n`;

  test("one is fine", () => {
    const ctx = fixture({
      "docs/cycles/2026-09-a.md": cycle("A", "active"),
      "docs/cycles/2026-08-b.md": cycle("B", "closed"),
    });
    expect(thinTier(ctx)).toEqual([]);
  });

  // Two active cycles mean the answer to "what are we doing" is a list, which
  // is the state a cycle exists to prevent.
  test("two is the one thing a cycle exists to prevent", () => {
    const ctx = fixture({
      "docs/cycles/2026-09-a.md": cycle("A", "active"),
      "docs/cycles/2026-09-b.md": cycle("B", "active"),
    });
    const problems = thinTier(ctx);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("TWO ACTIVE CYCLES");
  });
});

describe("the graph tier — reachability and the catalog", () => {
  const page = (title: string, description: string) =>
    fm({
      type: "memory",
      title,
      description,
      tags: "[a-tag]",
      status: "stable",
      generated: GENERATED,
    }) + `# ${title}\n`;

  const index = (entries: string) =>
    fm({
      type: "index",
      title: "Catalog",
      description: "The catalog.",
      tags: "[catalog]",
      status: "stable",
      generated: GENERATED,
    }) + `# Catalog\n\n${entries}\n`;

  test("a library page nothing links to is an orphan", () => {
    const ctx = fixture({
      "docs/index.md": index("- [A](./memories/a.md) — The A memory."),
      "docs/memories/a.md": page("A", "The A memory."),
      "docs/memories/b.md": page("B", "The B memory."),
      "docs/SCHEMA.md": "# Contract\n",
    });
    expect(graphTier(ctx).problems.length).toBeGreaterThan(0);
  });

  test("everything catalogued is clean", () => {
    const ctx = fixture({
      "docs/index.md": index(
        "- [A](./memories/a.md) — The A memory.\n- [B](./memories/b.md) — The B memory."
      ),
      "docs/memories/a.md": page("A", "The A memory."),
      "docs/memories/b.md": page("B", "The B memory."),
      "docs/SCHEMA.md": "# Contract\n",
    });
    expect(graphTier(ctx).problems).toEqual([]);
  });

  // Nobody re-reads the catalog, so a hook that has drifted from the page it
  // describes survives every review of the page itself.
  test("a catalog hook that no longer says what the page says", () => {
    const ctx = fixture({
      "docs/index.md": index(
        "- [A](./memories/a.md) — Something else entirely."
      ),
      "docs/memories/a.md": page("A", "The A memory."),
      "docs/SCHEMA.md": "# Contract\n",
    });
    expect(graphTier(ctx).problems.length).toBeGreaterThan(0);
  });

  test("a README in a library folder is a contract page, not an orphan", () => {
    const ctx = fixture({
      "docs/index.md": index("- [A](./memories/a.md) — The A memory."),
      "docs/memories/a.md": page("A", "The A memory."),
      "docs/memories/README.md": "# Memories\n\nWhat goes here.\n",
      "docs/SCHEMA.md": "# Contract\n",
    });
    expect(graphTier(ctx).problems).toEqual([]);
  });

  test("a template in a library folder is not walked at all", () => {
    const ctx = fixture({
      "docs/index.md": index("- [A](./memories/a.md) — The A memory."),
      "docs/memories/a.md": page("A", "The A memory."),
      "docs/memories/TEMPLATE.md":
        "# [Title]\n\nSee [x](./does-not-exist.md).\n",
      "docs/SCHEMA.md": "# Contract\n",
    });
    expect(graphTier(ctx).problems).toEqual([]);
  });
});

describe("catalogEntries", () => {
  test("reads a link and its hook", () => {
    expect(catalogEntries("- [A](./memories/a.md) — The A memory.")).toEqual([
      { target: "memories/a.md", hook: "The A memory." },
    ]);
  });

  // Prettier is free to break a long entry across lines, and a matcher reading
  // one physical line at a time silently skips exactly the longest entries.
  test("folds a Prettier-wrapped continuation into the entry above it", () => {
    const wrapped =
      "- [A page with a long name](./memories/a.md) — A hook that\n  wrapped.";
    expect(catalogEntries(wrapped)).toEqual([
      { target: "memories/a.md", hook: "A hook that wrapped." },
    ]);
  });

  test("ignores table rows and inline links", () => {
    expect(catalogEntries("| a | [b](./c.md) |\n\nSee [d](./e.md).")).toEqual(
      []
    );
  });

  test("a page with no description is not compared", () => {
    const pages = [
      {
        path: "",
        rel: "index.md",
        fields: new Map(),
        body: "- [A](./a.md) — Anything.",
      },
      { path: "", rel: "a.md", fields: new Map<string, string>(), body: "" },
    ];
    expect(hookChecks(pages)).toEqual([]);
  });
});

describe("the contract and the code agree", () => {
  // Two statements of one rule drift, and the one that drifts is always the
  // prose, because nothing checks it. This is what checks it.
  test("SCHEMA.md's table matches the SPEC the lint enforces", () => {
    expect(schemaTableChecks(SCHEMA)).toEqual([]);
  });

  test("the table's header row is not read as a type", () => {
    expect(schemaLifecycles(SCHEMA).has("type")).toBe(false);
  });

  test("every type the lint knows is documented, and vice versa", () => {
    const stated = schemaLifecycles(SCHEMA);
    expect(stated.get("proposal")).toContain("implemented");
    expect(stated.get("session")).toBeNull();
    expect(stated.get("memory")).toBeNull();
  });

  test("a table that disagrees is caught", () => {
    const broken = SCHEMA.replace(
      "| `active` · `spent`",
      "| `active` · `finished`"
    );
    expect(
      schemaTableChecks(broken).some((p) => p.startsWith("SCHEMA DISAGREES"))
    ).toBe(true);
  });

  test("a table that omits a type the lint enforces is caught", () => {
    const broken = SCHEMA.split("\n")
      .filter((l) => !l.startsWith("| `brief`"))
      .join("\n");
    expect(
      schemaTableChecks(broken).some((p) => p.startsWith("SCHEMA MISSING TYPE"))
    ).toBe(true);
  });

  test("no table at all is a problem, not silence", () => {
    expect(schemaTableChecks("# Nothing here\n")).toHaveLength(1);
  });
});

describe("--report", () => {
  test("groups by field, then by folder, and counts documents not problems", () => {
    const ctx = fixture({
      "docs/briefs/2026-09-03-a.md": "# A\n\nNo frontmatter.\n",
      "docs/briefs/2026-09-03-b.md": "# B\n\nNo frontmatter either.\n",
      "docs/reports/2026-09-03-c.md":
        fm({
          type: "report",
          title: "C",
          status: "stable",
          generated: GENERATED,
        }) + "# C\n",
    });
    const out = reportLines(ctx).join("\n");
    expect(out).toContain("3 missing field(s) across 3 of 3 document(s)");
    expect(out).toContain("frontmatter  (2)");
    expect(out).toContain("docs/briefs/");
    expect(out).toContain("description  (1)");
    // Named, not just counted. A worklist that says "two files somewhere under
    // docs/briefs/ are missing frontmatter" is not a worklist — you had to
    // re-implement the check to find them.
    expect(out).toContain("2026-09-03-a.md");
    expect(out).toContain("2026-09-03-b.md");
  });

  // A broken link is a defect to fix, not a blank to fill. Listing it in the
  // one report that never fails is how it stops being fixed.
  test("a broken link is not a missing field", () => {
    const ctx = fixture({
      "docs/reports/2026-09-03-a.md":
        fm({
          type: "report",
          title: "A",
          description: "A report.",
          status: "stable",
          generated: GENERATED,
        }) + "# A\n\nSee [x](./nowhere.md).\n",
    });
    expect(reportLines(ctx).join("\n")).toContain("0 missing field(s)");
  });

  test("the library's missing fields are reported too, not just the workbench's", () => {
    const ctx = fixture({ "docs/memories/a.md": "# A\n\nNo frontmatter.\n" });
    expect(
      libraryFieldChecks(ctx).some((p) => p.startsWith("NO FRONTMATTER"))
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------
// Every template must produce a document that passes.
// ---------------------------------------------------------------------------------------

/** Every `.md` under docs/ whose name says TEMPLATE, which is the lint's own rule. */
function templatePaths(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "_archive" || entry === "node_modules") continue;
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) templatePaths(abs, out);
    else if (entry.endsWith(".md") && isTemplate(entry)) out.push(abs);
  }
  return out;
}

/**
 * Fill a template's placeholders the way a writer would.
 *
 * Only the frontmatter is rendered: the body's placeholder links
 * (`../projects/project-name/proposal.md`) are what a template is FOR, and
 * substituting them would mean inventing a project tree to point at. Link
 * problems are filtered from the result below, and nothing else is.
 */
function render(body: string): string {
  const m = /^---\n([\s\S]*?)\n---/.exec(body);
  if (!m) return body;
  const filled = (m[1] as string)
    .replace(/YYYY-MM-DD/g, "2026-09-03")
    .replace(/"\[[^"]*\]"/g, '"A filled-in placeholder."')
    .replace(/\[([a-z][a-z0-9-]*)\]/g, "$1");
  return body.replace(m[0], `---\n${filled}\n---`);
}

/** Where a document of this `type` has to live for its position to declare it. */
function pathFor(type: string): string {
  for (const [folder, t] of Object.entries(DURABLE_TYPE))
    if (t === type) return `docs/${folder}/page.md`;
  for (const [folder, spec] of Object.entries(SPEC))
    if (spec.type === type) return `docs/${folder}/2026-09-03-page.md`;
  for (const [file, t] of Object.entries(PROJECT_FILE_TYPE))
    if (t === type) return `docs/projects/x/${file}`;
  if (type === "session") return "docs/projects/x/sessions/2026-09-03-a.md";
  if (type === "artifact") return "docs/projects/x/artifacts/a.md";
  throw new Error(`no home for type "${type}"`);
}

describe("every template renders into a document that passes", () => {
  const templates = templatePaths(join(REPO_ROOT, "docs"));

  // A template the lint skips is a template nothing checks. This is what keeps
  // one honest without gating on a file that cannot pass as it stands.
  test("there are templates to check", () => {
    expect(templates.length).toBeGreaterThanOrEqual(18);
  });

  test.each(templates.map((p) => [p.slice(REPO_ROOT.length + 1), p] as const))(
    "%s",
    (_name, abs) => {
      const rendered = render(readFileSync(abs, "utf8"));
      const type = /^type:\s*(\S+)/m.exec(rendered)?.[1];
      expect(type).toBeDefined();

      const target = pathFor(type as string);
      const durable = Object.values(DURABLE_TYPE).includes(type as string);

      if (durable) {
        const description =
          /^description:\s*"([^"]*)"/m.exec(rendered)?.[1] ?? "";
        const ctx = fixture({
          [target]: rendered,
          "docs/index.md":
            fm({
              type: "index",
              title: "Catalog",
              description: "The catalog.",
              tags: "[catalog]",
              status: "stable",
              generated: GENERATED,
            }) +
            `# Catalog\n\n- [Page](./${target.slice("docs/".length)}) — ${description}\n`,
          "docs/SCHEMA.md": "# Contract\n",
        });
        // The library tier checks links too, so a template whose body links a
        // placeholder would fail here for a reason that is not the template's
        // fault. Give it a body with no links.
        const noLinks = rendered.replace(/\]\([^)]*\)/g, "]");
        writeFileSync(join(ctx.repoRoot, target), noLinks);
        expect(graphTier(ctx).problems).toEqual([]);
        return;
      }

      const ctx = fixture({ [target]: rendered });
      const problems = thinTier(ctx).filter(
        (p) => !/^MISSING (FILE|ANCHOR)/.test(p)
      );
      expect(problems).toEqual([]);
    }
  );
});

/**
 * The library went six phases without any of these, and nothing said so:
 * `SCHEMA.md` claimed the graph tier checked "everything Thin checks, plus" the
 * graph obligations, and `thinTier` was the only thing that checked any of it.
 * A cold-read agent found the gap by trying `status: approved` on a memory —
 * the exact hand-invented value the whole layer exists to make impossible — and
 * getting `docs-lint: clean`.
 *
 * Every case below is one that passed before the fix.
 */
describe("the library gets the same field rules as the workbench", () => {
  const memory = (frontmatter: string) => ({
    "docs/index.md":
      "---\ntype: index\ntitle: C\ndescription: The catalog.\ntags: [c]\n" +
      "status: stable\ngenerated: { by: t, at: 2026-09-03 }\n---\n\n" +
      "# C\n\n## Memories\n\n- [A](./memories/a.md) — The A memory.\n",
    "docs/memories/a.md": `---\n${frontmatter}\n---\n\n# A\n`,
  });
  const good =
    "type: memory\ntitle: A\ndescription: The A memory.\ntags: [a]\n" +
    "status: stable\ngenerated: { by: t, at: 2026-09-03 }";

  test("the baseline is clean, so every failure below is the change", () => {
    expect(libraryFieldChecks(fixture(memory(good)))).toEqual([]);
  });

  test.each([
    [
      "status outside OKF's three",
      good.replace("status: stable", "status: approved"),
      "BAD STATUS",
    ],
    [
      "status absent entirely",
      good.replace("status: stable\n", ""),
      "MISSING status",
    ],
    [
      "a lifecycle on a type that carries none",
      `${good}\nlifecycle: completed`,
      "LIFECYCLE",
    ],
    [
      "a type that disagrees with the folder",
      good.replace("type: memory", "type: lesson"),
      "WRONG TYPE",
    ],
    [
      "a tag that is not kebab-case",
      good.replace("tags: [a]", "tags: [Bad_Tag]"),
      "BAD TAG",
    ],
    ["a field nobody declared", `${good}\nowner: someone`, "UNKNOWN FIELD"],
    ["a legacy date field", `${good}\ndate: 2026-01-01`, "LEGACY FIELD"],
    [
      "a malformed generated.at",
      good.replace("at: 2026-09-03", "at: 09/03/2026"),
      "BAD generated",
    ],
    [
      "no tags at all — required here, unlike the workbench",
      good.replace("tags: [a]\n", ""),
      "MISSING tags",
    ],
  ])("catches %s", (_label, frontmatter, expected) => {
    const problems = libraryFieldChecks(fixture(memory(frontmatter)));
    expect(problems.join("\n")).toContain(expected);
  });

  // The one rule the two tiers genuinely disagree about, and the reason
  // `documentProblems` takes a flag rather than reading the tier from the path.
  test("tags are required in the library and optional on the workbench", () => {
    const noTags = good.replace("tags: [a]\n", "");
    expect(libraryFieldChecks(fixture(memory(noTags))).join("\n")).toContain(
      "MISSING tags"
    );
    const session = fixture({
      "docs/projects/x/sessions/2026-09-03-a.md":
        "---\ntype: session\ntitle: A\ndescription: A session.\n" +
        "status: stable\ngenerated: { by: t, at: 2026-09-03 }\n---\n\n# A\n",
    });
    expect(thinTier(session)).toEqual([]);
  });
});

describe("what the modes tell you", () => {
  // "0 missing across 0 documents" was indistinguishable from having scanned
  // nothing at all.
  test("--report says how many documents it looked at", () => {
    const ctx = fixture({
      "docs/briefs/2026-09-03-a.md":
        "---\ntype: brief\ntitle: A\ndescription: A brief.\nstatus: stable\n" +
        "lifecycle: active\ngenerated: { by: t, at: 2026-09-03 }\n---\n\n# A\n",
    });
    expect(reportLines(ctx)[0]).toMatch(/across 0 of \d+ document\(s\)/);
  });
});

describe("--root", () => {
  // The point of `--root` is what the PROCESS does — so these drive the real
  // entry point and read its stdout, rather than reassembling the tiers inside
  // the test and proving nothing about the thing anybody actually runs.
  //
  // `--format text` on every invocation that reads prose: a spawned child gets
  // a pipe, and `resolveFormat` reads a non-TTY stdout as machine output.
  const ENTRY = join(REPO_ROOT, "scripts/pdocs/cli.ts");

  const run = (args: string[], cwd = REPO_ROOT) => {
    const p = Bun.spawnSync(["bun", ENTRY, ...args], { cwd, env: childEnv() });
    return {
      code: p.exitCode,
      stdout: p.stdout.toString(),
      stderr: p.stderr.toString(),
    };
  };

  /**
   * The minimum tree the lint will run against: the real contract, a catalog,
   * and the templates the registry declares.
   *
   * The templates are here and not in `fixture` because only these tests spawn
   * the whole gate — `templateProblems` is part of `collect`, not of a tier, so
   * a test calling `thinTier` directly never sees it. They are derived from the
   * registry rather than listed, and inert on every tier: `isTemplate` skips
   * them by name.
   */
  const templateStubs = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const row of buildRegistry(DEFAULT_CONFIG)) {
      if (row.template === null || row.externalTemplate) continue;
      for (const rel of [row.template].flat())
        out[rel] = "# A Template\n\nA stub. Every tier skips it by name.\n";
    }
    return out;
  };

  const minimal = (extra: Record<string, string> = {}) =>
    fixture({
      ...templateStubs(),
      "docs/SCHEMA.md": SCHEMA,
      "docs/index.md":
        fm({
          type: "index",
          title: "Index",
          description: "The catalog.",
          status: "stable",
          tags: "[index]",
          generated: GENERATED,
        }) + "# Index\n",
      ...extra,
    }).repoRoot;

  test("lints the tree it is given, not this repository", () => {
    const root = minimal();
    const { code, stdout } = run(["check", "--format", "text", "--root", root]);
    expect(code).toBe(0);
    // 2 files, not this repository's corpus — the count is the proof that the
    // walk happened somewhere else.
    expect(stdout).toContain("across 2 files");
    expect(stdout).toContain("docs-lint: clean");
    expect(stdout).not.toContain("PROJECT_MANIFESTO.md");
  });

  test("reports problems found in that tree", () => {
    const root = minimal({
      "docs/projects/x/proposal.md":
        fm({
          type: "proposal",
          title: "X",
          description: "A thing.",
          status: "stable",
          lifecycle: "shipped",
          generated: GENERATED,
        }) + "# X\n",
    });
    const { code, stdout } = run(["check", "--format", "text", "--root", root]);
    // 9, not 1: the run SUCCEEDED and the answer was negative. See
    // `Outcome.Dirty` in `scripts/pdocs/envelope.ts`.
    expect(code).toBe(9);
    expect(stdout).toContain("BAD LIFECYCLE");
    expect(stdout).toContain("docs/projects/x/proposal.md");
    expect(stdout).toContain("docs-lint: 1 problem(s)");
  });

  test("resolves a relative path against the working directory", () => {
    const root = minimal();
    const { code, stdout } = run(
      ["check", "--format", "text", "--root", basename(root)],
      dirname(root)
    );
    expect(code).toBe(0);
    expect(stdout).toContain("across 2 files");
  });

  test("graph and report honour it too", () => {
    const root = minimal();

    const json = run(["graph", "--format", "json", "--root", root]);
    expect(json.code).toBe(0);
    // One, not two: `collectPages` skips contract pages, and `minimal()` is
    // SCHEMA.md plus index.md. The lint's graph tier counted SCHEMA.md as a
    // node; `pdocs graph` stopped inheriting that shape in Phase 5.
    expect(JSON.parse(json.stdout).data.pages).toBe(1);

    const report = run(["report", "--format", "text", "--root", root]);
    expect(report.code).toBe(0);
    expect(report.stdout).toContain("across 0 of 1 document(s)");
  });

  test("a root that does not exist exits 2 rather than falling back", () => {
    const missing = join(tmpdir(), "docs-lint-no-such-root");
    const { code, stdout, stderr } = run(["check", "--root", missing]);
    expect(code).toBe(2);
    expect(stderr).toContain("--root is not a directory");
    expect(stderr).toContain(missing);
    // The failure mode this guards: linting this repository and calling it clean.
    expect(stdout).toBe("");
  });

  test("--root with no value exits 2", () => {
    const { code, stdout, stderr } = run(["check", "--root"]);
    expect(code).toBe(2);
    expect(stderr).toContain("--root needs a path");
    expect(stdout).toBe("");
  });

  test("--root followed by another flag is a missing value, not a path", () => {
    const { code, stderr } = run(["check", "--root", "--json"]);
    expect(code).toBe(2);
    expect(stderr).toContain("--root needs a path");
  });

  // Not an assertion that this repository is clean — that is `npm run docs:lint`'s
  // job, and duplicating it here would make the unit suite fail for a reason
  // that has nothing to do with `--root`.
  test("with no --root at all it still walks this repository", () => {
    const { stdout } = run(["check", "--format", "text"]);
    expect(stdout).toContain("library (graph tier)");
    expect(stdout).not.toContain("across 2 files");
  });
});

// ---------------------------------------------------------------------------------------

describe("a project that declares its own document types", () => {
  const runbook =
    fm({
      type: "runbook",
      title: "Restart the Queue",
      description: "Bring the job queue back after a wedged deploy.",
      tags: "[ops]",
      status: "stable",
      generated: GENERATED,
    }) + "# Restart the Queue\n";

  const catalog = (entries: string) =>
    fm({
      type: "index",
      title: "Catalog",
      description: "The catalog.",
      tags: "[catalog]",
      status: "stable",
      generated: GENERATED,
    }) + `# Catalog\n\n${entries}\n`;

  test("a declared folder's pages carry the type it names", () => {
    const ctx = fixture(
      { "docs/runbooks/restart-the-queue.md": runbook },
      {
        types: { runbooks: "runbook" },
        workbench: [...DEFAULT_CONFIG.lint.workbench, "runbooks"],
      }
    );
    expect(thinTier(ctx)).toEqual([]);
  });

  test("withdrawing the declaration restores the rejection", () => {
    // The perturbation test for the one above: without it, a passing check
    // proves the lint is quiet rather than that it is looking.
    const ctx = fixture(
      { "docs/runbooks/restart-the-queue.md": runbook },
      { workbench: [...DEFAULT_CONFIG.lint.workbench, "runbooks"] }
    );
    expect(thinTier(ctx).some((p) => p.startsWith("WRONG TYPE"))).toBe(true);
  });

  test("a declared type may be durable, and carries the catalog obligation", () => {
    const ctx = fixture(
      {
        "docs/index.md": catalog(""),
        "docs/runbooks/restart-the-queue.md": runbook,
      },
      {
        types: { runbooks: "runbook" },
        durable: [...DEFAULT_CONFIG.lint.durable, "runbooks"],
      }
    );
    expect(
      graphTier(ctx).problems.some((p) => String(p).includes("ORPHAN"))
    ).toBe(true);
  });

  test("catalogued, the same durable page is clean", () => {
    const ctx = fixture(
      {
        "docs/index.md": catalog(
          "- [Restart the Queue](./runbooks/restart-the-queue.md) — Bring the job queue back after a wedged deploy."
        ),
        "docs/runbooks/restart-the-queue.md": runbook,
      },
      {
        types: { runbooks: "runbook" },
        durable: [...DEFAULT_CONFIG.lint.durable, "runbooks"],
      }
    );
    expect(graphTier(ctx).problems).toEqual([]);
  });

  test("a declaration colliding with a built-in folder is ignored", () => {
    const ctx = fixture(
      { "docs/playbooks/a-playbook.md": runbook },
      { types: { playbooks: "runbook" } }
    );
    expect(thinTier(ctx).concat(graphTier(ctx).problems.map(String)).join("\n"))
      .not.toContain("runbook\" (its position says \"runbook\")");
  });
});
