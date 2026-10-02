---
type: item
title: Placeholder-lint wording polish
description:
  The PLACEHOLDER message calls a lone real feature tag on an item 'the
  template's prompt', and the pdocs reference's --title row attaches 'mangles
  acronyms' to the H1 clause.
status: stable
lifecycle: done
id: 01a0e03f-d272-73dc-886a-8f28317aef00
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-26 }
tags: [pdocs, lint]
scope: pdocs
from: items/wocky-talky-feedback-round-1/sessions/2026-09-26-pdocs-output-and-placeholder-lint.md
cycle: 2026-10-pdocs-views
---

# Placeholder-lint wording polish

Two wording issues from the re-review of
`fix/pdocs-output-and-placeholder-lint`. The `PLACEHOLDER` message for tags says
"is still the template's prompt", which is wrong for an item: its template has
no `tags:`, and a lone real `feature` tag is flagged. And in
`plugins/project-docs/skills/create-project/references/pdocs.md`, the `--title`
row's "which mangles acronyms" now hangs off the H1 clause instead of the slug
default it describes.

## Definition of done

- [x] The tags message says the tags are only placeholder words (`area`,
      `feature`), not that they are the template's.
- [x] The `--title` row attaches the acronym note to the slug default.

## Related Documents

- [pdocs output and the placeholder lint — 2026-09-26](./wocky-talky-feedback-round-1/sessions/2026-09-26-pdocs-output-and-placeholder-lint.md)
