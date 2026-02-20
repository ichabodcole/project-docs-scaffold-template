---
name: "generate-proposal"
description: >
  Create a project proposal from a completed investigation. Use when an
  investigation has concluded with a "Proposal Recommended" outcome and the user
  wants to formalize it into a project folder with proposal.md. Transforms
  exploratory findings into a structured commitment. Triggers when user asks to
  "create a proposal", "write a proposal from this investigation", "turn this
  investigation into a proposal", or wants to move from research to action.
allowed_tools: ["Read", "Write", "Grep", "Glob", "Task"]
---

You are tasked with creating a formal feature proposal based on a completed
investigation document.

**Investigation to analyze:** `docs/investigations/$1`

**Your workflow:**

1. **Read and understand the investigation**
   - Read the full investigation document at `docs/investigations/$1`
   - Identify the key findings, evidence gathered, and recommendation
   - Understand what problem or opportunity was discovered
   - Note the options that were considered

2. **Verify investigation recommends a proposal**
   - Ensure the investigation outcome is "Proposal Recommended" or similar
   - If the investigation concluded "No Action Needed," inform the user and ask
     if they still want to proceed
   - If investigation is still "Active," warn user it may be incomplete

3. **Analyze relevant codebase context**
   - Search for code referenced in the investigation
   - Review current implementations mentioned in findings
   - Identify architecture patterns that will be affected
   - Look for similar features or patterns already implemented

4. **Extract proposal elements from investigation**
   - **Problem Statement:** Use the investigation's motivation and findings
   - **Current State:** Leverage the "Current State Analysis" section
   - **Evidence:** Reference specific findings and data from investigation
   - **Options:** Build on "Options Considered" with deeper exploration
   - **Scope:** Define what's in/out based on investigation insights

5. **Expand beyond the investigation**
   - Add user-facing benefit descriptions
   - Define success criteria and acceptance criteria
   - Identify technical dependencies not covered in investigation
   - Consider UX/UI implications if applicable
   - Outline implementation complexity and risks
   - Suggest phased approach if appropriate

6. **Create the project folder and proposal**
   - Choose a descriptive project folder name (kebab-case, no date prefix):
     e.g., `oauth-upgrade`, `search-enhancement`, `milkdown-editor`
   - Create the project folder: `docs/projects/<project-name>/`
   - Read the projects README at `docs/projects/README.md` to understand
     conventions
   - Use the proposal template at `docs/projects/TEMPLATES/PROPOSAL.template.md`
     as scaffolding
   - Write the proposal to `docs/projects/<project-name>/proposal.md`
   - Focus on high to mid-level ("capitals not gas stations")
   - Include relevant sections:
     - **Metadata:** Date, Status, Related investigation link
     - **Problem Statement (The "Why"):** Why is action needed? (from
       investigation findings)
     - **Current State:** What exists today and what are the issues? (from
       investigation analysis)
     - **Proposed Solution (The "What"):** High-level approach (weave
       alternatives into the narrative, don't separate)
     - **Scope:** What's in/out of scope - be clear about boundaries
     - **Technical Considerations:** Architecture, dependencies, complexity
     - **Success Criteria:** How will we know this solves the problem?
     - **Open Questions:** Anything needing clarification before planning
   - Remember: This is the story of what you're proposing, not a specification
     form

7. **Link documents together**
   - Reference the investigation in the proposal's "Related Documents" section
   - Note in the proposal: "This proposal is based on
     [Investigation: Topic](../../investigations/investigation-file.md)"

**Important guidelines:**

- **Maintain investigation evidence:** Don't lose the data and analysis;
  reference it liberally
- **Transform perspective:** Investigation asks "Should we?" → Proposal states
  "We should, here's what"
- **Add depth:** Investigations are exploratory; proposals are commitments with
  more detail
- **Stay high-level:** Proposals describe WHAT to build, not HOW (that's for
  plans)
- **No code implementation:** Proposals should not include detailed code
  (illustrative examples OK)

**Output:**

Create a project folder in `docs/projects/` with a `proposal.md` inside it.
Inform the user of:

- The project folder name and location
- How the investigation findings informed the proposal
- Key elements added beyond the investigation
- Any concerns or questions that arose during the transformation
