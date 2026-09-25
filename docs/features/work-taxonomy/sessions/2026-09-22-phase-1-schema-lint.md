---
type: session
title: Work Taxonomy Phase 1, schema and lint — 2026-09-22
description:
  The lint learns the new work model beside the old one — features, items,
  grouped states, references, no silent deletion — with this repository's gate
  green on every commit, and the old migrations pinned to their own scaffold.
tags: [taxonomy, lint, schema]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Work Taxonomy Phase 1, schema and lint — 2026-09-22

Part of
[Work Taxonomy release](../../../cycles/2026-09-work-taxonomy-release.md). Plan:
[Phase 1](../plan.md). Branch `feature/work-taxonomy-p1-schema-lint`. The
coordinator ran this session from the main thread; an implementer sub-agent
wrote the code, and two reviewer sub-agents checked it.

## What landed

| Commit    | What                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| `0e88985` | 1.1 — `lint.scopes`; the new default layout                                                 |
| `bb8d274` | 1.2 — the state vocabulary, its groups, kinds and priorities                                |
| `1fac1d3` | 1.3 — `SCHEMA.md`'s `## State groups` table, checked against the code                       |
| `2ebdb85` | 1.5 — position typing for `features/` and `items/` (landed before 1.4, which needed it)     |
| `b4ef276` | D16 added to the plan — old migrations pinned to their own scaffold release                 |
| `7b816c8` | 1.4 — `feature`, `item`, `write-up` rows; the old types kept but `retired`; templates moved |
| `56e14ea` | 1.6 — per-document field rules                                                              |
| `4a22075` | 1.7 — corpus rules in `scripts/pdocs/lint/work.ts`                                          |
| `d374441` | 1.8 — no silent deletion of items; `check --against`                                        |
| `ae9ca96` | 1.9 — feature and item page keys; cycle `scope` no longer resolved                          |
| `3d2a144` | 1.10 — the payload ships the new layout                                                     |
| `5228ae3` | 1.11 — goldens on the new layout; the CLI surface                                           |
| `7a2c058` | Review A — `features/_archive` and `items/_archive` read whatever `lint.skip` says          |
| `9e00067` | Review B — the corpus rules find the owner folders whatever the `docsRoot` spelling         |
| `3f2f40f` | Review C, D, H — case-insensitive ids, `ls-tree -z`, an unreadable item is not "deleted"    |
| `72c5a78` | Review E — a hook-environment test proves the deletion check's git spawn uses `gitEnv()`    |
| `4ffe28b` | Review F — a loose file in an owner folder gets one clear finding                           |
| `bb90e0a` | Review G — entity page keys read the owner under the docs root                              |
| `342e96b` | Review I — a `lint.scopes` that is not a list is a `BAD CONFIG` finding                     |
| `96a4318` | Review J — every refusal to create a work document names the template to copy until Phase 2 |
| `e5b59da` | Re-review — the H guard narrowed to unreadable ids; the C test made to exercise its fix     |

## What the plan did not anticipate

**The old migrations break on the new scaffold.** Task 1.4 moved the payload's
templates into `docs/TEMPLATES/`, and about 200 tests in the v2.6→v2.7 and
v2.9→v2.10 suites failed, because they built their "current scaffold" from the
working tree. Handed the 9.0.0 layout, the shipped v2.6→v2.7 script itself stops
at preflight, so a consumer below v2.10 could not have upgraded to 9.0.0 at all.
The implementer stopped rather than patch around it. Cole decided each migration
runs against the scaffold release it was written for (D16): those suites now
build from the `project-docs-scaffold-template-v8.1.0` tag, and pinning the
shipped scripts is Phase 5 work.

**Owned types move with the templates.** Until Phase 2 adds `--owner` and
`pdocs new item`, nothing in a generated project can create a work document;
review J made every refusal name the template to copy instead.

## Judgment calls

- Task 1.5 before 1.4: the template-render test types every template by
  position, so position typing had to exist first.
- `feature` and `item` are not creatable until Phase 2; the retired types stay
  lintable but not creatable, so this repository's own `docs/` still passes.
- `projects/<x>/reports/*.md` types as `report` through the new owned-type rule;
  nothing in this repository has one.
- The deletion check skips an id only when a file at the same path has no
  readable id — so a malformed item is not "deleted", but an id rewritten in
  place is.

## Review

Roster read from the Agent tool's dispatchable types in this session.
`feature-dev:code-reviewer` was rejected on capability — `BashOutput` and
`KillShell` without `Bash` — and pasting a 6,800-line diff into a static read
would not have made it one. Two reviewers ran in parallel: `Plan` (all tools
except the editing and agent ones, so a shell and no way to edit — read-only by
construction) for plan alignment, and `general-purpose` (tools `*`) for
correctness, told to report only.

Plan alignment — **With fixes**: every task implemented as specified, nothing
contradicting D1–D16, nothing from a later phase, "add beside, retire later"
intact. Its log, quoted: "`bun test` (full suite) — **1318 pass, 0 fail**";
"`bun scripts/pdocs/cli.ts check --format text` — **clean, exit 0**", and
against the payload in place; "`npx tsc --noEmit` — pass"; registry dumps and
edge probes with `bun -e`. It could not generate the payload (read-only); the
correctness reviewer did.

Correctness — **With fixes**: three bugs that hid or invented findings (review
A, B, C), a missed deletion (D), an untested hook-environment guarantee (E), and
five smaller issues. Its log, quoted: "`npm run check` — exit 0 (1318 pass)";
"scratch git repos … each run through
`bun scripts/pdocs/cli.ts check --root <scratch>`" across `docsRoot` spellings,
`_archive` skipped, uppercase ids, non-ASCII names, a monorepo subdirectory, odd
`--against` refs, no git, CRLF;
"`cookiecutter . --no-input … install_target=\"New project folder\"`, the
generated project's `pdocs check`"; nine neuters, eight of which failed a test.

All ten were fixed test-first. **Re-review**, same reviewer resumed: every
scenario re-run clean, the N9 neuter now fails a test — and one regression the H
fix introduced (an in-place id change hid a deletion) plus a C test that did not
exercise its fix, both fixed in `e5b59da`. Final gate: `npm run check` 1339
pass, `npx tsc --noEmit` clean.

## Deliberately not done

- The payload's prose, the install hook's `docs/memories/` pointer and
  `SCHEMA.md`'s report location — Phase 3.
- This repository's `docs/.pdocs-seed.json` still records the old template paths
  — Phase 5's `renameRecord`.
- `pdocs new --help` lists the item-only flags — resolves in Phase 2.
- About twelve skills name `docs/projects/TEMPLATES/…` — Phase 4.
