# HiveMind Plugin — Cross-Project Knowledge Cycle Skills

**Status:** Completed **Created:** 2026-05-31 **Author:** Cole

---

## Overview

HiveMind is the shared, accumulating knowledge base that sits _above_ any single
project. When work in one project surfaces something reusable — a hard-won
lesson, a repeatable migration, a model-level insight, a half-formed observation
— it should not die in that project's session notes. It should flow up into
HiveMind, get refined as more projects feed it, and flow back down to be applied
elsewhere. The loop: **collect → digest → disperse → collect again.**

Today the collection side exists in fragments (two portable skills in another
project, `capture-scenario` and `incorporate-feedback`) and the storage side
exists (an Operator workspace with Playbooks, Feedback, Scenarios, and Lessons
Learned folders). What is missing is a coherent, installable **skill family**
that makes the whole cycle a first-class workflow from inside any project — and
that owns the _convention_ HiveMind documents follow so they stop drifting.

This proposal defines a standalone **`hivemind` plugin** with four verb-split
skills covering both halves of the loop, plus a shared convention ("Field
Guide") that the skills read and enforce.

## Problem Statement

Knowledge learned in one project is currently stranded there. Concrete pain:

- **Collection is ad-hoc and partial.** `capture-scenario` works but lives in
  one project's `.claude/skills/`. `incorporate-feedback` is a strong triage
  methodology but targets a _local_ repo (`docs/reports/_skill-feedback/`, a
  `lore` CLI) — it is not actually a HiveMind skill. There is no installable way
  to file skill/process **feedback** (the end-of-run "how did this tool
  perform?" signal, as distinct from a decision-delta scenario) into HiveMind at
  all.
- **There is no dispersal path.** Nothing pulls HiveMind knowledge _into_ a
  working project. An agent re-discovers a solved problem, or unknowingly
  violates a principle HiveMind already recorded, because no skill surfaces it.
- **There is no digest step.** Feedback and scenarios accumulate but nothing
  promotes them — the "stomach" that turns repeated observations into a Playbook
  or Lessons-Learned entry does not exist as a HiveMind operation.
- **The convention is drifting.** Each document type has its own frontmatter
  shape, but the live docs already diverge from the documented intent (e.g. the
  `.operator` notes describe feedback fields like `also_observed_in` and
  `instance_count` that no actual feedback doc uses). Without an owned, single
  source of truth, every new contribution invents its own variant.

Who is affected: Cole, and any agent working in any of Cole's projects. The
value compounds with project count — the more projects feed and consume
HiveMind, the more each one saves.

## Grounding: the real HiveMind (verified 2026-05-31)

This design is grounded against the live Operator workspace, not the mental
model. Verified structure:

- **Project ID:** `bMxQv-R9IXHVl8jlACagv` (name: "Hivemind").
- **Root folders (reference by stable group ID, never by name):**
  - **Playbooks** — `R4uC0jYDig8_pylpkHTMP` (3 docs). Abstracted, reusable
    how-tos. Frontmatter:
    `type, status, tags, stack, applied_to, last_verified`. `applied_to` is the
    epistemic warrant — the projects the playbook was validated against.
  - **Feedback** — `c1X2fuiDRd6i7AQfCVm84` (3 docs). Hypothesis-shaped, often
    single-instance observations. Frontmatter: `type, date, originated_in, tags`
    plus optional `proposes, impact, generalization`. The on-ramp.
  - **Scenarios** — `9vDJ9VOBqgd0g6FEV0oQQ` (3 docs). Durable, model-level
    insights / decisions / lens-shifts. Frontmatter:
    `type, date, source_project, slug`. Named after the _takeaway_, not the
    situation.
  - **Lessons Learned** — `25izJ8swJEYP0B23UhZz0` (empty). Reserved for
    issue→resolution writeups; a promotion target for digest.
  - **@operator** — `UerSKStBeWvJJ_im2tb0Q` (a `context` meta-doc describing
    HiveMind). The natural home for the Field Guide.

Two grounding findings that shape the design:

1. **No "Principles" folder exists.** The three Scenarios already _function_ as
   principles (e.g. `only-include-non-discoverable-information`,
   `affirmative-scope-over-defensive-exclusion`). Decision: **Scenarios are the
   home for named, reusable principles.** Digest promotes patterns _across_
   scenarios into Playbooks or Lessons Learned rather than into a separate
   Principles tier. (Revisit if a real Principles tier is later warranted.)
2. **`incorporate-feedback` is local, not HiveMind.** Its _method_ (triage,
   cluster, generalization pass, calibration notes, judgment-not-count bar) is
   the basis for `hivemind-digest`, but the target changes from local files to
   HiveMind documents.

## Proposed Solution

A standalone **`hivemind` plugin** in `plugins/hivemind/`, registered in the
marketplace alongside the existing five plugins. It depends on the Operator MCP
and the `operator-setup` skill for credentials, but it is _about_ the knowledge
cycle, not about Operator — Operator is the storage backbone. Keeping it
standalone (rather than folding into the `operator` plugin) keeps that
separation clean and makes the future extraction into its own marketplace
straightforward.

### Why a new plugin rather than the operator plugin

HiveMind is a concept that happens to be _stored_ in Operator. Coupling it to
the operator plugin would conflate the storage mechanism with the knowledge
methodology, and would make the eventual extraction (Cole intends to possibly
split HiveMind into its own marketplace) harder. A standalone plugin with its
own `plugin.json` and version is the honest boundary.

### The four skills

Split by verb, grouped into the two halves of the loop.

**Contribute (project → HiveMind):**

1. **`hivemind-capture`** — preserve a **scenario**: a **human↔agent delta that
   surfaced during implementation work**, distilled into a durable, named,
   reusable takeaway. The trigger is a discrepancy — Cole pushes back on the
   agent ("we shouldn't include that," "think about it this way") or a decision
   gets made with non-obvious reasoning, and there is a model-level difference
   worth preserving. High bar ("worth re-reading in six months"). Generalizes
   the existing `capture-scenario` skill: recognize the delta → reconstruct the
   scenario (what was happening, why the delta, the resolution) → name the
   takeaway → align with Cole (via Digestify or chat) → write to the Scenarios
   folder by group ID as `<YYYY-MM-DD>-<slug>.md`. Slug names the takeaway, not
   the situation.

2. **`hivemind-feedback`** — file a **feedback** entry: a signal about a
   **skill, process, or mechanism**, typically surfaced at a skill's
   **end-of-run feedback touchpoint** ("did you hit any issues using this skill?
   anything the human ran into mid-run?"). Its purpose is to improve the _tool
   or process itself_, not to capture a way-of-thinking. Often hypothesis-shaped
   and single-instance. Writes to the Feedback folder with feedback frontmatter
   (`originated_in`, optional `proposes`/`impact`/`generalization`). The
   distinction from capture is **subject, not maturity**: capture is about how
   to _think_ (a human↔agent decision delta); feedback is about how a _tool or
   process_ performed and how to improve it.

**Apply + refine:**

3. **`hivemind-consult`** — the dispersal/read direction. From inside a working
   project: given the activity at hand, search HiveMind (by frontmatter and
   content) for relevant playbooks, scenarios, and feedback; surface and apply
   them; and **flag when current work runs afoul of an existing principle**
   (e.g. "this skill draft re-states discoverable tool names — see the
   `only-include-non-discoverable-information` scenario"). Optionally
   **materialize** a playbook or principle down into the project's own `docs/`
   (the "constitution" idea) so it is referenceable without a HiveMind
   round-trip.

4. **`hivemind-digest`** — the "stomach." Operates on HiveMind itself, not a
   project. Triage accumulated Feedback and Scenarios; cluster by emergent
   theme; run the generalization pass; and promote what has earned it — e.g.
   feedback validated across ≥2 projects becomes a Playbook (`applied_to`
   warrant), a cluster of scenarios becomes a Lessons-Learned synthesis. Method
   borrowed from `incorporate-feedback` (judgment-not-count bar, calibration
   reasoning), retargeted to HiveMind documents. Triage-and-propose, not
   triage-and-apply: Cole reviews promotions before they are written.

### The Field Guide (shared convention)

A single canonical document defining: the four document types and their exact
frontmatter; the promotion ladder (feedback → scenario / lessons-learned →
playbook; scenarios double as principles); the stable group-ID map; and slug
rules. All four skills read it at preflight so they stay consistent and so the
convention stops drifting.

- **Canonical home:** seeded _into HiveMind itself_ (extending the
  `@operator/context` doc, or a sibling Field Guide doc in that folder), so
  HiveMind is self-describing.
- **Fallback:** the plugin ships a copy as a skill reference file, used if the
  live read is unavailable. Following the
  `only-include-non-discoverable-information` principle, the plugin copy points
  at the live doc as source of truth rather than duplicating volatile detail.

### How users experience this

- _"Capture this as a scenario"_ → `hivemind-capture` runs, aligns, writes to
  Scenarios. (Also fires in suggested mode when a model-level delta surfaces.)
- At the end of a skill run, or when a tool/process was rough to use →
  `hivemind-feedback` files a skill/process-improvement signal to Feedback.
- _"What does HiveMind know about migrating to Bun?"_ or _"check this against
  what we've learned"_ → `hivemind-consult` searches, applies, and flags
  conflicts; can pull a playbook into local `docs/`.
- _"Let's process the HiveMind backlog"_ → `hivemind-digest` triages Feedback +
  Scenarios and proposes promotions for Cole's review.

## Scope

**In Scope (MVP):**

- New `plugins/hivemind/` plugin with `plugin.json`, marketplace registration,
  README, and `dist/` build wiring consistent with the other plugins.
- Four skills: `hivemind-capture`, `hivemind-feedback`, `hivemind-consult`,
  `hivemind-digest`.
- The Field Guide convention doc, seeded into HiveMind and shipped as a fallback
  reference.
- Cross-cutting behaviors (credential discovery, group-ID references, graceful
  degradation) consistent across all four skills.

**Out of Scope (at least initially):**

- A separate **Principles** folder/tier (scenarios cover this for now).
- Automatic/proactive consultation (hooks that fire without being asked).
  Consult is invoked, not ambient — for MVP.
- Extracting HiveMind into its own marketplace repo (future; the plugin boundary
  is drawn to make it easy later).
- Backfilling/rewriting the existing 9 HiveMind docs to a new frontmatter schema
  beyond what digest naturally touches.
- A custom CLI (the source `incorporate-feedback` used a `lore` CLI; the
  HiveMind skills use the Operator MCP directly).

**Future Considerations:**

- A real Principles tier if scenarios accumulate enough to warrant distillation.
- Proactive consult via session hooks ("before you start a migration, here's
  what HiveMind knows").
- Upgrade/migration-guide document type (named in the `@operator/context` doc).
- Cross-agent portability: a `dist/` bundle so the skills work outside Claude
  Code, like the other plugins.

## Technical Approach

- **Plugin shape:** mirrors existing plugins — `.claude-plugin/plugin.json`,
  `skills/<name>/SKILL.md`, optional `references/`. Registered in
  `.claude-plugin/marketplace.json` with a `knowledge`/`cross-project` category.
  Built into `dist/hivemind/` via the existing `build:dist` script; validated by
  `validate:skills`.
- **Storage access:** Operator MCP. Credentials via the `operator-setup` flow —
  skills look for a HiveMind key in the local `.operator` (the documented
  convention is `OPERATOR_HIVEMIND_ADMIN_*`, but treat the spelling as a local
  convention and ask the user if absent rather than hardcoding). Per the
  non-discoverable-information principle, skills do **not** enumerate MCP tool
  names — they defer to the runtime's tool documentation.
- **Stable identifiers:** the group-ID map (Playbooks / Feedback / Scenarios /
  Lessons Learned / @operator) is load-bearing, non-discoverable knowledge — it
  lives in the Field Guide. Skills reference folders by ID; if an ID fails to
  resolve, surface to Cole and stop rather than silently recreating.
- **Convention as data:** the Field Guide is the single source of truth for
  frontmatter and the promotion ladder. Skills read it at preflight so the
  convention can evolve without editing four skills.
- **Reuse:** `hivemind-capture` is a generalization of the existing
  `capture-scenario` SKILL.md; `hivemind-digest` adapts the
  `incorporate-feedback` methodology (clustering, generalization pass,
  calibration notes) to HiveMind.

Key dependencies: Operator MCP + `operator` plugin's `operator-setup` skill;
Digestify (toolbox) as an optional alignment surface for capture/feedback;
existing `build:dist` / `validate:skills` tooling.

## Impact & Risks

**Benefits:** Closes the cross-project knowledge loop end-to-end; makes
collection, dispersal, and digestion first-class installable workflows; codifies
and stabilizes the HiveMind convention; draws a clean plugin boundary for future
extraction.

**Risks:**

- _Convention drift between Field Guide and live docs._ Mitigation: single
  canonical doc in HiveMind; skills read it live; plugin copy defers to it.
- _Operator coupling despite the conceptual split._ Mitigation: confine all
  Operator specifics to a thin access layer / the Field Guide; keep skill bodies
  about the knowledge cycle.
- _Capture vs. feedback confusion._ Mitigation: the Field Guide states the
  distinction by **subject** — capture is a human↔agent decision/thinking delta
  during implementation; feedback is a skill/process-performance signal (often
  from an end-of-run touchpoint) — and each skill restates its own trigger.
- _Digest over-promotes._ Mitigation: triage-and-propose with Cole review;
  judgment-not-count bar inherited from `incorporate-feedback`.

**Complexity:** Medium — four skills sharing one convention, plus a new plugin
scaffold and dist wiring. Individually simple; the coordination and the
convention are where the care goes.

## Open Questions

- Should the Field Guide _replace_ the current `@operator/context` doc or sit
  beside it as a separate document?
- Does `hivemind-consult`'s "materialize to local `docs/`" land in a specific
  scaffold location (e.g. `docs/lessons-learned/` or `docs/playbooks/`), and
  does it copy or link-with-snapshot?
- Build order: should the convention/Field Guide + plugin scaffold land first
  (so the skills have something to read), then capture/feedback, then consult,
  then digest?

## Success Criteria

- All four skills installable from the marketplace and present in `dist/`.
- A scenario and a feedback entry can each be captured from a fresh project
  session and land correctly (right folder, right frontmatter) in HiveMind.
- `hivemind-consult` surfaces a relevant existing doc for a plausible task and
  flags at least one principle-violation case.
- `hivemind-digest` produces a review-ready promotion proposal from the current
  Feedback + Scenarios backlog.
- The Field Guide is the single source the skills read; no frontmatter rules are
  duplicated across skill bodies.

---

**Related Documents:**

- Source skills (another project): `capture-scenario`, `incorporate-feedback`
- HiveMind `@operator/context` doc (Operator project `bMxQv-R9IXHVl8jlACagv`)
- Memory: `project-hivemind-relationship` (working decisions on HiveMind)

---

## Notes

Grounded against the live HiveMind workspace on 2026-05-31. The portable
`capture-scenario` and `incorporate-feedback` skills informed this design but
are not copied verbatim: capture is generalized, feedback is new, consult is
new, and digest retargets the incorporate-feedback method from local files to
HiveMind.
