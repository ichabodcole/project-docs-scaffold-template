---
type: brief
title: "Knowledge Wiki Layer — a durable, graph-shaped documentation surface"
description:
  docs/ mixes durable knowledge that should grow with ephemeral artifacts that
  close, and treats both the same way.
status: stable
lifecycle: spent
generated: { by: unknown, at: 2026-07-23 }
---

<!--
USAGE: Copy this file to docs/briefs/ as `YYYY-MM-DD-<name>.md`.

A brief captures the identity of an idea before any implementation decisions
are made. It's the output of a workshop session — a focused conversation that
develops a rough spark into something concrete enough to act on.

Briefs predate projects. A brief might spawn multiple projects, a single
investigation, a manifesto, or simply sit as a captured idea to revisit later.

For more guidance, see: ../README.md
-->

# Knowledge Wiki Layer — a durable, graph-shaped documentation surface

## The Spark

Our `docs/` is a flat list that mixes two fundamentally different kinds of
document: **durable** knowledge that should live and grow like a wiki
(`architecture/`, `specifications/`, `interaction-design/`, `playbooks/`,
`lessons-learned/`, `memories/`) and **ephemeral** artifacts that have their
moment and then get archived (`fragments/`, `briefs/`, `investigations/`,
`projects/`, `reports/`, `backlog/`). Mixing them means the durable stuff never
gets to behave like durable stuff. The idea: pull the durable layer out into a
wiki — one place, structured _as_ a wiki (frontmatter, links, backlinks, a
navigable knowledge graph) rather than as a folder of loose typed documents.

## Inspiration & Influences

- **Andrej Karpathy's "LLM Wiki"** (early 2026) — instead of RAG-ing raw sources
  per query, the agent _compiles_ knowledge once into a persistent, interlinked
  markdown wiki and thereafter queries the wiki. "Obsidian is the IDE, the LLM
  is the programmer, the wiki is the codebase, and you are the architect." An
  instruction file (his `AGENTS.md`) is the schema that tells the agent how to
  maintain it.
- **Google's Open Knowledge Format (OKF v0.1, June 2026)** — the LLM-wiki
  pattern formalized into a portable, vendor-neutral spec: a directory of
  markdown files with YAML frontmatter, exactly one required field (`type`),
  concepts linked via plain markdown hyperlinks that form a graph. Apache-2.0.
- **dream-flute's wiki** (`dreamwood/dream-flute/docs/wiki/`) — a **working
  reference implementation** of exactly this pattern, already shipping: it
  explicitly adopts OKF, is governed by a `SCHEMA.md` maintainer contract, has
  an `index.md` catalog (one line per page — "same discipline as a memory
  index"), a `lint.ts` that fails CI on any broken relative link/anchor, and a
  dual surface (agents read raw markdown; humans read a dynamically-built HTML
  render). It documents the _product_, not the _project_, but the form is the
  same.
- **Operator MCP tooling** — the graph half, already built: document linking,
  backlinks, and a queryable knowledge graph you can navigate and visualize to
  see how documents relate.
- **anthill's stigmergy** — "docs as pheromone trail," "three homes for
  knowledge" (taste → seat doc, truth → `seams.md`, proof → tests), and
  "structure shaped by the work." The wiki's durable layer is philosophically
  the same family, and its "update the page in the same lane, gated at finalize"
  discipline is how the trail stays true.

## Vision

A **graph-shaped, OKF-conformant durable-knowledge wiki layer** that separates
the _library_ (durable, living, topical, interlinked) from the _workbench_
(ephemeral, temporal, archived) — two modes with a flow between them: workbench
docs are where knowledge is _produced_ while working; the wiki is where it's
_distilled and kept_ (Karpathy's raw-sources → compiled-wiki move).

It should feel like something that **grows with the project**: easy for agents
to maintain _and_ query, easy for humans to navigate, with frontmatter standards
solid enough to **build tooling around** (CLI navigation, a graph view, link
lint). Structure is layered so flat-vs-folder stops being a dilemma:

- **Physical layer** — shallow topical/coarse folders (the "obvious buckets" a
  dev project always has) as a filing convenience for browsing.
- **Logical layer** — frontmatter (`type`, `tags`, `related`), inline wikilinks,
  and backlinks. _This_ is the graph, and it's what agents and tooling traverse.

Folders demote from "the structure" to "a coarse lens"; the graph is primary.
The coarse frame stays stable while the graph stays fluid — which is the anthill
"stable frame, structure-shaped-by-work" instinct applied to docs.

**Ambition:** a standardized way to do durable documentation _within_ a project
and _across_ projects, so tooling built once works everywhere. **Approach:**
dogfood-first, not waterfall — prove it in one project, make sure it actually
works well, _then_ let the cross-project pattern emerge from evidence.

## Core Use Cases

1. **Agent maintains the library as it works** — while implementing, an agent
   adds/updates a wiki page (verified against code, not prior prose), updates
   the catalog line, and the link-lint keeps the graph honest. Gated at
   finalize, same bar as tests.
2. **Agent queries the graph instead of re-deriving** — to answer "how does X
   relate to Y," an agent traverses frontmatter + backlinks rather than
   re-reading a pile of ephemeral artifacts or re-searching raw sources.
3. **Human navigates a rendered surface** — a built HTML/graph view (à la
   dream-flute's WikiView, or Operator's graph) lets a human see the shape of
   the knowledge and jump between related pages, off the same markdown source.
4. **Promote durable findings out of ephemeral work** — an investigation or
   session surfaces something durable; there's an explicit "promote into the
   library" step so it lands as a living wiki page instead of being archived
   with the timestamped artifact.

## What Makes It Interesting

- **It dissolves the real friction** (ephemeral/durable mixing) rather than just
  reorganizing folders.
- **It's not theory — two halves already exist and are converging.** dream-flute
  has the _format_ (OKF + SCHEMA + lint + dual render); Operator has the
  _tooling_ (graph, backlinks, MCP navigation). This idea is largely "bring what
  I proved elsewhere home to project-docs and standardize it."
- **It rides an emerging open standard (OKF)** — betting on a portable,
  vendor-neutral format rather than a bespoke one, which is what makes shared
  tooling viable across projects.
- **It's the documentation substrate a multi-agent (anthill) world wants** —
  durable, agent-maintainable, graph-navigable knowledge that survives ephemeral
  agents coming and going.

## What It Is / What It Isn't

**It is:**

- A durable-knowledge **wiki layer** that _augments_ the existing doc lifecycle,
  giving the library docs a home separate from the ephemeral workbench docs.
- **OKF-conformant** (frontmatter `type` required;
  `tags`/`timestamp`/`order`-style conventions layered on), governed by a
  `SCHEMA.md`-style maintainer contract.
- **Graph-first**: shallow coarse folders for filing, but relationships
  expressed as frontmatter + links + backlinks that tooling can traverse.
- **Dual-surfaced**: raw markdown as the single source of truth for agents; a
  built render for humans.
- **Dogfooded in project-docs first**, with the cookiecutter template as the
  vehicle for spreading a proven pattern to every scaffolded project.

**It is not:**

- **Not a replacement for the ephemeral pipeline.** Briefs, investigations,
  projects, reports, sessions stay as temporal artifacts — their value is partly
  that they're frozen snapshots.
- **Not a theory-first / waterfall spec.** No big cross-project rollout before
  it earns its keep in one project.
- **Not a bespoke format.** Prefer OKF over inventing our own, so tooling is
  portable.
- **Not (yet) a mandate that all projects adopt it** — that's the trajectory,
  not the first step.
- **Not the same thing as HiveMind** — though they're kin (see Open Questions).

## Open Questions

- [ ] **Where does the wiki root live and how does it absorb today's durable
      folders?** A single `docs/wiki/` with topical subfolders (dream-flute did
      exactly this), or a rename/reshape? Do `architecture/`, `specifications/`,
      `interaction-design/`, `playbooks/`, `lessons-learned/`, `memories/`
      _move_ under it, or does the wiki become a synthesis layer fed by them?
- [ ] **One wiki or two tracks?** The durable layer splits into _product-ish_
      knowledge (architecture, specs, interaction-design — how the thing works)
      and _process-ish_ knowledge (playbooks, lessons-learned, memories — how we
      work). One graph or two tracks under one root?
- [ ] **Organizing axis: by-type vs by-topic (the A/B fork).** Keep type-buckets
      as folders, or demote type to frontmatter and let pages be concepts?
      (Lean: shallow buckets + graph, as dream-flute settled it — but confirm
      for the _development-knowledge_ domain, which is less obviously topical
      than a product wiki.)
- [ ] **Frontmatter schema.** Which fields beyond OKF's `type`? (`tags`,
      `timestamp`, `related`/`links`, `status`, `order`?) What's the minimal set
      tooling needs.
- [ ] **Tooling home.** Port dream-flute's `lint.ts`? Converge on Operator's MCP
      graph tooling? A small standalone project-docs CLI? What's portable vs
      app-coupled (dream-flute's render is nuxt/content-specific).
- [ ] **Relationship to HiveMind.** HiveMind is the cross-project knowledge base
      (Playbooks/Scenarios/Feedback/Lessons). Is a per-project wiki the _local_
      instance of the same format that feeds HiveMind? Is HiveMind just "the
      cross-project wiki"? Does OKF unify them?
- [ ] **The promote step.** How does durable knowledge get lifted out of
      ephemeral artifacts (investigation findings, session notes) into living
      wiki pages — manual, a skill, a finalize checklist item?
- [ ] **Migration.** What happens to the existing durable docs and their current
      inbound references when they move into the wiki.

## Suggested Next Steps

- [ ] **Investigate the structural fork + OKF fit for _development_ knowledge**
      (`create-investigation`): does by-topic hold up for architecture/process
      docs the way it does for a product wiki, and what's the minimal
      frontmatter schema? Pull dream-flute's `SCHEMA.md`/`lint.ts` and
      Operator's graph model in as concrete inputs.
- [ ] **Investigate the tooling boundary**: what's reusable across projects
      (lint, CLI, frontmatter conventions) vs app-coupled (render), and whether
      Operator MCP or a standalone CLI is the navigation home.
- [ ] **Then create a project** to dogfood the wiki layer in project-docs itself
      (reshape a slice of the durable docs, add a `SCHEMA.md` + lint), before
      touching the cookiecutter template.
- [ ] **Park the cross-project standardization** as the explicit trajectory —
      revisit only after the in-project dogfood proves it out.

---

**Origin:**

- Workshop session, 2026-07-23
- Reference implementation: `dreamwood/dream-flute/docs/wiki/` (SCHEMA.md,
  lint.ts, OKF frontmatter, dual render)
- Related: [HiveMind playbook catalog](2026-07-10-hivemind-playbook-catalog.md)
  (the cross-project knowledge-cycle thread this converges with)

---

## Outcome

**Spent 2026-09-04.** All four of its next steps are done, in the order it set:
both investigations concluded, and
[project/okf-frontmatter-layer](../projects/okf-frontmatter-layer/proposal.md)
dogfooded the layer in project-docs before the cookiecutter template was touched
— which is what the brief asked for, and what caught most of the defects.

Two of its assumptions did not survive contact. **The durable docs were not
reshaped**: no folder moved, and the layer went on the flat list as it stands,
with the restructure left as an explicitly open question for a later phase.
**And the template was touched in the same body of work**, not after a separate
proving period — the layer is additive, so shipping it in the payload cost
nothing that reversing it would not also cost.

Cross-project standardization stays parked, as the brief intended.
