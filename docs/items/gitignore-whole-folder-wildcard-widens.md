---
type: item
title: A whole-folder wildcard in .gitignore widens silently
description:
  docs/projects/** and docs/projects/* become features and items wildcards that
  ignore every future entity, while the bare docs/projects/ is flagged.
status: draft
lifecycle: triage
id: 01a0ea5f-13a3-77bc-b288-0cdc06d39319
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-respells-formatter-ignores/sessions/2026-09-28-ignore-files-and-excluded-documents.md
---

# A whole-folder wildcard in .gitignore widens silently

For `.gitignore`, the v3.0 migration turns a wildcard at the entity level into
category-wide globs, and flags a line naming a whole retired folder
(`docs/projects/`). But `docs/projects/**` and `docs/projects/*` also name the
whole folder, and they become `docs/features/**` plus `docs/items/**` (or the
`*` forms). Those ignore every future feature and item, including items that
came from a tracked backlog, and nothing names it.

## Definition of done

- [ ] A `.gitignore` wildcard with nothing after the entity position is flagged
      like the bare folder, with a test.
