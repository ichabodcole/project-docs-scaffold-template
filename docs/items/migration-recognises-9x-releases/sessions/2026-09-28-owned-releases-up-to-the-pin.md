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

<!--
OWNERSHIP (of this template file — not of documents created from it): it is
yours to edit. The scaffold records its hash, so a migration updates it only
while you have not touched it. Frontmatter is the contract the lint enforces;
below it is yours. See docs/SCHEMA.md → "Who owns which file".

USAGE: `bun scripts/pdocs/cli.ts new session <topic> --owner feature/<slug>` (or
`item/<slug>`) writes this as sessions/YYYY-MM-DD-<topic>.md in the owner's
folder, dated today, and links the owner.

This is your dev journal - write what's relevant, skip what's not. Sessions are informal and flexible.
Focus on what stands out: deviations from plan, unexpected discoveries, what you would do differently.

Sessions serve two audiences:
1. YOU (or future you) - reflecting on what happened, capturing context for later
2. THE NEXT DEVELOPER - if someone takes over your work, this provides breadcrumbs to understand where
   you left off, what issues you hit, and what went off-plan

If everything went smoothly and there's nothing notable, you might only need a few lines.
If you wrestled with a complex bug for hours, write as much as helps capture what happened.

A step a future agent must follow does not stay here: add it, with its check, to
the playbook for that kind of work (docs/playbooks/README.md).

For more guidance, see the owner folder's README: ../../README.md
-->

# Owned releases up to the pin — 2026-09-28

Part of [Story-loom migration](../../../cycles/2026-09-story-loom-migration.md).

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
