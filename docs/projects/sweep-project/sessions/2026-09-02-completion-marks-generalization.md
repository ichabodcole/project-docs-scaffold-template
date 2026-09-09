---
type: session
title: "Completion marks generalization and cold-read hardening — 2026-09-02"
description:
  Generalized checkbox-hunting into reading completion marks in whatever idiom
  the document already uses.
status: stable
generated: { by: unknown, at: 2026-09-02 }
---

# Completion marks generalization and cold-read hardening — 2026-09-02

## Context

Follow-on work to the 3.2.0 closure touchpoint recorded in
[the implementation session](./2026-08-07-sweep-project-implementation.md). That
build landed with a stance derived from dogfooding — "checkbox state is not
evidence of completion" — and this session revised it, then hardened both skills
against two rounds of review. Shipped as project-docs 3.3.0.

The [plan](../plan.md) is not the plan for this work. It covers the 3.2.0 build,
is `Status: Completed` with 41/41 items marked and a reconciliation note, and
accurately records what those six phases delivered. Rewriting its body to
describe a later revision would make the record wrong rather than current, so it
was deliberately left alone. This session document is the trace for 3.3.0.

## What Happened

**The stance changed twice, both times from user correction.**

First: absence of marks is not merely inert drift. If the work shipped and the
plan says nothing, the documentation half of the project was skipped — a gap to
close, not evidence that nothing happened. That inverted how the skill reports
an unmarked plan.

Second, and larger: the whole model was too checkbox-specific. Plans track
completion in whatever idiom their author chose — a `**Status:**` line, a
per-phase annotation, an inline addendum under a finished step, or plain
past-tense prose. The rule is not "look for `- [x]`" but "read the document
before deciding it has no marks," and write updates back in the idiom already
there. Scanning for checkboxes, finding none, and reporting "no completion
signals" is now named as its own failure mode.

The verification model changed with it. The previous turn's position —
corroborate every mark against a shipped artifact — was too expensive; the
user's framing was "trust but check," sampling rather than re-deriving. That
became a deterministic rule: sample three load-bearing marked claims, all hold →
accept the set, any fails → verify everything and report the failure as a
finding.

**Then two review rounds, and the reviews found more than the writing did.**

A documentation reviewer and an execution-capable reviewer ran in parallel
against the net diff. Between them they returned twelve defects. The pattern
from the 3.2.0 session held exactly: every serious finding came from executing
something or from a zero-context reader, never from careful re-reading by the
author.

The two that mattered most were both **silent, permissive failures** — checks
that pass while doing nothing:

- `finalize-branch` Step 8's sha scan had no repo-root anchor. `git grep`'s
  `'*.md'` pathspec resolves against the current directory, so a run from a
  package subdirectory searches only that subtree and reports zero citations —
  in the one guard standing between a SHA-cited ruling and the squash that
  destroys it.
- `sweep-project`'s backlog discovery required a literal `backlog/`, which is
  the one thing backlog references rarely contain. Items are flat siblings, so
  `README.md`, `INDEX.md`, and neighbouring items link them as `./<name>.md` or
  bare `<name>.md`. A fixture index holding two live links reported zero.

Both were verified by building fixtures and watching them fail before and pass
after.

**A defect I introduced and the review caught.** Fixing the sha scan to read
`HEAD^` made the skill's own Steps 4–6 output structurally invisible to it — at
which point a sentence I had written telling the executor to "repoint those
citations at the squashed commit" became dead, and directly contradicted the
Step 6 note explaining why they can't be seen. Both sentences were in the same
diff.

**A false claim in my own changelog.** I had justified adding `./<name>/` to the
discovery pattern as a fix for links "`docs/projects/README.md` prescribes,"
describing a harm that could not have occurred: no such live link exists in the
repo, and the README prescribes `./` only for the _archived_ target. The pattern
addition is still right — it is load-bearing for the recovery path — but the
changelog was overstating a defensive change into a bug fix, and was corrected.

**The landing policy turned out to be unreachable.** Both the review and the
Step 8 run found it independently: `AGENTS.md` said never to squash a branch
carrying "more than one distinct author/attribution trailer," and this repo
mandates a `Co-Authored-By: Claude …` trailer on every commit — 164 of 408 on
`develop` carry one. So every branch tripped the veto and "default to a
single-commit squash" described a branch the repo cannot produce. A mid-branch
model change (`Opus 4.8` → `Opus 5`) counted as a _third_ contributor.

The user's ruling was to stop generalizing and name the real case: this is about
an Anthill team where multiple seats each sign their own commits, and a squash
erases who did what. It is a fact about the branch, not the project — an Anthill
project on which only one seat committed squashes normally. The policy and the
skill's check were both rewritten to count distinct `Anthill-Seat:` trailers and
distinct human authors as separate lists, ignoring AI co-author trailers
entirely. Fixture-verified across four cases: solo, mid-branch model change, one
seat, two seats.

## Notable Discoveries

- **A check that fails open is worse than no check.** Both high-severity
  findings were guards that reported success while inspecting nothing. Neither
  would ever surface as an error; both would simply let a destructive action
  through. Worth biasing future review prompts toward "which of these checks can
  pass without having looked?"
- **The skill knew the lesson it violated.** `sweep-project` spends a paragraph
  on `git -C "$ROOT"` and why a bare path silently misbehaves from a
  subdirectory. The `finalize-branch` block written in this same change didn't
  apply it. Stating a hazard in one file does not transfer it to the next.
- **A rule that never permits anything is a rule nobody reads.** The landing
  policy had been in place and every run presumably worked around it. Rules
  whose exception swallows their default are a category worth watching for.

## Changes Made

- `plugins/project-docs/skills/sweep-project/SKILL.md` — completion-mark
  generalization; Step 2 split into 2a (judge) / 2b (write back); deterministic
  sampling with an artifact-assertion filter; backlog discovery pattern; Step 5a
  collision carve-out; rung 1 for docs-only projects; **Example** promoted to
  classification question 1.
- `plugins/project-docs/skills/finalize-branch/SKILL.md` — Step 6 reconciliation
  performed rather than surfaced, carved out of the confirmation gate; Step 8
  sha scan anchored at the repo root and reading `HEAD^`; seat-based identity
  check; caller-identity handshake when delegating to `sweep-project`.
- `AGENTS.md` — `## Branch Landing Policy` rewritten around the Anthill case.
- `plugins/project-docs/README.md` — 3.3.0 entry.
- `docs/backlog/2026-09-02-*` — two deferred findings captured rather than left
  as verbal intent.

## Lessons Learned

Dispatch the execution-capable reviewer, not just the reading one. The
documentation reviewer returned two findings; the reviewer that built fixtures
returned ten, including both silent-permissive failures.
`feature-dev:code-reviewer` still lacks `Bash` and would have caught neither.

## Follow-up

- [Reference boundary gaps](../../../backlog/2026-09-02-sweep-project-reference-boundary-gaps.md)
  — backtick, period, and comma terminators are missed by the Step 3 pattern.
- [`_archive`-internal link exception](../../../backlog/2026-09-02-sweep-project-archive-internal-link-exception.md)
  — the carve-out escapes the four-bucket invariant and correctness grep 2.
- `sweep-project` still has no rule for detecting invocation _by_ itself on a
  resumed run, only by `finalize-branch`.

---

**Related Documents:**

- [Plan](../plan.md) (covers 3.2.0, not this work — see Context)
- [Proposal](../proposal.md)
- [3.2.0 implementation session](./2026-08-07-sweep-project-implementation.md)
