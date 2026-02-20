# Project Manifesto

**Last Updated:** 2026-02-13

---

## What Is This?

A personal documentation scaffold and AI workflow system, built through actual
use across real projects. It started as a Cookiecutter template that generates a
structured `docs/` folder, and has grown into a broader system of Claude Code
plugins, skills, and recipes — all shaped by the experience of figuring out how
humans and AI agents actually work together on software projects.

This is not a finished product. It's a living record of one developer's evolving
practices for AI-assisted development, packaged as a reusable template and
plugin ecosystem. Some parts are refined through multiple iterations (the
documentation structure); others are newer and still finding their boundaries
(skills, recipes). The whole thing is held together by the conviction that
documentation structure matters more in an AI-assisted world, not less.

## Who Is It For?

**Currently: the author.** This is a personal project used across real software
work to develop and refine practices for AI-assisted development. It's the place
where conventions get tested, workflows get refined, and lessons from one
project inform the next.

**Eventually: other developers** who are working through similar questions about
how to structure their work when AI agents are active participants in
development. The Cookiecutter template and plugin marketplace are the mechanisms
for sharing, but the project isn't at a "recommend to others" stage yet — it's
still in the forging-through-use phase.

The core problem it addresses: when AI agents are part of your development
workflow, documentation stops being something you write after the code and
becomes infrastructure that the agents navigate, generate, and act on. Getting
that structure right — and building the tooling to maintain it — requires
iteration through real projects, which is what this project is doing.

## Core Principles

- **Documentation is development infrastructure, not an afterthought.**
  Documentation folders, templates, and conventions are set up before the first
  line of feature code is written. The scaffold treats docs as load-bearing
  structure, not decoration.

- **Organize by lifecycle, not just type.** Different documents serve different
  purposes and have different lifetimes. Permanent reference docs (architecture,
  specs) stay organized by type. Pipeline docs (proposals, design resolutions,
  plans, sessions) are co-located by project so the full story of a body of work
  lives in one folder. This hybrid approach emerged from real scaling pain — the
  v2.0 restructuring was driven by traceability and archival problems in a flat,
  type-only layout.

- **AI is a first-class consumer.** The documentation structure is designed so
  AI assistants can navigate, generate, validate, and act on docs without
  special instructions. CLAUDE.md files provide project context, AGENTS.md
  provides behavioral guidance, memories provide session continuity, and
  document templates use consistent metadata that's easy for AI to parse.

- **Convention over configuration.** Every folder has a README explaining its
  purpose, naming conventions, and when to create documents. Templates exist for
  every document type. The goal is that a developer (or AI agent) should never
  wonder "where does this go?" — the answer is always documented.

- **Lightweight where possible, formal when valuable.** Not every task needs a
  proposal and plan. The backlog folder exists for small work. Fragments capture
  half-formed thoughts. The system provides a spectrum from informal (fragment)
  to formal (project with proposal, design resolution, plan, sessions) and lets
  the work determine the ceremony.

## What It Does

- **Generates a complete documentation scaffold** via Cookiecutter —
  pre-organized folders with READMEs, templates, and conventions for
  architecture docs, specifications, investigations, projects, backlog, and more

- **Provides a Claude Code plugin ecosystem** with 5 commands, 21 skills, and 8
  specialized agents that automate documentation workflows: starting
  investigations, resolving design ambiguity, converting proposals to plans,
  generating test plans, generating project summaries, reviewing documentation
  health, finalizing branches with session journals

- **Manages the full documentation pipeline** from idea through completion:
  investigation → proposal → [design resolution] → plan → [test plan] →
  implementation sessions → archival, with each stage having defined conventions
  and AI-assisted tooling

- **Ships a reusable recipe library** — 15 implementation recipes extracted from
  real projects (authentication patterns, sync strategies, IPC architectures,
  voice-to-text pipelines) that teams can pull into their own projects as
  step-by-step guides

- **Supports parallel development workflows** via git worktrees with task
  handoff documents, enabling multiple agents or developers to work on different
  features simultaneously with clear context boundaries

- **Maintains session continuity** through memories — short summaries of recent
  work that eliminate the cold-start problem when a new AI session begins

## What It Doesn't Do

- **Not a wiki or knowledge base.** This provides structure and conventions for
  project documentation that lives alongside code in version control. It doesn't
  host, render, or serve documentation — that's what your docs site or wiki is
  for.

- **Not a project management tool.** There are no sprints, tickets, Kanban
  boards, or status dashboards. The project/backlog structure tracks _what_ work
  exists and _why_, but tracking _who_ is doing _what_ by _when_ belongs in your
  PM tool.

- **Not a documentation generator.** This doesn't extract docs from code (like
  JSDoc or Sphinx). It provides the _human-authored_ documentation structure
  that sits alongside auto-generated API docs.

- **Not opinionated about your tech stack.** The scaffold is
  technology-agnostic. Specifications are explicitly written without framework
  references. The recipes plugin _is_ technology-specific (Electron, Elysia,
  Expo), but the core documentation structure works for any stack.

- **Not a rigid process.** The pipeline (investigation → proposal →
  [design-resolution] → plan → [test-plan] → sessions) is a convention, not a
  requirement. You can create a project with just a proposal. You can skip
  investigations for clear features. The structure enables but doesn't enforce.

- **Not a finished product.** Some parts are battle-tested (documentation
  structure, project conventions); others are experimental (certain skills,
  recipes). The boundary between what belongs in this project and what should
  live in separate, less-coupled projects is still being discovered through use.

## Design Philosophy

**Hybrid organization driven by document lifecycle.** The v2.0 restructuring was
the defining architectural decision — the project moved from a flat, type-based
hierarchy to a hybrid model after encountering real problems with traceability,
link fragility, and archival at scale. The insight: permanent reference docs
(architecture, specifications, playbooks) belong organized by type because
they're long-lived and cross-cutting; pipeline docs (proposals, plans, sessions)
belong organized by project because they tell the story of a specific body of
work. Investigations and reports sit in between — they're cross-cutting
discovery docs that precede and follow projects, serving as connective tissue.

**The documentation cycle is a loop:**

```
Report → Investigation → Project (proposal → [design-resolution] → plan → [test-plan] → sessions) → Report
```

Reports assess current state, investigations explore questions, projects execute
work, and post-completion reports trigger the next cycle. This loop — with AI
agents capable of driving each stage — is the core workflow the project enables.

---

**Note:** This manifesto captures the foundational vision and boundaries of the
project. As the project evolves, this document should be updated to reflect
major shifts in direction or scope.

---

## Detective's Notes

_Non-obvious observations from examining the codebase, commit history, and
documentation:_

**This project is a history of learning how to work with AI.** The commit
history, documentation restructuring, and evolution from simple template to
plugin ecosystem tell a story of iterative discovery. The v1 flat structure
worked until it didn't. The v2 hybrid structure emerged from real pain points.
Skills and recipes accumulate as patterns solidify through use. The project is
as much a journal of evolving practices as it is a tool.

**Different parts have different maturity levels — and that's informative.** The
documentation structure (folder organization, naming conventions, document
types, the decision flowchart) is clearly the most refined layer — it's been
through multiple real-world iterations and a major restructuring driven by
concrete problems. The commands and agents are solid but still growing. The
skills represent the newest frontier and are still finding their natural
boundaries. This maturity gradient is itself a signal about what matters most:
structure first, automation second, intelligence third.

**The documentation restructuring proposal is the project's best case study.**
The `docs/projects/documentation-restructuring/` folder contains a proposal and
plan that followed the project's own conventions to evolve the project's own
documentation structure. This self-hosting proof — using the system to improve
the system — is more convincing than any README pitch.

**Session continuity is a solved problem here that most AI-assisted projects
struggle with.** The memories system, session journals, and WORKTREE_TASK.md
handoff documents address the "agent cold start" problem in a way that's
convention-driven rather than tool-dependent. This could be one of the project's
most transferable innovations.

**The "what belongs here" question is still open — intentionally.** Skills and
recipes currently live in this project even though some aren't tightly coupled
to project documentation (e.g., technology-specific recipes, general development
skills). The decision to keep everything together for now is pragmatic: it's
easier to iterate when things are co-located, and the natural boundaries only
become clear through use. The eventual split into "project-docs core" vs.
"personal development skills" vs. "technology recipes" will happen when the
seams become obvious.

**Questions worth considering:**

- What would a "1.0 for others" look like? Which parts are mature enough to
  recommend, and which need more iteration? The documentation structure seems
  closest to being shareable.
- When does the recipes plugin become its own project? The recipes reflect
  specific technology choices (TypeScript, Bun, Electron, Expo) that aren't
  inherently tied to the documentation system.
- The operator plugin (triage integration) feels like the beginning of solving
  the "capture" side of the workflow. Could it grow to complement the "organize
  and act" side that project-docs provides?
- Is there value in documenting the _evolution_ of practices explicitly — not
  just the current state, but the journey from v1 to v2, what worked and what
  didn't? That story might be the most useful thing for other developers
  navigating similar questions.
