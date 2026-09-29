---
type: item
title: Retyping to a type other than artifact drops only lifecycle
description:
  When the migration retypes a document to report, write-up or another
  non-artifact type, it removes lifecycle but keeps other keys that type does
  not allow.
status: draft
lifecycle: triage
id: 01a0eacd-1ab8-744f-9bcb-1e8eb0cbc062
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-retypes-positional-artifacts/sessions/2026-09-28-positional-retype.md
---

# Retyping to a type other than artifact drops only lifecycle

The v3.0 migration's positional retype to `artifact` now drops every key an
artifact doesn't allow, pinned to the lint's `allowedFields`. Its other retypes
(to `report`, `write-up` and the like) still remove only `lifecycle`, so a key
the new type doesn't allow survives and the lint reports it as `UNKNOWN FIELD`.

## Definition of done

- [ ] Every retype keeps only the keys `allowedFields` gives the new type, names
      what it dropped, and is tested for at least one non-artifact target.
