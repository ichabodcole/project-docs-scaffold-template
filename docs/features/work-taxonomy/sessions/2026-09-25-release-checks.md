---
type: session
title: Work Taxonomy release checks — 2026-09-25
description:
  The release checks ran the test plan for real — every Tier 1 and Tier 2
  scenario passed — set Guidance Lifecycle done, fixed the small skill problems
  the walks exposed, and put a greenfield project first among the release's
  consumers (D26).
tags: [taxonomy, release, verification]
status: stable # A session is frozen the moment it is written; it is never a draft.
generated: { by: claude-opus-5-5, at: 2026-09-25 }
---

# Work Taxonomy release checks — 2026-09-25

Part of
[Work Taxonomy release](../../../cycles/_archive/2026-09-work-taxonomy-release.md).
Plan: [Phase 6](../plan.md). Branch `chore/work-taxonomy-p6-release-checks`. The
first step of Phase 6 — everything short of cutting the release. The coordinator
ran it from the main thread; a checks sub-agent executed the test plan and made
the fixes, fresh sub-agents walked the edited skills, and one reviewer sub-agent
checked the branch.

## What landed

| Commit    | What                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| `5941850` | `guidance-lifecycle` set `done` — its success criteria checked against the tree              |
| `c788774` | [The test plan](../test-plan.md)'s Results Addendum filled; the definition-of-done pass      |
| `2bf2b35` | Skill-walk fixes: `finalize-branch`, `generate-dev-plan`, `triage-items`, the cycle template |
| `bea2f6c` | D26 — a greenfield project is the release's first consumer                                   |
| `9387fb9` | What a fresh re-walk of `finalize-branch` and `triage-items` found                           |

## The test plan, run

Every Tier 1 and Tier 2 scenario passed, each executed rather than inferred: the
gate, a generated payload, an item's full life with link rewriting, the lint
rules, no silent deletion, the views, the migration's dry run, real run, re-run
and conversions, the dogfood gate at the pre-retirement commit and at HEAD, and
three skill walks. Two deviations are recorded against their scenarios: the
skill walks followed this tree's `SKILL.md` files because the installed plugin
is still 3.x, and one walk self-reviewed where the skill dispatches a reviewer.
T3-01, the second consumer, is Blocked on the release; the other Tier 3
scenarios are Deferred as planned. The checks agent unticked one
definition-of-done box that had been ticked before the second-consumer run
happened.

## Decisions

- **D26** — a new project of Cole's, generated from the released scaffold with
  the released plugin, is the release's first consumer: it tests the scaffold
  and skills as a new adopter meets them, and its findings ship in a 4.0.x
  patch. The migration still needs an existing project, so the story-loom run
  follows it — one `update-project-docs` session running v2.9→v2.10 then
  v2.10→v3.0, which D16's pinning makes possible without reaching v2.10 first.
- **Fix the walk findings before the release** rather than in 4.0.1: a born item
  left with template placeholders, a buried cycle-attach step, a nested
  landing-policy bullet, no fallback for a project without `package.json`, the
  cycle template's `feat/`, `generate-dev-plan` asking for `related:`, and six
  unclear lines in `triage-items`. The lint still passes placeholders; that is a
  filed triage item.

## Review

Roster read from the Agent tool's dispatchable types in this session, unchanged.
`feature-dev:code-reviewer` rejected on capability — no `Bash`. `doc-reviewer`
("All tools"), resumed with its Phase 3 and 4 context, reviewed the branch,
report only.

**Ready to merge: Yes.** Its log: a payload generated from the branch;
`finalize-branch`'s born-item path followed literally on `fix/empty-name` ("slug
derived from branch description, kind mapped from branch type (`fix`→`bug`),
`--cycle` at creation"), through the session, `done` and the `Work-Item:`
trailer, "clean at every step"; the cycle template confirmed to write
`feature/`; `npm run check` — "every number matches the test plan's Results
Addendum verbatim"; the seeded template byte-identical with its hash in the seed
record. It found the Results Addendum honest: "no unsupported Pass, deviations
and blockers disclosed rather than hidden".

## Next

The release itself — merging to `main` with a breaking-change commit so
release-please cuts package 9.0.0 and plugin 4.0.0 — waits for Cole's go-ahead.
