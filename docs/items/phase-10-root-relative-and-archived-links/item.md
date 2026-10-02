---
type: item
title: Phase 10 suggests root-relative and since-archived link readings
description:
  For a MISSING FILE, phase 10 also tries the link read from the repository root
  and with _archive/ inserted, covering 108 more of story-loom's 235 old archive
  breaks.
status: draft
lifecycle: done
id: 01a0e55c-f63b-712a-abaf-2f9d693238eb
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations, story-loom]
cycle: 2026-09-story-loom-migration
priority: high
scope: migrations
from: items/story-loom-migration-readiness/write-up.md
---

# Phase 10 suggests root-relative and since-archived link readings

Row 2 of
[the story-loom readiness write-up](../story-loom-migration-readiness/write-up.md).
Phase 10's suggestions cover 93 of story-loom's 235 old archive breaks. 85 more
are links written from the repository root (in `DEV_KICKOFF.md` files), and 32
point at a target archived after the link was written. Reading each through the
move record would suggest 108 more.

## Definition of done

- [x] For a `MISSING FILE`, phase 10 also tries the link read from the
      repository root and with `_archive/` inserted after the retired folder,
      and suggests the result only when the file exists, with tests for both
      readings.

## Related Documents

- [What story-loom's v3.0 migration will ask for](../story-loom-migration-readiness/write-up.md)
