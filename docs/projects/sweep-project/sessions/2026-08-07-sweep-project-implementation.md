---
type: session
title: "Sweep Project — build, dogfood, and first production run — 2026-08-07"
description:
  Implemented the sweep-project skill and the finalize-branch touchpoint that
  calls it, end to end.
status: stable
generated: { by: unknown, at: 2026-08-07 }
---

# Sweep Project — build, dogfood, and first production run — 2026-08-07

## Context

Implementing [the plan](../plan.md) end to end: the `sweep-project` skill, the
`finalize-branch` Step 6 reconciliation touchpoint, pipeline documentation, and
packaging. Continues directly from the
[investigation](../../../investigations/2026-08-07-project-closure-and-archive-touchpoint-investigation.md)
and [proposal](../proposal.md) written earlier the same day.

The through-line of the session: **almost every real defect was found by running
the thing or by handing it to someone with no context — not by writing it more
carefully.**

## What Happened

### The plan was wrong in ways only checking caught

Two review agents went over the plan before implementation started — one
applying a gap-analysis framework, one fact-checking every path, line number,
count, and shell command against the repo. Between them they found three
blocking defects in the first draft:

- The reference-discovery pattern matched only `projects/<name>`, missing the
  repo's _dominant_ cross-project reference form — bare sibling links like
  `[V1.5 proposal](../grapevine/proposal.md)`. It would have reported "zero
  references" while silently breaking five real links. It also matched
  prefix-colliding siblings (`grapevine` → `grapevine-v1.6`, `-v1.6.7`, `-v1.7`,
  `-backlog`): 6 hits, all false positives.
- Discovery was ordered _after_ the `git mv`, so the archived project's own
  internal links would surface as external and get "fixed."
- `grapevine` was named as the plan-reconciliation dogfood target. It has no
  `plan.md`.

Also: the plan attributed its structural model to `consolidate-long-branch` for
sections that file doesn't have. That skill contributes Prerequisites / Risks &
Gotchas / Acceptance Criteria; the numbered-Steps / Constraints / Common
Mistakes shape comes from `finalize-branch`.

### Dogfooding inverted the core design

The skill originally specified **checkboxes as primary evidence of completion**.
Running it against real projects killed that immediately: across
`agent-surface-recipe-evolution` and `hivemind-plugin`, **78 checkboxes, zero
checked — and both had fully shipped**. `plugins/hivemind/` exists and is
registered in `marketplace.json`.

Checkbox-first reasoning would confidently report finished work as never
started, exactly inverting the skill's purpose. The evidence hierarchy is now
artifacts on disk → session docs → status lines → checkbox state, with the
all-unchecked-plus-shipped pattern named explicitly as plan drift. Checkboxes
are the _output_ of reconciliation, not its input.

This is the finding the whole exercise justified. It could not have been reached
by re-reading the skill.

### The cold-read found 19 issues; the backlog one was the same bug twice

A context-free agent read the skill as an executing agent would. Top finding:
the backlog variant of the discovery command told the reader to "substitute the
filename for the folder name" — producing a pattern that can never match, since
backlog items live at `docs/backlog/`, not `docs/projects/`. It would run,
succeed, and report zero references. That is verbatim the failure the skill's
own Risks section warns about, reproduced two paragraphs later.

Also caught: Rewrite and Flag buckets overlapping word-for-word while the
acceptance criteria demand exactly one bucket per hit; a Leave bucket naming
three document types in a scaffold with nine; and the clean-tree prerequisite
returning a **false all-clear** when run from a subdirectory — the one check
that exists to prevent an unreadable diff.

### The first production run corrupted a document

Archiving both projects used a blanket `- [ ]` → `- [x]` replacement. In
`hivemind-plugin/plan.md` that ticked an inline code sample — the line
documenting that "steps use checkbox (`- [ ]`) syntax for tracking" — rewriting
someone's documentation into a false statement. Committed, then caught in
review, reverted, and the skill now carries an explicit rule: only ever tick a
real list item; `- [ ]` inside a code span or fence is documentation _about_
checkbox syntax. The recurrence path was live — this project's own plan and
proposal both contain such samples.

That is the sharpest lesson of the session: the skill's headline principle is
"never fabricate structure," and its first run violated it in a way the author
didn't notice.

### A criterion that told the agent to verify the opposite of the truth

Acceptance check 3 said to re-run Step 3's discovery against the new `_archive/`
path. Step 3's pattern is `(projects/|\.\./)${NAME}` — it _cannot_ match
`projects/_archive/<name>`. A reviewer archived a project in a scratch clone,
applied the documented rewrite, re-ran the check verbatim, and got zero
rewritten references back. An agent following it literally would conclude its
own rewrites had vanished. Replaced with two greps that actually confirm the
rewrite landed.

### Deviations from plan

- **Phase 2's four dogfood runs became three plus a rehearsal.** No archival
  candidate in this repo has live inbound references, so the rewrite path can't
  be exercised by archiving. `grapevine` — 5 real inbound links, but not
  finished — was run to the check-in gate and declined, which validates the
  rewrite computation without archiving incomplete work.
- **Phase 4 grew.** The plan named 3 cycle-string locations; the straggler grep
  found 7 across 4 mirrored pairs, plus two more `PROJECT_MANIFESTO.md`
  references. Also repaired pre-existing drift in `docs/reports/README.md`,
  which carried a cycle string predating the v2.0 restructuring.
- **Both open Phase 4 decisions were taken rather than blocked on**: no
  `docs_version` bump (wording, not structure), and `docs/AGENTS.md` added to
  the checklist's Mirrored Files list. Recorded in the commit so they're easy to
  reverse.
- **`hivemind-plugin`'s field guide shipped relocated** — a per-skill copy in
  all four skills rather than the planned `skills/_shared/field-guide.md`,
  because `_shared/` isn't a skill and the dist build packages per-skill
  directories. Recorded inline in that plan rather than silently ticked.

## Notable Discoveries

- **Plans and proposals use different status vocabularies.** `PLAN.template.md`
  is `Draft | Active | Completed | Superseded`; `PROPOSAL.template.md` is
  `Draft | Under Review | Approved | Rejected | Superseded`. A proposal marked
  `Approved` beside a plan marked `Completed` is _not_ a conflict — both are in
  their own terminal state. The skill would have manufactured a false conflict
  on nearly every finished project.
- **Reference sweeps are usually near-no-ops, and that's the point.** For four
  completed projects the only external references were dated `docs/memories/`
  files — all correctly left alone. The conservative rule matches the data.
- **`docs/PROJECT_MANIFESTO.md:207` still points at an archived project.** Left
  deliberately: it's a prose current-state claim, and the skill flags rather
  than rewrites those.

## Lessons Learned

- **Verification beats care.** Every serious defect this session — the discovery
  pattern, the evidence inversion, the backlog grep, the document corruption,
  the false acceptance criterion — was found by execution or by a zero-context
  reader. None were found by writing more carefully.
- **A skill's most common outcome should not be its exception.** Naming this
  `archive-project` would have made the reconcile-and-record path — the case
  that runs most often — read as a failure.
- **Confirmation gates are worth honoring even when inconvenient.** The archival
  runs sat blocked for a while. Self-granting that approval, on the first real
  use of the gate being built, would have hollowed out the constraint.

## Follow-up

- `docs/backlog/` has zero active items, so the backlog path ships validated
  only structurally. The first real backlog sweep exercises it.
- `PROJECT_MANIFESTO.md:207`'s stale prose reference remains, awaiting the
  judgment call the Flag bucket exists to request.
