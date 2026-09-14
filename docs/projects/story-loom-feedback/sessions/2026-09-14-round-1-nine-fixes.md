---
type: session
title: "Story-loom feedback, round 1: nine fixes — 2026-09-14"
description:
  The first consumer's nine issues were reproduced before scoping, landed one
  commit each by two implementers in one tree, and reviewed by execution; the
  branch is the first one attached to a cycle.
tags: [feedback, lint, codemod, orchestration]
status: stable
generated: { by: claude-fable-5-1, at: 2026-09-14 }
---

# Story-loom feedback, round 1: nine fixes — 2026-09-14

Part of
[Story-loom feedback, round 1](../../../cycles/2026-09-story-loom-feedback.md).
Branch `fix/story-loom-feedback-round-1`, base `develop`. Spec: the
[backlog item](../../../backlog/2026-09-14-story-loom-feedback-round-1.md). This
folder holds only sessions; the work was backlog-shaped.

## What shipped

Nine issues (#163–#171), each verified by reproduction on this repository's code
before scoping and each landed as its own commit closing it, plus three
follow-ons and the 3.11.0 bump. The branch landed as one squashed commit under
the repo's landing policy; the SHAs below are the branch's own, kept as the
record of which change answered which issue:

| Issue | Commit (pre-squash) | Fix                                                                                                          |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| #167  | `1033240`           | both scripts patch `version` in place; the config's bytes are the project's                                  |
| #163  | `37da87a`           | a template is an exact shape, never a substring; `check --format json` names what it skipped                 |
| #164  | `c953f63`           | tags only from the metadata paragraph, only from backticked or `#` tokens, case bug fixed                    |
| #165  | `14fb025`           | skipped files whose frontmatter is not this contract's are named as needing conversion                       |
| #168  | `0fef592`           | YAML Prettier leaves alone; the playbook template Prettier-clean under defaults                              |
| #169  | `3331be2`           | a slide deck set apart, with the pointer at `lint.exclude`                                                   |
| #163  | `b0f8825`           | `seed.ts` and the lint decide "template" by one rule                                                         |
| #166  | `ef4f7ec`           | Step 7 asks the project's formatter whether it has claimed `scripts/pdocs/`                                  |
| —     | `21a933a`           | the v2.6 script prints the codemod's new buckets                                                             |
| #163  | `7af520e`           | SCHEMA's Seeded row names the five exact shapes                                                              |
| #170  | `897d035`           | the gate script is `docs:check`, composed into an existing `check`                                           |
| #168  | `e0b3f1b`           | the hook bullet names the migration's own output                                                             |
| #171  | `cb3649b`           | the v2.5 precondition is silent under zsh                                                                    |
| #167  | `d767b1c`           | the authoring skill's config-write rule                                                                      |
| —     | `dd06742`           | `project-docs` 3.11.0                                                                                        |
| —     | `095ad4b`           | finalize-review fixes: the tags-anchoring witness, an unquoting bug, a stale comment, the Biome version note |

## Verification before scoping

Two verifiers reproduced every claim: eight confirmed as filed; #164 confirmed
as an effect but misdescribed as a mechanism (a bold Tags label in a feature
bullet, not "any line with the word"); two proposed fixes refuted though the
defects stood — #163's pattern list missed two shipped templates, and #166's
grep matched the reporter's own workaround line. Both refutations changed what
was built.

## How the work was done

Two implementers with disjoint files ran in one tree, one commit per issue, TDD,
the pre-commit gate on each. That cost more than it saved: `dist/` mirrors the
whole plugin, so either agent's uncommitted edits failed the other's
`check:dist`; pathspec commits run the hook with a temporary index that a
fixture's `git status` inherits; and one plain commit swept the other's staged
files once and was re-cut. Recorded in the
[memory](../../../memories/2026-09-14-story-loom-feedback-round-1.md); next time
the second implementer gets a worktree.

## Review

**Census.** Roster read from the Agent tool's list in the session's system
prompt. `general-purpose` (tools `*`, shell) — the review of record;
`doc-reviewer` (all tools, shell) — issue alignment and documents;
`feature-dev:code-reviewer` and `feature-dev:code-architect` — rejected on
capability, neither has `Bash`; `project-docs:docs-curator` and `Explore` —
capable, not chosen (single-document scope; code location, not review).

**What each executed**, from their logs. Code reviewer: `npm run check` and
`bun run typecheck`; a generated project with `templates.md` beside
`control.md`; Bun probes of `tagsOf`, `isContractPage`, and
`patchTopLevelVersion` across 22 adversarial JSON shapes; the codemod run on a
Slidev deck, a foreign-frontmatter memory and a double-quoted H1 with
`prettier@3 --check` on the output; both `Applies If` forms under `zsh -c`;
Prettier with and without an ignore on `scripts/pdocs`; a scratch clone from
`git archive` with seven mutations, each reverted. Docs reviewer:
`gh issue view` ×9; the Step 7 formatter loop under `bash` and `zsh` with Biome
1.9.4 and 2.5.13 and Prettier 3; all eight `Applies If` cells under `zsh -c` in
three tree states; `check-mirror.sh`; `pdocs check`; `prettier --check` on
eleven changed pages. Neither edited the repository.

**Findings.** Code reviewer, "with fixes": six of seven mutations went red;
reverting the #164 paragraph anchoring left all 219 tests green — an unwitnessed
guard, the class the repo's lesson forbids. Also: a stale comment in the
seeded-coverage test, `conversionNeeded` not unquoting a quoted `type`, and a
nit on Jekyll `layout:` wording. Docs reviewer, "with fixes": the Step 7
exclusion example is Biome 2 syntax and Biome 1.x ignores it silently; and #168
was closed by two commits, which the squash resolves. All four deviations the
implementers recorded were judged sound. The fixes landed as `095ad4b`.

## Deliberately not done

- **The Jekyll wording nit.** `layout: post` alone reads as "looks like a slide
  deck"; the routing to `lint.exclude` is right, the noun is not. Left.
- **Delivery to a consumer.** The payload changed under an unchanged scaffold
  release; a project on 8.0.0 receives none of it until
  [v2.9 → v2.10](../../../backlog/2026-09-14-v2.9-to-v2.10-refresh-the-owned-files.md),
  the cycle's second branch.
- **Pre-existing edge cases** the reviewer noted out of scope: a BOM-prefixed
  config throws before the patch; CRLF frontmatter is unrecognised by codemod
  and lint.
