---
type: session
title: v3 migration, Spellbook round 2 — 2026-09-27
description:
  "The v2.10-to-v3.0 migration and its predecessors now handle what Spellbook
  hit: adopters' own templates, edited owned files, links broken before the run,
  paths outside docs/, and born items; reviewed twice by two reviewers."
tags: [migrations, feedback, spellbook]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-27 }
---

# v3 migration, Spellbook round 2 — 2026-09-27

Part of [v9 rollout feedback](../../../cycles/2026-09-v9-rollout-feedback.md).
Branch `fix/v3-migration-spellbook-round-2`. Implements the eight rows of
[this item](../item.md) (its Verdicts section records each one) and
[a born item takes its description from what it owns](../../born-items-take-description-from-owned-docs.md).

## What landed

- **Seed records** take only the templates the scaffold ships. v2.10-to-v3.0
  moves an adopter's own template into `TEMPLATES/`, and stops before anything
  moves on a name clash, compared without case.
- **Edited owned files** are named, from a table of every owned file as each
  release before 9.0.0 shipped it, with the `git show` that recovers the text.
- **Phase 10** suggests the corrected link for a MISSING FILE the moves explain.
  The moves persist in `.git/pdocs-migrate-v2.10-to-v3.0.moves.json`, merged
  (not overwritten) on a re-run.
- **`--respell <path>... [--write]`** lists, then respells, retired paths
  outside the docs root from that record.
- **The guide**:
  - an ownerless report is committable under the v2.10 gate;
  - stale states carry forward;
  - an 8.x multi-sprint convention maps to cycles;
  - the move record belongs to one checkout;
  - non-default Prettier settings can trip the owned-file check.
- **"For you to check"**, at the end of a run, counts and lists the born items
  set `done`.
- **A born item** with no session or plan takes its title and description from
  the document it owns.
- **The v2.10-to-v3.0 tests** build 9.0.0 from the release tag, not the working
  tree, as D16 requires.
- **This repository's templates:** the cycle template's Outcome names what
  carried over and says an abandoned cycle still writes one, and the features
  README places non-Markdown evidence in `artifacts/`.

## Decisions

- **Delivery of row 8.** Under D16 the migration installs the v9.0.0 tag's
  files, so story-loom would get the old cycle template and features README. The
  owner chose a scaffold 9.0.1 release with the migration re-pinned to it
  ([re-pin item](../../repin-v3-migration-to-9.0.1.md)) over a new migration.
- The implementer's choices are in [the item's Verdicts](../item.md#verdicts):
  - move rather than stop;
  - suggest rather than rewrite;
  - a `--respell` mode rather than a one-liner;
  - the pre-run base as the recovery ref.

## What went wrong

The pre-commit gate failed repeatedly mid-way through the review fixes. The
machine was entering Maintenance Sleep and Deep Idle for 15 minutes at a time
(`pmset -g log`), and each suspended test used up its 5-second budget. The
implementer found the cause, not the code, and stopped retrying rather than
loop. `caffeinate -i` did not hold the machine awake. The last three commits
were made with the owner at the machine, under `caffeinate -dims`.

## Review

Roster read from the Agent tool's dispatchable types in this session:

- `general-purpose` (tools `*`): chosen for correctness.
- `Plan` (all tools except editing): chosen for plan alignment, a dual review
  because the branch changes the scripts story-loom runs next.
- `feature-dev:code-reviewer`: rejected on capability, having `BashOutput` and
  `KillShell` but no `Bash`.

**First pass.**

- **Correctness: With fixes.** Its log:
  - a story-loom-shaped 8.0.0 fixture holding unrelated uncommitted work, run
    through v2.9→v2.10 and v2.10→v3.0 against the v8.1.0 and v9.0.0 tag
    scaffolds;
  - every printed instruction followed literally: the report step, 3
    suggestions, 2 `git show` recoveries, `--respell`;
  - Prettier variants over every owned file of every 7.x and 8.x tag;
  - two fixes neutered;
  - "487/487" migration tests.

  It found the move record overwritten by a partial one after a phase-8 stop,
  and case-only template clashes passing the preflight.

- **Plan: With fixes, a static read.** It stayed read-only and ran no tests. It
  found three stale or missing guide passages and the row-8 delivery problem,
  and recommended the 9.0.1 re-pin.

**Re-review.**

- **Correctness: Ready to merge: Yes.** Its log:
  - a fresh clone at the guide-fix commit, 491/491;
  - the phase-8 stop reproduced by `chmod 555`: "record 30/30, 3 suggestions";
  - the case clash stopped in the preflight with nothing written;
  - a canary edit to the working tree's templates changed nothing ("157 pass"),
    so the tests read the tag;
  - fix 1 and fix 2 neutered, 1 and 2 tests red.
- **Plan: With fixes, a static read.** Its mode forbade a clone. It found two
  guide sentences, fixed afterwards in a final guide commit: the case-clash stop
  was not described, and the Prettier example had no reason given. That commit's
  wording was not re-reviewed. The reason it gives is the one the correctness
  reviewer observed by running Prettier.

**Follow-up items**, filed from this session:

- [re-pin to 9.0.1](../../repin-v3-migration-to-9.0.1.md): `ready`,
  owner-approved
- [records shared across projects in one repository](../../migration-records-per-project.md):
  `triage`
- [a re-run's summary counts](../../migration-rerun-summary-counts.md): `triage`

---

**Related Documents:**

- [Spellbook feedback, round 2: the v2.10-to-v3.0 migration](../item.md)
