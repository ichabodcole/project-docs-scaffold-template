---
type: item
title: Phase 10 readings it does not try
description:
  Phase 10 gives no suggestion for a link to an _archive/ path whose target was
  later un-archived, a target archived below the category level, or a link with
  a query string or %20 encoding.
status: draft
lifecycle: backlog
id: 01a0eb1d-89e9-76b0-8c56-3f8b45dd2a84
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/phase-10-root-relative-and-archived-links/sessions/2026-09-28-root-and-archived-link-readings.md
priority: low
---

# Phase 10 readings it does not try

Phase 10's link suggestions read a broken link as moved, one level short, from
the project root, and archived since. The review found three cases none of those
reach. Each gets no suggestion, so none is wrong, but each is a miss:

- **Un-archived since:** a link to an `_archive/` path whose target was later
  moved back out of the archive.
- **Archived below the category level:** `archivedReading` inserts `_archive/`
  only directly under a retired category folder. A target archived inside an
  entity's own subfolder isn't found.
- **Encoded or query links:** a link with `?query` or `%20`. The lint doesn't
  decode `%20` either.

## Definition of done

- [ ] Each case either gets a reading, or the guide names it as one phase 10
      leaves to the adopter, with a test.
