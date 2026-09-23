// UUIDv7 — the id `pdocs new item` writes (plan Task 2.1).

import { describe, expect, test } from "bun:test";
import { UUID_RE, isUuid, uuidv7 } from "./uuid.ts";

const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuidv7", () => {
  test("fixed inputs give a known string", () => {
    const bytes = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(uuidv7(0x017f22e279b0, bytes)).toBe("017f22e2-79b0-7001-8203-040506070809");
  });

  test("the version and variant bits are forced whatever the random bytes are", () => {
    const ones = new Uint8Array(10).fill(0xff);
    expect(uuidv7(0x017f22e279b0, ones)).toBe("017f22e2-79b0-7fff-bfff-ffffffffffff");
    expect(uuidv7(0, new Uint8Array(10))).toMatch(V7);
  });

  test("every output is a lowercase v7", () => {
    for (let i = 0; i < 200; i++) expect(uuidv7()).toMatch(V7);
  });

  test("two calls in increasing milliseconds sort in time order", () => {
    const a = uuidv7(1_700_000_000_000);
    const b = uuidv7(1_700_000_000_001);
    const c = uuidv7(1_800_000_000_000);
    expect([c, b, a].sort()).toEqual([a, b, c]);
  });

  test("ids made in a tight loop strictly increase, within a millisecond too (review 9)", () => {
    const ids = Array.from({ length: 2000 }, () => uuidv7());
    for (let i = 1; i < ids.length; i++)
      expect({ i, ordered: (ids[i - 1] as string) < (ids[i] as string) }).toEqual({ i, ordered: true });
    for (const id of ids) expect(id).toMatch(V7);
  });

  test("two ids for one pinned millisecond increase, and a clock step back does not reorder", () => {
    const a = uuidv7(1_900_000_000_000);
    const b = uuidv7(1_900_000_000_000);
    const c = uuidv7(1_899_999_999_000);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  test("a timestamp outside 48 bits is refused rather than wrapped", () => {
    expect(() => uuidv7(-1)).toThrow();
    expect(() => uuidv7(2 ** 48)).toThrow();
  });
});

describe("isUuid", () => {
  test("accepts v4 and v7", () => {
    expect(isUuid("9b2f6c1e-3d4a-4b5c-8d6e-7f8091a2b3c4")).toBe(true);
    expect(isUuid("017f22e2-79b0-7001-8203-040506070809")).toBe(true);
  });

  test("rejects uppercase letters and missing hyphens", () => {
    expect(isUuid("017F22E2-79B0-7001-8203-040506070809")).toBe(false);
    expect(isUuid("017f22e279b070018203040506070809")).toBe(false);
    expect(isUuid("1234")).toBe(false);
    expect(isUuid("")).toBe(false);
  });

  test("UUID_RE is the lint's pattern", async () => {
    const { UUID_RE: lintRe } = await import("./lint/rules.ts");
    expect(lintRe).toBe(UUID_RE);
  });
});
