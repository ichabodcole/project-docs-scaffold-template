---
type: item
title: Stop the respell option rewriting a path split across lines
description:
  The v3.0 respell option rewrites a retired folder path that a comment wraps
  onto the next line as the bare folder, producing a path that never exists.
status: stable
lifecycle: ready
id: 01a10389-7ed4-72f9-aa55-d7d4c3a4b23f
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-03 }
source: "#201"
priority: high
cycle: 2026-10-v3-migration-feedback
---

# Stop the respell option rewriting a path split across lines

A TypeScript comment wrapped at the path:

```ts
// public internet (found 2026-08-10, see docs/investigations/
// 2026-08-10-observability-logging-stack-landscape.md). An app-layer gate
```

`--respell` listed it as `docs/investigations/ → docs/items/`. Written, the
comment would name
`docs/items/2026-08-10-observability-logging-stack-landscape.md`, which never
exists (the document moved to
`items/observability-logging-stack-landscape/write-up.md`). Two other wrapped
comments were "left as written: nothing this migration moved is there", which is
safe but wrong as a reason: they are moved paths too. Found in media-forge's
v2.10→v3.0 dry run; five comments were fixed by hand.

Related: [the respell option flags hits in code](./respell-flags-code-files.md).

Reported in
[#201](https://github.com/ichabodcole/project-docs-scaffold-template/issues/201).

## Definition of done

- [ ] A match that ends at a line break is joined with the next line's leading
      token (after `//`, `*`, `#`) and looked up in the move record: resolved,
      both lines are respelled; otherwise it is reported as split across lines
      and left as written. Tests cover both.
