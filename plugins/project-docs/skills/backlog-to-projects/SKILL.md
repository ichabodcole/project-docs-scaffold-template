---
name: "backlog-to-projects"
description: >
  Review backlog items and organize them into project groupings with parallelism
  analysis. This skill should be used when the user asks to "organize the
  backlog", "group backlog items into projects", "review backlog for project
  planning", "what projects should we create from the backlog", "prioritize
  backlog items", or when the backlog has accumulated enough items that grouping
  and project creation would be valuable.
---

# Backlog to Projects

Review active backlog items, identify natural groupings based on overlapping
concerns, and propose projects with parallelism analysis. Present groupings to
the user for approval, then create project folders for accepted groups.

## When to Use

- Backlog has accumulated multiple items that need organizing
- User wants to plan next round of work from existing backlog
- After a batch of backlog items has been created
- Periodic backlog grooming to keep work organized

## Workflow

### Step 1: Inventory Active Backlog Items

Read all files in `docs/backlog/` (excluding `_archive/`). For each item,
extract:

- **Title** — from the H1 heading
- **Area** — which part of the codebase it touches (e.g. UI components, sidebar,
  file I/O, algorithm, stores)
- **Type** — the nature of the work: code change, UX exploration, investigation,
  refactor, bug fix
- **Key files** — from the References section
- **Dependencies** — explicit mentions of other backlog items or prerequisites
- **Complexity signal** — low (scoped code change), medium (design + implement),
  high (research + design + implement)

Present the inventory as a summary table:

```
| # | Item | Area | Type | Complexity |
|---|------|------|------|------------|
| 1 | ... | ... | ... | ... |
```

### Step 2: Identify Natural Groupings

Cluster items using these signals (strongest to weakest):

1. **Shared files** — items that modify the same files or directories are strong
   candidates for the same project (avoids merge conflicts in parallel work)
2. **Direct dependencies** — if item A is a prerequisite for item B, they belong
   together
3. **Conceptual cohesion** — items addressing the same user-facing concern (e.g.
   "sidebar input polish" groups numeric stepper + toggle groups + selection)
4. **Work type alignment** — pure research items group separately from pure
   implementation items to allow different workflows

Items that don't cluster naturally become standalone projects.

### Step 3: Assess Parallelism

For each proposed group, identify the **files and directories** it would touch.
Two groups can run in parallel when their file footprints don't overlap. Flag
conflicts explicitly:

- **Parallel-safe** — no shared files between groups
- **Needs sequencing** — shared files exist; note which files conflict and
  suggest ordering
- **Can partially overlap** — shared files are limited to read-only references
  or config; note the constraint

Present a parallelism matrix showing which groups can run concurrently.

### Step 4: Present Proposal

Present the groupings with:

- **Project name** (kebab-case, 2-4 words)
- **Included backlog items** (by title)
- **Rationale** — why these items belong together
- **Parallelism** — which other groups it can run alongside
- **Suggested approach** — investigation-first vs. implementation-ready

Ask the user to approve, modify, or reject groupings before proceeding.

### Step 5: Create Projects and Archive Backlog Items

For each approved grouping, create a project folder with a proposal. Follow the
`create-project` conventions:

- Read `docs/projects/TEMPLATES/PROPOSAL.template.md` for the template
- Create `docs/projects/<name>/proposal.md`
- Fill in: title, date, status (Draft), overview, problem statement, proposed
  solution, scope, and related documents (linking to each backlog item)
- Check that the project name doesn't already exist in `docs/projects/`
- If a project already exists for a grouping, note it and skip creation

After project creation, archive the backlog items that were absorbed into
projects:

- Move each item from `docs/backlog/` to `docs/backlog/_archive/`
- Only archive items that belong to an approved and created project
- Items that remain ungrouped stay in the active backlog

The backlog is an inbox — once an idea graduates to a project proposal, the
proposal becomes the source of truth. The archived backlog items remain
accessible via the proposal's related documents links.

### Step 6: Commit and Summarize

Stage and commit all new project folders and archived backlog items in a single
commit. Present a final summary:

- Projects created (with paths)
- Projects that already existed (skipped)
- Parallelism overview — which can run concurrently
- Remaining ungrouped backlog items (if any)
- Suggested next steps per project (e.g. "needs investigation first" vs. "ready
  for dev plan")

## Grouping Principles

**Prefer fewer, cohesive projects** over many tiny ones. A good project has 2-6
backlog items that share a clear theme. Single-item projects are fine for large
or isolated work.

**Don't force groupings.** If items don't naturally cluster, leave them as
standalone backlog items or single-item projects. Bad groupings create more
coordination overhead than they save.

**Consider the work type mix.** A project mixing "quick code changes" with
"needs UX research first" may stall the quick wins. Split if the research would
block implementation items that are already clear.

**Respect file boundaries for parallelism.** The primary benefit of grouping is
enabling parallel execution. If two items touch the same files, they should be
in the same project to avoid merge conflicts.

## Important Constraints

- Only read from `docs/backlog/` (not `docs/backlog/_archive/`)
- Do not create `plan.md` or `sessions/` — those come later
- Proposal content should reference backlog items as related documents using
  relative paths: `../../backlog/_archive/<filename>.md` (since items are
  archived after project creation)
- Always get user approval before creating project folders
- Only archive backlog items after their project has been successfully created
