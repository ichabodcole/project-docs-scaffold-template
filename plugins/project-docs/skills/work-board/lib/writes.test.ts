import { describe, expect, test } from "bun:test";
import { entry, snapshot } from "../app/test-support.ts";
import {
  buildRestore,
  parseWrite,
  planWrite,
  setArgs,
  undoStillApplies,
  writtenValues,
  type RestoreWrite,
  type Write,
} from "./writes.ts";

const SNAP = snapshot({
  entries: [
    entry({ slug: "waiting", lifecycle: "triage" }),
    entry({ slug: "settled", lifecycle: "backlog" }),
    entry({ slug: "gone", lifecycle: "done", archived: true }),
    entry({ slug: "a-feature", entity: "feature", lifecycle: "active" }),
  ],
});

const parsed = (body: unknown): Write => {
  const r = parseWrite(body);
  if (!r.ok) throw new Error(r.message);
  return r.write;
};
const refused = (body: unknown): string => {
  const r = parseWrite(body);
  expect(r.ok).toBe(false);
  return r.ok ? "" : r.message;
};

describe("a triage decision", () => {
  test("is one set call: lifecycle, then the optional priority, parent and status", () => {
    expect(setArgs(parsed({ kind: "triage", ref: "item/waiting", lifecycle: "backlog" }))).toEqual([
      "set", "item/waiting", "--lifecycle", "backlog",
    ]);
    const full = parsed({
      kind: "triage",
      ref: "item/waiting",
      lifecycle: "ready",
      priority: "high",
      parent: "feature/a-feature",
      reviewed: true,
    });
    expect(setArgs(full)).toEqual([
      "set", "item/waiting", "--lifecycle", "ready", "--priority", "high", "--parent", "feature/a-feature", "--status", "stable",
    ]);
    const plan = planWrite(full, SNAP);
    expect(plan.ok && plan.command).toBe(
      "pdocs set item/waiting --lifecycle ready --priority high --parent feature/a-feature --status stable"
    );
  });

  test("a bare feature slug is written as feature/<slug>", () => {
    expect(setArgs(parsed({ kind: "triage", ref: "item/waiting", lifecycle: "ready", parent: "a-feature" }))).toEqual([
      "set", "item/waiting", "--lifecycle", "ready", "--parent", "feature/a-feature",
    ]);
  });

  test("`reviewed: false` and null options add nothing", () => {
    expect(
      setArgs(parsed({ kind: "triage", ref: "item/waiting", lifecycle: "dropped", reviewed: false, priority: null, parent: null }))
    ).toEqual(["set", "item/waiting", "--lifecycle", "dropped"]);
  });

  test("only backlog, ready and dropped are decisions", () => {
    for (const lifecycle of ["active", "triage", "review", "done", "", undefined, 3, "--unset"])
      expect(refused({ kind: "triage", ref: "item/waiting", lifecycle })).toContain("backlog, ready, dropped");
  });

  test("a priority or parent that is not one is refused", () => {
    for (const priority of ["asap", "--title", 1, ""])
      refused({ kind: "triage", ref: "item/waiting", lifecycle: "ready", priority });
    for (const parent of ["--unset", "feature/", "feature/a b", "item/x/y", 4, ""])
      refused({ kind: "triage", ref: "item/waiting", lifecycle: "ready", parent });
    refused({ kind: "triage", ref: "item/waiting", lifecycle: "ready", reviewed: "yes" });
  });

  test("is taken only on an item waiting in triage", () => {
    const plan = planWrite(parsed({ kind: "triage", ref: "item/settled", lifecycle: "dropped" }), SNAP);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect([plan.status, plan.kind]).toEqual([409, "conflict"]);
  });
});

describe("cycle membership", () => {
  test("a slug brings the item in; null takes it out with --unset", () => {
    expect(setArgs(parsed({ kind: "membership", ref: "item/settled", cycle: "2026-11-a" }))).toEqual([
      "set", "item/settled", "--cycle", "2026-11-a",
    ]);
    expect(setArgs(parsed({ kind: "membership", ref: "item/settled", cycle: null }))).toEqual([
      "set", "item/settled", "--unset", "cycle",
    ]);
  });

  test("a cycle that is not a slug, or is missing, is refused", () => {
    for (const cycle of [undefined, "", "--unset", "a b", 7, "../x"])
      refused({ kind: "membership", ref: "item/settled", cycle });
  });
});

describe("restore", () => {
  test("puts each value back, and unsets the keys that were absent", () => {
    const write = parsed({
      kind: "restore",
      ref: "item/waiting",
      changes: [
        { key: "lifecycle", before: "triage" },
        { key: "priority", before: null },
        { key: "parent", before: null },
        { key: "status", before: "draft" },
      ],
    });
    expect(setArgs(write)).toEqual([
      "set", "item/waiting", "--lifecycle", "triage", "--status", "draft", "--unset", "priority,parent",
    ]);
    expect(setArgs(parsed({ kind: "restore", ref: "item/settled", changes: [{ key: "cycle", before: "2026-11-a" }] }))).toEqual([
      "set", "item/settled", "--cycle", "2026-11-a",
    ]);
  });

  test("only lifecycle, priority, parent, status and cycle can be restored", () => {
    for (const key of ["title", "description", "kind", "assignee", "blocked_by", "--unset", "", undefined])
      expect(refused({ kind: "restore", ref: "item/waiting", changes: [{ key, before: "x" }] })).toContain(
        "lifecycle, priority, parent, status, cycle"
      );
  });

  test("a value the key cannot hold, a repeat, an extra key or an empty list is refused", () => {
    const one = (change: unknown) => refused({ kind: "restore", ref: "item/waiting", changes: [change] });
    one({ key: "lifecycle", before: "active" });
    one({ key: "lifecycle", before: "--unset" });
    one({ key: "priority", before: "asap" });
    one({ key: "status", before: "published" });
    one({ key: "parent", before: "a-feature" });
    one({ key: "cycle", before: "a b" });
    one({ key: "cycle", before: 3 });
    one({ key: "cycle" });
    one({ key: "cycle", before: null, after: "x" });
    one("cycle");
    refused({ kind: "restore", ref: "item/waiting", changes: [] });
    refused({ kind: "restore", ref: "item/waiting" });
    refused({
      kind: "restore",
      ref: "item/waiting",
      changes: [{ key: "cycle", before: null }, { key: "cycle", before: "x" }],
    });
  });

  test("is built from the before values set returned, changed keys only", () => {
    const changes = [
      { key: "lifecycle", before: "triage", after: "ready", changed: true },
      { key: "priority", before: null, after: "high", changed: true },
      { key: "parent", before: null, after: "feature/a-feature", changed: true },
      { key: "status", before: "stable", after: "stable", changed: false },
    ];
    const restore = buildRestore("item/waiting", changes);
    expect(restore).toEqual({
      kind: "restore",
      ref: "item/waiting",
      changes: [
        { key: "lifecycle", before: "triage" },
        { key: "priority", before: null },
        { key: "parent", before: null },
      ],
    });
    // What it builds is a body the parser takes back unchanged.
    expect(parsed(restore)).toEqual(restore!);
  });

  test("nothing changed, or a change it cannot put back: no restore", () => {
    expect(buildRestore("item/waiting", [{ key: "status", before: "stable", after: "stable", changed: false }])).toBeNull();
    expect(buildRestore("item/waiting", [{ key: "title", before: "A", after: "B", changed: true }])).toBeNull();
    expect(buildRestore("item/waiting", undefined)).toBeNull();
  });
});

describe("an Undo applies only while the item is as its write left it", () => {
  const changes = [
    { key: "lifecycle", before: "triage", after: "ready", changed: true },
    { key: "priority", before: null, after: "high", changed: true },
    { key: "status", before: "stable", after: "stable", changed: false },
    { key: "title", before: "A", after: "B", changed: true },
  ];
  const restore = buildRestore("item/waiting", changes.slice(0, 3)) as RestoreWrite;
  const written = writtenValues(changes);
  const now = (over: object) => entry({ slug: "waiting", lifecycle: "ready", priority: "high", ...over });

  test("what a write left: the changed keys an Undo can restore, with their after values", () => {
    expect(written).toEqual({ lifecycle: "ready", priority: "high" });
    expect(writtenValues([{ key: "cycle", before: "c1", after: null, changed: true }])).toEqual({ cycle: null });
    expect(writtenValues(undefined)).toEqual({});
  });

  test("unchanged since the write: it applies", () => {
    expect(undoStillApplies(now({}), restore, written)).toBe(true);
    // A key the Undo does not touch may have moved.
    expect(undoStillApplies(now({ cycle: "c9", status: "draft" }), restore, written)).toBe(true);
  });

  test("any key it would put back has moved: it does not", () => {
    expect(undoStillApplies(now({ lifecycle: "active" }), restore, written)).toBe(false);
    expect(undoStillApplies(now({ priority: "low" }), restore, written)).toBe(false);
    expect(undoStillApplies(now({ priority: null }), restore, written)).toBe(false);
    expect(undoStillApplies(now({ lifecycle: "active", priority: "low" }), restore, written)).toBe(false);
  });

  test("a key removed by the write must still be absent", () => {
    const out = buildRestore("item/waiting", [{ key: "cycle", before: "c1", after: null, changed: true }]) as RestoreWrite;
    const left = writtenValues([{ key: "cycle", before: "c1", after: null, changed: true }]);
    expect(undoStillApplies(now({ cycle: null }), out, left)).toBe(true);
    expect(undoStillApplies(now({ cycle: "c2" }), out, left)).toBe(false);
  });

  test("a key with no recorded value never applies", () => {
    expect(undoStillApplies(now({}), restore, { lifecycle: "ready" })).toBe(false);
  });
});

describe("everything else is rejected", () => {
  test("an unknown kind or a body that is not an object", () => {
    for (const body of [null, [], "triage", 3, {}, { kind: "archive" }, { kind: "set", ref: "item/waiting" }])
      expect(refused(body)).not.toBe("");
  });

  test("a key the kind does not take", () => {
    expect(refused({ kind: "triage", ref: "item/waiting", lifecycle: "ready", title: "New" })).toContain("`title`");
    expect(refused({ kind: "triage", ref: "item/waiting", lifecycle: "ready", cycle: "c" })).toContain("`cycle`");
    expect(refused({ kind: "membership", ref: "item/settled", cycle: "c", lifecycle: "done" })).toContain("`lifecycle`");
    expect(refused({ kind: "restore", ref: "item/waiting", changes: [{ key: "cycle", before: null }], argv: ["x"] })).toContain(
      "`argv`"
    );
  });

  test("a ref that is not item/<slug>", () => {
    for (const ref of ["item/x;rm -rf /", "feature/a-feature", "cycle/2026-11-a", "waiting", "item/", "item/-x", "--root", "item/a/b", 5, undefined])
      expect(refused({ kind: "membership", ref, cycle: null })).toContain("item/<slug>");
  });

  test("a ref the snapshot does not list, or lists as archived or as a feature", () => {
    for (const ref of ["item/nowhere", "item/gone", "item/a-feature"]) {
      const plan = planWrite(parsed({ kind: "membership", ref, cycle: null }), SNAP);
      expect(plan.ok).toBe(false);
      if (!plan.ok) expect([plan.status, plan.kind]).toEqual([404, "not_found"]);
    }
  });
});
