---
type: session
title: Bootstrap skill-garden — 2026-09-29
description:
  skill-garden was generated from the 9.2.0 scaffold, given the five plugins and
  its own marketplace, reviewed by an install test, pushed with main as its
  default branch, and installed by Cole.
tags: [extraction, plugins]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-29 }
---

# Bootstrap skill-garden — 2026-09-29

Part of
[Skill garden extraction](../../../cycles/_archive/2026-09-skill-garden.md). The
work happened in `~/Projects/skill-garden`
([github.com/ichabodcole/skill-garden](https://github.com/ichabodcole/skill-garden));
this is its record here, where the extraction is tracked.

## What Happened

Cole created the empty repository and made four decisions:

- a fresh history;
- a scaffold at 9.2.0, with the live items moved over;
- no openpackage build;
- a hard cut.

The work:

- **Generated** from the local `project-docs-scaffold-template-v9.2.0` tag with
  cookiecutter, so nothing was downloaded. The five plugin names are declared as
  lint scopes.
- **Copied** the five plugins from project-docs commit `ece3a03`, byte for byte
  apart from these edits:
  - each `plugin.json` names skill-garden as homepage and repository;
  - hivemind's README installs `@skill-garden` and says Digestify comes from
    Spellbook;
  - recipes' `create-recipe` clones skill-garden and reads the toolbox copy of
    the state-flow template through the cloned workspace. That is a change in
    behaviour, so recipes went 2.2.1 → 2.3.0.
- **Wrote** a `skill-garden` marketplace, a README, `AGENTS.md` and `CLAUDE.md`.
- **Recreated** three items there with fresh ids, the two HiveMind chores filled
  in from the skill audit's findings. They are `dropped` here with pointers.
- **Filed** in skill-garden's backlog: a license, the quality gates from the
  zed-biome-husky recipe, CI, per-plugin release-please, and a release-please
  recipe built from a survey of Cole's 13 existing configs.
- **Pushed** `main` first so it became the default branch the marketplace
  serves, then `develop`.

Cole installed hivemind, operator, recipes and toolbox from skill-garden, and
removed the project-docs-marketplace copies. agent-bridge wasn't reinstalled; it
stays available in skill-garden.

## Review

Census: the roster was read from this session's Agent tool listing.
`general-purpose` (all tools, shell access) was the review of record.
`feature-dev:code-reviewer` was rejected on capability (`BashOutput` and
`KillShell`, no `Bash`).

The review diffed every plugin file against `ece3a03` (only the intended edits
differed). `claude plugin validate --strict` passed on the marketplace and each
plugin. In a throwaway Claude config, all five installed from a clone at the
right versions. The scaffold matched a fresh 9.2.0 generation exactly. Verdict:
**Ready to push: Yes**. Its small fixes were folded into the unpushed first
commit: the template path through the workspace, hivemind's README, the README's
plugin table and history note, and an `AGENTS.md` rule allowing a skill to read
another plugin's files in a clone. It also warned that the first branch pushed
becomes the default, which is why `main` went first.

---

**Related Documents:**

- [Bootstrap skill-garden with the five plugins](../item.md)
