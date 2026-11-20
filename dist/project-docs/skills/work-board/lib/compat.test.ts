import { describe, expect, test } from "bun:test";
import { entry } from "../app/test-support.ts";
import { checkCompat, versionOf } from "./compat.ts";
import { failed, ok, OLD_ENTRY } from "./test-support.ts";

const board = (...entries: unknown[]) => ok({ view: "board", groups: { unstarted: entries, started: [] }, advisories: [] });
const version = (v: string) => ok({ name: "pdocs", version: v });

describe("compatibility, from the JSON itself", () => {
  test("entries that carry `description` pass, null or not", () => {
    expect(checkCompat(board(entry({ slug: "a" }), entry({ slug: "b", description: "x" })))).toEqual({ ok: true });
  });

  test("a board with no entries passes", () => {
    expect(checkCompat(board())).toEqual({ ok: true });
  });

  test("exit 2 on the board read: the CLI has no view, and the fix is named once", () => {
    const r = checkCompat(failed(2, "unknown command `view`."), version("8.0.0"));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("no-view");
    expect(r.exit_code).toBe(6);
    expect(r.kind).toBe("conflict");
    expect(r.message).toContain("version 8.0.0");
    expect(r.message.match(/update-project-docs/g)?.length).toBe(1);
  });

  test("an entry without `description`: the CLI predates the fields", () => {
    const r = checkCompat(board(entry({ slug: "a" }), OLD_ENTRY), version("9.4.1"));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("no-fields");
    expect(r.exit_code).toBe(6);
    expect(r.message).toContain("version 9.4.1");
    expect(r.message).toContain("`description`");
    expect(r.message.match(/update-project-docs/g)?.length).toBe(1);
  });

  test("the version is left out when it cannot be read", () => {
    for (const v of [null, failed(2), ok("9.4.1"), ok({ version: 9 })]) {
      const r = checkCompat(failed(2), v);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toStartWith("This project's pdocs CLI is too old");
    }
    expect(versionOf(version("9.5.0"))).toBe("9.5.0");
  });

  test("any other failure is the CLI's own, and does not say to update", () => {
    const r = checkCompat(failed(5, "no docs root", "not_found"), version("9.5.0"));
    expect(r).toEqual({
      ok: false,
      reason: "cli-error",
      kind: "not_found",
      exit_code: 5,
      message: "pdocs could not read this project: no docs root",
    });
  });

  const cycle = (over: object = {}) => ({ ...entry({ slug: "c1", entity: "cycle", lifecycle: "planned" }), ...over });
  const without = (key: string) => {
    const c: Record<string, unknown> = cycle();
    delete c[key];
    return c;
  };

  test("cycle entries that carry description, appetite and started pass", () => {
    expect(checkCompat(board(), null, [cycle(), cycle({ appetite: "two weeks" })])).toEqual({ ok: true });
  });

  test("a cycle entry without one of them is refused, even on a board with no entries", () => {
    for (const key of ["description", "appetite", "started"]) {
      const r = checkCompat(board(), version("9.4.1"), [cycle(), without(key)]);
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect([r.reason, r.exit_code]).toEqual(["no-fields", 6]);
      expect(r.message).toContain(`\`${key}\``);
      expect(r.message).toContain("version 9.4.1");
      expect(r.message.match(/update-project-docs/g)?.length).toBe(1);
    }
    expect(checkCompat(board(), null, [OLD_ENTRY]).ok).toBe(false);
  });
});
