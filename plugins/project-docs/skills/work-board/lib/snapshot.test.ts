import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Snapshot } from "../app/model.ts";
import { entry, portfolioEntry } from "../app/test-support.ts";
import type { PdocsResult } from "./pdocs.ts";
import { composeSnapshot, hashSnapshot, portfolioCycleSlugs, readSnapshot } from "./snapshot.ts";
import { failed, ok, OLD_ENTRY } from "./test-support.ts";

/** A snapshot recorded from this repository's own tree. */
const RECORDED = JSON.parse(
  readFileSync(join(import.meta.dir, "../app/__fixtures__/repo-snapshot.json"), "utf8")
) as Snapshot;

const boardData = { view: "board", groups: { unstarted: [entry({ slug: "a", lifecycle: "triage" })] }, advisories: [] };
const portfolioData = {
  view: "portfolio",
  cycles: [portfolioEntry("cycle", "c1", "active"), portfolioEntry("cycle", "c2", "planned")],
  features: [],
  advisories: [],
};
const unreviewedData = { view: "unreviewed", items: [], advisories: [] };
const cycleRead = (slug: string) =>
  ok({ view: "cycle", cycle: entry({ slug, entity: "cycle", lifecycle: "planned", appetite: "two weeks" }), items: [] });

describe("composing the poll's reads", () => {
  test("four parts: the data of each read, and the cycle entry of each cycle read", () => {
    const r = composeSnapshot({
      board: ok(boardData),
      portfolio: ok(portfolioData),
      unreviewed: ok(unreviewedData),
      cycles: [cycleRead("c1"), cycleRead("c2")],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.snapshot)).toEqual(["board", "portfolio", "unreviewed", "cycles"]);
    expect(r.snapshot.board).toEqual(boardData as unknown as Snapshot["board"]);
    expect(r.snapshot.portfolio).toEqual(portfolioData as unknown as Snapshot["portfolio"]);
    expect(r.snapshot.unreviewed).toEqual(unreviewedData);
    expect(r.snapshot.cycles.map((c) => [c.slug, c.appetite])).toEqual([
      ["c1", "two weeks"],
      ["c2", "two weeks"],
    ]);
    expect(r.hash).toBe(hashSnapshot(r.snapshot));
  });

  test("a failed cycle read leaves that cycle out and nothing else", () => {
    const r = composeSnapshot({
      board: ok(boardData),
      portfolio: ok(portfolioData),
      unreviewed: ok(unreviewedData),
      cycles: [failed(2, "no cycle file"), cycleRead("c2")],
    });
    expect(r.ok && r.snapshot.cycles.map((c) => c.slug)).toEqual(["c2"]);
  });

  test("a failed portfolio or unreviewed read fails the snapshot in the CLI's words", () => {
    for (const part of ["portfolio", "unreviewed"] as const) {
      const reads = { board: ok(boardData), portfolio: ok(portfolioData), unreviewed: ok(unreviewedData), cycles: [] };
      reads[part] = failed(5, "no docs root", "not_found");
      const r = composeSnapshot(reads);
      expect(r.ok).toBe(false);
      if (!r.ok) expect([r.error.reason, r.error.exit_code, r.error.message]).toEqual(["cli-error", 5, "no docs root"]);
    }
  });

  test("an old CLI's board is refused on every snapshot, not only at open", () => {
    const r = composeSnapshot({
      board: ok({ view: "board", groups: { unstarted: [OLD_ENTRY] }, advisories: [] }),
      portfolio: ok(portfolioData),
      unreviewed: ok(unreviewedData),
      cycles: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toBe("no-fields");
  });

  test("an old CLI with cycles and no items is refused by its cycle entry, naming its version", () => {
    const r = composeSnapshot(
      {
        board: ok({ view: "board", groups: { unstarted: [] }, advisories: [] }),
        portfolio: ok(portfolioData),
        unreviewed: ok(unreviewedData),
        cycles: [ok({ view: "cycle", cycle: { ...OLD_ENTRY, entity: "cycle", slug: "c1" }, items: [] })],
      },
      ok({ name: "pdocs", version: "9.4.1" })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.reason).toBe("no-fields");
      expect(r.error.message).toContain("version 9.4.1");
    }
  });

  test("the hash follows the content", () => {
    const again = JSON.parse(JSON.stringify(RECORDED)) as Snapshot;
    expect(hashSnapshot(again)).toBe(hashSnapshot(RECORDED));
    again.portfolio.cycles[0]!.lifecycle = "closed";
    expect(hashSnapshot(again)).not.toBe(hashSnapshot(RECORDED));
  });
});

describe("one poll", () => {
  const runner = (over: Record<string, PdocsResult> = {}) => {
    const calls: string[] = [];
    const run = async (args: string[]): Promise<PdocsResult> => {
      const key = args.join(" ");
      calls.push(key);
      if (over[key]) return over[key];
      if (key === "view board --features --all") return ok(RECORDED.board);
      if (key === "view portfolio") return ok(RECORDED.portfolio);
      if (key === "view unreviewed") return ok(RECORDED.unreviewed);
      const slug = args[2];
      return ok({ view: "cycle", cycle: RECORDED.cycles.find((c) => c.slug === slug), items: [] });
    };
    return { run, calls };
  };

  test("three reads, then one per cycle the portfolio lists, reproduce the recorded snapshot", async () => {
    const { run, calls } = runner();
    const r = await readSnapshot(run);
    const slugs = RECORDED.portfolio.cycles.map((c) => c.slug);
    expect(calls.sort()).toEqual(
      ["view board --features --all", "view portfolio", "view unreviewed", ...slugs.map((s) => `view cycle ${s}`)].sort()
    );
    expect(r.ok && r.snapshot).toEqual(RECORDED);
    expect(r.ok && r.hash).toBe(hashSnapshot(RECORDED));
  });

  test("a cycle whose read fails is left out", async () => {
    const first = RECORDED.portfolio.cycles[0]!.slug;
    const { run } = runner({ [`view cycle ${first}`]: failed(2) });
    const r = await readSnapshot(run);
    expect(r.ok && r.snapshot.cycles.map((c) => c.slug)).toEqual(
      RECORDED.cycles.map((c) => c.slug).filter((s) => s !== first)
    );
  });

  test("a cycle slug that could be read as a flag is never passed to the CLI", () => {
    expect(portfolioCycleSlugs(ok({ cycles: [{ slug: "--root" }, { slug: "fine" }, { slug: 3 }, null] }))).toEqual([
      "fine",
    ]);
  });
});
