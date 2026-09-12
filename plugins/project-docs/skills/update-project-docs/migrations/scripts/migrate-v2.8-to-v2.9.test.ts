/**
 * The v2.9 migration adopts a project's templates as they stand.
 *
 * The two properties that matter: it records what is THERE (not what the
 * scaffold ships), and a second run changes nothing. Both are things a reader
 * of the script has to take on trust otherwise.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const SCRIPT = join(import.meta.dir, "migrate-v2.8-to-v2.9.ts");
const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function project(files: Record<string, string>, version = "7.0.0"): string {
  const root = mkdtempSync(join(tmpdir(), "mig29-"));
  roots.push(root);
  writeFileSync(
    join(root, ".project-docs.json"),
    JSON.stringify({ docsRoot: "docs", version, lint: {} }, null, 2)
  );
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
}

const run = (root: string, ...args: string[]) =>
  Bun.spawnSync(["bun", SCRIPT, "--root", root, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

const manifest = (root: string) =>
  JSON.parse(readFileSync(join(root, "docs/.pdocs-seed.json"), "utf8"));

describe("migrate v2.8 → v2.9", () => {
  test("records the project's own templates, not the scaffold's", () => {
    const root = project({
      "docs/playbooks/TEMPLATE.md": "THE ADOPTER EDITED THIS",
      "docs/projects/TEMPLATES/PLAN.template.md": "also theirs",
      "docs/playbooks/a-real-playbook.md": "not a template",
    });
    expect(run(root).exitCode).toBe(0);

    const m = manifest(root);
    expect(m.version).toBe("7.0.0");
    expect(Object.keys(m.files).sort()).toEqual([
      "playbooks/TEMPLATE.md",
      "projects/TEMPLATES/PLAN.template.md",
    ]);
    // The recorded hash is of THEIR bytes — so the next migration sees
    // `update`, not `keep-modified`, and their edit is the new baseline.
    expect(m.files["playbooks/TEMPLATE.md"]).toBe(
      createHash("sha256").update("THE ADOPTER EDITED THIS").digest("hex")
    );
  });

  test("a second run is a no-op, not a rewrite", () => {
    const root = project({ "docs/backlog/TEMPLATE.md": "original" });
    run(root);
    const first = readFileSync(join(root, "docs/.pdocs-seed.json"), "utf8");

    // Edit between the runs: the manifest must NOT be refreshed to match.
    writeFileSync(join(root, "docs/backlog/TEMPLATE.md"), "edited after adoption");
    const second = run(root);

    expect(second.exitCode).toBe(0);
    expect(second.stdout.toString()).toContain("already exists");
    expect(readFileSync(join(root, "docs/.pdocs-seed.json"), "utf8")).toBe(first);
  });

  test("--dry-run writes nothing", () => {
    const root = project({ "docs/cycles/TEMPLATE.md": "x" });
    const r = run(root, "--dry-run");
    expect(r.exitCode).toBe(0);
    expect(r.stdout.toString()).toContain("would record 1 template");
    expect(() => manifest(root)).toThrow();
  });

  test("a tree with no docs/ is refused, not silently skipped", () => {
    const root = mkdtempSync(join(tmpdir(), "mig29-empty-"));
    roots.push(root);
    const r = run(root);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("is this a project-docs tree?");
  });
});
