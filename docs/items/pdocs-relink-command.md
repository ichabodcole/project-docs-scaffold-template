---
type: item
title: Repair broken links from rename history with pdocs relink
description:
  A pdocs relink command that repairs MISSING FILE links from the move record
  and git rename history, unique matches only, and reports the rest.
status: draft
lifecycle: backlog
id: 01a1038e-8cfd-753d-a11f-6e5334b8a678
kind: task
generated: { by: claude-opus-5-5, at: 2026-10-03 }
priority: low
source: "#195"
from: 01a0ff09-ea71-7516-9fc0-6f852f916a9a
---

# Repair broken links from rename history with pdocs relink

Split out of [legacy link rot](./relink-legacy-archive-links.md) at triage,
2026-10-03. operator-mono needed a hand-written resolver for 1,177 legacy
`MISSING FILE` links the migration did not cause. The evidence that worked, in
order, each used only on exactly one existing match: the v3.0 move record;
`git log -M --diff-filter=R` rename history; a path-suffix match; a unique
filename match, also with a leading `YYYY-MM-DD-` stripped; a retired folder
README → its successor.

Reported in
[#195](https://github.com/ichabodcole/project-docs-scaffold-template/issues/195).

## Definition of done

- [ ] `pdocs relink` lists the repairs it would make, from the evidence above,
      unique matches only, and `--write` applies them, with tests.
- [ ] Links it cannot resolve are reported, not changed.

## Related Documents

- [Repair legacy link rot that linting the archive exposes](./relink-legacy-archive-links.md)
