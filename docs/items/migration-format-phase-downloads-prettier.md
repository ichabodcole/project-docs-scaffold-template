---
type: item
title: The v3.0 migration's format phase can download Prettier
description:
  Phase 9 runs npx prettier --write without --no-install, so a project without
  Prettier that does not pass --skip-format gets the latest Prettier fetched and
  run.
status: draft
lifecycle: ready
id: 01a0ea0f-39fd-73ba-bb40-9bc0fbdd8efc
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-frontmatter-prettier-shape/sessions/2026-09-28-prettier-shaped-frontmatter.md
priority: medium
cycle: 2026-09-story-loom-migration
---

# The v3.0 migration's format phase can download Prettier

`migrate-v2.10-to-v3.0.ts` phase 9 runs `npx prettier --write` over the files it
wrote, unless `--skip-format` is given. Without `--no-install`, `npx` fetches
the latest Prettier into a project that has none, and runs it. That's the same
fault the v9 rollout fixed in `finalize-branch` Step 7, and it can reformat a
consumer's files with a Prettier version it never chose. Found while making the
frontmatter Prettier-shaped, which now loads Prettier with Bun's auto-install
off.

## Definition of done

- [ ] Phase 9 never downloads Prettier: a project without it skips formatting
      and says so, and a test covers it.
