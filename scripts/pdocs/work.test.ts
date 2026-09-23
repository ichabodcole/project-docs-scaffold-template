// The work model and `resolveRef` (plan Task 2.2): features, items and cycles
// read once, and every reference form D6 accepts resolved one way.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { UsageError } from "./envelope.ts";
import { type Ctx, context } from "./lint/rules.ts";
import { collectWork, resolveRef } from "./work.ts";

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): Ctx {
  const root = mkdtempSync(join(tmpdir(), "pdocs-model-"));
  roots.push(root);
  writeFileSync(
    join(root, ".project-docs.json"),
    JSON.stringify({
      docsRoot: "docs",
      version: "1.0.0",
      lint: { workbench: ["features", "items", "cycles"], skip: [], scopes: ["lint"] },
    })
  );
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return context(root);
}

const GENERATED = "{ by: test, at: 2026-09-22 }";
const A = "0190f4b2-7c3a-7d4e-8f00-00000000000a";
const B = "0190f4b2-7c3a-7d4e-8f00-00000000000b";
const C = "0190f4b3-0000-7d4e-8f00-00000000000c";
const D = "0190f4b3-1111-7d4e-8f00-00000000000d";

const doc = (fields: Record<string, string>) =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n# X\n`;

const item = (id: string, extra: Record<string, string> = {}) =>
  doc({
    type: "item",
    title: "An item",
    description: "Something to do.",
    status: "draft",
    lifecycle: "backlog",
    id,
    kind: "task",
    generated: GENERATED,
    ...extra,
  });

const feature = (extra: Record<string, string> = {}) =>
  doc({
    type: "feature",
    title: "A feature",
    description: "Something to build.",
    status: "draft",
    lifecycle: "active",
    generated: GENERATED,
    ...extra,
  });

const cycle = doc({
  type: "cycle",
  title: "A cycle",
  description: "A stretch of work.",
  status: "draft",
  lifecycle: "active",
  generated: GENERATED,
});

function tree(): Ctx {
  return fixture({
    "docs/features/auth/feature.md": feature({ scope: "lint" }),
    "docs/features/_archive/old/feature.md": feature({ lifecycle: "done" }),
    "docs/items/fix-hook.md": item(A, {
      kind: "bug",
      parent: "feature/auth",
      cycle: "2026-09-x",
      priority: "high",
      blocked_by: `[${B}]`,
    }),
    "docs/items/big/item.md": item(B, { lifecycle: "ready" }),
    "docs/items/_archive/gone.md": item(C, { lifecycle: "done" }),
    "docs/items/_archive/gone-folder/item.md": item(D, { lifecycle: "dropped" }),
    "docs/cycles/2026-09-x.md": cycle,
  });
}

describe("collectWork", () => {
  test("returns features, items and cycles with their fields parsed", () => {
    const work = collectWork(tree());
    // Sorted by path: `_archive/` sorts before any slug.
    expect(work.features.map((f) => f.slug)).toEqual(["old", "auth"]);
    expect(work.items.map((i) => i.slug).sort()).toEqual(
      ["big", "fix-hook", "gone", "gone-folder"].sort()
    );
    expect(work.cycles.map((c) => c.slug)).toEqual(["2026-09-x"]);

    const fix = work.items.find((i) => i.slug === "fix-hook")!;
    expect(fix).toMatchObject({
      entity: "item",
      path: "docs/items/fix-hook.md",
      id: A,
      kind: "bug",
      lifecycle: "backlog",
      parent: "feature/auth",
      cycle: "2026-09-x",
      priority: "high",
      blockedBy: [B],
      archived: false,
      folder: null,
      date: "2026-09-22",
    });
    const big = work.items.find((i) => i.slug === "big")!;
    expect(big.folder).toBe("items/big");
    expect(work.items.find((i) => i.slug === "gone")!.archived).toBe(true);
    expect(work.features.find((f) => f.slug === "old")!.folder).toBe(
      "features/_archive/old"
    );
    expect(work.features.find((f) => f.slug === "auth")!.scope).toBe("lint");
  });
});

describe("resolveRef", () => {
  const work = collectWork(tree());
  const path = (ref: string) => resolveRef(work, ref).path;

  test("a full UUID", () => {
    expect(path(A)).toBe("docs/items/fix-hook.md");
  });

  test("a full UUID in capitals still names the item", () => {
    expect(path(A.toUpperCase())).toBe("docs/items/fix-hook.md");
  });

  test("a unique prefix of 8 or more characters", () => {
    expect(path("0190f4b3-0")).toBe("docs/items/_archive/gone.md");
    expect(path("0190f4b3-1")).toBe("docs/items/_archive/gone-folder/item.md");
  });

  test("an ambiguous prefix throws a UsageError listing the candidates", () => {
    let err: unknown;
    try {
      resolveRef(work, "0190f4b2");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(UsageError);
    const msg = (err as Error).message;
    expect(msg).toContain("docs/items/fix-hook.md");
    expect(msg).toContain("docs/items/big/item.md");
  });

  test("a prefix shorter than 8 characters is refused", () => {
    expect(() => resolveRef(work, "0190f4b")).toThrow(UsageError);
  });

  test("item/<slug>, a file or a folder", () => {
    expect(path("item/fix-hook")).toBe("docs/items/fix-hook.md");
    expect(path("item/big")).toBe("docs/items/big/item.md");
  });

  test("feature/<slug> and cycle/<slug>", () => {
    expect(path("feature/auth")).toBe("docs/features/auth/feature.md");
    expect(path("cycle/2026-09-x")).toBe("docs/cycles/2026-09-x.md");
  });

  test("each form resolves when the entity sits in _archive/", () => {
    expect(path("item/gone")).toBe("docs/items/_archive/gone.md");
    expect(path("item/gone-folder")).toBe("docs/items/_archive/gone-folder/item.md");
    expect(path("feature/old")).toBe("docs/features/_archive/old/feature.md");
    expect(path(C)).toBe("docs/items/_archive/gone.md");
  });

  test("an unknown reference is a UsageError naming the forms", () => {
    for (const ref of ["feature/nope", "item/nope", "cycle/nope", "0190ffff-0000", "nonsense"]) {
      let err: unknown;
      try {
        resolveRef(work, ref);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(UsageError);
    }
  });

  test("`kinds` restricts what the reference may name", () => {
    expect(() => resolveRef(work, "item/big", ["feature"])).toThrow(UsageError);
    expect(resolveRef(work, "feature/auth", ["feature"]).slug).toBe("auth");
  });
});
