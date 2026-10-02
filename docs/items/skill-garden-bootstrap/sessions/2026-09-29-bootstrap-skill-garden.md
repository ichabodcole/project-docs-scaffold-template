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

<!--
OWNERSHIP (of this template file — not of documents created from it): it is
yours to edit. The scaffold records its hash, so a migration updates it only
while you have not touched it. Frontmatter is the contract the lint enforces;
below it is yours. See docs/SCHEMA.md → "Who owns which file".

USAGE: `bun scripts/pdocs/cli.ts new session <topic> --owner feature/<slug>` (or
`item/<slug>`) writes this as sessions/YYYY-MM-DD-<topic>.md in the owner's
folder, dated today, and links the owner.

This is your dev journal - write what's relevant, skip what's not. Sessions are informal and flexible.
Focus on what stands out: deviations from plan, unexpected discoveries, what you would do differently.

Sessions serve two audiences:
1. YOU (or future you) - reflecting on what happened, capturing context for later
2. THE NEXT DEVELOPER - if someone takes over your work, this provides breadcrumbs to understand where
   you left off, what issues you hit, and what went off-plan

If everything went smoothly and there's nothing notable, you might only need a few lines.
If you wrestled with a complex bug for hours, write as much as helps capture what happened.

A step a future agent must follow does not stay here: add it, with its check, to
the playbook for that kind of work (docs/playbooks/README.md).

For more guidance, see the owner folder's README: ../../README.md
-->

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
