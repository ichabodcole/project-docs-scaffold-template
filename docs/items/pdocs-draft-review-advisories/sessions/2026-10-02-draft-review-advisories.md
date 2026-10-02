---
type: session
title: Draft-review advisories — 2026-10-02
description:
  Started work and an active cycle's items need a reviewed document; pdocs
  reports unreviewed ones at five touch points, strict mode refuses the starts
  that introduce them, and the checks config section set is closed.
tags: [pdocs, advisories, review, status]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-02 }
---

# Draft-review advisories — 2026-10-02

Part of
[pdocs work views and advisories](../../../cycles/2026-10-pdocs-views.md)

## Context

Items are born `status: draft`, and SCHEMA said no workflow step moves status.
So finished work stayed marked unreviewed: 37 `done` items were drafts, and the
tree was clean. The item replaces that rule. A workflow sets `stable` after
showing the user the item's description and definition of done and getting their
approval, and pdocs reports work that started without one. It reuses the
advisory shape and the `checks` section from the
[archive advisory](../../pdocs-board-archive-advisory/item.md).

## What Happened

- **Design first.** The implementer wrote a design note before any code: the
  trigger states, the finding shape, the five touch points, strict mode, the
  audit path and every doc that states the old rule. Cole approved it with one
  change: a `[draft]` tag after the title in text views instead of a status
  column, so rows of `stable` items read as before.
- **The rule** (`advisories.ts`). An unarchived item whose `status` is not
  `stable` needs review when either:
  - it is started (`active` or `review`), with or without a cycle (`started`);
    or
  - it is unstarted and in the active cycle (`active-cycle`).

  `view ready` and a planned cycle's `view cycle` also list drafts as
  `on-start`, so review happens before work begins. `check` never counts those.

- **One advisory, `work-item-review`,** per touch point. It carries `mode`,
  `refs` and `items` with a reason on each, and its action tells the agent to
  show the content and set `stable` only on approval.
- **The touch points:**
  - `set` and `new` (through `review-guard.ts`);
  - `view cycle`, `view ready` and `view board`;
  - `check`.
- **`checks.workItemReview.mode`** takes `warn` (the default) or `strict`.
  - Strict refuses, with exit 6 and nothing written, a change that introduces a
    finding. A finding is introduced when the item needed no review before, or
    when an `active-cycle` item becomes `started`.
  - Strict lets through repairs, unrelated edits, and approve-and-start in one
    command.
  - Strict `check` adds `UNREVIEWED` rows and exits 9. SCHEMA says that where a
    hook or CI runs `check`, strict blocks the commit or fails CI.
- **Audit:** `view unreviewed [--all]` lists finished drafts (37 here).
  sweep-project gains an Audit Path that offers a batch and approves only what
  the user agrees to.
- **The `checks` section set is closed.** A misspelt `checks.workitemReview`
  left strict silently off, so Cole chose to close the set. An unknown section
  is BAD CONFIG, listing the known sections and suggesting the nearest one
  within two edits. Renames go through upgrade migrations instead.
- **Workflows:**
  - init-branch, dev-kickoff, finalize-branch, create-investigation, the
    investigator agent, generate-dev-plan, triage-items and sweep-project now
    show content and pass `--status stable` on approval.
  - finalize-branch creates its new item as a `triage` draft and moves it after
    approval. Each skill has a path for when the user declines.
- **Commit gate.** At Cole's request, update-project-docs now recommends a
  commit gate that runs `pdocs check` when none exists. It detects an existing
  one by following `npm`/`pnpm`/`yarn`/`bun` scripts through `package.json`, and
  finds hooks through git, so a gate behind `npm run check` counts.

## Verification

- `review-advisory.test.ts` and the updated view tests run the real CLI on temp
  trees. They cover:
  - each trigger and non-trigger, in both modes;
  - defaults, invalid config, and unknown and inherited section names;
  - cycle joins, and work outside cycles;
  - repairs, text/JSON parity, exit codes, and byte-identical trees after a
    refusal.
- The final gate passed with 1,554 tests, and `tsc --noEmit` is clean.
- On this repository, warn mode reports nothing, and `view unreviewed` lists 37.

## Review

Census, read from this session's list of dispatchable agent types (the Agent
tool's roster):

- **`general-purpose`** (Tools: `*`) has shell access. Chosen twice, as a dual
  review: one instance briefed on the code (the review of record), one on the
  docs and skills.
- **`feature-dev:code-reviewer`** lists Glob, Grep, LS, Read, NotebookRead,
  WebFetch, TodoWrite, WebSearch, KillShell and BashOutput, with no `Bash`.
  Rejected on capability.
- **`code-simplifier:code-simplifier`** and **`project-docs:docs-curator`** (All
  tools) have shell access. Rejected on fit.

**Code, first pass: "With fixes".** It ran:

- every touch point in both modes on scratch trees;
- 11 invalid configs;
- `diff -r` snapshots around refusals;
- a comparison of the text output against develop's;
- model-build counts;
- 26 mutations, 4 of which survived;
- the gate (1,541 pass).

Its findings:

- a `tsc` error in a test;
- wording that was false for active-cycle items;
- the strict loophole (starting an already-flagged item);
- four test gaps;
- extra model builds;
- a `new` refusal that pointed at `set`;
- bad-config wording;
- a misspelt section silently ignored.

**Docs, first pass: "With fixes".** It ran:

- the skills' commands against the real CLI in both modes;
- the gate-detection grep on this repo;
- greps for the old rule.

Its findings:

- the gate grep missed `npm run check` gates;
- the gate's effect was overstated for warn mode;
- the investigator contradicted itself;
- stale born-item text;
- out-of-order and dead-end steps when the user declines;
- the cycles README.

Cole approved all fixes and the closed section set.

**Re-reviews.** Three rounds each:

- **Docs:** the gate snippet under bash and zsh on this repo, on
  `core.hooksPath` repos, and on shorthand and no-gate repos; the declined paths
  walked against the CLI. It caught a wrong claim that strict blocks Step 7's
  commit, which was fixed.
- **Code:** loophole and repair cases; 11, then 10, then 9 mutations, all killed
  in the final round; clean-worktree gates. It caught inherited names such as
  `valueOf` escaping the closed set (fixed with `Object.hasOwn`), dotted section
  names missing from views, and three test gaps.

**Final verdicts: "Ready to merge: Yes"** from both.

Left as they are:

- `set` attaches `bad-config` on any edit;
- in the three-error case, the merged advisory and `check` list the issues in a
  different order;
- the bad-config kinds live in a module-level WeakMap. The reviewer judged it
  sound and guarded by tests, and noted they could instead be derived from the
  issues' keys.

## Follow-up

- [Template header left in documents](../../template-header-left-in-documents.md)
  is next in the cycle.
- The 37 finished drafts can go through the sweep-project Audit Path when Cole
  wants.

---

**Related Documents:**

- [Prompt for document review at work-start touch points](../item.md)
