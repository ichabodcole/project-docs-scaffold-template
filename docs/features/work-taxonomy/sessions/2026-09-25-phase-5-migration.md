---
type: session
title: Work Taxonomy Phase 5, the migration and the dogfood run — 2026-09-25
description:
  The v2.10-to-v3.0 migration was built, hardened over four review rounds until
  its recovery paths were safe, and run on this repository, which now runs on
  features, items and cycles with the old types retired.
tags: [taxonomy, migrations, dogfood]
status: stable # A session is frozen the moment it is written; it is never a draft.
generated: { by: claude-opus-5-5, at: 2026-09-25 }
---

# Work Taxonomy Phase 5, the migration and the dogfood run — 2026-09-25

Part of
[Work Taxonomy release](../../../cycles/_archive/2026-09-work-taxonomy-release.md).
Plan: [Phase 5](../plan.md). Branch `feature/work-taxonomy-p5-migration`, 48
commits. The move itself is recorded in
[the dogfood session](./2026-09-25-dogfood-migration.md); this record covers the
phase as a whole — building the migration, the review rounds that made it safe,
and the decisions taken along the way. The coordinator ran it from the main
thread; an implementer sub-agent wrote the code, a read-only sub-agent reviewed
the memories, and two reviewer sub-agents checked each round.

## Part one — the migration

`migrate-v2.10-to-v3.0.ts`, its test and guide (`2b32b29`–`4a2d70a`): the plan's
conversion table in twelve phases, reusing the Phase 2 link rewriter, never
deleting a document of the adopter's. The three older migrations are pinned to
the `project-docs-scaffold-template-v8.1.0` tag (D16), and the v2.6 parity test
reads that tag's lint so retirement cannot break it.

It took four correctness rounds to make the recovery paths safe, each finding
confirmed by execution on clones of this repository:

1. **Resuming** (`c2a225b`) — an interrupted run renamed everything first and
   converted afterwards, so a re-run found nothing left to convert; and a re-run
   after a red verify stopped on the migration's own output. Now a record of the
   plan and every written path lets a re-run finish either case.
2. **Overwrite** (`3b207bb`) — the resume wrote the planned text over edits made
   after the stop. Now each planned write records the bytes it may replace and a
   resume stops, naming the path, on anything else.
3. **Destructive advice** (`4d76747`, `1b48eec`) — the corrupt-record advice was
   `git checkout -- . && git clean -fd`, which, followed literally, destroyed
   unrelated uncommitted work and a pre-existing untracked draft. Now it is a
   reversible stash procedure; the record is written atomically; and the plan's
   own Rollback Plan, which carried the same advice, was reworded.
4. **Untracked files** (`a54a018`) — the stash procedure's restore step missed
   untracked files, which live in `stash@{0}^3`.

The implementer disclosed that one batch of planning functions (`0c008ea`) was
drafted before its tests; the correctness reviewer's neuters showed 20 of 24
behaviours already constrained, and the four that were not now have tests.

## Part two — the dogfood run

Recorded in full in [the dogfood session](./2026-09-25-dogfood-migration.md):
five playbooks written from the memories and lessons, which Cole then deleted by
hand after the permission system refused the deletion to an agent (`fc71f85`);
briefs and reports placed as he decided; the in-place run (`194e400`, 88 moves,
266 links respelled, no document deleted); the post-run settings and 21 triage
items; and the retirement commit (`4f50c62`).

## Decisions

- **D16** — each migration runs against the scaffold release it was written for.
- **D24**, replacing D19 — skills write no process reports; a report is only
  evidence owned by work that exists for its own sake. `project-summary` and
  `review-docs` changed accordingly (`f7f0b97`).
- **D25**, replacing D18 — ids print as their shortest unique prefix, never
  under 12 characters. D18's rationale was wrong: 12 hex characters are exactly
  UUIDv7's timestamp.
- **Minting** (`0fed0c1`, `1d8bdb7`) — the migration mints each id from the time
  of the commit that first added the document, following renames but not copies
  (`--follow` alone treats a similar sibling as the file's origin).
- **This repository's 70 ids stay as minted.** They were created in one burst
  before the minting rule, so they print long; re-minting reads as 70 deletions
  to the deletion check by design, and Cole chose that over adding machinery to
  re-identify an item.

## Review

Roster read from the Agent tool's dispatchable types in this session, unchanged.
`feature-dev:code-reviewer` rejected on capability — no `Bash`. Two reviewers,
resumed with their context each round: `Plan` (a shell, no editing tools) for
plan alignment, and `general-purpose` (tools `*`) for correctness, told to
report only and never to run the script in place here.

Part one — plan alignment **With fixes** (every row, phase and test built; the
implementer's seven unstated choices judged sound; wording fixes). Correctness
**No**, then **No**, then **With fixes**, then **With fixes**, across the four
rounds above; its logs quote real runs on clones — "`chmod 444` on the backlog
file … phase 5 stops", "`git stash push --include-untracked` … step 3 … exit 0,
clean check", 24 and later further neuters.

Part two — correctness **Ready to merge: Yes**: "178 renamed/modified pairs; 3
differ in prose, exactly the documented hand fixes", "69 `id:` values, all
unique", every retired word refused with its replacement, the generated payload
running the full flow, six retirement neuters each failing tests. Plan alignment
**With fixes** — stale text in the checklist, manifesto and summary; an
incomplete session record; stale seed records; `find --type` for retired words —
all fixed (`abe093e`–`7e70d54`), with the born-item date bug the implementer
found fixed test-first (`44db294`).

Final gate: `npm run check` 1736 pass, `npx tsc --noEmit` clean, `pdocs check`
clean on this tree and on a generated payload.

## Next time

Recovery advice is code: it went through two rounds before it stopped being
destructive, because it was read rather than followed. The step is now in
[writing-migrations](../../../playbooks/writing-migrations-playbook.md) — follow
every recovery instruction literally, on a fixture that also holds unrelated
work.

---

**Related Documents:**

- [Plan](../plan.md)
- [The dogfood session](./2026-09-25-dogfood-migration.md)
- [Work Taxonomy: Feature, Work Item, Cycle](../feature.md)
