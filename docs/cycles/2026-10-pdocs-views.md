---
type: cycle
title: pdocs work views and advisories
description:
  A portfolio view, archived cycles, archive and draft-review advisories, cycle
  filename lookup and small pdocs lint fixes.
tags: [pdocs, views, advisories]
status: draft
lifecycle: active
appetite:
  Stop when the nine items land and ship in scaffold 9.4.0 with the plugin
  release.
after: [2026-10-migration-test-stability]
generated: { by: claude-opus-5-5, at: 2026-10-01 }
started: 2026-10-01
---

# pdocs work views and advisories

## Why now

This repository's board holds 60 finished items beside 50 open ones, and seven
closed cycles sit in `docs/cycles/` with none active. There is no single view of
what is in flight. 37 finished items are still `status: draft`, because nothing
asks for review when work starts. And 23 documents still carry a template's
header comment. These items share code: views, `pdocs check` advisories, the
`checks` config section and `pdocs new`. Building them together keeps one shape
for advisories and one archive rule across items, features and cycles.

## Scope

- **[item/pdocs-cycle-filename-lookup](../items/pdocs-cycle-filename-lookup.md)**
  — `view cycle` accepts the filename with or without `.md`.
- **[item/archive-closed-cycles](../items/archive-closed-cycles/item.md)** —
  closed cycles can move to `cycles/_archive/`, and live views hide them by
  default.
- **[item/pdocs-board-archive-advisory](../items/pdocs-board-archive-advisory/item.md)**
  — one `checks.archive.threshold` prompts archiving of finished items, features
  and cycles. After archive-closed-cycles.
- **[item/pdocs-work-portfolio-view](../items/pdocs-work-portfolio-view/item.md)**
  — `view portfolio` shows current cycles and features with counts. Its display
  is iterated on real output with Cole before tests pin it.
- **[item/pdocs-draft-review-advisories](../items/pdocs-draft-review-advisories.md)**
  — warn (or, in `strict`, refuse) when unreviewed work starts. Adds the
  advisory tier to `pdocs check`. After the archive advisory.
- **[item/template-header-left-in-documents](../items/template-header-left-in-documents.md)**
  — `pdocs check` warns on a filled document that keeps its template header, and
  the header says to remove it. After draft-review.
- **[item/outcome-lint-old-template-placeholders](../items/outcome-lint-old-template-placeholders.md)**,
  **[item/catalog-line-wraps-into-a-list](../items/catalog-line-wraps-into-a-list/item.md)**
  and
  **[item/placeholder-lint-wording-polish](../items/placeholder-lint-wording-polish.md)**
  — small lint and `pdocs new` fixes, landed as one batched branch.

The cycle ends in a scaffold minor (9.4.0) with the migration re-pin (playbook
Step 14), then a plugin release.

Out of scope, deliberately: the visual board
([pdocs-board-landscape](../items/pdocs-board-landscape.md)), which should take
the portfolio view as input; linting beyond the docs root and user-defined
types, each its own cycle; and the migration bugs, which would make a natural
migrations-polish cycle.

## Outcome

_Written at close, not before — and for an `abandoned` cycle too._

## Sessions

<!-- One line per branch, appended by init-branch: `- <type>/<slug> (open)`. -->

- feature/archive-closed-cycles (landed 2026-10-01)
- fix/pdocs-small-fixes (landed 2026-10-01)
- feature/pdocs-board-archive-advisory (landed 2026-10-01)
- feature/pdocs-work-portfolio-view (landed 2026-10-02)
- feature/pdocs-cycle-filename-lookup (open)
