---
type: item
title: Synthesized frontmatter reads a setext underline as the description
description:
  When a legacy document's H1 is a setext heading, synthesizeFrontmatter takes
  its ==== underline as the description.
status: draft
lifecycle: ready
id: 01a0ea5f-1307-72bc-940f-e07d3884a946
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-respells-formatter-ignores/sessions/2026-09-28-ignore-files-and-excluded-documents.md
priority: medium
cycle: 2026-09-story-loom-migration
---

# Synthesized frontmatter reads a setext underline as the description

When the v3.0 migration synthesizes frontmatter for a legacy document whose H1
is a setext heading (`Hero` over a `====` line), `synthesizeFrontmatter` takes
the underline as the first sentence: the review saw `description: Hero ====`.
Excluded documents are no longer touched, but any other legacy document written
that way gets a meaningless description.

## Definition of done

- [ ] A setext H1 is read as the title, and the description comes from the first
      paragraph after it, with a test.
