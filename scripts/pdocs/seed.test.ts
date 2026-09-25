/**
 * The seed manifest decides, for one file, whether a migration may replace it.
 *
 * Every test here is really the same question asked from a different angle:
 * when we are not certain the adopter left a file alone, what do we do? The
 * answer is always the same — keep theirs — and these tests exist because the
 * opposite default is silent, destructive, and indistinguishable from success.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  MANIFEST_NAME,
  SEEDED_PAGES,
  hashOf,
  isSeeded,
  loadManifest,
  mayWrite,
  recordSeeded,
  renameRecord,
  verdictFor,
  writeManifest,
} from "./seed.ts";

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function docsRoot(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-seed-"));
  roots.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
}

describe("hashing", () => {
  test("the same bytes hash the same, different bytes do not", () => {
    const root = docsRoot({ "a.md": "hello", "b.md": "hello", "c.md": "world" });
    expect(hashOf(join(root, "a.md"))).toBe(hashOf(join(root, "b.md")));
    expect(hashOf(join(root, "a.md"))).not.toBe(hashOf(join(root, "c.md")));
  });

  test("a file that is not there hashes to null, not to an exception", () => {
    const root = docsRoot();
    expect(hashOf(join(root, "gone.md"))).toBeNull();
  });
});

describe("the three verdicts", () => {
  test("recorded and unchanged — the scaffold may replace it", () => {
    const root = docsRoot({ "playbooks/TEMPLATE.md": "original" });
    const m = recordSeeded(root, ["playbooks/TEMPLATE.md"], "7.0.0");
    expect(verdictFor(m, root, "playbooks/TEMPLATE.md")).toBe("update");
  });

  test("recorded and edited — the adopter's copy wins", () => {
    const root = docsRoot({ "playbooks/TEMPLATE.md": "original" });
    const m = recordSeeded(root, ["playbooks/TEMPLATE.md"], "7.0.0");
    writeFileSync(join(root, "playbooks/TEMPLATE.md"), "they edited it");
    expect(verdictFor(m, root, "playbooks/TEMPLATE.md")).toBe("keep-modified");
  });

  test("not recorded at all — still the adopter's copy", () => {
    // THE LOAD-BEARING ONE. An unknown file must never be treated as safe to
    // overwrite: it is also what every file looks like on the first migration,
    // before any manifest existed. Fail toward the copy on disk.
    const root = docsRoot({ "playbooks/TEMPLATE.md": "who knows" });
    const m = recordSeeded(root, [], "7.0.0");
    expect(verdictFor(m, root, "playbooks/TEMPLATE.md")).toBe("keep-unknown");
  });

  test("recorded but deleted — deletion is an edit, so it stays deleted", () => {
    const root = docsRoot({ "playbooks/TEMPLATE.md": "original" });
    const m = recordSeeded(root, ["playbooks/TEMPLATE.md"], "7.0.0");
    rmSync(join(root, "playbooks/TEMPLATE.md"));
    expect(verdictFor(m, root, "playbooks/TEMPLATE.md")).toBe("keep-deleted");
  });
});

describe("reading and writing", () => {
  test("a manifest round-trips", () => {
    const root = docsRoot({ "a.md": "x" });
    const m = recordSeeded(root, ["a.md"], "7.0.0");
    writeManifest(root, m);
    const back = loadManifest(root);
    expect(back.version).toBe("7.0.0");
    expect(back.files["a.md"]).toBe(hashOf(join(root, "a.md")) as string);
  });

  test("no manifest is an empty one — every file reads as unknown", () => {
    const root = docsRoot({ "a.md": "x" });
    expect(loadManifest(root).files).toEqual({});
    expect(verdictFor(loadManifest(root), root, "a.md")).toBe("keep-unknown");
  });

  test("a corrupt manifest throws, naming the file", () => {
    // It must NOT fall back to an empty manifest. Empty means "overwrite
    // nothing", which is safe — but silently treating a damaged manifest as
    // absent hides the damage until the file is rewritten and the record lost.
    const root = docsRoot();
    writeFileSync(join(root, MANIFEST_NAME), '{"files": {"a.md"');
    expect(() => loadManifest(root)).toThrow(MANIFEST_NAME);
  });
});

describe("a seeded file this version adds", () => {
  test("neither recorded nor present — install it", () => {
    // Surfaced while implementing, not while planning: a template ADDED in the
    // new version is unrecorded and absent, and the `keep-unknown` default
    // would have skipped it for ever. There is nothing on disk to protect.
    const root = docsRoot();
    const m = recordSeeded(root, [], "7.0.0");
    expect(verdictFor(m, root, "runbooks/TEMPLATE.md")).toBe("install");
  });

  test("only `update` and `install` let the scaffold write", () => {
    expect((["update", "install"] as const).map(mayWrite)).toEqual([true, true]);
    expect(
      (["keep-modified", "keep-unknown", "keep-deleted"] as const).map(mayWrite)
    ).toEqual([false, false, false]);
  });
});

describe("seeded pages — seeded, but not templates", () => {
  // STYLE.md is installed once and reconciled by hash like a template, and is
  // read and followed like a document: its links are checked. So it is named
  // here, by path, and the template shapes do not match it.
  test("STYLE.md is the one seeded page", () => {
    expect([...SEEDED_PAGES]).toEqual(["STYLE.md"]);
  });

  test("no seeded page matches a template shape", () => {
    expect([...SEEDED_PAGES].filter((p) => isSeeded(p))).toEqual([]);
  });

  test("a seeded page is reconciled like a template", () => {
    const root = docsRoot({ "STYLE.md": "# ours\n" });
    const m = recordSeeded(root, [...SEEDED_PAGES], "9.0.0");
    expect(verdictFor(m, root, "STYLE.md")).toBe("update");
    writeFileSync(join(root, "STYLE.md"), "# theirs\n");
    expect(verdictFor(m, root, "STYLE.md")).toBe("keep-modified");
  });
});

describe("manifest keys are contained", () => {
  test("a key escaping the docs root can never permit writing", () => {
    const root = docsRoot({ "a.md": "x" });
    const m = { version: "7.0.0", files: { "../../../etc/hosts": "deadbeef" } };
    expect(verdictFor(m, root, "../../../etc/hosts")).toBe("keep-unknown");
    expect(mayWrite(verdictFor(m, root, "../../../etc/hosts"))).toBe(false);
  });

  test("an absolute key is refused the same way", () => {
    const root = docsRoot();
    const m = { version: "7.0.0", files: { "/etc/hosts": "deadbeef" } };
    expect(mayWrite(verdictFor(m, root, "/etc/hosts"))).toBe(false);
  });
});

describe("containment is not lexical", () => {
  test("a symlink inside the docs root that points outside is refused", () => {
    const root = docsRoot({ "a.md": "x" });
    const outside = mkdtempSync(join(tmpdir(), "pdocs-outside-"));
    roots.push(outside);
    writeFileSync(join(outside, "x.md"), "not ours");
    symlinkSync(join(outside, "x.md"), join(root, "link.md"));
    const m = { version: "7.0.0", files: { "link.md": hashOf(join(outside, "x.md")) as string } };
    expect(mayWrite(verdictFor(m, root, "link.md"))).toBe(false);
  });

  test("a directory literally named `..foo` is NOT an escape", () => {
    const root = docsRoot({ "..foo/TEMPLATE.md": "legit" });
    const m = recordSeeded(root, ["..foo/TEMPLATE.md"], "7.0.0");
    expect(m.files["..foo/TEMPLATE.md"]).toBeDefined();
    expect(verdictFor(m, root, "..foo/TEMPLATE.md")).toBe("update");
  });

  test("the writer refuses what the reader refuses", () => {
    const root = docsRoot({ "a.md": "x" });
    const outside = mkdtempSync(join(tmpdir(), "pdocs-outside2-"));
    roots.push(outside);
    writeFileSync(join(outside, "x.md"), "not ours");
    const m = recordSeeded(root, ["../" + basename(outside) + "/x.md", "a.md"], "7.0.0");
    expect(Object.keys(m.files)).toEqual(["a.md"]);
  });
});

describe("a template that moves keeps its record", () => {
  // 9.0.0 moves `projects/TEMPLATES/*` to `TEMPLATES/`, renames the proposal
  // template to the feature one, and moves the report template. Without the
  // record moving with the file, an untouched template at its new path reads
  // as `keep-unknown` for ever, and the scaffold never updates it again.
  const H = "a".repeat(64);
  const m = () => ({
    version: "8.1.0",
    files: { "projects/TEMPLATES/PLAN.template.md": H, "cycles/TEMPLATE.md": "b".repeat(64) },
  });

  test("the hash moves to the new key, and the old key is gone", () => {
    const r = renameRecord(m(), "projects/TEMPLATES/PLAN.template.md", "TEMPLATES/PLAN.template.md");
    expect(r.files).toEqual({ "TEMPLATES/PLAN.template.md": H, "cycles/TEMPLATE.md": "b".repeat(64) });
    expect(r.version).toBe("8.1.0");
  });

  test("the input manifest is not mutated", () => {
    const before = m();
    renameRecord(before, "projects/TEMPLATES/PLAN.template.md", "TEMPLATES/PLAN.template.md");
    expect(before).toEqual(m());
  });

  test("an unrecorded old key changes nothing — there is no record to carry", () => {
    expect(renameRecord(m(), "nope/TEMPLATE.md", "TEMPLATES/X.template.md")).toEqual(m());
  });

  test("a new key already recorded keeps its own hash; the old record is dropped", () => {
    const both = m();
    both.files["TEMPLATES/PLAN.template.md" as keyof typeof both.files] = "c".repeat(64);
    const r = renameRecord(both, "projects/TEMPLATES/PLAN.template.md", "TEMPLATES/PLAN.template.md");
    expect(r.files).toEqual({ "TEMPLATES/PLAN.template.md": "c".repeat(64), "cycles/TEMPLATE.md": "b".repeat(64) });
  });

  test("a moved record gives the verdict the file at its new path deserves", () => {
    const dir = docsRoot({ "TEMPLATES/PLAN.template.md": "ours\n" });
    const recorded = { version: "8.1.0", files: { "projects/TEMPLATES/PLAN.template.md": hashOf(join(dir, "TEMPLATES/PLAN.template.md")) as string } };
    expect(verdictFor(recorded, dir, "TEMPLATES/PLAN.template.md")).toBe("keep-unknown");
    const moved = renameRecord(recorded, "projects/TEMPLATES/PLAN.template.md", "TEMPLATES/PLAN.template.md");
    expect(verdictFor(moved, dir, "TEMPLATES/PLAN.template.md")).toBe("update");
  });
});
