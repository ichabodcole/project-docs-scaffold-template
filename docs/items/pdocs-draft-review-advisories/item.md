---
type: item
title: Prompt for document review at work-start touch points
description:
  Warn about unreviewed work at start touch points, with an optional strict
  policy that requires reviewed item documents.
status: stable
lifecycle: done
id: 01a0f8bb-50a6-7659-98ae-2fe01cfe16d4
kind: task
generated: { by: pdocs, at: 2026-10-01 }
scope: pdocs
cycle: 2026-10-pdocs-views
blocked_by: [01a0f8bb-5027-77cd-b8e5-13948e071aa0]
---

# Prompt for document review at work-start touch points

Work items begin with `status: draft`. The current contract explicitly says that
workflow steps never change an item's status. As a result, accepted and
completed work can remain marked unreviewed: on October 1, 2026,
`pdocs find --type item --status draft --lifecycle done` returned 37 records,
including the shipped Codex marketplace item. `pdocs check` reported the tree
clean.

The user agreed to advisory warnings at the following touch points, following
our [archive advisory](../pdocs-board-archive-advisory/item.md) pattern:

1. Starting a cycle: identify draft items already assigned to it.
2. Adding an item to an active cycle: check it when it joins.
3. Starting an individual item: check it even outside a cycle.
4. `view cycle` and `view ready`: expose status and outstanding review needs.
5. `pdocs check`: report relevant inconsistencies introduced through file edits.

Use a shared rule and structured finding shape so mutation commands, views,
checks, and calling workflows agree. Configure this check in
`.project-docs.json` alongside the archive threshold:

```json
{
  "checks": {
    "archive": {
      "threshold": 25
    },
    "workItemReview": {
      "mode": "warn"
    }
  }
}
```

`checks.workItemReview.mode` accepts `warn` or `strict`. Omission defaults to
`warn`, preserving the warning-first policy the user agreed to. Invalid explicit
modes are configuration errors rather than silent fallback.

- **Warn:** emit an actionable finding and allow otherwise valid starts and
  cycle joins. Advisory-only `pdocs check` runs keep a successful exit code.
- **Strict:** refuse a write that starts an unreviewed item, starts a cycle
  containing unreviewed unfinished items, or adds an unreviewed unfinished item
  to an active cycle. The required document status is `stable`. Evaluate the
  proposed state before writing, so a combined status/start update can succeed
  once the content has actually been approved. `pdocs check` fails for matching
  existing active-work violations introduced through direct edits or a policy
  switch. Keep read-only views usable; they report the finding and policy rather
  than refusing to show the affected work.

Do not add a global strict mode that changes unrelated checks. This makes future
ratcheting a per-project configuration change rather than a new CLI behavior.
Existing drafts outside started work and planned cycles remain valid. Historical
closed cycles and finished items are handled through a separate audit, not a
blanket requirement that rewrites earlier records. Strict mutation guards must
allow repairs to existing violations and unrelated valid edits.

An agent should present the affected item and its definition of done for review.
Once the user has reviewed and approved that concrete content, explicitly apply
`pdocs set item/<slug> --status stable`. Existing approval in the conversation
counts; do not request the same approval again. Starting a cycle or changing a
lifecycle must never silently mark an unseen document reviewed.

`status` continues to describe document trust and `lifecycle` continues to track
work progress. Update the schema, READMEs, templates, and affected workflows to
replace the current rule that workflow steps never move status.

## Definition of done

- [x] Define and document which work states trigger the review advisory,
      including unfinished members of active cycles and items started without a
      cycle. The required reviewed status is `stable`; deprecated documents
      cannot satisfy it.
- [x] `.project-docs.json` supports `checks.workItemReview.mode` with validated
      `warn`/`strict` values and a backward-compatible default of `warn`.
- [x] The five touch points report consistent, actionable draft-review
      advisories, including items added after cycle activation and direct file
      edits.
- [x] Board/cycle/ready presentation exposes enough status information to locate
      affected items; JSON includes stable advisory identifiers and affected
      references.
- [x] Warn mode preserves successful exit semantics for advisory-only checks and
      mutations. Strict mode refuses violating starts/cycle joins before writing
      and gives a failing check outcome for matching active-work violations.
      Existing validation errors continue to fail normally.
- [x] Read-only views remain usable in either mode and expose the effective
      policy; a combined approved status/start update and repairs remain
      possible.
- [x] Calling workflows act on the advisory by presenting concrete content and
      recording approved review with `status: stable`; they honor prior
      approval.
- [x] Draft creation and planned-cycle preparation remain supported; there is no
      automatic status promotion or blanket historical backfill.
- [x] Historical closed cycles do not generate an unbounded warning list on
      every check. Specify a separate audit path for old completed drafts.
- [x] Meaningful tests cover each trigger, both modes, defaults/invalid config,
      non-trigger states, later cycle joins, work outside cycles, text/JSON
      parity, exit behavior, and no writes on rejected transitions.
- [x] Schema, workflow, payload, and dist copies are synchronized; the full gate
      passes.

## Rollout policy

Ship with `warn` as the default. A project can opt into `strict` if warnings
fail to resolve the issue; do not change that project's policy automatically. A
draft marker prompts review, but does not prove that its content was never
reviewed in conversation.

## Related work

- [Archive advisory](../pdocs-board-archive-advisory/item.md)
