// The type registry: one row per document type, and the three source tables it
// unifies.
//
// Until this file existed the type system was spread across three tables that
// disagreed about what they carried. `SPEC` had `lifecycle` and `extra`;
// `PROJECT_SPEC` had `lifecycle` and no `extra` field at all; `DURABLE_TYPE` and
// `ROOT_PAGE_TYPE` were folder-to-type string maps carrying neither. Every
// reader had to know which table its type came from, and `documentProblems`
// read `extra` from `SPEC` alone — so the eight project-scoped types could not
// declare an extra field even in principle, and nothing said so.
//
// `buildRegistry` is the one place that assembles them, and it is a FUNCTION
// rather than a module-level const on purpose. User-declared folders and types
// (docs/backlog/2026-09-04-user-defined-document-types.md) become a merge step
// inside this function rather than a rewrite of everything that touches the
// tables. It costs nothing now.
//
// The tables themselves live here rather than in `rules.ts` so the dependency
// runs one way: `rules.ts` consumes the registry, the registry consumes
// nothing. `rules.ts` re-exports all five names, because the v2.6-to-v2.7
// codemod's test imports them from there to prove its own copies are equal.

import type { ProjectDocsConfig } from "../docs-lint/config.ts";
import { DEFAULT_CONFIG } from "../docs-lint/config.ts";

// ---------------------------------------------------------------------------------------
// The work-taxonomy vocabulary
// ---------------------------------------------------------------------------------------

/**
 * A work item's states, in the order work moves through them. `lifecycle`
 * carries one of these on an item (D1: the key stays `lifecycle`).
 */
export const ITEM_STATES = [
  "triage",
  "backlog",
  "ready",
  "active",
  "review",
  "done",
  "dropped",
];

/** A feature's states: the item's without `triage`, because a feature arrives
 *  already accepted (D3). */
export const FEATURE_STATES = ITEM_STATES.filter((s) => s !== "triage");

/** The four groups every state falls into. Views and the board group by these. */
export type StateGroup = "unstarted" | "started" | "completed" | "cancelled";

/** Each state's group. SCHEMA.md's `## State groups` table states the same, and
 *  `schemaTableChecks` proves the two agree. */
export const STATE_GROUP: Record<string, StateGroup> = {
  triage: "unstarted",
  backlog: "unstarted",
  ready: "unstarted",
  active: "started",
  review: "started",
  done: "completed",
  dropped: "cancelled",
};

/** A work item's `kind`. Closed. */
export const KINDS = ["task", "bug", "chore", "research"];

/** A work item's `priority`. Closed (D7): an unchecked priority drifts the way
 *  `**Status:**` did. */
export const PRIORITIES = ["urgent", "high", "medium", "low"];

/** The `extra` fields whose values are a closed set, and the set. `pdocs new`
 *  and `pdocs set` refuse anything outside it before writing. */
export const FIELD_VALUES: Record<string, readonly string[]> = {
  kind: KINDS,
  priority: PRIORITIES,
};

// ---------------------------------------------------------------------------------------
// The source tables
// ---------------------------------------------------------------------------------------

/** Library folders, and the `type` each one's pages carry.
 *  Exported: the template test and the v2.6-to-v2.7 codemod read the same map. */
export const DURABLE_TYPE: Record<string, string> = {
  architecture: "architecture",
  specifications: "specification",
  "interaction-design": "interaction",
  playbooks: "playbook",
  "lessons-learned": "lesson",
  memories: "memory",
};

/** Library pages that live at the docs root rather than in a folder. */
export const ROOT_PAGE_TYPE: Record<string, string> = {
  "PROJECT_MANIFESTO.md": "manifesto",
  "PROJECT-SUMMARY.md": "summary",
  "index.md": "index",
};

/**
 * A project folder's type is decided by FILENAME, because a project is one
 * feature's whole record and its documents are of different kinds.
 * Anything unrecognised is an `artifact` — a findings note, a review, a
 * prototype writeup — which is what those files are.
 */
export const PROJECT_FILE_TYPE: Record<string, string> = {
  "proposal.md": "proposal",
  "plan.md": "plan",
  "design-resolution.md": "design-resolution",
  "test-plan.md": "test-plan",
  // A kickoff briefs the START of implementation; a handoff lists what
  // shipping needs AFTER it. Two documents, two types — they were one type
  // until 2026-09-04, when neither file existed to prove otherwise.
  "DEV_KICKOFF.md": "kickoff",
  "handoff.md": "handoff",
};

/**
 * The workbench contract, folder by folder.
 *
 * `lifecycle: null` means the type carries no lifecycle and writing one is an
 * error — a frozen record whose only date is `generated.at`. See SCHEMA.md's
 * "Lifecycle by type" table, which `schemaTableChecks` proves equal to this.
 */
export const SPEC: Record<
  string,
  { type: string; lifecycle: string[] | null; extra?: string[] }
> = {
  // `done` is not in the proposal's vocabulary and should have been. The
  // backlog README describes the real path as open → work it → archive, and
  // "promoted" is the rarer outcome where an item turns out to need a project.
  // Without `done` the common case had no word, which is the same failure that
  // produced `Approved (in flight)` on the proposals.
  backlog: {
    type: "backlog",
    lifecycle: ["open", "done", "promoted", "dropped"],
  },
  fragments: { type: "fragment", lifecycle: ["open", "promoted", "dropped"] },
  briefs: { type: "brief", lifecycle: ["active", "spent"] },
  investigations: { type: "investigation", lifecycle: ["active", "concluded"] },
  cycles: {
    type: "cycle",
    lifecycle: ["planned", "active", "closed", "abandoned"],
    extra: ["scope", "after", "appetite", "started", "closed"],
  },
  reports: { type: "report", lifecycle: null },
};

/** Types a project folder can hold, and their vocabularies. */
export const PROJECT_SPEC: Record<string, { lifecycle: string[] | null }> = {
  proposal: {
    lifecycle: [
      "draft",
      "approved",
      "deferred",
      "implemented",
      "withdrawn",
      "superseded",
    ],
  },
  plan: { lifecycle: ["draft", "active", "completed", "abandoned"] },
  // Both of these were stateless in the first draft of SCHEMA.md, on the
  // reasoning that they follow their proposal or plan. The templates they
  // replace disagreed: each carried its own `**Status:**` line, because a
  // design question is open until it is answered and a scenario list is
  // written before it is run. Dropping those axes would have deleted
  // information the tree already tracked.
  "design-resolution": { lifecycle: ["draft", "resolved", "superseded"] },
  "test-plan": { lifecycle: ["draft", "ready", "active", "completed"] },
  kickoff: { lifecycle: null },
  handoff: { lifecycle: null },
  session: { lifecycle: null },
  artifact: { lifecycle: null },
};

// ---------------------------------------------------------------------------------------
// The row
// ---------------------------------------------------------------------------------------

/**
 * How a type's filename is built.
 *
 * Everything a writer has to remember about naming, stated once. `pdocs new`
 * reads this and nothing else; a type it cannot express is a type the registry
 * has failed to declare, and the fix is a new member here rather than a branch
 * in the command.
 */
export type FilenameShape =
  /**
   * `[YYYY-MM-DD-]<slug>[-<suffix>].md`. `date` says whether a date prefix is
   * written and at what precision — `month` is the cycles convention, and it is
   * a precision rather than a format because that is the only thing that
   * differs.
   */
  | { kind: "slug"; date: "day" | "month" | "none"; suffix?: string }
  /**
   * `NN-<slug>.md` — a numbered prefix giving reading order. The next number is
   * the highest already in the folder plus one, zero-padded to two.
   */
  | { kind: "numbered" }
  /** One name, always: the type is a singleton wherever it lives. */
  | { kind: "fixed"; name: string }
  /** No grammar at all — whatever the writer names it. Never creatable. */
  | { kind: "freeform" };

/**
 * One document type, completely.
 *
 * `scope` decides how `folder` is read, and it is the only thing a caller has
 * to switch on — never the type name.
 */
export interface RegistryRow {
  type: string;
  /** Which tier's obligations the document carries. See SCHEMA.md. */
  tier: "library" | "workbench";
  /**
   * `docs` — `folder` is docs-root-relative.
   * `owner` — the document lives inside an owner folder (a feature, an item,
   *   or a legacy project), and `folder` is relative to THAT: `""` for the
   *   fixed-name owned documents, `sessions`, `reports` or `artifacts` for the
   *   rest.
   * `root` — a singleton at the docs root; `folder` is `""`.
   */
  scope: "docs" | "owner" | "root";
  /** See `scope`. Empty for root pages and for the fixed owned documents. */
  folder: string;
  filename: FilenameShape;
  /**
   * Repository-root-relative template path(s). `null` = no template exists.
   * An array is a variant set, chosen by `--variant` — `specification` is the
   * only one today.
   */
  template: string | string[] | null;
  /**
   * True when `template` names a path outside the documentation tree that this
   * repository need not contain. Only `kickoff`: its template ships with the
   * `dev-kickoff` plugin skill, and a generated project has no `plugins/`
   * directory at all. `templateProblems` skips these, because a check that
   * fails on every scaffolded project is a check that gets deleted.
   */
  externalTemplate: boolean;
  /** The `lifecycle` vocabulary, or `null` for a frozen record. */
  lifecycle: string[] | null;
  /** Frontmatter keys beyond REQUIRED + OPTIONAL + `lifecycle`. */
  extra: string[];
  /** Keys this type requires beyond the universal REQUIRED set. `item` is the
   *  one that has any: `id` and `kind`. */
  required: string[];
  /**
   * Retired in 9.0.0: still lintable, so a tree that has not migrated keeps
   * passing, and never created. Deleted once this repository has migrated.
   */
  retired?: boolean;
  /** Whether `pdocs new` will create one. */
  creatable: boolean;
  /** Why not, when `creatable` is false. This string is what `new` tells the caller. */
  uncreatableReason?: string;
  /**
   * Invariants this type has that the FILESYSTEM cannot express.
   *
   * "The file is not already there" is universal and lives in `new`; this is
   * for the rest. `cycle` is the only row that declares one today, and it
   * declares two: a `scope` entry must name a document that exists, and opening
   * a second `active` cycle is the state a cycle exists to prevent.
   *
   * Runs after the frontmatter is resolved and BEFORE anything is written, so a
   * refusal leaves the tree exactly as it was. `new` calls `row.validate?.(…)`
   * without knowing which type it is holding.
   */
  validate?: Validator;
}

// ---------------------------------------------------------------------------------------
// Pre-write validation
// ---------------------------------------------------------------------------------------

/** A document that is already in the tree, as a validator needs to see it. */
export interface ExistingDocument {
  /** Repo-relative. */
  path: string;
  /**
   * EVERY address this document answers to, and empty where it answers to none.
   *
   * A list rather than one `key`, because a document can be addressed in more
   * than one vocabulary and the project folder proves it: `pages.ts` keys a
   * proposal as `proposal/proposal` — true, useless, identical for every
   * project — and as `project/<folder>`, which is the form the cycle template,
   * the migration guide and `pdocs new project` all use. A validator matching
   * against a single key could only ever accept the useless one.
   */
  keys: string[];
  /** The type the document's POSITION says it carries. */
  type: string;
  lifecycle: string | null;
}

/**
 * What a validator is handed: the document as it is ABOUT to be written, and
 * the tree as it stands.
 *
 * `fields` rather than the raw flags, deliberately. A predicate that read
 * `--lifecycle` would be blind to a template that ships `lifecycle: active` of
 * its own, and the invariant is about the document, not about how the caller
 * happened to spell it.
 */
export interface ValidationInput {
  /** The row's own `type`, so a predicate never has to name itself. */
  type: string;
  /** The frontmatter about to be written, parsed. */
  fields: ReadonlyMap<string, string>;
  documents: readonly ExistingDocument[];
  /**
   * Resolve a reference the way the lint does (`resolveRef` in `work.ts`, over
   * the tree as it stands). Throws a usage error when it names nothing, or
   * more than one thing, or the wrong kind of thing.
   */
  resolve: (ref: string, kinds: ReadonlyArray<"feature" | "item" | "cycle">) => ResolvedRef;
  /** `lint.scopes` in `.project-docs.json`. */
  scopes: readonly string[];
  /**
   * Replace a field's value in the document about to be written. How a
   * validator hands back the CANONICAL form of what it resolved: a caller may
   * type an id prefix, and the document carries the full id (D6).
   */
  set: (key: string, value: string) => void;
}

/** What `ValidationInput.resolve` hands back: enough to write the reference. */
export interface ResolvedRef {
  entity: "feature" | "item" | "cycle";
  slug: string;
  id: string | null;
  path: string;
}

/**
 * `usage` — the invocation named something wrong and retrying it unchanged will
 * fail identically. `conflict` — the invocation is well-formed and the tree is
 * in a state this document may not be added to.
 */
export interface ValidationProblem {
  kind: "usage" | "conflict";
  message: string;
}

export type Validator = (input: ValidationInput) => ValidationProblem[];

// ---------------------------------------------------------------------------------------
// Aliases
// ---------------------------------------------------------------------------------------

/**
 * A name a caller may type that is not itself a type.
 *
 * `pdocs new project oauth-upgrade` is the grammar the design resolution
 * approved, and a project is not a document — it is a FOLDER whose first
 * document is a `proposal`. That is data, not a branch: the alias says which
 * row the name resolves to and that the positional names the scope owner rather
 * than the document's slug, and `new` reads both without knowing the word
 * "project".
 */
export interface TypeAlias {
  /** The registry row this name resolves to. */
  type: string;
  /**
   * True when the positional `<name>` names the SCOPE OWNER — the project
   * folder — instead of the document's own slug, and `new` creates that folder
   * rather than requiring it to exist. Only meaningful on a row whose `scope`
   * is `project`, whose slug is fixed anyway.
   */
  namesScope: boolean;
}

/**
 * Empty since 9.0.0. `project` resolved to the `proposal` row, and the proposal
 * is retired: a feature is created as itself.
 */
export const TYPE_ALIAS: Record<string, TypeAlias> = {};

/** The folder that holds feature folders: `features/<slug>/feature.md`. */
export const FEATURES_FOLDER = "features";

/** The folder that holds work items: `items/<slug>.md`, or `items/<slug>/item.md`
 *  once the item owns documents. */
export const ITEMS_FOLDER = "items";

/**
 * An owner folder's entry file, named after the entity (D2). A tool finds the
 * entry file by the folder's kind alone. The legacy `projects/` owner's entry
 * file is `proposal.md`.
 */
export const ENTITY_FILE: Record<string, { name: string; type: string }> = {
  features: { name: "feature.md", type: "feature" },
  items: { name: "item.md", type: "item" },
  projects: { name: "proposal.md", type: "proposal" },
};

/**
 * The owned documents with a fixed name, wherever the owner is — a feature, an
 * item, or (until this repository migrates) a legacy project. The legacy
 * `PROJECT_FILE_TYPE` above is the same map plus `proposal.md`, minus
 * `write-up.md`, which arrived with work items.
 */
export const OWNED_FILE_TYPE: Record<string, string> = {
  "plan.md": "plan",
  "design-resolution.md": "design-resolution",
  "test-plan.md": "test-plan",
  "DEV_KICKOFF.md": "kickoff",
  "handoff.md": "handoff",
  // A research item's output (D4). The item holds the question and the state;
  // this holds the answer, and has no lifecycle of its own.
  "write-up.md": "write-up",
};

/** Where an owned type sits inside its owner folder, when not at its top. */
export const OWNER_SUBFOLDER: Record<string, string> = {
  session: "sessions",
  artifact: "artifacts",
  report: "reports",
};

/**
 * The folder that holds project folders.
 *
 * Not derived from `lint.workbench` — that array says which folders are linted
 * as workbench, not which one is the project tree, and reading a position out
 * of it would break the moment somebody reorders their config.
 */
export const PROJECTS_FOLDER = "projects";

// ---------------------------------------------------------------------------------------
// Building it
// ---------------------------------------------------------------------------------------

/**
 * The part of a row that is not in any source table: where the file goes, what
 * it is called, and which template seeds it.
 *
 * Everything else — tier, lifecycle, extra, and every fixed filename — is
 * derived below from `SPEC`, `PROJECT_SPEC`, `DURABLE_TYPE`, `ROOT_PAGE_TYPE`
 * and `PROJECT_FILE_TYPE`, so a change to one of those cannot leave the
 * registry stating something else.
 */
type Creation = {
  filename: FilenameShape;
  /** Docs-root-relative, joined with `config.docsRoot` below. `null` = none. */
  template: string | string[] | null;
  /** Set only where the template is not under the docs root. */
  externalTemplate?: boolean;
  uncreatableReason?: string;
};

/**
 * Filename grammar and template per type, verified against the folder READMEs
 * and against the tree.
 *
 * `architecture`'s README offers `-architecture` OR `-flow` for a file that
 * documents a flow rather than a system. Only `-architecture` is declared: that
 * folder is empty in this repository, so a variant mechanism for it would be
 * inventing a convention rather than recording one. Add the second member the
 * day a real file needs it.
 */
/** The fallback a refusal names until `pdocs new feature` is built. */
const COPY_FEATURE =
  "copy {docs}/TEMPLATES/FEATURE.template.md to {docs}/features/<slug>/feature.md";

/**
 * Words a caller may still type that are no longer types, and what replaced
 * them. `pdocs new project` resolved to the proposal row until 9.0.0; skills
 * written against that grammar still run it, so the refusal says what to do
 * rather than "unknown type".
 */
const RETIRED_WORD: Record<string, string> = {
  project:
    "`project` was replaced by `feature` in 9.0.0 (`pdocs new feature <slug>`, not built yet) — until then " +
    COPY_FEATURE,
};

/** Why `word` is no longer a type, with the docs root filled in; `null` when it
 *  never was one. */
export function retiredWordReason(word: string, config: ProjectDocsConfig): string | null {
  const reason = RETIRED_WORD[word];
  return reason === undefined ? null : fillDocs(reason, config);
}

/** `{docs}` in a message is the configured docs root, normalised. */
function fillDocs(text: string, config: ProjectDocsConfig): string {
  const docs = config.docsRoot.replace(/^\.\/+/, "").replace(/\/+$/, "") || ".";
  return text.replaceAll("{docs}", docs);
}

const CREATION: Record<string, Creation> = {
  // Retired in 9.0.0. Lintable until this repository has migrated; never
  // created, so they declare no template. Each reason names the replacement,
  // and — until `pdocs new item` and `--owner` land — the template to copy,
  // which is the one way to write the replacement today. `{docs}` is the
  // configured docs root, filled in by `buildRegistry`.
  backlog: {
    filename: { kind: "slug", date: "day" },
    template: null,
    uncreatableReason: "retired in 9.0.0; the replacement is a work item — `pdocs new item <slug> --kind task`",
  },
  fragment: {
    filename: { kind: "slug", date: "day" },
    template: null,
    uncreatableReason:
      "retired in 9.0.0; the replacement is a `triage` work item — `pdocs new item <slug> --kind task` (a new item starts in `triage`)",
  },
  brief: {
    filename: { kind: "slug", date: "day" },
    template: null,
    uncreatableReason: `retired in 9.0.0; write the idea as a \`triage\` work item (\`pdocs new item <slug> --kind task\`) or as a feature — until \`pdocs new feature\` is built, ${COPY_FEATURE}`,
  },
  investigation: {
    filename: { kind: "slug", date: "day", suffix: "investigation" },
    template: null,
    uncreatableReason:
      "retired in 9.0.0; the replacement is a research work item and its write-up — " +
      "`pdocs new item <slug> --kind research`, then, until `--owner` is built, copy " +
      "{docs}/TEMPLATES/WRITE-UP.template.md to {docs}/items/<slug>/write-up.md and move " +
      "{docs}/items/<slug>.md to {docs}/items/<slug>/item.md",
  },
  proposal: {
    filename: { kind: "fixed", name: "proposal.md" },
    template: null,
    uncreatableReason: `retired in 9.0.0; a proposal is now a feature (\`pdocs new feature <slug>\`, not built yet) — until then ${COPY_FEATURE}`,
  },
  memory: {
    filename: { kind: "slug", date: "day" },
    template: null,
    uncreatableReason:
      "retired in 9.0.0; append a step and its verification to the playbook for that kind of work (`pdocs find --type playbook`), or start one with `pdocs new playbook <slug>`",
  },
  lesson: {
    filename: { kind: "slug", date: "none" },
    template: null,
    uncreatableReason:
      "retired in 9.0.0; append a step and its verification to the playbook for that kind of work (`pdocs find --type playbook`), or start one with `pdocs new playbook <slug>`",
  },

  // The work taxonomy's entities. `pdocs new item` mints the `id`; a feature
  // is created once `new` learns `--owner`.
  feature: {
    filename: { kind: "fixed", name: "feature.md" },
    template: "TEMPLATES/FEATURE.template.md",
    uncreatableReason: `\`pdocs new feature\` is not built yet — ${COPY_FEATURE}`,
  },
  item: { filename: { kind: "slug", date: "none" }, template: "TEMPLATES/ITEM.template.md" },

  // Owned, dated.
  report: {
    filename: { kind: "slug", date: "day", suffix: "report" },
    template: "TEMPLATES/REPORT.template.md",
  },
  // A cycle is named for the month it runs in, not the day it opened.
  cycle: { filename: { kind: "slug", date: "month" }, template: "cycles/TEMPLATE.md" },

  // Library folders.
  architecture: {
    filename: { kind: "slug", date: "none", suffix: "architecture" },
    template: "architecture/TEMPLATE.md",
  },
  interaction: {
    filename: { kind: "slug", date: "none", suffix: "flow" },
    template: "interaction-design/TEMPLATE.md",
  },
  playbook: {
    filename: { kind: "slug", date: "none", suffix: "playbook" },
    template: "playbooks/TEMPLATE.md",
  },
  specification: {
    filename: { kind: "numbered" },
    template: [
      "specifications/TEMPLATE-overview.md",
      "specifications/TEMPLATE-domain.md",
    ],
  },

  // Root pages. Two of the three ship in every generated scaffold, so `new`
  // could only ever collide with a file that is already there.
  manifesto: {
    filename: { kind: "fixed", name: "PROJECT_MANIFESTO.md" },
    template: null,
    uncreatableReason:
      "the scaffold ships PROJECT_MANIFESTO.md; the project-manifesto skill fills it in",
  },
  summary: {
    filename: { kind: "fixed", name: "PROJECT-SUMMARY.md" },
    template: null,
    uncreatableReason:
      "PROJECT-SUMMARY.md is synthesized from the whole repository by the project-summary skill",
  },
  index: {
    filename: { kind: "fixed", name: "index.md" },
    template: null,
    uncreatableReason: "the scaffold ships index.md; entries are added to it, not the file",
  },

  // Owned. The fixed filenames come from `OWNED_FILE_TYPE` above.
  plan: { filename: fixedOwnedFile("plan"), template: "TEMPLATES/PLAN.template.md" },
  "design-resolution": {
    filename: fixedOwnedFile("design-resolution"),
    template: "TEMPLATES/DESIGN-RESOLUTION.template.md",
  },
  "test-plan": {
    filename: fixedOwnedFile("test-plan"),
    template: "TEMPLATES/TEST-PLAN.template.md",
  },
  handoff: {
    filename: fixedOwnedFile("handoff"),
    template: "TEMPLATES/HANDOFF.template.md",
  },
  "write-up": {
    filename: fixedOwnedFile("write-up"),
    template: "TEMPLATES/WRITE-UP.template.md",
  },
  kickoff: {
    filename: fixedOwnedFile("kickoff"),
    // Outside the docs tree, and outside the cookiecutter payload: a generated
    // project has no `plugins/` directory. The row exists so the lint can type
    // `DEV_KICKOFF.md`; the `dev-kickoff` skill owns creating it.
    template:
      "plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md",
    externalTemplate: true,
    uncreatableReason:
      "its template ships with the dev-kickoff plugin skill, outside the docs tree, where pdocs cannot reach it",
  },
  session: {
    filename: { kind: "slug", date: "day" },
    template: "TEMPLATES/YYYY-MM-DD-SESSION.template.md",
  },
  artifact: {
    filename: { kind: "freeform" },
    template: null,
    uncreatableReason:
      "an artifact is freeform by design — it has no filename grammar and no template",
  },
};

/**
 * The pre-write invariants, per type.
 *
 * One entry today. It is a table rather than a field on `CREATION` because
 * `CREATION` is about naming and seeding a file and this is about the corpus —
 * and because a reader looking for "what can refuse a `pdocs new`" should find
 * every answer in one place.
 */
const VALIDATION: Record<string, Validator> = {
  // A work item's references resolve, and are written in their full form
  // (D6): `--parent` a feature, `--cycle` a cycle's slug, `--blocked-by` item
  // ids. `scope` names one value `lint.scopes` declares. The same resolution
  // the lint runs over the tree afterwards, so nothing `new` writes is a
  // finding on the next `pdocs check`.
  item: ({ fields, resolve, scopes, set }) => {
    const problems: ValidationProblem[] = [];
    const value = (key: string) =>
      (fields.get(key) ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");

    const parent = value("parent");
    if (parent) set("parent", `feature/${resolve(parent, ["feature"]).slug}`);

    const cycle = value("cycle");
    if (cycle)
      set("cycle", resolve(cycle.startsWith("cycle/") ? cycle : `cycle/${cycle}`, ["cycle"]).slug);

    const blockers = (fields.get("blocked_by") ?? "")
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((b) => b.trim().replace(/^(["'])(.*)\1$/, "$2"))
      .filter(Boolean);
    if (blockers.length)
      set(
        "blocked_by",
        `[${blockers.map((b) => resolve(b, ["item"]).id ?? b).join(", ")}]`
      );

    const scope = value("scope");
    if (scope && !scopes.includes(scope))
      problems.push({
        kind: "usage",
        message:
          `--scope: \`${scope}\` is not declared — declare it in lint.scopes in .project-docs.json` +
          (scopes.length ? ` (declared: ${scopes.join(", ")})` : " (none are declared yet)") +
          ".",
      });

    return problems;
  },

  // "`pdocs new cycle` refuses to open a second active cycle." A cycle's
  // scope used to be resolved here too; it is derived from the items that
  // name the cycle now, so `scope:` is only kept in `extra` for the legacy
  // cycles until they are migrated, and nothing resolves it.
  cycle: ({ type, fields, documents }) => {
    const problems: ValidationProblem[] = [];

    if (fields.get("lifecycle") === "active") {
      const open = documents.filter(
        (d) => d.type === type && d.lifecycle === "active"
      );
      if (open.length)
        problems.push({
          kind: "conflict",
          message:
            `${open.map((d) => d.path).join(", ")} is already \`lifecycle: active\` — ` +
            `at most one ${type} is active at a time. Close it first, or create this ` +
            `one \`planned\`.`,
        });
    }

    return problems;
  },
};

/** The fixed name `OWNED_FILE_TYPE` already states for this type. */
function fixedOwnedFile(type: string): FilenameShape {
  const entry = Object.entries(OWNED_FILE_TYPE).find(([, t]) => t === type);
  if (!entry)
    throw new Error(`registry: no OWNED_FILE_TYPE entry names \`${type}\``);
  return { kind: "fixed", name: entry[0] };
}

/** The types retired in 9.0.0 (see `RegistryRow.retired`). */
export const RETIRED_TYPES = new Set([
  "proposal",
  "backlog",
  "fragment",
  "brief",
  "investigation",
  "memory",
  "lesson",
]);

/**
 * The owned types and their vocabularies. The legacy `PROJECT_SPEC` holds the
 * same entries for the types a project folder carried, plus `proposal`; the
 * registry declares each owned type once, from here.
 */
export const OWNED_SPEC: Record<string, { lifecycle: string[] | null }> = {
  plan: PROJECT_SPEC.plan!,
  "design-resolution": PROJECT_SPEC["design-resolution"]!,
  "test-plan": PROJECT_SPEC["test-plan"]!,
  kickoff: PROJECT_SPEC.kickoff!,
  handoff: PROJECT_SPEC.handoff!,
  session: PROJECT_SPEC.session!,
  artifact: PROJECT_SPEC.artifact!,
  report: { lifecycle: SPEC.reports!.lifecycle },
  "write-up": { lifecycle: null },
};

/** A work item's fields beyond the universal ones, and who writes them is in
 *  SCHEMA.md. `id` and `kind` are also required (`RegistryRow.required`). */
const ITEM_EXTRA = [
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
];

/**
 * Every document type, as one list.
 *
 * Order is stable and deliberate: library folders, root pages, workbench
 * folders, then project-scoped — the order SCHEMA.md's table uses, so a reader
 * comparing the two is not also diffing an ordering.
 */
export function buildRegistry(config: ProjectDocsConfig): RegistryRow[] {
  const rows: RegistryRow[] = [];

  const creation = (type: string): Creation => {
    const c = CREATION[type];
    if (!c) throw new Error(`registry: no filename or template declared for \`${type}\``);
    return c;
  };

  /** Docs-root-relative template paths become repository-relative here — the
   *  one place `config.docsRoot` enters the registry. */
  const resolveTemplate = (c: Creation): string | string[] | null => {
    if (c.template === null) return null;
    if (c.externalTemplate) return c.template;
    const under = (p: string) => `${config.docsRoot}/${p}`;
    return Array.isArray(c.template)
      ? c.template.map(under)
      : under(c.template);
  };

  const push = (
    type: string,
    tier: RegistryRow["tier"],
    scope: RegistryRow["scope"],
    folder: string,
    lifecycle: string[] | null,
    extra: string[],
    required: string[] = []
  ): void => {
    const c = creation(type);
    rows.push({
      type,
      tier,
      scope,
      folder,
      filename: c.filename,
      template: resolveTemplate(c),
      externalTemplate: c.externalTemplate === true,
      lifecycle,
      extra,
      required,
      ...(RETIRED_TYPES.has(type) ? { retired: true } : {}),
      creatable: c.uncreatableReason === undefined,
      ...(c.uncreatableReason === undefined
        ? {}
        : { uncreatableReason: fillDocs(c.uncreatableReason, config) }),
      ...(VALIDATION[type] === undefined
        ? {}
        : { validate: VALIDATION[type] }),
    });
  };

  // Library folders. `DURABLE_TYPE` is a folder-to-type map and carries no
  // lifecycle, because a living page is current or it is not.
  for (const [folder, type] of Object.entries(DURABLE_TYPE))
    push(type, "library", "docs", folder, null, []);

  // Root pages: singletons at a fixed path, no folder, no template.
  for (const type of Object.values(ROOT_PAGE_TYPE))
    push(type, "library", "root", "", null, []);

  // Workbench folders. A folder whose type is now OWNED (`reports/`) is still
  // typed by position until this repository migrates, but its row is the
  // owned one below — every type is declared once.
  for (const [folder, spec] of Object.entries(SPEC))
    if (!(spec.type in OWNED_SPEC))
      push(spec.type, "workbench", "docs", folder, spec.lifecycle, spec.extra ?? []);

  // The two entities. A feature is its owner folder's entry file; an item is a
  // file in `items/` until it owns documents, then `items/<slug>/item.md`.
  push("feature", "workbench", "owner", "", FEATURE_STATES, ["scope", "released_in"]);
  push("item", "workbench", "docs", ITEMS_FOLDER, ITEM_STATES, ITEM_EXTRA, [
    "id",
    "kind",
  ]);

  // The legacy project folder's entry file.
  push("proposal", "workbench", "owner", "", PROJECT_SPEC.proposal!.lifecycle, []);

  // Owned, in a feature, an item, or a legacy project.
  for (const [type, spec] of Object.entries(OWNED_SPEC))
    push(type, "workbench", "owner", OWNER_SUBFOLDER[type] ?? "", spec.lifecycle, []);

  // Folders this project declared in `.project-docs.json`. The scaffold ships
  // no template for them, so they are lintable but not creatable — the same
  // shape the root pages already use. A declaration that collides with a
  // built-in folder or type is ignored: the scaffold's own row wins.
  for (const [folder, type] of Object.entries(config.lint.types)) {
    if (rows.some((r) => r.folder === folder || r.type === type)) continue;
    rows.push({
      type,
      // The LINT's rule, not the inverse of it: `graphTier` skips `workbench`
      // and `skip`, so everything else is library. Choosing on `durable`
      // membership instead registered a folder listed in neither array as
      // workbench while the lint held it to the catalog obligation.
      tier: config.lint.workbench.includes(folder) ? "workbench" : "library",
      scope: "docs",
      folder,
      filename: { kind: "slug", date: "none" },
      template: null,
      externalTemplate: false,
      lifecycle: null,
      extra: [],
      required: [],
      creatable: false,
      uncreatableReason: `\`${type}\` is declared in this project's .project-docs.json; the scaffold ships no template for it`,
    });
  }

  return rows;
}

/** The registry keyed by type, for the readers that look one row up at a time. */
export function registryIndex(
  config: ProjectDocsConfig
): Map<string, RegistryRow> {
  return new Map(buildRegistry(config).map((row) => [row.type, row]));
}

/**
 * The index a caller gets when it has no config to hand.
 *
 * Only `lifecycle` and `extra` are read through this, and neither depends on
 * configuration — `docsRoot` reaches nothing but the template paths. Built once
 * because `documentProblems` is called per document.
 */
let defaults: Map<string, RegistryRow> | null = null;
export function defaultRegistryIndex(): Map<string, RegistryRow> {
  defaults ??= registryIndex(DEFAULT_CONFIG);
  return defaults;
}
