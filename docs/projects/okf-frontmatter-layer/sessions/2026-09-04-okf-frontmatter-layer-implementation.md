---
type: session
title: "OKF frontmatter layer — implementation — 2026-09-04"
description:
  Seven phases from an empty branch to a gated documentation tree, and the
  defect that survived all of them until someone was asked to use the thing.
tags: [documentation, tooling, okf, lint]
status: stable
generated: { by: claude-opus-5, at: 2026-09-04 }
---

# OKF frontmatter layer — implementation — 2026-09-04

Part of
[the 2026-09 OKF frontmatter layer cycle](../../../cycles/2026-09-okf-frontmatter-layer.md).

## What shipped

OKF 0.2 frontmatter on all 137 documents; a two-tier lint (`docs/lint.ts` plus a
ported portable core under `scripts/docs-lint/`) that gates `.husky/pre-commit`
and a new `docs-check` workflow; `docs/SCHEMA.md` as the contract and
`docs/index.md` as the catalog; a `cycle` document type with at most one active
at a time; `.project-docs.json` as the root config; project-docs 3.7.0 with
cycle touchpoints in `init-branch`, `finalize-branch` and `sweep-project`; a
`v2.6 → v2.7` migration guide driven by a Bun codemod; and the whole layer in
the cookiecutter payload, with `scripts/check-mirror.sh` keeping the two copies
honest.

No file moved. Whether the durable folders eventually live under a shared root
was left open deliberately.

## Review

Four fresh agents, none of them forks, each scoped to a file plus what it links
to. Three read; one was asked to **use** the system. That distinction turned out
to be the whole finding.

**The read-it agents** found real defects and each was acted on. The migration
guide's steps 4 and 5 dirtied the tree that step 7's codemod requires clean,
with `--force` undocumented — an executing agent would have hit a refusal with
no way past it. Its steps 8 and 9 were inverted: the catalog copies each page's
`description` verbatim, and descriptions were written a step later.
`finalize-branch` Step 4 told sessions to write `related: [cycle/<slug>]`, which
`SCHEMA.md` — written three phases earlier, by me — forbids, and which Step 5
restates correctly thirty lines further down. And four skills justified filling
frontmatter with "the lint fails on a placeholder", which is false: the lint
checks presence and non-emptiness, so `title: "[Topic]"` passes clean.

**The use-it agent** was asked to read `SCHEMA.md`, add a memory page to a
freshly generated project, get the lint green, then break it. It got to
`docs-lint: clean` on the first attempt — and then reported that
`status: approved`, `status: banana`, a `lifecycle` on a type that forbids one,
a `type` disagreeing with its folder, a non-kebab tag, an unknown field and a
legacy `date` **all passed** on a library page. Verified here immediately: the
same values on a workbench page were caught, on a library page the gate said
`clean`.

## The defect

Every vocabulary check lived inside `thinTier`, which walks
`config.lint.workbench` and nothing else. The library never entered that loop.
The one library-side check that existed tested presence only, and was reached
solely from `reportLines` — that is, only from `--report`, which is documented
to always exit 0.

So the tier `SCHEMA.md` describes as stricter was, on frontmatter, the laxer
one, and the value it was laxest about was `status: approved` — the exact
hand-invented value whose appearance in three proposals is the origin story this
whole layer opens with. **The guardrail did not fire on the failure that
produced it.**

The fix extracts the per-document rules into `documentProblems`, called by both
tiers, with `tags` the single field they genuinely disagree about (required in
the library, optional on the workbench, for the reason `docs/lint.ts` states).
Nine regression tests, one per break that used to pass.

## Why it survived

It survived six phases, three cold reads of the prose, 500 tests and a
regression sweep in which I deliberately broke six rules and watched each fire.
Every one of those six was a rule I had just written — bad `lifecycle`, bad
`status`, broken link, dead anchor, dropped catalog line, drifted hook — and I
tested each **in the folder where I had implemented it**. The two `status` and
`lifecycle` cases went into `docs/backlog/`. Nothing made me try them in
`docs/memories/`, because I knew the checks were there; I had written them.

The prose was no help either, and worse than no help: `SCHEMA.md` asserted the
graph tier ran "everything Thin checks, plus" the graph obligations. Three
agents read that sentence and none could falsify it, because falsifying it
requires running the tool, not reading about it. The table's self-check —
`docs/lint.ts` parses the lifecycle table and fails if its own `SPEC` disagrees
— is real, and it guards the table's _contents_. It cannot notice a claim two
sections earlier about an enforcement relationship the code does not implement.

## Also fixed from that read

`--report` now names the files it found instead of rolling them into a folder
and a count, and says how many documents it scanned, so an empty report is
distinguishable from one that looked at nothing. `--json` emits `generated` as
`{ by, at }` rather than the raw inline-flow YAML as a string. `SCHEMA.md`
stopped pointing at four things that do not exist in a generated project
(`docs/lint.test.ts`, `npm run check`, `.husky/`, `.github/`) and stopped
describing this repository's slide-deck prototypes as though they were the
reader's. `docs/index.md` and `SCHEMA.md` now say what to do with the
`_No pages yet._` placeholder, which nothing checks and everyone would guess at.

## Key files

`docs/lint.ts`, `docs/SCHEMA.md`, `docs/index.md`, `scripts/docs-lint/`,
`scripts/check-mirror.sh`, `.project-docs.json`,
`plugins/project-docs/skills/{finalize-branch,sweep-project,update-project-docs}/SKILL.md`,
`plugins/project-docs/commands/init-branch.md`, `{{cookiecutter.project_slug}}/`

## Docs

[Proposal](../proposal.md) · [Plan](../plan.md) ·
[Cycle](../../../cycles/2026-09-okf-frontmatter-layer.md)
