---
name: "workshop-idea"
description: >
  Workshop a rough idea into a project brief through guided conversation. Use
  when the user has an unrefined concept, a spark, or a fragment they want to
  develop into something concrete — runs a two-phase Q&A (open exploration →
  targeted resolution) and produces a brief in docs/briefs/. Takes priority over
  create-project and create-investigation when the idea isn't yet refined enough
  for those. Triggers when user says "I have an idea", "workshop this", "let's
  explore a concept", "develop this fragment", "I want to build something new",
  "let me tell you about this idea", or describes something unstructured that
  needs shaping.
allowed_tools: ["Read", "Write", "Grep", "Glob", "AskUserQuestion"]
---

# Workshop Idea

Develop a rough idea into a concrete project brief through guided conversation.

## When to Use

This skill sits at the very beginning of the documentation lifecycle — before
investigations, before proposals, before projects. Use it when:

- The user has an idea but hasn't scoped or refined it yet
- A fragment has grown interesting enough to develop further
- The user is starting something brand new and needs to figure out what it is
- A feature spark for an existing project needs shaping
- The user mentions inspiration from other apps, experiences, or concepts

**Key indicators:**

- "I have this idea..."
- "What if we built something that..."
- "I've been thinking about..."
- "I saw this app that does X and it made me think..."
- "I want to explore a concept"
- "Let me tell you about something I want to build"

**Not the right skill when:**

- The idea is already clear enough for a proposal → use `create-project`
- There's a specific question to research → use `create-investigation`
- It's a small, defined task → use a backlog item

## The Process

### Phase 1 — Open Exploration

Your goal is to understand the full shape of the idea. Don't impose structure
yet. Listen, reflect, and follow the user's energy.

**How to approach this phase:**

- **Let the user talk.** Reflect back what you hear. Ask "tell me more about..."
  style follow-ups.
- **Ask about inspiration and influences.** "Is there anything that inspired
  this? Apps you've seen, experiences you've had, things you've read?" This
  context is easy to lose later.
- **Identify the emotional core.** What excites the user about this? The
  enthusiasm tells you what matters most.
- **Surface implicit assumptions.** "It sounds like you're imagining X, is that
  right?" Unstated assumptions become misaligned expectations later.
- **Explore the audience.** Who is this for? It might be the user themselves,
  and that's fine.
- **Note references to existing work.** If the user mentions fragments, other
  projects, or past conversations, read those for context.

**Guidelines:**

- One question at a time. Don't overwhelm.
- Prefer open-ended questions in this phase — you're exploring, not resolving.
- Don't jump to solutions or technical approaches. Stay in "what is this?" mode.
- It's okay for this phase to be brief if the user has a clear vision, or longer
  if the idea is still forming.

**You'll know this phase is complete when you can articulate:**

- What the idea is (in plain language)
- Who it's for
- What makes it interesting
- Where the inspiration came from

### Phase 2 — Targeted Resolution

Now shift to specific questions that fill gaps in the brief. The goal is to
reach enough clarity to write the document.

**Types of questions to ask:**

- **Prioritization:** "You mentioned X and Y — which is the primary use case?"
- **Boundaries:** "Is this a standalone thing or does it connect to [existing
  project]?"
- **Scope:** "What would the simplest version of this look like?"
- **Gaps:** "You haven't mentioned Z — is that intentional or just not top of
  mind?"
- **Identity:** "What is this NOT? What should we explicitly exclude?"

**Guidelines:**

- Multiple choice questions work well here — help the user decide, don't make
  them generate
- Keep converging toward clarity. Each question should narrow the space.
- If the user discovers new dimensions, it's fine to loop back to exploration
  briefly.

**You'll know this phase is complete when you can fill every section of the
brief template with concrete content (not placeholders).**

### Synthesis — Present Your Understanding

Before writing anything, present your understanding back to the user:

> "Here's what I think this is..."

Cover: the vision, core use cases, what makes it interesting, and what it
is/isn't. Get explicit confirmation before proceeding to write.

### Output — Write the Brief

1. **Choose a name.** Kebab-case, descriptive. Ask the user if unsure.
2. **Write the brief** to `docs/briefs/YYYY-MM-DD-<name>.md` using the template
   at `docs/briefs/TEMPLATES/BRIEF.template.md` as scaffolding.
3. **Set status** to Active.
4. **Fill every section** with concrete content from the conversation — no
   bracket placeholders.
5. **Capture open questions** — things that came up but weren't resolved.

### Handoff — Suggest Next Steps

Based on what emerged, suggest specific next steps with rationale. Common paths:

- **Create a project** — "The idea is clear enough to start a proposal. I'd
  suggest creating a project folder with `create-project`."
- **Run investigations** — "There are open questions about [X] that need
  research before proposing. I'd suggest creating investigations for [specific
  questions]."
- **Write a manifesto** — "For a greenfield project this substantial, defining
  the manifesto first would ground future decisions."
- **Park it** — "The idea is captured. When you're ready to pick it up, the
  brief will be waiting."

Offer to kick off the first next step immediately.

## Important Guidelines

- **Don't rush to the document.** The conversation IS the value. The brief is
  just the artifact that captures it.
- **Preserve the user's voice.** The brief should feel like their idea, not a
  sanitized corporate document.
- **YAGNI applies to briefs too.** If a section doesn't have meaningful content,
  skip it rather than filling it with generic language.
- **The brief is not a proposal.** Don't drift into technical solutions, scope
  definitions, or implementation approaches. Stay at the identity level.
