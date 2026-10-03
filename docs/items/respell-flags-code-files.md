---
type: item
title: The respell option flags hits in code rather than rewriting them
description:
  The migration's respell option rewrote docs/investigations to docs/items in
  code that scaffolds documents, which would run and do the wrong thing, since
  an investigation is now an item plus a write-up.
status: stable
lifecycle: ready
id: 01a0ee56-066d-7402-bc0c-e97cd34e12e7
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-29 }
scope: migrations
source: "grapevine project-docs-v9 #17"
priority: medium
cycle: 2026-10-v3-migration-feedback
---

# The respell option flags hits in code rather than rewriting them

The v3.0 migration's `--respell` option rewrites retired paths in files outside
`docs/`. Story-loom ran it over 24 files. Five were code that scaffolds
documents, and respelling `docs/investigations` → `docs/items` there would have
made the code run and do the wrong thing, since an investigation is now an
`item.md` plus a `write-up.md`, not a file in a folder. Story-loom left those
five out by hand.

## Definition of done

- [ ] `--respell` lists hits in code files (`.ts`, `.js` and the like) as "code:
      review, don't just respell" and doesn't rewrite them unless asked, or the
      guide says plainly that it is for prose and comments.
