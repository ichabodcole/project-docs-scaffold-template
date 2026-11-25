// The board's writes. There are exactly two, and the Undo of each:
//
//   triage      a triage decision on an item waiting in `triage`
//   membership  bring an item into a cycle, or take it out
//   restore     put back the values a write changed (Undo)
//
// Each becomes ONE `pdocs set` call. Everything here is pure: a request body
// goes in, an argv (an array, never a shell string) or a refusal comes out.
// Every value that reaches the argv is matched against a closed set or the
// slug pattern first, so no value can be read as a flag.

import { allItems, type Snapshot, type ViewEntry } from "../app/model.ts";
import { SLUG } from "./pdocs.ts";

export const TRIAGE_LIFECYCLES = ["backlog", "ready", "dropped"] as const;
export const PRIORITIES = ["urgent", "high", "medium", "low"] as const;
/** The keys an Undo may put back, and nothing else. */
export const RESTORE_KEYS = ["lifecycle", "priority", "parent", "status", "cycle"] as const;
const RESTORE_LIFECYCLES = ["triage", ...TRIAGE_LIFECYCLES];
const STATUSES = ["draft", "stable", "deprecated"];

export type RestoreKey = (typeof RESTORE_KEYS)[number];

export interface TriageWrite {
  kind: "triage";
  ref: string;
  lifecycle: (typeof TRIAGE_LIFECYCLES)[number];
  priority?: (typeof PRIORITIES)[number];
  /** A feature ref, `feature/<slug>`. */
  parent?: string;
  /** The item's content was reviewed: adds `--status stable`. */
  reviewed?: boolean;
}

export interface MembershipWrite {
  kind: "membership";
  ref: string;
  /** A cycle's slug to bring the item in, `null` to take it out. */
  cycle: string | null;
}

export interface RestoreWrite {
  kind: "restore";
  ref: string;
  /** The value each key had before; `null` means the key was absent. */
  changes: Array<{ key: RestoreKey; before: string | null }>;
}

export type Write = TriageWrite | MembershipWrite | RestoreWrite;

export type Parsed = { ok: true; write: Write } | { ok: false; message: string };

export type Planned =
  | { ok: true; argv: string[]; command: string; item: ViewEntry }
  | { ok: false; status: 404 | 409; kind: "not_found" | "conflict"; message: string };

/** One change as `pdocs set --json` reports it. */
export interface SetChange {
  key: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const includes = <T extends string>(set: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (set as readonly string[]).includes(v);

const fail = (message: string): Parsed => ({ ok: false, message });

function extraKey(body: Record<string, unknown>, allowed: string[]): string | null {
  return Object.keys(body).find((k) => !allowed.includes(k)) ?? null;
}

/** `item/<slug>`, and nothing else: the board writes items only. */
function isItemRef(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("item/") && SLUG.test(v.slice("item/".length));
}

/** `feature/<slug>` from either that or a bare slug; `null` when it is neither. */
function featureRef(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const slug = v.startsWith("feature/") ? v.slice("feature/".length) : v;
  return SLUG.test(slug) ? `feature/${slug}` : null;
}

const REF_HINT = "`ref` must be `item/<slug>`.";

/**
 * Read a request body as one of the three writes, or refuse it. A key the kind
 * does not take is a refusal, not something to ignore: a body that says more
 * than the board can do was not written by the board.
 */
export function parseWrite(body: unknown): Parsed {
  if (!isRecord(body)) return fail("the body must be a JSON object.");
  switch (body.kind) {
    case "triage": {
      const extra = extraKey(body, ["kind", "ref", "lifecycle", "priority", "parent", "reviewed"]);
      if (extra) return fail(`a triage decision takes no \`${extra}\`.`);
      if (!isItemRef(body.ref)) return fail(REF_HINT);
      if (!includes(TRIAGE_LIFECYCLES, body.lifecycle))
        return fail(`a triage decision's \`lifecycle\` is one of ${TRIAGE_LIFECYCLES.join(", ")}.`);
      const write: TriageWrite = { kind: "triage", ref: body.ref, lifecycle: body.lifecycle };
      if (body.priority !== undefined && body.priority !== null) {
        if (!includes(PRIORITIES, body.priority))
          return fail(`\`priority\` is one of ${PRIORITIES.join(", ")}.`);
        write.priority = body.priority;
      }
      if (body.parent !== undefined && body.parent !== null) {
        const parent = featureRef(body.parent);
        if (!parent) return fail("`parent` must be `feature/<slug>`.");
        write.parent = parent;
      }
      if (body.reviewed !== undefined) {
        if (typeof body.reviewed !== "boolean") return fail("`reviewed` is true or false.");
        if (body.reviewed) write.reviewed = true;
      }
      return { ok: true, write };
    }
    case "membership": {
      const extra = extraKey(body, ["kind", "ref", "cycle"]);
      if (extra) return fail(`cycle membership takes no \`${extra}\`.`);
      if (!isItemRef(body.ref)) return fail(REF_HINT);
      if (body.cycle !== null && !(typeof body.cycle === "string" && SLUG.test(body.cycle)))
        return fail("`cycle` is a cycle's slug, or null to take the item out.");
      return { ok: true, write: { kind: "membership", ref: body.ref, cycle: body.cycle } };
    }
    case "restore": {
      const extra = extraKey(body, ["kind", "ref", "changes"]);
      if (extra) return fail(`a restore takes no \`${extra}\`.`);
      if (!isItemRef(body.ref)) return fail(REF_HINT);
      if (!Array.isArray(body.changes) || body.changes.length === 0)
        return fail("`changes` is a list of { key, before } with at least one entry.");
      const changes: RestoreWrite["changes"] = [];
      for (const c of body.changes) {
        if (!isRecord(c) || extraKey(c, ["key", "before"]) || !("before" in c))
          return fail("each change is { key, before } and nothing else.");
        if (!includes(RESTORE_KEYS, c.key))
          return fail(`a restore's \`key\` is one of ${RESTORE_KEYS.join(", ")}.`);
        if (changes.some((x) => x.key === c.key)) return fail(`\`${c.key}\` is listed twice.`);
        const before = restoreValue(c.key, c.before);
        if (before === undefined) return fail(`\`before\` is not a value \`${c.key}\` can hold.`);
        changes.push({ key: c.key, before });
      }
      return { ok: true, write: { kind: "restore", ref: body.ref, changes } };
    }
    default:
      return fail("`kind` is one of triage, membership, restore.");
  }
}

/** The value a restore may write for a key; `null` unsets it; `undefined` refuses. */
function restoreValue(key: RestoreKey, before: unknown): string | null | undefined {
  if (before === null) return null;
  if (typeof before !== "string") return undefined;
  switch (key) {
    case "lifecycle":
      return RESTORE_LIFECYCLES.includes(before) ? before : undefined;
    case "priority":
      return includes(PRIORITIES, before) ? before : undefined;
    case "status":
      return STATUSES.includes(before) ? before : undefined;
    case "parent":
      return before.startsWith("feature/") ? (featureRef(before) ?? undefined) : undefined;
    case "cycle":
      return SLUG.test(before) ? before : undefined;
  }
}

/** The `pdocs set` arguments of a write (without `--json`, which the runner adds). */
export function setArgs(write: Write): string[] {
  const args = ["set", write.ref];
  switch (write.kind) {
    case "triage":
      args.push("--lifecycle", write.lifecycle);
      if (write.priority) args.push("--priority", write.priority);
      if (write.parent) args.push("--parent", write.parent);
      if (write.reviewed) args.push("--status", "stable");
      break;
    case "membership":
      if (write.cycle === null) args.push("--unset", "cycle");
      else args.push("--cycle", write.cycle);
      break;
    case "restore": {
      const unset: string[] = [];
      for (const { key, before } of write.changes) {
        if (before === null) unset.push(key);
        else args.push(`--${key}`, before);
      }
      if (unset.length > 0) args.push("--unset", unset.join(","));
      break;
    }
  }
  return args;
}

/** The lifecycles an item can be brought into a cycle from, and the cycles it can join. */
const BRINGABLE = ["backlog", "ready"] as const;
const CURRENT_CYCLES = ["planned", "active"] as const;

/**
 * Check a parsed write against the current snapshot and build its one call.
 * The `ref` must name a live item the snapshot lists. A triage decision is
 * taken only on an item that is waiting in `triage`. An item is brought in
 * only from `backlog` or `ready`, with no cycle, into a planned or active
 * cycle; and taken out only of a cycle it is in. The page may be a poll
 * behind, so what it offered is checked again here. A restore is not: it puts
 * back what its own write changed, and `undoStillApplies` guards it.
 */
export function planWrite(write: Write, snapshot: Snapshot): Planned {
  const slug = write.ref.slice("item/".length);
  const item = allItems(snapshot).find((i) => i.slug === slug && !i.archived);
  if (!item)
    return {
      ok: false,
      status: 404,
      kind: "not_found",
      message: `\`${write.ref}\` is not an item on the board.`,
    };
  const conflict = (message: string): Planned => ({ ok: false, status: 409, kind: "conflict", message });
  if (write.kind === "triage" && item.lifecycle !== "triage")
    return conflict(`\`${write.ref}\` is \`${item.lifecycle}\`, not waiting in triage.`);
  if (write.kind === "membership") {
    if (write.cycle === null) {
      if (!item.cycle) return conflict(`\`${write.ref}\` is in no cycle.`);
    } else {
      const cycle = write.cycle;
      if (!includes(BRINGABLE, item.lifecycle))
        return conflict(`\`${write.ref}\` is \`${item.lifecycle}\`, not \`backlog\` or \`ready\`.`);
      if (item.cycle) return conflict(`\`${write.ref}\` is already in cycle \`${item.cycle}\`.`);
      const current = snapshot.portfolio.cycles.some(
        (c) => c.slug === cycle && !c.archived && includes(CURRENT_CYCLES, c.lifecycle)
      );
      if (!current) return conflict(`\`${cycle}\` is not a planned or active cycle.`);
    }
  }
  const argv = setArgs(write);
  return { ok: true, argv, command: `pdocs ${argv.join(" ")}`, item };
}

/**
 * The Undo of a write, built from what its own `set` reported: each key that
 * changed, with the value it had before. A key that was absent before comes
 * back as `null`, which the restore unsets. `null` when nothing changed, or
 * when a change is one a restore cannot put back.
 */
export function buildRestore(ref: string, changes: unknown): RestoreWrite | null {
  if (!Array.isArray(changes)) return null;
  const out: RestoreWrite["changes"] = [];
  for (const c of changes as SetChange[]) {
    if (!isRecord(c) || c.changed !== true) continue;
    if (!includes(RESTORE_KEYS, c.key)) return null;
    const before = restoreValue(c.key, c.before ?? null);
    if (before === undefined) return null;
    out.push({ key: c.key, before });
  }
  return out.length > 0 ? { kind: "restore", ref, changes: out } : null;
}

/**
 * What a write left in each key it changed, as its own `set` reported: the
 * values an Undo expects to find still there.
 */
export function writtenValues(changes: unknown): Partial<Record<RestoreKey, string | null>> {
  const out: Partial<Record<RestoreKey, string | null>> = {};
  if (!Array.isArray(changes)) return out;
  for (const c of changes as SetChange[]) {
    if (!isRecord(c) || c.changed !== true || !includes(RESTORE_KEYS, c.key)) continue;
    out[c.key] = typeof c.after === "string" ? c.after : null;
  }
  return out;
}

/**
 * Whether an Undo can still be applied: every key it would put back holds, in
 * the current snapshot, exactly what its write left there. If anything else
 * changed one of them since, restoring the old value would discard that change.
 */
export function undoStillApplies(
  item: ViewEntry,
  restore: RestoreWrite,
  written: Partial<Record<RestoreKey, string | null>>
): boolean {
  return restore.changes.every(({ key }) => key in written && (item[key] ?? null) === written[key]);
}
