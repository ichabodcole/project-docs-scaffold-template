#!/usr/bin/env bun
/**
 * docs-lint — the gate for the documentation layer.
 *
 * Phase 1 of docs/projects/okf-frontmatter-layer/plan.md: link and anchor
 * resolution over every tracked Markdown file outside `docs/`. Phase 2 adds
 * the two frontmatter tiers over `docs/` itself, and this file becomes the
 * place where all three passes meet.
 *
 * Everything project-specific lives here. `scripts/docs-lint/` is a copy of a
 * portable core and stays that way.
 */

import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { linkProblemsFor, trackedMarkdown } from "../scripts/docs-lint/unlinted-links.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * A TEMPLATE IS A FORM, NOT A DOCUMENT, and its links are placeholders by
 * construction: `docs/projects/<project-name>/proposal.md` is correct in a
 * template and resolves nowhere until someone fills it in. Checking them here
 * reports every template as broken forever, which is the fastest way to teach
 * a person to stop reading the gate's output.
 *
 * The frontmatter tiers skip the same files for the same reason, so the rule
 * is stated once, in one shape: the name says TEMPLATE.
 */
function isTemplate(rel: string): boolean {
  return /template/i.test(basename(rel));
}

const problems = linkProblemsFor(REPO_ROOT, trackedMarkdown(REPO_ROOT).filter((p) => !isTemplate(p)));

for (const p of problems) console.log(p);

if (problems.length > 0) {
  console.log(`\ndocs-lint: ${problems.length} problem(s)`);
  process.exit(1);
}

console.log("docs-lint: clean");
