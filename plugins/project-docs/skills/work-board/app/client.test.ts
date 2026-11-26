import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  afterSend,
  afterUndo,
  afterUndoSent,
  afterWrite,
  applied,
  applyKey,
  applyPoll,
  attend,
  bringIntent,
  bringRow,
  canBring,
  canTake,
  commandLines,
  emptyForm,
  focusKey,
  formsOnShow,
  gateBusy,
  gateRelease,
  gateTake,
  IDLE_GATE,
  keyIntent,
  landing,
  lastView,
  readWrite,
  reverted,
  SESSION_ENDED,
  SETTLE_MS,
  takeIntent,
  triageIntent,
  UNDO_GONE,
  undoBody,
  withDecided,
  withField,
  withoutDecided,
  withoutForm,
  closesInspector,
  bar,
  breakable,
  EMPTY_FEED,
  fields,
  formIntent,
  handoffLine,
  keyAction,
  meta,
  readPoll,
  settle,
  summary,
  takeToken,
  unreachable,
  viewModel,
  type Feed,
  type Last,
  type Local,
  type TriageForm,
} from "./client.ts";
import { snooze, type Snapshot } from "./model.ts";
import {
  attendPlannedCycle,
  go,
  initialState,
  openFeature,
  openSnoozeMenu,
  pick,
  setTab,
  toggleCycleMenu,
  type BoardState,
  type ListContext,
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
      entry({ slug: "f1", entity: "feature", lifecycle: "active", status: "draft", description: "What f1 is for." }),
      entry({ slug: "a", lifecycle: "active", cycle: "c1", parent: "feature/f1", priority: "high" }),
      entry({ slug: "b", lifecycle: "review", cycle: "c1", status: "draft" }),
      entry({ slug: "c", lifecycle: "ready", cycle: "c1", blockedBy: ["id-a"] }),
      entry({ slug: "d", lifecycle: "done", cycle: "c1", parent: "feature/f1" }),
      entry({ slug: "e", lifecycle: "backlog", priority: "low", blockedBy: ["id-d"] }),
      entry({ slug: "t", lifecycle: "triage", kind: "bug", source: "review/x", date: "2026-11-02" }),
    ],
  });
}

const ctx = (s: Snapshot, over: Partial<ListContext> = {}): ListContext => ({ snapshot: s, snoozes: [], now: NOW, ...over });

describe("the session token", () => {
  test("is taken out of the query string, and nothing else is", () => {
    expect(takeToken("?token=abc")).toEqual({ token: "abc", search: "" });
    expect(takeToken("?x=1&token=abc&y=2")).toEqual({ token: "abc", search: "?x=1&y=2" });
  });

  test("a query string without one is left as it was", () => {
    expect(takeToken("")).toEqual({ token: null, search: "" });
    expect(takeToken("?x=1")).toEqual({ token: null, search: "?x=1" });
    expect(takeToken("?token=")).toEqual({ token: null, search: "" });
  });
});

describe("the poll", () => {
  const s1 = tree();
  const s2 = tree();
  const good = (hash: string, s: Snapshot) => readPoll(200, { ok: true, data: { hash, snapshot: s } });

  test("a 200 gives the snapshot and its hash", () => {
    expect(good("h1", s1)).toEqual({ kind: "snapshot", hash: "h1", snapshot: s1 });
  });

  test("a 409 is shown in its own words, with its hint, and blocks the board", () => {
    const res = readPoll(409, {
      ok: false,
      error: { reason: "no-fields", message: "this project's pdocs is 9.4.1.", hint: "Run `update-project-docs`." },
    });
    expect(res).toEqual({
      kind: "problem",
      problem: { message: "this project's pdocs is 9.4.1.", hint: "Run `update-project-docs`.", blocking: true },
    });
  });

  test("any other refusal is a problem that does not block, in the server's words when it has some", () => {
    expect(readPoll(403, { ok: false, error: { message: "requests from another origin are refused." } })).toEqual({
      kind: "problem",
      problem: { message: "requests from another origin are refused.", hint: null, blocking: false },
    });
    expect(readPoll(502, "<html>")).toEqual({
      kind: "problem",
      problem: { message: "the board's server answered 502.", hint: null, blocking: false },
    });
    expect(readPoll(200, { ok: true, data: { hash: 1 } }).kind).toBe("problem");
  });

  test("the first snapshot is taken, and the same hash again changes nothing", () => {
    const first = applyPoll(EMPTY_FEED, good("h1", s1));
    expect(first).toEqual({ feed: { hash: "h1", snapshot: s1, problem: null }, changed: true, redraw: true });
    const again = applyPoll(first.feed, good("h1", s2));
    expect(again.changed).toBe(false);
    expect(again.redraw).toBe(false);
    // Not re-rendered means not replaced: the object the page holds is the same one.
    expect(again.feed).toBe(first.feed);
    expect(again.feed.snapshot).toBe(s1);
  });

  test("a new hash replaces the snapshot object and leaves the old one as it was", () => {
    const before = JSON.stringify(s1);
    const first = applyPoll(EMPTY_FEED, good("h1", s1));
    const next = applyPoll(first.feed, good("h2", s2));
    expect(next.changed).toBe(true);
    expect(next.feed.snapshot).toBe(s2);
    expect(first.feed.snapshot).toBe(s1);
    expect(JSON.stringify(s1)).toBe(before);
  });

  test("a problem keeps the last snapshot, is drawn once, and clears on the next good poll", () => {
    const held: Feed = applyPoll(EMPTY_FEED, good("h1", s1)).feed;
    const down = applyPoll(held, unreachable("no-answer"));
    expect(down.changed).toBe(false);
    expect(down.redraw).toBe(true);
    expect(down.feed.snapshot).toBe(s1);
    expect(down.feed.problem?.blocking).toBe(false);
    expect(applyPoll(down.feed, unreachable("no-answer")).redraw).toBe(false);
    const up = applyPoll(down.feed, good("h1", s2));
    expect(up).toEqual({ feed: { hash: "h1", snapshot: s1, problem: null }, changed: false, redraw: true });
  });

  test("a page without a token says how to get one", () => {
    const res = unreachable("no-token");
    expect(res.kind === "problem" && res.problem.message).toContain("`open`");
  });
});

describe("settle", () => {
  test("a state that still fits is returned as it is", () => {
    const s = tree();
    const state = initialState(s);
    expect(settle(state, s)).toBe(state);
  });

  test("a Cycle page whose cycle is gone goes to the cycle a fresh board shows", () => {
    const s = tree();
    const state: BoardState = { ...initialState(s), view: "cycle", cycle: "gone", peek: { prev: "c1", label: "Inbox" } };
    expect(settle(state, s)).toMatchObject({ view: "cycle", cycle: "c1", peek: null });
  });

  test("a feature's page whose feature is gone goes back to the list", () => {
    const s = tree();
    const state = openFeature(go(initialState(s), "feature"), "gone");
    expect(settle(state, s)).toMatchObject({ view: "feature", feature: null, sel: null, open: false });
    const kept = openFeature(go(initialState(s), "feature"), "f1");
    expect(settle(kept, s)).toBe(kept);
  });
});

describe("keys", () => {
  const press = (key: string, tag = "BODY", mods: object = {}) => keyAction({ key, tag, ...mods });

  test("j, k and the arrows move; Enter opens; Escape unwinds", () => {
    expect(press("j")).toBe("down");
    expect(press("ArrowDown")).toBe("down");
    expect(press("k")).toBe("up");
    expect(press("ArrowUp")).toBe("up");
    expect(press("Enter")).toBe("open");
    expect(press("Escape")).toBe("escape");
    expect(press("x")).toBeNull();
  });

  test("b brings in and t takes out, from a row or a button, never from a field", () => {
    expect(press("b")).toBe("bring");
    expect(press("t")).toBe("take");
    expect(press("b", "BUTTON")).toBe("bring");
    for (const tag of ["INPUT", "SELECT", "TEXTAREA"]) {
      expect(press("b", tag)).toBeNull();
      expect(press("t", tag)).toBeNull();
    }
    expect(press("b", "BODY", { metaKey: true })).toBeNull();
    expect(keyAction({ key: "b", tag: "BODY" }, true)).toBeNull();
    expect(keyAction({ key: "t", tag: "BODY" }, true)).toBeNull();
  });

  test("a held b or t writes once: the repeats are nothing, while a held j keeps moving", () => {
    expect(press("b", "BODY", { repeat: true })).toBeNull();
    expect(press("t", "BODY", { repeat: true })).toBeNull();
    expect(press("t", "BUTTON", { repeat: true })).toBeNull();
    expect(press("b", "BODY", { repeat: false })).toBe("bring");
    expect(press("j", "BODY", { repeat: true })).toBe("down");
    expect(press("Escape", "BODY", { repeat: true })).toBe("escape");
  });

  test("b and t change no view state: the write is the glue's to send", () => {
    const s = tree();
    const state = pick({ ...initialState(s), view: "cycle" }, "i:a");
    expect(applyKey(state, viewList(state, ctx(s)), "bring")).toBe(state);
    expect(applyKey(state, viewList(state, ctx(s)), "take")).toBe(state);
    expect(closesInspector(state, "take")).toBe(false);
  });

  test("typing in a field moves nothing, but Escape still counts", () => {
    for (const tag of ["INPUT", "SELECT", "TEXTAREA"]) {
      expect(press("j", tag)).toBeNull();
      expect(press("ArrowDown", tag)).toBeNull();
      expect(press("Enter", tag)).toBeNull();
      expect(press("Escape", tag)).toBe("escape");
    }
  });

  test("Enter on a button is the button's; j on a button still moves", () => {
    expect(press("Enter", "BUTTON")).toBeNull();
    expect(press("j", "BUTTON")).toBe("down");
  });

  test("a key with a modifier is the browser's", () => {
    for (const mods of [{ metaKey: true }, { ctrlKey: true }, { altKey: true }]) {
      expect(press("j", "BODY", mods)).toBeNull();
      expect(press("Escape", "BODY", mods)).toBeNull();
    }
  });

  test("while the board is blocked nothing moves or opens; Escape still counts", () => {
    for (const key of ["j", "k", "ArrowDown", "ArrowUp", "Enter"]) expect(keyAction({ key, tag: "BODY" }, true)).toBeNull();
    expect(keyAction({ key: "Escape", tag: "BODY" }, true)).toBe("escape");
    expect(keyAction({ key: "j", tag: "BODY" }, false)).toBe("down");
  });

  test("Escape closes the inspector only when nothing else is open over it", () => {
    const s = tree();
    const open = pick({ ...initialState(s), view: "cycle" }, "i:a");
    expect(closesInspector(open, "escape")).toBe(true);
    expect(closesInspector(toggleCycleMenu(open), "escape")).toBe(false);
    expect(closesInspector(openSnoozeMenu(open, "blocked"), "escape")).toBe(false);
    expect(closesInspector({ ...open, open: false }, "escape")).toBe(false);
    for (const action of ["down", "up", "open"] as const) expect(closesInspector(open, action)).toBe(false);
  });

  test("each action runs the selection rule of the same name", () => {
    const s = tree();
    const c = ctx(s);
    let state: BoardState = { ...initialState(s), view: "cycle" };
    const list = () => viewList(state, c);
    state = applyKey(state, list(), "down");
    expect(state.sel).toBe("i:a");
    expect(state.open).toBe(false);
    state = applyKey(state, list(), "down");
    expect(state.sel).toBe("i:b");
    state = applyKey(state, list(), "up");
    state = applyKey(state, list(), "up");
    expect(state.sel).toBe("i:a");
    state = applyKey(state, list(), "open");
    expect(state.open).toBe(true);
    state = toggleCycleMenu(state);
    state = applyKey(state, list(), "escape");
    expect(state).toMatchObject({ menu: false, open: true });
    state = applyKey(state, list(), "escape");
    expect(state).toMatchObject({ open: false, sel: "i:a" });
  });

  test("Enter with nothing highlighted opens nothing", () => {
    const s = tree();
    const state: BoardState = { ...initialState(s), view: "cycle" };
    expect(applyKey(state, viewList(state, ctx(s)), "open")).toBe(state);
  });
});

function viewList(state: BoardState, c: ListContext) {
  // The list the view model draws is the list the keys walk.
  const vm = viewModel(state, c);
  const keys =
    state.view === "cycle" && state.tab === "in"
      ? vm.box.groups.filter((g) => g.open).flatMap((g) => g.rows.map((r) => r.key))
      : [];
  const s = c.snapshot;
  const items = Object.values(s.board.groups).flat();
  return keys.map((key) => ({ key, item: items.find((i) => `i:${i.slug}` === key)! }));
}

describe("what a row says", () => {
  const s = tree();
  const item = (slug: string) => Object.values(s.board.groups).flat().find((e) => e.slug === slug)!;

  test("high is a pill and leaves the plain parts; the parent is the feature's slug", () => {
    expect(meta(s, item("a"))).toEqual({
      parts: [
        { text: "task", dot: null, title: null },
        { text: "f1", dot: null, title: null },
      ],
      pills: [{ kind: "high", text: "high" }],
    });
    expect(meta(s, item("a"), { noParent: true }).parts.map((p) => p.text)).toEqual(["task"]);
  });

  test("a lower priority and draft are plain words; lifecycle leads when asked for", () => {
    const m = meta(s, item("b"), { lifecycle: true, review: true });
    expect(m.parts.map((p) => p.text)).toEqual(["review", "in review", "task", "draft"]);
    expect(m.parts[0]!.dot).toBe("review");
    expect(m.parts[3]!.title).toContain("status: draft");
    expect(m.pills).toEqual([]);
    expect(meta(s, item("e")).parts.map((p) => p.text)).toEqual(["task", "low", "blocker done"]);
  });

  test("blocked is a pill; blocker done is a plain word", () => {
    expect(meta(s, item("c")).pills).toEqual([{ kind: "blocked", text: "blocked" }]);
    expect(meta(s, item("e")).pills).toEqual([]);
  });

  test("a string may wrap after a slash or a hyphen, and nowhere else", () => {
    expect(breakable("features/pdocs-work-board/plan.md")).toEqual(["features/", "pdocs-", "work-", "board/", "plan.md"]);
    expect(breakable("plain")).toEqual(["plain"]);
    expect(breakable("features/pdocs-work-board/plan.md").join("")).toBe("features/pdocs-work-board/plan.md");
  });

  test("the inspector's fields leave out what is empty and resolve each blocker", () => {
    expect(fields(s, item("t")).map((f) => [f.label, f.text.join("")])).toEqual([
      ["source", "review/x"],
      ["filed", "2026-11-02"],
    ]);
    const f = fields(s, { ...item("c"), blockedBy: ["id-a", "id-nobody"] });
    expect(f.map((x) => x.label)).toEqual(["cycle", "filed", "blocked by"]);
    expect(f[2]!.blockers).toEqual([
      { lifecycle: "active", dot: "active", name: ["a"] },
      { lifecycle: "unknown", dot: "backlog", name: ["id-", "nobody"] },
    ]);
  });

  test("a `from` that is an id is shown as the ref it names; any other is shown as written", () => {
    const from = (value: string) => fields(s, { ...item("t"), from: value }).find((f) => f.label === "from")!.text.join("");
    expect(from("id-a")).toBe("item/a");
    expect(from("features/f1/plan.md")).toBe("features/f1/plan.md");
    expect(from("id-nobody")).toBe("id-nobody");
  });

  test("the handoff is a line to copy, naming the document", () => {
    expect(handoffLine("docs/items/a.md")).toBe("open, then show --doc docs/items/a.md");
  });

  test("a bar leads with what is started, and its parts add up", () => {
    const its = ["a", "b", "c", "d"].map(item);
    expect(bar(its).map((x) => [x.lifecycle, x.n])).toEqual([
      ["active", 1],
      ["review", 1],
      ["done", 1],
      ["ready", 1],
    ]);
    expect(bar(its).reduce((n, x) => n + x.pct, 0)).toBe(100);
    expect(bar([])).toEqual([]);
    expect(summary(its)).toBe("1 of 4 finished");
  });
});

describe("the view model", () => {
  const s = tree();
  const c = ctx(s);
  const at = (over: Partial<BoardState>): BoardState => ({ ...initialState(s), ...over });

  test("Now: the active cycle, then started items in their groups", () => {
    const vm = viewModel(at({}), c);
    expect(vm.nav).toBe("now");
    expect(vm.band.title).toBe("Now");
    expect(vm.band.box).toBeNull();
    expect(vm.now.cycle).toMatchObject({ slug: "c1", summary: "1 of 4 finished" });
    expect(vm.now.groups.map((g) => [g.label, g.rows.map((r) => r.key)])).toEqual([["In this cycle", ["i:a", "i:b"]]]);
    expect(vm.inspector).toBeNull();
    expect(vm.inspecting).toBe(false);
  });

  test("Now by feature: the group names the feature, so a row does not", () => {
    const byCycle = viewModel(at({}), c).now.groups[0]!.rows[0]!;
    expect(byCycle.meta.parts.map((p) => p.text)).toEqual(["task", "f1"]);
    const byFeature = viewModel(at({ nowBy: "feature" }), c);
    expect(byFeature.now.groups.map((g) => g.label)).toEqual(["Title of f1", "In no feature"]);
    expect(byFeature.now.groups[0]!.rows[0]!.meta.parts.map((p) => p.text)).toEqual(["task"]);
  });

  test("blocked: a 409 takes the inspector with it, and any other problem does not", () => {
    const state = pick(at({ view: "cycle" }), "i:a");
    const fine = viewModel(state, c);
    expect(fine).toMatchObject({ blocked: false, inspecting: true });
    const stale = viewModel(state, c, { message: "boom", hint: null, blocking: false });
    expect(stale).toMatchObject({ blocked: false, inspecting: true });
    expect(stale.inspector).not.toBeNull();
    const blocked = viewModel(state, c, { message: "too old", hint: "update", blocking: true });
    expect(blocked).toMatchObject({ blocked: true, inspecting: false, inspector: null });
    // The state is untouched, so the inspector is back when the 409 stops.
    expect(viewModel(state, c, null).inspector).not.toBeNull();
  });

  test("only rows that need a decision feed the nav's count, on every page", () => {
    const withAdvisory = snapshot({
      cycles: [["c2", "planned", "draft"]],
      entries: [entry({ slug: "t", lifecycle: "triage" })],
      advisories: [{ id: "archive-threshold", message: "9 finished items.", action: "Run `pdocs archive`." }],
    });
    const vm = viewModel({ ...initialState(withAdvisory), view: "inbox" }, ctx(withAdvisory));
    expect(vm.inboxCount).toBe(2);
    expect(vm.inbox.groups.map((g) => [g.id, g.rows.length])).toEqual([
      ["decision", 2],
      ["housekeeping", 1],
    ]);
    expect(viewModel(initialState(withAdvisory), ctx(withAdvisory)).inboxCount).toBe(2);
  });

  test("Inbox: a row says what it does, or gives the line to say to the agent", () => {
    const with2 = snapshot({
      cycles: [["c1", "active", "stable"]],
      entries: [entry({ slug: "x", lifecycle: "ready", blockedBy: ["id-missing"] })],
      unreviewed: [entry({ slug: "u", lifecycle: "done", status: "draft" })],
      advisories: [{ id: "archive-threshold", message: "9 finished items.", action: "Run `pdocs archive`." }],
    });
    const state = openSnoozeMenu({ ...initialState(with2), view: "inbox" }, "blocked");
    const rows = viewModel(state, ctx(with2)).inbox.groups.flatMap((g) => g.rows);
    expect(rows.map((r) => r.id)).toEqual(["blocked", "unreviewed", "advisory:archive-threshold"]);
    expect(rows[0]).toMatchObject({ does: "Show item", alert: true, menu: true, key: "a:blocked" });
    expect(rows[1]!.does).toBeNull();
    expect(rows[1]!.text).toEndWith("Ask the agent: “Audit the finished items that were never marked reviewed.”");
    expect(rows[2]).toMatchObject({
      label: "Finished, not archived",
      text: "9 finished items.",
      tip: "9 finished items. Run `pdocs archive`.",
      alert: false,
      menu: false,
    });
  });

  test("Inbox: a snoozed row leaves its group and is listed with how long for", () => {
    const state = at({ view: "inbox" });
    const before = viewModel(state, c);
    const id = before.inbox.groups[0]!.rows[0]!.id;
    const after = viewModel(state, ctx(s, { snoozes: [snooze(id, "week", NOW, "c1")] }));
    expect(after.inbox.groups.flatMap((g) => g.rows).map((r) => r.id)).not.toContain(id);
    expect(after.inbox.snoozed).toEqual([expect.objectContaining({ id, note: "Snoozed for a week" })]);
    expect(after.inboxCount).toBe(before.inboxCount - 1);
  });

  test("Triage: the queue, with how many are waiting", () => {
    const vm = viewModel(at({ view: "triage", sel: "t:t" }), c);
    expect(vm.band.count).toBe("1 waiting");
    expect(vm.triage.rows).toEqual([
      { key: "t:t", title: "Title of t", on: true, kind: "bug", source: "review/x", filed: "2026-11-02" },
    ]);
  });

  test("Cycle: the header, two tabs with their counts, groups in order, done folded", () => {
    const vm = viewModel(at({ view: "cycle" }), c);
    expect(vm.nav).toBe("cycle");
    expect(vm.band.box).toMatchObject({ title: "Title of c1", lifecycle: "active", back: null });
    expect(vm.band.box!.summary).toBe("1 of 4 finished · active");
    expect(vm.band).toMatchObject({ tab: "in", inCount: 4, candCount: 1 });
    expect(vm.band.cycles.map((x) => [x.slug, x.on])).toEqual([
      ["c1", true],
      ["c2", false],
    ]);
    expect(vm.box.groups.map((g) => [g.id, g.fold, g.open, g.rows.length])).toEqual([
      ["active", false, true, 1],
      ["review", false, true, 1],
      ["ready", false, true, 1],
      ["done", true, false, 1],
    ]);
    expect(viewModel(at({ view: "cycle", doneOpen: true }), c).box.groups.at(-1)!.open).toBe(true);
  });

  test("Cycle: started, draft and the appetite come from the cycle's own entry", () => {
    const own = { ...s, cycles: s.cycles.map((x) => (x.slug === "c1" ? { ...x, started: "2026-11-19", appetite: "Two weeks." } : x)) };
    expect(viewModel(at({ view: "cycle" }), ctx(own)).band.box).toMatchObject({
      summary: "1 of 4 finished · started 2026-11-19",
      noteLabel: "Appetite. ",
      note: "Two weeks.",
    });
    const planned = viewModel(attendPlannedCycle(at({ view: "inbox" }), "c2"), c).band.box!;
    expect(planned).toMatchObject({ summary: "0 of 0 finished · planned · draft", back: "Inbox", note: "" });
  });

  test("Candidates: one row each with its lifecycle, and the filter as the state holds it", () => {
    const state = setTab(at({ view: "cycle" }), "cand");
    const vm = viewModel(state, c);
    expect(vm.cand.rows.map((r) => r.key)).toEqual(["i:e"]);
    expect(vm.cand.rows[0]!.meta.parts[0]).toMatchObject({ text: "backlog", dot: "backlog" });
    expect(vm.cand.features).toEqual(["f1"]);
    expect(vm.box.groups).toEqual([]);
    const none = viewModel({ ...state, cand: { q: "zzz", lifecycle: "all", feature: "all" } }, c);
    expect(none.cand.rows).toEqual([]);
    expect(none.cand.q).toBe("zzz");
    expect(none.band.candCount).toBe(1);
  });

  test("Features: one row each, then a feature's own page with a way back", () => {
    const list = viewModel(at({ view: "feature" }), c);
    expect(list.band.title).toBe("Features");
    expect(list.features).toEqual([
      expect.objectContaining({ slug: "f1", count: "1 open", finished: "1 finished", draft: true, lifecycle: "active" }),
    ]);
    const page = viewModel(openFeature(at({ view: "feature" }), "f1"), c);
    expect(page.nav).toBe("feature");
    expect(page.band.box).toMatchObject({
      title: "Title of f1",
      back: "Features",
      summary: "1 of 2 finished · draft",
      note: "What f1 is for.",
    });
    expect(page.box.groups.map((g) => g.id)).toEqual(["active", "done"]);
    // The page names the feature, so a row does not.
    expect(page.box.groups[0]!.rows[0]!.meta.parts.map((p) => p.text)).toEqual(["task"]);
  });

  test("the inspector shows the highlighted row's item, and only once it is open", () => {
    const state = at({ view: "cycle", sel: "i:b" });
    expect(viewModel(state, c).inspector).toBeNull();
    expect(viewModel(state, c).box.groups[1]!.rows[0]!.on).toBe(true);
    const vm = viewModel(pick(state, "i:b"), c);
    expect(vm.inspecting).toBe(true);
    expect(vm.inspector).toMatchObject({
      position: "2 of 3",
      first: false,
      last: false,
      title: "Title of b",
      path: "docs/items/b.md",
      tip: "docs/items/b.md · id id-b",
    });
    expect(vm.inspector!.meta.parts[0]!.text).toBe("review");
    expect(viewModel(pick(state, "i:a"), c).inspector).toMatchObject({ first: true, last: false });
    expect(viewModel(pick(state, "i:c"), c).inspector).toMatchObject({ first: false, last: true });
  });

  test("a key that is not a row in the current list opens nothing", () => {
    const vm = viewModel(pick(at({ view: "cycle" }), "i:e"), c);
    expect(vm.inspecting).toBe(false);
    expect(vm.inspector).toBeNull();
  });

  test("the snapshot is read, never changed", () => {
    const frozen = deepFreeze(tree());
    for (const view of ["now", "inbox", "triage", "cycle", "feature"] as const)
      viewModel({ ...initialState(frozen), view }, ctx(frozen));
    viewModel(setTab({ ...initialState(frozen), view: "cycle" }, "cand"), ctx(frozen));
    viewModel(pick({ ...initialState(frozen), view: "cycle" }, "i:a"), ctx(frozen));
    viewModel(openFeature(initialState(frozen), "f1"), ctx(frozen));
  });

  test("this repository's recorded snapshot draws every page", () => {
    const recorded: Snapshot = JSON.parse(readFileSync(join(import.meta.dir, "__fixtures__", "repo-snapshot.json"), "utf8"));
    const rc = ctx(recorded);
    const base = initialState(recorded);
    expect(viewModel(base, rc).now.cycle?.slug).toBe("2026-11-work-board");
    expect(viewModel({ ...base, view: "inbox" }, rc).inbox.groups.map((g) => g.id)).toEqual(["decision", "housekeeping"]);
    expect(viewModel({ ...base, view: "triage" }, rc).triage.rows.length).toBe(1);
    const cycle = viewModel({ ...base, view: "cycle" }, rc);
    expect(cycle.band.box!.summary).toContain("started 2026-11-19");
    expect(cycle.box.groups.at(-1)).toMatchObject({ id: "done", fold: true, open: false });
    expect(viewModel({ ...base, view: "feature" }, rc).features.map((f) => f.slug)).toEqual(["pdocs-work-board"]);
  });
});

describe("an Inbox row does the one thing it says", () => {
  const s = snapshot({
    cycles: [
      ["c1", "active", "stable"],
      ["c2", "planned", "draft"],
    ],
    entries: [
      entry({ slug: "t", lifecycle: "triage" }),
      entry({ slug: "x", lifecycle: "ready", cycle: "c1", blockedBy: ["id-missing"] }),
    ],
    unreviewed: [entry({ slug: "u", lifecycle: "done", status: "draft" })],
  });
  const c = ctx(s);
  const inbox: BoardState = { ...initialState(s), view: "inbox" };

  test("Waiting in triage goes to Triage", () => {
    expect(attend(inbox, c, "triage")).toMatchObject({ view: "triage", sel: null, open: false });
  });

  test("a planned cycle is shown with a way back, and the Cycle page keeps its own cycle", () => {
    const next = attend(inbox, c, "planned-cycle:c2");
    expect(next).toMatchObject({ view: "cycle", cycle: "c2", peek: { prev: "c1", label: "Inbox" } });
  });

  test("a row about items shows the first of them in the inspector", () => {
    const next = attend(openSnoozeMenu(inbox, "blocked"), c, "blocked");
    expect(next).toMatchObject({ view: "inbox", sel: "a:blocked", open: true, snoozeMenu: null });
    expect(viewModel(next, c).inspector?.title).toBe("Title of x");
  });

  test("a line to say to the agent goes nowhere and opens nothing", () => {
    const next = attend(openSnoozeMenu(inbox, "blocked"), c, "unreviewed");
    expect(next).toMatchObject({ view: "inbox", sel: null, open: false, snoozeMenu: null });
  });

  test("a row that is not there, or is snoozed, changes nothing", () => {
    expect(attend(inbox, c, "nope")).toBe(inbox);
    const asleep = ctx(s, { snoozes: [snooze("triage", "week", NOW, "c1")] });
    expect(attend(inbox, asleep, "triage")).toBe(inbox);
  });
});

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

describe("the two writes", () => {
  const s = tree();
  const item = (slug: string) => Object.values(s.board.groups).flat().find((i) => i.slug === slug)!;
  const form = (over: Partial<TriageForm> = {}): TriageForm => ({ ...emptyForm(), ...over });

  test("the form starts on ready, with nothing chosen and content not reviewed", () => {
    expect(emptyForm()).toEqual({ disp: "ready", priority: "", parent: "", reviewed: false, reason: "" });
  });

  test("an accept sends the lifecycle, and only what was chosen", () => {
    expect(triageIntent(item("t"), form()).body).toEqual({ kind: "triage", ref: "item/t", lifecycle: "ready" });
    expect(triageIntent(item("t"), form({ disp: "backlog", priority: "high", parent: "f1" })).body).toEqual({
      kind: "triage",
      ref: "item/t",
      lifecycle: "backlog",
      priority: "high",
      parent: "feature/f1",
    });
  });

  test("content reviewed is sent only when ticked", () => {
    expect("reviewed" in triageIntent(item("t"), form()).body).toBe(false);
    expect(triageIntent(item("t"), form({ reviewed: true })).body).toMatchObject({ reviewed: true });
  });

  test("a drop sends the lifecycle alone; its reason is a line for the agent, never part of the body", () => {
    const intent = triageIntent(
      item("t"),
      form({ disp: "drop", priority: "high", parent: "f1", reviewed: true, reason: "  a duplicate  " })
    );
    expect(intent.body).toEqual({ kind: "triage", ref: "item/t", lifecycle: "dropped" });
    expect(JSON.stringify(intent.body)).not.toContain("duplicate");
    expect(intent.note).toBe("reason for the agent to record: “a duplicate”");
    expect(intent.effect).toEqual({ kind: "triage", slug: "t", title: "Title of t", label: "dropped · a duplicate" });
    expect(triageIntent(item("t"), form({ disp: "drop" })).note).toBe("");
  });

  test("what Decided says about an accept", () => {
    expect(triageIntent(item("t"), form({ priority: "low", parent: "f1" })).effect).toMatchObject({
      label: "accepted to ready · low · f1",
    });
    expect(triageIntent(item("t"), form({ disp: "backlog" })).effect).toMatchObject({ label: "accepted to backlog" });
  });

  test("bring in names the cycle; take out sends null", () => {
    expect(bringIntent(item("e"), "c1")).toEqual({
      body: { kind: "membership", ref: "item/e", cycle: "c1" },
      effect: { kind: "bring", slug: "e" },
      note: "",
    });
    expect(takeIntent(item("a"))).toEqual({
      body: { kind: "membership", ref: "item/a", cycle: null },
      effect: { kind: "take", slug: "a" },
      note: "",
    });
  });

  test("only a backlog or ready item with no cycle can be brought in, and only into a current cycle", () => {
    const cycle = s.portfolio.cycles[0]!;
    expect(canBring(item("e"), cycle)).toBe(true);
    expect(canBring(item("e"), null)).toBe(false);
    expect(canBring(item("e"), { ...cycle, archived: true })).toBe(false);
    expect(canBring(item("c"), cycle)).toBe(false); // already in a cycle
    expect(canBring(item("t"), cycle)).toBe(false); // waiting in triage
    expect(canBring({ ...item("e"), lifecycle: "active" }, cycle)).toBe(false);
  });

  test("only an open item in a cycle can be taken out", () => {
    expect(canTake(item("a"))).toBe(true);
    expect(canTake(item("d"))).toBe(false); // done
    expect(canTake(item("e"))).toBe(false); // in no cycle
  });

  test("b acts on the highlighted row; t only with the inspector open", () => {
    const c = ctx(s);
    const cand = { ...setTab({ ...initialState(s), view: "cycle" as const }, "cand"), sel: "i:e" };
    expect(keyIntent(cand, c, "bring")?.body).toEqual({ kind: "membership", ref: "item/e", cycle: "c1" });
    expect(keyIntent(cand, c, "take")).toBeNull();
    expect(keyIntent({ ...cand, sel: null }, c, "bring")).toBeNull();
    expect(keyIntent({ ...cand, cycle: null }, c, "bring")).toBeNull();

    const inCycle = { ...initialState(s), view: "cycle" as const, sel: "i:a" };
    expect(keyIntent(inCycle, c, "take")).toBeNull();
    expect(keyIntent({ ...inCycle, open: true }, c, "take")?.body).toEqual({
      kind: "membership",
      ref: "item/a",
      cycle: null,
    });
    expect(keyIntent({ ...inCycle, open: true }, c, "bring")).toBeNull();
    expect(keyIntent({ ...inCycle, open: true }, c, "down")).toBeNull();
  });

  test("outside the Cycle page b needs the inspector open, where the button names the cycle", () => {
    const c = ctx(s);
    // `e` is backlog with no cycle, and no parent: give it one so a feature's page lists it.
    const withParent = snapshot({
      cycles: [
        ["c1", "active", "stable"],
        ["c2", "planned", "draft"],
      ],
      entries: [
        entry({ slug: "f1", entity: "feature", lifecycle: "active" }),
        entry({ slug: "e", lifecycle: "backlog", parent: "feature/f1" }),
      ],
    });
    const fc = ctx(withParent);
    const page: BoardState = { ...openFeature(initialState(withParent), "f1"), cycle: "c2", sel: "i:e" };
    expect(keyIntent(page, fc, "bring")).toBeNull();
    expect(keyIntent({ ...page, open: true }, fc, "bring")?.body).toEqual({
      kind: "membership",
      ref: "item/e",
      cycle: "c2",
    });
    // On the Cycle page the band names the cycle, so the highlight is enough.
    const cand = { ...setTab({ ...initialState(s), view: "cycle" as const }, "cand"), sel: "i:e" };
    expect(keyIntent(cand, c, "bring")).not.toBeNull();
  });
});

describe("a write starts from a row or from the inspector", () => {
  const s = tree();
  const c = ctx(s);

  test("Bring in on a row needs no highlight, and is nothing for a row that is not a candidate", () => {
    const cand = setTab({ ...initialState(s), view: "cycle" }, "cand");
    expect(bringRow(cand, c, "i:e")?.body).toEqual({ kind: "membership", ref: "item/e", cycle: "c1" });
    expect(bringRow(cand, c, "i:a")).toBeNull();
    expect(bringRow(cand, c, null)).toBeNull();
  });

  test("Apply decides the waiting item the inspector shows, and nothing else", () => {
    const triage = pick({ ...initialState(s), view: "triage" }, "t:t");
    expect(formIntent(triage, c, emptyForm())?.body).toEqual({ kind: "triage", ref: "item/t", lifecycle: "ready" });
    expect(formIntent(triage, c, null)).toBeNull();
    expect(formIntent({ ...triage, open: false }, c, emptyForm())).toBeNull();
    expect(formIntent(pick({ ...initialState(s), view: "cycle" }, "i:a"), c, emptyForm())).toBeNull();
  });
});

describe("what a write answers", () => {
  const restore = { kind: "restore", ref: "item/t", changes: [{ key: "lifecycle", before: "triage" }] };
  const ok = {
    ok: true,
    data: { command: "pdocs set item/t --lifecycle ready", path: "docs/items/t.md", changes: [], advisories: [], restore },
  };

  test("a write that ran: its command, and the restore object exactly as it came", () => {
    const r = readWrite(200, ok);
    expect(r).toMatchObject({ ok: true, command: "pdocs set item/t --lifecycle ready", advisories: [] });
    expect(r.ok && r.restore).toBe(restore);
  });

  test("advisories come back as their messages", () => {
    const r = readWrite(200, { ok: true, data: { ...ok.data, advisories: [{ id: "x", message: "Mind this." }, "odd"] } });
    expect(r.ok && r.advisories).toEqual(["Mind this."]);
  });

  test("a refusal from pdocs set: its message, its choices and the command that was tried", () => {
    const r = readWrite(422, {
      ok: false,
      error: { kind: "usage", message: "no cycle `nope`.", choices: ["c1", "c2"], exit_code: 2 },
      command: "pdocs set item/e --cycle nope",
    });
    expect(r).toEqual({
      ok: false,
      status: 422,
      message: "no cycle `nope`.",
      hint: "choices: c1, c2",
      command: "pdocs set item/e --cycle nope",
    });
  });

  test("a refusal with a hint, one with nothing readable, and no answer at all", () => {
    expect(readWrite(409, { ok: false, error: { message: "not waiting in triage.", hint: "Reload." } })).toEqual({
      ok: false,
      status: 409,
      message: "not waiting in triage.",
      hint: "Reload.",
      command: null,
    });
    expect(readWrite(500, null)).toMatchObject({ ok: false, status: 500, message: "the board's server answered 500." });
    expect(readWrite(200, { ok: true })).toMatchObject({ ok: false, status: 200 });
    expect(readWrite(null, null)).toMatchObject({ ok: false, status: null, message: "the board's server is not answering." });
  });

  const s = tree();
  const t = Object.values(s.board.groups).flat().find((i) => i.slug === "t")!;
  const intent = triageIntent(t, { ...emptyForm(), disp: "drop", reason: "dup" });
  const ran = (): Last => afterWrite(readWrite(200, ok), intent);

  const CMD = "$ pdocs set item/t --lifecycle ready";
  const view = (last: Last | null) => lastView(last, 0);

  test("the bar after a write: the command, the note, and an Undo", () => {
    const last = ran();
    expect(last.restore).toBe(restore);
    expect(view(last)).toEqual({
      label: "ran",
      text: CMD,
      lines: [CMD],
      note: "reason for the agent to record: “dup”",
      undo: true,
      undoLabel: "Undo",
      undoTitle: "",
      refused: false,
      bare: false,
    });
  });

  test("advisories join the note; a write that changed nothing has no Undo", () => {
    const last = afterWrite(
      readWrite(200, { ok: true, data: { ...ok.data, restore: null, advisories: [{ id: "x", message: "Mind this." }] } }),
      intent
    );
    expect(view(last)).toMatchObject({ note: "reason for the agent to record: “dup” · Mind this.", undo: false });
  });

  test("a refused write shows the refusal, with no Undo and no effect", () => {
    const last = afterWrite(
      readWrite(422, { ok: false, error: { message: "no cycle `nope`." }, command: "pdocs set item/e --cycle nope" }),
      intent
    );
    expect(last.effect).toBeNull();
    expect(view(last)).toMatchObject({
      label: "refused",
      text: "$ pdocs set item/e --cycle nope",
      note: "no cycle `nope`.",
      undo: false,
      refused: true,
      bare: false,
    });
    expect(view(afterWrite(readWrite(null, null), intent))).toMatchObject({
      label: "refused",
      text: "",
      note: "the board's server is not answering.",
      undo: false,
      refused: true,
      bare: true,
    });
    expect(
      view(afterWrite(readWrite(422, { ok: false, error: { message: "no.", choices: ["a", "b"] } }), intent))?.note
    ).toBe("no. choices: a, b");
  });

  const refusal = readWrite(409, { ok: false, error: { kind: "conflict", message: "is `triage`, not `backlog`." } });

  test("a refusal keeps the earlier write's Undo, and says whose it is", () => {
    const last = afterWrite(refusal, intent, ran());
    expect(last.restore).toBe(restore);
    expect(last.effect).toEqual(intent.effect);
    expect(view(last)).toMatchObject({
      label: "refused",
      note: "is `triage`, not `backlog`.",
      undo: true,
      undoLabel: "Undo previous write",
      undoTitle: CMD,
    });
    // A second refusal still holds it.
    expect(view(afterWrite(refusal, intent, last))).toMatchObject({ undo: true, undoTitle: CMD });
  });

  test("a write that ran replaces the earlier Undo: there is one slot", () => {
    const other = { kind: "restore", ref: "item/e", changes: [{ key: "cycle", before: null }] };
    const next = afterWrite(
      readWrite(200, { ok: true, data: { command: "pdocs set item/e --cycle c1", restore: other } }),
      bringIntent(t, "c1"),
      ran()
    );
    expect(next.restore).toBe(other);
    expect(view(next)).toMatchObject({ text: "$ pdocs set item/e --cycle c1", undoLabel: "Undo", undoTitle: "" });
  });

  test("a refusal with nothing to undo before it offers no Undo", () => {
    const spent = afterUndo(ran(), readWrite(200, { ok: true, data: { command: "pdocs set item/t --lifecycle triage" } }));
    expect(view(afterWrite(refusal, intent, spent))).toMatchObject({ undo: false, undoLabel: "Undo" });
    expect(view(afterWrite(refusal, intent, null))).toMatchObject({ undo: false });
  });

  test("Undo posts the stored object itself, or nothing", () => {
    expect(undoBody(ran())).toBe(restore);
    expect(undoBody(afterWrite(refusal, intent, ran()))).toBe(restore);
    expect(undoBody(afterWrite(refusal, intent, null))).toBeNull();
    expect(undoBody(null)).toBeNull();
  });

  test("an Undo that ran is used up: the bar says what undid it and offers no Undo", () => {
    const last = afterUndo(ran(), readWrite(200, { ok: true, data: { command: "pdocs set item/t --lifecycle triage", restore: null } }));
    expect(last.restore).toBeNull();
    expect(view(last)).toMatchObject({
      label: "undone with",
      text: "$ pdocs set item/t --lifecycle triage",
      note: "",
      undo: false,
      refused: false,
    });
  });

  test("any 409 on Undo: no longer available, and the control goes", () => {
    const gone = readWrite(409, { ok: false, error: { kind: "conflict", message: "the item changed." } });
    const last = afterUndo(ran(), gone);
    expect(last.restore).toBeNull();
    expect(view(last)).toMatchObject({ label: "ran", text: CMD, note: UNDO_GONE, undo: false });
    expect(UNDO_GONE).toBe("Undo no longer available");
    // Undoing the previous write from under a refusal: the line is about that write again.
    expect(view(afterUndo(afterWrite(refusal, intent, ran()), gone))).toMatchObject({
      label: "ran",
      text: CMD,
      note: UNDO_GONE,
      undo: false,
      refused: false,
    });
  });

  test("a refused token on Undo is a server started since the write: no longer available", () => {
    const last = afterUndo(ran(), readWrite(401, { ok: false, error: { kind: "unauthorized", message: "wrong." } }));
    expect(view(last)).toMatchObject({ label: "ran", note: UNDO_GONE, undo: false });
    expect(view(afterUndo(ran(), readWrite(403, { ok: false, error: { message: "no." } })))).toMatchObject({ undo: true });
  });

  test("an Undo that failed any other way keeps the control and says why", () => {
    const last = afterUndo(ran(), readWrite(null, null));
    expect(last.restore).toBe(restore);
    expect(view(last)).toMatchObject({
      label: "ran",
      text: CMD,
      note: "Undo did not run: the board's server is not answering.",
      undo: true,
      undoLabel: "Undo",
    });
    expect(view(null)).toBeNull();
  });
});

describe("a 401 from the board's API", () => {
  const body = { ok: false, error: { kind: "unauthorized", message: "the `x-board-token` header is missing or wrong." } };

  test("says the session ended and what to do, on a poll and on a write", () => {
    expect(SESSION_ENDED).toBe("This page's session ended. Open the board again with the `open` command.");
    expect(readPoll(401, body)).toEqual({
      kind: "problem",
      problem: { message: SESSION_ENDED, hint: null, blocking: false },
    });
    expect(readWrite(401, body)).toEqual({ ok: false, status: 401, message: SESSION_ENDED, hint: null, command: null });
    expect(readWrite(401, null)).toMatchObject({ message: SESSION_ENDED });
  });
});

describe("the command in the bar", () => {
  const long =
    "$ pdocs set item/anchor-link-encoding-and-case --lifecycle ready --priority high --parent feature/pdocs-work-board --status stable";

  test("one line when it fits, or when the width is not known yet", () => {
    expect(commandLines("$ pdocs set item/t --unset cycle", 40)).toEqual(["$ pdocs set item/t --unset cycle"]);
    expect(commandLines(long, 0)).toEqual([long]);
    expect(commandLines("", 40)).toEqual([]);
  });

  test("wraps between words to two lines before it cuts anything", () => {
    const lines = commandLines(long, 70);
    expect(lines).toEqual([
      "$ pdocs set item/anchor-link-encoding-and-case --lifecycle ready",
      "--priority high --parent feature/pdocs-work-board --status stable",
    ]);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(70);
  });

  test("when two lines are not enough, the item ref is cut in the middle and every flag stays", () => {
    const lines = commandLines(long, 58);
    expect(lines.length).toBe(2);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(58);
    const shown = lines.join(" ");
    for (const flag of ["--lifecycle ready", "--priority high", "--parent feature/pdocs-work-board", "--status stable"])
      expect(shown).toContain(flag);
    expect(shown).toMatch(/^\$ pdocs set item\/anchor[a-z-]*…[a-z-]*case /);
    expect(shown).not.toContain("anchor-link-encoding-and-case");
  });

  test("cuts no more of the ref than it must", () => {
    const text = "$ pdocs set item/abcdefghijklmnopqrstuvwxyz --lifecycle dropped";
    expect(commandLines(text, 43)).toEqual(["$ pdocs set item/abcdefghijklmnopqrstuvwxyz", "--lifecycle dropped"]);
    // One column fewer: two characters of the slug make way for the ellipsis.
    expect(commandLines(text, 42)).toEqual(["$ pdocs set item/abcdefghijkl…opqrstuvwxyz", "--lifecycle dropped"]);
  });

  test("a bar too narrow even for the flags cuts the end, as a last resort, and never more than two lines", () => {
    const lines = commandLines(long, 20);
    expect(lines.length).toBe(2);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(20);
    expect(lines[1]!.endsWith("…")).toBe(true);
  });

  test("the view carries the lines for the measured width, and the whole command beside them", () => {
    const last: Last = { label: "ran", text: long, note: "", restore: null, effect: null, undoOf: "" };
    expect(lastView(last, 70)).toMatchObject({ text: long, lines: commandLines(long, 70) });
  });
});

describe("one write at a time, and a pause after it", () => {
  test("a second write is refused while one is pending, and for 600 ms after it lands", () => {
    expect(SETTLE_MS).toBe(600);
    const first = gateTake(IDLE_GATE, 1000);
    expect(first).not.toBeNull();
    expect(gateTake(first!, 1001)).toBeNull();
    expect(gateTake(first!, 99_999)).toBeNull(); // still pending, however long it takes
    const landed = gateRelease(5000);
    expect(gateBusy(landed, 5000)).toBe(true);
    expect(gateTake(landed, 5500)).toBeNull();
    expect(gateTake(landed, 5599)).toBeNull();
    expect(gateBusy(landed, 5600)).toBe(false);
    expect(gateTake(landed, 5600)).not.toBeNull();
    expect(gateBusy(IDLE_GATE, 0)).toBe(false);
  });
});

describe("the triage form store", () => {
  const filled: TriageForm = { disp: "backlog", priority: "high", parent: "f1", reviewed: true, reason: "why" };

  test("the inspector coming to an item gives it a form, with content not reviewed", () => {
    expect(formsOnShow({}, null, "a")).toEqual({ a: emptyForm() });
    const kept = formsOnShow({ a: filled }, "b", "a");
    expect(kept.a).toEqual({ ...filled, reviewed: false });
  });

  test("coming back to the same item unticks it too; staying on it changes nothing", () => {
    const forms = { a: filled };
    expect(formsOnShow(forms, "a", "a")).toBe(forms);
    const closed = formsOnShow(forms, "a", null);
    expect(closed).toBe(forms);
    expect(formsOnShow(closed, null, "a").a!.reviewed).toBe(false);
  });

  test("a field is set on one item's form only", () => {
    const forms = formsOnShow(formsOnShow({}, null, "a"), "a", "b");
    const next = withField(forms, "a", "reviewed", true);
    expect(next.a!.reviewed).toBe(true);
    expect(next.b).toBe(forms.b!);
    expect(withField(forms, "zz", "priority", "high")).toBe(forms);
  });

  test("a form is dropped whole", () => {
    expect(withoutForm({ a: filled, b: filled }, "a")).toEqual({ b: filled });
    const forms = { a: filled };
    expect(withoutForm(forms, "zz")).toBe(forms);
  });
});

describe("what a write changes on the page", () => {
  const s = tree();
  const t = Object.values(s.board.groups).flat().find((i) => i.slug === "t")!;
  const e = Object.values(s.board.groups).flat().find((i) => i.slug === "e")!;
  const filled: TriageForm = { disp: "ready", priority: "high", parent: "f1", reviewed: true, reason: "" };
  const start = (): Local => ({
    state: { ...initialState(s), view: "cycle" },
    decided: [],
    forms: { t: filled, other: filled },
    last: null,
  });
  const okAnswer = (command: string, restore: unknown = { kind: "restore", ref: "item/x", changes: [] }) =>
    readWrite(200, { ok: true, data: { command, restore } });
  const refusal = readWrite(409, { ok: false, error: { message: "no." } });

  test("a triage decision that ran: Decided gains it, and its form is dropped", () => {
    const next = afterSend(start(), okAnswer("pdocs set item/t --lifecycle ready"), triageIntent(t, filled));
    expect(next.decided.map((d) => d.slug)).toEqual(["t"]);
    expect(next.forms).toEqual({ other: filled });
    expect(lastView(next.last, 0)).toMatchObject({ label: "ran", undo: true });
  });

  test("a bring in that ran joins Added just now", () => {
    const next = afterSend(start(), okAnswer("pdocs set item/e --cycle c1"), bringIntent(e, "c1"));
    expect(next.state.added).toEqual(["e"]);
    expect(next.decided).toEqual([]);
  });

  test("a refusal applies no local effect: nothing decided, nothing added; the form stays but is unticked", () => {
    const local = start();
    const triage = afterSend(local, refusal, triageIntent(t, filled));
    expect(triage.state).toBe(local.state);
    expect(triage.decided).toBe(local.decided);
    expect(triage.forms).toEqual({ t: { ...filled, reviewed: false }, other: filled });
    expect(lastView(triage.last, 0)).toMatchObject({ label: "refused", undo: false });
    const bring = afterSend(local, refusal, bringIntent(e, "c1"));
    expect(bring.state).toBe(local.state);
    expect(bring.forms).toBe(local.forms);
  });

  test("a refusal keeps the Undo of the write before it", () => {
    const ranFirst = afterSend(start(), okAnswer("pdocs set item/e --cycle c1"), bringIntent(e, "c1"));
    const then = afterSend(ranFirst, refusal, triageIntent(t, filled));
    expect(undoBody(then.last)).toBe(undoBody(ranFirst.last));
    expect(then.state.added).toEqual(["e"]);
  });

  test("an Undo that ran takes the decision back and drops the item's form, so it opens fresh", () => {
    const decided = afterSend(start(), okAnswer("pdocs set item/t --lifecycle ready"), triageIntent(t, filled));
    const again = { ...decided, forms: { ...decided.forms, t: filled } };
    const undone = afterUndoSent(again, okAnswer("pdocs set item/t --lifecycle triage", null));
    expect(undone.decided).toEqual([]);
    expect(undone.forms).toEqual({ other: filled });
    expect(lastView(undone.last, 0)).toMatchObject({ label: "undone with", undo: false });
  });

  test("an Undo of a bring in leaves Added just now; one that did not run changes nothing but the line", () => {
    const brought = afterSend(start(), okAnswer("pdocs set item/e --cycle c1"), bringIntent(e, "c1"));
    expect(afterUndoSent(brought, okAnswer("pdocs set item/e --unset cycle", null)).state.added).toEqual([]);
    const failed = afterUndoSent(brought, readWrite(null, null));
    expect(failed.state).toBe(brought.state);
    expect(failed.decided).toBe(brought.decided);
    expect(failed.forms).toBe(brought.forms);
    expect(undoBody(failed.last)).toBe(undoBody(brought.last));
    const gone = afterUndoSent(brought, refusal);
    expect(gone.state).toBe(brought.state);
    expect(undoBody(gone.last)).toBeNull();
    const none = start();
    expect(afterUndoSent(none, refusal)).toBe(none);
  });
});

describe("where the keyboard goes after a write", () => {
  const s = tree();
  const c = ctx(s);

  test("to the highlighted row, or the first row when none is highlighted", () => {
    const cand = setTab({ ...initialState(s), view: "cycle" }, "cand");
    expect(focusKey(cand, c)).toBe("i:e");
    const onCycle: BoardState = { ...initialState(s), view: "cycle" };
    expect(focusKey({ ...onCycle, sel: "i:b" }, c)).toBe("i:b");
    expect(focusKey({ ...onCycle, sel: "i:gone" }, c)).toBe("i:a");
    expect(focusKey({ ...initialState(s), view: "feature" }, c)).toBeNull();
  });
});

describe("where a write lands", () => {
  const s = tree();
  const c = ctx(s);
  const onCycle: BoardState = { ...initialState(s), view: "cycle" };

  test("a brought-in item joins Added just now, and leaves it when taken out or undone", () => {
    const brought = applied(onCycle, { kind: "bring", slug: "e" });
    expect(brought.added).toEqual(["e"]);
    expect(applied(brought, { kind: "take", slug: "e" }).added).toEqual([]);
    expect(reverted(brought, { kind: "bring", slug: "e" }).added).toEqual([]);
    expect(reverted(brought, { kind: "take", slug: "a" })).toBe(brought);
    const triage = { kind: "triage", slug: "t", title: "T", label: "dropped" } as const;
    expect(applied(onCycle, triage)).toBe(onCycle);
    expect(reverted(onCycle, triage)).toBe(onCycle);
  });

  test("Added just now is drawn from the snapshot: the group appears once the item is in the cycle", () => {
    const brought = applied(onCycle, { kind: "bring", slug: "e" });
    expect(viewModel(brought, c).box.groups.some((g) => g.id === "added")).toBe(false);
    const after = snapshot({
      cycles: [["c1", "active", "stable"]],
      entries: [entry({ slug: "e", lifecycle: "backlog", cycle: "c1" })],
    });
    const group = viewModel(brought, ctx(after)).box.groups[0]!;
    expect(group).toMatchObject({ id: "added", label: "Added just now" });
    expect(group.rows.map((r) => r.key)).toEqual(["i:e"]);
  });

  test("the flash goes to the row when it is in view, else to the tab it went to", () => {
    const cand = setTab(onCycle, "cand");
    expect(landing(cand, c, { kind: "bring", slug: "e" }, false)).toBe("i:e"); // still listed: the snapshot is old
    expect(landing(onCycle, c, { kind: "bring", slug: "a" }, false)).toBe("i:a");
    expect(landing(cand, c, { kind: "bring", slug: "a" }, false)).toBe("tab:in");
    expect(landing(onCycle, c, { kind: "take", slug: "e" }, false)).toBe("tab:cand");
    expect(landing(onCycle, c, { kind: "take", slug: "e" }, true)).toBe("tab:in");
    expect(landing(cand, c, { kind: "bring", slug: "a" }, true)).toBe("tab:cand");
    expect(landing({ ...initialState(s), view: "feature" }, c, { kind: "take", slug: "zz" }, false)).toBeNull();
  });

  test("a triage decision flashes Decided; its Undo flashes the row that came back", () => {
    const triage = { kind: "triage", slug: "t", title: "T", label: "dropped" } as const;
    const state: BoardState = { ...initialState(s), view: "triage" };
    expect(landing(state, c, triage, false)).toBe("decided");
    expect(landing(state, c, triage, true)).toBe("t:t");
    expect(landing(onCycle, c, triage, false)).toBeNull();
  });

  test("Decided keeps one line per item, newest last, and Undo takes it out", () => {
    const a = { kind: "triage", slug: "a", title: "A", label: "dropped" } as const;
    const b = { kind: "triage", slug: "b", title: "B", label: "accepted to ready" } as const;
    let list = withDecided(withDecided([], a), b);
    expect(list.map((d) => d.slug)).toEqual(["a", "b"]);
    list = withDecided(list, { ...a, label: "accepted to backlog" });
    expect(list).toEqual([
      { slug: "b", title: "B", label: "accepted to ready" },
      { slug: "a", title: "A", label: "accepted to backlog" },
    ]);
    expect(withDecided(list, { kind: "bring", slug: "x" })).toBe(list);
    expect(withoutDecided(list, "a").map((d) => d.slug)).toEqual(["b"]);
  });
});

describe("the view model for the writes", () => {
  const s = tree();
  const c = ctx(s);
  const decided = [
    { slug: "x", title: "Title of x", label: "accepted to ready" },
    { slug: "t", title: "Title of t", label: "dropped" },
  ];

  test("Triage counts what waits and what was decided, and lists the decided", () => {
    const state: BoardState = { ...initialState(s), view: "triage" };
    expect(viewModel(state, c).band.count).toBe("1 waiting");
    expect(viewModel(state, c).triage.decided).toEqual([]);
    const vm = viewModel(state, c, null, decided);
    // `t` is still waiting in this snapshot, so it is not yet shown as decided.
    expect(vm.triage.decided).toEqual([{ slug: "x", title: "Title of x", label: "accepted to ready" }]);
    expect(vm.band.count).toBe("1 waiting · 1 decided");
  });

  test("the inspector on a waiting item carries the form; on anything else it does not", () => {
    const vm = viewModel(pick({ ...initialState(s), view: "triage" }, "t:t"), c);
    expect(vm.inspector).toMatchObject({ slug: "t", triage: true, bring: null, take: false, features: ["f1"] });
    expect(viewModel(pick({ ...initialState(s), view: "cycle" }, "i:a"), c).inspector).toMatchObject({
      slug: "a",
      triage: false,
      bring: null,
      take: true,
    });
  });

  test("a candidate's inspector names the cycle by its title; with no cycle there is nothing to bring into", () => {
    const cand = pick(setTab({ ...initialState(s), view: "cycle" }, "cand"), "i:e");
    const vm = viewModel(cand, c);
    expect(vm.inspector).toMatchObject({
      bring: "Bring into Title of c1",
      bringTitle: "c1",
      take: false,
      triage: false,
    });
    expect(vm.cand.bring).toBe(true);
    const none = viewModel({ ...cand, cycle: null }, c);
    expect(none.inspector?.bring).toBeNull();
    expect(none.cand.bring).toBe(false);
  });
});

describe("the template and the writes", () => {
  const html = readFileSync(join(import.meta.dir, "index.html"), "utf8");
  const tag = (marker: string): string => html.match(new RegExp(`<[^>]*${marker}[^>]*>`))?.[0] ?? "";

  test("every control that writes is disabled while a write is pending", () => {
    const markers = ["data-apply", "data-bring-row", "data-bring", "data-take", "data-undo"];
    // And every field of the form: a click meant for one item must not land on the next one's.
    markers.push("data-priority", "data-parent", "data-reviewed", "data-reason");
    for (const marker of markers) expect(tag(`${marker}(?![-\\w])`)).toContain(':disabled="busy"');
    const segments = html.match(/<button[^>]*data-disp=[^>]*>/g) ?? [];
    expect(segments.length).toBe(3);
    for (const segment of segments) expect(segment).toContain(':disabled="busy"');
  });

  test("the handoff line has a row of its own, apart from the write bar", () => {
    expect(tag("data-handoff-line")).not.toBe("");
    expect(tag("data-handoff-line")).not.toContain("data-ran");
  });

  test("the disposition buttons are one named group", () => {
    const group = tag("data-dispositions");
    expect(group).toContain('role="group"');
    expect(group).toContain("aria-label=");
  });

  test("the form's fields are fields, so no key typed in them is a shortcut", () => {
    expect(tag("data-reason")).toStartWith("<input");
    expect(tag("data-priority")).toStartWith("<select");
    expect(tag("data-parent")).toStartWith("<select");
    expect(tag("data-reviewed")).toStartWith("<input");
  });
});
