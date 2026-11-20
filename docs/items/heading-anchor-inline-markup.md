---
type: item
title: Slug a heading's rendered text, not its markup
description:
  The lint's heading slug keeps underscore emphasis, reference links, images,
  HTML tags and entities that GitHub removes, and trims after stripping, so some
  valid anchors are reported missing.
status: draft
lifecycle: triage
id: 01a1eb3b-d75d-7416-907f-2e73c708f6c5
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-17 }
from: items/heading-anchors-match-github/sessions/2026-11-17-heading-anchors.md
---

# Slug a heading's rendered text, not its markup

`slug` in `scripts/pdocs/docs-lint/index.ts` works on a heading's raw markdown.
GitHub slugs the rendered text. The #208 review compared the two against
`github-slugger` 2.0.0 and GitHub's "Section links" documentation and found
these differences, all present before #208 too:

- **Underscore emphasis is kept.** `_a_ b` gives `_a_-b`; GitHub gives `a-b`.
  GitHub's own documentation example fails. 28 headings in this repository use
  the form.
- **Trimming happens after stripping.** `## 🚀 Launch` gives `launch`; GitHub
  gives `-launch`. About 24 headings here start with a symbol. Trimming first
  needs closing `#` sequences stripped explicitly, because `## Title ##` is
  right today only through the late trim.
- **Reference links, nested brackets and parentheses in a target** are not
  reduced: `[text][ref]` gives `textref`.
- **Images, HTML tags, entities and emoji shortcodes** contribute their source:
  `<b>Bold</b> x` gives `bboldb-x`.

## Definition of done

- [ ] Each case above has a test with the anchor GitHub renders, confirmed
      against a rendered page or `github-slugger` on the rendered text.
- [ ] `bun scripts/pdocs/cli.ts check` stays clean on this repository, or the
      links it newly reports are fixed.

## Related Documents

- [Heading anchors that match GitHub — 2026-11-17](./heading-anchors-match-github/sessions/2026-11-17-heading-anchors.md)
