// What the board's page does that is not drawing: the session token, the poll,
// the keys, and the view model the template binds. Pure functions over the
// model and the selection rules; nothing here touches the DOM or the network.
// `board.ts` calls these and hands the result to Alpine.
import {
  activeCycle,
  allEntries,
  blockers,
  blockerState,
  candidates,
  candidateTotal,
  containerGroups,
  cycleEntry,
  cycleItems,
  featureItems,
  featureSlug,
  idIndex,
  inboxCount,
  inboxGroups,
  inboxRows,
  isOpen,
  liveSnoozes,
  nowGroups,
  snoozedRows,
  startedItems,
  triageQueue,
  type InboxRow,
  type Snapshot,
  type Snooze,
  type SnoozeChoice,
  type ViewEntry,
} from "./model.ts";
import {
  attendPlannedCycle,
  currentList,
  escape,
  go,
  initialState,
  inspecting,
  move,
  openInspector,
  pick,
  selected,
  type BoardState,
  type ListContext,
  type Row,
  type View,
} from "./selection.ts";

export const TOKEN_HEADER = "x-board-token";
export const POLL_MS = 4000;

// ---- the session token -------------------------------------------------------

/**
 * Take `token` out of a query string. Returns the token and the query string
 * to put back in the address bar, which keeps every other parameter.
 */
export function takeToken(search: string): { token: string | null; search: string } {
  const params = new URLSearchParams(search);
  const token = params.get("token");
  params.delete("token");
  const rest = params.toString();
  return { token: token || null, search: rest ? `?${rest}` : "" };
}

// ---- the poll ----------------------------------------------------------------

export interface Problem {
  message: string;
  hint: string | null;
  /** The board cannot be shown at all: the project's CLI is too old for it. */
  blocking: boolean;
}

export type PollResult =
  | { kind: "snapshot"; hash: string; snapshot: Snapshot }
  | { kind: "problem"; problem: Problem };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Read one `/api/snapshot` response: its status and its parsed body. */
export function readPoll(status: number, body: unknown): PollResult {
  const data = isRecord(body) && isRecord(body.data) ? body.data : null;
  if (status === 200 && data && typeof data.hash === "string" && isRecord(data.snapshot))
    return { kind: "snapshot", hash: data.hash, snapshot: data.snapshot as unknown as Snapshot };
  const error = isRecord(body) && isRecord(body.error) ? body.error : null;
  const message =
    error && typeof error.message === "string" && error.message
      ? error.message
      : status === 200
        ? "the board's server sent a snapshot this page cannot read."
        : `the board's server answered ${status}.`;
  return {
    kind: "problem",
    problem: {
      message,
      hint: error && typeof error.hint === "string" && error.hint ? error.hint : null,
      blocking: status === 409,
    },
  };
}

/** A poll that got no answer: the server stopped, or the page has no token. */
export function unreachable(why: "no-token" | "no-answer"): PollResult {
  return {
    kind: "problem",
    problem: {
      message:
        why === "no-token"
          ? "This page has no session token. Open the board again from the URL its `open` command prints."
          : "The board's server is not answering. It stops 30 minutes after its last visible page stops polling; start it again with `open`.",
      hint: null,
      blocking: false,
    },
  };
}

/** What the page holds from the server: the last snapshot, its hash, and what is wrong, if anything. */
export interface Feed {
  hash: string | null;
  snapshot: Snapshot | null;
  problem: Problem | null;
}

export const EMPTY_FEED: Feed = { hash: null, snapshot: null, problem: null };

/**
 * Take a poll's result. The snapshot object is replaced, never changed, and it
 * is kept as it was when the hash is the same. `changed` says whether the
 * snapshot is a new one; `redraw` whether anything on screen differs.
 */
export function applyPoll(feed: Feed, result: PollResult): { feed: Feed; changed: boolean; redraw: boolean } {
  if (result.kind === "problem") {
    const same =
      feed.problem !== null &&
      feed.problem.message === result.problem.message &&
      feed.problem.hint === result.problem.hint &&
      feed.problem.blocking === result.problem.blocking;
    return { feed: same ? feed : { ...feed, problem: result.problem }, changed: false, redraw: !same };
  }
  if (result.hash === feed.hash && feed.snapshot !== null) {
    if (feed.problem === null) return { feed, changed: false, redraw: false };
    return { feed: { ...feed, problem: null }, changed: false, redraw: true };
  }
  return { feed: { hash: result.hash, snapshot: result.snapshot, problem: null }, changed: true, redraw: true };
}

/**
 * Fit the view state to a new snapshot: a Cycle page whose cycle is gone goes
 * to the cycle a fresh board would show, and a feature's page whose feature is
 * gone goes back to the list.
 */
export function settle(state: BoardState, s: Snapshot): BoardState {
  let next = state;
  if (next.cycle === null || !s.portfolio.cycles.some((c) => c.slug === next.cycle)) {
    const cycle = initialState(s).cycle;
    if (cycle !== next.cycle) next = { ...next, cycle, peek: null };
  }
  if (next.view === "featurePage" && !featureEntry(s, next.feature))
    next = { ...next, view: "feature", feature: null, sel: null, open: false };
  return next;
}

// ---- keys --------------------------------------------------------------------

export type KeyAction = "down" | "up" | "open" | "escape";

export interface KeyPress {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  /** The tag name of the element the key was pressed in, upper case. */
  tag: string;
}

/**
 * What a key press asks for, or `null`. Typing in a field moves nothing, and
 * Enter on a button is left to the button. Escape counts wherever it is
 * pressed. While the board is `blocked` there are no rows to move through.
 */
export function keyAction(e: KeyPress, blocked = false): KeyAction | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key === "Escape") return "escape";
  if (blocked) return null;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.tag)) return null;
  if (e.key === "ArrowDown" || e.key === "j") return "down";
  if (e.key === "ArrowUp" || e.key === "k") return "up";
  if (e.key === "Enter" && e.tag !== "BUTTON") return "open";
  return null;
}

/** Run a key's action through the selection rules. */
export function applyKey(state: BoardState, list: readonly Row[], action: KeyAction): BoardState {
  switch (action) {
    case "down":
      return move(state, list, 1);
    case "up":
      return move(state, list, -1);
    case "open":
      return openInspector(state, list);
    case "escape":
      return escape(state);
  }
}

/** Whether this action will close the inspector: an Escape with no menu open over it. */
export function closesInspector(state: BoardState, action: KeyAction): boolean {
  return action === "escape" && state.open && !escape(state).open;
}

/**
 * An Inbox row does the one thing it says: go to Triage, show a planned cycle,
 * or show an item. A row that is a line to say to the agent goes nowhere. A
 * row that is not in the Inbox now changes nothing.
 */
export function attend(state: BoardState, ctx: ListContext, id: string): BoardState {
  const target = inboxRows(ctx.snapshot, ctx.snoozes, ctx.now).find((r) => r.id === id)?.target;
  if (!target) return state;
  switch (target.type) {
    case "triage":
      return go(state, "triage");
    case "cycle":
      return attendPlannedCycle(state, target.slug);
    case "item":
      return pick(state, `a:${id}`);
    case "ask":
      return { ...state, snoozeMenu: null };
  }
}

// ---- what a row says ---------------------------------------------------------

/** One plain part of a meta line, with a lifecycle dot before it when `dot` is set. */
export interface MetaPart {
  text: string;
  dot: string | null;
  title: string | null;
}

/** One line of meta: plain parts, then pills. Pills are only for high and blocked. */
export interface Meta {
  parts: MetaPart[];
  pills: Array<{ kind: "high" | "blocked"; text: string }>;
}

export interface MetaOptions {
  /** Lead with the item's lifecycle. */
  lifecycle?: boolean;
  /** Say "in review" on an item in review. */
  review?: boolean;
  /** Leave the parent feature out: the page already names it. */
  noParent?: boolean;
}

export function meta(s: Snapshot, i: ViewEntry, o: MetaOptions = {}, index?: Map<string, ViewEntry>): Meta {
  const part = (text: string, dot: string | null = null, title: string | null = null): MetaPart => ({
    text,
    dot,
    title,
  });
  const parts: MetaPart[] = [];
  const pills: Meta["pills"] = [];
  const hot = i.priority === "high" || i.priority === "urgent";
  const blocked = blockerState(s, i, index);
  if (o.lifecycle && i.lifecycle) parts.push(part(i.lifecycle, i.lifecycle));
  if (o.review && i.lifecycle === "review") parts.push(part("in review", "review"));
  if (i.kind) parts.push(part(i.kind));
  if (i.priority && !hot) parts.push(part(i.priority));
  const parent = featureSlug(i.parent);
  if (parent && !o.noParent) parts.push(part(parent));
  if (i.status !== "stable")
    parts.push(part("draft", null, `status: ${i.status ?? "none"} — its content has not been reviewed`));
  if (blocked === "blocker-done") parts.push(part("blocker done", null, "every blocker is done"));
  if (hot && i.priority) pills.push({ kind: "high", text: i.priority });
  if (blocked === "blocked") pills.push({ kind: "blocked", text: "blocked" });
  return { parts, pills };
}

/** A string in pieces that may wrap between them: after each `/` and `-`. */
export function breakable(text: string): string[] {
  return text.split(/(?<=[/-])/).filter(Boolean);
}

export interface FieldBlocker {
  lifecycle: string;
  dot: string;
  name: string[];
}

/** One inspector field: text, or the list of blockers. */
export interface Field {
  label: string;
  mono: boolean;
  text: string[];
  blockers: FieldBlocker[];
}

/**
 * The inspector's fields. Empty ones are left out; priority and status are in
 * the meta line; the path and the id sit behind "Copy path".
 */
export function fields(s: Snapshot, i: ViewEntry, index?: Map<string, ViewEntry>): Field[] {
  const out: Field[] = [];
  const text = (label: string, value: string | null, mono: boolean): void => {
    if (value) out.push({ label, mono, text: breakable(value), blockers: [] });
  };
  text("cycle", i.cycle, true);
  text("feature", featureSlug(i.parent), false);
  text("source", i.source, true);
  // `from` may hold an id; a ref says more than one.
  const origin = i.from ? (index ?? idIndex(s)).get(i.from) : undefined;
  text("from", origin ? `${origin.entity}/${origin.slug}` : i.from, true);
  text("filed", i.date, true);
  if (i.blockedBy.length)
    out.push({
      label: "blocked by",
      mono: false,
      text: [],
      blockers: blockers(s, i, index).map((b) => ({
        lifecycle: b.lifecycle ?? "unknown",
        dot: b.lifecycle ?? "backlog",
        name: breakable(b.entry?.slug ?? b.id),
      })),
    });
  return out;
}

/** The line that opens a document in Scriptorium, for the user to copy. */
export function handoffLine(path: string): string {
  return `open, then show --doc ${path}`;
}

export interface Segment {
  lifecycle: string;
  n: number;
  pct: number;
}

/** A progress bar's segments: started leads, then finished, then what has not started. */
export function bar(list: readonly ViewEntry[]): Segment[] {
  const total = list.length || 1;
  return ["active", "review", "done", "ready", "backlog", "triage", "dropped"]
    .map((lifecycle) => ({ lifecycle, n: list.filter((i) => i.lifecycle === lifecycle).length }))
    .filter((seg) => seg.n)
    .map((seg) => ({ ...seg, pct: (seg.n / total) * 100 }));
}

export function summary(list: readonly ViewEntry[]): string {
  return `${list.filter((i) => !isOpen(i)).length} of ${list.length} finished`;
}

export const SNOOZE_CHOICES: Array<{ id: SnoozeChoice; label: string; note: string }> = [
  { id: "tomorrow", label: "Until tomorrow", note: "until tomorrow" },
  { id: "week", label: "For a week", note: "for a week" },
  { id: "cycle", label: "Until the next cycle starts", note: "until the next cycle starts" },
];

// ---- the view model ----------------------------------------------------------

export interface ItemRow {
  key: string;
  title: string;
  on: boolean;
  meta: Meta;
}

export interface InboxRowVm {
  id: string;
  key: string;
  label: string;
  n: number | null;
  /** The line under the label. */
  text: string;
  tip: string;
  does: string | null;
  /** A red dot before the label: the row is about blocked work. */
  alert: boolean;
  on: boolean;
  menu: boolean;
}

export interface Vm {
  view: View;
  /** The nav entry that is lit. */
  nav: "now" | "inbox" | "triage" | "cycle" | "feature";
  inboxCount: number;
  /**
   * The board cannot be shown: the project's CLI is too old for it. Nothing
   * of the last snapshot is drawn, the inspector included.
   */
  blocked: boolean;
  /** The inspector is open, so the centre is as wide as what is left. */
  inspecting: boolean;
  band: {
    /** The page's title, on a page that is not a container. */
    title: string;
    /** A container's page: one cycle or one feature. */
    box: null | {
      title: string;
      lifecycle: string;
      summary: string;
      noteLabel: string;
      note: string;
      back: string | null;
      bar: Segment[];
    };
    /** "N waiting", on Triage. */
    count: string;
    nowBy: "cycle" | "feature";
    menu: boolean;
    cycles: Array<{ slug: string; title: string; lifecycle: string; on: boolean }>;
    tab: "in" | "cand";
    inCount: number;
    candCount: number;
  };
  now: {
    cycle: null | { slug: string; title: string; summary: string; bar: Segment[] };
    empty: boolean;
    groups: Array<{ key: string; label: string; rows: ItemRow[] }>;
  };
  inbox: {
    empty: boolean;
    groups: Array<{ id: string; label: string; rows: InboxRowVm[] }>;
    snoozed: Array<{ id: string; label: string; n: number | null; note: string }>;
  };
  triage: {
    rows: Array<{ key: string; title: string; on: boolean; kind: string; source: string; filed: string }>;
  };
  box: {
    empty: string;
    groups: Array<{ id: string; label: string; fold: boolean; open: boolean; rows: ItemRow[] }>;
  };
  cand: {
    q: string;
    lifecycle: string;
    feature: string;
    features: string[];
    rows: ItemRow[];
  };
  features: Array<{
    slug: string;
    title: string;
    lifecycle: string;
    count: string;
    finished: string;
    draft: boolean;
    bar: Segment[];
  }>;
  inspector: null | {
    position: string;
    first: boolean;
    last: boolean;
    title: string;
    meta: Meta;
    description: string;
    fields: Field[];
    path: string;
    tip: string;
  };
}

const TITLES: Partial<Record<View, string>> = { now: "Now", inbox: "Inbox", triage: "Triage", feature: "Features" };
const NAV: Record<View, Vm["nav"]> = {
  now: "now",
  inbox: "inbox",
  triage: "triage",
  cycle: "cycle",
  feature: "feature",
  featurePage: "feature",
};

const titleOf = (e: { title: string | null; slug: string }): string => e.title ?? e.slug;

function featureEntry(s: Snapshot, slug: string | null): ViewEntry | null {
  if (!slug) return null;
  return allEntries(s).find((e) => e.entity === "feature" && e.slug === slug) ?? null;
}

function inboxRowVm(r: InboxRow, state: BoardState): InboxRowVm {
  const line = r.target.type === "ask" ? r.target.line : "";
  // An advisory's own `action` is already the thing to ask for.
  const text = r.does || r.kind === "advisory" ? r.desc : `${r.desc} Ask the agent: “${line}”`;
  return {
    id: r.id,
    key: `a:${r.id}`,
    label: r.label,
    n: r.n,
    text,
    tip: r.does ? r.desc : line,
    does: r.does,
    alert: r.kind === "blocked",
    on: state.sel === `a:${r.id}`,
    menu: state.snoozeMenu === r.id,
  };
}

/** Everything the template draws, for one state over one snapshot, given what is wrong, if anything. */
export function viewModel(state: BoardState, ctx: ListContext, problem: Problem | null = null): Vm {
  const s = ctx.snapshot;
  const index = idIndex(s);
  const list = currentList(state, ctx);
  const sel = selected(state, list);
  const view = state.view;
  const row = (i: ViewEntry, o: MetaOptions, prefix = "i:"): ItemRow => ({
    key: prefix + i.slug,
    title: titleOf(i),
    on: state.sel === prefix + i.slug,
    meta: meta(s, i, o, index),
  });
  const rows = inboxRows(s, ctx.snoozes, ctx.now);
  const active = activeCycle(s);
  const blocked = problem?.blocking ?? false;

  const vm: Vm = {
    view,
    nav: NAV[view],
    inboxCount: inboxCount(rows),
    blocked,
    inspecting: !blocked && inspecting(state, list),
    band: {
      title: TITLES[view] ?? "",
      box: null,
      count: "",
      nowBy: state.nowBy,
      menu: state.menu,
      cycles: s.portfolio.cycles.map((c) => ({
        slug: c.slug,
        title: titleOf(c),
        lifecycle: c.lifecycle ?? "",
        on: c.slug === state.cycle,
      })),
      tab: state.tab,
      inCount: state.cycle ? cycleItems(s, state.cycle).length : 0,
      candCount: candidateTotal(s),
    },
    now: { cycle: null, empty: false, groups: [] },
    inbox: { empty: false, groups: [], snoozed: [] },
    triage: { rows: [] },
    box: { empty: "", groups: [] },
    cand: {
      q: state.cand.q,
      lifecycle: state.cand.lifecycle,
      feature: state.cand.feature,
      features: s.portfolio.features.map((f) => f.slug),
      rows: [],
    },
    features: [],
    inspector: null,
  };

  if (view === "now") {
    if (active) {
      const its = cycleItems(s, active.slug);
      vm.now.cycle = { slug: active.slug, title: titleOf(active), summary: summary(its), bar: bar(its) };
    }
    vm.now.empty = startedItems(s).length === 0;
    vm.now.groups = nowGroups(s, state.nowBy).map((g) => ({
      key: g.key,
      label: g.label,
      rows: g.items.map((i) => row(i, { review: true, noParent: state.nowBy === "feature" })),
    }));
  }

  if (view === "inbox") {
    const live = liveSnoozes(ctx.snoozes, ctx.now, active?.slug ?? null);
    vm.inbox.empty = rows.length === 0;
    vm.inbox.groups = inboxGroups(rows).map((g) => ({
      id: g.id,
      label: g.label,
      rows: g.rows.map((r) => inboxRowVm(r, state)),
    }));
    vm.inbox.snoozed = snoozedRows(s, ctx.snoozes, ctx.now).map((r) => {
      const choice = SNOOZE_CHOICES.find((c) => c.id === live.find((x) => x.id === r.id)?.choice);
      return { id: r.id, label: r.label, n: r.n, note: choice ? `Snoozed ${choice.note}` : "" };
    });
  }

  if (view === "triage") {
    const queue = triageQueue(s);
    vm.band.count = `${queue.length} waiting`;
    vm.triage.rows = queue.map((i) => ({
      key: `t:${i.slug}`,
      title: titleOf(i),
      on: state.sel === `t:${i.slug}`,
      kind: i.kind ?? "",
      source: i.source ?? "",
      filed: i.date ?? "",
    }));
  }

  if (view === "cycle") {
    const portfolio = s.portfolio.cycles.find((c) => c.slug === state.cycle) ?? null;
    const own = state.cycle ? cycleEntry(s, state.cycle) : null;
    const its = state.cycle ? cycleItems(s, state.cycle) : [];
    const lifecycle = portfolio?.lifecycle ?? own?.lifecycle ?? "";
    const when = lifecycle === "active" && own?.started ? `started ${own.started}` : lifecycle;
    vm.band.box = {
      title: portfolio ? titleOf(portfolio) : (state.cycle ?? "No cycle"),
      lifecycle,
      summary: [summary(its), when, own?.status !== "stable" ? "draft" : ""].filter(Boolean).join(" · "),
      noteLabel: own?.appetite ? "Appetite. " : "",
      note: own?.appetite ?? "",
      back: state.peek ? state.peek.label : null,
      bar: bar(its),
    };
    if (state.tab === "cand") vm.cand.rows = candidates(s, state.cand).map((i) => row(i, { lifecycle: true, noParent: true }));
    else {
      vm.box.empty = "Nothing is in this cycle yet.";
      vm.box.groups = containerGroups(its, state.added).map((g) => ({
        id: g.id,
        label: g.label,
        fold: g.fold,
        open: !g.fold || state.doneOpen,
        rows: g.items.map((i) => row(i, { lifecycle: g.id === "added" })),
      }));
    }
  }

  if (view === "featurePage") {
    const f = featureEntry(s, state.feature);
    const its = state.feature ? featureItems(s, state.feature) : [];
    vm.band.box = {
      title: f ? titleOf(f) : (state.feature ?? ""),
      lifecycle: f?.lifecycle ?? "",
      summary: [its.length ? summary(its) : "No items yet", f?.status !== "stable" ? "draft" : ""]
        .filter(Boolean)
        .join(" · "),
      noteLabel: "",
      note: f?.description ?? "",
      back: "Features",
      bar: bar(its),
    };
    vm.box.empty = "No item names this feature as its parent.";
    vm.box.groups = containerGroups(its).map((g) => ({
      id: g.id,
      label: g.label,
      fold: g.fold,
      open: !g.fold || state.doneOpen,
      rows: g.items.map((i) => row(i, { noParent: true })),
    }));
  }

  if (view === "feature")
    vm.features = s.portfolio.features.map((p) => {
      const its = featureItems(s, p.slug);
      const finished = its.filter((i) => !isOpen(i)).length;
      return {
        slug: p.slug,
        title: titleOf(p),
        lifecycle: p.lifecycle ?? "",
        count: its.length ? `${its.length - finished} open` : "no items",
        finished: finished ? `${finished} finished` : "",
        draft: featureEntry(s, p.slug)?.status !== "stable",
        bar: bar(its),
      };
    });

  if (vm.inspecting && sel) {
    const at = list.indexOf(sel);
    const i = sel.item;
    vm.inspector = {
      position: `${at + 1} of ${list.length}`,
      first: at <= 0,
      last: at >= list.length - 1,
      title: titleOf(i),
      meta: meta(s, i, { lifecycle: true, noParent: true }, index),
      description: i.description ?? "",
      fields: fields(s, i, index),
      path: i.path,
      tip: `${i.path} · id ${i.id ?? "none"}`,
    };
  }
  return vm;
}

const NOTHING: Snapshot = {
  board: { groups: {}, advisories: [] },
  portfolio: { cycles: [], features: [], advisories: [] },
  unreviewed: { items: [], advisories: [] },
  cycles: [],
};

/** What the template binds before the first snapshot arrives. */
export function emptyVm(problem: Problem | null = null): Vm {
  return viewModel(initialState(NOTHING), { snapshot: NOTHING, snoozes: [], now: new Date(0) }, problem);
}
