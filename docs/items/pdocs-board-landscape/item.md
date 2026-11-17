---
type: item
title:
  "A work board for project-docs: what we have, the landscape, and what to build"
description:
  Inventory our document types and states, survey how other tools visualize the
  same things, and recommend what a project-docs work board includes and leaves
  out.
status: stable
lifecycle: ready
id: 01a0e970-e72d-70d2-b506-ae4899a7d04e
kind: research
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: pdocs
parent: feature/pdocs-work-board
---

# A work board for project-docs: what we have, the landscape, and what to build

Project-docs has items, features and cycles in frontmatter, with the documents
they own, and `pdocs view` prints them by state as text. Cole wants a visual
surface over them: a dashboard an agent opens to see what needs triage, what is
being worked on, and where things stand. It would be a skill and a small
application in the style of the Spellbook surfaces.

It is higher level than a document editor. Scriptorium is where a document is
reviewed line by line, and the board does not replace it. Higher level does not
mean read-only: some interaction may belong, such as choosing which items to
bring into a cycle an agent has proposed.

Question: what should a project-docs work board be? The answer feeds the
[mockups](../pdocs-work-board-mockups.md), which turn it into variations to
choose from. This item does not design the board.

Prior art to read first: `tusk-board` (a live task board built in this
repository, now `bounty` in Spellbook) and the Spellbook surfaces, Scriptorium
included.

## Definition of done

- [ ] An inventory of our document types and the states each can be in.
- [ ] A landscape of how comparable products visualize the same things: what
      each shows, and what it lets you do, not only see.
- [ ] A read of which `pdocs` reads and writes a board would sit on, and what
      the CLI lacks for it.
- [ ] What belongs in the app, and what stays out because Scriptorium or another
      tool already does it.
- [ ] Recommendations for a lighter and a more robust version, or a
      recommendation not to build it yet.
