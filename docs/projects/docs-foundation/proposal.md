---
type: proposal
title: "Docs Foundation: Ownership Classes & Declarable Types"
description:
  Give adopters a config-driven type vocabulary and a stated file-ownership
  model, so later default changes cost configuration rather than a fork.
tags: [configuration, ownership, lint]
status: draft
lifecycle: draft # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-opus-5, at: 2026-09-11 }
---

# Docs Foundation: Ownership Classes & Declarable Types

## Overview

Two mechanisms, neither of which changes any existing document: adopters can
declare their own document types, and the scaffold states which files they are
allowed to edit.

This is the foundation under
[Guidance Lifecycle](../guidance-lifecycle/proposal.md). Shipped first, it
converts that project's type retirement from a removal of capability into a
change of defaults — a team that wants `memories/` keeps it with three lines of
config instead of forking the lint.

It stands on its own regardless of whether the lifecycle work ever lands.
Non-breaking: a minor bump.

## Problem Statement

**A consumer cannot declare a document type.** Adding `docs/runbooks/` with
`type: runbook` fails `pdocs check` at exit 9:

```
BAD type     "runbook" not in {architecture, specification, interaction,
                               playbook, lesson, memory, manifesto, summary, index}
WRONG TYPE   "runbook" (its position says "")
```

The closed set is `DURABLE_TYPE` in `scripts/pdocs/lint/registry.ts`. The engine
beneath it already reads an open vocabulary —
`const OKF_TYPES = new Set<string>(config.types)` at
`scripts/pdocs/docs-lint/index.ts:471` — but `types` is never parsed from
`.project-docs.json` in `scripts/pdocs/docs-lint/config.ts`. The capability
exists one layer down and is closed off one layer up.

**Ownership is enforced but unstated.** Migrations issue 12 unconditional
`cp "$SCAFFOLD/..." <target>` calls, including `docs/SCHEMA.md`. Nothing in
`docs/SCHEMA.md`, `docs/AGENTS.md` or `docs/README.md` says which files an
adopter may edit. They find out by losing work at the next migration.

**There is no way to ship a file an adopter is allowed to own.** Migrations have
exactly one verb. A file is either overwritten or absent; "installed once, then
yours" has no machinery. That middle class is what an adopter-tailorable default
requires.

**`pdocs find --type` accepts anything.** A mistyped type returns
`ok: true, count: 0` at exit 0 — indistinguishable from "nothing matches."
Harmless today; load-bearing the moment anything consults by type.

## Proposed Solution

**Three ownership classes, stated in `docs/SCHEMA.md`:**

| class    | migration behaviour                | examples                                              |
| -------- | ---------------------------------- | ----------------------------------------------------- |
| _owned_  | overwritten every migration        | `SCHEMA.md`, category READMEs, `scripts/pdocs/**`     |
| _seeded_ | installed once, then the adopter's | candidate: templates, `STYLE.md`                      |
| _theirs_ | never touched                      | `.project-docs.json`, root `AGENTS.md`, all documents |

The rule that decides the class: **does shipped tooling read it?** The lint
implements `SCHEMA.md`, so an adopter editing it makes their spec disagree with
their linter — owned, hard. Authored prose is read by humans and agents, not by
code — seeded. Documents and config are theirs.

**A config-driven type vocabulary.** `.project-docs.json` already lists folders
by tier and is already adopter-owned:

```json
"durable":   ["architecture", "specifications", "playbooks"],
"workbench": ["backlog", "briefs", "investigations", "projects"]
```

Adding a folder→type mapping extends a structure adopters already edit.
`SCHEMA.md` keeps the contract — what keys exist, what `status` may hold, how
`related:` resolves — and states that local types are declared in config.
Contract owned, vocabulary open.

## Scope

**In Scope (MVP):** The `types` / folder→type map parsed from
`.project-docs.json`; `registry.ts` reading rather than hardcoding it; the
seeded install verb in the migration idiom; ownership classes stated in
`SCHEMA.md`; `check-mirror.sh` exemption for seeded files; `pdocs find --type`
validating against the resolved vocabulary; a migration carrying all of it.

**Out of Scope:** Any change to the set of types the scaffold ships by default —
that is [Guidance Lifecycle](../guidance-lifecycle/proposal.md). Adding
`STYLE.md` or any new seeded file beyond whatever is needed to prove the verb.

**Future Considerations:** Per-type required-section rules in config, which
would let an adopter declare shape as well as vocabulary.

## Technical Approach

**Phase 1 — Ownership classes and the seed verb.** Add the second install idiom
(`[ -f <path> ] || cp ...`) and document it in the migration-authoring guidance.
State every scaffold file's class in `docs/SCHEMA.md`. Exempt seeded files by
name in `scripts/check-mirror.sh`, following the existing `PROJECT_MANIFESTO.md`
/ `index.md` precedent — the checklist already notes that adding a third
exemption is a decision rather than a convenience, so record it as one.

Prove the verb before relying on it: run a migration twice against a fixture
with a locally-edited seeded file and assert the edit survives both runs.

**Phase 2 — Open the type vocabulary.** Prototyped 2026-09-11 in 46 lines across
three files; what remains is tests, discoverability and the `find` validation.
Parse `types` and the folder→type map in `scripts/pdocs/docs-lint/config.ts`.
Have `scripts/pdocs/lint/registry.ts` derive `DURABLE_TYPE` from config with the
current table as the default rather than the ceiling. Extend `pdocs find --type`
to reject unknown types against the resolved vocabulary, naming the valid set in
`details.choices` per the error envelope this CLI already follows.

Note that `rules.ts` holds a **second** pair of position→type resolvers
(`SPEC[folder]?.type` and its `DURABLE_TYPE` twin) beyond `registry.ts`. The
spike found them only because patching the first left
`WRONG TYPE ... (its position says "")` behind; both need the config fallback.

Verify by generating: declare `docs/runbooks/` in a generated project, add a
page, reach `pdocs check` exit 0, and confirm an undeclared type still exits 9.

## Impact & Risks

**Benefits:** Adopters can model documentation their own way without forking the
lint. Ownership is discoverable before work is lost rather than after. The
retirement in the sibling project stops being destructive.

**Risks:**

- _An open vocabulary weakens the lint._ A team can declare a type and get no
  shape checking for it. Accepted: the alternative is that they cannot have the
  type at all, and the tier checks (`durable` / `workbench`) still apply by
  folder.
- _Seeded files drift from the scaffold silently_ — an adopter keeps a
  three-versions-old template and nothing says so. Mitigation is out of scope
  here; note it rather than solve it.
- _The mirror exemption grows._ Each seeded file is a file nothing compares.
  Mitigation: exempt by explicit name, never by pattern.

**Complexity:** Medium — two mechanisms, both localized to the lint layer, the
config parser, the mirror check and the migration idiom. No document content
changes.

## Open Questions

- Do templates become seeded, or stay owned? By the tooling test they should be
  seeded: a tailored template breaks nothing while `SCHEMA.md` still governs
  output. That is 12+ files changing class, and it is the difference between "a
  framework you conform to" and "a starting point you take over." Deciding it
  here is what gives Phase 1 a real file to prove the verb against.
- ~~Should an adopter-declared type be allowed into `durable`, or only
  `workbench`?~~ **Resolved by spike, 2026-09-11: yes, at no cost.** The tier is
  chosen by which array the folder is listed in. A type declared into `durable`
  gets the full library tier and the catalog obligation bites correctly —
  `ORPHAN ... add its catalog line`. No special casing required.

## Success Criteria

- A generated project declares `docs/runbooks/` in `.project-docs.json`, adds a
  page, and reaches `pdocs check` exit 0.
- An undeclared type still fails at exit 9 with the valid set named.
- `pdocs find --type nonsense` exits non-zero and lists the resolved vocabulary,
  rather than returning `count: 0` at exit 0.
- A locally-edited seeded file survives two consecutive migration runs.
- `docs/SCHEMA.md` states the class of every file the scaffold ships.
- `npm run check` green; payload verified by generating, not reading.

**Related Documents:**

- [Guidance Layer & Lifecycle Touch Points](../../briefs/2026-09-11-guidance-layer-and-touch-points.md)
  — the census and measurements behind both projects
- [Guidance Lifecycle: Touch Points & Type Retirement](../guidance-lifecycle/proposal.md)
  — the dependent project this one unblocks
