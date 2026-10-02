// Advisories: conditions a view REPORTS and the calling workflow acts on with
// the user. An advisory never changes what a view lists, never writes, and
// never fails the command — the view exits 0 with it attached.
//
// Every advisory has the same outer shape, so a caller handles them in one
// place: a stable `id` to branch on, a `message` that says what is the case,
// and an `action` that says what to do next. Each kind adds its own fields
// beside those. Settings live under `checks` in `.project-docs.json`.
//
// The archive advisory is the first. One threshold (`checks.archive.threshold`,
// default 25) is held against each type a view lists, counted on its own:
// unarchived `done`/`dropped` items, unarchived `done`/`dropped` features, and
// unarchived `closed`/`abandoned` cycles. A type over the threshold — strictly
// greater — is named; a view gets ONE advisory naming every such type, never a
// warning per entity.
//
// A setting a view reads that is INVALID never takes the view down: the view
// lists as usual and carries a `bad-config` advisory, naming the key, the value
// and what was expected, in place of the advice it could not compute.

import { CONFIG_FILENAME, type ConfigIssue, issueValue } from "./docs-lint/config.ts";
import { CYCLE_ENDS } from "./lint/registry.ts";
import type { Ctx } from "./lint/rules.ts";
import type { WorkEntity, WorkModel } from "./work.ts";

/** What every advisory carries. */
export interface Advisory {
  /** Stable and machine-readable: branch on this, never on `message`. */
  id: string;
  /** What is the case, in one or two sentences. */
  message: string;
  /** What to do about it. */
  action: string;
  /**
   * The references a caller can act on — `item/<slug>`, `feature/<slug>`,
   * `cycle/<slug>` — when the advisory is about particular entities. The one
   * field a caller reads to know WHICH, whatever the advisory's kind.
   */
  refs?: string[];
}

/** The `bad-config` advisory's `id`. */
export const BAD_CONFIG_ADVISORY = "bad-config";

/** An invalid setting a view needed, reported instead of the advice it feeds. */
export interface BadConfigAdvisory extends Advisory {
  id: typeof BAD_CONFIG_ADVISORY;
  /** Each invalid setting: its dotted `key`, the `value` written, and what is `expected`. */
  issues: ConfigIssue[];
}

/** The archive advisory's `id`. */
export const ARCHIVE_ADVISORY = "archive-threshold";

/** The setting the archive advisory reads. */
export const ARCHIVE_SETTING = "checks.archive.threshold";

type Entity = WorkEntity["entity"];

/** The lifecycles that count as finished, per type: what `_archive/` may hold. */
export const FINISHED: Readonly<Record<Entity, readonly string[]>> = {
  item: ["done", "dropped"],
  feature: ["done", "dropped"],
  cycle: CYCLE_ENDS,
};

/** One type over the threshold. */
export interface ArchiveTypeCount {
  type: Entity;
  /** Unarchived entities of this type in a finished lifecycle. */
  count: number;
  threshold: number;
  /** The lifecycles counted. */
  lifecycles: string[];
  /** The next action for this type, as prose. */
  remediation: string;
  /**
   * The references `pdocs archive` takes, oldest first: what a selection is
   * chosen from. Data for the caller; the text rendering never lists them.
   */
  candidates: string[];
}

export interface ArchiveAdvisory extends Advisory {
  id: typeof ARCHIVE_ADVISORY;
  /** Every type's `candidates`, in type order. */
  refs: string[];
  setting: typeof ARCHIVE_SETTING;
  threshold: number;
  /** Every type over the threshold, in the order the view asked for them. */
  types: ArchiveTypeCount[];
}

const list: Record<Entity, (m: WorkModel) => WorkEntity[]> = {
  item: (m) => m.items,
  feature: (m) => m.features,
  cycle: (m) => m.cycles,
};

const plural = (type: Entity, n: number) => `${n} finished ${type}${n === 1 ? "" : "s"}`;

/** `a`, `a and b`, `a, b and c`. */
const joined = (parts: string[]): string =>
  parts.length < 2 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;

/** Oldest first by `generated.at`, then path — the order a selection reads in. */
const oldestFirst = (a: WorkEntity, b: WorkEntity): number => {
  const cmp = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
  return cmp(a.date ?? "9999-99-99", b.date ?? "9999-99-99") || cmp(a.path, b.path);
};

/** Unarchived entities of `type` in a finished lifecycle. */
export function unarchivedFinished(model: WorkModel, type: Entity): WorkEntity[] {
  const finished = FINISHED[type];
  return list[type](model).filter(
    (e) => !e.archived && e.lifecycle !== null && finished.includes(e.lifecycle)
  );
}

/**
 * The archive advisory for the types a view lists, or `null` when none is over
 * `threshold`. Pure: a function of the model, so a UI gets exactly what the
 * CLI prints.
 */
export function archiveAdvisory(
  model: WorkModel,
  types: readonly Entity[],
  threshold: number
): ArchiveAdvisory | null {
  const over: ArchiveTypeCount[] = [];
  for (const type of types) {
    const finished = unarchivedFinished(model, type).sort(oldestFirst);
    if (finished.length <= threshold) continue;
    over.push({
      type,
      count: finished.length,
      threshold,
      lifecycles: [...FINISHED[type]],
      remediation:
        `Choose which of the ${plural(type, finished.length)} to archive, confirm that selection ` +
        `with the user, then run \`pdocs archive ${type}/<slug>\` for each.`,
      candidates: finished.map((e) => `${type}/${e.slug}`),
    });
  }
  if (over.length === 0) return null;
  const counts = joined(over.map((t) => plural(t.type, t.count)));
  return {
    id: ARCHIVE_ADVISORY,
    setting: ARCHIVE_SETTING,
    threshold,
    message:
      `${counts} ${over.length === 1 && over[0]!.count === 1 ? "is" : "are"} not archived, ` +
      `over the threshold of ${threshold} (${ARCHIVE_SETTING}). ` +
      `Consider archiving them to shorten this view. Archiving preserves their records and updates links.`,
    action:
      "Offer the user a concrete selection, then run `pdocs archive <ref>` for each one they agree to; " +
      "`--format json` lists the candidates. Nothing is archived automatically.",
    refs: over.flatMap((t) => t.candidates),
    types: over,
  };
}

/** The issues that make `checks.archive` unreadable. */
const archiveIssues = (issues: readonly ConfigIssue[]) =>
  issues.filter((i) => i.key === "checks" || i.key.startsWith("checks.archive"));

/**
 * The `bad-config` advisory for `issues`, or `null` when there are none.
 * Not a refusal: a read-only view stays usable whatever the file says, and
 * `pdocs check` reports the same issues as `BAD CONFIG`.
 */
export function badConfigAdvisory(issues: readonly ConfigIssue[]): BadConfigAdvisory | null {
  if (issues.length === 0) return null;
  return {
    id: BAD_CONFIG_ADVISORY,
    message: issues
      .map((i) => `${CONFIG_FILENAME}: \`${i.key}\` is ${issueValue(i)}, expected ${i.expected}.`)
      .join(" "),
    action:
      `Fix or remove ${issues.length === 1 ? "that setting" : "those settings"} in ${CONFIG_FILENAME}; ` +
      "until then the advice it governs is not computed. `pdocs check` reports it as BAD CONFIG.",
    issues: issues.map((i) => ({ ...i })),
  };
}

/**
 * What a view attaches as `advisories` for archiving the `types` it lists:
 * the archive advisory, or nothing, or — when `checks.archive` is invalid —
 * the `bad-config` advisory in its place. The one call a view makes.
 */
export function adviseArchive(ctx: Ctx, model: WorkModel, types: readonly Entity[]): Advisory[] {
  const bad = badConfigAdvisory(archiveIssues(ctx.config.issues));
  if (bad) return [bad];
  const advisory = archiveAdvisory(model, types, ctx.config.checks.archive.threshold);
  return advisory ? [advisory] : [];
}

/** The text rendering: two lines per advisory, never one per entity. */
export function advisoryLines(advisories: readonly Advisory[]): string[] {
  return advisories.flatMap((a) => [`advisory (${a.id}): ${a.message}`, `  next: ${a.action}`]);
}
