---
name: document-validation
description:
  Methodology for validating documentation against codebases. Covers document
  type lifecycles, review steps, evidence gathering, and structured output. Use
  when reviewing whether documentation (features, plans, architecture docs)
  accurately reflects what the code actually does. Triggers when user says
  "validate this doc", "is this documentation accurate", "check docs against the
  code", "audit documentation", or wants to verify that written documentation
  hasn't drifted from the implementation.
---

# Document Validation Methodology

A systematic approach for validating technical documentation against codebases.
Use this methodology when reviewing documents for accuracy, implementation
status, or archival readiness.

## Document Types and Lifecycles

Different document types follow different lifecycles. Apply the appropriate
rules based on what you're reviewing.

**Docs root:** paths below are written as `docs/`; the actual root is `docsRoot`
in `.project-docs.json` at the repo root, which defaults to `docs/`. Read it if
the file exists.

**Every document's type and state vocabulary is in `docs/SCHEMA.md`** — the
**Lifecycle by type** table, which the lint parses, so it cannot drift. Read it
there rather than trusting a summary. Where a document keeps its state is its
frontmatter `lifecycle`, never a `**Status:**` line in the body; a body status
line beside a `lifecycle` is itself a finding.

### Work Documents (State in `lifecycle`, Archived by the CLI)

**Features and work items** (`docs/features/<slug>/feature.md`,
`docs/items/<slug>.md` or `docs/items/<slug>/item.md`) are the entities; each
carries a `lifecycle` (`backlog` · `ready` · `active` · `review` · `done` ·
`dropped`, and `triage` for items). The documents they own live in their folder
and are judged with them:

- **Plans** (`plan.md`) — `draft` · `active` · `completed` · `abandoned`
- **Design resolutions**, **test plans** — their own vocabularies, in
  `SCHEMA.md`
- **Write-ups** (a research item's answer), **sessions**, **reports**,
  **artifacts** — frozen records with no `lifecycle`; they are evidence, not
  claims to verify

**A feature is done when its work shipped and every item under it is `done` or
`dropped`** (`bun scripts/pdocs/cli.ts view feature <slug>` lists them). A
research item is done when its write-up reached a recommendation.

**Archival is never a move you recommend doing by hand.** A finished entity's
record is its terminal `lifecycle`; moving it into `_archive/` is optional, and
only `bun scripts/pdocs/cli.ts archive <ref>` does it (it refuses anything not
`done` or `dropped`, and rewrites every link). Recommend the `sweep-project`
skill, which reconciles, writes the state, and runs the archive.

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

- Imperative guidance for a kind of work: Goal · Steps · Verification
- Action: Update if a step is outdated; a step that no longer applies is
  removed, not annotated
- Flag as: "Needs Update" or "Current"

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
7. **Session docs**: Search `docs/features/*/sessions/` and
   `docs/items/*/sessions/` for implementation notes

### Phase 3: Categorize Findings

**For Work Documents (features, items, plans):**

- **Complete (100%)**: All objectives achieved → `done` (plan: `completed`)
- **Partially Complete (X%)**: Some items done, list what remains → `active`
- **Not Started (0%)**: No evidence of implementation → leave its state
- **Dropped**: Replaced by a different approach, or no longer relevant →
  `dropped` (plan: `abandoned`), with the reason

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

**Document Type:** [Feature | Item | Plan | Architecture | etc.] **`lifecycle`
in Doc:** [What the frontmatter says] **Actual State:** [Your determination]
**Completion:** [100% | 75% | 50% | etc. - for work documents]

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

**Action:** [Set State (then `sweep-project` to archive) | Update Content | No
Action]

**Specific Steps:**

1. [Exact action to take]
2. [Another action]

**New `lifecycle`:**
`[the value from docs/SCHEMA.md's vocabulary for this type]`
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
