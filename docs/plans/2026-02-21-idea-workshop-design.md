# Idea Workshop — Design Document

**Date:** 2026-02-21

## Problem

The project-docs workflow assumes a refined idea as its entry point — you jump
into investigations, proposals, and dev plans. But there's a missing
"pre-project" phase where you go from a rough idea or problem statement to a
solid direction with scoping. Currently, users have to manually drive this
process, and the captured context is lost to conversation history.

This applies to both greenfield project ideas and feature sparks within existing
projects. Fragments capture stray observations but don't provide a path to
develop them into something actionable.

## Solution

A new **workshop-idea** skill and a new **Project Brief** document type.

The skill runs a conversational workshop — open exploration followed by targeted
resolution — and produces a brief that captures the identity of an idea before
any implementation decisions are made. The brief then feeds into the existing
workflow (create-project, create-investigation, project-manifesto).

## The Project Brief Document

**Location:** `docs/briefs/YYYY-MM-DD-<name>.md`

Briefs live in their own top-level folder because they predate projects. A brief
might spawn multiple projects, or might not spawn any. Keeping them separate
from `docs/projects/` avoids creating project folders prematurely.

### Template Sections

- **Title & Date** — What we're calling this idea
- **The Spark** — Where this came from (a fragment reference, a conversation, an
  observation). 1-2 sentences capturing the original impulse.
- **Inspiration & Influences** — Apps, projects, experiences, or ideas that
  informed the vision. Could be "I love how X does Y", "I was doing Z when I
  realized...", or "these three things combined would be interesting."
- **Vision** — What this is, in plain language. What does it feel like to use?
  What problem does it solve or what experience does it create?
- **Core Use Cases** — The 2-4 things a user would actually do with this.
  Concrete scenarios, not abstract capabilities.
- **What Makes It Interesting** — The hook. Why is this worth building? What's
  the insight or differentiator?
- **What It Is / What It Isn't** — Boundary-setting. Helps prevent scope creep
  from day one.
- **Open Questions** — Things that emerged during the workshop that need
  investigation or decisions before moving forward.
- **Suggested Next Steps** — Specific actions: create a project, run
  investigations, write a manifesto, etc.

## The Workshop Skill

**Name:** `workshop-idea`

**Description:** Workshop a rough idea into a project brief through guided
conversation. Use when the user has an unrefined concept, a spark, or a fragment
they want to develop into something concrete. Triggers when user says "I have an
idea", "workshop this", "let's explore a concept", "develop this fragment", "I
want to build something new."

**Priority:** Takes priority over `create-project` and `create-investigation`
when the idea isn't yet refined enough for those.

### Process

#### Phase 1 — Open Exploration

The agent listens and asks follow-ups. The goal is to understand the full shape
of the idea without constraining it:

- Let the user talk — reflect back what it hears, ask "tell me more about..."
  style questions
- Ask about inspiration and influences — "Is there anything that inspired this?
  Apps you've seen, experiences you've had?"
- Identify the emotional core — what excites the user about this?
- Surface implicit assumptions — "it sounds like you're imagining X, is that
  right?"
- Explore the audience — who is this for? (could be the user themselves)
- Note when the user references existing work (fragments, other projects)

No structure yet. Just understanding.

#### Phase 2 — Targeted Resolution

Once the agent has a general picture, it shifts to more specific questions to
fill gaps in the brief:

- "You mentioned X and Y — which is the primary use case?"
- "Is this a standalone thing or does it connect to [existing project]?"
- "What would the simplest version of this look like?"
- "You haven't mentioned Z — is that intentional or just not top of mind?"

The agent presents its understanding back to the user at the end: "Here's what I
think this is..." and gets confirmation before writing the brief.

#### Output & Handoff

After the user approves the summary, the skill:

1. Writes the brief to `docs/briefs/YYYY-MM-DD-<name>.md`
2. Presents suggested next steps based on what emerged (with rationale for each)
3. Offers to kick off the first next step immediately

## Integration with Existing Workflow

### Entry Points

- User says "I have an idea", "let's workshop something", "I want to explore a
  concept"
- User references a fragment and wants to develop it further
- User describes something new and unstructured

### Exit Paths

- **Greenfield project →** `create-project` (brief becomes the seed for the
  proposal) + potentially `project-manifesto`
- **Needs research first →** `create-investigation` for each open question that
  needs evidence
- **Feature for existing project →** `create-project` within the existing
  project's context, or directly to a proposal if scope is clear enough
- **Not ready yet →** Brief sits in `docs/briefs/` as a captured idea to revisit
  later

### Cross-References

- The brief's "Suggested Next Steps" section links to created
  investigations/projects by path
- Proposals can reference their originating brief in a "Background" or "Origin"
  field
- Fragments that seeded the workshop get referenced in the brief's "The Spark"
  section

## Updated Lifecycle

```
Fragment (or fresh spark) → Workshop Session → Project Brief
                                                    ↓
                                          One or more of:
                                          - Create project (with proposal)
                                          - Spawn investigations
                                          - Generate manifesto (greenfield)
                                          - Revisit later
```
