---
name: "proposal-to-design-resolution"
description: >
  Resolve design ambiguity in a proposal through structured Q&A before
  development planning. Use when the user has a proposal with unresolved
  behavioral questions, unclear data models, or architectural ambiguity.
  Triggers when user asks to "resolve design questions", "clarify the proposal
  before planning", "work through design decisions", "create a design
  resolution", "collapse ambiguity", or mentions needing system-level clarity
  before creating a development plan.
allowed_tools: ["Read", "Write", "Grep", "Glob", "AskUserQuestion", "Task"]
---

# Proposal to Design Resolution

## Purpose

Resolve design-level ambiguity in a proposal through structured, interactive Q&A
before development planning begins. The process is as important as the document
— this is a convergence phase where unclear system behavior, data shape,
boundaries, and architectural positioning are deliberately crystallized.

The template defines point B. This skill is the methodology for getting there.

## Philosophy

- **Convergence, not creation.** This stage does not introduce new goals or
  features. It hardens existing ones from the proposal. If a new idea surfaces
  during Q&A, note it but don't expand scope.
- **The conversation IS the work.** The Q&A process forces decisions that would
  otherwise be made informally during implementation. Even if the final document
  is short, the process of deliberate decision-making prevents drift.
- **Adaptive depth.** Spend time where ambiguity is highest. Move quickly
  through areas the proposal already resolves. A small project might only need
  Boundaries and Irreversible Decisions. A complex one might need all sections.
- **Preserve the user's voice.** The decisions are theirs. You facilitate,
  clarify, and document — you don't decide for them. When proposing defaults,
  frame them as suggestions and confirm.
- **Lightweight where possible, formal when valuable.** Don't force ceremony on
  work that doesn't need it. If the proposal is already clear enough, say so and
  suggest skipping to a plan.

## Process

### Phase 1: Read & Analyze Proposal

1. Read the proposal at `docs/projects/$1/proposal.md`
2. Read the projects README at `docs/projects/README.md` for conventions
3. Read the design resolution template at
   `docs/projects/TEMPLATES/DESIGN-RESOLUTION.template.md` to understand the
   target structure

4. Analyze the proposal against each template section, categorizing:
   - **Already resolved** — The proposal is clear and specific on this topic
   - **Partially resolved** — Direction is clear but details are ambiguous
   - **Unresolved** — The proposal is silent or vague on this topic
   - **Not applicable** — This section doesn't apply to this project

5. Present the analysis to the user before starting Q&A:
   - What the proposal covers well (don't waste their time on these)
   - Areas needing resolution, organized by template section
   - Which sections can likely be skipped
   - A sense of how many Q&A rounds to expect

   This step prevents wasting time on questions the proposal already answers. It
   also gives the user a chance to redirect — they may know that certain
   sections don't matter for this work, or that certain areas are more important
   than you'd guess from the proposal alone.

6. **Gate check:** If the proposal is already precise enough across the board,
   tell the user. Suggest proceeding directly to
   `/project-docs:proposal-to-plan` instead. Don't force design resolution on
   work that doesn't need it.

### Phase 2: Structured Q&A

Conduct multiple rounds of `AskUserQuestion`, organized around the template
sections that need resolution.

**Mechanics:**

- Ask 2-4 questions per round. Do not overwhelm with walls of questions.
- Group related questions together (all system behavior questions in one round,
  all data model questions in another).
- After each round, summarize what was decided and confirm with the user before
  moving to the next section.
- If the user says "I'll figure that out during implementation" or "I don't know
  yet," that's a valid answer — record it as a postponed decision in Boundaries,
  not as an unresolved question.

**Section-by-section guidance:**

#### System Behavior (skip if proposal is already behaviorally precise)

Focus on making implicit behavior explicit. Good questions:

- "Your proposal mentions [entity] — what states can it be in?"
- "What should happen when [edge case] occurs?"
- "What invariants must always hold? For example, can [entity] ever be in
  [invalid state]?"
- "What failure modes do you anticipate for [operation]?"

Use concrete scenarios, not abstract questions. Instead of "how should state
transitions work?", ask "if a user starts [action X] and then [event Y] happens,
what state should [entity Z] be in?"

#### Data Model (skip if proposal defines entities clearly)

Focus on relationships and ownership, not schemas. Good questions:

- "What uniquely identifies [entity]?"
- "You've described [relationship] — who owns this? Is it required or optional?"
- "What properties does [entity] have? Which are essential vs. nice-to-have?"
- "When [entity A] is deleted, what happens to related [entity B]?"

#### Boundaries (skip if proposal scope is already tight)

Focus on sharpening edges. Good questions:

- "The proposal mentions [Z] as out of scope — is that permanent or deferred to
  a later phase?"
- "Are there aspects of [feature] you're deliberately not tackling now?"
- "What complexity are you acknowledging but parking for later?"

#### Architectural Positioning (skip if architecture is clear)

Focus on integration and constraints. Good questions:

- "Where does this live in the system? What layer owns it?"
- "What existing systems does this depend on? What depends on it?"
- "Is there anything about the current architecture that conflicts with this
  proposal?"
- "Does this impose constraints on future work you want to be explicit about?"

#### Irreversible Decisions (always ask at least one round)

This section is always worth visiting, even for simple projects. Good questions:

- "What decisions here would be expensive to change later?"
- "What assumptions need to be locked before planning begins?"
- "Are there any commitments this makes that constrain future options?"

**Adaptive behavior:**

- **Skip sections** where Phase 1 showed "Already resolved" or "Not applicable"
- **Go deeper** where Phase 1 showed "Unresolved" — these may need 2+ rounds
- **Propose answers when the user is unsure.** Suggest reasonable defaults based
  on the proposal and codebase context, mark them as assumptions, and confirm
- **Allow partial resolution.** Not everything needs a definitive answer. Items
  that genuinely can't be resolved yet go in Open Questions for the plan to
  address.

### Phase 3: Synthesize & Write

1. Gather all Q&A answers and the already-resolved items from Phase 1
2. Write the design resolution to `docs/projects/$1/design-resolution.md`
3. Use the template at `docs/projects/TEMPLATES/DESIGN-RESOLUTION.template.md`
   as scaffolding
4. Fill in sections based on Q&A responses:
   - Set Status to "Draft"
   - Set Created date to today
   - Link to the proposal via `./proposal.md`
   - Populate each section with resolved decisions, using the user's words
   - Mark intentionally deferred items in Boundaries
   - Include rationale for irreversible decisions
5. **Omit empty sections.** If a section has nothing meaningful after Q&A, leave
   it out rather than including placeholder text
6. **Cross-reference for consistency.** Entities mentioned in System Behavior
   should appear in Data Model. Boundaries should align with what's described in
   other sections. Flag contradictions.

### Phase 4: Review & Refine

1. Present the complete document to the user
2. Highlight key decisions that were resolved
3. Note any items in Open Questions or Boundaries/Postponed that the plan will
   need to address
4. Ask if any sections need revision or expansion
5. Apply feedback and update as needed
6. Suggest next step: `/project-docs:proposal-to-plan $1` to create the
   development plan

## Output

Create a design resolution at `docs/projects/$1/design-resolution.md`. Inform
the user of:

- The document location
- Summary of key decisions resolved
- Any items deferred to Boundaries or Open Questions
- Suggested next step: `/project-docs:proposal-to-plan $1`

## Important Guidelines

- **This is convergence, not creation.** Do not introduce features or goals
  beyond what the proposal defines.
- **Link to the proposal.** Reference specific proposal sections when resolving
  ambiguity so the reasoning chain is traceable.
- **Don't over-formalize.** If the project is small and the proposal is clear, a
  lightweight resolution (just Boundaries + Irreversible Decisions) is fine.
- **The Q&A is the value.** The document is the artifact; the conversation is
  the work. Even brief resolutions that emerge from thorough Q&A are valuable.
- **This feeds specifications.** The design resolution is project-scoped and
  ephemeral, but its content can later be extracted into formal, permanent
  specifications or architecture docs after implementation.
