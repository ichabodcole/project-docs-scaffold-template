---
type: cycle
title: Skill garden extraction
description:
  Move the five plugins that aren't project-docs into their own repository,
  skill-garden, and remove them from this one.
tags: [extraction, plugins]
status: draft
lifecycle: active
started: 2026-09-29
appetite:
  Until the five plugins install from skill-garden and this repository holds
  project-docs alone.
after: []
generated: { by: claude-opus-5-5, at: 2026-09-29 }
---

<!--
OWNERSHIP (of this template file — not of documents created from it): it is
yours to edit. The scaffold records its hash, so a migration updates it only
while you have not touched it. Frontmatter is the contract the lint enforces;
below it is yours. See docs/SCHEMA.md → "Who owns which file".

USAGE: `bun scripts/pdocs/cli.ts new cycle <slug>` writes this as
docs/cycles/YYYY-MM-<slug>.md. The file's name without `.md` is the cycle's slug.

A cycle is an index over work in play, not a container for it. It lists nothing
in its frontmatter: an item joins it by naming it, `cycle: YYYY-MM-<slug>`
(`init-branch` writes that when it opens a branch), and
`pdocs view cycle YYYY-MM-<slug>` lists its items and says whether it is
closable. Every document stays with the feature or item that owns it.

Set `lifecycle: active` when work starts (`pdocs set cycle/<slug> --lifecycle
active`). At most one cycle is active; `pdocs set` refuses a second.

For more guidance, see: ./README.md
-->

# Skill garden extraction

## Why now

The story-loom migration closed the project-docs rollout, and project-docs is
now a framework of its own. The five other plugins in this repository
(agent-bridge, hivemind, operator, recipes, toolbox) share its marketplace but
not its purpose. Cole decided on 2026-09-28 to move them out, and on 2026-09-29
created the `skill-garden` repository for them. The move is mostly copying and
setup, so it comes before the skill-scope and board research that depend on a
smaller project-docs.

## Scope

- **[Bootstrap skill-garden](../items/skill-garden-bootstrap.md)**: the new
  repository exists from the 9.2.0 scaffold, holds the five plugins and its own
  marketplace, carries their live items, and Cole has installed from it.
- **[Remove the extracted plugins](../items/remove-extracted-plugins.md)**: this
  repository holds project-docs alone, and nothing here points at a plugin that
  has left.

Out of scope, deliberately: which project-docs skills should move too (the
[skill-scope research](../items/project-docs-skill-scope.md), for a later
cycle), and how skills reach runtimes other than Claude Code (moves to
skill-garden with its item).

## Outcome

_Written at close, not before — and for an `abandoned` cycle too._

## Sessions

- skill-garden bootstrap, in ~/Projects/skill-garden (open)
