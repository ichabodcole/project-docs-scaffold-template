---
type: item
title: Respelling a link inside a table misaligns the table
description:
  When the migration lengthens a link in a Markdown table cell the columns no
  longer line up, and a consumer's prettier --check rejects the file.
status: draft
lifecycle: triage
id: 01a0ea0f-3a47-7667-a579-0ea1cbfbe1c8
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-frontmatter-prettier-shape/sessions/2026-09-28-prettier-shaped-frontmatter.md
---

# Respelling a link inside a table misaligns the table

When the migration respells a link inside a Markdown table cell (for example
`../projects/x/proposal.md` to `../features/x/feature.md`), the cell's width
changes and the table's padded columns no longer line up. A consumer's
`prettier --check` then rejects the file. This was the "1 rewritten frontmatter"
row in story-loom's readiness write-up
(`items/operator-as-substrate-deltas/write-up.md`): a table, not frontmatter.

## Definition of done

- [ ] A table whose links the migration respells still passes
      `prettier --check`, either because the run re-pads it or formats the file
      with the project's own Prettier, with a test.
