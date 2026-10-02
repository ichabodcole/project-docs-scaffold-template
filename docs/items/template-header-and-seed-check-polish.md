---
type: item
title: Template header and seed check polish
description:
  "Optional leftovers from the template-header review: a span-stop test, a
  header after a stray backtick, and clearer check-mirror output for a stale or
  missing seed entry."
status: draft
lifecycle: triage
id: 01a0fc3d-997f-72e2-ac17-93cfbdc61987
kind: chore
generated: { by: claude-opus-5-5, at: 2026-10-02 }
from: items/template-header-left-in-documents/sessions/2026-10-02-template-header-warning.md
---

# Template header and seed check polish

The
[template-header review](./template-header-left-in-documents/sessions/2026-10-02-template-header-warning.md)
passed with four optional leftovers. None changes a verdict on a normal tree.

- **Inline spans may cross a blank line under mutation, and no test fails.**
  `blankCode` stops a span at a blank line, but no test pins it. A stray
  backtick earlier in a document could then pair with one inside a real header
  and hide it.
- **A stray unclosed backtick directly above a header, with no blank line, hides
  the header.** In CommonMark, `<!--` at the start of a line opens an HTML block
  and ends the paragraph, so this is a real header. Stopping the span scan at a
  line that starts with `<!--` would fix it.
- **The stale-seed refresh hint cannot clear a missing file.**
  `scripts/check-mirror.sh` prints a one-liner that skips entries whose file is
  gone (`if (h)`), so `(recorded, but not on disk)` stays failed. The hint
  should say to delete the entry, or the one-liner should drop missing keys.
- **The mirror footer prints after a stale-seed-only failure.** Its "payload is
  the source of truth… copy the settled version across" text does not apply
  there. Word it per failure kind, or suppress it.

## Definition of done

- [ ] A test pins that an inline span stops at a blank line ("stray backtick,
      blank line, header" is reported), and its mutation fails.
- [ ] A header directly after a line with a stray backtick is reported, with a
      test.
- [ ] `check:mirror` tells the user how to clear a seed entry whose file is
      missing, and prints only the guidance that applies to the failures it
      found.
