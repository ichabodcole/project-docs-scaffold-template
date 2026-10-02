---
type: session
title: Template-header warning — 2026-10-02
description:
  pdocs check warns when a filled document keeps its template's header comment,
  every template says to delete it, this repository's 21 leftovers are removed,
  and check:mirror now fails on a stale seed hash.
tags: [pdocs, templates, lint]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-02 }
---

# Template-header warning — 2026-10-02

Part of
[pdocs work views and advisories](../../../cycles/2026-10-pdocs-views.md)

## Context

`pdocs new` copies a template's header comment as guidance for filling the
document, and agents often left it in. Cole chose to keep copying it, to have
the header say to remove it, and to have `check` warn. This item was the first
started under the [review rule](../../pdocs-draft-review-advisories/item.md). It
was already `stable`, so the start produced no advisory.

## What Happened

- **Every template gets the line.** All 15 templates, here and in the payload,
  gain `ONCE WRITTEN: delete this whole comment block from the document.` The
  seed hashes are refreshed.
- **`pdocs check` gets a `template-header` advisory.**
  - It is a warning: exit 0, printed after the verdict, and in JSON
    `advisories`.
  - It lists each non-template document whose HTML comment opens with
    `OWNERSHIP (of this template file`.
  - Templates, `lint.exclude`d files and `lint.skip` folders are never reported.
  - Only `check` reports it.
- **The match ignores the line inside code.** After review, `blankCode` blanks
  fenced, indented and inline code before matching, so a document that shows the
  header as an example is not reported. `stripCode`, which the link checker
  depends on, was left alone.
- **Cleanup.** The spec counted 23 documents; by the time of this work 22
  matched the bare text, and one of those (this item) only quotes it. So 21 were
  cleaned, each losing only the block and one blank line. finalize-branch now
  says to delete the header rather than keep it.
- **Seed hashes are checked.** `ITEM.template.md`'s recorded hash had been stale
  since the draft-review landing, and nothing could catch it. `check:mirror` now
  fails when a hash in `.pdocs-seed.json` is not its file's, and prints a
  refresh command.

## Verification

- `template-header-advisory.test.ts` has 22 tests. They run the real CLI and
  unit-test `hasTemplateHeader` on code and real-header cases, including CRLF,
  two blocks, and a header after code. They also cover templates, excluded and
  skipped paths, and the exit code and text/JSON parity.
- Mutations of the template exclusion, the `<!--` anchor, each code-blanking
  branch and the `lint.skip` walk all fail tests.
- The gate passed with 1,576 tests, and `tsc` is clean. On this repository,
  `pdocs check` is clean, with no advisory.

## Review

Census, read from this session's list of dispatchable agent types (the Agent
tool's roster):

- **`general-purpose`** (Tools: `*`) has shell access. Chosen, briefed for this
  branch, as the review of record.
- **`feature-dev:code-reviewer`** lists Glob, Grep, LS, Read, NotebookRead,
  WebFetch, TodoWrite, WebSearch, KillShell and BashOutput, with no `Bash`.
  Rejected on capability.
- **`code-simplifier:code-simplifier`** and **`project-docs:docs-curator`** (All
  tools) have shell access. Rejected on fit.

**First pass: "With fixes".** It ran:

- match edge cases on real trees;
- every template location, config variants, and the composition with other
  advisories and `adopting`;
- develop-vs-branch output with `cmp`;
- a hunk-by-hunk check of the cleanup commit;
- sha256 checks of all seed entries, and their history;
- a reading of the migration and seed logic;
- four mutations;
- the gate (1,561 pass).

Its findings:

- the header was matched inside code fences and inline code;
- no test covered `lint.skip`;
- no gate checks the seed record.

Cole approved all three, including the seed check now rather than as a
follow-up.

**Second pass (the two fix commits): "Ready to merge: Yes".** It ran:

- a 17-case probe of `hasTemplateHeader`;
- the seed check, failing and then refreshed;
- the timing of `check:mirror`;
- four mutations;
- the gate (1,576 pass).

Its optional leftovers are filed as
[template header and seed check polish](../../template-header-and-seed-check-polish.md).

---

**Related Documents:**

- [Warn when a filled document keeps its template header](../item.md)
