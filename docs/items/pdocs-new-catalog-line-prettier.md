---
type: item
title: pdocs new writes a catalog line Prettier reformats
description:
  The index.md line pdocs new writes for a library page is not Prettier-stable,
  so the first commit fails a format check.
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: triage # triage | backlog | ready | active | review | done | dropped
id: 01a0da5f-8af5-7508-bcd1-7716938c9b5d
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-25 }
scope: pdocs
---

# pdocs new writes a catalog line Prettier reformats

Found preparing the dogfood run: five `pdocs new playbook` calls left
docs/index.md failing `prettier --check`. Done when the written line is what
Prettier produces.
