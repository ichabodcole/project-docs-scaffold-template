---
type: session
title: "Upgrade skill: zsh glob and audit order — 2026-10-03"
description:
  update-project-docs' verify snippets guard their globs for zsh, and the whole
  backfill comes before the v3.0 migration.
tags: [project-docs, migrations, skills]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-03 }
---

# Upgrade skill: zsh glob and audit order — 2026-10-03

Part of
[check and upgrade-skill fixes](../../../cycles/_archive/2026-10-check-and-upgrade-fixes.md).
One branch for two items: [the zsh glob](../item.md)
([#197](https://github.com/ichabodcole/project-docs-scaffold-template/issues/197))
and [audit lifecycle before v3.0](../../upgrade-audit-lifecycle-before-v30.md)
([#194](https://github.com/ichabodcole/project-docs-scaffold-template/issues/194)).

## Context

operator-mono's 2.6.0 → 9.4.0 upgrade hit two problems in update-project-docs.
Step 7's verify block globbed `tsconfig*.json` directly; in an agent's shell
(zsh, run through `eval`) an unmatched glob aborts the block, so the formatter
checks after it never ran. And the v2.7 guide put the `lifecycle` audit in its
"After the script" backfill, which a multi-hop run reaches after v3.0 has
already turned each `lifecycle` into a feature or item state.

## What Happened

- **The globs.** Step 7's tsconfig check finds the files first
  (`find . -maxdepth 1 -name 'tsconfig*.json' -exec grep …`). After review, the
  same fix went into the v2.7-to-v2.8 guide's three zsh-unsafe lines, one of
  which aborted the middle of its Verification block. The pre-2.6 legacy guides
  keep theirs: no current tree walks them.
- **The audit order, reversed by review.** #194 suggested auditing `lifecycle`
  before v3.0 and leaving descriptions until the end. Review found that v3.0
  copies a document's `description` into each item it creates, falling back to a
  title or a placeholder, and nothing reports a description that equals a title.
  So the whole backfill now comes before v3.0, whatever version the run started
  from. SKILL.md Step 4 says so; the v2.7 guide's backfill step opens with it;
  and the v3.0 guide's "Before you run it" has a new item, placed before "Commit
  or stash first" so its edits are committed before the preflight looks.

## Verification

- The Step 7 block ran every line in four generated projects (no tsconfig, a
  clean one, a `tsconfig.build.json` reaching `scripts/`, a monorepo) under zsh
  and bash, as files, through `-c`, through `eval`, and pasted into the agent's
  own shell. Only the last reproduces the original abort; `zsh -c` does not.
- The v2.7-to-v2.8 lines ran to the end in the agent's shell in a repo with no
  matches.
- `pdocs report --format text` lists a missing description on a scaffold 8.1.0
  tree, so a run starting at 2.8 or 2.9 has the command it is told to use.
- The gate passed on every commit, with 1,587 tests.

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

**First pass: "With fixes".** It ran the Step 7 block in every shell mode above,
scanned every bash block in the skill and its guides for unguarded globs, read
the four migration scripts' preflights (none refuses a missing description while
`adopting` is true), and ran the gate (1,587 pass). Its findings: the lost
descriptions, the v2.7-to-v2.8 globs, no pointer from the v3.0 guide, and
wording that left out runs starting at 2.7–2.10. Cole approved all four; the
legacy guides were left alone.

**Second pass, on the fix commit: "Ready to merge: Yes".** It replayed the new
lines in the agent's shell, cold-read the wording for runs from 2.6 and from 2.8
or 2.9, ran `report` on an 8.1.0 tree, and ran the dist and mirror checks. Its
two on-path nits, the new item's position after "Commit or stash first" and a
missing `--format text`, were fixed in one commit, checked by the gate.

---

**Related Documents:**

- [Guard the tsconfig glob in the upgrade's verify snippet](../item.md)
- [Audit lifecycle before v3.0 in a multi-hop upgrade](../../upgrade-audit-lifecycle-before-v30.md)
