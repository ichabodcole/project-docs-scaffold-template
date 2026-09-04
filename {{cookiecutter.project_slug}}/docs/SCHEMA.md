# The documentation contract

You are (probably) an agent about to add or change a document under `docs/`.
This file is the whole contract — read it once, then work. It governs
**structure**; the content lives in the pages.

Nothing here moves a file. The split this describes is a split in **how strictly
a document is checked**, not in where it lives.

## What this layer is

Every document under `docs/` carries [OKF](https://openknowledgeformat.org)
frontmatter, and `docs/lint.ts` checks it. That gives two things nothing else
here gives:

- **A graph.** Links, `related:` keys and tags are edges.
  `bun docs/lint.ts --json` emits the whole thing — backlinks, hubs, orphans —
  so a reader arriving cold can find what relates to what without reading
  everything.
- **A contract that is enforced.** Each folder's README states how its documents
  work. A contract nothing checks is a comment that lies, and this tree has had
  several: `**Status:** Approved (in flight)` was invented by hand in three
  files because the vocabulary had no word for it.

Two audiences, one source of truth. **Agents** read these files raw, which is
why everything below insists on plain Markdown and a machine-checkable link
graph. **Humans** read them rendered on GitHub, which is why links are relative
and anchors are heading slugs. Neither audience needs a render app for the tree
to be usable, and it never will.

## The two tiers

The library/workbench split is a property of the **folder**, not of a document's
location — nothing is nested under a `wiki/` root to earn it.

| Tier      | Applies to                                                                                                                                | Checks                                                                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Thin**  | the workbench: `backlog/` `briefs/` `investigations/` `projects/` `reports/` `fragments/` `cycles/`                                       | frontmatter present · `type` matches the folder · `status` and `lifecycle` in vocabulary · `generated` well-formed · links and anchors resolve                                 |
| **Graph** | the library: `architecture/` `specifications/` `interaction-design/` `playbooks/` `lessons-learned/` `memories/`, plus the two root pages | everything Thin checks, plus: every page reachable from `index.md` · its catalog line states the page's own `description` · `related:` keys resolve · `--json` emits the graph |

The difference is **reachability**. A library page that nothing links to is
lost, so the catalog is a hard requirement. A workbench document is found by its
date and its folder README; it is written once, it closes, and it is never
brought up to date — so cataloguing it would be a chore with no reader.

## Layout

```
docs/
  SCHEMA.md            ← this contract (exempt from its own rules)
  index.md             ← the catalog: ONE line per library page
  README.md            ← how to choose a document type (contract page)
  PROJECT_MANIFESTO.md ← type: manifesto   (graph tier)
  PROJECT-SUMMARY.md   ← type: summary     (graph tier; generated)

  architecture/        ← type: architecture   ┐
  specifications/      ← type: specification  │
  interaction-design/  ← type: interaction    │ the library — graph tier
  playbooks/           ← type: playbook       │
  lessons-learned/     ← type: lesson         │
  memories/            ← type: memory         ┘

  backlog/             ← type: backlog        ┐
  briefs/              ← type: brief          │
  investigations/      ← type: investigation  │
  reports/             ← type: report         │ the workbench — thin tier
  fragments/           ← type: fragment       │
  cycles/              ← type: cycle          │
  projects/            ← type by filename     ┘

  superpowers/         ← another tool's tree; not ours, not checked
  */_archive/          ← closed work; frozen, not checked
```

`README.md`, `AGENTS.md` and `CLAUDE.md` are **contract pages**: meta-documents
about the tree rather than entries in its type system. They carry no
frontmatter, and the lint checks only their links. So does this file.

A `TEMPLATE` is a form, not a document. Its links are placeholders by
construction, so the lint skips it entirely — and a test in `docs/lint.test.ts`
renders each one with its placeholders filled and asserts the result passes.
That is what keeps a template honest without gating on a file that cannot pass.

### Files that are not documentation

Some `.md` files in a project are not documents at all. A Slidev or Marp deck is
the clearest case: its frontmatter (`marp`, `theme`, `paginate`, `layout`)
belongs to the slide renderer, and the file is a program that happens to be
written in Markdown. Widening this schema's vocabulary until such a file fits
would be describing it wrongly to make a gate quiet.

List them in `lint.exclude` in `.project-docs.json`, as globs relative to the
repository root. A matched file is invisible to every tier — no frontmatter, no
links, no graph:

```json
"exclude": ["docs/projects/markdown-slide-decks/artifacts/*-prototype.md"]
```

This repository excludes exactly that: two slide-deck prototypes produced during
the `markdown-slide-decks` project, kept because they are part of that project's
record and are still runnable.

Glob syntax is `Bun.Glob` — `*` within a path segment, `**` across segments, `?`
for one character, `{a,b}` for alternation. A literal brace in a path must be
escaped as `\{`.

`lint.exclude` is not `lint.skip`. `skip` names **directories**, matched at any
depth, and prunes whole subtrees during the walk — that is how `_archive/`
disappears wherever it appears. `exclude` filters **individual files** by path.
Reach for `skip` when a whole tree is not yours, and `exclude` when a particular
file is not a document.

## Frontmatter — every page

[OKF 0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
requires exactly one field, `type`. Everything else below is our convention;
§4.1 of the spec permits additional keys outright and requires consumers to
preserve the ones they do not recognise.

```yaml
---
type: lesson # REQUIRED (OKF §3). Also selects the page shape and the vocabulary below.
title: Migration steps must be uniformly specific # the display name; matches the H1
description: In an agent-run guide, one underspecified step becomes the failure
  point. # ONE sentence
tags: [migrations, agent-execution, documentation] # 2–4 kebab-case keywords
related: [playbook/writing-migrations, lesson/scaffold-checklist] # optional: `type/slug` edges
status: stable # OKF §5.4: draft | stable | deprecated. Nothing else, ever.
generated: { by: claude-opus-5, at: 2026-09-03 } # OKF §5.2, replaces `timestamp`
---
```

- **`status` is OKF's field and OKF's vocabulary.** `draft` (not yet reviewed),
  `stable` (ready to be relied on, and the spec's default when absent),
  `deprecated` (kept for links and history; no longer current). It is required
  explicitly so a reader never has to know the default to know what a document
  claims about itself.
- **`lifecycle` is ours, and it is a different question.** `status` says whether
  a document can be trusted; `lifecycle` says where the work it describes has
  got to. Widening `status` to carry both — `status: approved` — would put a
  value in a field where the spec says it cannot occur.
- **`generated`** is `{ by, at }`. `by` is the actor that produced the content,
  usually a model; `git blame` cannot record it, because it names whoever
  committed the file. `unknown` is a legal actor and is the honest encoding for
  a document whose producer was never captured. `at` is `YYYY-MM-DD`.
- **`description` doubles as the catalog hook**, verbatim. If it does not earn a
  click, tighten it. The lint compares the two.
- **`related:` is `type/slug`, and `slug` is the filename without `.md`** — so a
  page can move between folders without every edge pointing at it having to be
  rewritten. Edges are resolved **against library pages only**, because those
  are the pages the graph tier walks; there is no key for a proposal, a session
  or an investigation, and writing one produces `BAD related`. Two library pages
  with the same basename and type would make a key ambiguous, so the lint
  reports that as `DUPLICATE KEY` rather than silently picking one. Link to
  workbench documents in the body.

  The thin tier does not resolve `related:` at all — it isn't walking the graph
  — so a bad edge on a workbench document is silently accepted rather than
  reported. That is a reason not to write one there, not permission to. Write
  the link in the body, where it is checked.

- **Computed, never authored:** backlinks, orphan status, tag adjacency. The
  lint derives them from links and `related:`; hand-maintaining them guarantees
  they go stale.

## Lifecycle by type

This table is the source of truth for both vocabularies. `docs/lint.ts` parses
it and fails if its own `SPEC` disagrees, so the prose cannot drift from the
gate — which is the way round that drift always goes.

`—` means the type carries no `lifecycle` at all, and writing one is an error.

| `type`              | `lifecycle` values                                                             | Tier  | Where                             |
| ------------------- | ------------------------------------------------------------------------------ | ----- | --------------------------------- |
| `architecture`      | —                                                                              | graph | `architecture/`                   |
| `specification`     | —                                                                              | graph | `specifications/`                 |
| `interaction`       | —                                                                              | graph | `interaction-design/`             |
| `playbook`          | —                                                                              | graph | `playbooks/`                      |
| `lesson`            | —                                                                              | graph | `lessons-learned/`                |
| `memory`            | —                                                                              | graph | `memories/`                       |
| `manifesto`         | —                                                                              | graph | `PROJECT_MANIFESTO.md`            |
| `summary`           | —                                                                              | graph | `PROJECT-SUMMARY.md`              |
| `index`             | —                                                                              | graph | `index.md`                        |
| `backlog`           | `open` · `done` · `promoted` · `dropped`                                       | thin  | `backlog/`                        |
| `fragment`          | `open` · `promoted` · `dropped`                                                | thin  | `fragments/`                      |
| `brief`             | `active` · `spent`                                                             | thin  | `briefs/`                         |
| `investigation`     | `active` · `concluded`                                                         | thin  | `investigations/`                 |
| `cycle`             | `planned` · `active` · `closed` · `abandoned`                                  | thin  | `cycles/`                         |
| `proposal`          | `draft` · `approved` · `deferred` · `implemented` · `withdrawn` · `superseded` | thin  | `projects/*/proposal.md`          |
| `plan`              | `draft` · `active` · `completed` · `abandoned`                                 | thin  | `projects/*/plan.md`              |
| `design-resolution` | `draft` · `resolved` · `superseded`                                            | thin  | `projects/*/design-resolution.md` |
| `test-plan`         | `draft` · `ready` · `active` · `completed`                                     | thin  | `projects/*/test-plan.md`         |
| `handoff`           | —                                                                              | thin  | `projects/*/DEV_KICKOFF.md`       |
| `report`            | —                                                                              | thin  | `reports/`                        |
| `session`           | —                                                                              | thin  | `projects/*/sessions/`            |
| `artifact`          | —                                                                              | thin  | anything else in a project folder |

**Why the library types carry none.** A living page is never "done"; it is
current or it is not, and `status` already says which. Adding a lifecycle to a
playbook would invite someone to mark it `completed`, which is not a thing a
playbook can be.

**Why sessions, reports and artifacts carry none.** They are frozen records of a
moment. `generated.at` is their only date, and they are never brought up to date
— a `lifecycle` on a session invites an edit that destroys what the document is
for. A `handoff` is the same: a kickoff briefing, written once and read at the
start.

`design-resolution` and `test-plan` do hold state, because a design question is
open until it is answered and a list of scenarios is written before it is run.
`ready` on a test plan means the scenarios exist and nothing has been executed
against them yet.

**A backlog item can just be `done`.** `promoted` is for the rarer case where an
item turns out to need a project and the work moves there; a `fragment`, which
is an observation rather than a task, has no `done` for that reason.

**`approved` is not `implemented`.** Every mature file-based process — KEPs,
PEPs, RFDs — has that intermediate state, and its absence here is why three
proposals grew `Approved (in flight)` by hand.

## Archiving

Archival is a **lifecycle value first, a folder move second.** Every terminal
value (`dropped`, `spent`, `concluded`, `implemented`, `withdrawn`,
`superseded`, `deferred`, `completed`, `abandoned`, `closed`) permits the move
to `_archive/`; none requires it. `sweep-project` decides on state, not on
folder position, and a project inside an active cycle's `scope` is never moved.

## The cycle

A **cycle** is the one document type that is not a record of thinking or of
work: it is a thin index over the work that is _in play_ right now.

- **Scope-bound, not time-boxed.** It closes when its scope ships or is cut, not
  on a date. It has an `appetite` — a sentence saying when it would be right to
  stop — rather than an end date.
- **At most one is `active`.** The lint enforces this. Two active cycles mean
  the answer to "what are we doing" is a list, which is the state a cycle exists
  to prevent.
- **An index, never a container.** `scope:` links the projects and backlog items
  in play. Their proposals, plans, sessions and artifacts stay in the project
  folder, which is the topical home of a feature and outlives every cycle that
  touched it.

Body: **Why now** · **Scope** (one line per item) · **Outcome** (written at
close: what shipped, what was cut, what was learned) · the sessions that landed.

## Hard rules

0. **Read the neighbours first.** Before writing, read the folder's `README.md`
   and one existing sibling of the same `type`. That sibling is the live example
   for anything this contract does not spell out.
1. **Plain Markdown only.** No framework components, no HTML beyond what GitHub
   renders. A page that needs an interactive widget is tooling, not a page.
2. **Relative `.md` links** between documents
   (`../architecture/sync-engine.md#backpressure`). They must resolve on GitHub
   and in a bare editor — never absolute URLs into this repo. Anchors are
   GitHub-style slugs of the target heading, and you link only anchors you have
   verified exist. The lint checks both.
3. **Frontmatter on every document.** `type` is mandatory; the rest is the table
   above.
4. **A library page gets one line in `index.md`** — link plus its `description`,
   verbatim, never content — under its type's heading.
5. **No library page is an orphan.** Reachable from `index.md`, transitively.
6. **Truth comes from the code, not from prior prose.** Names, ranges and
   behaviour are verified against the source at writing time. A stale document
   is worse than none.

## The maintenance contract

- **A branch that ships or changes something updates the affected page in the
  same branch**, before finalize — the same bar as tests. New durable knowledge
  ships with its page; changed behaviour ships with its paragraph.
- **A new library page earns its place** when a subject is real (system pages)
  or when an insight recurs and a second page needs it (practice pages).
  Otherwise it is a tag or a paragraph on a page that already exists.
- **The lint has teeth.** `npm run check` runs it, `.husky/pre-commit` runs
  `check`, and `.github/workflows/docs-check.yml` runs it where a hook cannot be
  skipped.

## Verification bar

- `bun docs/lint.ts` exits 0.
- A blank-context reader can find the page from `index.md` and follow its links
  without hitting a 404. The lint enforces the links; reachability past that is
  a read.
- No claim contradicts current behaviour. The lint does not judge prose; that is
  yours.

## Running the lint

```bash
npm run docs:lint     # the gate
npm run docs:report   # what is missing, grouped by field — the backfill worklist
npm run docs:graph    # the whole graph as JSON
```

While `lint.adopting` is `true` in `.project-docs.json`, the gate **reports and
exits 0**: a project adopting this layer has a corpus that predates it, and a
gate that fails on day one fails on every commit of the work that fixes it. Set
it to `false` the moment `docs:report` is empty. The lint says so on every run.

---

**Related:**
[OKF 0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)

<!--
This page ships in the scaffold payload verbatim, so it links nothing inside
this repository. The argument for the layer, and the record of how it was
built, live in the project folder that built it — where a reader of THIS
repository will find them, and a reader of a generated one won't be sent
looking for a file that was never copied.
-->
