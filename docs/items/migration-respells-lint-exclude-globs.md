---
type: item
title: The migration respells retired globs in lint.exclude
description:
  A docs/projects/* glob in lint.exclude is left as written, so 16 problems
  surface and a hand fix stops the re-run on .project-docs.json.
status: draft
lifecycle: done
id: 01a0e55c-f6d0-728d-98fa-0c7251d4a587
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations, story-loom]
cycle: 2026-09-story-loom-migration
priority: medium
scope: migrations
from: items/story-loom-migration-readiness/write-up.md
---

# The migration respells retired globs in lint.exclude

Row 4 of
[the story-loom readiness write-up](./story-loom-migration-readiness/write-up.md).
story-loom's `lint.exclude` names its Slidev decks under `docs/projects/*/…`.
The run leaves the glob as written, so 16 problems surface, and fixing it by
hand after the stop makes the re-run refuse `.project-docs.json` (the trial
needed `--force`).

## Definition of done

- [x] A `projects/*/…` glob in `lint.exclude` is respelled to the matching
      `features/*/…` and `items/*/…` globs during the run, with a test.

## Related Documents

- [What story-loom's v3.0 migration will ask for](./story-loom-migration-readiness/write-up.md)

Landed with four other migration fixes; the record is
[the migration polish round session](./link-respell-misaligns-tables/sessions/2026-09-28-migration-polish-round.md).
