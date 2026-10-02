---
type: session
title: Work Taxonomy Phase 2, the pdocs verbs — 2026-09-22
description:
  pdocs learns to create, promote, set, archive and view features and items —
  UUIDv7 ids, the owner link written by the CLI, moves that rewrite every link
  to the moved document — and every command leaves a tree the next check passes.
tags: [taxonomy, cli, pdocs]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Work Taxonomy Phase 2, the pdocs verbs — 2026-09-22

Part of
[Work Taxonomy release](../../../cycles/_archive/2026-09-work-taxonomy-release.md).
Plan: [Phase 2](../plan.md). Branch `feature/work-taxonomy-p2-pdocs-verbs`. The
coordinator ran this from the main thread; an implementer sub-agent wrote the
code, and two reviewer sub-agents checked it over three rounds.

## What landed

| Commit    | What                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------- |
| `cc7431b` | 2.1 — UUIDv7 generator, sharing one pattern with the lint                                       |
| `1e9bb3e` | 2.2 — the work model in `scripts/pdocs/work.ts`, and `resolveRef`; the lint reads the model     |
| `1477d52` | 2.3 — `pdocs new item` (defaults to `triage`, mints the id, requires `--kind`)                  |
| `0d68e9f` | 2.5 — `pdocs promote`, and the shared link rewriter (`links-rewrite.ts`, `move.ts`)             |
| `9818776` | 2.6 — `pdocs set`, refusing any change that would add a finding                                 |
| `b0f0ec4` | 2.7 — `pdocs archive`, terminal entities only (D15)                                             |
| `1f082d2` | 2.8 — `pdocs view`: backlog, board, ready, feature, cycle, scope, unreleased, released          |
| `a681b76` | 2.9 — `find` filters for kind, parent, cycle, scope and id; the new verbs on the CLI surface    |
| `90befb3` | 2.4 — `--owner` replaces `--project`; `pdocs new feature`; the CLI writes the owner link (D17)  |
| `69dc2bf` | D17 recorded in the plan; the legacy `--owner project/<slug>` added to Phase 5's retirement     |
| `119508a` | Review — a move rewrites a path-form `from:`                                                    |
| `7986f66` | Review — a move rewrites reference-style link definitions                                       |
| `f0ade4c` | Review — `--from` the item being promoted links through the promotion; `created` lists rewrites |
| `d5ab440` | Review — `new` refuses a taken slug, live or archived; a feature's `--scope` is checked         |
| `934765d` | Review — an empty cycle is not closable                                                         |
| `de7e905` | Review — ids printed 12 characters long, 8+ accepted (D18)                                      |
| `b4ab657` | D18 recorded in the plan                                                                        |
| `2d5ae13` | Review — seeded templates match the payload byte for byte, and the mirror check enforces it     |
| `68ec8d7` | Review — a test proves `move.ts` lists tracked files through `gitEnv()`                         |
| `ac00155` | Review — UUIDv7 ids strictly increase within a millisecond (RFC 9562)                           |
| `ea33550` | Review — `--project` is refused with its replacement named                                      |
| `9c9ff97` | Re-review — the rewriter leaves footnotes and prose definitions alone                           |
| `2b18504` | Re-review — promotion rewrites labelled in text output; `--from` the owner links once           |

## Decisions made during the phase

- **D17 — the CLI writes the owner link.** Four templates hard-coded
  `./proposal.md`, which no longer exists in a feature or item folder, and no
  single literal link is right for both owners. `pdocs new --owner` now writes
  the link to `feature.md` or `item.md`; the templates carry an inline-code note
  for hand-copiers. `--owner project/<slug>` stays as a legacy form until Phase
  5, so this repository can keep creating documents while it is still on
  `projects/`.
- **D18 — short ids.** A UUIDv7 id starts with a timestamp, so an 8-character
  prefix changes only about every 65 seconds and usually matches several items.
  `resolveRef` still accepts any unique prefix of 8 or more; everything printed
  for a person or agent to copy shows 12 characters; JSON keeps the full id.
- **An empty cycle is not closable.** A cycle is closable when it has at least
  one item and every item is `done` or `dropped`, so a sweep never closes a
  cycle that has only just opened.

## Judgment calls

- 2.5 before 2.4, because `--owner item/<x>` promotes a single-file item first.
- A promotion inside `new` happens only after every validation has passed, so a
  refusal leaves the item untouched.
- `move.ts` rewrites links in every document under the docs root and every
  tracked markdown file outside it — a README linking the moved item is exactly
  what `check` would otherwise report broken.
- A reference definition is rewritten only when its target is in the move map or
  exists; one already broken before the move is left alone rather than swapped
  for a different broken path.
- `board` leaves out archived entities; `unreleased`, `feature`, `cycle` and
  `scope` include them; `ready` needs every blocker `done`; `archive` refuses
  cycles.

## Review

Roster read from the Agent tool's dispatchable types in this session, unchanged
since Phase 1. `feature-dev:code-reviewer` was rejected on capability —
`BashOutput` and `KillShell` without `Bash`. Both Phase 1 reviewers were resumed
with their context: `Plan` (a shell, no editing tools — read-only by
construction) for plan alignment, and `general-purpose` (tools `*`) for
correctness, told to report only.

Plan alignment — **With fixes**: every task built, D1–D17 holding, nothing from
a later phase beyond D17's template edits. Its log, quoted: "`bun test` (full
suite) — **1437 pass, 0 fail**"; "`bun scripts/pdocs/cli.ts check --format text`
— **clean**"; "`npx tsc --noEmit` — pass"; the transitional
`--owner project/work-taxonomy` resolved against this repository without
writing.

Correctness — **With fixes**. Its log, quoted: "`npm run check`: exit 0, 1437
pass";
"`cookiecutter . --no-input --overwrite-if-exists -o <scratch>/cc2 install_target=\"New project folder\"`"
and the full flow in it; link rewriting "through promote → archive" across self
links, anchors, fences, reference definitions, a directory link and a tracked
root `NOTES.md`; "100k `uuidv7()` values"; nine neuters, eight failing a test.

Between them they found four ways a pdocs command wrote a tree its own next
check failed — a path-form `from:` left behind by a move, a `--from` link
computed before a promotion, an unchecked slug collision, and an unchecked
feature `--scope` — plus eight smaller issues. All were fixed test-first.
**Re-review** (correctness, resumed): all twelve confirmed, and one regression
the reference-definition fix introduced — footnotes and prose definitions in a
moved document were rewritten as links — plus two cosmetic issues, fixed in
`9c9ff97` and `2b18504`. **Narrow re-check** of those two commits: **Ready to
merge: Yes**, the new guard seen failing a test when neutered. Final gate:
`npm run check` 1459 pass, `npx tsc --noEmit` clean.

## Deliberately not done

- The template rewrite beyond the owner and plan links, and the payload prose —
  Phase 3.
- Skills still call `--project` and name old paths — Phase 4. The refusal names
  the replacement, and `--owner project/<slug>` works here until Phase 5.
- The test plan's Results Addendum: its scenarios are now runnable, and a
  verification pass should fill them in before release rather than infer them
  from review logs.
