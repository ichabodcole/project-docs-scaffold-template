---
type: item
title: The catalog line can wrap into a nested list
description:
  When a library page's description contains ' - ', ' + ' or '1. ', pdocs new
  can start a continuation line with it, and Prettier then reads a nested list
  and rewrites the entry.
status: stable
lifecycle: active
id: 01a0e03f-d229-74d5-a5ba-1a68fde61ec7
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-26 }
tags: [pdocs, prettier]
scope: pdocs
from: items/wocky-talky-feedback-round-1/sessions/2026-09-26-pdocs-output-and-placeholder-lint.md
cycle: 2026-10-pdocs-views
---

# The catalog line can wrap into a nested list

`catalogEntry` in `scripts/pdocs/commands/new.ts` wraps a library page's catalog
line greedily at 80 columns. When the description contains `-`, `+` or `1. `, a
continuation line can start with it, and Prettier then reads a nested list and
rewrites the entry, changing its meaning. Found by the review of
`fix/pdocs-output-and-placeholder-lint`, which fuzzed `catalogEntry` against
Prettier. It predates that branch, and is rare in real descriptions.

The same class, seen landing that branch: when `pdocs new session --owner`
promotes a single-file item to a folder, the link it rewrites in the cycle file
comes out wrapped differently from what Prettier produces, and the pre-commit
format check failed until the file was reformatted by hand.

## Definition of done

- [ ] A catalog line whose description contains `-`, `+` or `1. ` at a wrap
      point is left unchanged by `prettier --check`, with a test.
- [ ] A link rewritten by promotion or `pdocs archive` leaves the file
      Prettier-stable, with a test.

## Related Documents

- [pdocs output and the placeholder lint — 2026-09-26](./wocky-talky-feedback-round-1/sessions/2026-09-26-pdocs-output-and-placeholder-lint.md)
