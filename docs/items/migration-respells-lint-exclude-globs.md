---
type: item
title: The migration respells retired globs in lint.exclude
description:
  A docs/projects/* glob in lint.exclude is left as written, so 16 problems
  surface and a hand fix stops the re-run on .project-docs.json.
status: draft
lifecycle: done
id: 01a0e55c-f6d0-728d-98fa-0c7251d4a587
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations, story-loom]
cycle: 2026-09-story-loom-migration
priority: medium
scope: migrations
from: items/story-loom-migration-readiness/write-up.md
---

<!--
OWNERSHIP (of this template file — not of documents created from it): it is
yours to edit. The scaffold records its hash, so a migration updates it only
while you have not touched it. Frontmatter is the contract the lint enforces;
below it is yours. See docs/SCHEMA.md → "Who owns which file".

USAGE: `bun scripts/pdocs/cli.ts new item <slug> --kind <kind>` writes
docs/items/<slug>.md from this file, with a fresh `id` and `lifecycle: triage`.
Pass `--title`, `--description` and `--by`, and what you know as flags:
`--parent feature/<slug>`, `--blocked-by <ref,ref>`, `--from <path or ref>`.
Do not copy this file by hand: the `id` must be a fresh UUID, and the CLI
checks every reference before it writes.

WHO WRITES EACH FIELD. Add an optional field only when it applies. After
creation, change a field with `pdocs set <ref> --<field> <value>`; it refuses a
value the lint would reject.

  title, description, kind   whoever files the item
  id                         `pdocs new item`, once
  status                     OKF's document-trust marker. It keeps this
                             value; no workflow step moves it
  lifecycle                  `triage` when an agent files it. The user decides
                             at triage (the triage-items skill proposes):
                             `backlog`, `ready`, or `dropped`. Shaping sets
                             `ready`; init-branch sets `active`;
                             finalize-branch sets `review` when its review
                             starts and `done` when it lands. An agent
                             never moves an item out of `triage` itself.

  Optional:
  parent: feature/<slug>     whoever files it, or triage
  scope: <name>              whoever files it; one name from `lint.scopes`
  from: <what spawned it>    whoever files it: an item id, `feature/<slug>`,
                             `cycle/<slug>`, or a docs-root-relative path.
                             A review always writes it.
  source: <external id>      intake from outside the tree: an issue number
  priority: urgent | high | medium | low       triage
  assignee: <agent, seat or name>              triage, when it is routed
  blocked_by: [<item id>, ...]                 shaping
  cycle: <cycle file slug, e.g. 2026-09-auth>  init-branch, when one is active
  released_in: <version>     sweep-project, at release. Never checked.

docs/items/README.md has the states, the kinds and the rules.
-->

# The migration respells retired globs in lint.exclude

Row 4 of
[the story-loom readiness write-up](./story-loom-migration-readiness/write-up.md).
story-loom's `lint.exclude` names its Slidev decks under `docs/projects/*/…`.
The run leaves the glob as written, so 16 problems surface, and fixing it by
hand after the stop makes the re-run refuse `.project-docs.json` (the trial
needed `--force`).

## Definition of done

- [x] A `projects/*/…` glob in `lint.exclude` is respelled to the matching
      `features/*/…` and `items/*/…` globs during the run, with a test.

## Related Documents

- [What story-loom's v3.0 migration will ask for](./story-loom-migration-readiness/write-up.md)

Landed with four other migration fixes; the record is
[the migration polish round session](./link-respell-misaligns-tables/sessions/2026-09-28-migration-polish-round.md).
