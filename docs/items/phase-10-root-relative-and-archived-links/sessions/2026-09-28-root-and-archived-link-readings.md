---
type: session
title: Root and archived link readings — 2026-09-28
description:
  Phase 10 now reads a broken link from the project root and as archived since,
  suggesting a fix only when exactly one reading lands on a file inside the
  project.
tags: [migrations, links]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-28 }
---

# Root and archived link readings — 2026-09-28

Part of
[Story-loom migration](../../../cycles/_archive/2026-09-story-loom-migration.md).

## Context

Row 2 of the story-loom readiness write-up. Phase 10 suggested fixes for 93 of
story-loom's 235 old archive breaks, all of the "one level short" kind. Links
written from the project root, and links whose target was archived after they
were written, got nothing.

## What Happened

`suggestLinkFixes` reads a broken link several ways, each an old-layout path
mapped through the move record, and counts a reading only when it lands on a
file that exists inside the project root. In order: moved (exact, and wins
outright), one level short, from the project root (for a link that starts with
the docs root's name), then each of those with `_archive/` inserted after the
retired category folder. Readings that land on different files give no
suggestion and an "Ambiguous" block. Each suggestion names the reading that
found it, is spelled relative to the linking file's new place, and keeps its
anchor.

Cole asked mid-branch that every fix in this cycle generalise, with story-loom
as evidence and a real-data check, never the design target. The readings come
only from the retired folders, the `_archive/` convention, the docs root's name
and the move record. There's no special case for `DEV_KICKOFF.md` or for
story-loom's own renames, and fixtures use generic names. The same pass found
adopter-facing text in the v2.9 → v2.10 migration that named story-loom, and
reworded it.

## Review

Census: the roster was read from this session's Agent tool listing.
`general-purpose` (all tools, shell access) was the review of record, briefed
with the generality requirement. `feature-dev:code-reviewer` was rejected on
capability (`BashOutput` and `KillShell`, no `Bash`).

On a fresh story-loom clone the review ran develop's script and this branch's:
93 suggestions became 201, with develop's 93 unchanged. It checked all 108 new
ones against git history, finding the commit that added each link and resolving
it as written then: 90 title matches, 5 same-path matches whose title changed
later, and 13 checked by hand. None landed on a wrong file, including across
live and archived twins. A full migration with `docsRoot: "documentation"`
suggested root readings correctly. It ran `npm run typecheck` and the full gate
(1911 pass). Verdict: **Ready to merge: Yes**, with one real gap: no containment
check, so with a nested docs root a climbing reading could land on a file
outside the repository.

Cole approved fixing it here, with "project root" wording in the guide, a pinned
non-default docs root test, and the generic reword. They were checked in the
coordinating session: the guard applies to every reading, "moved" included, and
its test failed before it. The gate passed with 1915 tests.

## Changes Made

- `migrate-v2.10-to-v3.0.ts`: `suggestLinkFixes` and `archivedReading`, the
  containment guard, the Ambiguous block and per-reading labels.
- `migrate-v2.10-to-v3.0.test.ts`: every reading, an ambiguous twin, a dangling
  link, containment, and a non-default docs root, each suggestion followed to
  its file.
- `migrate-v2.9-to-v2.10.ts` and `v2.9-to-v2.10.md`: adopter-facing text no
  longer names story-loom.
- `v2.10-to-v3.0.md`: phase 10's readings, their order, and the ambiguity rule.

## Follow-up

- [Phase 10 readings it does not try](../../phase-10-reading-gaps.md), in
  `backlog`.

---

**Related Documents:**

- [Phase 10 suggests root-relative and since-archived link readings](../item.md)
