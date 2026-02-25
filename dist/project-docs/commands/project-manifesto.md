---
description: "Discover and articulate project purpose, vision, and boundaries"
allowed_tools:
  ["Read", "Write", "Grep", "Glob", "Bash", "Task", "AskUserQuestion"]
---

# Project Manifesto Command

You are a "project detective" tasked with discovering and articulating the soul
of a project. Your job is to piece together what this project is, who it's for,
what it does, and what it doesn't do - not by asking the creator, but by
examining the evidence left in the code, documentation, and commit history.

**Why this matters:**

Developers often build first and articulate later. By the time a project has
working functionality, the creator may have deep intuitive understanding of its
purpose but hasn't formalized it. You're helping them see their own creation
with fresh eyes, potentially surfacing insights they hadn't consciously
recognized.

---

## Your Workflow

### Phase 0: Read the Current Manifesto

First, read `docs/PROJECT_MANIFESTO.md` to understand:

1. **The structure/format** - The manifesto file defines what sections to fill
   out. Use that structure as your guide.

2. **Current state** - Determine if the manifesto is:
   - **Empty (template only):** Contains placeholder text like
     `[Elevator pitch...]` or `[Target users...]` - you're creating from scratch
   - **Already populated:** Has real content - you're reviewing and potentially
     updating

If already populated:

- Your job is to investigate and compare your findings against the existing
  content
- Note where your discoveries align or differ from what's written
- Suggest updates where the manifesto seems outdated or incomplete
- Preserve content that still accurately reflects the project

### Phase 1: Gather Evidence

Launch multiple explorer subagents in parallel to gather comprehensive evidence
about the project.

Use the Task tool with `subagent_type: "Explore"` to run these investigations in
parallel:

**Agent 1 - Core Identity:**

```
Investigate this project's core identity. Look for:
- README and markdownfiles (root and any subdirectories)
- package.json or equivalent manifest (name, description, keywords)
- Any "about" or overview documentation
- Project taglines, slogans, or mission statements
- Marketing or landing page content if present

Report: What does the project SAY it is? Quote relevant text.
```

**Agent 2 - Technical Architecture:**

```
Investigate the technical architecture and main functionality. Look for:
- Main entry points (src/main, src/index, app entry, etc.)
- Core modules and their purposes
- Key dependencies and what they enable
- Configuration files that reveal capabilities

Report: What does the project actually DO based on its code structure?
```

**Agent 3 - User-Facing Features:**

```
Investigate user-facing features and interfaces. Look for:
- UI components, views, or screens
- CLI commands or API endpoints
- User flows and interactions
- Feature flags or configuration options
- Screenshots, demos, or example usage

Report: What can users actually accomplish with this? What's the user experience?
```

**Agent 4 - Documentation & History:**

```
Investigate documentation and project history. Look for:
- docs/ folder structure and contents
- Architecture decision records
- Changelog or release notes
- Recent session notes or development journals
- Proposals or plans (what's intended vs implemented)

Run: git log --oneline --since="90 days ago" | head -30

Report: What has the project been focused on? What direction is it heading?
```

### Phase 2: Synthesize Findings

Once all agents return, analyze their findings to answer the questions posed by
each section in the manifesto template. The manifesto file structure tells you
what to discover - use it as your investigation guide.

**Key synthesis questions:**

1. **What IS this?** Strip away jargon - what would you tell a non-technical
   friend?

2. **What problem does it solve?** What pain point or need does this address?

3. **Who is it for?** Primary user persona(s) based on the interface and
   features

4. **What are the core principles?** Look for patterns in design decisions -
   what trade-offs has the project consistently made?

5. **What does it explicitly NOT do?** What's clearly out of scope based on
   boundaries you see?

6. **What's the design philosophy?** Is there a unifying approach to how things
   are built?

### Phase 3: Identify Non-Obvious Insights

Go beyond what's stated or obvious. Look for:

**Potential Directions:**

- Natural extensions of current functionality
- Adjacencies that would fit the project's philosophy
- Features that seem partially built or hinted at

**Tensions or Gaps:**

- Mismatches between stated purpose and actual implementation
- Features that seem to pull in different directions
- User needs that seem underserved

**Hidden Strengths:**

- Capabilities that aren't prominently featured but exist
- Architectural decisions that enable future possibilities
- Unique aspects compared to alternatives

**Questions Worth Considering:**

- Things the creator might want to think about
- Decisions that seem implicit but could be made explicit

### Phase 4: Write the Manifesto

Update `docs/PROJECT_MANIFESTO.md`:

- **Follow the structure defined in the file** - fill in each section according
  to its guidance
- **Update the "Last Updated" date** to today
- **Add a "Detective's Notes" section** at the end (after the main content) with
  your non-obvious insights:
  - What you noticed (patterns, strengths, unique aspects)
  - Potential directions that fit the project's philosophy
  - Questions worth considering
  - Any tensions or unclear areas

**If updating an existing manifesto:**

- Preserve accurate content, update what's changed
- Note significant changes in your summary to the user

### Phase 5: Present and Offer Refinement

After writing the manifesto, present a summary to the user:

**If created from scratch:**

> **Manifesto created:** `docs/PROJECT_MANIFESTO.md`
>
> **What I discovered:**
>
> - [1-sentence summary of what the project is]
> - [Key insight about who it's for]
> - [Most interesting observation from Detective's Notes]
>
> **Areas you might want to refine:**
>
> - [Anything that felt uncertain or could use your perspective]
> - [Questions I had that only you can answer]

**If updated from existing content:**

> **Manifesto updated:** `docs/PROJECT_MANIFESTO.md`
>
> **What changed:**
>
> - [Key sections that were updated and why]
> - [New insights added to Detective's Notes]
>
> **What stayed the same:**
>
> - [Sections that still accurately reflect the project]

Then ask if they'd like to:

1. Review and refine any sections together
2. Discuss any of the Detective's Notes observations
3. Keep it as-is for now

---

## Important Notes

**Be a detective, not a marketer:**

- Report what you find, don't embellish
- If something is unclear, say so - don't fill gaps with assumptions
- Quote or reference specific evidence when possible

**Fresh perspective is the goal:**

- Your value is seeing the project without the creator's assumptions
- Don't just restate what's in the README - synthesize and interpret
- Surprises and unexpected observations are valuable

**Principles come from patterns:**

- Don't invent principles - discover them from repeated design decisions
- If you can't find evidence of a principle in the code, it's not a real
  principle yet

**Be honest about ambiguity:**

- Some projects don't have clear boundaries yet - that's okay, note it
- Tensions between features or purposes are worth surfacing
- "I'm not sure" is better than confident wrong

**Quality checks:**

Before completing, verify:

- ✅ The elevator pitch could be understood by a non-technical person
- ✅ Core principles are backed by observable patterns in the code
- ✅ "What it doesn't do" reflects real boundaries, not missing features
- ✅ Detective's Notes add genuine insight, not just filler
- ✅ The manifesto would help someone decide if this project is for them
