// The registry's own contract.
//
// Two claims matter more than the rest. The first is that all 23 types are
// present, asserted against a list written out by hand: the registry is
// assembled from five source tables, and a row lost in the assembly is exactly
// the failure that would otherwise turn up as a special case in `pdocs new`
// six months later. The second is that every template a creatable row declares
// is actually on disk — declaring paths created a way to be wrong that did not
// exist before, and this is one of the two guards for it (`templateProblems`,
// which runs inside `pdocs check`, is the other).

import { afterAll, describe, expect, test } from "bun:test";
import {
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
import {
  PROJECT_FILE_TYPE,
  type RegistryRow,
  TYPE_ALIAS,
  buildRegistry,
  registryIndex,
} from "./registry.ts";
import { context, schemaLifecycles, templateProblems } from "./rules.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const ROWS = buildRegistry(DEFAULT_CONFIG);

/**
 * Every type, written out rather than derived.
 *
 * A test that recomputes the list from the same tables the registry reads
 * cannot notice a dropped row. This one can, and it is the reason it is spelt
 * out: adding a type is a decision, and it should cost one line here.
 */
const ALL_TYPES = [
  // Library folders.
  "architecture",
  "specification",
  "interaction",
  "playbook",
  "lesson",
  "memory",
  // Root pages — the three the design resolution's tables never mentioned.
  "manifesto",
  "summary",
  "index",
  // Workbench folders.
  "backlog",
  "fragment",
  "brief",
  "investigation",
  "cycle",
  "report",
  // Project-scoped. `kickoff` and `handoff` split on 2026-09-04, which is what
  // took this group from seven to eight.
  "proposal",
  "plan",
  "design-resolution",
  "test-plan",
  "kickoff",
  "handoff",
  "session",
  "artifact",
];

/** The five types `pdocs new` will not create, and why. */
const UNCREATABLE = ["artifact", "kickoff", "manifesto", "summary", "index"];

const row = (type: string): RegistryRow => {
  const found = ROWS.find((r) => r.type === type);
  if (!found) throw new Error(`no registry row for \`${type}\``);
  return found;
};

const templatesOf = (r: RegistryRow): string[] =>
  r.template === null ? [] : [r.template].flat();

describe("the registry covers the type system", () => {
  test("exactly 23 rows, one per type in SCHEMA.md", () => {
    expect(ALL_TYPES).toHaveLength(23);
    expect(ROWS.map((r) => r.type).sort()).toEqual([...ALL_TYPES].sort());
  });

  test("no type is declared twice", () => {
    expect(new Set(ROWS.map((r) => r.type)).size).toBe(ROWS.length);
  });

  // The tier decides the graph obligations, and nine types carry them.
  test("nine library rows, fourteen workbench", () => {
    const byTier = (t: RegistryRow["tier"]) =>
      ROWS.filter((r) => r.tier === t).length;
    expect(byTier("library")).toBe(9);
    expect(byTier("workbench")).toBe(14);
  });

  test("a root page is a singleton with no folder and no template", () => {
    for (const type of ["manifesto", "summary", "index"]) {
      const r = row(type);
      expect(r.scope).toBe("root");
      expect(r.folder).toBe("");
      expect(r.filename.kind).toBe("fixed");
      expect(r.template).toBeNull();
    }
  });

  test("a project-scoped row says so, and its fixed name is the one that types the file", () => {
    for (const [name, type] of Object.entries(PROJECT_FILE_TYPE)) {
      const r = row(type);
      expect(r.scope).toBe("project");
      expect(r.filename).toEqual({ kind: "fixed", name });
      // The fixed-name project documents sit in the project folder itself.
      expect(r.folder).toBe("");
    }
    expect(row("session").folder).toBe("sessions");
    expect(row("artifact").folder).toBe("artifacts");
  });
});

describe("what `pdocs new` can create", () => {
  test("eighteen creatable types; the other five say why not", () => {
    const creatable = ROWS.filter((r) => r.creatable).map((r) => r.type);
    expect(creatable).toHaveLength(18);
    expect(ROWS.filter((r) => !r.creatable).map((r) => r.type).sort()).toEqual(
      [...UNCREATABLE].sort()
    );
  });

  test("`creatable: false` always carries a reason, and `true` never does", () => {
    for (const r of ROWS)
      if (r.creatable) expect(r.uncreatableReason).toBeUndefined();
      else expect(r.uncreatableReason).toBeTruthy();
  });

  test("every creatable row's template is on disk", () => {
    const missing: string[] = [];
    for (const r of ROWS.filter((x) => x.creatable))
      for (const t of templatesOf(r))
        if (!existsSync(join(REPO_ROOT, t))) missing.push(`${r.type}: ${t}`);
    expect(missing).toEqual([]);
  });

  test("every creatable row declares a template", () => {
    // The inverse of the check above, and it is not the same claim: a row could
    // pass that one by declaring nothing at all.
    for (const r of ROWS.filter((x) => x.creatable))
      expect(templatesOf(r).length).toBeGreaterThan(0);
  });

  test("specification is the variant case, and the only one", () => {
    expect(Array.isArray(row("specification").template)).toBe(true);
    for (const r of ROWS)
      if (r.type !== "specification") expect(Array.isArray(r.template)).toBe(false);
  });

  // The row exists so the lint can type `DEV_KICKOFF.md`. Its template lives
  // with the plugin skill, where a generated project cannot see it.
  test("kickoff is typed but not created, and its template is marked unreachable", () => {
    const r = row("kickoff");
    expect(r.creatable).toBe(false);
    expect(r.externalTemplate).toBe(true);
    expect(r.template).toBe(
      "plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md"
    );
    expect(r.uncreatableReason).toContain("dev-kickoff");
  });

  test("kickoff is the only row whose template is outside the docs tree", () => {
    expect(ROWS.filter((r) => r.externalTemplate).map((r) => r.type)).toEqual([
      "kickoff",
    ]);
  });
});

describe("filename grammar", () => {
  const shape = (type: string) => row(type).filename;

  test("dated types, and the one that is dated by month", () => {
    for (const type of ["backlog", "fragment", "brief", "memory", "session"])
      expect(shape(type)).toEqual({ kind: "slug", date: "day" });
    expect(shape("cycle")).toEqual({ kind: "slug", date: "month" });
  });

  test("suffixes are declared, not remembered", () => {
    expect(shape("investigation")).toEqual({
      kind: "slug",
      date: "day",
      suffix: "investigation",
    });
    expect(shape("report")).toEqual({
      kind: "slug",
      date: "day",
      suffix: "report",
    });
    expect(shape("playbook")).toEqual({
      kind: "slug",
      date: "none",
      suffix: "playbook",
    });
    expect(shape("architecture")).toEqual({
      kind: "slug",
      date: "none",
      suffix: "architecture",
    });
    expect(shape("interaction")).toEqual({
      kind: "slug",
      date: "none",
      suffix: "flow",
    });
  });

  test("a lesson is a bare slug, a specification is numbered, an artifact is freeform", () => {
    expect(shape("lesson")).toEqual({ kind: "slug", date: "none" });
    expect(shape("specification")).toEqual({ kind: "numbered" });
    expect(shape("artifact")).toEqual({ kind: "freeform" });
  });

  test("freeform belongs to the uncreatable rows only", () => {
    for (const r of ROWS)
      if (r.filename.kind === "freeform") expect(r.creatable).toBe(false);
  });
});

describe("the unified frontmatter contract", () => {
  // `schemaTableChecks` proves this inside the gate, driven by the registry.
  // This proves it here as a value comparison, so a failure names the type and
  // both vocabularies rather than handing back a list of problem strings.
  test("the lifecycle of every type is what SCHEMA.md states", () => {
    const stated = schemaLifecycles(
      readFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), "utf8")
    );
    const show = (v: string[] | null) => (v === null ? "—" : v.join(" · "));
    const fromRegistry = Object.fromEntries(
      ROWS.map((r) => [r.type, show(r.lifecycle)])
    );
    const fromSchema = Object.fromEntries(
      [...stated].map(([type, v]) => [type, show(v)])
    );
    expect(fromRegistry).toEqual(fromSchema);
  });

  test("only `cycle` declares extra fields, and it declares all five", () => {
    expect(row("cycle").extra).toEqual([
      "scope",
      "after",
      "appetite",
      "started",
      "closed",
    ]);
    for (const r of ROWS)
      if (r.type !== "cycle") expect(r.extra).toEqual([]);
  });

  // The gap this registry exists to close: `PROJECT_SPEC` has no `extra` field
  // at all, so before the unification these eight types could not declare one
  // even in principle. They can now; they just do not need to yet.
  test("project-scoped rows can carry `extra`, and carry their lifecycle", () => {
    expect(row("proposal").lifecycle).toEqual([
      "draft",
      "approved",
      "deferred",
      "implemented",
      "withdrawn",
      "superseded",
    ]);
    expect(row("kickoff").lifecycle).toBeNull();
    for (const r of ROWS.filter((x) => x.scope === "project"))
      expect(Array.isArray(r.extra)).toBe(true);
  });

  test("every library type is a frozen page: no lifecycle", () => {
    for (const r of ROWS.filter((x) => x.tier === "library"))
      expect(r.lifecycle).toBeNull();
  });
});

describe("aliases and pre-write validation", () => {
  test("`project` is data, not a branch: it resolves to a creatable row", () => {
    // The design resolution's grammar has `pdocs new project <name>`, and a
    // project is a FOLDER rather than a document. Declaring it here is what
    // keeps `commands/new.ts` from having to know that.
    expect(Object.keys(TYPE_ALIAS)).toEqual(["project"]);
    const alias = TYPE_ALIAS.project as (typeof TYPE_ALIAS)[string];
    const row = registryIndex(DEFAULT_CONFIG).get(alias.type) as RegistryRow;
    expect(row.creatable).toBe(true);
    expect(row.scope).toBe("project");
    expect(row.filename.kind).toBe("fixed");
  });

  test("an alias that names a scope resolves to a row that HAS one", () => {
    // A `namesScope` alias supplies the project slug; a row outside a project
    // scope would have nowhere to put it.
    for (const alias of Object.values(TYPE_ALIAS))
      if (alias.namesScope)
        expect(
          (registryIndex(DEFAULT_CONFIG).get(alias.type) as RegistryRow).scope
        ).toBe("project");
  });

  test("`cycle` is the only row that declares a validate predicate", () => {
    expect(ROWS.filter((r) => r.validate !== undefined).map((r) => r.type)).toEqual([
      "cycle",
    ]);
  });

  test("the predicate refuses an unresolvable scope entry as a usage problem", () => {
    const cycle = ROWS.find((r) => r.type === "cycle") as RegistryRow;
    const problems = (cycle.validate as NonNullable<RegistryRow["validate"]>)({
      type: "cycle",
      fields: new Map([["scope", "[project/nowhere]"]]),
      documents: [],
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]?.kind).toBe("usage");
    expect(problems[0]?.message).toContain("project/nowhere");
  });

  test("the predicate refuses a second active cycle as a conflict", () => {
    const cycle = ROWS.find((r) => r.type === "cycle") as RegistryRow;
    const documents = [
      {
        path: "docs/cycles/2026-09-open.md",
        keys: ["cycle/2026-09-open"],
        type: "cycle",
        lifecycle: "active",
      },
    ];
    const validate = cycle.validate as NonNullable<RegistryRow["validate"]>;

    expect(
      validate({ type: "cycle", fields: new Map([["lifecycle", "active"]]), documents })
    ).toEqual([
      {
        kind: "conflict",
        message: expect.stringContaining("docs/cycles/2026-09-open.md") as never,
      },
    ]);

    // `planned` beside an active one is fine; the invariant is about `active`.
    expect(
      validate({ type: "cycle", fields: new Map([["lifecycle", "planned"]]), documents })
    ).toEqual([]);
  });
});

describe("buildRegistry reads its config", () => {
  test("template paths are relative to the configured docs root", () => {
    const moved = buildRegistry({
      ...DEFAULT_CONFIG,
      docsRoot: "documentation",
    });
    const backlog = moved.find((r) => r.type === "backlog");
    expect(backlog?.template).toBe("documentation/backlog/TEMPLATE.md");
    // Except kickoff's, which is not under the docs root at all.
    expect(moved.find((r) => r.type === "kickoff")?.template).toBe(
      "plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md"
    );
  });

  test("registryIndex is the same rows, keyed", () => {
    const index = registryIndex(DEFAULT_CONFIG);
    expect(index.size).toBe(ROWS.length);
    expect(index.get("cycle")?.folder).toBe("cycles");
  });
});

// ---------------------------------------------------------------------------------------
// The template-exists check
// ---------------------------------------------------------------------------------------

const roots: string[] = [];

/** A tree carrying exactly the templates asked for, and a `.project-docs.json`. */
function treeWithTemplates(templates: string[]): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-registry-"));
  roots.push(root);
  writeFileSync(
    join(root, ".project-docs.json"),
    `${JSON.stringify({ docsRoot: "docs", version: "1.0.0" }, null, 2)}\n`
  );
  for (const rel of templates) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, "# A Template\n");
  }
  return root;
}

const everyDeclaredTemplate = ROWS.filter((r) => !r.externalTemplate).flatMap(
  templatesOf
);

describe("templateProblems", () => {
  test("silent when every declared template is there", () => {
    const ctx = context(treeWithTemplates(everyDeclaredTemplate));
    expect(templateProblems(ctx)).toEqual([]);
  });

  test("names the row and the path when one is missing", () => {
    const ctx = context(
      treeWithTemplates(
        everyDeclaredTemplate.filter((t) => t !== "docs/playbooks/TEMPLATE.md")
      )
    );
    expect(templateProblems(ctx)).toEqual([
      "TEMPLATE MISSING  docs/playbooks/TEMPLATE.md  (the `playbook` registry row declares it; nothing is there)",
    ]);
  });

  test("both of a variant row's templates are checked", () => {
    const ctx = context(
      treeWithTemplates(
        everyDeclaredTemplate.filter(
          (t) => t !== "docs/specifications/TEMPLATE-domain.md"
        )
      )
    );
    expect(templateProblems(ctx)).toHaveLength(1);
    expect(templateProblems(ctx)[0]).toContain("TEMPLATE-domain.md");
  });

  // The failure the check must not have: a generated project has no `plugins/`
  // directory at all, so checking kickoff's template would fail every scaffold
  // on its first run.
  test("a tree with no plugins directory is clean", () => {
    const root = treeWithTemplates(everyDeclaredTemplate);
    expect(existsSync(join(root, "plugins"))).toBe(false);
    expect(templateProblems(context(root))).toEqual([]);
  });

  test("null templates report nothing", () => {
    // The four rows with no template: artifact and the three root pages.
    const none = ROWS.filter((r) => r.template === null).map((r) => r.type);
    expect(none.sort()).toEqual(["artifact", "index", "manifesto", "summary"]);
  });
});

afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});
