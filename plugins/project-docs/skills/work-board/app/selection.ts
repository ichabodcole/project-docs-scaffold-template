// The work board's view state and selection rules, as pure functions. Each one
// takes a state and returns the next; none touches the DOM. Focus, scrolling
// and the flash are the UI's.
import {
  activeCycle,
  candidates,
  containerGroups,
  cycleItems,
  featureItems,
  inboxRows,
  NO_FILTER,
  nowGroups,
  triageQueue,
  type CandidateFilter,
  type Snapshot,
  type Snooze,
  type ViewEntry,
} from "./model.ts";

/** `feature` is the list of features; `featurePage` is one feature's page. */
export type View = "now" | "inbox" | "triage" | "cycle" | "feature" | "featurePage";
export type CycleTab = "in" | "cand";

export interface BoardState {
  view: View;
  /** The Cycle page's tab. */
  tab: CycleTab;
  /** The cycle the Cycle page shows. */
  cycle: string | null;
  /** The feature a feature page shows. */
  feature: string | null;
  /** Key of the highlighted row: `i:<slug>`, `t:<slug>` (triage) or `a:<Inbox row id>`. */
  sel: string | null;
  /** Whether the inspector is open on the highlighted row. */
  open: boolean;
  /** The cycle chooser under the cycle's title. */
  menu: boolean;
  /** The Inbox row whose Snooze menu is open. */
  snoozeMenu: string | null;
  doneOpen: boolean;
  /** Slugs brought in during this visit to the Cycle page. */
  added: string[];
  /** Set when the Inbox sent you to another cycle: how to get back. */
  peek: { prev: string | null; label: string } | null;
  nowBy: "cycle" | "feature";
  cand: CandidateFilter;
}

/** One selectable row: its key and the item the inspector would show. */
export interface Row {
  key: string;
  item: ViewEntry;
}

/** What the current list is computed from, besides the state. */
export interface ListContext {
  snapshot: Snapshot;
  snoozes: readonly Snooze[];
  now: Date;
}

export function initialState(snapshot: Snapshot): BoardState {
  return {
    view: "now",
    tab: "in",
    cycle: (activeCycle(snapshot) ?? snapshot.portfolio.cycles.find((c) => c.current))?.slug ?? null,
    feature: null,
    sel: null,
    open: false,
    menu: false,
    snoozeMenu: null,
    doneOpen: false,
    added: [],
    peek: null,
    nowBy: "cycle",
    cand: { ...NO_FILTER },
  };
}

// ---- one current list, a highlighted row, and the inspector ----------------

const itemRows = (list: readonly ViewEntry[], prefix: string): Row[] =>
  list.map((item) => ({ key: prefix + item.slug, item }));

/** The rows the page shows, top to bottom: what `j` and `k` walk. */
export function currentList(state: BoardState, ctx: ListContext): Row[] {
  const s = ctx.snapshot;
  switch (state.view) {
    case "now":
      return itemRows(
        nowGroups(s, state.nowBy).flatMap((g) => g.items),
        "i:"
      );
    case "cycle":
    case "featurePage": {
      if (state.view === "cycle" && state.tab === "cand") return itemRows(candidates(s, state.cand), "i:");
      const groups =
        state.view === "cycle"
          ? containerGroups(state.cycle ? cycleItems(s, state.cycle) : [], state.added)
          : containerGroups(state.feature ? featureItems(s, state.feature) : []);
      return itemRows(
        groups.filter((g) => !g.fold || state.doneOpen).flatMap((g) => g.items),
        "i:"
      );
    }
    case "triage":
      return itemRows(triageQueue(s), "t:");
    case "inbox":
      return inboxRows(s, ctx.snoozes, ctx.now).flatMap((r) =>
        r.target.type === "item" ? [{ key: `a:${r.id}`, item: r.target.item }] : []
      );
    default:
      return [];
  }
}

/**
 * The highlighted row. Only ever a row in the current list, so the inspector
 * can never show something with no highlighted row.
 */
export function selected(state: BoardState, list: readonly Row[]): Row | null {
  return list.find((r) => r.key === state.sel) ?? null;
}

/** Whether the inspector is showing an item. */
export function inspecting(state: BoardState, list: readonly Row[]): boolean {
  return state.open && selected(state, list) !== null;
}

/** Click a row: highlight it and open the inspector. */
export function pick(state: BoardState, key: string): BoardState {
  return { ...state, snoozeMenu: null, menu: false, sel: key, open: true };
}

/** Enter: open the inspector on the highlighted row, if there is one. */
export function openInspector(state: BoardState, list: readonly Row[]): BoardState {
  return selected(state, list) ? { ...state, open: true } : state;
}

/**
 * Move the highlight by `n` rows, clamped at both ends. From no selection,
 * down goes to the first row and up to the last.
 */
export function move(state: BoardState, list: readonly Row[], n: number): BoardState {
  if (!list.length) return state;
  const at = list.findIndex((r) => r.key === state.sel);
  const to = at < 0 ? (n > 0 ? 0 : list.length - 1) : Math.min(list.length - 1, Math.max(0, at + n));
  return { ...state, sel: list[to]!.key };
}

/**
 * Settle the selection after a change, given the list before it and after. If
 * the change took the highlighted row out, the highlight lands on the row that
 * took its index, or the inspector closes and the selection clears.
 */
export function leave(state: BoardState, before: readonly Row[], after: readonly Row[]): BoardState {
  const at = before.findIndex((r) => r.key === state.sel);
  if (at < 0) return state;
  if (after.some((r) => r.key === state.sel)) return state;
  if (after.length) return { ...state, sel: after[Math.min(at, after.length - 1)]!.key };
  return { ...state, sel: null, open: false };
}

/** Run a change to the view state through `leave`. */
export function change(state: BoardState, ctx: ListContext, fn: (s: BoardState) => BoardState): BoardState {
  const next = fn(state);
  return leave(next, currentList(state, ctx), currentList(next, ctx));
}

/** A new snapshot arrived, from a poll or after a write. */
export function refresh(state: BoardState, before: ListContext, after: ListContext): BoardState {
  return leave(state, currentList(state, before), currentList(state, after));
}

/** Fold or unfold done. */
export function toggleDone(state: BoardState, ctx: ListContext): BoardState {
  return change(state, ctx, (s) => ({ ...s, doneOpen: !s.doneOpen }));
}

// ---- Escape and the two floats ---------------------------------------------

/** Escape unwinds one thing per press: the Snooze menu, the cycle chooser, the inspector. */
export function escape(state: BoardState): BoardState {
  if (state.snoozeMenu !== null) return { ...state, snoozeMenu: null };
  if (state.menu) return { ...state, menu: false };
  if (state.open) return { ...state, open: false };
  return state;
}

export function openSnoozeMenu(state: BoardState, rowId: string): BoardState {
  return { ...state, snoozeMenu: rowId, menu: false };
}

export function toggleCycleMenu(state: BoardState): BoardState {
  return { ...state, menu: !state.menu, snoozeMenu: null };
}

// ---- navigation ------------------------------------------------------------

/**
 * The nav. Changing page clears the selection and "Added just now". Leaving a
 * cycle the Inbox sent you to puts the Cycle page back on the cycle it showed
 * before.
 */
export function go(state: BoardState, view: View): BoardState {
  return {
    ...state,
    view,
    tab: "in",
    cycle: state.peek ? state.peek.prev : state.cycle,
    peek: null,
    feature: null,
    sel: null,
    open: false,
    menu: false,
    snoozeMenu: null,
    added: [],
  };
}

export function setTab(state: BoardState, tab: CycleTab): BoardState {
  return { ...state, tab, sel: null, open: false };
}

/** Choose a cycle from the chooser. Chosen on purpose, so it is now the Cycle page's cycle. */
export function setCycle(state: BoardState, slug: string): BoardState {
  return { ...state, cycle: slug, peek: null, menu: false, sel: null, open: false };
}

/**
 * The Inbox's "Go to the planned cycle": show it without changing which cycle
 * the Cycle page is on. The back link, or leaving, restores that.
 */
export function attendPlannedCycle(state: BoardState, slug: string): BoardState {
  const prev = state.peek ? state.peek.prev : state.cycle;
  return { ...go(state, "cycle"), cycle: slug, peek: { prev, label: "Inbox" } };
}

export function openFeature(state: BoardState, slug: string): BoardState {
  return { ...state, view: "featurePage", feature: slug, sel: null, open: false };
}

/** The back link: from a feature's page to the list, or from a peeked cycle to the Inbox. */
export function back(state: BoardState): BoardState {
  if (state.view === "featurePage") return { ...state, view: "feature", feature: null, sel: null, open: false };
  if (state.peek) return go(state, "inbox");
  return state;
}

// ---- "Added just now" ------------------------------------------------------

/** An item was brought in. Recorded only during a visit to the Cycle page. */
export function noteBroughtIn(state: BoardState, slug: string): BoardState {
  if (state.view !== "cycle" || state.added.includes(slug)) return state;
  return { ...state, added: [...state.added, slug] };
}

/** An item was taken out, or its Bring in was undone. */
export function noteTakenOut(state: BoardState, slug: string): BoardState {
  return state.added.includes(slug) ? { ...state, added: state.added.filter((s) => s !== slug) } : state;
}
