---
type: item
title: Migration wording that predates refreshes
description:
  The v3.0 preflight's success line says v2.10 tree when refreshing a 9.x tree,
  and this repository's root AGENTS.md still says its docs use the pre-9.0.0
  folders.
status: draft
lifecycle: triage
id: 01a0ec63-5e7c-7509-86b7-ecc5a512aa5b
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-29 }
scope: migrations
from: items/document-patch-refresh-of-a-v3-tree/sessions/2026-09-29-upgrade-cases-and-pointers.md
---

# Migration wording that predates refreshes

Two lines still describe the world before a v3.0 tree could be refreshed:

- The v3.0 migration's preflight success line says "v2.10 tree at …" even when
  it is refreshing a 9.x tree.
- This repository's root `AGENTS.md` still says its `docs/` uses the pre-9.0.0
  folders, which is no longer true.

## Definition of done

- [ ] The preflight line names the tree's actual state, and the root `AGENTS.md`
      describes the current layout.
