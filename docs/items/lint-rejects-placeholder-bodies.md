---
type: item
title: The lint passes a template's placeholder body and H1
description:
  A document still carrying the template's bracketed placeholders passes pdocs
  check.
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: done
id: 01a0da5f-8ab1-7167-abbb-34f661263587
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-25 }
scope: pdocs
cycle: 2026-09-v9-rollout-feedback
priority: high
---

# The lint passes a template's placeholder body and H1

Found in the Phase 4 validation walks. Seen again in the dogfood run: items
created with pdocs new keep "[What is wrong or missing…]" unnoticed.

## Definition of done

- [ ] `pdocs check` reports a document whose H1, `description`, `tags` or dates
      still hold its template's placeholder (a bracketed prompt, `[area, area]`,
      `YYYY-MM-DD`). A fresh `pdocs new cycle` with nothing filled in is the
      failing case wocky-talky hit.
