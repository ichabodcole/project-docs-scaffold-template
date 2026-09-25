---
type: playbook
title: Writing Migrations Playbook
description:
  Writing or changing an update-project-docs migration — a script, its tests and
  its guide — so every guard can fail and a consumer's agent can run it unaided.
tags: [migrations, process]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-25 }
---

# Writing Migrations Playbook

## Goal

A migration a consumer's agent runs with none of your context: every check can
fail, every step a person must take is a numbered step, and the script reaches
the same result however often it runs. Applies to any change under
`plugins/project-docs/skills/update-project-docs/migrations/`; the shape itself
is `.claude/skills/migration-authoring/SKILL.md`.

## Steps

1. **Write each guard's failing case first and watch it fail.** Break the thing
   the guard protects in a fixture, run the script, and see exit 1 with the
   reason. If you cannot make a guard fail, it is not a guard — redesign it.
2. For a test, revert the premise it tests in a disposable copy and confirm the
   test goes red; restore. A suite that stays green proves nothing.
3. For a claim that something is called, neuter the **call site** in a
   disposable copy of the script and expect the end-to-end run to fail. A unit
   test of a function never shows that anything calls it.
4. Make every shell check `|| { echo "…"; exit 1; }`. An echoed word is not a
   result; the exit code is.
5. Count by parsing the structure (`Object.keys(JSON.parse(…))`), never by
   pattern-matching (`grep -c`).
6. Prefer a runtime assertion inside the script over a test for any invariant
   that must hold in someone else's repository: the test only guards where it
   runs.
7. Give every step of a guide the same specificity. Provide the artifact — the
   exact before and after text, the block to insert — never a description of it.
   One step that describes intent is where an agent's output drifts.
8. Put every action the consumer must take before the run in a numbered
   `## Before you run it` step. Never in a parenthetical: advice placed there is
   advice not given.
9. Build each migration's test scaffold from its own release tag
   (`git archive <tag>`), and pin the script's own fetch to that tag (plan D16):
   the working tree moves on to layouts an older script never saw.
10. Derive owned-file diffs between the fixture trees; never pin them.
    release-please rewrites `scripts/pdocs/cli.ts` on every release.
11. Tell the consumer that their own pre-commit hook may refuse the migration
    commit for reasons unrelated to it (a formatter over the owned files, a
    coverage ward), and what to do about each.
12. Test re-running after every kind of stop, uncommitted: a re-run must finish
    what the stop left, and never write over an edit made since.
13. Follow every recovery instruction the script or guide gives, literally, on a
    fixture that also holds unrelated uncommitted work and untracked files.
    Recovery advice must be reversible and scoped: stash, never a whole-tree
    `git clean` or `git checkout -- .`, and name how to restore untracked files
    (`stash@{0}^3`).

## Verification

- [ ] Each guard in the script has a test asserting exit 1 and its reason text.
- [ ] Each phase's call site, neutered in a copy, turns a test red.
- [ ] `grep -n '&& echo\|| echo' <guide>` finds no check that exits 0 on
      failure.
- [ ] Every action the guide asks of the consumer before the run is a numbered
      step under `## Before you run it`.
- [ ] The test's scaffold comes from a `git archive` of the release tag, and the
      script's cookiecutter call carries `--checkout <that tag>`.
- [ ] No test lists `scripts/pdocs/` files as a literal expected diff.
- [ ] Following each recovery instruction literally on such a fixture loses
      nothing, and the message test asserts it names no whole-tree clean.
