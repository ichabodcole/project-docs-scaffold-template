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
[cold-read workflow fixes](./cold-read-workflow-fixes/item.md)) also found
smaller gaps, most of them older than that cycle. None should cause a wrong
action on its own.

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

- **From the second cold read**, one line each:
  - init-branch assumes `develop` exists.
  - init-branch has no case for a named `ready` item missing from the list
    because it is blocked; a `backlog` start skips the blocker check.
  - finalize-branch Step 8 says "three options" but lists two.
  - No step carries out the Common Mistakes rule "verify tests on the merged
    result".
  - finalize-branch's `--kind` mapping misses `research` and unmapped branch
    types; Step 0 could use the `find` JSON's `slug` field.
  - "review" means three things, and "stable" means different things by type.
  - create-investigation says "don't ask again" where init-branch asks again;
    "use complexity indicators" is undefined; nothing says which branch the docs
    are written on.
  - init-branch records a "no" to the cycle nowhere, so finalize-branch asks
    again.
  - The investigator's approval test by file name is weak: a file has no
    version.
  - Under strict, a commit hook blocks finalize-branch's Step 1 commit before
    Step 2's decline paths are reached.
  - sweep-project: Cycle Path landed dates when branches fast-forward;
    `find … # by slug` has no slug filter; it refers to text output an agent
    never sees; terms vary (candidates, selection, refs, sample; rung 1 is used
    before it is defined); `backlinks` as evidence for single-file items.
  - CLI: `view cycle` reports `closable: yes` for a closed cycle and prints no
    lifecycle in text; `help new` does not say `<name>` is optional for
    fixed-name owned types; `help set` does not mention exit 6.
  - SCHEMA's `backlog / ready → active` row does not name the investigator.
  - finalize-branch Step 4 derives the new item's slug from the branch, with no
    rule for a slug already taken, or for a re-run after Step 6 set it `done`.
  - sweep-project's Cycle Path has no route for abandoning a cycle with open
    items, or for closing or abandoning an empty one.

## Definition of done

- [ ] Each gap above is fixed or deliberately left, with the reason recorded.
