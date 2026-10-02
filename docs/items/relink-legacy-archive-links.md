---
type: item
title: Repair legacy link rot that linting the archive exposes
description:
  Linting _archive/ in 9.x surfaces years of broken links on a long-lived
  project, and pdocs has no tool to repair them.
status: draft
lifecycle: triage
id: 01a0ff09-ea71-7516-9fc0-6f852f916a9a
kind: task
generated: { by: claude-opus-5-5, at: 2026-10-02 }
source: "#195"
---

# Repair legacy link rot that linting the archive exposes

9.x lints `_archive/` (v3.0 drops it from `lint.skip`). On operator-mono that
surfaced 1,177 `MISSING FILE` from older reorganizations, almost none caused by
the migration. Phase 10's suggestions only cover the run's own moves, so turning
the gate on meant hand-writing a resolver (about 1,030 repaired, the rest
unlinked).

Evidence that worked, in order, each used only on exactly one existing match:
the v3.0 move record; `git log -M --diff-filter=R` rename history; a path-suffix
match; a unique filename match, also with a leading `YYYY-MM-DD-` stripped; a
retired folder README → its successor. Folder hints in the old link broke ties.

Reported in
[#195](https://github.com/ichabodcole/project-docs-scaffold-template/issues/195).

## Definition of done

- [ ] The v3.0 guide's "After the script" warns about archive link rot and names
      a supported way to adopt in stages (e.g. `lint.skip: ["_archive"]`).
- [ ] Decide at triage whether a `pdocs relink [--write]` (move record plus
      rename history, unique matches only, reporting the rest) is worth
      building.
