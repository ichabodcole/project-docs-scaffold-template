---
type: item
title: How skills reach runtimes other than Claude Code
description:
  openpackage has stalled; find a consistent way to install these skills for
  Codex and other runtimes alongside the Claude plugin marketplace.
status: draft
lifecycle: dropped
id: 01a0e970-e6e3-7482-ab7b-a92274d6fea9
kind: research
generated: { by: claude-opus-5-5, at: 2026-09-28 }
parent: feature/toolbox-migration
---

# How skills reach runtimes other than Claude Code

Skills from this repository install today through the Claude Code plugin
marketplace. `dist/` also carries an openpackage build, meant as the route to
other runtimes, but openpackage has stalled. Users on Codex and other agent
runtimes have no consistent way to install the same skills.

This matters for
[the plugin extraction](../features/toolbox-migration/feature.md). The new
repository and this one will both want an answer, so it should be the same
answer.

## Definition of done

- [ ] The write-up names the options (for example, other package formats, a
      plain installer script, per-runtime marketplaces), what each supports
      today, and what each costs to maintain beside the Claude marketplace.
- [ ] It recommends one, or says why none is worth it yet, and whether `dist/`'s
      openpackage build should stay.

**Moved to skill-garden** on 2026-09-29, with the plugin it concerns: now
[skill-garden/docs/items/skill-distribution-beyond-claude-plugins.md](https://github.com/ichabodcole/skill-garden/blob/main/docs/items/skill-distribution-beyond-claude-plugins.md).
Dropped here, not done.
