---
type: item
title:
  Owned files the refresh installs are not Prettier-clean for every consumer
description:
  The refresh copies owned files byte for byte from the scaffold, and some
  (features/README.md in 9.0.1) fail prettier --check under another Prettier
  version or config.
status: draft
lifecycle: ready
id: 01a0ea0f-3a93-7239-9703-d1301f006c7b
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-frontmatter-prettier-shape/sessions/2026-09-28-prettier-shaped-frontmatter.md
priority: medium
cycle: 2026-09-story-loom-migration
---

# Owned files the refresh installs are not Prettier-clean for every consumer

The refresh copies owned files (`SCHEMA.md`, the category READMEs) byte for byte
from the scaffold. They are formatted by this repository's Prettier and
`.prettierrc`, and a consumer on another version or config can fail
`prettier --check` on them. Scaffold 9.0.1's `docs/features/README.md` wraps two
lines differently under Prettier 3.6.2 with this repository's config.
Story-loom's `playbooks/README.md` hit the same with 3.9.x. The owned-file
comparison ignores whitespace, so reformatting them is safe for the next
migration; nothing does it today.

## Definition of done

- [ ] After a refresh, the owned files it installed pass the consumer's
      `prettier --check`, or the guide says plainly to format them and why that
      is safe.
