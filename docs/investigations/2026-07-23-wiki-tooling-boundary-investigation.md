---
type: investigation
title:
  "Wiki tooling boundary — reusable vs app-coupled, and the navigation home"
description:
  How solid a frontmatter standard has to be before tooling can be built on it,
  and where that tooling should live.
status: stable
lifecycle: concluded
generated: { by: unknown, at: 2026-07-23 }
---

<!--
IMPORTANT: If you haven't read the README.md in this directory, please read it first for context on when to
create investigations and when NOT to create them.

USING THIS TEMPLATE:

This template provides scaffolding to help structure your investigation - it's not a mandatory form.
Use sections that help you communicate findings clearly. Adapt, merge, skip, or add sections as needed.
The goal is to answer your question with clear evidence, not to fill in every blank.

Focus on: What did you investigate? What did you find? What should happen next?
-->

# Investigation: Wiki tooling boundary — reusable vs app-coupled, and the navigation home

## Question / Motivation

The [Knowledge Wiki Layer brief](../briefs/2026-07-23-knowledge-wiki-layer.md)
wants frontmatter standards solid enough to **build tooling around** — link
lint, CLI navigation, a graph view — and it wants that tooling to eventually
work _across_ projects. The sibling
[structure & schema investigation](2026-07-23-wiki-structure-and-okf-schema-investigation.md)
has resolved the structure (Hybrid, two tracks) and proposed a frontmatter
schema. This investigation answers the tooling half:

1. **What is portable vs app-coupled?** dream-flute's `lint.ts` is generic-ish,
   but its _render_ is bound to the studio app (`@nuxt/content` +
   `WikiView.vue`). Which pieces transfer to a plain docs repo, and which are
   inherently app-specific?
2. **Where does navigation live?** Three candidate homes: (a) reuse/port
   dream-flute's `lint.ts` + a small standalone CLI in project-docs, (b)
   converge on **Operator's MCP** graph tooling (links/backlinks/query already
   built), or (c) some split (lint local, rich graph via Operator). What does a
   markdown-first, agent-maintained wiki actually _need_ day to day?

This is the second of two siblings from the brief; the first covers structure +
schema. Neither should reach a proposal until both conclude.

## Current State Analysis

### dream-flute's tooling (`dreamwood/dream-flute/docs/wiki/`)

- **`lint.ts`** — fails (non-zero) on any broken relative `.md` link or
  `#anchor` across the wiki. Prose-agnostic; it only checks the graph's
  integrity. This is the piece most likely to be **portable** (it operates on
  markdown + frontmatter, not on app internals) — _to confirm by reading it_.
- **Render** — humans read the wiki in-app via `@nuxt/content` (collection
  configured in `apps/studio/content.config.ts`) rendered by `WikiView.vue`,
  which resolves relative `.md` links and rewrites `/index` → `/` at root. This
  is **app-coupled**: it assumes a Nuxt app and a Vue component. A standalone
  docs repo has no such host.
- **`SCHEMA.md` + `index.md`** — conventions, not code; fully portable (they're
  the contract and the catalog).

### Operator MCP tooling

Described (not yet code-read here): document linking, **backlinks**, a queryable
knowledge graph, and the ability to see how documents relate — exactly the
"navigate the graph" surface the brief wants. Operator is an _editor/workspace_
with MCP tools (`mcp__operator-cloud__*`: `read_document`, `search_documents`,
`get_links`, `extract_links`, `list_relationships`, `list_dangling_links`,
`list_orphan_documents`, …). If a project-docs wiki used a compatible
frontmatter and link convention, these tools may operate on it directly — making
Operator a candidate _navigation home_ without building a bespoke graph engine.

### What the schema gives tooling to work with

From the sibling investigation: `type` (required), `title`, `description`,
`tags`, `related`, `status`, `updated`; backlinks + adjacency are **computed**.
So tooling needs to: parse frontmatter, follow inline relative links +
`related`, compute backlinks/orphans, and lint link/anchor integrity.

## Investigation Findings

_(Framing only — the analysis below is the work to be done.)_

### Key Observations (initial)

- **The lint and the render are different risk classes.** Lint is small,
  markdown-only, and almost certainly portable — the cheap win. Render is the
  app-coupled part and probably shouldn't be reimplemented per-project.
- **"Navigation home" may not be one place.** A likely shape: **lint runs
  locally** (CI gate, zero deps beyond a script runtime), while **rich graph
  navigation is borrowed** (Operator MCP for agents; a generated static graph or
  GitHub's native markdown rendering for humans) — rather than project-docs
  growing its own graph UI.
- **GitHub already renders the markdown.** Because the schema mandates relative
  `.md` links that "work on GitHub and in a bare editor," the zero-cost human
  surface is just browsing the repo on GitHub. A built render is an enhancement,
  not a prerequisite — de-risking the whole "dual surface" requirement.
- **Cross-project portability rides on the schema, not the tooling.** If every
  project's wiki conforms to the same OKF frontmatter + link conventions, then
  _any_ conformant tool (local lint, Operator MCP, a future CLI) works
  everywhere. The standard is the interop layer; the tools are swappable.

## Open Questions

- [ ] Read dream-flute's `lint.ts` — how coupled is it really? What would a
      project-docs port need to drop/change? Is it a copy-paste or a rewrite?
- [ ] Inventory Operator's MCP graph tools against the schema — can they
      traverse a plain-markdown wiki that uses our frontmatter, or do they
      require Operator-native documents? (Cross-reference `get_links`,
      `list_relationships`, `list_dangling_links`, `list_orphan_documents`.)
- [ ] What's the minimum viable toolset for day-one dogfood? (Hypothesis: just
      the lint + GitHub rendering; defer the graph UI.)
- [ ] Runtime for local tooling: Bun (matches dream-flute/anthill/spellbook) vs
      the Python already used by `validate-skills-dist.py`. What fits
      project-docs' existing gates?
- [ ] Should link-lint join the existing pre-commit/format gate, or run in CI
      only?
- [ ] Is there a build step that emits a static human render (graph + pages)
      without an app host — or is GitHub + Operator enough?
- [ ] Does a standalone CLI belong in project-docs, or is it its own shared tool
      that project-docs, dream-flute, and HiveMind all consume? (Ties to the
      brief's cross-project ambition — likely deferred past first dogfood.)

## Recommendation

- [x] **More Research Needed** — needs a code read of `lint.ts` and an Operator
      MCP capability check before choosing the navigation home.

**Rationale:** The portability split is hypothesized (lint portable; render
app-coupled; GitHub as the free human surface; Operator as the rich graph) but
not yet verified against the actual code and MCP capabilities. The likely
minimal answer — **port the lint, lean on GitHub + Operator, defer a bespoke
CLI/graph UI** — should be confirmed cheaply before it shapes a proposal.

## Next Steps

1. **Read `dream-flute/docs/wiki/lint.ts`** and assess port cost to a
   project-docs (Bun or Python) script.
2. **Capability-check Operator MCP** against the proposed schema — do the graph
   tools traverse plain-markdown-with-our-frontmatter?
3. **Define the day-one toolset** (hypothesis: lint + GitHub render only).
4. **Reconvene with the sibling investigation** — together they gate a project
   to dogfood the wiki layer in project-docs.

## Open Questions (Optional)

- If a standalone wiki CLI does emerge, is it a candidate for the recipes plugin
  or its own tool — and does it converge with HiveMind's consult/navigation
  needs?

---

**Related Documents:**

- [Knowledge Wiki Layer brief](../briefs/2026-07-23-knowledge-wiki-layer.md)
  (parent)
- [Wiki structure & OKF schema investigation](2026-07-23-wiki-structure-and-okf-schema-investigation.md)
  (sibling — resolves structure + schema)
- Reference tooling: `dreamwood/dream-flute/docs/wiki/lint.ts`; Operator MCP
  (`mcp__operator-cloud__get_links` / `list_relationships` /
  `list_dangling_links` / `list_orphan_documents`)

---

## Outcome

**Concluded 2026-09-04.** Answered by
[project/okf-frontmatter-layer](../projects/okf-frontmatter-layer/proposal.md).
The boundary it set out to find was drawn in the most boring available place:
the lint is **copied** into the cookiecutter payload rather than extracted into
a package, with `scripts/check-mirror.sh` making the duplication survivable.
Three repositories are still discovering what the tool should be, and a package
would have frozen that early.

The navigation home stayed a question. `docs/index.md` is a hand-maintained
catalog whose entries the lint checks against each page's own `description`, and
`--json` emits the graph for anything that wants to render it. Neither a
standalone CLI nor Operator MCP was needed to get this far, which is itself the
finding.
