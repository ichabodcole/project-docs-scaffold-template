---
type: item
title: Re-pin the v3.0 migration to 9.4.0 and release plugin 4.4.0
description:
  Scaffold 9.4.0 is released; the v3.0 migration still installs 9.2.0 (9.3.0 was
  never pinned), so re-pin it per the migrations playbook Step 14 and release
  plugin project-docs 4.4.0 with what changed since 4.3.0.
status: stable
lifecycle: active
id: 01a0fdd1-38b1-7031-8c3b-dbff014bed1b
kind: chore
generated: { by: claude-opus-5-5, at: 2026-10-02 }
---

# Re-pin the v3.0 migration to 9.4.0 and release plugin 4.4.0

Scaffold 9.4.0 shipped the
[pdocs views cycle](../cycles/_archive/2026-10-pdocs-views.md) and the
[cold-read workflow fixes](./cold-read-workflow-fixes/item.md). The newest
migration, v2.10 to v3.0, still installs 9.2.0: 9.3.0 was released without a
re-pin. Until it is re-pinned, no adopter can reach 9.4.0.

## Definition of done

- [ ] Every place
      [the migrations playbook](../playbooks/writing-migrations-playbook.md)
      Step 14 names now names 9.4.0, and nothing else in the migration changes:
      the script, its test, its guide and the `update-project-docs` table.
- [ ] `OWNED_RELEASES` is regenerated from the tags, and the whole suite passes.
- [ ] Plugin `project-docs` is 4.4.0, with a version-history entry covering
      everything since 4.3.0. `dist/` is rebuilt, and the Codex plugin carries
      the same version.
- [ ] It lands without proposing another scaffold release.
