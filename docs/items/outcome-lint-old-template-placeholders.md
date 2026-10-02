---
type: item
title: The Outcome lint misses a placeholder from an older cycle template
description:
  NO OUTCOME matches only the project's current cycle template placeholder, so a
  closed cycle created from an older template, with its placeholder still in
  place, passes.
status: stable
lifecycle: done
id: 01a0ec94-2723-71b3-8c47-74fd0b197420
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-29 }
scope: pdocs
from: items/repin-v3-migration-to-9.2.0/sessions/2026-09-29-repin-to-9.2.0.md
cycle: 2026-10-pdocs-views
---

# The Outcome lint misses a placeholder from an older cycle template

`pdocs check`'s `NO OUTCOME` reads the placeholder from the project's current
cycle template. A migration updates that template, so a cycle created from the
older one keeps the older placeholder, and closing it without writing an Outcome
passes. The release review saw it on a migrated story-loom clone: its
Hollowbrook cycle holds `_Written at close, not before._`, the 9.2.0 template
says `_Written at close, not before — and for an abandoned cycle too._`, and a
closed Hollowbrook with no Outcome was not reported.

## Definition of done

- [x] A closed or abandoned cycle whose Outcome is only a placeholder from any
      released cycle template (or a lone `_Written at close…_` line) is
      reported, with a test.
