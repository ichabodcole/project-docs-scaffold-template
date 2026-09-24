---
type: session
title: Work Taxonomy Phase 3, templates and prose — 2026-09-24
description:
  The scaffold's contract, READMEs and templates describe features, items and
  cycles as the code actually behaves, STYLE.md is seeded, playbooks become Goal
  · Steps · Verification, and a cold reader can file an item from the docs
  alone.
tags: [taxonomy, templates, prose]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-24 }
---

# Work Taxonomy Phase 3, templates and prose — 2026-09-24

Part of
[Work Taxonomy release](../../../cycles/2026-09-work-taxonomy-release.md). Plan:
[Phase 3](../plan.md). Branch `feature/work-taxonomy-p3-templates-prose`. The
coordinator ran this from the main thread; an implementer sub-agent wrote the
prose and code, a cold-reader sub-agent tested the docs, and two reviewer
sub-agents checked the branch.

## What landed

| Commit    | What                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------- |
| `471ea45` | `docs/STYLE.md`, derived from acc's STYLE guide, seeded and linted as a contract page             |
| `30c3edd` | Playbooks are Goal · Steps · Verification; the override convention for five lifecycle events      |
| `6b6dc0c` | ITEM, FEATURE, WRITE-UP and REPORT templates; every field names its writer                        |
| `1131300` | `SCHEMA.md` describes features, items, cycles, state groups, references, archiving and ownership  |
| `07dd2bb` | The category READMEs: features, items, cycles, the docs README and AGENTS                         |
| `8696d55` | Manifesto (this repository only): an assignee routes work; project-docs tracks no people or dates |
| `9849255` | Root README, AGENTS.md and the scaffold checklist describe the new layout                         |
| `d5cb952` | The cold reader's findings answered                                                               |
| `6becd89` | Review — `status` is not moved by any step; `init-branch` offers `view ready`; a template link    |
| `86253bb` | The plan records the `init-branch` rule, and Phase 5 records `STYLE.md` in this repo's manifest   |
| `c8c7821` | `pdocs help new`: `--from` takes a reference; `--kind` is required for an item                    |

## The cold read

A fresh agent given only `docs/items/README.md`, `docs/SCHEMA.md` and the item
template filed a bug correctly — `pdocs new item … --kind bug`, the right path
and fields at `triage`, a definition of done — and said who moves it next. It
raised sixteen points, among them undefined terms ("shaping", `triage-items`,
bare `pdocs`), whether an agent may start a `triage` item, and CLI defaults the
docs did not mention (`generated.by`, JSON versus text id length). All were
answered in `d5cb952`.

## Decisions

- **`init-branch` starts only `backlog` or `ready` items** — never a `triage`
  item, since triage is the step the user sees. It offers what
  `pdocs view ready` lists, and starts a `backlog` item only when the user names
  it. Kept by Cole.
- **An item's `status` is not moved by any workflow step.** The implementer had
  proposed that shaping moves it from `draft` to `stable`; Cole declined it, so
  `status` keeps the template's value as the OKF document-trust marker and
  `lifecycle` alone carries where the work has got to.
- **`SCHEMA.md`'s "Theirs" rule is amended**: a major migration may move a
  document and rewrite its frontmatter and links, but never rewrites prose,
  never deletes, and names every move.

## Review

Roster read from the Agent tool's dispatchable types in this session, unchanged.
`feature-dev:code-reviewer` was rejected on capability — no `Bash`. Two
reviewers ran in parallel: `Plan` (resumed; a shell, no editing tools) for plan
alignment, and `doc-reviewer` ("All tools", so a shell) for accuracy — does the
prose describe what the code does — told to report only.

Accuracy — **Ready to merge: Yes**. Its log, quoted:
"`cookiecutter . --no-input --overwrite-if-exists -o <scratchpad>/wt-review install_target=\"New project folder\"`";
every `pdocs` verb exercised in it; each lint finding "triggered directly by
editing frontmatter then reverting", from `MISSING kind` to `ITEM DELETED`;
"`npm run check` … all green (1470 tests pass)"; `diff` of every mirrored
document against the payload — byte-identical. One finding: a feature-owned
`write-up.md` undocumented.

Plan alignment — **With fixes**. Its log, quoted: "`bun test` (full suite) —
**1470 pass, 0 fail**"; "`bun scripts/pdocs/cli.ts check --format text` was
**clean**"; `cmp`/`diff` of the seeded files across both trees —
"**byte-identical**". Findings: the proposed `status` rule would give shaping a
field no Phase 4 or 5 table writes; `init-branch` and `view ready` disagreed
about `backlog`; a session-template link climbed one level too few; this repo's
seed manifest lacks `STYLE.md`.

All were fixed in `6becd89`, `86253bb` and `c8c7821` — small prose and help-text
edits to a branch the accuracy reviewer had already passed, spot-checked by the
coordinator rather than re-reviewed. Final gate: `npm run check` 1471 pass,
`npx tsc --noEmit` clean.

## Deliberately not done

- The skills that the prose now names — `triage-items`, the field writes in
  `init-branch`, `finalize-branch` and `sweep-project`, the playbook overrides —
  are Phase 4.
- This repository's own legacy folders, READMEs, `index.md` and seed manifest
  are unchanged until the Phase 5 migration.
