---
type: cycle
title: Skill garden extraction
description:
  Move the five plugins that aren't project-docs into their own repository,
  skill-garden, and remove them from this one.
tags: [extraction, plugins]
status: draft
lifecycle: closed
started: 2026-09-29
appetite:
  Until the five plugins install from skill-garden and this repository holds
  project-docs alone.
after: []
generated: { by: claude-opus-5-5, at: 2026-09-29 }
closed: 2026-09-29
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

- **[Bootstrap skill-garden](../items/skill-garden-bootstrap/item.md)**: the new
  repository exists from the 9.2.0 scaffold, holds the five plugins and its own
  marketplace, carries their live items, and Cole has installed from it.
- **[Remove the extracted plugins](../items/remove-extracted-plugins/item.md)**:
  this repository holds project-docs alone, and nothing here points at a plugin
  that has left.

Out of scope, deliberately: which project-docs skills should move too (the
[skill-scope research](../items/project-docs-skill-scope.md), for a later
cycle), and how skills reach runtimes other than Claude Code (moves to
skill-garden with its item).

## Outcome

The five plugins now ship from
[skill-garden](https://github.com/ichabodcole/skill-garden), and this repository
serves project-docs alone (4.3.0). skill-garden started from the 9.2.0 scaffold,
with a fresh history naming its source commit. An install test and a strict
validate passed before its first push, and `main` went first so it is the branch
the marketplace serves. The removal here cut no scaffold release, because its
commits are typed so release-please skips them.

Cut: the openpackage `dist/` build for the moved plugins, whose future is
skill-garden's distribution research item. agent-bridge wasn't reinstalled from
skill-garden; it stays available there.

Learned: a change split across commits by type, for release-please, must pass
the gate commit by commit. The pre-commit hook lints the working tree, so it
passed two commits whose fixes were still uncommitted, and the review caught it.
Filed along the way:

- in skill-garden: a license, quality gates, CI, per-plugin release-please and a
  release-please recipe;
- here: the migration tests' timeouts under load.

## Sessions

- skill-garden bootstrap, in ~/Projects/skill-garden (landed 2026-09-29)
- chore/remove-extracted-plugins (landed 2026-09-29)
