---
type: backlog
title:
  "Plugin skills hardcode the flat `docs/` folders, which a restructure would
  invalidate"
description:
  Skills that write documents name docs/memories/ and docs/architecture/
  literally, so a project that moves those folders gets them recreated by the
  tooling meant to maintain them.
tags: [skills, docs-layout, plugin]
status: stable
lifecycle: open
generated: { by: claude-opus-5, at: 2026-09-04 }
---

# Plugin skills hardcode the flat `docs/` folders, which a restructure would invalidate

Roughly fifteen files across five plugins name the durable-docs folders
literally — `docs/memories/`, `docs/memories/TEMPLATE.md`,
`docs/architecture/README.md`, `docs/interaction-design/README.md` — about sixty
references in all. Every one of them assumes the flat layout is the layout.

**This is not currently broken, and that is the point of writing it down.** The
OKF frontmatter layer was deliberately additive: no folder moved, so every
hardcoded path still resolves. The proposal left the question of whether the
durable folders eventually move under a shared root explicitly open. The day
that question is answered "yes", these sixty references become sixty bugs, and
the acute ones are the skills that **write**.

The failure mode was observed for real, on a pilot project that had adopted an
earlier restructure and deleted the six legacy folders: `finalize-branch` Steps
5 and 6, followed literally, recreated the structure the migration had just
removed. The tooling meant to maintain the documentation silently undid it.
Readers degrade gracefully — `project-summary` and `ground-in-project` find
nothing and say so — but writers corrupt.

The fix that was tried on the abandoned `feat/knowledge-wiki-layer` branch was
layout **detection**: glob for a `SCHEMA.md`, read the contract if one is found,
fall back to the flat folders otherwise. That is the right shape, and part of it
has since landed for a different reason — `finalize-branch` Step 5 now branches
on whether `docs/SCHEMA.md` exists, because a memory in a project with the layer
has catalog obligations that a memory without it does not. What has not landed
is deriving the _paths_ from anything but the assumption.

Two cheaper halves worth doing before any restructure:

- Every skill that touches the tree now says the docs root is `docsRoot` in
  `.project-docs.json`. Nothing reads a folder **name** from config, and the
  folder names are already there — `lint.durable` and `lint.workbench` list
  them. A skill that needs "where do memories go" could ask.
- An inventory: which of the sixty references are load-bearing for a writer, and
  which are illustrative paths in an example that should never have been read as
  configuration.

## Acceptance Criteria

- [ ] The sixty-odd references are inventoried, split into writers and readers
- [ ] Skills that write a document resolve the folder rather than assuming it,
      or state plainly that they assume the default layout
- [ ] A project that moves a durable folder does not get it recreated by the
      next `finalize-branch` run

## References

- `plugins/project-docs/skills/finalize-branch/SKILL.md` — Steps 5 and 6, the
  acute case
- `git show 24203a8` — the detection approach, written against a restructure
  this project did not do. The branch it lived on (`feat/knowledge-wiki-layer`)
  was deleted; the commit is kept reachable by the
  `archive/knowledge-wiki-layer` tag, so this reference resolves.
- [okf-frontmatter-layer proposal](../projects/okf-frontmatter-layer/proposal.md)
  — why no folder moved, and what phase two would change
