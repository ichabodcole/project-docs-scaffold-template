---
type: item
title: Propose a parent for parentless research already past triage
description:
  triage-items looks only at items in triage, so a research item with no parent
  that is already in backlog or ready gets no parent proposal anywhere.
status: draft
lifecycle: triage
id: 01a20f8b-1b7c-7740-8060-a1d737010119
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-24 }
parent: feature/feature-touchpoints
from: items/research-items-parent-feature/sessions/2026-11-24-ask-before-archiving.md
---

# Propose a parent for parentless research already past triage

`triage-items` proposes a parent for a research item only while the item is in
`triage`. A research item with no parent that is already `backlog`, `ready` or
`active` is not looked at by any skill until it is `done`, when
`pdocs view board` lists it under `askBeforeArchive`.

## Definition of done

- [ ] A research item with no parent that expects a build gets a parent proposed
      before it is `done`, by a skill the user already runs.
- [ ] Research that cannot end in a build is left without a parent, with the
      reason stated.
