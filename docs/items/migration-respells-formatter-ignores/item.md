---
type: item
title: The migration respells retired paths in formatter ignore files
description:
  A .prettierignore (or Biome/ESLint ignore) naming docs/projects/... stops
  protecting files after the move, so the guide's format step would corrupt
  story-loom's 11 byte-exact canon files.
status: draft
lifecycle: done
id: 01a0e55c-f71b-768b-aa9b-d346ca2cc83d
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations, story-loom]
cycle: 2026-09-story-loom-migration
priority: high
scope: migrations
from: items/story-loom-migration-readiness/write-up.md
---

# The migration respells retired paths in formatter ignore files

Row 5 of
[the story-loom readiness write-up](../story-loom-migration-readiness/write-up.md).
story-loom's `.prettierignore` protects 11 byte-exact checkpoint canon files
under `docs/projects/…/canon/`. After the move, the old path no longer matches,
and the guide's "run `prettier --write docs/`" step would reformat them: a
data-loss risk.

## Definition of done

- [x] The run respells retired paths in `.prettierignore` (and Biome and ESLint
      ignore globs, where present) as it does `lint.exclude`, and names each
      change, with a test that a file ignored before the run is ignored after
      it.

## Related Documents

- [What story-loom's v3.0 migration will ask for](../story-loom-migration-readiness/write-up.md)
