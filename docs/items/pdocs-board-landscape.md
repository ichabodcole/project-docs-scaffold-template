---
type: item
title: "A visual board for project-docs work: landscape and MVP"
description:
  "Survey comparable products and our own OKF entities, and decide what a first
  pdocs board is: a cycle's Kanban, a triage workspace, or something else."
status: draft
lifecycle: backlog
id: 01a0e970-e72d-70d2-b506-ae4899a7d04e
kind: research
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: pdocs
---

# A visual board for project-docs work: landscape and MVP

The work taxonomy has settled into items, features and cycles in OKF
frontmatter, and `pdocs view board` already prints them by state as text. The
next step Cole sees is a visual interface for doing the work, not only reading
it. One idea is a Kanban board for a cycle; another is a workspace for triaging
items. It would be a project-docs surface in the style of the Spellbook
applications, perhaps `pdocs board`.

Comes after the [skill scope pass](./project-docs-skill-scope.md) and
[the plugin extraction](../features/toolbox-migration/feature.md): cleanup
first.

Prior art to read first: `tusk-board` (a live task board built in this
repository, now in Spellbook) and the Spellbook surfaces, Scriptorium included.

## Definition of done

- [ ] A landscape of comparable products: what each shows, and what it lets you
      do rather than only see.
- [ ] A read of our own system: which `pdocs` reads and writes a board would sit
      on, and what's missing from the CLI for it.
- [ ] A proposed MVP: which one or two workspaces, and why those carry the most
      value, or a recommendation not to build it yet.
