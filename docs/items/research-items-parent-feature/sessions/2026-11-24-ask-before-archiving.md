---
type: session
title: Ask before archiving a feature's finished items — 2026-11-24
description:
  "pdocs view board now names the finished items to ask about before archiving,
  and four skills read that list, for issue #210."
tags: [pdocs, archive, skills]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-24 }
---

# Ask before archiving a feature's finished items — 2026-11-24

Part of [The work board](../../../cycles/2026-11-work-board.md).

## Context

Issue #210, under
[feature touchpoints](../../../features/feature-touchpoints/feature.md).
Archiving treated every `done` item alike. A finished item under an open feature
dropped out of the feature's view, and finished research left nothing open that
pointed at the build it recommended. The item had no plan; the implementer
designed it.

## What Happened

- **`pdocs view board` names the items to ask about.** Its JSON carries
  `data.askBeforeArchive`, always present, with two reasons: `open-parent` (a
  `done` item whose feature is not `done` or `dropped`) and
  `research-no-open-build` (finished research with no parent, or with no build
  item under its feature). Text output adds one line of counts.
- **The archive advisory repeats the list** and tells the caller to leave those
  items out of its selection and ask about each.
- **`pdocs archive` does not refuse.** After moving a listed item it attaches an
  `archive-question` advisory.
- **Four skills read the list:** `sweep-project`, `create-investigation`,
  `triage-items` and the `investigator` agent. Plugin project-docs is 4.7.0.

Decided against: a refusal in `pdocs archive` with an override flag, because the
CLI cannot know whether a write-up recommends a build; leaving held items out of
the archive threshold's count; and a separate always-on advisory.

Two boxes of the item were reworded at landing, with the user's approval, to say
what was built: box 3 (`sweep-project` holds; `pdocs archive` warns) and box 4
(`triage-items` proposes no parent, with a reason, for research that cannot end
in a build).

## Notable Discoveries

- **The first rule flipped research back once its build finished.** A build
  counted only while open, so research whose build was done read as "no build",
  and `sweep-project` would have offered to file it again. A non-research item
  under the same feature now counts in any state except `dropped`, archived
  included. The reason keeps its id, `research-no-open-build`.
- **The text line listed every ref.** In this repository it was 980 characters
  and 14 items on every board view. It now prints counts; JSON keeps the list.
- **This repository lists nine of its own research items**, all with no parent.
  Each leaves the list when it is archived.
- **The skills need a scaffold release that carries `askBeforeArchive`.** On an
  older `pdocs` each skill applies the two rules by hand.

## Review

- **Roster:** read from the agent types this session can dispatch.
- **Chosen:** `general-purpose` (tools `*`, so it has shell access), briefed
  against the item, the feature, the playbooks and the scaffold checklist, and
  told to report only.
- **Rejected on capability:** `feature-dev:code-reviewer`. Its tool list has
  `BashOutput` and `KillShell` but no `Bash`.
- **What it ran, from its execution log:** a generated project with 7 features
  and 18 items; every view verb in text and JSON at three thresholds, compared
  against `develop`'s CLI with `diff`, `cmp` and `jq`; `pdocs archive` on 12
  items in paired copies; a replay of `create-investigation`'s closing steps;
  `check:mirror`, `check:dist`, `check:version`, `format:check`,
  `npx tsc --noEmit`; the two changed test files (65 pass; 11 fail with the
  sources reverted); and the work board's tests.
- **Not run by the reviewer:** the full `npm run check`, and an end-to-end
  replay of `triage-items` or the `investigator` agent. Its skill walk-throughs
  were its own reading against the scratch project, not a separate agent's.
- **Verdict:** ready to merge with fixes. Two were blocking: the classification
  bug above, and box 3 claiming a guard that was not built. Both are resolved,
  with the reviewer's five text follow-ups: a false alarm in `sweep-project` on
  an item the user had just answered, the older-`pdocs` fallback, the scope of a
  narrow archive request, the thin-feature contradiction in `triage-items`, and
  the stale `create-project/references/pdocs.md`. The fixes were not reviewed a
  second time; the implementer re-walked three cases on the final text.

**Follow-up items:**
[sweep-project-description-over-limit](../../sweep-project-description-over-limit.md)
and
[parentless-research-outside-triage](../../parentless-research-outside-triage.md).

---

**Related Documents:**

- [Keep a feature's finished items in view until the feature is done](../item.md)
