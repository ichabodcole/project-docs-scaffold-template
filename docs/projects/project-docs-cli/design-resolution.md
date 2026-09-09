---
type: design-resolution
title: pdocs new — one grammar or several
description:
  Whether creating a project or a cycle differs enough from creating a flat
  document to need its own command, and what a uniform grammar would take.
tags: [cli, tooling, document-types]
status: stable
lifecycle: resolved
generated: { by: claude-opus-5, at: 2026-09-04 }
---

# pdocs new — one grammar or several

## Overview

The proposal called `pdocs new` "one generic path — type decides folder,
template and frontmatter," then special-cased `project` and `cycle`. Special
cases inside a generic dispatcher are where this kind of code rots, so the
question was asked before the plan: what inputs do those two actually need, how
do they differ from the rest, and is there a grammar that serves both.

**Resolution: one grammar, and `project` and `cycle` are rows in a table rather
than branches in a switch.** But building that table is real work, not a
transcription — the first draft of this document assumed the data already
existed in one place, and a verification pass proved it does not.

> **Corrected 2026-09-04.** An agent tasked with falsifying this document's
> claims against the code found the central one wrong. What follows is the
> corrected version; the errors are recorded rather than quietly fixed, because
> the shape of the mistake is the useful part.

## System Behavior

### The finding, corrected: frontmatter is derived from THREE tables, not one

`documentProblems` computes the legal field set per type:

```ts
const allowed = new Set([
  ...REQUIRED, // type, title, description, status, generated
  ...OPTIONAL, // tags, related, supersedes
  ...(lifecycle ? ["lifecycle"] : []),
  ...(Object.values(SPEC).find((s) => s.type === type)?.extra ?? []),
]);
```

This document originally read that as proof of a single source of truth — "one
table, two readers," and a new type gets its flags for free. **That is true only
for the six workbench types in `SPEC`.** Three groups exist:

| Group                    | Declared in                     | Carries `lifecycle`         | Carries `extra` |
| ------------------------ | ------------------------------- | --------------------------- | --------------- |
| Workbench (6)            | `SPEC`                          | yes                         | yes             |
| Project-scoped (7)       | `PROJECT_SPEC`                  | yes                         | **no field**    |
| Library + root pages (9) | `DURABLE_TYPE`/`ROOT_PAGE_TYPE` | no — folder→type string map | no              |

`vocabularyFor` (`docs/lint.ts:290`) is already a two-table lookup —
`PROJECT_SPEC` first, then `SPEC`. But `extra` is read from `SPEC` alone, so for
any project-scoped type that `.find` returns `undefined`; `PROJECT_SPEC`'s
declared type (`docs/lint.ts:157`) is `Record<string, { lifecycle: … }>` and has
no `extra` field at all. Library and root types are in neither: their maps carry
a type name and nothing else.

**Consequence for the plan.** Anyone implementing
`row.fields = REQUIRED + OPTIONAL + lifecycle? + extra` as a single lookup
silently loses `lifecycle` for all seven project-scoped types, and has no source
at all for the nine library and root types. Unifying these into one registry is
a task in the plan, not an assumption behind it.

### What actually varies

Four axes. The first two are undeclared today, which is the real problem, and
both are wider than first catalogued.

**1. Filename grammar — six shapes and a suffix rule, declared only in prose in
each folder's README.**

| Shape                                  | Types                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `YYYY-MM-DD-<slug>.md`                 | backlog, briefs, memories, fragments                                                             |
| `YYYY-MM-DD-<slug>-<suffix>.md`        | investigations (`-investigation`), reports (`-report`)                                           |
| `YYYY-MM-<slug>.md`                    | cycles — month, not day                                                                          |
| `<slug>.md`                            | lessons-learned                                                                                  |
| `<slug>-<suffix>.md`                   | playbooks (`-playbook`), architecture (`-architecture` or `-flow`), interaction-design (`-flow`) |
| `NN-<slug>.md`                         | specifications — numbered prefix, `01-overview.md` required                                      |
| `<slug>/<fixed-name>.md`               | projects                                                                                         |
| `<slug>/sessions/YYYY-MM-DD-<slug>.md` | sessions — nested subdirectory _and_ a dated filename                                            |

The suffix rule is not a playbooks quirk; it is documented for investigations,
reports, architecture and interaction-design too, and has been applied
inconsistently by hand for months. `docs/investigations/` holds both
`2026-05-23-moodboard-element-extraction-investigation.md` and
`2026-02-25-cross-agent-skill-portability.md`. `docs/playbooks/README.md` states
the suffix at line 93 and then lists a counter-example at line 98 — that README
needs fixing as part of this work, since suffix enforcement is an approved
decision.

**2. Template location — five conventions.**

| Convention                                                         | Types                                                                                              |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `docs/<folder>/TEMPLATE.md`                                        | cycles, backlog, fragments, memories, lessons-learned, architecture, interaction-design, playbooks |
| `docs/<folder>/YYYY-MM-DD-TEMPLATE-<type>.md`                      | investigations, reports                                                                            |
| `docs/<folder>/TEMPLATES/<TYPE>.template.md`                       | briefs                                                                                             |
| `docs/projects/TEMPLATES/<TYPE>.template.md`                       | proposal, plan, design-resolution, test-plan, handoff                                              |
| `plugins/project-docs/skills/<skill>/templates/<TYPE>.template.md` | kickoff — **outside the docs tree entirely**                                                       |
| `docs/projects/TEMPLATES/YYYY-MM-DD-<TYPE>.template.md`            | session                                                                                            |

Two rows cannot be expressed by a plain `template: string`:

- **`specifications` has two templates**, `TEMPLATE-overview.md` and
  `TEMPLATE-domain.md`, selected by variant.
- **`artifact` has none, by design** (`docs/projects/README.md:112`).
- **`kickoff`'s template ships with the plugin**, at
  `plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md`.
  `pdocs` cannot reach it — a plugin may not be installed and CI has none — so
  `kickoff` is a type the CLI does **not** create. The `dev-kickoff` skill owns
  it. Its registry row exists so the lint can type the file; `new` refuses it.

So the field is `template: string | string[] | null`, and `new` needs a
`--variant` for the multi-template case.

**3. Output shape — three values, not two.** A file; a directory containing a
fixed-name file (`project`); or a nested subdirectory containing a dated file
(`session`, and `artifact` under `artifacts/`).

**4. Pre-write validation — per-type and small.** `cycle`: every `--scope` entry
resolves, and no other cycle is `active`. `project`: the folder does not exist.
Everything else: the target file does not exist.

### The shape of the answer

Axes 1–3 become declared data in one registry that also unifies the three
frontmatter tables. Axis 4 is an optional predicate. `new` is then one code
path:

```
resolve type -> row
  row.folder      relative to docsRoot
  row.filename    {date: day|month|none, suffix?} | {dir, file} | {dir, sub, date}
  row.template    string | string[] | null
  row.lifecycle   string[] | null      <- unified from SPEC + PROJECT_SPEC
  row.extra       string[]             <- SPEC today; PROJECT_SPEC cannot express it
  row.validate?   predicate, runs before any write
```

`project` and `cycle` are rows. Nothing branches on them by name.

### The grammar

```
pdocs new <type> <name> [--<field> <value>]…
```

`<type>` is any type in the registry. `<name>` is the slug; the row decides date
prefix, suffix, and whether directories are made. Field flags are projected from
the row's frontmatter keys.

Project-scoped types take `--project` instead of standing alone:

```
pdocs new project oauth-upgrade --from investigations/2026-08-01-oauth-investigation.md
pdocs new plan --project oauth-upgrade
pdocs new session --project oauth-upgrade --title "wiring the callback"
pdocs new specification data-model --variant domain
pdocs new cycle 2026-10-tooling --scope project/oauth-upgrade
```

## Boundaries

**What `new` owns:** choosing the path, making any directories, copying the
template, writing frontmatter, running the type's pre-write validation, and
reporting the path it wrote.

**What `new` does not own:** content. It fills frontmatter and nothing below it.
Templates are copied verbatim, instructional comments included; reshaping them
affects eighteen types and is a separate decision.

**What stays with the lint:** all validation _after_ the fact. `new`'s pre-write
checks move two cycle invariants earlier; they do not replace the gate, which
must still catch a document written by hand.

## Irreversible Decisions

**Declaring the conventions rather than discovering them.** A discovery rule
would work for template paths — they all match `/template/i` — but it cannot
express the two-template or no-template rows, and inference is how a convention
stays unwritten and then drifts. This repository just spent a cycle establishing
the opposite principle: state the contract, then check it.

**Flags projected from the registry, not hand-declared per command.** The
alternative guarantees drift from the lint. Rejected — but note this is now
contingent on the registry existing, which is work.

**The lint checks that every declared template exists** (approved 2026-09-04).
Declaring template paths creates a way to be wrong that did not exist before. It
validates the tooling's own configuration, not documents, so it belongs beside
the `.project-docs.json` checks. The check must tolerate `null` (artifact) and
arrays (specifications).

**`new` enforces the suffix where a type declares one** (approved 2026-09-04).
The caller gets a filename they did not literally type; in exchange the
convention stops being something a human has to remember, and the tree shows it
has not been.

**Going forward only.** Existing files that lack their suffix are left alone.
Renaming them would break every inbound link for a cosmetic gain, and the lint
has no opinion on filenames. The tree stays mixed; new documents stop adding to
the mixture.

## Open Questions

- Does `pdocs new` print the path, or emit it as JSON for an agent to act on?
  Uniform across types either way; decide once.
- Should `specifications`' `01-overview.md` requirement be enforced by `new`
  (refuse to create `NN-` documents until an overview exists), or left to the
  writer? Leaning left alone — it is a content rule, not a naming rule.

## Notes

**What the verification pass cost and bought.** Three claims in the first draft
were wrong: "one table, two readers" (three tables), "two output shapes"
(three), and "eleven types" (eighteen). Four filename rows and two template rows
had wrong or missing members, and five types had no row at all. Every one of
those would have surfaced during implementation as a special case, and the
special cases are what this document exists to prevent — so it would have
quietly failed at its only job.

The errors share a cause worth naming: the first draft was written from the
folders I happened to open. Nothing sampled the full type list and asked which
types were unaccounted for. Reading a contract tells you whether it is coherent;
only checking it against the tree tells you whether it is complete.

---

**Related Documents:**

- [Proposal](./proposal.md)
- [Plan](./plan.md)
- [The frontmatter contract](../../SCHEMA.md)
