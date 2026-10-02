---
name: "sweep-project"
description: >
  Reconcile a feature or a work item against what was actually built, write its
  terminal state, and — with the human's confirmation — archive it with `pdocs
  archive`, which rewrites every link to it. Use when a feature or item might be
  finished, when a plan has drifted from what was actually implemented, or when
  sweeping already-completed work that was never closed. Also closes a cycle
  whose items are all done and, on confirmation, archives a closed one, and
  records `released_in` when a person supplies the version. Triggers when the
  user says "is this project done", "is this feature done", "archive this
  project", "sweep this project", "reconcile the plan", "check if we can archive
  this", "clean up completed projects", "did we ever archive that", or "this
  project looks finished". Also sweeps a cycle: "close this cycle", "is the
  cycle done", "sweep the cycle". Also acts on a `pdocs view` archive advisory
  (`archive-threshold`): "the board says to archive", "archive the finished
  items". Also audits finished items never marked reviewed: "audit unreviewed
  items", "review the unreviewed items".
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
---

# Sweep Project

Reconcile a feature or a work item against what was actually built, and close it
out if it's done. ("Project" is the everyday word; in the docs a body of work is
a **feature**, and one unit of it is a **work item**.)

**Archival is one outcome among several, not the goal.** Most runs happen
because someone _suspects_ the work might be finished. Often it isn't — and a
run that reconciles the documents, records what's left, and moves nothing is a
successful run, not a failed one. So is one that writes a terminal `lifecycle`
and deliberately leaves the folder in place, and so is one that closes a cycle.
The skill is named for the pass over the work, not for a terminal action that is
conditional.

## When to Use

**Use this skill when:**

- A feature or a work item might be finished and you want to know for sure
- A `plan.md` has drifted from what was actually implemented — unticked boxes, a
  stale `lifecycle`, phases that shipped without a note
- You're sweeping up already-completed work that was never closed
- `finalize-branch` Step 6 found every item of a feature `done` or `dropped` and
  asked whether this completes the feature
- A **cycle** may be finished — `pdocs view cycle` reports it `closable` — and
  needs its Outcome written and its `lifecycle` closed
- A release shipped and a person can say which version first carried the work
  (`released_in`)
- A `pdocs view` ended with an **archive advisory** (`archive-threshold`):
  finished work has outgrown the view. Take **The Advisory Path** below
- The user wants to audit finished items whose document was never marked
  reviewed (`pdocs view unreviewed`). Take **The Audit Path** below

**Don't use this skill for:**

- Reviewing a single document for accuracy — use a read-only documentation
  review that recommends changes rather than acting
- Deciding whether work _should_ be done — that's triage (`triage-items`) or a
  research item
- Moving files around for organizational reasons unrelated to completion

## Prerequisites

Before starting, verify:

- **A repo-root anchor.** Set this first and use it in every command — `git`
  subcommands print and resolve paths relative to the current directory, so a
  bare `docs/...` path silently does the wrong thing when the session's cwd is a
  subdirectory:

  ```bash
  ROOT=$(git rev-parse --show-toplevel)
  ```

- **The CLI.** `pdocs` below means `bun scripts/pdocs/cli.ts`, run from `$ROOT`
  (or with `--root "$ROOT"`). It reads the docs root from `.project-docs.json`
  itself. Paths in this file are written with the default docs root, `docs/`.

- **The work layout.** This skill works on `docs/features/` and `docs/items/`:

  ```bash
  [ -d "$ROOT/docs/items" ] || [ -d "$ROOT/docs/features" ] \
    && echo "work layout: yes" || echo "older layout"
  ```

  Go by the folders, not by the version in `.project-docs.json`. A project still
  on the older layout (`docs/projects/`, `docs/backlog/`, no `docs/items/`) runs
  the `update-project-docs` skill first. Say so and stop; don't move files by
  hand in the old layout.

- **A clean-enough working tree.** This skill's validation story is "review the
  diff before accepting," which is unreadable against a tree full of unrelated
  changes. Check `git -C "$ROOT" status --short -- docs/`. **Without the `-C`,
  this reports a clean tree when run from a subdirectory** — a false all-clear
  on the one check that exists to prevent an unreadable diff. If `docs/` is
  dirty, say so and ask whether to proceed — don't refuse outright, since the
  user may legitimately be mid-session.

  **Several targets in one session.** A second run that finds `docs/` dirty only
  with the first run's own uncommitted changes is not a surprise: say so, and
  offer to commit them first (one commit per target keeps each diff readable).
  Anything else in the dirty set still gets the question.

  **Exception: invocation from `finalize-branch` Step 6.** That path _always_
  arrives with a dirty `docs/` — Step 4 wrote a session doc, and Step 6 just
  moved the item to `done` and reconciled a plan, none of them committed until
  Step 7. Pausing there would fire the gate on every single delegated run, for
  changes that are expected and related. When the caller is `finalize-branch`,
  note the pending documentation changes and continue; the diff stays readable
  because you know what put them there.

  **How you know who called: because the caller said so.** A skill invocation
  carries no caller identity, so this exception applies only when the invoking
  message names `finalize-branch` Step 6 as its source — which is how that step
  is written to invoke it. **Absent an explicit statement, treat the run as
  standalone** and apply the gate. Don't infer the caller from a dirty `docs/`
  tree, an in-progress feature branch, or a freshly written session document;
  those are precisely what the gate exists to notice, and reading them as proof
  of delegation disables it exactly when it matters.

- **An explicit target.** See Step 0. Never start by guessing.

## Key Principles

- **Reconcile always, archive conditionally.** Every run leaves the documents
  more accurate than it found them. Only some runs move anything.
- **`lifecycle` is the record; the move is housekeeping.** A feature at `done`
  that stays in `features/` is properly closed. `_archive/` only mirrors the
  state, to keep the live folders short to scan.
- **`pdocs archive` is the only way into `_archive/`.** It refuses anything not
  `done` or `dropped`, moves the file or folder, and rewrites every link to and
  from it. Never `git mv` into `_archive/`, and never rewrite those links by
  hand.
- **Never fabricate structure.** Don't impose a tracking format a document
  didn't choose. Don't append explanatory prose that restates what the document
  already shows.
- **Live prose gets flagged; historical prose is left.** A dated session saying
  "we put the proposal in `features/foo/`" is a true statement about the past.
  Rewriting it makes the record wrong, not right.
- **Nothing moves and no cycle closes without confirmation.** Reconciliation
  edits — `lifecycle` included — need none; they happen on every run. What the
  human gates is the archival move and the closing of a cycle.

## Workflow

### Step 0: Resolve the Target and Check Its State

Accept an explicit target — `feature/<slug>`, `item/<slug>` (or an item id, 8+
characters), `cycle/<filename>` (`.md` optional), an **advisory selection**:
references taken from a `pdocs view` archive advisory's `refs`, which the user
has agreed to (or asked you to propose from), or an **audit request**: "audit
unreviewed items", optionally narrowed ("the unreviewed items of cycle
`<filename>`"). The target may come from the user directly, or be passed in by a
calling skill (e.g. `finalize-branch` Step 6). If no target is given, **ask**.

A caller may hand you a path rather than a reference —
`docs/features/foo/plan.md` instead of `feature/foo`, or
`docs/cycles/2026-09-auth.md` instead of `cycle/2026-09-auth`. Reducing that to
the entity that owns it is normalization, not inference: the caller named the
thing, you just trimmed it. Say which target you resolved before proceeding.

**An explicitly passed target is fine. Inferring one is not.** Do not derive the
target from the current branch name, recent commits, the files you happen to
have open, or "what we were just working on." A caller passing an argument is
delegation; the skill guessing is the failure mode that makes it unusable
standalone.

Resolve it and read its state:

The `view` commands take the bare slug — `pdocs view feature widget-export`, not
`feature/widget-export`; `set`, `archive` and `find --id` take the reference.

```bash
pdocs view feature <slug>                      # a feature, and its items
pdocs find --type item --format json           # find an item by slug or id
pdocs find --id <prefix> --format json         # an item by id
pdocs view cycle <filename>                    # a cycle, its items, closable
```

| State                                             | Action                                                                                                                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doesn't resolve                                   | Refuse. `pdocs` names what it expected; list them (`pdocs find --type feature`, `pdocs view board`, `pdocs find --type cycle`) so the user can correct the name.     |
| A feature or item already under `_archive/`       | Nothing to move. Reconcile if asked, report the state, and check `pdocs check` is clean — an archived entity must be `done` or `dropped` (`ARCHIVED NOT TERMINAL`).  |
| An archive advisory's candidates                  | Take **The Advisory Path** below — the work is already finished, so reconciling is a sampled check rather than a full pass, and the rest is a selection to agree on. |
| An audit request (`pdocs view unreviewed`)        | Take **The Audit Path** below — nothing moves; the only change is a reviewed `status`, for what the user approves.                                                   |
| A cycle, archived or not                          | Take **The Cycle Path** below instead — it replaces Steps 1 through 5b, and you rejoin at Step 6.                                                                    |
| A feature                                         | Normal path. Its items are part of the evidence: a feature is not `done` while any of its items is still open.                                                       |
| An item that is a single file (`items/<slug>.md`) | Reconcile from that one file, which is its own definition of done and record.                                                                                        |
| An item that is a folder (`items/<slug>/item.md`) | Normal path: its `plan.md`, `write-up.md` and `sessions/`, if present, are the sources.                                                                              |

**"Narrative mode" is a property of the content, not of which files exist.** A
document is in narrative mode when it has nothing item-shaped to update — no
checklist, no per-phase rows, just prose. A `plan.md` written entirely in prose
_is_ in narrative mode, and a `feature.md` carrying a checklist is _not_. Step
2b says how to reconcile in that mode.

### The Cycle Path — replaces Steps 1 through 5b

Only for a cycle target, reached from Step 0. It is a complete alternative
pipeline, not an interstitial: **Steps 1, 2, 3, 4, 5a and 5b are all skipped**,
and you rejoin at Step 6 to report. It is unnumbered on purpose — the file's
`a`/`b` suffixes mean "a part or branch of that numbered step," and this is
neither.

A cycle is an index over work in play. It owns nothing, so there is no plan to
reconcile. Sweeping one means asking whether everything in it has finished, and
if so, writing down what happened — and then, if the person wants it, moving the
closed cycle into `docs/cycles/_archive/`.

**First, read the cycle's own state:** `data.cycle.lifecycle` in
`pdocs view cycle <cycle-filename> --format json`. `closable` counts only the
items, so a cycle that is already `closed` or `abandoned` still reports
`closable: yes`. Don't close it again: only offer the archive (the last step
below) if it is not archived yet, then rejoin at Step 6.

**1. Read the cycle's work.** Membership lives on the items: an item is in the
cycle when its `cycle:` names it. The cycle file lists nothing in frontmatter.

```bash
pdocs view cycle <cycle-filename>
```

It lists each item with its state, and reports `closable: yes` when the cycle
has at least one item and every item is `done` or `dropped`. An empty cycle is
not closable.

**2. Read the states, but do not trust them.** A `lifecycle` is a claim like any
other. The evidence hierarchy in Step 2a still governs: rung 1 is the shipped
thing itself, and it outranks every document. If an item says `done` and the
thing it names isn't on disk, that is a finding — report it and treat the cycle
as open. The field makes the check cheap; it doesn't make it authoritative.

**3. If it is not closable, reconcile the cycle and stop.** Reporting is not the
whole of it — this skill leaves every document more accurate than it found it,
on every run, and a cycle has two things that drift:

- **`## Sessions` lines still marked `(open)` for branches that landed.** Check
  each against `git log`; change a landed one to `(landed YYYY-MM-DD)` using its
  merge date. This is `finalize-branch` Step 6's job and it gets skipped.
- **The body's `## Scope` links**, which are ordinary relative links.
  `pdocs archive` rewrites them when it moves what they point at; a link that is
  broken anyway is a finding (`pdocs check` reports it).

Then report which items are holding the cycle open and what state each is in,
and offer to sweep each unfinished item or its feature — that is this skill's
normal path, run once per target. **Don't recurse automatically:** each of those
runs has its own confirmation gate, and batching them past the human is what the
gate exists to prevent. Work the user decides not to finish in this cycle is
either set `dropped` or has its `cycle:` taken off
(`pdocs set item/<slug> --unset cycle`) — the user's call, not yours.

**4. If it is closable, close the cycle** — after asking the user. Show the
reconciliation (each item and the state that settles it) and ask, rather than
closing because the arithmetic came out. If they decline, leave it as it is and
rejoin at Step 6: report that it is closable and was left open by their choice.
Closing writes:

```bash
pdocs set cycle/<cycle-filename> --lifecycle closed --closed YYYY-MM-DD
```

— or `--lifecycle abandoned` if the cycle was dropped rather than finished; say
which you are writing and why. Then, in the cycle file's body:

- The `## Outcome` section, replacing its `_Written at close…_` placeholder.
  Until it is written, `pdocs check` reports the cycle as `NO OUTCOME`.
- **`## Sessions`** — every line still marked `(open)` moved to
  `(landed YYYY-MM-DD)`. A closed cycle that still says a branch is open is the
  most visible way to get this wrong.

**Leave the cycle file's `status:` alone, whatever its value.** `status` says
whether the document can be trusted, and `lifecycle` says where the work got to.
Closing a cycle changes the second, not the first.

**The Outcome is the point of the whole document.** Write what shipped, what was
cut and why, and what was learned that will change how the next cycle is scoped.
Two paragraphs is usually enough. Write it from the items and their sessions,
not from the cycle's own `## Scope` section — restating the plan as though it
were the result is the failure mode here. The test: the Outcome must name at
least one thing that was cut, or learned, that appears nowhere in `## Scope`. If
it cannot, you have summarised the plan.

**5. Verify.**

```bash
pdocs check && echo "cycle accepted"
pdocs find --type cycle --lifecycle active
```

The lint checks the frontmatter you just wrote and the links in the body. The
second command should now name at most one cycle: **at most one cycle may be
`active`**, `docs/SCHEMA.md` states it and the lint enforces it, and closing one
is exactly when someone opens the next.

**Last, offer to archive it — then rejoin at Step 6.** A closed cycle is not an
archived one, and it does not need to be: `lifecycle: closed` is the record, as
`done` is for an item. Archiving only takes it out of the live list in
`docs/cycles/`. Once the cycle is `closed` or `abandoned` and `pdocs check` is
clean, ask; on a yes, run:

```bash
pdocs archive cycle/<cycle-filename>
```

It moves the file to `docs/cycles/_archive/` and rewrites every link to and from
it. It refuses a `planned` or `active` cycle. The filename does not change, so
the items whose `cycle:` names it still resolve and
`pdocs view cycle <cycle-filename>` still finds it. Never `git mv` a cycle by
hand. A cycle already closed by an earlier run can be archived the same way —
closing and archiving are separate steps, and each needs its own yes.

### The Advisory Path — archive finished work a view has outgrown

A live view ends with an archive advisory when one type's unarchived finished
work — `done` or `dropped` items and features, `closed` or `abandoned` cycles —
is greater than `checks.archive.threshold` in `.project-docs.json` (default 25).
`pdocs view board` advises on items, and on features with `--features`;
`pdocs view portfolio` advises on features and cycles. The advisory reports; it
is not permission. pdocs never archives on its own, and neither do you.

**Read the advisory as JSON.** `pdocs` prints JSON whenever its output is not a
terminal, which is how an agent runs it, so the text form — the
`advisory (archive-threshold): …` line and its `next:` line — never reaches you.
In JSON it is an entry of the view's `data.advisories[]` with
`id: "archive-threshold"`: its `message` and `action` carry the same text, and
its `types[]` the detail.

1. **Read the candidates.** Each `types[]` entry has the type's `count`, the
   `threshold`, and its `candidates`: bare references (`item/<slug>`), oldest
   first by `generated.at`, the date each was **created**, not the date it
   finished. Their `date`, `cycle` and `status` are on the view's own entries:
   for `view board`, `data.groups.completed[]` and `data.groups.cancelled[]`,
   matched by `slug`.

2. **Build the selection.** Pick specific references by a rule that works with
   or without an active cycle — the oldest `count - threshold`, or everything
   created before a date — or by cycle: the items of a `closed` cycle
   (`pdocs find --cycle <filename>`).

3. **Flag its unreviewed drafts.** Archiving a finished item whose `status` is
   not `stable` takes it out of `pdocs view unreviewed`, the review audit's
   list; only `--all` brings it back. Mark those items in the selection, and
   when you propose it, offer to run **The Audit Path** on them first.

4. **Check a sample at rung 1.** A terminal `lifecycle` is a claim, and
   **reconcile always** applies here too, in proportion. As Step 2a does with
   completion marks, sample **three** entities from the selection — prefer the
   largest — and confirm each at rung 1: the thing its definition of done names
   exists. All three hold → accept the rest. Any one fails → take it out, and
   let the user choose between checking every other entity and narrowing the
   selection to what you checked.

5. **Scan the selection for prose, in one pass.** `pdocs archive` rewrites
   links, not paths written in sentences — Step 3's concern, batched. Build one
   alternation from the selection (`items/<slug>`, `features/<slug>`,
   `cycles/<slug>` per reference) and grep once:

   ```bash
   ROOT=$(git rev-parse --show-toplevel)
   SEL='items/<slug-a>|items/<slug-b>|features/<slug-c>|cycles/<slug-d>'
   git -C "$ROOT" grep -nE "($SEL)([/.)\"'[:space:]]|$)" -- '*.md'
   ```

   Substitute the real slugs — `<` and `>` are shell redirections. Drop hits
   whose every match is inside a link target or a path-valued `from:` (both are
   rewritten by the move), and the selected entities' own files, then classify
   the rest with Step 3's table.

6. **Propose it.** Show the selection as a list of references — for a long one,
   a summary that pins the list exactly: the count, the rule, and every
   exception by name — with the flagged drafts, the sample's result, and every
   live claim from the scan, so the user agrees to all of it together. A
   selection the user already authorized in this conversation needs no second
   approval, but what steps 3–5 found is new: show it either way. If they
   decline all of it, nothing moves: rejoin at Step 6.

7. **Archive what was agreed, one reference at a time:**

   ```bash
   pdocs archive <type>/<slug>
   ```

   Each run moves the entity and rewrites every link to and from it. Run
   `pdocs check` before the first and after the last; fix anything new it
   reports, since this run caused it.

8. **Rejoin at Step 6** and report what moved, what you left and why, and the
   prose hits by kind.

An invalid threshold, or a misspelt key in `checks.archive`, puts a `bad-config`
advisory where the archive advisory would be, and `pdocs check` reports
`BAD CONFIG`; fix the value in `.project-docs.json` rather than working around
it. Raising the threshold is the user's call, never a way to silence the
advisory.

### The Audit Path — finished items never marked reviewed

An item's `status` is `stable` once the user has approved its description and
definition of done. Many finished items are still `draft`: some finished before
that rule existed, and others finished without the user approving them, which
`warn` mode allows. `pdocs check` does not list them; the audit is a separate
pass the user asks for. It covers `done` items only: a `dropped` draft is tagged
`[draft]` too, but is not audited. **The user approves the document** — the
description and definition of done — not the fact that the work shipped; the
evidence below is context for that judgement.

1. **List them.** `pdocs view unreviewed --format json` gives the live `done`
   items whose `status` is not `stable`; `--all` adds the archived ones. The
   text output is sorted by priority, not by date. Each JSON entry carries
   `date` (its `generated.at`: when it was created) and `cycle`; sort and filter
   on those.
2. **Offer a concrete batch.** For example, one cycle's items (their `cycle`
   names it), or the ten newest by `date`. Leave out every `deprecated` item:
   `deprecated` means its content was superseded, so it is never set `stable`.
   List those as left, and why.
3. **Show each item's content and evidence.** The JSON does not carry the
   description or the definition of done: open the item's file (its `path`).
   Show the user its `description` (frontmatter) and its definition of done
   (`## Definition of done`, or an equivalent such as `## Done when`), and what
   shipped: its `sessions/`, when it is a folder that has them, and
   `released_in`, when it is set. When it has neither — a single-file item, or a
   release nobody recorded — check its definition of done at rung 1 (the thing
   it names exists) and show that. Say which evidence you used. An item with no
   definition of done stays `draft`: don't write one after the fact to approve
   it.
4. **Mark only what the user approves:** `pdocs set item/<slug> --status stable`
   for each one. If they approved a record earlier in this conversation, that
   counts. If they say the definition of done is wrong, leave it `draft`, or fix
   the body and approve the fixed text. Leave the rest `draft`. A record nobody
   can vouch for now is accurately `draft`, and that is fine.
5. **Rejoin at Step 6** and report what was marked and what was left.

Never mark a batch reviewed by rule ("all done items"), and never change
`lifecycle` on this path.

### Step 1: Gather Reconciliation Sources

Read, in this order:

1. `plan.md` — the primary artifact, when it exists
2. The entry file — `feature.md` (scope and intent) or `item.md` / the item file
   (its definition of done)
3. `sessions/` — for what actually happened
4. **For a feature, its items** — `pdocs view feature <slug>` lists them with
   their states. Each one is a claim about a piece of the feature.
5. For a research item, its `write-up.md` — the answer the item asked for

For a single-file item, the one file serves as plan, definition of done and
record.

### Step 2: Reconcile

**The rule, first, because everything else in this step follows from it:**
completion marks are weak evidence and never dispositive, and they are weak
_asymmetrically_. An **unmarked but shipped** item is plan drift — a gap to
close, not proof nothing happened. A **marked but absent** item is a claim to
disbelieve. Marks are what this step writes, not what it reasons from.

Getting that backwards inverts the skill. Measured on two shipped projects in
this skill's home repository: 78 checkboxes between them, **zero** checked, both
fully delivered. That measures a repository with no closure discipline rather
than anything intrinsic to marks — this skill exists to change it — but until it
changes, mark-first reasoning reports finished work as unstarted.

**An unreconciled plan is itself unfinished work.** When the code shipped and
the document says nothing, the work isn't done: the documentation half of it was
skipped, and closing that gap is part of the work, not bookkeeping after it.
Report it that way.

This step has two halves, and both run on every run: **2a** judges what actually
happened, **2b** writes that judgment back into the documents.

#### Step 2a: Judge What Actually Happened

**A "completion mark" is any deliberate in-document signal that something is
done — in whatever idiom the author chose.** Checkboxes are the most legible
form, not the only one. Others in circulation:

- A per-phase status or annotation (`Phase 2 — done`, `✅`,
  `shipped 2026-07-14`)
- An inline addendum under a completed step — a note on how it actually went,
  what changed, what got deferred
- Plain narrative that reports the work in the past tense

Read the document before deciding it has no marks. A plan that tracks completion
in prose annotations is not an unmarked plan; it's a marked plan you failed to
read.

**Marks that are present do tell you something** — someone who was there made a
deliberate act of marking, and that act usually accompanied the work. Check them
by sampling, not by re-deriving:

- **Sample only marks that assert a concrete artifact.** Plans routinely mark
  items that leave nothing on disk by design — "ran the roundtable", "decided to
  defer X", "reviewed with the team". Those are unfalsifiable at rung 1, and
  sampling one would condemn the whole set for a claim that was never checkable.
  Skip them; if _every_ mark is of that kind, say so and fall back on rungs 2
  and 3 rather than declaring the set unreliable.
- Sample **three** of the remaining marked claims, or all of them if fewer than
  three. Prefer the load-bearing ones: the items other items depended on, or the
  largest deliverables.
- Confirm each sampled claim at rung 1 — the thing it says was built exists.
- **All three hold** → accept the remaining marks and move on.
- **Any one fails** → the set is unreliable. Verify every marked item at rung 1,
  and report the failure itself as a finding.

Exhaustive verification of a healthy set is a code review, and that is not what
this step is. Verifying an unhealthy one is the point.

**Evidence of what was actually done, in order of authority:**

1. **The shipped thing itself** — the code, plugin, file, or directory the plan
   said to build. If a plan says "create `plugins/hivemind/`," go look for
   `plugins/hivemind/`. This is the only evidence that can't drift, and it
   outranks every document.

   **For a docs-only piece of work, the delivered documents _are_ rung 1.** Work
   whose plan said "add a `test-plan.md` doc type" is confirmed by that doc type
   existing, same as a plugin is confirmed by its directory. Don't conclude this
   rung is unavailable because nothing shipped outside `docs/` — that collapses
   the hierarchy onto exactly the rungs you're told not to trust.

   The one carve-out is the entity's own `artifacts/` subfolder: working
   research (codebase exploration, dependency analysis) — a document _about_ the
   work, not the delivered work, and it never counts at this rung.

2. **Session documents** (`sessions/*.md`) — a contemporaneous record of what
   happened, written while it was happening.
3. **A declared state** — a deliberate claim, but often stale: the `lifecycle`
   in frontmatter of the entity, its items, and its plan. The lint checks the
   vocabulary, not the truth.

   A bold `**Status:**` line in a body is a leftover from an older scaffold. If
   a document carries one beside a `lifecycle`, the frontmatter wins and the
   stale line is a finding — say so, and offer to remove it, since a document
   carrying two answers will be read by whoever finds the wrong one first.

   When a plan and its owner both declare a state and they agree, treat them as
   one signal. When they disagree, **`plan.md` is closer to execution and ranks
   higher** — but the disagreement is a finding in its own right, so report both
   values rather than quietly using one.

4. **Completion marks** — checkbox state, per-phase annotations, addendum notes.
   Weakest, and diagnostic rather than conclusive. A mark is a claim that
   something shipped; sample against rung 1 before relying on the set. A mark
   with nothing behind it is a worse finding than a missing one, because it
   looks like evidence.

   Rungs 3 and 4 blur in practice — an inline "done, see note" _is_ both a
   status claim and a completion mark. Don't spend effort classifying it. The
   ordering exists to settle conflicts, and both rungs lose to 1 and 2 anyway.

**The plan-drift signature:** a plan with no completion marks in any idiom
_plus_ evidence from rung 1 or 2 that work shipped. That combination means the
plan was never reconciled, not that nothing happened — say so explicitly. Note
that the declared state is **not** required for this: a plan at `active` or
`draft`, or an entity with no `sessions/` folder at all, still reads as drift
when the shipped thing is sitting on disk. Rung 1 is what settles it.

**Resolving vs. surfacing.** The hierarchy is a resolution procedure — do reach
a conclusion, and lead with it. "Surface conflicts" (below) means _show the
conflicting evidence and which rung decided it_, not "decline to decide."
Silence is the thing being forbidden, not judgment.

**Each type has its own vocabulary — don't read a difference as a
disagreement.** `docs/SCHEMA.md`'s **Lifecycle by type** table is the source of
truth, and the lint parses it; read it there. As of writing:

| Type                | `lifecycle` values                                                        |
| ------------------- | ------------------------------------------------------------------------- |
| `feature`           | `backlog` · `ready` · `active` · `review` · `done` · `dropped`            |
| `item`              | `triage` · `backlog` · `ready` · `active` · `review` · `done` · `dropped` |
| `plan`              | `draft` · `active` · `completed` · `abandoned`                            |
| `design-resolution` | `draft` · `resolved` · `superseded`                                       |
| `test-plan`         | `draft` · `ready` · `active` · `completed`                                |
| `cycle`             | `planned` · `active` · `closed` · `abandoned`                             |

So a feature at `done` beside a plan at `completed` is two documents each in
their own terminal state — entirely consistent, and reporting it as a conflict
is noise. A real conflict is one document claiming done while the other claims
not-started, or either contradicting the artifacts.

**`ready` or `active` is not `done`, and this is where that matters.** A feature
left at `active` when the thing was built is exactly the drift this step exists
to correct — not a state to leave alone.

**A feature is done only when its items are.** If `pdocs view feature <slug>`
lists an item still `backlog`, `ready`, `active` or `review`, the feature is not
finished — even when its plan is. Name those items. Each is either real
remaining work, work that shipped without anyone setting it `done` (drift: say
so and sweep it), or work nobody will do (the user may drop it).

#### Step 2b: Write the Reconciliation Back

**The documents are edited here, in Step 2b** — not later. Reconciling means
checking each planned item against reality and updating the documents to match;
the marks are the output of this step, not its input. This edit is unconditional
and needs no confirmation: it happens on every run, including runs that archive
nothing. What Step 4 gates is the _move_, not the reconciliation.

**Write `lifecycle` first, before touching any marks.** It is the one field
every other skill reads and the lint checks, and it is the answer to the
question this whole run was called to settle. Set it from what Step 2a
concluded:

- **On a feature or an item**, with the CLI, which refuses a value the lint
  would reject:

  ```bash
  pdocs set feature/<slug> --lifecycle done       # the work shipped
  pdocs set item/<slug> --lifecycle dropped       # the work was decided against
  ```

  Deliberately parked but still wanted → `backlog`, and say why in the report.
  Genuinely still in flight → leave it; `active` on half-done work is correct,
  not drift. `sweep-project` is the writer of a feature's `done` or `dropped`
  (`docs/SCHEMA.md`, "Who moves an item"); an item's `done` is normally written
  by `finalize-branch`, and this skill writes it only to correct drift.

- **On a plan** (or a design resolution, or a test plan), edit the `lifecycle:`
  line in its frontmatter directly — `pdocs set` changes features, items and
  cycles only. The work shipped → `completed`; the plan was dropped →
  `abandoned`.

Getting to a terminal `lifecycle` is what makes the rest possible: Step 5b won't
move an entity that hasn't reached one — `pdocs archive` refuses it — and a
cycle can't close until every item in it has.

**`released_in`, when a person supplies it.** If the work is `done` and the user
can say which release first shipped it, record it:

```bash
pdocs set feature/<slug> --released-in <version>
```

Ask; never infer it from tags or dates. The field is optional and never checked,
and `pdocs view unreleased` lists what lacks it — features and items alike — a
reminder, not a failure. If the person says the feature's `done` items shipped
in the same version, set it on them too
(`pdocs set item/<slug> --released-in <version>`); otherwise leave them listed.

Then the marks. **Write the update in whatever idiom the document already
uses.** If it tracks with checkboxes, tick them. If it annotates phases,
annotate the phase. If it reports in prose, write a sentence. The goal is a
document a stranger can read and know where the work stands, not conformance to
a single format.

**Only ever tick a real list item.** A `- [ ]` is a tracking checkbox only when
it begins a Markdown list item. The same characters inside a code span or a
fenced block are documentation _about_ checkbox syntax — a plan explaining
"steps use checkbox (`- [ ]`) syntax", or a skill quoting the pattern it
matches. Ticking those silently rewrites someone's documentation into a lie, and
a blanket find-and-replace across the file will do exactly that. This is not
hypothetical: the first production run of this skill corrupted precisely such a
line. Go item by item, or exclude code spans and fences before you touch
anything.

**Never tick a template placeholder.** A list item whose text is still the
template's bracketed prompt (`- [ ] [Acceptance criterion 1]`) is scaffolding
nobody filled in, not a claim. Leave it, and report the unfilled sections as a
finding.

**In narrative mode** (nothing item-shaped to update), the completeness question
is the same one, just answered in prose: does every substantive commitment the
document makes have corresponding evidence at rung 1 or 2? If yes, it's an
archival candidate. If some commitments have no trace, name them as the
remaining work. Don't manufacture a checklist to answer it.

Three further rules govern this step:

- **Never impose a tracking format a document didn't choose.** No adding
  checkboxes to a narrative plan, no converting prose annotations into a
  checklist because a checklist is easier to scan. A narrative plan gets a
  narrative answer.
- **Never add a `**Status:**` line.** State lives in `lifecycle`, and only
  there.
- **Surface conflicts rather than resolving them silently.** When a plan and its
  owner disagree about state, that disagreement is itself the finding.

### Step 3: See What a Move Would Touch

Only when Step 2 concluded the entity is `done` or `dropped` — otherwise skip to
Step 4, which will route you to 5a.

`pdocs archive` rewrites every **link** to and from what it moves, in every
document under the docs root and every tracked Markdown file outside it. Before
asking, show the human what that will touch, and find what it will not:

```bash
pdocs backlinks docs/features/<slug>/feature.md      # a feature
pdocs backlinks docs/items/<slug>.md                 # a single-file item
pdocs backlinks docs/items/<slug>/item.md            # a folder item
```

Those are the links that will be rewritten, along with any path-valued `from:`
that points into the moved folder. References by id or slug (`blocked_by`, an
id-valued `from:`, `cycle:`) are untouched and keep resolving.

**What it does not touch is prose**: a path written in a sentence rather than as
a link. Find those:

```bash
ROOT=$(git rev-parse --show-toplevel)
git -C "$ROOT" grep -nE "(features|items)/<slug>([/.)\"'[:space:]]|$)" -- '*.md'
```

(`<slug>` is a placeholder — substitute the real slug; pasted verbatim, `<` and
`>` are shell redirections. The boundary class keeps `foo` from matching
`foo-v2`.) Drop the hits that are links `pdocs backlinks` already listed, and
the entity's own files — but only when every match on the line is inside a link
target; a line that holds both a link and a prose mention is still a prose hit.
Classify the rest:

| Kind                                                                                                                                 | Action                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **Example** — the path quoted to illustrate a pattern, pointing at nothing                                                           | Leave it. Report the count only                                      |
| **Historical** — in a dated session, write-up, report, or anything written as an account of a moment                                 | Leave it. Report it as deliberately left, so the omission is visible |
| **Live claim** — a sentence in a current document asserting something about the entity ("the `features/foo/` folder holds the spec") | **Do not rewrite.** Show the sentence and ask how to proceed         |

The Leave rule for history is the same one `scaffold-update-checklist` applies
to skill removal: scrub live current-state claims, leave dated retrospective
prose alone.

### Step 4: Present and Check In

Show the human two things together:

1. The reconciliation: what's complete, what remains, any conflicting signals,
   and the `lifecycle` you wrote.
2. For a terminal entity, what a move would touch: the links `pdocs archive`
   will rewrite, and the prose it will not.

Then ask the user. Everything accounted for makes this an **archival candidate**
— not an archived entity. Present archival as a choice, with the evidence, and
let the human answer.

**The move is optional and the `lifecycle` is not.** A terminal `lifecycle` is
what records that the work closed; moving it into `_archive/` is housekeeping on
top of that. Say so when you present the choice — "nothing moves" is a complete
outcome here, not a deferral.

Not terminal → **Step 5a**. Terminal and the human chose the move → **Step 5b**.
Terminal and the human declined → **Step 6**.

### Step 5a: Not Complete — Record and Stop

The marking and the `lifecycle` already happened in Step 2b. What's left here:

- Confirm both are on disk; leave incomplete items unmarked.
- Work started and work remaining means `active` on the plan and, usually, on
  the feature.

Add a short dated note explaining _why_ work remains **only when the reason
isn't self-evident from the document's own structure.** "Phases 1 and 2 done,
phase 3 is its own branch" needs no note — the marks already say that. An
abandoned approach, an external blocker, or a mid-flight scope change does.

The bar is reflection, not routine. A skill that appends prose to someone's plan
on every run is worse than one that appends none.

If the remaining work is real and has no item yet, offer to file it:
`pdocs new item <slug> --kind task --parent feature/<slug>`, which starts in
`triage` for the user to decide on.

Nothing moves. Report and stop.

### Step 5b: Complete and Confirmed — Archive

Reached only when the entity is `done` or `dropped` and the human chose the move
at Step 4.

```bash
pdocs archive feature/<slug>      # or item/<slug>, or an item id
```

It moves `features/<slug>/` to `features/_archive/<slug>/` (an item file or
folder to `items/_archive/`), rewrites every link to and from the moved files,
and prints the count. It refuses an entity that is not terminal and names its
state; archiving one already archived is a no-op. **That is the whole move** —
no `git mv`, no hand-written link rewrites.

Then act on the human's answers to the flagged prose from Step 3, and leave the
rest.

### Step 6: Report

State plainly:

- What was reconciled, including any conflicting signals found
- **What `lifecycle` was written, and to which documents** — the value, the
  previous value, and the rung-1 or rung-2 evidence that settled it. This is the
  finding; bury it under the reference list and nobody reads it.
- `released_in`, if a person supplied it
- What moved, if anything, and the link count `pdocs archive` reported — and if
  nothing moved, whether that was the human's choice or unfinished work
- The prose left (historical, examples: a count is enough) and the prose flagged
  for the human, with what they decided
- For a cycle: whether it closed, whether it was archived, and the items that
  held it open if not — or that it was closable and the user kept it open
- For an advisory run: the sample checked and its result, and the unreviewed
  drafts flagged and whether the audit ran on them first
- For an audit run: each item whose `status` changed (`draft` → `stable`), the
  evidence shown for it, and each item left — declined, `deprecated`, or its
  definition of done disputed — with the reason

**"Nothing needed doing" is a real outcome.** A second run against an
already-reconciled entity should say so explicitly rather than producing a
silent no-op that reads like a failure.

## Acceptance Criteria

**Every run:**

- [ ] The documents are more accurate than they were, whether or not anything
      moved
- [ ] No tracking format was imposed on a document that didn't use it
- [ ] No `**Status:**` line was written
- [ ] `pdocs check` exits 0 after the run (or reports only problems that were
      already there)

**Feature and item runs** (advisory and audit runs use their own blocks below
instead):

- [ ] `lifecycle` on disk matches what the reconciliation concluded
- [ ] A feature marked `done` has no item still open
- [ ] Anything moved was moved by `pdocs archive`, after explicit confirmation
- [ ] Prose mentions of the moved path were classified, and the live ones shown
      to the human

**Advisory runs:**

- [ ] The selection was a concrete list of references the user agreed to, taken
      from the advisory's `refs`
- [ ] One batched prose scan covered the whole selection; its live hits were
      shown with the selection, before anything moved
- [ ] Only agreed references were archived, each with `pdocs archive`
- [ ] Three entities of the selection were checked at rung 1 before anything
      moved
- [ ] Unreviewed drafts among the candidates were flagged, and the audit offered
      for them first

**Audit runs:**

- [ ] Every `status` set to `stable` was for content the user saw and approved:
      the description and definition of done, from the item's file
- [ ] No `deprecated` item was set `stable`, and no `lifecycle` changed
- [ ] Each item was shown with its evidence: sessions, `released_in`, or a
      rung-1 check

**Cycle runs:**

- [ ] The cycle's items were read from `pdocs view cycle`, and any claim of
      `done` was checked against rung 1
- [ ] `## Sessions` has no `(open)` line for a branch that landed
- [ ] No cycle was closed, or archived, without explicit confirmation
- [ ] A closed cycle's `## Outcome` names at least one thing cut or learned that
      appears nowhere in its `## Scope`
- [ ] At most one cycle is `lifecycle: active`

**Correctness checks, in order of authority:**

1. `git diff` of the whole run — the primary check. Read it before accepting.
2. `git add -A docs/ && git status --short` — once staged, a move shows as
   renames (`R`). Unstaged, `git status` shows every move as a delete plus an
   untracked folder; that is expected, not the failure.
3. **The lint** — `pdocs check`. It is the only check that reads what you wrote
   into frontmatter, and the only one that runs at all on a cycle. A broken
   link, a `lifecycle` outside its type's vocabulary, an archived entity that is
   not terminal, or a second `active` cycle surfaces here.

## Risks & Gotchas

- **Trusting completion marks.** The failure that inverts this skill's purpose:
  finished work routinely carries plans with nothing marked, so mark-first
  reasoning reports shipped work as never started. Verify against artifacts and
  sessions; write the marks to match.
- **Assuming one marking idiom.** The mirror failure: scanning for `- [x]`,
  finding none, and reporting "no completion signals" when the document tracked
  its phases in status annotations or addendum notes all along. Read the
  document before deciding what it doesn't contain.
- **Closing a feature on its plan alone.** The plan can be `completed` while an
  item under the feature is still open. `pdocs view feature` is the check.
- **Moving by hand.** A `git mv` into `_archive/` leaves every inbound link
  broken and bypasses the terminal-state check. `pdocs archive` does both.
- **Reflexive prose.** The temptation to "document the state" on every run
  produces plans cluttered with notes that restate their own marks.

## Important Constraints

- **Never infer the target.** Explicit argument or ask. This is what makes the
  skill usable standalone rather than only as a `finalize-branch` appendage.
- **Never archive without confirmation.** Not configurable.
- **Never rewrite historical documents.** Dated notes are records, not pointers.
- **Never rewrite prose current-state claims unattended.** Flag and ask.
- When invoked from `finalize-branch`, **leave changes uncommitted** — Step 7 of
  that skill commits documentation. When invoked standalone, offer to commit.

## Common Mistakes

- **Inferring the target from branch context** — the one failure mode that makes
  this skill unusable on its own terms.
- **Reading an unmarked plan as unstarted work** instead of as plan drift — the
  most likely way this skill reaches a confidently wrong conclusion.
- **Adding checkboxes to a narrative document** so it "matches the template."
- **Appending a "why work remains" note on every run** regardless of whether the
  document already makes it obvious.
- **Treating "not complete" as a failed run** — it's the most common outcome.
- **Rewriting a session's prose** because it mentions the old path.
- **Guessing `released_in`** from a tag or a date instead of asking.

## Output

At completion, summarize:

- Target and its resolved state
- Reconciliation result: complete / not complete, with the evidence
- The `lifecycle` written, and `released_in` if supplied
- Whether anything moved, and where, with `pdocs archive`'s link count
- Prose: left / flagged, with counts and the reasoning for the left ones
- For an audit run: the items set `stable`, and those left `draft` with why
- Follow-up items, if any
