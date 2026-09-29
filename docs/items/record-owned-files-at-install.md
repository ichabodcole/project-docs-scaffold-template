---
type: item
title: Record each owned file's hash at install
description:
  Migrations judge an owned file edited by comparing it to a hand-derived list
  of past releases; a hash recorded at install, as .pdocs-seed.json does for
  templates, would replace the list for trees installed on 9.x and later.
status: draft
lifecycle: backlog
id: 01a0e94f-68fa-708a-bf9f-873c38da460b
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
---

# Record each owned file's hash at install

A migration decides whether an adopter edited an owned file (`SCHEMA.md`,
`AGENTS.md`, the category READMEs) by comparing it to every release it knows
about. `migrate-v2.10-to-v3.0.ts` holds that list as `OWNED_RELEASES`, which a
test derives from the release tags up to the pinned one. The list has to grow
each time the migration is re-pinned. And a file from a release it doesn't know
is reported as edited, which is
[how #182's false alarm happened](./migration-recognises-9x-releases/item.md).

Templates don't have this problem: the scaffold writes `docs/.pdocs-seed.json`
with a hash of each seeded file it installed, and a migration compares against
that. Owned files could get the same record. Then "edited" means "differs from
what was installed here", and the release list freezes at the pre-9 releases,
which have no record.

Touches the post-generation hook, every migration that refreshes owned files
(each must rewrite the record after it does), and the record's format.

## Definition of done

- [ ] A newly generated project records a hash of each owned file it installed.
- [ ] A migration that refreshes owned files reads the record to decide whether
      a file was edited, and writes the new hashes after replacing it.
- [ ] A tree with no record, from before 9.x, still falls back to the release
      list.
