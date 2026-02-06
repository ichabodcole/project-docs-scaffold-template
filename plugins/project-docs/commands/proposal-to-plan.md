---
description: "Create development plan from proposal"
allowed_tools: ["Read", "Write", "Grep", "Glob", "Task"]
---

You are tasked with creating a comprehensive development plan for implementing a
feature proposal.

**Proposal to analyze:** `docs/proposals/$1`

**Your workflow:**

1. **Read and understand the proposal**
   - Read the full proposal document at `docs/proposals/$1`
   - Identify the core features, requirements, and technical considerations

2. **Analyze the current codebase**
   - Search for relevant existing code that relates to this proposal
   - Identify components, services, stores, or workflows that will need
     modification
   - Look for potential blockers or conflicts with existing architecture
   - Determine if there are similar patterns already implemented that can be
     referenced

3. **Identify implementation requirements**
   - What new files/components need to be created?
   - What existing code needs to be modified?
   - Are there any architectural changes required?
   - What are the dependencies (libraries, services, APIs)?
   - What testing strategy is needed?

4. **Assess complexity and risks**
   - Identify technical challenges or blockers (use complexity indicators, NOT
     time estimates)
   - Note any unclear requirements that need clarification
   - Flag breaking changes or migration concerns
   - Consider performance, security, or UX implications
   - Identify pivotal points - complex areas, migrations, architectural changes

5. **Create the development plan**
   - Choose an appropriate filename: `YYYY-MM-DD-topic-plan.md`
   - Write a development plan to `docs/plans/[your-chosen-filename].md`
   - Use plan template as scaffolding, not a mandatory form
   - Think "gas stations on a road trip" - highlight important stops, not
     turn-by-turn directions
   - Include relevant sections:
     - **Overview**: Summary of the proposal and implementation approach
     - **Outcome & Success Criteria**: Clear definition of done
     - **Approach Summary**: High-level implementation strategy, path from
       current state to proposed state
     - **Phases**: Major chunks focused on pivotal points (complex areas,
       migrations, significant transitions)
       - Each phase: Goal, Key Changes (files/components/patterns), Validation,
         Dependencies
       - Focus on WHAT needs to change, not micro-level HOW
     - **Key Risks & Mitigations**: What could get complex or go wrong
     - **Testing Strategy**: Validation approach
     - **Assumptions & Constraints**: Operating boundaries
     - **Open Questions**: What needs resolution during implementation
   - Remember:
     - Complexity boxes, not time boxes
     - Provide the route, not step-by-step directions
     - Ground in current codebase with specific file references
     - Trust the developer to execute

**Output:** Create a development plan in `docs/plans/` with an appropriate
filename. Inform the user of the chosen filename and location when complete.
