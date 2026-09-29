---
type: item
title: Remove the extracted plugins from this repository
description:
  Once skill-garden's marketplace is installed and working, remove the five
  plugins from plugins/, dist/ and the marketplace, narrow the dist scripts, and
  point the remaining mentions at skill-garden.
status: draft
lifecycle: backlog
id: 01a0ee6f-0427-72bb-8bd2-a0bb7d5f2f60
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-29 }
parent: feature/toolbox-migration
scope: project-docs
priority: high
cycle: 2026-09-skill-garden
blocked_by: [01a0ee6f-03d7-71b1-a716-431cd34d7aa4]
---

# Remove the extracted plugins from this repository

Second half of the
[plugin extraction](../features/toolbox-migration/feature.md), after
[skill-garden is bootstrapped](./skill-garden-bootstrap.md) and installed. It is
a hard cut, by Cole's decision: the plugins leave this marketplace in one
change.

## Definition of done

- [ ] `plugins/`, `dist/` and `.claude-plugin/marketplace.json` hold
      project-docs alone, and `build-skills-dist.sh` and `check-dist.sh` cover
      only it.
- [ ] Nothing in the project-docs plugin, the root docs or the live `docs/`
      pages points at a path that has left. Mentions of the moved plugins name
      skill-garden.
- [ ] The three items that moved to skill-garden are gone from `docs/items/`.
- [ ] The gate passes, and release-please proposes no scaffold release.
