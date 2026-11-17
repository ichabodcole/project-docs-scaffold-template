---
type: item
title: Decode and lowercase a link's anchor before checking it
description:
  The anchor in a link is compared raw, so a percent-encoded or upper-case
  anchor GitHub resolves is reported as MISSING ANCHOR.
status: draft
lifecycle: triage
id: 01a1eb3b-d87e-748b-b95e-d8f01612c7c2
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-17 }
from: items/heading-anchors-match-github/sessions/2026-11-17-heading-anchors.md
---

# Decode and lowercase a link's anchor before checking it

The link check compares a link's anchor with the heading slugs as written. Now
that slugs keep non-ASCII letters, two forms GitHub resolves are reported as
`MISSING ANCHOR`:

- **Percent-encoded:** `#caf%C3%A9-notes` for the heading "Café notes".
- **Upper case:** GitHub's documentation writes an anchor ending `-Θ`; the slug
  is lowercased.

## Definition of done

- [ ] A percent-encoded anchor and an upper-case anchor that GitHub resolves
      both pass, each with a test.
- [ ] An anchor that does not decode is reported, not thrown on.

## Related Documents

- [Heading anchors that match GitHub — 2026-11-17](./heading-anchors-match-github/sessions/2026-11-17-heading-anchors.md)
