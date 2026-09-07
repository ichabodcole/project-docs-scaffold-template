---
type: plan
title: pdocs CLI Implementation Plan
description:
  The route from a lint script inside docs/ to an agent-facing CLI that owns the
  document operations, in seven independently green phases.
tags: [cli, tooling, docs-lint]
status: stable
lifecycle: completed
generated: { by: claude-opus-5, at: 2026-09-04 }
---

# pdocs CLI Implementation Plan

## Reconciliation — 2026-09-06

All seven phases landed. Recorded here rather than as checkboxes because this
plan never used them.

| Phase                                             | Outcome                                                                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — deterministic and drivable, plus the guard    | Landed. `.sort()` on the walk, `--root`, and a golden captured on a DIRTY tree — a clean-tree baseline records two `OK` lines and cannot fail.                                              |
| 2 — split the portable core                       | Landed. `collectDocsLint` / `docsLintSummary` / `runDocsLint`; the printer is 11 lines.                                                                                                     |
| 3 — move the rules out of `docs/`                 | Landed. `docs/lint.ts` 859 → 104 → deleted.                                                                                                                                                 |
| 4 — the CLI shell and `pdocs check`               | Landed. Found that cookiecutter renders payload CODE through Jinja, and that `--version` read the host project's `package.json`.                                                            |
| 5 — the read commands                             | Landed, wider than planned: the commands span both tiers, because `graphTier` walks the library only and the motivating questions are workbench ones. `graph` dropped its unenveloped JSON. |
| 6 — the registry, the template check, `pdocs new` | Landed. 23 rows, 18 creatable — not the 21 this plan claimed, because the design resolution never covered the three root-page types.                                                        |
| 7 — the skill, the payload, the use-it pass       | Landed. `create-project` 116 → 91 lines; `check:dist` added (unbudgeted — see below).                                                                                                       |

**Scope delivered that no approving document authorised**, surfaced by the code
review rather than declared at the time: `scripts/check-dist.sh` and the
`check:dist` gate, and `reportLines` excluding templates from its denominator (a
behaviour change to `docs:report`). Both are defensible and both were added on
the implementer's judgement mid-cycle.

**Six defects survived every phase gate and were caught by the dual review** —
see `sessions/2026-09-06-pdocs-cli-landing.md`. The plan's per-phase validation
was necessary and not sufficient.

## Overview

Build `pdocs` — a zero-dependency, agent-facing CLI — and move the documentation
rules out of `docs/` and under it. See [the proposal](./proposal.md) for why,
and [the design resolution](./design-resolution.md) for the `new` grammar and
the type registry it depends on.

The work is ordered so that the riskiest move — relocating 826 lines out of
`docs/lint.ts`, days after its library tier was found to be checking nothing —
happens _after_ a guard exists that can prove the output did not change.

> **Revised 2026-09-04 after a gap analysis.** Two agents were set on the first
> draft: one to falsify its claims about the code, one to attempt Phase 1 rather
> than read it. The second found Phase 1 not implementable as written — five
> blockers, including a golden test that could not have passed in CI on any
> machine. The findings are folded in below and called out where they changed
> the shape, because a plan that hides its corrections teaches nothing.

**Every phase ends green.** `npm run check` passes at each commit; nothing is
left half-moved across a phase boundary.

## Outcome & Success Criteria

- `bun scripts/pdocs/cli.ts check` reproduces the current lint's output exactly,
  proven by a golden test that drives the real entry point.
- `docs/` contains documents and no TypeScript.
- `npm run check`, `.husky/pre-commit` and `.github/workflows/docs-check.yml`
  pass with no change beyond the bodies of the `docs:*` scripts.
- `pdocs graph|find|backlinks|orphans` answer questions that today require
  reading the tree by hand.
- `pdocs new <type> <name>` writes a lint-clean document for **every type the
  registry marks creatable** — **18** of the 23 — with the declared filename
  shape and suffix. The five it will not create are `artifact` (freeform by
  design, no template), `kickoff` (its template ships with the `dev-kickoff`
  plugin skill, outside the docs tree), `manifesto` and `index` (both ship with
  every generated scaffold, so `new` could only ever collide with a file that is
  already there), and `summary` (`PROJECT-SUMMARY.md` is synthesized from the
  whole repository by the `project-summary` skill — content generation, not file
  creation). This criterion said "23 types, less `artifact` and `kickoff`" until
  2026-09-06: it was written from the design resolution's tables, which never
  mention the three root-page types at all.
- `pdocs new cycle` refuses a scope entry that does not resolve, and refuses to
  open a second `active` cycle.
- `create-project` is shorter and says less about file layout.
- A project generated from the template lints clean and passes its own tests.

## Approach Summary

1. **Make the lint deterministic and drivable, then build the guard.** Neither
   was true when this plan was first written.
2. **Split the portable core** — `runDocsLint` prints and returns a count.
   Anthill already split it; lift that.
3. **Move the rules,** then **put the CLI in front of them,** then delete
   `docs/lint.ts`.
4. **Add the read commands** — the payoff, and low-risk.
5. **Build the type registry, then `new` on top of it,** then rewrite one skill
   and ship to the payload.

### Where code lives

```
scripts/docs-lint/index.ts     PORTABLE core — no knowledge of this schema.
                               Shared by acc, dream-flute and anthill; keep it
                               liftable and the diff against them small.
scripts/docs-lint/config.ts    .project-docs.json loader. Unchanged.
scripts/pdocs/lint/rules.ts    THIS schema's vocabularies and checks.
scripts/pdocs/lint/collect.ts  collect(ctx) -> LintReport. Prints nothing.
scripts/pdocs/lint/registry.ts the unified type registry (Phase 6).
scripts/pdocs/cli.ts           dispatch
scripts/pdocs/envelope.ts      envelope, format resolution, exit codes
scripts/pdocs/commands/*.ts    one file per command
```

**`scripts/docs-lint/` must not come to depend on `scripts/pdocs/`.** It is
shared with three other repositories and its value is that it lifts cleanly.
Phase 3 has a specific trap here.

## Phases

### Phase 1: Make the lint deterministic and drivable, and build the guard

**Goal.** A golden test that drives the real entry point and passes on any
filesystem. Two production changes are prerequisites, and both are improvements
in their own right.

**1.1 — Sort `walkMarkdown`.** `scripts/docs-lint/index.ts:102` iterates
`readdirSync` unsorted, so problem order is filesystem order. Measured:
`readdirSync docs/playbooks` returns `["TEMPLATE.md","README.md"]`; walking
`a.md…h.md` yields `["b","f","g","c","h","d","a","e"]`. APFS returns name-hash
order; ext4's htree uses a different hash with a per-filesystem seed; CI is
`ubuntu-latest`. **A golden captured on a Mac cannot match CI.** Add `.sort()`
by name. Apply the same edit to
`{{cookiecutter.project_slug}}/scripts/docs-lint/index.ts` in the same commit —
that file is in check-mirror's byte-for-byte `CODE` array and `npm run check`
runs `check:mirror`.

**1.2 — Give `main()` a `--root <path>`.** `docs/lint.ts:759` derives the root
from `import.meta.url` and `main()` parses only flags
(`new Set(process.argv.slice(2))`); a positional path is ignored and it lints
this repo instead. `context(repoRoot)` is genuinely parameterised and every
downstream check honours it — verified against three separate roots — so this is
an argument-parsing change, not a refactor.

**Why this must exist before the golden.** Without it there is no way to capture
the real stdout for a fixture tree, and the only alternative is reimplementing
`main()`'s assembly inside the test. `main()` lines 757–823 **are** the assembly
that Phase 3 moves into `collect.ts`, so a golden built on a reimplementation
cannot detect a change there — it would be a guard that cannot see the thing it
guards.

**1.3 — Capture the live baseline, after 1.1.** Sorting changes output order, so
capture second.

**Capture it against a deliberately dirtied tree, not the live one.** The
repository is clean, so `bun docs/lint.ts > baseline.txt` records two `OK` lines
— and a rule that silently stopped firing produces exactly those same two lines
after the move. A baseline is only worth having against a tree that has
problems.

The protocol, as actually performed:

1. Copy the whole repository with `git archive HEAD | tar -x`. Copying only
   `docs/` breaks every link out to `plugins/` or the root README — 32 spurious
   `MISSING FILE`s that drown the mutations the tree exists to exercise.
2. Apply one mutation per problem class, each placed in a **different folder and
   tier from where its rule was implemented** — a bad `status` on a memory, a
   `lifecycle` on a lesson, a legacy `date` on a library page. Varying the
   location is what last cycle's regression sweep failed to do.
3. `bun docs/lint.ts --root <tree> > baseline-dirty.txt`.

The result is 14 problems across 11 classes, identical across a full rebuild.
Generator and capture live in the session scratch directory.

**Re-run against the same preserved tree after Phase 3** — do not regenerate
from the post-move repository, which is a different input. If the tree is lost
between sessions, regenerate it and re-capture with the pre-move lint before
starting the move; the comparison is only meaningful when both captures share an
input.

**1.4 — The golden test.** Create `scripts/pdocs/lint/golden.test.ts`.

- **Fixtures are built in a temp directory at test time, not committed as
  markdown.** `docs/lint.test.ts:49` already has a `fixture(files, config)`
  helper that writes a docs tree into `mkdtempSync(tmpdir())` and returns a
  `Ctx` — extend or reuse it.
- **Goldens are committed as `.txt`.** Safe: Prettier's scope is `**/*.md`, the
  lint only walks `.md`, and `check-mirror.sh` only walks `$PAYLOAD/docs` for
  `.md` plus an explicit list.
- The test spawns `bun docs/lint.ts --root <tmpdir>` and asserts full stdout.

**Why not a committed fixture tree — three reasons, all measured.** A dirty
fixture inside the repo turns the live gate red: `main()` runs `linkProblemsFor`
over everything git tracks outside `docs/`, and `ALREADY_LINTED`
(`scripts/docs-lint/unlinted-links.ts:45`) only matches the `docs/` prefix — a
staged fixture with a broken link produced `docs-lint: 1 problem(s)` in the very
commit that added it. Fixture markdown also fails `format:check`, and worse,
`npm run format` **rewrites** a fixture whose purpose is to encode a frontmatter
defect, deleting the test case silently. And mirroring `scripts/pdocs/**` at
Phase 7 would ship a deliberately-broken tree into every generated project.
Temp-directory fixtures avoid all three by construction.

**Minimum viable fixture tree** — determined by removing pieces until it broke:

| Required                                    | If absent                                       |
| ------------------------------------------- | ----------------------------------------------- |
| `<root>/docs/`                              | uncaught ENOENT                                 |
| `<root>/docs/SCHEMA.md`                     | uncaught ENOENT at `docs/lint.ts:790`, no guard |
| a parsable `## Lifecycle by type` table     | `NO SCHEMA TABLE`                               |
| **all 22 type rows, matching vocabularies** | `SCHEMA MISSING TYPE` / `SCHEMA DISAGREES`      |
| `<root>/docs/index.md`                      | `NO CATALOG` — every page an orphan             |

The 22 rows come from hardcoded constants (`docs/lint.ts:100-176`), not from the
fixture's config, so **the fixture must carry the real `SCHEMA.md` verbatim**.
Consequence, stated plainly: every edit to `SCHEMA.md` is a golden update. The
first draft claimed a fixture tree avoids churn — it trades churn-per-document
for churn-per-contract-edit, which is rarer but not zero. `index.md`'s catalog
lines must be byte-equal to each page's `description` (`hookChecks`), so they
are load-bearing too.

**Two things the golden cannot cover.** `trackedMarkdown` shells out to
`git ls-files` and **fails open** — `if (!out.success) return []`
(`unlinted-links.ts:79`) — so outside a git repo that whole tier silently
becomes a no-op, and inside one its answer depends on the index (0 files
untracked, 7 after `git add -N`). That tier is covered by the live capture in
1.3, not by the golden. And `related` resolution is library-tier only
(`scripts/docs-lint/index.ts:587`): a dirty fixture's unresolvable `related`
must sit in a **durable** folder or the problem class isn't exercised at all.

**Validation.** `npm run check` green, including `check:mirror` after 1.1.
Golden passes. Confirmed already: output has no absolute paths, timestamps or
varying counts, and two runs diff identical — ordering was the only
nondeterminism.

**Dependencies.** None. Start here.

### Phase 2: Split the portable core

**Goal.** `collectDocsLint` returns data; `runDocsLint` becomes a printing
wrapper. Behaviour identical.

**Key changes.** In `scripts/docs-lint/index.ts`, split `runDocsLint` (lines
419–711) into `DocsLintReport`, `collectDocsLint`, `docsLintSummary`, and a
ten-line `runDocsLint`.

**Lift, do not invent.** Anthill performed this exact split on this exact file:
`plugin/scripts/anthill/docs-lint/index.ts` — `DocsLintReport` at 369,
`collectDocsLint` at 392, `docsLintSummary` at 630, `runDocsLint` at 637–647.
Its header comment documents the delta and calls it worth upstreaming. Anthill
compiles with `noUncheckedIndexedAccess` and carries `?? ""` narrowings this
repository does not need.

**Apply to both copies.** `scripts/docs-lint/index.ts` is in check-mirror's
`CODE` array and is currently byte-identical to the payload's. The split must
land in `{{cookiecutter.project_slug}}/scripts/docs-lint/index.ts` in the same
commit or `npm run check` fails. The first draft said this phase "must be
invisible" and never mentioned the payload.

**Validation.** The existing tests pass untouched. Golden passes untouched.
`check:mirror` clean.

**Dependencies.** Phase 1.

### Phase 3: Move the rules out of `docs/`

**Goal.** `docs/lint.ts` stops owning rules. It survives this phase as a thin
shim; Phase 4 deletes it.

**Key changes.**

- Create `scripts/pdocs/lint/rules.ts` — all **22** exports from `docs/lint.ts`.
  The first draft listed 21 and omitted **`export interface Ctx`**
  (`docs/lint.ts:49`), the type every other exported function takes as its first
  parameter. (`main()` is not exported; it is simply not moved.)
- Create `scripts/pdocs/lint/collect.ts` — `collect(ctx): LintReport`, holding
  `main()`'s assembly: the library pass (`libraryFieldChecks` + `graphTier`),
  the workbench pass (`thinTier`, `frontmatterSyntaxProblems`,
  `schemaTableChecks`, `linkProblemsFor` over `trackedMarkdown`), and the
  `adopting` branch (`docs/lint.ts:818`). Returns data; prints nothing.
- Re-plumb `graphTier`. It currently takes `json = false` and its entire body
  delegates to the printing `runDocsLint`; it must call `collectDocsLint` and
  return the report.
- Move `docs/lint.test.ts` (845 lines) to `scripts/pdocs/lint/rules.test.ts`.

**Three importers, not two.**
`scripts/docs-lint/migrate-v2.6-to-v2.7.test.ts:18` imports `DURABLE_TYPE`,
`PROJECT_FILE_TYPE`, `PROJECT_SPEC`, `ROOT_PAGE_TYPE` and `SPEC` from
`../../docs/lint.ts`, deliberately, to prove the codemod's copied tables equal
the lint's. **Move that test out of `scripts/docs-lint/`** — leaving it there
would put a file importing `scripts/pdocs/` inside the portable core and break
the liftability the layering depends on. It belongs next to the codemod it
tests. (The codemod itself imports nothing from the lint; `dist/` holds only
built markdown and that codemod.)

**Two root-depth hazards.** `collect.ts` must resolve the repo root three levels
up, not one — prefer passing the root in from the entry point over re-deriving
it, since getting this wrong is silent: a lint that walks nothing reports clean.
`docs/lint.test.ts:41` has the same `resolve(import.meta.dir, "..")` construct
for reading `SCHEMA.md` and `loadConfig`; moving it changes the depth too. That
one fails loudly, so it is a footnote.

**Validation.** Golden passes. Existing tests pass. Re-capture the live baseline
and **diff it against 1.3** — do not eyeball it.

**Dependencies.** Phase 2.

### Phase 4: The CLI shell and `pdocs check`

**Goal.** `pdocs check` is the gate. `docs/lint.ts` is gone from both trees.

**Key changes.**

- `scripts/pdocs/envelope.ts` — `resolveFormat(argv, isTTY)`; envelope
  `{ ok, command, data }` on stdout, diagnostics on stderr; `ExitCode`
  (`Success: 0`, `Usage: 2`, `NotFound: 5`, `Conflict: 6`) and
  `Outcome.Dirty: 9`. Model on `src/acc/exit-codes.ts` in
  `agent-cli-conformance`, which also carries the "ADD, NEVER RENUMBER" rule —
  note its `Outcome` already has a second member (`Stale: 10`), so `9` is not
  the only allocated outcome code upstream.
- `scripts/pdocs/cli.ts` — hand-rolled dispatch, no framework. Interceptors for
  `help` / `--help` / `--version` before dispatch; unknown command exits `2` and
  names the offending token.
- `scripts/pdocs/commands/check.ts` — calls `collect`, renders, returns the exit
  code. `lint.adopting` is a field on the envelope and forces exit `0`.
- `package.json`: `docs:lint` → `bun scripts/pdocs/cli.ts check`, `docs:report`
  → `… report`, `docs:graph` → `… graph --format json`. The explicit flag is
  required: measured under a real pty, `npm run` inherits stdio and stdout is a
  TTY, so a TTY-first resolver would render text.
- Delete `docs/lint.ts` **and** `{{cookiecutter.project_slug}}/docs/lint.ts` in
  the same commit. The payload copy is invisible to `check:mirror`'s prose walk
  (`-name '*.md'`), so leaving it would rot silently for three phases.

**`check-mirror.sh` needs a code change, not a list edit.** The first draft said
"add `scripts/pdocs/**` entries" to `CODE`. That array is consumed as
`diff -q "$ROOT/$rel"` — quoted, no glob expansion; the literal entry yields
`diff: …/scripts/pdocs/**: No such file or directory` and reports permanently
`DRIFTED`. Add a `find` loop over `$PAYLOAD/scripts` mirroring the prose loop at
line 76. Related and worth fixing here: with twelve unmirrored files under
`scripts/pdocs/` the script still reported `mirror: clean — 41 file(s)`, because
it only detects payload-only files. Until this lands, the mirror gate says
nothing whatsoever about `scripts/pdocs/`.

**Validation.** `npm run check` green. `pdocs check` on the dirty fixture exits
`9` with `ok: true`; no `.project-docs.json` exits `5`; `pdocs --nonsense` exits
`2`. No `.ts` under `docs/` in either tree.

**Dependencies.** Phase 3.

### Phase 5: The read commands

**Goal.** Make the graph answerable.

**Key changes.** `commands/graph.ts` (decide here whether to emit
`DocsLintReport` as-is or a narrower shape — prefer narrow; a surface built on
the lint's report inherits the lint's churn), `commands/find.ts` (`--type`,
`--lifecycle`, `--status`, `--tag`, `--since`), `commands/backlinks.ts`,
`commands/orphans.ts`.

**Validation.** Table-driven per command × text/json against temp fixtures. Exit
`0` on an empty result — no matches is an answer, not a failure.

**Dependencies.** Phase 4.

### Phase 6: The type registry, the template check, and `pdocs new`

**Goal.** One grammar for document creation. Read
[the design resolution](./design-resolution.md) first; its tables are the
specification and were themselves corrected after verification.

**This phase is larger than the first draft assumed.** That draft called the
registry a transcription. It is not: the data is spread across **three** tables
that disagree about what they carry. `SPEC` has `lifecycle` and `extra`;
`PROJECT_SPEC` has `lifecycle` and no `extra` field at all (`docs/lint.ts:157`);
`DURABLE_TYPE` and `ROOT_PAGE_TYPE` are folder→type string maps carrying
neither. Implementing `row.fields = REQUIRED + OPTIONAL + lifecycle? + extra` as
a single lookup silently loses `lifecycle` for all seven project-scoped types
and has no source for the nine library and root types.

**Key changes.**

- `scripts/pdocs/lint/registry.ts` — one row per type, all 23, unifying the
  three tables and adding `folder`, `filename`, `template` and `validate`.
  `template` is `string | string[] | null`: `specifications` has two templates
  chosen by variant, `artifact` and `kickoff` have none `pdocs` can reach.
  **Expose it as `buildRegistry(config)` returning rows — not module-level
  consts other modules import directly.** Nothing in this cycle needs that, but
  user-declared folders and types
  ([backlog](../../backlog/2026-09-04-user-defined-document-types.md)) become a
  merge step inside that one function rather than a rewrite of everything that
  touches the tables. It costs nothing now and it is the whole difference
  between adding a feature later and unpicking a design.
- Make `documentProblems` read the registry, so the lint and `new` share one
  source. This is the check that the unification actually happened.
- Add the template-exists lint check, tolerating `null` and arrays. It validates
  configuration, not documents — put it beside the `.project-docs.json` checks.
- `commands/new.ts` — resolve row, apply filename grammar including suffix and
  any nested subdirectory, run `validate`, copy template verbatim, write
  frontmatter, report the path. Flags projected from the row.
- Fix `docs/playbooks/README.md`, which states the `-playbook` suffix at line 93
  and lists a counter-example at line 98.

**`kickoff` is in the registry but not creatable by `new`.** Its template ships
with the `dev-kickoff` skill, outside the docs tree, where `pdocs` cannot reach
it — a plugin may not be installed and CI has none. The row exists so the lint
can type the file; `new` refuses it, as it does `artifact`. Make that refusal
explicit and tested, not an accident of a null template.

**Review gate.** If `commands/new.ts` mentions `"cycle"` or `"project"` outside
the registry, the abstraction has leaked and the design resolution was wasted.

**Validation.** For **every** type in the registry: `pdocs new <type> <name>`
into a temp tree, then `pdocs check` on that tree is clean. That loop is the
real test — it asserts the writer and the checker agree. A type missing from the
registry fails loudly here, which is the point: the first draft's table was
missing five types.

**Dependencies.** Phase 5.

### Phase 7: The skill, the payload, and the use-it pass

**Goal.** Prove the touchpoint thesis and ship it.

**Key changes.**

- Rewrite `plugins/project-docs/skills/create-project/SKILL.md` (116 lines) to
  drive `pdocs new project`. Keep the judgement; delete the file mechanics.
- Add a reference page for driving the CLI, modelled on `imago`'s
  `references/mediaforge.md` in `~/Projects/Spellbook` — self-contained command
  shapes, exit codes, output fields.
- Mirror `scripts/pdocs/**` into the payload, **excluding** `golden.test.ts` and
  the `.txt` goldens, which encode this repository's `SCHEMA.md`. Add
  `scripts/pdocs/lint/rules.test.ts` to the mirror: the payload currently ships
  826 lines of rules with no tests, and that gap should not survive the move.
- `hooks/post_gen_project.py`: add `scripts/pdocs/` to the current-directory
  branch's moves. Update `PACKAGE_SCRIPTS` (lines 25–29) — note it holds
  **four** entries including `test`, and the comment at line 63 hardcodes
  "four". Update `LAYER_NOTE` (line 17), which names `docs/lint.ts`.
- Add a migration under
  `plugins/project-docs/skills/update-project-docs/migrations/`. It can be
  blunt: delete `docs/lint.ts`, add `scripts/pdocs/`, rewrite the `docs:*`
  scripts.
- Bump the plugin version per the repository's semver convention.

**Note what the hook does not move.** `package.json`, `tsconfig.json` and
`.gitignore` are deliberately left alone (`hooks/post_gen_project.py:60-63`), so
a project installed into an existing directory gets `scripts/pdocs/` with no
`tsconfig` include covering it and no `docs:*` script bodies — the hook prints
them. Verify the printed instructions still match reality after this cycle.

**The use-it pass, and it is not optional.** Generate a project into a throwaway
directory. Create documents with `pdocs new` for every type. Then break rules
**in folders other than the one each rule was implemented in** — that variation
is what the last cycle's regression sweep missed, and how the library-tier
defect survived six phases.

**Validation.** `npm run check` green. `check:mirror` clean and now actually
covering `scripts/pdocs/`. Generated project lints clean and passes its tests.

**Dependencies.** Phase 6.

## Key Risks & Mitigations

**The move loses a rule silently.** Highest probability, with precedent.
Mitigated by Phase 1 preceding Phase 3 and by the live before/after diff, which
covers the `trackedMarkdown` tier the golden cannot reach.

**The registry unification introduces a vocabulary regression.** Making
`documentProblems` read the registry is the moment a lifecycle could quietly go
missing for a whole type group. The golden and the existing suite are the guard;
run them before and after that specific edit, not just at phase end.

**`new` grows a switch on type name.** The failure the design resolution exists
to prevent. Stated as a review gate in Phase 6.

**The touchpoint rewrite makes the skill worse.** Possible and acceptable. One
skill is in scope so this is cheap to learn; a worse skill is a finding.

**Scope creep into cycle lifecycle.** `attach` and `close` are out. They will
look easy once `new cycle` exists. They mutate existing state; they are not.

## Testing & Validation Strategy

- **Golden output** (Phase 1) — drives the real entry point via `--root`, over
  temp fixtures, asserted against committed `.txt`.
- **Live before/after capture** (Phases 1.3 and 3) — covers the git-dependent
  tier the golden cannot.
- **Round-trip** (Phase 6) — `new` writes it, `check` accepts it, for every
  type.
- **Envelope table tests** — each command × text/json × clean/dirty/no-root.
- **Generated-scaffold smoke test** (Phase 7).
- **Use-it pass** (Phase 7) — break rules in the wrong folders on purpose.

`bun test` reported 516 tests across 6 files when this plan was written and 528
after Phase 1 added the golden; the sixth file is the payload's own
`{{cookiecutter.project_slug}}/scripts/docs-lint/index.test.ts`. Note that
`bun test` **discovers test files under fixture directories** — a probe dropped
into a fixture took the suite to 517 across 7 — and `tsconfig.json`'s
`include: ["scripts/**/*.ts"]` typechecks fixture TypeScript, so a deliberately
broken fixture `.ts` would fail `npm run typecheck`.

## Assumptions & Constraints

- Bun 1.4.0, pinned in CI. Zero runtime dependencies for the CLI.
- One consumer, its author. No compatibility shims, no deprecation window.
- `pdocs` is invoked as `bun scripts/pdocs/cli.ts`, project-relative — not via
  `${CLAUDE_PLUGIN_ROOT}`, because it must run in CI and in a scaffolded project
  with no plugin installed.
- No external services, credentials or human setup actions.
- Existing files are not renamed to match the suffix convention.

## Open Questions

- ~~Does `pdocs graph` emit `DocsLintReport` or a narrower shape? Decide in
  Phase 5.~~ **Resolved: a narrower shape, enveloped like every other command,
  built on `scripts/pdocs/pages.ts` rather than on the lint's report.** See the
  proposal for the reasoning and `scripts/pdocs/commands/graph.ts` for the
  record kept next to the code.
- Does `new` print the path, or emit it as JSON? Decide once, apply uniformly.

## Implementation Notes

Commit per task, not per phase. Each phase ends with `npm run check` green and
nothing half-moved.

Worth reading before starting: `plugin/scripts/anthill/docs-lint/index.ts` for
the collect/print split and `plugin/scripts/anthill/cli.ts` for dispatch and
manifest shape, both in `~/Projects/dreamwood/anthill`; and
`src/acc/exit-codes.ts` in `~/Projects/agent-cli-conformance` for the exit-code
bands. This repository publishes the recipe those follow —
[project-cli-toolkit](../../../plugins/recipes/skills/recipes/library/project-cli-toolkit/RECIPE.md).
