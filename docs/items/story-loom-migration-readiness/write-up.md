---
type: write-up
title: What story-loom's v3.0 migration will ask for
description:
  "Each class of preflight stop and verify problem a trial run on story-loom
  hits, with counts, examples and a proposed owner: the migration, or story-loom
  before or after its run."
tags: [migrations, story-loom]
status: draft
generated: { by: claude-opus-5-5, at: 2026-09-27 }
---

# What story-loom's v3.0 migration will ask for

**Outcome:** Work items to file. The proposed migration changes are listed under
[Proposed migration items](#proposed-migration-items). None is filed yet.

---

## Question

Which of the problems the v2.10→v3.0 migration hits on story-loom should the
migration handle? Which should story-loom fix before or after its run? The
answer decides what gets filed against the migration and what story-loom's agent
is told before its real run.

## Headline

| Stage                                   | Earlier trial (`a76f31ca`) | This trial (`d90a732f`) |
| --------------------------------------- | -------------------------- | ----------------------- |
| v2.9→v2.10                              | exit 0                     | exit 0, clean           |
| v2.10→v3.0 preflight judgment steps     | 19                         | **20**                  |
| v2.10→v3.0 phase 10 verify problems     | 288                        | **279**                 |
| … of which phase 10 suggests a fix for  | not recorded               | 93                      |
| `prettier --check` failures after a run | not measured               | **231** (0 before)      |

- **+1 preflight step:**
  `reports/2026-09-27-mcp-surface-closing-cold-read-report.md` landed after
  `a76f31ca`. There are 7 report steps, not 6.
- **−9 verify problems:** the only `docs/` changes between the two commits are
  additions (9 files). The difference therefore comes from how each trial
  resolved its preflight steps. The earlier resolution was not recorded, so the
  9 cannot be attributed.
- **All 235 `MISSING FILE` were broken before the run.** Linting the pre-run
  tree with `_archive` removed from `lint.skip` (v2.10 CLI) reports the
  same 235. The migration breaks no link. It exposes the archives, which were
  never linted.
- **The migration completes.** With the resolutions below applied, the re-run
  exits 0 at scaffold 9.0.1 (`pdocs check` clean).

## Preflight judgment steps (20)

| Class                              | Count | Examples                                                                                                                                                                                                       | Cause                                                                                                                                                                                                                              | Proposed owner                                                                                                                                                                                                                                                                                                                                             | Effort / risk                                                                                                                                                                   |
| ---------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slug clash                         | 1     | `projects/_archive/storyline-engine/` (holds only `legacy-experience-engine-proposal.md`) vs `projects/storyline-engine/`                                                                                      | Two project folders would become one entity slug                                                                                                                                                                                   | **(b) before.** Rename the archived folder to `projects/_archive/legacy-experience-engine/` and fix 2 links, in `storyline-engine/README.md` and `storyline-engine-proposal.md`.                                                                                                                                                                           | 5 min. The folder name matches its only document.                                                                                                                               |
| Process reports, no owner          | 4     | `reports/2026-05-20-doc-status-report.md`, `reports/2026-05-20-project-summary-report.md`, `reports/2026-07-29-…`, `reports/2026-09-14-project-summary-report.md`                                              | Nothing links them to an investigation. They are evidence for no work (D24).                                                                                                                                                       | **(b) before.** Fold anything still true into the page it concerns, then delete. Fix the one inbound link, the discovery-notes footer in `PROJECT-SUMMARY.md`.                                                                                                                                                                                             | 15 min. `doc-status-report.md` records the 2026-05-20 re-scope of storyline-engine; that is already in the README and proposal.                                                 |
| Work reports, no owner             | 2     | `reports/2026-09-26-mcp-surface-cold-read-report.md`, `reports/2026-09-27-mcp-surface-closing-cold-read-report.md`                                                                                             | They belong to the agent's-view cycle, which is a project folder (`projects/agent-view-of-the-library/`), not an investigation                                                                                                     | **(b) before.** Move both to `projects/agent-view-of-the-library/reports/` with `type: artifact`. Fix 15 links (the backlog items, the cycle, the plan, 2 sessions, `naming.md`, and the reports' own outbound links). The run makes them `report` again.                                                                                                  | 20 min. Mechanical. The v2.10 `pdocs check` confirms it.                                                                                                                        |
| Report with 2 owners               | 1     | `reports/2026-09-25-collaborative-workspaces-and-hosted-spells-report.md` links to both `investigations/2026-09-24-agent-experience-study-investigation.md` and `…/2026-07-31-operator-as-substrate-deltas.md` | The report's own links name two investigations                                                                                                                                                                                     | **(b) before.** Choose the owner. The trial unlinked the operator-substrate mention (prose kept), so the report went to `items/agent-experience-study/reports/`.                                                                                                                                                                                           | 2 min, but it is a judgment call. It is a direction synthesis, so it could also be deleted as process or kept as a page.                                                        |
| Archived briefs                    | 5     | `briefs/_archive/2026-03-17-media-library.md`, `…/2026-03-18-engine-as-service.md`, `…/2026-03-18-new-project-decision.md`                                                                                     | `brief` has no successor type. None of the 5 has frontmatter.                                                                                                                                                                      | **(b) before.** Move 2 into `projects/_archive/media-library/artifacts/`. Move 3 (engine-as-service, new-project-decision, simplified-creation-interfaces) into `projects/_archive/legacy-experience-engine/artifacts/`, or delete them. No frontmatter edit is needed: `_archive` is still skipped by the v2.10 lint, and the run synthesizes `artifact`. | 10 min. Moving them leaves 4 links in `media-library`'s `DEV_KICKOFF.md` and `proposal.md` (2 root-relative, 2 relative) that the move record cannot follow (see MISSING FILE). |
| Non-documents in `investigations/` | 7     | `investigations/prototypes/prototype-c3-refined.html` (+5 HTML), `investigations/prototypes/vine-metrics.ts`                                                                                                   | `investigations/` is retired and the run only places `.md`. The 6 HTML files are cited by `_archive/2026-04-01-connected-pipeline-prototype-findings.md`; the `.ts` is cited by `2026-08-01-agent-team-dynamics-investigation.md`. | **(a) migration, or (b)+(c) now.** Today: move them out of `docs/` before the run, then after it into `items/_archive/connected-pipeline-prototype-findings/artifacts/` and `items/agent-team-dynamics/artifacts/`. Fix the 3 `prototype-c3-refined.html` links and the `bun docs/investigations/prototypes/vine-metrics.ts` command in the write-up.      | 10 min. Low risk: they are prototypes and a metrics script.                                                                                                                     |

## Verify problems (279) — phase 10, after the preflight is resolved

| Class                                   | Count | Examples                                                                                                                                                                                                                                                                                             | Cause                                                                                                                                                                                   | Phase 10 fixes | `--respell` | Proposed owner                                                                                                                                                                                                                                                                                                                                                                         | Effort / risk                                                                                                     |
| --------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| MISSING FILE, one level short           | 93    | `features/_archive/blueprint-editor/feature.md: ../../../projects/specifications/experience-engine/data-model.md`; `items/_archive/tts-hardening/README.md: ../../../projects/backlog/_archive/…`                                                                                                    | Folders were hand-moved into `_archive/`, so every relative link lost a level. The archives were never linted.                                                                          | **93 / 93**    | no          | **(b) before** (preferred) or **(c) after.** Apply the corrections.                                                                                                                                                                                                                                                                                                                    | Mechanical. Each suggestion was checked and all 93 landed.                                                        |
| MISSING FILE, root-relative (`docs/…`)  | 85    | `features/_archive/auth-flows/DEV_KICKOFF.md: docs/projects/auth-flows/proposal.md`; `…/blueprint-editor/DEV_KICKOFF.md: docs/specifications/experience-engine/data-model.md`                                                                                                                        | 15 `DEV_KICKOFF.md` files wrote links from the repository root. 32 resolve read that way; 44 more resolve once `_archive/` is inserted (the target was archived later); 9 are dangling. | 0              | no          | **(a) migration** should suggest the root-relative and archived-since readings. For this run, **(b)/(c)** with a script.                                                                                                                                                                                                                                                               | 76 are mechanical with the move record and an `_archive/` fallback. 9 need a hand fix (below).                    |
| MISSING FILE, relative, archived since  | 32    | `features/_archive/auth-flows/feature.md: ../../../projects/backlog/2026-03-25-auth-flows-email-templates.md` (now `backlog/_archive/…`)                                                                                                                                                             | One level short, and the target was archived after the link was written: two unrecorded moves                                                                                           | 0              | no          | **(a) migration** should add the `_archive/` reading. For this run, **(b)/(c)**.                                                                                                                                                                                                                                                                                                       | Mechanical.                                                                                                       |
| MISSING FILE, dangling                  | 25    | 18 × `projects/[_archive/]experience-engine/artifacts/{prototypes,specs}/…` (renamed to `storyline-engine/artifacts/{prototypes,research}/` by the 2026-04-10 restructure); 5 × `specifications/experience-engine/audio-tts-architecture.md` (never existed); 2 × `../../../.claude/...` placeholder | The targets were renamed, or never existed                                                                                                                                              | 0              | no          | **(c) after,** or (b) before. Retarget the 18 to `storyline-engine`. Unlink the 5 `audio-tts-architecture.md` links and the 2 placeholders, keeping the prose.                                                                                                                                                                                                                         | 15 min. Only story-loom knows the rename.                                                                         |
| MISSING FILE, caused by preflight moves | 7     | `features/_archive/media-library/DEV_KICKOFF.md: docs/briefs/2026-03-17-media-library.md`; `features/_archive/connected-creation-pipeline/plan.md: ../../../projects/investigations/prototypes/prototype-c3-refined.html`                                                                            | Links to briefs and prototypes that story-loom moved by hand; the move record does not know about them                                                                                  | 0              | no          | **(c) after.** Retarget them to the briefs' and prototypes' new homes.                                                                                                                                                                                                                                                                                                                 | 5 min.                                                                                                            |
| MISSING FILE, not a doc link            | 2     | `features/_archive/collections-tree-navigation/plan.md: file:///Users/colereed/…/useSidebarDragDrop.ts`; `features/_archive/media-library/plan.md: ./sessions/`                                                                                                                                      | A link to a local file on another machine, and to a folder that was never created                                                                                                       | 0              | no          | **(c) after.** Unlink them.                                                                                                                                                                                                                                                                                                                                                            | 2 min.                                                                                                            |
| Nested workstream plans / session       | 28    | `items/storyline-engine/workstreams/mastra-scaffolding/plan.md`: `WRONG TYPE "plan" (its position says "artifact")`, `LIFECYCLE`, `UNKNOWN FIELD "lifecycle"` (× 9 plans); `…/narrative-architect/sessions/2026-04-11-planner-context-refinements.md`: `WRONG TYPE`                                  | The v2.10 lint types `plan.md` by name anywhere in a project; 9.0.1 types by position, so only the owner's own `plan.md` and `sessions/` count. All 9 plans are `completed`.            | 0              | no          | **(a) migration** should retype a document with frontmatter whose new position says `artifact`: set `type: artifact`, drop `lifecycle`, name it. It already does this for briefs and reports. For this run, **(c) after** (10 files). It cannot be done before: the v2.10 lint expects `plan` there.                                                                                   | 5 min by script. Nothing is lost: every plan is `completed` and the README's workstream table carries the status. |
| Slidev decks linted                     | 16    | `items/storyline-engine/artifacts/storyline-engine-slides.md`, `…/artifacts/slides/context-library-gap-analysis-slides.md`: `MISSING type/description/status/generated`, `UNKNOWN FIELD "theme"`, `"colorSchema"`…                                                                                   | The run leaves `lint.exclude: docs/projects/*/artifacts/**/*-slides.md` as written (it says so under "config — for you"), so the glob matches nothing after the move                    | 0              | n/a         | **(a) migration** should respell a `docs/projects/*/…` glob into its `features/*` and `items/*` forms. For this run, **(b) before**: add `docs/features/*/artifacts/**/*-slides.md` and `docs/items/*/artifacts/**/*-slides.md` to `lint.exclude` before the run. Doing it after the stop instead makes the re-run's preflight stop on `.project-docs.json` (trial: needed `--force`). | 2 min before the run. Doing it after costs a `--force` re-run.                                                    |

**How much the existing tools fix:** phase 10 suggests 93 of 235 `MISSING FILE`
(40%). `--respell` fixes none of the 279: it rewrites paths in files outside
`docs/`, not broken links inside it. A script that reads the move record, tries
the root-relative reading, falls back to inserting `_archive/`, and knows
story-loom's `experience-engine`→`storyline-engine` rename fixed 214 links in 71
files. 13 were left for hand edits.

## After a clean check: what the commit hook will refuse

story-loom's pre-commit runs `lint-staged` (`prettier --check` on staged `*.md`,
Prettier 3.8.1) and `gate:staged`. The migrated tree has 231 `.md` files that
fail `prettier --check`; the same tree before the run has 0.

| Class                                            | Count | Example                                                                             | Cause                                                                                                                                                    | Proposed owner                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | ----- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No blank line after synthesized frontmatter      | 207   | `features/_archive/agent-role-defaults/plan.md`                                     | The run writes `---` directly above the H1                                                                                                               | **(a) migration**: emit the blank line. For this run, **(c)** `prettier --write`.                                                                                                                                                                                                                   |
| Frontmatter line wrap + blank line               | 11    | `items/_archive/agent-usable-cli-tooling/write-up.md`                               | A synthesized `description` longer than the print width                                                                                                  | **(a) migration**: write frontmatter in Prettier's shape. For this run, **(c)**.                                                                                                                                                                                                                    |
| **Checkpoint canon exposed**                     | 11    | `features/structured-context-documents/checkpoint/canon/Hollowbrook/Characters/…md` | `.prettierignore` still names `docs/projects/structured-context-documents/checkpoint/canon/`. The run respells `lint.exclude` but not `.prettierignore`. | **(b) before**: add the `docs/features/…/checkpoint/canon/` line to `.prettierignore` next to the old one. **Data risk:** the guide's post-run step 2 (`prettier --write docs/`) would rewrite byte-exact canon that `loom vault import` reads back. (a) The migration should respell ignore files. |
| Owned file not clean under story-loom's Prettier | 1     | `docs/playbooks/README.md`                                                          | The scaffold's bytes were formatted by a newer Prettier (3.9.x wraps the YAML `description` differently)                                                 | **(c) after**: `prettier --write`. The owned-file comparison ignores whitespace, so the next migration will not flag it.                                                                                                                                                                            |
| Rewritten frontmatter                            | 1     | `items/operator-as-substrate-deltas/write-up.md`                                    | A frontmatter rewrite                                                                                                                                    | **(c) after**: `prettier --write`.                                                                                                                                                                                                                                                                  |

**Correction (2026-09-28).** Re-running the synthesis on story-loom's own
source, under its `.prettierrc` (`proseWrap: preserve`), shows two rows misread.
The 11 "line wrap" files fail on Prettier's quote preference (a value holding
`"` goes in single quotes) plus the missing blank line; nothing needs wrapping.
The "rewritten frontmatter" file fails on a table whose columns the run's link
respelling misaligned, not on its frontmatter. The migration now writes the
first two correctly
([the session](../migration-frontmatter-prettier-shape/sessions/2026-09-28-prettier-shaped-frontmatter.md));
the table is [its own item](../link-respell-misaligns-tables/item.md).

## Live work the run marks wrongly

| Entity                                                                    | Run's state                         | Actual                                                                                                                                                                                                   | Fix                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects/storyline-engine/`                                              | **born item, `done`**               | A live umbrella, "Partially Implemented (~85%)". Change Steward and pipeline run tracking are 📋 Planned. Its proposal is `storyline-engine-proposal.md`, typed `artifact`, so the run sees no proposal. | **(b) before.** `git mv` it to `proposal.md`, set `type: proposal` and a `lifecycle` (`approved` → `ready`, or `implemented` → `done` plus the two planned workstreams filed as items with `parent: feature/storyline-engine`). Fix the 6 files that name `storyline-engine-proposal.md`. This is Cole's call. |
| `projects/mcp-storyline-authoring/`                                       | feature `ready` (from `approved`)   | `plan.md` is `completed`; sessions exist for all 3 phases (2026-06-28)                                                                                                                                   | **(b) before** (proposal `lifecycle: implemented`) or **(c) after** (`pdocs set feature/mcp-storyline-authoring --lifecycle done`). Confirm with Cole.                                                                                                                                                         |
| `context-at-scale`, `cost-tracking`                                       | feature `ready`                     | `context-at-scale` has 3 sessions (2026-06-29); `cost-tracking` has a `DEV_KICKOFF.md` and a `ready` test plan                                                                                           | **(c) after:** check with `view board`. The mapping is faithful and the states may just be stale.                                                                                                                                                                                                              |
| `agent-cli-conformance`, `agent-view-of-the-library`, `studio-navigation` | born items, `done`                  | Correct. The cycles are `closed`, the plan is `completed` and the sessions record landings.                                                                                                              | None. Their titles are built from the slug ("Agent cli conformance"); retitle if wanted.                                                                                                                                                                                                                       |
| `backlog/2026-03-31-tts-hardening.md`                                     | `items/2026-03-31-tts-hardening.md` | An open remainder; the slug clashes with `items/_archive/tts-hardening/`                                                                                                                                 | None needed. The date is kept by design. Rename if wanted.                                                                                                                                                                                                                                                     |

## story-loom-specific conventions

- **Owned-file edits ("For you to check"):** only
  `docs/investigations/README.md`. Its difference from the scaffold is a
  Prettier reflow plus one example link unlinked in `816c032b`. There is nothing
  to keep.
- **Templates:** none of story-loom's own; 16 at the scaffold's bytes, 0 kept.
  No `TEMPLATES/` step.
- **Extra frontmatter keys:** none outside the Slidev decks.
- **Custom folders:**
  `storyline-engine/workstreams/<ws>/{spec,plan,sessions,artifacts}`;
  `structured-context-documents/plan/` (per-seat plans) and `checkpoint/` (JSON
  and canon, excluded). Both move as artifacts. `lint.skip` names `superpowers`,
  which does not exist (harmless). `memories/` and `lessons-learned/` are kept.
- **Commit gate:** `lint-staged` (`prettier --check *.md`, Biome) plus
  `gate:staged`. Biome already excludes `scripts/pdocs`; `.prettierignore` does
  not, but only `*.md` reaches Prettier.

### Code and tooling outside `docs/` that spells retired paths

`--respell apps scripts/loom .anthill .claude .prettierignore AGENTS.md` lists
36 respellings in 23 files and leaves 9 as written.

| Where                                                                                                                                                                                    | What breaks                                                                                                                                                                  | Action                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/scripts/checkpoint/lib/config.ts` (`RUBRIC_PATH`), `lib/judging.ts` (canon dir, `fact-inventory.json`), `apps/api/scripts/vp0-characterize.ts` (snapshot JSON)                 | **Runtime reads.** The checkpoint and VP0 scripts would read paths that no longer exist.                                                                                     | `--respell … --write` (the respellings are exact)                                                                                                                                                                   |
| `scripts/loom/commands/{doc-new-investigation,doc-new-session,project-new,project}.ts`, `scripts/loom/scaffold.ts`                                                                       | **The loom CLI scaffolds docs into the retired folders** from the retired templates. Run after the migration, it would recreate `docs/investigations/` and `docs/projects/`. | **(c) by hand.** Retire these commands or re-point them at `pdocs new`. **Leave them out of `--respell --write`:** it would write `docs/items/<date>-<slug>.md` from the write-up template, which is a wrong shape. |
| `.prettierignore`                                                                                                                                                                        | Canon is no longer ignored (above)                                                                                                                                           | **(b) before**: add the new path                                                                                                                                                                                    |
| `.anthill/config.json` (seat scopes), `.anthill/dev/*.md`, `.claude/agents/checkpoint-judge.md`, root `AGENTS.md` (§ docs layout: describes `docs/projects/` and `docs/investigations/`) | Stale guidance for agents                                                                                                                                                    | `--respell --write` for the paths. Rewrite the `AGENTS.md` layout paragraph by hand: after a respell it reads "`docs/features/` — Proposals, specs, and plans…", which is half right.                               |
| Code comments: `storyline-artifacts.schema.ts`, `context-read.test.ts`, `agent-roles.test.ts`, `identity-guards.test.ts`                                                                 | Nothing (comments and a test fixture path; `PIN_ALLOWLIST` is the prefix `docs/`, so the test holds either way)                                                              | `--respell --write`                                                                                                                                                                                                 |
| `apps/media-manager/README.md`, `apps/studio/server/api/[...path].ts:12`                                                                                                                 | Nothing. The first is a verbatim copy from media-buffet whose paths are that repo's; the second names a backlog file that has since been archived.                           | Leave out of `--write`; fix the studio comment by hand if wanted                                                                                                                                                    |

## Recommended sequence for the real run

**Updated as the cycle's fixes land (2026-09-28).** The run now keeps
`.prettierignore` protecting moved files itself, stops included
([the session](../migration-respells-formatter-ignores/sessions/2026-09-28-ignore-files-and-excluded-documents.md)):
skip pre-run step 2, and in post-run step 4 skip dropping the old line (the run
drops it) but still format and check the canon is unchanged. Post-run step 1's
retype is done by the run too
([session](../migration-retypes-positional-artifacts/sessions/2026-09-28-positional-retype.md)):
skip it. Pre-run step 9 shrinks: phase 10 now suggests 201 of the 235 archive
breaks (was 93), so fix links after the run from its suggestions
([session](../phase-10-root-relative-and-archived-links/sessions/2026-09-28-root-and-archived-link-readings.md)).
Pre-run step 3 is done by the run too, and the post-run `prettier --write`
should find nothing to change: the run's output passes story-loom's own Prettier
([session](../link-respell-misaligns-tables/sessions/2026-09-28-migration-polish-round.md)).

**Pre-run (story-loom, committed before the run):**

1. Run v2.9→v2.10: dry run, real run, commit. It is clean: 1 template updated
   (`playbooks/TEMPLATE.md`), 18 already at the scaffold's bytes, check green.
2. `.prettierignore`: add
   `docs/features/structured-context-documents/checkpoint/canon/` and keep the
   old line.
3. `.project-docs.json` `lint.exclude`: add
   `docs/features/*/artifacts/**/*-slides.md` and
   `docs/items/*/artifacts/**/*-slides.md`.
4. Rename `projects/_archive/storyline-engine/` →
   `projects/_archive/legacy-experience-engine/`; fix 2 links.
5. storyline-engine: rename `storyline-engine-proposal.md` → `proposal.md`, set
   `type: proposal` and the `lifecycle` Cole picks; fix 6 references. Optionally
   set `mcp-storyline-authoring/proposal.md` to `implemented`.
6. Reports: fold, then delete the 4 process reports (fix the
   `PROJECT-SUMMARY.md` footer). Move the 2 MCP cold reads into
   `projects/agent-view-of-the-library/reports/` as `type: artifact` (15 links).
   Pick one owner for the 2026-09-25 direction report.
7. Briefs: 2 → `projects/_archive/media-library/artifacts/`, 3 →
   `projects/_archive/legacy-experience-engine/artifacts/` (or delete them).
8. Prototypes: move `investigations/prototypes/` out of `docs/` (e.g. a holding
   folder at the root). They come back in post-run step 3.
9. Archive links: temporarily remove `_archive` from `lint.skip`, then work the
   235 `MISSING FILE` in the old layout, using the one-level-short,
   root-relative, archived-since and `experience-engine` readings above. Ignore
   the 212 `NO FRONTMATTER`, which the run synthesizes. Restore `lint.skip`
   before committing. Fixed here, the links become real, and the run respells
   them with everything else. Budget about 1 hour with a script. Skipping this
   step moves the same work after the run: phase 10 lists the problems and
   suggests fixes for 93.

**The run:** `--dry-run`, then check the plan against these expectations: 124
moves, "no judgment steps outstanding", and 4 born `done` items, one of which is
storyline-engine unless step 5 was done. Then do the real run. If phase 10
stops, fix in place, **do not commit**, and re-run.

**Post-run (before the commit):**

1. Retype the 9 `storyline-engine/workstreams/*/plan.md` and 1 nested session to
   `type: artifact` and drop `lifecycle`. Then re-run the migration (it exits 0
   and moves the markers to 9.0.1).
2. Work "For you to check" and `view board`: confirm the born items, and set
   `context-at-scale`, `cost-tracking` and `mcp-storyline-authoring` to their
   real states. Declare `lint.scopes`.
3. Move the prototypes into
   `items/_archive/connected-pipeline-prototype-findings/artifacts/` and
   `vine-metrics.ts` into `items/agent-team-dynamics/artifacts/`. Fix their 3
   links and the one `bun docs/…` command.
4. Drop the old canon line from `.prettierignore`, **then**
   `prettier --write 'docs/**/*.md'`. Confirm that `git status` shows no change
   under `checkpoint/canon/`.
5. `--respell apps .anthill .claude AGENTS.md .prettierignore`, check the list,
   then `--write`. Leave out `scripts/loom` and `apps/media-manager`. Rewrite
   the `AGENTS.md` docs-layout paragraph by hand.
6. `scripts/loom` doc commands: retire them or re-point them at `pdocs new`.
   This can be its own follow-up commit if the commands are guarded.
7. Commit (about 1,090 paths); the hook runs Prettier and `gate:staged` over it.
   Run the checkpoint and VP0 script tests after the respell.

## Proposed migration items

Ranked by the problems each one removes on story-loom.

| #   | Title                                                               | One line                                                                                                                                                                                          | Removes on story-loom                    |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Write synthesized frontmatter in Prettier's shape                   | A blank line after the closing `---`, and a long `description` wrapped as Prettier wraps it, so a Prettier-checking hook accepts the commit                                                       | 218 hook failures                        |
| 2   | Suggest root-relative and archived-since readings in phase 10       | For a `MISSING FILE`, also try the link read from the repository root and with `_archive/` inserted after the retired folder, through the move record                                             | 108 more suggestions (201 / 235 covered) |
| 3   | Retype documents whose new position says `artifact`                 | A document that already has frontmatter, e.g. a nested workstream `plan.md` or `sessions/`, gets `type: artifact`, loses `lifecycle`, and is named in the plan, as briefs and reports already are | 28                                       |
| 4   | Respell `docs/projects/*` globs in `lint.exclude`                   | Write a `projects/*/…` glob as the pair `features/*/…` and `items/*/…` instead of leaving it as written and stopping the re-run on a hand edit                                                    | 16 (and one forced re-run)               |
| 5   | Respell retired paths in formatter ignore files during the run      | Treat `.prettierignore` (and Biome and ESLint ignore globs) like `lint.exclude`, so files a project excluded from formatting stay excluded after the move                                         | 11 canon files (a data-loss risk)        |
| 6   | Place non-documents from `investigations/` with their investigation | Move a non-`.md` file into the `artifacts/` of the one research item whose document names it, and stop only when no document or more than one does                                                | 7 preflight steps                        |
| 7   | Name process reports as such in the preflight                       | Tell a report whose name ends `project-summary-report` or `doc-status-report` to fold and delete, rather than to find an owner                                                                    | 4 steps (reworded, not removed)          |
| 8   | Stop on a proposal under another name                               | A project folder with no `proposal.md` that holds a `*-proposal.md` becomes a judgment step (rename it, or confirm a born item) instead of a born `done` item                                     | 1 live feature misfiled as `done`        |
| 9   | Accept a re-run over hand edits the run asked for                   | After a phase 10 stop, let the re-run take user edits to `lint.exclude`, or tell the user to make them before the run, instead of stopping on `.project-docs.json`                                | 1 `--force` re-run                       |

## Decisions (Cole, 2026-09-27)

- **Build migration changes 1–5 before story-loom migrates**, in
  [the story-loom migration cycle](../../cycles/2026-09-story-loom-migration.md).
  Changes 6–9 stay as story-loom's own pre- and post-run steps in the sequence
  above.
- **storyline-engine becomes a feature, `active`.** Before the run, rename
  `storyline-engine-proposal.md` to `proposal.md`. After it, set the feature
  `active` and file Change Steward and pipeline run tracking as items with
  `parent: feature/storyline-engine`.
- **The 2026-09-25 direction report: open.** Cole is not sure it belongs to
  either investigation. Ask story-loom's agent, which knows its content: if it
  is a direction still being explored, it becomes the write-up of a research
  item of its own; if it was a one-off synthesis, fold what is durable into a
  page and delete it.

Still unknown: which 9 problems the earlier trial had that this one lacks (its
preflight resolution was not recorded), and whether pre-run step 9's `lint.skip`
edit works through in the old layout (measured, same 235, but not tried).

## How this was measured

- story-loom `develop` at `d90a732f0f311c5acaf261c91b97a8510f54c3b0`, cloned to
  scratch (`git clone --branch develop`), scaffold 8.0.0.
- project-docs at `358da44` (develop; the plugin code this branch did not
  change) (plugin 4.1.0). Scaffolds were generated with cookiecutter from
  `git archive project-docs-scaffold-template-v8.1.0` and `…-v9.0.1`, passed as
  `--scaffold-dir`.
- v2.9→v2.10: `migrate-v2.9-to-v2.10.ts --dry-run`, then the real run, committed
  in the clone.
- v2.10→v3.0: `--dry-run` on the pristine clone (20 steps). The resolutions
  above were applied and committed in a second clone, then `--dry-run`, the real
  run (279 problems) and fixes without committing, then a re-run with `--force`
  (exit 0, 9.0.1).
- The pre-existing `MISSING FILE` baseline came from the v2.10 `pdocs check` on
  the pre-run tree with `_archive` removed from `lint.skip`. Prettier counts
  come from Prettier 3.8.1 (story-loom's version) with story-loom's
  `.prettierrc` and `.prettierignore`.

---

**Related Documents:**

- [What story-loom's v3.0 migration will ask for](./item.md)
- [The v2.10→v3.0 migration guide](../../../plugins/project-docs/skills/update-project-docs/migrations/v2.10-to-v3.0.md)
- [The v2.9→v2.10 migration guide](../../../plugins/project-docs/skills/update-project-docs/migrations/v2.9-to-v2.10.md)
