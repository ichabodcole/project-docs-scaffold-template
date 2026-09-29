---
type: item
title: "Two small migration nits: comment headings and a broken-config message"
description:
  An HTML comment holding a line of === gives a synthesized title of <!--, and
  phase 4 says owned files are written as the project's Prettier prints them
  when a broken config made every result null.
status: draft
lifecycle: backlog
id: 01a0eb75-55c3-74a7-8367-590f97d5647f
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/link-respell-misaligns-tables/sessions/2026-09-28-migration-polish-round.md
priority: low
---

# Two small migration nits: comment headings and a broken-config message

Two nits the review of the migration polish round left for later:

- `firstH1` reads a line of `===` inside an HTML comment as a setext underline,
  so a document opening with such a comment gets `title: "<!--"`.
- With a Prettier config that fails to parse, phase 4 still prints that the
  owned files are written as the project's Prettier prints them, although every
  result was null and the scaffold's bytes were kept. Phase 9 then stops the
  run, so nothing is harmed.

## Definition of done

- [ ] Headings inside an HTML comment are ignored, and phase 4's message says
      the owned files were left at the scaffold's bytes when Prettier failed.
