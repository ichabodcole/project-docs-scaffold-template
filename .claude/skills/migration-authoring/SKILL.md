---
name: migration-authoring
description:
  Methodology for writing agent-executable migration guides. Use when creating
  or reviewing a migration guide for the update-project-docs skill, when the
  user says "write a migration guide", "create migration steps", "document the
  upgrade path", or "review migration quality". Ensures every step is precise
  enough for a fresh agent with no context to execute mechanically.
---

# Migration Authoring Methodology

A structured approach to writing migration guides that are reliably executable
by agents. The core principle: **every step must be completable without creative
judgment.**

## When to Use

- Writing a new migration guide for a scaffold template version bump
- Reviewing an existing migration guide before release
- After a migration execution produces drift or errors (diagnose the guide, not
  just the output)

## The Problem This Solves

Migration guides are written by someone with full context about a change — they
know what changed, why, and how it fits together. The guide is executed by an
agent with zero context — it reads the instructions and follows them literally.
This asymmetry means anything left to interpretation will be interpreted
differently than intended.

## Authoring Principles

### 1. Uniform Specificity

Every step in a migration guide must be at the same level of detail. If most
steps provide exact before/after text, **all** steps must.

**The failure mode:** Nine precise steps and one vague step. The vague step gets
executed with the same mechanical confidence as the precise ones, producing
subtle drift that passes verification but doesn't match the source of truth.

**The check:** After drafting all steps, scan them side by side. Flag any step
that requires more judgment than its neighbors.

### 2. Artifacts Over Descriptions

Provide the thing to insert, not a description of the thing to insert. This
applies especially to:

- ASCII art (flowcharts, diagrams, box-drawing)
- Complex markdown structures (tables, nested lists)
- Multi-line blocks where formatting matters
- Anything with visual structure

**Don't:** "Add a decision diamond matching the existing style"

**Do:** Provide the exact block with the exact characters, spacing, and
alignment.

### 3. Before/After Pairs

Every modification step should include:

- **What to find** — the exact text that currently exists
- **What to replace it with** — the exact text to put in its place

This turns every step into a mechanical find-and-replace. The executing agent
doesn't need to understand the surrounding context or make placement decisions.

### 4. One Verification Per Change

Every step that modifies a file should have a corresponding verification
command. If you can't write a grep that confirms the change was applied
correctly, the step may be underspecified.

### 5. Copy Commands for New Files

When a migration adds new files, prefer `cp` from a scaffold source over inline
content. This avoids the guide going stale when the template evolves. When
inline content is necessary (e.g., the scaffold isn't available), provide the
complete file contents.

## Writing Process

### Phase 1: Inventory Changes

Before writing any steps, catalog everything that changed:

1. Diff the cookiecutter template against the previous version
2. Categorize each change: new file, modified file, removed file, renamed
3. For modified files, identify the exact blocks that changed
4. Note which changes are mechanical (copy/replace) vs. structural (requires
   understanding context)

### Phase 2: Draft Steps

Write each step following the principles above:

1. **New files** — `cp` command from scaffold, or full inline content
2. **Full file replacements** — `cp` command when the file can be overwritten
   (templates, structural READMEs). Note when the user may have customizations
   that need merging instead.
3. **Targeted modifications** — before/after text blocks with enough surrounding
   context to be unique in the file
4. **Removals** — `rm` command with the exact path

For targeted modifications, include enough context in the "before" block to
uniquely identify the location. A three-line before block is better than a
one-line block that might match multiple locations.

### Phase 3: Write Verification

For each step, write a verification command:

- `ls` for new files
- `grep` for content changes
- `! grep` for removed content
- `diff` against scaffold for full-file copies

Group these into a verification section at the end, but also consider inline
verification notes after complex steps.

### Phase 4: Quality Review

Run through the quality checklist below before shipping the guide.

## Quality Checklist

Before finalizing any migration guide:

- [ ] **Uniform specificity** — all steps are at the same level of detail; no
      step requires more creative judgment than its neighbors
- [ ] **No description-only steps** — every step that adds or modifies content
      provides the actual content, not a description of what to add
- [ ] **Before/after pairs** — every modification step includes both the text to
      find and the text to replace it with
- [ ] **Unique match context** — before blocks include enough surrounding
      context to match exactly one location in the file
- [ ] **Verification coverage** — every change has a corresponding verification
      command
- [ ] **Copy vs. merge guidance** — for each file update, the guide explicitly
      states whether to overwrite or merge (and when merging, what to preserve)
- [ ] **Ordering is correct** — steps that depend on earlier steps come after
      them; independent steps are grouped logically
- [ ] **Scaffold cleanup** — includes step to remove temporary scaffold
      directory
- [ ] **Version marker** — includes step to update `docs_version` frontmatter
- [ ] **Checklist matches steps** — the final checklist has one item per action,
      no steps are missing from the checklist

## Lessons Learned

This section captures specific authoring mistakes encountered in practice. Add
to it as new failure modes are discovered.

### Flowchart / ASCII Art Steps

**Problem:** A migration step said "add a decision diamond" without providing
the actual ASCII art. The executing agent composed its own version —
functionally correct but visually inconsistent with the existing flowchart
style.

**Fix:** Always provide the exact ASCII art block to insert, including the
before block for context. Treat ASCII art the same as code — literal content,
not intent.

**Reference:**
[migration-steps-uniform-specificity](../../docs/lessons-learned/migration-steps-uniform-specificity.md)

---

## Related Resources

- [Update Project Docs skill](../../plugins/project-docs/skills/update-project-docs/skill.md)
  — the consumer of migration guides
- [Scaffold Update Checklist](../scaffold-update-checklist/SKILL.md) — the
  release workflow that triggers migration guide creation
- [Lessons Learned](../../docs/lessons-learned/) — where migration authoring
  failures are documented
