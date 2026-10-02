---
type: item
title:
  update-project-docs Step 5 rewrites version markers the scripts already set
description:
  Step 5 tells the agent to write the new version into the markers after the
  migration scripts have set them, which could write a later tag that has no
  migration.
status: draft
lifecycle: done
id: 01a0e459-08c7-773d-861b-b03f770257f4
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations]
scope: migrations
from: items/repin-v3-migration-to-9.0.1/sessions/2026-09-27-repin-to-9.0.1.md
priority: medium
cycle: 2026-09-story-loom-migration
---

# update-project-docs Step 5 rewrites version markers the scripts already set

Found by the review of the 9.0.1 re-pin. `update-project-docs/SKILL.md` Step 5
tells the agent to write "the new version" into the version markers after the
migration scripts have already set them to the scaffold release they installed.
An agent that reads "new version" as the latest scaffold tag could write a
version that no migration has brought the tree to. The behaviour predates the
re-pin.

## Definition of done

- [x] Step 5 says the scripts set the markers, and tells the agent to check them
      rather than write them.

## Related Documents

- [Re-pin to 9.0.1 and plugin 4.1.0 — 2026-09-27](./repin-v3-migration-to-9.0.1/sessions/2026-09-27-repin-to-9.0.1.md)

Landed with four other items; the record is
[the upgrade cases session](./document-patch-refresh-of-a-v3-tree/sessions/2026-09-29-upgrade-cases-and-pointers.md).
