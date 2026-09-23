// The work model: features, items and cycles, read once, and the one way a
// reference to any of them is resolved.
//
// Everything that asks "which entity does this string name" asks here — the
// lint's corpus rules (`lint/work.ts`), `pdocs new`'s `--parent`, `--owner` and
// `--blocked-by`, `set`, `promote`, `archive` and `view`. A second resolver is
// how the writer and the checker come to disagree about the same tree.
//
// Built on the documents the thin lint pass already reads (`workbenchDocuments`)
// rather than on `collectPages`: the model needs every frontmatter field, a
// `Page` carries a fixed handful, and the lint hands its own read straight in
// so the gate still walks the tree once.

import { existsSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import { parseGenerated, yamlList } from "./docs-lint/index.ts";
import { UsageError } from "./envelope.ts";
import {
  ENTITY_FILE,
  FEATURES_FOLDER,
  ITEMS_FOLDER,
  PRIORITIES,
  STATE_GROUP,
  type StateGroup,
} from "./lint/registry.ts";
import {
  type Ctx,
  type WorkbenchDocument,
  workbenchDocuments,
} from "./lint/rules.ts";
import { UUID_RE, isUuid } from "./uuid.ts";

export const ARCHIVE = "_archive";

/** A scalar with any surrounding quotes removed. */
export const scalar = (v: string | undefined): string =>
  (v ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");

/** One feature, item or cycle. */
export interface WorkEntity {
  entity: "feature" | "item" | "cycle";
  /** Repo-relative path of the entity file. */
  path: string;
  /** The same, relative to the docs root, `/`-separated. */
  docsPath: string;
  /** The folder name, or the file name without `.md` for a single-file item
   *  and a cycle. */
  slug: string;
  archived: boolean;
  /** The entity's folder, docs-root-relative (`items/_archive/x`), when it has
   *  one. `null` for a single-file item and for a cycle. */
  folder: string | null;
  fields: ReadonlyMap<string, string>;
  title: string | null;
  lifecycle: string | null;
  /** `STATE_GROUP[lifecycle]`, or `null` for a state outside the vocabulary. */
  group: StateGroup | null;
  /** An item's `id`, as written (quotes removed). */
  id: string | null;
  /** An item's `kind`. */
  kind: string | null;
  parent: string | null;
  cycle: string | null;
  scope: string | null;
  from: string | null;
  blockedBy: string[];
  priority: string | null;
  assignee: string | null;
  releasedIn: string | null;
  /** `generated.at`. */
  date: string | null;
}

export interface WorkModel {
  features: WorkEntity[];
  items: WorkEntity[];
  cycles: WorkEntity[];
  /** Items by `id` exactly as written. A duplicate id lists every holder. */
  itemsById: ReadonlyMap<string, WorkEntity[]>;
  featuresBySlug: ReadonlyMap<string, WorkEntity[]>;
  itemsBySlug: ReadonlyMap<string, WorkEntity[]>;
  cyclesBySlug: ReadonlyMap<string, WorkEntity[]>;
}

/**
 * Where a document under an owner folder sits: the owner (`features` or
 * `items`), whether it is under `_archive/`, and the segments below that.
 * `null` for anything outside the two owners.
 *
 * Read relative to the RESOLVED docs root, never the configured string: a
 * `docsRoot` spelled `./docs` or `docs/` is the same folder.
 */
export function ownerPosition(
  ctx: Ctx,
  rel: string
): { owner: string; archived: boolean; segs: string[] } | null {
  const within = relative(ctx.docsRoot, join(ctx.repoRoot, rel));
  if (within === "" || within.startsWith("..") || isAbsolute(within)) return null;
  const segs = within.split(sep);
  const owner = segs[0] as string;
  if (owner !== FEATURES_FOLDER && owner !== ITEMS_FOLDER) return null;
  let rest = segs.slice(1);
  const archived = rest[0] === ARCHIVE && rest.length > 1;
  if (archived) rest = rest.slice(1);
  return { owner, archived, segs: rest };
}

function opt(fields: ReadonlyMap<string, string>, key: string): string | null {
  const v = scalar(fields.get(key));
  return v === "" ? null : v;
}

function entityOf(ctx: Ctx, doc: WorkbenchDocument): WorkEntity | null {
  if (doc.misplaced) return null;
  const docsPath = relative(ctx.docsRoot, join(ctx.repoRoot, doc.rel))
    .split(sep)
    .join("/");
  let entity: WorkEntity["entity"];
  let slug: string;
  let archived = false;
  let folder: string | null = null;

  if (doc.type === "cycle") {
    entity = "cycle";
    slug = basename(doc.rel, ".md");
  } else if (doc.type === "feature" || doc.type === "item") {
    const pos = ownerPosition(ctx, doc.rel);
    if (!pos) return null;
    entity = doc.type;
    archived = pos.archived;
    if (pos.segs.length === 1) slug = basename(pos.segs[0] as string, ".md");
    else {
      slug = pos.segs[0] as string;
      folder = `${pos.owner}/${archived ? `${ARCHIVE}/` : ""}${slug}`;
    }
  } else return null;

  const f = doc.fields;
  const lifecycle = opt(f, "lifecycle");
  return {
    entity,
    path: doc.rel,
    docsPath,
    slug,
    archived,
    folder,
    fields: f,
    title: opt(f, "title"),
    lifecycle,
    group: (lifecycle && STATE_GROUP[lifecycle]) || null,
    id: opt(f, "id"),
    kind: opt(f, "kind"),
    parent: opt(f, "parent"),
    cycle: opt(f, "cycle"),
    scope: opt(f, "scope"),
    from: opt(f, "from"),
    blockedBy: yamlList(f.get("blocked_by"))
      .map((b) => scalar(b))
      .filter(Boolean),
    priority: opt(f, "priority"),
    assignee: opt(f, "assignee"),
    releasedIn: opt(f, "released_in"),
    date: parseGenerated(f.get("generated"))?.at ?? null,
  };
}

const byPath = (a: WorkEntity, b: WorkEntity) =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

function index(
  list: readonly WorkEntity[],
  key: (e: WorkEntity) => string | null
): Map<string, WorkEntity[]> {
  const out = new Map<string, WorkEntity[]>();
  for (const e of list) {
    const k = key(e);
    if (k) out.set(k, [...(out.get(k) ?? []), e]);
  }
  return out;
}

/**
 * The model over a set of documents. `documents` defaults to a fresh read; the
 * lint passes the ones its thin pass already has.
 */
export function workModel(
  ctx: Ctx,
  documents: readonly WorkbenchDocument[] = workbenchDocuments(ctx)
): WorkModel {
  const all = documents
    .map((d) => entityOf(ctx, d))
    .filter((e): e is WorkEntity => e !== null)
    .sort(byPath);
  const features = all.filter((e) => e.entity === "feature");
  const items = all.filter((e) => e.entity === "item");
  const cycles = all.filter((e) => e.entity === "cycle");
  return {
    features,
    items,
    cycles,
    itemsById: index(items, (e) => e.id),
    featuresBySlug: index(features, (e) => e.slug),
    itemsBySlug: index(items, (e) => e.slug),
    cyclesBySlug: index(cycles, (e) => e.slug),
  };
}

/** The model over the tree as it stands. */
export function collectWork(ctx: Ctx): WorkModel {
  return workModel(ctx);
}

/** The shortest id prefix `resolveRef` accepts (D6). */
export const MIN_PREFIX = 8;

const FORMS =
  "a full item id, a unique id prefix of 8+ characters, `item/<slug>`, `feature/<slug>` or `cycle/<slug>`";

/**
 * The entity a reference names, in any form D6 accepts as INPUT:
 *
 * - a full UUID, any case;
 * - a unique prefix of at least 8 characters of one;
 * - `item/<slug>` (a file or a folder, live or archived), or `item/<id-or-prefix>`;
 * - `feature/<slug>`;
 * - `cycle/<slug>`.
 *
 * `kinds` narrows what the reference may name (`--parent` takes a feature
 * only). Anything that names nothing, or names more than one, is a
 * `UsageError`: retrying the same string fails the same way.
 */
export function resolveRef(
  model: WorkModel,
  ref: string,
  kinds: ReadonlyArray<WorkEntity["entity"]> = ["feature", "item", "cycle"]
): WorkEntity {
  const wanted = ref.trim();
  const one = (found: WorkEntity[], what: string): WorkEntity => {
    if (found.length === 0)
      throw new UsageError(`\`${ref}\` names no ${what} in this tree — expected ${FORMS}.`, {
        token: ref,
      });
    if (found.length > 1)
      throw new UsageError(
        `\`${ref}\` is ambiguous — it names ${found.length} entities: ${found
          .map((e) => e.path)
          .join(", ")}. Use a longer id prefix or the full id.`,
        { token: ref, choices: found.map((e) => e.path) }
      );
    const e = found[0] as WorkEntity;
    if (!kinds.includes(e.entity))
      throw new UsageError(
        `\`${ref}\` names a ${e.entity} (${e.path}); a ${kinds.join(" or ")} is expected here.`,
        { token: ref }
      );
    return e;
  };

  const byId = (value: string): WorkEntity[] | null => {
    const v = value.toLowerCase();
    if (isUuid(v)) return model.items.filter((e) => e.id?.toLowerCase() === v);
    if (/^[0-9a-f-]+$/.test(v) && /[0-9a-f]/.test(v)) {
      if (v.replace(/-/g, "").length < MIN_PREFIX)
        throw new UsageError(
          `\`${value}\` is too short to be an id prefix — give at least ${MIN_PREFIX} characters.`,
          { token: value }
        );
      return model.items.filter((e) => e.id?.toLowerCase().startsWith(v));
    }
    return null;
  };

  const m = /^(feature|item|cycle)\/(.+)$/.exec(wanted);
  if (m) {
    const [, kind, name] = m as unknown as [string, WorkEntity["entity"], string];
    if (kind === "feature") return one(model.featuresBySlug.get(name) ?? [], "feature");
    if (kind === "cycle") return one(model.cyclesBySlug.get(name) ?? [], "cycle");
    const bySlug = model.itemsBySlug.get(name);
    if (bySlug) return one(bySlug, "item");
    const ids = /^[0-9a-f-]+$/i.test(name) ? byId(name) : null;
    return one(ids ?? [], "item");
  }

  const ids = byId(wanted);
  if (ids !== null) return one(ids, "item");
  throw new UsageError(`\`${ref}\` is not a reference — expected ${FORMS}.`, {
    token: ref,
  });
}

/** How an entity is WRITTEN into another's frontmatter (D6): an item by its
 *  full id, a feature as `feature/<slug>`, a cycle by its bare slug in
 *  `cycle:` and as `cycle/<slug>` in `from:`. */
export function refFor(e: WorkEntity, field: "cycle" | "other" = "other"): string {
  if (e.entity === "item") return e.id ?? `item/${e.slug}`;
  if (e.entity === "cycle") return field === "cycle" ? e.slug : `cycle/${e.slug}`;
  return `feature/${e.slug}`;
}

/** The entry file's name for an owner folder (D2). */
export function entityFileName(entity: "feature" | "item"): string {
  return ENTITY_FILE[entity === "feature" ? FEATURES_FOLDER : ITEMS_FOLDER]!.name;
}

/** `urgent` first, then down to `low`, then no priority. */
export function priorityRank(p: string | null): number {
  const i = p === null ? -1 : PRIORITIES.indexOf(p);
  return i === -1 ? PRIORITIES.length : i;
}

/** Whether a STORED `parent:` names a feature in the tree (D6: `feature/<slug>`). */
export function parentResolves(model: WorkModel, parent: string): boolean {
  const m = /^feature\/(.+)$/.exec(parent);
  return m !== null && model.featuresBySlug.has(m[1] as string);
}

/**
 * Whether a STORED `from:` resolves, in one of its four forms (D6): an item's
 * full id, `feature/<slug>`, `cycle/<slug>`, or a docs-root-relative path to a
 * document. Stored values are checked strictly — no prefixes, no `item/<slug>`;
 * those are input forms, and `pdocs` writes the full form.
 */
export function fromResolves(ctx: Ctx, model: WorkModel, from: string): boolean {
  if (UUID_RE.test(from)) return model.itemsById.has(from);
  const feature = /^feature\/(.+)$/.exec(from);
  if (feature) return model.featuresBySlug.has(feature[1] as string);
  const cycle = /^cycle\/(.+)$/.exec(from);
  if (cycle) return model.cyclesBySlug.has(cycle[1] as string);
  if (!from.endsWith(".md") || from.startsWith("/") || from.split("/").includes(".."))
    return false;
  const abs = join(ctx.docsRoot, from);
  return existsSync(abs) && statSync(abs).isFile();
}
