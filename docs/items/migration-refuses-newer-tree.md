---
type: item
title: The v3.0 migration downgrades a tree newer than its pin
description:
  Run directly on a tree already past the scaffold release it installs (a 9.1.0
  tree, pinned to 9.0.1), the migration completes and sets every version marker
  back to the older release.
status: draft
lifecycle: done
id: 01a0ebb2-2db2-75e7-9a03-df92ef33e603
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-recognises-9x-releases/sessions/2026-09-28-owned-releases-up-to-the-pin.md
priority: high
cycle: 2026-09-story-loom-migration
---

# The v3.0 migration downgrades a tree newer than its pin

`migrate-v2.10-to-v3.0.ts` installs the scaffold at `SCAFFOLD_TAG` (9.0.1). The
guide's Applies-If keeps a 9.x tree away from it, but nothing stops a direct
run. On a generated 9.1.0 tree it completes, and sets `docs_version`,
`.project-docs.json`, `.pdocs-seed.json` and the CLI's `VERSION` back to 9.0.1.
Spellbook did exactly this when refreshing to 9.1.0 (issue #182), and set the
markers back by hand. The review of the owned-releases branch reproduced it on
develop.

## Definition of done

- [x] The preflight stops when the tree's version is later than the release the
      migration installs, says why, and names what to run instead. A tree at or
      below the pin still runs. Tested.

Landed with four other items; the record is
[the upgrade cases session](./document-patch-refresh-of-a-v3-tree/sessions/2026-09-29-upgrade-cases-and-pointers.md).
