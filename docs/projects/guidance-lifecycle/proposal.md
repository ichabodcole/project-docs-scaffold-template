---
type: proposal
title: "Guidance Lifecycle: Touch Points & Type Retirement"
description:
  Retire memory and lesson, reshape playbooks to Goal/Steps/Verification, and
  wire consult, reflect and override into the lifecycle skills.
tags: [touch-points, guidance, taxonomy]
status: draft
lifecycle: draft # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-opus-5, at: 2026-09-11 }
---

# Guidance Lifecycle: Touch Points & Type Retirement

## Overview

project-docs captures well and promotes nothing. Across 25 consuming
repositories it has produced 512 sessions and 266 memories against 58 playbooks
and 28 lessons — and the 86 guidance documents are the ones no skill reads.

Retire `memory` and `lesson`, reshape `playbook` into the one durable guidance
type, and wire the three touch points that move knowledge between states:
**consult** at begin-work, **reflect** at end-work, **override** per lifecycle
event.

Depends on [Docs Foundation](../docs-foundation/proposal.md), which must ship
first: once adopters can declare types in their own config, retiring two is a
change of defaults rather than a removal of capability. Breaking: major bump for
the plugin and the scaffold template.

## Problem Statement

**The write side is mandatory and the read side does not exist.**
`finalize-branch` Step 5 mandates a memory on every branch. No skill has ever
mandated a playbook or a lesson. Every plugin reference to `docs/memories/` is
write-side or structural plumbing; the one read-side mention is a bullet in
`project-summary.md`, and `ground-in-project` explicitly forbids reading them.
The 9:1 ratio is the design working as specified.

**Retrieved guidance still fails when it is narrative.** Anthill demonstrated
this: agents that write down encountered issues and read them back make the same
mistakes, because observations are not instructions. The lesson template causes
it directly, prompting for "What prompted this discovery?", "What problem were
you solving?", "How did you encounter this?" and "The journey."

**Adopter tailoring is invisible to the skills.**
`operator-mono/docs/playbooks/branch-finalization-playbook.md` (2025-12-09)
describes the same lifecycle event `finalize-branch` owns and makes different
choices about merge timing and squashing. Neither knows the other exists.
`init-branch` is the only command in the plugin that honours an override.

**Knowledge fragments away from the guide that should hold it.** 7 of
`operator-mono`'s 13 lessons cluster into two domains — powersync and mcp — that
already have playbooks.

## Proposed Solution

**Two states.** _Capture_ is dated and unmaintained; narrative belongs there,
because you need to know exactly what the agent did. _Guidance_ is curated and
imperative. Between them sits a promotion step that has never existed, which is
why every capture is implicitly permanent.

| state    | types                      | lint tier   |
| -------- | -------------------------- | ----------- |
| Capture  | `session`, `investigation` | `workbench` |
| Guidance | `playbook`                 | `durable`   |

`memory` is provenance nobody requested. `lesson` is a playbook fragment filed
apart from its playbook: a domain trap belongs in that domain's guide as a step
and a verification. `session` survives because its provenance has a named reader
— the review census `finalize-branch` puts there precisely because "chat
scrollback is not a trace."

**Three touch points**, all on skills that already exist:

- **Consult** — `generate-dev-plan`, `dev-kickoff`. What kind of work is this,
  and is there a playbook for it? Reports explicitly when there is not.
- **Reflect** — `finalize-branch`, replacing Step 5. Did we learn something that
  saves a future agent from rediscovering this? The bar is explicit, the default
  is no, and the usual positive outcome is appending checks to an existing
  playbook rather than authoring a document.
- **Override** — a skill carries a working default and names
  `docs/playbooks/<event>-playbook.md` as taking precedence, extending
  `init-branch`'s pattern to `finalize-branch`, `dev-kickoff`, release and
  handoff — the four events adopters independently wrote playbooks for.

No mid-work touch point. Agents mid-implementation do not spontaneously go and
look; the bookends are the only moments available.

**Playbooks are indexed by kind of work and accumulate**, shaped
`Goal · Steps · Verification` after acc's `guide` — three sections against the
current eight.

## Scope

**In Scope (MVP):** `docs/STYLE.md` as a seeded file; the playbook template
rewrite; consult, reflect and override wired into five skills; removal of
`memory` and `lesson` from the scaffold, payload, migrations, lint registry,
`pdocs new` and `.project-docs.json` defaults; the migration; deletion of this
repository's 30 memories.

**Out of Scope:** Importing acc's `rule`, `decision`, `archetype` and `tutorial`
page types — they exist because acc ships a conformance spec to an external
audience, and importing them would add classifications. Rewriting the 86
existing playbooks and lessons in consuming repositories; they stay valid and
get reshaped as they are touched. Any compatibility shim.

**Future Considerations:** A retroactive Reflect pass over the 266 existing
memories. A `pdocs` subcommand listing playbooks by kind-of-work, if frontmatter
`description` proves insufficient for consult.

## Technical Approach

**Phase 1 — Prose style and playbook shape.** Add `docs/STYLE.md`, seeded via
the verb [Docs Foundation](../docs-foundation/proposal.md) ships — derived from
acc's `docs/wiki/STYLE.md` but scoped to a consuming team, and carrying its
density rules with their evidence strength attached, because a rule stripped of
its condition gets applied mechanically. Rewrite the playbook template to
`Goal · Steps · Verification`. Delete the four provenance prompts from the
lesson template first, so anything migrated out of it is already in shape.

**Phase 2 — Touch-point wiring.** Consult into `generate-dev-plan` and
`dev-kickoff`; Reflect into `finalize-branch`; Override into `finalize-branch`,
`dev-kickoff`, release and handoff, each naming a specific path and declaring
precedence.

Consult's evidence must be **query output, not a self-report** — the failure
mode the reviewer-capability check hit in 3.4.0, where constraining the wording
of a claim did nothing because the action left no trace. Reflect needs a real
"nothing this time" exit, or it reproduces the cadence that generated 266
memories.

**Phase 3 — Retire `memory` and `lesson`.** Remove from `DURABLE_TYPE`, the
templates, category READMEs, `SCHEMA.md`, `.project-docs.json` defaults, the
payload and `pdocs new`'s creatable types. Write the migration, which must tell
an adopter how to keep either type locally rather than only how to delete it.

## Impact & Risks

**Benefits:** Guidance read at the moment it applies. A 9:1 ceremony ratio
inverted at the source rather than by curation. Adopters able to tailor
lifecycle behaviour without forking a skill. Two fewer classifications, five
fewer template sections.

**Risks:**

- _Reflect becomes ceremony._ Per-branch cadence produced 266 memories.
  Mitigation: the artifact is optional with an explicit negative exit, and the
  usual outcome is appending to an existing file.
- _Consult goes hollow_ — an agent reports "nothing applies" without looking.
  Mitigation must be structural, not a wording rule; see
  [A self-report can't be made verifiable by constraining its wording](../../memories/2026-09-02-self-reports-cannot-be-made-verifiable.md).
- _Breaking for adopters who are not Cole._ Mitigation: the sibling project
  lands first.

**Complexity:** High — five skills, the lint registry, the payload, the
migration system, and a template rewrite.

## Open Questions

- Does Reflect live on `finalize-branch` (freshest, but per-branch) or
  `sweep-project` (rarest, but months cold and may never run)? Currently
  proposed per-branch on freshness grounds; the only thing separating it from
  what produced 266 memories is that the artifact becomes optional.
- Disposition of the 266 existing memories across 25 repositories: blanket
  delete, or one retroactive Reflect pass.
- Does `investigation` belong in Capture alongside `session`? It is dated and
  unmaintained, but unlike a session it is often read later on its own merits.

## Success Criteria

- `finalize-branch` on a branch that taught nothing produces no guidance
  document and says so.
- `generate-dev-plan` names the playbooks it consulted, or states none applied,
  from query output rather than assertion.
- A project carrying `docs/playbooks/branch-finalization-playbook.md` sees
  `finalize-branch` follow it and say so.
- `grep -rn "type: memory\|type: lesson" docs/ '{{cookiecutter.project_slug}}/docs/'`
  returns nothing.
- The migration shows an adopter how to retain either type via config.
- `npm run check` green; payload verified by generating, not reading.

**Related Documents:**

- [Guidance Layer & Lifecycle Touch Points](../../briefs/2026-09-11-guidance-layer-and-touch-points.md)
  — the census and measurements behind both projects
- [Docs Foundation: Ownership Classes & Declarable Types](../docs-foundation/proposal.md)
  — the prerequisite project
