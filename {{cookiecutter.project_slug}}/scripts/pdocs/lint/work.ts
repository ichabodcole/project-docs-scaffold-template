// The work taxonomy's corpus rules: what cannot be decided one document at a
// time.
//
// `documentProblems` checks each field's shape. This file checks what the
// fields POINT AT — a `parent` that must be a feature in the tree, a `cycle`
// that must be a cycle file, `blocked_by` ids that must be items and must not
// loop, a `from` in one of the four forms of the reference grammar (plan D6) —
// and what only the whole tree shows: two items with one id, an entity folder
// with no entity file, an archive holding unfinished work (D15), and one slug
// used twice, which would make `item/<slug>` ambiguous.
//
// It reads the documents the thin pass already read (`thinReport`), so the
// tree is walked once. The only other filesystem question it asks is whether a
// `from:` path names a file, which is a stat, not a walk.

import { existsSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import { parseFrontmatter, yamlList } from "../docs-lint/index.ts";
import { ENTITY_FILE, FEATURES_FOLDER, ITEMS_FOLDER, STATE_GROUP } from "./registry.ts";
import {
  type Ctx,
  UUID_RE,
  type WorkbenchDocument,
  gitEnv,
  workbenchDocuments,
} from "./rules.ts";

const ARCHIVE = "_archive";

/** An entity (feature or item) as its position and frontmatter describe it. */
interface Entity {
  doc: WorkbenchDocument;
  kind: "feature" | "item";
  /** The folder name, or the file name without `.md` for a single-file item. */
  slug: string;
  archived: boolean;
  /** The entity's folder, docs-root-relative, when it has one. */
  folder: string | null;
}

/**
 * Where an owner folder's document sits: the owner (`features` or `items`),
 * whether it is under `_archive/`, and the segments below that.
 */
function position(
  ctx: Ctx,
  rel: string
): { owner: string; archived: boolean; segs: string[] } | null {
  // Relative to the resolved docs root, never to the configured string: a
  // `docsRoot` spelled `./docs` or `docs/` is the same folder, and a prefix
  // comparison against the spelling silently matched nothing.
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

function entityOf(ctx: Ctx, doc: WorkbenchDocument): Entity | null {
  if (doc.misplaced || (doc.type !== "feature" && doc.type !== "item")) return null;
  const pos = position(ctx, doc.rel);
  if (!pos) return null;
  const { owner, archived, segs } = pos;
  const archivePart = archived ? `${ARCHIVE}/` : "";
  // `items/<slug>.md` — a single-file item.
  if (segs.length === 1)
    return {
      doc,
      kind: doc.type,
      slug: basename(segs[0] as string, ".md"),
      archived,
      folder: null,
    };
  return {
    doc,
    kind: doc.type,
    slug: segs[0] as string,
    archived,
    folder: `${owner}/${archivePart}${segs[0]}`,
  };
}

/** A scalar with any surrounding quotes removed. */
const scalar = (v: string | undefined): string =>
  (v ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");

/** True when the raw value is written as a list, flow or block. */
const isList = (raw: string): boolean => /^\[/.test(raw.trim()) || /^-\s/.test(raw.trim());

/**
 * Every corpus problem in the workbench.
 *
 * `documents` defaults to a fresh read; `collect` passes the ones the thin
 * pass already has, so the gate walks the tree once.
 */
export function workProblems(
  ctx: Ctx,
  documents: readonly WorkbenchDocument[] = workbenchDocuments(ctx)
): string[] {
  const problems: string[] = [];

  const entities = documents
    .map((d) => entityOf(ctx, d))
    .filter((e): e is Entity => e !== null);
  const items = entities.filter((e) => e.kind === "item");
  const features = entities.filter((e) => e.kind === "feature");
  const featureSlugs = new Set(features.map((f) => f.slug));
  const cycleSlugs = new Set(
    documents.filter((d) => d.type === "cycle").map((d) => basename(d.rel, ".md"))
  );

  // ---- ids ----------------------------------------------------------------------------
  const byId = new Map<string, Entity[]>();
  for (const it of items) {
    const id = scalar(it.doc.fields.get("id"));
    if (!id) continue;
    byId.set(id, [...(byId.get(id) ?? []), it]);
  }
  for (const [id, holders] of byId)
    if (holders.length > 1)
      problems.push(
        `DUPLICATE ID  ${id}  ${holders.map((h) => h.doc.rel).join(", ")}  (an id names one item)`
      );

  // ---- slugs --------------------------------------------------------------------------
  for (const [kind, group] of [
    ["item", items],
    ["feature", features],
  ] as const) {
    const bySlug = new Map<string, Entity[]>();
    for (const e of group) bySlug.set(e.slug, [...(bySlug.get(e.slug) ?? []), e]);
    for (const [slug, holders] of bySlug)
      if (holders.length > 1)
        problems.push(
          `DUPLICATE SLUG  ${kind}/${slug}  ${holders.map((h) => h.doc.rel).join(", ")}  (\`${kind}/${slug}\` must name one ${kind})`
        );
  }

  // ---- the archive holds only finished work (D15) --------------------------------------
  for (const e of entities) {
    if (!e.archived) continue;
    const state = scalar(e.doc.fields.get("lifecycle"));
    const group = STATE_GROUP[state];
    if (group !== "completed" && group !== "cancelled")
      problems.push(
        `ARCHIVED NOT TERMINAL  ${e.doc.rel}: "${state}"  (only done or dropped may sit in ${ARCHIVE}/; \`lifecycle\` is the source of truth)`
      );
  }

  // ---- entity folders hold their entity file ------------------------------------------
  const folders = new Map<string, string>(); // docs-relative folder -> owner
  for (const d of documents) {
    const pos = position(ctx, d.rel);
    if (!pos || pos.segs.length < 2) continue;
    const archivePart = pos.archived ? `${ARCHIVE}/` : "";
    folders.set(`${pos.owner}/${archivePart}${pos.segs[0]}`, pos.owner);
  }
  const withEntity = new Set(entities.map((e) => e.folder).filter(Boolean));
  for (const [folder, owner] of [...folders].sort())
    if (!withEntity.has(folder))
      problems.push(
        `MISSING ENTITY FILE  ${relative(ctx.repoRoot, join(ctx.docsRoot, folder))}/  (expected ${ENTITY_FILE[owner]!.name})`
      );

  // ---- references ---------------------------------------------------------------------
  const declaredScopes = new Set(ctx.config.lint.scopes);
  for (const e of entities) {
    const { rel, fields } = e.doc;

    const rawScope = fields.get("scope");
    if (rawScope) {
      if (isList(rawScope))
        problems.push(
          `BAD SCOPE  ${rel}: "${rawScope}"  (scope takes one value)`
        );
      else if (!declaredScopes.has(scalar(rawScope)))
        problems.push(
          `BAD SCOPE  ${rel}: "${scalar(rawScope)}"  (declare it in lint.scopes in .project-docs.json)`
        );
    }

    if (e.kind !== "item") continue;

    const parent = scalar(fields.get("parent"));
    if (parent) {
      const m = /^feature\/(.+)$/.exec(parent);
      if (!m || !featureSlugs.has(m[1] as string))
        problems.push(
          `BAD PARENT  ${rel}: "${parent}"  (a parent is \`feature/<slug>\`, naming a feature in the tree)`
        );
    }

    const cycle = scalar(fields.get("cycle"));
    if (cycle && !cycleSlugs.has(cycle))
      problems.push(
        `BAD CYCLE  ${rel}: "${cycle}"  (no cycle file by that slug)`
      );

    for (const blocker of yamlList(fields.get("blocked_by")).map((b) => scalar(b)))
      if (!byId.has(blocker))
        problems.push(
          `BAD BLOCKED_BY  ${rel}: "${blocker}"  (no item has that id)`
        );

    const from = scalar(fields.get("from"));
    if (from && !fromResolves(ctx, from, byId, featureSlugs, cycleSlugs))
      problems.push(
        `BAD FROM  ${rel}: "${from}"  (an item id, \`feature/<slug>\`, \`cycle/<slug>\`, or a docs-root-relative path to a document)`
      );
  }

  problems.push(...blockedCycles(items, byId));
  return problems;
}

/** The four forms `from:` may take (D6), each resolved against the tree. */
function fromResolves(
  ctx: Ctx,
  from: string,
  byId: ReadonlyMap<string, Entity[]>,
  featureSlugs: ReadonlySet<string>,
  cycleSlugs: ReadonlySet<string>
): boolean {
  if (UUID_RE.test(from)) return byId.has(from);
  const feature = /^feature\/(.+)$/.exec(from);
  if (feature) return featureSlugs.has(feature[1] as string);
  const cycle = /^cycle\/(.+)$/.exec(from);
  if (cycle) return cycleSlugs.has(cycle[1] as string);
  if (!from.endsWith(".md") || from.startsWith("/") || from.split("/").includes(".."))
    return false;
  const abs = join(ctx.docsRoot, from);
  return existsSync(abs) && statSync(abs).isFile();
}

/**
 * Every loop in the `blocked_by` graph, once each. An item blocking itself is a
 * loop of one. A loop is reported starting from its lexically first path, so
 * the same loop found from two of its members is one row.
 */
function blockedCycles(
  items: readonly Entity[],
  byId: ReadonlyMap<string, Entity[]>
): string[] {
  const edges = new Map<string, string[]>(); // rel -> blocker rels
  for (const it of items)
    edges.set(
      it.doc.rel,
      yamlList(it.doc.fields.get("blocked_by"))
        .map((b) => scalar(b))
        .flatMap((id) => (byId.get(id) ?? []).map((e) => e.doc.rel))
    );

  const found = new Set<string>();
  const out: string[] = [];
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];

  const visit = (node: string): void => {
    state.set(node, "visiting");
    stack.push(node);
    for (const next of edges.get(node) ?? []) {
      if (state.get(next) === "visiting") {
        const loop = stack.slice(stack.indexOf(next));
        const start = loop.indexOf([...loop].sort()[0] as string);
        const canonical = [...loop.slice(start), ...loop.slice(0, start)];
        const key = canonical.join(" → ");
        if (!found.has(key)) {
          found.add(key);
          out.push(
            `BLOCKED CYCLE  ${key} → ${canonical[0]}  (blocked_by must not loop)`
          );
        }
      } else if (!state.has(next)) visit(next);
    }
    stack.pop();
    state.set(node, "done");
  };
  for (const node of [...edges.keys()].sort()) if (!state.has(node)) visit(node);
  return out;
}

// ---------------------------------------------------------------------------------------
// No silent deletion (D9)
// ---------------------------------------------------------------------------------------

/** A git spawn from the lint: `gitEnv()` always, so a hook's index is not read. */
function gitRun(ctx: Ctx, args: string[], stdin?: string) {
  return Bun.spawnSync(["git", ...args], {
    cwd: ctx.repoRoot,
    env: gitEnv(),
    stdin: stdin === undefined ? "ignore" : new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
}

/** Whether `ref` names a commit in the repository at `ctx.repoRoot`. `null`
 *  when there is no repository at all. */
export function refExists(ctx: Ctx, ref: string): boolean | null {
  if (!gitRun(ctx, ["rev-parse", "--git-dir"]).success) return null;
  return gitRun(ctx, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).success;
}

/**
 * Items that were in the tree at `ref` and are not in it now, and were not
 * `dropped` there. A move, a promotion or an archive keeps the `id`, so it is
 * not a deletion; only an id that has gone from the working tree is.
 *
 * One `ls-tree` for the paths and one `cat-file --batch` for every blob, so
 * the cost is two spawns whatever the size of the backlog. No repository, or
 * a ref that does not resolve (a repository with no commits yet), is no
 * finding: there is nothing to compare against.
 */
export function deletedItems(
  ctx: Ctx,
  ref: string = ctx.against ?? "HEAD",
  documents: readonly WorkbenchDocument[] = workbenchDocuments(ctx)
): string[] {
  if (refExists(ctx, ref) !== true) return [];

  const itemsDir = join(ctx.config.docsRoot, ITEMS_FOLDER);
  // `-z`: without it git C-quotes any path with a non-ASCII byte in it
  // (`"docs/items/caf\303\251.md"`), which then names no blob.
  const listed = gitRun(ctx, ["ls-tree", "-r", "-z", "--name-only", ref, "--", itemsDir]);
  if (!listed.success) return [];
  const paths = listed.stdout
    .toString()
    .split("\0")
    .filter((p) => p.endsWith(".md"));
  if (paths.length === 0) return [];

  const batch = gitRun(
    ctx,
    ["cat-file", "--batch"],
    paths.map((p) => `${ref}:./${p}\n`).join("")
  );
  if (!batch.success) return [];

  // Ids compare lowercased: `BAD ID … (lowercase)` asks for exactly that
  // edit, and making it must not read as the item leaving the tree.
  const current = new Set(
    documents
      .filter((d) => d.type === "item")
      .map((d) => scalar(d.fields.get("id")).toLowerCase())
      .filter(Boolean)
  );

  const problems: string[] = [];
  const out = Buffer.from(batch.stdout);
  let at = 0;
  for (const path of paths) {
    const eol = out.indexOf(0x0a, at);
    if (eol < 0) break;
    const header = out.subarray(at, eol).toString();
    at = eol + 1;
    const m = /^\S+ blob (\d+)$/.exec(header);
    if (!m) continue; // `missing`, or not a blob
    const size = Number(m[1]);
    const body = out.subarray(at, at + size).toString("utf8");
    at += size + 1; // the blob, and the newline cat-file writes after it

    const fm = /^---\n([\s\S]*?)\n---/.exec(body);
    if (!fm) continue;
    const fields = parseFrontmatter(fm[1] as string);
    if (scalar(fields.get("type")) !== "item") continue;
    const id = scalar(fields.get("id"));
    if (!id || current.has(id.toLowerCase())) continue;
    // Still there, at the same path, and unreadable as an item — CRLF line
    // endings, a broken block. Its own parse problem is the finding; it has
    // not left the tree.
    if (existsSync(join(ctx.repoRoot, path))) continue;
    const state = scalar(fields.get("lifecycle"));
    if (state === "dropped") continue;
    problems.push(
      `ITEM DELETED  ${path}: ${id}  (it left the tree at "${state || "no lifecycle"}" without reaching \`dropped\` — restore it and set \`lifecycle: dropped\`; nothing is deleted, it is dropped)`
    );
  }
  return problems;
}
