---
type: item
title: An excluded entity's entry document keeps its retired frontmatter
description:
  "A feature or item whose entry document lint.exclude names moves but keeps
  type: proposal or a backlog shape, and the run does not say so."
status: draft
lifecycle: triage
id: 01a0ea5f-1353-77e9-9530-99e55266d981
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-respells-formatter-ignores/sessions/2026-09-28-ignore-files-and-excluded-documents.md
---

# An excluded entity's entry document keeps its retired frontmatter

Since the v3.0 migration stopped editing documents `lint.exclude` names, an
exclude that covers an entity's entry document leaves it unconverted: with
`docs/projects/alpha/**` excluded, `features/alpha/feature.md` stays
`type: proposal`, `lifecycle: approved`, and an excluded backlog file becomes an
item with no `id`. The CLI can't see them while they're excluded, which was
already true before. But once the adopter removes the exclude, they have hand
conversions to do, and the run's notice only mentions links. Story-loom excludes
only canon and decks, so it isn't affected.

## Definition of done

- [ ] An excluded entity's entry document (and a cycle) is either still
      converted, or named in the run's output as keeping its retired type and
      lifecycle, with what to do about it.
