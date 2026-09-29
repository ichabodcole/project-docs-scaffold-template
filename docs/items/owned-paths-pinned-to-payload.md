---
type: item
title: Pin the migration's owned paths to what the scaffold ships
description:
  OWNED_PATHS is hand-listed, so a release that adds an owned category README is
  neither refreshed nor compared and the pin test still passes; pre-release tags
  also compare as NaN.
status: draft
lifecycle: triage
id: 01a0ebb2-2e02-7105-bc97-f7b512957633
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-recognises-9x-releases/sessions/2026-09-28-owned-releases-up-to-the-pin.md
---

# Pin the migration's owned paths to what the scaffold ships

`OWNED_PATHS` in the v3.0 migration is hand-listed from the owned root pages,
category READMEs and retired READMEs, and the pin test derives release keys only
for those paths. A release that adds an owned file (a new library category's
README) would be neither refreshed nor compared, and the test would still pass.
Separately, the test's version comparison reads a pre-release tag (`9.0.0-rc.1`)
as `NaN`. No such tag exists today.

## Definition of done

- [ ] The test asserts `OWNED_PATHS` covers the owned files the payload ships at
      `SCAFFOLD_TAG`, and compares pre-release tags correctly or rejects them.
