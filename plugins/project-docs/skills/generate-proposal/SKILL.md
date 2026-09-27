---
name: "generate-proposal"
description: >
  Create a feature — its feature.md is the proposal — from a completed
  investigation: a research work item whose write-up recommends building
  something. Transforms exploratory findings into a structured commitment, and
  moves the feature to `ready` when its owner approves it. Triggers when user
  asks to "create a proposal", "write a proposal from this investigation", "turn
  this investigation into a proposal", "turn this research into a feature", or
  wants to move from research to action.
allowed_tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "Agent"]
---

You are tasked with creating a formal feature proposal based on a completed
investigation.

**Investigation to analyze:** `$1` — a research work item, `item/<slug>` (or its
id). An investigation is two files in `docs/items/<slug>/`: `item.md`, the
question and its state, and `write-up.md`, the findings and recommendation.
`pdocs` below means `bun scripts/pdocs/cli.ts`, the documentation CLI at the
repo root.

**Your workflow:**

1. **Read and understand the investigation**
   - Read the item and its full `write-up.md` (and any `reports/` it cites)
   - Identify the key findings, evidence gathered, and recommendation
   - Understand what problem or opportunity was discovered
   - Note the options that were considered

2. **Verify investigation recommends a proposal**
   - Ensure the write-up's Recommendation is to build something
   - If it concluded "no action needed", inform the user and ask if they still
     want to proceed
   - If the item is still `active` (not `done`), warn the user the research may
     be incomplete

3. **Analyze relevant codebase context**
   - Search for code referenced in the investigation
   - Review current implementations mentioned in findings
   - Identify architecture patterns that will be affected
   - Look for similar features or patterns already implemented

4. **Extract proposal elements from investigation**
   - **Problem Statement:** Use the investigation's motivation and findings
   - **Current State:** Leverage the write-up's "Current State" section
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

6. **Create the feature and write its proposal**
   - Choose a descriptive name (kebab-case, no date prefix): e.g.,
     `oauth-upgrade`, `search-enhancement`, `milkdown-editor`. Check it isn't
     taken: `pdocs view board --features`.
   - Create it with the CLI, linking the write-up it came from:

     ```bash
     pdocs new feature <name> \
       --title "<Title>" --description "<one sentence: what this proposes and why>" \
       --tags "<2-4,kebab-case>" --by "<your model or name>" \
       --from docs/items/<research-slug>/write-up.md
     ```

     It creates `docs/features/<name>/feature.md` from the template, fills the
     frontmatter, starts it in `backlog`, and writes the link to the write-up
     into its Related section. Read `docs/features/README.md` for conventions.

   - Fill every placeholder the template leaves. `pdocs check` reports one left
     in the frontmatter or the H1 (`PLACEHOLDER`); the body's prompts are yours
     to catch. Leave `related` out unless the proposal genuinely leans on a
     library page (a playbook, an architecture doc) — those keys are
     `type/<basename-without-.md>` and are the only ones that resolve.
   - Focus on high to mid-level ("capitals not gas stations")
   - Include relevant sections:
     - **Metadata:** the research item the proposal came from
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
   - `--from` already put the write-up in the feature's Related section. Say in
     the body: "This proposal is based on
     `[Write-up: Topic](../../items/<research-slug>/write-up.md)`"
   - If the research item is not yet `done`, and this proposal is its
     conclusion, set it: `pdocs set item/<research-slug> --lifecycle done`

8. **Approval** — the feature stays in `backlog` while it is being shaped. When
   the owner says it is approved to build (now, or on a later run), move it:
   `pdocs set feature/<name> --lifecycle ready`. Never on your own judgement.

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

Create a feature in `docs/features/<name>/` with its `feature.md`. Inform the
user of:

- The feature's name and location, and its state (`backlog`, or `ready` if the
  owner approved it)
- How the investigation findings informed the proposal
- Key elements added beyond the investigation
- Any concerns or questions that arose during the transformation
