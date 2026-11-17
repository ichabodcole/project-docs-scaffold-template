---
type: session
title: project-summary session listing and old-CLI fallback — 2026-11-17
description:
  Replaced project-summary's unguarded session glob with a find that works in
  zsh, and told the command what to do when pdocs has no view verb.
tags: [project-docs, project-summary]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# project-summary session listing and old-CLI fallback — 2026-11-17

Part of
[Check fixes and board research](../../../cycles/2026-11-check-fixes-and-board-research.md).

## Context

`/project-docs:project-summary` listed session notes with two shell globs. zsh
refuses a command when a glob matches nothing, so the listing failed with "no
matches found" whenever either folder had no sessions. The command also had no
instruction for a tree whose `pdocs` predates the `view` verb.

## What Happened

- **Session listing.** Step R4 and full-rebuild Step 4 now use the `find`
  command `ground-in-project` uses. Run under zsh and bash on trees with no
  `docs/`, no sessions, sessions in one folder, and sessions in both: it lists
  newest first and prints nothing when there are none.
- **Old CLI.** One paragraph after the `pdocs` definition says what to do when
  the CLI is missing or refuses `view`: read the work folders directly, and tell
  the user `/project-docs:update-project-docs` would migrate the tree. The
  refusal was confirmed against the 8.1.x CLI (``unknown command `view` ``, exit
  2).
- **Plugin 4.6.0**, with a README history entry, the version cell in the v2.10
  to v3.0 guide, and a rebuilt `dist/`.

## Notable Discoveries

- **The fallback did not reach the explorer.** On a full rebuild the first
  `pdocs view` call is made by the Active work explorer, a subagent that never
  reads the command file. The review found this. The orchestrator now runs the
  call itself before dispatching, and briefs the explorer to read folders when
  it is refused.
- **Archived sessions are now listed.** The old glob matched one folder level,
  so `_archive/<slug>/sessions/` was skipped. The `find` matches at any depth,
  as `ground-in-project` does. Left as it is: work archived this week is recent
  activity.
- **Ordering can break past about 15,000 session notes**, where `find` splits
  the list across several `ls` runs. Not handled.
- **No agent was run through the command on an old tree.** The fallback is
  checked only as far as the refusal it keys on.

## Review

- **Roster:** the agent types this session can dispatch, as its Agent tool lists
  them.
- **Checked:** `general-purpose` (all tools, so it has a shell) and
  `feature-dev:code-reviewer` (its list has `BashOutput` and `KillShell` but no
  `Bash`, so it cannot run anything). The second was rejected on that ground.
- **Chosen:** `general-purpose`, briefed with the item's definition of done and
  the two precedent fixes.
- **What it ran:** `git diff develop..HEAD`; the old and new listings under
  `zsh -c` and `bash -c` in eight scratch trees, one with 9,003 files; the 8.1.0
  CLI extracted from its tag, with `view`, `find --kind` and two `new` calls;
  `npm run check:dist`, `check:version`, `check:mirror` and
  `bun scripts/pdocs/cli.ts check` (all exit 0).
- **Verdict:** with fixes. The one blocking finding, the explorer never seeing
  the fallback, was fixed after the review and the full gate was run again. It
  judged `fix(project-docs)` the right commit type: the commit touches `docs/`,
  so release-please sees it, and `feat` would force a scaffold minor for a
  release where the scaffold gained nothing.

---

**Related Documents:**

- [Guard project-summary's session glob and view call](../item.md)
