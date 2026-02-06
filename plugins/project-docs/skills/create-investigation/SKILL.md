---
name: "create-investigation"
description: "Start investigation from rough idea"
allowed_tools: ["Read", "Write", "Grep", "Glob", "Task"]
---

# Create Investigation Document

Create a structured investigation document from a rough, conversational idea or
question.

**Raw input to process:** The user's freeform thoughts following this command

**Your workflow:**

1. **Parse and understand the raw input**
   - The input may be:
     - Voice-to-text transcription (conversational, with verbal fillers)
     - Rough notes or bullet points
     - Stream-of-consciousness thinking
     - Semi-structured but incomplete thoughts
   - Extract the core question or problem being explored
   - Identify key concerns, unknowns, or motivations mentioned

2. **Identify the investigation scope**
   - What is the central question? ("Should we...?", "Is it worth...?", "Could
     we...?")
   - What type of investigation is this?
     - Code quality/refactoring question
     - Technology evaluation
     - Feature feasibility study
     - Performance concern
     - Architecture decision exploration
   - What's the uncertainty level? (early exploration vs. focused research)

3. **Search for relevant context**
   - Look for existing code, docs, or patterns related to the topic
   - Identify similar features or systems already implemented
   - Find related proposals, architecture docs, or sessions
   - Gather baseline information to inform the investigation

4. **Structure the investigation**
   - **Question/Motivation:** Clarify the core question and why it matters
   - **Current State Analysis:** Document what exists today (code, systems,
     patterns)
   - **Initial Observations:** Capture any early insights from context search
   - **Open Questions:** List specific things to investigate further
   - Keep it flexible - use sections that help communicate, skip what doesn't
     add value

5. **Create the investigation document**
   - Choose an appropriate filename: `YYYY-MM-DD-topic-investigation.md`
   - Write to `docs/investigations/[filename].md`
   - Set Status: "Active" (investigation is starting, not concluded)
   - Set Outcome: "In Progress"
   - Use investigation template as scaffolding, not a mandatory form
   - Include relevant sections:
     - **Question/Motivation** (from parsed input)
     - **Current State Analysis** (from context search)
     - **Investigation Findings** (what you've discovered so far)
     - **Open Questions** (specific things to explore)
     - **Next Steps** (immediate actions to continue investigation)
   - Remember: lightweight to moderate complexity - avoid time estimates, use
     complexity indicators

6. **Transform the input thoughtfully**
   - **Preserve intent:** Keep the user's core concerns and questions
   - **Add structure:** Organize scattered thoughts into logical sections
   - **Remove noise:** Filter out verbal fillers ("um", "you know", "like") from
     voice input
   - **Add context:** Include relevant code references or existing patterns
     discovered
   - **Stay open-ended:** Don't jump to conclusions - frame as exploration, not
     answers
   - **Maintain uncertainty:** If the user is unsure, the investigation should
     reflect that

**Important guidelines:**

- **This is a starting point, not a conclusion:** The investigation document
  should frame the research, not answer it
- **Don't over-formalize:** The user's rough thoughts should become structured
  but remain exploratory
- **Leave room for discovery:** Include "Open Questions" and "Research Plan"
  sections
- **Link to context:** Reference any relevant existing code, docs, or patterns
  found
- **Scope reminder:** Note that investigation should be lightweight to moderate
  complexity with clear boundaries
- **Conversational to professional:** Transform speech patterns into clear
  written prose, but keep the exploratory tone

**Handling different input styles:**

**Voice-to-text input:**

```
"Um, so I've been thinking, you know, like maybe we should look at refactoring
the AI composables because they're getting kind of messy and there's a lot of
duplication, like every time we add a new workflow it's basically copy-paste,
and I'm not sure if that's, like, a real problem or just me being picky..."
```

**Transform to:**

```markdown
## Question / Motivation

Should we refactor the AI composables? There appears to be significant code
duplication across workflows, with each new workflow requiring substantial
copy-paste. Need to determine if this is a genuine maintainability concern or
acceptable given current system complexity.
```

**Rough notes input:**

```
- ai composables getting complex
- lots of duplication?
- every new workflow = 200+ lines boilerplate
- maybe factor pattern?
- not sure if worth it
```

**Transform to:**

```markdown
## Question / Motivation

Should we refactor AI composables to reduce duplication? Initial observation
suggests each new workflow requires ~200+ lines of boilerplate code.
Investigating whether a factory pattern or similar abstraction would provide
value vs. current implementation.

## Open Questions

- How much actual duplication exists across composables?
- What patterns could reduce boilerplate?
- What's the maintenance cost of current approach vs. refactored approach?
```

**Output:**

Create an investigation document in `docs/investigations/` with:

- Appropriate filename based on topic and current date
- Status: "Active"
- Structured format following investigations README template
- Clear research plan for continuing the investigation
- Referenced context from codebase/docs

Inform the user of:

- The chosen filename and location
- The core question extracted from their input
- Key areas identified for investigation
- Suggested next steps for continuing the research
- Any relevant existing code or docs that should be reviewed
