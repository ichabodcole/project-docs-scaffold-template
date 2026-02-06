---
name: review-docs
description:
  Orchestrate documentation review by assigning docs-curator agents to
  individual documents for thorough validation against the codebase.
---

# Documentation Review Orchestration

A management skill for systematically reviewing documentation. Assign one
docs-curator agent per document to ensure thorough investigation.

## When to Use

Activate when:

- User wants to audit documentation for accuracy
- User asks to check if proposals/plans have been implemented
- User wants to identify outdated documentation
- User mentions "review docs", "check proposals", or "documentation audit"
- After major features are completed and docs need validation

**Key indicators:**

- "Review the proposals folder"
- "Check which plans are complete"
- "Is the architecture documentation still accurate?"
- "Audit the docs for outdated content"

## Core Principle: One Agent Per Document

Assigning multiple documents to a single agent dilutes review quality. Each
document requires:

- Full document reading
- Codebase searching for evidence
- Git history investigation
- Cross-referencing related docs

**Always assign one docs-curator agent per document.**

## Workflow

### Step 1: Identify Documents to Review

List the documents that need review:

```bash
# List proposals
ls docs/proposals/*.md

# List plans
ls docs/plans/*.md

# List architecture docs
ls docs/architecture/*.md

# List specifications
ls docs/specifications/*.md
```

Or use Glob to find specific patterns:

- `docs/proposals/*.md` - All proposals
- `docs/plans/2026-01-*.md` - Recent plans
- `docs/architecture/*.md` - All architecture docs
- `docs/specifications/*.md` - All specifications

### Step 2: Categorize by Document Type

Different document types have different review goals:

**Temporal Documents** (check for completion/archival):

- `docs/proposals/` - Archive when implemented
- `docs/plans/` - Archive when complete
- `docs/investigations/` - Archive when concluded
- `docs/reports/` - Archive when acted upon

**Evergreen Documents** (check for accuracy):

- `docs/architecture/` - Update to match current code
- `docs/specifications/` - Update to match current application behavior
- `docs/playbooks/` - Update if procedures changed
- `docs/lessons-learned/` - Update if solutions evolved
- `docs/interaction-design/` - Update to match current UX

### Step 3: Assign Agents

Launch one docs-curator agent per document using the Task tool:

```
Task(
  subagent_type: "docs-curator",
  description: "Review [document-name]",
  prompt: "Review this document for accuracy and implementation status:

  **Document:** docs/proposals/2026-01-15-feature-x-proposal.md

  Read the document, search the codebase for evidence of implementation,
  check git history for related commits, and provide your findings with
  the recommended action (archive, update, no action)."
)
```

**For parallel efficiency**, launch multiple agents in a single message:

```
// Launch 4 agents in parallel, one per document
Task(...doc1...)
Task(...doc2...)
Task(...doc3...)
Task(...doc4...)
```

### Step 4: Collect and Consolidate Results

As agents complete, collect their findings:

1. **Group by recommended action:**
   - Ready to archive (100% complete)
   - Needs status update (partially complete)
   - Needs content update (outdated sections)
   - No action needed (current and accurate)

2. **Present summary to user:**

   ```markdown
   ## Documentation Review Results

   ### Ready to Archive (5 documents)

   - proposals/feature-x.md - Fully implemented
   - proposals/feature-y.md - Superseded by feature-z ...

   ### Needs Update (2 documents)

   - architecture/api-design.md - Section 3 outdated ...

   ### Current (3 documents)

   - playbooks/deployment.md - Accurate ...
   ```

3. **Get user approval before taking action**

### Step 5: Execute Approved Actions

For approved archives:

1. Update status in document
2. Move to `archive/` subfolder

For approved updates:

1. Make the specific changes identified
2. Or create tasks for the user to address

## Batch Size Guidelines

For large documentation sets:

| Doc Count | Approach                                    |
| --------- | ------------------------------------------- |
| 1-5       | Review all in parallel                      |
| 6-15      | Batch into 2-3 waves                        |
| 16+       | Prioritize by age/importance, review subset |

**Prioritization criteria:**

- Oldest documents first (most likely outdated)
- Documents related to recently completed features
- Documents the user specifically mentioned

## Agent Assignment Template

Copy and customize for each document:

```
Review this document for accuracy and implementation status:

**Document:** [full path to document]
**Document Type:** [Proposal | Plan | Architecture | etc.]

Tasks:
1. Read the full document
2. Search codebase for mentioned features/components
3. Check git log for related commits
4. Determine implementation/accuracy status
5. Recommend action: Archive | Update | No Action

Provide findings in the standard docs-curator output format.
```

## Example: Reviewing All Proposals

```bash
# 1. List proposals (excluding archive)
ls docs/proposals/*.md | grep -v archive

# Result: 8 proposals to review
```

```
# 2. Launch 4 agents in parallel (first batch)
Task(subagent_type: "docs-curator", description: "Review proposal-a", prompt: "...")
Task(subagent_type: "docs-curator", description: "Review proposal-b", prompt: "...")
Task(subagent_type: "docs-curator", description: "Review proposal-c", prompt: "...")
Task(subagent_type: "docs-curator", description: "Review proposal-d", prompt: "...")
```

```
# 3. After first batch completes, launch remaining 4
Task(subagent_type: "docs-curator", description: "Review proposal-e", prompt: "...")
...
```

```
# 4. Consolidate results and present to user
"8 proposals reviewed:
- 5 ready for archive (fully implemented)
- 2 partially complete (list what remains)
- 1 not started

Would you like me to archive the 5 completed proposals?"
```

## Checklist: Documentation Review

- [ ] Identify documents to review (list files)
- [ ] Categorize by document type
- [ ] Launch one docs-curator agent per document
- [ ] Wait for all agents to complete
- [ ] Consolidate findings by recommended action
- [ ] Present summary to user
- [ ] Get approval before archiving/updating
- [ ] Execute approved actions
- [ ] Report completion
