# Doc-to-Presentation System

**Created:** 2026-03-05\
**Status:** Spawned

---

## The Spark

Project docs are written for agents, but humans have to review them too — and
reading dense markdown to find the three things that actually need your
attention creates a kind of friction that accumulates over time. The same
documents that serve agents well are exhausting for a human reviewer.

## Inspiration & Influences

- The experience of scanning a 300-line plan looking for the open questions and
  key decisions, when a two-minute deck would have surfaced everything that
  needed attention
- Slide decks as a communication format — not because slides are better than
  docs, but because the constraint of one idea per slide forces prioritization
  and creates space
- The project manifesto as a document that deserves to be experienced, not just
  read — dense prose that could become something you'd actually want to show
  someone
- Specifications and onboarding docs that lose people because they feel like
  homework rather than an invitation

## Vision

A system where an agent can convert any structured project doc — plan, proposal,
design resolution, spec, manifesto — into a clean, navigable presentation. Each
slide surfaces one idea. Density collapses into clarity. For docs that require
decisions, the presentation is interactive: the reviewer clicks a choice, and
the decision is recorded and fed back.

The experience should feel like being briefed, not audited. You move through the
slides at your own pace, and at the end you've absorbed what matters without
having had to excavate it from a wall of text.

This isn't about replacing the source documents — agents still need those. It's
about adding a human-facing surface alongside them.

## Core Use Cases

1. **Executive plan review** — A development plan is generated. Rather than
   reading it, the agent produces a presentation: here's the goal, here are the
   key decisions made, here are the open questions that need your input. Human
   clicks through, makes choices, and the decisions are written back.

2. **Project onboarding** — Someone new to the project opens a slide deck of the
   manifesto instead of a markdown file. Each slide is one idea from the
   manifesto — purpose, boundaries, principles — with enough space to land
   before moving on. Far more engaging than "here's a README."

3. **Proposal review** — Before approving a proposal, the reviewer gets a
   five-slide summary: problem, solution, key trade-offs, what we're NOT doing,
   what we need from you. Decisions can be captured inline.

4. **Spec walkthrough** — A spec document becomes a navigable slide deck that
   can be shared with collaborators or stakeholders who want the gist without
   the full detail.

## What Makes It Interesting

The insight is that the same document serves two audiences with very different
needs, and we currently only optimize for one of them. Agents need depth and
context — they get that from the markdown. Humans need signal — they need
someone to have already decided what matters.

The presentation layer is that decision. An agent reads the full doc, extracts
the signal, and renders something a human can move through in minutes instead of
reading for twenty.

The interactive version goes further: instead of the human reading a design
resolution and then typing their choices into chat, they click through a
decision tree and their answers are automatically incorporated. This closes the
loop between document and decision without requiring the human to context-switch
back to the agent.

There's also a secondary value: these presentations could live outside the
project. A manifesto slide deck is something you could share with a collaborator
or drop into a meeting. A spec walkthrough could replace a synchronous
explanation. The presentation format travels in a way that a markdown file
doesn't.

## What It Is / What It Isn't

**It is:**

- A conversion layer that transforms structured project docs into navigable
  presentations
- A human-facing surface alongside agent-facing docs, not a replacement for them
- Optionally interactive — decision points can be captured and fed back
- Applicable to any project doc type: manifesto, proposal, plan, spec, design
  resolution
- An output that can live outside the project repo (shareable, ephemeral)

**It is not:**

- A replacement for source documents — agents still need full context
- A general-purpose slide creator for arbitrary content
- A persistent doc type in the project-docs folder structure (it's a generated
  artifact, not a source document)
- A synchronous collaboration tool (it's single-user review, not live editing)

## Open Questions

- [ ] What's the minimal input an agent needs to produce — structured JSON, a
      summary markdown, or annotated sections in the source doc?
- [ ] How interactive does the first version need to be? Static slides may be
      enough to start.
- [ ] Where does the artifact live during review, and how is it cleaned up
      afterward?
- [ ] Do existing tools (Marp, Slidev, reveal.js) support interactive decision
      nodes, or would that require custom tooling?
- [ ] Is this a project-docs skill, a standalone tool, or an MCP server?
- [ ] For the manifesto/spec use case (non-interactive), is the output a static
      file that can be shared, or does it require a running server?

## Suggested Next Steps

- [ ] Conclude the feasibility investigation (technology options, agent input
      schema, artifact lifecycle)
- [ ] Decide on scope for a v1: interactive decision review vs. static
      presentation only
- [ ] Create a project folder and proposal once the investigation produces a
      clear direction

---

**Origin:**

- Investigation:
  [2026-03-05-interactive-doc-review-tool.md](../investigations/2026-03-05-interactive-doc-review-tool.md)
