// The guard.
//
// Everything else that tests the lint tests a FUNCTION. This tests the entry
// point: it spawns `bun scripts/pdocs/cli.ts check --root <tree>` the way
// `npm run docs:lint` does, and asserts the whole of stdout against a committed
// transcript. That is the only shape of test that can notice a rule which stops
// being *called* — the assembly these transcripts cover is `collect()`, which
// moved out of `main()` after they were recorded, and a test that reimplemented
// the assembly would have moved with it and kept passing.
//
// THE TRANSCRIPTS WERE RECORDED AGAINST `bun docs/lint.ts`, BEFORE `pdocs`
// EXISTED, AND HAVE NOT BEEN RE-RECORDED. That is the whole point of pointing
// this file at the new entry point rather than writing a second set: the gate's
// text output is a thing hundreds of documents and half a dozen skills quote,
// and "the CLI prints what the script printed" is a claim worth proving rather
// than asserting. If a golden needs updating to make this pass, the output
// changed and that is the finding.
//
// WHY THE FIXTURES ARE BUILT HERE AND NOT COMMITTED. A dirty tree of `.md`
// inside this repository would be linted by the live gate (`main()` also walks
// everything git tracks outside `docs/`), would fail `format:check`, and — the
// one that actually destroys the test — `npm run format` REWRITES frontmatter,
// so a fixture whose whole purpose is to encode a malformed field gets silently
// repaired. Temp directories have none of those properties. The transcripts are
// `.txt`, which Prettier (`**/*.md`), the lint (`.md` only) and `check-mirror.sh`
// all ignore.
//
// To re-record after a deliberate behaviour change:
//
//     UPDATE_GOLDENS=1 bun test scripts/pdocs/lint/golden.test.ts
//
// then READ the diff. A golden updated without reading the diff is a golden
// that has been deleted.

import { afterAll, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DEFAULT_CONFIG } from "../docs-lint/config.ts";
import { childEnv } from "../test-env.ts";
import { buildRegistry } from "./registry.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");
const GOLDEN_DIR = join(REPO_ROOT, "scripts/pdocs/__fixtures__");
const UPDATE = process.env.UPDATE_GOLDENS === "1";

/**
 * The real contract, read at test time rather than copied into a fixture file.
 *
 * `schemaTableChecks` compares SCHEMA.md's "Lifecycle by type" table against the
 * lint's own tables and reports every row that is missing or disagrees, so a
 * fixture carrying a stale copy would drown both transcripts in 23 lines of
 * noise. Reading the live file means an edit to SCHEMA.md only touches these
 * goldens if it also disagrees with the code — which the live gate already
 * forbids.
 */
const SCHEMA = readFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), "utf8");

/**
 * Every template the registry declares, as a stub.
 *
 * A fixture tree is a project-docs tree, and `templateProblems` checks that
 * such a tree holds the templates its registry names — so a fixture without
 * them is not a minimal tree, it is a broken one. The list is DERIVED from the
 * registry rather than written out: a new type would otherwise turn every
 * transcript in this file red at once, which is noise rather than a finding.
 *
 * The stubs are inert on every tier — `isTemplate` matches the basename, so
 * links, frontmatter and the graph all skip them.
 */
function templateStubs(omit: string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of buildRegistry(DEFAULT_CONFIG)) {
    if (row.template === null || row.externalTemplate) continue;
    for (const rel of [row.template].flat())
      if (!omit.includes(rel))
        out[rel] = "# A Template\n\nA stub. Every tier skips it by name.\n";
  }
  return out;
}

/**
 * The one template the dirty tree is missing, so the transcript records that
 * `templateProblems` ran. Without a planted absence the check prints nothing
 * and the golden cannot tell "found nothing" from "never called" — the same
 * reason the dirty tree's SCHEMA.md carries a ghost row.
 */
const MISSING_TEMPLATE = "docs/cycles/TEMPLATE.md";

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

/** A fixture repository: `.project-docs.json`, the declared templates, and the
 *  files given. `omitTemplates` leaves one out on purpose. */
function tree(
  files: Record<string, string>,
  omitTemplates: string[] = []
): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-golden-"));
  roots.push(root);
  writeFileSync(
    join(root, ".project-docs.json"),
    `${JSON.stringify(
      {
        docsRoot: "docs",
        version: "1.0.0",
        lint: {
          adopting: false,
          exclude: [],
          durable: [
            "architecture",
            "specifications",
            "interaction-design",
            "playbooks",
            "lessons-learned",
            "memories",
          ],
          workbench: [
            "backlog",
            "briefs",
            "investigations",
            "projects",
            "reports",
            "fragments",
            "cycles",
          ],
          skip: ["_archive", "superpowers"],
        },
      },
      null,
      2
    )}\n`
  );
  for (const [rel, body] of Object.entries({
    ...templateStubs(omitTemplates),
    ...files,
  })) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }

  // An EMPTY git repository, deliberately.
  //
  // `trackedMarkdown` shells out to `git ls-files` and fails open
  // (`unlinted-links.ts:79`), so its answer depends on whether the temp
  // directory happens to sit inside somebody's checkout — on a machine where it
  // does, the lint would try to read that repository's paths relative to this
  // fixture and crash. Initialising an empty repo pins that tier to "no tracked
  // markdown" everywhere, which is the only answer a temp tree can give
  // deterministically. The tier itself is covered by the live capture in the
  // plan's step 1.3, not by these transcripts.
  Bun.spawnSync(["git", "init", "-q"], { cwd: root });
  return root;
}

/**
 * Run the real entry point against a fixture root and return all of stdout.
 *
 * `--format text` is REQUIRED here and is not a weakening of the assertion.
 * `Bun.spawnSync` gives the child a pipe, not a terminal, and `resolveFormat`
 * reads a non-TTY stdout as "an agent is on the other end" and renders JSON. A
 * terminal is the one thing a test harness cannot hand it, so the format is
 * stated. What `npm run docs:lint` resolves to under a real pty — text, by the
 * same resolver — is what these transcripts hold.
 */
function lint(root: string, command = "check"): string {
  const out = Bun.spawnSync(
    ["bun", CLI, command, "--root", root, "--format", "text"],
    { cwd: REPO_ROOT, env: childEnv() }
  );
  const stderr = new TextDecoder().decode(out.stderr).trim();
  // A crash inside the lint prints nothing to stdout and the assertion below
  // would blame the golden. Surface the real cause instead.
  if (stderr) throw new Error(`pdocs wrote to stderr:\n${stderr}`);
  return new TextDecoder().decode(out.stdout);
}

/**
 * Compare against the committed transcript.
 *
 * No normalisation is applied, and none is needed: every path the lint prints
 * is relative to the root it was given, and it prints no timestamps. The
 * "identical across two independent temp roots" test below is what proves that
 * — if an absolute path ever leaks in, it fails there rather than passing here
 * against a weakened assertion.
 */
function golden(name: string, actual: string): void {
  const path = join(GOLDEN_DIR, name);
  if (UPDATE) {
    mkdirSync(GOLDEN_DIR, { recursive: true });
    writeFileSync(path, actual);
    return;
  }
  expect(actual).toBe(readFileSync(path, "utf8"));
}

// ---------------------------------------------------------------------------------------
// The clean tree: minimal, and valid on every tier.
// ---------------------------------------------------------------------------------------

const CLEAN: Record<string, string> = {
  "docs/SCHEMA.md": SCHEMA,

  "docs/index.md": `---
type: index
title: Fixture Catalog
description: The catalog for the clean golden fixture.
status: stable
tags: [fixture]
generated: { by: golden-test, at: 2026-01-01 }
---

# Fixture Catalog

- [A Playbook](./playbooks/a-playbook.md) — How the fixture exercises the graph tier.
- [A Memory](./memories/a-memory.md) — One remembered fact about the fixture tree.
`,

  "docs/playbooks/a-playbook.md": `---
type: playbook
title: A Playbook
description: How the fixture exercises the graph tier.
status: stable
tags: [fixture]
generated: { by: golden-test, at: 2026-01-01 }
---

# A Playbook

Reachable from the catalog, so not an orphan.
`,

  "docs/memories/a-memory.md": `---
type: memory
title: A Memory
description: One remembered fact about the fixture tree.
status: stable
tags: [fixture]
generated: { by: golden-test, at: 2026-01-01 }
---

# A Memory

Reachable from the catalog, so not an orphan.
`,

  "docs/backlog/an-item.md": `---
type: backlog
title: An Item
description: A backlog item with nothing wrong with it.
status: draft
lifecycle: open
generated: { by: golden-test, at: 2026-01-01 }
---

# An Item
`,

  "docs/projects/sample/proposal.md": `---
type: proposal
title: A Proposal
description: A proposal with nothing wrong with it.
status: draft
lifecycle: draft
generated: { by: golden-test, at: 2026-01-01 }
---

# A Proposal
`,
};

// ---------------------------------------------------------------------------------------
// The dirty tree: one instance of each problem class.
//
// Each mutation sits in a DIFFERENT folder and tier from the one whose bug
// motivated its rule. A regression sweep that plants every defect where its rule
// was written proves only that the rule reads its own folder.
// ---------------------------------------------------------------------------------------

/**
 * The contract, plus one type the code has never heard of.
 *
 * Without this the two tables agree and `schemaTableChecks` prints nothing —
 * which means the transcript could not tell the difference between "the check
 * ran and found nothing" and "the check was never called".
 */
const SCHEMA_WITH_GHOST = SCHEMA.replace(
  /^\| `artifact`.*\n/m,
  (row) =>
    `${row}| \`ghost\`             | —                                                                              | thin  | nowhere                           |\n`
);

const DIRTY: Record<string, string> = {
  "docs/SCHEMA.md": SCHEMA_WITH_GHOST,

  // The catalog. Its first hook no longer matches the page's `description`.
  "docs/index.md": `---
type: index
title: Fixture Catalog
description: The catalog for the dirty golden fixture.
status: stable
tags: [fixture]
generated: { by: golden-test, at: 2026-01-01 }
---

# Fixture Catalog

- [Legacy Date](./architecture/legacy-date.md) — A hook that no longer says what the page says.
- [Unknown Field](./interaction-design/unknown-field.md) — An interaction page carrying a field the schema does not allow.
- [Frozen With Lifecycle](./lessons-learned/frozen-with-lifecycle.md) — A lesson that wrongly carries a lifecycle.
- [Bad Status](./memories/bad-status.md) — A memory whose status is outside the OKF vocabulary.
- [Dangling Related](./playbooks/dangling-related.md) — A playbook pointing at a page that does not exist.
`,

  // LEGACY FIELD (rule written for library pages carrying a pre-OKF `date`)
  // and STALE HOOK, which is reported against index.md rather than here.
  "docs/architecture/legacy-date.md": `---
type: architecture
title: Legacy Date
description: An architecture page still carrying a legacy date field.
status: stable
tags: [fixture]
date: 2026-01-01
generated: { by: golden-test, at: 2026-01-01 }
---

# Legacy Date
`,

  // UNKNOWN FIELD.
  "docs/interaction-design/unknown-field.md": `---
type: interaction
title: Unknown Field
description: An interaction page carrying a field the schema does not allow.
status: stable
tags: [fixture]
owner: nobody
generated: { by: golden-test, at: 2026-01-01 }
---

# Unknown Field
`,

  // LIFECYCLE on a frozen library type.
  "docs/lessons-learned/frozen-with-lifecycle.md": `---
type: lesson
title: Frozen With Lifecycle
description: A lesson that wrongly carries a lifecycle.
status: stable
tags: [fixture]
lifecycle: active
generated: { by: golden-test, at: 2026-01-01 }
---

# Frozen With Lifecycle
`,

  // BAD STATUS on a library page — the exact defect that survived six phases
  // because the vocabulary check lived inside the workbench tier.
  "docs/memories/bad-status.md": `---
type: memory
title: Bad Status
description: A memory whose status is outside the OKF vocabulary.
status: approved
tags: [fixture]
generated: { by: golden-test, at: 2026-01-01 }
---

# Bad Status
`,

  // BAD related. Must be a DURABLE folder: `related` resolution is library-tier
  // only (`scripts/docs-lint/index.ts:587`), so the same frontmatter on a
  // workbench document exercises nothing.
  "docs/playbooks/dangling-related.md": `---
type: playbook
title: Dangling Related
description: A playbook pointing at a page that does not exist.
status: stable
tags: [fixture]
related: [playbook/no-such-page]
generated: { by: golden-test, at: 2026-01-01 }
---

# Dangling Related
`,

  // ORPHAN — valid in every other respect, and absent from the catalog.
  "docs/specifications/orphan.md": `---
type: specification
title: Orphan
description: A specification nothing in the catalog points at.
status: stable
tags: [fixture]
generated: { by: golden-test, at: 2026-01-01 }
---

# Orphan
`,

  // BAD TAG.
  "docs/backlog/bad-tag.md": `---
type: backlog
title: Bad Tag
description: A backlog item whose tag is not kebab-case.
status: draft
lifecycle: open
tags: [Not Kebab]
generated: { by: golden-test, at: 2026-01-01 }
---

# Bad Tag
`,

  // MISSING <field>, five of them, including the lifecycle its type requires.
  "docs/briefs/missing-fields.md": `---
type: brief
---

# Missing Fields
`,

  // BAD SCALAR: a `description` a real YAML parser reads as a nested mapping.
  // Paired with the second cycle below to make TWO ACTIVE CYCLES.
  "docs/cycles/one.md": `---
type: cycle
title: Cycle One
description: The first cycle: it is active.
status: draft
lifecycle: active
generated: { by: golden-test, at: 2026-01-01 }
---

# Cycle One
`,

  "docs/cycles/two.md": `---
type: cycle
title: Cycle Two
description: The second cycle, also active.
status: draft
lifecycle: active
generated: { by: golden-test, at: 2026-01-01 }
---

# Cycle Two
`,

  // WRONG TYPE: a library type declared on a workbench page.
  "docs/fragments/wrong-type.md": `---
type: memory
title: Wrong Type
description: A fragment claiming to be a memory.
status: draft
lifecycle: open
generated: { by: golden-test, at: 2026-01-01 }
---

# Wrong Type
`,

  // MISSING FILE.
  "docs/investigations/broken-link.md": `---
type: investigation
title: Broken Link
description: An investigation linking a page that was never written.
status: draft
lifecycle: active
generated: { by: golden-test, at: 2026-01-01 }
---

# Broken Link

See [the findings](./findings-that-do-not-exist.md).
`,

  // BAD LIFECYCLE on a workbench document.
  "docs/projects/sample/plan.md": `---
type: plan
title: A Plan
description: A plan whose lifecycle is outside its vocabulary.
status: draft
lifecycle: shipped
generated: { by: golden-test, at: 2026-01-01 }
---

# A Plan
`,

  // BAD GENERATED: the field present, but not the mapping OKF 0.2 asks for.
  "docs/projects/sample/test-plan.md": `---
type: test-plan
title: A Test Plan
description: A test plan whose generated field is a bare scalar.
status: draft
lifecycle: draft
generated: 2026-01-01
---

# A Test Plan
`,

  // NO FRONTMATTER.
  "docs/reports/no-frontmatter.md": `# No Frontmatter

A report that never got a frontmatter block.
`,
};

// ---------------------------------------------------------------------------------------

test("a clean tree lints clean, and says so in the same words every time", () => {
  golden("clean.txt", lint(tree(CLEAN)));
});

test("a dirty tree reports one of each problem class", () => {
  expect(SCHEMA_WITH_GHOST).not.toBe(SCHEMA); // the row landed
  golden("dirty.txt", lint(tree(DIRTY, [MISSING_TEMPLATE])));
});

test("`report` groups the dirty tree's missing fields", () => {
  // The document counts differ from the graph tier's on purpose: `reportLines`
  // counts `workbenchFiles() + libraryFiles()`, and `libraryFiles` drops
  // SCHEMA.md because it is not one of the three named root pages. The graph
  // tier walks it. Both numbers are real; this records them rather than
  // reconciling them.
  golden("dirty-report.txt", lint(tree(DIRTY, [MISSING_TEMPLATE]), "report"));
});

test("two independent temp roots produce byte-identical output", () => {
  // The determinism assertion, and the reason the goldens above need no path
  // normalisation. Two roots differ in their random suffix and (on a machine
  // where `readdir` order is a name hash) in their inode layout, so an absolute
  // path or an unsorted walk leaking into the output fails HERE — where the
  // cause is legible — instead of turning into a flaky golden.
  expect(lint(tree(DIRTY, [MISSING_TEMPLATE]))).toBe(
    lint(tree(DIRTY, [MISSING_TEMPLATE]))
  );
  expect(lint(tree(DIRTY, [MISSING_TEMPLATE]), "report")).toBe(
    lint(tree(DIRTY, [MISSING_TEMPLATE]), "report")
  );
  expect(lint(tree(CLEAN))).toBe(lint(tree(CLEAN)));
});
