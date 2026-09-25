---
type: playbook
title: Fixing Consumer Feedback Playbook
description:
  Working a batch of issues a consuming project filed, so each claim is
  reproduced and each proposed fix judged before anything is scoped.
tags: [feedback, process]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-25 }
---

# Fixing Consumer Feedback Playbook

## Goal

A batch of issues from a consuming project turned into fixes that address the
real defect, each landed separately, with the consumer's run then passing.
Applies when a consumer files issues or friction after running a migration or a
skill.

## Steps

1. Reproduce each reported claim on this repository's code before scoping
   anything, with a fixture that shows the defect.
2. Judge each proposed fix separately from its claim. A real defect often
   arrives with a wrong fix — a pattern list that misses shipped files, a grep
   that matches the reporter's own workaround.
3. Record a verdict per issue — confirmed, confirmed as an effect but
   misdescribed, refuted — in the item that tracks the batch.
4. Land one commit per issue, each with the test that fails before it.
5. Judge owned code by the strictest consumer's settings: if a consumer's flag
   exposed the defect, adopt the flag here so CI witnesses the class.
6. Before closing, ask the consumer (or rerun their path) to confirm the fixed
   layer passes their own gate.

## Verification

- [ ] Every issue has a reproduction and a verdict before its fix was scoped.
- [ ] Every proposed fix that was not adopted says why.
- [ ] Each fix commit's test failed before the fix.
- [ ] The consumer's gate passes on the fixed layer (their CI run or a rerun
      recorded in the session).
