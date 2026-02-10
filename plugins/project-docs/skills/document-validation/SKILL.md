---
name: document-validation
description:
  Methodology for validating documentation against codebases. Covers document
  type lifecycles, review steps, evidence gathering, and structured output.
---

# Document Validation Methodology

A systematic approach for validating technical documentation against codebases.
Use this methodology when reviewing documents for accuracy, implementation
status, or archival readiness.

## Document Types and Lifecycles

Different document types follow different lifecycles. Apply the appropriate
rules based on what you're reviewing.

### Temporal Documents (Status-based, Can Be Archived)

These documents have a lifecycle that ends in archival.

**Project Pipeline Documents** (`docs/projects/<name>/`)

Proposals, plans, and sessions live together in project folders. They share a
lifecycle and are archived as a unit.

- **Proposals** (`docs/projects/<name>/proposal.md`)
  - Lifecycle: Draft → Approved → Implemented → Archived
  - Archive when: All described features are implemented in code
- **Plans** (`docs/projects/<name>/plan.md`)
  - Lifecycle: Draft → Active → Complete → Archived
  - Archive when: All phases complete, work is done
- **Sessions** (`docs/projects/<name>/sessions/*.md`)
  - Historical work logs, part of the project record
- Archive the **entire project folder** to `docs/projects/archive/<name>/` when
  all work is complete
- Status format: `**Status:** Archived (Implemented)` or
  `**Status:** Archived (Superseded by X)`

**Investigations** (`docs/investigations/`)

- Lifecycle: In Progress → Complete
- Archive when: Question answered, either led to proposal or concluded no action
  needed
- Archive to: `docs/investigations/archive/`
- Status format: `**Status:** Complete - [outcome]`

**Reports** (`docs/reports/`)

- Generated assessments, typically point-in-time
- Archive when: Findings have been acted upon or are no longer relevant
- Archive to: `docs/reports/archive/`

### Evergreen Documents (Updated In Place, Rarely Archived)

These documents are living and should be updated rather than archived.

**Architecture** (`docs/architecture/`)

- Living documentation of how systems work
- Action: Update to match current implementation, don't archive
- Flag as: "Needs Update" or "Current"

**Specifications** (`docs/specifications/`)

- Technology-agnostic description of application behavior, organized by domain
- Action: Update when application behavior changes, don't archive
- Flag as: "Needs Update" (behavior changed but spec not updated) or "Current"
- Validation focus: Does the spec accurately describe what the application does?
  Are any new features missing from the specs?

**Interaction Design** (`docs/interaction-design/`)

- Living documentation of user flows and UX patterns
- Action: Update to match current implementation, don't archive
- Flag as: "Needs Update" or "Current"

**Playbooks** (`docs/playbooks/`)

- Reusable patterns and procedures
- Action: Update if outdated, don't archive unless obsolete
- Flag as: "Needs Update" or "Current"

**Lessons Learned** (`docs/lessons-learned/`)

- Reference material for specific solutions
- Action: Update if solution changed, rarely archive
- Flag as: "Needs Update" or "Current" or "Obsolete"

### Special Types

**Fragments** (`docs/fragments/`)

- Incomplete thoughts, eventually become other docs or deleted
- Review for: Should this become an investigation or proposal?

## Review Methodology

### Phase 1: Understand the Document

1. Read the full document
2. Identify the document type (proposal, plan, architecture, etc.)
3. Note all verifiable claims:
   - File paths mentioned
   - Features described
   - APIs or endpoints
   - Components or services
   - Database changes

### Phase 2: Investigate Implementation

Search for evidence using multiple techniques:

1. **Feature keywords**: Search for feature-specific terms mentioned in the doc
2. **File paths**: Verify mentioned paths exist and contain expected code
3. **Component names**: Search for React/Vue components, services, hooks
4. **API endpoints**: Check route definitions
5. **Database changes**: Look at schema files for mentioned tables/columns
6. **Git history**: `git log --oneline --all --grep="[keyword]"` for related
   commits
7. **Session docs**: Search `docs/projects/*/sessions/` for implementation notes

### Phase 3: Categorize Findings

**For Temporal Documents (proposals, plans, investigations):**

- **Complete/Implemented (100%)**: All objectives achieved, ready to archive
- **Partially Complete (X%)**: Some items done, list what remains
- **Not Started (0%)**: No evidence of implementation
- **Superseded**: Replaced by different approach, archive with note
- **Abandoned**: No longer relevant, archive with reason

**For Evergreen Documents (architecture, playbooks, etc.):**

- **Current**: Accurately reflects codebase
- **Needs Update**: Specific sections are outdated (list them)
- **Obsolete**: Describes removed functionality (rare - usually update instead)

### Phase 4: Provide Evidence

For each finding, cite specific evidence:

- File paths with relevant line numbers
- Git commit hashes
- Session document references
- Code snippets showing implementation

## Output Format

Structure your findings consistently:

```markdown
## Document Review: [filename]

**Document Type:** [Proposal | Plan | Investigation | Architecture | etc.]
**Current Status in Doc:** [What the document currently says] **Actual Status:**
[Your determination] **Completion:** [100% | 75% | 50% | etc. - for temporal
docs]

### Summary

[1-2 sentences on what this document describes]

### Findings

**Implemented:**

- [Feature/item] - Evidence: `path/to/file.ts` (lines X-Y)
- [Feature/item] - Evidence: commit `abc123`

**Not Implemented / Missing:**

- [Feature/item] - No code found for X
- [Feature/item] - Partially done: [what exists vs what's missing]

**Outdated / Incorrect:**

- [Section] claims X but code shows Y
- [File path] no longer exists, moved to Z

### Recommendation

**Action:** [Archive | Update Status | Update Content | No Action]

**Specific Steps:**

1. [Exact action to take]
2. [Another action]

**New Status:** `**Status:** [recommended status text]`
```

## Quality Checklist

Before returning findings:

- [ ] Read the full document, not just skimmed
- [ ] Searched codebase for key terms and file paths
- [ ] Checked git history for related commits
- [ ] Cited specific evidence for each finding
- [ ] Applied correct lifecycle rules for document type
- [ ] Provided actionable recommendation
- [ ] Acknowledged uncertainty where evidence is unclear
