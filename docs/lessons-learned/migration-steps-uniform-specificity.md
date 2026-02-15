# Migration Steps Must Be Uniformly Specific

**Date:** 2026-02-15 **Tags:** `#migrations` `#agent-execution` `#documentation`
**Type:** Pattern

---

## The Lesson

When writing migration guides (or any step-by-step instructions an agent will
execute), every step must be at the same level of specificity. If most steps
provide exact before/after text, the one step that describes intent instead of
providing an artifact will be the failure point.

## Context

During the v2.3 to v2.4 migration, steps 5b-5e gave exact before/after text that
an agent could apply mechanically — find this string, replace with that string.
Step 5a said "add a decision diamond" without providing the actual ASCII art
block. The executing agent had to compose ASCII art that matched the existing
flowchart style, producing something functionally correct but visually
inconsistent (compact diamond style instead of the full box style used
elsewhere).

The irony: the migration was designed to be agent-executable, and the four
well-specified steps proved it works. The one underspecified step proved exactly
why uniform precision matters.

## The Fix / Pattern

### Don't Do This:

```
**5a.** Add an optional "Need structured verification?" decision diamond
between "Add plan.md to project" and "Working on it?"
```

This describes what to create. The agent must study the existing style, compose
matching visual structure, and hope it matches. It won't.

### Do This Instead:

```
**5a.** Find this block in the flowchart:

    Add plan.md to project
                 ↓
          Working on it?

Replace it with:

    Add plan.md to project
                 ↓
      ┌──────────────────────┐
      │ Need structured      │
      │ verification?        │
      └──────────────────────┘
            ↓           ↓
          YES           NO
            ↓           │
 Add test-plan.md       │
 to project (optional)  │
            ↓           │
            └─────┬─────┘
                  ↓
          Working on it?
```

Provide the artifact, not a description of the artifact.

## Why This Works

Agents execute instructions literally. When a step says "replace A with B" and
provides both A and B, the agent performs a mechanical operation with no room
for interpretation. When a step says "create something like X," the agent must
make creative decisions — choosing box widths, alignment, label text, spacing —
each of which can diverge from the source of truth.

The broader principle: **asymmetric specificity in a sequence of steps creates a
predictable failure mode.** The well-specified steps set an expectation of
precision. The underspecified step doesn't signal "this needs extra care" — it
just gets executed with the same mechanical confidence, producing subtle drift.

Three checks when writing agent-executable instructions:

1. **Uniform specificity** — scan all steps and flag any that require more
   judgment than others
2. **Artifacts over descriptions** — show what to produce, don't describe it
3. **Before/after pairs** — for every modification step, provide both what to
   find and what to replace it with

---

## How We Discovered This

The v2.3-to-v2.4 migration was intentionally dogfooded — root-level docs were
left at v2.3 so a fresh agent could run the migration skill, validating the
upgrade path. The executing agent flagged step 5a as underspecified in its
feedback. A subsequent diff confirmed the flowchart had drifted from the
cookiecutter source of truth.

## Related Resources

- [v2.3-to-v2.4 migration guide](../projects/test-plan-doc-type/sessions/2026-02-15-test-plan-implementation.md)
  (session where this was discovered)
- Migration file:
  `plugins/project-docs/skills/update-project-docs/migrations/v2.3-to-v2.4.md`
