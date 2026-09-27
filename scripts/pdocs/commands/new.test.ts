// `pdocs new`, end to end — and the loop that is the actual point of the phase.
//
// THE TABLE IS THE REGISTRY. `buildRegistry` decides which types are exercised,
// so a type added later is covered without anyone remembering to add it here,
// and a type the registry has failed to declare cannot quietly go untested.
// For every creatable row: create one into a fresh tree, then run the real gate
// over that tree and demand `clean`. That asserts the WRITER and the CHECKER
// agree, which is the whole reason `new` and the lint read one table.
//
// The fixture tree is assembled here rather than copied from this repository.
// A copy would drag in every link `docs/` makes out to `plugins/` and the root
// README — the plan measured 32 spurious `MISSING FILE`s from exactly that —
// and would make the tests depend on the working tree being clean. What gets
// copied is only what the registry NAMES: `SCHEMA.md`, and every template a row
// declares.

import { afterAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DEFAULT_CONFIG } from "../docs-lint/config.ts";
import { parseFrontmatter, stripCode } from "../docs-lint/index.ts";
import { ExitCode } from "../envelope.ts";
import { childEnv } from "../test-env.ts";
import { FIELD_VALUES, type RegistryRow, buildRegistry } from "../lint/registry.ts";
import {
  catalogEntry,
  frontmatterShapes,
  stripFrontmatterComments,
  insertCatalogEntry,
  resolveFilename,
  slugify,
  titleFromSlug,
  today,
  variantName,
  wrap,
} from "./new.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");
const ROWS = buildRegistry(DEFAULT_CONFIG);

/**
 * The defaults, with the legacy folders still listed in the tiers — the shape
 * this repository's own `.project-docs.json` has until it migrates. The
 * defaults themselves are the new layout, and these tests create legacy types.
 */
const FIXTURE_CONFIG = {
  ...DEFAULT_CONFIG,
  lint: {
    ...DEFAULT_CONFIG.lint,
    durable: [...DEFAULT_CONFIG.lint.durable, "lessons-learned", "memories"],
    workbench: [...DEFAULT_CONFIG.lint.workbench],
  },
};
const CREATABLE = ROWS.filter((r) => r.creatable);

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

/**
 * The CLI, with every `new` filling what a template leaves for the writer. The
 * lint reports a document still holding its template's `description`, `tags`,
 * H1 or a cycle's `appetite` (PLACEHOLDER), so a fixture that skipped them
 * would fail every `check` below for a reason no test here is about. A test
 * that passes its own flag keeps it; `runBare` passes none.
 */
function run(args: string[]) {
  if (args[0] === "new") {
    const fill = (flag: string, value: string) => {
      if (!args.includes(flag)) args = [...args, flag, value];
    };
    // The title `new` would default to, passed explicitly so it also fills
    // the H1 — tests below still read the default in `title:` and links.
    const row = ROWS.find((r) => r.type === args[1]);
    const name = args[2] !== undefined && !args[2].startsWith("--") ? args[2] : undefined;
    let title = "Fixture Document";
    try {
      if (row && name) title = titleFromSlug(row, slugify(name));
    } catch {
      // A name `slugify` refuses: the test is about that refusal.
    }
    fill("--title", title);
    fill("--description", "A document the pdocs new tests wrote.");
    fill("--tags", "fixture");
    if (args[1] === "cycle") fill("--appetite", "When the fixture is done.");
  }
  return runBare(args);
}

/** The CLI exactly as called. */
function runBare(args: string[]) {
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

const page = (fm: Record<string, string>, body = ""): string =>
  `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n${body}\n`;

/** The library folders, from the registry — the same list `index.md` needs a
 *  heading for. */
const LIBRARY_FOLDERS = [
  ...new Set(
    ROWS.filter((r) => r.tier === "library" && r.scope === "docs").map(
      (r) => r.folder
    )
  ),
];

/**
 * A tree with nothing in it but the contract, an empty catalog, and every
 * template the registry declares.
 *
 * The catalog carries one section per library folder, each with the
 * `_No pages yet._` placeholder the real `index.md` uses, and each blurb links
 * that folder's README — which is how `insertCatalogEntry` finds the section,
 * so the fixture exercises the real lookup rather than a simplified one.
 */
function tree(): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-new-"));
  roots.push(root);
  const docs = join(root, "docs");

  writeFileSync(
    join(root, ".project-docs.json"),
    `${JSON.stringify(FIXTURE_CONFIG, null, 2)}\n`
  );

  mkdirSync(docs, { recursive: true });
  copyFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), join(docs, "SCHEMA.md"));

  for (const folder of LIBRARY_FOLDERS) {
    mkdirSync(join(docs, folder), { recursive: true });
    writeFileSync(
      join(docs, folder, "README.md"),
      `# ${folder}\n\nThe fixture's contract page for this folder.\n`
    );
  }

  writeFileSync(
    join(docs, "index.md"),
    page(
      {
        type: "index",
        title: "Fixture Catalog",
        description: "The catalog for the pdocs new fixture.",
        status: "stable",
        tags: "[fixture]",
        generated: "{ by: new-test, at: 2026-01-01 }",
      },
      `# Fixture Catalog\n\n${LIBRARY_FOLDERS.map(
        (f) =>
          `## ${f}\n\nWhat lives here — see [${f}/README.md](./${f}/README.md).\n\n_No pages yet._\n`
      ).join("\n")}`
    )
  );

  // Only the templates the registry names, at the paths it names them at.
  for (const row of ROWS) {
    if (row.template === null || row.externalTemplate) continue;
    for (const rel of [row.template].flat()) {
      const to = join(root, rel);
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(join(REPO_ROOT, rel), to);
    }
  }

  // `trackedMarkdown` shells out to git; an empty repo pins it to "nothing
  // tracked" instead of letting it find whatever checkout /tmp lives inside.
  Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
  return root;
}

/**
 * A feature to own the owned documents, written by hand so the loop below does
 * not depend on `new feature` (which it also tests, as a row of its own).
 * `new --owner` links the owner's entry file itself (D17), so no template
 * needs a sibling document to exist for its links to resolve.
 */
function makeFeature(root: string, slug: string): string {
  const dir = join(root, "docs", "features", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "feature.md"),
    page(
      {
        type: "feature",
        title: "Fixture Feature",
        description: "The feature the fixture's owned documents belong to.",
        status: "draft",
        lifecycle: "active",
        generated: "{ by: new-test, at: 2026-01-01 }",
      },
      "# Fixture Feature\n"
    )
  );
  return `feature/${slug}`;
}

/**
 * The invocation the row itself dictates — no per-type knowledge here either.
 *
 * `--from` is passed for every type on purpose. The templates spell their
 * Related section five different ways and three of them have none at all, so
 * this is the only place that exercises `appendRelated` against all eighteen.
 * `SCHEMA.md` is the source because the fixture has it and a contract page is a
 * legal link target from either tier.
 */
function invocation(row: RegistryRow, root: string): string[] {
  const args = [
    "new",
    row.type,
    `${row.type}-demo`,
    "--root",
    root,
    "--from",
    "docs/SCHEMA.md",
    "--format",
    "json",
  ];
  if (row.scope === "owner" && !row.namesScope)
    args.push("--owner", makeFeature(root, "fixture-feature"));
  // A key the row requires is passed with the first value its vocabulary
  // allows — `item`'s `--kind`. `id` is minted, never passed.
  for (const key of row.required)
    if (FIELD_VALUES[key]) args.push(`--${key}`, FIELD_VALUES[key]![0] as string);
  if (Array.isArray(row.template))
    args.push("--variant", variantName(row.template[0] as string));
  // Without --title the template's H1 is left for the writer, and the gate
  // reports it (PLACEHOLDER).
  args.push("--title", `${row.type} demo`);
  return args;
}

// ---------------------------------------------------------------------------------------

describe("pdocs new — every creatable type, then the gate", () => {
  const covered: string[] = [];

  for (const row of CREATABLE) {
    test(`${row.type}: created, then \`pdocs check\` is clean`, () => {
      covered.push(row.type);
      const root = tree();

      const created = run(invocation(row, root));
      expect(created.stderr).toBe("");
      expect(created.code).toBe(ExitCode.Success);

      const path = JSON.parse(created.stdout).data.path as string;
      expect(existsSync(join(root, path))).toBe(true);

      // The `--from` link landed — and `pdocs check` below proves it resolves.
      expect(readFileSync(join(root, path), "utf8")).toContain("SCHEMA.md)");

      const checked = run(["check", "--root", root, "--format", "text"]);
      expect(checked.stdout).toContain("docs-lint: clean");
      expect(checked.code).toBe(ExitCode.Success);
    });
  }

  test("the loop covered every creatable row, and there are 14", () => {
    expect(covered.sort()).toEqual(CREATABLE.map((r) => r.type).sort());
    expect(CREATABLE).toHaveLength(14);
  });
});

describe("pdocs new — a project folder, after the alias", () => {
  // `pdocs new project` resolved to the `proposal` row. The proposal is
  // retired in 9.0.0, so the word is no longer a type at all, and nothing is
  // written. A feature is created as itself: `pdocs new feature <slug>`.
  test("`new project` is refused and writes nothing", () => {
    const root = tree();
    const r = run(["new", "project", "oauth upgrade", "--root", root, "--format", "json"]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stdout).toBe("");
    const message: string = JSON.parse(r.stderr).error.message;
    // Not "unknown type": `create-project` still runs this, and the answer has
    // to say what replaced it and how to write one today (review J).
    expect(message).toContain("replaced by `feature`");
    expect(message).toContain("pdocs new feature <slug>");
    expect(existsSync(join(root, "docs/projects/oauth-upgrade"))).toBe(false);
  });

  test("no template leaves a link that a fresh document cannot resolve", () => {
    // The guard on the template fix, stated where it can fail. Every creatable
    // row's template is read here, not just the ones a workflow happens to
    // exercise: a live link in a template is a promise that the document it
    // seeds will be able to keep, and the only links allowed to make that
    // promise are the ones a project's own documents satisfy.
    // None: the owner's entry file is linked by `new --owner` (D17), and a
    // sibling plan is not promised to exist, so both are inline-code notes.
    const allowed = new Set<string>();
    for (const row of CREATABLE) {
      for (const rel of [row.template].flat()) {
        const raw = readFileSync(join(REPO_ROOT, rel as string), "utf8");
        for (const m of stripCode(raw).matchAll(/\]\(([^)]+)\)/g)) {
          const target = (m[1] as string).trim();
          if (/^https?:\/\//.test(target)) continue;
          expect({ template: rel, target }).toEqual({
            template: rel,
            target: allowed.has(target) ? target : "<inline code or a real URL>",
          });
        }
      }
    }
  });

  test("an owned type refuses to stand alone", () => {
    const root = tree();
    const r = run(["new", "session", "wiring", "--root", root]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("--owner");
  });

  test("`--project` is gone: exit 2, naming `--owner`", () => {
    const root = tree();
    makeFeature(root, "oauth-upgrade");
    const r = run(["new", "plan", "--root", root, "--project", "oauth-upgrade"]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain(
      "`--project` was replaced by `--owner feature/<slug>` (or `item/<slug>`)"
    );
    // `--project=x` is the same flag.
    expect(run(["new", "plan", "--root", root, "--project=oauth-upgrade"]).stderr).toContain(
      "was replaced by `--owner"
    );
    expect(existsSync(join(root, "docs/features/oauth-upgrade/plan.md"))).toBe(false);
  });
});

describe("pdocs new — what it refuses to create", () => {
  // Both halves of the plan's "make that refusal explicit and tested, not an
  // accident of a null template", plus the three root pages.
  for (const row of ROWS.filter((r) => !r.creatable)) {
    test(`${row.type}: refused, quoting the registry's reason`, () => {
      const root = tree();
      const r = run(["new", row.type, "whatever", "--root", root]);
      expect(r.code).toBe(ExitCode.Usage);
      expect(r.stderr).toContain(row.uncreatableReason as string);
    });
  }

  test("`new backlog x` is refused: exit 2, and the replacement is named", () => {
    const root = tree();
    const r = run(["new", "backlog", "x", "--root", root, "--format", "json"]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.code).toBe(2);
    expect(r.stdout).toBe("");
    const message: string = JSON.parse(r.stderr).error.message;
    expect(message).toContain("retired in 9.0.0");
    expect(message).toContain("pdocs new item <slug> --kind task");
    expect(existsSync(join(root, "docs/backlog"))).toBe(false);
  });

  test("kickoff and artifact are among them", () => {
    const refused = ROWS.filter((r) => !r.creatable).map((r) => r.type);
    expect(refused).toContain("kickoff");
    expect(refused).toContain("artifact");
    expect(refused).toHaveLength(5);
  });

  test("an unknown type lists the creatable ones", () => {
    const root = tree();
    const r = run(["new", "nonsense", "x", "--root", root]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("unknown type `nonsense`");
    expect(r.stderr).toContain("playbook");
    expect(r.stderr).toContain("plan");
  });

  test("an existing target is a conflict, not an overwrite", () => {
    const root = tree();
    expect(run(["new", "playbook", "rollback", "--root", root]).code).toBe(
      ExitCode.Success
    );
    const before = readFileSync(
      join(root, "docs/playbooks/rollback-playbook.md"),
      "utf8"
    );

    const again = run(["new", "playbook", "rollback", "--root", root]);
    expect(again.code).toBe(ExitCode.Conflict);
    expect(again.stderr).toContain("already exists");
    expect(
      readFileSync(join(root, "docs/playbooks/rollback-playbook.md"), "utf8")
    ).toBe(before);
  });
});

describe("pdocs new — names that try to leave the tree", () => {
  // THE WRITER/CHECKER CONTRACT, tested adversarially. Every other test in this
  // file passes a name a person would type, and the per-type round-trip above
  // cannot see this class at all: it proves `new` then `check` agree, using
  // names both of them are happy with.
  //
  // `pdocs new project ".."` used to resolve to the docs root's own parent,
  // write `docs/proposal.md`, and report `{"ok": true}` with exit 0. The alias
  // is gone; the same names now reach the owner resolution through `--owner feature/…`. The very
  // next `pdocs check` called that document `BAD type` and `ORPHAN` — the two
  // halves of the tool that read one registry precisely so they cannot
  // disagree, disagreeing, because a `.` survived the slug filter and
  // `existsSync` is not a containment check.

  /** Everything under a root, so a write outside the docs tree is visible. */
  function filesUnder(root: string): string[] {
    return [...new Bun.Glob("**/*.md").scanSync({ cwd: root })].sort();
  }

  // `-.-` is deliberately NOT in this list even though `slugify` refuses it:
  // it starts with `-`, so the argument parser calls it an unknown flag and the
  // slug path is never reached. A case that passes for a reason other than the
  // one under test is worse than no case. It is covered in the `slugify` unit
  // test, where it does exercise the rule.
  for (const name of ["..", "...", "../..", "./.."]) {
    test(`\`new plan --owner feature/${name}\` is refused and writes nothing`, () => {
      const root = tree();
      const before = filesUnder(root);

      const r = run(["new", "plan", "--owner", `feature/${name}`, "--root", root, "--format", "json"]);
      expect([ExitCode.Usage, ExitCode.NotFound] as number[]).toContain(r.code as number);
      expect(r.stdout).toBe("");
      expect(filesUnder(root)).toEqual(before);
      // Nothing landed beside the docs root either.
      expect(existsSync(join(root, "plan.md"))).toBe(false);
    });
  }

  test("`new playbook \"...\"` is refused, catalog included", () => {
    // The same defect with a second face, and the one that made
    // `references/pdocs.md` untrue: it says "a name with no letters or digits
    // in it is a usage error", which held for `"!!!"` and not for `"..."`.
    // `"..."` created `docs/lessons-learned/....md` AND a catalog line for it
    // (a lesson then; lessons are retired, and a playbook is the library type
    // that takes a bare name now).
    const root = tree();
    const index = readFileSync(join(root, "docs/index.md"), "utf8");

    const r = run(["new", "playbook", "...", "--root", root]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("needs letters or digits");
    expect(filesUnder(join(root, "docs/playbooks")).filter((f) => !["README.md", "TEMPLATE.md"].includes(f))).toEqual([]);
    expect(readFileSync(join(root, "docs/index.md"), "utf8")).toBe(index);
  });

  test("`--owner` cannot escape either", () => {
    const root = tree();
    makeFeature(root, "oauth-upgrade");
    const r = run(["new", "plan", "--root", root, "--owner", ".."]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(existsSync(join(root, "docs/plan.md"))).toBe(false);
  });

  test("a name with a dot INSIDE it still works — the dot is not the problem", () => {
    const root = tree();
    const r = run([
      "new",
      "playbook",
      "OAuth 2.0 / upgrade",
      "--root",
      root,
      "--format",
      "json",
    ]);
    expect(r.code).toBe(ExitCode.Success);
    expect(JSON.parse(r.stdout).data.path).toBe(
      "docs/playbooks/oauth-2.0-upgrade-playbook.md"
    );
    expect(run(["check", "--root", root]).code).toBe(ExitCode.Success);
  });
});

describe("pdocs new cycle — the registry's own validate predicate", () => {
  // A cycle's scope is derived from the items that name it (the work
  // taxonomy): `scope:` on a cycle is retired, so `new cycle` does not take it.
  test("--scope is refused on a cycle, which no longer lists its scope", () => {
    const root = tree();
    const r = run([
      "new",
      "cycle",
      "2026-10-tooling",
      "--root",
      root,
      "--scope",
      "project/not-a-thing",
    ]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(existsSync(join(root, "docs/cycles/2026-10-tooling.md"))).toBe(false);
  });

  test("refuses to open a second active cycle", () => {
    const root = tree();
    expect(
      run([
        "new",
        "cycle",
        "2026-09-first",
        "--root",
        root,
        "--lifecycle",
        "active",
      ]).code
    ).toBe(ExitCode.Success);

    const second = run([
      "new",
      "cycle",
      "2026-10-second",
      "--root",
      root,
      "--lifecycle",
      "active",
    ]);
    expect(second.code).toBe(ExitCode.Conflict);
    expect(second.stderr).toContain("2026-09-first");
    expect(existsSync(join(root, "docs/cycles/2026-10-second.md"))).toBe(false);

    // Planned is fine — the invariant is about `active`, not about the count.
    expect(run(["new", "cycle", "2026-10-second", "--root", root]).code).toBe(
      ExitCode.Success
    );
    expect(run(["check", "--root", root]).code).toBe(ExitCode.Success);
  });

  test("an extra field belongs to the type that declares it", () => {
    const root = tree();
    const r = run([
      "new",
      "playbook",
      "an-item",
      "--root",
      root,
      "--appetite",
      "a week",
    ]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("--appetite is not a field of `playbook`");
  });
});

describe("pdocs new — the filename grammar", () => {
  test("the suffix a type declares is enforced", () => {
    const root = tree();
    expect(
      JSON.parse(
        run(["new", "playbook", "foo", "--root", root, "--format", "json"])
          .stdout
      ).data.path
    ).toBe("docs/playbooks/foo-playbook.md");
  });

  test("a name that already carries the suffix is not given a second one", () => {
    const root = tree();
    expect(
      JSON.parse(
        run([
          "new",
          "playbook",
          "foo-playbook",
          "--root",
          root,
          "--format",
          "json",
        ]).stdout
      ).data.path
    ).toBe("docs/playbooks/foo-playbook.md");
  });

  test("the date prefix is applied at the precision the row declares", () => {
    const root = tree();
    makeFeature(root, "p");
    const session = JSON.parse(
      run(["new", "session", "an-item", "--owner", "feature/p", "--root", root, "--format", "json"])
        .stdout
    ).data.path;
    expect(session).toBe(`docs/features/p/sessions/${today()}-an-item.md`);

    const cycle = JSON.parse(
      run(["new", "cycle", "tooling", "--root", root, "--format", "json"])
        .stdout
    ).data.path;
    expect(cycle).toBe(`docs/cycles/${today().slice(0, 7)}-tooling.md`);
  });

  test("a name that already carries its date prefix is honoured as written", () => {
    const root = tree();
    expect(
      JSON.parse(
        run([
          "new",
          "cycle",
          "2027-03-tooling",
          "--root",
          root,
          "--format",
          "json",
        ]).stdout
      ).data.path
    ).toBe("docs/cycles/2027-03-tooling.md");
  });

  test("specification numbers pick up after what is already there", () => {
    const root = tree();
    const first = JSON.parse(
      run([
        "new",
        "specification",
        "overview",
        "--root",
        root,
        "--variant",
        "overview",
        "--format",
        "json",
      ]).stdout
    ).data.path;
    expect(first).toBe("docs/specifications/01-overview.md");

    const second = JSON.parse(
      run([
        "new",
        "specification",
        "billing",
        "--root",
        root,
        "--variant",
        "domain",
        "--format",
        "json",
      ]).stdout
    ).data.path;
    expect(second).toBe("docs/specifications/02-billing.md");

    // The variant really chose the template: a section only `domain` has.
    // (`run` passes --title, so the H1 is the title, not the template's.)
    expect(readFileSync(join(root, second), "utf8")).toContain("\n## Data Model\n");
    expect(run(["check", "--root", root]).code).toBe(ExitCode.Success);
  });

  test("a variant is required where a row has more than one template", () => {
    const root = tree();
    const missing = run(["new", "specification", "billing", "--root", root]);
    expect(missing.code).toBe(ExitCode.Usage);
    expect(missing.stderr).toContain("overview|domain");

    const wrong = run([
      "new",
      "specification",
      "billing",
      "--root",
      root,
      "--variant",
      "nope",
    ]);
    expect(wrong.code).toBe(ExitCode.Usage);
    expect(wrong.stderr).toContain("overview, domain");
  });
});

describe("pdocs new — the catalog line", () => {
  test("a library page gets one, and it repeats the description verbatim", () => {
    const root = tree();
    const out = JSON.parse(
      run([
        "new",
        "playbook",
        "rollback",
        "--root",
        root,
        "--description",
        "How to roll a deploy back without losing the audit trail.",
        "--format",
        "json",
      ]).stdout
    );
    expect(out.data.created).toEqual([
      "docs/playbooks/rollback-playbook.md",
      "docs/index.md",
    ]);

    const index = readFileSync(join(root, "docs/index.md"), "utf8");
    expect(index).toContain(
      "- [Rollback](./playbooks/rollback-playbook.md) — How to roll a deploy"
    );
    // The placeholder was REPLACED, not written beneath.
    const section = index.slice(index.indexOf("## playbooks"));
    expect(section.slice(0, section.indexOf("## lessons"))).not.toContain(
      "_No pages yet._"
    );
  });

  test("a second page in the same folder lands under the first", () => {
    const root = tree();
    run(["new", "playbook", "alpha", "--root", root, "--description", "First."]);
    run(["new", "playbook", "beta", "--root", root, "--description", "Second."]);
    const index = readFileSync(join(root, "docs/index.md"), "utf8");
    expect(index.indexOf("alpha-playbook")).toBeLessThan(
      index.indexOf("beta-playbook")
    );
    expect(run(["check", "--root", root]).code).toBe(ExitCode.Success);
  });

  test("a workbench document gets none", () => {
    const root = tree();
    const out = JSON.parse(
      run(["new", "cycle", "tooling", "--root", root, "--format", "json"])
        .stdout
    );
    expect(out.data.created).toHaveLength(1);
  });
});

describe("pdocs new --from", () => {
  test("wires the source document into the Related section", () => {
    const root = tree();
    run([
      "new",
      "playbook",
      "rollback",
      "--root",
      root,
      "--title",
      "Rollback",
    ]);
    makeFeature(root, "oauth-upgrade");
    const source = "docs/playbooks/rollback-playbook.md";

    const made = run([
      "new",
      "plan",
      "--owner",
      "feature/oauth-upgrade",
      "--root",
      root,
      "--from",
      source,
    ]);
    expect(made.stderr).toBe("");
    expect(made.code).toBe(ExitCode.Success);

    const body = readFileSync(
      join(root, "docs/features/oauth-upgrade/plan.md"),
      "utf8"
    );
    expect(body).toContain("- [Rollback](../../playbooks/rollback-playbook.md)");
    expect(run(["check", "--root", root]).code).toBe(ExitCode.Success);
  });

  test("a --from that does not resolve is refused before anything is written", () => {
    const root = tree();
    const r = run([
      "new",
      "playbook",
      "rollback",
      "--root",
      root,
      "--from",
      "docs/nope.md",
    ]);
    expect(r.code).toBe(ExitCode.NotFound);
    expect(existsSync(join(root, "docs/playbooks/rollback-playbook.md"))).toBe(
      false
    );
  });
});

describe("pdocs new — frontmatter", () => {
  test("`generated.at` is today, which the template's placeholder is not", () => {
    const root = tree();
    run(["new", "playbook", "a-playbook", "--root", root, "--by", "claude-opus-5"]);
    const body = readFileSync(join(root, "docs/playbooks/a-playbook.md"), "utf8");
    expect(body).toContain(`generated: { by: claude-opus-5, at: ${today()} }`);
    expect(body).not.toContain("YYYY-MM-DD }");
  });

  test("a description with a colon is quoted, so a real YAML parser agrees", () => {
    const root = tree();
    run([
      "new",
      "playbook",
      "a-rule",
      "--root",
      root,
      "--description",
      "The gate learned a rule: state the contract, then check it.",
    ]);
    const body = readFileSync(
      join(root, "docs/playbooks/a-rule-playbook.md"),
      "utf8"
    );
    expect(body).toContain(
      'description: "The gate learned a rule: state the contract, then check it."'
    );
    expect(run(["check", "--root", root]).code).toBe(ExitCode.Success);
  });

  test("a lifecycle outside the row's vocabulary is refused", () => {
    const root = tree();
    const r = run([
      "new",
      "cycle",
      "an-item",
      "--root",
      root,
      "--lifecycle",
      "shipped",
    ]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("planned | active | closed | abandoned");
  });

  test("a lifecycle on a frozen record is refused", () => {
    const root = tree();
    makeFeature(root, "p");
    const r = run([
      "new",
      "report",
      "a-report",
      "--owner",
      "feature/p",
      "--root",
      root,
      "--lifecycle",
      "active",
    ]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("frozen record");
  });

  test("the template's inline guidance comments are not written (wocky-talky row 4)", () => {
    const root = tree();
    run(["new", "cycle", "tooling", "--root", root]);
    run(["new", "item", "fix-it", "--kind", "bug", "--root", root]);
    for (const rel of [`docs/cycles/${today().slice(0, 7)}-tooling.md`, "docs/items/fix-it.md"]) {
      const block = /^---\n([\s\S]*?)\n---/.exec(readFileSync(join(root, rel), "utf8"))![1]!;
      expect(block).not.toMatch(/\s#\s/);
    }
    const cycle = readFileSync(join(root, `docs/cycles/${today().slice(0, 7)}-tooling.md`), "utf8");
    expect(cycle).toContain("status: draft\n");
    expect(cycle).toContain("lifecycle: planned\n");
    expect(cycle).toContain("after: []\n");
  });

  test("a cycle's `started` is today, unless --started says otherwise", () => {
    const root = tree();
    run(["new", "cycle", "tooling", "--root", root]);
    run(["new", "cycle", "2026-12-later", "--started", "2026-12-01", "--root", root]);
    const month = today().slice(0, 7);
    expect(readFileSync(join(root, `docs/cycles/${month}-tooling.md`), "utf8")).toContain(
      `started: ${today()}\n`
    );
    expect(readFileSync(join(root, "docs/cycles/2026-12-later.md"), "utf8")).toContain(
      "started: 2026-12-01\n"
    );
  });

  test("--tags is a list even where the template has no `tags:` key", () => {
    const root = tree();
    run(["new", "item", "fix-it", "--kind", "bug", "--tags", "a,b", "--root", root]);
    expect(readFileSync(join(root, "docs/items/fix-it.md"), "utf8")).toContain(
      "tags: [a, b]\n"
    );
  });

  test("--title fills the template's H1 as well as `title`", () => {
    const root = tree();
    run(["new", "cycle", "tooling", "--title", "Tooling Cleanup", "--root", root]);
    run(["new", "item", "fix-it", "--kind", "bug", "--title", "Fix the hook", "--root", root]);
    const cycle = readFileSync(join(root, `docs/cycles/${today().slice(0, 7)}-tooling.md`), "utf8");
    expect(cycle).toContain("\n# Tooling Cleanup\n");
    expect(cycle).not.toContain("# [What is in play");
    const item = readFileSync(join(root, "docs/items/fix-it.md"), "utf8");
    expect(item).toContain("\n# Fix the hook\n");
    expect(item).not.toContain("# [Title]");
  });

  test("a fresh cycle with nothing filled in fails the gate; filled in by flags, it passes", () => {
    const root = tree();
    expect(runBare(["new", "cycle", "2026-10-x", "--root", root]).code).toBe(ExitCode.Success);
    const bare = runBare(["check", "--root", root, "--format", "text"]);
    expect(bare.code).not.toBe(ExitCode.Success);
    expect(bare.stdout).toContain("PLACEHOLDER");
    expect(bare.stdout).toContain("`description`");
    expect(bare.stdout).toContain("`tags`");

    // Title, description and tags are not enough: `appetite` is a prompt too.
    const noAppetite = tree();
    runBare([
      "new", "cycle", "2026-10-x", "--root", noAppetite,
      "--title", "Tooling", "--description", "Tidy the tooling.", "--tags", "tooling,cleanup",
    ]);
    const unfilled = runBare(["check", "--root", noAppetite, "--format", "text"]);
    expect(unfilled.code).not.toBe(ExitCode.Success);
    expect(unfilled.stdout).toContain("`appetite`");

    const filled = tree();
    runBare([
      "new", "cycle", "2026-10-x", "--root", filled,
      "--title", "Tooling", "--description", "Tidy the tooling.", "--tags", "tooling,cleanup",
      "--appetite", "When the gate is quiet for a week.",
    ]);
    runBare([
      "new", "item", "fix-it", "--kind", "bug", "--root", filled,
      "--title", "Fix it", "--description", "It is broken.", "--tags", "a,b",
    ]);
    const checked = runBare(["check", "--root", filled, "--format", "text"]);
    expect(checked.stdout).toContain("docs-lint: clean");
  });

  test("without --title the template's H1 is left for the writer, and the gate reports it", () => {
    const root = tree();
    makeFeature(root, "auth-refactor");
    const made = runBare([
      "new", "plan", "--owner", "feature/auth-refactor", "--root", root,
      "--description", "The route to the refactor.", "--tags", "auth",
    ]);
    expect(made.code).toBe(ExitCode.Success);
    const plan = readFileSync(join(root, "docs/features/auth-refactor/plan.md"), "utf8");
    expect(plan).toContain("\n# [Feature Name] Implementation Plan\n");
    const checked = runBare(["check", "--root", root, "--format", "text"]);
    expect(checked.code).not.toBe(ExitCode.Success);
    expect(checked.stdout).toContain("the H1 is still the template's");
  });

  test("tags are written back in the shape the template used", () => {
    const root = tree();
    run(["new", "playbook", "rollback", "--root", root, "--tags", "deploy, ops"]);
    expect(
      readFileSync(join(root, "docs/playbooks/rollback-playbook.md"), "utf8")
    ).toContain("tags: [deploy, ops]");
  });
});

// ---------------------------------------------------------------------------------------
// The pieces, directly
// ---------------------------------------------------------------------------------------

describe("the naming helpers", () => {
  test("slugify is forgiving on input and strict on output", () => {
    expect(slugify("  Rollback Drill  ")).toBe("rollback-drill");
    expect(slugify("OAuth 2.0 / upgrade")).toBe("oauth-2.0-upgrade");
    expect(() => slugify("!!!")).toThrow();
    // A slug is made of letters and digits; `.` and `-` only join them. A name
    // that is nothing but joiners has no slug in it, however non-empty the
    // string looks — and `..` reaching a `join()` is how `pdocs new project`
    // wrote outside the docs tree.
    for (const hostile of ["..", "...", "../..", "./..", "-.-", "  .  "])
      expect(() => slugify(hostile)).toThrow("needs letters or digits");
    expect(slugify("v2.")).toBe("v2");
    expect(slugify(".env-notes")).toBe("env-notes");
  });

  test("variant names are derived from the template filename", () => {
    expect(variantName("docs/specifications/TEMPLATE-domain.md")).toBe("domain");
    expect(variantName("docs/specifications/TEMPLATE-overview.md")).toBe(
      "overview"
    );
  });

  test("a title default drops the grammar the row added", () => {
    const cycle = ROWS.find((r) => r.type === "cycle") as RegistryRow;
    const playbook = ROWS.find((r) => r.type === "playbook") as RegistryRow;
    expect(titleFromSlug(cycle, "2026-10-auth")).toBe("Auth");
    expect(titleFromSlug(playbook, "token-rotation-playbook")).toBe(
      "Token Rotation"
    );
  });

  test("resolveFilename honours a fixed name and ignores the slug", () => {
    const plan = ROWS.find((r) => r.type === "plan") as RegistryRow;
    expect(resolveFilename(plan, "ignored", "/nowhere", "2026-09-06")).toBe(
      "plan.md"
    );
  });

  test("wrap never breaks a token", () => {
    expect(wrap("a bb ccc dddd", 6)).toEqual(["a bb", "ccc", "dddd"]);
    expect(wrap("supercalifragilistic", 6)).toEqual(["supercalifragilistic"]);
  });
});

describe("stripFrontmatterComments", () => {
  test("inline comments go, on keys and on block-list items", () => {
    expect(
      stripFrontmatterComments(
        "status: draft # OKF\n# a whole-line note\nscope:\n  - cli # the hint\n  - 'a # b' # hint"
      )
    ).toBe("status: draft\nscope:\n  - cli\n  - 'a # b'");
  });

  test("a line inside a multi-line quoted scalar is content, even when it starts with #", () => {
    const double = 'description:\n  "Fixes the parser\n  #42 in lexer"\nstatus: draft # c';
    expect(stripFrontmatterComments(double)).toBe(
      'description:\n  "Fixes the parser\n  #42 in lexer"\nstatus: draft'
    );
    const opened = 'description: "Fixes the parser\n  #42 in lexer" # c\nstatus: draft';
    expect(stripFrontmatterComments(opened)).toBe(
      'description: "Fixes the parser\n  #42 in lexer"\nstatus: draft'
    );
    const single = "description: 'It''s the parser\n  # 42'\nstatus: draft";
    expect(stripFrontmatterComments(single)).toBe(single);
  });

  test("a block scalar's lines are content", () => {
    for (const indicator of [">", "|", "|-", ">+"]) {
      const block = `description: ${indicator}\n  Fixes the parser\n  # 42 in lexer\n  and more\nstatus: draft`;
      expect(stripFrontmatterComments(block)).toBe(block);
    }
  });

  test("a # that is not a comment is left alone", () => {
    const safe = 'title: "Exit #2"\nsource: https://x#frag\ndescription: C# notes';
    expect(stripFrontmatterComments(safe)).toBe(safe);
  });
});

describe("frontmatterShapes", () => {
  test("a quoted scalar that looks like a flow sequence is a scalar", () => {
    // The exact defect this function exists for: the parser unquotes, and
    // `"[One sentence: …]"` then reads as a list.
    const shapes = frontmatterShapes(
      [
        'description: "[One sentence: what needs doing.]"',
        "tags: [area] # 2-4 kebab-case keywords",
        "scope:",
        "  - project/thing",
        "after: []",
        "started: 2026-09-06",
      ].join("\n")
    );
    expect(shapes.get("description")).toBe("scalar");
    expect(shapes.get("tags")).toBe("list");
    expect(shapes.get("scope")).toBe("list");
    expect(shapes.get("after")).toBe("list");
    expect(shapes.get("started")).toBe("scalar");
  });
});

describe("insertCatalogEntry", () => {
  const INDEX = [
    "# Catalog",
    "",
    "## Playbooks",
    "",
    "Repeatable procedures. — see [playbooks/README.md](./playbooks/README.md).",
    "",
    "_No pages yet._",
    "",
    "## Memories",
    "",
    "Lately. — see [memories/README.md](./memories/README.md).",
    "",
    "- [One](./memories/one.md) — The first.",
    "",
  ].join("\n");

  test("replaces the placeholder rather than writing beneath it", () => {
    const out = insertCatalogEntry(
      INDEX,
      "playbooks",
      catalogEntry("Foo", "./playbooks/foo-playbook.md", "A hook.")
    );
    expect(out).toContain("- [Foo](./playbooks/foo-playbook.md) — A hook.");
    expect(out.slice(0, out.indexOf("## Memories"))).not.toContain(
      "_No pages yet._"
    );
  });

  test("appends after the entries a section already has", () => {
    const out = insertCatalogEntry(
      INDEX,
      "memories",
      catalogEntry("Two", "./memories/two.md", "The second.")
    );
    expect(out.indexOf("./memories/one.md")).toBeLessThan(
      out.indexOf("./memories/two.md")
    );
  });

  test("a folder with no section is a named failure, not a silent one", () => {
    expect(() =>
      insertCatalogEntry(INDEX, "architecture", ["- x"])
    ).toThrow("no section for `architecture/`");
  });

  test("the dash wraps with the description when it does not fit after the link, as Prettier does", () => {
    // Prettier (proseWrap: always, printWidth 80) on the line `new` used to write.
    expect(
      catalogEntry(
        "Roll Back A Deploy Safely",
        "./playbooks/roll-back-a-deploy-safely-playbook.md",
        "How to roll a deploy back without losing the audit trail or the logs."
      )
    ).toEqual([
      "- [Roll Back A Deploy Safely](./playbooks/roll-back-a-deploy-safely-playbook.md)",
      "  — How to roll a deploy back without losing the audit trail or the logs.",
    ]);
    expect(catalogEntry("A", "./playbooks/a-playbook.md", "Short.")).toEqual([
      "- [A](./playbooks/a-playbook.md) — Short.",
    ]);
  });

  test("a long entry wraps without breaking the link", () => {
    const lines = catalogEntry(
      "A Fairly Long Playbook Title",
      "./playbooks/a-fairly-long-playbook-title-playbook.md",
      "A description long enough that Prettier would certainly wrap it onto a second line."
    );
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toBe(
      "- [A Fairly Long Playbook Title](./playbooks/a-fairly-long-playbook-title-playbook.md)"
    );
    expect(lines[1]).toStartWith("  — A description");
    for (const line of lines.slice(1)) expect(line.startsWith("  ")).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------
// Work items (plan Task 2.3)
// ---------------------------------------------------------------------------------------

const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Frontmatter of a written document, as the lint parses it. */
function fields(root: string, rel: string): Map<string, string> {
  const raw = readFileSync(join(root, rel), "utf8");
  return parseFrontmatter(/^---\n([\s\S]*?)\n---/.exec(raw)![1] as string);
}

/** A feature and a cycle written by hand, and `lint.scopes` declared. */
function workTree(): string {
  const root = tree();
  const config = JSON.parse(readFileSync(join(root, ".project-docs.json"), "utf8"));
  config.lint.scopes = ["lint", "cli"];
  writeFileSync(join(root, ".project-docs.json"), JSON.stringify(config, null, 2));
  const write = (rel: string, body: string) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  write(
    "docs/features/a/feature.md",
    page(
      {
        type: "feature",
        title: "Feature A",
        description: "A fixture feature.",
        status: "draft",
        lifecycle: "active",
        generated: "{ by: new-test, at: 2026-01-01 }",
      },
      "# Feature A\n"
    )
  );
  write(
    "docs/features/a/sessions/2026-01-02-kickoff.md",
    page(
      {
        type: "session",
        title: "Kickoff",
        description: "A fixture session.",
        status: "stable",
        generated: "{ by: new-test, at: 2026-01-02 }",
      },
      "# Kickoff\n"
    )
  );
  write(
    "docs/cycles/2026-09-x.md",
    page(
      {
        type: "cycle",
        title: "Cycle X",
        description: "A fixture cycle.",
        status: "draft",
        lifecycle: "planned",
        generated: "{ by: new-test, at: 2026-01-01 }",
      },
      "# Cycle X\n"
    )
  );
  return root;
}

const newItem = (root: string, ...args: string[]) =>
  run(["new", "item", ...args, "--root", root, "--format", "json"]);

describe("pdocs new item", () => {
  test("writes items/<slug>.md with a v7 id, the kind, `triage`, and `generated`", () => {
    const root = workTree();
    const r = newItem(root, "fix-hook", "--kind", "bug");
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    expect(JSON.parse(r.stdout).data.path).toBe("docs/items/fix-hook.md");

    const f = fields(root, "docs/items/fix-hook.md");
    expect(f.get("type")).toBe("item");
    expect(f.get("id")).toMatch(V7);
    expect(f.get("kind")).toBe("bug");
    expect(f.get("lifecycle")).toBe("triage");
    expect(f.get("generated")).toBe(`{ by: pdocs, at: ${today()} }`);
    expect(run(["check", "--root", root, "--format", "text"]).stdout).toContain(
      "docs-lint: clean"
    );
  });

  test("text output names the new item's short id, 12+ characters (D25)", () => {
    const root = workTree();
    const text = run(["new", "item", "fix-hook", "--kind", "bug", "--root", root, "--format", "text"]).stdout;
    const id = fields(root, "docs/items/fix-hook.md").get("id") as string;
    expect(text).toContain(`id ${id.slice(0, 12)}`);
    expect(text).not.toContain(id);
  });

  test("text output ends with a next step that names the formatter and every file written", () => {
    const root = workTree();
    const text = run(["new", "item", "fix-hook", "--kind", "bug", "--root", root, "--format", "text"]).stdout;
    const last = text.trimEnd().split("\n").at(-1) as string;
    expect(last).toContain("fill its placeholders");
    expect(last).toContain("npx prettier --write docs/items/fix-hook.md");

    // A promotion rewrites links in other files; those need formatting too.
    writeFileSync(
      join(root, "docs/features/a/notes.md"),
      "---\ntype: artifact\ntitle: Notes\ndescription: Notes.\nstatus: draft\ngenerated: { by: t, at: 2026-01-01 }\n---\n\nSee [fix](../../items/fix-hook.md).\n"
    );
    const promoted = run(["new", "plan", "--owner", "item/fix-hook", "--root", root, "--format", "text"]).stdout;
    expect(promoted.trimEnd().split("\n").at(-1)).toContain(
      "npx prettier --write docs/items/fix-hook/plan.md docs/items/fix-hook/item.md docs/features/a/notes.md"
    );
    // JSON output is unchanged: the hint is for a person reading text.
    expect(run(["new", "playbook", "p", "--root", root, "--format", "json"]).stdout).not.toContain("prettier");
  });

  test("JSON output carries the new item's full id, and no id for other types (D25)", () => {
    const root = workTree();
    const data = JSON.parse(newItem(root, "fix-hook", "--kind", "bug").stdout).data;
    expect(data.id).toBe(fields(root, "docs/items/fix-hook.md").get("id"));
    expect(data.id).toMatch(V7);
    const plan = JSON.parse(
      run(["new", "playbook", "rollback", "--root", root, "--format", "json"]).stdout
    ).data;
    expect(plan.id).toBeNull();
  });

  test("two items get two ids", () => {
    const root = workTree();
    newItem(root, "one", "--kind", "task");
    newItem(root, "two", "--kind", "task");
    expect(fields(root, "docs/items/one.md").get("id")).not.toBe(
      fields(root, "docs/items/two.md").get("id")
    );
  });

  test("--kind missing exits 2 and lists the kinds", () => {
    const root = workTree();
    const r = newItem(root, "fix-hook");
    expect(r.code).toBe(ExitCode.Usage);
    const err = JSON.parse(r.stderr).error;
    expect(err.message).toContain("--kind");
    expect(err.choices).toEqual(["task", "bug", "chore", "research"]);
    expect(existsSync(join(root, "docs/items/fix-hook.md"))).toBe(false);
  });

  test("--kind outside the vocabulary exits 2", () => {
    const root = workTree();
    const r = newItem(root, "fix-hook", "--kind", "story");
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("task");
  });

  test("--id is not a flag: pdocs writes the id", () => {
    const root = workTree();
    const r = newItem(root, "x", "--kind", "task", "--id", "0190f4b2-7c3a-7d4e-8f00-00000000000a");
    expect(r.code).toBe(ExitCode.Usage);
  });

  test("--parent must resolve to a feature, through the lint's own resolution", () => {
    const root = workTree();
    const bad = newItem(root, "x", "--kind", "task", "--parent", "feature/nope");
    expect(bad.code).toBe(ExitCode.Usage);
    expect(bad.stderr).toContain("feature/nope");
    expect(existsSync(join(root, "docs/items/x.md"))).toBe(false);

    const ok = newItem(root, "x", "--kind", "task", "--parent", "feature/a");
    expect(ok.code).toBe(ExitCode.Success);
    expect(fields(root, "docs/items/x.md").get("parent")).toBe("feature/a");
  });

  test("--cycle takes the cycle's slug, and refuses one that is not there", () => {
    const root = workTree();
    expect(newItem(root, "x", "--kind", "task", "--cycle", "2026-01-nope").code).toBe(
      ExitCode.Usage
    );
    expect(newItem(root, "x", "--kind", "task", "--cycle", "2026-09-x").code).toBe(
      ExitCode.Success
    );
    expect(fields(root, "docs/items/x.md").get("cycle")).toBe("2026-09-x");
  });

  test("--scope is checked against lint.scopes", () => {
    const root = workTree();
    const bad = newItem(root, "x", "--kind", "task", "--scope", "ui");
    expect(bad.code).toBe(ExitCode.Usage);
    expect(bad.stderr).toContain("lint.scopes");
    expect(newItem(root, "x", "--kind", "task", "--scope", "cli").code).toBe(ExitCode.Success);
    expect(fields(root, "docs/items/x.md").get("scope")).toBe("cli");
  });

  test("--from writes `from:` AND the Related link — one flag, both jobs", () => {
    const root = workTree();
    const r = newItem(
      root,
      "follow-up",
      "--kind",
      "chore",
      "--from",
      "docs/features/a/sessions/2026-01-02-kickoff.md"
    );
    expect(r.stderr).toBe("");
    expect(fields(root, "docs/items/follow-up.md").get("from")).toBe(
      "features/a/sessions/2026-01-02-kickoff.md"
    );
    expect(readFileSync(join(root, "docs/items/follow-up.md"), "utf8")).toContain(
      "[Kickoff](../features/a/sessions/2026-01-02-kickoff.md)"
    );
    expect(run(["check", "--root", root, "--format", "text"]).stdout).toContain(
      "docs-lint: clean"
    );
  });

  test("--from also takes a reference, and writes its full form", () => {
    const root = workTree();
    const r = newItem(root, "from-feature", "--kind", "task", "--from", "feature/a");
    expect(r.stderr).toBe("");
    expect(fields(root, "docs/items/from-feature.md").get("from")).toBe("feature/a");
    expect(readFileSync(join(root, "docs/items/from-feature.md"), "utf8")).toContain(
      "(../features/a/feature.md)"
    );
  });

  test("--blocked-by takes an id prefix and writes the full UUID", () => {
    const root = workTree();
    newItem(root, "first", "--kind", "task");
    const id = fields(root, "docs/items/first.md").get("id") as string;
    const r = newItem(root, "second", "--kind", "task", "--blocked-by", id.slice(0, 13));
    expect(r.stderr).toBe("");
    expect(fields(root, "docs/items/second.md").get("blocked_by")).toBe(`[${id}]`);
    expect(run(["check", "--root", root, "--format", "text"]).stdout).toContain(
      "docs-lint: clean"
    );
  });

  test("--blocked-by with a reference that names nothing exits 2", () => {
    const root = workTree();
    const r = newItem(root, "second", "--kind", "task", "--blocked-by", "item/nope");
    expect(r.code).toBe(ExitCode.Usage);
    expect(existsSync(join(root, "docs/items/second.md"))).toBe(false);
  });

  test("--priority is checked against its vocabulary", () => {
    const root = workTree();
    expect(newItem(root, "x", "--kind", "task", "--priority", "p1").code).toBe(ExitCode.Usage);
    expect(newItem(root, "x", "--kind", "task", "--priority", "high").code).toBe(
      ExitCode.Success
    );
  });
});

// ---------------------------------------------------------------------------------------
// Features and --owner (plan Task 2.4, D17)
// ---------------------------------------------------------------------------------------

describe("pdocs new feature, and --owner", () => {
  const json = (r: { stdout: string }) => JSON.parse(r.stdout).data;
  const clean = (root: string) =>
    expect(run(["check", "--root", root, "--format", "text"]).stdout).toContain(
      "docs-lint: clean"
    );

  test("`new feature <slug>` opens features/<slug>/feature.md", () => {
    const root = workTree();
    const r = run(["new", "feature", "OAuth Upgrade", "--root", root, "--format", "json"]);
    expect(r.stderr).toBe("");
    expect(json(r).path).toBe("docs/features/oauth-upgrade/feature.md");
    const f = fields(root, "docs/features/oauth-upgrade/feature.md");
    expect(f.get("type")).toBe("feature");
    expect(f.get("title")).toBe("Oauth Upgrade");
    clean(root);

    const again = run(["new", "feature", "oauth-upgrade", "--root", root]);
    expect(again.code).toBe(ExitCode.Conflict);
  });

  test("a slug already held by an item — archived or live, file or folder — is refused (review 3)", () => {
    const root = workTree();
    const item = (id: string) =>
      page({
        type: "item",
        title: "Held",
        description: "An item holding the slug.",
        status: "draft",
        lifecycle: "done",
        id,
        kind: "task",
        generated: "{ by: new-test, at: 2026-01-01 }",
      });
    const held: Record<string, string> = {
      "archived-file": "docs/items/_archive/archived-file.md",
      "archived-folder": "docs/items/_archive/archived-folder/item.md",
      "live-folder": "docs/items/live-folder/item.md",
    };
    let n = 0;
    for (const path of Object.values(held)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), item(`0190f4b2-7c3a-7d4e-8f00-00000000000${++n}`));
    }
    for (const [slug, path] of Object.entries(held)) {
      const r = newItem(root, slug, "--kind", "task");
      expect({ slug, code: r.code }).toEqual({ slug, code: ExitCode.Conflict });
      expect(r.stderr).toContain(path);
      expect(existsSync(join(root, `docs/items/${slug}.md`))).toBe(false);
    }
  });

  test("a slug already held by an archived feature is refused (review 3)", () => {
    const root = workTree();
    const path = "docs/features/_archive/old/feature.md";
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(
      join(root, path),
      page({
        type: "feature",
        title: "Old",
        description: "An archived feature.",
        status: "draft",
        lifecycle: "done",
        generated: "{ by: new-test, at: 2026-01-01 }",
      })
    );
    const r = run(["new", "feature", "old", "--root", root]);
    expect(r.code).toBe(ExitCode.Conflict);
    expect(r.stderr).toContain(path);
    expect(existsSync(join(root, "docs/features/old"))).toBe(false);
  });

  test("`new feature --scope` is checked against lint.scopes (review 4)", () => {
    const root = workTree();
    const bad = run(["new", "feature", "x", "--scope", "ui", "--root", root]);
    expect(bad.code).toBe(ExitCode.Usage);
    expect(bad.stderr).toContain("lint.scopes");
    expect(existsSync(join(root, "docs/features/x"))).toBe(false);
    expect(run(["new", "feature", "x", "--scope", "cli", "--root", root]).code).toBe(
      ExitCode.Success
    );
    clean(root);
  });

  test("a feature takes no --owner, and needs a name", () => {
    const root = workTree();
    expect(run(["new", "feature", "x", "--owner", "feature/a", "--root", root]).code).toBe(
      ExitCode.Usage
    );
    expect(run(["new", "feature", "--root", root]).code).toBe(ExitCode.Usage);
  });

  test("`new plan --owner feature/a` writes features/a/plan.md, linked to its owner", () => {
    const root = workTree();
    const r = run(["new", "plan", "--owner", "feature/a", "--root", root, "--format", "json"]);
    expect(r.stderr).toBe("");
    expect(json(r).path).toBe("docs/features/a/plan.md");
    expect(readFileSync(join(root, "docs/features/a/plan.md"), "utf8")).toContain(
      "- [Feature A](./feature.md)"
    );
    clean(root);
  });

  test("`new session --owner item/<prefix>` promotes a single-file item first", () => {
    const root = workTree();
    newItem(root, "b", "--kind", "task");
    const id = fields(root, "docs/items/b.md").get("id") as string;
    const r = run([
      "new",
      "session",
      "kickoff",
      "--owner",
      id.slice(0, 13),
      "--root",
      root,
      "--format",
      "json",
    ]);
    expect(r.stderr).toBe("");
    const data = json(r);
    expect(data.path).toBe(`docs/items/b/sessions/${today()}-kickoff.md`);
    expect(data.promoted).toBe("docs/items/b/item.md");
    expect(existsSync(join(root, "docs/items/b.md"))).toBe(false);
    expect(existsSync(join(root, "docs/items/b/item.md"))).toBe(true);
    expect(readFileSync(join(root, data.path), "utf8")).toContain("- [B](../item.md)");
    clean(root);
  });

  test("`new plan --owner item/b` on a folder item links ./item.md and promotes nothing", () => {
    const root = workTree();
    newItem(root, "b", "--kind", "task");
    run(["promote", "item/b", "--root", root]);
    const r = run(["new", "plan", "--owner", "item/b", "--root", root, "--format", "json"]);
    expect(json(r).path).toBe("docs/items/b/plan.md");
    expect(json(r).promoted).toBeNull();
    expect(readFileSync(join(root, "docs/items/b/plan.md"), "utf8")).toContain("- [B](./item.md)");
    clean(root);
  });

  test("--from the owner item's own file, while promoting it, links where it lands (review 2)", () => {
    const root = workTree();
    newItem(root, "beta", "--kind", "task");
    const r = run([
      "new", "plan", "--owner", "item/beta", "--from", "docs/items/beta.md",
      "--root", root, "--format", "json",
    ]);
    expect(r.stderr).toBe("");
    const body = readFileSync(join(root, "docs/items/beta/plan.md"), "utf8");
    expect(body).not.toContain("../beta.md");
    expect(body).toContain("(./item.md)");
    clean(root);
  });

  test("--from naming the owner itself writes the Related line once (re-review 3)", () => {
    const root = workTree();
    newItem(root, "beta", "--kind", "task");
    run(["new", "plan", "--owner", "item/beta", "--from", "docs/items/beta.md", "--root", root]);
    const body = readFileSync(join(root, "docs/items/beta/plan.md"), "utf8");
    expect(body.split("- [Beta](./item.md)").length - 1).toBe(1);
  });

  test("text output labels what a promotion rewrote, not as catalog lines (re-review 2)", () => {
    const root = workTree();
    newItem(root, "beta", "--kind", "task");
    writeFileSync(
      join(root, "docs/features/a/notes.md"),
      "---\ntype: artifact\ntitle: Notes\ndescription: Notes.\nstatus: draft\ngenerated: { by: t, at: 2026-01-01 }\n---\n\nSee [beta](../../items/beta.md).\n"
    );
    const text = run(["new", "plan", "--owner", "item/beta", "--root", root, "--format", "text"]).stdout;
    expect(text).not.toContain("catalog line");
    expect(text).toContain("promoted its owner to docs/items/beta/item.md");
    expect(text).toContain("rewrote links in docs/features/a/notes.md");
    // A library page still reports its catalog line.
    expect(run(["new", "playbook", "p", "--root", root, "--format", "text"]).stdout).toContain(
      "+ catalog line in docs/index.md"
    );
  });

  test("`created` lists the files an automatic promotion wrote (review 11)", () => {
    const root = workTree();
    newItem(root, "beta", "--kind", "task");
    writeFileSync(
      join(root, "docs/features/a/notes.md"),
      "---\ntype: artifact\ntitle: Notes\ndescription: Notes.\nstatus: draft\ngenerated: { by: t, at: 2026-01-01 }\n---\n\nSee [beta](../../items/beta.md).\n"
    );
    const data = json(
      run(["new", "plan", "--owner", "item/beta", "--root", root, "--format", "json"])
    );
    expect(data.created).toEqual([
      "docs/items/beta/plan.md",
      "docs/items/beta/item.md",
      "docs/features/a/notes.md",
    ]);
    clean(root);
  });

  test("an owner that is not a feature or an item is refused, and nothing moves", () => {
    const root = workTree();
    newItem(root, "b", "--kind", "task");
    for (const owner of ["cycle/2026-09-x", "feature/nope", "item/nope"])
      expect(run(["new", "plan", "--owner", owner, "--root", root]).code).toBe(ExitCode.Usage);
    expect(existsSync(join(root, "docs/items/b.md"))).toBe(true);
  });

  test("a refusal after the owner resolves does not promote the item", () => {
    const root = workTree();
    newItem(root, "b", "--kind", "task");
    const r = run(["new", "plan", "--owner", "item/b", "--lifecycle", "nope", "--root", root]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(existsSync(join(root, "docs/items/b.md"))).toBe(true);
  });

  test("a non-owned type refuses --owner", () => {
    const root = workTree();
    expect(run(["new", "playbook", "x", "--owner", "feature/a", "--root", root]).code).toBe(
      ExitCode.Usage
    );
  });
});
