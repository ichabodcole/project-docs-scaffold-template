---
name: "create-investigation"
description: >
  Turn a rough idea, voice note, or freeform thoughts into an investigation: a
  research work item (the question, and what a good answer must settle) and the
  write-up it owns, in docs/items/<slug>/. Use when the user has an unstructured
  question or concern they want to explore. Also closes the research item — sets
  it `done` — when the investigation concludes. Triggers when user says
  "investigate this", "I've been thinking about", "should we look into", "start
  an investigation", or provides rough voice-to-text or bullet-point input that
  needs structuring.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - Agent
---

# Create Investigation Document

Create a structured investigation from a rough, conversational idea or question.

An investigation is **a research work item and its write-up**, two files in one
folder:

- **The item** (`docs/items/<slug>/item.md`, `kind: research`) is the asking:
  the question, what a good answer must settle (its definition of done), and the
  state of the work.
- **`write-up.md`** beside it is the answer as it develops: current state,
  findings, options, recommendation. It carries no `lifecycle`; the item does.

Evidence gathered on the way — an audit, a benchmark — goes in the item's
`reports/` (`pdocs new report <slug> --owner item/<slug>`). `pdocs` below means
`bun scripts/pdocs/cli.ts`, the documentation CLI at the repo root.

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
   - Find related features, research items, architecture docs, or sessions
   - Gather baseline information to inform the investigation

4. **Structure the investigation**
   - **Question/Motivation:** Clarify the core question and why it matters
   - **Current State Analysis:** Document what exists today (code, systems,
     patterns)
   - **Initial Observations:** Capture any early insights from context search
   - **Open Questions:** List specific things to investigate further
   - Keep it flexible - use sections that help communicate, skip what doesn't
     add value

5. **Create the research item and its write-up**
   - Choose a slug: kebab-case, 2–4 words naming the question, no date
     (`ai-composable-duplication`). The CLI dates what needs dating.
   - Create the item. **The user asked for this investigation**, so it is
     accepted work, not an agent's filing: start it `ready`, or `active` when
     you are about to work on it now. (Items an agent files on its own start in
     `triage`; this is not that.)

     ```bash
     pdocs new item <slug> --kind research --lifecycle active \
       --title "<the question, as a title>" \
       --description "<one sentence: the question this sets out to answer>" \
       --by "<your model or name>"
     ```

   - Fill the item's body: the question and why it matters, and its **Definition
     of done** — the decision the answer must support.
   - Create the write-up it owns. The CLI promotes the item to a folder and
     links the write-up back to it:

     ```bash
     pdocs new write-up --owner item/<slug> \
       --title "<Topic>" --description "<one sentence: what this finds>" \
       --by "<your model or name>"
     ```

   - Write the investigation into `write-up.md`, using its template's sections
     as scaffolding, not a mandatory form. Fill its frontmatter placeholders —
     `description`, `tags` — `pdocs check` reports one left in place
     (`PLACEHOLDER`). It keeps `status: draft` while findings are provisional,
     and becomes `stable` when the investigation concludes.
   - The template's sections, filled from what you have:
     - **Question** (from parsed input)
     - **Current State** (from context search)
     - **Findings** (what you've discovered so far)
     - **Next Steps** (immediate actions to continue the investigation)
     - **Open Questions** (specific things to explore)
     - **Recommendation** stays open until the investigation concludes
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

**When the investigation concludes:**

The research item's state is where "concluded" is recorded — this skill writes
it, because research done in conversation never passes through
`finalize-branch`. When the write-up reaches a recommendation (build it, don't,
or monitor):

1. Finish the write-up's recommendation and set its `status: stable`.
2. Close the item:

   ```bash
   pdocs set item/<slug> --lifecycle done
   ```

   If the research was abandoned rather than answered, use `dropped` and say why
   in the write-up.

3. If it recommends building something, offer the next step: a feature
   (`create-project`, or `generate-proposal` from this write-up) or work items
   filed with `--from item/<slug>`.

If the research runs on a branch that `finalize-branch` lands, that skill sets
the item `done` instead; don't set it twice.

**Output:**

If the project has a documentation lint (`scripts/pdocs/cli.ts` at the repo
root), run `bun scripts/pdocs/cli.ts check` before reporting, and fix anything
it says about the files you just wrote.

Create, in `docs/items/<slug>/`:

- `item.md` — `kind: research`, `ready` or `active`, with the question and its
  definition of done
- `write-up.md` — the investigation, frontmatter filled
- A clear research plan for continuing the investigation
- Referenced context from codebase/docs

Inform the user of:

- The item's reference (`item/<slug>`) and the two paths
- The core question extracted from their input
- Key areas identified for investigation
- Suggested next steps for continuing the research
- Any relevant existing code or docs that should be reviewed
