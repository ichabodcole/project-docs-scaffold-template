# Branch Landing Policy: the shipped example had drifted from its implementation — 2026-09-02

## Context

Started as an audit question, not a task: had the recent `sweep-project` and
`finalize-branch` work actually followed `scaffold-update-checklist`? It had, on
every mechanical item — counts, version bumps, `dist/`, mirrors, Prettier, and
cold-read verification all checked out. The audit turned up one thing the
checklist's own items would not have caught.

Shipped as project-docs 3.6.0. Continues
[the 2026-09-02 reviewer-capability session](./2026-09-02-reviewer-capability-hard-gate.md).

## The finding

`update-project-docs` ships downstream projects an example
`## Branch Landing Policy` to adapt. That example still carried the 3.1.0 text —
never squash a branch carrying "more than one distinct author/attribution
trailer" — which `ca0bb1c` (3.3.0) had already replaced in this repo's own root
`AGENTS.md` for being unreachable: any repo mandating a `Co-Authored-By: Claude`
trailer trips that veto on every branch, so the stated default never applies.
Consumers were being handed the defect the repo had diagnosed and fixed for
itself three releases earlier.

**The mechanism is the durable part.** The convention was registered correctly
when introduced. What went unpropagated was the later _revision_: the fix landed
in the dogfooded copy and never reached the canonical one. Both guidance
documents covered only _adding_ a convention. The work that starts in
`AGENTS.md` — where nothing points back at the shipped copy — had no rule at
all.

## What shipped

- The example now matches what `finalize-branch` Step 8 computes: seat trailers
  and git author names as two separate lists, AI co-author trailers excluded
  from both, SHA scan scoped to markdown with the read-each-hit caveat.
- A new **Revising an Existing Root-Level Convention** section: update the
  shipped subsection in the _same commit_ as the `AGENTS.md` edit, and re-check
  it against the skill that consumes it.
- `scaffold-update-checklist` names that case in its trigger description and
  carries a "not mirrored, but still shipped" entry.
- Accuracy repairs in the same neighbourhood: the heading-level promise, Step
  2's false "each version transition" claim, Step 3's citation of a migration
  file that never existed, and "the table above" pointing at the wrong table.

## What this session got wrong, twice

Worth recording plainly, because both were caught by machinery this repo already
had rather than by care.

**A fix to a cold-read finding introduced a worse defect.** Closing a complaint
that `~20 commits` left larger branches undefined, the example gained _"Above
~20 commits, consolidating into a few logical chapters is usually the better
shape."_ Step 8 says the opposite — "commit count is a secondary signal; it
prompts the question, it doesn't answer it." A conditional gate became a
default, and the independence test vanished. **The step that catches this is
`Revising` item 2, and it shipped in the same commit as the defect.** Writing a
check does not run it.

**The guardrail was placed where its own failure could not reach it.** Review
found the new rule sitting as a checkbox under "Adding or Modifying a Plugin
Skill", in a skill whose triggers didn't name root `AGENTS.md` and whose
Mirrored Files section filed it under "not mirrored". A pure `AGENTS.md` wording
change — the originating scenario — invoked neither. It only fired for the case
already covered.

## Verification that actually worked

- **Cold reads found what gates could not.** Three passes, each on the current
  text. Every finding was invisible to Prettier, the build, and the validator:
  an undefined term, a positional pointer into a list the reader is told to
  rewrite, a must-keep rule placed after the block it governs.
- **Dual review, both reviewers execution-capable.** The capability census
  rejected `feature-dev:code-reviewer` and `plugin-dev:skill-reviewer` for
  lacking `Bash` — the latter was the domain fit and still failed the gate. Both
  reviewers independently verified the example against Step 8 clause by clause
  and independently flagged the `AGENTS.md` drift.
- **`guidance-not-argument`** on the new prose: eight passages classified, seven
  cut or compressed by agreement, one paraphrased duplication made verbatim.
  Recorded in
  [the removals artifact](../artifacts/2026-09-02-guidance-not-argument-removals.md).
  The pass also produced two manufactured quantifiers _inside the record of
  itself_, both caught by re-reading rather than by any tool.

## Landing

The branch trips its own policy's first exception: `5d18d6d` and `ec052b5` are
cited by SHA in the removals artifact, so a squash would rewrite them and leave
the citations dangling. Landed as-is, history preserved — the exception doing
exactly the job it was written for, on the branch that repaired it.

## Follow-ups

- [`docs/backlog/2026-09-02-root-level-conventions-check-semantics.md`](../../../backlog/2026-09-02-root-level-conventions-check-semantics.md)
  — Step 6's "if the check finds nothing" is ambiguous between stdout and exit
  status across the two rows.
- The `same commit` rule and the AI-trailer constraint are human-followed only.
  Step 8 computes the right lists regardless of a project's policy text, which
  limits the blast radius; `.husky/pre-commit` is precedent if either should
  become mechanical.
