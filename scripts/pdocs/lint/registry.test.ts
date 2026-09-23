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
  FEATURE_STATES,
  FEATURES_FOLDER,
  ITEM_STATES,
  ITEMS_FOLDER,
  KINDS,
  OWNED_FILE_TYPE,
  OWNER_SUBFOLDER,
  PRIORITIES,
  PROJECT_FILE_TYPE,
  STATE_GROUP,
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
  // The work taxonomy: the two entities and a research item's output.
  "feature",
  "item",
  "write-up",
];

/** The types retired in 9.0.0: still lintable, never created. */
const RETIRED = [
  "proposal",
  "backlog",
  "fragment",
  "brief",
  "investigation",
  "memory",
  "lesson",
];

/**
 * The types `pdocs new` will not create, and why. `feature` and `item` are
 * created by `pdocs new` once it learns `--owner` and writes an `id`.
 */
const UNCREATABLE = [
  "artifact",
  "kickoff",
  "manifesto",
  "summary",
  "index",
  "feature",
  "item",
  ...RETIRED,
];

const row = (type: string): RegistryRow => {
  const found = ROWS.find((r) => r.type === type);
  if (!found) throw new Error(`no registry row for \`${type}\``);
  return found;
};

const templatesOf = (r: RegistryRow): string[] =>
  r.template === null ? [] : [r.template].flat();

describe("the registry covers the type system", () => {
  test("exactly 26 rows, one per type in SCHEMA.md", () => {
    expect(ALL_TYPES).toHaveLength(26);
    expect(ROWS.map((r) => r.type).sort()).toEqual([...ALL_TYPES].sort());
  });

  test("no type is declared twice", () => {
    expect(new Set(ROWS.map((r) => r.type)).size).toBe(ROWS.length);
  });

  // The tier decides the graph obligations, and nine types carry them.
  test("nine library rows, seventeen workbench", () => {
    const byTier = (t: RegistryRow["tier"]) =>
      ROWS.filter((r) => r.tier === t).length;
    expect(byTier("library")).toBe(9);
    expect(byTier("workbench")).toBe(17);
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

  test("an owner-scoped row says so, and its fixed name is the one that types the file", () => {
    for (const [name, type] of Object.entries({
      ...PROJECT_FILE_TYPE,
      ...OWNED_FILE_TYPE,
    })) {
      const r = row(type);
      expect(r.scope).toBe("owner");
      expect(r.filename).toEqual({ kind: "fixed", name });
      // The fixed-name owned documents sit in the owner folder itself.
      expect(r.folder).toBe("");
    }
    expect(row("session").folder).toBe("sessions");
    expect(row("artifact").folder).toBe("artifacts");
    expect(row("report").folder).toBe("reports");
    expect(OWNER_SUBFOLDER).toEqual({
      session: "sessions",
      artifact: "artifacts",
      report: "reports",
    });
  });
});

describe("what `pdocs new` can create", () => {
  test("twelve creatable types; the other fourteen say why not", () => {
    const creatable = ROWS.filter((r) => r.creatable).map((r) => r.type);
    expect(creatable).toHaveLength(12);
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

  test("`cycle`, `feature` and `item` declare extra fields; nothing else does", () => {
    expect(row("cycle").extra).toEqual([
      "scope",
      "after",
      "appetite",
      "started",
      "closed",
    ]);
    for (const r of ROWS)
      if (!["cycle", "feature", "item"].includes(r.type))
        expect(r.extra).toEqual([]);
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
    for (const r of ROWS.filter((x) => x.scope === "owner"))
      expect(Array.isArray(r.extra)).toBe(true);
  });

  test("every library type is a frozen page: no lifecycle", () => {
    for (const r of ROWS.filter((x) => x.tier === "library"))
      expect(r.lifecycle).toBeNull();
  });
});

describe("aliases and pre-write validation", () => {
  // `project` resolved to the proposal row, and the proposal is retired: a
  // feature is created as itself.
  test("`project` is no longer an alias", () => {
    expect(Object.keys(TYPE_ALIAS)).not.toContain("project");
  });

  test("an alias that names a scope resolves to a row that HAS one", () => {
    // A `namesScope` alias supplies the owner slug; a row outside an owner
    // scope would have nowhere to put it.
    for (const alias of Object.values(TYPE_ALIAS))
      if (alias.namesScope)
        expect(
          (registryIndex(DEFAULT_CONFIG).get(alias.type) as RegistryRow).scope
        ).toBe("owner");
  });

  test("`cycle` is the only row that declares a validate predicate", () => {
    expect(ROWS.filter((r) => r.validate !== undefined).map((r) => r.type)).toEqual([
      "cycle",
    ]);
  });

  // A cycle's scope is derived from the items that name it, so the predicate no
  // longer resolves `scope:` entries. The field stays in `extra` until the
  // legacy cycles are migrated, and nothing checks what it says.
  test("the predicate does not resolve scope: a cycle's scope is derived now", () => {
    const cycle = ROWS.find((r) => r.type === "cycle") as RegistryRow;
    const problems = (cycle.validate as NonNullable<RegistryRow["validate"]>)({
      type: "cycle",
      fields: new Map([["scope", "[project/nowhere]"]]),
      documents: [],
    });
    expect(problems).toEqual([]);
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
    const playbook = moved.find((r) => r.type === "playbook");
    expect(playbook?.template).toBe("documentation/playbooks/TEMPLATE.md");
    expect(moved.find((r) => r.type === "plan")?.template).toBe(
      "documentation/TEMPLATES/PLAN.template.md"
    );
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
    // The rows with no template: artifact, the three root pages, and every
    // retired type — a type that cannot be created has nothing to seed.
    const none = ROWS.filter((r) => r.template === null).map((r) => r.type);
    expect(none.sort()).toEqual(
      ["artifact", "index", "manifesto", "summary", ...RETIRED].sort()
    );
  });
});

afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------

describe("rows a project declares for itself", () => {
  const withTypes = (
    types: Record<string, string>,
    tiers: Partial<{ durable: string[]; workbench: string[] }> = {}
  ) =>
    buildRegistry({
      ...DEFAULT_CONFIG,
      lint: { ...DEFAULT_CONFIG.lint, ...tiers, types },
    });

  const find = (rows: RegistryRow[], type: string) =>
    rows.filter((r) => r.type === type);

  test("a declared folder becomes one row, lintable but not creatable", () => {
    const rows = withTypes(
      { runbooks: "runbook" },
      { workbench: [...DEFAULT_CONFIG.lint.workbench, "runbooks"] }
    );
    const found = find(rows, "runbook");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      folder: "runbooks",
      scope: "docs",
      template: null,
      creatable: false,
    });
    // The message `pdocs new` gives back has to say WHY, not just refuse.
    expect(found[0]?.uncreatableReason).toContain(".project-docs.json");
  });

  test("the tier follows the array the folder is listed in", () => {
    expect(
      find(
        withTypes(
          { runbooks: "runbook" },
          { workbench: [...DEFAULT_CONFIG.lint.workbench, "runbooks"] }
        ),
        "runbook"
      )[0]?.tier
    ).toBe("workbench");

    expect(
      find(
        withTypes(
          { runbooks: "runbook" },
          { durable: [...DEFAULT_CONFIG.lint.durable, "runbooks"] }
        ),
        "runbook"
      )[0]?.tier
    ).toBe("library");
  });

  test("a folder in neither array is library, matching what the lint enforces", () => {
    // `graphTier` skips only `workbench` and `skip`, so anything else IS
    // library. The registry has to agree, or a declared row is registered
    // workbench while the lint holds it to the catalog obligation.
    expect(find(withTypes({ runbooks: "runbook" }), "runbook")[0]?.tier).toBe(
      "library"
    );
  });

  test("a declaration colliding with a built-in folder is ignored", () => {
    // POSITIVE assertion. The previous version of this test asserted the
    // ABSENCE of a string that was absent under both behaviours: deleting the
    // collision guard outright left the whole suite green.
    const rows = withTypes({ playbooks: "runbook" });
    expect(find(rows, "runbook")).toHaveLength(0);
    const playbooks = rows.filter((r) => r.folder === "playbooks");
    expect(playbooks).toHaveLength(1);
    expect(playbooks[0]?.type).toBe("playbook");
    expect(playbooks[0]?.creatable).toBe(true);
  });

  test("a declaration colliding with a built-in TYPE is ignored too", () => {
    const rows = withTypes({ someplace: "playbook" });
    expect(find(rows, "playbook")).toHaveLength(1);
    expect(find(rows, "playbook")[0]?.folder).toBe("playbooks");
  });

  test("declaring nothing changes nothing", () => {
    expect(withTypes({}).length).toBe(ROWS.length);
  });
});

// ---------------------------------------------------------------------------------------
// The work-taxonomy vocabulary
// ---------------------------------------------------------------------------------------

describe("the state vocabulary and its groups", () => {
  test("an item moves through seven states, in order", () => {
    expect(ITEM_STATES).toEqual([
      "triage",
      "backlog",
      "ready",
      "active",
      "review",
      "done",
      "dropped",
    ]);
  });

  // D3: a feature arrives already accepted.
  test("a feature's states are the item's minus triage", () => {
    expect(FEATURE_STATES).toEqual(ITEM_STATES.filter((s) => s !== "triage"));
  });

  test("every state maps to exactly one group", () => {
    expect(Object.keys(STATE_GROUP).sort()).toEqual([...ITEM_STATES].sort());
    expect(STATE_GROUP).toEqual({
      triage: "unstarted",
      backlog: "unstarted",
      ready: "unstarted",
      active: "started",
      review: "started",
      done: "completed",
      dropped: "cancelled",
    });
  });

  test("kinds and priorities are closed sets (D7)", () => {
    expect(KINDS).toEqual(["task", "bug", "chore", "research"]);
    expect(PRIORITIES).toEqual(["urgent", "high", "medium", "low"]);
  });
});

// ---------------------------------------------------------------------------------------
// The work-taxonomy rows
// ---------------------------------------------------------------------------------------

describe("registry rows for feature, item, write-up, and owned documents", () => {
  test("a feature is an owner's entry file, feature.md (D2), with the feature states", () => {
    const r = row("feature");
    expect(r.scope).toBe("owner");
    expect(r.filename).toEqual({ kind: "fixed", name: "feature.md" });
    expect(r.lifecycle).toEqual(FEATURE_STATES);
    expect(r.extra).toEqual(["scope", "released_in"]);
    expect(r.template).toBe("docs/TEMPLATES/FEATURE.template.md");
  });

  test("an item carries the item states, requires id and kind, and declares its fields", () => {
    const r = row("item");
    expect(r.folder).toBe(ITEMS_FOLDER);
    expect(r.lifecycle).toEqual(ITEM_STATES);
    expect(r.required).toEqual(["id", "kind"]);
    expect(r.extra).toEqual([
      "id",
      "kind",
      "parent",
      "scope",
      "cycle",
      "from",
      "source",
      "blocked_by",
      "released_in",
      "priority",
      "assignee",
    ]);
    expect(r.template).toBe("docs/TEMPLATES/ITEM.template.md");
  });

  test("a write-up is a fixed-name owned document with no lifecycle (D4)", () => {
    const r = row("write-up");
    expect(r.scope).toBe("owner");
    expect(r.filename).toEqual({ kind: "fixed", name: "write-up.md" });
    expect(r.lifecycle).toBeNull();
    expect(r.template).toBe("docs/TEMPLATES/WRITE-UP.template.md");
  });

  test("every owned type is declared once, owner-scoped", () => {
    for (const type of [
      "plan",
      "design-resolution",
      "test-plan",
      "kickoff",
      "handoff",
      "session",
      "artifact",
      "report",
      "write-up",
    ]) {
      expect(ROWS.filter((r) => r.type === type)).toHaveLength(1);
      expect(row(type).scope).toBe("owner");
    }
  });

  test("every row states its required fields; only an item adds any", () => {
    for (const r of ROWS)
      expect(r.required).toEqual(r.type === "item" ? ["id", "kind"] : []);
  });

  test("the work templates live in docs/TEMPLATES/ (D5)", () => {
    for (const type of [
      "feature",
      "item",
      "write-up",
      "plan",
      "design-resolution",
      "test-plan",
      "handoff",
      "session",
      "report",
    ])
      expect(String(row(type).template)).toStartWith("docs/TEMPLATES/");
  });

  test("the owner folders are named", () => {
    expect(FEATURES_FOLDER).toBe("features");
    expect(ITEMS_FOLDER).toBe("items");
  });
});

describe("the retired types", () => {
  test("each is flagged retired, is not creatable, and names its replacement", () => {
    for (const type of RETIRED) {
      const r = row(type);
      expect({ type, retired: r.retired }).toEqual({ type, retired: true });
      expect(r.creatable).toBe(false);
      expect(r.template).toBeNull();
      expect(r.uncreatableReason).toStartWith("retired in 9.0.0; ");
    }
    expect(row("backlog").uncreatableReason).toBe(
      "retired in 9.0.0; use `pdocs new item <slug> --kind task`"
    );
    expect(row("investigation").uncreatableReason).toContain("--kind research");
    expect(row("proposal").uncreatableReason).toContain("feature");
  });

  test("no other row is retired", () => {
    for (const r of ROWS)
      if (!RETIRED.includes(r.type)) expect(r.retired).toBeUndefined();
  });
});
