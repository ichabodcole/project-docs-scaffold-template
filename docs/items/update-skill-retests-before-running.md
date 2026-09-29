---
type: item
title: update-project-docs re-tests each migration just before running it
description:
  Step 3 lists the migrations that apply once, up front, and Step 4 runs the
  list, so a row an earlier script made unnecessary still runs.
status: draft
lifecycle: triage
id: 01a0ec63-5e2e-735c-bd37-2a5a5d1446d4
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-29 }
scope: migrations
from: items/document-patch-refresh-of-a-v3-tree/sessions/2026-09-29-upgrade-cases-and-pointers.md
---

# update-project-docs re-tests each migration just before running it

`update-project-docs` Step 3 tests every migration row's `Applies If` once and
lists the ones that apply, and Step 4 runs that list in order. A script can make
a later row unnecessary. On a 6.3.0 tree, `migrate-v2.6-to-v2.7.ts` installs the
8.1.0 layer, so `v2.9-to-v2.10` no longer applies, but it stayed in the list and
ran. It changed nothing, but Step 3 itself warns that a re-run isn't always
harmless.

## Definition of done

- [ ] Step 4 re-tests a row's `Applies If` just before running it and skips it,
      saying so, when it no longer applies.
