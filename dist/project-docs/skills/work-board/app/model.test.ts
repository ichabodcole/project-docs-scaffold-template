import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activeCycle,
  attention,
  blockerState,
  blockers,
  candidateTotal,
  candidates,
  containerGroups,
  cycleItems,
  featureItems,
  inboxCount,
  inboxGroups,
  inboxRows,
  isSnoozed,
  liveSnoozes,
  nowGroups,
  openBlockers,
  snooze,
  snoozedRows,
  sorted,
  triageQueue,
  withSnooze,
  withoutSnooze,
  type Snapshot,
  type ViewEntry,
} from "./model.ts";
import { entry, slugs, snapshot } from "./test-support.ts";

const NOW = new Date(2026, 10, 19, 15, 30); // local time, so the suite passes under any TZ

describe("order within a group", () => {
  test("priority first, urgent to low, then none", () => {
    const list = [
      entry({ slug: "none" }),
      entry({ slug: "low", priority: "low" }),
      entry({ slug: "urgent", priority: "urgent" }),
      entry({ slug: "medium", priority: "medium" }),
      entry({ slug: "high", priority: "high" }),
    ];
    expect(slugs(sorted(list))).toEqual(["urgent", "high", "medium", "low", "none"]);
  });

  test("then title", () => {
    const list = [
      entry({ slug: "b", title: "Zebra", priority: "high" }),
      entry({ slug: "a", title: "Apple", priority: "high" }),
      entry({ slug: "c", title: "Aardvark" }),
    ];
    expect(slugs(sorted(list))).toEqual(["a", "b", "c"]);
  });

  test("does not reorder the list it was given", () => {
    const list = [entry({ slug: "b", title: "B" }), entry({ slug: "a", title: "A" })];
    sorted(list);
    expect(slugs(list)).toEqual(["b", "a"]);
  });
});

describe("container groups", () => {
  const items = [
    entry({ slug: "done-1", lifecycle: "done" }),
    entry({ slug: "triage-1", lifecycle: "triage" }),
    entry({ slug: "backlog-1", lifecycle: "backlog" }),
    entry({ slug: "ready-1", lifecycle: "ready" }),
    entry({ slug: "review-1", lifecycle: "review" }),
    entry({ slug: "active-1", lifecycle: "active" }),
    entry({ slug: "dropped-1", lifecycle: "dropped" }),
  ];

  test("started work first, then ready, backlog and triage, and done last", () => {
    expect(containerGroups(items).map((g) => g.id)).toEqual(["active", "review", "ready", "backlog", "triage", "done"]);
  });

  test("only done is folded", () => {
    expect(
      containerGroups(items)
        .filter((g) => g.fold)
        .map((g) => g.id)
    ).toEqual(["done"]);
  });

  test("an empty group is left out", () => {
    const groups = containerGroups([entry({ slug: "a", lifecycle: "ready" }), entry({ slug: "b", lifecycle: "done" })]);
    expect(groups.map((g) => g.id)).toEqual(["ready", "done"]);
    expect(containerGroups([])).toEqual([]);
  });

  test("a group is ordered by priority, then title", () => {
    const groups = containerGroups([
      entry({ slug: "z", title: "A", lifecycle: "ready" }),
      entry({ slug: "y", title: "B", lifecycle: "ready", priority: "high" }),
    ]);
    expect(slugs(groups[0]!.items)).toEqual(["y", "z"]);
  });

  test("'Added just now' comes first, in the order the items were brought in", () => {
    const groups = containerGroups(items, ["ready-1", "active-1"]);
    expect(groups[0]).toMatchObject({ id: "added", label: "Added just now", fold: false });
    expect(slugs(groups[0]!.items)).toEqual(["ready-1", "active-1"]);
  });

  test("an added item is not listed again under its lifecycle", () => {
    const groups = containerGroups(items, ["ready-1", "active-1"]);
    expect(groups.map((g) => g.id)).toEqual(["added", "review", "backlog", "triage", "done"]);
  });

  test("an added slug that is not in the container is ignored", () => {
    expect(containerGroups(items, ["elsewhere"]).map((g) => g.id)).not.toContain("added");
  });

  test("a cycle's items and a feature's items are found by their fields", () => {
    const s = snapshot({
      entries: [
        entry({ slug: "in-cycle", cycle: "c1" }),
        entry({ slug: "in-feature", parent: "feature/f1" }),
        entry({ slug: "both", cycle: "c1", parent: "feature/f1" }),
        entry({ slug: "f1", entity: "feature" }),
      ],
    });
    expect(slugs(cycleItems(s, "c1"))).toEqual(["in-cycle", "both"]);
    expect(slugs(featureItems(s, "f1"))).toEqual(["in-feature", "both"]);
  });
});

describe("Now", () => {
  const s = snapshot({
    cycles: [
      ["c-active", "active", "stable"],
      ["c-planned", "planned", "stable"],
    ],
    entries: [
      entry({ slug: "f1", entity: "feature", title: "Feature One" }),
      entry({ slug: "loose", lifecycle: "active" }),
      entry({ slug: "in-active", lifecycle: "active", cycle: "c-active", parent: "feature/f1" }),
      entry({ slug: "in-review", lifecycle: "review", cycle: "c-active" }),
      entry({ slug: "in-planned", lifecycle: "active", cycle: "c-planned", parent: "feature/f1" }),
      entry({ slug: "in-unknown", lifecycle: "active", cycle: "c-gone", parent: "feature/f-gone" }),
      entry({ slug: "ready", lifecycle: "ready", cycle: "c-active" }),
      entry({ slug: "done", lifecycle: "done", cycle: "c-active" }),
      entry({ slug: "archived", lifecycle: "active", cycle: "c-active", archived: true }),
    ],
  });

  test("lists only started items: active and review", () => {
    const all = nowGroups(s, "cycle").flatMap((g) => slugs(g.items));
    expect(all.sort()).toEqual(["in-active", "in-planned", "in-review", "in-unknown", "loose"]);
  });

  test("leaves archived entries out", () => {
    expect(nowGroups(s, "cycle").flatMap((g) => slugs(g.items))).not.toContain("archived");
    expect(nowGroups(s, "feature").flatMap((g) => slugs(g.items))).not.toContain("archived");
  });

  test("by cycle: the active cycle is 'In this cycle', others take their title", () => {
    const labels = Object.fromEntries(nowGroups(s, "cycle").map((g) => [g.key, g.label]));
    expect(labels).toEqual({
      "c-active": "In this cycle",
      "c-planned": "Title of c-planned",
      "c-gone": "c-gone",
      "": "In no cycle",
    });
  });

  test("by cycle: 'In no cycle' comes last", () => {
    const groups = nowGroups(s, "cycle");
    expect(groups.at(-1)!.label).toBe("In no cycle");
    expect(slugs(groups.at(-1)!.items)).toEqual(["loose"]);
  });

  test("by feature: groups take the feature's title, and 'In no feature' comes last", () => {
    const groups = nowGroups(s, "feature");
    expect(groups.map((g) => [g.key, g.label])).toEqual([
      ["f1", "Feature One"],
      ["f-gone", "f-gone"],
      ["", "In no feature"],
    ]);
    expect(slugs(groups[0]!.items)).toEqual(["in-active", "in-planned"]);
    expect(slugs(groups.at(-1)!.items)).toEqual(["in-review", "loose"]);
  });

  test("with no active cycle, no group is 'In this cycle'", () => {
    const none = snapshot({
      cycles: [["c-planned", "planned", "stable"]],
      entries: [entry({ slug: "a", lifecycle: "active", cycle: "c-planned" })],
    });
    expect(activeCycle(none)).toBeNull();
    expect(nowGroups(none, "cycle").map((g) => g.label)).toEqual(["Title of c-planned"]);
  });
});

describe("candidates", () => {
  const s = snapshot({
    entries: [
      entry({ slug: "backlog-high", lifecycle: "backlog", priority: "high", title: "Fix the parser" }),
      entry({ slug: "ready-low", lifecycle: "ready", priority: "low", parent: "feature/f1", title: "Polish" }),
      entry({ slug: "ready-none", lifecycle: "ready", title: "Write the guide" }),
      entry({ slug: "in-a-cycle", lifecycle: "ready", cycle: "c1" }),
      entry({ slug: "triage", lifecycle: "triage" }),
      entry({ slug: "active", lifecycle: "active" }),
      entry({ slug: "done", lifecycle: "done" }),
      entry({ slug: "archived", lifecycle: "backlog", archived: true }),
      entry({ slug: "f1", entity: "feature", lifecycle: "backlog" }),
    ],
  });
  const all = { q: "", lifecycle: "all", feature: "all" };

  test("live items with no cycle, in backlog or ready", () => {
    expect(slugs(candidates(s, all)).sort()).toEqual(["backlog-high", "ready-low", "ready-none"]);
  });

  test("ready comes first, whatever the priority", () => {
    expect(slugs(candidates(s, all))).toEqual(["ready-low", "ready-none", "backlog-high"]);
  });

  test("filtered by text over the title and the slug", () => {
    expect(slugs(candidates(s, { ...all, q: "  PARSER " }))).toEqual(["backlog-high"]);
    expect(slugs(candidates(s, { ...all, q: "ready-" }))).toEqual(["ready-low", "ready-none"]);
  });

  test("filtered by lifecycle", () => {
    expect(slugs(candidates(s, { ...all, lifecycle: "backlog" }))).toEqual(["backlog-high"]);
  });

  test("filtered by feature, or by having none", () => {
    expect(slugs(candidates(s, { ...all, feature: "f1" }))).toEqual(["ready-low"]);
    expect(slugs(candidates(s, { ...all, feature: "none" }))).toEqual(["ready-none", "backlog-high"]);
  });

  test("the total ignores the filters", () => {
    expect(candidateTotal(s)).toBe(3);
  });
});

describe("blockers", () => {
  const s = snapshot({
    entries: [
      entry({ slug: "b-done", lifecycle: "done" }),
      entry({ slug: "b-dropped", lifecycle: "dropped" }),
      entry({ slug: "b-archived", lifecycle: "done", archived: true }),
      entry({ slug: "b-open", lifecycle: "ready" }),
      entry({ slug: "waits", blockedBy: ["id-b-open", "id-b-done"] }),
      entry({ slug: "cleared", blockedBy: ["id-b-done", "id-b-dropped", "id-b-archived"] }),
      entry({ slug: "missing", blockedBy: ["id-nobody"] }),
      entry({ slug: "free" }),
    ],
  });
  const of = (slug: string): ViewEntry => s.board.groups.unstarted!.find((e) => e.slug === slug)!;

  test("ids resolve against every entry, archived ones included", () => {
    expect(blockers(s, of("cleared")).map((b) => [b.id, b.entry?.slug, b.lifecycle])).toEqual([
      ["id-b-done", "b-done", "done"],
      ["id-b-dropped", "b-dropped", "dropped"],
      ["id-b-archived", "b-archived", "done"],
    ]);
  });

  test("a blocker that is done or dropped is not open", () => {
    expect(openBlockers(s, of("waits")).map((b) => b.id)).toEqual(["id-b-open"]);
    expect(openBlockers(s, of("cleared"))).toEqual([]);
  });

  test("an unknown id counts as open, never as 'blocker done'", () => {
    expect(openBlockers(s, of("missing"))).toEqual([{ id: "id-nobody", entry: null, lifecycle: null }]);
    expect(blockerState(s, of("missing"))).toBe("blocked");
  });

  test("when two entries share an id, the live one answers, not the archived one", () => {
    const item = entry({ slug: "waits", blockedBy: ["dup"] });
    const live = entry({ slug: "live-copy", id: "dup", lifecycle: "ready" });
    const old = entry({ slug: "old-copy", id: "dup", lifecycle: "done", archived: true });
    for (const order of [
      [old, live, item],
      [live, old, item],
    ]) {
      const dup = snapshot();
      dup.board.groups = { any: order };
      expect(blockers(dup, item).map((b) => b.entry?.slug)).toEqual(["live-copy"]);
      expect(blockerState(dup, item)).toBe("blocked");
      expect(attention(dup).map((r) => r.id)).toEqual(["blocked"]);
    }
  });

  test("the state an item's meta line shows", () => {
    expect(blockerState(s, of("free"))).toBe("none");
    expect(blockerState(s, of("waits"))).toBe("blocked");
    expect(blockerState(s, of("cleared"))).toBe("blocker-done");
  });
});

describe("Inbox rows", () => {
  const full = (): Snapshot =>
    snapshot({
      cycles: [
        ["c-active", "active", "draft"],
        ["c-plan-draft", "planned", "draft"],
        ["c-plan-reviewed", "planned", "stable"],
        ["c-plan-draft-2", "planned", "draft"],
      ],
      entries: [
        entry({ slug: "t1", lifecycle: "triage" }),
        entry({ slug: "t2", lifecycle: "triage" }),
        entry({ slug: "t-archived", lifecycle: "triage", archived: true }),
        entry({ slug: "open-blocker", lifecycle: "ready" }),
        entry({ slug: "done-blocker", lifecycle: "done" }),
        entry({ slug: "blocked", title: "Blocked thing", blockedBy: ["id-open-blocker"] }),
        entry({ slug: "stale", title: "Stale thing", blockedBy: ["id-done-blocker"] }),
        entry({ slug: "finished-blocked", lifecycle: "done", blockedBy: ["id-open-blocker"] }),
        entry({ slug: "draft-a", title: "Draft A", lifecycle: "active", status: "draft" }),
        entry({ slug: "draft-b", title: "Draft B", lifecycle: "review", status: "draft" }),
        entry({ slug: "started-reviewed", lifecycle: "active" }),
      ],
      unreviewed: [entry({ slug: "u1", lifecycle: "done", status: "draft" })],
      advisories: [
        {
          id: "archive-threshold",
          message: "90 finished items are not archived.",
          action: "Offer a selection.",
          refs: ["item/a", "item/b"],
        },
        { id: "work-item-review", message: "6 items have no reviewed document.", action: "Show the user each item." },
      ],
    });

  test("one row per kind, decisions first in a fixed order, then housekeeping", () => {
    expect(attention(full()).map((r) => r.id)).toEqual([
      "triage",
      "planned-cycle:c-plan-draft",
      "planned-cycle:c-plan-draft-2",
      "blocked",
      "draft-started",
      "stale-blocker",
      "unreviewed",
      "advisory:archive-threshold",
      "advisory:work-item-review",
    ]);
  });

  test("waiting in triage counts the live triage items and goes to Triage", () => {
    const row = attention(full())[0]!;
    expect(row).toMatchObject({ kind: "triage", n: 2, target: { type: "triage" }, does: "Go to Triage →" });
    expect(slugs(triageQueue(full()))).toEqual(["t1", "t2"]);
  });

  test("one row per planned cycle that is not reviewed, and none for a reviewed one", () => {
    const rows = attention(full()).filter((r) => r.kind === "planned-cycle");
    expect(rows.map((r) => r.target)).toEqual([
      { type: "cycle", slug: "c-plan-draft" },
      { type: "cycle", slug: "c-plan-draft-2" },
    ]);
    expect(rows[0]).toMatchObject({ n: 1, does: "Go to the planned cycle →" });
    expect(rows[0]!.desc).toContain("Title of c-plan-draft");
  });

  test("a planned cycle whose status is unknown counts as not reviewed", () => {
    const s = snapshot({ bareCycles: [["c-bare", "planned"]] });
    expect(attention(s).map((r) => r.id)).toEqual(["planned-cycle:c-bare"]);
  });

  test("an archived planned cycle has no row", () => {
    const s = snapshot({ cycles: [["c-old", "planned", "draft"]] });
    s.portfolio.cycles[0]!.archived = true;
    expect(attention(s)).toEqual([]);
  });

  test("blocked: open items waiting on unfinished work, showing the first", () => {
    const row = attention(full()).find((r) => r.id === "blocked")!;
    expect(row.n).toBe(1);
    expect(row.target).toMatchObject({ type: "item", item: { slug: "blocked" } });
    expect(row.does).toBe("Show item");
    expect(row.desc).toBe("Blocked thing waiting on unfinished work.");
  });

  test("blocker already done: open items whose every blocker is finished", () => {
    const row = attention(full()).find((r) => r.id === "stale-blocker")!;
    expect(row.n).toBe(1);
    expect(row.target).toMatchObject({ type: "item", item: { slug: "stale" } });
  });

  test("a finished item is neither blocked nor stale", () => {
    const s = snapshot({
      entries: [
        entry({ slug: "open", lifecycle: "ready" }),
        entry({ slug: "closed", lifecycle: "done" }),
        entry({ slug: "a", lifecycle: "done", blockedBy: ["id-open"] }),
        entry({ slug: "b", lifecycle: "dropped", blockedBy: ["id-closed"] }),
      ],
    });
    expect(attention(s)).toEqual([]);
  });

  test("started on a draft: started items whose document is not reviewed", () => {
    const row = attention(full()).find((r) => r.id === "draft-started")!;
    expect(row.n).toBe(2);
    expect(row.desc).toBe("2 items started before its document was reviewed.");
    expect(row.target).toMatchObject({ type: "item", item: { slug: "draft-a" } });
  });

  test("finished, never reviewed comes from `view unreviewed`", () => {
    const row = attention(full()).find((r) => r.id === "unreviewed")!;
    expect(row).toMatchObject({ n: 1, group: "housekeeping", does: null });
    expect(row.target.type).toBe("ask");
    expect(attention(snapshot()).some((r) => r.id === "unreviewed")).toBe(false);
  });

  test("one row per advisory, carrying its own message and action", () => {
    const rows = attention(full()).filter((r) => r.kind === "advisory");
    expect(rows.map((r) => [r.label, r.desc, r.n])).toEqual([
      ["90 finished items are not archived.", "Offer a selection.", 2],
      ["6 items have no reviewed document.", "Show the user each item.", null],
    ]);
    expect(rows[0]!.target).toEqual({ type: "ask", line: "90 finished items are not archived. Offer a selection." });
  });

  test("an advisory with no action is shown by its message alone", () => {
    const s = snapshot({ advisories: [{ id: "bare", message: "Something needs a look." }] });
    const row = attention(s)[0]!;
    expect(row).toMatchObject({ label: "Something needs a look.", desc: "" });
    expect(row.target).toEqual({ type: "ask", line: "Something needs a look." });
    expect(JSON.stringify(row)).not.toContain("undefined");
  });

  test("an advisory repeated by another view is listed once", () => {
    const s = full();
    s.unreviewed.advisories = [{ id: "archive-threshold", message: "again", action: "again" }];
    s.portfolio.advisories = [{ id: "other", message: "m", action: "a" }];
    expect(
      attention(s)
        .filter((r) => r.kind === "advisory")
        .map((r) => r.id)
    ).toEqual(["advisory:archive-threshold", "advisory:work-item-review", "advisory:other"]);
  });

  test("the first five kinds need a decision; the rest are housekeeping", () => {
    const groups = inboxGroups(attention(full()));
    expect(groups.map((g) => [g.id, g.label])).toEqual([
      ["decision", "Needs a decision"],
      ["housekeeping", "Housekeeping"],
    ]);
    expect([...new Set(groups[0]!.rows.map((r) => r.kind))]).toEqual([
      "triage",
      "planned-cycle",
      "blocked",
      "draft-started",
      "stale-blocker",
    ]);
    expect([...new Set(groups[1]!.rows.map((r) => r.kind))]).toEqual(["unreviewed", "advisory"]);
  });

  test("a group with no rows is left out", () => {
    const s = snapshot({ advisories: [{ id: "x", message: "m", action: "a" }] });
    expect(inboxGroups(attention(s)).map((g) => g.id)).toEqual(["housekeeping"]);
  });

  test("only 'Needs a decision' rows count toward the nav", () => {
    const rows = attention(full());
    expect(rows.length).toBe(9);
    expect(inboxCount(rows)).toBe(6);
    const housekeepingOnly = snapshot({ advisories: [{ id: "x", message: "m", action: "a" }] });
    expect(inboxCount(attention(housekeepingOnly))).toBe(0);
  });

  test("a snoozed row leaves the Inbox and the count, and is listed as snoozed", () => {
    const s = full();
    const snoozes = [snooze("blocked", "week", NOW, "c-active"), snooze("unreviewed", "week", NOW, "c-active")];
    const rows = inboxRows(s, snoozes, NOW);
    expect(rows.map((r) => r.id)).not.toContain("blocked");
    expect(rows.map((r) => r.id)).not.toContain("unreviewed");
    expect(inboxCount(rows)).toBe(5);
    expect(snoozedRows(s, snoozes, NOW).map((r) => r.id)).toEqual(["blocked", "unreviewed"]);
  });

  test("a snooze that has woken puts its row back", () => {
    const s = full();
    const snoozes = [snooze("blocked", "tomorrow", NOW, "c-active")];
    const later = new Date(2026, 10, 20, 0, 0);
    expect(inboxRows(s, snoozes, later).map((r) => r.id)).toContain("blocked");
    expect(snoozedRows(s, snoozes, later)).toEqual([]);
  });
});

describe("snooze", () => {
  test("is stored as id, choice, at and the active cycle", () => {
    expect(snooze("blocked", "week", NOW, "c1")).toEqual({
      id: "blocked",
      choice: "week",
      at: NOW.toISOString(),
      activeCycle: "c1",
    });
  });

  test("'tomorrow' sleeps for the rest of the day and wakes when the date passes", () => {
    const s = snooze("r", "tomorrow", NOW, "c1");
    expect(isSnoozed(s, new Date(2026, 10, 19, 23, 59), "c1")).toBe(true);
    expect(isSnoozed(s, new Date(2026, 10, 20, 0, 0), "c1")).toBe(false);
  });

  test("'week' wakes seven days on", () => {
    const s = snooze("r", "week", NOW, "c1");
    expect(isSnoozed(s, new Date(2026, 10, 25, 23, 59), "c1")).toBe(true);
    expect(isSnoozed(s, new Date(2026, 10, 26, 0, 0), "c1")).toBe(false);
  });

  test("'cycle' has no date and wakes when the active cycle is another one", () => {
    const s = snooze("r", "cycle", NOW, "c1");
    expect(isSnoozed(s, new Date(2030, 0, 1), "c1")).toBe(true);
    expect(isSnoozed(s, NOW, "c2")).toBe(false);
    expect(isSnoozed(s, NOW, null)).toBe(false);
  });

  test("a change of active cycle wakes a dated snooze too", () => {
    expect(isSnoozed(snooze("r", "week", NOW, "c1"), NOW, "c2")).toBe(false);
    expect(isSnoozed(snooze("r", "week", NOW, null), NOW, null)).toBe(true);
  });

  test("a snooze whose date cannot be read is awake", () => {
    expect(isSnoozed({ id: "r", choice: "tomorrow", at: "not a date", activeCycle: "c1" }, NOW, "c1")).toBe(false);
  });

  test("snoozing a row again replaces its snooze; waking removes it", () => {
    let list = withSnooze([], snooze("a", "tomorrow", NOW, "c1"));
    list = withSnooze(list, snooze("b", "week", NOW, "c1"));
    list = withSnooze(list, snooze("a", "cycle", NOW, "c1"));
    expect(list.map((s) => [s.id, s.choice])).toEqual([
      ["b", "week"],
      ["a", "cycle"],
    ]);
    expect(withoutSnooze(list, "b").map((s) => s.id)).toEqual(["a"]);
  });

  test("woken snoozes are dropped from what is stored", () => {
    const list = [snooze("a", "tomorrow", NOW, "c1"), snooze("b", "week", NOW, "c1")];
    expect(liveSnoozes(list, new Date(2026, 10, 21, 9, 0), "c1").map((s) => s.id)).toEqual(["b"]);
  });
});

describe("a snapshot recorded from this repository", () => {
  // A trimmed recording, made on 2026-11-19: the `data` of `view board
  // --features --all`, `view portfolio` and `view unreviewed`, and the `cycle`
  // entry of `view cycle <slug>`, each as the CLI printed it, then cut down to
  // the work-board feature, six items and the two current cycles. Advisories
  // are whole except their lists of refs, which name only the entries kept, so
  // an advisory's message counts more than its `refs` holds. The planned
  // cycle has a portfolio row and no `cycles` entry.
  const recorded: Snapshot = JSON.parse(
    readFileSync(join(import.meta.dir, "__fixtures__", "repo-snapshot.json"), "utf8")
  );

  test("the Inbox has a triage row and an archive row", () => {
    const rows = inboxRows(recorded, [], NOW);
    const triage = rows.find((r) => r.id === "triage")!;
    expect(triage).toMatchObject({ group: "decision", n: 1 });
    const archive = rows.find((r) => r.id === "advisory:archive-threshold")!;
    expect(archive.group).toBe("housekeeping");
    expect(archive.label).toMatch(/^\d+ finished items are not archived/);
    expect(archive.desc).toContain("pdocs archive");
    expect(archive.n).toBe(3);
  });

  test("the planned cycle has a row; the nav counts decisions only", () => {
    const rows = inboxRows(recorded, [], NOW);
    expect(rows.map((r) => r.id)).toContain("planned-cycle:2026-10-v3-migration-feedback");
    expect(inboxCount(rows)).toBe(rows.filter((r) => r.group === "decision").length);
    expect(inboxCount(rows)).toBeLessThan(rows.length);
  });

  test("Now lists the started item under the active cycle", () => {
    const groups = nowGroups(recorded, "cycle");
    expect(groups.map((g) => g.label)).toEqual(["In this cycle"]);
    expect(slugs(groups[0]!.items)).toEqual(["board-model-and-selection-rules"]);
  });

  test("every blocker resolves, and one item is blocked while another's blocker is done", () => {
    const all = Object.values(recorded.board.groups).flat();
    expect(all.flatMap((e) => blockers(recorded, e)).filter((b) => b.entry === null)).toEqual([]);
    const state = Object.fromEntries(all.map((e) => [e.slug, blockerState(recorded, e)]));
    expect(state["board-shell-and-five-pages"]).toBe("blocked");
    expect(state["board-server-and-pdocs-bridge"]).toBe("blocker-done");
  });

  test("entries carry the fields the inspector and the cycle header read", () => {
    const item = Object.values(recorded.board.groups)
      .flat()
      .find((e) => e.slug === "board-model-and-selection-rules")!;
    expect(item.description).toStartWith("Layout D's behaviour");
    expect(item.from).toBe("features/pdocs-work-board/plan.md");
    expect(item.source).toBeNull();
    expect(item.appetite).toBeNull();
    const cycle = recorded.cycles.find((c) => c.slug === "2026-11-work-board")!;
    expect(typeof cycle.appetite).toBe("string");
    expect(cycle.started).toBe("2026-11-19");
  });
});
