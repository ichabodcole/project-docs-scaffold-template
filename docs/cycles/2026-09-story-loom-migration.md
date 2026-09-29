---
type: cycle
title: Story-loom migration
description:
  Build the five migration changes the story-loom trial called for, release
  them, and run story-loom's migration to 9.0.1 on that release.
tags: [migrations, story-loom]
status: draft
lifecycle: closed
started: 2026-09-27
appetite:
  Until story-loom is on 9.0.1 with a clean check and a commit its hook accepts.
after: []
generated: { by: claude-opus-5-5, at: 2026-09-27 }
closed: 2026-09-29
---

# Story-loom migration

## Why now

Story-loom is the last active consumer still on the 8.x layout, and its
migration was deferred while work was in flight there. A trial run on a clone of
its `develop`
([readiness write-up](../items/story-loom-migration-readiness/write-up.md))
showed the run completes. It also showed that five gaps in the migration would
make story-loom's commit hook refuse the result or risk its canon files, so
those ship first.

## Scope

- [Prettier-shaped frontmatter](../items/migration-frontmatter-prettier-shape/item.md)
  — a migrated tree passes a `prettier --check` hook.
- [Root-relative and since-archived link suggestions](../items/phase-10-root-relative-and-archived-links/item.md)
  — phase 10 suggests fixes for most of story-loom's 235 old archive breaks.
- [Retype positional artifacts](../items/migration-retypes-positional-artifacts/item.md)
  — nested workstream plans and sessions come out as `artifact`.
- [Respell `lint.exclude` globs](../items/migration-respells-lint-exclude-globs.md)
  — no hand edit, no forced re-run.
- [Respell formatter ignore files](../items/migration-respells-formatter-ignores/item.md)
  — story-loom's byte-exact canon files stay protected.
- Added at triage, 2026-09-28, from issues #182 and #154, because each touches
  the migration or the release this cycle cuts:
  [the v3.0 migration knows the 9.x releases](../items/migration-recognises-9x-releases/item.md),
  [the skill names the upgrade case it is in](../items/document-patch-refresh-of-a-v3-tree/item.md),
  [adoption prompts a root CLI pointer](../items/prompt-root-agent-file-cli-pointer.md)
  and
  [the lint checks a closed cycle's Outcome](../items/lint-closed-cycle-without-outcome.md).
- Added at triage, 2026-09-28, from the first branch's review, because
  story-loom's run would hit them:
  [a respelled link misaligns its table](../items/link-respell-misaligns-tables/item.md),
  [installed owned files are Prettier-clean](../items/owned-files-installed-unformatted.md)
  and
  [the format phase never downloads Prettier](../items/migration-format-phase-downloads-prettier.md).
- Added at triage, 2026-09-28, from the second branch's review, because
  story-loom's 212 synthesized documents would hit it:
  [a setext heading's underline becomes the description](../items/synthesized-description-reads-setext-underline.md).
- Added at triage, 2026-09-28, from the owned-releases review, because it is the
  other half of #182 and belongs with the upgrade-case guidance:
  [the migration refuses a tree newer than its pin](../items/migration-refuses-newer-tree.md).
- Added 2026-09-28, with Cole's decision that every scaffold release re-pins the
  newest migration and the scripts set the markers:
  [Step 5 checks the markers rather than writing them](../items/update-skill-step-5-rewrites-markers.md).
- Then a release, and story-loom's own run, following the write-up's sequence.

Out of scope, deliberately: migration changes 6–9 in the write-up (story-loom
handles those cases by hand in minutes), and any story-loom work beyond the
migration.

## Outcome

Story-loom migrated 8.0.0 → 9.2.0 on plugin project-docs 4.2.0 with no fix from
upstream: 131 moves and 454 respelled links in a 1,100-file change, its canon
and Slidev decks untouched, and its output passing its own Prettier check (231
files failed at the start of the cycle). Phase 10 suggested fixes for 201 of its
235 old archive breaks, every one checked against its history; the other 30 were
story-loom's own renames and placeholders. Its branch was not yet merged at
close, and Cole closed the cycle anyway: anything its finalization turns up is
triaged into a later cycle.

Sixteen items shipped in eight branches, released as scaffold 9.2.0 and plugin
4.2.0. They grew from the five the readiness trial called for: each review found
more, and #182 and #154 added their own. Beyond story-loom's needs, every
project now gets:

- an `update-project-docs` that names its upgrade case before acting;
- migrations that refuse to set a tree back to an older release;
- version markers set by the scripts, not the skill;
- a pointer to the CLI;
- the `NO OUTCOME` lint.

Learned:

- **Every fix generalises.** Mid-cycle, Cole made it a rule that story-loom is
  evidence and a real-data check, never the design target. Adopter-facing text
  naming story-loom was reworded.
- **The pin always trails the template.** A plugin can pin only a scaffold tag
  that exists. So every release re-pins the newest migration after the scaffold
  release, and release-please now skips plugin-only commits, so the re-pin cuts
  no empty scaffold release.
- **Reviews that ran the code found what reading could not.** They reproduced a
  data-loss bug already on develop (frontmatter written into excluded files), a
  table re-pad that turned a table into a paragraph, and two dead ends that
  would have stranded Spellbook's real tree. Each was fixed before landing.
- **Branches that shared one script were batched.** Five small fixes went on one
  branch with one review, and it worked.

Cut or deferred to backlog: the lasting owned-file fix (a hash recorded at
install), cycles in `_archive/`, the skill-scope and plugin-extraction research,
and the smaller follow-ups each review filed. Story-loom's debrief added five
triage items: an explicit report owner, `--respell` flagging code, clearer
preflight messages, titles from the H1, and where a process report goes.

## Sessions

- fix/migration-frontmatter-prettier-shape (landed 2026-09-28)
- fix/migration-respells-formatter-ignores (landed 2026-09-28)
- fix/migration-retypes-positional-artifacts (landed 2026-09-28)
- fix/phase-10-root-relative-and-archived-links (landed 2026-09-28)
- fix/migration-polish-round (landed 2026-09-28)
- fix/migration-recognises-9x-releases (landed 2026-09-28)
- fix/upgrade-case-cli-pointer-outcome-lint (landed 2026-09-29)
- chore/repin-9.2.0-plugin-4.2.0 (landed 2026-09-29)
