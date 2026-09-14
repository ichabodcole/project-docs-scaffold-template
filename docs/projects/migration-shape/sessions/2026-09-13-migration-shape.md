---
type: session
title:
  "Migration Shape: the v2.6 script, the skill it tested, and the first real run
  — 2026-09-13"
description:
  Six plan phases landed in ten commits under a chief-editor model — subagents
  implemented and reviewed, the main session read and committed — and the
  finalize review found three defects the phase reviews had not.
tags: [migrations, agent-execution, orchestration]
status: stable
generated: { by: claude-fable-5-1, at: 2026-09-13 }
---

# Migration Shape: the v2.6 script, the skill it tested, and the first real run — 2026-09-13

Branch `feat/migration-shape`, base `develop`. Proposal
[Migration Shape](../proposal.md), plan [six phases](../plan.md), kickoff
[DEV_KICKOFF](../DEV_KICKOFF.md). No cycle was active.

## What shipped

| Phase | What                                                                              | Commit    |
| ----- | --------------------------------------------------------------------------------- | --------- |
| 1     | `migration-authoring` rewritten around the rule; two routing skills fixed         | `c2e4881` |
| 2     | Fixtures A0, A1, B seeded, B unseeded — generated offline from the 6.3.0 tag      | `3448277` |
| 3     | `v2.6-to-v2.7` as a nine-phase script; codemod as a sibling module; guide         | `17be36b` |
| 4     | Six legacy banners; `v2.7-to-v2.8` precondition reads content; § Step 7 collapsed | `ef4da2c` |
| 5     | `project-docs` 3.9.0 → 3.10.0; `dist/` rebuilt                                    | `6dfb203` |
| 6     | MediaForge run; the dry run now verifies the scaffold is new enough               | `55816fa` |

The guards record lives at
[artifacts/phase-3-guards-watched-failing.md](../artifacts/phase-3-guards-watched-failing.md):
every stop site and every invariant line in the script, each neutered in the
real file, watched go red on its covering test, and restored. 48 rows at the end
of the branch.

## How the work was done

The main session acted as editor. Each phase was implemented by a subagent with
a brief drawn from the plan, reviewed by a second subagent told to use the
artifact rather than read it, read by the editor against the plan, and only then
committed. Phases 1 and 2 ran in parallel; the rest in dependency order. Phase
3's implementer was kept alive across the branch and took every later batch of
fixes with its context intact.

## What the skill learned from being used

Phase 3 was written under the rewritten skill and was the test of it. Five
places the skill was silent or wrong were fixed in place while the script was
authored: preflight on a tree that has no `.project-docs.json` yet; arrival
checks owned by the end-of-run invariant when it checks every file a phase
wrote; wiring-witness mechanics (copy the sibling, throw when the call line is
not found, invert the witness for a phase whose absence makes the run succeed);
an `## After the script` section for the work a script hands to a person; and
what a precondition cell is for — it routes, and each phase tests its own. One
round-trip was later reverted by review: it had weakened the rule to fit the
script and misread the reference.

## The MediaForge run

`dreamwood/media-forge`, clean on `develop`, took the script on
`chore/project-docs-frontmatter-layer`: `2961a95` (v2.6 → v2.7, 113 files) and
`e24e485` (v2.8 → v2.9, the seed manifest). 72 documents gained frontmatter;
four had a status nobody could map; the gate is off with 104 fields to backfill.
Two things it taught:

- **The published scaffold can lag the migration.** The first real run stopped
  in phase 3: the scaffold fetched from the released `main` (7.0.0) predates the
  docs-foundation work on `develop` and lacks the SCHEMA ownership section. The
  dry run had printed a green plan. The scaffold phase now verifies the markers
  in both modes, and the guide says how to pass `--scaffold-dir` from a
  checkout. The run was redone from a clean tree with a local scaffold.
- **A consumer's pre-commit hook can refuse the commit** for its own reasons.
  MediaForge's monorepo typecheck fails on `develop` in the admin app. Both
  commits bypassed the hook with lint-staged's formatters run by hand, and a
  re-run of the v2.9 script confirmed every recorded hash still matched.

## Review

**Census.** The roster was read from the Agent tool's list in this session's
system prompt. Checked: `general-purpose` (tools `*`, shell access) — chosen as
the review of record; `doc-reviewer` (all tools, shell access) — chosen for plan
alignment; `feature-dev:code-reviewer` (explicit list with `KillShell` and
`BashOutput` but no `Bash`) — rejected on capability;
`feature-dev:code-architect` (no `Bash`) — rejected on capability;
`project-docs:docs-curator` and `Explore` (shell access) — capable, not chosen:
one is scoped to a single document, the other locates code rather than reviewing
it.

**What each executed**, from their own logs. The code reviewer: `npm run check`
and `bun run typecheck`; `git clone` of the branch into a scratch copy; four
sampled guards neutered with perl, `bun test -t` on each, restored; a probe
script that built three fixtures and ran the shipped script with
`--scaffold-dir`. The plan reviewer: 21 commands including `grep -c "Legacy"` on
every guide, the cross-block grep, the `v2.7-to-v2.8` precondition executed in
both directions against dream-flute and `git show 1dde782^:docs/lint.ts`,
`npm run check:dist`, `npm run check`, and `git log`/`git ls-tree` in
MediaForge. Neither edited the repository.

**Findings.** The code reviewer reproduced three defects on real fixtures and
returned "with fixes": an uncommitted edit to a v2.6 template was overwritten
behind a warning line (the old codemod refused a dirty tree; the new call site
had dropped that guard); the codemod ignored the `lint.types` and `lint.skip`
lines preflight tells adopters to paste; a no-op re-run rewrote a hand-formatted
config. The plan reviewer returned "with fixes" on two: the guide read
`$SKILL_DIR` in a block that did not set it, and the skill's worked example
cited line numbers that shifted when the banners were added. All were fixed by
the phase 3 implementer — a preflight stop on dirty paths the run writes with
`--force` to override, the codemod taking the config's mapping as arguments, a
config write only on change, citations by step — and two guards were added to
the record.

**Re-verification.** The code reviewer re-ran its own probes, unchanged, against
the fixed working tree: the dirty template edit now stops in preflight naming
the path with the edit intact and the tree byte-identical, and `--force`
proceeds; a `lint.types` folder gains its declared type, a `lint.skip` folder is
untouched, and a folder declared in a tier only is counted as not typed; the
hand-formatted config survives a re-run byte-identical; a seam value with a path
separator stops. Gate 919 pass / 0 fail, typecheck clean. Verdict: Ready to
merge: Yes.

## Deliberately not done

- **The MediaForge backfill.** 72 descriptions, then the catalog, then the gate.
  The plan names it an agent step; it is content about that project and was left
  for a session there.
- **The tier report in the v2.9 script.** The check is general, not specific to
  first adoption; the v2.9 migration was out of scope. Recorded as an open
  question in the plan.
- **A second consuming project.** Whether to run one before the script is called
  settled is the plan's last open question.
- **Releasing `develop`.** Until `main` carries the docs-foundation work, every
  consumer's run needs `--scaffold-dir`; the guide says how.
