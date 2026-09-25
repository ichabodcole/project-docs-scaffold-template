---
type: plan
title: Work Taxonomy Implementation Plan
description:
  Add the feature, item and cycle model beside the old types, migrate this
  repository onto it, retire the old types, then prove the migration on a second
  consumer and ship both proposals as one major release.
tags: [taxonomy, schema, migrations, touch-points]
status: draft
lifecycle: active # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Work Taxonomy Implementation Plan

**Related Proposal:** [Work Taxonomy](./proposal.md), landing with
[Guidance Lifecycle](../guidance-lifecycle/proposal.md)

---

## Overview

This plan ships two proposals as **one breaking release**:

- [Work Taxonomy](./proposal.md) (primary): three entities, owned documents,
  relationships as fields, grouped states, derived views, and the touch points
  that write them.
- [Guidance Lifecycle](../guidance-lifecycle/proposal.md): retire `memory` and
  `lesson`, reshape playbooks to Goal · Steps · Verification, seed
  `docs/STYLE.md`, and wire consult, reflect and override into the skills.

The source investigation's Recommendation and its "Open Questions — settled
after conclusion" are binding
([investigation](../../investigations/2026-09-22-work-taxonomy-for-agent-first-development-investigation.md)):
`scope` takes one value, `id` is a UUID in frontmatter while filenames stay
slugs, and consumers migrate through `update-project-docs`. The migration is
dogfooded here first, then run on one other consumer.

Docs Foundation has shipped ([plan](../docs-foundation/plan.md)). This plan
builds on two of its pieces: the seed manifest (`scripts/pdocs/seed.ts`,
`docs/.pdocs-seed.json`) and the vocabulary `.project-docs.json` declares
(`lint.types` in `scripts/pdocs/docs-lint/config.ts`, merged in `buildRegistry`
in `scripts/pdocs/lint/registry.ts`). The new `scope` list is a second
vocabulary in the same file, read by the same parser.

**The constraint that shapes the phase order.** This repository is the
scaffold's source and also one of its consumers. `npm run check` lints this
repo's own `docs/` with the same `scripts/pdocs/` code that ships in the
payload, and the pre-commit hook runs that check on every commit. If the old
types were removed from the registry before this repo's tree moved, every commit
in between would fail the gate. So the work goes in three moves: **add** the new
model beside the old one (Phases 1–4), **migrate** this repository (Phase 5),
and only then **retire** the old types (the last task of Phase 5). The gate
stays green on every commit, and no commit needs `--no-verify`.

## Outcome & Success Criteria

**Definition of Done:**

- [x] `pdocs check` enforces the state vocabulary and its grouping (both parsed
      from `SCHEMA.md` and checked against the registry), `kind`, `id`, and
      `priority`. It also checks that `scope` is declared, that every `parent`,
      `from`, `blocked_by` and `cycle` resolves, and that no work item leaves
      the tree without reaching `dropped`.
- [x] A work item with no `title`, `kind` or `id` fails the lint.
- [x] `pdocs new item` writes a UUIDv7 `id`.
      `pdocs new <owned-type> --owner item/<x>` turns a single-file item into a
      folder and rewrites every link to it.
- [x] `pdocs view` derives the backlog, the board, the ready-and-unblocked list,
      a feature's items, a cycle's scope, a scope's work, and "done without
      `released_in`". None of these is an authored file.
- [x] `init-branch` writes `active` and `cycle`. `finalize-branch` writes
      `done`, puts the session in the owner's folder, creates a born-`done` item
      for work that ran without one, and runs Reflect instead of writing a
      memory. All of this is in **one** revision of the skill.
- [x] `generate-dev-plan` and `dev-kickoff` name the playbooks they consulted,
      or say none applied, from `pdocs find` output. `finalize-branch`,
      `dev-kickoff`, release and handoff each honour a named playbook override.
- [x] `docs/STYLE.md` is seeded and recorded in the seed manifest. The playbook
      template is Goal · Steps · Verification.
- [ ] `grep -rn "type: memory\|type: lesson" docs/ '{{cookiecutter.project_slug}}/docs/'`
      returns nothing. This repository has no `backlog/`, `briefs/`,
      `fragments/`, `investigations/`, `reports/`, `projects/`, `memories/` or
      `lessons-learned/`. `_archive/` exists only as `items/_archive/` and
      `features/_archive/`, and holds only entities in `done` or `dropped`.
- [x] `pdocs archive <ref>` refuses an entity that is not in a terminal state,
      and otherwise moves it into its owner folder's `_archive/`, rewriting its
      inbound and outbound links. `sweep-project` drives it.
- [ ] The migration script and its guide ship together. The script has been run
      to completion here, and on one other consumer, and was revised from that
      run.
- [ ] `npm run check` is green, and the payload has been checked by generating
      it (not by reading it).
- [ ] One major release, with the three version numbers in
      [Versions](#versions): package and scaffold `9.0.0`, `project-docs` plugin
      `4.0.0`, and migration `v2.10-to-v3.0`.

**Non-Goals:**

- A UI. Ordering within a state (a rank field) is left to whoever builds one.
- Deriving `released_in` from commit trailers. Commits start carrying the
  trailer in this release, but nothing reads it yet. The field is optional and
  **not linted**. The only deliverable for it is the "done, no `released_in`"
  view.
- Reshaping the 86 playbooks and lessons in other repositories, or any
  retroactive Reflect pass over their memories.
- Renaming `create-project`, `create-investigation` or other skills whose
  trigger phrases still match what users say. A rename is a breaking change that
  buys nothing here; only `backlog-to-projects` changes (D12).
- A workspace layer across several repositories, or team features.

## Approach Summary

### Decisions this plan makes

The proposals leave these to the plan. Each is recorded here so review can
overturn it in one place.

| #                                         | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Why                                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 (confirmed 2026-09-22)                 | The state field keeps the key **`lifecycle`**. The proposal's `state` is the field's _meaning_; items and features use the grouped vocabulary as its values. Revisit only if `state` proves clearer in use.                                                                                                                                                                                                                                                                                                                                                                                           | `lifecycle` is what `SCHEMA.md`'s parsed table, `RegistryRow.lifecycle`, `pdocs find --lifecycle` and every plan, test plan and cycle already use. A second key beside `status` and `lifecycle` would give three near-synonyms, and it would force a key rename on every proposal.               |
| D2 (revised 2026-09-22)                   | An entity folder's entry file is named after the entity: a feature is **`features/<slug>/feature.md`** with **`type: feature`**, and an item that becomes a folder is `items/<slug>/item.md`. Not `proposal.md`, and not `index.md` (`docs/index.md` is already the catalog type). The feature template is `FEATURE.template.md`, and the migration renames `projects/<x>/proposal.md` to `features/<x>/feature.md`.                                                                                                                                                                                  | One rule for both entities, so a tool finds the entry file by the folder's kind alone. The registry is keyed by type, and while this repo is mid-move `projects/*/proposal.md` (old vocabulary) and `features/*/feature.md` (new) both exist, so the new file needs its own type name.           |
| D3                                        | A feature's vocabulary is the item vocabulary **without `triage`**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | "A feature arrives already accepted." Without this rule, nothing would stop a feature from being written into a state its definition excludes.                                                                                                                                                   |
| D4 (clarified 2026-09-22)                 | A research work item is the **asking**: the question, the definition of done, and the lifecycle. The **output** it owns is `write-up.md` (**`type: write-up`**, no lifecycle), and its **evidence** is `<owner>/reports/`. The three stay separate files; they are not merged into the item.                                                                                                                                                                                                                                                                                                          | The old `investigation` type carries `active · concluded`. Once the item holds the state, the write-up is Capture ([Guidance Lifecycle](../guidance-lifecycle/proposal.md)'s table), and a type name different from the retiring one avoids the same collision as D2.                            |
| D5                                        | Every work template (entity files and owned documents) lives in **`docs/TEMPLATES/`**. Category templates stay where they are (for example `playbooks/TEMPLATE.md`, `cycles/TEMPLATE.md`).                                                                                                                                                                                                                                                                                                                                                                                                            | Features and items own the same named documents, so one template set serves both. `isSeeded` already matches any `TEMPLATES/` segment.                                                                                                                                                           |
| D6                                        | Reference grammar: `parent` is `feature/<slug>`. `cycle` is the cycle file's slug. `blocked_by` is a list of item UUIDs. `from` is an item UUID, `feature/<slug>`, `cycle/<slug>`, or a docs-root-relative path to an existing document. `pdocs` also accepts an 8+ character unique id prefix and `item/<slug>` as input, and always **writes** the full UUID.                                                                                                                                                                                                                                       | This matches the proposal's example (`parent: feature/okf-frontmatter`, `cycle: 2026-09-story-loom`). It also lets a review's `from:` point at the session that holds its census.                                                                                                                |
| D7                                        | `priority` is closed to `urgent · high · medium · low`. `assignee` is a free string (a seat handle or name).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | The proposal names the field and not the values. Linear's four are the smallest set the landscape agrees on. An unchecked `priority` would drift the same way `**Status:**` did.                                                                                                                 |
| D8 (revised 2026-09-22)                   | `pdocs new item` defaults to `lifecycle: triage`, so anything an agent creates starts there. Items leave `triage` through the `triage-items` skill, which proposes a disposition and applies it once the user has seen it. This is enforced by skill instructions, not by the CLI: `pdocs set` has no triage flag.                                                                                                                                                                                                                                                                                    | The safeguard is the default state plus a triage step the user sees. A CLI flag an agent can pass would add friction without adding a guarantee.                                                                                                                                                 |
| D9                                        | "No silent deletion" is checked for **items**, against `HEAD` by default and against any ref given with `pdocs check --against <ref>`. An item may leave the tree only if its state at that ref was `dropped`. A move, a promotion or a move into `_archive/` keeps the `id` and is not a deletion.                                                                                                                                                                                                                                                                                                   | The proposal assigns this rule to work items. Comparing against `HEAD` works in the pre-commit hook. In CI, where the working tree equals `HEAD`, the rule only fires when `--against` names the base.                                                                                           |
| D10 (revised 2026-09-24 by D21)           | Commit trailer: **`Work-Item: <uuid>`**, written by `finalize-branch` into the message of the commit that records the branch's session (D21).                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `released_in` needs a trailer before it can ever be derived. Choosing the name now costs nothing.                                                                                                                                                                                                |
| D11 (confirmed 2026-09-22)                | The migration **never deletes** a document. Retired workbench types are converted (table in Phase 5). A retired _library_ folder that is still present (`memories/`, `lessons-learned/`) is **kept**: the script declares it in `lint.types` so it stays lintable. Deleting one is a separate, explicit act by the adopter before the run, and the migration guide explains both choices.                                                                                                                                                                                                             | "Nothing is deleted; it is dropped." Guidance Lifecycle also requires "how to keep either type locally, not only how to delete it". It leaves the disposition of existing memories open, and the default that loses nothing is the one to ship.                                                  |
| D12 (extended 2026-09-22)                 | `backlog-to-projects` is **replaced** by a `triage-items` skill, the triage touch point: it proposes accept or drop, `priority`, `assignee` and a `parent` feature, and applies them once the user has seen them. Phase 4 opens with an audit of the whole skill set (Task 4.0).                                                                                                                                                                                                                                                                                                                      | Its job (grouping backlog into projects) becomes setting fields, and the triage step needs a named skill. Removing a skill is breaking, and this release is major anyway. The audit keeps the release to changes the taxonomy requires.                                                          |
| D13                                       | Lessons are **removed, not edited first**. Guidance Lifecycle's Phase 1 step "delete the four provenance prompts from the lesson template" is dropped, because the template leaves in the same release.                                                                                                                                                                                                                                                                                                                                                                                               | That ordering assumed separate releases. An adopter who keeps `lesson` via `lint.types` gets a type that can be linted but not created, so it has no template to edit.                                                                                                                           |
| D14 (added 2026-09-22)                    | Three version numbers, stated in [Versions](#versions): package/scaffold `9.0.0`, plugin `4.0.0`, migration `v2.10-to-v3.0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Each is read by something different, and conflating them is how the docs-version question stayed open.                                                                                                                                                                                           |
| D15 (added 2026-09-22)                    | **`_archive/` is kept**, in two places only: `items/_archive/` and `features/_archive/`. Only entities in `done` or `dropped` may sit there, and the lint checks it. `lifecycle` stays the source of truth, and the folder is a mirror that the tool maintains (Backlog.md's precedent). `pdocs archive` checks the state, moves the file or folder, and rewrites inbound and outbound links with the Task 2.5 rewriter. UUID references are untouched. `sweep-project` survives as the skill that drives it.                                                                                         | Keeps the live folders short to scan without letting the folder claim a state the field does not. A tool-made move cannot drift from the field the way a hand move did.                                                                                                                          |
| D16 (added 2026-09-22)                    | **Old migrations are pinned to their own scaffold release.** Each `migrate-*.ts` fetches the scaffold tag it was written against (v2.9→v2.10 gets `project-docs-scaffold-template-v8.1.0`, and so on) rather than the latest published one; `--scaffold-dir` still overrides. Its tests build their "current scaffold" from that same tag with `git archive`, as they already do for the v2.6 fixture. The chain order is unchanged.                                                                                                                                                                  | `update-project-docs` runs every applicable migration in order. Handed the 9.0.0 layout, the old scripts break (found in Task 1.4: `migrate-v2.6-to-v2.7.ts` stops on `docs/TEMPLATES/`, and the v2.10 reconcile assumes the old template set), so a consumer below v2.10 could not reach 9.0.0. |
| D17 (added 2026-09-22)                    | **`pdocs new --owner` writes the link to the owner.** An owned document created with `--owner` gets a link to its owner's entry file (`feature.md`, `item.md`, or a legacy project's `proposal.md`) in its Related section, relative to where it lands (`./feature.md`, `../item.md` from `sessions/`), the way `--from` adds one. The templates carry no live link to the owner or to a sibling `plan.md`: an inline-code note tells a hand-copier which file to link.                                                                                                                               | One template set serves both owners (D5), and their entry files differ (D2), so no literal link in a template is right for both. An owner need not have a plan, so a live `plan.md` link breaks there too. The CLI knows the owner, so it writes the one link that is always true.               |
| D18 (added 2026-09-22)                    | **Short ids: accept 8+, display 12.** A reference still resolves from a unique prefix of 8 or more characters (D6). Wherever `pdocs` prints an id for a person or an agent to copy — view text, refusal and ambiguity messages, `new` and `set` text output — it shows the first 12 characters. JSON output always carries the full id, and frontmatter always stores it.                                                                                                                                                                                                                             | UUIDv7 ids filed in the same stretch of time share their leading characters, so an 8-character prefix printed by the tool would soon be ambiguous. Twelve characters (eleven hex digits) separate ids filed about 16 ms apart, and stay short enough to type.                                    |
| D19 (added 2026-09-24; superseded by D24) | ~~**Repository-level reports are owned by a work item.**~~ Superseded by D24. `review-docs` and `project-summary` file an item (`kind: chore`, e.g. `docs-review-2026-09`) that owns the report (`pdocs new report --owner item/<slug>`), and the item closes when the report has been acted on. `PROJECT-SUMMARY.md` stays a root page.                                                                                                                                                                                                                                                              | In 9.0.0 a report must have an owner, and a loose `docs/reports/*.md` is reported untyped. An item gives the report a home and makes "acted on" a state the views can see.                                                                                                                       |
| D20 (added 2026-09-24)                    | **State writers.** A feature moves to `ready` on the owner's word, through `create-project` or `generate-proposal`; to `active` through `dev-kickoff`; to `done` or `dropped` through `sweep-project`. An item moves to `review` through `finalize-branch` when its review starts, and to `done` when the branch lands. A research item that concludes outside a branch is set `done` by `create-investigation` or the `investigator` agent. `dev-kickoff` goes through `init-branch` (`active` and `cycle`), and writes the kickoff document's owner link itself, since `pdocs new kickoff` refuses. | The Task 4.0 audit found no named writer for a feature's states, for `review`, or for research done in conversation. A field nobody writes goes stale.                                                                                                                                           |
| D21 (added 2026-09-24)                    | **The `Work-Item:` trailer goes on the session-record commit** that `finalize-branch` makes (Step 7), not on "the landing commit".                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | That commit exists under every landing policy — squash, consolidate, or history left untouched — while "the landing commit" is a different commit under each, and does not exist at all on a fast-forward.                                                                                       |
| D22 (added 2026-09-24)                    | **`triage-items` keeps `backlog-to-projects`' grouping and parallelism analysis**: beside accept or drop, `priority`, `assignee` and `parent`, it proposes which items share a feature and which can run in parallel. It applies nothing until the user has seen the proposal.                                                                                                                                                                                                                                                                                                                        | The analysis was the part of `backlog-to-projects` with no other home, and grouping is now the `parent` field.                                                                                                                                                                                   |
| D23 (added 2026-09-25)                    | **Clarifies D8: items an agent creates start in `triage` unless the user has just approved them.** When the user approves a list of items in the same exchange — a plan's item list in `generate-dev-plan`, a research question they asked for in `create-investigation` — the agent files them in the state the user approved (`backlog`, `ready` or `active`). Anything an agent files on its own judgement, such as a review finding or an intake, still starts in `triage`.                                                                                                                       | The approval the user gives to a list they have just read is the triage step itself. Making them triage the same items a second time would add friction and no safeguard.                                                                                                                        |
| D24 (added 2026-09-25; replaces D19)      | **Reports are evidence, owned by work that exists for its own sake** — a research item's surveys, a feature's audit. **Skills do not write process reports.** `project-summary` updates `PROJECT-SUMMARY.md` and writes no report: its notes on what it read are scratch, and only if the user asks to keep them does a report get an owner, then. `review-docs` files each finding as a `triage` item (its evidence in the item's body) and summarises in chat — no report file. What an agent did lives in a session record, when there is one.                                                     | D19 filed a `kind: chore` item only so a process report had an owner: an item that exists to own a file is bookkeeping, and the report was read once, if at all. A finding filed as an item is where its work happens; the summary itself is the durable output.                                 |

### Versions

Three numbers move, and each is read by something different:

| Number                 | From → to          | What reads it                                                                                                                                        |
| ---------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package and scaffold   | `8.1.0` → `9.0.0`  | A consumer's `.project-docs.json` `version` and `docs_version` record it; `update-project-docs` reads it to pick migrations. release-please bumps it |
| `project-docs` plugin  | `3.13.0` → `4.0.0` | What a consumer updates to get the new skills. Bumped by hand in `plugins/project-docs/.claude-plugin/plugin.json`                                   |
| Migration-series label | `v2.10-to-v3.0`    | The name of the migration guide and script. `v3.0` marks the first major structural break in that series                                             |

### Current state, and what changes where

| Concern             | Today (file · symbol)                                                                                                                                                                | After                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type tables         | `scripts/pdocs/lint/registry.ts` · `DURABLE_TYPE`, `SPEC`, `PROJECT_SPEC`, `PROJECT_FILE_TYPE`, `CREATION`, `VALIDATION`, `TYPE_ALIAS` (`project` → proposal), `PROJECTS_FOLDER`     | `feature`, `item` and `write-up` rows. Owned documents live under either owner folder (`FEATURES_FOLDER`, `ITEMS_FOLDER`). `STATE_GROUP`. `RegistryRow.required`. Old rows flagged `retired` until Phase 5, then deleted |
| Position typing     | `scripts/pdocs/lint/rules.ts` · `workbenchFiles`, `projectType`, `libraryFiles`                                                                                                      | `ownedType(owner, path)` for `features/` and `items/` (and `projects/` during the transition)                                                                                                                            |
| Per-document checks | `rules.ts` · `documentProblems` (the `REQUIRED` and `OPTIONAL` sets, `row.extra`, `row.lifecycle`)                                                                                   | Adds required fields per row, and `BAD ID`, `BAD KIND` and `BAD PRIORITY`                                                                                                                                                |
| Corpus checks       | `rules.ts` · `thinFindings` (only `TWO ACTIVE CYCLES`). `registry.ts` · `VALIDATION.cycle` resolves `scope` only at `pdocs new` time                                                 | New `scripts/pdocs/lint/work.ts`, called from `scripts/pdocs/lint/collect.ts`: reference resolution, duplicate ids, missing entity files, deleted items                                                                  |
| Contract ↔ code    | `rules.ts` · `schemaLifecycles`, `schemaTableChecks`                                                                                                                                 | Also parses a `## State groups` table                                                                                                                                                                                    |
| Config              | `scripts/pdocs/docs-lint/config.ts` · `LintConfig` (`types`, `durable`, `workbench`, `skip`, `exclude`)                                                                              | Adds `lint.scopes: string[]`. The defaults become the new folder layout                                                                                                                                                  |
| Model / reads       | `scripts/pdocs/pages.ts` · `Page`, `pageKeys`, `pageAliasKeys` (`project/<folder>`)                                                                                                  | New `scripts/pdocs/work.ts` (features, items, cycles, `resolveRef`, views). Pages are keyed `feature/<slug>`, `item/<slug>` and `item/<uuid>`                                                                            |
| Commands            | `scripts/pdocs/commands/{check,find,new,report,graph,backlinks,orphans}.ts`, dispatch in `scripts/pdocs/cli.ts` (`COMMANDS`)                                                         | `new item` and `--owner`. New `view`, `set`, `promote` and `archive` verbs. `find --kind/--parent/--cycle/--scope/--id`. `check --against <ref>`                                                                         |
| Seeding             | `scripts/pdocs/seed.ts` · `isSeeded`, manifest. `templateTest` in `rules.ts` treats **every** manifest path as a template                                                            | A `SEEDED_PAGES` set (`STYLE.md`). These are seeded but linted as contract pages, not skipped as templates. A `renameRecord` for templates that move                                                                     |
| Payload             | `{{cookiecutter.project_slug}}/docs/` (backlog, briefs, fragments, investigations, reports, projects, memories, lessons-learned, and four `_archive/.gitkeep`), `.project-docs.json` | `features/` and `items/` (each with `_archive/`), `cycles/`, `TEMPLATES/`, the library folders minus `memories/` and `lessons-learned/`, and `STYLE.md`                                                                  |
| Install hook        | `hooks/post_gen_project.py` · `LAYER_NOTE` (points at `docs/memories/`), `_is_seeded`, `write_seed_manifest`                                                                         | The note points at `pdocs view board`. `STYLE.md` is recorded                                                                                                                                                            |
| Migration           | `plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.9-to-v2.10.ts` (+ `.test.ts`, guide `v2.9-to-v2.10.md`)                                               | `migrate-v2.10-to-v3.0.ts` (+ test, guide), per [Versions](#versions)                                                                                                                                                    |

## Phases

```
P1 schema/registry/lint ──► P2 pdocs create/views ──► P4 skills ─────────┐
   │                            │                                          ▼
   ├──► P3 templates & prose ───┼──────────────► P5 migration ─► dogfood ─► retire ─► P6 consumer ─► release
   │   (STYLE.md, playbook      └──► P5 script (TDD) can start ──┘
   │    template: start day one)
```

- **P1 → P2** strictly: `new`, `set` and `view` validate against P1's model.
- **P3** starts once P1 has fixed the vocabulary. Its two items that depend on
  no code (`STYLE.md` and the playbook template rewrite) can start right away,
  in parallel with P1.
- **P5's script** can be written TDD in parallel with P3 and P4, once P2 has
  landed (it migrates into P2's model and calls `uuid.ts`). The **dogfood run**
  needs P3, because the migration installs P3's owned READMEs. The
  **retirement** task needs the dogfood run to have finished.
- **P4** needs P2's verbs. `finalize-branch` is edited once, after P2, carrying
  every change the two proposals make to it.
- Parallel implementers work in separate worktrees. Two agents in one tree
  collide on the `dist/` rebuild and on pathspec commits.
- Each phase lands on `develop` through its own branch, with the gate green.
  Nothing is released from `develop` until P6 (see Rollback Plan).

---

### Phase 1: Schema, registry and lint for the new model

**Goal:** `pdocs check` understands features, items, owned documents, grouped
states, the new fields and their references, and deleted items. The old types
are still lintable and flagged `retired`. The payload ships the new layout. This
repo's tree is unchanged, and its gate stays green.

**Key Changes:** `scripts/pdocs/docs-lint/config.ts`,
`scripts/pdocs/lint/registry.ts`, `scripts/pdocs/lint/rules.ts`, new
`scripts/pdocs/lint/work.ts`, `scripts/pdocs/lint/collect.ts`,
`scripts/pdocs/commands/check.ts`, `scripts/pdocs/pages.ts`, `docs/SCHEMA.md`
and its payload twin, the payload `docs/` tree and `.project-docs.json`, and
this repo's `.project-docs.json` (it adds `features` and `items` to
`workbench`). The whole of `scripts/pdocs/` is mirrored byte for byte into
`{{cookiecutter.project_slug}}/scripts/pdocs/`, except the tests.

**The risky part:** position typing. A wrong `ownedType` silently types a plan
as an artifact, and the lint then reports that document as clean. Every position
rule gets a test that uses a real fixture tree.

Each task follows **red → green → mirror → gate**: write the failing test, run
it and watch it fail for the stated reason, implement, run it green, copy the
changed non-test files into the payload, then run the gate.

```bash
bun test <the test file>
cp scripts/pdocs/<changed file> '{{cookiecutter.project_slug}}/scripts/pdocs/<changed file>'
npx tsc --noEmit && npm run check
```

#### Task 1.1 — `lint.scopes` in the config

- Test (`scripts/pdocs/docs-lint/config.test.ts`): a config with
  `"lint": { "scopes": ["lint", "cli"] }` loads `["lint", "cli"]`. An absent key
  loads `[]`. A non-string entry makes the whole list fall back to `[]`, the
  same way `strings()` treats the other arrays.
- Implement: add `scopes: string[]` to `LintConfig`, to `DEFAULT_CONFIG.lint`,
  and to `loadConfig`.
- In the same task, change `DEFAULT_CONFIG.lint.durable` to
  `["architecture", "specifications", "interaction-design", "playbooks"]` and
  `workbench` to `["features", "items", "cycles"]`. Defaults apply only when the
  key is absent. This repo and the payload both state their arrays explicitly,
  so neither tree moves.

#### Task 1.2 — the state vocabulary and its groups

- Test (`scripts/pdocs/lint/registry.test.ts`):
  - `ITEM_STATES` equals
    `["triage","backlog","ready","active","review","done","dropped"]`.
  - `FEATURE_STATES` is the same list minus `triage` (D3).
  - Every state maps to exactly one group in `STATE_GROUP`: triage, backlog and
    ready are `unstarted`; active and review are `started`; done is `completed`;
    dropped is `cancelled`.
  - `KINDS` equals `["task","bug","chore","research"]`, and `PRIORITIES` equals
    `["urgent","high","medium","low"]` (D7).
- Implement these as exported constants in `registry.ts`.

#### Task 1.3 — `SCHEMA.md` states the groups, and the lint proves it

- Test (`scripts/pdocs/lint/rules.test.ts`): `schemaStateGroups(schema)` parses
  a `## State groups` table with columns Group · State · Means.
  `schemaTableChecks` reports a `SCHEMA DISAGREES` row naming the state when the
  table puts a state in the wrong group. It reports `NO STATE GROUPS TABLE` when
  the section is missing.
- Implement next to `schemaLifecycles` in `rules.ts`, with the same parsing
  rules (rows only after the alignment row, trimmed cells).
- Add the table to `docs/SCHEMA.md` and to
  `{{cookiecutter.project_slug}}/docs/SCHEMA.md`. The prose around it is written
  in Phase 3; this task adds the table only.

#### Task 1.4 — registry rows for `feature`, `item`, `write-up`, and owned documents in either owner

- Test (`registry.test.ts`):
  - `buildRegistry(DEFAULT_CONFIG)` has a `feature` row: scope `owner`, fixed
    file `feature.md` (D2), lifecycle `FEATURE_STATES`, extra
    `["scope","released_in"]`, template `docs/TEMPLATES/FEATURE.template.md`.
  - It has an `item` row: lifecycle `ITEM_STATES`, `required: ["id","kind"]`,
    extra
    `["id","kind","parent","scope","cycle","from","source","blocked_by","released_in","priority","assignee"]`,
    template `docs/TEMPLATES/ITEM.template.md`.
  - It has a `write-up` row: fixed name `write-up.md`, lifecycle `null`.
  - Every owned type (plan, design-resolution, test-plan, kickoff, handoff,
    session, artifact, report, write-up) is declared once, with scope `owner`.
  - `TYPE_ALIAS` no longer contains `project`.
  - `proposal`, `backlog`, `fragment`, `brief`, `investigation`, `memory` and
    `lesson` carry `retired: true` and `creatable: false`, and each one's
    `uncreatableReason` names the replacement, e.g. "retired in 9.0.0; use
    `pdocs new item <slug> --kind task`".
- Implement:
  - Rename `scope: "project"` to `"owner"` in `RegistryRow`.
  - Add `FEATURES_FOLDER = "features"` and `ITEMS_FOLDER = "items"`. Keep
    `PROJECTS_FOLDER` only as the legacy owner.
  - Add `required: string[]` and `retired?: boolean` to the row.
  - Add `OWNER_SUBFOLDER`: `sessions`, `artifacts`, `reports`.
- Move the templates with `git mv`, in both trees: `docs/projects/TEMPLATES/*`
  goes to `docs/TEMPLATES/`. Add `ITEM.template.md` and `WRITE-UP.template.md`;
  the write-up template is the frontmatter from
  `investigations/YYYY-MM-DD-TEMPLATE-investigation.md` minus `lifecycle`, with
  its body kept for now.
- `git mv` `PROPOSAL.template.md` to `FEATURE.template.md`; the `feature` row
  points at it. Its frontmatter becomes `type: feature` and
  `lifecycle: backlog`.
- `templateProblems` must stay clean. Run
  `bun scripts/pdocs/cli.ts check --format text`.
- The old migration suites (`migrate-v2.6-to-v2.7.test.ts`,
  `migrate-v2.9-to-v2.10.test.ts`) generated their "current scaffold" from the
  working tree, so moving the templates breaks them. Their current scaffold
  moves here to one built from the `project-docs-scaffold-template-v8.1.0` tag
  (D16). Only the tests move in this task; pinning the shipped scripts is
  Phase 5.

#### Task 1.5 — position typing for `features/` and `items/`

- Test (`rules.test.ts`, using the existing fixture-tree helpers). Every
  position maps to the right type:

  | Path                                  | Type                         |
  | ------------------------------------- | ---------------------------- |
  | `features/a/feature.md`               | `feature`                    |
  | `features/_archive/a/feature.md`      | `feature`                    |
  | `items/_archive/b.md`                 | `item`                       |
  | `features/a/plan.md`                  | `plan`                       |
  | `features/a/sessions/2026-01-01-x.md` | `session`                    |
  | `features/a/reports/2026-01-01-r.md`  | `report`                     |
  | `features/a/artifacts/n.md`           | `artifact`                   |
  | `features/a/notes.md`                 | `artifact`                   |
  | `items/b.md`                          | `item`                       |
  | `items/b/item.md`                     | `item`                       |
  | `items/b/write-up.md`                 | `write-up`                   |
  | `items/b/sessions/2026-01-01-y.md`    | `session`                    |
  | `projects/c/proposal.md`              | `proposal` (legacy, retired) |

  Also: a `feature.md` under `items/` and an `item.md` under `features/` each
  report `MISPLACED ENTITY`. An `_archive/` is recognised only directly under
  `features/` or `items/`.

- Implement: replace `projectType` with `ownedType(owner, path)`, and route the
  `features`, `items` and `projects` folders through it in `workbenchFiles`.
  `ownedType` strips a leading `_archive/` segment before typing, so an archived
  entity is typed exactly like a live one. For this to work, `_archive` must not
  be in `lint.skip` (Task 1.10).

#### Task 1.6 — per-document field rules

- Test (`rules.test.ts`, calling `documentProblems` directly):
  - An item missing `id` reports `MISSING id`. Missing `kind` reports
    `MISSING kind`, and missing `lifecycle` reports `MISSING lifecycle`.
  - `id: 1234` reports `BAD ID` (the expected format is a UUID). An uppercase
    UUID is accepted and reported `BAD ID … (lowercase)`, so `pdocs` has one
    canonical form to compare.
  - `kind: story` reports `BAD KIND`, and `priority: p1` reports `BAD PRIORITY`.
  - `lifecycle: triage` on a feature reports `BAD LIFECYCLE`.
  - `released_in` absent on an item that is `done` is **clean**. This is D9's
    non-rule for `released_in`, and it gets a test so nobody adds the check by
    accident.
- Implement: `documentProblems` unions `row.required` into `required`, and
  validates `kind`, `priority` and `id` shape from the registry constants.

#### Task 1.7 — corpus rules in `scripts/pdocs/lint/work.ts`

- Test (new `scripts/pdocs/lint/work.test.ts`, using fixture trees):
  - Two items with one `id` report `DUPLICATE ID`, naming both paths.
  - `parent: feature/nope` reports `BAD PARENT`, and so does
    `parent: item/<uuid>` (a parent must be a feature).
  - `cycle: 2099-01-nope` reports `BAD CYCLE`.
  - `blocked_by: [<unknown uuid>]` reports `BAD BLOCKED_BY`. A → B → A reports
    `BLOCKED CYCLE`. An item blocking itself also reports.
  - `from:` that is none of the four D6 forms, or that names a path with nothing
    there, reports `BAD FROM`.
  - `scope: lint` with `lint.scopes: []` reports
    `BAD SCOPE … (declare it in lint.scopes in .project-docs.json)`.
    `scope: [a, b]` reports `BAD SCOPE … takes one value`.
  - A folder `features/x/` with no `feature.md` reports `MISSING ENTITY FILE`,
    and so does `items/y/` with no `item.md`.
  - `items/_archive/z.md` with `lifecycle: active` reports
    `ARCHIVED NOT TERMINAL` (D15), and so does a feature under
    `features/_archive/` that is not `done` or `dropped`.
  - A slug that exists both live and in `_archive/` reports `DUPLICATE SLUG`, so
    `item/<slug>` and `feature/<slug>` stay unambiguous.
  - A clean tree with every field set reports nothing.
- Implement `workProblems(ctx)` over the documents `collect` has already read.
  Do not walk the tree a second time. Wire it into `collect.ts`'s `workbench`
  array.
- Add a wiring witness in `rules.test.ts`: `collect(ctx).workbench` contains a
  `BAD PARENT` row for a fixture that has one. This test exists to catch the day
  the assembly stops calling the rule.

#### Task 1.8 — no silent deletion (D9)

- Test (`work.test.ts`). Every git call goes through a child process with
  `childEnv()` from `scripts/pdocs/test-env.ts`: a git spawned in-process from a
  hook environment inherits `GIT_INDEX_FILE` and reads the wrong index. Each
  case runs `bun scripts/pdocs/cli.ts check --format json` as a child. The setup
  is: init a repo, commit an item, then:
  - Delete it: the check reports an `ITEM DELETED` row naming the path and the
    `id`, and saying it left the tree without reaching `dropped`.
  - Set it `dropped`, commit, then delete it: clean.
  - Move `items/x.md` to `items/x/item.md`, keeping the `id`: clean.
  - Set it `done` and move it to `items/_archive/x.md`: clean (D9).
  - Commit the deletion, then run with `--against HEAD~1`: it still reports.
  - Run on a tree that is not a git repository: no finding and no crash.
- Implement `deletedItems(ctx, ref)` in `work.ts`. It runs
  `git ls-tree -r --name-only <ref> -- <docsRoot>/items`, then one
  `git cat-file --batch` over those blobs, parses `id` and `lifecycle`, and
  compares against the working tree's ids.
- Use `gitEnv()` (from `rules.ts`) for every spawn.
- Add `--against <ref>` to `check`'s options in `commands/check.ts`, and pass it
  through `Ctx`.

#### Task 1.9 — `pages.ts` keys

- Test (`scripts/pdocs/commands/read.test.ts`): `pageKeys` gives
  `feature/<folder>` for a feature, and `item/<slug>` and `item/<uuid>` for an
  item, whether the item is a file or a folder, live or archived.
  `project/<folder>` is still produced for legacy `projects/` folders until
  retirement.
- Implement: generalize `pageAliasKeys` to both owners. Move the `cycle`
  validator in `registry.ts` off `scope` resolution. New cycles carry no
  `scope`. The cycle row keeps `scope` in `extra` until retirement, so this
  repo's two legacy cycles stay clean.

#### Task 1.10 — the payload layout, and this repo's config

These changes go in both trees; `scripts/check-mirror.sh` enforces the pairs.

- Add `docs/features/README.md` and `docs/items/README.md`. They are short
  contract pages for now; the full prose comes in Phase 3.
- Add `docs/TEMPLATES/` (from Task 1.4).
- Payload only: delete `backlog/`, `briefs/`, `fragments/`, `investigations/`,
  `reports/`, `projects/`, `memories/` and `lessons-learned/`, with their
  `_archive/.gitkeep` files. Add `features/_archive/.gitkeep` and
  `items/_archive/.gitkeep` (the structural class). Remove the Memories and
  Lessons headings from the payload's `docs/index.md`.
- Payload `.project-docs.json` and `DEFAULT_CONFIG`: the new arrays,
  `"scopes": []`, and `skip` **without** `_archive`. The archive is linted now,
  because the terminal-state rule has to see it. This repo keeps `_archive` in
  `skip` until its own migration, because its legacy archives have no
  frontmatter.
- This repo's `.project-docs.json`: add `features` and `items` to `workbench`.
  Keep every legacy folder listed until Phase 5.
- Update the tests that pin the payload: `scripts/post-gen-hook.test.ts`,
  `scripts/ownership-coverage.test.ts` (the classes for the new paths) and
  `scripts/seeded-coverage.test.ts` (the moved templates).
- Verify by generating:

  ```bash
  cookiecutter . --no-input --overwrite-if-exists -o /tmp/cc install_target="New project folder"
  cd /tmp/cc/my-project && bun scripts/pdocs/cli.ts check --format text
  find . -name '*.test.ts' -o -name 'test-env.ts' | grep . && echo FAIL || echo "no tests shipped"
  ```

#### Task 1.11 — the goldens and the CLI surface

- Rebuild the transcripts
  `scripts/pdocs/__fixtures__/{clean,dirty,dirty-report}.txt` that
  `scripts/pdocs/lint/golden.test.ts` compares against. Its fixture trees move
  from `backlog/`/`projects/` to `items/`/`features/`; keep one legacy row, so
  the transition path is covered too.
- Update `scripts/pdocs/cli.test.ts` for `check --against` in `help --json` and
  in `schema`.
- Update `scripts/pdocs/commands/new.test.ts`: `pdocs new backlog x` now
  refuses, with exit 2 and the replacement named.

**Validation:**

- [x] `bun test`, `npx tsc --noEmit` and `npm run check` are green, with this
      repo's tree untouched.
- [x] A generated payload passes `pdocs check`. It contains no retired folder
      and ships no tests.
- [x] A hand-written fixture with every Task 1.7 defect in it reports every one
      of them, each once.

**Dependencies:** none.

---

### Phase 2: `pdocs` creation, promotion, archiving, `set` and derived views

**Goal:** agents create and move work through `pdocs` alone. Views are computed
from fields, never authored.

**Key Changes:** new `scripts/pdocs/uuid.ts`, new `scripts/pdocs/work.ts`,
`scripts/pdocs/commands/new.ts`, new `scripts/pdocs/commands/set.ts`,
`scripts/pdocs/commands/view.ts`, `scripts/pdocs/commands/promote.ts` and
`scripts/pdocs/commands/archive.ts`, `scripts/pdocs/commands/find.ts`,
`scripts/pdocs/cli.ts` (`COMMANDS`), and all of them mirrored to the payload.

**The risky part:** promotion rewrites links in files that `pdocs` did not
write. It gets the heaviest testing in the phase, and it reuses the move-map
link rewriter that Phase 5's migration also needs. Write that rewriter once,
here.

#### Task 2.1 — UUIDv7

- Test (new `scripts/pdocs/uuid.test.ts`):
  - `uuidv7(now, bytes)` with fixed inputs gives a known string.
  - Every output matches
    `^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`.
  - Two calls in increasing milliseconds sort in time order.
  - `isUuid` accepts v4 and v7, and rejects uppercase letters and missing
    hyphens.
- Implement with `crypto.getRandomValues` and `Date.now()`. No dependency.

#### Task 2.2 — the work model and `resolveRef`

- Test (new `scripts/pdocs/work.test.ts`): `collectWork(ctx)` returns features,
  items and cycles, with their fields parsed. `resolveRef` resolves:
  - a full UUID;
  - a unique prefix of 8 or more characters (an ambiguous one throws a
    `UsageError` listing the candidates);
  - `item/<slug>`, whether the item is a file or a folder;
  - `feature/<slug>`;
  - `cycle/<slug>`;
  - each of the above when the entity sits in `_archive/`.
- Implement in `work.ts` on top of `collectPages`. `lint/work.ts` (Task 1.7) is
  refactored to consume this model, so the lint and the commands resolve a
  reference in exactly one way.

#### Task 2.3 — `pdocs new item`

- Test (`new.test.ts`):
  - `new item fix-hook --kind bug` writes `docs/items/fix-hook.md` with a v7
    `id`, `kind: bug`, `lifecycle: triage` (D8) and a filled `generated`.
  - `--parent feature/nope` exits 2, from the same resolution the lint uses.
  - `--scope` is checked against `lint.scopes`.
  - `--from docs/features/a/sessions/…md` writes `from:` **and** the Related
    link. The existing `--from` behaviour and the new field share one flag.
  - `--blocked-by <prefix>` writes the full UUID.
  - `--kind` missing exits 2 and lists the kinds.
- Implement:
  - An `item` validator in `VALIDATION` that uses `resolveRef`.
  - Leave `from` out of `EXTRA_FLAGS`: it is the existing `--from`.
  - Emit multi-word keys as kebab-case flags (`--blocked-by`, `--released-in`).
  - `titleFromSlug` needs nothing new.

#### Task 2.4 — `--owner` replaces `--project`

- Test (`new.test.ts`):
  - `new plan --owner feature/a` writes `docs/features/a/plan.md`.
  - `new session x --owner item/<uuid-prefix>` writes into the item's
    `sessions/`, promoting the item first if it is a single file.
  - `new feature oauth-upgrade` creates
    `docs/features/oauth-upgrade/feature.md`.
  - `--project` exits 2 with a message naming `--owner`.
- Implement in `resolveDirectory` and `resolveType`. The old
  `TYPE_ALIAS.project` behaviour becomes the `feature` row's own `namesScope`.

#### Task 2.5 — promotion, and the shared link rewriter

- Test (new `scripts/pdocs/commands/promote.test.ts`):
  - `promote item/x` moves `items/x.md` to `items/x/item.md`.
  - The moved file's own relative links gain a `../`.
  - A link to it from `features/a/plan.md` is rewritten and resolves.
  - `pdocs check` is clean afterwards.
  - Promoting an item that is already a folder is a no-op and exits 0.
- Implement `rewriteLinks(files, moveMap)` in new
  `scripts/pdocs/links-rewrite.ts`. It is pure: text in, text out, and a count
  of links changed. It reuses `checkLinks`'s link grammar from
  `docs-lint/index.ts` rather than a second regex.
- `promoteItem` builds a one-entry move map. Inbound files come from
  `linksInIndex` in `pages.ts`.

#### Task 2.6 — `pdocs set`

- Test (new `scripts/pdocs/commands/set.test.ts`):
  - `set <ref> --lifecycle active --cycle 2026-09-x` rewrites only those keys,
    and leaves comments and key order alone.
  - `--lifecycle backlog` on a `triage` item succeeds. There is no triage flag
    (D8); the guard lives in the `triage-items` skill.
  - An invalid value exits 2 and names the valid set.
  - `--unset cycle` removes the key.
  - `--released-in 9.0.0` is accepted with no check (D9).
  - JSON output includes the path and the before and after values.
- Implement with `rewriteFrontmatter` from `new.ts`. Validation goes through the
  same functions as Tasks 1.6 and 1.7.

#### Task 2.7 — `pdocs archive` (D15)

- Test (new `scripts/pdocs/commands/archive.test.ts`):
  - `archive item/x` on a `done` item moves `items/x.md` to
    `items/_archive/x.md`; a folder item moves as a whole folder.
  - `archive feature/a` on a `dropped` feature moves `features/a/` to
    `features/_archive/a/`.
  - An `active` entity exits 2 and names its state; nothing moves.
  - Inbound links (from another feature's plan) **and** the moved files' own
    outbound links are rewritten and resolve. `pdocs check` is clean after.
  - A `blocked_by` or `from` UUID pointing at the archived item still resolves,
    and no frontmatter was edited.
  - Archiving an entity that is already archived is a no-op and exits 0.
  - Running `pdocs check --against HEAD` after the move reports no
    `ITEM DELETED`.
- Implement with Task 2.5's `rewriteLinks`, building a move map of every file in
  the entity. `promote` and `archive` share the move-and-rewrite path.

#### Task 2.8 — `pdocs view`

- Test (new `scripts/pdocs/commands/view.test.ts`, one fixture tree, JSON
  output):
  - `backlog`: the unstarted group, ordered by priority (urgent → low → none),
    then `generated.at`, then path.
  - `board`: items grouped by state group; `--features` includes features.
  - `ready`: `ready` items whose `blocked_by` are all `done`.
  - `feature <slug>`: the feature and its items.
  - `cycle <slug>`: the items naming the cycle, with `closable: true` when every
    item is in the completed or cancelled group.
  - `scope <name>`.
  - `unreleased [--since YYYY-MM-DD]`: done features and items with no
    `released_in`.
  - `released <version>`.
  - An unknown view exits 2 and lists the views.
  - Output is byte-identical across two runs.
- Implement: the views are pure functions in `work.ts` (a UI will import them),
  and `commands/view.ts` is presentation only.

#### Task 2.9 — `find` filters and the surface

- Test (`read.test.ts`, `cli.test.ts`): `find --kind bug --cycle x`, `--parent`,
  `--scope`, `--id <prefix>`. `FindMatch` carries `id`, `kind`, `parent`,
  `cycle` and `scope`. The `help --json` manifest and the `schema` declaration
  list `view`, `set`, `promote` and `archive`.
- Mirror check: new non-test files are **not** caught when they are missing from
  the payload (`check-mirror.sh` discovers files from the payload side). Run
  this and expect only tests, `test-env.ts` and `__fixtures__` in the output:

  ```bash
  diff -rq scripts/pdocs '{{cookiecutter.project_slug}}/scripts/pdocs'
  ```

**Validation:**

- [x] On a scratch copy of the generated payload: `pdocs new feature a` →
      `pdocs new item b --kind task --parent feature/a --lifecycle ready` →
      `pdocs new plan --owner item/b` (b becomes a folder) →
      `pdocs set item/b --lifecycle active` → `pdocs view board` →
      `pdocs set item/b --lifecycle done` → `pdocs archive item/b`. The result
      is `pdocs check` clean.
- [x] `bun test`, `npx tsc --noEmit` and `npm run check` are green.

**Dependencies:** Phase 1.

---

### Phase 3: Templates and prose

**Goal:** the contract, the READMEs and the templates describe the new model in
imperative prose, and `docs/STYLE.md` is seeded. This is prose work, so the
tasks list files rather than TDD steps. Every file is edited in the payload
first, then mirrored, then formatted with `npx prettier --write`.

**Tasks:**

- **`docs/STYLE.md`** (new, both trees). Derived from acc's `docs/wiki/STYLE.md`
  and scoped to a consuming team. Each density rule keeps its evidence strength
  next to it. Seeding it:
  - Add `SEEDED_PAGES = new Set(["STYLE.md"])` to `scripts/pdocs/seed.ts`.
  - `templateTest` in `rules.ts` returns **false** for these. Today every
    manifest path is treated as a template and skipped, which would switch off
    link checking on `STYLE.md`.
  - Add `STYLE.md` to `CONTRACT_BASENAMES` (links only, no frontmatter).
  - `hooks/post_gen_project.py`'s `write_seed_manifest` records it.
  - Tests: `scripts/pdocs/seed.test.ts`, `scripts/seeded-coverage.test.ts` and
    `scripts/ownership-coverage.test.ts` (it is `seeded`).
- **Playbook template** (`docs/playbooks/TEMPLATE.md`, both trees): Goal · Steps
  · Verification, replacing its eight sections. `docs/playbooks/README.md`
  explains:
  - playbooks are indexed by kind of work, and the index is their frontmatter
    `description`;
  - how to append a check to an existing playbook;
  - the override convention, `docs/playbooks/<event>-playbook.md` for the events
    `branch-initialization`, `branch-finalization`, `dev-kickoff`, `release` and
    `handoff`.
- **Work templates** in `docs/TEMPLATES/`:
  - `ITEM.template.md`: a definition-of-done body, and every field commented
    with who writes it (the touch-points list).
  - `FEATURE.template.md` (renamed from `PROPOSAL.template.md`): the feature's
    state, and the prose that used to read "Status".
  - `WRITE-UP.template.md`: the investigation body.
  - `REPORT.template.md`: moved from `reports/YYYY-MM-DD-TEMPLATE-report.md`.
  - The link in `PLAN.template.md` to `../README.md` must still resolve from
    both owners. The template render test in `registry.test.ts` proves it.
- **`docs/SCHEMA.md`** (owned, both trees):
  - Layout and the tier table.
  - "Lifecycle by type" (new rows; retired rows marked "removed at the end of
    this release").
  - `## State groups`, and a fields table with the writer of each field.
  - The D6 reference grammar.
  - "Archiving" rewritten (D15): `lifecycle` is the source of truth;
    `items/_archive/` and `features/_archive/` are a tool-maintained mirror that
    holds only `done` or `dropped` entities; `pdocs archive` is the only mover;
    the lint checks the rule.
  - "The cycle": its scope is derived; `scope:` is retired on cycles.
  - "Who owns which file": **amend "Theirs"**. A major migration may move a
    document you wrote and rewrite its frontmatter and its links. It never
    rewrites your prose or deletes a document, and it names every move. Today
    the table says a migration never touches a document you wrote, and this
    release's migration breaks that.
  - The `lint.scopes` and `--against` sections.
- **Category READMEs**, all mirrored:
  - `docs/features/README.md`, from `docs/projects/README.md`, with its archival
    section rewritten for `pdocs archive`.
  - `docs/items/README.md`: kinds, states, the promotion rule, archiving, a
    research item's three parts (item, write-up, reports; D4), and "items
    created by agents start in `triage` and leave it through a triage step the
    user has seen".
  - `docs/cycles/README.md`: membership lives on the items.
  - `docs/README.md`: the decision flowchart and the cycle string.
  - `docs/AGENTS.md`.
- **`docs/PROJECT_MANIFESTO.md`** (this repo only; the payload skeleton does not
  carry the line). Amend the "Records scope and state, not people or dates"
  bullet at line 140: an assignee routes work to an agent or seat, and
  project-docs still does not track people or dates. Also update the pipeline
  and document-type references there. Confirm with
  `grep -n "people or dates" '{{cookiecutter.project_slug}}/docs/PROJECT_MANIFESTO.md'`,
  which should return nothing.
- **`hooks/post_gen_project.py`**: `LAYER_NOTE` swaps the `docs/memories/`
  pointer for `bun scripts/pdocs/cli.ts view board`. Update
  `scripts/post-gen-hook.test.ts` to match.
- **Root docs**: `AGENTS.md` (the "Template Structure" bullet), `README.md`, and
  `.claude/skills/scaffold-update-checklist/SKILL.md` (the mirrored category
  list and the "Not mirrored" list).

**Validation:**

- [x] `npm run check` is green, including `check:mirror`, and the generated
      payload passes `pdocs check`.
- [x] A cold-read agent is given `docs/items/README.md`, `docs/SCHEMA.md` and
      `docs/TEMPLATES/ITEM.template.md`, plus what they link to. It can file an
      item and say who moves it next, without asking.

**Dependencies:** Phase 1 (vocabulary). `STYLE.md` and the playbook template:
none.

---

### Phase 4: Skill touch points

**Goal:** every field has a named writer (the proposal's touch-points list), and
every retired path is gone from the plugins. The skill text is not written here;
each row names the file and the change.

#### Task 4.0 — audit the skill set (first)

Before any skill is edited, inventory every skill, command and agent in
`plugins/project-docs/`, plus the skills in other plugins that the taxonomy
touches (`operator-triage`, `hivemind-consult`, `hivemind-digest`). Mark each
one **keep**, **rename**, **merge** or **retire**, with a one-line reason.
Record the inventory in this feature's `artifacts/skill-audit.md`.

- Changes the taxonomy **requires** land in this release, and the table below is
  where they go.
- Anything beyond that is filed as a work item for later
  (`pdocs new item <slug> --kind chore`, left in `triage`), so the audit does
  not grow the release.
- The rest of this phase starts once the audit is reviewed.

#### Touch points

**`finalize-branch` gets one revision**
(`plugins/project-docs/skills/finalize-branch/SKILL.md`), made after Phase 2 and
carrying every change below:

- Step 0: resolve the branch's item (from `init-branch`'s record, or
  `pdocs find --id`). None found is allowed.
- Step 2: the reviewer's non-blocking findings become
  `pdocs new item … --lifecycle triage --from <session path>` (a review writes
  `from:`).
- Step 4: the session goes to `--owner feature/<x>|item/<y>` in the owner's
  `sessions/`.
- **Step 5, Reflect, replaces "Create Memory."** Ask whether this branch taught
  something that saves a future agent from rediscovering it. The default answer
  is no, and "nothing this time" is said out loud. The usual positive outcome is
  appending a Step and a Verification to an existing playbook
  (`pdocs find --type playbook`).
- Step 6: `pdocs set <item> --lifecycle done`, or, when no item exists,
  `pdocs new item <slug> --kind <k> --lifecycle done` (born `done`). Drop the
  cycle `scope:` rewriting; the cycle's scope is derived now. Archival is still
  delegated to `sweep-project`, which now runs `pdocs archive`.
- Step 2: when the review starts, `pdocs set <item> --lifecycle review` (D20).
- Step 7: the session-record commit's message carries `Work-Item: <uuid>` (D10,
  D21).
- Override: `docs/playbooks/branch-finalization-playbook.md` takes precedence
  when present, and the skill says it followed it. The same applies to
  `handoff-playbook.md` at Step 6's handoff and `release-playbook.md` when
  landing on `main`.
- Update the description frontmatter: it no longer "writes memory docs".

| File (under `plugins/`)                                                                                                                                                                                              | Change                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project-docs/commands/init-branch.md`                                                                                                                                                                               | Step 1: pick the item — offer what `pdocs view ready` lists; start a `backlog` item only when the user names it, and never a `triage` item. Step 5 becomes `pdocs set <item> --lifecycle active --cycle <active cycle>`, with no `scope:` append. The existing override stays     |
| `project-docs/skills/generate-dev-plan/SKILL.md`                                                                                                                                                                     | **Consult**: run `pdocs find --type playbook --format json` and quote the matching paths, or "0 matches". Shaping: set `blocked_by` and move items to `ready` via `pdocs set`. The plan goes to `--owner`                                                                         |
| `project-docs/skills/dev-kickoff/SKILL.md`, `dev-kickoff/templates/DEV_KICKOFF.template.md`                                                                                                                          | Consult, as above. Override `dev-kickoff-playbook.md`. Paths change from `docs/projects/` to the owner                                                                                                                                                                            |
| `project-docs/commands/start-dev-kickoff.md`                                                                                                                                                                         | Owner paths                                                                                                                                                                                                                                                                       |
| `project-docs/skills/create-project/SKILL.md`, `create-project/references/pdocs.md`                                                                                                                                  | Creates a feature (`pdocs new feature`). Name kept (see Non-Goals). The CLI reference documents `new item`, `--owner`, `view`, `set`, `promote` and `check --against`                                                                                                             |
| `project-docs/skills/create-investigation/SKILL.md`, `OVERVIEW.md`, `YYYY-MM-DD-TEMPLATE-investigation.md`                                                                                                           | `pdocs new item <slug> --kind research`, then a write-up with `--owner`. The skill's own template copy becomes the write-up template                                                                                                                                              |
| `project-docs/skills/backlog-to-projects/` → `triage-items/`                                                                                                                                                         | D8 and D12: the triage touch point. It lists `triage` items, proposes a disposition for each (accept to `backlog` or `ready`, or drop, plus `priority`, `assignee` and `parent`), shows the proposal to the user, and applies it with `pdocs set` only after the user has seen it |
| `project-docs/skills/sweep-project/SKILL.md`                                                                                                                                                                         | Survives (D15). It reconciles a feature or item, writes its terminal state, and runs `pdocs archive` in place of its old manual move steps. It closes cycles that `pdocs view cycle` reports `closable`, and writes `released_in` where a person supplies it                      |
| `project-docs/skills/workshop-idea/SKILL.md`                                                                                                                                                                         | No brief and no fragment output. An idea goes upstream, or becomes a feature proposal or a `triage` item                                                                                                                                                                          |
| `project-docs/skills/generate-proposal/SKILL.md`, `generate-design-resolution/SKILL.md`, `generate-test-plan/SKILL.md`, `generate-slide-deck/SKILL.md`, `dev-discovery/SKILL.md`, `html-mockup-prototyping/SKILL.md` | Owner paths instead of `docs/projects/<x>/`                                                                                                                                                                                                                                       |
| `project-docs/skills/ground-in-project/SKILL.md`, `project-docs/commands/project-summary.md`                                                                                                                         | Read `pdocs view board` and recent sessions. Remove the memories reading, the prohibition and the `_archive/` notes                                                                                                                                                               |
| `project-docs/skills/investigation-methodology/SKILL.md`, `implementation-blueprint/SKILL.md`, `document-validation/SKILL.md`, `review-docs/SKILL.md`                                                                | Remove memory, lesson, brief, fragment and `_archive/` references. Types come from `SCHEMA.md`                                                                                                                                                                                    |
| `project-docs/agents/{investigator,proposal-writer,dev-plan-generator,test-plan-generator,docs-curator,slide-deck-author}.md`                                                                                        | Paths and the output types                                                                                                                                                                                                                                                        |
| `project-docs/skills/update-project-docs/SKILL.md`                                                                                                                                                                   | The migrations table row (Phase 5). The version-reading notes. The `pdocs` examples                                                                                                                                                                                               |
| `operator/skills/operator-triage/SKILL.md`                                                                                                                                                                           | Intake writes `pdocs new item … --lifecycle triage --source operator:<id>`. "Lesson" appends to a playbook. There are no fragment or backlog routes. Minor bump                                                                                                                   |
| `hivemind/skills/hivemind-consult/SKILL.md`, `hivemind-digest/SKILL.md`                                                                                                                                              | Destinations change from `docs/lessons-learned/` to the playbook of that kind of work. Minor bump                                                                                                                                                                                 |
| `project-docs/README.md`, `.claude-plugin/plugin.json`                                                                                                                                                               | `4.0.0` (major: a skill removed, a skill renamed, `--project` removed). Update the Skills table and add the version history. Update the skill count in `docs/PROJECT_MANIFESTO.md`                                                                                                |

**Corrected by the Task 4.0 audit** ([skill-audit](./artifacts/skill-audit.md)):
`implementation-blueprint` has no retired reference to remove,
`slide-deck-author` names no retired path, and `hivemind-digest` writes to
HiveMind's own Lessons Learned folder, not a project's `docs/lessons-learned/` —
all three are kept unchanged. `generate-dev-plan` also files the items a plan
names, once the user approves the list, since shaping (D20) needs items to
shape.

**Checks before the phase closes:**

```bash
grep -rnE 'docs/(backlog|briefs|fragments|memories|lessons-learned|investigations|reports|projects)/' \
  plugins/ --include='*.md' | grep -v '/migrations/'   # expect: only intentional history
npx prettier --write $(git diff --name-only -- plugins/ | grep '\.md$')
./scripts/build-skills-dist.sh && ./scripts/build-skills-dist.sh && git status --short dist/   # second build changes nothing
npm run check
```

Then run a cold read (per the scaffold checklist) on `finalize-branch`,
`init-branch`, `triage-items`, `sweep-project` and `generate-dev-plan`, and act
on what it finds.

**Validation:**

- [x] In a scratch project on the Phase 2 CLI: `init-branch` on a `ready` item,
      then `finalize-branch` on a branch that taught nothing. The item ends
      `done`, the session is in its folder, the commit carries the trailer, and
      no guidance document is created ("nothing this time").
- [x] A scratch project with `docs/playbooks/branch-finalization-playbook.md`:
      `finalize-branch` follows it and says so.
- [x] `generate-dev-plan` output quotes the `pdocs find` result.

**Known stale paths until this phase lands.** About 12 plugin skills and agents
name `docs/projects/TEMPLATES/...`, which Task 1.4 moves to `docs/TEMPLATES/`.
They stay stale from Phase 1 until the table above is worked. This is acceptable
because nothing is released before Phase 6.

**Dependencies:** Phase 2 (verbs) and Phase 3 (READMEs the skills point at).

---

### Phase 5: The migration, the dogfood run here, then retirement

**Goal:** one script moves a v2.10 tree onto the new model. It has been run on
this repository, and what that took is written down. The retired types are then
removed from the code.

**Key Changes:**

- New
  `plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.10-to-v3.0.ts`,
  its `.test.ts`, and the guide `migrations/v2.10-to-v3.0.md`.
- The migrations table row in
  `plugins/project-docs/skills/update-project-docs/SKILL.md`, with `Applies If`:
  `[ ! -d docs/items ] || [ -d docs/backlog ] || [ -d docs/projects ]`.
- A `renameRecord` in `scripts/pdocs/seed.ts` (the script keeps a pinned copy).
- Record `docs/STYLE.md` in this repository's `docs/.pdocs-seed.json` (a seeded
  page, `SEEDED_PAGES`), beside the `renameRecord` step.
- The label `v2.10-to-v3.0` and the target `9.0.0` are fixed in
  [Versions](#versions).

**What the script converts** (D11: nothing is deleted):

| From                                              | To                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects/<x>/` with `proposal.md`                | `features/<x>/`, with `proposal.md` renamed to `feature.md` (D2), `type: feature`, and the lifecycle mapped: draft → backlog, approved → ready (or → active when `plan.md` is `active`), deferred → backlog, implemented → done, withdrawn and superseded → dropped                                                                                                                                                                                                   |
| `projects/<x>/` without `proposal.md`             | `items/<x>/item.md`, synthesized as `kind: task`, `done` (or `active` if its plan is `active`), with the title from the folder and the description from its latest session. This is the born-`done` item for work that ran first                                                                                                                                                                                                                                      |
| `backlog/<date>-<slug>.md`                        | `items/<slug>.md` (the date is kept on a slug collision), with `kind: task`, and open → backlog, done → done, promoted → dropped (listed for review), dropped → dropped                                                                                                                                                                                                                                                                                               |
| `fragments/*.md`                                  | `items/<slug>.md`, with open → triage and promoted or dropped → dropped                                                                                                                                                                                                                                                                                                                                                                                               |
| `investigations/<date>-<slug>[-investigation].md` | `items/<slug>/item.md` (`kind: research`, active → active, concluded → done), with the document as `items/<slug>/write-up.md` (`type: write-up`, lifecycle removed)                                                                                                                                                                                                                                                                                                   |
| `reports/*.md`                                    | `<owner>/reports/`, where the owner is the unique research item that links to it, or that it links to. Unresolved reports stop the preflight (judgment)                                                                                                                                                                                                                                                                                                               |
| `briefs/*.md`                                     | Judgment, always. The preflight stops listing them, with a suggested owner (the unique feature it links to). The guide says: move each into its owner's `artifacts/`, or delete it before the run                                                                                                                                                                                                                                                                     |
| `cycles/*.md` with `scope:`                       | `cycle: <slug>` is written onto each `backlog/` entry's new item, and `scope:` is removed. `project/` entries are listed in the cycle body's Scope section (added only when missing) and reported. For an active cycle the run names the feature afterwards, for the adopter to file its items with `cycle:` — a post-run note, not a pre-run stop, since items cannot be created before the run                                                                      |
| `memories/`, `lessons-learned/` (if present)      | Kept, and declared in `lint.types` (D11)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `<folder>/_archive/…` (any legacy folder)         | Converted by the rows above, then placed in `items/_archive/` or `features/_archive/`, not flattened into the live folders. If the mapped state is not `done` or `dropped`, the entity goes to the live folder instead and is reported. Documents with no frontmatter get it synthesized: the type from the new position, the title from the H1, the description from the first sentence, `status: stable`, and `generated: { by: unknown, at: <first commit date> }` |

**Script phases** (the same shape as `migrate-v2.9-to-v2.10.ts`: each phase
verifies itself, a stop is exit 1 with a reason, and re-running is safe):

1. **Preflight.** Checks this is a v2.10 tree (`isSeeded` marker), the tools
   exist, and the touched paths are clean in git (or `--force`). Runs the
   baseline `pdocs check`. Stops on any judgment blocker (briefs, unowned
   reports).
2. **Scaffold.** Generates the current template.
3. **Plan.** Builds the move map and every frontmatter rewrite. `--dry-run`
   prints them and stops here.
4. **Refresh owned files.** `scripts/pdocs/`, `SCHEMA.md`, `docs/README.md`,
   `docs/AGENTS.md`, `docs/CLAUDE.md`, and the new category READMEs. Removes the
   retired owned READMEs.
5. **Move and rewrite frontmatter.**
6. **Rewrite links** across every tracked `.md` (inside and outside the docs
   root) through the move map. Reports the count.
7. **Config.** Patches `lint.durable`, `lint.workbench` and `lint.skip` (drops
   `_archive`, so the archive is linted), rewrites `lint.exclude` globs that
   name moved paths, adds `scopes: []`, and adds the D11 `types`. The adopter's
   bytes are kept everywhere else (`patchTopLevelVersion`'s approach).
8. **Seeds.** Reconciles templates, including moved ones via `renameRecord`, and
   installs `STYLE.md`.
9. **Format.** Runs before the record step, as in v2.10.
10. **Verify.** `pdocs check`, **plus** an explicit "no legacy folder remains"
    assertion. Until retirement, the refreshed CLI still lints the retired
    types, so a clean check alone cannot prove the move was complete.
11. **Version markers.**
12. **Cleanup.**

#### Tasks, TDD

Test file:
`plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.10-to-v3.0.test.ts`.
Run it with
`bun test plugins/project-docs/skills/update-project-docs/migrations/scripts/`.

1. **Pure functions first**, each with its table of cases:
   - `slugOf` (date prefix, `-investigation` suffix, collisions);
   - the lifecycle map functions (every legacy value, including the plan-active
     case);
   - `buildMoveMap` over an in-memory file list;
   - `synthesizeFrontmatter` (no H1, empty body);
   - `patchLintArrays` (keeps user additions and order; rewrites `exclude`);
   - `renameRecord`.
2. **The copied logic is pinned.** `isSeeded`, `verdictFor`, the link rewriter
   and `uuidv7` equal the originals in `scripts/pdocs/`. Follow the
   `describe("the copied seed logic equals scripts/pdocs/seed.ts")` pattern.
3. **Fixtures.**
   - O: generated offline from tag `project-docs-scaffold-template-v8.1.0`,
     following the existing `generatedScaffolds()` pattern, then seeded with:
     backlog items in every lifecycle, a fragment, a project with a proposal and
     an active plan, a project with sessions only, an archived project with no
     frontmatter, an archived backlog item, an investigation plus a report
     linking to it, a brief with an owner, a cycle with mixed scope, two
     memories, one lesson, and a root `README.md` linking into `docs/backlog/`.
   - N: generated from the working tree.
4. **The owned diff between O and N is derived, never pinned.** release-please
   rewrites `VERSION` in `scripts/pdocs/cli.ts` on every release, so a pinned
   list goes red on the first release after this one. Reuse the `ownedDiff`
   approach.
5. **The whole run on O:**
   - exit 0;
   - every table row above is realised;
   - every item has a unique v7 `id`;
   - `pdocs check` is clean;
   - no legacy folder remains;
   - no document's body text changed, apart from link targets (compare the
     bodies after stripping links);
   - the root `README.md` link resolves;
   - every `proposal.md` link now points at `feature.md`;
   - archived entities sit in `items/_archive/` or `features/_archive/` in a
     terminal state.
6. **Idempotence, and `--dry-run`** (writes nothing; prints the move map). A
   second run finds its work done.
7. **Guards are watched failing.** For each guard: break the guarded thing, see
   exit 1 with the reason, then restore. Covers a dirty tree, an unowned report,
   a brief, a missing tool, a failing verify, and a legacy folder remaining.
8. **A wiring witness per phase.** Neuter the phase's call site in a disposable
   copy of the script; the end-to-end run must fail.
9. **Bad invocation exits 2.**
10. **Pin the old migrations to their own scaffold release (D16).** The shipped
    `migrate-v2.6-to-v2.7.ts`, `migrate-v2.8-to-v2.9.ts` and
    `migrate-v2.9-to-v2.10.ts` each fetch the scaffold tag they were written
    against; `--scaffold-dir` still overrides. Add a test per script that it
    fetches its own tag. Update `update-project-docs`'s `SKILL.md` to say each
    step runs against its own era's scaffold.
11. **Re-point the v2.6 codemod parity test before retirement.** It holds frozen
    copies of `SPEC`, `PROJECT_SPEC`, `PROJECT_FILE_TYPE` and `DURABLE_TYPE`
    equal to the live tables, and the retirement step below deletes rows from
    them. Compare against a registry built from the v2.7-era tag, or against
    frozen literals, before that step lands.

Every spawn (`bun`, `git`, `cookiecutter`) passes `env: childEnv()`.

#### Guide and table

- `v2.10-to-v3.0.md` follows `v2.9-to-v2.10.md`: Summary, "This migration is a
  script", the three version numbers, What's New (both proposals), the judgment
  steps to do **before** the run (briefs, reports), the post-run note for active
  cycles with project scope, running it, and Verification.
- It carries a section **"Your memories and lessons: keep or delete"** (D11):
  - **Keep** (the default): do nothing. The script declares `memories` and
    `lessons-learned` in `lint.types`, so they stay lintable but not creatable.
    Show the resulting config.
  - **Delete**: before the run, delete the folders and their `docs/index.md`
    lines, and fix the inbound links `pdocs backlinks` names. The script never
    deletes on your behalf.
  - **Fold in**: what a lesson says belongs in the playbook for that kind of
    work, as a Step and a Verification.
- Add the row to the `update-project-docs` table.

#### Dogfood on this repository

Do this after Phase 3. Record everything below in
`docs/features/work-taxonomy/sessions/<date>-dogfood-migration.md`, the path the
move itself creates: counts, time taken, every stop, every manual step, and
every script change that the run forced.

1. **Guidance Lifecycle's deletions, done by hand before the script.**
   - Delete this repo's 35 memories (the proposal says 30; recount at run time)
     and their `docs/index.md` lines.
   - Fix every inbound link first. `pdocs backlinks` lists them; for example,
     `../guidance-lifecycle/proposal.md` links a memory.
   - Fold `docs/lessons-learned/a-guard-must-be-able-to-fail.md` and
     `migration-steps-uniform-specificity.md` into playbooks as Steps and
     Verifications. This repo has no playbooks yet; the likely one is a
     writing-migrations playbook.
2. **Resolve the judgment blockers.** Nine briefs: move each into its owner's
   `artifacts/` or delete it. Eleven reports: set their owners; most belong to
   the 2026-09-22 research item. A process report with no work it is evidence
   for — `2026-05-21-project-summary-report.md`, whose lasting points were
   folded into the `project-summary` command — is deleted rather than given an
   owner (D24).
3. **Declare this repo's scopes** in `.project-docs.json`. Candidates: `lint`,
   `cli`, `skills`, `migrations`, `payload` and `plugins`, decided by what the
   items actually touch.
4. **Run the script**: `--dry-run` first, read the move map, then the real run.
   It converts about 31 project folders, 19 archived ones (into
   `features/_archive/`), 11 plus 6 backlog items, 8 investigations and 2
   cycles. Confirm that `reconcileSeeds` recorded `docs/STYLE.md` in this repo's
   `docs/.pdocs-seed.json` (it is identical to the scaffold's, so it is recorded
   without being written).
5. **Fix what the verify phase names**, then run `npm run check`.
   `.claude/skills/*` and root docs that link into `docs/` are in the rewrite's
   scope. Check `grep -rn "docs/projects/" .claude/ AGENTS.md README.md`.
6. **Retire the legacy types.** This is one commit, and the gate must stay green
   through it.
   - Delete the `retired` rows, the `SPEC` entries for the retired folders,
     `PROJECTS_FOLDER`, the cycle's `scope` extra, and the legacy branch of
     `ownedType`.
   - Delete `pdocs new --owner project/<slug>`, the legacy owner form kept so
     this repository could create documents in `projects/` until it migrated
     (the `LEGACY` branch of `resolveDirectory` in `commands/new.ts`, its help
     text, and its tests in `new.test.ts`).
   - Delete the retired rows from both `SCHEMA.md` tables.
   - Remove the legacy folders from this repo's `.project-docs.json`, and
     `_archive` from its `skip`.
   - Delete the legacy fixture rows from the goldens.
   - Mirror, then `npm run check`. Then re-run `pdocs check` on the dogfooded
     tree: this is the check that the script's phase-10 assertion stood in for.

7. **File what Phase 4 left for later**, once `items/` exists, as `triage` items
   (`pdocs new item <slug> --kind chore`):
   - The optional items in the
     [skill audit](./artifacts/skill-audit.md#proposed-optional-items).
   - The five CLI gaps the Phase 4 validation walks found:
     - `pdocs new --title` does not fill the template's H1.
     - `find`'s JSON has no `slug`.
     - `backlinks` reports a feature's key as `feature/feature`.
     - `set` drops the inline comment on a `lifecycle:` line.
     - The lint passes a template's placeholder body and H1.
   - This repository's two open backlog items become items when the migration
     converts them. Narrow each one:
     - `2026-09-04-plugin-skills-hardcode-flat-docs-paths`: Phase 4's skills
       create documents with `pdocs new`, which resolves the folder. What
       remains is the hand-written `DEV_KICKOFF.md` and artifacts.
     - `2026-09-02-task-agent-tool-name-drift`: the four `allowed_tools`
       declarations now say `Agent`. What remains is the cosmetic
       `<uses Task tool>` narration in the agents' description examples.

**Validation:**

- [ ] Every migration test is green, and the guards were seen failing.
- [ ] This repository is on the new layout, and `npm run check` is green after
      retirement.
- [ ] The session records what the move took. Script fixes the run forced have
      landed, each with a test.

**Dependencies:** Phases 1 and 2 (for the script). Phase 3 (for the dogfood).
Phase 4 should land before the dogfood, so this repo's own skills work on its
new tree the day it moves. This is not strict.

---

### Phase 6: The second consumer, revision, and release

**Goal:** the migration survives a tree that this repository did not shape, and
the release ships.

**Tasks:**

1. **Story-loom first**, once it is on v2.10; run v2.9→v2.10 there first if it
   is behind. **Then Spellbook or MediaForge**, as a further check on a tree
   shaped differently.
2. Run the guide's pre-run judgment steps with the consumer's owner, then
   `--dry-run`, then the real run. File every friction point as a `triage` item
   in this repo, `from:` the session that records the run.
3. Revise the script and the guide from those items, adding a test per fix.
   Re-run on a fresh clone of the consumer until a run needs no step the guide
   does not state.
4. Release:
   - Land `develop` on `main` with a `feat!:` commit carrying
     `BREAKING CHANGE:`. release-please bumps `package.json`,
     `.release-please-manifest.json`, `docs_version` in both `README.md` copies,
     both `.project-docs.json` copies, and `VERSION` in both
     `scripts/pdocs/cli.ts` copies (`release-please-config.json`'s
     `extra-files`). Then run `npm run check:version`.
   - Confirm the `project-docs-scaffold-template-v9.0.0` tag exists and that
     `migrate-v2.10-to-v3.0.ts` fetches it without `--scaffold-dir`: a
     `--dry-run` on a v2.10 tree with no flag reaches phase 3 (D16).
   - Bump plugins by hand: `project-docs` 4.0.0; `operator` and `hivemind`
     minor.
   - Rebuild `dist/` and run `npm run check`.
   - Review pruning migrations below the oldest version any known consumer is on
     (see the consumer population).
5. After the release, file a `triage` item to revisit `released_in` once the
   release touch point has been used (see the proposal's Open Questions).

**Validation:**

- [ ] The consumer's `pdocs check` is green on the migrated tree, and its owner
      confirms that nothing was lost.
- [ ] The release PR's `npm run check` is green, and the generated payload is
      verified.

**Dependencies:** Phase 5.

## Key Risks & Mitigations

- **Consumers are behind.** Story-loom was still on 8.0.0 when the proposal was
  written, and it is mid-feedback-cycle. A major release compounds the gap. →
  The migration requires v2.10 and says so in `Applies If`, so an adopter who is
  behind runs v2.9→v2.10 first. The second-consumer run (Phase 6) gates the
  release. The guide's first section says "run the previous migration if you are
  behind".
- **The single release is very large.** It covers two proposals, about 25 skill
  files, the registry, the payload and a 12-phase script. → "Add → migrate →
  retire" lets each phase land on `develop` green and be reviewed alone. Nothing
  is released until P6. The one irreversible step for a consumer is the script,
  and it leaves its changes uncommitted.
- **Fields go stale without a writer.** → Phase 4 is scoped by the touch-points
  list, one row per writer. `pdocs set` is the one way to write a state.
  Agent-created items start in `triage` and leave it through the `triage-items`
  step the user has seen (D8). The Phase 4 validation exercises `init-branch`
  through `finalize-branch` end to end.
- **Path churn breaks skill references.** About 25 plugin files hardcode
  `docs/projects/` or a retired folder (see the Phase 4 table). → The Phase 4
  `grep` gate; `pdocs` resolves items by `id`; the link rewriter is shared by
  promotion and migration; and `pdocs check` already lints tracked markdown
  outside `docs/`, including `plugins/`, for links.
- **Old migrations meet the new layout.** `update-project-docs` runs every
  applicable migration in order, and the scripts below v2.10 break on the 9.0.0
  scaffold. → D16: each old script is pinned to its own scaffold release, and
  its tests build from that tag (Task 1.4 for the tests, Phase 5 for the
  scripts).
- **Linting the archive puts frozen history under the gate.** 47 archived
  documents in this repo have no frontmatter, and their links have never been
  checked. → Synthesized frontmatter. The verify phase names what remains, and
  the dogfood records the real count before any consumer meets it.
- **The "done, no `released_in`" view is flooded by migrated history.** Every
  migrated `done` item has no `released_in`. → `view unreleased --since <date>`.
  The guide gives the migration date as the natural cutoff.
- **A migration now edits "theirs" files.** Documents move, and
  `.project-docs.json` arrays are patched. → The `SCHEMA.md` ownership amendment
  (Phase 3). The script prints every move and every config key it wrote, and
  changes no prose (Phase 5 test 5 proves it).

## Testing & Validation Strategy

- **The gate:** `npm run check` (format, `docs:lint`, `check:version`,
  `check:mirror`, `check:dist` and `bun test`) and `npx tsc --noEmit`. Both run
  at the end of every task that touches code. The pre-commit hook runs `check`
  anyway.
- **Unit and fixture tests**, one file per module: `docs-lint/config.test.ts`,
  `lint/registry.test.ts`, `lint/rules.test.ts`, `lint/work.test.ts`,
  `uuid.test.ts`, `work.test.ts`, and
  `commands/{new,set,view,promote,read}.test.ts`. Also the goldens
  (`lint/golden.test.ts`) and `cli.test.ts`.
- **Known pitfalls:**
  - Tests spawn children through `childEnv()` from `scripts/pdocs/test-env.ts`.
    Git-dependent lint checks (Task 1.8) are exercised through a child `pdocs`
    process, never in-process from a hook environment.
  - Test files and `test-env.ts` are **not** mirrored to the payload. The
    generated-payload `find` asserts none shipped.
  - Migration tests **derive** owned-file diffs. release-please rewrites
    `VERSION` in `scripts/pdocs/cli.ts` on every release.
  - Run Prettier on sources **before** `build:dist`, and rebuild twice.
  - A new non-test file under `scripts/pdocs/` must be copied to the payload by
    hand. The mirror check catches drift, not omission; use the `diff -rq` from
    Task 2.9.
- **Generated-payload verification**, at the end of Phases 1, 3 and 5:
  `cookiecutter . --no-input … install_target="New project folder"`, then
  `pdocs check`, `ls -A`, and the no-tests and no-dev-setup `find`s from the
  scaffold checklist.
- **Behavioural checks** that are not unit tests: the Phase 2 scratch-project
  walk, the Phase 4 skill walk, and the dogfood and consumer runs.

## Assumptions & Constraints

**Assumptions:** story-loom reaches v2.10 before Phase 6. Tag
`project-docs-scaffold-template-v8.1.0` is the v2.10 fixture baseline. No other
release is cut from `develop` while this is in flight.

**Constraints:** `pdocs` stays zero-dependency. The payload stays
production-only. The migration never deletes a document.

## Rollback Plan

- **Before release:** each phase is its own squash on `develop`, so a phase is
  reverted with `git revert <sha>`. The gate is green before and after, because
  of add → migrate → retire. The retirement commit is reverted **before** the
  dogfood commit, never alone after it.
- **A consumer's run:** the script commits nothing, and the guide says to commit
  or stash first. To go back without losing work of the adopter's that the
  preflight allowed to stay uncommitted: stash everything with
  `git stash push --include-untracked`; reset to the pre-run commit (the first
  run prints it as `starting from commit <sha>` and records it) only if the
  adopter committed mid-migration; re-run from the start after deleting the
  run's record; then restore the adopter's own work from the stash — tracked
  files with `git checkout stash@{0} -- <path>`, untracked ones from the stash's
  third parent with `git checkout 'stash@{0}^3' -- <path>` (listed by
  `git stash show --include-untracked stash@{0}` or
  `git show --stat 'stash@{0}^3'`), re-applying by hand any edit to a document
  the migration rewrites rather than restoring its half-migrated copy, and
  keeping the stash until all of it is back. The reset also drops the adopter's
  commits after the base; `git reflog` and `git cherry-pick` bring them back.
  Never a whole-tree `git clean` or `git checkout -- .`: it also takes
  uncommitted work that has nothing to do with the migration. The guide's "If
  the record is corrupt, or you deleted it" gives the same steps.
- **After release:** there is no down-migration. A consumer that needs to go
  back pins the plugin at 3.13.x and reverts its migration commit. Say so in the
  guide.

## Open Questions

- **What a UI needs for ordering.** A rank field, or a sort at view time? `view`
  sorts by priority, then `generated.at`, then path, and adds no field. This is
  left to the UI project, per the proposal.

Resolved 2026-09-22 and recorded in the Decisions table: the version numbers
(D14), whether `sweep-project` survives (D15), and the second consumer
(story-loom, then Spellbook or MediaForge; Phase 6).

---

**Related Documents:**

- [Proposal](./proposal.md)
- [Guidance Lifecycle proposal](../guidance-lifecycle/proposal.md)
- [Docs Foundation plan](../docs-foundation/plan.md)
- [Investigation](../../investigations/2026-09-22-work-taxonomy-for-agent-first-development-investigation.md)
- [How work flows here report](../../reports/2026-09-22-how-work-flows-report.md)
- [SCHEMA.md](../../SCHEMA.md)
