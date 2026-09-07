---
type: session
title: Landing the pdocs CLI — 2026-09-06
description:
  Seven phases of the pdocs CLI landed; a dual independent review then found six
  defects every phase gate had passed.
tags: [cli, tooling, code-review]
status: stable
generated: { by: claude-opus-5, at: 2026-09-06 }
---

# Landing the pdocs CLI — 2026-09-06

Seven phases, twenty commits, `docs/lint.ts` gone and `scripts/pdocs/` in its
place. The plan's shape held; the interesting part is what the phase gates did
not catch.

## Review

**Census.** The roster was read from the Agent tool's available-types list in
the session context — not from `plugins/*/agents/`, which describes definitions
in this repository rather than what is dispatchable.

| Candidate                   | Stated tools                                                                              | Shell? |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| `feature-dev:code-reviewer` | Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput | **No** |
| `general-purpose`           | `*`                                                                                       | Yes    |
| `doc-reviewer`              | All tools                                                                                 | Yes    |
| `code-simplifier`           | All tools                                                                                 | Yes    |

**Rejected on capability grounds: `feature-dev:code-reviewer`** — the natural
pick for a confidence-filtered review, and the trap the skill names. It carries
`BashOutput` and `KillShell` but not `Bash`: it can read and kill shells it has
no way to start, so it could not have run the gate, the suite, or the CLI. Every
finding below came from a command.

Dual review, both execution-capable, on a ~17k-line diff spanning a CLI, a lint
refactor, the cookiecutter payload and plugin skills.

**`general-purpose` — code and plan alignment.** Ran `npm run check` (red on
test), `TZ=UTC npm test` (944 pass), a `bun test` probe proving Bun's runner
forces UTC without exporting `TZ`, five perturbations of the registry and the
goldens (dropping `templateProblems` → golden fails; project-scoped `lifecycle`
→ `null` → 43 failures; dropping the `playbook` suffix → 7), a generated
scaffold with all 18 creatable types and six planted cross-folder defects, and
`graph --format json` compared as a file, through a pipe, and through
`python3 -m json`.

**`doc-reviewer` — the contract surface.** Ran every CLI command against the
real tree in both formats, built two isolated `--root` copies and executed the
exact commands printed in `create-project/SKILL.md` and `references/pdocs.md`,
reproduced the design resolution's own `--scope` example, imported
`collectPages`/`pageKey` directly to dump what keys real documents resolve to,
and reproduced the new backlog item's illustrated lint output rather than
trusting the prose.

Both returned **Ready to merge: With fixes**. Neither made an edit; `git status`
was clean when both reported.

## What the review found that seven phase gates did not

Six blocking defects, all reproducible, all fixed before landing. No commit SHA
is cited here on purpose: this branch lands as a squash under the policy in
`AGENTS.md`, so any sha named on it stops existing the moment it does.

**Piped JSON was truncated at exactly 64 KiB.** The worst of them, because
format resolution defaults to JSON precisely when stdout is a pipe — so the
documented way for an agent to use this tool returned unparseable JSON on any
large output. Every probe run during implementation used `--format text`, or
piped into `head`/`grep`/`wc`, none of which care that the stream was cut.

**Both the first diagnosis and the reviewer's were wrong.** We blamed
`process.exit()` discarding an async buffer. Reverting only that leaves the
truncation. The trigger is _reading_ `process.stdout.isTTY`: touching any
property of Node's stdout object materializes Bun's `WriteStream` over fd 1,
after which `console.log` routes through an async writer whose tail is dropped
at exit. Measured in isolation — isTTY touched: 65536; untouched: 77757;
`isatty(1)`: 77757.

**The suite was time-dependent.** `bun test` forces the test process to UTC
without exporting `TZ`; the CLI it spawns reads `/etc/localtime`. After 17:00
local they disagreed and eight tests failed. CI is UTC, so CI stayed green while
the pre-commit hook went red — the failure mode that trains `--no-verify`. Every
"944 pass, 0 fail" reported during implementation was taken before 17:00, which
is why it was never seen.

**`--scope project/<name>` never resolved** — the grammar the design resolution,
`docs/cycles/TEMPLATE.md` and the v2.6 migration all document. `pageKey`
computed `type/basename`, so all 18 proposals keyed to `proposal/proposal`. The
use-it pass ran `--scope proposal/proposal`, which validates; it tested the
string that works rather than the grammar the documents specify, and the unit
test encoded that same degenerate case as its passing assertion.

**`pdocs new project ".."` wrote `docs/proposal.md` and reported success** — the
writer/checker contract breaking, since the next `check` calls that file
`BAD type` and `ORPHAN`. The per-type round-trip test could not see it because
it never passed an adversarial name.

**The v2.7→v2.8 migration could not reach its own success condition**, and a
sentence in it was false. Both found by executing the guide rather than reading
it.

## The lesson, stated plainly

The phase gates were necessary and not sufficient, and they failed in one
direction: **every one of them was run by the author of the thing it checked.**
A self-run pass cannot falsify its author's assumptions — it reaches for the
input the author had in mind. The independent review found four things in an
afternoon that seven phases of self-verification had not, and it found them by
running commands, which is why the capability census is not ceremony.

The proposal's success criterion "a use-it pass finds nothing the test suite
missed" is marked not-met in `proposal.md` rather than quietly dropped. It was
measuring the wrong thing.

## Scope delivered that nothing authorised

Surfaced by the review, not declared at the time: `scripts/check-dist.sh` and
the `check:dist` gate, and `reportLines` excluding templates from its
denominator. Both defensible, both added mid-cycle on the implementer's
judgement.

## Deferred

`find` does not validate `--type`/`--lifecycle`/`--status` values, which is
inconsistent with the CLI's own argument about `--formt`. The design
resolution's `pdocs new session --project X --title Y` example exits 2 — the row
requires a positional. Two `AGENTS.md` counts drifted. Templates still carry
`USAGE: Copy this file…` comments that `pdocs new` copies verbatim into
documents nobody copied.

---

**Related Documents:**

- [Proposal](../proposal.md)
- [Plan](../plan.md)
- [Design resolution](../design-resolution.md)
