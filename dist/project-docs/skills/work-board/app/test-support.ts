// Builders for the model and selection tests. Not part of the app.
import type { Advisory, PortfolioEntry, Snapshot, ViewEntry } from "./model.ts";

const GROUP: Record<string, string> = {
  triage: "unstarted",
  backlog: "unstarted",
  ready: "unstarted",
  planned: "unstarted",
  active: "started",
  review: "started",
  done: "completed",
  closed: "completed",
  dropped: "cancelled",
};

let seq = 0;

/** One `pdocs view` entry, an item unless `entity` says otherwise. */
export function entry(over: Partial<ViewEntry> & { slug: string }): ViewEntry {
  const entity = over.entity ?? "item";
  const lifecycle = over.lifecycle === undefined ? "backlog" : over.lifecycle;
  const folder = entity === "item" ? "items" : entity === "feature" ? "features" : "cycles";
  return {
    path: `docs/${folder}/${over.slug}.md`,
    entity,
    id: entity === "item" ? `id-${over.slug}` : null,
    title: `Title of ${over.slug}`,
    status: "stable",
    kind: entity === "item" ? "task" : null,
    lifecycle,
    group: lifecycle === null ? null : (GROUP[lifecycle] ?? null),
    priority: null,
    assignee: null,
    parent: null,
    cycle: null,
    scope: null,
    blockedBy: [],
    releasedIn: null,
    archived: false,
    date: `2026-11-${String((seq++ % 28) + 1).padStart(2, "0")}`,
    description: null,
    from: null,
    source: null,
    appetite: null,
    started: null,
    ...over,
  };
}

export function portfolioEntry(
  entity: "cycle" | "feature",
  slug: string,
  lifecycle: string,
  over: Partial<PortfolioEntry> = {}
): PortfolioEntry {
  return {
    entity,
    path: entity === "cycle" ? `docs/cycles/${slug}.md` : `docs/features/${slug}/feature.md`,
    slug,
    title: `Title of ${slug}`,
    lifecycle,
    archived: false,
    current: true,
    counts: {},
    ...over,
  };
}

export interface SnapshotParts {
  /** Items and features, as `view board --features --all` lists them. */
  entries?: ViewEntry[];
  /** `[slug, lifecycle, status]`: a portfolio row and the cycle's own entry. */
  cycles?: Array<[slug: string, lifecycle: string, status: string | null]>;
  /** Portfolio rows with no cycle entry behind them. */
  bareCycles?: Array<[slug: string, lifecycle: string]>;
  unreviewed?: ViewEntry[];
  advisories?: Advisory[];
}

export function snapshot(parts: SnapshotParts = {}): Snapshot {
  const groups: Record<string, ViewEntry[]> = { unstarted: [], started: [], completed: [], cancelled: [] };
  for (const e of parts.entries ?? []) (groups[e.group ?? "unstarted"] ??= []).push(e);
  const cycles = parts.cycles ?? [];
  const features = (parts.entries ?? []).filter((e) => e.entity === "feature" && !e.archived);
  return {
    board: { view: "board", groups, advisories: parts.advisories ?? [] },
    portfolio: {
      view: "portfolio",
      cycles: [
        ...cycles.map(([slug, lifecycle]) => portfolioEntry("cycle", slug, lifecycle)),
        ...(parts.bareCycles ?? []).map(([slug, lifecycle]) => portfolioEntry("cycle", slug, lifecycle)),
      ],
      features: features.map((f) => portfolioEntry("feature", f.slug, f.lifecycle ?? "backlog", { title: f.title })),
      advisories: [],
    },
    unreviewed: { view: "unreviewed", items: parts.unreviewed ?? [], advisories: [] },
    cycles: cycles.map(([slug, lifecycle, status]) => entry({ slug, entity: "cycle", lifecycle, status })),
  };
}

export const slugs = (list: ReadonlyArray<{ slug: string }>): string[] => list.map((i) => i.slug);
