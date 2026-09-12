---
type: lesson
title: A guard must be able to fail
description:
  A check that cannot report failure certifies whatever it is pointed at; write
  the failing case first and watch it fail.
tags: [verification, agent-execution, tooling]
status: stable
generated: { by: claude-opus-5, at: 2026-09-12 }
---

# A guard must be able to fail

## Applies when

You add a check, a verification step, a test for a new rule, or a success
message — anything whose job is to report that something is wrong. The risk is
highest when you are writing the check for a defect you just fixed, because the
fix is fresh and the check looks obviously right.

Recognise it by shape, not by feel:

- a shell check that ends `&& echo "ok" || echo "STOP"` — it exits 0 either way
- a guard computed in one shell block and used in a later one — an agent runs
  each block in a **different process**, so the value is gone
- a count taken by pattern-matching a file rather than parsing it —
  `grep -c '": "'` on a JSON manifest matches its `version` line, so an empty
  one counts 1
- a test asserting the **absence** of a string that is absent under the buggy
  behaviour too
- a test that calls a function directly when the claim is that the function is
  **wired in**
- a success line printed unconditionally after a branch that may have done
  nothing
- a checklist item a correct run cannot produce, because a documented flag
  suppresses it

## Do this

**Write the failing case first and watch it fail.** Before trusting any new
guard, break the thing it guards and confirm the guard reports it. If you cannot
make it fail, it is not a guard.

For each one, ask which of these it is:

- **a test** — revert the implementation premise in a disposable copy, leave the
  assertion in place, and confirm the test fails. Restore. If the suite stays
  green, the test proves nothing.
- **a shell check** — make it `|| { echo "..."; exit 1; }`. An echoed string is
  not a result; the exit code is.
- **a claim about wiring** — neuter the call site, not the function. A unit test
  of a function never shows that anything calls it.
- **a count** — parse the structure and count its keys. Never pattern-match.

**Prefer a runtime assertion over a test** when the invariant must hold in
someone else's repository later. A test guards the invariant only while the test
exists and only where it runs; a check inside the program guards every run.

## Why

A check that cannot fail is worse than no check, because it reports success. An
absent check leaves a known gap; a broken one closes the gap on paper and stops
anyone looking.

This is easy to write accidentally and hard to notice, because nothing is red.
On the branch that produced this page the class survived **three** repair rounds
— four instances in the original artifact, two more authored by the repair
written to remove them, and three more in the redesign after that. Each round
fixed the specific instance and reproduced the general one. Every instance was
found by an adversarial reader or a perturbation, never by a passing suite.

The load-bearing example: swapping two phases whose ordering the entire feature
depended on left **592 tests passing and 0 failing**. The ordering had no guard
at all, and nothing said so.

## Related

- `.claude/skills/scaffold-update-checklist/SKILL.md` — its Final Checks call
  for a cold read, which is what catches the instances a suite cannot.
- [Migration Steps Must Be Uniformly Specific](./migration-steps-uniform-specificity.md)
  — the same failure one level up: one underspecified step becomes the failure
  point for a whole guide.
