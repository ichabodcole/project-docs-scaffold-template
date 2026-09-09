---
type: brief
title: "HiveMind Playbook Catalog & Apply Vocabulary"
description:
  Enough HiveMind scenarios have accumulated that their takeaways rhyme, which
  is the point at which a catalog beats a search.
status: stable
lifecycle: active
generated: { by: unknown, at: 2026-07-10 }
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

# HiveMind Playbook Catalog & Apply Vocabulary

## The Spark

Enough scenarios have accumulated in HiveMind that their takeaways are starting
to rhyme — and one synthesis has already happened ("Writing Instructional
Content for Agents," promoted from five scenario captures and materialized into
anthill). But there's no efficient way to _invoke_ that layer from a working
project: "consult the HiveMind" begs the question — consult **what**? The
missing piece is a vocabulary: a way to list what playbooks exist, address one
by name, and say "apply it to this draft."

## Inspiration & Influences

- **The anthill playbook**
  (`docs/playbooks/writing-instructional-content-for-agents.md` in the anthill
  repo) — the proof-of-concept artifact. Synthesized from five HiveMind scenario
  slugs, materialized with provenance frontmatter (`hivemind_source_id`,
  `synthesized_from`, `applied_to`), and structured as _core test → named
  disciplines (each with its weakening condition) → review checklist_.
- **The recipes plugin** — its checked-in INDEX answers "what recipes do we
  have?" cheaply. HiveMind consult has search but no equivalent inventory
  affordance.
- **Anthill's read-trigger finding** (docs-taxonomy investigation) — doc stores
  survive only if some durable, re-read artifact routes agents to them at the
  moment the work begins. A catalog without triggers is a nicer graveyard.
- **The Field Guide pattern** — `hivemind-consult` already establishes
  "canonical live doc in the workspace, snapshot shipped in the plugin" for its
  own configuration. The catalog can reuse that exact pattern.

## Vision

HiveMind grows a **named, addressable playbook layer** above its scenario
captures — and the consult skill grows the vocabulary to use it. Working in any
project, Cole (or an agent) can say:

> "We just drafted this skill — apply `writing-instructional-content-for-agents`
> to it."

or, not knowing what exists:

> "Do we have any HiveMind playbooks that apply to what we're doing?"

…and the agent resolves that efficiently: scan a lightweight catalog (slug +
one-line "applies when…" per entry), fetch only the matching playbook(s), and
run the work through the playbook's built-in review checklist. Scenarios remain
the evidence layer, reachable through `synthesized_from` links when detail is
needed — but nobody has to re-read the raw captures to apply the learning.

## Core Use Cases

1. **Apply-by-name after a draft** — an agent finishes writing a skill,
   documentation, or other instructional material; Cole says "apply the
   instructional-content playbook" and the agent fetches it and runs the draft
   through its checklist, reporting violations (often "remove this," not "add
   this").
2. **Discovery** — "do we have a playbook for this kind of problem?" The agent
   scans the catalog's applies-when lines rather than searching or reading full
   documents, and answers plainly (including "no — HiveMind has nothing on
   this").
3. **Digest with addressability** — when a future digest promotes scenarios into
   a new playbook, the authoring convention guarantees it's born catalog-ready:
   slug, applies-when line, apply-checklist, `synthesized_from` provenance.

## What Makes It Interesting

- The document class is already **proven, not hypothetical** — one playbook
  exists in HiveMind, round-trips to a consumer repo with provenance, and its
  principles measurably shaped later work (anthill's plan skill).
- It completes the HiveMind loop the plugin already sketches: `digest` promotes
  (collect → codify), `consult` disperses (list → apply). Both halves exist as
  skills; this gives them the shared vocabulary that makes the loop cheap to
  drive in one sentence.
- The efficiency constraint is a feature: agents should **never read
  everything**. Catalog scan → targeted fetch → checklist application is the
  whole retrieval story.
- It replaces the hardcoded principle slugs currently frozen inside
  `hivemind-consult`'s Guardrail mode with a living catalog that grows as
  digests happen.

## What It Is / What It Isn't

**It is:**

- A **catalog**: a live index document in HiveMind (Field-Guide pattern —
  canonical in the workspace, snapshot in the plugin) listing each playbook by
  slug with a one-line "applies when…" trigger description.
- A **consult vocabulary**: `hivemind-consult` gains a _list_ mode ("what
  playbooks exist?") and an _apply-by-slug_ mode (fetch the named playbook, run
  the current material through its review checklist).
- An **authoring convention for digest**: every promoted playbook must declare
  its slug, its applies-when line, and end in an apply-checklist — born
  addressable and applicable.

**It is not:**

- A solution to **where read-triggers live in consumer projects**. That's
  deliberately deferred: each project bakes its own trigger into AGENTS.md, an
  SOP doc, or a skill ("before doing X, consult HiveMind"). Usage feedback will
  reveal whether that convention ever needs a canonical home.
- A sync system. Materialized copies remain point-in-time snapshots with
  provenance; re-materialize rather than hand-edit.
- A search engine or graph/wiki system. The catalog is a flat, human-scale
  index; Pull mode's search stays as-is for everything below the playbook layer.
- New capture tooling — `hivemind-capture`/`hivemind-feedback` are untouched.

## Open Questions

- [ ] Naming: are these "playbooks" everywhere, or does the promoted layer need
      a distinguishing term (digest, principle-set) vs. scenario-level captures?
      (Leaning: keep "playbook" — it matches the HiveMind folder and the anthill
      artifact.)
- [ ] Does the catalog live as a single index document in the Playbooks folder,
      or as a section of the existing Field Guide?
- [ ] Should apply-by-slug also update the playbook's `applied_to` frontmatter
      in HiveMind (closing the loop on usage tracking), or is that write outside
      consult's read-only contract?
- [ ] Anthill's meta-lessons for authoring guidance: "one intake, route at
      synthesis" and "carry the weakening condition when codifying" — do these
      belong in the digest convention now or later?

## Suggested Next Steps

- [ ] Create a project folder (`create-project`) — the idea is concrete enough
      for a proposal; scope is bounded (catalog doc + consult skill update +
      digest convention).
- [ ] As part of proposal work, read the canonical HiveMind playbook entry
      (`hivemind_source_id: Jn5TO0t2x_KJ1b29Radha`) and the live Field Guide to
      confirm current workspace structure before designing the catalog.
- [ ] Version note: changes to `hivemind-consult`/`hivemind-digest` are
      behavioral → minor bump of the hivemind plugin at minimum.

---

**Origin:**

- Workshop conversation, 2026-07-08 → 2026-07-10, following exploration of the
  anthill repo's playbook and docs-taxonomy findings.
