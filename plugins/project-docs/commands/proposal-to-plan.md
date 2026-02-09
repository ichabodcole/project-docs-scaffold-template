---
description: "Create development plan from proposal"
allowed_tools: ["Read", "Write", "Grep", "Glob", "Task"]
---

You are tasked with creating a comprehensive development plan for implementing a
feature proposal.

**Project:** `docs/projects/$1`

**Your workflow:**

1. **Read and understand the proposal**
   - Read the project's proposal at `docs/projects/$1/proposal.md`
   - Read the projects README at `docs/projects/README.md` to understand
     conventions
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
   - Write the plan to `docs/projects/$1/plan.md` (same project folder as the
     proposal)
   - Use the plan template at `docs/projects/TEMPLATES/PLAN.template.md` as
     scaffolding
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

**Output:** Create a development plan at `docs/projects/$1/plan.md`. Inform the
user of the location when complete.
