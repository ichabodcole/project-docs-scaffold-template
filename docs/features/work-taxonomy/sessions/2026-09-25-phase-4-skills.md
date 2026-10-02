---
type: session
title: Work Taxonomy Phase 4, skills and touch points — 2026-09-25
description:
  The project-docs skills write the work model's fields — init-branch starts an
  item, finalize-branch reviews and lands it with a Reflect step, triage-items
  replaces backlog-to-projects — after an audit of every skill decided what the
  release requires.
tags: [taxonomy, skills, touch-points]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-25 }
---

# Work Taxonomy Phase 4, skills and touch points — 2026-09-25

Part of
[Work Taxonomy release](../../../cycles/_archive/2026-09-work-taxonomy-release.md).
Plan: [Phase 4](../plan.md). Branch `feature/work-taxonomy-p4-skills`. The
coordinator ran this from the main thread; an implementer sub-agent audited and
rewrote the skills, fresh sub-agents walked them in generated projects, and two
reviewer sub-agents checked the branch.

## The audit first

[The skill audit](../artifacts/skill-audit.md) (`a69b1c8`) inventoried all 27
skills, 6 commands and 9 agents in project-docs and every file in other plugins
touching a retired folder, and marked each change **required** by this release
or **optional** spring cleaning. Cole reviewed it before any skill changed. It
found `create-project` already broken on the new layout, `review-docs` moving
files into `_archive/` by hand, two identical `html-mockup-prototyping` skills,
and three rows of the plan's own table that needed no change. The eleven
optional items are filed as `triage` items after Phase 5, not done here.

## What landed

| Commit               | What                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `2671cd5`            | D19–D22 in the plan                                                                                |
| `45436dc`            | D19 and D20 written into the Phase 3 prose, both trees                                             |
| `1f6f4fb`            | `finalize-branch`, one revision: item to `review` then `done`, born-`done` items, Reflect, trailer |
| `c0ff74f`            | `init-branch`: offers `view ready`, never a `triage` item; writes `active` and `cycle`             |
| `eb71971`            | `sweep-project` archives through `pdocs archive`; closes cycles through `closable`                 |
| `845d8f9`            | `triage-items` replaces `backlog-to-projects`, keeping its grouping analysis (D22)                 |
| `bd86219`            | `create-project` creates features; its CLI reference documents the thirteen verbs                  |
| `c8dd44d`            | An investigation is a research item and its write-up; two orphan files deleted                     |
| `9a32dfb`            | Consult in `generate-dev-plan` and `dev-kickoff` from `pdocs find` output                          |
| `3fc2727`–`da2fef2`  | The remaining required updates across skills, commands and agents                                  |
| `07b3353`            | `operator-triage` and `hivemind-consult` send lessons to playbooks                                 |
| `2758fc4`            | project-docs 4.0.0, operator 1.2.0, hivemind 0.2.0                                                 |
| `89b2638`, `a2dca82` | Fixes from the validation walks                                                                    |
| `a04c326`            | `pdocs new --format json` carries a new item's full id                                             |
| `08dc055`            | D23 in the plan; the CLI gaps and two backlog items carried into Phase 5                           |
| `9711fb8`            | Review fixes — blocked items stay `backlog`; SCHEMA's creation paths; `investigator`; `backlinks`  |
| `4065f2d`            | `finalize-branch` finds `docs/AGENTS.md`, picks a base with no remote, and an honest exit status   |

## Decisions

- **D19** — repository-level reports (`review-docs`, `project-summary`) are
  owned by a `kind: chore` item.
- **D20** — state writers: a feature goes to `ready` on the owner's word, to
  `active` by `dev-kickoff`, to `done` by `sweep-project`; an item goes to
  `review` when `finalize-branch` starts its review and `done` when it lands. A
  blocked item moves to `ready` when `finalize-branch` lands its last blocker.
- **D21** — the `Work-Item:` trailer goes on the session-record commit, which
  exists under every landing policy.
- **D22** — `triage-items` keeps `backlog-to-projects`' grouping and parallelism
  analysis, and applies nothing until the user has seen it.
- **D23** — items an agent files start in `triage` unless the user has just
  approved them, as with a plan's item list.

## The validation walks

In four generated projects, fresh agents followed the edited skills literally:
`init-branch` then `finalize-branch` (an item from `ready` to `done`, its
session in its own folder, the trailer surviving a squash, Reflect saying
"nothing this time"); `finalize-branch` finding and following a
branch-finalization playbook; `generate-dev-plan` quoting `pdocs find` and
`triage-items` showing its full proposal before applying; `sweep-project`
archiving a feature and closing a cycle. The walks exposed that nothing said who
may defer a blocking review finding (now only the user) and that a `triage` item
matched by branch name got started (now `finalize-branch` asks).

## Review

Roster read from the Agent tool's dispatchable types in this session, unchanged.
`feature-dev:code-reviewer` was rejected on capability — no `Bash`. Two
reviewers, resumed with their context: `Plan` (a shell, no editing tools) for
plan alignment, and `doc-reviewer` ("All tools") for accuracy — does every
command a skill prescribes behave that way — told to report only.

Plan alignment — **With fixes**: every required change landed, nothing optional
did, versions and `dist/` per the checklist, the `backlog` deviation consistent
with D8. Its log, quoted: "`bun test` (full suite): **1472 pass, 0 fail**";
"`bun scripts/pdocs/cli.ts check --format text` was **clean**"; "`check-dist.sh`
(149 files match a fresh build)"; the plan's own pre-close grep over `plugins/`,
every hit intentional. Findings: `generate-dev-plan` let blocked items be
`ready`; two creation paths missing from SCHEMA; `investigator` assuming a user
request.

Accuracy — **With fixes**. Its log: a generated project, then "every `pdocs …`
invocation as literally written in the edited skills" across `finalize-branch`,
`init-branch`, `sweep-project`, `triage-items`, `create-investigation`,
`create-project`, `generate-dev-plan`, `review-docs`, `operator-triage` and the
CLI reference; "`npm run check` … 1472 tests pass". One finding: the CLI
reference omitted `backlinks`' legacy `project/<name>` form.

All fixed in `08dc055`, `9711fb8` and `4065f2d`, with the three
`finalize-branch` walk issues Cole asked to fix now, each verified in a scratch
project with no remote. Small, targeted edits to a branch both reviewers had
checked, spot-checked by the coordinator. Final gate: `npm run check` 1472 pass,
`check-dist.sh` clean, `npx tsc --noEmit` clean.

## Deliberately not done

- The audit's eleven optional items and the five CLI gaps — filed as `triage`
  items in Phase 5, once `items/` exists here.
- The `update-project-docs` row for `v2.10-to-v3.0` — Phase 5, with its script.
- This repository's own legacy documents — Phase 5.
