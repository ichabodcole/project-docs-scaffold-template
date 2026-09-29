---
type: cycle
title: Story-loom migration
description:
  Build the five migration changes the story-loom trial called for, release
  them, and run story-loom's migration to 9.0.1 on that release.
tags: [migrations, story-loom]
status: draft
lifecycle: active
started: 2026-09-27
appetite:
  Until story-loom is on 9.0.1 with a clean check and a commit its hook accepts.
after: []
generated: { by: claude-opus-5-5, at: 2026-09-27 }
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

_Written at close, not before — and for an `abandoned` cycle too._

## Sessions

- fix/migration-frontmatter-prettier-shape (landed 2026-09-28)
- fix/migration-respells-formatter-ignores (landed 2026-09-28)
- fix/migration-retypes-positional-artifacts (landed 2026-09-28)
- fix/phase-10-root-relative-and-archived-links (landed 2026-09-28)
- fix/migration-polish-round (landed 2026-09-28)
- fix/migration-recognises-9x-releases (landed 2026-09-28)
- fix/upgrade-case-cli-pointer-outcome-lint (landed 2026-09-29)
- chore/repin-9.2.0-plugin-4.2.0 (landed 2026-09-29)
