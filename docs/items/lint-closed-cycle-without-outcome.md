---
type: item
title: The lint passes a closed cycle whose Outcome is unwritten
description:
  A cycle set closed or abandoned with the template's Outcome placeholder still
  in place passes pdocs check, so the terminal record is still unchecked.
status: draft
lifecycle: ready
id: 01a0e770-e0e7-7171-8a32-52d67fed126b
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: pdocs
source: "#154"
priority: medium
cycle: 2026-09-story-loom-migration
---

# The lint passes a closed cycle whose Outcome is unwritten

Issue #154 asked for "a terminal artifact that anything checks for". v9 gave
work a record: a cycle closes with an `## Outcome`, and an item owns its
sessions. But nothing checks the Outcome. A cycle set to
`lifecycle: closed --closed <date>` with the template's
`_Written at close, not before — …_` line still under `## Outcome` passes
`pdocs check`. That was checked on 2026-09-28 in a throwaway worktree: the only
problems reported were the untouched `tags` and `appetite`.

## Definition of done

- [ ] `pdocs check` reports a `closed` or `abandoned` cycle whose `## Outcome`
      is missing or is still the template's placeholder. It does not report a
      `planned` or `active` cycle for this.
