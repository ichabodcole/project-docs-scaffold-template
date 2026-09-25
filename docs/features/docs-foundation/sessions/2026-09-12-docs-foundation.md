---
type: session
title:
  "Docs Foundation: seed manifest, declarable types, and three review rounds"
description:
  The four planned phases shipped; the migration was redesigned twice after
  review found the same defect class surviving its own repair.
tags: [area, feature] # 2-4 kebab-case keywords
status: stable # A session is frozen the moment it is written; it is never a draft.
generated: { by: claude-opus-5, at: 2026-09-12 }
---

# Docs Foundation: seed manifest, declarable types, and three review rounds

---

## What shipped

All four planned phases, across 10 commits on `feat/docs-foundation`.

| Phase |                                             | Commit    |
| ----- | ------------------------------------------- | --------- |
| 1     | The seed manifest (`docs/.pdocs-seed.json`) | `313a75d` |
| 2     | 19 templates reclassified as seeded         | `1396c1a` |
| 3     | The declarable type vocabulary finished     | `8bd5337` |
| 4     | The v2.9 migration                          | `2142718` |
| —     | Round 1 of review fixes                     | `c766b58` |
| —     | Rounds 2–3: the migration becomes a script  | `45be710` |

617 → 679 tests. `npm run check` green: format, docs-lint, version (7 markers),
mirror (53 files), dist (147 files).

## Review

**Where the roster was read.** The `Available agent types for the Agent tool`
listing in this session's system prompt — not `plugins/*/agents/`, which
describes definitions rather than what is dispatchable here.

**Rejected on capability.** `feature-dev:code-reviewer`,
`feature-dev:code-architect` and `feature-dev:code-explorer` all list
`Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput`
— **`BashOutput` and `KillShell` without `Bash`**, so they can read and kill
shells they cannot start. Also rejected: `plugin-dev:skill-reviewer`
(`Read, Grep, Glob`), `plugin-dev:agent-creator` (`Write, Read`),
`statusline-setup` (`Read, Edit`).

**Execution-capable and available:** `general-purpose` (`*`), `claude` (`*`),
`doc-reviewer` and the seven `project-docs:*` agents (`All tools`),
`codex:codex-rescue` (`Bash`), `plugin-dev:plugin-validator`
(`Read, Grep, Glob, Bash`).

**Dispatched, and what each actually executed** — quoted from their logs, not
inferred from their tool lists.

| Round | Reviewer                                     | Executed?                                                                                                                                                                                     |
| ----- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `general-purpose` — review of record         | **Yes.** _"I ran the branch rather than reading it. Everything below was executed."_ 77 tool calls; both cookiecutter install branches; the guide end to end twice; 5 perturbation mutations. |
| 1     | `feature-dev:code-reviewer` — second opinion | **No.** _"This is a static read only — I executed no commands."_ Labelled a static read; no findings at its bar.                                                                              |
| 1     | `general-purpose` — cold read                | No (by design; a reader is the instrument).                                                                                                                                                   |
| 2     | the round-1 review of record, resumed        | **Yes.** 29 tool calls; re-ran all three reproductions plus 9 perturbations.                                                                                                                  |
| 2     | `general-purpose` — cold read                | No (by design).                                                                                                                                                                               |
| 3     | `general-purpose` — Reviewer A (correctness) | **Yes.** 37 tool calls; 14-mutant witness sweep; reordered the phases against a real generated project.                                                                                       |
| 3     | `general-purpose` — Reviewer B (consequence) | **Yes.** 75 tool calls; measured cross-block variables across all seven other guides; traced release-please behaviour across four prior `!` commits.                                          |
| 3     | `general-purpose` — cold read                | No (by design).                                                                                                                                                                               |

Reviewer B was given the sweep rows, not a summary, and was briefed not to
evaluate correctness. Reviewer A was withheld the sweep so it would search for
branches the corpus had not reached.

## The finding that shaped the branch

Every round killed its specific defect and produced fresh instances of the
general class: **a claim, a success line, or a guard that nothing exercises.**

- Round 1 fixed four checks that could not fail — and reintroduced the class
  twice: a guard computed in one shell block and consumed in the next (a
  different process), and a count using `grep -c '": "'` that matched the
  manifest's own `version` line, so an empty manifest passed the check written
  to catch it.
- That made it a `repair-chain` §7 redesign trigger — _the same defect returning
  after its repair_ — rather than another round of local fixes. The diagnosis
  was one shape, not nine defects, and the executable content moved into a
  script.
- Round 3 then found the class again in the redesign: `--dry-run` reading the
  version from the adopter's own tree; `✓ both markers set` printing
  unconditionally; two Verification boxes a successful run cannot produce; and
  **the self-check itself had no wiring witness** — neutering its call site left
  the suite green, because all three of its tests called the function directly.

The perturbation habit is what caught these. Swapping the format and adopt
phases — the ordering the whole branch turns on — left **592 pass, 0 fail**. The
fix was not a test but `manifestMatchesDisk`, which runs at the end of every
migration, so a reordering fails in someone else's repository rather than only
while a test happens to exist.

## Two reviewer disagreements worth recording

**Execution did not dominate reading.** The round-2 review of record ran the
guide in **one shell**, so it could not observe the cross-block variable defect
at all — its execution model differed from the one the guide documented. Only
the cold reader, reasoning about the stated model, saw it.

**The breaking marker was on the wrong commit.** Reviewer B showed the `!` on
the migration commit named an empty population (the v2.9 guide was never
released, so nothing a consumer holds changed shape), while the real breaking
change — `pdocs find --type <unknown>` moving from exit 0 to exit 2 — shipped
unmarked in `8bd5337`. `scripts/pdocs/envelope.ts` states the rule: exit codes
are a published contract. The marker was re-anchored, so the changelog names the
cause that will actually break a consumer.

## Deliberately not done

`docs/briefs/2026-09-12-migration-shape.md`. `migration-authoring` still teaches
the shape this branch rejected; `update-project-docs` mandates four sections the
new guide does not have; and `v2.7-to-v2.8.md` is 626 lines with 17 cross-block
variables and no companion script, while being the migration most projects still
need. Measured, not estimated — that is a project, not a fix.

Also open: no lesson page was written for the branch's own replicated finding,
against `docs/SCHEMA.md`'s stated maintenance contract. It is the first item in
the brief's next steps, because it is the input to the skill rewrite rather than
its output.
