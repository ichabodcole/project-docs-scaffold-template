---
type: item
title: Re-pin v2.10-to-v3.0 to scaffold 9.0.1
description:
  Story-loom migrates next; under D16 the migration installs the v9.0.0 tag's
  cycle template and features README, so it must be re-pinned to the 9.0.1
  release that carries the new text before plugin 4.1.0 ships.
status: draft
lifecycle: done
id: 01a0e3c5-8a6f-7473-bfe9-23838f87f9cd
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations, release]
cycle: 2026-09-v9-rollout-feedback
priority: high
scope: migrations
from: items/spellbook-feedback-round-2/sessions/2026-09-27-v3-migration-spellbook-round-2.md
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

# Re-pin v2.10-to-v3.0 to scaffold 9.0.1

Spellbook round 2 changed the cycle template's Outcome and the features README
(row 8). Under D16, v2.10-to-v3.0 installs the files of the scaffold tag it is
pinned to (`SCAFFOLD_TAG`, v9.0.0), so story-loom, which migrates next, would
get the old text. Both reviewers of that branch and the owner chose to release
scaffold 9.0.1 and re-pin the migration to it: 9.0.1 has the layout the script
was written for, so the pin keeps D16's intent. A new migration for two wording
changes would go against the update-project-docs skill's own rule. Projects
already on 9.0.0 (Spellbook, wocky-talky) get the text by hand or from a later
migration.

## Definition of done

- [x] Scaffold 9.0.1 is released, carrying the new cycle template and features
      README.
- [x] `SCAFFOLD_TAG` names v9.0.1 in `plugins/` and `dist/`; the tests build
      from that tag; a test pins the cookiecutter `--checkout <tag>`.
- [x] The guide's tag, version table and Verification, the script's "replaces it
      with 9.0.0's" wording, and `update-project-docs/SKILL.md` Step 4 name
      9.0.1.
- [ ] Plugin 4.1.0 is released with it, before story-loom migrates.

## Related Documents

- [v3 migration, Spellbook round 2 — 2026-09-27](../spellbook-feedback-round-2/sessions/2026-09-27-v3-migration-spellbook-round-2.md)
