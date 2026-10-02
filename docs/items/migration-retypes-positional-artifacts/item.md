---
type: item
title: The migration retypes documents whose new position says artifact
description:
  A document with frontmatter at a position 9.x types as artifact (nested
  workstream plan.md, sessions/) keeps its old type and lifecycle, giving
  story-loom 28 lint problems.
status: draft
lifecycle: done
id: 01a0e55c-f685-754d-aff8-e46ce2ee478e
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations, story-loom]
cycle: 2026-09-story-loom-migration
priority: high
scope: migrations
from: items/story-loom-migration-readiness/write-up.md
---

# The migration retypes documents whose new position says artifact

Row 3 of
[the story-loom readiness write-up](../story-loom-migration-readiness/write-up.md).
story-loom's `projects/storyline-engine/workstreams/*/plan.md` (9 plans) and a
nested session keep `type: plan`/`session` and a `lifecycle`, but 9.x types them
by position as `artifact`: 28 problems (`WRONG TYPE`, `LIFECYCLE`,
`UNKNOWN FIELD`). The run already retypes briefs and reports this way.

## Definition of done

- [x] A document with frontmatter whose new position 9.x types as `artifact` is
      retyped (`type: artifact`, `lifecycle` removed) and named in the plan,
      with a test on a nested `plan.md` and `sessions/` file.

## Related Documents

- [What story-loom's v3.0 migration will ask for](../story-loom-migration-readiness/write-up.md)
