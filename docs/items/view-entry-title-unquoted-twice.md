---
type: item
title: Stop view entries unquoting title and the older fields twice
description:
  A title or other older entry field that begins and ends with a quoted phrase
  loses its outer quotes, because scalar unquotes a value the parser already
  unquoted.
status: draft
lifecycle: triage
id: 01a1f78d-7a6f-77fa-b037-af3eac39f9fd
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-19 }
parent: feature/pdocs-work-board
from: items/view-entries-carry-board-fields/sessions/2026-11-19-view-board-fields.md
---

# Stop view entries unquoting title and the older fields twice

The frontmatter parser unquotes a value, and `scalar` in `scripts/pdocs/work.ts`
then strips a second outer pair. A value that begins and ends with a quoted
phrase, such as `"pdocs view" versus "pdocs find"`, comes out as
`pdocs view" versus "pdocs find`. The five fields added for the board read the
parsed value directly and are not affected. `title` and the other fields read
through `opt()` still are.

## Definition of done

- [ ] A `title` written as `"\"pdocs view\" versus \"pdocs find\""` comes out of
      `pdocs view backlog --json` with both quoted phrases intact.
- [ ] A test covers it and fails on the current code.
- [ ] The payload copy matches (`npm run check:mirror`), and `npm run check`
      passes.
