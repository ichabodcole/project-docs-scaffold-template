---
type: kickoff
title: "Dev Kickoff: Work Taxonomy"
description:
  The briefing for implementing Work Taxonomy and Guidance Lifecycle as one
  major release, phase by phase, starting with the schema, registry and lint.
tags: [taxonomy, schema, migrations]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Dev Kickoff: Work Taxonomy

**Branch:** `feature/work-taxonomy-p1-schema-lint` (Phase 1; each later phase
gets its own branch)\
**Created:** 2026-09-22\
**Strategy:** Main repo

---

## Mission

Replace project-docs' ad hoc work vocabulary with three entities — **feature**
(the proposal is the feature), **work item** (one kind, with `kind`), and
**cycle** — whose documents are owned by and co-located with them, whose
relationships are fields, and whose states come from one grouped vocabulary;
backlog, board and roadmap become views `pdocs` derives. Guidance Lifecycle
ships in the same major release: `memory` and `lesson` retire, playbooks become
Goal · Steps · Verification, and consult, reflect and override are wired into
the skills. This repository is migrated onto the new model first, then one
consumer.

## Source Documents

**Project:**

- [Proposal](./proposal.md)
- [Plan](./plan.md) — six phases; decisions D1–D24 in one table are
  authoritative
- [Test Plan](./test-plan.md) — 4 smoke, 11 critical path, 4 deferred
- [Guidance Lifecycle proposal](../guidance-lifecycle/proposal.md) — ships in
  the same release
- [Cycle](../../cycles/2026-09-work-taxonomy-release.md)

**Background context:**

- [Investigation](../../investigations/2026-09-22-work-taxonomy-for-agent-first-development-investigation.md)
  — why the model is shaped this way
- [Project Manifesto](../../PROJECT_MANIFESTO.md) — design principles
- `.claude/skills/scaffold-update-checklist/SKILL.md` — mirroring, ownership,
  migrations, `dist/`

## Constraints

- **Add, migrate, retire — in that order.** This repository lints itself with
  the code it ships, and the pre-commit hook runs the gate on every commit. The
  new model goes in beside the old (Phases 1–4); old rows are flagged `retired`
  and deleted only in Phase 5's last task. No commit uses `--no-verify`.
- **The D-table in the plan is where decisions live.** In particular: the key
  stays `lifecycle` (D1); a feature's entry file is `feature.md` (D2);
  agent-made items default to `triage`, with no CLI gate (D8); `_archive/` is
  kept for terminal entities only, moved by `pdocs archive` (D15); versions are
  package 9.0.0, plugin 4.0.0, migration `v2.10-to-v3.0` (D14).
- **Every field needs a named writer.** `released_in` is optional and not
  linted.
- **Tests spawn through `childEnv()`** (`scripts/pdocs/test-env.ts`). Test files
  are not mirrored to the payload; production files under `scripts/pdocs/` are,
  byte for byte, and a new one must be copied or the mirror check misses it.
- **Migration tests derive owned-file diffs, never pin them** — release-please
  rewrites `scripts/pdocs/cli.ts`'s version on every release.
- **Parallel implementers use separate worktrees**; two agents in one tree
  collide on the `dist/` rebuild and on pathspec commits.
- **`finalize-branch` is revised once** (Phase 4), carrying both proposals'
  changes.

## Your Workflow

1. Read the project documents linked above.
2. Implement the current phase from the plan, test-first where the plan says so.
3. Keep the gate green: `npm run check`, `npx tsc --noEmit`.
4. Commit per task with clear messages.
5. Finalize each phase's branch with `/project-docs:finalize-branch`, then open
   the next phase's branch from `develop` and add it to the cycle's Sessions.
6. Record results in the test plan's Results Addendum as scenarios become
   runnable.

## Completion Status

- [x] Discovery complete (the plan was written against the code)
- [x] Plan created and user-reviewed
- [x] Test plan created
- [x] Phase 1 — schema, registry, lint
- [x] Phase 2 — `pdocs` creation, promotion, `set`, `archive`, views
- [x] Phase 3 — templates and prose
- [x] Phase 4 — skill audit and touch points
- [ ] Phase 5 — migration, dogfood, retirement
- [ ] Phase 6 — second consumer, revision, release

## Completion

**Main-repo strategy:** When a phase is complete and all tests pass:

1. Run `/project-docs:finalize-branch` to perform code review, create a session
   document, and prepare the branch for merge.
2. Finalize-branch will present merge options — proceed with the appropriate
   option.

## Notes

- Nothing is released from `develop` until Phase 6 (the plan's Rollback Plan).
- Before the Phase 5 dogfood run, this repository's memories are deleted by
  hand, and its two lessons folded into a playbook (plan Phase 5).
