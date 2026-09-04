---
type: proposal
title:
  "OKF Frontmatter Layer — machine-readable metadata, lint, and cycles on the
  existing docs/ structure"
status: stable
lifecycle: approved
generated: { by: unknown, at: 2026-09-03 }
---

# OKF Frontmatter Layer — machine-readable metadata, lint, and cycles on the existing docs/ structure

## Overview

Give every document in `docs/` a small, consistent YAML frontmatter block that
follows the Open Knowledge Format (OKF 0.2), enforce it with a two-tier lint
copied from a working reference implementation, and add one new document type —
the **cycle** — so the scaffold can say what work is in play. **No folder
moves.** The existing `docs/` layout stays exactly as it is; what changes is
that each document becomes addressable, queryable, and checkable by tooling.

This is **phase one** of the
[Knowledge Wiki Layer](../../briefs/2026-07-23-knowledge-wiki-layer.md) idea.
The brief and its two July investigations resolved the structure (hybrid: a
topical system track and an atomic practice track under one schema). The
original plan was to prove that by pulling the durable docs into a `docs/wiki/`
root. Using the same pattern in
[agent-cli-conformance](https://github.com/ichabodcole/agent-cli-conformance)
since August showed that most of the value comes from the metadata layer and the
lint, not from where the files sit. So phase one ships the layer on the current
structure and leaves the restructure question open until the layer has been
used. It also folds in the
[work-cycle taxonomy investigation](../../investigations/2026-09-03-work-cycle-taxonomy-landscape-investigation.md),
which found that the scaffold's missing "in play" unit is best served by a thin
cycle document beside projects, not by reorganizing project folders.

## Problem Statement

`docs/` has thirteen folders and about twenty document types, and none of them
carry metadata a tool can read. Concretely, in this repo on 2026-09-03:

- **Status is prose.** Each proposal declares its state in a bold inline line
  with an unenforced vocabulary — `Draft`, `Approved`, `Approved (in flight)`,
  `Approved (shipped)`, `Completed`, and one that parses as `V`. Seven of 23
  active project folders have no proposal, so no status at all.
- **Relationships are prose.** "Likely post-V1.7-of-grapevine" appears three
  times in one proposal; five grapevine folders have no parent; nothing links a
  session to the branch or cycle it came from except its filename date.
- **Links rot silently.** Nothing checks that a relative link or heading anchor
  in `docs/` resolves. The 3.6.0 work found dangling pointers by reading the
  whole document; there is no gate that would have caught them.
- **Nothing says what is in play.** The only unit that opens and closes is a git
  branch, and its trace is a session note filed under a project. "What am I
  working on" is answered with `git log` and `ls -t`. Projects accumulate; they
  never close.
- **Every scaffolded project inherits all of this.** The cookiecutter payload is
  a docs tree with READMEs and templates and no tooling. A downstream project
  that wants link-lint or a graph has to build it.

The durable half of this problem (architecture, playbooks, lessons, memories
should behave like a wiki) and the workbench half (projects, backlog, briefs,
investigations should have a lifecycle) share one root cause: there is no
metadata layer. Fix that once and both halves become tractable.

## Proposed Solution

Six parts, all additive.

### 1. One schema, OKF 0.2, governed by `docs/SCHEMA.md`

Every markdown document under `docs/` (except READMEs and templates) starts with
YAML frontmatter. OKF 0.2 requires only `type`; everything else is a local
convention the spec explicitly permits ("Producers MAY include any additional
keys", §4.1).

```yaml
---
type: proposal # REQUIRED — OKF's one required key; selects the template/shape
title: OKF Frontmatter Layer # the H1
description: One sentence; doubles as the catalog hook.
tags: [documentation, okf, tooling]
related:
  [
    investigation/2026-09-03-work-cycle-taxonomy-landscape,
    brief/2026-07-23-knowledge-wiki-layer,
  ]
status: stable # OKF §5.4: draft | stable | deprecated — document TRUST, not work state
lifecycle: draft # local: work STATE, vocabulary per type (see §3)
generated: { by: claude-fable-5-1, at: 2026-09-03 } # OKF §5.2
---
```

Two fields that look similar and are not: `status` is OKF's and says how much to
trust the page (`draft` = unreviewed, `stable` = default, `deprecated` = kept
for history). `lifecycle` is ours and says where the work is. We never widen
`status`; a consumer reading an OKF document must not meet a value the spec says
cannot occur.

`related` keys are `type/slug`, not paths, so a page can move without rewriting
every pointer to it. Backlinks, orphans, and adjacency are **computed by the
lint**, never authored.

`docs/SCHEMA.md` is the maintainer contract — one file an agent reads once
before adding or updating a page. It is the `SCHEMA.md` already drafted on the
stale `feat/knowledge-wiki-layer` branch, with its layout section replaced (no
`docs/wiki/` root) and the tier and lifecycle sections added.

### 2. Two lint tiers keyed to folders, one shared library

The library/workbench split the brief wanted is expressed as **which lint
applies**, not where files live. This is how agent-cli-conformance does it: one
schema, two lints of different strictness.

| Tier      | Folders                                                                                                  | Checks                                                                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Thin**  | every folder                                                                                             | frontmatter present; `type` known; `status`/`lifecycle` values in vocabulary for that type; `related` targets resolve; relative `.md` links + anchors resolve                     |
| **Graph** | `architecture/`, `specifications/`, `interaction-design/`, `playbooks/`, `lessons-learned/`, `memories/` | everything in Thin, plus: every page reachable from the catalog; catalog line matches `description`; `--json` emits the knowledge graph (backlinks, tag adjacency, hubs, orphans) |

The catalog for the graph tier is one `docs/index.md` with one line per durable
page — the `MEMORY.md` discipline applied to the library. Workbench folders are
not catalogued; their READMEs and dates already do that job, and they are never
brought up to date after they close.

The lint is **copied**, not shared: `agent-cli-conformance/docs/wiki/lint.ts`,
`docs/lint.ts`, and `scripts/docs-lint/` are ported into this repo and into the
cookiecutter payload as plain Bun scripts. No package. Cole's call (2026-09-03):
three repos re-implementing the same thing is acceptable until the pattern has
stopped moving; project-docs is the canonical home, the other two are
experiments.

### 3. Lifecycle vocabularies per type, and the `cycle` type

Lowercase, drawn from Kubernetes KEPs, PEPs, and Oxide RFDs (see the
investigation's Recommendation). The rule that matters most: **`approved` is not
`implemented`.** Every mature file-based process has that intermediate state,
and its absence is why the tree grew "Approved (in flight)" by hand.

| `type`                    | `lifecycle` values                                                             |
| ------------------------- | ------------------------------------------------------------------------------ |
| backlog                   | `open` · `promoted` · `dropped`                                                |
| brief                     | `active` · `spent`                                                             |
| investigation             | `active` · `concluded`                                                         |
| proposal                  | `draft` · `approved` · `deferred` · `implemented` · `withdrawn` · `superseded` |
| plan                      | `draft` · `active` · `completed` · `abandoned`                                 |
| cycle                     | `planned` · `active` · `closed` · `abandoned`                                  |
| session, report, artifact | none — frozen records; `generated.at` is their only date                       |
| durable types             | none — `status` alone (they are living pages, not work)                        |

Archival is a **lifecycle value first, folder move second**. Every terminal
value permits the move to `_archive/`; none requires it. This lets
`sweep-project` decide on state rather than folder position.

**The cycle** is the one new document type: a thin index over work in play.

```
docs/cycles/
  README.md
  TEMPLATE.md
  2026-09-okf-frontmatter-layer.md
```

```yaml
---
type: cycle
title: OKF frontmatter layer
lifecycle: active # at most one cycle is active at a time
started: 2026-09-03
appetite: until the thin lint gates CI and every active proposal has a lifecycle
scope:
  - project/okf-frontmatter-layer
  - backlog/2026-09-02-task-agent-tool-name-drift
after: [] # cycles or projects this one waits on
---
```

Body: **Why now** · **Scope** (one line per item) · **Outcome** (written at
close: what shipped, what was cut, what was learned) · links to the sessions
that landed. A cycle is **scope-bound, not time-boxed**: it closes when its
scope ships or Cole cuts it. It is an index over features, not a container for
their documents — plans, sessions and artifacts stay in the project folder,
which every surveyed precedent keeps as the topical home of a feature.

### 4. Templates, backfill, and the catalog

- Every `TEMPLATE*.md` gains the frontmatter block for its type, with
  `lifecycle` set to that type's opening value.
- A one-time **backfill** adds frontmatter to every existing document. This is
  agent work against the lint: run, fix, repeat until clean. The backfill is
  also the honesty pass — most of the 23 active proposals become `deferred` or
  `implemented`, which is what makes the active set readable.
- `docs/index.md` is seeded from the durable folders.

### 5. Cookiecutter payload and skill touchpoints

- The payload gains `docs/SCHEMA.md`, `docs/index.md`, `docs/cycles/`, the lint
  scripts, and a minimal `package.json` with `docs:lint`, `docs:graph`,
  `docs:sync` — the payload has no tooling today, so this is the first
  executable thing it ships. Bun is the runtime (matches agent-cli-conformance,
  anthill, spellbook).
- `init-branch` asks which active cycle the branch belongs to, or none.
- `finalize-branch` runs the lint as a quality gate, writes the session with
  frontmatter, and appends the branch to the cycle's outcome instead of asking
  "is the project done" per branch.
- `sweep-project` reorients: "is this cycle closed" and "does this proposal's
  `lifecycle` match reality", with archival as a state change plus optional
  move.
- `create-project`, `create-investigation`, `generate-dev-plan`, and the other
  scaffolding skills emit frontmatter.
- The manifesto's "not a project management tool — no sprints" line is reworded
  to "records scope and state, not people or dates."

### 6. A root config file: `.project-docs.json`

The first tooling the scaffold ships has to find the docs and know which folders
belong to which tier. Rather than hardcode `docs/` and the folder lists in
`lint.ts` and in every skill, a small root config holds them: `docsRoot` (so a
project can name the folder differently), `version` (the scaffold version,
bumped by release-please beside the existing `docs/README.md` marker), and
`lint` (the durable / workbench / skip folder lists). Nothing else until a
consumer exists. The lint, the migration script and `update-project-docs` read
it; the migration creates it when absent. Added 2026-09-03 after the plan was
drafted.

## Scope

**In Scope (MVP):**

- `docs/SCHEMA.md`; frontmatter on every template and every existing document in
  this repo
- Thin lint on all folders; graph lint + `docs/index.md` on the six durable
  folders; both wired into `npm run check` / pre-commit
- `lifecycle` vocabularies as above; `cycle` type, folder, README, template; the
  first cycle opened for this work
- Cookiecutter payload updated with all of the above, following
  [scaffold-update-checklist](../../../.claude/skills/scaffold-update-checklist/SKILL.md)
- Skill touchpoints in `init-branch`, `finalize-branch`, `sweep-project`, and
  the scaffolding skills; manifesto wording
- `.project-docs.json` with `docsRoot`, `version`, `lint`; skills read the docs
  root from it

**Out of Scope:**

- Moving any folder or file. No `docs/wiki/` root.
- A shared lint package. Copy now; extract later if three copies actually
  diverge painfully.
- A rendered HTML surface. GitHub renders the markdown; the `--json` graph is
  enough for agents. agent-cli-conformance's `build.ts` shows a static render is
  possible without an app host, and it can be ported in a later phase.
- A navigation CLI. The graph JSON is the substrate; a CLI over it is a later
  phase once the schema has stopped moving.
- Nested cycles or an initiative level. Arcs like grapevine are a `tags` cluster
  until a real arc demands more.
- Cross-project standardization beyond the cookiecutter payload. HiveMind and
  Operator integration stay separate.

**Future Considerations (the phase-two question):**

- Whether, after living with the layer, the durable folders still want to become
  a physical `docs/wiki/`. The investigation's evidence says the workbench side
  should **not** be reorganized by cycle; the durable side is genuinely open.
- Static render and graph view (port `build.ts`).
- A `docs` CLI: `docs graph`, `docs orphans`, `docs cycle status`.
- Extracting the lint into a package consumed by project-docs,
  agent-cli-conformance, and dream-flute.

## Technical Approach

**Runtime and layout.** Bun scripts, no dependencies beyond Bun itself:

```
docs/
  SCHEMA.md            ← maintainer contract
  index.md             ← catalog of the six durable folders
  lint.ts              ← entry: thin tier everywhere, graph tier on durable folders; --json; --write (sync catalog)
  cycles/              ← new
scripts/docs-lint/     ← ported shared library: frontmatter parse, walk, link/anchor resolution, yaml lists
```

`lint.ts` decides tier by the document's folder, and vocabulary by its `type`.
Type-specific rules (a proposal must have `lifecycle`; a session must not) live
in one table in `lint.ts` that mirrors the table in `SCHEMA.md`; the lint fails
if they drift, which is the agent-cli-conformance pattern for keeping a contract
and its enforcement together.

**Frontmatter and Prettier.** Prettier already formats YAML frontmatter in
markdown, so the pre-commit gate keeps working. Existing bold metadata lines
(`**Status:** Draft **Created:** …`) are removed during backfill; the H1 and
frontmatter carry that information.

**Port, don't rewrite.** agent-cli-conformance's `docs/wiki/lint.ts` (778 lines)
enforces the graph tier, its `docs/lint.ts` (248 lines) enforces the thin tier
over `plans/`, `research/`, `reports/`, and `scripts/docs-lint/` is the shared
parse/walk/link library with tests. The port drops its rule-page cross-checks
against checker source (a CLI-conformance concern) and its
`lifecycle: live | discharged` report vocabulary in favour of the per-type table
above, and re-keys tiers to this repo's folders. Its test files come along.

**Dogfood order.** This repo first, in a cycle opened for the purpose; the
cookiecutter payload last, once the lint has been green on real content for a
while. Every step follows `scaffold-update-checklist` because templates, READMEs
and the mirrored payload all change.

**Dependencies.** Bun present locally and in CI. The stale
`feat/knowledge-wiki-layer` branch for its `SCHEMA.md` and adoption-guide prose
(salvage, then delete the branch). agent-cli-conformance at a known commit for
the port.

## Impact & Risks

**Benefits:**

- Every document becomes addressable (`type/slug`), queryable (frontmatter +
  computed graph), and checkable (links, anchors, vocabularies) — the substrate
  every later tool needs.
- "What is in play" and "what state is this in" become facts a tool can read,
  not prose a human has to interpret.
- Link rot and status drift get a gate. The 3.6.0 dangling-pointer class of bug
  fails CI instead of surviving three releases.
- Every scaffolded project inherits the layer and its tooling on day one.
- Both open threads (wiki restructure, work organization) get their real
  prerequisite without committing to either restructure.

**Risks:**

- _Backfill is large and tedious._ ~110 documents in this repo. Mitigation: it
  is agent work against a lint, done in one cycle, and the lint makes "done"
  unambiguous.
- _Vocabulary churn._ Lifecycle values will get revised on contact. Mitigation:
  one table in `SCHEMA.md` mirrored in `lint.ts`; changing a value is a
  find-and-replace the lint verifies.
- _The cookiecutter payload becomes a Bun project._ Downstream projects that are
  not on Bun get a runtime requirement they did not ask for. Mitigation: the
  lint is optional to run; the payload's `package.json` is minimal; the
  scaffold's post-gen hook says so.
- _Three lint copies drift._ Accepted explicitly; revisit if it hurts.
- _The manifesto's "not a PM tool" line._ A cycle is close enough to a sprint
  that the wording must change or the proposal contradicts the manifesto.
  Mitigation: reword to what the line actually protects — no people, no dates,
  no dashboards.

**Complexity:** Medium. The tooling is a port with tests, and the schema is
already proven in another repo. The bulk is breadth: every template, every
README, ~110 documents, the payload mirror, and five skills touched.

## Open Questions

- **Where does `SCHEMA.md` sit** — `docs/SCHEMA.md` alongside `docs/README.md`
  and `docs/CLAUDE.md`, or folded into `docs/README.md`? Lean: separate file; it
  is a contract an agent reads once, and the README is a tour.
- **Catalog scope.** Only the six durable folders, or also active cycles? Lean:
  durable only; cycles are few and dated.
- **Cycle nesting.** Deferred (see Out of Scope) — confirm that grapevine's five
  folders are adequately served by a shared tag.
- **`generated.by` for backfilled documents.** OKF allows `unknown`; for
  backfill the honest value is the model that wrote the frontmatter, not the
  original author. Lean: the backfilling model, with `at` = the file's last git
  commit date.
- **One file per cycle vs. a single renamed-at-close `CYCLE.md`** (the
  Keep-a-Changelog pattern). Lean: one per cycle; simpler for the lint.

## Success Criteria

- `bun docs/lint.ts` exits 0 on this repo, runs in `npm run check` and
  pre-commit, and fails on a deliberately broken link, anchor, or vocabulary
  value.
- Every non-README, non-template document in `docs/` has conformant frontmatter;
  zero bold inline status lines remain.
- `bun docs/lint.ts --json` emits a graph in which every durable page has at
  least one inbound link or catalog line.
- `docs/cycles/` has exactly one `lifecycle: active` cycle, and it is the one
  that delivered this proposal, closed with an Outcome section.
- The active project set, as read from `lifecycle`, is fewer than eight
  `approved` proposals; the rest are `deferred`, `implemented`, or archived.
- A project scaffolded from the cookiecutter template passes its own lint on
  first run.
- `finalize-branch`, `sweep-project`, and `init-branch` reference cycles and
  `lifecycle`, and the manifesto no longer says "no sprints".

---

**Related Documents:**

- [Brief: Knowledge Wiki Layer](../../briefs/2026-07-23-knowledge-wiki-layer.md)
- [Investigation: Wiki structure & OKF schema](../../investigations/2026-07-23-wiki-structure-and-okf-schema-investigation.md)
- [Investigation: Wiki tooling boundary](../../investigations/2026-07-23-wiki-tooling-boundary-investigation.md)
- [Investigation: Work-cycle taxonomy landscape](../../investigations/2026-09-03-work-cycle-taxonomy-landscape-investigation.md)
- [Report: PM work-taxonomy landscape](../../reports/2026-09-03-pm-work-taxonomy-landscape-report.md)
- [Report: File-based work-tracking landscape](../../reports/2026-09-03-file-based-work-tracking-landscape-report.md)
- [Investigation: Project closure & archive touchpoint](../../investigations/2026-08-07-project-closure-and-archive-touchpoint-investigation.md)
- [OKF 0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- Reference implementation: `agent-cli-conformance/docs/wiki/SCHEMA.md`,
  `docs/wiki/lint.ts`, `docs/lint.ts`, `scripts/docs-lint/`

---

## Notes

- **Supersedes** the proposal on the `feat/knowledge-wiki-layer` branch
  (2026-07-24), which committed to a `docs/wiki/` restructure and an external
  pilot. That branch's `SCHEMA.md` and adoption guide are salvaged into this
  work; its finalize-branch commit ("detect the durable-docs layout") is dropped
  because the layout no longer changes. Delete the branch once salvage is done.
- The two July investigations should be marked Concluded with a note that the
  pilot they asked for ran in agent-cli-conformance; this proposal is their
  outcome.
- Decisions recorded 2026-09-02/03 in conversation: no restructure; copy the
  lint, no package; OKF lowercase `status`, separate `lifecycle`; cycle beside
  projects, never dissolving projects into cycles.
