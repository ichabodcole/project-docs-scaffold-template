---
type: item
title: pdocs find JSON carries no slug
description:
  find --format json gives paths and ids but no slug to build an item/<slug>
  reference from.
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: ready
id: 01a0da5f-89e8-70e0-981a-c9792a191145
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-25 }
scope: pdocs
priority: low
cycle: 2026-09-v9-rollout-feedback
---

# pdocs find JSON carries no slug

Found in the Phase 4 validation walks.

## Definition of done

- [ ] Each record in `pdocs find --format json` carries the document's `slug`,
      beside its `path`.
