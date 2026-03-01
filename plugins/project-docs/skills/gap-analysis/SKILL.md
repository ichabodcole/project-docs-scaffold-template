---
name: gap-analysis
description:
  Methodology for identifying what's missing from proposals, specifications, or
  feature ideas
---

# Gap Analysis

A systematic approach to finding what's NOT in a proposal or specification—the
unspecified flows, missing UI elements, unstated assumptions, and edge cases
that need addressing before implementation.

## When to Use

Use this methodology when you need to:

- Review a proposal before it becomes a development plan
- Evaluate a feature idea for completeness
- Find holes in a specification before implementation begins
- Identify what questions need answering before work can start
- Assess whether an idea is ready for the next stage

**Key indicator**: You're asked to review something for completeness, or to find
what's missing.

**Not for**: Understanding what IS there (use base investigation), researching
technologies (use tech-integration-research), or understanding the competitive
landscape (use landscape-analysis).

## Gap Analysis Framework

### Step 1: Understand the Intent

Before looking for gaps, understand what the proposal is trying to accomplish:

- **Core goal**: What problem is this solving?
- **Target user**: Who benefits from this?
- **Stated scope**: What does the proposal explicitly include?
- **Stated non-scope**: What does it explicitly exclude?

**Output**: 2-3 sentence summary of what this proposal aims to do.

### Step 2: Map What's Covered

Document what the proposal explicitly addresses:

- **User flows**: Which interactions are described?
- **UI elements**: Which screens/components are specified?
- **Data**: What data structures or storage is mentioned?
- **Technical approach**: What implementation details are given?
- **Edge cases**: Which error states or exceptions are handled?

**Output**: Checklist of what's explicitly covered.

### Step 3: Identify Gaps by Category

Systematically look for what's missing in each category:

#### UX/Interaction Gaps

- How does the user discover this feature?
- What happens on first use vs. repeated use?
- How does the user know it worked?
- How does the user recover from errors?
- What feedback does the user receive during operations?
- Are loading states specified?
- Is there an empty state?

#### Technical Gaps

- How does this integrate with existing systems?
- What happens when dependencies fail?
- Are there performance considerations?
- How is data validated?
- What about backwards compatibility?
- Are migrations needed?

#### Edge Case Gaps

- What if the user cancels mid-operation?
- What if the network fails?
- What about concurrent operations?
- What about large data sets?
- What about empty/null states?
- What about permission boundaries?

#### Scope Boundary Gaps

- Where does this feature end and another begin?
- What adjacent features might users expect?
- Are there implicit assumptions about other features?

### Step 4: Assess Gap Severity

For each gap identified, assess:

| Severity        | Meaning                              | Action                                   |
| --------------- | ------------------------------------ | ---------------------------------------- |
| **Blocking**    | Cannot implement without this answer | Must resolve before development          |
| **Important**   | Implementation will be incomplete    | Should resolve before development        |
| **Minor**       | Nice to have, can defer              | Note for later, proceed with development |
| **Intentional** | Explicitly out of scope              | Document as non-scope, no action         |

### Step 5: Formulate Questions

Convert gaps into specific, answerable questions:

**Weak**: "The UI is unclear" **Strong**: "When the user clicks Export, should
they see a confirmation dialog before the file saves?"

**Weak**: "Error handling is missing" **Strong**: "If the export fails mid-way,
should we show an error toast, a modal, or navigate to an error page?"

## Output Format

Structure gap analysis as:

```markdown
# Gap Analysis: [Proposal/Feature Name]

## Summary

[1-2 sentences on what the proposal covers and overall completeness assessment]

## What's Covered

- [Explicit coverage point 1]
- [Explicit coverage point 2]
- ...

## Identified Gaps

### Blocking Gaps

Must be resolved before implementation can begin.

1. **[Gap Title]**
   - Category: [UX/Technical/Edge Case/Scope]
   - What's missing: [Description]
   - Question: [Specific question to resolve this]

### Important Gaps

Should be resolved for complete implementation.

1. **[Gap Title]**
   - Category: [Category]
   - What's missing: [Description]
   - Question: [Specific question]

### Minor Gaps

Can be deferred or addressed during implementation.

1. **[Gap Title]** - [Brief description]

## Recommendations

### Before Proceeding

[List of blocking questions that need answers]

### During Development

[Decisions that can be made during implementation]

### Intentionally Deferred

[Items explicitly marked as out of scope or for future work]
```

## Quality Checklist

Before completing gap analysis:

- [ ] Understood the proposal's intent before looking for gaps
- [ ] Systematically checked each gap category
- [ ] Gaps are specific, not vague
- [ ] Each gap has a clear, answerable question
- [ ] Severity is assigned to prioritize discussion
- [ ] Didn't invent requirements—identified genuinely missing pieces
- [ ] Acknowledged what the proposal does well

## Common Pitfalls

**Scope creep**: Gap analysis finds what's _missing from the stated goal_, not
opportunities to expand the goal. If the proposal says "basic export," don't
gap-analyze for "advanced export features."

**Inventing requirements**: Gaps should be things that are genuinely needed for
the stated scope, not nice-to-haves you wish were included.

**Vague gaps**: "The UX needs work" isn't useful. "There's no specified behavior
when the user clicks Cancel" is actionable.

**Missing the positive**: Always note what's well-specified before diving into
gaps. Context matters.
