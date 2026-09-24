---
type: artifact
title: "Work Taxonomy Phase 4: Skill Audit"
description:
  Every skill, command and agent the taxonomy touches, with a verdict for each,
  whether this release requires it, and the file:line evidence behind it.
tags: [taxonomy, skills, touch-points, audit]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-24 }
---

# Work Taxonomy Phase 4: Skill Audit

Task 4.0 of the [plan](../plan.md). It covers every skill, command and agent in
`plugins/project-docs/`, and every file elsewhere in `plugins/` that names a
retired folder, a retired type or `--project`. Line numbers are against
`feature/work-taxonomy-p4-skills` at `bfac630`, and paths are relative to
`plugins/`.

**Verdicts:** **keep** (no change), **update** (the edits are named),
**rename**, **merge**, **retire**, **create**.

- **Required** means the taxonomy or Guidance Lifecycle forces the change: the
  skill names a retired path, type, template or flag, or it is a named touch
  point.
- **Optional** means worth doing but not forced. Per Task 4.0, each optional
  change is filed as a `triage` item and stays out of this release.

## Summary

| Skill / command / agent                    | Verdict                      | Required?                                  |
| ------------------------------------------ | ---------------------------- | ------------------------------------------ |
| **project-docs skills**                    |                              |                                            |
| `backlog-to-projects`                      | **retire**, replaced (D12)   | required                                   |
| `triage-items` (new)                       | **create** (D12)             | required                                   |
| `consolidate-long-branch`                  | keep                         | —                                          |
| `create-investigation`                     | update                       | required                                   |
| `create-project`                           | update (name kept)           | required: **broken today**                 |
| `dev-discovery`                            | update                       | required                                   |
| `dev-kickoff`                              | update                       | required                                   |
| `document-validation`                      | update                       | required; merging it is optional           |
| `evaluative-research`                      | keep                         | —                                          |
| `finalize-branch`                          | update (the one revision)    | required                                   |
| `gap-analysis`                             | keep                         | —                                          |
| `generate-design-resolution`               | update                       | required                                   |
| `generate-dev-plan`                        | update                       | required                                   |
| `generate-proposal`                        | update                       | required; merging it is optional           |
| `generate-slide-deck`                      | update                       | required                                   |
| `generate-spec`                            | keep                         | —                                          |
| `generate-test-plan`                       | update                       | required                                   |
| `ground-in-project`                        | update                       | required                                   |
| `html-mockup-prototyping`                  | update (one line)            | required; merging the two copies: optional |
| `idea-to-spec`                             | keep                         | —                                          |
| `implementation-blueprint`                 | keep (the plan's row is off) | —                                          |
| `investigation-methodology`                | update (one line)            | required                                   |
| `provide-feedback`                         | keep                         | —                                          |
| `review-docs`                              | update                       | required; narrowing it: optional           |
| `sweep-project`                            | update (large)               | required                                   |
| `tech-integration-research`                | keep                         | —                                          |
| `update-project-docs`                      | update                       | required                                   |
| `workshop-idea`                            | update                       | required                                   |
| **project-docs commands**                  |                              |                                            |
| `init-branch`                              | update                       | required                                   |
| `project-manifesto`                        | keep                         | —                                          |
| `project-recipe`                           | keep                         | — (optional fix)                           |
| `project-summary`                          | update                       | required                                   |
| `start-dev-kickoff`                        | update (one line)            | required                                   |
| `update-deps`                              | keep                         | — (optional fix)                           |
| **project-docs agents**                    |                              |                                            |
| `dev-plan-generator`                       | update                       | required                                   |
| `docs-curator`                             | update                       | required                                   |
| `gopher-dev`                               | keep                         | —                                          |
| `investigator`                             | update                       | required                                   |
| `proposal-writer`                          | update                       | required                                   |
| `slide-deck-author`                        | keep (the plan's row is off) | — (optional fix)                           |
| `test-plan-generator`                      | update (one line)            | required                                   |
| `unit-test-writer`                         | keep                         | — (optional generalize/retire)             |
| `web-researcher`                           | keep                         | —                                          |
| **Plugin metadata**                        |                              |                                            |
| `project-docs/README.md`, `plugin.json`    | update → `4.0.0`             | required                                   |
| **Other plugins**                          |                              |                                            |
| `operator/operator-triage`                 | update, minor bump           | required                                   |
| `operator/operator-setup`                  | keep                         | —                                          |
| `hivemind/hivemind-consult`                | update, minor bump           | required                                   |
| `hivemind/hivemind-digest`                 | keep (the plan's row is off) | — (optional)                               |
| `hivemind/hivemind-capture`, `-feedback`   | keep                         | —                                          |
| `toolbox/html-mockup-prototyping`          | keep                         | — (optional merge)                         |
| `toolbox/maestro-testing`, `-screenshot-…` | keep                         | —                                          |
| `recipes/recipes`, `recipes/create-recipe` | keep                         | — (grep hits are false positives)          |
| `agent-bridge/bridge-agent`                | keep                         | — (grep hit is a false positive)           |

**Counts.** The project-docs plugin has 27 skills, 6 commands and 9 agents, and
it still has 27 skills after the change: `triage-items` replaces
`backlog-to-projects`. In project-docs this release requires edits to 18 skills,
3 commands, 5 agents and the README with `plugin.json`, plus `operator-triage`
and `hivemind-consult`. Every other skill, command and agent is kept.

## Three places the plan's table is wrong

1. **`implementation-blueprint` has nothing to remove.** The plan's row lists it
   for "remove memory, lesson, brief, fragment and `_archive/` references". A
   case-insensitive grep finds only "memory usage" (`SKILL.md:134`) and "brief"
   used as an adjective (`:104`, `:144`, `:168`). Verdict: keep.
2. **`hivemind-digest` does not write to `docs/lessons-learned/`.** Its "Lessons
   Learned" is a folder in HiveMind itself, the Operator group
   `25izJ8swJEYP0B23UhZz0` (`hivemind-digest/SKILL.md:146`). Digest writes into
   HiveMind through Operator MCP (`:62`, `:128`) and never into a project's
   `docs/`. Guidance Lifecycle retires the project-docs `lesson` type, not
   HiveMind's folder. Verdict: keep, and fold "does HiveMind keep Lessons
   Learned?" into the `hivemind` plugin project. Only `hivemind-consult` writes
   into a project (`:62`, `:107`), so only it must change.
3. **`slide-deck-author` names no retired path.** It says "investigation" as a
   kind of content (`:6`, `:33`, `:118`), and that word still names research.
   Its only paths are `plugins/project-docs/skills/generate-slide-deck/...`
   (`:44`, `:133`, `:134`). Those are a separate, older bug (see Optional).
   Verdict: keep.

## Per-skill detail

### project-docs skills

#### `backlog-to-projects` — retire, replaced by `triage-items` (required, D12)

- **Today:** reads `docs/backlog/`, groups the items into projects with a
  parallelism analysis, creates `projects/<x>/proposal.md` for each group, and
  moves the absorbed items into `backlog/_archive/`.
- **Depends on:** `docs/backlog/` (`SKILL.md:33`, `:110`, `:150`),
  `docs/projects/TEMPLATES/PROPOSAL.template.md` (`:100`),
  `docs/projects/<name>/proposal.md` (`:101`, `:104`), a hand move into
  `_archive/` (`:110`), and links to `../../backlog/_archive/` (`:153`).
- **Evidence:** every path it reads or writes is retired. Its hand move into
  `_archive/` breaks D15, and its move of a non-terminal item breaks D9.
  Grouping items into a project is now setting `parent: feature/<x>`. Its
  trigger "prioritize backlog items" (`:7`) is now `triage-items`' job.
- **Carry forward:** Steps 2–3 (clustering by shared files, and the parallelism
  matrix) are the only part with no home in D12's `triage-items`, which sets an
  existing `parent`. Decide whether `triage-items` also proposes a new feature
  for a cluster, or whether that analysis is dropped (see Capabilities missing,
  item 7).

#### `consolidate-long-branch` — keep

- **Today:** collapses a long branch into chapter commits, using backup refs and
  a tree-equivalence check.
- **Depends on:** no docs path.
- **Note:** under the `consolidate` landing policy, `finalize-branch` hands the
  landing to this skill. The `Work-Item:` trailer (D10) then has to land on a
  chapter commit or on the merge. That is a `finalize-branch` decision, below.

#### `create-investigation` — update (required)

- **Today:** turns rough input into
  `docs/investigations/YYYY-MM-DD-<topic>-investigation.md`, written by hand.
- **Depends on:** `docs/investigations/` (`SKILL.md:7`, `:60`, `:170`), and
  hand-filled `type: investigation` / `lifecycle: active` frontmatter
  (`:64–:77`). `pdocs new investigation` is refused in 9.0.0 (it names the
  replacement).
- **Changes:**
  - Create the research item with `pdocs new item <slug> --kind research`, then
    its answer with `pdocs new write-up --owner item/<slug>`.
  - Pass `--lifecycle ready` (or `active`) when the user asked for the
    investigation. SCHEMA's "Who moves an item" gives a person who already wants
    an item `--lifecycle ready`, and the `triage` default is for items an agent
    files on its own.
  - The body goes into `write-up.md`, and the question and definition of done go
    into the item.
  - Rewrite the description and the Output section.
- **Support files:** `OVERVIEW.md` (the old `investigations/README.md`) and
  `YYYY-MM-DD-TEMPLATE-investigation.md` are linked from nowhere in `SKILL.md`,
  and the template predates frontmatter (`**Status:**` in the body, `:17`). The
  plan says "the skill's own template copy becomes the write-up template".
  `pdocs new write-up` already seeds from `docs/TEMPLATES/WRITE-UP.template.md`,
  so a second copy here would drift. **Recommend deleting both** rather than
  rewriting them. Two tests name the template's filename as a string
  (`scripts/seeded-coverage.test.ts:67`, `:103`, and
  `scripts/pdocs/lint/rules.test.ts:267`, `:290`). They test the name pattern,
  not this file, so check them before deleting.

#### `create-project` — update, name kept (required; broken today)

- **Today:** makes a project folder with a `proposal.md` through
  `pdocs new project <name>`.
- **Broken now:** `pdocs new project foo` exits 2 with "`project` was replaced
  by `feature` in 9.0.0" (checked against a copy of the payload's `docs/`). The
  command at `SKILL.md:53` no longer works on a 9.0.0 tree.
- **Depends on:** `docs/projects/` and `proposal.md` (`:4`, `:17–:18`, `:29`),
  "a `fragment` or a `backlog` item" (`:27`), and `pdocs new project`
  (`:53–:63`).
- **Changes:**
  - `pdocs new feature <slug>`; a new feature starts in `backlog`.
  - "Not yet worth a feature" means a `triage` item.
  - `/generate-dev-plan feature/<slug>`.
  - Rewrite the description.
- **`references/pdocs.md` changes:**
  - The type table (`:366–:409`) lists `lesson`, `memory`, `fragment`, `brief`,
    `proposal` and `investigation` as creatable, and says "18 of 23 types are
    creatable".
  - Remove the `new project` alias and its example (`:391–:393`, `:461–:470`),
    the `--project` flag (`:442`), and the retired-path examples (`:243`,
    `:305`, `:416`, `:474`, `:484`).
  - "The nine verbs" (`:196`) are now thirteen. Document `new item`,
    `new feature`, `--owner`, `view`, `set`, `promote`, `archive`,
    `check --against`, and `find`'s work filters.

#### `dev-discovery` — update (required)

- **Today:** before planning, sends out explorers and writes a discovery
  artifact.
- **Depends on:**
  - a "methodology in `docs/lessons-learned/`" (`SKILL.md:34`), which no
    consumer has;
  - `docs/projects/<project>/artifacts/` (`:139`, `:149`, `:174`, `:270`);
  - the example paths `docs/projects/operator-hub-export-import/…` (`:143`,
    `:318`).
- **Changes:** use the owner's `artifacts/` (`features/<x>/` or `items/<y>/`),
  and drop the lessons-learned pointer.

#### `dev-kickoff` — update (required)

- **Today:** starts implementation from a proposal. It creates a branch or a
  worktree, writes `DEV_KICKOFF.md`, and can run discovery and planning.
- **Depends on:**
  - `docs/projects/<name>/proposal.md`, `design-resolution.md`, `plan.md` and
    `artifacts/` (`SKILL.md:24`, `:51–:52`, `:103`, `:117`, `:133`, `:140`,
    `:143`);
  - the template's links (`templates/DEV_KICKOFF.template.md:21–:25`).
- **Changes named by the plan:**
  - Consult: `pdocs find --type playbook --format json`, quoting the paths or "0
    matches".
  - Override: `docs/playbooks/dev-kickoff-playbook.md`.
  - Owner paths, with the entry file `feature.md` / `item.md` in place of
    `proposal.md`.
- **Also required, not in the plan:**
  - Step 3B creates the branch itself (`:98–:103`), and so does the worktree
    script (`scripts/create-worktree.sh`). Neither calls `init-branch`, so the
    kickoff path bypasses the named writer of `active` and `cycle`.
  - Either have both run `init-branch`'s Step 1 and Step 5, or have them issue
    the same `pdocs set` themselves.
  - `pdocs new kickoff` refuses by design (the template ships in the skill). A
    hand-written `DEV_KICKOFF.md` therefore has to carry the owner link that D17
    otherwise has the CLI write.

#### `document-validation` — update (required); merge optional

- **Today:** the method `docs-curator` follows (`agents/docs-curator.md:28`):
  lifecycle and archival rules for each type, then gathering evidence.
- **Depends on:**
  - projects, proposals, plans and archiving to `projects/_archive/`
    (`SKILL.md:32–:48`);
  - `**Status:**` body lines (`:47–:48`, `:56`, `:200`);
  - `docs/investigations/` and its archive (`:50–:56`);
  - `docs/reports/` and its archive (`:58–:62`);
  - `docs/lessons-learned/` (`:94`), `docs/fragments/` (`:102`), and
    `docs/projects/*/sessions/` (`:131`).
- **Changes:**
  - Replace the per-type table with "read `docs/SCHEMA.md` → Lifecycle by type".
  - Archive only through `sweep-project` (`pdocs archive`).
  - Remove lesson, fragment and investigation, and the `**Status:**` lines.
    Those lines have been stale since frontmatter arrived in v2.7.
- **Optional:** merge it into `docs-curator`, its only reader (see Optional).

#### `evaluative-research` — keep

- **Today:** a method for comparing options, with no docs paths.

#### `finalize-branch` — update, the single revision (required)

- **Today:** review, quality gate, session doc, memory, extra docs, cycle line,
  then landing per policy.
- **Depends on:**
  - the description "session documentation in docs/projects/, writes memory
    docs" (`SKILL.md:8`);
  - the reviewer's spec list naming `proposal.md` (`:142`);
  - memory mentions at `:250`, `:500` and `:560`;
  - the session under `docs/projects/<x>/sessions/` and the old template path
    (`:273–:278`);
  - Step 5 "Create Memory" (`:307–:340`);
  - the handoff template path (`:352`) and test-plan path (`:361`);
  - plan reconciliation against `**Status:**` in the plan template
    (`:365–:372`);
  - the sweep target "under `docs/backlog/`" (`:400–:403`);
  - the cycle `scope:` logic (`:450–:470`).
- **Changes named by the plan:** Steps 0, 2, 4, 5 (Reflect), 6 and 8 (trailer),
  and the three overrides (`branch-finalization`, `handoff`, `release`). The
  plan's touch-point list carries them in full.
- **Also required, not in the plan's list:**
  - Every remaining mention of the memory, at `:250`, `:500` and `:560`.
  - `:142`: the owner's entry file, not `proposal.md`.
  - `:352`: `pdocs new handoff --owner …`.
  - `:365–:372`: plans carry `lifecycle` in frontmatter now. Reconcile through
    it, and drop the `**Status:**` enum.
  - The sweep target becomes a `feature/<x>` or `item/<y>` reference.
  - The cycle-done question becomes `pdocs view cycle <slug>` reporting
    `closable`, not reading `scope:`.
- **Open question for the revision:** D10 puts `Work-Item:` on "the landing
  commit". Under the policy that leaves history untouched (fast-forward or plain
  merge), and under `consolidate`, it is not obvious which commit that is. Say
  where the trailer goes for each of the three policies.

#### `gap-analysis` — keep

- **Today:** a method for finding what a document is missing. No docs paths.

#### `generate-design-resolution` — update (required)

- **Today:** resolves design ambiguity in a proposal through Q&A.
- **Depends on:** `docs/projects/$1/proposal.md` (`SKILL.md:51`), the projects
  README (`:52`), the old template path (`:54`, `:176`), the output path
  (`:175`, `:204`), and "link to the proposal via `./proposal.md`" (`:181`).
- **Changes:**
  - Owner paths.
  - `pdocs new design-resolution --owner …`, which writes the owner link (D17),
    so drop `:181`.

#### `generate-dev-plan` — update (required)

- **Today:** writes `plan.md` from a proposal.
- **Depends on:**
  - the description's "proposal in docs/projects/" (`SKILL.md:4–:8`);
  - `docs/projects/$1/…` (`:18`, `:23`, `:25`, `:59`, `:144`);
  - the projects README (`:28`) and the old template (`:61`);
  - `lifecycle: draft` for the plan, which is unchanged (`:68`).
- **Changes:**
  - **Consult** by running `pdocs find --type playbook --format json` and
    quoting the paths, or "0 matches". This is the evidence Guidance Lifecycle
    requires.
  - **Shaping:** set `blocked_by` and move items to `ready` with `pdocs set`.
  - `pdocs new plan --owner feature/<x>|item/<y>`.
  - `$1` becomes an owner reference, not a folder name.

#### `generate-proposal` — update (required); merge optional

- **Today:** turns a concluded investigation into `projects/<x>/proposal.md`.
- **Depends on:**
  - input `docs/investigations/$1` (`SKILL.md:16`, `:21`);
  - "Proposal Recommended" read from the investigation's body (`:26–:29`);
  - output under `docs/projects/` (`:56–:62`, `:111`);
  - `lifecycle: draft`/`approved` (`:68–:69`);
  - "a lesson" in the `related` advice (`:71`).
- **Changes:**
  - The input is a research item and its `write-up.md`.
  - The output is `pdocs new feature <slug> --from <write-up path>`, which
    starts in `backlog` and is `ready` once approved.
  - Drop "lesson".
- **Optional:** merge into `create-project` (see Optional).

#### `generate-slide-deck` — update (required)

- **Today:** writes a Slidev deck for a human to review.
- **Depends on:** `docs/projects/<name>/artifacts/` (`SKILL.md:272`, `:288`,
  `:289`), and "No project yet (investigation, brief, …)" (`:292`).
- **Changes:** use the owner's `artifacts/`, and reword the "no owner yet" case.

#### `generate-spec` — keep

- **Today:** reverse-engineers specifications into `docs/specifications/`, a
  durable folder that is unchanged.

#### `generate-test-plan` — update (required)

- **Today:** writes a tiered `test-plan.md` from the plan and the proposal.
- **Depends on:** `docs/projects/$1/…` (`SKILL.md:51–:54`, `:138`, `:150`,
  `:167`), the old template path (`:56`, `:139`), and the projects README
  (`:57`).
- **Changes:** owner paths, and `pdocs new test-plan --owner …`.

#### `ground-in-project` — update (required)

- **Today:** a quick orientation in chat, written to no file.
- **Depends on:**
  - the description's "peeks at active projects and investigations"
    (`SKILL.md:6`);
  - `ls docs/projects/`, `proposal.md`, `docs/investigations/` and `_archive`
    (`:87–:91`);
  - sessions under `docs/projects/*/sessions/` (`:93`);
  - "playbooks, lessons-learned, or memories" (`:102`);
  - the example `docs/projects/x-migration/` (`:126`).
- **Changes:**
  - Read `bun scripts/pdocs/cli.ts view board`.
  - Find recent sessions under `features/*/sessions/` and `items/*/sessions/`.
  - Drop memories, lessons and the `_archive` notes.

#### `html-mockup-prototyping` — update, one line (required); merge optional

- **Today:** builds a self-contained HTML prototype.
- **Depends on:** `docs/projects/<project>/artifacts/` (`SKILL.md:188`).
- **Change:** use the owner's `artifacts/`.
- **Optional:** `toolbox/skills/html-mockup-prototyping/` is the same skill.
  `diff -r` shows only this paragraph differs (toolbox asks where to save). Both
  plugins load in one session, so there are two skills with one name and one set
  of triggers.

#### `idea-to-spec` — keep

- **Today:** takes an idea through to a set of specifications in
  `docs/specifications/`.

#### `implementation-blueprint` — keep

- **Today:** picks a stack and writes a blueprint from the specifications.
- **Note:** nothing the taxonomy retires is in it (see "Three places the plan's
  table is wrong"). It writes `docs/implementation-blueprint.md` (`:159`), which
  no registry type covers, so the lint reports it (see Optional). That problem
  predates the taxonomy.

#### `investigation-methodology` — update, one line (required)

- **Today:** a framework for research and root-cause analysis.
- **Depends on:** "templates in `docs/investigations/README.md`"
  (`SKILL.md:120`).
- **Change:** point at `docs/TEMPLATES/WRITE-UP.template.md` and at
  `docs/items/README.md` (a research item's three parts).

#### `provide-feedback` — keep

- **Today:** files a GitHub issue upstream. No docs paths.

#### `review-docs` — update (required); narrowing optional

- **Today:** sends one `docs-curator` per document, sums up the findings, then
  archives or updates.
- **Depends on:**
  - globs over `docs/projects/*/proposal.md`, `plan.md` and `sessions/`
    (`SKILL.md:54–:70`, `:204`);
  - `docs/investigations/` and `docs/reports/` treated as temporal (`:82–:83`),
    and `docs/lessons-learned/` (`:90`);
  - **archiving by hand**: "Move to `_archive/` subfolder" (`:157`);
  - a status report at `docs/reports/YYYY-MM-DD-doc-status-report.md` (`:237`).
- **Evidence:** `:157` breaks D15 (`pdocs archive` is the only way in).
  `docs/reports/` has no home in 9.0.0: `pdocs new report` needs `--owner`, and
  a loose `docs/reports/*.md` is reported as untyped (`NO FRONTMATTER`,
  `ORPHAN`, checked in a scratch copy of the payload).
- **Changes:**
  - Globs over `features/`, `items/` and the library.
  - Hand workbench archival to `sweep-project`.
  - Decide where the report goes (Capabilities missing, item 4).

#### `sweep-project` — update, large (required)

- **Today:** reconciles a project folder, backlog item or cycle against what
  shipped, then records the remainder, or archives on confirmation and rewrites
  cross-references.
- **Depends on:**
  - target resolution through `ls docs/projects/` and `docs/backlog/`
    (`SKILL.md:136`, `:150–:153`);
  - the Cycle Path reading the cycle's `scope:`, with `project/<name>` and
    `backlog/<item>` (`:185–:199`, `:241`);
  - Step 3's hand-rolled reference discovery with `docs/projects/` and
    `docs/backlog/` exclusions (`:529–:688`);
  - Step 5b's hand `git mv` into `projects/_archive/` and `backlog/_archive/`,
    and the `_archive/` rewrite rule (`:782–:830`);
  - verification greps (`:898–:913`);
  - memory and lesson "Leave" buckets (`:629–:632`, `:970`).
- **Changes (D15):**
  - Targets are `feature/<x>`, `item/<y>` or `cycle/<slug>`.
  - Step 2 reconciliation stays.
  - Write the terminal `lifecycle` with `pdocs set`. A feature's is `done` or
    `dropped`; the old proposal values `implemented` and `withdrawn` go.
  - Write `released_in` when a person supplies it.
  - **Steps 3 and 5b collapse into `pdocs archive <ref>`**, which moves the
    entity and rewrites inbound and outbound links. Most of `:529–:913` goes.
  - The Cycle Path uses `pdocs view cycle <slug>` and its `closable`, then
    `pdocs set cycle/<slug> --lifecycle closed --closed <date>`.
  - The trigger phrases ("archive this project", "is this project done") still
    match what users say. Keep them.

#### `tech-integration-research` — keep

- **Today:** web research on how technologies integrate. No docs paths.

#### `update-project-docs` — update (required)

- **Today:** upgrades a consumer's `docs/` by running the migration chain.
- **Depends on:**
  - the migrations table (`SKILL.md:323–:333`), which gets the `v2.10-to-v3.0`
    row in Phase 5;
  - the example category list "`backlog/`, `memories/`" (`:67`);
  - the docs-pointer check regex including `docs/memories` (`:366`);
  - the recommended pointer copy "start with [docs/memories/]" (`:389–:390`);
  - the Documentation CLI blurb (`:492–:505`).
- **Changes:**
  - Add the migrations row (Phase 5), and the note that each step runs against
    its own scaffold (D16).
  - The pointer copy says "start with `bun scripts/pdocs/cli.ts view board`".
    The check regex can keep matching `docs/memories` for older projects.
  - The CLI blurb names `view` and `set`.
- **Note:** the older rows' Applies-If tests check for paths that `v3.0`
  removes: `[ ! -d docs/projects ]` (v1→v2), `[ ! -d docs/briefs ]` (v2.4→v2.5)
  and `docs/projects/TEMPLATES/…` (v2.0→v2.3, v2.3→v2.4). On a 9.0.0 tree those
  tests come back **true**. They are safe only because Step 3 narrows by version
  first (`:124–:126`). Say so beside the table, or a project with no version
  marker is offered the v1→v2 migration.

#### `workshop-idea` — update (required)

- **Today:** a two-phase Q&A that shapes a rough idea into a brief.
- **Depends on:**
  - the description "produces a brief in docs/briefs/" and "develop this
    fragment" (`SKILL.md:4–:10`);
  - `docs/briefs/YYYY-MM-DD-<name>.md` and `docs/briefs/TEMPLATES/…`
    (`:126–:127`), neither of which exists in 9.0.0;
  - "Set status to Active" (`:128`);
  - the handoff wording (`:138–:145`).
- **Changes:** the output is a feature (`pdocs new feature`, in `backlog`) or a
  `triage` item, per the plan.
- **Tension to settle:** the skill stresses "the brief is not a proposal"
  (`:157`), yet its output is now a `feature.md`, which is the proposal. Say
  what goes into the feature body at this stage: the identity-level brief, with
  the proposal sections left for later.

### project-docs commands

#### `init-branch` — update (required)

- **Today:** creates a branch from `develop` and adds it to the active cycle's
  Sessions.
- **Depends on:** the active cycle found by grepping `docs/cycles/*.md`
  (`init-branch.md:84–:85`).
- **Changes (plan):**
  - Step 1 picks the item: offer what `pdocs view ready` lists, start a
    `backlog` item only when the user names it, and never start a `triage` item.
  - Step 5 runs `pdocs set <item> --lifecycle active --cycle <active cycle>`.
  - The Sessions line stays (`docs/cycles/README.md` still describes it).
  - The override stays.
- **Small addition:** find the active cycle with
  `pdocs find --type cycle --lifecycle active`, which respects `docsRoot`, in
  place of the grep.

#### `project-manifesto` — keep

- **Today:** writes or updates `docs/PROJECT_MANIFESTO.md`, which is unchanged.

#### `project-recipe` — keep

- **Today:** writes `docs/PROJECT-RECIPE.md` (`:161`). No registry type covers
  that file, so the lint reports it. The problem predates the taxonomy (see
  Optional).

#### `project-summary` — update (required)

- **Today:** builds `docs/PROJECT-SUMMARY.md` from scratch or refreshes it, plus
  a report.
- **Depends on:**
  - `docs/projects/` and `docs/investigations/` as change triggers and reads
    (`:69–:70`, `:112–:113`, `:175–:176`, `:194`, `:220–:224`, `:317–:319`,
    `:422`, `:611`, `:614`);
  - `docs/lessons-learned/` (`:177`, `:195`, `:321`, `:623`) and
    `docs/memories/` (`:330`);
  - sessions under `projects/*/sessions/` (`:211`, `:328`, `:600–:601`);
  - **reports written to `docs/reports/`** (`:235`, `:278`, `:322`, `:363`,
    `:653`).
- **Changes:**
  - Read `pdocs view board` and recent owner sessions.
  - Drop memories and lessons; their patterns now live in `docs/playbooks/`.
  - Decide where the report goes (Capabilities missing, item 4).

#### `start-dev-kickoff` — update, one line (required)

- **Today:** finds `DEV_KICKOFF.md` and follows it.
- **Depends on:** the glob `docs/projects/*/DEV_KICKOFF.md` (`:28`).
- **Change:** glob `docs/{features,items}/*/DEV_KICKOFF.md`, and keep the
  worktree-root case.

#### `update-deps` — keep

- **Today:** updates dependencies with tests. No docs paths. Its `allowed_tools`
  names `Terminal` (`:3`), which no current environment provides (see Optional).

### project-docs agents

#### `dev-plan-generator` — update (required)

- **Today:** writes a development plan.
- **Depends on:** the projects README (`:23`), the old template (`:25`), and the
  output `docs/projects/<x>/plan.md` (`:27`, `:87`).
- **Change:** owner paths and `pdocs new plan --owner`. The plan asks for
  consult in the `generate-dev-plan` skill, not in this agent.

#### `docs-curator` — update (required)

- **Today:** validates one document against the code and recommends archive,
  update or no action.
- **Depends on:** the examples in its description,
  `docs/projects/user-defined-ai-operations/proposal.md` and `docs/projects/`
  (`:10`, `:23`), and `skills: document-validation` (`:28`), which carries the
  retired lifecycle rules.
- **Changes:**
  - Examples use `features/…/feature.md` or an item.
  - An "archive" recommendation means `done`/`dropped` followed by
    `sweep-project`, never a move.

#### `gopher-dev` — keep

- **Today:** quick, focused code edits. No docs paths.

#### `investigator` — update (required)

- **Today:** structured research. It saves an investigation document in
  `docs/investigations/` (`:116`, `:148`).
- **Changes:**
  - Its output is the `write-up.md` of a research item: create it, or use the
    one given.
  - Say who moves the item to `done` when the research concludes (see
    Capabilities missing, item 3).

#### `proposal-writer` — update (required)

- **Today:** turns findings into a project folder and `proposal.md`.
- **Depends on:** the projects README (`:23`, `:88`), the old `PROPOSAL`
  template (`:27`), and the output folder and file (`:85`, `:87`).
- **Change:** `pdocs new feature <slug>`, then fill in `feature.md`.

#### `slide-deck-author` — keep

- See "Three places the plan's table is wrong", item 3. It names plugin paths
  that do not exist in a consumer (see Optional).

#### `test-plan-generator` — update, one line (required)

- **Today:** writes a tiered test plan.
- **Depends on:** the old template and output path (`:55–:56`).
- **Change:** owner paths and `pdocs new test-plan --owner`.

#### `unit-test-writer` — keep

- **Today:** writes unit tests. Its description is specific to the Operator
  monorepo (`:5–:6`: Electron + Vue, Expo, Elysia), while the plugin README says
  "for any part of the project" (see Optional).

#### `web-researcher` — keep

- **Today:** web research. No docs paths.

### Plugin metadata

#### `project-docs/README.md` and `.claude-plugin/plugin.json` — update (required)

- **Today:** plugin version `3.13.0`, and a Skills table that includes
  `backlog-to-projects` (`README.md:185`) and describes `sweep-project` by
  project and backlog (`:187`).
- **Changes:**
  - Bump to `4.0.0`: a skill is removed, a skill is added, and `--project` is
    gone.
  - Update the Skills table.
  - Rewrite the "Documentation Structure" tree (the section that opens
    `docs/ ├── projects/`) and add the version history.
- **Manifesto:** `docs/PROJECT_MANIFESTO.md:88` says "6 commands, 27 skills, 9
  agents", which stays true.

### Other plugins

#### `operator/operator-triage` — update, minor bump (required)

- **Today:** routes Operator captures to investigation, proposal, plan,
  lesson-learned, fragment or backlog.
- **Depends on:**
  - its description's routes (`SKILL.md:4–:12`);
  - the routing table and decision tree (`:69–:98`);
  - "Lesson Learned → Create doc in `docs/lessons-learned/`" (`:108`);
  - "Fragment → move to fragments folder" (`:109`), and "Defer → move to
    backlog" (`:110`).
- **Changes (plan):**
  - Intake writes `pdocs new item … --source operator:<id>`, which lands in
    `triage`.
  - A solved problem becomes a Step and a Verification appended to the playbook
    for that kind of work.
  - Remove the fragment and backlog routes.
  - An investigation becomes a research item, and a proposal becomes a feature.
  - Bump `1.1.1` → `1.2.0`.
- **Unchanged:** `fragments`, `bugs` and `on-deck` in `:27`, `:48` and `:158`
  are Operator's own folders, not project-docs types.

#### `operator/operator-setup` — keep

- **Today:** authenticates to Operator. No docs paths.

#### `hivemind/hivemind-consult` — update, minor bump (required)

- **Today:** finds and applies HiveMind playbooks and scenarios. It can copy one
  into the project's `docs/`.
- **Depends on:** "a scenario or lesson goes to `docs/lessons-learned/`"
  (`SKILL.md:62`), and "create `docs/playbooks/` or `docs/lessons-learned/`"
  (`:107`).
- **Changes:**
  - A materialized lesson or scenario becomes a Step and a Verification in the
    playbook for that kind of work, or `pdocs new playbook`.
  - Bump `0.1.0` → `0.2.0`.
  - The HiveMind folder ids at `:94` stay.

#### `hivemind/hivemind-digest` — keep

- See "Three places the plan's table is wrong", item 2.

#### `hivemind/hivemind-capture`, `hivemind/hivemind-feedback` — keep

- Their mentions of `lessons-learned` (`hivemind-capture/SKILL.md:25`, the field
  guides at `:17` and `:56`) name HiveMind's folder.

#### `toolbox/*`, `recipes/*`, `agent-bridge/bridge-agent` — keep

- Their grep hits are false positives: "in-memory", "brief", and `scope:` in
  code samples.
- `toolbox/html-mockup-prototyping` duplicates the project-docs skill (see
  Optional).

## Capabilities missing

1. **`triage-items`** (D8, D12). It lists `triage` items and proposes accept (to
   `backlog` or `ready`) or drop, with `priority`, `assignee` and `parent`. It
   shows the proposal and applies it with `pdocs set` only after the user has
   seen it. Nothing does this today; `docs/items/README.md` and `SCHEMA.md`
   already name the skill.
2. **Nothing writes a feature's state.** SCHEMA's "Who moves an item" table
   covers items. For a feature it says only "`backlog` while it is being shaped,
   `ready` once it is approved to build". No skill is named for:
   - `backlog → ready` (approval);
   - `ready → active`, for which `dev-kickoff` is the natural writer;
   - `→ done` outside a sweep, since `finalize-branch` moves the branch's item
     and not its parent feature.

   Name a writer for each, or state that `sweep-project` is the only one for the
   terminal state.

3. **Nothing closes a research item that ran without a branch.** An
   investigation used to be marked `concluded` by whoever wrote it. Now its item
   carries the state, and only `finalize-branch` writes `done`. Research done in
   conversation (`create-investigation`, `investigator`) never reaches it.
   `create-investigation` or `investigator` should run
   `pdocs set <item> --lifecycle done` on conclusion.
4. **Repository-level reports have no home.** `project-summary` and
   `review-docs` write `docs/reports/…`. In 9.0.0 a report must have an owner
   (`pdocs new report` refuses without `--owner`), and a loose file there is
   reported untyped. Options:
   - keep the report in chat;
   - fold it into `PROJECT-SUMMARY.md`;
   - file each run as a born-`done` chore item that owns its report.

   This decision is needed before those two are edited.

5. **Only the CLI can write a `kickoff` document's owner link.**
   `pdocs new kickoff` refuses by design, so `dev-kickoff` must write the link
   to `feature.md`/`item.md` itself (the D17 rule, done by hand). This is minor;
   say it in the skill.
6. **No skill writes `review`.** SCHEMA says "whoever hands the work to a human
   or a reviewer". No skill does, so the state will go unused. This is
   acceptable, but it is a field without a named writer.
7. **Grouping items under a new feature.** `backlog-to-projects`' clustering and
   parallelism matrix has no successor if `triage-items` only sets an existing
   `parent`. Keep it inside `triage-items` (a new feature proposed per cluster),
   or drop it on purpose.

## Proposed optional items

Each is a one-line candidate for `pdocs new item <slug> --kind chore`, left in
`triage`, once this repository is migrated (Phase 5). None is in this release.

- `merge-html-mockup-prototyping-copies`: keep one of
  `project-docs/skills/html-mockup-prototyping` and
  `toolbox/skills/html-mockup-prototyping`. They differ only in where the file
  goes, and both load in one session under one name.
- `fold-document-validation-into-docs-curator`: `document-validation`'s only
  reader is `docs-curator` (`skills: document-validation`). One file would stop
  the lifecycle rules drifting in two places.
- `narrow-review-docs-to-the-library`: give `review-docs` the accuracy review of
  architecture, specifications, interaction design and playbooks, and leave
  workbench completion and archival to `sweep-project`. Today both judge "is
  this project done".
- `merge-generate-proposal-into-create-project`: three things create a proposal
  (`create-project`, `generate-proposal`, `proposal-writer`). With features,
  `generate-proposal` is `create-project --from <write-up>` plus a filled body.
- `dedupe-investigate-this-trigger`: `create-investigation` and
  `investigation-methodology` both trigger on "investigate this".
- `move-pdocs-cli-reference-out-of-create-project`: the CLI reference used by
  every skill lives at `create-project/references/pdocs.md`, and root
  `AGENTS.md:202` and the plugin README (`:466`) link it there.
- `plugin-relative-paths-in-consumers`: `dev-kickoff` (`SKILL.md:70`, `:105`,
  `:156`, `:163–:193`) and `slide-deck-author` (`:44`, `:133`, `:134`) name
  `plugins/project-docs/skills/...`. That path exists only in this repository.
- `generalize-or-retire-unit-test-writer`: its description targets the Operator
  monorepo, while the plugin README says "any part of the project".
- `register-blueprint-and-recipe-outputs`: `implementation-blueprint` writes
  `docs/implementation-blueprint.md` and `project-recipe` writes
  `docs/PROJECT-RECIPE.md`. No type covers either file, so a 9.0.0 lint reports
  `NO FRONTMATTER` and `ORPHAN`.
- `dedupe-hivemind-field-guide`: `field-guide.md` is byte-identical in all four
  hivemind skills.
- `hivemind-lessons-folder-vs-guidance-lifecycle`: decide whether HiveMind's own
  Lessons Learned folder follows project-docs in retiring lessons. This belongs
  to the `hivemind` plugin project.
- `update-deps-terminal-tool`: `update-deps` declares an `allowed_tools` entry
  `Terminal` that no current environment provides.
- Already filed, and still open, in this repository's `docs/backlog/`: the
  `Task`/`Agent` tool-name drift (`2026-09-02-task-agent-tool-name-drift.md`),
  and skills that hardcode the flat `docs/` folders
  (`2026-09-04-plugin-skills-hardcode-flat-docs-paths.md`). This phase's path
  edits touch the same lines as the second one. Close it or narrow it when Phase
  4 lands.
