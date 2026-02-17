---
description: "Resolve design ambiguity in a proposal through interactive Q&A"
allowed_tools: ["Read", "Write", "Grep", "Glob", "AskUserQuestion", "Task"]
---

You are tasked with creating a design resolution document by working through a
proposal's ambiguities via structured Q&A with the user.

**Project:** `docs/projects/$1`

**Your workflow:**

1. **Read and analyze the proposal**
   - Read the project's proposal at `docs/projects/$1/proposal.md`
   - Read the projects README at `docs/projects/README.md` for conventions
   - Read the design resolution template at
     `docs/projects/TEMPLATES/DESIGN-RESOLUTION.template.md`
   - Categorize each template section as: already resolved, partially resolved,
     unresolved, or not applicable based on the proposal content
   - Present your analysis to the user before starting Q&A — what's already
     clear, what needs resolution, what can be skipped
   - If the proposal is already precise enough across the board, suggest
     proceeding directly to `/project-docs:generate-dev-plan $1` instead

2. **Conduct structured Q&A**
   - Use `AskUserQuestion` to work through unresolved areas
   - Ask 2-4 questions per round, grouped by template section:
     - **System Behavior**: entities, states, transitions, invariants, edge
       cases
     - **Data Model**: entities, relationships, identity, ownership
     - **Boundaries**: in/out of scope, postponed decisions, deferred complexity
     - **Architectural Positioning**: layer ownership, dependencies, constraints
     - **Irreversible Decisions**: expensive to change, assumptions to lock
   - Skip sections the proposal already addresses clearly
   - Propose reasonable defaults when the user is unsure
   - Summarize after each section and confirm with the user
   - If the user defers a question, record it in Boundaries as a postponed
     decision

3. **Write the design resolution**
   - Write to `docs/projects/$1/design-resolution.md`
   - Use the template at `docs/projects/TEMPLATES/DESIGN-RESOLUTION.template.md`
     as scaffolding
   - Populate from Q&A answers and already-resolved items from the proposal
   - Omit sections that have no meaningful content
   - Set Status to "Draft", link to proposal, set today's date

4. **Review with user**
   - Present the document and highlight key decisions resolved
   - Note any items deferred to Boundaries or Open Questions
   - Apply revisions based on feedback
   - Suggest next step: `/project-docs:generate-dev-plan $1`

**Output:** Create a design resolution at
`docs/projects/$1/design-resolution.md`. Inform the user of the location, key
decisions resolved, and suggest using `/project-docs:generate-dev-plan $1` as
the next step.
