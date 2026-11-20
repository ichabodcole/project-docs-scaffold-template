// Whether a project's `pdocs` CLI can serve the board, decided from its JSON
// and not from a version number: a feature check needs no constant kept in step
// with a release.

import type { PdocsResult } from "./pdocs.ts";

export type Compat =
  | { ok: true }
  | {
      ok: false;
      /** `no-view`: the CLI has no `view`, or no `--all`. `no-fields`: its entries lack the board's fields. `cli-error`: the read failed for another reason. */
      reason: "no-view" | "no-fields" | "cli-error";
      kind: string;
      exit_code: number;
      message: string;
      hint?: string;
    };

/** The one fix an old CLI has. */
export const FIX = "Run the `update-project-docs` skill, then open the board again.";

/** A key every `pdocs view` entry carries once the CLI has the board's fields. */
const FIELD = "description";
/** The keys a cycle's own entry carries as well. */
const CYCLE_FIELDS = ["description", "appetite", "started"];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** The version in a `pdocs --version --json` result, when there is one. */
export function versionOf(version: PdocsResult | null): string | null {
  if (!version?.ok || !isRecord(version.data)) return null;
  return typeof version.data.version === "string" ? version.data.version : null;
}

/** Every entry in the `data` of `view board`, whatever group it is in. */
function boardEntries(data: unknown): unknown[] {
  if (!isRecord(data) || !isRecord(data.groups)) return [];
  return Object.values(data.groups).flatMap((g) => (Array.isArray(g) ? g : []));
}

/**
 * Judge the result of `view board --features --all --json`, and the cycle
 * entries read beside it.
 *
 * Exit 2 means the CLI does not know `view`, or `--all`. An entry without a
 * `description` key, or a cycle entry without `appetite` or `started`, means
 * the CLI predates the board's fields. A project with no entries and no cycles
 * passes: there is nothing yet for the fields to be missing from, and the
 * server repeats this check on every snapshot.
 */
export function checkCompat(
  board: PdocsResult,
  version: PdocsResult | null = null,
  cycles: readonly unknown[] = []
): Compat {
  const v = versionOf(version);
  const cli = v ? `This project's pdocs CLI (version ${v})` : "This project's pdocs CLI";
  if (!board.ok) {
    if (board.exit_code === 2)
      return {
        ok: false,
        reason: "no-view",
        kind: "conflict",
        exit_code: 6,
        message: `${cli} is too old for the work board: it has no \`view board --features --all\`. ${FIX}`,
        hint: FIX,
      };
    return {
      ok: false,
      reason: "cli-error",
      kind: board.kind,
      exit_code: board.exit_code,
      message: `pdocs could not read this project: ${board.message}`,
    };
  }
  const missing = boardEntries(board.data).some((e) => !isRecord(e) || !(FIELD in e))
    ? FIELD
    : CYCLE_FIELDS.find((f) => cycles.some((c) => !isRecord(c) || !(f in c)));
  if (missing)
    return {
      ok: false,
      reason: "no-fields",
      kind: "conflict",
      exit_code: 6,
      message: `${cli} is too old for the work board: its \`view\` entries have no \`${missing}\` field. ${FIX}`,
      hint: FIX,
    };
  return { ok: true };
}
