---
type: item
title: Find the headings GitHub finds
description:
  The lint counts headings inside tilde fences, HTML comments and frontmatter,
  and misses setext, indented, blockquoted and CRLF headings, so anchor
  numbering can pass a link GitHub does not have.
status: draft
lifecycle: triage
id: 01a1eb3b-d7ef-759f-bded-a90c01620a55
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-17 }
from: items/heading-anchors-match-github/sessions/2026-11-17-heading-anchors.md
---

# Find the headings GitHub finds

`headingSlugsOf` finds headings with a line regex after stripping backtick
fences. Since #208 numbers repeated headings, a line wrongly counted as a
heading consumes a number and produces a `-1` anchor GitHub does not have, so a
link to it passes when it should fail.

- **Counted, and not headings:** a `#` line inside a `~~~` fence, inside an HTML
  comment, or in YAML frontmatter; seven or more `#`s.
- **Headings, and not counted:** setext headings, headings indented one to three
  spaces, headings in a blockquote, and every heading in a CRLF file.

## Definition of done

- [ ] Each case above has a test, and the anchor set matches GitHub's for it.
- [ ] A CRLF file yields the same anchors as its LF copy.

## Related Documents

- [Heading anchors that match GitHub — 2026-11-17](./heading-anchors-match-github/sessions/2026-11-17-heading-anchors.md)
