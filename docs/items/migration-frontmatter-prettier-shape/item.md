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
