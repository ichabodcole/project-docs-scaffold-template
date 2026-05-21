# Project Manifesto

**Last Updated:** 2026-05-21

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

- **Provides a five-plugin Claude Code ecosystem** built around the scaffold:
  - **project-docs** — the core workflow plugin: 6 commands, 26 skills, 9 agents
    covering the full pipeline (workshop-idea, create-investigation,
    create-project, generate-proposal, generate-design-resolution,
    generate-dev-plan, generate-test-plan, finalize-branch, review-docs,
    project-summary, project-manifesto, ground-in-project, idea-to-spec,
    generate-spec, implementation-blueprint, consolidate-long-branch, …).
  - **recipes** — an umbrella `recipes:recipes` skill that indexes and loads 20
    implementation recipes (authentication, sync, IPC, voice-to-text, quality
    gates, …) plus a `create-recipe` skill for extracting new ones.
  - **toolbox** — specialist utilities not specific to documentation: digestify
    (one-shot browser review), html-mockup-prototyping, maestro-testing,
    screenshot-optimization.
  - **operator** — Operator Editor integration with `operator-setup` and
    `operator-triage`.
  - **agent-bridge** — a `bridge-agent` skill for cross-project knowledge
    sharing and agent-to-agent communication via the agent-bridge MCP server.

- **Manages the full documentation pipeline** from idea through completion:
  brief → investigation → proposal → [design resolution] → plan → [test plan] →
  implementation sessions → archival, with each stage having defined conventions
  and AI-assisted tooling.

- **Ships skills as portable, cross-agent bundles.** Every plugin builds into a
  `dist/<plugin>/openpackage.yml` distribution that conforms to the
  [Agent Skills](https://agentskills.io) open standard, so the same skills work
  outside Claude Code (OpenCode, Codex, Crush, Cursor, …).

- **Supports parallel development workflows** via git worktrees with
  `DEV_KICKOFF.md` handoff documents, enabling multiple agents or developers to
  work on different features simultaneously with clear context boundaries.

- **Maintains session continuity** through memories — short summaries of recent
  work that eliminate the cold-start problem when a new AI session begins — and
  through `ground-in-project`, a lightweight orientation alternative to a full
  project-summary refresh.

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
  references. The `recipes` and `toolbox` plugins _are_ technology-specific
  (Electron, Elysia, Expo, PowerSync, BetterAuth, …), but the core documentation
  structure and the `project-docs` plugin work for any stack.

- **Not locked to Claude Code.** Skills ship through the open Agent Skills
  standard and are tested across multiple agent runtimes. If a feature can't be
  expressed as a portable skill, it doesn't belong here.

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
Brief → Investigation → Project (proposal → [design-resolution] → plan → [test-plan] → sessions) → Report → ...
```

Briefs capture and refine ideas, investigations explore questions, projects
execute work, and post-completion reports trigger the next cycle. This loop —
with AI agents capable of driving each stage — is the core workflow the project
enables.

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
struggle with.** The memories system, session journals, and DEV_KICKOFF.md
handoff documents address the "agent cold start" problem in a way that's
convention-driven rather than tool-dependent. This could be one of the project's
most transferable innovations.

**The "what belongs here" question has partly resolved through use.** The
February manifesto noted that the boundaries between project-docs core, personal
development skills, and technology recipes were still being discovered. Since
then, the seams have started to show: the **toolbox** plugin emerged as the home
for specialist utilities (digestify, mockup prototyping, screenshot
optimization, maestro testing), and the **recipes** plugin underwent a 2.0
breaking consolidation — 20 individual recipe skills became a single umbrella
`recipes:recipes` skill with a `library/` folder. That consolidation is itself
evidence of a principle in action: when a surface gets crowded, collapse it
behind an index rather than fan it out.

**Cross-agent portability is now a load-bearing constraint, not an aspiration.**
The cross-agent-skill-portability investigation from 2026-02-25 has materialized
as a checked-in `dist/<plugin>/` build pipeline producing `openpackage.yml`
bundles. Every change to a plugin skill must also update the mirrored `dist/`
artifact — this is enforced by convention and visible in churn patterns. The
decision to keep `dist/` in version control (rather than build on publish) is a
deliberate trade-off favoring diffability and offline consumption over repo
size.

**Two-tier project tracking has emerged as a real pattern.** Some
`docs/projects/<name>/` folders contain a full `proposal.md` + `plan.md` +
`sessions/`. Others contain only `sessions/` — they're lightweight trails for
shipped work that didn't need the full ceremony. This isn't documented as a
formal convention yet, but it's consistent across the
digestify-session-recovery, html-mockup-component-updates, toolbox-plugin, and
agent-bridge-plugin folders. The system's "lightweight where possible, formal
when valuable" principle is being lived, not just stated.

**Digestify is a quiet experiment in the agent-human interface.** The new
toolbox/digestify skill — a one-shot browser tool where the agent writes a
synthesis with inline questions and the user answers in place before submitting
— doesn't fit cleanly into the documentation pipeline, but it keeps appearing in
active work. It hints at a next frontier: not "how do agents and humans
collaborate on documents" but "how do they collaborate on _decisions_ embedded
in documents." Worth watching whether this pattern generalizes.

**Questions worth considering:**

- What would a "1.0 for others" look like? Which parts are mature enough to
  recommend, and which need more iteration? The documentation structure + the
  `project-docs` plugin's pipeline skills are clearly the closest to being
  shareable; toolbox and agent-bridge are still in formation.
- Should the two-tier project tracking pattern (full-proposal vs. session-only)
  be made explicit in a playbook or README? It would help contributors
  understand when _not_ to write a proposal.
- The agent-bridge plugin opens a new dimension — cross-project, multi-agent
  conversations. Where does that fit relative to the existing single-project
  pipeline? Is it a complement, or does it eventually reshape the pipeline
  itself?
- Now that there are five plugins, is there a story to tell about how they fit
  together — a meta-architecture doc covering the scaffold↔plugins↔`dist/`
  pipeline? It's the most non-obvious part of the system and currently lives
  only as tribal knowledge in `AGENTS.md`.
