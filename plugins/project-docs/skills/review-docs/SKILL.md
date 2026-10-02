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

`features/_archive/`, `items/_archive/` and `cycles/_archive/` hold finished
work; skip them unless the user asks.

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
2. Or leave them as items — see **File the findings** below

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

## File the findings

A review writes **no report file** (plan D24: reports are evidence owned by work
that exists for its own sake, and a skill writes no process report). Every
finding that needs work and was not done in Step 5 becomes a work item of its
own, where that work will happen — a partial completion, an outdated section, a
document needing a decision, a gap:

```bash
pdocs new item update-api-design-section-3 --kind chore \
  --title "Update section 3 of the API design page" \
  --description "Section 3 describes the v1 endpoints; the code serves v2." \
  --by "<your model or name>"
```

Pick `--kind bug` when the document states something false about behaviour,
`chore` otherwise. The item starts in `triage` — the default, because you filed
it on your own judgement (D8), and the user decides at triage whether it is
worth doing. Write the **evidence** in the item's body under the frontmatter the
CLI wrote: the document and section, what it says, what the code or history
shows instead (files, commits), and what done looks like. A finding about one
feature or item names it: add `--parent feature/<slug>` for a feature.

Then **summarise in the conversation**, not in a file:

- **Executive summary** — X finished, Y partially done, Z not started; overall
  health of the documentation in a sentence
- **Scope** — which document types were reviewed
- **What was done** — each feature or item swept (its `lifecycle` and archive
  path), each document updated
- **What was filed** — each new item's reference and title
- **Summary statistics** — total reviewed, finished, partial, not started,
  dropped

What you learned about how to review is not a finding: if the review taught
something a future review needs, it is a step in the playbook for reviews
(`docs/playbooks/`), and a session record holds what this run did when the
review ran on a branch.

## Checklist: Documentation Review

- [ ] Identify documents to review (list files)
- [ ] Categorize by document type
- [ ] Launch one docs-curator agent per document
- [ ] Wait for all agents to complete
- [ ] Consolidate findings by recommended action
- [ ] Present summary to user
- [ ] Get approval before changing state or updating
- [ ] Execute approved actions (finished work through `sweep-project`)
- [ ] File each remaining finding as a `triage` item, evidence in its body
- [ ] Summarise the review in the conversation — no report file
