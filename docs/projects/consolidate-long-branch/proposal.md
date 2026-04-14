# Consolidate Long Branch Skill

**Status:** Draft **Created:** 2026-04-13 **Author:** Cole Reed

---

## Overview

Add a new `consolidate-long-branch` skill to the `project-docs` plugin that
packages a safe, repeatable workflow for collapsing a long-running feature
branch (dozens of commits, accumulated WIP saves, fixups, reversals) into a
small number of coherent "chapter" commits before merging — without losing work
or introducing silent content drift. The skill is a direct adaptation of an
already-proven playbook that consolidated a 46-commit branch down to 7 clean
chapters with zero conflicts.

## Problem Statement

Long-lived branches accumulate commit noise: WIP saves, "actually this is how it
should work" reversals, lint cleanups, small fixups. By the time the branch is
ready to land, the history reads like a working diary rather than a meaningful
narrative. Three things make this hard to fix today:

1. **Interactive rebase is unforgiving at scale.** Rewriting 40+ commits in
   place means mistakes cascade and recovery is awkward.
2. **There's no shared safety recipe.** Every developer invents their own backup
   scheme (if any), which means agents asked to help with this task either
   refuse or proceed without guardrails.
3. **Tree drift goes undetected.** Typecheck and tests can pass even when a
   commit was silently skipped or double-applied — the only reliable check is a
   tree-equivalence diff against the original tip, and most ad-hoc approaches
   skip it.

The reference playbook solves all three with a
`cherry-pick + soft-reset onto a fresh branch` workflow, gated by two
independent backups and a byte-exact tree equivalence verification. Turning it
into a skill lets agents auto-surface the playbook when they recognize the
situation, and gives users a single command to pull the workflow into any
project.

## Proposed Solution

A single skill at `plugins/project-docs/skills/consolidate-long-branch/` that
adapts the reference playbook (already present in this project folder as
`consolidating-a-long-branch.md`) into skill format. The skill will preserve the
playbook's 8-phase structure verbatim in spirit — safety nets, plan groups,
draft messages, execute cherry-picks, verify tree, verify code, swap branch,
merge and clean up — with the following adjustments for skill delivery:

- **Rich frontmatter description** so the agent auto-surfaces the skill when the
  user mentions consolidating, squashing, cleaning up, or rewriting a long
  branch's history before merge.
- **"When to use / when not to use"** section at the top, so the agent can
  confirm the fit in one pass.
- **TodoWrite checklist hint** so the agent tracks each phase and doesn't skip
  validation gates (especially the tree-equivalence diff).
- **Generic command examples** (the playbook mentions `bun run typecheck` and
  `bunx vitest`; the skill will frame these as "your project's typecheck/test
  command" with a note to adapt).
- **Explicit "never force-push without confirmation"** guardrail in the skill
  flow, matching the broader plugin convention.

**User-facing experience:**

> User: "I've got this `feature/foo` branch with 30+ commits and it's time to
> clean it up before merging."
>
> Agent: _[auto-surfaces `consolidate-long-branch` skill]_ "Here's the plan —
> eight phases, starting with two backup refs before any rewrite. Let me walk
> through it step by step and pause for your input at each phase boundary."

## Scope

**In Scope (MVP):**

- Single SKILL.md at `plugins/project-docs/skills/consolidate-long-branch/`
- Frontmatter with trigger phrases for reliable agent routing
- Full 8-phase workflow adapted from the reference playbook
- Safety guardrails: backup tag + backup branch, tree-equivalence check, no
  force-push without approval
- Registration in `plugins/project-docs/README.md` skills table
- Version bump to `project-docs` plugin (minor)
- Manifesto skill count update (24 → 25)
- `dist/` rebuild via `build-skills-dist.sh`

**Out of Scope:**

- Shell scripts to automate any of the phases (the playbook is deliberately
  narrative; automation removes the pause-and-verify checkpoints that make it
  safe)
- PR creation or release-note generation from the consolidated commits
- Handling of branches with shared pushed history (explicitly excluded by the
  reference playbook's applicability section)
- Integration with `finalize-branch` (could be a future add, but the skills are
  independently useful)

**Future Considerations:**

- A companion skill or decision gate inside `finalize-branch` that surfaces
  `consolidate-long-branch` when the branch has more than ~20 commits
- A "dry-run" or "preview" helper script that shows the proposed group mapping
  before execution

## Technical Approach

**Location:** `plugins/project-docs/skills/consolidate-long-branch/SKILL.md`

**Structure:** Single-file skill, no supporting files or scripts. The playbook's
narrative style translates directly — agents follow prose instructions with
validation checklists at each phase.

**Frontmatter:**

- `name: consolidate-long-branch`
- `description:` includes "Use when..." and "Triggers when..." sections with
  phrases like: "consolidate this branch", "squash these commits into chapters",
  "clean up branch history before merge", "collapse commits safely", "too many
  commits on this branch", "rewrite this long branch's history", "turn this
  messy branch into clean commits"

**Content adaptation from playbook:**

- Preserve all 8 phases with the same ordering and rationale.
- Preserve the 6 gotchas verbatim (they're the safety backbone).
- Replace project-specific references (the 46→7 example's file path, the
  Storyline Engine context) with a more generic example or keep the anecdote but
  frame it as illustrative only.
- Add explicit agent-facing instructions at the top: "Announce each phase before
  running its commands; pause at validation gates; never proceed past a failed
  tree-equivalence check."

**Plugin hygiene (per scaffold-update-checklist):**

- Bump `plugins/project-docs/.claude-plugin/plugin.json` minor version (2.1.0 →
  2.2.0)
- Add entry to `plugins/project-docs/README.md` Utility Skills table
- Add version history entry in plugin README
- Update `docs/PROJECT_MANIFESTO.md` skill count (24 → 25)
- Rebuild `dist/` via `./scripts/build-skills-dist.sh`
- Format with Prettier

## Impact & Risks

**Benefits:**

- Gives agents a well-defined, safety-first workflow for a task they otherwise
  handle inconsistently (or refuse entirely).
- Captures institutional knowledge from a real consolidation (46→7, zero
  conflicts) so other projects can reuse it.
- The tree-equivalence check elevates the safety floor above most ad-hoc
  approaches — even experienced developers often skip this step.

**Risks:**

- **Low — the risk is misapplication, not the workflow itself.** The playbook is
  already proven; adapting it to skill format is largely mechanical. The main
  risk is an agent being asked to apply it to a branch that doesn't fit the
  criteria (short branches, shared pushed history, reviewable commit series).
  Mitigated by explicit "Don't use when..." section in the skill.
- **Operator error during Phase 4.** If the agent miscounts commits for the
  soft-reset `HEAD~<N>`, the tree-equivalence check will catch it — but only if
  the agent actually runs the check. The skill must make this gate non-optional.

**Complexity:** Low — this is a documentation-shaped skill with no code or
scripts.

## Open Questions

- **Phase 6 command framing.** The playbook uses `bun run typecheck` and
  `bunx vitest`. Should the skill leave those as-is (familiar to most Bun users)
  or genericize to "your project's typecheck and test commands"? Leaning
  generic, with the Bun examples in parentheses as a reference.
- **Storyline Engine example.** Should the 46→7 anecdote stay as a concrete
  success story (shows the playbook works), or be genericized? Leaning keep — it
  adds credibility and the path reference can be de-specified.

## Success Criteria

- An agent given the skill can walk a user through consolidating a real long
  branch end-to-end without the user providing additional guidance.
- A user can invoke `/project-docs:consolidate-long-branch` explicitly and get
  the same workflow.
- At every phase, the original branch state is recoverable from the backup refs
  — no step proceeds past a failed validation gate.
- Tree-equivalence diff is treated as non-optional by the agent.

---

**Related Documents:**

- [Reference playbook](./consolidating-a-long-branch.md) — the source document
  this skill adapts

---

## Notes

The reference playbook in this folder (`consolidating-a-long-branch.md`) is the
canonical source. When implementing the skill, adapt rather than rewrite — the
playbook's structure, rationale, and safety gates are already well-tuned from
real use.
