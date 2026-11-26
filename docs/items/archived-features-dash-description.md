---
type: item
title: Give nine archived features a real description
description:
  Nine archived features have a literal --- as their description, which the
  board will show as written.
status: draft
lifecycle: triage
id: 01a1f78d-7a0f-77c5-ab6b-a1f1ba6d8486
kind: chore
generated: { by: claude-fable-5-2, at: 2026-11-19 }
from: items/view-entries-carry-board-fields/sessions/2026-11-19-view-board-fields.md
---

# Give nine archived features a real description

Nine features under `docs/features/_archive/` have `description: "---"` written
literally, for example `docs/features/_archive/hivemind-plugin/feature.md`.
`pdocs view … --json` now carries `description` on every entry, so the work
board will show `---` for each of them.

## Definition of done

- [ ] No feature under `docs/features/` or `docs/features/_archive/` has `---`
      as its description; each has one sentence saying what the feature was.
- [ ] `pdocs check` passes.
