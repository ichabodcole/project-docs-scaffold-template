---
type: session
title:
  "Spellbook feedback: the owned layer under a strict consumer — 2026-09-15"
description:
  The second consumer's issue — the delivered CLI failed tsc under
  noUncheckedIndexedAccess — was reproduced, narrowed at eight sites with the
  flag adopted upstream and watched failing, and the exclusion advice promoted
  from an aside to a step.
tags: [feedback, typecheck, owned-layer, migration]
status: stable
generated: { by: claude-fable-5-1, at: 2026-09-15 }
---

# Spellbook feedback: the owned layer under a strict consumer — 2026-09-15

Branch `fix/pdocs-typechecks-under-nounchecked-indexed-access`, base `develop`.
Spec: upstream issue #176, filed by Spellbook's agent mid-way through its v2.6 →
v2.7 run. This folder holds only sessions; the work was issue-shaped. Not
attached to the active cycle, which is story-loom's and one item from closing.

## What shipped

Three commits, one per concern, landed as one squashed commit under the repo's
landing policy; the SHAs are the branch's own.

| Commit    | Change                                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `68f0291` | eight sites narrowed with guards and defaults, no `!`; a cast in `checkLinks` the same way; `noUncheckedIndexedAccess` in the repo's `tsconfig`, so CI's `typecheck` gates it |
| `930c25b` | `graph.ts` assignment-in-expression as three statements; unused import out of `cli.ts`; zero Biome 2 diagnostics                                                              |
| `ea8303c` | "keep your formatter off `scripts/pdocs/`" as a numbered step in both guides that write the directory; Step 7 says what `tsc` may do; `project-docs` 3.12.1                   |
| `c90dd6f` | review fix: Step 7 says what to do when the `include` is the project's own                                                                                                    |

## Verification before scoping

Every claim was reproduced before anything was scoped. The seven errors, one
file, isolated to the one flag: confirmed exactly, and the whole tree under the
flag adds one site in the v2.6 codemod. Biome's `noAssignInExpressions` on
`graph.ts:63`: confirmed, with an unused import beside it. The reporter's "a
local patch confuses kept-vs-updated detection" was misdescribed — that
detection is for seeded templates; owned files are overwritten wholesale, so the
patch is simply lost, the same outcome — and "the guide could tell consumers to
exclude the directory" was already true, in a parenthetical inside phase 3 that
the agent did not find. Probing the other strict flags a consumer might set:
`noPropertyAccessFromIndexSignature` costs 22 sites and Spellbook disables it
explicitly, so it stayed out.

## How the work was done

One implementer, one tree, no commits of its own; the chief editor read the net
diff, fixed what the implementer flagged (the leftover cast, two Biome glob
spellings, a README count), and cut the commits. The v2.8 guide's own statement
that the layer raises 74 errors under a conventional `tsconfig` corrected the
first draft of the new guide item: `tsc` needs no exclusion only under a
Bun-shaped config, and the item now says so.

## Review

**Census.** Roster read from the Agent tool's list in the session's system
prompt. `general-purpose` (tools `*`, shell) — the review of record;
`doc-reviewer` (all tools, shell) — capable, not chosen: the document delta is
two paragraphs; `feature-dev:code-reviewer` and `feature-dev:code-architect` —
rejected on capability, neither has `Bash`; `Explore` — capable, a locator, not
a reviewer. One reviewer for a four-commit branch.

**What it executed**, from its log: `npm run typecheck`, the three mirror and
version checks, `format:check`, `bun test`, `pdocs check`; eight scratch
`tsc -p` runs — flag off, one site restored in a scratch copy (exactly one
error, `index.ts(144,23)`), Spellbook's real `tsconfig` (zero errors),
Spellbook's plus the two stricter flags (16, out of scope), `.ts` specifiers
disallowed (41 × `TS5097`), NodeNext, and the `develop` tree under the flag
(exactly the eight); Biome 2.4.16 `lint` on the seventeen production files (zero
diagnostics) and `check`/`format` in a scratch project with `"!!scripts/pdocs"`
(excluded, byte-identical); a differential `bun test` importing branch and
`develop` copies of the five changed functions over 42 inputs; and `graph`,
`check` and `report --format json` from both CLIs on a copy of `docs/`,
byte-identical. It edited nothing.

**Findings.** "Yes." Every narrowing proven behaviour-neutral — three are
type-only and never reachable, named so nobody reads them as bug fixes later; no
new test owed, since Bun does not typecheck and the guard is the flag plus CI's
`typecheck`, witnessed; one wording gap, Step 7's sentence giving one
instruction for both the migration-written and the project's own `include`,
landed as `c90dd6f`.

## Why it had to be fixed upstream: the coverage ward

The obvious consumer shortcut — exclude `scripts/pdocs/` from `tsc` — is not
open to every consumer, and it was not open to this one. Spellbook's
`type-check-ward` asserts that **every file was examined**, precisely so an
exclusion cannot pass for a clean result: with the directory excluded its
coverage cell read `644 examined of 661` and went red. A consumer that checks
coverage has two exits from a type error in the owned layer — a local patch the
next refresh overwrites, or an upstream fix — so the layer has to typecheck
under the consumer's flags. "Exclude it" is advice for formatters and linters,
which is what the guides now say; it is not an answer for `tsc`.

## Where it landed downstream

Spellbook took the fixed layer from a `develop`-generated scaffold via
`--scaffold-dir`, ran v2.8 → v2.9 without reverting it, and landed the whole
upgrade on its `develop` at `49b4d0b9` (fast-forward, nine commits); CI went
green on the follow-up `eb012b7f`. Ward `0 errors · 661 of 661 files examined`,
`lint.adopting: false`, gate enforcing. The friction it reported on the way is
[backlog: Spellbook feedback, round 1](../../../backlog/2026-09-15-spellbook-feedback-round-1.md).

## Deliberately not done

- **The other strict flags.** `exactOptionalPropertyTypes` (one site) and
  `noPropertyAccessFromIndexSignature` (22) fail on the layer; neither is in the
  reporting consumer's config. Recorded in the review, not fixed.
- **Step 7's tsconfig grep** still matches a project's own `"**/"` include. A
  sentence now says that case is not the artefact it looks for; the check itself
  was not rewritten.
- **Delivery.** Spellbook takes the fixed layer from a `develop` checkout via
  `--scaffold-dir`, or waits for the next release.
