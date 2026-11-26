---
type: item
title: Close the gaps a cold read found in project-summary
description:
  A reader with no context finds places in the project-summary command where
  refresh mode, the old-scaffold fallback and its shell commands lead an agent
  wrong.
status: draft
lifecycle: triage
id: 01a1f744-1e7b-76e3-9d43-a45da9e67e3c
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-19 }
from: 01a1040e-e8ee-70cb-9eca-129f9d0d01ff
---

# Close the gaps a cold read found in project-summary

A fresh agent read `plugins/project-docs/commands/project-summary.md` on
2026-11-19, ahead of the 9.4.2 release, and ran its read-only commands in this
repository under zsh. Nothing blocks the command outright. These are the places
it found where an agent following the text is likely to go wrong. Almost all
predate plugin 4.6.0.

**Refresh mode cannot tell what is new.**

- "A new feature in `docs/features/`" points at `pdocs view board --features`,
  which shows the current state only. No baseline is named.
- "New file in `docs/architecture/` or `docs/specifications/`" has no command,
  and the only list in hand is of touched files, so an edited page reads as new.
- `git rev-list -1 --before=…` prints nothing on a young or shallow repository,
  and the commands that take its result then fail or mean something else.
- `git ls-tree --name-only HEAD` lists files as well as directories, so a new
  root file reads as a structural shift.
- `git log --since="<date>"` and the 23:59 baseline disagree about commits made
  on the summary's own day.
- No instruction covers a summary with no `Last Updated` line.

**The old-scaffold fallback is partial.**

- It covers `pdocs` commands only. The session-note `find`, the refresh buckets
  and the new-feature check stay hardcoded to `docs/features` and `docs/items`,
  so on a pre-9.0 tree the agent is told there are no session notes.
- It covers a missing CLI and `unknown command` (exit 2), but not a missing
  `bun`, exit 5 (no docs root) or exit 1.
- "Work folders" is not defined, and an older tree may have no `lifecycle` field
  to read state from.

**Subagents and steps.**

- An explorer is told to run `pdocs view board --features` but never sees the
  file that defines `pdocs`.
- After dispatching explorers, the text still lists Steps 3 to 5 in full without
  saying whether the orchestrator performs them.
- The checks that apply "in both modes" conflict with refresh mode's "preserve
  verbatim" rule when a check shows a trusted section is wrong.
- `--refresh` with no existing summary, and `--full` skipping the announcement,
  are resolved only by reading order.

**Shell commands.**

- The session `find … -exec ls -t` sorts by file time, which after a clone is
  checkout time: here a September note sorted ahead of three from November. It
  also picks up archived sessions.
- `find . -type f … | head -100` returns the first 100 files in traversal order,
  mostly tool folders here.
- Two `sort | uniq -c` pipelines lack the blank-line filter the others have.

**Terms and the template.**

- The board lists `done` and `dropped` work too, and prints JSON off a terminal;
  "live", "open" and "in flight" are used without saying which set each means.
- "Active Features" has two definitions, and research "not yet `done`" read
  literally includes `dropped` and `triage`.
- The output template's inner code fence closes its outer one, its tree is
  collapsed onto one line, and that tree still says `projects/`.
- The frontmatter key is `allowed_tools`, where Claude Code reads
  `allowed-tools`, and it lists `Task`.

## Definition of done

- [ ] Refresh mode names the baseline each "new" check compares against, and
      says what to do when the baseline commit or the last-updated date is
      missing.
- [ ] On a tree without the 9.0 layout, the command does not report "no session
      notes" from a search of folders that tree does not have.
- [ ] The brief for an explorer subagent spells out the CLI command, and the
      text says who performs Steps 3 to 5 after a dispatch.
- [ ] Session notes are ordered by their dated filenames, not file time, and
      archived ones are left out.
- [ ] The output template renders as one block, with `features/` and `items/`.
- [ ] A fresh agent reads the changed command and reports no likely misstep in
      the areas above.

## Related Documents

- [Guard project-summary's session glob and view call](./project-summary-zsh-glob-and-old-cli/item.md)
