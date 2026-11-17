---
type: report
title: Work board foundations
description:
  What the pdocs CLI already gives a work board and what it lacks, and where
  bounty and Scriptorium each stop.
tags: [pdocs, work-board, cli, spellbook]
status: draft
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# Work board foundations

- **Report type:** survey of existing tools, by running them.
- **Scope:** `pdocs` 9.4.1 in this repository (`scripts/pdocs/`), and the
  Spellbook 6.0.0 plugin as installed at
  `~/.claude/plugins/cache/spellbook-marketplace/spellbook/6.0.0/skills/`.
- **Not a design.** This report says what exists and where each tool stops. It
  ends with a gaps list and an overlap list and recommends nothing.

## Summary

- Every `pdocs view` is available as JSON, runs in about 0.05 s on this tree,
  and carries an `advisories` array. A read-only board can be drawn from two or
  three calls per screen.
- The view JSON has no `description`, `from` or `source`, and `find` has
  `description` but no `priority`, `blockedBy`, `from` or `source`. No single
  call returns what a triage inbox needs.
- Views group by four state groups, not by lifecycle. Lifecycle columns are a
  client-side regrouping of the `lifecycle` field each entry carries.
- There is no rank or order field. Order is priority, then `generated.at`, then
  path. A drag that reorders cards inside a column has nothing to write.
- `pdocs set` covers every field change a board might make, validates values and
  references, and refuses what the lint would newly report. It does not check
  transitions (any lifecycle to any other is accepted), it accepted joining an
  item to an archived, closed cycle, and it cannot record a drop reason, which
  lives in the body.
- There is no watch or serve mode. A live surface polls, or watches files
  itself.
- The model can be imported in-process (`work.ts`, `advisories.ts`); the write
  logic cannot, because it lives inside `set.run`, which prints and writes.
- Bounty is a board of its own in-memory tasks with four fixed columns. Its
  skill text excludes this use by name. Scriptorium reads project-docs
  frontmatter generically (`type`, `status`, `lifecycle`, tags) and has a map of
  a folder's documents, but knows nothing of `parent`, `cycle`, `priority` or
  `blocked_by` as work fields.

## What was run

All commands from the repository root. `pdocs` below means
`bun scripts/pdocs/cli.ts`.

Against the real tree, read-only:

```bash
pdocs --help
pdocs view backlog --json
pdocs view board --json
pdocs view board --features --json
pdocs view ready --json
pdocs view portfolio --json
pdocs view unreviewed --json
pdocs view unreleased --json
pdocs view released --json          # exit 2, needs a version
pdocs view feature pdocs-work-board --json
pdocs view cycle 2026-11-check-fixes-and-board-research --json
pdocs view cycle 2026-10-v3-migration-feedback --json   # a planned cycle
pdocs find --type item --lifecycle triage --json
pdocs find --type item --lifecycle ready --json
pdocs find --type cycle --json
pdocs graph --json
pdocs schema
pdocs set|new|archive|promote|view|find|graph --help
```

Writes were run only against a copy of `docs/` and `.project-docs.json` in a
scratch folder, through `--root <copy>`: about twenty `pdocs set` calls and two
`pdocs archive` calls, listed under [Writes](#i-writes-a-board-might-make). The
real tree was not written to, apart from creating this report.

The tree on 2026-11-17: 416 markdown files under `docs/`, 383 pages in the
graph, 148 live items, 25 live features, 2 current cycles (1 active, 1 planned),
10 archived cycles. No item is in `triage` today.

## Part 1: the pdocs CLI

### Shapes

Every JSON answer is an envelope: `{ ok, data, meta: { command } }`. A failure
is
`{ ok: false, error: { kind, exit_code, retryable, message, choices?, hint?, details? }, meta }`
on stderr, with stdout empty.

One entry shape serves every view (`ViewEntry` in
`scripts/pdocs/commands/view.ts`):

```text
path, entity (item|feature|cycle), slug, id, title, status, kind, lifecycle,
group (unstarted|started|completed|cancelled), priority, assignee, parent,
cycle, scope, blockedBy[], releasedIn, archived, date
```

It has no `description`, `from`, `source` or `tags`, and nothing about the
documents an entity owns. `blockedBy` holds full item ids, not titles or states.

| Call                    | `data` holds                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `view backlog`          | `items[]`: every item in the unstarted group (triage, backlog, ready)                                                               |
| `view board`            | `groups.{unstarted,started,completed,cancelled}[]`, `reviewMode`; live items; `--features`, `--all`                                 |
| `view ready`            | `items[]`: `ready` items whose blockers are all `done`; `reviewMode`                                                                |
| `view feature <slug>`   | `feature`, `items[]` whose `parent` names it                                                                                        |
| `view cycle <filename>` | `cycle`, `items[]` whose `cycle` names it, `closable`, `reviewMode`                                                                 |
| `view portfolio`        | `cycles[]` and `features[]`, each with `counts` per state group; `unattached` counts; `activeCycle`                                 |
| `view unreviewed`       | `items[]`: `done` items whose `status` is not `stable`                                                                              |
| `view unreleased`       | `items[]`: `done` features and items with no `released_in`                                                                          |
| `view released <v>`     | `items[]` naming that version                                                                                                       |
| `view scope <name>`     | `items[]` (not run)                                                                                                                 |
| `find`                  | `matches[]`: path, slug, tier, type, title, **description**, status, lifecycle, tags, date, id, kind, parent, cycle, scope; `count` |
| `graph`                 | `pages`, `byTier`, `byType`, `tags`, `hubs[]`, `nodes[]` (path, tier, type, title, tags, related, linksOut, linksIn)                |

Every view also has `advisories[]`, empty when there are none.

`graph` is the document link graph (253 KB here). Its nodes carry no lifecycle,
status, parent, cycle or blockers, so it does not answer work questions.

### The candidate needs

**a) Triage inbox.** Several calls, and still incomplete.
`pdocs find --type item --lifecycle triage --json` gives title, kind and
description but no priority, assignee, blockers, `from` or `source`.
`view backlog` gives priority, assignee, parent, cycle and blockers but no
description, and mixes triage with backlog and ready. Neither returns `from` or
`source`; 67 item files here carry one of them. A surface would join the two
calls by `id` and still read each file for `from`, `source` and the body. There
is no `view triage`. The triage shape was inferred from other lifecycles, as the
inbox is empty today.

**b) What is active and what is waiting, by feature and by cycle.** Two calls.
`view board --features --json` returns every live item and feature, each with
`parent` and `cycle`, so the grouping is done by the caller. It groups by state
group only: `active` and `review` arrive together as `started`, and `triage`,
`backlog` and `ready` as `unstarted`. Cycles are not on the board;
`view portfolio --json` lists current cycles and features with counts per group,
but not their items.

**c) Cycle Kanban.** `view cycle <filename> --json` is one call and works the
same for a `planned` cycle (run on `2026-10-v3-migration-feedback`: 9 items,
`closable: false`). Items come as one flat list; columns by lifecycle are the
caller's regrouping. For candidates to pull in there is no call. `view ready`
returns unblocked `ready` items in every cycle, so the caller filters
`cycle === null`. `find` cannot express "no cycle": `--cycle ""` returned zero
matches with exit 0, and so did `--lifecycle ready,backlog`. `find` takes one
value per filter and does not refuse an unknown lifecycle.

**d) A feature's progress.** One call for the items:
`view feature <slug> --json` includes archived children (checked on the copy: an
archived item came back with `archived: true`). Counts per group are in
`view portfolio`. Nothing returns the feature's owned documents (plan, test
plan, design resolution, sessions) or their lifecycles;
`find --type plan --json` lists plans but the owner is only in the path.

**e) Blocked items and ordering.** No call. Entries carry `blockedBy` ids; there
is no `blocked` flag, no blocker title or state, and no view of blocked items.
`view ready` applies the rule (every blocker `done`) but only for `ready` items,
and only by leaving the blocked ones out. A caller resolves ids against
`view board --all`, since a finished blocker may be archived. Five live items
have blockers today. Ordering is `workOrder` in `scripts/pdocs/work.ts`:
priority (`urgent`, `high`, `medium`, `low`, none), then `generated.at`, then
path. A cycle has an `after` field, which the view entry does not carry.

**f) Unreviewed items that cannot start.** `view unreviewed` is a different
thing: finished items never marked `stable` (38 here). Whether an unstarted item
is reviewed is the `status` field on every entry. `view ready` and `view cycle`
on a planned cycle add a `work-item-review` advisory with reason `on-start` for
draft items; both were empty today. "Cannot start" holds only under
`checks.workItemReview.mode: strict`, which this repository does not set
(`reviewMode: "warn"` in the JSON). Under `warn` a draft starts and the write
returns an advisory.

**g) Advisories.** One call, already there. Ids seen in source:
`archive-threshold`, `work-item-review`, `bad-config`, `template-header`
(`scripts/pdocs/advisories.ts`). Each has `id`, `setting`, `message`, `action`
and `refs[]`; the archive one adds `types[].candidates[]`, the review one
`items[]` with a `reason`. Today `view board` returns one: 82 finished items
unarchived, over the threshold of 25. `pdocs set` returns advisories too.

**h) Change notification.** Nothing. There is no watch, serve or listen code
under `scripts/pdocs/` (searched), and no version, hash or modified time in any
answer, so a poller compares whole answers. Timings on this machine, as spawned
processes:

| Call                              | Wall time      |
| --------------------------------- | -------------- |
| any `view … --json`               | 0.05 to 0.06 s |
| `graph --json`                    | 0.03 to 0.04 s |
| `check --json`                    | 0.18 s         |
| in-process import, model, 3 views | 0.053 s        |

#### i) Writes a board might make

All through `pdocs set <ref>`, one entity per call, where `<ref>` is
`item/<slug>`, `feature/<slug>`, `cycle/<filename>`, a full item id or an id
prefix of 8 or more characters. A success returns
`{ path, changes[{key, before, after, changed}], advisories[] }`.

| Board action         | Command                             | Observed on the copy                                                                                                                                                              |
| -------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Move between columns | `set <ref> --lifecycle <state>`     | Value checked against the type's states (exit 2 with `choices`). No transition rule: `backlog` to `done` to `triage` to `active` to `dropped` all accepted                        |
| Start a draft item   | `set <ref> --lifecycle active`      | `warn`: exit 0 plus a `work-item-review` advisory. `strict`: exit 6, `kind: conflict`, nothing written                                                                            |
| Mark reviewed        | `set <ref> --status stable`         | Accepted. May be combined with the start in one call, which then passes under `strict`. Nothing checks that a person reviewed it                                                  |
| Set priority         | `set <ref> --priority high`         | Closed set; `top` refused, exit 2                                                                                                                                                 |
| Pull into a cycle    | `set <ref> --cycle <filename>`      | Unknown cycle refused, exit 2. A planned cycle accepted. The active cycle accepted with an advisory for a draft item. **An archived, closed cycle was accepted with no advisory** |
| Take out of a cycle  | `set <ref> --unset cycle`           | Accepted                                                                                                                                                                          |
| Set parent           | `set <ref> --parent feature/<slug>` | Must be `feature/<slug>`; a bare slug and an unknown feature both refused, exit 2                                                                                                 |
| Set blockers         | `set <ref> --blocked-by <ref,ref>`  | Replaces the whole list. Unknown ref refused; a loop refused (`BLOCKED CYCLE`), exit 2                                                                                            |
| Drop                 | `set <ref> --lifecycle dropped`     | Accepted with no reason. The reason is a line in the body, which `set` never touches (`triage-items` step 5 has the agent edit the file)                                          |
| Archive              | `archive <ref>`                     | Only `done` or `dropped` (or a `closed` or `abandoned` cycle); otherwise exit 2. Moved the file and rewrote 5 links in 4 files                                                    |

Also true of `set`: it refuses a change that would make `pdocs check` report
something new; an unknown flag is exit 2 with every valid flag in `choices`;
`title`, `description`, `assignee`, `scope`, `kind`, `from`, `source` and
`released_in` are settable; a value already held is reported `changed: false`
and the file is left byte-identical.

Not expressible:

- Reordering inside a column. There is no rank field; `--rank` is an unknown
  flag.
- A drop reason, a review note, or any body text.
- Several entities in one call, or a dry run. A triage of twenty items is twenty
  processes, each re-reading the tree.
- Unarchive. No verb moves an entity back out of `_archive/`.
- Any guard against two writers. `set` reads, checks and writes one file with no
  lock.

### Text and JSON

Format defaults to text on a terminal and JSON otherwise; `--json` forces it.
Nothing is only in text. Text shortens ids to 12 characters, shows
`lifecycle  priority  path — title`, tags a non-stable item `[draft]`, and
prints an advisory as `advisory (<id>): <message>` and `next: <action>`. Text
omits kind, parent, cycle, blockers, assignee, scope and the advisory's refs.
`find` text omits the description.

### Exit codes

| Code | Meaning for a surface                                                     |
| ---- | ------------------------------------------------------------------------- |
| 0    | Done. A write may still carry advisories                                  |
| 1    | Fault inside pdocs                                                        |
| 2    | Bad call, and also every validation refusal from `set` and `archive`      |
| 5    | No docs root or no `.project-docs.json`                                   |
| 6    | Conflict: the document exists, or `strict` review mode refused the change |
| 9    | `check` only: it ran and the tree is dirty                                |

A refused value and a mistyped flag are both exit 2 and `kind: usage`. They are
told apart by the message, or by `choices` and `details.token` when present.

### Import or spawn

`scripts/pdocs/cli.ts` runs `main()` only under `import.meta.main`, so its
modules import cleanly. This ran in 53 ms and matched the CLI's counts:

```ts
import { treeContext } from "./scripts/pdocs/cli.ts";
import {
  collectWork,
  viewBoard,
  viewReady,
  viewPortfolio,
} from "./scripts/pdocs/work.ts";
import { adviseArchive, reviewViolations } from "./scripts/pdocs/advisories.ts";
const ctx = treeContext(process.cwd());
const model = collectWork(ctx);
```

`work.ts` states the intent: the views are pure functions "so a UI can import
them and get exactly what `pdocs view` prints". An imported `WorkEntity` is
richer than the JSON entry: it has `from`, `folder`, and `fields`, the whole
frontmatter map, so `fields.get("description")` and `fields.get("source")` are
there. The mapper that makes the JSON entry (`entry` in `commands/view.ts`) is
not exported.

Writes are different. The logic of `set` is the body of `set.run`
(`scripts/pdocs/commands/set.ts`), which prints its result and writes the file;
`archive.run` is the same. Neither has an exported function that returns data. A
surface that writes must spawn the CLI.

Importing also assumes the surface sits beside the tree's own `scripts/pdocs/`.
That folder is installed into each project by the scaffold and changes at every
release.

## Part 2: prior art as built

### The shared surface pattern

Sources: `skills/README.md`, the bounty, Scriptorium and astrolabe `SKILL.md`
files, the `agent-surface-bun` recipe at
`~/Projects/skill-garden/plugins/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md`,
and module names in the built bundles.

- **Three actors.** A detached daemon (`Bun.serve`) holds the canonical state.
  The agent runs a stateless `cli.ts`, one HTTP round trip per verb
  (`POST /cmd`, `GET /state`, `GET /events`). The browser talks to the same
  daemon over a WebSocket and receives full state on each change.
- **Opening.** `bun <skill>/scripts/cli.ts open` spawns the daemon, opens the
  browser, and prints `{ url, port, session_id, … }`.
- **Events to the agent.** `cli.ts tail` prints one JSON line per event. The
  agent wraps it in Monitor with a 30 minute timeout; the tail ends itself
  before the cap with a line naming the next command, including `--since`.
  Keepalives go to stderr. Each event carries who caused it; an agent's own
  events are suppressed or marked.
- **Agent to human.** Bounty has `message`, a toast. Scriptorium has `say`
  (chat), `task` (chat plus a queue entry) and `note` (pinned to a passage).
  Astrolabe has `status` and `attention`.
- **Sessions.** Discovery by a pointer file, `--session <id>`, and in bounty a
  `--session-key` that derives a stable id per repository. State is snapshotted
  to a home folder (`~/.bounty`, `$SCRIPTORIUM_HOME`) and restored with
  `open --restore <id>`. An idle timeout closes the daemon.
- **Errors.** One JSON envelope on stderr, exit 2 usage, 5 not found, 6
  conflict, 1 internal. This is the same envelope and the same codes as `pdocs`.

What a new surface gets from the shared kit (`src/kit/` in the Spellbook source
at `~/Projects/spellbook`, seen as module names in every built bundle): the verb
registry and flag parsing, error envelopes, session discovery, the event log
with cursors, SSE, the tail and its Monitor hand-off, heartbeat, housekeeping,
origin checks and static serving. Scriptorium's surface also draws on a kit
workspace shell: a file tree, a document pane, chat, notes and tasks panels,
toasts and dialogs.

What it must build: its own state shape and verbs, its event frames, its browser
surface, its snapshot format, and its `SKILL.md`. Spellbook's
`scaffold/README.md` says there is no template to copy yet and points at a
playbook. Each spell ships a committed `dist/`; `scripts/cli.ts` is a three line
launcher.

Digestify is the one-shot form: content in, one submit, JSON on stdout, exit.
Magpie is a standing surface with a four step process the human seals step by
step. Neither bears on a board beyond the pattern.

### Bounty

- **A board of what.** Its own tasks, held in the daemon's memory and saved to
  `~/.bounty/snapshots/<session_id>.json`. It reads and writes no project files.
  `add`, `init --stdin-tasks` and the browser are the only ways tasks arrive.
- **Data model** (`bounty/shared/types.ts`):
  `Task { id, title, status, notes?, owner?, tags?, size?, expect?, blockedBy?, enteredStatusAt?, statusHistory? }`
  and `BoardState { title, tasks[] }`. `status` is a closed set of four: `todo`,
  `doing`, `review`, `done`. Order within a column is the array order, and
  `task.move` carries an `index`.
- **Views.** One: a four column Kanban, with a filter bar by tag and owner, a
  detail dialog, toasts, a blocked badge, and an overrun badge on a sized card.
- **What the human can do.** Drag a card between and within columns, click a
  status pill, edit a title inline, edit notes in the dialog, add a task, delete
  a task, close the board.
- **Its ancestor.** `docs/features/tusk-board/feature.md` in this repository
  describes the same board with three columns, built to prove the duplex form of
  the recipe.

Evidence on whether a project-docs board could be a mode of bounty:

| Aspect            | Bounty                                                                       | project-docs items                                                                |
| ----------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Source of truth   | Daemon memory and a snapshot                                                 | Markdown files in the repository                                                  |
| Who may write     | Anyone, any transition; "the daemon accepts any transition from anyone"      | `pdocs set`, validated like the lint; `strict` mode can refuse a start            |
| States            | 4, closed                                                                    | 7 for an item, 6 for a feature, 4 for a cycle                                     |
| Hierarchy         | None; flat tasks, `tags`, `owner`                                            | `parent` feature, `cycle`, `scope`                                                |
| Order in a column | Explicit, by index                                                           | Derived; no field                                                                 |
| Add and delete    | Both, from the browser                                                       | `pdocs new`; deletion is refused by the lint (`ITEM DELETED`), an item is dropped |
| Lifetime          | A session with an idle timeout                                               | The repository's history                                                          |
| Shared with       | `blockedBy` with a cycle guard, `review` column, owner/assignee, live duplex | the same ideas under other names                                                  |

Bounty's own description rules this use out: "Do NOT use for … the repo's
`docs/items` work board (that is pdocs)", repeated in its body.

### Scriptorium

- **What it is.** A session over real files and folders: a file tree, one open
  document with versions, and a conversation. The human edits and saves; the
  agent proposes versions.
- **Frontmatter.** It parses YAML frontmatter and reads `type`, `title`,
  `description`, `status`, `tags`, `lifecycle`, `generated.at`, `verified` and
  `stale_after` (`readMeta` in `dist/server.js`). These are the universal keys
  of this repository's schema, so it reads project-docs documents. It has no
  knowledge of `kind`, `priority`, `parent`, `cycle`, `blocked_by`, `scope` or
  `id` as work fields.
- **`find`.** An agent verb:
  `find [--type] [--status] [--lifecycle] [--tag] [--since]` over the session's
  documents. No `--kind`, `--parent` or `--cycle`. Not shown to the human as a
  view.
- **`--kind` and profiles.** `--kind` on `graph` is the kind of a matched
  profile (`_meta/profiles/<kind>.json` in the folder), else the frontmatter
  `type`. It is not an item's `kind`. This repository has no such profile files.
- **References.** Any frontmatter value that looks like a path or a `type/slug`
  reference becomes a `frontmatter` edge. Its `SKILL.md` says a reference such
  as `feature/some-slug` lands in `link-check`'s `unresolved` list: "Scriptorium
  does not know the convention it was written in, and does not guess." A
  `cycle:` value is a bare slug and a `blocked_by` value is an id, so neither is
  an edge at all.
- **What is board-like.** Three things. The sidebar marks a row that is `draft`,
  `deprecated`, stale or unreadable (`statusMark.ts`). The document header shows
  `type`, `status` and `lifecycle` as chips (`FrontmatterHeader.tsx`). A set has
  a map (`MapView.tsx`): its documents in columns by kind or `type`, a status
  dot on each, body links and frontmatter references as edges, capped at the 140
  best connected. None of these lists documents by lifecycle, and none shows
  parent, cycle or blockers.
- **Where its job ends here.** It shows and edits one document at a time and the
  links between documents. It has no notion of an item's state as something to
  move, of a cycle's contents, or of a feature's progress.
  `meta-set <path> <key=value>` edits a frontmatter line without the checks
  `pdocs set` makes.
- **Handing a document to it.** By verb, not by URL. `open <path…>` starts a
  session with those paths in the sidebar and prints its `url`; it opens no
  document. `add <path…>` adds to a running session.
  `show --doc <absolute path> [--heading <text>]` opens the document in the
  human's view and says so in the chat. The surface bundle reads no query
  parameter or hash for a document, so there is no link form that opens one.

### Astrolabe

Not named in the brief, but it is the installed spell closest to a dashboard:
"one browser surface showing the live state of every project in flight". Its
cards are projects, registered by path, each with a status line an agent posts,
a presence light, and a "needs you" flag; the human can nudge a card. It holds
no items, cycles or features and reads no project files. Only the first 140
lines of its `SKILL.md` were read.

## Gaps

What the CLI lacks for each need, as observed.

- **a) Triage inbox.** No call returns description with priority and blockers;
  none returns `from` or `source`; no triage view; the unstarted group mixes
  triage with backlog and ready.
- **b) Active and waiting.** No grouping by lifecycle, feature or cycle in any
  answer; cycles are absent from `view board`; `review` is not separated from
  `active`.
- **c) Cycle Kanban.** No columns; no "ready and in no cycle" query; `find`
  filters take one value, have no negation, and accept an unknown lifecycle
  silently.
- **d) Feature progress.** No owned documents or their lifecycles; counts and
  items come from two different views.
- **e) Blocked.** No `blocked` flag, no resolved blockers, no view of blocked
  items; no rank field; a cycle's `after` is not in the view entry.
- **f) Reviewed before start.** No view of unstarted drafts; the name
  `unreviewed` belongs to a different audit.
- **g) Advisories.** None found.
- **h) Change notification.** No watch mode and no change token.
- **i) Writes.** No transition rule; joining an archived, closed cycle is
  accepted; no drop reason; no reorder; no batch; no dry run; no unarchive; no
  write lock; no importable write function; refusals and typos share exit 2.

## Overlap

What existing tools already cover.

- **pdocs views as JSON:** every list a board would draw, the review mode, and
  advisories with the command that acts on them.
- **pdocs `set` and `archive`:** every field change, with the lint's checks, and
  link rewriting on archive.
- **`work.ts` and `advisories.ts` as a library:** the model with full
  frontmatter, in-process, in about 50 ms.
- **The `triage-items` skill:** the triage proposal and its application, in
  chat.
- **Bounty:** a live four column Kanban with drag between and within columns,
  inline edit, blockers with a cycle guard, a review column, owner filters,
  toasts, multi-agent tails, snapshots and restore. Over its own tasks only.
- **Scriptorium:** opening, reading, reviewing and editing any document; a
  status mark per file; type, status and lifecycle chips on a document; a map of
  a folder's documents by type with link and frontmatter edges; `find` by type,
  status, lifecycle and tag for the agent; a file watcher that reports a
  document changed on disk.
- **Astrolabe:** a standing cross-project dashboard with status, presence and an
  attention flag per project.
- **The Spellbook kit:** daemon, thin CLI, tail with Monitor hand-off, session
  discovery, event log, error envelopes that match pdocs' own.

## Not checked

- No Spellbook surface was opened. Bounty, Scriptorium and astrolabe were read
  from their `SKILL.md`, their `help` output (Scriptorium), their shared types
  and their built bundles, not used in a browser.
- The Spellbook source at `~/Projects/spellbook` is newer than the installed
  6.0.0. Source files were read only where the installed bundle names the same
  module.
- Astrolabe beyond line 140; glamour, imago, grapevine and mind-mapper at all;
  digestify and magpie beyond a glance.
- `view scope`, `view released <version>`, `backlinks`, `orphans`, `promote`,
  and `new` for items, features and cycles.
- `set` on a feature or a cycle, and `strict` mode beyond one start and one
  combined start.
- Two writers at once; behaviour on a tree far larger than this one; timings on
  another machine.
- The triage JSON with real triage items, as none exist today.
- How a surface outside this repository would locate a project's
  `scripts/pdocs/`.

## Related Documentation

- [A work board for project-docs: what we have, the landscape, and what to build](../item.md)
- [The write-up this report feeds](../write-up.md)
- [pdocs work board](../../../features/pdocs-work-board/feature.md)
- [Tusk Board](../../../features/tusk-board/feature.md)
