import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG_FILENAME, DEFAULT_CONFIG, loadConfig } from "./config.ts";

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function root(contents?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "project-docs-config-"));
  roots.push(dir);
  if (contents !== undefined) writeFileSync(join(dir, CONFIG_FILENAME), contents);
  return dir;
}

describe("loadConfig", () => {
  // The scaffold generates repositories that predate this file, and the
  // migration that writes it has to be able to run the lint first.
  test("a project with no config gets the defaults", () => {
    expect(loadConfig(root())).toEqual(DEFAULT_CONFIG);
  });

  test("docsRoot is the one path nothing else may assume", () => {
    const cfg = loadConfig(root(JSON.stringify({ docsRoot: "documentation" })));
    expect(cfg.docsRoot).toBe("documentation");
    expect(cfg.lint.durable).toEqual(DEFAULT_CONFIG.lint.durable);
  });

  test("a partial file keeps the defaults for everything it omits", () => {
    const cfg = loadConfig(root(JSON.stringify({ lint: { workbench: ["notes"] } })));
    expect(cfg.lint.workbench).toEqual(["notes"]);
    expect(cfg.lint.skip).toEqual(DEFAULT_CONFIG.lint.skip);
    expect(cfg.lint.adopting).toBe(false);
  });

  test("adopting is read, because it is the difference between a gate and a report", () => {
    expect(loadConfig(root(JSON.stringify({ lint: { adopting: true } }))).lint.adopting).toBe(true);
  });

  // Falling back to the defaults on a malformed file is how a project spends
  // weeks discovering its gate has been checking the wrong tree.
  test("a malformed file throws rather than falling back", () => {
    expect(() => loadConfig(root("{ not json"))).toThrow(/not valid JSON/);
    expect(() => loadConfig(root("[]"))).toThrow(/must contain a JSON object/);
  });

  test("a wrongly-typed value falls back to its default rather than propagating", () => {
    const cfg = loadConfig(root(JSON.stringify({ docsRoot: 7, lint: { skip: "everything" } })));
    expect(cfg.docsRoot).toBe("docs");
    expect(cfg.lint.skip).toEqual(DEFAULT_CONFIG.lint.skip);
  });

  test("exclude defaults to empty, so the list costs nothing until it is used", () => {
    expect(loadConfig(root()).lint.exclude).toEqual([]);
    expect(
      loadConfig(root(JSON.stringify({ lint: { exclude: ["docs/**/*-prototype.md"] } }))).lint
        .exclude,
    ).toEqual(["docs/**/*-prototype.md"]);
  });

  test("the defaults are not shared between calls", () => {
    const a = loadConfig(root());
    a.lint.durable.push("mutated");
    expect(loadConfig(root()).lint.durable).not.toContain("mutated");
  });
});
