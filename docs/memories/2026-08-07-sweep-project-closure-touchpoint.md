# Sweep-project closure touchpoint added; first two projects archived

**Date:** 2026-08-07

Added the `sweep-project` skill (project-docs 3.2.0) — reconciles a project
folder or backlog item against what was actually built, then either records the
remaining work or archives it on human confirmation — plus a reconciliation
touchpoint in `finalize-branch` Step 6 that delegates to it, and
`[sweep → archive]` as a check-in stage in the documentation cycle string.
Archived `agent-surface-recipe-evolution` and `hivemind-plugin`.

The design turned on one dogfooding finding: **checkbox state is not evidence of
completion.** Across the two archived projects, 78 checkboxes carried zero
checks while both had fully shipped, so the skill verifies against artifacts on
disk and session records and treats checkboxes as the _output_ of
reconciliation. A blanket find-and-replace during the first run also corrupted
an inline `- [ ]` code sample in a plan — reverted, and the skill now forbids
ticking anything outside a real list item.

**Key files:** `plugins/project-docs/skills/sweep-project/SKILL.md`,
`plugins/project-docs/skills/finalize-branch/SKILL.md` (Step 6),
`plugins/project-docs/skills/update-project-docs/SKILL.md`

**Docs:** [sweep-project project](../projects/sweep-project/plan.md) — proposal,
plan, and
[session](../projects/sweep-project/sessions/2026-08-07-sweep-project-implementation.md);
originating
[investigation](../investigations/2026-08-07-project-closure-and-archive-touchpoint-investigation.md)
