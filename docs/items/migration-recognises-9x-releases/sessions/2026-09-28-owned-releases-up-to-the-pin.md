---
type: session
title: Owned releases up to the pin — 2026-09-28
description:
  The v3.0 migration recognises an owned file from every scaffold release up to
  the one it installs, so a 9.0.0 tree is not told it holds edits, and a stale
  re-pin fails the test.
tags: [migrations]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-28 }
---

# Owned releases up to the pin — 2026-09-28

Part of
[Story-loom migration](../../../cycles/_archive/2026-09-story-loom-migration.md).

## Context

Issue #182's first finding. Spellbook re-ran the v3.0 migration on a tree the
same script had put on 9.0.0, and it called an unedited 9.0.0 `SCHEMA.md` "edits
of yours". The list of known owned-file releases held only releases before
9.0.0, and `SCHEMA.md` changed in 9.0.1.

## What Happened

Cole's decision: widen the list to every release up to the pinned one, and make
a re-pin that forgets to regenerate it fail a test. `OWNED_BEFORE_9` became
`OWNED_RELEASES`, and a new `OWNED_PATHS` lists the files it covers. The pin
test selects tags up to `SCAFFOLD_RELEASE` by numeric comparison, requires the
pinned tag, and derives each file's `proseKey` set from the tags. The owned
`features/README.md` and `items/README.md` gained rows, so a customised one is
now named before the refresh replaces it, where it was silently replaced before.
A named edit never stops the run.

## Review

Census: the roster was read from this session's Agent tool listing.
`general-purpose` (all tools, shell access) was the review of record;
`feature-dev:code-reviewer` was rejected on capability (`BashOutput` and
`KillShell`, no `Bash`).

The review generated projects from local tags v9.0.0, v9.0.1 and v9.1.0 with
cookiecutter. Develop's script reproduced Spellbook's false positive on the
9.0.0 tree; this branch showed none on any of the three, and a genuine edit to
either new README was still named and recoverable. In a separate clone it
committed new owned prose, tagged it 9.2.0 and re-pinned: the test failed, as it
should. Semver checks passed (`9.10.0` after `9.9.0`). It ran typecheck, the
test file (226 pass) and the full gate (1945 pass). Verdict: **Ready to merge:
Yes**.

It also found that a tree newer than the pin is downgraded: run directly on a
9.1.0 tree, the migration sets every version marker back to 9.0.1. Develop does
the same, and it is the other half of Spellbook's report.

## Follow-up

Filed from this session, in `triage`:

- [The v3.0 migration downgrades a tree newer than its pin](../../migration-refuses-newer-tree.md)
- [Pin the migration's owned paths to what the scaffold ships](../../owned-paths-pinned-to-payload.md)

---

**Related Documents:**

- [The v3.0 migration calls a 9.0.0 owned file an edit](../item.md)
