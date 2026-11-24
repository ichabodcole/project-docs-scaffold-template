import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyKey,
  applyPoll,
  attend,
  closesInspector,
  bar,
  breakable,
  EMPTY_FEED,
  fields,
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
    expect(readPoll(401, { ok: false, error: { message: "the header is missing." } })).toEqual({
      kind: "problem",
      problem: { message: "the header is missing.", hint: null, blocking: false },
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
    // Bound with the writes, not here.
    expect(press("b")).toBeNull();
    expect(press("t")).toBeNull();
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
