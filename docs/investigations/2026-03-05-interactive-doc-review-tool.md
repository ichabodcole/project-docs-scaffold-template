# Investigation: Interactive Executive Review Tool for Project Docs

**Date Started:** 2026-03-05 **Investigator:** Claude Code **Status:** Active
**Outcome:** In Progress

---

## Question / Motivation

Project docs — proposals, plans, design resolutions, test plans — are authored
primarily for agent consumption. They're dense, thorough, and structured to give
a future agent the full context it needs to carry on work. But they have a
second audience: the human product manager and supervisor who needs to review
them, provide feedback, and make key decisions.

That human audience is experiencing **markdown fatigue**. Dense documents
require scanning to surface the small number of things that actually require
human attention: key decisions, open questions, trade-offs, and choices between
alternatives. Most of the document content — detailed implementation steps,
rationale for agent context, background a human already carries — doesn't need
to be read at all.

The core question is: **could we build a tool that converts a project doc into
an interactive executive review experience** — something visually clean that
surfaces only what needs human attention, allows in-context decisions to be
made, and feeds those decisions back into the source documents?

### The Two-Audience Problem

| Audience       | Needs                                              | Current experience          |
| -------------- | -------------------------------------------------- | --------------------------- |
| Agent          | Full context, rationale, detailed steps            | Well served by current docs |
| Human reviewer | Key decisions, open questions, critical trade-offs | Must scan dense markdown    |

The docs are already well-designed for agents. The gap is the human review
layer.

---

## Current State Analysis

The project-docs plugin generates several doc types that human reviewers
interact with:

- **Proposals** — define the problem and solution direction; may contain open
  questions or design decisions that need human sign-off
- **Design resolutions** — structured Q&A for resolving design ambiguity; these
  are literally decision documents, but presented as flat markdown
- **Development plans** — task lists and implementation detail; humans mostly
  need the summary and any flagged risks
- **Test plans** — tiered scenario lists; humans mostly care about coverage
  decisions and which tiers to run

Currently, review means opening a markdown file and reading it linearly. There's
no affordance for "here's what needs your attention" vs. "here's background."
There's no way to record a decision interactively and have it propagate back.

### Relevant existing tools in this environment

- **Playwright MCP** is available — browser automation can render and interact
  with web content without a running dev server for the tool itself
- **dist/ pipeline** — skills package into distributable artifacts; a tool could
  follow this pattern

---

## Open Questions

### Tool design

- What's the minimal input format an agent needs to produce? A structured JSON
  schema? Annotated markdown sections? A separate "review summary" document
  alongside the source?
- How interactive does it need to be? Options range from: static rendered HTML →
  navigable slides → full branching decision UI with outputs
- Where does the artifact live? It's ephemeral (review and done), so probably
  not checked into project docs. Could be a temp file, a browser artifact, or
  served locally.
- Should decisions made during review produce a structured output file the agent
  reads back, or should the agent directly patch the source document?

### Technology

- **Existing slide-from-markdown tools:** Marp, Slidev, reveal.js — do any of
  these support interactive decision nodes natively or via plugin?
- **Local web server approach:** Could a script spin up a tiny local server
  (e.g., Bun serve) that renders the slides and serves a decision API?
- **Playwright as the runtime:** Could Playwright navigate a locally rendered
  page, and the user interact with it in the browser while the agent waits for a
  result file?
- **Pure terminal approach:** Is there a terminal-based slide/TUI tool that
  could work without a browser at all?
- **Agent effort:** What's the minimum the agent needs to do? Ideally: extract
  key points into a simple schema, call a script, done.

### Scope

- Is this a project-docs feature or a standalone tool that project-docs uses?
- Should it work for any dense markdown document, or only specific doc types
  with known structure (proposals, plans)?
- Does the interactive decision output need to be machine-readable (JSON) or can
  it be a human-written note appended to the source doc?

---

## Options Considered (Preliminary)

### Option A: Markdown-to-slides (static)

Use Marp or Slidev to convert an agent-generated markdown summary into a slide
deck. No interactivity. Human reviews slides, then tells the agent their
decisions verbally.

**Pro:** Simple, no custom tooling. **Con:** Doesn't solve the feedback loop
problem. Still requires context-switching back to a chat window.

### Option B: Local web app with decision nodes

Agent generates a JSON payload (title, sections, decision points with options).
A script renders a local web page with navigable slides and clickable choices.
On completion, writes a `decisions.json` for the agent to read.

**Pro:** Solves both the visual review and feedback loop problems. **Con:**
Requires building a small web app; more surface area.

### Option C: Playwright-hosted interaction

Agent generates the review payload, launches a Playwright browser session
rendering a self-contained HTML file, and waits for the user to interact and
submit. No running server needed.

**Pro:** No server, Playwright is already available in this environment.
**Con:** Playwright MCP is designed for automation, not interactive human use
sessions. Unclear if this works well as a human-facing tool.

### Option D: Structured review document + agent annotation

Agent generates a condensed `REVIEW.md` alongside the source doc — just the key
points and decision prompts. Human reads and annotates it. Agent reads the
annotated file and incorporates feedback.

**Pro:** No new tooling, fits existing workflow patterns. **Con:** Still
markdown; doesn't address the visual/fatigue problem, just reduces document
length.

---

## Next Steps

1. **Research existing tools** — evaluate Marp, Slidev, and reveal.js for
   interactive decision node support; check if any have a JSON-driven API
2. **Prototype the input schema** — define what an agent would need to produce
   (what fields, what decision types) to keep agent effort minimal
3. **Assess Playwright feasibility** — can a self-contained HTML file +
   Playwright browser serve as a viable human interaction surface?
4. **Determine artifact lifecycle** — where does the review artifact live and
   how is it cleaned up?

---

**Related Documents:**

- `docs/backlog/2026-03-03-recipes-plugin-vs-mcp-server.md` — related thread on
  extracting tools to standalone servers vs. keeping in this repo
- `plugins/project-docs/skills/` — doc generation skills that would feed this
  tool
