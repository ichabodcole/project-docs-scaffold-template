---
type: item
title: Merge archive/ into an existing _archive/ in the v2.6 migration
description:
  The v2.5-to-v2.6 script nests archive/ inside an _archive/ that already
  exists, and its sed respells every /archive/ substring.
status: draft
lifecycle: triage
id: 01a0ff09-e929-7532-9684-7e072f84d79c
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-02 }
source: "#191"
---

# Merge archive/ into an existing \_archive/ in the v2.6 migration

When a category has both `archive/` and `_archive/` (items filed into the old
folder after the rename), `migrate-v2.5-to-v2.6.sh` runs
`git mv <cat>/archive <cat>/_archive`, which nests it as `_archive/archive/`.
Its blanket `sed 's|/archive/|/_archive/|g'` also rewrites `/archive/`
substrings that don't point at the renamed folders. Found upgrading
operator-mono from 2.6.0; merged by hand (13 files, six links).

Reported in
[#191](https://github.com/ichabodcole/project-docs-scaffold-template/issues/191).

## Definition of done

- [ ] When `<cat>/_archive/` exists, the script merges `archive/` into it file
      by file and stops on a name collision, with a test.
- [ ] Only links whose target was inside a renamed folder are respelled.
