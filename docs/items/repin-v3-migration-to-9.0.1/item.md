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
