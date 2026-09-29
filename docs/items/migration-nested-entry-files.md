---
type: item
title: A nested feature.md or item.md is neither fixed nor named in advance
description:
  A nested entry file gets MISPLACED ENTITY from the 9.x lint only at verify,
  and one with a retired type is retyped to the entity type, contrary to the
  guide's wording.
status: draft
lifecycle: triage
id: 01a0eacd-1a69-740d-8844-d8d3db1f2deb
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-retypes-positional-artifacts/sessions/2026-09-28-positional-retype.md
---

# A nested feature.md or item.md is neither fixed nor named in advance

A `feature.md` or `item.md` below an entity's top level (for example under
`workstreams/<ws>/`) is typed as the entity by the 9.x lint, which reports
`MISPLACED ENTITY`. The v3.0 migration doesn't name it in its plan, so the
adopter first learns of it when phase 10 stops. One with a retired type is
retyped to the entity type: `workstreams/ws/item.md` with `type: backlog` became
`type: item`, kept `lifecycle: open`, and drew `MISSING id`, `MISSING kind` and
`BAD LIFECYCLE` as well. The guide says such a file "is not retyped". Unlikely
in a real v2.10 tree, but both the output and the guide should be right.

## Definition of done

- [ ] The plan names a nested entry file before the run, with what to do about
      it, and the guide describes what the run does to one.
