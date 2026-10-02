---
type: item
title: Polish the smaller workflow-doc gaps a cold read found
description:
  "Minor and older gaps from the 9.4.0 cold reads: cycle close dates, docs
  commit timing, the pdocs alias, help text and placeholder names."
status: draft
lifecycle: triage
id: 01a0fc4c-ca19-75cc-9331-9bbe6eb34cf5
kind: chore
generated: { by: claude-opus-5-5, at: 2026-10-02 }
---

# Polish the smaller workflow-doc gaps a cold read found

The cold reads before 9.4.0 (see
[cold-read workflow fixes](./cold-read-workflow-fixes.md)) also found smaller
gaps, most of them older than that cycle. None should cause a wrong action on
its own.

- **sweep-project's Cycle Path.** Which date `--closed` takes. How to find a
  "merge date" when branches fast-forward. Whether to check every member's rung
  1 or to sample. "Reconcile and stop", then "offer to sweep".
- **Docs commit timing.** init-branch says the item and Sessions edits stay
  uncommitted for the branch's first commit; finalize-branch Step 1 says to
  commit "the code, not `docs/`".
- **The `pdocs` alias.** Both skills define `pdocs` as
  `bun scripts/pdocs/cli.ts`, but an agent may paste `pdocs …` literally.
- **Help text.** `help set` does not mention exit 6 or the review advisory.
  `help new` does not say `<name>` is optional for a fixed-name owned document
  such as `write-up`.
- **Placeholders and section names.**
  - `pdocs new report <slug> --owner item/<slug>` reuses `<slug>` for two
    things.
  - create-investigation names a "Research Plan" section the template does not
    have.
  - finalize-branch's `--kind` list includes `research`, which its branch
    mapping never produces.
- **The cycle title.** init-branch reads a cycle's `title` from its file when
  `find --format json` already gives it.

## Definition of done

- [ ] Each gap above is fixed or deliberately left, with the reason recorded.
