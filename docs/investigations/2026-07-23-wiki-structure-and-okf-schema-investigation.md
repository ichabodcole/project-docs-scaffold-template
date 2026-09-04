---
type: investigation
title: "Wiki structure & OKF schema for durable _development_ knowledge"
description:
  What structure and OKF schema a durable-knowledge layer would need, if the
  durable docs were pulled out of the flat list.
tags: [migrations, agent-execution]
status: stable
lifecycle: active
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

# Investigation: Wiki structure & OKF schema for durable _development_ knowledge

## Question / Motivation

The [Knowledge Wiki Layer brief](../briefs/2026-07-23-knowledge-wiki-layer.md)
proposes pulling project-docs' _durable_ docs out of the flat `docs/` list and
structuring them as an OKF-conformant, graph-shaped wiki. Two structural
questions must be answered before that idea is proposal-ready:

1. **Does "organize by topic" hold up for _development / meta_ knowledge** the
   way it demonstrably does for a _product_ wiki? dream-flute's wiki (the
   working precedent) documents a product — concepts, source guides — which is
   naturally topical. Architecture, specs, playbooks, and lessons are a
   different content domain. Do they want to be concept-pages in a graph,
   type-buckets in folders, or a hybrid?
2. **What is the minimal OKF frontmatter schema** for this domain? OKF requires
   only `type`; dream-flute adds
   `title`/`description`/`tags`/`timestamp`/`order`. What set do _our_ document
   types and _our_ tooling actually need?

This is the first of two sibling investigations spun out of the brief; the
second covers the **tooling boundary** (reusable-vs-app-coupled lint/CLI/render,
and whether Operator MCP or a standalone CLI is the navigation home). This one
stays on structure + schema.

## Current State Analysis

### project-docs' durable layer today

The durable doc types the brief would move into a wiki:

| Folder                | Populated?                           | Character            |
| --------------------- | ------------------------------------ | -------------------- |
| `architecture/`       | Scaffold only (README + TEMPLATE)    | product-ish          |
| `specifications/`     | Scaffold only (README + 2 TEMPLATEs) | product-ish          |
| `interaction-design/` | Scaffold only (README + TEMPLATE)    | product-ish          |
| `playbooks/`          | Scaffold only (README + TEMPLATE)    | process-ish          |
| `lessons-learned/`    | 1 real doc + README + TEMPLATE       | process-ish          |
| `memories/`           | ~10 real docs                        | process-ish (atomic) |

**Implication:** the library is largely _empty_ in this repo. Migration cost is
therefore low (little real content to move), but it also means the wiki's value
here is partly forward-looking — the honest dogfood test is whether the
structure makes it _more likely_ that these pages get written and maintained,
not whether it tidies an existing pile.

`memories/` is notable: it's already atomic, one-fact-per-file, with a
`MEMORY.md` index — arguably the most wiki-shaped thing project-docs already
has, and a good migration bellwether.

### Reference implementation — dream-flute (`dreamwood/dream-flute/docs/wiki/`)

Already read in full. Load-bearing specifics:

- **Explicit OKF adoption.** `type` required; `tags`/`timestamp` as OKF's
  optional conventions; `order` as a local extension. `resource` deliberately
  skipped ("our pages _are_ the knowledge, not pointers to a resource").
- **`SCHEMA.md` = the maintainer contract.** "Read it once, then work." Governs
  structure so pages are pure content. This is Karpathy's instruction layer.
- **`index.md` catalog** — one line per page (link + hook), "same discipline as
  a memory index." Direct kin to project-docs' `MEMORY.md`.
- **Layout:** shallow topical folders (`concepts/`, `sources/`, `modulators/`,
  `processors/`), each track landing on `overview.md` (not `index.md` — a
  render-runtime constraint). Sidebar groups by top-level dir automatically.
- **Link discipline:** relative `.md` links + GitHub-style anchors, "link only
  anchors you have verified exist." `lint.ts` fails CI on any broken
  link/anchor.
- **Per-type page shapes** — concept / source / modulator / processor each have
  a prescribed section skeleton. The _type_ drives the _template_.
- **Maintenance gated at finalize** — "a lane that changes X updates its wiki
  page in the same lane, before finalize, same bar as tests." "Truth comes from
  the code, not prior prose."

### OKF (the standard we'd conform to)

Directory of markdown + YAML frontmatter; one required field (`type`); markdown
hyperlinks form the graph; separates knowledge authors from consumers;
vendor-neutral, Apache-2.0. Enforces almost nothing about content — the
discipline is ours to layer on (as dream-flute did via `SCHEMA.md` + `lint.ts`).

## Investigation Findings

_(Updated 2026-07-23 with the type→shape→relation mapping and a proposed schema.
The structural fork is now resolved; the schema is proposed and awaits a pilot
to validate.)_

### Key Observations (initial)

- **dream-flute proves the _mechanism_, not the _domain fit_.** Its content is
  intrinsically topical (a synth's concepts). Whether architecture/process
  knowledge is equally topical is exactly the open question — some of it
  (`memories/`, `lessons-learned/`) is _atomic and cross-cutting_ rather than
  organized under tidy subject headings.
- **"type drives template" is a strong pattern to keep.** dream-flute's per-type
  page shapes suggest `type` isn't just an OKF checkbox — it selects a page
  skeleton. project-docs already has per-type TEMPLATEs; those could become the
  per-`type` page shapes in a wiki.
- **The product-ish vs process-ish split may be the real seam.** Product-ish
  docs (architecture/specs/interaction-design) describe _the system_ and are
  topical like a product wiki. Process-ish docs (playbooks/lessons/memories)
  describe _how we work_ and may be better as a tag-linked mesh than a folder
  hierarchy. Candidate answer: **two tracks under one wiki root**, not one soup.

### Type → shape → relation mapping (analysis)

Working each durable type against: its nature, a candidate wiki `type`, where
the page shape comes from, whether it's **topical** (organizes under subject
headings) or **atomic/cross-cutting**, and its primary relation mechanism.

| Current folder        | Nature             | Wiki `type`    | Page shape source                           | Topical vs atomic        | Primary relation      |
| --------------------- | ------------------ | -------------- | ------------------------------------------- | ------------------------ | --------------------- |
| `architecture/`       | system reference   | `architecture` | existing `TEMPLATE.md`                      | **topical** (subsystem)  | folder + inline links |
| `specifications/`     | behavior reference | `spec`         | `TEMPLATE-domain/overview`                  | **topical** (domain)     | folder + inline links |
| `interaction-design/` | UX reference       | `interaction`  | existing `TEMPLATE.md`                      | **topical** (surface)    | folder + inline links |
| `playbooks/`          | repeatable how-to  | `playbook`     | existing `TEMPLATE.md`                      | semi-topical (by task)   | **tags** + links      |
| `lessons-learned/`    | durable insight    | `lesson`       | `TEMPLATE.md` (already has `Type:`/`Tags:`) | **atomic/cross-cutting** | **tags** + links      |
| `memories/`           | work summary       | `memory`       | atomic (README-indexed)                     | **atomic/cross-cutting** | **catalog** + tags    |

**Two decisive pieces of evidence surfaced during the mapping:**

1. **`lessons-learned` already carries proto-frontmatter in its body** —
   `**Date:**`, `` **Tags:** `#migrations` `#agent-execution` ``,
   `**Type:** Pattern`. It independently arrived at `type` + `tags` +
   `timestamp`. Migrating it to YAML frontmatter is a _lift, not a redesign_ —
   strong evidence the OKF schema fits this domain with near-zero conceptual
   friction.
2. **The topical/atomic line falls exactly on the product-ish / process-ish
   seam.** The system-reference types are genuinely topical (they describe _the
   thing_, and subjects — "the sync engine" — are the natural unit). The
   practice types are atomic and cross-cutting (a lesson about "uniform
   specificity" isn't _about_ one subsystem; it applies across many), so a
   subject-folder hierarchy fights them — a tag mesh fits.

### Resolution of the A/B/Hybrid fork

**Chosen: Hybrid, organized as two tracks under one wiki root.**

- **System track** (`type: architecture | spec | interaction`) — **topical**,
  folder-organized by subsystem/domain, heavy inter-linking. This is the "by
  topic" (B) shape, and it fits because the content is intrinsically topical.
- **Practice track** (`type: playbook | lesson | memory`) — **atomic**, a
  **tag-linked mesh** with a flat-ish layout and a catalog index (the
  `MEMORY.md` discipline). Folders are minimal here; `tags` + `related` carry
  the graph.

Both share one frontmatter schema, one link-lint, and one catalog convention —
so tooling built once serves both — but they're organized by their _nature_, not
forced into a single hierarchy. This keeps pure-**A** (misses the graph) and
pure-**B** (fights the atomic practice docs) both rejected, and "do nothing"
rejected for leaving the ephemeral/durable mixing in place.

`type` does double duty: it's OKF's one required field **and** it selects the
page shape (reusing today's per-type TEMPLATEs) — so "type drives template"
becomes a load-bearing convention, not decoration.

### Proposed minimal frontmatter schema (to validate in a pilot)

```yaml
---
type: architecture | spec | interaction | playbook | lesson | memory # REQUIRED (OKF); also selects page shape
title: Uniform specificity in migration steps # nav/display name
description: Every step in an agent-run guide must sit at the same specificity. # one line; doubles as the catalog hook
tags: [migrations, agent-execution, documentation] # OKF convention; the practice track's primary relation
related: [lesson/scaffold-checklist, playbook/writing-migrations] # explicit graph edges (optional; complements inline links)
status: current # optional: draft | current | superseded (mainly system track)
updated: 2026-02-15 # OKF timestamp; when the CONTENT last changed
---
```

- **Authored:** `type`, `title`, `description`, `tags`, `related`, `status`,
  `updated`.
- **Computed, never authored:** backlinks (derive from inbound links/`related`),
  graph adjacency, "orphan" detection. Tooling derives these; humans/agents
  don't maintain them.
- **Dropped from dream-flute's set:** `order` (it existed for a nuxt sidebar
  sort; project-docs' catalog can sort by `updated` or title — revisit only if a
  track needs manual ordering).
- **Strictness:** conform to OKF's required `type` exactly (portability + future
  cross-project tooling), treat the rest as our documented conventions (OKF
  permits extras). This is precisely dream-flute's posture.

### Worked example — `lessons-learned` migrated to a `lesson` wiki page

Today (`lessons-learned/migration-steps-uniform-specificity.md`), metadata lives
in the body:

````markdown
# Migration Steps Must Be Uniformly Specific

As a wiki page, that same metadata lifts into frontmatter and the body becomes
pure content:

```markdown
---
type: lesson
title: Migration steps must be uniformly specific
description:
  In an agent-run guide, one underspecified step becomes the failure point.
tags: [migrations, agent-execution, documentation]
related: [playbook/writing-migrations]
updated: 2026-02-15
---

# Migration steps must be uniformly specific

## The lesson

...
```
````

The port is mechanical — nothing about the lesson's content resists it — which
is the evidence the schema is sound. The `memory` type ports the same way
(atomic body, frontmatter metadata, one catalog line), confirming the practice
track.

### Options Considered (evaluated)

- **A — By-type (reorg).** Rejected: keeps type-buckets but never delivers the
  graph; least "wiki-like."
- **B — By-topic (pure concept graph).** Rejected: fights the atomic practice
  docs (`lesson`/`memory`), which aren't _about_ a subject.
- **Hybrid, two tracks. ✅ Chosen** — see Resolution above.
- **Do nothing.** Rejected: leaves the ephemeral/durable mixing (the brief's
  core friction) unaddressed.

## Open Questions

- [x] ~~Map each current durable type to a candidate wiki `type` and page
      shape.~~ Done — see the mapping table.
- [x] ~~Is the product-ish / process-ish split real enough to warrant two
      tracks?~~ **Yes** — the topical/atomic line falls exactly on that seam.
      Resolved: system track + practice track under one root.
- [x] ~~Minimal frontmatter schema.~~ **Proposed** (`type`, `title`,
      `description`, `tags`, `related`, `status`, `updated`; backlinks computed;
      `order` dropped) — awaits pilot validation.
- [x] ~~How are relationships expressed?~~ **Both** — inline relative links
      _and_ an optional `related:` list; backlinks/adjacency are computed by
      tooling.
- [ ] **Pilot:** does `memories/` (atomic + indexed) actually port cleanly, and
      does a `lesson` port confirm the schema in practice? (The paper example
      suggests yes; a real port is the proof.)
- [ ] Where does the wiki root live and how do inbound references survive the
      move? (`docs/wiki/` à la dream-flute vs a rename — a migration concern for
      the project, not this investigation.)
- [ ] Catalog form: one root `index.md` (dream-flute) vs per-track catalogs vs
      generated-from-frontmatter — decide with the tooling investigation.

## Recommendation

- [x] **More Research Needed** — the _structural_ question is resolved; a schema
      **pilot** and the **tooling-boundary** investigation remain before a
      proposal.

**Rationale:** The structural fork is settled with evidence — **Hybrid, two
tracks** (system track topical/folder-linked; practice track atomic/tag-meshed),
one shared OKF schema, `type` driving page shape. The frontmatter schema is
proposed and looks sound on paper (the `lesson` port is mechanical because
`lessons-learned` already carries `Type:`/`Tags:` metadata). What's left is
_empirical_: run the pilot to validate the schema against real content, and
answer the tooling questions (lint/CLI/render, Operator-vs-standalone) in the
sibling investigation. A proposal should wait for both.

## Next Steps

1. **Type→shape→relation mapping.** For each durable type, decide: candidate
   wiki `type`, page shape (reuse existing TEMPLATE?), and how it relates to
   others (folder / tag / link). Output: a table that resolves the A/B/Hybrid
   fork with evidence.
2. **`memories/` pilot.** Port `memories/` + `MEMORY.md` into a wiki-shaped
   slice (frontmatter + links + catalog) as the cheapest real dogfood; record
   what the port teaches about the schema.
3. **Draft a minimal frontmatter schema** from (1) and (2); note strict-OKF vs
   extended tradeoffs.
4. **Hand off to the sibling tooling-boundary investigation** once the schema is
   stable enough to build lint/CLI against.
5. If (1)–(3) converge, recommend a project to dogfood the wiki layer in
   project-docs before touching the cookiecutter template.

## Open Questions (Optional)

- Relationship to **HiveMind** (cross-project knowledge base) and the
  [HiveMind playbook catalog](../briefs/2026-07-10-hivemind-playbook-catalog.md)
  thread — is a per-project wiki the _local_ instance of the same OKF format
  that feeds HiveMind? (Cross-project scope; likely its own investigation.)

---

**Related Documents:**

- [Knowledge Wiki Layer brief](../briefs/2026-07-23-knowledge-wiki-layer.md)
  (parent)
- Reference implementation: `dreamwood/dream-flute/docs/wiki/` (`SCHEMA.md`,
  `lint.ts`, OKF frontmatter, dual render)
- [HiveMind playbook catalog brief](../briefs/2026-07-10-hivemind-playbook-catalog.md)
  (converging cross-project thread)
- Durable folders under review: `../architecture/`, `../specifications/`,
  `../interaction-design/`, `../playbooks/`, `../lessons-learned/`,
  `../memories/`
