---
type: item
title: The migration writes frontmatter in Prettier's shape
description:
  Frontmatter the v3.0 migration synthesizes has no blank line after the closing
  --- and unwrapped long descriptions, so a Prettier-checking hook refuses 218
  of story-loom's migrated files.
status: draft
lifecycle: done
id: 01a0e55c-f5f1-760b-8fcb-37c528de22cc
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations, story-loom]
cycle: 2026-09-story-loom-migration
priority: high
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

# The migration writes frontmatter in Prettier's shape

Row 1 of
[the story-loom readiness write-up](../story-loom-migration-readiness/write-up.md).
After v2.10-to-v3.0, 231 of story-loom's `.md` files fail its `prettier --check`
hook against 0 before. 207 have no blank line after the frontmatter the run
wrote, and 11 more also need a long `description` wrapped. Every consumer with a
Prettier hook hits this.

## Definition of done

- [x] Frontmatter the migration writes or rewrites is what Prettier produces
      (blank line after the closing `---`; long values wrapped as Prettier wraps
      them), with a test that runs Prettier over a migrated fixture and finds
      nothing to change.

## Related Documents

- [What story-loom's v3.0 migration will ask for](../story-loom-migration-readiness/write-up.md)
