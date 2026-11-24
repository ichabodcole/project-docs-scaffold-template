---
type: feature
title: Feature touchpoints
description:
  Agents raise the feature question at the two moments it matters, when work is
  filed and when finished work is archived.
tags: [project-docs, workflow]
status: draft
lifecycle: backlog
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# Feature touchpoints

## Overview

A feature holds work that spans several items and often several cycles. Two
moments decide whether that holds together: when work is filed, and when
finished work is archived. At both, an agent acts today without asking about the
feature. This feature adds a touchpoint at each.

## Problem Statement

- **Filing.** Asked for "a new research item", an agent files an item with no
  parent. The rule for when to write a feature sits in three READMEs the agent
  does not read at that moment, and only `workshop-idea` tells it to ask.
  `create-investigation` and the `investigator` agent never mention `parent`.
- **Archiving.** `pdocs archive` and `sweep-project`'s archive advisory look
  only at the item's own state. A done item under an open feature is archived
  like any other, and drops off `view board --features`. A finished research
  item leaves nothing open that points at the build it recommended (#210).

## Proposed Solution

Not settled. The research item decides where the filing touchpoint goes and what
it asks. The leading candidate is an advisory on `pdocs new item`, the mechanism
`scripts/pdocs/advisories.ts` already provides, with the filing skills as a
second layer. The touchpoint should reach the agent when it needs it, not be
preloaded in `AGENTS.md` or `docs/CLAUDE.md`.

The archiving half is clearer: when done items are archived, list the ones whose
parent feature is still open and ask whether to archive each now or hold it
until the feature is done.

## Scope

**In scope:**

- [Find where an agent should ask whether work needs a feature](../../items/feature-or-item-touchpoint/item.md)
  (research, first).
- [Keep a feature's finished items in view until the feature is done](../../items/research-items-parent-feature/item.md).
- [Ask the feature question when research is filed](../../items/ask-feature-question-when-filing-research.md).
- [Add the feature-question advisory to pdocs new item](../../items/feature-question-advisory.md).
- [Say in the READMEs that research expecting a build gets a feature at filing](../../items/readmes-research-expecting-build-gets-feature.md).

**Out of scope:** changing what a feature or an item is.

## Open Questions

- Is the CLI the path, or one part of a bigger strategy with the skills?
- What shape of request means "this is a feature", without prompting on every
  small research item?
- Does every research item need a parent, or only research that recommends a
  build?
