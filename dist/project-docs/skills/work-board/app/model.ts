// The work board's model: what each page lists, as pure functions over one
// snapshot of `pdocs view` JSON. Nothing here touches the DOM, the network or
// the clock; a caller passes `now` where a rule needs it.

// ---- the snapshot ----------------------------------------------------------

/** One entity as `pdocs view … --json` lists it. */
export interface ViewEntry {
  path: string;
  entity: "item" | "feature" | "cycle";
  slug: string;
  id: string | null;
  title: string | null;
  /** `draft`, `stable` or `deprecated`; `stable` means the content was reviewed. */
  status: string | null;
  kind: string | null;
  lifecycle: string | null;
  group: string | null;
  priority: string | null;
  assignee: string | null;
  /** A feature ref, `feature/<slug>`. */
  parent: string | null;
  /** A cycle's slug. */
  cycle: string | null;
  scope: string | null;
  /** Ids of the items this one waits on. */
  blockedBy: string[];
  releasedIn: string | null;
  archived: boolean;
  date: string | null;
  description: string | null;
  from: string | null;
  source: string | null;
  /** On a cycle entry only; `null` on an item or a feature. */
  appetite: string | null;
  /** On a cycle entry only; `null` on an item or a feature. */
  started: string | null;
}

/** An advisory as a view returns it. Only these three keys are read, and `action` may be absent. */
export interface Advisory {
  id: string;
  message: string;
  action?: string;
  [key: string]: unknown;
}

/** A cycle or a feature as `view portfolio` lists it. It carries no `status`. */
export interface PortfolioEntry {
  entity: "cycle" | "feature";
  path: string;
  slug: string;
  title: string | null;
  lifecycle: string | null;
  archived: boolean;
  current: boolean;
  counts: Record<string, number>;
}

/** The `data` of each read the board polls, side by side. */
export interface Snapshot {
  /** `view board --features --all`: every item and feature, archived included. */
  board: { view?: string; groups: Record<string, ViewEntry[]>; advisories: Advisory[] };
  /** `view portfolio`: the current cycles and features. */
  portfolio: { view?: string; cycles: PortfolioEntry[]; features: PortfolioEntry[]; advisories: Advisory[] };
  /** `view unreviewed`: finished items never marked reviewed. */
  unreviewed: { view?: string; items: ViewEntry[]; advisories: Advisory[] };
  /**
   * The `cycle` entry of `view cycle <slug>` for each current cycle. A
   * portfolio row has no `status`, `appetite` or `started`; these do.
   */
  cycles: ViewEntry[];
}

// ---- lookups ---------------------------------------------------------------

const STARTED = ["active", "review"];
const FINISHED = ["done", "dropped"];

/** Every item and feature in the snapshot, archived ones included. */
export function allEntries(s: Snapshot): ViewEntry[] {
  return Object.values(s.board.groups).flat();
}

/** Every item, archived ones included. */
export function allItems(s: Snapshot): ViewEntry[] {
  return allEntries(s).filter((e) => e.entity === "item");
}

/** Items that are not archived. */
export function liveItems(s: Snapshot): ViewEntry[] {
  return allItems(s).filter((e) => !e.archived);
}

export const isOpen = (e: ViewEntry): boolean => !FINISHED.includes(e.lifecycle ?? "");
export const isStarted = (e: ViewEntry): boolean => STARTED.includes(e.lifecycle ?? "");

/** The slug in a `feature/<slug>` parent, or `null`. */
export function featureSlug(parent: string | null): string | null {
  if (!parent) return null;
  return parent.startsWith("feature/") ? parent.slice("feature/".length) : parent;
}

/** The one active cycle, or `null`. */
export function activeCycle(s: Snapshot): PortfolioEntry | null {
  return s.portfolio.cycles.find((c) => c.lifecycle === "active" && !c.archived) ?? null;
}

/** A cycle's own entry (status, appetite, started), when the snapshot has it. */
export function cycleEntry(s: Snapshot, slug: string): ViewEntry | null {
  return s.cycles.find((c) => c.slug === slug) ?? null;
}

function cycleTitle(s: Snapshot, slug: string): string {
  return s.portfolio.cycles.find((c) => c.slug === slug)?.title ?? cycleEntry(s, slug)?.title ?? slug;
}

function featureTitle(s: Snapshot, slug: string): string {
  return (
    s.portfolio.features.find((f) => f.slug === slug)?.title ??
    allEntries(s).find((e) => e.entity === "feature" && e.slug === slug)?.title ??
    slug
  );
}

export function cycleItems(s: Snapshot, slug: string): ViewEntry[] {
  return allItems(s).filter((i) => i.cycle === slug);
}

export function featureItems(s: Snapshot, slug: string): ViewEntry[] {
  return allItems(s).filter((i) => featureSlug(i.parent) === slug);
}

// ---- order -----------------------------------------------------------------

const PRIORITIES = ["urgent", "high", "medium", "low"];

function priorityRank(p: string | null): number {
  const i = p === null ? -1 : PRIORITIES.indexOf(p);
  return i === -1 ? PRIORITIES.length : i;
}

/** Priority, urgent first and none last, then title. */
export function sorted(list: readonly ViewEntry[]): ViewEntry[] {
  return [...list].sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) || (a.title ?? a.slug).localeCompare(b.title ?? b.slug)
  );
}

// ---- a container's page: a cycle or a feature ------------------------------

export interface ContainerGroup {
  /** `added`, or the lifecycle the group holds. */
  id: string;
  label: string;
  items: ViewEntry[];
  /** Shown as one folded line until opened. Only `done` folds. */
  fold: boolean;
}

const GROUP_ORDER = ["active", "review", "ready", "backlog", "triage"];

/**
 * A container's items as one grouped list. Empty groups are left out. Items
 * brought in during this visit (`added`, slugs in the order they arrived) sit
 * in their own group at the top and nowhere else. Done is last and folded.
 */
export function containerGroups(items: readonly ViewEntry[], added: readonly string[] = []): ContainerGroup[] {
  const addedItems = added.flatMap((slug) => items.find((i) => i.slug === slug) ?? []);
  const rest = items.filter((i) => !addedItems.includes(i));
  const groups: ContainerGroup[] = [];
  if (addedItems.length) groups.push({ id: "added", label: "Added just now", items: addedItems, fold: false });
  for (const lifecycle of GROUP_ORDER) {
    const members = sorted(rest.filter((i) => i.lifecycle === lifecycle));
    if (members.length) groups.push({ id: lifecycle, label: lifecycle, items: members, fold: false });
  }
  const done = sorted(rest.filter((i) => i.lifecycle === "done"));
  if (done.length) groups.push({ id: "done", label: "done", items: done, fold: true });
  return groups;
}

// ---- Now -------------------------------------------------------------------

export interface NowGroup {
  /** The cycle's or the feature's slug; empty for the items that have none. */
  key: string;
  label: string;
  items: ViewEntry[];
}

/** Started items that are not archived, by priority then title. */
export function startedItems(s: Snapshot): ViewEntry[] {
  return sorted(liveItems(s).filter(isStarted));
}

/** Started items grouped by cycle or by feature; the items with none come last. */
export function nowGroups(s: Snapshot, by: "cycle" | "feature"): NowGroup[] {
  const active = activeCycle(s)?.slug ?? null;
  const groups: NowGroup[] = [];
  for (const item of startedItems(s)) {
    const key = (by === "cycle" ? item.cycle : featureSlug(item.parent)) ?? "";
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label =
        by === "cycle"
          ? key
            ? key === active
              ? "In this cycle"
              : cycleTitle(s, key)
            : "In no cycle"
          : key
            ? featureTitle(s, key)
            : "In no feature";
      groups.push((group = { key, label, items: [] }));
    }
    group.items.push(item);
  }
  return groups.sort((a, b) => (a.key ? 0 : 1) - (b.key ? 0 : 1));
}

// ---- candidates ------------------------------------------------------------

export interface CandidateFilter {
  /** Text matched against the title and the slug. */
  q: string;
  /** `all`, `backlog` or `ready`. */
  lifecycle: string;
  /** `all`, `none`, or a feature's slug. */
  feature: string;
}

export const NO_FILTER: CandidateFilter = { q: "", lifecycle: "all", feature: "all" };

const isCandidate = (i: ViewEntry): boolean => !i.cycle && ["backlog", "ready"].includes(i.lifecycle ?? "");

/** Live items with no cycle, in backlog or ready: what a cycle can bring in. */
export function candidates(s: Snapshot, filter: CandidateFilter = NO_FILTER): ViewEntry[] {
  const q = filter.q.trim().toLowerCase();
  const matches = liveItems(s).filter(
    (i) =>
      isCandidate(i) &&
      (filter.lifecycle === "all" || i.lifecycle === filter.lifecycle) &&
      (filter.feature === "all" ||
        (filter.feature === "none" ? !i.parent : featureSlug(i.parent) === filter.feature)) &&
      (!q || `${i.title ?? ""} ${i.slug}`.toLowerCase().includes(q))
  );
  const ready = (i: ViewEntry): number => (i.lifecycle === "ready" ? 0 : 1);
  return sorted(matches).sort((a, b) => ready(a) - ready(b));
}

/** How many candidates there are before any filter. */
export function candidateTotal(s: Snapshot): number {
  return liveItems(s).filter(isCandidate).length;
}

// ---- blockers --------------------------------------------------------------

export interface Blocker {
  id: string;
  /** The entry the id names, or `null` when nothing in the snapshot has it. */
  entry: ViewEntry | null;
  lifecycle: string | null;
}

/**
 * Every entry by its id. When two entries share an id, a live one wins over an
 * archived one, so an archived copy never answers for the entry still in play.
 */
export function idIndex(s: Snapshot): Map<string, ViewEntry> {
  const index = new Map<string, ViewEntry>();
  for (const e of allEntries(s)) {
    if (!e.id) continue;
    const held = index.get(e.id);
    if (!held || (held.archived && !e.archived)) index.set(e.id, e);
  }
  return index;
}

/**
 * An item's blockers, resolved against every entry, archived ones included.
 * A caller resolving many items passes one `idIndex` for all of them.
 */
export function blockers(s: Snapshot, item: ViewEntry, index: Map<string, ViewEntry> = idIndex(s)): Blocker[] {
  return item.blockedBy.map((id) => {
    const entry = index.get(id) ?? null;
    return { id, entry, lifecycle: entry?.lifecycle ?? null };
  });
}

/**
 * The blockers still in the way. A blocker is cleared only by a known entry
 * that is done or dropped, so an id nothing resolves stays open.
 */
export function openBlockers(s: Snapshot, item: ViewEntry, index?: Map<string, ViewEntry>): Blocker[] {
  return blockers(s, item, index).filter((b) => b.entry === null || isOpen(b.entry));
}

/** What an item's meta line says: nothing, "blocked", or "blocker done". */
export function blockerState(
  s: Snapshot,
  item: ViewEntry,
  index?: Map<string, ViewEntry>
): "none" | "blocked" | "blocker-done" {
  if (!item.blockedBy.length) return "none";
  return openBlockers(s, item, index).length ? "blocked" : "blocker-done";
}

// ---- Inbox -----------------------------------------------------------------

/** Where a row's label leads. */
export type InboxTarget =
  | { type: "triage" }
  | { type: "cycle"; slug: string }
  | { type: "item"; item: ViewEntry }
  | { type: "ask"; line: string };

export type InboxKind =
  | "triage"
  | "planned-cycle"
  | "blocked"
  | "draft-started"
  | "stale-blocker"
  | "unreviewed"
  | "advisory";

export interface InboxRow {
  /** Stable across polls; what a snooze is keyed by. */
  id: string;
  kind: InboxKind;
  group: "decision" | "housekeeping";
  label: string;
  /** How many things the row stands for, when that is a number. */
  n: number | null;
  desc: string;
  /** What activating the row does, stated on the row; `null` for a line to copy. */
  does: string | null;
  target: InboxTarget;
}

/** Live items waiting in triage, in the snapshot's order. */
export function triageQueue(s: Snapshot): ViewEntry[] {
  return liveItems(s).filter((i) => i.lifecycle === "triage");
}

const HOUSEKEEPING: InboxKind[] = ["unreviewed", "advisory"];

const one = (list: readonly ViewEntry[], what: string): string =>
  (list.length === 1 ? (list[0]!.title ?? list[0]!.slug) : `${list.length} items`) + what;

function advisories(s: Snapshot): Advisory[] {
  const seen = new Set<string>();
  const out: Advisory[] = [];
  for (const a of [...s.board.advisories, ...s.unreviewed.advisories, ...s.portfolio.advisories]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

/**
 * Every Inbox row the snapshot calls for, snoozed or not: the rows that need a
 * decision in a fixed order, then housekeeping.
 */
export function attention(s: Snapshot): InboxRow[] {
  const rows: Array<Omit<InboxRow, "group">> = [];
  const open = liveItems(s).filter(isOpen);
  const index = idIndex(s);

  const waiting = triageQueue(s);
  if (waiting.length)
    rows.push({
      id: "triage",
      kind: "triage",
      label: "Waiting in triage",
      n: waiting.length,
      desc: "Filed items nobody has decided on yet.",
      does: "Go to Triage →",
      target: { type: "triage" },
    });

  // One row per planned cycle. Reviewed means `status: stable` on the cycle's
  // own entry; a cycle with no entry in the snapshot is not known to be
  // reviewed, so it gets a row.
  for (const c of s.portfolio.cycles) {
    if (c.lifecycle !== "planned" || c.archived) continue;
    if (cycleEntry(s, c.slug)?.status === "stable") continue;
    rows.push({
      id: `planned-cycle:${c.slug}`,
      kind: "planned-cycle",
      label: "Planned cycle not reviewed",
      n: 1,
      desc: `${c.title ?? c.slug} is still a draft proposal.`,
      does: "Go to the planned cycle →",
      target: { type: "cycle", slug: c.slug },
    });
  }

  const itemRow = (id: InboxKind, label: string, list: ViewEntry[], what: string): void => {
    if (!list.length) return;
    rows.push({
      id,
      kind: id,
      label,
      n: list.length,
      desc: one(list, what),
      does: "Show item",
      target: { type: "item", item: list[0]! },
    });
  };
  itemRow(
    "blocked",
    "Blocked",
    open.filter((i) => openBlockers(s, i, index).length),
    " waiting on unfinished work."
  );
  itemRow(
    "draft-started",
    "Started on a draft",
    startedItems(s).filter((i) => i.status !== "stable"),
    " started before its document was reviewed."
  );
  itemRow(
    "stale-blocker",
    "Blocker already done",
    open.filter((i) => blockerState(s, i, index) === "blocker-done"),
    " still listing a blocker that is finished."
  );

  if (s.unreviewed.items.length)
    rows.push({
      id: "unreviewed",
      kind: "unreviewed",
      label: "Finished, never reviewed",
      n: s.unreviewed.items.length,
      desc: "Done items whose documents were never marked reviewed.",
      does: null,
      target: { type: "ask", line: "Audit the finished items that were never marked reviewed." },
    });

  // An advisory is shown in its own words, so the row stays right whatever a
  // later CLI release puts in it.
  for (const a of advisories(s))
    rows.push({
      id: `advisory:${a.id}`,
      kind: "advisory",
      label: a.message,
      n: Array.isArray(a.refs) ? a.refs.length : null,
      desc: a.action ?? "",
      does: null,
      target: { type: "ask", line: a.action ? `${a.message} ${a.action}` : a.message },
    });

  return rows.map((r) => ({ ...r, group: HOUSEKEEPING.includes(r.kind) ? "housekeeping" : "decision" }));
}

export interface InboxGroup {
  id: "decision" | "housekeeping";
  label: string;
  rows: InboxRow[];
}

/** The Inbox's two groups; one with no rows is left out. */
export function inboxGroups(rows: readonly InboxRow[]): InboxGroup[] {
  const groups: InboxGroup[] = [
    { id: "decision", label: "Needs a decision", rows: rows.filter((r) => r.group === "decision") },
    { id: "housekeeping", label: "Housekeeping", rows: rows.filter((r) => r.group === "housekeeping") },
  ];
  return groups.filter((g) => g.rows.length);
}

/** The nav's one count: rows that need a decision. Housekeeping never counts. */
export function inboxCount(rows: readonly InboxRow[]): number {
  return rows.filter((r) => r.group === "decision").length;
}

// ---- snooze ----------------------------------------------------------------

export type SnoozeChoice = "tomorrow" | "week" | "cycle";

/** View state. The UI keeps it in `localStorage`; it never reaches the server. */
export interface Snooze {
  /** The Inbox row's id. */
  id: string;
  choice: SnoozeChoice;
  /** When the row was snoozed, as an ISO timestamp. */
  at: string;
  /** The active cycle's slug at that moment, or `null`. */
  activeCycle: string | null;
}

export function snooze(id: string, choice: SnoozeChoice, now: Date, activeCycleSlug: string | null): Snooze {
  return { id, choice, at: now.toISOString(), activeCycle: activeCycleSlug };
}

const DAYS: Record<SnoozeChoice, number | null> = { tomorrow: 1, week: 7, cycle: null };

/**
 * Whether a snooze still holds. It ends at the start of the local day its
 * choice names (`cycle` names none), or as soon as the active cycle is not the
 * one recorded.
 */
export function isSnoozed(s: Snooze, now: Date, activeCycleSlug: string | null): boolean {
  if (activeCycleSlug !== s.activeCycle) return false;
  const days = DAYS[s.choice];
  if (days === null) return true;
  if (days === undefined) return false;
  const at = new Date(s.at);
  if (Number.isNaN(at.getTime())) return false;
  const wakes = new Date(at.getFullYear(), at.getMonth(), at.getDate() + days);
  return now.getTime() < wakes.getTime();
}

/** The snoozes still holding: what to keep in storage. */
export function liveSnoozes(list: readonly Snooze[], now: Date, activeCycleSlug: string | null): Snooze[] {
  return list.filter((s) => isSnoozed(s, now, activeCycleSlug));
}

/** Add a snooze, replacing any the row already had. */
export function withSnooze(list: readonly Snooze[], s: Snooze): Snooze[] {
  return [...list.filter((x) => x.id !== s.id), s];
}

/** Wake a row by hand. */
export function withoutSnooze(list: readonly Snooze[], id: string): Snooze[] {
  return list.filter((x) => x.id !== id);
}

function snoozedIds(s: Snapshot, snoozes: readonly Snooze[], now: Date): Set<string> {
  return new Set(liveSnoozes(snoozes, now, activeCycle(s)?.slug ?? null).map((x) => x.id));
}

/** The Inbox's rows: everything that calls for attention and is not snoozed. */
export function inboxRows(s: Snapshot, snoozes: readonly Snooze[], now: Date): InboxRow[] {
  const asleep = snoozedIds(s, snoozes, now);
  return attention(s).filter((r) => !asleep.has(r.id));
}

/** The rows a snooze is hiding. */
export function snoozedRows(s: Snapshot, snoozes: readonly Snooze[], now: Date): InboxRow[] {
  const asleep = snoozedIds(s, snoozes, now);
  return attention(s).filter((r) => asleep.has(r.id));
}
