---
type: session
title: ground-in-project on an older CLI — 2026-10-03
description:
  ground-in-project falls back to the folder listing when the CLI refuses view,
  nudges toward update-project-docs, and lists sessions without a zsh-unsafe
  glob.
tags: [project-docs, skills]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-03 }
---

# ground-in-project on an older CLI — 2026-10-03

Part of
[check and upgrade-skill fixes](../../../cycles/_archive/2026-10-check-and-upgrade-fixes.md)

## Context

Grounding in media-forge, on scaffold 8.1.0 with plugin 4.4.0, Step 3's
`pdocs view board --features` failed with `unknown command`: the 8.x CLI has no
`view`, and the skill only fell back when the CLI was missing
([#202](https://github.com/ichabodcole/project-docs-scaffold-template/issues/202)).

## What Happened

- **The fallback covers a refused `view`.** Step 3 lists `docs/` and peeks at
  its work folders when the CLI is missing or refuses `view` (`unknown command`,
  exit 2: a scaffold older than 9.0).
- **A new nudge.** When the CLI refused `view`, the orientation ends with a line
  saying the tree's `pdocs` predates the work board and update-project-docs
  would migrate it. More than one nudge can now appear.
- **The session listing finds files.** `ls -t` over two globs aborts in an
  agent's zsh when a folder has no sessions: always on an 8.x tree, and on a
  fresh 9.4 tree too. It is `find … -exec ls -t {} +` now.

## Verification

- On an 8.1.0 tree, the CLI refuses `view` with the message the skill names, and
  the new listing prints nothing without stopping the commands after it.
- The gate passed with 1,587 tests.

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

**Verdict: "Ready to merge: Yes".** It walked Steps 1–3 in the agent's own shell
on a 9.4 tree with sessions, a fresh 9.4 tree, an 8.1.0 tree and a tree with no
CLI. The fallback and nudge fired on 8.1.0; the listing sorted across both
folders when mtimes were reordered; the old listing aborted on the fresh 9.4
tree and the new one did not. It checked the tags (`view` first ships in 9.0.0)
and that update-project-docs migrates an 8.x tree, and ran the dist check and
the gate (1,587 pass).

Two optional notes are left as they are: the listing does not look in an 8.x
tree's `docs/projects/*/sessions/`, which the fallback's folder listing covers,
and `ls -t` ranks by checkout time after a fresh clone. The same zsh glob in the
`project-summary` command is filed as
[its own item](../../project-summary-zsh-glob-and-old-cli.md).

---

**Related Documents:**

- [Fall back when the CLI has no view command in ground-in-project](../item.md)
