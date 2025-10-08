---
description: "Create development plan from proposal"
allowed_tools: ["Read", "Write", "Grep", "Glob", "Task"]
---

You are tasked with creating a comprehensive development plan for implementing a feature proposal.

**Proposal to analyze:** `docs/proposals/$1`

**Your workflow:**

1. **Read and understand the proposal**
   - Read the full proposal document at `docs/proposals/$1`
   - Identify the core features, requirements, and technical considerations

2. **Analyze the current codebase**
   - Search for relevant existing code that relates to this proposal
   - Identify components, services, stores, or workflows that will need modification
   - Look for potential blockers or conflicts with existing architecture
   - Determine if there are similar patterns already implemented that can be referenced

3. **Identify implementation requirements**
   - What new files/components need to be created?
   - What existing code needs to be modified?
   - Are there any architectural changes required?
   - What are the dependencies (libraries, services, APIs)?
   - What testing strategy is needed?

4. **Assess complexity and risks**
   - Identify technical challenges or blockers
   - Note any unclear requirements that need clarification
   - Flag breaking changes or migration concerns
   - Consider performance, security, or UX implications

5. **Create the development plan**
   - Choose an appropriate filename for the plan (e.g., `ai-script-editing-plan.md`, `tts-version-history-implementation-plan.md`)
   - Write a structured development plan to `docs/plans/[your-chosen-filename].md`
   - Include:
     - **Overview**: Summary of the proposal and implementation approach
     - **Current State Analysis**: What exists today and what needs to change
     - **Implementation Steps**: Ordered, actionable tasks broken into logical phases
     - **Technical Considerations**: Architecture decisions, patterns to follow, potential blockers
     - **Testing Strategy**: How to verify the implementation works
     - **Open Questions**: Anything that needs clarification before starting
     - **References**: Links to relevant existing code, docs, or related proposals

**Output:**
Create a detailed, actionable development plan in `docs/plans/` with an appropriate filename. Inform the user of the chosen filename and location when complete.
