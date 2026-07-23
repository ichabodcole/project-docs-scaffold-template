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

**Date Started:** 2026-07-23 **Investigator:** Claude Code\
**Status:** Active **Outcome:** In Progress

---

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

_(Early observations from context already gathered; the analysis below is the
work to be done.)_

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

### Options Considered (to be evaluated, not yet decided)

- **A — By-type (reorg).**
  `docs/wiki/{architecture, specifications, playbooks, ...}`; keep type-buckets,
  add frontmatter + link conventions. Lowest risk; least "wiki-like."
- **B — By-topic (concept graph).** Pages are subjects; `type` demotes to
  frontmatter; a page may weave architecture + a lesson + a spec. Truest to
  OKF/LLM-wiki; biggest rethink; least proven for this domain.
- **Hybrid (leading candidate).** Shallow coarse folders (the dream-flute
  settlement) + `type` frontmatter driving page shape + a link/tag graph as the
  primary relation. Possibly split into a **product track** and a **process
  track**. "Stable coarse frame, fluid graph beneath."
- **Do nothing.** Keep the flat list; rely on good naming + grep. Cheapest;
  leaves the ephemeral/durable mixing unaddressed.

## Open Questions

- [ ] Map each current durable type to a candidate wiki `type` and page shape.
      Which are topical (fit B) vs atomic/cross-cutting (fit a tag-mesh)?
- [ ] Is the product-ish / process-ish split real enough to warrant **two
      tracks** under one root, or does one graph suffice?
- [ ] Minimal frontmatter schema: which of `type`, `title`, `description`,
      `tags`, `timestamp`, `related`/`links`, `status`, `order` earn their place
      — and which are _computable_ (e.g. backlinks) rather than authored?
- [ ] How do relationships get expressed — inline relative-links only
      (dream-flute), an explicit `related:` frontmatter list (Operator-style),
      or both? What does graph tooling need to traverse cheaply?
- [ ] Does `memories/` + `MEMORY.md` port cleanly as the pilot (it's already
      atomic + indexed), and does that port teach the general pattern?
- [ ] Where does the wiki root live and how do inbound references survive the
      move? (`docs/wiki/` à la dream-flute vs a rename.)
- [ ] How OKF-strict: conform exactly (portability, future tooling interop) vs
      extend freely (OKF permits extras) — and does strictness change what
      shared cross-project tooling can assume?

## Recommendation

- [x] **More Research Needed** — Outstanding structural questions remain.

**Rationale:** The mechanism is proven (dream-flute) but its fit for
_development/meta_ knowledge is unvalidated, and the schema can't be fixed until
the type→shape→relation mapping is worked out. The concrete next move is a
**paper mapping exercise + a `memories/` pilot**, not a proposal yet.

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
