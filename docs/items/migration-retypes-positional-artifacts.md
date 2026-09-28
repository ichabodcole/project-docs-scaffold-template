---
type: item
title: The migration retypes documents whose new position says artifact
description:
  A document with frontmatter at a position 9.x types as artifact (nested
  workstream plan.md, sessions/) keeps its old type and lifecycle, giving
  story-loom 28 lint problems.
status: draft
lifecycle: ready
id: 01a0e55c-f685-754d-aff8-e46ce2ee478e
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

# The migration retypes documents whose new position says artifact

Row 3 of
[the story-loom readiness write-up](./story-loom-migration-readiness/write-up.md).
story-loom's `projects/storyline-engine/workstreams/*/plan.md` (9 plans) and a
nested session keep `type: plan`/`session` and a `lifecycle`, but 9.x types them
by position as `artifact`: 28 problems (`WRONG TYPE`, `LIFECYCLE`,
`UNKNOWN FIELD`). The run already retypes briefs and reports this way.

## Definition of done

- [ ] A document with frontmatter whose new position 9.x types as `artifact` is
      retyped (`type: artifact`, `lifecycle` removed) and named in the plan,
      with a test on a nested `plan.md` and `sessions/` file.

## Related Documents

- [What story-loom's v3.0 migration will ask for](./story-loom-migration-readiness/write-up.md)
