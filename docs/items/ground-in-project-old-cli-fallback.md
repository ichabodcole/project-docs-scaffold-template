---
type: item
title: Fall back when the CLI has no view command in ground-in-project
description:
  ground-in-project Step 3 runs pdocs view, which an 8.x CLI rejects, and the
  skill has no fallback for it.
status: stable
lifecycle: ready
id: 01a10389-6281-77f1-a38e-79b6422968e8
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-03 }
source: "#202"
priority: medium
cycle: 2026-10-check-and-upgrade-fixes
---

# Fall back when the CLI has no view command in ground-in-project

ground-in-project Step 3 runs `bun scripts/pdocs/cli.ts view board --features`
and falls back to listing `docs/` only when the CLI is missing. Scaffold 8.x
ships `pdocs` without `view`, so on media-forge (8.1.0, plugin 4.4.0) it failed
with `unknown command \`view\`` (usage, exit 2) and the agent improvised. That
failure is also the sign that a migration is waiting.

Reported in
[#202](https://github.com/ichabodcole/project-docs-scaffold-template/issues/202).

## Definition of done

- [ ] Step 3 falls back to the folder listing when the CLI is missing or rejects
      `view`.
- [ ] The orientation's nudges say the tree's `pdocs` predates the work board
      and that update-project-docs would migrate it.
