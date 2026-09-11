---
type: brief
title: Guidance Layer & Lifecycle Touch Points
description:
  Capture becomes guidance only through a deliberate promotion step;
  project-docs has the capture half and none of the promotion, retrieval, or
  override halves.
tags: [touch-points, guidance, taxonomy]
status: draft
lifecycle: active # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-opus-5, at: 2026-09-11 }
---

# Guidance Layer & Lifecycle Touch Points

---

## The Spark

A census of 25 repositories consuming project-docs:

| type       | count |
| ---------- | ----- |
| `session`  | 512   |
| `memory`   | 266   |
| `playbook` | 58    |
| `lesson`   | 28    |

**9:1 history to guidance — and the 86 guidance documents are the ones nothing
reads.** Every reference to `docs/memories/` across the plugins is write-side or
structural plumbing; the single read-side mention is one bullet in
`project-summary.md`, and `ground-in-project` explicitly forbids reading them.
`finalize-branch` Step 5 mandates a memory on every branch. Nothing in any skill
has ever mandated a playbook or a lesson.

The ratio is not a surprise. It is the design working as specified.

Two further measurements sharpened it:

- `operator-mono` wrote `docs/playbooks/branch-finalization-playbook.md` on
  2025-12-09 — its own workflow for the exact lifecycle event `finalize-branch`
  owns, making different policy choices about merge timing and squashing. The
  skill has never known it exists.
- 7 of its 13 lessons cluster into two domains (powersync, mcp) that already
  have playbooks. The knowledge is fragmented away from the guide that should
  hold it.

## Inspiration & Influences

- **`init-branch`** — the one place the pattern already works: a touch point
  carrying a working default that names
  `docs/playbooks/branch-initialization-playbook.md` as taking precedence. "Most
  projects don't; the steps below stand on their own."
- **The acc conformance wiki** (`node_modules/agent-cli-conformance/docs/wiki`)
  — Diátaxis under local names, a `STYLE.md` governing prose, and one sentence
  that settles the whole taxonomy question: **"The wiki is what we believe;
  `docs/research/` is what convinced us."** Its `guide` shape is
  `Goal · Steps · Verification` — three sections against this scaffold's eight.
- **The 2026-07-10 HiveMind playbook-catalog brief** — "a catalog without
  triggers is a nicer graveyard." The retrieval half was already designed there.
- **Anthill's negative result** — agents that write down encountered issues, and
  then read them back, still make the same mistake. Observational form fails to
  change behaviour even when retrieved. The payload must be checks to run.

## Vision

**Two states, three touch points, two fewer document types.**

| state        | narrative? | lifetime                     | types                      |
| ------------ | ---------- | ---------------------------- | -------------------------- |
| **Capture**  | yes        | dated, unmaintained          | `session`, `investigation` |
| **Guidance** | no         | curated, imperative, durable | `playbook`                 |

Capture is where narrative belongs: you need to know exactly what the agent did.
It is not what you hand the next agent. Between the two sits a **promotion step
that has never existed** — the evaluation of whether a capture generalizes.
Without it every capture is implicitly permanent, which is how 266 memories
happen.

`memory` and `lesson` are retired. `memory` is provenance nobody requested.
`lesson` is a playbook fragment filed apart from its playbook: a domain trap
belongs in that domain's guide as a step and a verification, not as a standalone
page. `session` survives because its provenance has a named reader — the review
census `finalize-branch` puts there precisely because "chat scrollback is not a
trace."

Playbooks are indexed by **kind of work**, and they **accumulate**. The default
action on reflection is appending a check to an existing playbook, not writing a
new document. That is what prevents the proliferation Anthill hit.

## Core Use Cases

1. **Consult at begin-work** — `generate-dev-plan` / `dev-kickoff` ask what kind
   of work this is and whether a playbook covers it, reporting explicitly when
   none does.
2. **Reflect at end-work** — `finalize-branch` asks whether anything learned
   would save a future agent from rediscovering it. The bar is explicit and the
   default answer is no. The usual positive outcome is three lines appended to
   an existing playbook.
3. **Override per lifecycle event** — a skill carries a working default and
   names `docs/playbooks/<event>-playbook.md` as taking precedence. Extends
   `init-branch`'s existing pattern to `finalize-branch`, `dev-kickoff`, release
   and handoff — the four events adopters independently wrote playbooks for.
4. **Declare a local document type** — a consuming team adds `docs/runbooks/`
   with `type: runbook` through `.project-docs.json`, and the lint accepts it.

There is no mid-work touch point. An agent mid-implementation does not
spontaneously remember to go and look; the only moments available are the
bookends.

## What Makes It Interesting

The retrieval layer already exists and is unwired. `pdocs find --type playbook`
returns slug, title and a one-line description — the exact catalog shape the
HiveMind brief asked for. `docs-lint/` already reads its type vocabulary from
config (`OKF_TYPES = new Set(config.types)`). `.project-docs.json` already
splits `durable` from `workbench`, which is capture-vs-guidance under other
names, and the consumer already owns that file.

Almost nothing here is new machinery. It is connecting inputs that exist to
files that are already consumer-owned, and deleting two types.

## What It Is / What It Isn't

**It is:**

- A promotion step, a retrieval trigger, and an override hook — the three things
  missing from a system that already captures well.
- A net simplification: 22 document types to 20, and the playbook template from
  eight sections to three.
- An ownership model stated out loud for the first time.

**It is not:**

- An import of acc's six Diátaxis page types. `rule`, `decision`, `archetype`
  and `tutorial` exist because acc ships a conformance spec to an external
  audience. A consuming team has no equivalent, and importing them would add
  classifications.
- A migration-safety exercise. Cole is the sole consumer; defaults change and
  old documents are deleted rather than shimmed.

## Open Questions

- [ ] **Do templates become seeded or stay owned?** By the tooling test they
      should be seeded — a team tailoring its playbook template breaks nothing
      so long as output still satisfies `SCHEMA.md`. But that is 12+ files
      changing class, and it is the difference between "a framework you conform
      to" and "a starting point you take over." Product decision, not technical.
- [ ] **Disposition of the 266 existing memories.** Blanket delete, or one
      retroactive promotion pass — the same `Reflect` operation run once over
      history. The second is the only way the good ones survive.
- [ ] **Does `finalize-branch` reflection stay per-branch?** Freshness argues
      yes. The risk is ceremony pressure to produce something; the mitigation is
      that the artifact is optional and appending beats authoring.

## Suggested Next Steps

Five separable projects. The fourth blocks use case 1; the fifth blocks the
whole ownership story.

- [ ] **Prose style and playbook shape** — add `docs/STYLE.md` (none exists in
      this repo, the payload, or any consumer) and rewrite the playbook template
      to `Goal · Steps · Verification`. Delete the four provenance prompts in
      the lesson template on the way out: "What prompted this discovery?", "What
      problem were you solving?", "How did you encounter this?", and "The
      journey."
- [ ] **Touch-point wiring** — consult, reflect, override across the five
      lifecycle skills.
- [ ] **Retire `memory` and `lesson`** — across the scaffold, the payload, the
      migrations and 25 consuming repositories.
- [ ] **Open the type vocabulary** — surface `types` and the folder→type map
      into `.project-docs.json`. Today a consumer-invented type fails
      `pdocs check` at exit 9 with `BAD type ... not in {...}`, because
      `lint/registry.ts` closes a set the engine beneath it leaves open. Fixing
      this makes retiring two types a change of defaults rather than a removal
      of capability. Includes the deferred `pdocs find --type` validation fix,
      which must read the consumer's vocabulary rather than a hardcoded list.
- [ ] **State the ownership model** — three classes, not two: _owned_
      (overwritten by migration), _seeded_ (installed once, then theirs),
      _theirs_ (never touched). Migrations have one verb today — 12
      unconditional `cp` calls — so the middle class has no machinery. Adopters
      currently discover the boundary by losing work.

---

**Origin:**

- [HiveMind Playbook Catalog & Apply Vocabulary](./2026-07-10-hivemind-playbook-catalog.md)
