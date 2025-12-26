# Create Development Plan from Proposal

You are tasked with creating a comprehensive development plan for implementing a feature proposal.

## Your Workflow

### 1. Read and Understand the Proposal

- Read the full proposal document provided by the user
- Identify the core features, requirements, and technical considerations
- Clarify any ambiguous requirements
- If the user did not provide a path to a proposal file, ask them for a link to the proposal file.

### 2. Analyze the Current Codebase

- Search for relevant existing code that relates to this proposal
- Identify components, services, stores, or workflows that will need modification
- Look for potential blockers or conflicts with existing architecture
- Determine if there are similar patterns already implemented that can be referenced

### 3. Identify Implementation Requirements

- What new files/components need to be created?
- What existing code needs to be modified?
- Are there any architectural changes required?
- What are the dependencies (libraries, services, APIs)?
- What testing strategy is needed?

### 4. Assess Complexity and Risks

- Identify technical challenges or blockers
- Note any unclear requirements that need clarification
- Flag breaking changes or migration concerns
- Consider performance, security, or UX implications

### 5. Create the Development Plan

- Choose an appropriate filename for the plan (e.g., `ai-script-editing-plan.md`, `tts-version-history-implementation-plan.md`)
- Write a structured development plan to `docs/plans/[your-chosen-filename].md`

## Plan Structure

Include the following sections in your plan:

- **Overview**: Summary of the proposal and implementation approach
- **Current State Analysis**: What exists today and what needs to change
- **Implementation Steps**: Ordered, actionable tasks broken into logical phases
- **Technical Considerations**: Architecture decisions, patterns to follow, potential blockers
- **Testing Strategy**: How to verify the implementation works
- **Open Questions**: Anything that needs clarification before starting
- **References**: Links to relevant existing code, docs, or related proposals

## Output

Create a detailed, actionable development plan in `docs/plans/` with an appropriate filename. Inform the user of the chosen filename and location when complete.
