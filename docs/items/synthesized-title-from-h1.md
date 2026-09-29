---
type: item
title: Synthesized titles come from the slug when an H1 exists
description:
  Story-loom got titles like 'Agent cli conformance' and 'Mcp follow ups' from
  folder slugs, where the document's H1 would have been right.
status: draft
lifecycle: triage
id: 01a0ee55-c8e9-777b-a516-a11750774198
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-29 }
scope: migrations
source: "grapevine project-docs-v9 #17"
---

# Synthesized titles come from the slug when an H1 exists

On story-loom, the v3.0 migration gave some entities titles built from their
folder slug ("Agent cli conformance", "Mcp follow ups"), where the document's
own H1 would have been right. Story-loom fixed them with `pdocs set`. Find which
path titles an entity from its slug: a born item titled from a README, a
feature, a research item. Make it prefer the entry document's H1.

## Definition of done

- [ ] Every entity the run creates takes its title from its entry document's H1
      when one exists, and from the slug only when none does, with a test.
