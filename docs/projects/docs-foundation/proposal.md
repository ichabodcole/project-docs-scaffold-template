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

| class    | migration behaviour                     | examples                                              |
| -------- | --------------------------------------- | ----------------------------------------------------- |
| _owned_  | overwritten every migration             | `SCHEMA.md`, category READMEs, `scripts/pdocs/**`     |
| _seeded_ | installed once, then reconciled by hash | all `TEMPLATE*.md`, `STYLE.md`                        |
| _theirs_ | never touched                           | `.project-docs.json`, root `AGENTS.md`, all documents |

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
`.project-docs.json`; `registry.ts` reading rather than hardcoding it; the seed
manifest and hash reconciliation in the migration idiom; every `TEMPLATE*.md`
and `STYLE.md` reclassified as seeded; ownership classes stated in `SCHEMA.md`;
`pdocs find --type` validating against the resolved vocabulary; a migration
carrying all of it.

**Out of Scope:** Any change to the set of types the scaffold ships by default —
that is [Guidance Lifecycle](../guidance-lifecycle/proposal.md). Adding
`STYLE.md` or any new seeded file beyond whatever is needed to prove the verb.

**Future Considerations:** Per-type required-section rules in config, which
would let an adopter declare shape as well as vocabulary.

## Technical Approach

**Phase 1 — Ownership classes and the seed manifest.** The deliverable is the
manifest, not the install idiom. `[ -f <path> ] || cp ...` alone gives an
adopter "never updated again," which is worse than owned: they sit on a
three-versions-old template with nothing telling them so. The hash check is what
makes seeding a live relationship rather than a fork.

Record `path → sha256` of every seeded file at install time. At each migration,
hash what is on disk and compare:

- **matches** what we recorded — untouched, so overwrite and re-record.
- **differs** — theirs. Leave it, and report that the scaffold's copy also moved
  so they can look.

This is dpkg's conffile handling and Homebrew's; it needs no diffing and no
three-way merge. It also changes the migration model as intended — a migration
asks what actually changed instead of copying everything over.

Templates are the files this is for. `pdocs new` already declares the boundary
in its own header — "It does NOT own content. It fills frontmatter and it
changes nothing below it" — and measurement confirms it: vandalising the
playbook template's `type:` key still produced a document with the correct
`type: playbook`, because that key is registry-sourced. Everything else falls to
the lint, which catches it on the next document written
(`BAD STATUS ... (OKF 0.2: draft | stable | deprecated)`, exit 9). **OKF is
enforced on the document, not on the template**, so handing templates over risks
nothing that was ever guarded there.

State every scaffold file's class in `docs/SCHEMA.md`. Seeded files do **not**
need `check-mirror.sh` exemptions — the mirror compares this repo against the
payload, both copies being project-docs', while "seeded" describes migration
behaviour in a consumer. The two are orthogonal, and exempting the templates
would silence a check that keeps 16 file pairs honest.

Each seeded template gains a one-line note that the frontmatter block is the
contract and everything below it is the adopter's. `new` repairs `type` but
nothing else, and the header comment records that copying a template **by hand
is still the majority path** — a hand-copier gets no repair at all.

Prove it before relying on it: run a migration twice against a fixture holding
one edited and one untouched seeded file, and assert the edit survives both runs
while the untouched file updates.

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
- _Seeded files drift from the scaffold silently._ Mitigated by the manifest: a
  diverged file is reported at every migration rather than going quiet. What is
  still not solved is an adopter who ignores the report — accepted, because the
  alternative is overwriting their work.
- _The manifest goes stale or is deleted._ A missing entry must mean "treat as
  theirs and report," never "safe to overwrite." Fail toward the adopter's copy.
- _Seeding is confused with mirror exemption._ They are unrelated, and
  conflating them would stop the check that keeps 16 template pairs in step.
  Mitigation: the plan states the distinction; exempt only a file project-docs
  deliberately tailors for itself.

**Complexity:** Medium — two mechanisms, both localized to the lint layer, the
config parser, the mirror check and the migration idiom. No document content
changes.

## Open Questions

- ~~Do templates become seeded, or stay owned?~~ **Resolved 2026-09-11:
  seeded.** OKF is enforced on the document rather than the template, `type` is
  registry-sourced and cannot be broken by an adopter, and the lint catches
  everything else on the next document written. The remaining question was "did
  they change it or did we," which the hash manifest answers.
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
- A locally-edited seeded file survives two consecutive migration runs, while an
  untouched one updates in the same run.
- A migration reports a diverged template by name rather than silently skipping
  or silently overwriting it.
- A deleted manifest entry causes the adopter's copy to be kept and reported,
  never overwritten.
- `docs/SCHEMA.md` states the class of every file the scaffold ships.
- `npm run check` green; payload verified by generating, not reading.

**Related Documents:**

- [Guidance Layer & Lifecycle Touch Points](../../briefs/2026-09-11-guidance-layer-and-touch-points.md)
  — the census and measurements behind both projects
- [Guidance Lifecycle: Touch Points & Type Retirement](../guidance-lifecycle/proposal.md)
  — the dependent project this one unblocks
