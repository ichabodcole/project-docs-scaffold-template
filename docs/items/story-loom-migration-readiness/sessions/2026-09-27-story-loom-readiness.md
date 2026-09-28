---
type: session
title: Story-loom migration readiness — 2026-09-27
description:
  A trial of the v3.0 migration on a clone of story-loom develop mapped every
  stop and problem; Cole chose five migration fixes to build first, and the plan
  was sent to story-loom's agent.
tags: [migrations, story-loom, research]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-27 }
---

# Story-loom migration readiness — 2026-09-27

Branch `chore/story-loom-migration-readiness`. Answers [this item](../item.md)
in [its write-up](../write-up.md), and opens
[the story-loom migration cycle](../../../cycles/2026-09-story-loom-migration.md).

## What happened

- **The trial.** A research agent ran v2.9→v2.10 and then v2.10→v3.0 (plugin
  4.1.0, scaffold 9.0.1) on a clone of story-loom `develop` at `d90a732f`. Cole
  asked for `develop` rather than `main`. The real checkout, which had work in
  flight, was never touched. Every stop and problem is catalogued with counts,
  causes and a proposed owner. With the stops resolved, the run completes at
  9.0.1 with a clean check.
- **The finding that changed the plan.** Story-loom's commit hook would refuse
  the migrated tree: 231 files fail `prettier --check`. The guide's format step
  would also corrupt 11 byte-exact canon files, because `.prettierignore` still
  names their old path.
- **Cole's decisions**, recorded in the write-up:
  - build migration changes 1–5 first, filed `ready` in the new cycle;
  - storyline-engine becomes an `active` feature;
  - the 2026-09-25 direction report is left for story-loom's agent to place.
- **The plan was sent to story-loom's agent** on the grapevine channel
  `project-docs-v9`: do not migrate until the fix release is announced, the pre-
  and post-run steps, and the report question.

## Review

Roster read from the Agent tool's dispatchable types in this session:

- `doc-reviewer` (All tools): chosen, the branch being documents only.
- `feature-dev:code-reviewer`: rejected on capability, having no `Bash`.

**Ready to merge: Yes.** Its log, on its own clone of story-loom at `d90a732f`:

- the storyline-engine proposal's filename and its 9 workstream plans;
- the slug-clash folder;
- the 11 canon files against `.prettierignore`;
- the `lint.exclude` glob and the 2 Slidev decks;
- the 15 root-relative `DEV_KICKOFF.md` files;
- the checkpoint, VP0 and `scripts/loom` reads of `docs/projects/…`;
- `pdocs check` with `_archive` unskipped: "exactly 235 MISSING FILE".

It did not rerun the v3.0 dry run. Its one discrepancy: 210 files with no
frontmatter where the write-up says 212, likely because it used story-loom's own
8.0.0 CLI. Nothing depends on that number.

---

**Related Documents:**

- [What story-loom's v3.0 migration will ask for](../item.md)
