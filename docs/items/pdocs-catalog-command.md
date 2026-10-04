---
type: item
title: Fill and resync the catalog with pdocs catalog
description:
  A pdocs catalog command that adds missing library pages to docs/index.md and
  resyncs stale hooks, for projects adopting the catalog.
status: draft
lifecycle: backlog
id: 01a1038e-8d54-716a-adb6-b3614d3fb57f
kind: task
generated: { by: claude-opus-5-5, at: 2026-10-03 }
priority: low
source: "#196"
from: 01a0ff09-eac4-728c-a363-352495830e3f
---

# Fill and resync the catalog with pdocs catalog

Split out of [the catalog fill item](./catalog-bulk-fill-and-index-intro.md) at
triage, 2026-10-03. `pdocs new` writes a catalog line for a new library page,
but operator-mono had 138 existing pages, each needing a line whose hook equals
its `description`, so it scripted them.

Reported in
[#196](https://github.com/ichabodcole/project-docs-scaffold-template/issues/196).

## Definition of done

- [ ] `pdocs catalog` lists library pages missing from `docs/index.md` and stale
      hooks, and `--write` adds them under their heading (archived pages in a
      sub-list) and resyncs the hooks, with tests.

## Related Documents

- [Fill the catalog in bulk and respell the index intro](./catalog-bulk-fill-and-index-intro.md)
