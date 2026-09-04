// PORTED VERBATIM from agent-cli-conformance @ 1255a5d1c1010414bfbdb3c82bf01cdc44d0d2eb
// (github.com/ichabodcole/agent-cli-conformance, MIT, same author) — file:
// `scripts/docs-lint/unlinted-links.test.ts`.
//
// Copied, not shared. There is no package behind this yet and three repos is
// too few to abstract across; the copy is the honest state until a fourth one
// wants it. Keep this file byte-identical to its source so a future extraction
// is a move, not a merge: project-specific behaviour goes in `docs/lint.ts`
// through the `extraChecks` seam, never in here.
//
// EXCEPTION: the `what it is exempt from` cases name this repo's prefixes,
// because that is what the module under test now excludes. Everything else is
// the source.


// The exemptions are the part worth pinning. Deleting `GENERATED` or a prefix from
// `ALREADY_LINTED` changes nothing a reader would notice and nothing the gate would report — the
// check simply starts saying more, in a place nobody can fix. Each test below fails if its
// exemption is removed, which is the only reason to keep it.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { linkProblemsFor } from "./unlinted-links.ts";

const ROOT = mkdtempSync(join(tmpdir(), "unlinted-links-"));
afterAll(() => rmSync(ROOT, { recursive: true, force: true }));

/** Write `rel` under the fixture root, creating its parents. Returns the relative path. */
function put(rel: string, body: string): string {
  const abs = join(ROOT, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, body);
  return rel;
}

put("target.md", "# A Real Heading\n");

describe("what it reports", () => {
  test("a relative link with no file behind it", () => {
    const p = put("broken-file.md", "See [x](./nowhere.md).\n");
    expect(linkProblemsFor(ROOT, [p])).toEqual(["MISSING FILE  broken-file.md: ./nowhere.md"]);
  });

  test("a same-file anchor that names no heading — the hazard this exists for", () => {
    const p = put("broken-anchor.md", "# Only Heading\n\nSee [x](#not-a-heading).\n");
    const problems = linkProblemsFor(ROOT, [p]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("MISSING ANCHOR");
    expect(problems[0]).toContain("#not-a-heading");
  });

  test("nothing, when every target resolves", () => {
    const p = put(
      "fine.md",
      "# H\n\n[a](./target.md) and [b](./target.md#a-real-heading) and [c](#h).\n",
    );
    expect(linkProblemsFor(ROOT, [p])).toEqual([]);
  });
});

describe("what it is exempt from, and why each exemption has to hold", () => {
  // release-please rewrites this file wholesale. A finding here names an edit that the next
  // release would discard, so the gate could only be satisfied by not releasing.
  test("CHANGELOG.md is not read, even carrying a link that does not resolve", () => {
    const p = put("CHANGELOG.md", "See [x](./nowhere.md).\n");
    expect(linkProblemsFor(ROOT, [p])).toEqual([]);
  });

  // docs/lint.ts already resolves links across the whole of docs/. Reporting them here would
  // print every finding twice and make the count meaningless.
  test("docs/ is left to the lint that already walks it", () => {
    const p = put("docs/projects/x/proposal.md", "See [x](./nowhere.md).\n");
    expect(linkProblemsFor(ROOT, [p])).toEqual([]);
  });

  // `dist/` and the cookiecutter payload used to be excluded by a constant in this
  // module. They are the CALLER's business now — see `lint.exclude` in
  // `.project-docs.json` and the exclusion tests in `docs/lint.test.ts`. What is left
  // here is the guarantee that this function reads whatever it is handed, so a caller
  // that forgets to filter gets a report rather than silence.
  test("a path the caller did not filter is read, not silently skipped", () => {
    const p = put("dist/project-docs/skills/s/SKILL.md", "See [x](./nowhere.md).\n");
    expect(linkProblemsFor(ROOT, [p])).toHaveLength(1);
  });

  // The prefixes are anchored, so a sibling directory whose name merely starts the same way is
  // still gated. Without the trailing slash `docs-archive/` and `distribution/` would silently
  // drop out.
  test.each(["docs-archive/", "distribution/"])(
    "%s only looks like an excluded prefix, so it is still read",
    (prefix) => {
      const p = put(`${prefix}doc.md`, "See [x](./nowhere.md).\n");
      expect(linkProblemsFor(ROOT, [p])).toHaveLength(1);
    },
  );
});

describe("the corpus boundary", () => {
  // The selection is `git ls-files`, so a file present on disk but untracked is not in `paths`
  // and is never opened. This is what keeps a stray `note.md` from the release flow — or any
  // agent's scratch file — from locking every commit in a shared tree.
  test("a file that is not in the supplied paths is not read", () => {
    put("untracked.md", "See [x](./nowhere.md).\n");
    expect(linkProblemsFor(ROOT, ["target.md"])).toEqual([]);
  });
});

describe("a known blind spot, pinned so it is not mistaken for coverage", () => {
  // `checkLinks` reads inline `](target)` only. Reference-style links are invisible in both
  // directions. This test asserts the CURRENT behaviour so that fixing it fails here loudly
  // rather than silently widening the gate — see the module docblock.
  test("reference-style links are not resolved", () => {
    const p = put("ref-style.md", "See [x][r].\n\n[r]: ./nowhere.md\n");
    expect(linkProblemsFor(ROOT, [p])).toEqual([]);
  });
});
