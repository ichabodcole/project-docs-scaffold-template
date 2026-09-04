---
type: memory
title: Branch Landing Policy example had drifted from its implementation
status: stable
generated: { by: unknown, at: 2026-09-02 }
---

# Branch Landing Policy example had drifted from its implementation

The `## Branch Landing Policy` example that `update-project-docs` ships to
downstream projects still carried the 3.1.0 wording that 3.3.0 had already
replaced in this repo's own root `AGENTS.md` for being unreachable — so
consumers were handed a defect the repo had diagnosed and fixed for itself three
releases earlier. Corrected the example against `finalize-branch` Step 8, and
closed the mechanism: both guidance documents covered only _adding_ a
convention, never _revising_ one, so a change starting in `AGENTS.md` — where
nothing points back at the shipped copy — had no rule at all. Shipped as
project-docs 3.6.0.

Two things worth carrying forward. First, `Revising` item 2 ("re-check the
subsection against the skill that consumes it") is exactly the step that catches
this class, and it shipped in the same commit as a fresh instance of the same
defect — writing a check does not run it. Second, the first attempt at the
guardrail was placed where its own failure could not reach it, as a checkbox in
a skill whose triggers didn't name the file whose editing causes the drift; dual
review caught that, not self-review.

**Key files:** `plugins/project-docs/skills/update-project-docs/SKILL.md`,
`.claude/skills/scaffold-update-checklist/SKILL.md`, `AGENTS.md`

**Docs:**
[Session note](../projects/finalize-branch-hardening/sessions/2026-09-02-branch-landing-policy-example-drift.md)
