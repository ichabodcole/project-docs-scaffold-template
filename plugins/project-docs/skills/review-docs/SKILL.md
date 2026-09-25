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
- User asks to check if features/plans have been implemented
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

**Docs root:** paths below are written as `docs/`; the actual root is `docsRoot`
in `.project-docs.json` at the repo root, which defaults to `docs/`. Read it if
the file exists. `pdocs` below means `bun scripts/pdocs/cli.ts`.

```bash
# The work in flight — features and items, with their states
pdocs view board --features

# Features, plans and sessions
ls docs/features/*/feature.md docs/features/*/plan.md

# Architecture docs, specifications, playbooks
ls docs/architecture/*.md docs/specifications/*.md docs/playbooks/*.md
```

Or use Glob to find specific patterns:

- `docs/features/*/feature.md` - All live features
- `docs/features/*/plan.md` - All plans
- `docs/features/*/sessions/*.md`, `docs/items/*/sessions/*.md` - Sessions
- `docs/architecture/*.md` - All architecture docs
- `docs/specifications/*.md` - All specifications

`features/_archive/` and `items/_archive/` hold finished work; skip them unless
the user asks.

### Step 2: Categorize by Document Type

Different document types have different review goals:

**Work Documents** (check for completion; state lives in `lifecycle`):

- `docs/features/*/feature.md` and its `plan.md` - is the feature done?
- Items (`docs/items/`) still `active` or `review` - did the work land?
- Research items - did the write-up reach a recommendation?

**Evergreen Documents** (check for accuracy):

- `docs/architecture/` - Update to match current code
- `docs/specifications/` - Update to match current application behavior
- `docs/playbooks/` - Update if procedures changed
- `docs/interaction-design/` - Update to match current UX

### Step 3: Assign Agents

Launch one docs-curator agent per document using the Task tool:

```
Task(
  subagent_type: "docs-curator",
  description: "Review [document-name]",
  prompt: "Review this document for accuracy and implementation status:

  **Document:** docs/features/feature-x/feature.md

  Read the document, search the codebase for evidence of implementation,
  check git history for related commits, and provide your findings with
  the recommended action (a new lifecycle, update, no action)."
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
   - Finished (100% complete) — a terminal `lifecycle`, then optionally archived
   - Needs a state change (partially complete, or drifted)
   - Needs content update (outdated sections)
   - No action needed (current and accurate)

2. **Present summary to user:**

   ```markdown
   ## Documentation Review Results

   ### Finished (5 features)

   - features/feature-x/ - Fully implemented
   - features/feature-y/ - Superseded by feature-z ...

   ### Needs Update (2 documents)

   - architecture/api-design.md - Section 3 outdated ...

   ### Current (3 documents)

   - playbooks/deployment.md - Accurate ...
   ```

3. **Get user approval before taking action**

### Step 5: Execute Approved Actions

For approved finished work, **invoke the `sweep-project` skill once per feature
or item** (`feature/<slug>`, `item/<slug>`). It reconciles, writes the terminal
`lifecycle`, and archives with `pdocs archive` — which checks the state and
rewrites every link — after its own confirmation. Never set a state in a body
`**Status:**` line, and never move a file into `_archive/` by hand.

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

## Example: Reviewing All Project Proposals

```bash
# 1. List the live features (archived ones live in features/_archive/)
ls docs/features/*/feature.md

# Result: 8 features to review
```

```
# 2. Launch 4 agents in parallel (first batch)
Task(subagent_type: "docs-curator", description: "Review feature-a", prompt: "...")
Task(subagent_type: "docs-curator", description: "Review feature-b", prompt: "...")
Task(subagent_type: "docs-curator", description: "Review feature-c", prompt: "...")
Task(subagent_type: "docs-curator", description: "Review feature-d", prompt: "...")
```

```
# 3. After first batch completes, launch remaining 4
Task(subagent_type: "docs-curator", description: "Review feature-e", prompt: "...")
...
```

```
# 4. Consolidate results and present to user
"8 features reviewed:
- 5 finished (fully implemented)
- 2 partially complete (list what remains)
- 1 not started

Would you like me to sweep the 5 finished features? (sweep-project sets them
done and offers to archive each one.)"
```

## Generate Status Report

After consolidating results, write a report. A report is always owned by a
feature or a work item, so a documentation review files a `kind: chore` item to
own it — the item stays open until the report's recommendations have been acted
on:

```bash
pdocs new item docs-review-YYYY-MM --kind chore --lifecycle active \
  --title "Docs review — YYYY-MM" \
  --description "Act on the findings of the YYYY-MM documentation review." \
  --by "<your model or name>"
pdocs new report doc-status --owner item/docs-review-YYYY-MM \
  --title "Doc Status — YYYY-MM-DD" --description "…" \
  --by "<your model or name>"
```

`--lifecycle active` because the user asked for this review. The report lands in
`docs/items/docs-review-YYYY-MM/reports/`. Write its body under the frontmatter
the CLI wrote. When every follow-up action is done (or filed as its own item),
close the review: `pdocs set item/docs-review-YYYY-MM --lifecycle done`.

**Report sections:**

- **Executive Summary** — High-level findings (X completed, Y partially done, Z
  not started), top recommendations, overall documentation health assessment
- **Scope** — Which document types were reviewed, date range
- **Findings by Status:**
  - **Completed** — Document name, the `lifecycle` written, archive path if
    swept, brief summary, evidence (files/commits)
  - **Partially Completed** — Document name, percentage, what's done, what
    remains, evidence
  - **Not Started** — Document name, reason if apparent
  - **Dropped/Obsolete** — Document name, the `lifecycle` written, reason
  - **Needs Attention** — Documents requiring clarification or decision
- **Summary Statistics** — Total reviewed, completed, partial, not started,
  abandoned
- **Recommendations** — Prioritize partial completions, sweep finished features,
  open research items for uncertain ones
- **Follow-up Actions** — Checklist of concrete next steps

## Checklist: Documentation Review

- [ ] Identify documents to review (list files)
- [ ] Categorize by document type
- [ ] Launch one docs-curator agent per document
- [ ] Wait for all agents to complete
- [ ] Consolidate findings by recommended action
- [ ] Present summary to user
- [ ] Get approval before changing state or updating
- [ ] Execute approved actions (finished work through `sweep-project`)
- [ ] Write the report under its chore item
- [ ] Report completion
