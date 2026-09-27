---
type: session
title: finalize-branch rows and born items — 2026-09-27
description:
  finalize-branch now catches branch SHAs cited in the session record, commits a
  dirty tree before review, and formats docs before committing; this
  repository's born items were checked and all stay done.
tags: [finalize-branch, feedback, wocky-talky]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-27 }
---

# finalize-branch rows and born items — 2026-09-27

Part of [v9 rollout feedback](../../../cycles/2026-09-v9-rollout-feedback.md).
Branch `fix/finalize-branch-wocky-rows`. Rows 1–3 of [this item](../item.md),
which completes it; rows 4–5 landed with
[the pdocs output session](./2026-09-26-pdocs-output-and-placeholder-lint.md).
It also closes
[review the live born items marked done](../../review-born-items-marked-done.md).

## What landed

- **Row 1:** `finalize-branch`
  - Step 4 cites branch work by what it did, not by SHA, whenever the landing
    squashes or may.
  - Step 8 keeps its veto scan on `HEAD^` and adds a second loop over the lines
    Step 7's commit added, reported as "reword before squashing", never a veto.
  - Both loops search a seven-character prefix of each full SHA, so a citation
    of any length is found whatever `core.abbrev` says.
  - The coordinator hit this problem landing the previous branch. The session
    record cited two branch SHAs, and only a hand-run `HEAD` scan caught them.
- **Row 2:** with no commits and a dirty tree, commit the code before the
  review.
- **Row 3:**
  - Step 7 formats every changed file under the docs root after the last `pdocs`
    write, before the documentation commit. The file list is NUL-separated, and
    it runs `npx --no-install prettier`, so a project without Prettier is told
    so rather than handed a downloaded one.
  - `pdocs new` ends its text output with a next step naming the formatter and
    every file it wrote, promotions' rewrites included. Its first real use was
    creating this session.
- **Wording:**
  - Leaving the template's `tags` now fails the lint.
  - The handoff command passes `--title`, `--description` and `--tags`.

**Born items:** a read-only review checked all 16 live `done` items the
migration created: 10 from project folders and 6 research items from
investigations. The evidence was their plans, sessions, git history and the
shipped code. All stay `done`, and every follow-up they raise was filed, shipped
or deliberately left out. One stale comment was corrected: the
`provide-feedback-skill` brief said nothing was built, though it shipped as
report-issue and was renamed on 2026-06-30. A second suspected cleanup, a
`lifecycle:` line in a write-up, was a YAML example in the body and was left
alone.

## Review

Roster read from the Agent tool's dispatchable types in this session:

- `general-purpose` (tools `*`): chosen.
- `feature-dev:code-reviewer`: rejected on capability, having `BashOutput` and
  `KillShell` but no `Bash`.
- `Plan`: not needed for a three-row spec.

**First review: With fixes.** Its log:

- a clone and 106 `new` tests;
- the Step 8 block run verbatim in a temp repo, in bash from the root and zsh
  from a subdirectory: "the veto loop reports only C1 … the second loop reports
  only C2";
- the Step 7 snippet run with modified, new, renamed, deleted and spaced paths,
  and in a repo without Prettier;
- two neuterings of the `pdocs new` hint, each failing its test.

It found two blocking faults in the format snippet: paths with spaces split, and
`npx` silently downloading Prettier. It also noted that `%h` could be longer
than a seven-character citation, and that `-G` matched removed lines. All were
fixed.

**Re-review: Ready to merge: Yes.** Its log:

- both blocks copied literally from the skill, run in bash and zsh from a
  subdirectory;
- citations of 7, 9 and 40 characters, with `core.abbrev=9`;
- a reworded pre-existing citation (no longer reported);
- a deleted file and a two-hunk file;
- the snippet with and without Prettier: "npx canceled due to missing packages …
  Nothing is downloaded and no file changes".

Its two wording nits were fixed afterwards and not re-reviewed.

The consumer's own reply on the channel preferred Step 4's rule to the scan
alone: "'Cite branch work by description, not SHA, when the policy is squash' is
the better fix for #1."

---

**Related Documents:**

- [wocky-talky feedback, round 1: the first work cycle on 9.0](../item.md)
