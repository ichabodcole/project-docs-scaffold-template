# OKF Frontmatter Layer Implementation Plan

**Created:** 2026-09-03 **Related Proposal:** [Proposal](./proposal.md)
**Status:** Active

---

## Overview

The [proposal](./proposal.md) adds OKF 0.2 frontmatter to every document under
`docs/`, enforces it with a two-tier lint ported from
[agent-cli-conformance](https://github.com/ichabodcole/agent-cli-conformance),
adds per-type `lifecycle` vocabularies and a new `cycle` document type,
introduces a root `.project-docs.json` config file that tooling and skills read
instead of assuming `docs/`, and ships all of it through the cookiecutter
payload and the project-docs skills. No folder moves.

This plan is the route from a repo that has **no TypeScript, no Bun, no CI lint,
and 117 unmarked documents** to one where `bun docs/lint.ts` gates every commit,
every document carries conformant frontmatter, and a scaffolded project inherits
the same. The pivotal stops are: bringing Bun into an npm/uv repo (Phase 0),
porting the lint core unchanged and cutting the CLI-conformance machinery out of
its entry point (Phase 1), writing the contract and the tier table that the lint
reads (Phase 2), a **codemod-first backfill** that mechanically extracts what
the folder, H1, bold status line and git history already know, then works the
remainder in lint-driven batches (Phase 4), and the mirror/skill sweep governed
by the scaffold-update-checklist (Phases 5–6).

Two facts from the codebase analysis shape the whole plan:

- **The lint core is designed to be lifted.** `scripts/docs-lint/index.ts` in
  agent-cli-conformance (593 lines, `node:fs` + `node:path` only, 1,711 lines of
  temp-dir tests) exports `runDocsLint(config)` with a config object and an
  `extraChecks` seam. The wiki entry point (`docs/wiki/lint.ts`, 778 lines) is
  roughly half CLI-conformance rule machinery that gets cut; the artifact entry
  point (`docs/lint.ts`, 248 lines) is a folder → vocabulary `SPEC` table that
  is exactly the thin tier this plan needs.
- **The cookiecutter mirror differs from `docs/` by Prettier wrapping only.**
  `.prettierignore` line 5 excludes `{{cookiecutter.project_slug}}/`, so 14 of
  17 templates differ solely in line breaks. The ported lint tolerates Prettier
  wrapping by design (`normalizeBlock`, continuation folding), but no
  byte-equality mirror check is possible without normalizing.

## Outcome & Success Criteria

**Definition of Done** (from the proposal's Success Criteria, made checkable):

- [ ] `bun docs/lint.ts` exits 0 on this repo; `bun test` passes; both run in
      `.husky/pre-commit` and in a `.github/workflows/docs-check.yml` job.
- [ ] Deliberately breaking a link, an anchor, a `lifecycle` value, and a
      `status` value each produce a non-zero exit with a file:line message.
- [ ] Every `.md` under `docs/` except `README.md`, `*TEMPLATE*`, `_archive/`,
      and `docs/superpowers/` has frontmatter with `type`; zero bold inline
      `**Status:**` lines remain.
- [ ] `bun docs/lint.ts --json` emits a graph in which every page in the six
      durable folders is reachable from `docs/index.md`.
- [ ] `bun docs/lint.ts --report` prints zero missing required fields.
- [ ] `docs/cycles/` contains exactly one `lifecycle: active` cycle at any time
      during the work, and at the end the cycle that delivered this plan is
      `closed` with an Outcome section.
- [ ] Fewer than eight proposals carry `lifecycle: approved`; the remainder are
      `deferred`, `implemented`, `withdrawn`, `superseded`, or archived.
- [ ] `cookiecutter . --no-input` into a temp dir yields a project whose
      `bun docs/lint.ts` exits 0 on first run.
- [ ] `init-branch`, `finalize-branch`, `sweep-project`, `create-project`,
      `create-investigation`, `generate-proposal`, `generate-dev-plan` and
      `update-project-docs` reference `lifecycle` and cycles;
      `plugins/project-docs/.claude-plugin/plugin.json` is `3.7.0`; `dist/` is
      rebuilt.
- [ ] `docs/PROJECT_MANIFESTO.md` no longer says "no sprints".
- [ ] `.project-docs.json` exists at the repo root with `docsRoot`, `version`,
      and `lint` keys; `docs/lint.ts`, the migration script, and
      `update-project-docs` read it; renaming `docs/` to `documentation/` and
      updating `docsRoot` keeps the lint green.
- [ ] `migrations/v2.6-to-v2.7.md` exists with a row in
      `## Available     Migrations`, and
      `migrations/scripts/migrate-v2.6-to-v2.7.ts --dry-run` run against a copy
      of this repo at f4a6ab0 reports the 117 files it would mark and changes
      nothing.

**Non-Goals:**

- Moving any file or folder. No `docs/wiki/`.
- A shared lint package, a rendered HTML surface, a navigation CLI, nested
  cycles. All listed as phase-two questions in the proposal.
- Replacing npm/pnpm/uv. Bun is added for `docs/*.ts` only.
- Linting `dist/`, `plugins/`, `CHANGELOG.md`, or root `AGENTS.md` beyond the
  link check the unlinted-links pass already gives.

## Approach Summary

**Port, don't rewrite; codemod, don't hand-edit; this repo first, payload
last.**

The lint arrives in three layers that mirror agent-cli-conformance exactly:

| Layer                 | Source                                         | Here                                  | Scope                                                                                                             |
| --------------------- | ---------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Core                  | `scripts/docs-lint/index.ts` (+ test)          | `scripts/docs-lint/index.ts` verbatim | frontmatter parse, links/anchors, `related`, orphans from `index.md`, backlinks, `--json`                         |
| Graph tier (durable)  | `docs/wiki/lint.ts`, cut down                  | `docs/lint.ts` → `graphTier()`        | `runDocsLint` over `docs/` with `nonPageDirs` = every workbench folder; types = durable types; catalog hook check |
| Thin tier (workbench) | `docs/lint.ts` (artifact lint)                 | `docs/lint.ts` → `thinTier()`         | folder `SPEC` table: required fields, per-type `lifecycle` vocabulary, `generated` shape, links/anchors           |
| Everything else       | `scripts/docs-lint/unlinted-links.ts` (+ test) | same, lists edited                    | links/anchors on every git-tracked `.md` not covered above (root `AGENTS.md`, READMEs, `plugins/**`)              |

One entry point, `docs/lint.ts`, runs all three and adds two modes: `--json`
(graph) and `--report` (missing-field worklist grouped by field and folder, exit
0). `docs/SCHEMA.md` is the human contract; the lint's `SPEC` table is the
machine copy, and a test asserts the two agree.

The **backfill** is a migration script, not a docs tool: it lives in the
plugin's migration system at
`plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.6-to-v2.7.ts`,
beside the four existing `migrate-v2.x-to-v2.y.sh` scripts, and is invoked the
way they are
(`bun "${SKILL_DIR}/migrations/scripts/migrate-v2.6-to-v2.7.ts" --dry-run`). A
new project has nothing to backfill, so the payload never ships it; this repo
runs it from the plugin path, which is the dogfood the scaffold-update-checklist
prescribes ("apply the migration to this repo's own docs"). It inserts
frontmatter derived from what is already knowable — folder → `type`, H1 →
`title`, bold `**Status:**` → `lifecycle` via a fixed map, bold `**Created:**`
or first git commit → `generated.at`, `unknown` → `generated.by` — and never
guesses `description`. The lint's `--report` then becomes the worklist for the
fields only a reader can fill. Downstream projects get the same mechanical pass
by running the `v2.6-to-v2.7` migration.

A root **`.project-docs.json`** holds the three things the tooling would
otherwise hardcode: where the docs are (`docsRoot`), which scaffold version they
are on (`version`), and which folders belong to which lint tier (`lint`).
Nothing else goes in until a consumer exists. Release-please bumps `version` as
a second `extra-files` entry beside the `docs/README.md` marker, which stays for
one release so `update-project-docs` can read either.

Ordering follows the proposal's dogfood rule (this repo first, payload last) and
satisfies the scaffold-update-checklist's "cookiecutter is the source of truth"
rule at the end: Phase 6 copies the settled versions into the payload and the
migration guide, and Phase 7's cold read verifies the mirror.

## Phases

### Phase 0: Toolchain — Bun beside npm

**Goal:** `bun test` and `bun docs/lint.ts` can run here, and the pre-commit
hook and a CI job will run them, before any lint code exists.

**Key Changes:**

- Add to `package.json` `scripts`:

  ```json
  "docs:lint": "bun docs/lint.ts",
  "docs:graph": "bun docs/lint.ts --json",
  "docs:report": "bun docs/lint.ts --report",

  "test": "bun test",
  "check": "npm run format:check && npm run docs:lint && npm run test"
  ```

- Create `tsconfig.json` (copy agent-cli-conformance's;
  `"types": ["bun-types"]`, `strict: true`, `noEmit`). Add `bun-types` as a
  devDependency via `bun add -d bun-types` (this creates `bun.lock`; keep
  `pnpm-lock.yaml` for the Node side — document the split in root `AGENTS.md` →
  `## Development Commands`).
- `.husky/pre-commit`: replace the single line with `npm run check`. Note: this
  makes every commit run the lint; the lint must be fast (it is — file walk +
  regex).
- Create `.github/workflows/docs-check.yml`: on `push` and `pull_request`,
  `oven-sh/setup-bun@v2` (pin `bun-version: 1.4.0` to match
  agent-cli-conformance), `actions/setup-node@v4`, `npm ci`, `npm run check`.
  This is the repo's first non-release workflow.
- `.gitignore`: nothing new (Bun writes no build output for scripts).
- Placeholder `docs/lint.ts` that prints `docs-lint: no checks yet` and exits 0,
  so `check` is green from this commit onward.

**Validation:**

- [ ] `bun --version` ≥ 1.4; `npm run check` exits 0 with the placeholder.
- [ ] A commit triggers the hook and it completes in < 5 s.
- [ ] The workflow file is valid YAML (`act -n` or a push to the branch).

**Dependencies:** none. Commit: `chore: add Bun toolchain for docs lint`.

---

### Phase 1: Port the lint core and the unlinted-links pass

**Goal:** the portable, tested core exists here unchanged, and every git-tracked
`.md` outside `docs/` already has its links checked.

**Key Changes:**

- Copy verbatim from `agent-cli-conformance` at a recorded commit (put the SHA
  in a header comment):
  - `scripts/docs-lint/index.ts` → `scripts/docs-lint/index.ts`
  - `scripts/docs-lint/index.test.ts` → `scripts/docs-lint/index.test.ts`
  - `scripts/docs-lint/unlinted-links.ts` (+ `.test.ts`) → same paths
- In `unlinted-links.ts` edit the two lists: `ALREADY_LINTED = ["docs/"]` (this
  repo's `docs/lint.ts` will cover all of `docs/`),
  `GENERATED = {"CHANGELOG.md"}`. Add `dist/` and
  `{{cookiecutter.project_slug}}/` to the ignore set — `dist/` is a build
  product and the payload is checked separately in Phase 6 (its relative links
  resolve against a different root).
- Do **not** port `version-literals.ts` (release-please markers differ here and
  the check is a nice-to-have) or `documented-report-fields.ts` (bound to
  agent-cli-conformance's `src/`). Do not port `docs/wiki/build.ts`.
- Wire `unlintedLinkProblems(REPO_ROOT)` into the placeholder `docs/lint.ts` and
  print problems.

**Validation:**

- [ ] `bun test` passes: `index.test.ts` and `unlinted-links.test.ts` green,
      zero edits to `index.ts`.
- [ ] `bun docs/lint.ts` reports the real broken links in `plugins/**` and root
      files (expect a handful; fix them in the same commit or record them in
      `docs/backlog/`).

**Dependencies:** Phase 0. Commits:
`chore(docs-lint): port core from agent-cli-conformance@<sha>`, then
`fix: repair links found by docs-lint`.

---

### Phase 2: The contract and the two tiers

**Goal:** `docs/SCHEMA.md` states the schema, tiers and vocabularies;
`docs/lint.ts` enforces them; a test proves the two agree.

**Key Changes:**

- **`docs/SCHEMA.md`** — salvage from
  `git show feat/knowledge-wiki-layer:docs/wiki/SCHEMA.md`: keep
  `## What this wiki is` (retitled "What this layer is"), `## The two tracks`,
  `## Frontmatter — every page`, `## Hard rules`, `## The maintenance contract`,
  `## Verification bar`. **Replace** `## Layout` with the current `docs/` tree
  annotated by tier. **Add** `## Tiers` (the table from the proposal §2),
  `## Lifecycle by type` (the table from the proposal §3, as a markdown table
  the lint parses — one row per `type`, cells:
  `type | lifecycle values | tier | folder`), and `## The cycle` (shape and
  rules). Frontmatter example uses `generated: { by, at }` and OKF 0.2 section
  numbers (§4.1, §5.2, §5.4).
- **`docs/index.md`** — catalog seeded with the six durable folders' pages
  (today: one lesson, 26 memories; the rest are READMEs). Format: one line per
  page, `- [title](path) — description`, grouped by folder heading.
- **`.project-docs.json`** at the repo root:
  ```json
  {
    "docsRoot": "docs",
    "version": "6.3.0",
    "lint": {
      "durable": [
        "architecture",
        "specifications",
        "interaction-design",
        "playbooks",
        "lessons-learned",
        "memories"
      ],
      "workbench": [
        "backlog",
        "briefs",
        "investigations",
        "projects",
        "reports",
        "fragments",
        "cycles"
      ],
      "skip": ["_archive", "superpowers"]
    }
  }
  ```
  `scripts/docs-lint/config.ts` exports `loadConfig(repoRoot)` with those
  defaults when the file is absent, so the lint runs on a pre-config project.
  Add the file to `release-please-config.json` `extra-files` as
  `{ "type": "json", "path": ".project-docs.json", "jsonpath": "$.version" }`.
- **`docs/lint.ts`** — the real entry point, reading `loadConfig()` for the root
  and the folder lists (the constants below are the defaults, not hardcoded
  paths):
  - `const DURABLE = ["architecture","specifications","interaction-design","playbooks","lessons-learned","memories"]`
  - `const WORKBENCH = ["backlog","briefs","investigations","projects","reports","fragments","cycles"]`
  - `const SKIP = ["_archive","superpowers","TEMPLATES"]` plus any file matching
    `/TEMPLATE/i` or named `README.md`.
  - `graphTier()`:
    `runDocsLint({ root: "docs", types: DURABLE_TYPES, nonPageDirs: [...WORKBENCH, ...SKIP], dateField: "generated" })`
    plus the `hookChecks`/`catalogEntries` pair lifted from `docs/wiki/lint.ts`
    (lines ~646–702 in the source) so every catalog line's hook equals the
    page's `description`.
  - `thinTier()`: modelled on agent-cli-conformance `docs/lint.ts` lines 49–225.
    A `SPEC` table keyed by folder → `{ types, lifecycle, required, optional }`.
    For `projects/`, type is decided by filename: `proposal.md` → `proposal`,
    `plan.md` → `plan`, `design-resolution.md` → `design-resolution`,
    `test-plan.md` → `test-plan`, `sessions/*.md` → `session`, `artifacts/**` →
    `artifact`, `DEV_KICKOFF.md` → `handoff`. `session`, `report`, `artifact`
    **must not** carry `lifecycle` (frozen records). Enforce
    `OKF_STATUS = ["draft","stable","deprecated"]`, `generated: { by, at }`
    shape, `YYYY-MM-DD` dates, kebab tags, `UNKNOWN FIELD` for keys outside
    required ∪ optional ∪ `{related, after, scope, started, appetite}`.
  - `schemaTableChecks()`: parse `## Lifecycle by type` from `SCHEMA.md` and
    fail if it disagrees with `SPEC` (types, values, tier) — the
    `requiredSectionsFromSchema` pattern from the source, applied to vocabulary
    instead of sections.
  - Modes: default (lint, exit 1 on problems), `--json` (core graph plus a
    `workbench` array of thin-tier nodes with `type`, `lifecycle`, `path`),
    `--report` (group `MISSING <field>` problems by field then folder, print
    counts and paths, exit 0).
- **`docs/lint.test.ts`** — temp-dir fixtures for: a proposal with a bad
  `lifecycle`; a session carrying `lifecycle` (must fail); a durable page not in
  `index.md` (orphan); a catalog hook that drifts from `description`; a
  `SCHEMA.md` table that disagrees with `SPEC`; `--report` output shape.

**Validation:**

- [ ] `bun test` green including `docs/lint.test.ts`.
- [ ] `bun docs/lint.ts` on the real tree fails with exactly the expected class
      of problems: `MISSING FRONTMATTER` on ~117 files and nothing else (no
      false positives on READMEs, templates, `_archive/`, `superpowers/`).
- [ ] `bun docs/lint.ts --report` prints the 117 grouped by folder.

**Settled during the phase, differing from the sketch above:**

- **`lint.adopting`** joins the config. The graph tier cannot pass until Phase 4
  catalogs the corpus, so enforcing from Phase 2 would leave the pre-commit hook
  red for three phases and train the `--no-verify` habit that removes it. The
  flag reports and exits 0, says so on every run, and is what every adopting
  project needs for the length of its own backfill — not a hack for this branch.
- **Two seams in the ported core**, both generalizations rather than
  adaptations, both flagged for upstream: `skipFiles` (a TEMPLATE's links are
  placeholders by construction, so it cannot be exempted by a rule that still
  checks links) and `isContractPage` (the source hardcodes
  `SCHEMA.md`/`STYLE.md` in a file whose header calls root and vocabulary
  per-library parameters; a scaffold where every folder carries a README cannot
  express itself in two filenames).
- **`--json` emits the library graph only.** The plan wanted a `workbench` array
  appended; `runDocsLint` prints its JSON directly, and capturing its stdout to
  add a key is worse than not having the key. Workbench state is what `--report`
  is for.
- **The thin tier does not require `tags`.** A library page is found by tag; a
  workbench document by its date and its folder README. Requiring four keywords
  on forty-four session notes buys a tag cloud nobody reads.
- **`PROJECT_MANIFESTO.md` and `PROJECT-SUMMARY.md` are graph-tier pages**
  (`type: manifesto`, `type: summary`), catalogued in `index.md`. `README.md`,
  `AGENTS.md` and `CLAUDE.md` are contract pages: links checked, no frontmatter.
  This closes the plan's open question about the summary.
- **`lint.exclude`** joins the config: path globs for `.md` files that are not
  documentation. The first run found the case — two slide-deck prototypes whose
  frontmatter belongs to Slidev and Marp.
- **Every tier function takes a `Ctx`** rather than closing over this repo's
  paths, which is what makes the fixture tests possible and what lets the same
  file ship in the payload.

**Dependencies:** Phase 1. Commit:
`feat(docs-lint): schema contract, graph and thin tiers`.

---

### Phase 3: Templates, the `cycles/` folder, and the first cycle

**Goal:** every template emits conformant frontmatter for its type; the `cycle`
type exists; the cycle for this work is open.

**Key Changes:**

- Add a frontmatter block to each of the 17 templates under `docs/` (see the
  inventory in the analysis: 11 category `TEMPLATE*.md` + 6 under
  `docs/projects/TEMPLATES/`). Each block: `type`, `title: [Title]`,
  `description:`, `tags: []`, `status: draft`, `lifecycle: <opening value>`
  where the type has one,
  `generated: { by: <author-or-model>, at: YYYY-MM-DD }`. Remove the bold
  `**Status:** … **Created:** … **Author:**` line from the templates that have
  it (PROPOSAL, PLAN, investigation, report, brief, SESSION) — the H1 plus
  frontmatter carry it now.
- The lint must skip templates (`/TEMPLATE/i`) — already in Phase 2 — but a
  **template test** in `docs/lint.test.ts` renders each template with its
  placeholders substituted and asserts the result passes the thin or graph tier.
  That is what keeps templates honest.
- Create `docs/cycles/README.md` (purpose; scope-bound not time-boxed; at most
  one `active`; index over features, never a container; what closes one),
  `docs/cycles/TEMPLATE.md` (the frontmatter from the proposal §3 and the four
  body sections: Why now · Scope · Outcome · Sessions), and
  `docs/cycles/2026-09-okf-frontmatter-layer.md` with `lifecycle: active` and
  `scope: [project/okf-frontmatter-layer]`.
- Add `cycles` to the thin tier `SPEC` with
  `lifecycle: [planned, active, closed, abandoned]`, required `scope`, optional
  `after`, `appetite`, `started`, `closed`. Add a check: **at most one `active`
  cycle**.
- `docs/README.md`: add `#### /cycles` under `### Work Tracking` (line ~106);
  add cycles to the decision flowchart and Quick Reference in
  `## Choosing the Right Document Type`; add a `## Frontmatter` section that
  points at `SCHEMA.md`. `docs/projects/README.md`: a short "Projects and
  cycles" subsection under `## Purpose` explaining the split (project = topical
  feature record; cycle = what is in play), and replace the bold-status guidance
  in `### Proposals` with `lifecycle`.
- `docs/PROJECT_MANIFESTO.md` line 127: reword "Not a project management tool"
  to "Records scope and state, not people or dates" with a sentence on cycles;
  line 122 "Not a wiki or knowledge base": keep, but add that the docs carry a
  machine-readable graph layer (this is still not a hosted wiki).

**Validation:**

- [ ] Template test green for all 18 templates (17 + cycle).
- [ ] `bun docs/lint.ts` reports the active cycle as valid; adding a second
      `lifecycle: active` cycle fails.
- [ ] `docs/README.md` flowchart mentions cycles once and points to `SCHEMA.md`
      once.

**Dependencies:** Phase 2. Commit:
`feat(docs): frontmatter templates, cycles folder, first cycle`.

---

### Phase 4: Codemod backfill, then lint-driven batches

**Goal:** all 117 existing documents carry frontmatter; the mechanical part is a
script with tests; the human part is worked from `--report`.

**Key Changes:**

- **`plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.6-to-v2.7.ts`**
  — self-contained Bun script (no imports from the target project; it carries
  its own copy of the folder → `type` table and a copy of `loadConfig`'s
  defaults). It reads `.project-docs.json` for `docsRoot` and creates the file
  with defaults if absent — the config's own backfill. Its test lives in this
  repo's tooling, not the plugin:
  `scripts/docs-lint/migrate-v2.6-to-v2.7.test.ts`, which also imports the table
  exported by `docs/lint.ts` and asserts the two copies are equal, so the
  duplication cannot drift. Header comment follows the existing migration
  scripts (usage, flags, "run from your project root"). Behaviour:
  - Walk the same set the thin and graph tiers walk; skip any file that already
    has a frontmatter block.
  - Derive: `type` from folder/filename (reuse the Phase 2 mapping — export it
    from `docs/lint.ts` so there is one source); `title` from the first `# H1`
    (strip a leading "Investigation: " / "Proposal: " label only when the type
    already says so); `lifecycle` from a bold `**Status:** X` line via
    `STATUS_MAP = { Draft: "draft", "Under Review": "draft", Approved: "approved", "Approved (in flight)": "approved", "Approved (shipped)": "implemented", Completed: "implemented", Concluded: "concluded", Active: "active", Superseded: "superseded", Rejected: "withdrawn" }`
    — unmapped values are **not** written and are logged; `generated.at` from a
    bold `**Created:** YYYY-MM-DD` or `**Date Started:**` line, else the file's
    first commit date via `git log --diff-filter=A --format=%as -1 -- <file>`;
    `generated.by: unknown`; `tags` from a bold `**Tags:**` line if present
    (lessons-learned already has one); `status: stable`.
  - Never write `description`. Never write `lifecycle` for frozen types.
  - Remove the bold metadata line it consumed; leave everything else
    byte-identical.
  - `--dry-run` (default) prints a per-file diff summary; `--write` applies.
    Prettier runs afterward (`npm run format`), so the script need not wrap.
  - Tests: fixtures copied from five real files of different types into a temp
    dir; assert the frontmatter produced, the removed line, and that an
    already-marked file is untouched.
- **Run it** from this repo's root:
  `bun plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.6-to-v2.7.ts --write && npm run format`;
  commit as one mechanical commit so the human edits are reviewable separately.
- **Batches** from `bun docs/lint.ts --report`, one commit per batch: 0. **The
  32 broken links Phase 2's first run found**, which `--report` does not track
  (a broken link is a defect to fix, not a blank to fill). Three classes:
  targets that moved into `_archive/` when their project was archived — the
  failure
  `docs/backlog/2026-09-02-sweep-project-archive-internal-link-exception.md`
  already describes; links to
  `plugins/toolbox/skills/{grapevine,tuskboard,digestify}/SKILL.md`, extracted
  to the spellbook repo; and wrong-depth paths written as `docs/projects/…` or
  `./docs/projects/…` from inside `docs/memories/`. Plus four missing
  `preview_00N.png` in the moodboard investigation.
  1. `description` for the 26 memories and 1 lesson (graph tier needs the
     catalog hook) — the `MEMORY.md`-style one-liners already exist in
     `docs/memories/README.md` or the file's first sentence; lift them.
  2. `description` + `lifecycle` for the 23 proposals — **the honesty pass**:
     read each proposal's actual state against the tree and mark `deferred`
     (most), `implemented` (recipes-plugin-consolidation,
     spellbook-extraction-cleanup, sweep-project, grapevine-v1.6.7 …),
     `approved` (only what is really in play), `superseded` (grapevine →
     grapevine-v1.6 → v1.6.7 chain), `withdrawn` where the folder has sessions
     but no proposal and the work is done — for those seven proposal-less
     folders, add a minimal `proposal.md` with `lifecycle: implemented` and a
     two-line overview pointing at the sessions.
  3. `description` for briefs, investigations, backlog, reports, plans.
  4. `related` where a document already links its sources in a "Related
     Documents" footer — convert the first three to `related:` keys
     (`type/slug`); keep the footer.
  5. Sessions and artifacts: `description` only (one line each — 60 files; allow
     a two-sentence summary derived from the H1 + Context paragraph).
- Populate `docs/index.md` with `bun docs/lint.ts --write` (port the catalog
  regeneration for the durable folders only; hooks come from `description`).

**Validation:**

- [ ] `bun test` green for the backfill.
- [ ] After `--write`: `git diff --stat` touches only `.md` files under `docs/`;
      `bun docs/lint.ts --report` shows only `description`, `lifecycle` (for
      unmapped statuses) and `related` as missing.
- [ ] After batches: `bun docs/lint.ts` exits 0; `--report` prints zero;
      `grep -rl '^\*\*Status:\*\*' docs --include='*.md' | grep -v TEMPLATE`
      returns nothing.
- [ ] `--json` shows every durable page `reachable: true`.

**Dependencies:** Phase 3. Commits:
`chore(docs): mechanical frontmatter backfill`, then
`docs: backfill batch N — <what>`.

---

### Phase 5: Skills, command, plugin version, dist

**Goal:** the project-docs plugin emits and respects the layer.

**Key Changes** (all under `plugins/project-docs/`; follow
`.claude/skills/scaffold-update-checklist/SKILL.md` → "Adding or Modifying a
Plugin Skill"):

- `commands/init-branch.md` → `### Step 4: Create Branch`: after choosing the
  branch name, list `docs/cycles/*.md` with `lifecycle: active`; if one exists,
  confirm the branch belongs to it and append the branch name to the cycle's
  `Sessions` section as `- <branch> (open)`. Add `cycle/` is **not** a branch
  type (a cycle spans branches).
- `skills/finalize-branch/SKILL.md`:
  - `### Step 3: Run Quality Tools` (line ~230): add `npm run docs:lint` as a
    mandatory check when `docs/lint.ts` exists.
  - `### Step 4: Create Session Document` (242): the session template now has
    frontmatter; fill `generated`, `tags`,
    `related: [project/<name>, cycle/<slug>]`.
  - `### Step 6: Assess Additional Documentation` (262): add "update the active
    cycle": move the branch line from `(open)` to `(landed <date>)`, and if the
    cycle's `scope` is exhausted, prompt to close it (write Outcome, set
    `lifecycle: closed`, `closed: <date>`). Replace the current per-branch "is
    the project done?" prompt with "is the cycle done?"; the project-level
    question moves to `sweep-project`.
- `skills/sweep-project/SKILL.md`:
  - `### Step 0`: accept a cycle slug as well as a project name.
  - `### Step 2: Reconcile` (155): read `lifecycle` from `proposal.md` and
    `plan.md` frontmatter instead of the bold line; reconciliation sets
    `lifecycle` (`implemented` / `deferred` / `withdrawn`) **first**.
  - `### Step 5b: Archive` (493): the move to `_archive/` is optional once
    `lifecycle` is terminal; default to move only when the human confirms, and
    never move a project referenced by an `active` cycle's `scope`.
  - New `### Step 2b: Sweep a cycle`: verify every `scope` entry has a terminal
    `lifecycle`, then close the cycle.
- `skills/create-project/SKILL.md` `### Step 3`, `skills/create-investigation`
  item 5, `skills/generate-proposal` item 6, `skills/generate-dev-plan` item 5:
  "the template's frontmatter block is filled, not left as placeholders":
  `title`, `description`, `generated`, `tags`, `related` to the source
  investigation/brief; `lifecycle` at its opening value. Each skill ends with
  `npm run docs:lint` if present.
- `skills/update-project-docs/`:
  - New migration guide `migrations/v2.6-to-v2.7.md` using the skeleton at
    `SKILL.md` → `## Creating New Migration Guides`: What's New (frontmatter,
    `SCHEMA.md`, `index.md`, `cycles/`, `docs/lint.ts`, `package.json` scripts,
    Bun), Step-by-Step (copy `docs/SCHEMA.md`, `docs/lint.ts`,
    `scripts/docs-lint/`, `docs/cycles/`, the templates and `package.json`
    scripts from the scaffold;
    `bun "${SKILL_DIR}/migrations/scripts/migrate-v2.6-to-v2.7.ts" --dry-run`
    then without the flag; work `--report`; open a cycle). Use the
    `migration-authoring` skill (`.claude/skills/migration-authoring/`) so every
    step is agent-executable, as `## Creating New Migration Guides` requires,
    Verification (`bun docs/lint.ts` exits 0), Checklist.
  - Add the row to `## Available Migrations` (lines 139–146).
  - `### Step 1: Detect Current Version`: read `.project-docs.json` `version`
    first, fall back to the `docs/README.md` marker;
    `### Step 5: Update Version Marker`: write both.
  - **Docs-root wording pass** across `plugins/project-docs/`: every skill and
    command that says `docs/` as a path assumption gains one sentence — "the
    docs root is `docsRoot` in `.project-docs.json`, default `docs/`" — in its
    first step that touches the tree.
    `grep -rln 'docs/' plugins/project-docs/skills plugins/project-docs/commands`
    is the worklist; do not rewrite paths in examples.
  - `## Root-Level Conventions`: no change to the two shipped conventions; but
    `### Step 6: Ensure Root-Level Agent Context` should mention `SCHEMA.md` in
    the docs-structure pointer text it emits — that is a change to a shipped
    convention, so update the pointer subsection in the **same commit**
    (checklist rule (d)).
- `plugins/project-docs/.claude-plugin/plugin.json`: `3.6.0` → `3.7.0` (minor:
  behavioural). `plugins/project-docs/README.md`: Skills table descriptions
  where changed, and a `### 3.7.0 (<date>)` entry under `## Version History`
  (line ~280). `docs/PROJECT_MANIFESTO.md`: skill count unchanged (no new
  skill), command count unchanged.
- `npm run format && ./scripts/build-skills-dist.sh` — commit `dist/`.

**Validation:**

- [ ] `ls plugins/project-docs/skills/ | wc -l` unchanged (27);
      `diff -r     plugins/project-docs/skills dist/project-docs/skills` shows
      only the documented frontmatter normalizations.
- [ ] Dry-run each modified skill against this repo by reading it cold and
      following it once (the checklist's cold-read verification), on a scratch
      branch: `init-branch` finds the active cycle; `finalize-branch` writes a
      session with frontmatter and moves the branch line in the cycle.
- [ ] `npm run check` green.

**Dependencies:** Phase 4 (skills must be written against real, linted
documents). Commit:
`feat(project-docs): frontmatter-aware skills, cycle touchpoints (3.7.0)`.

---

### Phase 6: Cookiecutter payload

**Goal:** a freshly scaffolded project has the layer and passes its own lint.

**Key Changes** (checklist: "cookiecutter is the source of truth" — this phase
makes the payload match what Phases 2–4 settled):

- Copy into `{{cookiecutter.project_slug}}/`: `docs/SCHEMA.md`, `docs/index.md`
  (seeded with the payload's own zero pages — just the folder headings),
  `docs/cycles/{README.md,TEMPLATE.md}`, all 17 updated templates, the updated
  `docs/README.md` and `docs/projects/README.md`, `.project-docs.json`
  (`docsRoot: "docs"`, `version` = the current `docs_version`), `docs/lint.ts`,
  `scripts/docs-lint/index.ts`, `scripts/docs-lint/config.ts`,
  `scripts/docs-lint/unlinted-links.ts` (tests optional in the payload — lean:
  ship `index.test.ts` only), a minimal `package.json`
  (`name: "{{cookiecutter.project_slug}}-docs"`, `private: true`, scripts
  `docs:lint`, `docs:graph`, `docs:report`, `test`; devDependency `bun-types`),
  `tsconfig.json`.
- The payload's `docs/lint.ts` needs no Jinja; it resolves paths from
  `import.meta.url`. Confirm no `{{ }}` sequences appear in any `.ts` file
  (cookiecutter would try to render them) — if any string literal needs braces,
  wrap the file in `{% raw %}…{% endraw %}`.
- `hooks/post_gen_project.py`: in both branches' printed next steps, add
  `bun install && bun docs/lint.ts` and one line pointing at `docs/SCHEMA.md`;
  when `install_target` is "Current directory (existing project)", add "run
  `/project-docs:update-project-docs` to mark your existing docs" — the backfill
  is the migration, not a payload script.
- `.prettierignore` line 5 stays (payload unformatted by design); note in
  `AGENTS.md` that mirror diffs are wrapping-only and the lint tolerates it.
- Root `AGENTS.md` → `### Template Structure` and `### Template Files`: add
  `SCHEMA.md`, `cycles/`, `lint.ts`; `## Development Commands`: add the Bun
  commands.

**Validation:**

- [ ] `cookiecutter . --no-input -o /tmp/cc-test && cd /tmp/cc-test/* && bun     install && bun docs/lint.ts`
      exits 0; `bun test` (if shipped) green.
- [ ] In that scaffold: create a proposal from the template, fill it, run the
      lint → passes; remove `lifecycle` → fails.
- [ ] `diff <(prettier --stdin-filepath x.md < docs/README.md) <(prettier     --stdin-filepath x.md < "{{cookiecutter.project_slug}}/docs/README.md")`
      is empty for every mirrored file — a normalized mirror check; add it as
      `scripts/check-mirror.sh` and to `npm run check`.

**Dependencies:** Phase 5. Commit:
`feat(template): ship the OKF frontmatter layer in the scaffold`.

---

### Phase 7: Close the cycle, cold read, land

**Goal:** the work closes the way it says work should close.

**Key Changes:**

- Cold-read verification (checklist): a fresh agent reads `docs/SCHEMA.md`, adds
  a memory page, updates `index.md`, runs the lint, and reports friction. Fix
  what it hits.
- Mark the two July investigations `lifecycle: concluded` with a one-line note
  that this project is their outcome; mark `knowledge-wiki-layer` brief `spent`.
  Delete `feat/knowledge-wiki-layer` after confirming nothing else on it is
  wanted (`git log develop..feat/knowledge-wiki-layer` → four commits, all
  superseded).
- Close `docs/cycles/2026-09-okf-frontmatter-layer.md`: Outcome section,
  `lifecycle: closed`, `closed: <date>`.
- `finalize-branch` per the repo's landing policy (root `AGENTS.md` →
  `## Branch Landing Policy`); the session it writes is the first one with
  frontmatter, and it lands in this project's `sessions/`.

**Validation:**

- [ ] Definition of Done, every box.
- [ ] `git branch --list 'feat/knowledge-wiki-layer'` empty.

**Dependencies:** Phases 0–6.

## Key Risks & Mitigations

- **Bun in an npm/uv repo confuses contributors and CI.** → Bun is scoped to
  `docs/*.ts` and `scripts/docs-lint/`; `npm run check` is still the single
  entry; `AGENTS.md` states the split; the workflow installs both.
- **Pre-commit gets slow or noisy.** → The lint is a file walk with regexes;
  measure in Phase 0/2 and if `npm run check` exceeds ~5 s, move `bun test` to
  CI only and keep `docs:lint` in the hook.
- **`runDocsLint`'s orphan rule fires on durable folders that are legitimately
  empty or on pages nobody links yet.** → The catalog (`index.md`) is the
  reachability root; every durable page gets a catalog line in the backfill, and
  `--write` regenerates it.
- **Codemod mis-derives `lifecycle` or dates.** → Fixed `STATUS_MAP`, unmapped
  values skipped and logged; `--dry-run` default; one mechanical commit reviewed
  as a diff before any human batch.
- **The honesty pass on 23 proposals turns into re-litigating each project.** →
  Rule for the pass: no sessions in 60 days and no active branch → `deferred`;
  sessions exist and the proposal's scope is visibly shipped → `implemented`;
  otherwise leave `approved` and list it for Cole. Record the rule in the batch
  commit message.
- **Mirror drift is invisible because of Prettier.** → `scripts/check-mirror.sh`
  normalizes both sides through Prettier before diffing (Phase 6).
- **Cookiecutter renders `{{` in TypeScript.** → grep for `{{`/`{%` in shipped
  `.ts`; wrap in `{% raw %}` if found; the Phase 6 scaffold smoke test catches
  it.
- **A migration script now needs Bun where earlier ones needed bash.** → The
  guide states Bun as a prerequisite up front and keeps a manual fallback (the
  frontmatter block per type, copy-by-hand); `dist/` ships the script unchanged
  because `build-skills-dist.sh` copies `skills/` recursively.
- **Skill edits drift from the checklist.** → Phase 5 follows the checklist's
  own section order and ends with the count checks and dist rebuild it
  prescribes.

## Testing & Validation Strategy

- **Unit (bun test):** the ported core tests (1,711 lines, temp-dir corpora) run
  unchanged; new `docs/lint.test.ts` covers tiers, the schema/`SPEC` agreement,
  one-active-cycle, `--report`; `scripts/docs-lint/migrate-v2.6-to-v2.7.test.ts`
  covers derivation and idempotence; the template test renders every template.
- **Integration:** `bun docs/lint.ts` on the real tree at the end of each phase,
  with the expected problem class stated in the phase's validation.
- **Scaffold smoke test:** Phase 6's `cookiecutter --no-input` run.
- **Manual / cold read:** Phase 5's skill dry-runs and Phase 7's fresh-agent
  read of `SCHEMA.md`.
- **Regression:** deliberately break a link, an anchor, a `lifecycle`, a
  `status`, and add a second active cycle; each must fail with a path.

## Assumptions & Constraints

**Assumptions:**

- Bun ≥ 1.4 is available locally and installable in CI via `oven-sh/setup-bun`.
- agent-cli-conformance's `scripts/docs-lint/index.ts` at the recorded SHA is
  MIT-licensed and can be copied with a header attribution.
- Prettier's markdown formatter leaves YAML frontmatter valid (it does; it
  formats it as YAML).
- The 117 documents counted on 2026-09-03 are the backfill set; new documents
  written during this branch use the templates and need no backfill.

**Constraints:**

- No file moves (proposal). No shared package (Cole, 2026-09-03).
- `status` vocabulary is OKF's three values, never widened.
- The scaffold-update-checklist governs Phases 3, 5, 6: templates and READMEs
  change in both trees, the plugin version bumps once (3.7.0), `dist/` is
  rebuilt after skill edits, Prettier runs before the build.
- The pre-commit hook is the only local enforcement; the new workflow is the
  only remote one.

## Open Questions

- **`generated.by` for backfilled documents** — `unknown` (OKF-legal, honest) or
  the backfilling model id? Plan assumes `unknown`; change `STATUS_MAP`'s
  neighbour constant if Cole prefers the model.
- **Do sessions get `related: [cycle/<slug>]` retroactively?** Plan: no; only
  sessions written after Phase 5 carry it. Old sessions relate to their project
  only.
- **Should `fragments/` be thin-tier or skipped?** It is empty here; plan treats
  it as thin-tier (type `fragment`, lifecycle `open | promoted | dropped` like
  backlog). Confirm when the first fragment appears.
- **When does the `docs/README.md` version marker go away?** Plan: keep it for
  this release; remove in the next migration once every consumer reads
  `.project-docs.json`.
- ~~**An artifact whose frontmatter belongs to another tool.**~~ Resolved
  2026-09-03 (Cole): `lint.exclude` in `.project-docs.json` takes path globs for
  `.md` files that are not documentation, and this repo excludes the two
  slide-deck prototypes. A Slidev deck is a program that happens to be Markdown;
  widening the schema until its `theme` and `paginate` fit would be describing
  it wrongly to keep a gate quiet. Kept distinct from `lint.skip`, which names
  directories and prunes subtrees. A per-file `<!-- docs-lint: skip -->` marker
  would be self-documenting where a root-level list is not, but two mechanisms
  for one problem is one too many until a case needs it.
- **Ship tests in the payload?** Lean: `index.test.ts` only, so a scaffolded
  project's `bun test` is meaningful without carrying this repo's fixtures.
- ~~**Does `docs/PROJECT-SUMMARY.md` get frontmatter?**~~ Resolved in Phase 2:
  `type: summary`, graph tier, no lifecycle, catalogued beside the manifesto.

---

**Related Documents:**

- [Proposal](./proposal.md)
- [Work-cycle taxonomy investigation](../../investigations/2026-09-03-work-cycle-taxonomy-landscape-investigation.md)
- [Wiki structure & OKF schema investigation](../../investigations/2026-07-23-wiki-structure-and-okf-schema-investigation.md)
- [Wiki tooling boundary investigation](../../investigations/2026-07-23-wiki-tooling-boundary-investigation.md)
- [scaffold-update-checklist](../../../.claude/skills/scaffold-update-checklist/SKILL.md)
- [update-project-docs migrations](../../../plugins/project-docs/skills/update-project-docs/migrations/)
- [OKF 0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- Sessions: `./sessions/` (created during implementation)

---

## Implementation Notes

- Source of the port: `agent-cli-conformance` — record the commit SHA in the
  header of each copied file at Phase 1.
- Salvage source for `SCHEMA.md`:
  `git show feat/knowledge-wiki-layer:docs/wiki/SCHEMA.md` (sections listed in
  Phase 2); the branch's adoption guide
  (`git show feat/knowledge-wiki-layer:docs/projects/knowledge-wiki-layer/adoption-guide.md`)
  feeds the `v2.6-to-v2.7` migration guide's Step-by-Step section.
