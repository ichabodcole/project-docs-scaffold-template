---
name: operator-triage
description:
  Triage Operator documents by assessing content and routing to appropriate
  workflow stages
---

# Operator Document Triage

Methodical workflow for reviewing Operator documents and deciding their next
steps in the development pipeline.

## When to Use

Activate when:

- User mentions "triage" with Operator documents
- User wants to review items in Operator folders (bugs, fragments, on-deck,
  etc.)
- User asks to process or route Operator documents
- User has multiple documents to assess and route

## Prerequisites

- Operator MCP access configured (see `operator-setup` skill)
- Valid session with Operator Editor

## Triage Workflow

### 1. Authenticate with Operator

Use the cached session from `.operator` file, or re-authenticate if expired.

### 2. Locate Documents to Triage

Either:

- User provides specific document name(s)
- Browse a folder (e.g., "bugs", "fragments", "on-deck")
- Search for documents matching criteria

### 3. For Each Document: Assess → Decide → Record

#### A. Read and Assess

Read the document and determine:

| Aspect       | Questions                                                |
| ------------ | -------------------------------------------------------- |
| **Type**     | Bug report? Feature idea? Architecture thought? UX flow? |
| **Maturity** | Raw capture? Explored concept? Clear specification?      |
| **Clarity**  | Ready to act on? Needs investigation first?              |

#### B. Decide Routing

**Reference the docs framework:** See [docs/README.md](docs/README.md) for the
complete decision flowchart and document type definitions.

**Operator → Docs Routing** (from docs/README.md):

| Operator Content      | Routes To                                                  |
| --------------------- | ---------------------------------------------------------- |
| Feature ideas         | → Investigation or Proposal                                |
| Bug reports           | → Lesson Learned (if solved) or Investigation (if unclear) |
| Architecture thoughts | → Architecture documentation                               |
| UX flow thoughts      | → Interaction Design documentation                         |
| Work context          | → Referenced in Sessions                                   |

**Decision Framework** (simplified):

```
Is it a clear, solved problem?
  → Lesson Learned (document the fix)

Is it uncertain or needs research?
  → Investigation (explore before committing)

Is it a clear feature idea with known approach?
  → Proposal (define what and why)

Is it an approved proposal?
  → Plan (define how to build it)

Is it ready to implement?
  → Development (create worktree, start work)

Not ready to act on?
  → Fragment (capture for later)
```

**Quick Actions:**

| Route              | Next Action                                         |
| ------------------ | --------------------------------------------------- |
| **Investigation**  | Move to on-deck, launch `investigator` agent        |
| **Proposal**       | Create proposal doc using `proposal-writer` agent   |
| **Plan**           | Create dev plan using `dev-plan-generator` agent    |
| **Development**    | Create worktree using `parallel-worktree-dev` skill |
| **Lesson Learned** | Create doc in `docs/lessons-learned/`               |
| **Fragment**       | Move to fragments folder, revisit later             |
| **Defer**          | Move to backlog, note reason                        |

#### C. Record Decision as Task

Create a task capturing:

- **Subject**: `Triage: <document-name> → <routing-decision>`
- **Description**:
  - Source location in Operator
  - Summary of content (2-3 sentences)
  - Routing decision and rationale
  - Specific next steps to execute

Example:

```
Subject: Triage: missing-feature.md → Investigation

Description:
**Source:** Operator/bugs/missing-feature.md

**Summary:**
- Reports that X doesn't work when Y
- Unclear if bug or missing feature
- Needs codebase exploration

**Decision:** Investigation

**Next Steps:**
1. Move to on-deck folder
2. Launch investigator agent
3. Create proposal based on findings
```

### 4. After Triaging All Documents

1. Run `TaskList` to show all pending triage decisions
2. Ask user if ready to execute decisions
3. Execute in order:
   - Move documents to appropriate Operator folders
   - Launch agents as needed (investigator, proposal-writer, etc.)
   - Create docs or worktrees as appropriate
4. Mark tasks completed as each is executed

## Folder Conventions in Operator

| Folder      | Purpose                                               |
| ----------- | ----------------------------------------------------- |
| `fragments` | Raw ideas, quick captures, incomplete thoughts        |
| `bugs`      | Bug reports, issues to investigate                    |
| `on-deck`   | Ready for next action (investigation, proposal, etc.) |
| `proposals` | Feature proposals awaiting approval                   |
| `archive`   | Completed or declined items                           |

## Tips

- **Batch similar items**: If multiple docs route the same way, note patterns
- **Flag dependencies**: If doc A depends on doc B, note in task description
- **Preserve context**: Include enough detail in task to execute later without
  re-reading
- **Ask when unclear**: If routing isn't obvious, ask user for guidance
- **Reference the framework**: When uncertain, consult
  [docs/README.md](docs/README.md) decision flowchart
