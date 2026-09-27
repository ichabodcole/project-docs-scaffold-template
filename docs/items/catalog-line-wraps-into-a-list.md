---
type: item
title: The catalog line can wrap into a nested list
description:
  When a library page's description contains ' - ', ' + ' or '1. ', pdocs new
  can start a continuation line with it, and Prettier then reads a nested list
  and rewrites the entry.
status: draft
lifecycle: triage
id: 01a0e03f-d229-74d5-a5ba-1a68fde61ec7
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-26 }
tags: [pdocs, prettier]
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

# The catalog line can wrap into a nested list

`catalogEntry` in `scripts/pdocs/commands/new.ts` wraps a library page's catalog
line greedily at 80 columns. When the description contains `-`, `+` or `1. `, a
continuation line can start with it, and Prettier then reads a nested list and
rewrites the entry, changing its meaning. Found by the review of
`fix/pdocs-output-and-placeholder-lint`, which fuzzed `catalogEntry` against
Prettier. It predates that branch, and is rare in real descriptions.

## Definition of done

- [ ] A catalog line whose description contains `-`, `+` or `1. ` at a wrap
      point is left unchanged by `prettier --check`, with a test.

## Related Documents

- [pdocs output and the placeholder lint — 2026-09-26](./wocky-talky-feedback-round-1/sessions/2026-09-26-pdocs-output-and-placeholder-lint.md)
