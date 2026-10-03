---
type: item
title: Keep the v3.0 config patch's arrays formatter-clean
description:
  The v3.0 config patch keeps a shrunk array's multi-line layout, so a project's
  formatter rejects .project-docs.json at the commit gate.
status: stable
lifecycle: ready
id: 01a10389-b4c4-767d-9872-03c6955c131b
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-03 }
source: "#195 (comment)"
priority: medium
cycle: 2026-10-v3-migration-feedback
---

# Keep the v3.0 config patch's arrays formatter-clean

The v3.0 migration patches `.project-docs.json` in place and keeps each array's
existing layout. In media-forge, `lint.workbench` shrank from seven entries to
three and stayed multi-line; the project's Biome wanted it collapsed, so the
pre-commit gate failed on `.project-docs.json`. Same class as #167 (keep the
migration's writes byte-stable for the project's formatter), new edge.

Reported in a
[comment on #195](https://github.com/ichabodcole/project-docs-scaffold-template/issues/195).

## Definition of done

- [ ] An array the patch shrinks is written in the layout a formatter would give
      it (or the patch leaves layout to the project's formatter and the guide
      says to run it), with a test on the seven-to-three case.
