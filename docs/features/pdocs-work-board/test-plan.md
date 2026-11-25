---
type: test-plan
title: pdocs work board Test Plan
description:
  The scenarios that show the work board opens, reads only through the project's
  pdocs CLI, makes its two writes and undoes them cleanly, and can be used by an
  agent that has never seen it.
tags: [pdocs, work-board, verification]
status: draft
lifecycle: draft
generated: { by: claude-fable-5-2, at: 2026-11-19 }
---

# Test Plan: pdocs work board

**Related Plan:** [Development Plan](./plan.md)\
**Owner:** [pdocs work board](./feature.md)

---

## Overview

This plan checks that the work board does what the [feature](./feature.md) asks
and what layout D of the
[mockups prototype](../../items/pdocs-work-board-mockups/artifacts/work-board-layouts.html)
specifies. The goals, each of which has at least one Tier 2 scenario:

- **G1** The board opens on a project and shows five pages (Now, Inbox, Triage,
  Cycle, Feature) from that project's own `pdocs view … --json`.
- **G2** The shell keeps layout D's rules and keyboard behaviour.
- **G3** A triage decision is one `pdocs set` call, shows its command, and can
  be undone.
- **G4** Bring in and Take out are one `pdocs set` call each, with Undo.
- **G5** The server accepts only those writes, and only from the page it served.
- **G6** On a project whose CLI is too old, the board refuses to start and names
  the fix.
- **G7** An agent with only the skill can open the board in a generated project
  and the user can make one write of each kind.

The plan's phases land as separate work items, so each scenario names the branch
it runs on. A scenario that needs a later phase is not run earlier. The plan's
per-phase Validation lists remain the implementer's checklist and are not
repeated here. This plan picks what proves the feature end to end, and what a
phase's own unit tests would not catch: the write-then-Undo round trip leaving
the tree byte-identical, the old-CLI refusal, the token and origin checks, the
inspector never showing an unhighlighted item, a terminal `pdocs set` appearing
within a poll, and the fresh-agent walk.

Branches, by work item (all under `docs/items/`):

| Short name | Work item                          | Phase |
| ---------- | ---------------------------------- | ----- |
| fields     | `view-entries-carry-board-fields`  | 1     |
| server     | `board-server-and-pdocs-bridge`    | 2     |
| model      | `board-model-and-selection-rules`  | 3     |
| shell      | `board-shell-and-five-pages`       | 4     |
| writes     | `board-two-writes-with-undo`       | 5     |
| skill      | `work-board-skill-and-packaging`   | 6     |
| repin      | `repin-migration-for-board-fields` | 7     |

## Test Environment

**Rule of the environment: no write scenario runs against this repository's real
`docs/`.** Every scenario that creates a write, whether through the browser,
`curl` or `pdocs set`, runs on a temp copy made as below. Run read-only
scenarios on the real tree, and check `git status --short docs/` before and
after to confirm nothing changed.

**Prerequisites:**

- Bun (this machine has 1.4.4), run from the repository root. Install
  dependencies with `npm install` if `node_modules` is missing.
- A browser the agent can drive, with console and network inspection (the Chrome
  DevTools or Playwright tools). Screenshots go to
  `docs/features/pdocs-work-board/artifacts/screenshots/`.
- A temp copy for write scenarios, made once per scenario:

  ```bash
  SCRATCH=$(mktemp -d)
  mkdir -p "$SCRATCH/a" "$SCRATCH/b"
  for d in a b; do
    mkdir -p "$SCRATCH/$d/scripts"
    cp -R docs .project-docs.json "$SCRATCH/$d/"
    cp -R scripts/pdocs "$SCRATCH/$d/scripts/pdocs"
    git -C "$SCRATCH/$d" init -q && git -C "$SCRATCH/$d" add -A \
      && git -C "$SCRATCH/$d" -c user.email=t@t -c user.name=t commit -qm base
  done
  ```

  Copy `a` is the one the board opens on. Copy `b` stays untouched, and
  `diff -r "$SCRATCH/a" "$SCRATCH/b" -x .git` is the comparison.

- A generated project for the walk (T2-13): from the repository root,
  `cookiecutter . --no-input --overwrite-if-exists -o "$(mktemp -d)" install_target="New project folder"`
  on a tree that includes the fields branch. Then, inside it,
  `bun scripts/pdocs/cli.ts new item <name>` twice to file two triage items.
- A 9.4.1-shaped fixture CLI (T2-02, T2-14): a project folder with a
  `.project-docs.json` and a `scripts/pdocs/cli.ts` whose `view` entries have no
  `description` key. The server item's tests build two stubs (one exits 2 on
  `view`, one returns 9.4.1-shaped entries). Reuse them. For T2-14, a real one:
  check out tag `project-docs-scaffold-template-v9.4.1` into a temp folder and
  generate from it.
- Environment for every `bun test` run: spawn through `childEnv()` from
  `scripts/pdocs/test-env.ts`, and run each suite also as
  `GIT_INDEX_FILE=$(mktemp) bun test …` and `TZ=America/Los_Angeles bun test …`.

**External Dependencies:**

This feature has no third-party services, accounts, credentials or environment
variables. The board makes no request that leaves `127.0.0.1`, and the app
vendors its one script.

- **Human actions required** — Only T2-13 has a step an agent cannot do alone:
  the fresh agent needs a person (or a second session the tester plays) to say
  "accept this one and bring it into a cycle" at the board. Item #210 must also
  have landed before T3-05 can run. Nothing else needs a human.
- **Verification command** — run
  `bun --version && bun scripts/pdocs/cli.ts view portfolio --json | bun -e 'const j=JSON.parse(await Bun.stdin.text()); console.log(j.ok)'`
  and confirm a version and `true`. After the fields branch,
  `bun scripts/pdocs/cli.ts view backlog --json` also shows a `description` key
  on every entry.

---

## Verification Scenarios

### Tier 1 — Smoke Tests

_Cheap checks that the work builds, starts and renders._

#### T1-01: The gates pass

**Type:** Integration\
**Source:** Baseline; plan Definition of Done ("`npm run check` passes"). Run on
every branch.

**Steps:**

1. From the repository root run `npm run build:dist` (not on the fields branch)
   and then `npm run check`.
2. Run `npx tsc --noEmit`.
3. Run `bun test scripts/pdocs` and, for the board branches,
   `bun test plugins/project-docs/skills/work-board`, plain and with the
   `GIT_INDEX_FILE` and `TZ` prefixes from the prerequisites.

**Expected:** Every command exits 0. No test is skipped to get there.

---

#### T1-02: View JSON carries the new fields on this repository

**Type:** Integration\
**Source:** Plan Phase 1; goal G1. Branch: fields.

**Steps:**

1. Run
   `bun scripts/pdocs/cli.ts view board --features --all --json > "$SCRATCH/board.json"`.
2. With `bun -e`, parse it and list every entry across all lists.
3. Check each has the keys `description`, `from` and `source`, and that each
   cycle entry also has `appetite` and `started`.
4. Run `diff -rq scripts/pdocs '{{cookiecutter.project_slug}}/scripts/pdocs'`.

**Expected:** Every entry has the three keys (value `null` where the document
has none), cycle entries have `appetite` and `started`, and item and feature
entries have them as `null` or absent as the item's definition of done states.
The diff lists only tests, `test-env.ts` and `__fixtures__`.

---

#### T1-03: The board starts, serves a page and stops

**Type:** Integration\
**Source:** Plan Phase 2 Definition of Done; goal G1. Branch: server
(placeholder page), then re-run on shell (real page).

**Steps:**

1. Run
   `bun plugins/project-docs/skills/work-board/scripts/cli.ts open --no-browser`
   from the repository root. Capture stdout.
2. Parse stdout as one JSON line and check it has `url`, `port`, `pid` and
   `root`, with `root` equal to the repository path and the host in `url` equal
   to `127.0.0.1`.
3. `curl -s -o /dev/null -w '%{http_code}' "<url>"`.
4. Run `scripts/cli.ts status`, then `scripts/cli.ts stop`, then
   `kill -0 <pid>`.

**Expected:** Exactly one JSON line on stdout. The page returns 200. `status`
reports the same `url`; after `stop` the process is gone (`kill -0` fails).

---

#### T1-04: The five pages render with a clean console

**Type:** UI/E2E\
**Source:** Plan Phase 4; goal G1. Branch: shell.

**Steps:**

1. Run `scripts/cli.ts open` from the repository root and open the printed `url`
   in the browser.
2. Visit Now, Inbox, Triage, a cycle's page (both tabs) and a feature's page by
   clicking the nav and rows. Screenshot each: `T1-04-now.png`,
   `T1-04-inbox.png`, `T1-04-triage.png`, `T1-04-cycle.png`,
   `T1-04-candidates.png`, `T1-04-feature.png`.
3. Read the browser console messages and the network request list.

**Expected:** Each page shows this tree's data. No console error or warning from
the app, and no request to a host other than `127.0.0.1`.

---

#### T1-05: `dist/` rebuilds clean twice and leaves Codex alone

**Type:** Integration\
**Source:** Plan Phase 2 and Phase 6 Validation; Decisions (Codex). Branch:
server onward.

**Steps:**

1. Run `./scripts/build-skills-dist.sh`, then
   `git status --short dist/ > "$SCRATCH/first.txt"`.
2. Run `./scripts/build-skills-dist.sh` again, then
   `git status --short dist/ > "$SCRATCH/second.txt"`.
3. `diff "$SCRATCH/first.txt" "$SCRATCH/second.txt"`, then
   `ls dist/codex-project-docs/skills | grep work-board`.

**Expected:** The two status files are identical. The grep finds nothing.
`dist/project-docs/skills/work-board/` exists.

---

### Tier 2 — Critical Path

_The feature's goals. Each runs on the branch named, and again on the last
branch before landing._

#### T2-01: The new fields are tested, and reach a generated project

**Type:** Unit, then Integration\
**Source:** G1; plan Phase 1. Branch: fields.

**Steps:**

1. Run `bun test scripts/pdocs/commands/view.test.ts` and confirm it passes.
2. In a disposable copy of the repository, revert the `entry` change in
   `scripts/pdocs/commands/view.ts` and run the same test.
3. Generate a project with cookiecutter (see prerequisites), then in it run
   `bun scripts/pdocs/cli.ts new item probe` and
   `bun scripts/pdocs/cli.ts view backlog --json`.
4. Run `npm run check:mirror` in this repository.

**Expected:** The test passes and fails with the change reverted. The generated
project's `probe` entry has `description`, `from` and `source`. `check:mirror`
passes.

---

#### T2-02: An old CLI makes `open` refuse, and nothing starts

**Type:** Integration\
**Source:** G6; plan Phase 2 and Phase 6 Validation; risk "version skew".
Branch: server, and again on skill.

**Steps:**

1. Make two fixture projects: one whose CLI exits 2 on `view` (pre-9.0.0), one
   whose `view` entries lack `description` (9.4.1-shaped). Use the stubs from
   the server item's tests, or the real v9.4.1 tag.
2. In each, run `scripts/cli.ts open --no-browser` (with the fixture as the
   working directory). Capture stdout, stderr and the exit code.
3. List the board's state folder (`$XDG_RUNTIME_DIR/pdocs-work-board` when that
   variable is set, else `$TMPDIR/pdocs-work-board-$(id -u)`) and
   `pgrep -f work-board/scripts/server.ts`.

**Expected:** Each exits non-zero (2, 5 or 6 as the plan assigns) with one error
envelope on stderr that names the project's pdocs version when it can be read
and says to run the `update-project-docs` skill. Stdout is empty. No pointer
file and no server process exists afterwards.

---

#### T2-03: The server refuses what it did not serve and what is not a write

**Type:** Integration\
**Source:** G5; plan Safety and risk "a local server that writes is reachable
from other pages". Branch: server (re-run on writes).

**Steps:**

1. On a temp copy `a`, run `open --no-browser` and note the `url` and its token.
2. Spy on spawns: set the server's log on (its log shows each `pdocs set`) and
   keep `git -C "$SCRATCH/a" status --short` open.
3. Send each of these to `POST /api/write` and `GET /api/snapshot` with `curl`,
   and record the status and the log:
   - the correct token in the header but `Origin: http://evil.example`;
   - a correct `Origin` but `Host: evil.example`;
   - no token header;
   - the token and `Origin` right, a body
     `{"kind":"triage","ref":"item/x;rm -rf /","lifecycle":"active"}` (a
     lifecycle outside `backlog`, `ready`, `dropped`), then a `restore` body
     whose key is `title`, then a body of an unknown `kind`, then a `ref` that
     is not in the snapshot.
4. Send one valid `triage` body.

**Expected:** Every request in step 3 is refused (4xx) and the log shows no
spawn; `git status` stays clean. The valid body in step 4 returns 200 and the
log shows exactly one `pdocs set`.

---

#### T2-04: A write followed by its Undo leaves the tree byte-identical

**Type:** Integration\
**Source:** G3, G4; plan Phase 2 and Phase 5 Validation; risk "two writers".
Branch: server (API), repeated through the browser in T2-08 and T2-09.

**Steps:**

1. Make copies `a` and `b`. In `a`, pick a triage item with no `priority` and no
   `parent` (so those fields are absent before the write).
2. Open the board on `a` with `--no-browser`. `POST /api/write` a `triage` body
   for that item: `lifecycle: ready`, `priority`, `parent: feature/<slug>`,
   `reviewed: true`. Keep the `restore` body from the response.
3. Run `diff -r "$SCRATCH/a" "$SCRATCH/b" -x .git` and confirm it differs only
   in that item's file.
4. `POST` the `restore` body. Run the `diff -r` again.
5. Repeat with a drop (`lifecycle: dropped`) and with a membership write
   (`cycle: <slug>`, then `cycle: null`).

**Expected:** After each Undo, `diff -r` prints nothing. The restore for the
first write unsets `priority` and `parent` rather than leaving them as empty
values. The Undo is built from the `before` values the write's own `set`
returned.

---

#### T2-05: The Inbox, candidates and blockers follow layout D

**Type:** Unit\
**Source:** G1; plan Phase 3 (the Inbox, "Candidates", "Blockers" rules).
Branch: model.

**Steps:**

1. Run `bun test plugins/project-docs/skills/work-board/app/model.test.ts`.
2. Confirm the file has tests for: one Inbox row per planned cycle whose
   `status` is not `stable` (with a snapshot holding two); "Needs a decision" as
   the first five row kinds and "Housekeeping" the rest; the nav count counting
   only the first group; a blocker id missing from the snapshot counting as
   open; candidates in `backlog` or `ready` with no cycle, `ready` first; a row
   rendered from an advisory's own `message` and `action`; a snoozed row waking
   on date or on a changed active cycle.
3. In a disposable copy revert each of those rules in turn and run the test
   file.
4. Run the test that feeds in a snapshot recorded from this repository.

**Expected:** The suite passes, each reverted rule turns a test red, and the
recorded snapshot yields a triage row and an archive row.

---

#### T2-06: The inspector never shows an item without a highlighted row

**Type:** Unit\
**Source:** G2; plan Phase 3 (selection rules); item DoD. Branch: model.

**Steps:**

1. Run `bun test plugins/project-docs/skills/work-board/app/selection.test.ts`.
2. Confirm tests for: selecting a key that is not in the current list is
   refused; `move(+1)` and `move(-1)` clamp, and from no selection go to the
   first and the last row; a change that removes the highlighted row moves the
   highlight to the row at that index, and clears the selection when the list is
   empty; Escape closes the Snooze menu, then the cycle chooser, then the
   inspector, one per press; changing tab, page or cycle clears the selection;
   "Added just now" empties on leaving the cycle page.
3. Revert the removal rule in a disposable copy and run the file.

**Expected:** All pass. Reverting the removal rule fails at least the test that
asserts the selection is always a member of the current list.

---

#### T2-07: Each page matches layout D's states for this tree's data

**Type:** UI/E2E\
**Source:** G1, G2; plan Phase 4 Validation. Branch: shell.

**Steps:**

1. Open the prototype
   (`docs/items/pdocs-work-board-mockups/artifacts/work-board-layouts.html`) in
   one tab and click layout D, then each state in `STATES_D`: 1 Now, 2 Cycle, 3
   Cycle with an item selected, 4 Candidates, 5 Inbox, 6 Triage, 7 Feature.
2. Open the real board (read-only, on this repository) in a second tab and reach
   the same seven views. For the Inbox confirm one row per planned cycle that is
   not stable and the two groups "Needs a decision" and "Housekeeping"; for the
   Cycle confirm "In this cycle" and "Candidates" tabs and a folded `done`
   group.
3. Screenshot each pair: `T2-07-state-<n>-<name>.png`.

**Expected:** For each state the structure matches: the same regions, group
order (`active`, `review`, `ready`, `backlog`, `triage`, `done` folded),
headings and available actions, with this tree's data in place of the sample
data. Only "Needs a decision" feeds the nav count. A difference in wording that
comes from live data is not a failure; a missing region or action is.

---

#### T2-08: Shell rules and keyboard: the inspector pushes, Escape unwinds

**Type:** UI/E2E\
**Source:** G2; plan Phase 4 ("seven shell rules"), keyboard bullet. Branch:
shell.

**Steps:**

1. On the Cycle page press `j` three times, then `k` once, and note the
   highlighted row each time. Press `k` repeatedly past the first row, then `j`
   past the last.
2. Press Enter on a row. With `getBoundingClientRect` on the centre column,
   compare its width before and after the inspector opens, and check that no
   element has `position: fixed` or `absolute` overlapping the centre column.
3. Open the Snooze menu on an Inbox row, then press Escape once; open the cycle
   chooser, press Escape; open the inspector, press Escape. Count the presses.
4. Count the scroll containers (elements with `overflow: auto|scroll` taller
   than their parent) on a page with the inspector open.
5. Click a different tab, then a different page, and confirm the inspector
   closes.

**Expected:** The highlight clamps at both ends and the inspector shows only the
highlighted item. The centre column narrows when the inspector opens, and
nothing overlays it. Escape closes exactly one thing per press, in that order.
At most two scrollers. The only floating elements are the Snooze menu and the
cycle chooser. Screenshot: `T2-08-inspector-open.png`.

---

#### T2-09: A change made in a terminal appears within one poll

**Type:** UI/E2E\
**Source:** G1; plan Phase 4 Validation ("within one poll"). Branch: shell.

**Steps:**

1. On temp copy `a`, open the board and go to the Cycle page. Note an item's
   `priority` as shown in its row.
2. In a terminal, in `a`, run
   `bun scripts/pdocs/cli.ts set item/<slug> --priority high` (choose a
   different value than shown).
3. Without touching the page, wait up to 6 seconds (the poll is 4 s). Screenshot
   `T2-09-after-terminal-set.png`.
4. Run `set` again to move one item from `backlog` to `ready` and watch its
   group.

**Expected:** The row shows the new priority within 6 seconds with no reload,
and the moved item changes group. The browser console has no error.

---

#### T2-10: Triage decision in the browser: one `set`, a command line, Undo

**Type:** UI/E2E\
**Source:** G3; plan Phase 5; item DoD. Branch: writes. Runs on temp copies `a`
and `b`.

**Steps:**

1. Open the board on `a` and go to Triage. Select the first waiting item.
2. Check that "Content reviewed" is unticked. Choose `ready`, priority `high`, a
   parent feature, and tick "Content reviewed". Apply. Screenshot
   `T2-10-applied.png`.
3. Read the last-write bar and the server log. Confirm the highlight is now on
   the next waiting item and the first item appears in the folded "Decided"
   list.
4. Click Undo. Run `diff -r "$SCRATCH/a" "$SCRATCH/b" -x .git`.
5. Repeat with a different item: choose Drop, type a reason, Apply, then Undo,
   and diff again. Confirm the reason was not written into any file.
6. Repeat once with "Content reviewed" left unticked and confirm the command in
   the bar has no `--status`.

**Expected:** Each apply runs exactly one `pdocs set`; the bar shows that
command, with `--status stable` only when the box was ticked. The item leaves
the queue and the highlight moves on. After each Undo the `diff -r` prints
nothing. The drop reason appears only as text for the agent to copy.

---

#### T2-11: Bring in and Take out, and only current cycles are offered

**Type:** UI/E2E\
**Source:** G4; plan Phase 5 and risk "joining an archived, closed cycle".
Branch: writes. Temp copies `a` and `b`.

**Steps:**

1. On `a`, open the active cycle's Candidates tab. Hover a candidate and click
   Bring in. Screenshot `T2-11-brought-in.png`. Check the "Added just now" group
   and that the tab or row flashed.
2. Select a candidate and press `b`; select an item in "In this cycle" and press
   `t`. Confirm Take out is not on the row, only in the inspector.
3. Check the cycle chooser lists only cycles whose `current` is true in
   `view portfolio --json`. Make a closed, archived cycle in `a` first if the
   tree has none, with `bun scripts/pdocs/cli.ts new cycle old-cycle` and then
   `archive` it.
4. Click Undo after Bring in, then run
   `diff -r "$SCRATCH/a" "$SCRATCH/b" -x .git`; do the same after Take out.
5. Leave the Cycle page and return.

**Expected:** Each action runs one `pdocs set` and shows its command. "Added
just now" lists the item and is empty after leaving and returning. The archived
cycle is not offered. After each Undo the diff prints nothing.

---

#### T2-12: A write the CLI refuses is shown and changes nothing

**Type:** UI/E2E\
**Source:** G3, G4; plan Phase 5 Validation (the refusal bullet). Branch:
writes. Temp copy `a`.

**Steps:**

1. Open the board on `a` and the browser console.
2. In the console, `fetch` `POST /api/write` (with the page's token, taken from
   `location`) with a `membership` body for a real item and
   `cycle: "no-such-cycle"`. The server refuses this itself with 409, before
   `pdocs set` runs. For a refusal from `set`, move the active cycle's file out
   of the copy between a poll and a click on "Bring in".
3. Read the last-write bar and the item's row. Run
   `git -C "$SCRATCH/a" status --short`.

**Expected:** The bar shows the refusal's `message` (and `choices`, if
returned). The item stays where it was, and `git status` is clean.

---

#### T2-13: A fresh agent opens the board in a generated project

**Type:** Manual\
**Source:** G7; plan Phase 6 Validation ("Walk"). Branch: skill. Needs the
person noted under Human actions required.

**Steps:**

1. Generate a project from a tree that includes the fields branch, and file two
   triage items with `bun scripts/pdocs/cli.ts new item <name>` (prerequisites).
2. Start a new agent session in that project with only the `work-board` skill
   available (install the built plugin from `dist/project-docs`, no other
   guidance). Say: "Open the work board."
3. Check the command the agent ran against `SKILL.md`: it must use the skill's
   own directory (not a `plugins/…` path) and `open`.
4. The person accepts one triage item at the board and brings it into a cycle.
5. Run `git status --short` in the project, then ask the agent to stop the
   board. Save the transcript to this feature's `sessions/` folder.

**Expected:** The agent opens the board unaided and tells the user what it is
for. Two changed item files show in `git status` (one write of each kind). The
board stops and `kill -0 <pid>` fails. No file the board itself wrote is in the
project.

---

#### T2-14: The same walk on a 9.4.1 project stops at `open`, and the fix works

**Type:** Manual, then Integration\
**Source:** G6; plan Phase 6 and Phase 7 Validation. Branch: skill (refusal);
repin (the fix).

**Steps:**

1. Generate a project from tag `project-docs-scaffold-template-v9.4.1`. Start a
   fresh agent with the skill and say "Open the work board."
2. Confirm it stops at `open` with the `update-project-docs` message and does
   not try to start the server another way.
3. After the repin branch, run `update-project-docs` (its case 3, "Behind, no
   migration") in that project, then `open` again.
4. Run `bun test plugins/project-docs/skills/update-project-docs` and
   `npm run check:dist` in this repository.

**Expected:** Step 2 refuses with one error naming 9.4.1 and the fix. Step 3
refreshes `scripts/pdocs/`, after which the board opens. The tests and the dist
check pass, including the `SCAFFOLD_TAG` pin test and `OWNED_RELEASES`.

---

#### T2-15: A second `open` reuses the board, and the repository stays clean

**Type:** Integration\
**Source:** G1; plan Lifetime and Safety (pointer file, no writes into the
adopter's repository). Branch: server.

**Steps:**

1. On temp copy `a`, run `open --no-browser` twice and compare the two printed
   `url` values.
2. List the board's state folder (`$XDG_RUNTIME_DIR/pdocs-work-board` when that
   variable is set, else `$TMPDIR/pdocs-work-board-$(id -u)`).
3. Run a triage write through the API, then `git -C "$SCRATCH/a" status --short`
   and `git -C "$SCRATCH/a" ls-files --others --exclude-standard`.
4. Run `stop` and list the pointer directory again.

**Expected:** Both `open` calls print the same `url`. One pointer file exists,
keyed by the root, and it is gone (or stale and ignored) after `stop`. The only
changed file in `a` is the written item; there is no untracked file.

---

#### T2-16: The board runs from the plugin cache path

**Type:** Manual\
**Source:** Plan Key Risks ("Bun's HTML import behaves differently from a plugin
cache path"). Branch: shell.

**Steps:**

1. Copy `plugins/project-docs/skills/work-board` to
   `~/.claude/plugins/cache/<scratch name>/work-board` (or any path outside the
   repository).
2. From the repository root run `bun <that path>/scripts/cli.ts open`.
3. Open the page, take a screenshot `T2-16-from-cache.png`, and read the
   console.

**Expected:** The page renders as in T1-04 with no console error. If bundling
fails there, record that in the shell session and apply the plan's fallback
(serving `app/*.ts` through `Bun.Transpiler`), then repeat.

---

### Tier 3 — Edge Cases & Robustness

_Deferred unless the plan changes._

#### T3-01: A 40-item cycle and a 1024px window

**Type:** Manual\
**Source:** Plan Non-Goals and Phase 4 (record, do not redesign).\
**Deferred rationale:** The plan asks the implementer to record how the shell
behaves, not to pass or fail it, and treats layout changes as follow-on work.
The shell item's session holds the observation. Run it once: a fixture cycle of
40 items, and a window resized to 1024px wide; screenshot both and note what
breaks.

---

#### T3-02: The server's 30-minute idle exit

**Type:** Integration\
**Source:** Plan Lifetime.\
**Deferred rationale:** Waiting half an hour is not worth a scenario, and a
timer override would be a test-only code path. Cover it by a unit test of the
idle check with a fake clock if the server item makes one; otherwise leave it.

---

#### T3-03: Two writers racing

**Type:** Manual\
**Source:** Plan Key Risks ("two writers"; `set` has no lock).\
**Deferred rationale:** A real race needs timing the agent cannot control. T2-04
and T2-09 already show that each write is one file and one call, and the poll
shows the result. A lock in `set` is a stated non-goal.

---

#### T3-04: Strict review mode refusal (exit 6) and returned advisories

**Type:** Integration\
**Source:** Plan Phase 5 ("exit 6 under `strict` review mode").\
**Deferred rationale:** It needs a fixture set to `strict`, and the refusal path
is the same one T2-12 shows for exit 2. Cover it with a `lib/writes` unit test
if cheap.

---

#### T3-05: Re-check the Inbox and Feature pages after item #210 lands

**Type:** UI/E2E\
**Source:** Plan Phase 6 ("After item #210 lands…"); Key Risks.\
**Deferred rationale:** It cannot run until #210 is on `develop`. When it has,
repeat the Inbox rows in T2-07 states 5 and 7 and confirm the archive advisory
still renders from its own `message` and `action`.

---

#### T3-06: Snooze persistence across reloads and roots

**Type:** UI/E2E\
**Source:** Plan Phase 3 (snooze in `localStorage`, keyed by root).\
**Deferred rationale:** The wake rules are unit-tested in T2-05. The browser
storage wiring is a per-viewer convenience and a bug there costs a reappearing
row.

---

#### T3-07: Older Bun and Windows paths

**Type:** Manual\
**Source:** Plan assumptions (Bun on adopters' machines).\
**Deferred rationale:** The plan names only Bun 1.4.4. No older Bun or other OS
is available to this plan.

---

## Out of Scope

- **The robust level** (lifecycle or priority changes outside triage, the "Plan
  next cycle" page, accepting an agent's proposals one by one, drag, Kanban).
  The feature defers them.
- **Codex.** The skill is excluded from `dist/codex-project-docs/`; the only
  check is that nothing is copied there (T1-05).
- **Widths under 1280px and cycles of more than 11 items as design work.** Only
  the recorded observation in T3-01.
- **A channel from the board to the agent** (a `tail` verb). It is an open
  question, not a requirement.
- **Editing prose, creating items, batch writes, dry runs, transition rules and
  a write lock in `pdocs set`.** The plan's Non-Goals.

---

## Results Addendum

_Filled in during and after test execution by the implementing agent._

| Scenario | Status | Notes |
| -------- | ------ | ----- |
| T1-01    |        |       |
| T1-02    |        |       |
| T1-03    |        |       |
| T1-04    |        |       |
| T1-05    |        |       |
| T2-01    |        |       |
| T2-02    |        |       |
| T2-03    |        |       |
| T2-04    |        |       |
| T2-05    |        |       |
| T2-06    |        |       |
| T2-07    |        |       |
| T2-08    |        |       |
| T2-09    |        |       |
| T2-10    |        |       |
| T2-11    |        |       |
| T2-12    |        |       |
| T2-13    |        |       |
| T2-14    |        |       |
| T2-15    |        |       |
| T2-16    |        |       |
| T3-01    |        |       |
| T3-02    |        |       |
| T3-03    |        |       |
| T3-04    |        |       |
| T3-05    |        |       |
| T3-06    |        |       |
| T3-07    |        |       |

**Blocked scenarios:** none yet. T2-14 step 3 waits for the repin branch and a
scaffold release with the fields, and T3-05 waits for item #210.

## Visual Artifacts

_Screenshots captured during UI/E2E verification._

**Screenshot directory:**
`docs/features/pdocs-work-board/artifacts/screenshots/`

**Naming convention:** `<scenario-id>-<short-name>.png`.

| Scenario | Screenshot                     | Description                                |
| -------- | ------------------------------ | ------------------------------------------ |
| T1-04    | `T1-04-now.png`                | Now page, no console errors                |
| T1-04    | `T1-04-inbox.png`              | Inbox with the two groups                  |
| T2-08    | `T2-08-inspector-open.png`     | Inspector pushing the centre column        |
| T2-09    | `T2-09-after-terminal-set.png` | Row updated by a terminal `pdocs set`      |
| T2-10    | `T2-10-applied.png`            | Triage decision applied, command bar shown |
| T2-11    | `T2-11-brought-in.png`         | "Added just now" after Bring in            |
| T2-16    | `T2-16-from-cache.png`         | Board served from outside the repository   |
