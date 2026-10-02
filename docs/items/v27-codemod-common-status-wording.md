---
type: item
title: Map common Status wording in the v2.7 codemod
description:
  The v2.7 codemod leaves lifecycle blank for common Status wording such as
  Open, Backlog, RESOLVED and Graduated.
status: draft
lifecycle: triage
id: 01a0ff09-e9ca-71db-ba74-13d244b68c46
kind: task
generated: { by: claude-opus-5-5, at: 2026-10-02 }
source: "#193"
---

# Map common Status wording in the v2.7 codemod

The v2.6→v2.7 codemod left `lifecycle` blank on 27 of 239 operator-mono
documents because their `**Status:**` lines used wording it doesn't map: `Open`,
`Backlog`, `Backlog (proposed)`, `RESOLVED (date) …`, `CLOSED — superseded …`,
`Concluded — …`, `Graduated → [proposal]`, `SHIPPED. …`,
`Draft - Pending Approval`, `Deferred — …`, `Phases 1–6 complete …`. v3.0 maps
`lifecycle` straight into feature and item states, so a blank carries forward
(see [the ordering item](./upgrade-audit-lifecycle-before-v30.md)).

Reported in
[#193](https://github.com/ichabodcole/project-docs-scaffold-template/issues/193).

## Definition of done

- [ ] The codemod matches the leading word case-insensitively and maps each
      wording above to its type's vocabulary, with tests.
- [ ] Wording it still can't map is reported as before.
