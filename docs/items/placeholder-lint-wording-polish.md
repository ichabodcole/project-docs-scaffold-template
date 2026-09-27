---
type: item
title: Placeholder-lint wording polish
description:
  The PLACEHOLDER message calls a lone real feature tag on an item 'the
  template's prompt', and the pdocs reference's --title row attaches 'mangles
  acronyms' to the H1 clause.
status: draft
lifecycle: triage
id: 01a0e03f-d272-73dc-886a-8f28317aef00
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-26 }
tags: [pdocs, lint]
scope: pdocs
from: items/wocky-talky-feedback-round-1/sessions/2026-09-26-pdocs-output-and-placeholder-lint.md
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

# Placeholder-lint wording polish

Two wording issues from the re-review of
`fix/pdocs-output-and-placeholder-lint`. The `PLACEHOLDER` message for tags says
"is still the template's prompt", which is wrong for an item: its template has
no `tags:`, and a lone real `feature` tag is flagged. And in
`plugins/project-docs/skills/create-project/references/pdocs.md`, the `--title`
row's "which mangles acronyms" now hangs off the H1 clause instead of the slug
default it describes.

## Definition of done

- [ ] The tags message says the tags are only placeholder words (`area`,
      `feature`), not that they are the template's.
- [ ] The `--title` row attaches the acronym note to the slug default.

## Related Documents

- [pdocs output and the placeholder lint — 2026-09-26](./wocky-talky-feedback-round-1/sessions/2026-09-26-pdocs-output-and-placeholder-lint.md)
