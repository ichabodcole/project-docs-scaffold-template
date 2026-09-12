/**
 * The seed manifest decides, for one file, whether a migration may replace it.
 *
 * Every test here is really the same question asked from a different angle:
 * when we are not certain the adopter left a file alone, what do we do? The
 * answer is always the same — keep theirs — and these tests exist because the
 * opposite default is silent, destructive, and indistinguishable from success.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  MANIFEST_NAME,
  hashOf,
  loadManifest,
  mayWrite,
  recordSeeded,
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
    expect(back.files["a.md"]).toBe(hashOf(join(root, "a.md")));
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
    expect(["update", "install"].map(mayWrite)).toEqual([true, true]);
    expect(
      ["keep-modified", "keep-unknown", "keep-deleted"].map(mayWrite)
    ).toEqual([false, false, false]);
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
