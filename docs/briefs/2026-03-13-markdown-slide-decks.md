# Markdown Slide Decks

**Created:** 2026-03-13\
**Status:** Active

---

## The Spark

Project documents are written for agents — dense, detailed, structured for
implementation. But as a product director making higher-level decisions, what's
needed is a fast, visual summary: the signal without the noise.

## Inspiration & Influences

- Marp and Slidev as existing markdown-to-slide technologies
- The observation that project docs (proposals, dev plans, architecture docs)
  contain far more detail than a human reviewer needs to make a decision or give
  feedback
- The idea that a lightweight intermediate document — slide markdown — could
  serve as a human-facing layer on top of agent-facing documentation

## Vision

A skill and tooling setup that lets an agent transform one or more dense project
documents into a lightweight slide deck. The agent writes minimal slide-flavored
markdown; pre-configured tooling handles rendering. You open it in a browser,
click through in a few minutes, get the high-level picture, and respond via
Claude Code. No build complexity, no manual formatting — just write markdown and
launch.

The experience: "Here's the proposal. Here's the dev plan. Show me the 10-slide
version."

## Core Use Cases

1. **Proposal review** — An agent distills a proposal into 6-10 slides covering
   the problem, the approach, key trade-offs, and open questions. The reviewer
   clicks through, forms an opinion, and responds with direction.
2. **Dev plan check-in** — At the start of a session, an agent generates a
   summary deck from a dev plan: what's been done, what's next, any blockers.
   Quick orientation without reading the full plan.
3. **Multi-document briefing** — Before a planning session, generate a single
   deck spanning a proposal + investigation + architecture doc. Surface
   contradictions or gaps across documents that would otherwise require careful
   cross-reading.

## What Makes It Interesting

Project docs optimize for agent comprehension. Slide decks optimize for human
comprehension. These are genuinely different documents — not just shorter
versions of each other. The insight is that the distillation step is well-suited
to a lightweight agent (Haiku-class) given good instructions: it's structured
transformation, not deep reasoning. That makes it cheap, parallelizable, and
fast. Multiple decks for multiple documents can be generated in parallel,
keeping the cost-per-deck low.

The potential to evolve toward light interactivity (clickable option selection
on decision slides) is a natural next step once the base tooling is in place.

## What It Is / What It Isn't

**It is:**

- A skill that instructs an agent how to write slide-flavored markdown from
  source documents
- A tooling setup (Marp, Slidev, or similar) that renders that markdown into a
  viewable slide deck with minimal configuration
- A lightweight intermediate document format — not the source of truth, just a
  human-facing lens
- Capable of rendering diagrams (Mermaid or equivalent) inline — slides are not
  just text; flows and relationships can be communicated visually where a bullet
  list would be weaker
- Eventually: a dedicated Haiku-powered agent for cost-efficient parallel deck
  generation

**It is not:**

- A replacement for source documents (proposals, plans, etc. remain
  authoritative)
- An interactive feedback interface (for now, feedback happens via Claude Code
  after viewing)
- A production presentation tool (not for stakeholder decks, design reviews, or
  external use)
- A complex build pipeline — if setup is non-trivial, it's the wrong tool

## Open Questions

- [ ] Which technology requires the least agent effort to write for — Marp,
      Slidev, or something else? Evaluation criteria: Mermaid diagram support
      (native vs. plugin vs. unsupported), setup complexity, and how close plain
      markdown is to the final output (Needs prototyping with real docs)
- [ ] Where does slide output live in the doc structure — new `slides/` folder
      type, alongside the source doc, or in a project-specific `artifacts/`
      folder?
- [ ] What's the right slide count and structure for different document types
      (proposal vs. dev plan vs. architecture doc)?
- [ ] Does any candidate technology support enough interactivity (clickable
      options, decision capture) to make a feedback-in-deck experience practical
      without significant overhead?
- [ ] Should deck generation be a skill (agent-invoked contextually) or a
      command (user-invoked explicitly)?

## Suggested Next Steps

- [ ] Run a technology investigation: prototype the same source doc rendered
      with Marp and Slidev; evaluate which produces better output with less
      agent authoring effort
- [ ] Draft a simple slide structure template for a proposal deck and test it
      against a real doc from this project
- [ ] Once tooling is chosen, define the skill: trigger conditions, slide
      structure conventions, output location, and naming

---

**Origin:**

- Conversation — 2026-03-13 workshop session
