---
type: session
title: Remove the extracted plugins — 2026-09-29
description:
  The five plugins that moved to skill-garden left this repository in a hard
  cut, and project-docs 4.3.0 routes feedback to whichever repository ships the
  component.
tags: [extraction, plugins]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-29 }
---

# Remove the extracted plugins — 2026-09-29

Part of
[Skill garden extraction](../../../cycles/_archive/2026-09-skill-garden.md).

## Context

The second half of the plugin extraction. The five plugins were already live in
skill-garden, and Cole had installed four of them from its marketplace. Cole
chose a hard cut: the plugins leave this marketplace in one change.

## What Happened

The five commits are typed so that landing them by fast-forward cuts no scaffold
release. release-please excludes commits confined to `plugins/` and `dist/`, and
hides `chore` and `docs`.

- **`docs`:**
  - Nine history pages linked directly to recipe files that are now gone; they
    link to the files' skill-garden copies.
  - The three items that moved to skill-garden are `dropped` here, each with a
    pointer, because the lint refuses a deleted backlog item.
  - The README's distribution table lists project-docs alone.
- **`chore(marketplace)`:** the marketplace lists project-docs alone.
- **`feat(project-docs)`:**
  - The five plugins leave `plugins/` and `dist/`.
  - project-docs goes to 4.3.0.
  - `provide-feedback` files each piece of feedback on the repository that ships
    the component.
  - The dist scripts needed no change: they discover plugins from the folders.
- **`docs`:** the manifesto describes one plugin and names where the others
  went, and the four scopes no remaining item uses are dropped.
- **`fix(project-docs)`:** `provide-feedback` offered a `docs` label that
  neither repository has, which predated this branch, and now names the one
  skill both plugins ship.

## Review

Census: the roster was read from this session's Agent tool listing.
`general-purpose` (all tools, shell access) was the review of record.
`feature-dev:code-reviewer` was rejected on capability (`BashOutput` and
`KillShell`, no `Bash`).

The review classified every remaining mention of the moved plugins, and none was
a live path that breaks. It checked every rewritten link against skill-garden's
`main` and over HTTP. In a throwaway Claude config, a clone of the branch
offered project-docs 4.3.0 alone. Reading release-please 17.11.2's source, it
confirmed the fast-forward proposes no release and a squash would propose 9.3.0.
It ran `check-dist`, `claude plugin validate --strict`, typecheck and the full
gate (1988 pass). Verdict: **Ready to merge, with fixes**.

The one fix that mattered: the first two commits each failed `pdocs check` on
their own. The broken links were fixed by the third commit, and the pre-commit
hook had passed only because it lints the working tree, which already held the
fix. The branch was rebuilt with the docs commit first, and each commit was
checked on its own. The smaller fixes followed as the last two commits.

## Next Time

A branch that splits one change across commits by type, for release-please,
should check each commit on its own, not just the tree the hook sees.

---

**Related Documents:**

- [Remove the extracted plugins from this repository](../item.md)
