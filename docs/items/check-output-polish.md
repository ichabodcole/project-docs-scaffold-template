---
type: item
title: Polish the remaining check output gaps
description:
  "Optional leftovers from the check dedupe review: repeated MISSING FILE rows,
  a bare SCHEMA.md path, a lost MISSING type hint and an untested workbench
  rule."
status: draft
lifecycle: triage
id: 01a103f7-71d0-75b7-8027-b75de35af593
kind: chore
generated: { by: claude-opus-5-5, at: 2026-10-03 }
from: items/check-dedupes-library-tier-problems/sessions/2026-10-03-check-problems-once.md
---

# Polish the remaining check output gaps

The
[check dedupe review](./check-dedupes-library-tier-problems/sessions/2026-10-03-check-problems-once.md)
passed with four optional leftovers. None changes whether a tree passes.

- **A link written several times in one page is reported once per copy.**
  operator-mono's snapshot had 170 repeated `MISSING FILE` rows. Older than the
  dedupe.
- **`SCHEMA MISSING TYPE` prints a bare `SCHEMA.md`**, the one path not in the
  `docs/…` form. Older than the dedupe.
- **`MISSING type` on a library page lost its hint.** The core's row said
  ``(OKF requires a `type` field)``; the field checks' row has none.
- **No test pins `MISSING generated.by` on a workbench document.** Disabling it
  fails only the library tests.

## Definition of done

- [ ] A broken link written twice in one page is one row, or the row says how
      many times, with a test.
- [ ] Every problem path is in the `docs/…` form.
- [ ] `MISSING type` on a library page carries a hint.
- [ ] A test fails when `MISSING generated.by` stops firing on a workbench
      document.

## Related Documents

- [Check problems reported once — 2026-10-03](./check-dedupes-library-tier-problems/sessions/2026-10-03-check-problems-once.md)
