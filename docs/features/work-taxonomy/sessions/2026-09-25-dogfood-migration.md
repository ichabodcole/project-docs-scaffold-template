---
type: session
title: Work Taxonomy Phase 5, the dogfood migration and retirement — 2026-09-25
description:
  "This repository migrated itself to the work taxonomy with the v2.10-to-v3.0
  script, and the old types were then retired: what the run took, every stop,
  every manual step and every fix it forced."
tags: [taxonomy, migrations, dogfood]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-25 }
---

# Work Taxonomy Phase 5, the dogfood migration and retirement — 2026-09-25

Part of
[Work Taxonomy release](../../../cycles/2026-09-work-taxonomy-release.md). Plan:
[Phase 5](../plan.md), "Dogfood on this repository" and step 6. Branch
`feature/work-taxonomy-p5-migration`. The script and its guide were built and
reviewed earlier on this branch (part one); this record is the run.

## What the run took

- **Dry run**, in place, with the 9.0.0 scaffold generated from this working
  tree (`--scaffold-dir`): exit 0 in about a second, 88 moves planned, 210
  documents to write, no judgment steps left.
- **Real run**: about a second. 88 moves — 32 features (10 into
  `features/_archive/`), 23 items born from project folders with no proposal, 17
  backlog items, 8 research items with their write-ups, 8 reports — 31 item
  files created, 266 links respelled (4 files edited in place), `scope:` moved
  off three cycles. Removed only the scaffold's own: 4 untouched retired
  templates, 6 retired READMEs, 5 `.gitkeep`/`.DS_Store` files, 6 emptied
  folders. No document deleted.
- **It stopped at verify, as designed,** on 15 links that were already broken
  inside the legacy archives, never linted before. Fixed by hand (below), then
  the same command re-run uncommitted: exit 0, markers at 8.1.0 (the scaffold
  generated from an unreleased tree still says 8.1.0; release-please moves
  both).
- `docs/STYLE.md` is recorded in `docs/.pdocs-seed.json` — identical to the
  scaffold's, so recorded without being written.
- Ids: the 48 items the run filed share their 12-character prefix, filed as a
  finding (below).

## Prep, before the run

| Commit    | What                                                                        |
| --------- | --------------------------------------------------------------------------- |
| `7b25df1` | Five playbooks from the twelve named memories and both lessons              |
| `0beccb5` | Every link to a memory or lesson repointed to its playbook                  |
| `e66b4ea` | `AGENTS.md`: a parallel implementer gets a worktree; `lint.scopes` declared |
| `64d0e46` | Script fix: a report's own link decides its owner (test first)              |
| `2d03315` | Briefs and reports placed with their owners; 29 links respelled             |
| `dfd2b3b` | Guide fix: retype a brief to `artifact` when moving it                      |
| `fc71f85` | Memories and lessons deleted (by the owner) with their index sections       |

## Every stop

1. The auto-mode permission check refused the command that deleted the memories
   and lessons. The owner ran `git rm` himself; everything after continued from
   his staged deletion.
2. `pdocs new playbook` wrote catalog lines Prettier then reformatted, so the
   first playbook commit failed `format:check`. Formatted; filed.
3. Moving a brief into `artifacts/` as the guide said left `type: brief`, which
   this repository's own gate refused. Retyped by hand; the guide now says to.
4. Two landscape reports were linked by two investigations each; the only remedy
   was deleting a link from an investigation. Fixed in the script.
5. The real run stopped at verify on 15 pre-existing archive links.
6. After the run: `format:check` failed on the refreshed owned `docs/CLAUDE.md`
   (the payload's copy was not Prettier-wrapped) and on 75 documents whose
   frontmatter the run synthesized or rewrote; and `rules.test.ts` counted this
   repository's templates against a pinned 18.

## Every manual step

- Nine briefs retyped `artifact` without `lifecycle` after moving them.
- The two 2026-09-03 landscape reports each gained a line linking the 09-03
  investigation.
- The 15 archive links: targets respelled to where the files live now (the
  retired `CLAUDE.md` path, a brief, `PLAN.template.md`, the cross-agent
  investigation and design, the html-mockup skill and its components page, three
  recipes now under `recipes/library/`, the slide-deck brief); two links to the
  removed `parallel-worktree-dev` skill and a bare commit sha turned to code.
- `npx prettier --write "docs/**/*.md"`, as the guide's step 2 says.
- The payload's `docs/CLAUDE.md` wrapped; `rules.test.ts`'s template floor set
  to what the payload ships (15).
- After the run: `ui-experimentation-framework` and `hivemind-playbook-catalog`
  dropped with reasons, `lint-beyond-the-docs-root` backlog with scope `pdocs`,
  `cross-harness-event-push-landscape` kind `research`; those and
  `provide-feedback-skill` titled and described from what they own; the two
  ported backlog items narrowed; 21 `triage` items filed (the slide-deck
  question, the audit's twelve optional items, six CLI gaps, and two the run
  found). `ec76e09`, `96dd103`.

## Script and guide fixes the run forced

- `64d0e46` — a report's own link decides its owner. Test seen failing first.
- `dfd2b3b` — the guide tells an adopter to retype a moved brief.
- `194e400` — the payload's `docs/CLAUDE.md` is Prettier-clean (an owned file
  must not fail a consumer's formatter); the template-count test counts against
  the payload.
- Filed, not fixed: born items with no session should take their title and
  description from what they own; migrated ids should be minted from each
  document's date so their displayed prefixes differ.

## Retirement

`4f50c62` removed the retired rows, their folders, `PROJECT_FILE_TYPE`,
`PROJECT_SPEC`, `PROJECTS_FOLDER`, the cycle's `scope` field, the legacy branch
of position typing, the `project/<folder>` address and `--owner project/<slug>`,
and the retired rows of `SCHEMA.md` in both trees; the goldens lost their legacy
row. Each retired word is still refused by name. `pdocs check` on this tree and
on a generated payload: clean. The gate stayed green through it.
