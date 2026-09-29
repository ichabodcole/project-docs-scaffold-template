---
type: item
title: Dropping an old ignore line can move a negation's anchor
description:
  When the adopter already added the new spelling after a negation, drop mode
  moves it to where the old line stood and the negation's meaning flips.
status: draft
lifecycle: backlog
id: 01a0ea5f-13f4-77f9-afb7-e8297bcb2f0d
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-respells-formatter-ignores/sessions/2026-09-28-ignore-files-and-excluded-documents.md
priority: low
---

# Dropping an old ignore line can move a negation's anchor

The v3.0 migration's drop pass writes each new spelling where its old line
stood, and removes any other copy, including one the adopter added. If the
adopter had put the new line after a negation (`old`, `!…/Hero.md`, `new`), the
result is `new`, `!…/Hero.md`, and for a pattern that isn't a directory pattern
that flips whether `Hero.md` is re-included. The write-up's advice (new line
next to the old) isn't affected.

## Definition of done

- [ ] A new spelling the adopter already placed keeps its position when it would
      change a negation's meaning, or the run names the conflict, with a test.
