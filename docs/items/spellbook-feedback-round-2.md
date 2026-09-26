---
type: item
title: "Spellbook feedback, round 2: the v2.10-to-v3.0 migration"
description:
  Eight fixes from Spellbook's 8.1.0 to 9.0.0 migration, worked as one branch
  before story-loom runs the same migration.
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: triage # triage | backlog | ready | active | review | done | dropped
id: 01a0dfd9-e990-71b9-83a6-53444cbca087
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-26 }
tags: [feedback, migrations]
cycle: 2026-09-v9-rollout-feedback
scope: migrations
---

# Spellbook feedback, round 2: the v2.10-to-v3.0 migration

Spellbook ran v2.10-to-v3.0 on 2026-09-25 (8.1.0 → 9.0.0: 19 projects, 114
backlog files, 173 moves, 347 links respelled) and reported on the grapevine
channel `project-docs-v9` (messages 3 and 5). The run itself held: the preflight
listed every judgment call at once, and resuming from the record after a red
verify worked as documented. Two of the agent's first readings were refuted here
and turned out to be different bugs: the templates it thought were untouched
scaffold files were its own, and the sprint section it thought the scaffold
owned was its own addition to an owned README.

These fixes matter before story-loom runs the same migration.

| #   | Fix                                                                                                                                                                                                                                                                                                                                                 | Where                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | A seed record takes only files the scaffold release ships. v2.8-to-v2.9 recorded two of Spellbook's own templates (`PROJECT-LEDGER`, `SPRINT-OUTCOME`) because `isSeeded` matches by name pattern. The v3.0 preflight should also say "the scaffold never shipped this, it is yours" instead of "not a document this migration knows where to put". | `isSeeded` callers in the seed recording; `planTemplates` in `migrate-v2.10-to-v3.0.ts`                 |
| 2   | Warn when a retired owned README (or any owned file the refresh replaces) differs from the scaffold release it came from, and print the `git show <before>:<path>` that recovers it. Spellbook's multi-sprint conventions lived in its owned `projects/README.md` and were removed silently.                                                        | refresh and retired-README steps, `migrate-v2.10-to-v3.0.ts`                                            |
| 3   | Phase 10 (and `pdocs report`) resolves a MISSING FILE target through the move table, including a relative link one level short, and suggests the fix. 62 of Spellbook's 82 phase-10 problems were links already broken in legacy `_archive/`s.                                                                                                      | phase 10 verify; `scripts/pdocs/commands/report.ts`                                                     |
| 4   | Respell retired `docs/backlog\|projects\|investigations/…` paths outside the docs root (code comments, `.anthill/`, root files) from the move record: a helper, or a documented one-liner. Spellbook did about 50 by hand.                                                                                                                          | new helper or `v2.10-to-v3.0.md` Cross-Reference section                                                |
| 5   | The ownerless-report step: its target position (`projects/<slug>/reports/`) is WRONG TYPE under the v2.10 lint, so the pre-commit gate blocks the commit the preflight asks for. Also reword "no investigation links to it", which reads as "nothing links to it".                                                                                  | `v2.10-to-v3.0.md`                                                                                      |
| 6   | The summary counts the born items set `done` for having no proposal and says to check them. Spellbook had 7; the default was right for all but one arguable case, but the notice was buried in 500 lines of plan output.                                                                                                                            | summary step, `migrate-v2.10-to-v3.0.ts`                                                                |
| 7   | "What it cannot check" says state mapping is faithful, so a stale state (`implemented` on a feature with open work) carries forward as `done`.                                                                                                                                                                                                      | `v2.10-to-v3.0.md`                                                                                      |
| 8   | The cycle template's Outcome names what carried over to the next cycle, and says an `abandoned` cycle still writes one (what was falsified). The guide notes that the 8.x multi-sprint convention maps to cycles: one cycle per sprint, its work as items with `cycle:` and `parent:`. Non-`.md` evidence belongs in the owner's `artifacts/`.      | `docs/cycles/TEMPLATE.md` (seeded, so mirrored byte for byte); `v2.10-to-v3.0.md`; `features/README.md` |

## Definition of done

- [ ] Each of the eight rows is fixed, with a test wherever the migration's
      behaviour changes (1, 2, 3, 6).
- [ ] A migration dry run on a fixture holding a local template and an edited
      owned README reports both as the user's own, with the recovery command.
- [ ] Plugin 4.0.1 is released carrying them, before story-loom migrates.
