---
type: item
title: Closed cycles move to cycles/_archive/
description:
  docs/cycles/ grows as a flat list forever because pdocs archive refuses a
  cycle; give cycles an _archive/ folder like items and features, so a closed or
  abandoned cycle can leave the live list.
status: draft
lifecycle: backlog
id: 01a0e98e-f381-748e-8bb4-0042aa4c6034
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: pdocs
---

# Closed cycles move to cycles/\_archive/

Items and features have an `_archive/` folder. Cycles don't, by design today:
`SCHEMA.md` says "Cycles and owned documents are not archived", the cycles
README says a closed cycle "is never moved to an archive", `sweep-project` says
there is no `docs/cycles/_archive/`, and `pdocs archive` refuses a cycle. The
reasoning was that the folder is the project's record of what was in play when.

That record survives an archive, as it does for items: `lifecycle` stays the
source of truth, and `_archive/` only mirrors it. What doesn't survive is the
flat list. Every cycle a project ever ran stays in `docs/cycles/`, so a person,
or an agent reading the file tree, sees the closed ones mixed with the one
that's live. This repository already has four closed cycles beside one active.

Cole's call (2026-09-28): give cycles an `_archive/`, like items. Archiving
stays a separate, confirmed step after closing, and links are rewritten by
`pdocs archive`, as they are for items.

## Definition of done

- [ ] `pdocs archive cycle/<slug>` moves a `closed` or `abandoned` cycle to
      `cycles/_archive/` and rewrites every link to and from it; it still
      refuses a `planned` or `active` one.
- [ ] Items whose `cycle:` names an archived cycle still resolve, and
      `pdocs view cycle` still finds it.
- [ ] `SCHEMA.md`, the cycles README and `sweep-project` say closed cycles may
      be archived, in this repository and the payload.
- [ ] A new project ships `cycles/_archive/`, as it does `items/_archive/`.
