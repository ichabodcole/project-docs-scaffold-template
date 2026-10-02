---
type: item
title: Fix the workflow gaps a cold read found before 9.4.0
description:
  Cold reads of the skills this cycle changed found contradictions and dead ends
  around the review rule, research items, gate detection and sweep-project's new
  paths; fix them before the release ships them.
status: stable
lifecycle: done
id: 01a0fc4c-c9cc-75ad-a9a9-4dc0dce05be3
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-02 }
---

# Fix the workflow gaps a cold read found before 9.4.0

Before the 9.4.0 release, three fresh agents with no context read the skills the
[pdocs views cycle](../../cycles/_archive/2026-10-pdocs-views.md) changed. They
found contradictions and dead ends an agent following the text would act on,
most of them in text that cycle added. These skills ship in 9.4.0, so they are
fixed first.

- **init-branch and finalize-branch, when the user declines review under
  strict.**
  - init-branch leaves the item unstarted. finalize-branch Step 0 then calls it
    "not from init-branch", which is false, and may lead to dropping it.
  - The item never gets its cycle: finalize-branch's join is refused under
    strict, and Step 6 adds `--cycle` only to items it created.
  - finalize-branch has dead ends when the user declines review. Step 3's check
    then fails with no stated way out: approve the item, or move it back.
- **The investigator agent.**
  - It closes to `done` an item it filed in `triage`.
  - "In either case" follows a three-row table.
  - "Ask clarifying questions" contradicts "you cannot ask the user".
  - It gives no instructions for an item it was handed.
- **create-investigation.**
  - It is unclear whether it researches or only frames.
  - The write-up's `status: stable` is a hand edit, because `pdocs set` does not
    cover write-ups, and the skill never says so.
  - It does not cover a user who stays silent or approves later.
  - Its reason not to start a draft is "strict would refuse it", so under warn
    an agent concludes starting is fine.
- **Commit-gate detection in update-project-docs.**
  - Any mention of "pdocs" counts as a gate, so a CI path filter silences the
    advice. Open the file it finds and confirm it runs `check`.
  - It does not say whether a CI-only gate counts, or whether to mention strict
    when a gate exists under warn.
- **sweep-project's Advisory and Audit Paths.**
  - Archiving first hides unreviewed drafts from `view unreviewed`, and nothing
    says which path to run first.
  - The Advisory Path archives without reconciling, against "reconcile always".
  - The selection examples assume an active cycle.
  - The Audit Path does not cover `deprecated` items, a wrong definition of
    done, or items with no sessions.
  - Step 6 and the acceptance criteria do not cover audit runs.
  - "Already authorized, don't ask again" conflicts with "show every live claim
    before anything moves".
- **The item template.**
  - It says only init-branch sets `active`, with no exception for a research
    item the user asked for.
  - Its status line reads as a hard rule, though only strict enforces it.

## Definition of done

- [x] Each finding above is fixed in the skill, agent or template that carries
      it, with the payload copy, the seed hash and dist in step.
- [x] init-branch and finalize-branch agree on what an unstarted strict-declined
      item is, and every decline path in both names its next step.
- [x] After the edits, each changed document is read in full, not only its
      hunks, so that no fix contradicts another passage in the same file or in
      the documents it links to.
- [x] The commit-gate snippet still finds this repository's gates, and finds no
      gate where a CI file only names `scripts/pdocs/` in a path filter.
- [x] A fresh cold read of the changed files raises no finding that would cause
      a wrong action.
- [x] The gate passes.
