---
type: item
title: pdocs set drops the inline comment on a lifecycle line
description:
  Setting lifecycle removes the vocabulary comment the template put on that
  line.
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: dropped
id: 01a0da5f-8a6f-75b8-9937-6437bf2f85ee
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-25 }
scope: pdocs
---

# pdocs set drops the inline comment on a lifecycle line

Found in the Phase 4 validation walks.

Dropped at triage, 2026-09-26: the template's inline frontmatter comments are
retired rather than preserved. `pdocs new` strips them and `set` never writes
them; the vocabulary lives in `SCHEMA.md` and in the refusal `set` prints for an
invalid value. Worked as row 4 of
[wocky-talky feedback, round 1](./wocky-talky-feedback-round-1.md).
