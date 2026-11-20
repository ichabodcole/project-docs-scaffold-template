// One snapshot of a project for the board: the poll's reads, side by side.
// Composing is separate from spawning, so tests feed `composeSnapshot` recorded
// JSON and `readSnapshot` a runner of their own.

import { createHash } from "node:crypto";
import type { Snapshot, ViewEntry } from "../app/model.ts";
import { checkCompat, type Compat } from "./compat.ts";
import { SLUG, type PdocsFailure, type PdocsResult, type PdocsRunner } from "./pdocs.ts";

export const BOARD_ARGS = ["view", "board", "--features", "--all"];
export const PORTFOLIO_ARGS = ["view", "portfolio"];
export const UNREVIEWED_ARGS = ["view", "unreviewed"];
export const cycleArgs = (slug: string): string[] => ["view", "cycle", slug];
export const featureArgs = (slug: string): string[] => ["view", "feature", slug];

export interface SnapshotReads {
  board: PdocsResult;
  portfolio: PdocsResult;
  unreviewed: PdocsResult;
  /** One `view cycle <slug>` result per cycle in the portfolio, in any order. */
  cycles: PdocsResult[];
}

export type SnapshotResult =
  | { ok: true; snapshot: Snapshot; hash: string }
  | { ok: false; error: Exclude<Compat, { ok: true }> | (PdocsFailure & { reason: "cli-error" }) };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** The cycle slugs a `view portfolio` result lists. */
export function portfolioCycleSlugs(portfolio: PdocsResult): string[] {
  if (!portfolio.ok || !isRecord(portfolio.data) || !Array.isArray(portfolio.data.cycles)) return [];
  return portfolio.data.cycles.flatMap((c) => (isRecord(c) && typeof c.slug === "string" && SLUG.test(c.slug) ? [c.slug] : []));
}

/** A stable short hash of a snapshot, so an unchanged one is not re-rendered. */
export function hashSnapshot(snapshot: Snapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16);
}

/**
 * Put the reads together. The board read and the cycle entries decide
 * compatibility; a failed portfolio or unreviewed read fails the snapshot; a
 * failed cycle read only leaves that cycle out, and the model then counts it
 * as not reviewed. `version` only names the CLI in a refusal.
 */
export function composeSnapshot(reads: SnapshotReads, version: PdocsResult | null = null): SnapshotResult {
  const cycles: ViewEntry[] = [];
  for (const read of reads.cycles)
    if (read.ok && isRecord(read.data) && isRecord(read.data.cycle))
      cycles.push(read.data.cycle as unknown as ViewEntry);

  const compat = checkCompat(reads.board, version, cycles);
  if (!compat.ok) return { ok: false, error: compat };
  for (const read of [reads.portfolio, reads.unreviewed])
    if (!read.ok) return { ok: false, error: { ...read, reason: "cli-error" } };
  if (!reads.board.ok || !reads.portfolio.ok || !reads.unreviewed.ok) throw new Error("unreachable");

  const snapshot: Snapshot = {
    board: reads.board.data as Snapshot["board"],
    portfolio: reads.portfolio.data as Snapshot["portfolio"],
    unreviewed: reads.unreviewed.data as Snapshot["unreviewed"],
    cycles,
  };
  return { ok: true, snapshot, hash: hashSnapshot(snapshot) };
}

/** One poll: three reads at once, then one more per cycle the portfolio lists. */
export async function readSnapshot(run: PdocsRunner, version: PdocsResult | null = null): Promise<SnapshotResult> {
  const [board, portfolio, unreviewed] = await Promise.all([
    run(BOARD_ARGS),
    run(PORTFOLIO_ARGS),
    run(UNREVIEWED_ARGS),
  ]);
  const cycles = await Promise.all(portfolioCycleSlugs(portfolio).map((slug) => run(cycleArgs(slug))));
  return composeSnapshot({ board, portfolio, unreviewed, cycles }, version);
}
