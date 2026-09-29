---
type: item
title: The v3.0 migration calls a 9.0.0 owned file an edit
description:
  Re-run on a 9.0.0 tree, migrate-v2.10-to-v3.0 says an unedited SCHEMA.md holds
  the adopter's edits, because its release keys stop before 9.0.0.
status: draft
lifecycle: done
id: 01a0e770-e019-70df-8626-a7d0e53f7078
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
source: "#182"
priority: high
cycle: 2026-09-story-loom-migration
---

# The v3.0 migration calls a 9.0.0 owned file an edit

Spellbook re-ran `migrate-v2.10-to-v3.0.ts` on a tree the same script had put on
scaffold 9.0.0 the day before (issue #182). Its plan said `docs/SCHEMA.md`
"differs from every release of the scaffold, so it holds edits of yours". The
file was byte-identical to 9.0.0's.

`editedOwned()` checks a file's `proseKey` against `OWNED_BEFORE_9`, which holds
only the releases before 9.0.0, and then against the scaffold it fetched
(9.0.1). `SCHEMA.md` changed between 9.0.0 and 9.0.1, so a 9.0.0 copy matches
neither. The same happens to any owned file that changed after 9.0.0, and again
each time the migration is re-pinned.

To see it: generate a project from tag `project-docs-scaffold-template-v9.0.0`
and run the migration's `--dry-run` against it.

## Scope

Widen the test's filter from "major version below 9" to "every release up to
`SCAFFOLD_TAG`", and regenerate the list, then rename it (it will no longer be
only "before 9"). A later re-pin then fails the test until the list is
regenerated, so the omission can't recur silently.

The lasting fix, a hash recorded at install so no list is needed, is
[its own item](../record-owned-files-at-install.md).

## Definition of done

- [x] An owned file identical to any scaffold release up to the pinned one,
      9.0.0 and 9.0.1 included, is not reported as holding edits.
- [x] The test derives the list from every release tag up to `SCAFFOLD_TAG`, so
      a re-pin without regenerating it fails.
