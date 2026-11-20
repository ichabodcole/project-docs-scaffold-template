import { describe, expect, test } from "bun:test";
import { snooze, type Snapshot } from "./model.ts";
import {
  attendPlannedCycle,
  back,
  change,
  currentList,
  escape,
  go,
  initialState,
  inspecting,
  leave,
  move,
  noteBroughtIn,
  noteTakenOut,
  openFeature,
  openInspector,
  openSnoozeMenu,
  pick,
  refresh,
  selected,
  setCycle,
  setTab,
  toggleCycleMenu,
  toggleDone,
  type BoardState,
  type ListContext,
  type Row,
} from "./selection.ts";
import { entry, snapshot } from "./test-support.ts";

const NOW = new Date(2026, 10, 19, 15, 30);

function tree(): Snapshot {
  return snapshot({
    cycles: [
      ["c1", "active", "stable"],
      ["c2", "planned", "draft"],
    ],
    entries: [
      entry({ slug: "f1", entity: "feature" }),
      entry({ slug: "a1", title: "A1", lifecycle: "active", cycle: "c1", parent: "feature/f1" }),
      entry({ slug: "a2", title: "A2", lifecycle: "active", cycle: "c1", status: "draft" }),
      entry({ slug: "r1", title: "R1", lifecycle: "ready", cycle: "c1" }),
      entry({ slug: "d1", title: "D1", lifecycle: "done", cycle: "c1", parent: "feature/f1" }),
      entry({ slug: "p1", title: "P1", lifecycle: "backlog", cycle: "c2" }),
      entry({ slug: "cand-ready", title: "Cand ready", lifecycle: "ready" }),
      entry({ slug: "cand-backlog", title: "Cand backlog", lifecycle: "backlog", blockedBy: ["id-r1"] }),
      entry({ slug: "t1", title: "T1", lifecycle: "triage" }),
      entry({ slug: "t2", title: "T2", lifecycle: "triage" }),
    ],
  });
}

const ctxOf = (snap: Snapshot): ListContext => ({ snapshot: snap, snoozes: [], now: NOW });
const keys = (list: readonly Row[]): string[] => list.map((r) => r.key);
const on = (over: Partial<BoardState>, snap: Snapshot = tree()): BoardState => ({ ...initialState(snap), ...over });
const rows = (...ks: string[]): Row[] => ks.map((key) => ({ key, item: entry({ slug: key.slice(2) }) }));

describe("the starting state", () => {
  test("is Now, on the active cycle, with nothing selected", () => {
    expect(initialState(tree())).toMatchObject({
      view: "now",
      tab: "in",
      cycle: "c1",
      sel: null,
      open: false,
      added: [],
      peek: null,
    });
  });

  test("with no active cycle, the Cycle page takes the first current one", () => {
    expect(initialState(snapshot({ cycles: [["c2", "planned", "draft"]] })).cycle).toBe("c2");
    expect(initialState(snapshot()).cycle).toBeNull();
  });
});

describe("the current list", () => {
  const ctx = ctxOf(tree());

  test("Now: the started items, group by group", () => {
    expect(keys(currentList(on({ view: "now" }), ctx))).toEqual(["i:a1", "i:a2"]);
  });

  test("Cycle, 'In this cycle': the groups in order, with done left out while folded", () => {
    expect(keys(currentList(on({ view: "cycle" }), ctx))).toEqual(["i:a1", "i:a2", "i:r1"]);
    expect(keys(currentList(on({ view: "cycle", doneOpen: true }), ctx))).toEqual(["i:a1", "i:a2", "i:r1", "i:d1"]);
  });

  test("Cycle: 'Added just now' rows lead the list", () => {
    expect(keys(currentList(on({ view: "cycle", added: ["r1"] }), ctx))).toEqual(["i:r1", "i:a1", "i:a2"]);
  });

  test("Cycle, 'Candidates': the candidates, filtered", () => {
    const state = on({ view: "cycle", tab: "cand" });
    expect(keys(currentList(state, ctx))).toEqual(["i:cand-ready", "i:cand-backlog"]);
    expect(keys(currentList({ ...state, cand: { q: "backlog", lifecycle: "all", feature: "all" } }, ctx))).toEqual([
      "i:cand-backlog",
    ]);
  });

  test("a feature's page: its items, never an 'Added just now' group", () => {
    const state = on({ view: "featurePage", feature: "f1", added: ["d1"], doneOpen: true });
    expect(keys(currentList(state, ctx))).toEqual(["i:a1", "i:d1"]);
  });

  test("Triage: the waiting items, under their own key prefix", () => {
    expect(keys(currentList(on({ view: "triage" }), ctx))).toEqual(["t:t1", "t:t2"]);
  });

  test("Inbox: only the rows that show an item, keyed by the row", () => {
    const list = currentList(on({ view: "inbox" }), ctx);
    expect(keys(list)).toEqual(["a:blocked", "a:draft-started"]);
    expect(list.map((r) => r.item.slug)).toEqual(["cand-backlog", "a2"]);
  });

  test("Inbox: a snoozed row is not in the list", () => {
    const snoozed: ListContext = { ...ctx, snoozes: [snooze("blocked", "week", NOW, "c1")] };
    expect(keys(currentList(on({ view: "inbox" }), snoozed))).toEqual(["a:draft-started"]);
  });

  test("the Features list has no rows to highlight", () => {
    expect(currentList(on({ view: "feature" }), ctx)).toEqual([]);
  });
});

describe("what is selected", () => {
  const list = rows("i:a", "i:b", "i:c");

  test("picking a row highlights it and opens the inspector", () => {
    const state = pick(on({}), "i:b");
    expect(state).toMatchObject({ sel: "i:b", open: true });
    expect(selected(state, list)?.key).toBe("i:b");
    expect(inspecting(state, list)).toBe(true);
  });

  test("picking a row closes the Snooze menu and the cycle chooser", () => {
    expect(pick(on({ menu: true, snoozeMenu: "blocked" }), "i:b")).toMatchObject({ menu: false, snoozeMenu: null });
  });

  test("only a row in the current list is selected, so the inspector shows nothing without one", () => {
    const state = on({ sel: "i:elsewhere", open: true });
    expect(selected(state, list)).toBeNull();
    expect(inspecting(state, list)).toBe(false);
  });

  test("a highlighted row is not inspected until the inspector is open", () => {
    const state = on({ sel: "i:b", open: false });
    expect(selected(state, list)?.key).toBe("i:b");
    expect(inspecting(state, list)).toBe(false);
    expect(inspecting(openInspector(state, list), list)).toBe(true);
  });

  test("Enter with no highlighted row opens nothing", () => {
    expect(openInspector(on({}), list).open).toBe(false);
    expect(openInspector(on({ sel: "i:elsewhere" }), list).open).toBe(false);
  });
});

describe("moving the highlight", () => {
  const list = rows("i:a", "i:b", "i:c");

  test("by one, down and up", () => {
    expect(move(on({ sel: "i:a" }), list, 1).sel).toBe("i:b");
    expect(move(on({ sel: "i:c" }), list, -1).sel).toBe("i:b");
  });

  test("clamps at both ends", () => {
    expect(move(on({ sel: "i:c" }), list, 1).sel).toBe("i:c");
    expect(move(on({ sel: "i:a" }), list, -1).sel).toBe("i:a");
  });

  test("from no selection, down goes to the first row and up to the last", () => {
    expect(move(on({}), list, 1).sel).toBe("i:a");
    expect(move(on({}), list, -1).sel).toBe("i:c");
    expect(move(on({ sel: "i:elsewhere" }), list, 1).sel).toBe("i:a");
  });

  test("does not open or close the inspector", () => {
    expect(move(on({ sel: "i:a", open: true }), list, 1).open).toBe(true);
    expect(move(on({ sel: "i:a", open: false }), list, 1).open).toBe(false);
  });

  test("an empty list leaves the state alone", () => {
    const state = on({});
    expect(move(state, [], 1)).toBe(state);
  });
});

describe("when the highlighted row leaves", () => {
  const before = rows("i:a", "i:b", "i:c");

  test("the highlight moves to the row that takes its index", () => {
    expect(leave(on({ sel: "i:b", open: true }), before, rows("i:a", "i:c"))).toMatchObject({ sel: "i:c", open: true });
  });

  test("the last row's highlight moves to the new last row", () => {
    expect(leave(on({ sel: "i:c", open: true }), before, rows("i:a", "i:b"))).toMatchObject({ sel: "i:b", open: true });
  });

  test("the inspector closes and the selection clears if the list is empty", () => {
    expect(leave(on({ sel: "i:b", open: true }), before, [])).toMatchObject({ sel: null, open: false });
  });

  test("a row that is still there keeps the highlight, wherever it moved", () => {
    const state = on({ sel: "i:b", open: true });
    expect(leave(state, before, rows("i:b", "i:a"))).toBe(state);
  });

  test("with nothing highlighted, nothing becomes highlighted", () => {
    const state = on({});
    expect(leave(state, before, rows("i:a"))).toBe(state);
  });

  test("the inspector never shows an item with no highlighted row, whatever the change", () => {
    for (const sel of ["i:a", "i:b", "i:c"]) {
      for (const after of [rows("i:a", "i:b"), rows("i:c"), rows("i:x", "i:y"), []]) {
        const state = leave(on({ sel, open: true }), before, after);
        const shown = selected(state, after);
        if (state.open) expect(shown?.key).toBe(state.sel!);
        else expect(state.sel).toBeNull();
      }
    }
  });

  test("a poll that removes the highlighted item moves the highlight", () => {
    const snap = tree();
    const state = pick(on({ view: "triage" }, snap), "t:t1");
    const next = tree();
    next.board.groups.unstarted = next.board.groups.unstarted!.filter((e) => e.slug !== "t1");
    const after = refresh(state, ctxOf(snap), ctxOf(next));
    expect(after).toMatchObject({ sel: "t:t2", open: true });
    expect(selected(after, currentList(after, ctxOf(next)))?.item.slug).toBe("t2");
  });

  test("a poll that empties the list closes the inspector", () => {
    const snap = tree();
    const state = pick(on({ view: "triage" }, snap), "t:t1");
    const next = tree();
    next.board.groups.unstarted = next.board.groups.unstarted!.filter((e) => e.lifecycle !== "triage");
    expect(refresh(state, ctxOf(snap), ctxOf(next))).toMatchObject({ sel: null, open: false });
  });

  test("folding done under the highlight moves it to the last row left", () => {
    const ctx = ctxOf(tree());
    const state = pick(on({ view: "cycle", doneOpen: true }), "i:d1");
    expect(toggleDone(state, ctx)).toMatchObject({ doneOpen: false, sel: "i:r1", open: true });
  });

  test("a change to view state runs through the same rule", () => {
    const ctx = ctxOf(tree());
    const state = pick(on({ view: "cycle", tab: "cand" }), "i:cand-backlog");
    const filtered = change(state, ctx, (s) => ({ ...s, cand: { q: "ready", lifecycle: "all", feature: "all" } }));
    expect(filtered.sel).toBe("i:cand-ready");
  });
});

describe("Escape", () => {
  test("closes the Snooze menu, then the cycle chooser, then the inspector, one per press", () => {
    let state = on({ sel: "i:a1", open: true, menu: true, snoozeMenu: "blocked" });
    state = escape(state);
    expect(state).toMatchObject({ snoozeMenu: null, menu: true, open: true });
    state = escape(state);
    expect(state).toMatchObject({ snoozeMenu: null, menu: false, open: true });
    state = escape(state);
    expect(state).toMatchObject({ snoozeMenu: null, menu: false, open: false });
  });

  test("closing the inspector keeps the highlight", () => {
    expect(escape(on({ sel: "i:a1", open: true })).sel).toBe("i:a1");
  });

  test("with nothing open it changes nothing", () => {
    const state = on({ sel: "i:a1" });
    expect(escape(state)).toBe(state);
  });

  test("the two floats are opened one at a time", () => {
    expect(openSnoozeMenu(on({ menu: true }), "blocked")).toMatchObject({ snoozeMenu: "blocked", menu: false });
    expect(toggleCycleMenu(on({ snoozeMenu: "blocked" }))).toMatchObject({ snoozeMenu: null, menu: true });
    expect(toggleCycleMenu(on({ menu: true })).menu).toBe(false);
  });
});

describe("changing tab, page or cycle", () => {
  const picked = (over: Partial<BoardState>): BoardState => on({ sel: "i:a1", open: true, ...over });

  test("changing page clears the selection and closes the floats", () => {
    expect(go(picked({ view: "cycle", menu: true, snoozeMenu: "x", tab: "cand" }), "now")).toMatchObject({
      view: "now",
      tab: "in",
      sel: null,
      open: false,
      menu: false,
      snoozeMenu: null,
      feature: null,
    });
  });

  test("changing tab clears the selection", () => {
    expect(setTab(picked({ view: "cycle" }), "cand")).toMatchObject({ tab: "cand", sel: null, open: false });
  });

  test("changing cycle clears the selection and closes the chooser", () => {
    expect(setCycle(picked({ view: "cycle", menu: true }), "c2")).toMatchObject({
      cycle: "c2",
      sel: null,
      open: false,
      menu: false,
    });
  });

  test("opening a feature and going back both clear the selection", () => {
    const opened = openFeature(picked({ view: "feature" }), "f1");
    expect(opened).toMatchObject({ view: "featurePage", feature: "f1", sel: null, open: false });
    expect(back({ ...opened, sel: "i:a1", open: true })).toMatchObject({
      view: "feature",
      feature: null,
      sel: null,
      open: false,
    });
  });
});

describe("arriving at a planned cycle from the Inbox", () => {
  const arrived = (): BoardState =>
    attendPlannedCycle(on({ view: "inbox", cycle: "c1", sel: "a:blocked", open: true }), "c2");

  test("shows that cycle with a back link to the Inbox", () => {
    expect(arrived()).toMatchObject({
      view: "cycle",
      cycle: "c2",
      tab: "in",
      sel: null,
      open: false,
      peek: { prev: "c1", label: "Inbox" },
    });
  });

  test("the back link returns to the Inbox and restores the cycle shown before", () => {
    expect(back(arrived())).toMatchObject({ view: "inbox", cycle: "c1", peek: null });
  });

  test("leaving by the nav restores the cycle shown before", () => {
    expect(go(arrived(), "now")).toMatchObject({ view: "now", cycle: "c1", peek: null });
    expect(go(arrived(), "cycle")).toMatchObject({ view: "cycle", cycle: "c1", peek: null });
  });

  test("changing tab stays on the planned cycle and keeps the back link", () => {
    expect(setTab(arrived(), "cand")).toMatchObject({ cycle: "c2", peek: { prev: "c1", label: "Inbox" } });
  });

  test("choosing a cycle on purpose drops the back link: it is now the Cycle page's cycle", () => {
    const chosen = setCycle(arrived(), "c2");
    expect(chosen).toMatchObject({ cycle: "c2", peek: null });
    expect(go(chosen, "now").cycle).toBe("c2");
  });

  test("with no back link, back does nothing on a cycle", () => {
    const state = on({ view: "cycle" });
    expect(back(state)).toBe(state);
  });
});

describe("'Added just now'", () => {
  test("lists the slugs brought in during this visit, once each, in order", () => {
    let state = on({ view: "cycle", tab: "cand" });
    state = noteBroughtIn(state, "cand-ready");
    state = noteBroughtIn(state, "cand-backlog");
    state = noteBroughtIn(state, "cand-ready");
    expect(state.added).toEqual(["cand-ready", "cand-backlog"]);
  });

  test("an item taken out again, or whose Bring in was undone, leaves it", () => {
    const state = noteTakenOut(on({ view: "cycle", added: ["x", "y"] }), "x");
    expect(state.added).toEqual(["y"]);
  });

  test("survives a change of tab on the Cycle page", () => {
    expect(setTab(on({ view: "cycle", tab: "cand", added: ["x"] }), "in").added).toEqual(["x"]);
  });

  test("is cleared on leaving the Cycle page, and stays clear on coming back", () => {
    const left = go(on({ view: "cycle", added: ["x"] }), "now");
    expect(left.added).toEqual([]);
    expect(go(left, "cycle").added).toEqual([]);
  });

  test("is not recorded off the Cycle page", () => {
    expect(noteBroughtIn(on({ view: "now" }), "x").added).toEqual([]);
  });

  test("an item brought in while highlighted hands the highlight to the next candidate", () => {
    const snap = tree();
    const state = pick(on({ view: "cycle", tab: "cand" }, snap), "i:cand-ready");
    const next = tree();
    next.board.groups.unstarted!.find((e) => e.slug === "cand-ready")!.cycle = "c1";
    const after = refresh(noteBroughtIn(state, "cand-ready"), ctxOf(snap), ctxOf(next));
    expect(after).toMatchObject({ sel: "i:cand-backlog", open: true, added: ["cand-ready"] });
    expect(keys(currentList(setTab(after, "in"), ctxOf(next)))[0]).toBe("i:cand-ready");
  });
});
