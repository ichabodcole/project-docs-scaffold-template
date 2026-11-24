---
type: plan
title: pdocs Work Board Implementation Plan
description:
  The route from today's pdocs view JSON to a work-board skill whose app ships
  inside the plugin and reads and writes only through the project's own pdocs
  CLI.
tags: [pdocs, work-board, skills]
status: draft
lifecycle: draft
generated: { by: claude-fable-5-2, at: 2026-11-19 }
---

# pdocs Work Board Implementation Plan

**Owner:** [pdocs work board](./feature.md)

---

## Playbooks consulted

`bun scripts/pdocs/cli.ts find --type playbook --format json` returned five
matches (`"count": 5`). Four apply:

- `docs/playbooks/changing-pdocs-playbook.md`: Phase 1 adds fields to every
  `pdocs view` entry under `scripts/pdocs/`, which must be copied into the
  payload by hand and typecheck under a strict consumer.
- `docs/playbooks/changing-a-shipped-skill-playbook.md`: Phases 2 to 6 add a
  plugin skill that consumers run, whose `dist/` copies must rebuild clean twice
  and which must be walked by a fresh agent in a generated project.
- `docs/playbooks/changing-the-scaffold-payload-playbook.md`: the Phase 1 change
  lands in `{{cookiecutter.project_slug}}/scripts/pdocs/`, an owned path, and is
  verified by generating a project.
- `docs/playbooks/writing-migrations-playbook.md`: its step 14 is Phase 7. The
  new fields reach an existing adopter only once the newest migration is
  re-pinned to the scaffold release that carries them.

One does not apply: `docs/playbooks/fixing-consumer-feedback-playbook.md`. No
consumer filed this work.

## Overview

The [feature](./feature.md) asks for a live work board that an agent opens: five
pages (Now, Inbox, Triage, Cycle, Feature) in the layout D shell, two kinds of
write, each one `pdocs set` call, and a skill that teaches an agent to start it.
The [research write-up](../../items/pdocs-board-landscape/write-up.md) settled
what the board reads, and the
[mockups item](../../items/pdocs-work-board-mockups/item.md) chose layout D at
the in-between capability level. Its prototype,
`docs/items/pdocs-work-board-mockups/artifacts/work-board-layouts.html`, is the
behaviour spec: the `d`-prefixed state and methods in its `Alpine.data("board")`
block, and its `ABOUT_D` text.

This plan settles the one open placement question: the app's code ships inside
the skill, in `plugins/project-docs/skills/work-board/`. The app reaches a
project only by running that project's own `scripts/pdocs/cli.ts` and reading
its JSON. Five fields the board needs are missing from that JSON today, so the
first phase adds them to the CLI. The work runs in the
[work board cycle](../../cycles/2026-11-work-board.md), beside
[item #210](../../items/research-items-parent-feature/item.md).

## Outcome & Success Criteria

**Definition of Done:**

- [ ] `pdocs view … --json` carries `description`, `from` and `source` on every
      entry, and `appetite` and `started` on a cycle entry, in this repository
      and in the payload.
- [ ] In this repository,
      `bun plugins/project-docs/skills/work-board/scripts/cli.ts open` starts a
      server on `127.0.0.1`, opens the browser, and prints one JSON line holding
      `url`, `port`, `pid` and `root`. The board then shows the five pages over
      this repository's own `docs/`.
- [ ] A triage decision (accept to `backlog` or `ready`, or drop, with optional
      priority, parent and "content reviewed") runs exactly one `pdocs set` and
      shows the command it ran, with an Undo that restores every field it
      changed.
- [ ] Bring in and Take out each run exactly one `pdocs set`, with Undo.
- [ ] The server accepts only those two kinds of write and their Undo, and
      leaves validating each value to `pdocs set`. Its one check of its own:
      Bring in offers only current cycles.
- [ ] Opened on a project whose CLI predates `view` (before 9.0.0), or predates
      the Phase 1 fields, the board does not start. It prints one error naming
      the project's pdocs version and the fix: run the `update-project-docs`
      skill.
- [ ] Selection, keyboard, Undo, snooze, the Inbox groups and "Added just now"
      behave as layout D specifies (listed under Phase 3).
- [ ] `npm run check` passes, and `./scripts/build-skills-dist.sh` run twice
      leaves `git status --short dist/` unchanged after the first build.
- [ ] A fresh agent following only the skill opens the board in a generated
      project and makes one write of each kind.

**Non-Goals:**

- The robust level: lifecycle or priority changes outside triage, the "Plan next
  cycle" page, agent proposals accepted one by one, drag, Kanban.
- Editing prose, writing a drop reason into a document's body, or creating
  items. The board hands those to the agent or to Scriptorium as a line to copy.
- A channel from the board to the agent (a `tail`). See Open Questions.
- Batch writes, dry runs, transition rules or a write lock in `pdocs set`.
- Testing at widths under 1280px or with a cycle of more than 11 items as a
  design task. Phase 4 records how the shell behaves there. Changes to the
  layout are follow-on work.

## Approach Summary

### Where the code sits: inside the skill

**Decided: ship the app inside the skill, at
`plugins/project-docs/skills/work-board/`, and treat the project's
`pdocs … --json` output as its only contract.** Add the missing fields to the
CLI (Phase 1) rather than import the CLI's modules. The evidence supports the
leaning in the brief. On reads alone it points the other way, because importing
needs no CLI change. That advantage is paid once; the costs of the other option
recur on every change to the app.

Three facts decided it:

1. **Writes spawn the CLI in both options.** `set`'s logic is the body of
   `set.run` in `scripts/pdocs/commands/set.ts`, which prints and writes; no
   exported function returns data (foundations report, "Import or spawn"). An
   app under `scripts/pdocs/` would still spawn a subprocess and parse JSON for
   every write. Importing removes only the read half of the subprocess path.
2. **Under `scripts/pdocs/`, every change to the app is a scaffold release, and
   each adopter must run a migration to get it.** `scripts/pdocs/**` is owned
   (`docs/SCHEMA.md`, "Who owns which file") and reaches an adopter only when
   `update-project-docs` re-runs the newest migration, which fetches the tag
   `SCAFFOLD_TAG` names (`migrate-v2.10-to-v3.0.ts` line 107, today
   `project-docs-scaffold-template-v9.4.1`). That pin is moved by hand at each
   release (writing-migrations playbook, step 14), because `release-please`
   excludes `plugins/` (`release-please-config.json`). A skill reaches an
   adopter with a plugin update and nothing in their repository changes.
3. **The JSON is already a tested contract; the modules are not.** `cli.test.ts`
   asserts the envelope "is the shape acc publishes", and `pdocs schema` emits
   the CLI's surface. `ViewEntry` is an exported interface in
   `scripts/pdocs/commands/view.ts`, but the `entry` mapper and
   `WorkEntity.fields` are internals that can change at any release.

The comparison in full:

| Question                        | In the skill (`plugins/project-docs/skills/work-board/`)                                                                                                                                                                                                                                                                                                                            | Under pdocs (`scripts/pdocs/board/`, mirrored to the payload)                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| How it reaches the data         | Spawns `bun <root>/scripts/pdocs/cli.ts view … --json` and parses the envelope. The CLI defaults its root to its own repository (`cli.ts` line 310), so no `--root` is passed. A poll costs three spawns and one more per current cycle, at about 0.05 s each (foundations report, timings).                                                                                        | Imports `treeContext` from `cli.ts` and `collectWork` and the `view*` functions from `work.ts`, about 53 ms in process. Writes still spawn `set`.                                                                                                                                                                                                                                                                                                                  |
| What the missing fields cost    | `ViewEntry` lacks `description`, `from` and `source` (`view.ts` lines 42 to 62), and a cycle entry lacks `appetite` and `started` (checked: `view cycle 2026-11-work-board --json`). Phase 1 adds them: one function, its tests and the mirror. Until a project has that release, the board refuses to open there.                                                                  | Nothing. `WorkEntity` already has `from`, and `fields` holds the whole frontmatter (`work.ts` lines 41 to 75).                                                                                                                                                                                                                                                                                                                                                     |
| Version skew                    | The plugin's app against the project's CLI. Pre-9.0.0 projects have no `view` (it arrived in 9.0.0: `git tag --contains` on the commit that added `commands/view.ts`). Projects on 9.0.0 to 9.4.1 lack the fields. The board detects both from the JSON itself and stops with "run `update-project-docs`". A project still on 8.0.0 is the first kind.                              | The app and the data code always match, because they ship together. The skill text (plugin) can describe a board that the project's scaffold does not have yet, and every pre-release project has no board at all. The skill has to detect that `scripts/pdocs/board/` exists.                                                                                                                                                                                     |
| What it adds to an adopter      | Nothing in their repository.                                                                                                                                                                                                                                                                                                                                                        | A server, front-end files and a vendored script under their `scripts/pdocs/`, for every adopter, used or not. Their formatter and typecheck can claim the new `.html`, `.css` and `.ts` files: `update-project-docs` already has to tell adopters to exclude `scripts/pdocs/` from Prettier, Biome and ESLint (its SKILL.md, lines 336 to 344).                                                                                                                    |
| How an existing adopter gets it | Board changes: a plugin update. The fields: once, through the scaffold release that carries Phase 1 and the `update-project-docs` refresh (its case 3, "Behind, no migration").                                                                                                                                                                                                     | Every change: a scaffold release, a re-pin of the newest migration, then each adopter running `update-project-docs`.                                                                                                                                                                                                                                                                                                                                               |
| This repository's gates         | `check:mirror`: only the Phase 1 change. `check:dist`: `build-skills-dist.sh` copies each skill folder whole (`cp -R`), so the app is committed three times (`plugins/`, `dist/project-docs/`, `dist/codex-project-docs/`) unless the Codex list excludes it. `npm test` runs the app's tests once, because it ignores `dist/**`. `tsc` covers `plugins/**/*.ts` (`tsconfig.json`). | `check:mirror`: every board file must be copied byte for byte into the payload, by hand (`check-mirror.sh` discovers payload files but cannot see an omission). `scripts/ownership-coverage.test.ts` classifies every payload file. The payload must stay "production-only", so the board's tests stay unmirrored. `release-please` rewrites `scripts/pdocs/cli.ts` each release, which the board would sit beside. `check:dist` sees only the skill's `SKILL.md`. |
| Front end with no build step    | The same in both: Bun's HTML import in `Bun.serve` bundles `index.html` and its TypeScript module scripts when the page is first requested. Nothing is built ahead or committed, and the adopter runs nothing but `bun`.                                                                                                                                                            | The same.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Spellbook packages differently: Scriptorium ships a committed, built `dist/`
(4.4 MB) behind three-line launchers in `scripts/cli.ts` and `scripts/server.ts`
(read at
`~/.claude/plugins/cache/spellbook-marketplace/spellbook/6.0.0/skills/scriptorium/`).
Borrow the launcher shape: `scripts/cli.ts` is what `SKILL.md` names, and it
spawns `scripts/server.ts` as a detached daemon. Do not borrow the committed
bundle. It exists because Spellbook builds React. The board is small enough to
need no bundle, and `dist/` here already holds two copies of every skill.

### The app's shape

```text
plugins/project-docs/skills/work-board/
  SKILL.md
  scripts/cli.ts        agent verbs: open, status, stop
  scripts/server.ts     the daemon: Bun.serve on 127.0.0.1
  lib/pdocs.ts          locate <root>/scripts/pdocs/cli.ts, spawn it, parse the envelope
  lib/compat.ts         refuse a CLI with no `view`, or without the Phase 1 fields
  lib/snapshot.ts       compose the reads into one snapshot
  lib/writes.ts         the two write kinds: validate, build argv, build the undo
  app/index.html        the shell
  app/board.ts          Alpine glue: Alpine.data("board", …), fetch, poll
  app/model.ts          pure: regrouping, Inbox rows, candidates, blockers, snooze
  app/selection.ts      pure: the current list, highlight, move, leave, escape
  app/styles.css
  app/vendor/alpine.min.js   a pinned Alpine 3 release, vendored, no CDN
```

- **Reads per poll:** `view board --features --all`, `view portfolio`,
  `view unreviewed`, and `view cycle <slug>` for each current cycle that
  `view portfolio` lists. `--all` brings archived items, so a blocker that was
  archived still resolves to its lifecycle. A cycle's `status` is in none of the
  first three reads: a portfolio row has no `status`, and the board lists no
  cycles. The Inbox needs it for every planned cycle, so each poll reads it from
  `view cycle <slug>`.
- **The snapshot has four parts:** `board`, `portfolio` and `unreviewed`, each
  the `data` of its read, and `cycles`, the `cycle` entry of each
  `view cycle <slug>` read. A planned cycle with no entry in `cycles` counts as
  not reviewed.
- **Reads a page adds:** the Cycle and Feature pages add `view cycle <slug>` or
  `view feature <slug>` while they are open.
- **Polling:** the browser polls `GET /api/snapshot` every 4 s and again after
  each write. The server caches a snapshot for 1 s and sends a hash with it, so
  an unchanged snapshot is not re-rendered.
- **Writes:** `POST /api/write` takes one of three bodies: `triage`,
  `membership` or `restore` (Undo). `lib/writes.ts` turns each into one argv for
  `set` and rejects anything else. Undo is built from the `changes[].before`
  values the `set` result returns. A field that was absent before is undone with
  `--unset`. This is more than the prototype's `dUndo`, which resets only the
  lifecycle.
- **The Undo contract:** the server accepts a `restore` only if it issued that
  body itself, in this process, among its last 100 writes, and the body comes
  back unchanged, byte for byte as JSON. An Undo is consumed on use, and the
  response to a `restore` carries no `restore` of its own. The server refuses a
  `restore` with 409 in three cases: after a server restart (the 30-minute idle
  exit is one), when the item changed since the write (a key the Undo would put
  back no longer holds the value the write left), and beyond the last 100
  writes. The last-write bar treats any 409 on Undo as "Undo no longer
  available" and removes the Undo control.
- **Everything else** is a line to copy and say to the agent (the prototype's
  `ask`), or a Scriptorium handoff line (`open`, then `show --doc <path>`). The
  board starts no other tool.
- **Safety:** bind `127.0.0.1` only. Put a random per-session token in the
  opened URL and require it as a header on every `/api/*` call. The token is
  never accepted from the query string. Check `Origin` and `Host` against the
  bound port. Build argv as arrays (no shell). Check each `ref` against the
  current snapshot before spawning.
- **Lifetime:** keep a pointer file and a log in a state folder that belongs to
  the user alone: `$XDG_RUNTIME_DIR/pdocs-work-board` when that variable is set,
  else `<os.tmpdir()>/pdocs-work-board-<uid>`. Both files are keyed by a hash of
  the root, so a second `open` reuses the running board. The folder must be a
  real directory, owned by the user, with mode 0700, or every verb refuses.
  Never write a file into the adopter's repository. The server exits after 30
  minutes with no request from the board's own page, and on `stop`; both remove
  the pointer and the log.

## Phases

Phases 2 and 3 can run in parallel with each other and with Phase 1 once the
field names below are fixed, because they share no files. Phases 4, 5 and 6
share `app/board.ts`, `app/index.html` and the skill folder, so they run in
order. Phases 2 to 6 each touch `dist/`, so a second implementer works in their
own worktree (`AGENTS.md`, "The Dist Check").

| Phase | Work item                              | Complexity  | `blocked_by`                     | Parallel with |
| ----- | -------------------------------------- | ----------- | -------------------------------- | ------------- |
| 1     | View entries carry the board's fields  | Low         | none                             | 2, 3          |
| 2     | Board server and pdocs bridge          | Medium-high | 1 (to merge)                     | 1, 3          |
| 3     | Board model and selection rules        | Medium      | 1 (field names only)             | 1, 2          |
| 4     | Shell and the five pages, read-only    | High        | 2, 3                             | none          |
| 5     | The two writes, with Undo              | Medium      | 4                                | none          |
| 6     | The work-board skill and its packaging | Medium      | 5, item #210                     | 7             |
| 7     | Re-pin the newest migration            | Low         | 1, shipped in a scaffold release | 6             |

### Phase 1: View entries carry the board's fields

**Goal:** every `pdocs view` entry carries `description`, `from` and `source`,
and a cycle entry carries `appetite` and `started`, so that a caller outside
this repository can draw the Triage form and the inspector from the JSON alone.

**Key Changes:**

- `scripts/pdocs/commands/view.ts`: add the five fields to `ViewEntry` and to
  `entry`, each `string | null`, read from `WorkEntity.fields` through the
  exported `scalar` helper in `scripts/pdocs/work.ts`, with an empty value as
  `null` (`from` is already `WorkEntity.from`). `appetite` and `started` are
  `null` on an item or a feature. The change is additive: no field is renamed or
  removed, and text output does not change.
- `scripts/pdocs/commands/view.test.ts`: test first. Give the fixture tree one
  item with a description, `from` and `source`, and one cycle with `appetite`
  and `started`. Assert the values on `view board --features --all`,
  `view backlog`, `view feature`, `view cycle` and `view unreviewed`, and assert
  `null` where the field is absent.
- `{{cookiecutter.project_slug}}/scripts/pdocs/commands/view.ts`: copy across by
  hand (changing-pdocs playbook, step 6).
- If item #210 changes `scripts/pdocs/commands/view.ts` or
  `scripts/pdocs/advisories.ts` in the same cycle, land this phase first. It is
  the smaller diff and the easier rebase.

**Validation:**

- [ ] `bun test scripts/pdocs/commands/view.test.ts` passes, and fails with the
      `entry` change reverted.
- [ ] `bun scripts/pdocs/cli.ts view backlog --json > /tmp/backlog.json`, parsed
      with `bun -e`, shows `description` on a triage item of this repository.
- [ ] `diff -rq scripts/pdocs '{{cookiecutter.project_slug}}/scripts/pdocs'`
      lists only tests, `test-env.ts` and `__fixtures__`.
- [ ] `GIT_INDEX_FILE=$(mktemp) bun test scripts/pdocs` and
      `TZ=America/Los_Angeles bun test scripts/pdocs` pass.
- [ ] `npx tsc --noEmit` is clean, and so is `npm run check`.
- [ ] `cookiecutter . --no-input --overwrite-if-exists -o <tmp> install_target="New project folder"`,
      then `bun scripts/pdocs/cli.ts new item <name>` and
      `bun scripts/pdocs/cli.ts view backlog --json` in the result, shows the
      new keys on that item.

**Dependencies:** none.

---

### Phase 2: Board server and pdocs bridge

**Goal:** a daemon an agent can start, stop and query, which reads a project
only through its own CLI, refuses a CLI too old to serve it, and accepts exactly
the two write kinds. It serves a placeholder page until Phase 4.

**Key Changes:**

- Create `plugins/project-docs/skills/work-board/lib/pdocs.ts`. Find the root by
  walking up from the working directory to the first `.project-docs.json`.
  Require `scripts/pdocs/cli.ts` beside it, then spawn `bun <cli> <args> --json`
  with an array argv. Parse stdout on success and the stderr envelope on
  failure. Return a typed result that keeps `kind`, `exit_code` and `message`.
- Create `lib/compat.ts`. Detect from the JSON, not from a version number. If
  `view board --features --all` exits 2, the CLI predates `view` or `--all`. If
  an entry lacks the `description` key, it predates Phase 1. Name the project's
  version from `--version --json` when that parses. Phase 1's release number is
  unknown until it ships, and a feature check needs no constant to keep in step.
- Create `lib/snapshot.ts`: compose the poll reads into one object and hash it.
  The object has four parts, typed as `Snapshot` in `app/model.ts`: `board`,
  `portfolio`, `unreviewed`, and `cycles`. Fill `cycles` on every poll with the
  `cycle` entry of `view cycle <slug>` for each cycle in `portfolio.cycles`. If
  one of those reads fails, leave that cycle out: the model then counts a
  planned cycle as not reviewed. Keep composing separate from spawning, so tests
  feed it recorded JSON.
- Create `lib/writes.ts`:
  - `triage`: `ref`, `lifecycle` in `backlog`, `ready` or `dropped`, and
    optional `priority`, `parent` (written as `feature/<slug>`) and `reviewed`
    (adds `--status stable`). One `set` call, matching `triage-items` step 5.
  - `membership`: `ref` and `cycle`, a slug to bring the item in or `null` to
    take it out (`--unset cycle`).
  - `restore`: `ref` and a list of `{ key, before }`, named `changes`, limited
    to `lifecycle`, `priority`, `parent`, `status` and `cycle`. The server takes
    a `restore` only under the Undo contract in the Approach Summary: a body it
    issued in this process among its last 100 writes, unchanged, not yet used,
    for an item that still holds what the write left. Anything else is a 409.

  Each returns the argv, the command string the UI shows, and the `restore` body
  that undoes it.

- Create `scripts/server.ts` (routes `/`, `/api/snapshot`, `/api/cycle/:slug`,
  `/api/feature/:slug` and `/api/write`, with the token, origin and host checks
  and the idle exit) and `scripts/cli.ts` (`open [--no-browser]`, `status`,
  `stop`; the pointer file; one JSON line on stdout; pdocs-shaped error
  envelopes on stderr with exit 2, 5 or 6).
- Tests first, beside each file (`lib/*.test.ts`, `scripts/cli.test.ts`). Spawn
  through `childEnv()` from `../../../../../scripts/pdocs/test-env.ts`, as
  `migrate-v2.10-to-v3.0.test.ts` already imports it. Build each fixture project
  in a temp folder from a copy of this repository's non-test `scripts/pdocs/`
  and a small `docs/` tree. Two stub CLIs stand in for old projects: one exits 2
  on `view`, one returns 9.4.1-shaped entries.
- `scripts/build-skills-dist.sh` already has `work-board` in the Codex exclusion
  `case`: it landed with Phase 3. Do not add it again. The app is never copied
  into `dist/codex-project-docs/` (Decisions). Rebuild `dist/`.

**Validation:**

- [ ] `bun test plugins/project-docs/skills/work-board` passes. It covers: each
      compat refusal and its message; each write kind's argv; `restore` built
      from `before` values, including `--unset` for an absent one; rejection of
      any other key, lifecycle or body shape; a request without the token or
      with a foreign `Origin`, refused with nothing spawned.
- [ ] Against a fixture: `open --no-browser`, then `curl` with the token on
      `/api/snapshot`, then a `triage` write, then its `restore`, leaves the
      item file byte-identical to the start.
- [ ] Running `open` twice prints the same `url`; `stop` ends the process.
- [ ] `npx tsc --noEmit` and `npm run check` pass, after `npm run build:dist`.

**Dependencies:** Phase 1 merged before this branch merges, because the
end-to-end test needs the fields. Development can start at once against the
field names fixed in Phase 1.

---

### Phase 3: Board model and selection rules

**Goal:** layout D's behaviour as pure, tested functions over a snapshot, so the
UI phases only bind them.

**Key Changes:**

- Create `plugins/project-docs/skills/work-board/app/model.ts`, test first in
  `app/model.test.ts`, from the prototype's getters:
  - **Container groups** (`dGroups`): empty groups left out; "Added just now"
    first; then `active`, `review`, `ready`, `backlog` and `triage`; `done` last
    and folded. Order within a group is priority, then title (`sorted`).
  - **Now** (`dNowGroups`): started items (`active`, `review`) grouped by cycle
    or by feature. The active cycle is labelled "In this cycle", and "In no
    cycle" or "In no feature" comes last. Leave archived entries out.
  - **Candidates** (`candidates`): live items with no cycle in `backlog` or
    `ready`, `ready` first, filtered by text, lifecycle and feature.
  - **Blockers** (`openBlockers`): resolve `blockedBy` ids against the `--all`
    snapshot. An unknown id counts as open, so a missing blocker never reads as
    "blocker done".
  - **Inbox rows** (`attention` and `dInboxRows`): waiting in triage; one row
    per planned cycle whose `status` is not `stable`, read from the snapshot's
    `cycles` part, where a cycle with no entry counts as not reviewed (this tree
    has two planned cycles today, and the prototype assumed one); blocked;
    started on a draft; blocker already done; finished, never reviewed (from
    `view unreviewed`); and one row per advisory, by its `message` and `action`.
    The first five are "Needs a decision" and the rest "Housekeeping". Only
    "Needs a decision" counts toward the nav (`dInboxCount`). Rendering an
    advisory from its own `message` and `action` keeps the Inbox correct
    whatever #210 changes in the archive advisory.
  - **Snooze:** `tomorrow`, `week` or `cycle`, stored as
    `{ id, choice, at, activeCycle }`. A row wakes when the date passes or when
    the active cycle's slug differs from the one recorded. The UI keeps it in
    `localStorage`, keyed by root. It never reaches the server.
- Create `app/selection.ts`, test first in `app/selection.test.ts`, from
  `dList`, `dSelected`, `dMove`, `dLeave` and `dEscape`:
  - Only a row in the current list can be selected, so the inspector never shows
    an item with no highlighted row.
  - Move by ±1 clamps at both ends; from no selection it goes to the first or
    the last row.
  - When a change removes the highlighted row, the highlight moves to the row
    that takes its index, or the inspector closes if the list is empty.
  - Escape closes the Snooze menu, then the cycle chooser, then the inspector,
    one per press.
  - Changing tab, page or cycle clears the selection. Arriving from the Inbox at
    a planned cycle sets a back link, and leaving restores the cycle the Cycle
    page showed before (`dPeek`).
  - "Added just now" lists the slugs brought in during this visit to the Cycle
    page and is cleared on leaving it.
- Add `/// <reference lib="dom" />` only to files that touch the DOM. `model.ts`
  and `selection.ts` stay DOM-free so they typecheck under the repository's
  `lib: ["ESNext"]`.

**Validation:**

- [ ] `bun test plugins/project-docs/skills/work-board/app` passes. Each rule
      above has a test that fails when the rule is reverted in a disposable
      copy.
- [ ] A test feeds the model a four-part snapshot recorded from this repository
      after Phase 1 and trimmed to a few entries
      (`app/__fixtures__/repo-snapshot.json`), and asserts the Inbox has a
      triage row and an archive row.
- [ ] `npx tsc --noEmit` is clean.

**Dependencies:** the Phase 1 field names, used in fixtures. No code dependency.

---

### Phase 4: Shell and the five pages, read-only

**Goal:** the layout D shell over live data: nav, one centre column and the
inspector, with the Now, Inbox, Triage, Cycle (both tabs) and Feature pages
drawn, polled and navigable by keyboard. No writes yet.

**Key Changes:**

- `app/index.html`, `app/board.ts`, `app/styles.css` and
  `app/vendor/alpine.min.js`. Register the component with
  `Alpine.data("board", …)`, not inline `x-data`, as the prototype does. Port
  the markup from the prototype's `layout === 'd'` block (line 2104 onward),
  without the switcher chrome and the sample data.
- Read the token from `location.search`, then remove `?token=` from the address
  bar with `history.replaceState`. Send it as the `x-board-token` header only.
  Keep `/` free of project data: the page gets everything through `/api/*`.
- Render a 409 from `/api/snapshot` as its `message`: the project's CLI is too
  old, and the message names the fix (`update-project-docs`).
- Wire `board.ts` to `/api/*` with the token, through the Phase 3 functions.
  Replace the snapshot object on every poll and never mutate it: the Phase 3
  functions compare the list before a change with the list after
  (`refresh(state, before, after)` in `app/selection.ts`), which needs both
  snapshots intact.
- Keep the seven shell rules in `ABOUT_D`: three regions; the inspector pushes
  the centre and never overlays it; containers drill in and items inspect; the
  cycle's lists are tabs; at most two floats (Snooze and the cycle chooser).
- Keyboard: `j`/`k` and the arrow keys move the highlight, Enter opens the
  inspector, Escape unwinds. `b` and `t` are bound in Phase 5.
- In the inspector, the "Copy path" action and the Scriptorium handoff line
  (`open`, then `show --doc <path>`) are shown as text to copy.
- In `scripts/server.ts`, replace the placeholder with the HTML import
  (`import page from "../app/index.html"` in `routes`), with no `development`
  mode.
- Record two checks the feature leaves open, in this phase's session: a fixture
  cycle of 40 items, and a window 1024px wide. Note what breaks; do not
  redesign.

**Validation:**

- [ ] `bun plugins/project-docs/skills/work-board/scripts/cli.ts open` from this
      repository opens the board. Each of the five pages shows this tree's data
      and matches the prototype's D states 1 to 7 for the same data.
- [ ] Edit an item's `priority` with `pdocs set` in a terminal; the board shows
      the change within one poll.
- [ ] The browser console shows no errors, and the network panel shows no
      request leaving `127.0.0.1`.
- [ ] `npm run check` passes after `npm run build:dist`.

**Dependencies:** Phases 2 and 3.

---

### Phase 5: The two writes, with Undo

**Goal:** the Triage decision form and cycle membership write through
`/api/write`, show the command that ran, and can be undone.

**Key Changes:**

- `app/board.ts` and `app/index.html`:
  - The Triage form in the inspector: disposition (`backlog`, `ready`, drop),
    priority, parent feature and "content reviewed". Applying it removes the
    item from the queue, moves the highlight to the next waiting item, and adds
    the item to the folded "Decided" list.
  - **Bring in** on a candidate row (on hover and focus) and the `b` key; **Take
    out** in the inspector only, and the `t` key. A brought-in item joins "Added
    just now" and the row or the tab it went to flashes (`dLand`).
  - The last-write bar: the command that ran and an Undo, after a write only.
    Undo posts the `restore` body that the server returned, unchanged: the
    object as received, not one rebuilt from its parts. A successful Undo
    removes the Undo control, because an Undo is used once and returns no
    `restore`. Any 409 on Undo (the server restarted, the item changed since the
    write, or more than 100 writes followed) shows "Undo no longer available"
    and removes the Undo control too.
  - A drop's reason is a text box whose content becomes a line for the agent to
    record. It is not written.
- Show refusals from `set` (exit 2 with `message` and `choices`; exit 6 under
  `strict` review mode) in the last-write bar, with nothing changed locally. Any
  `advisories` returned are shown the same way.

**Validation:**

- [ ] Make two copies of this repository's `docs/`, `.project-docs.json` and
      `scripts/pdocs/` in a temp folder (`cp -R`), and open the board on one.
      Accept one triage item to `ready` with a priority and a parent, then Undo:
      `diff -r` between the two copies prints nothing. Drop one, then Undo:
      nothing again. Bring one in, Take it out: nothing.
- [ ] Each write appears as exactly one `pdocs set` in the server's log.
- [ ] Bring an item into a cycle that `set` refuses (an unknown slug, forced
      from the console); the bar shows the refusal and the board's state is
      unchanged.
- [ ] `npm run check` passes after `npm run build:dist`.

**Dependencies:** Phase 4.

---

### Phase 6: The work-board skill and its packaging

**Goal:** an agent that has never seen the board can start it, tell the user
what it is for, act on what the user asks it, and stop it.

**Key Changes:**

- Create `plugins/project-docs/skills/work-board/SKILL.md`, frontmatter `name`
  and `description`. Trigger phrases: "open the work board", "show me the
  board", "what's in triage" when the user wants to look, not have the agent
  triage. Name `triage-items` as the skill for agent-proposed triage, so the two
  do not compete. The body covers:
  - opening with `bun "$SKILL_DIR/scripts/cli.ts" open`, where `SKILL_DIR` is
    this skill's directory, never a `plugins/…` path (the open backlog item
    `plugin-relative-paths-in-consumers` is that bug);
  - what to do with each refusal `open` prints (`update-project-docs` for an old
    CLI);
  - that the board's writes are the user's, and arrive as changed files in
    `git status`;
  - that the lines the user pastes from the board ("archive the finished items",
    a drop reason, a Scriptorium handoff) are requests to act on with the named
    skill;
  - `status` and `stop`.
- Bump `plugins/project-docs/.claude-plugin/plugin.json` minor (4.6.0 today: a
  new skill is a change of behaviour). Add the skill to
  `plugins/project-docs/README.md`. Run the `scaffold-update-checklist` skill
  ("add a new skill"). Rebuild `dist/`.
- After item #210 lands, repeat the Inbox and Feature checks from Phase 4 on
  this tree.

**Validation:**

- [ ] `./scripts/build-skills-dist.sh && ./scripts/build-skills-dist.sh && git status --short dist/`
      shows only `dist/project-docs/skills/work-board/SKILL.md`, the plugin
      README and the version fields, the same after both builds, and nothing
      under `dist/codex-project-docs/skills/work-board/`.
- [ ] `grep -n 'git ' plugins/project-docs/skills/work-board/SKILL.md | grep -v -- '-C'`
      finds no unanchored git command.
- [ ] Walk: generate a project with
      `cookiecutter . --no-input --overwrite-if-exists -o <tmp> install_target="New project folder"`
      from a tree that includes Phase 1, file two triage items with
      `pdocs new item`, then have a fresh agent with only the skill open the
      board. The user accepts one item and brings it into a cycle. The
      transcript is kept in the phase's session.
- [ ] The same walk on a project with a 9.4.1 CLI stops at `open` with the
      `update-project-docs` message.
- [ ] `npm run check` passes.

**Dependencies:** Phase 5, and item #210 landed (for the last check).

---

### Phase 7: Re-pin the newest migration to the release with the fields

**Goal:** an existing adopter can get the Phase 1 fields by running
`update-project-docs`, which is what the board tells them to do.

**Key Changes:**

- After a scaffold release that contains Phase 1, follow the writing-migrations
  playbook, step 14, for
  `plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.10-to-v3.0.ts`:
  `SCAFFOLD_TAG`, its test's pin, its guide (`migrations/v2.10-to-v3.0.md`), and
  `update-project-docs/SKILL.md` Step 4 and its table row. Regenerate
  `OWNED_RELEASES`, because Phase 1 changed an owned file.
- Ship this in the same plugin release as Phase 6, so no plugin version carries
  a board whose fix it cannot install.

**Validation:**

- [ ] `bun test plugins/project-docs/skills/update-project-docs` passes,
      including the pin test and `OWNED_RELEASES`.
- [ ] `npm run check:dist` is clean.
- [ ] On a fixture at 9.4.1, `update-project-docs` case 3 refreshes
      `scripts/pdocs/`, and then the board opens there.

**Dependencies:** Phase 1 shipped in a scaffold release. Runs beside Phase 6;
both edit `dist/`, so use separate worktrees.

## Key Risks & Mitigations

- **Bun's HTML import behaves differently from a plugin cache path, or on an
  older Bun.** → Phase 4 runs the board from `~/.claude/plugins/cache/…` as well
  as from `plugins/`. If bundling fails there, serve `app/*.ts` through
  `Bun.Transpiler` per request instead. It is the same files with no build step,
  and the change stays inside `scripts/server.ts`.
- **Two writers: the agent runs `pdocs set` while the user clicks.** `set` has
  no lock (foundations report, "Writes"). → Each board write is one file and one
  call; the poll after it shows the result. Undo restores from the `before`
  values `set` returned, not from the board's copy, and a refusal leaves the
  board's state alone.
- **A local server that writes is reachable from other pages in the browser.** →
  Token, `Origin` and `Host` checks, the `127.0.0.1` bind, and an allowlist of
  three body shapes (Phase 2 tests each refusal).
- **`set` validates values, not transitions** (foundations report). → Low
  exposure: the board offers only triage to `backlog`, `ready` or `dropped`, and
  cycle in or out. Undo of a triage decision writes `triage` back, which `set`
  accepts.
- **Joining an archived, closed cycle is accepted by `set` with no advisory.** →
  The cycle chooser and Bring in offer only current cycles (`current: true` in
  `view portfolio`).
- **Item #210 changes the archive advisory or `view feature` while the board is
  built.** → The Inbox renders advisories by `message` and `action` (Phase 3),
  and Phase 6 repeats the checks after #210 lands. If #210 edits
  `scripts/pdocs/commands/view.ts`, Phase 1 lands first.
- **`dist/` triples the app.** → The app is small: no bundle, one vendored
  script. The Codex copy is excluded for now (Phase 2).

## Testing Strategy

- **Unit, test first, `bun test`:** the Phase 1 fields (`view.test.ts`); compat
  detection, snapshot composition, write validation, argv and undo construction
  (`lib/*.test.ts`); the regrouping, Inbox, candidates, blockers, snooze and
  selection rules (`app/*.test.ts`). For each rule, revert it in a disposable
  copy and confirm its test goes red.
- **Integration, `bun test`:** the CLI and the server against temp fixture
  projects: open, read, write, Undo and stop, ending byte-identical; the old-CLI
  refusals through the stub CLIs. Spawn through `childEnv()`. Run also under
  `GIT_INDEX_FILE=$(mktemp)` and `TZ=America/Los_Angeles`.
- **Manual, recorded in each phase's session:** the five pages on this tree
  against the prototype's D states; the 40-item cycle and the 1024px width
  (Phase 4); the writes on a copy (Phase 5); the fresh-agent walk in a generated
  project (Phase 6).
- **Gates:** `npm run check` at each phase. `npm run build:dist` before it from
  Phase 2 on.

A tiered `test-plan.md` is worth writing before Phase 4 starts, because "did the
agent build what layout D specifies" is a real question across eight states.

## Assumptions & Constraints

**Assumptions:**

- Adopters run Bun, as `pdocs` already requires (`AGENTS.md`, "Two Runtimes, One
  Gate"). This machine has Bun 1.4.4.
- The project's CLI sits at `<root>/scripts/pdocs/cli.ts`, beside
  `.project-docs.json`. The post-gen hook installs both there, in either install
  branch (`AGENTS.md`, "Post-Generation Hook").
- The triage form has a "content reviewed" box, which adds `--status stable`
  (see Decisions). Layout D's `dTriCmd` leaves it out; the in-between mockup
  lists it. `triage-items` adds it only when the user approved the item's
  content.
- The field names `description`, `from`, `source`, `appetite` and `started` are
  final, so Phases 2 and 3 can start beside Phase 1.

**Constraints:**

- No runtime dependency beyond Bun and a vendored Alpine; no CDN at run time.
- The board writes only through `pdocs set`, one call per action, and never
  writes a file of its own into the adopter's repository.
- `npm test` ignores `dist/**`; the app's tests run from `plugins/` only.
- The skill folder exists from Phase 2, but its `SKILL.md` arrives in Phase 6.
  Phases 2 to 6 land on `develop`, and no plugin release is cut from `main`
  between them.

## Decisions

Made by the owner on 2026-11-19, after reading this plan:

- **Placement:** the app ships inside the skill, in
  `plugins/project-docs/skills/work-board/`, with the CLI's JSON as its only
  contract.
- **"Content reviewed" on the triage form:** kept. It adds `--status stable` to
  the triage decision's one `pdocs set` call.
- **Codex:** `work-board` stays out of `dist/codex-project-docs/` until someone
  tries it there.

## Open Questions

- **A channel to the agent:** should the board push the user's requests (a drop
  reason, "archive the finished items") to the agent, through a `tail` verb in
  the Spellbook pattern, instead of a line the user copies? Out of scope here;
  it changes the skill more than the app.

---

**Related Documents:**

- [pdocs work board](./feature.md)
- [A work board for project-docs](../../items/pdocs-board-landscape/write-up.md)
- [Work board foundations](../../items/pdocs-board-landscape/reports/2026-11-17-work-board-foundations-report.md)
- [Mock up the work board in a few variations](../../items/pdocs-work-board-mockups/item.md)
- [The work board cycle](../../cycles/2026-11-work-board.md)
- [Keep a feature's finished items in view until the feature is done](../../items/research-items-parent-feature/item.md)
