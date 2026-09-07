---
type: proposal
title: The pdocs CLI
description:
  Turn project-docs from a documentation structure into a system, by putting an
  agent-facing CLI under the skills and over the document tree.
tags: [tooling, cli, docs-lint]
status: stable
lifecycle: implemented
generated: { by: claude-opus-5, at: 2026-09-04 }
---

# The pdocs CLI

## Overview

project-docs has been a file structure plus a set of skills that describe what
to do with it. The frontmatter layer added a third thing — checked data — and
made the gap obvious: the tree can now answer questions that nothing is able to
ask, and the skills still explain document creation as a sequence of edits to
perform by hand.

This proposes `pdocs`: a zero-dependency, agent-facing CLI that becomes the hub
the rest of the system hangs off. Skills stop describing file surgery and start
calling commands. The graph becomes reachable. And a future browser surface has
something to be built against.

The end state this is aiming at is a system for creating projects, navigating
them, and managing their lifecycles — not a folder layout with instructions
attached.

## Problem Statement

**The skills describe file surgery in prose, and prose is not a contract.** A
skill that says "add `related: [cycle/<slug>]` to the frontmatter" is wrong in a
way nothing can catch — and that exact line shipped in `finalize-branch`,
contradicting `SCHEMA.md` thirty lines from where the same skill stated the rule
correctly. Four skills claimed the lint would fail on a placeholder; it checks
presence only. A skill that calls `pdocs new session <project>` is wrong in a
way the command's tests catch.

**There is no surface on the graph.** `related`, `lifecycle`, `type` and the
catalog are checked data now, and `--json` emits them. Nothing consumes it. What
cites this page, what is in the active cycle, which proposals claim
`implemented` and are lying — all unanswerable without reading the tree by hand.

**The lint cannot tell an agent what happened.** `bun docs/lint.ts` exits `1`
whether the documents are dirty or the linter threw. Those need different
responses and produce the same signal.

**And the shape is wrong for what comes next.** 826 lines of TypeScript live
inside `docs/`, the directory that is supposed to hold documents. Anything that
wants to read the tree programmatically has to import from a content folder.

## Proposed Solution

A CLI at `scripts/pdocs/`, invoked as `bun scripts/pdocs/cli.ts`, following the
[project-cli-toolkit recipe](../../../plugins/recipes/skills/recipes/library/project-cli-toolkit/RECIPE.md)
this repository publishes and `anthill` already follows.

```
pdocs check                              the gate
pdocs graph                              the catalog, structurally
pdocs find --type … --lifecycle …        query the tree
pdocs backlinks <type/slug>              what cites this
pdocs orphans                            unreachable pages
pdocs new <type> <name> [--title …]      write a document, frontmatter correct
pdocs new project <name> [--from …]      folder + proposal, investigation linked
pdocs new cycle <name> [--scope …]       scope entries resolved, active-cycle guard
pdocs help [--json]                      grouped help, or the machine manifest
pdocs --version
```

Format resolves TTY-first: text at a terminal, JSON when piped, `--format`
overrides. Envelope on stdout, diagnostics on stderr.

### What is actually worth automating

`new` is one generic path — type decides folder, template and frontmatter — so
most types come free once it exists. But the savings are not evenly distributed,
and it is worth being honest about where they are.

For a flat document, `new` writes a file with a name in it. That is close to no
savings; an investigation is a file, and the skill's value was never the file.

**A project is structure.** A folder, a `proposal.md` from template, frontmatter
filled, and the originating investigation wired into Related Documents. That is
several steps a skill currently narrates and a command can just do.

**A cycle has invariants**, which is more interesting than convenience. Scope
entries are `type/slug` references that must resolve; at most one cycle may be
`active`, and the lint enforces it after the fact. `pdocs new cycle` can resolve
the scope entries at creation and refuse to open a second active cycle —
catching at the point of writing what today is caught at the next commit, if
someone runs the gate.

So the skill rewritten in this cycle is **`create-project`**, not
`create-investigation`. It is around ninety percent mechanical — name it, check
it does not exist, make the folder, copy the template, link the investigation,
confirm — which is exactly the shape that should collapse into a command.

The larger point is that none of these are the reason to build this. They are
the reason to build it _now_: the value is having a place where operations live,
and the interesting commands are the ones neither of us has thought of yet —
things that are manual today, or that simply cannot be done.

### The agent is the runtime

The eventual browser surface — a cycle board, a backlog in cards — does not
change this design, because of how Spellbook builds surfaces: the agent is the
orchestrator, the surface is a membrane. `imago`'s daemon does not generate
images; the agent runs `media-forge` and posts results to it.

So a project-docs surface would display the tree and route intents back to an
agent, which runs `pdocs`. There is no second consumer needing a shared library,
and no reason to split a `core/` out of the CLI. The CLI owns mutation outright.

What this does mean is that `pdocs`'s JSON is read by **an agent**, which is
exactly the audience `agent-cli-conformance` was written for. The envelope and
exit codes are the contract, not a formatting preference.

### Structure

```
scripts/pdocs/cli.ts          dispatch
scripts/pdocs/envelope.ts     envelope shape, format resolution, exit codes
scripts/pdocs/commands/*.ts   one per command
scripts/pdocs/lint/*.ts       the rules, moved out of docs/lint.ts
scripts/docs-lint/index.ts    the portable core, unchanged
docs/                         documents. no TypeScript.
```

`docs/lint.ts` is deleted rather than kept as a shim. `package.json` keeps
`docs:lint` and points it at `pdocs check`, so the pre-commit hook and the
`docs-check` workflow need no change.

## Scope

**In scope.** The commands above; moving the rules out of `docs/lint.ts` and
deleting it; the envelope and exit-code contract; the declared filename and
template table from [the design resolution](./design-resolution.md), and one
lint check that every declared template exists; shipping all of it in the
cookiecutter payload; rewriting `create-project` to drive the CLI, with a
reference page in the style of `imago`'s `references/mediaforge.md`; tests.

**Out of scope.** Cycle _lifecycle_ commands — `cycle attach`, `cycle close`,
`cycle status` — and the `init-branch` / `finalize-branch` / `sweep-project`
rewrites that depend on them. Creating a cycle is in scope; moving one through
its states is not, because that is where the delicate mutation lives and it
deserves its own pass. Also out: any change to what the lint checks **about
documents** — the one new check validates the tooling's own configuration, not
the tree — a browser surface, renaming existing files to match the suffix
convention, and extracting the lint into a package shared with
`agent-cli-conformance`, `dream-flute` and `anthill`.

**Future considerations.** Cycle commands are the obvious next cycle. After
that, whether `pdocs` gets a launcher on `$PATH` the way `anthill-cli` does — "a
pointer, not a copy" — and whether a `bounty`-style board over the backlog and
the active cycle is worth conjuring.

## Technical Approach

### Exit codes

`agent-cli-conformance` allocates two bands: `1`–`8` for why the invocation
failed, `9`–`123` for what the subject turned out to be. `acc check` on a
non-conformant target emits a well-formed report with `ok: true` and exits `9`,
because non-zero-ness is what makes a finding visible to a harness that does not
parse JSON.

| Code | Meaning                                      |
| ---- | -------------------------------------------- |
| `0`  | clean — or dirty under `lint.adopting: true` |
| `2`  | bad invocation                               |
| `5`  | no docs root, or no `.project-docs.json`     |
| `6`  | `pdocs new` — the target document exists     |
| `9`  | outcome: ran fine, the documents are dirty   |

`npm run check`, the pre-commit hook and the workflow only test non-zero, so all
three are unaffected.

### Dependencies

None. The recipe prescribes `citty` and this declines it: the surface is small,
`project-antfarm` hand-rolls the same job in 408 lines, and the lint's
zero-dependency property is a stated design constraint — it is what lets the
payload be dropped into a repository and just run. A zero-dependency CLI can be
mirrored as files; a `citty` one drags an install into every scaffolded project.

### How skills reach it

`bun scripts/pdocs/cli.ts <command>`, project-relative, the way skills already
reference `bun docs/lint.ts`. Not `${CLAUDE_PLUGIN_ROOT}` — unlike `anthill`,
this CLI has to run in CI and in a scaffolded project with no plugin installed.

### Moving fast on purpose

There is one consumer of this project and it is its author. No compatibility
shims, no deprecation window, no codemod that carefully relocates code in other
people's repositories. `update-project-docs` gets a migration because a
scaffolded project needs the new files, and it can be blunt.

## Impact & Risks

**Benefits.** Skills that are checkable rather than merely readable; a graph
that can be queried; a failure signal an agent can act on; and the first-party
user of the CLI pattern this repository teaches other projects.

**Risk: the refactor touches the file that just shipped a major defect.** Moving
826 lines out of `docs/lint.ts` days after its library tier was found to be
checking nothing is the real hazard. Mitigation, and this one is not negotiable
under move-fast: capture the current `bun docs/lint.ts` output on this tree and
assert `pdocs check` reproduces it byte for byte. It costs minutes, and "I read
it and it looked fine" is precisely the check that missed the original defect.

**Risk: `pdocs new` encodes the wrong document model.** Templates currently
carry instructional comments a human deletes as they write. A command that
stamps them out mechanically may want a different template shape, and that is a
change to something eleven document types depend on. Mitigation: `new` copies
the existing templates verbatim in this cycle and fills only frontmatter.
Reshaping templates is a separate decision.

**Risk: the touchpoint pattern may not survive contact.** Rewriting
`create-project` around a command could make it worse — a skill's value can be
in the thinking it prompts rather than the file it produces, and a command that
absorbs the mechanical part may take the prompting with it. That is why exactly
one skill is in scope, and why it is the most mechanical one. If it reads worse,
that is a finding, not a failure.

**Risk: the write commands under-deliver on their own.** Creating files is not
where the value is, and this proposal should not pretend otherwise. `new` earns
its place by making the hub exist and by carrying the two cases with real
structure behind them — a project's folder, a cycle's invariants. The commands
worth having are expected to be ones found by using the tool, not ones specified
in advance. If that turns out to be wrong, the cycle produced a small
convenience and a good lint front-end, which is a survivable outcome.

**Complexity: Medium-high.** No hard algorithms; the surface is wide and the
lint move is delicate.

## Open Questions

- ~~Does `pdocs graph` emit today's `--json` shape, or is that shape a lint
  implementation detail a graph command should not inherit?~~ **Resolved in
  Phase 5: a lint implementation detail.** `pdocs graph` now emits the standard
  `{ ok, command, data }` envelope over a narrow shape built from
  `scripts/pdocs/pages.ts`, not `DocsLintReport`. The byte-parity exception had
  no beneficiary — `npm run docs:graph` is the only caller and nothing parses
  its output — and `DocsLintReport` carries `problems`, `reachable` and
  `contractExempt`, which exist because a gate needed them. It also covers the
  library tier only, so a `find` built on it would answer `--type proposal` with
  silence. The read commands span both tiers; `pdocs orphans` is the one
  exception, because orphan-ness is measured against a catalog and only the
  library has one.
- ~~Does `pdocs new` open the file, print the path, or emit the path as JSON for
  an agent to act on?~~ **Resolved in Phase 6: it prints paths, and never opens
  anything.** Text mode writes the document's repo-relative path on the first
  line, so `pdocs new … | head -1` is the path and nothing else; JSON mode emits
  the standard `{ ok, command, data }` envelope with
  `data: { path, type, created }`. Opening the file was rejected outright: it
  would need an editor this CLI has no business choosing, and the caller that
  most needs the answer is an agent with no terminal at all. `created` is the
  field the shape turned on — `new` writes the document AND, for a library page,
  the catalog line in `index.md`, because a library page without one is an
  `ORPHAN` the moment it is written. A command that reported only the document
  would be under-reporting what it changed, which is how a caller ends up
  committing half of an edit.

## Success Criteria

- `pdocs check` reproduces `bun docs/lint.ts` output byte for byte on a clean
  tree and a dirty one, asserted by a test rather than by eye.
- `npm run check`, the pre-commit hook and the `docs-check` workflow pass with
  no change to what they invoke beyond the `docs:lint` script body.
- A project generated from the template lints clean and passes its own tests.
- `create-project` is shorter than it is today and says less about file layout.
- `pdocs new cycle` refuses to open a second active cycle, and refuses a scope
  entry that does not resolve.
- ~~A use-it pass — generate a scaffold, create documents with `pdocs new`, then
  break rules in folders other than the one each was implemented in — finds
  nothing the test suite missed.~~ **Not met, and recorded rather than quietly
  dropped.** The use-it pass did what it said and found nothing; two independent
  reviews then found four things both it and the suite had missed — piped JSON
  truncated at 64 KiB, a path-traversing document name, a timezone-dependent
  suite, and `--scope project/<name>` never resolving. The pass tested the
  strings that work rather than the grammar the documents specify, and never
  tried large output or an adversarial name. The criterion was measuring the
  wrong thing: a self-run pass cannot falsify its author's assumptions, which is
  what the independent review is for.

---

**Related Documents:**

- [The frontmatter contract](../../SCHEMA.md) — what the lint enforces
- [OKF frontmatter layer](../../cycles/2026-09-okf-frontmatter-layer.md) — the
  closed cycle this follows
- [What checking 137 documents turned up](../../memories/2026-09-04-okf-frontmatter-layer.md)
- [Project CLI toolkit recipe](../../../plugins/recipes/skills/recipes/library/project-cli-toolkit/RECIPE.md)
  — the pattern, published here and followed by `anthill`
