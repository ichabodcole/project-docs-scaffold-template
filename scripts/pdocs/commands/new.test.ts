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
import { stripCode } from "../docs-lint/index.ts";
import { ExitCode } from "../envelope.ts";
import { childEnv } from "../test-env.ts";
import { type RegistryRow, buildRegistry } from "../lint/registry.ts";
import {
  catalogEntry,
  frontmatterShapes,
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
const CREATABLE = ROWS.filter((r) => r.creatable);

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
    `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`
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
  Bun.spawnSync(["git", "init", "-q"], { cwd: root });
  return root;
}

/** Project-scoped creatable rows, in the registry's own order. */
const PROJECT_ROWS = CREATABLE.filter((r) => r.scope === "project");

/**
 * A project holding every project document that comes BEFORE this row.
 *
 * The templates carry two kinds of link. The invented ones — `doc-name.md`,
 * `URL` — are inline code and resolve nothing. The REAL ones are live links a
 * working document is supposed to have: a plan's `./proposal.md`, a session's
 * `../plan.md`. Creating a plan into an empty folder therefore leaves a broken
 * link, and the gate is RIGHT to say so — so the fixture is a real project
 * rather than an empty directory, and each seed is made by the command itself.
 *
 * Seeded in the registry's order, which is generic and needs no list here.
 * Every live link a template carries points BACKWARDS along the authoring
 * order — a plan cites its proposal, a test-plan cites its plan — so seeding
 * in any order that respects those dependencies produces a clean tree, and no
 * case here depends on the two orders coinciding.
 */
function seedProject(root: string, row: RegistryRow): string {
  const slug = "fixture-project";
  mkdirSync(join(root, "docs", "projects", slug), { recursive: true });
  for (const earlier of PROJECT_ROWS) {
    if (earlier.type === row.type) break;
    const seeded = run([
      "new",
      earlier.type,
      `${earlier.type}-seed`,
      "--root",
      root,
      "--project",
      slug,
      "--format",
      "json",
    ]);
    expect(seeded.stderr).toBe("");
  }
  return slug;
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
  if (row.scope === "project") args.push("--project", seedProject(root, row));
  if (Array.isArray(row.template))
    args.push("--variant", variantName(row.template[0] as string));
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

  test("the loop covered every creatable row, and there are 18", () => {
    expect(covered.sort()).toEqual(CREATABLE.map((r) => r.type).sort());
    expect(CREATABLE).toHaveLength(18);
  });
});

describe("pdocs new project — the alias", () => {
  test("makes the folder and its proposal, and the gate stays clean", () => {
    const root = tree();

    const created = run([
      "new",
      "project",
      "oauth upgrade",
      "--root",
      root,
      "--format",
      "json",
    ]);
    expect(created.code).toBe(ExitCode.Success);

    const out = JSON.parse(created.stdout);
    expect(out.ok).toBe(true);
    expect(out.meta.command).toBe("new");
    // The alias resolves to a row; the reported type is the row's, not the word
    // that was typed.
    expect(out.data.type).toBe("proposal");
    expect(out.data.path).toBe("docs/projects/oauth-upgrade/proposal.md");
    expect(out.data.created).toEqual(["docs/projects/oauth-upgrade/proposal.md"]);

    expect(run(["check", "--root", root, "--format", "text"]).code).toBe(
      ExitCode.Success
    );
  });

  test("a project-scoped type then works against that folder", () => {
    const root = tree();
    run(["new", "project", "oauth-upgrade", "--root", root]);
    const plan = run([
      "new",
      "plan",
      "--root",
      root,
      "--project",
      "oauth-upgrade",
      "--format",
      "json",
    ]);
    expect(plan.code).toBe(ExitCode.Success);
    expect(JSON.parse(plan.stdout).data.path).toBe(
      "docs/projects/oauth-upgrade/plan.md"
    );

    // The template carries both kinds of link and `new` copies both verbatim.
    // The real one is live and resolves, because the proposal is really there;
    // the invented one ships as inline code, fixed once in the template rather
    // than rewritten on every invocation.
    const body = readFileSync(
      join(root, "docs/projects/oauth-upgrade/plan.md"),
      "utf8"
    );
    expect(body).toContain("[Link to proposal](./proposal.md)");
    expect(body).not.toContain("`[Link to proposal](./proposal.md)`");
    expect(body).toContain(
      "`[Architecture docs](../../architecture/doc-name.md)`"
    );
    expect(run(["check", "--root", root]).code).toBe(ExitCode.Success);
  });

  test("no template leaves a link that a fresh document cannot resolve", () => {
    // The guard on the template fix, stated where it can fail. Every creatable
    // row's template is read here, not just the ones a workflow happens to
    // exercise: a live link in a template is a promise that the document it
    // seeds will be able to keep, and the only links allowed to make that
    // promise are the ones a project's own documents satisfy.
    const allowed = new Set([
      "./proposal.md",
      "./plan.md",
      "../proposal.md",
      "../plan.md",
    ]);
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

  test("a project-scoped type refuses a project that is not there", () => {
    const root = tree();
    const r = run(["new", "plan", "--root", root, "--project", "nowhere"]);
    expect(r.code).toBe(ExitCode.NotFound);
    expect(r.stderr).toContain("no `nowhere`");
    expect(r.stderr).toContain("pdocs new project nowhere");
  });

  test("a project-scoped type refuses to stand alone", () => {
    const root = tree();
    const r = run(["new", "session", "wiring", "--root", root]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("--project");
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
    expect(r.stderr).toContain("project");
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
  // write `docs/proposal.md`, and report `{"ok": true}` with exit 0. The very
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
    test(`\`new project ${JSON.stringify(name)}\` is refused and writes nothing`, () => {
      const root = tree();
      const before = filesUnder(root);

      const r = run(["new", "project", name, "--root", root, "--format", "json"]);
      expect(r.code).toBe(ExitCode.Usage);
      expect(r.stdout).toBe("");
      expect(filesUnder(root)).toEqual(before);
      // Nothing landed beside the docs root either.
      expect(existsSync(join(root, "proposal.md"))).toBe(false);
    });
  }

  test("`new lesson \"...\"` is refused, catalog included", () => {
    // The same defect with a second face, and the one that made
    // `references/pdocs.md` untrue: it says "a name with no letters or digits
    // in it is a usage error", which held for `"!!!"` and not for `"..."`.
    // `"..."` created `docs/lessons-learned/....md` AND a catalog line for it.
    const root = tree();
    const index = readFileSync(join(root, "docs/index.md"), "utf8");

    const r = run(["new", "lesson", "...", "--root", root]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("needs letters or digits");
    expect(existsSync(join(root, "docs/lessons-learned/....md"))).toBe(false);
    expect(readFileSync(join(root, "docs/index.md"), "utf8")).toBe(index);
  });

  test("`--project` cannot escape either", () => {
    const root = tree();
    run(["new", "project", "oauth-upgrade", "--root", root]);
    const r = run(["new", "plan", "--root", root, "--project", ".."]);
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

describe("pdocs new — `--project` takes what `new project` took", () => {
  test("a name that needed slugging is accepted by both", () => {
    // `new project "My Big Project"` created `my-big-project/`; `new plan
    // --project "My Big Project"` then exited 5 with a diagnostic recommending
    // `pdocs new project My Big Project` — the command that had just worked.
    const root = tree();
    expect(run(["new", "project", "My Big Project", "--root", root]).code).toBe(
      ExitCode.Success
    );

    const plan = run([
      "new",
      "plan",
      "--root",
      root,
      "--project",
      "My Big Project",
      "--format",
      "json",
    ]);
    expect(plan.code).toBe(ExitCode.Success);
    expect(JSON.parse(plan.stdout).data.path).toBe(
      "docs/projects/my-big-project/plan.md"
    );
    expect(run(["check", "--root", root]).code).toBe(ExitCode.Success);
  });

  test("a project that is really not there is still a not-found", () => {
    // The guard against fixing the above by making `--project` create folders.
    const root = tree();
    const r = run(["new", "plan", "--root", root, "--project", "nowhere"]);
    expect(r.code).toBe(ExitCode.NotFound);
  });
});

describe("pdocs new cycle — the registry's own validate predicate", () => {
  test("refuses a scope entry that does not resolve", () => {
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
    expect(r.stderr).toContain("project/not-a-thing");
    expect(existsSync(join(root, "docs/cycles/2026-10-tooling.md"))).toBe(false);
  });

  test("accepts `project/<name>`, which is the documented grammar", () => {
    // THE FORM EVERYTHING ELSE WRITES: `docs/cycles/TEMPLATE.md` seeds `scope:`
    // with `- project/[project-name]`, the design resolution's worked example
    // is `pdocs new cycle 2026-10-tooling --scope project/oauth-upgrade`, and
    // the v2.6→v2.7 guide says the same. It resolved to nothing until
    // `pageAliasKeys` existed, because `pageKey` answers `proposal/proposal`
    // for every project in the tree.
    const root = tree();
    run(["new", "project", "oauth-upgrade", "--root", root]);
    const r = run([
      "new",
      "cycle",
      "2026-10-tooling",
      "--root",
      root,
      "--scope",
      "project/oauth-upgrade",
    ]);
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    expect(readFileSync(join(root, "docs/cycles/2026-10-tooling.md"), "utf8")).toContain(
      "scope: [project/oauth-upgrade]"
    );
    expect(run(["check", "--root", root]).code).toBe(ExitCode.Success);
  });

  test("accepts a `type/slug` entry that names exactly one document", () => {
    // `project/<name>` is an addition, not a replacement: the library-tier form
    // the rest of the tree uses still has to resolve.
    const root = tree();
    run(["new", "backlog", "a-thing", "--root", root]);
    const r = run([
      "new",
      "cycle",
      "2026-10-tooling",
      "--root",
      root,
      "--scope",
      `backlog/${today()}-a-thing`,
    ]);
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
  });

  test("refuses a key that names every project and identifies none", () => {
    // `proposal/proposal` is what `--scope` used to accept and ONLY accept.
    // It is not scope, it is a category: with two projects in the tree it
    // matches both, and with one it is still not the project's name.
    const root = tree();
    run(["new", "project", "oauth-upgrade", "--root", root]);
    run(["new", "project", "billing-rewrite", "--root", root]);
    const r = run([
      "new",
      "cycle",
      "2026-10-tooling",
      "--root",
      root,
      "--scope",
      "proposal/proposal",
    ]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("names 2 documents");
    expect(r.stderr).toContain("project/<name>");
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
      "backlog",
      "an-item",
      "--root",
      root,
      "--appetite",
      "a week",
    ]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("--appetite is not a field of `backlog`");
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
    const backlog = JSON.parse(
      run(["new", "backlog", "an-item", "--root", root, "--format", "json"])
        .stdout
    ).data.path;
    expect(backlog).toBe(`docs/backlog/${today()}-an-item.md`);

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

    // The variant really chose the template.
    expect(readFileSync(join(root, second), "utf8")).toContain(
      "# [Domain Name] Specification"
    );
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
      run(["new", "backlog", "an-item", "--root", root, "--format", "json"])
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
      "investigation",
      "oauth",
      "--root",
      root,
      "--title",
      "OAuth Investigation",
    ]);
    const source = `docs/investigations/${today()}-oauth-investigation.md`;

    const made = run([
      "new",
      "project",
      "oauth-upgrade",
      "--root",
      root,
      "--from",
      source,
    ]);
    expect(made.stderr).toBe("");
    expect(made.code).toBe(ExitCode.Success);

    const body = readFileSync(
      join(root, "docs/projects/oauth-upgrade/proposal.md"),
      "utf8"
    );
    expect(body).toContain(
      `- [OAuth Investigation](../../investigations/${today()}-oauth-investigation.md)`
    );
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
    run(["new", "lesson", "a-lesson", "--root", root, "--by", "claude-opus-5"]);
    const body = readFileSync(join(root, "docs/lessons-learned/a-lesson.md"), "utf8");
    expect(body).toContain(`generated: { by: claude-opus-5, at: ${today()} }`);
    expect(body).not.toContain("YYYY-MM-DD }");
  });

  test("a description with a colon is quoted, so a real YAML parser agrees", () => {
    const root = tree();
    run([
      "new",
      "memory",
      "a-memory",
      "--root",
      root,
      "--description",
      "The gate learned a rule: state the contract, then check it.",
    ]);
    const body = readFileSync(
      join(root, `docs/memories/${today()}-a-memory.md`),
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
      "backlog",
      "an-item",
      "--root",
      root,
      "--lifecycle",
      "shipped",
    ]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("open | done | promoted | dropped");
  });

  test("a lifecycle on a frozen record is refused", () => {
    const root = tree();
    const r = run([
      "new",
      "report",
      "a-report",
      "--root",
      root,
      "--lifecycle",
      "active",
    ]);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("frozen record");
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

  test("a long entry wraps without breaking the link", () => {
    const lines = catalogEntry(
      "A Fairly Long Playbook Title",
      "./playbooks/a-fairly-long-playbook-title-playbook.md",
      "A description long enough that Prettier would certainly wrap it onto a second line."
    );
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toContain(
      "](./playbooks/a-fairly-long-playbook-title-playbook.md) —"
    );
    for (const line of lines.slice(1)) expect(line.startsWith("  ")).toBe(true);
  });
});
