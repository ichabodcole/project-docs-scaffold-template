/**
 * Every file the payload ships falls in exactly one ownership class.
 *
 * `docs/SCHEMA.md` § "Who owns which file" states the contract an adopter is
 * asked to rely on. It was written by category — "every category README",
 * "every template" — which covered the tree at the time and silently left six
 * paths in no class at all, two of them real templates. A reviewer found them;
 * nothing could have.
 *
 * This test is the gate. It mirrors the table's rules in code, so a payload file
 * that matches none of them fails here rather than becoming an unstated promise.
 * If you add a file to the payload, either it matches a rule or you extend both
 * the table and this list — deliberately, which is the point.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Glob } from "bun";

const PAYLOAD = resolve(import.meta.dir, "../{{cookiecutter.project_slug}}");
const SCHEMA = join(PAYLOAD, "docs/SCHEMA.md");

type Class = "owned" | "seeded" | "theirs" | "structural";

/** The rules as `docs/SCHEMA.md` states them. Keep the two in step. */
function classify(rel: string): Class | null {
  const name = basename(rel);

  if (name === ".gitkeep") return "structural";

  // Seeded — any template.
  if (
    (name.includes("TEMPLATE") && name.endsWith(".md")) ||
    name.endsWith(".template.md")
  )
    return "seeded";

  // Owned — read by code, or scaffold boilerplate describing scaffold structure.
  if (rel.startsWith("scripts/pdocs/")) return "owned";
  if (
    [
      "docs/README.md",
      "docs/AGENTS.md",
      "docs/SCHEMA.md",
      "docs/CLAUDE.md",
    ].includes(rel)
  )
    return "owned";
  if (name === "README.md" && rel.startsWith("docs/")) return "owned";

  // Theirs — config, the catalog, the manifesto, and every document written.
  if (rel === ".project-docs.json") return "theirs";
  if (["docs/index.md", "docs/PROJECT_MANIFESTO.md"].includes(rel))
    return "theirs";
  if (rel.startsWith("docs/")) return "theirs";

  return null;
}

const payloadFiles = (): string[] =>
  [
    ...new Glob("**/*").scanSync({ cwd: PAYLOAD, dot: true, onlyFiles: true }),
  ].sort();

describe("the ownership contract covers the payload", () => {
  test("every shipped file is in exactly one class", () => {
    const unclassified = payloadFiles().filter((f) => classify(f) === null);
    expect(unclassified).toEqual([]);
  });

  test("the payload is not empty, so the check above ranged over something", () => {
    // A classifier that never runs reports a clean result. Assert the population.
    expect(payloadFiles().length).toBeGreaterThan(40);
  });

  test("SCHEMA.md names each class this test assigns", () => {
    const schema = readFileSync(SCHEMA, "utf8");
    // Asserted as a list of MISSING terms, not with `toContain` per term: a
    // failing `toContain` prints the whole 400-line file and buries the signal.
    // `structural` belongs here: the test assigns it, so SCHEMA must name it.
    // Omitting it let SCHEMA say "Three classes" while the code modelled four.
    const missing = [
      "Owned",
      "Seeded",
      "Theirs",
      "structural",
      ".gitkeep",
      "docs/CLAUDE.md",
    ].filter((term) => !schema.includes(term));
    expect(missing).toEqual([]);
  });

  test("every seeded payload file really is a template", () => {
    const seeded = payloadFiles().filter((f) => classify(f) === "seeded");
    expect(seeded.length).toBeGreaterThan(15);
    for (const f of seeded) expect(f.endsWith(".md")).toBe(true);
  });
});
