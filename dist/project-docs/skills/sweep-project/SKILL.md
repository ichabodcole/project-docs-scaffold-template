---
name: "sweep-project"
description: >
  Reconcile a project folder or backlog item against what was actually built,
  then either record the work that remains or — with the human's confirmation —
  archive it and update live cross-references. Use when a project or backlog
  item might be finished, when a plan has drifted from what was actually
  implemented, or when sweeping already-completed work that was never archived.
  Triggers when the user says "is this project done", "archive this project",
  "sweep this project", "reconcile the plan", "check if we can archive this",
  "clean up completed projects", "did we ever archive that", or "this project
  looks finished".
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

Reconcile a project folder or backlog item against what was actually built, and
close it out if it's done.

**Archival is one of two valid outcomes, not the goal.** Most runs happen
because someone _suspects_ a project might be finished. Often it isn't — and a
run that reconciles the document, records what's left, and moves nothing is a
successful run, not a failed one. The skill is named for the pass over the
project, not for a terminal action that is conditional.

## When to Use

**Use this skill when:**

- A project or backlog item might be finished and you want to know for sure
- A `plan.md` has drifted from what was actually implemented — unticked boxes,
  stale status, phases that shipped without a note
- You're sweeping up already-completed work that was never archived
- `finalize-branch` Step 6 reconciliation came back clean and asked whether this
  completes the project

**Don't use this skill for:**

- Reviewing a single document for accuracy — that's the `docs-curator` agent,
  which is read-only and recommends rather than acts
- Deciding whether work _should_ be done — that's an investigation or proposal
- Moving files around for organizational reasons unrelated to completion

## Prerequisites

Before starting, verify:

- **A repo-root anchor.** Every path in this skill is repo-root-relative. Set
  this first and use it in every command — `git` subcommands print and resolve
  paths relative to the current directory, so a bare `docs/...` path silently
  does the wrong thing when the session's cwd is a subdirectory:

  ```bash
  ROOT=$(git rev-parse --show-toplevel)
  ```

- **A clean-enough working tree.** This skill's validation story is "review the
  diff before accepting," which is unreadable against a tree full of unrelated
  changes. Check `git -C "$ROOT" status --short -- docs/`. **Without the `-C`,
  this reports a clean tree when run from a subdirectory** — a false all-clear
  on the one check that exists to prevent an unreadable diff. If `docs/` is
  dirty, say so and ask whether to proceed — don't refuse outright, since the
  user may legitimately be mid-session.

  **Exception: invocation from `finalize-branch` Step 6.** That path _always_
  arrives with a dirty `docs/` — Step 4 wrote a session doc, Step 5 wrote a
  memory, and Step 6 just reconciled a plan, none of them committed until
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

- **Reconcile always, archive conditionally.** Every run leaves the document
  more accurate than it found it. Only some runs move anything.
- **Never fabricate structure.** Don't impose a tracking format a document
  didn't choose. Don't normalize a status line someone wrote deliberately. Don't
  append explanatory prose that restates what the document already shows.
- **Discover references before moving, not after.** The ordering is load-bearing
  — see Step 3.
- **Live references get rewritten; historical ones don't.** A dated session note
  saying "we put the proposal in `docs/projects/foo/`" is a true statement about
  the past. Rewriting it makes the record wrong, not right.
- **Nothing closes unattended.** The human confirms before any move.

## Workflow

### Step 0: Resolve the Target and Check Its State

Accept an explicit target — a project folder name, or a path to a backlog item.
The target may come from the user directly, or be passed in by a calling skill
(e.g. `finalize-branch` Step 6). If no target is given, **ask**.

A caller may hand you a path _inside_ the target rather than the target itself —
`docs/projects/foo/plan.md` instead of the folder `foo`. Reducing that to its
containing project folder is normalization, not inference: the caller named the
thing, you just trimmed it. Say which target you resolved before proceeding.

**An explicitly passed target is fine. Inferring one is not.** Do not derive the
target from the current branch name, recent commits, the files you happen to
have open, or "what we were just working on." A caller passing an argument is
delegation; the skill guessing is the failure mode that makes it unusable
standalone.

Once resolved, check the target's state before doing anything else:

| State                                                         | Action                                                                                                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doesn't exist                                                 | Refuse. List the active targets (`ls "$ROOT/docs/projects/"` or `ls "$ROOT/docs/backlog/"`) so the user can correct the name.                               |
| Already under `_archive/`                                     | Don't re-archive. Run the **recovery path** below instead.                                                                                                  |
| Something of the same name already exists at the destination  | Reconcile as normal, then refuse **the move** — never merge, overwrite, or auto-rename. Report the collision and stop at 5a, under its collision carve-out. |
| Is a backlog item (a single `.md` file under `docs/backlog/`) | Reconcile from that one file, which serves as plan, proposal, and record. Skip the folder-shaped rows below.                                                |
| Has `plan.md`                                                 | Normal path.                                                                                                                                                |
| Has `proposal.md` but no `plan.md`                            | Reconcile from the proposal and `sessions/`. Usually narrative mode — see below. Say so in the report.                                                      |
| Has neither                                                   | Reconcile from whatever Markdown the folder does contain. Usually narrative mode — see below. Say so.                                                       |

**"Narrative mode" is a property of the content, not of which files exist.** A
document is in narrative mode when it has nothing item-shaped to update — no
checklist, no per-phase rows, just prose. The two rows above usually land there,
which is why they flag it, but check rather than assume: a `plan.md` written
entirely in prose _is_ in narrative mode, and a `proposal.md` carrying a
checklist is _not_. Step 2b says how to reconcile in that mode.

**Recovery path (target already archived).** This is also how a run interrupted
between the move and the reference updates resumes. The move is already done,
so: run Step 3's discovery and classification, then apply the rewrites from Step
5b — skipping its `git mv`. Match on the target's **pre-move** path form
(`projects/<name>`, `../<name>/`, `./<name>/`), since that's what any stale
reference still contains. Then report as normal.

### Step 1: Gather Reconciliation Sources

Read, in this order:

1. `plan.md` — the primary artifact, when it exists
2. `proposal.md` — for scope and intent
3. `sessions/` — for what actually happened

For a backlog item, the single file serves all three roles.

### Step 2: Reconcile

**The rule, first, because everything else in this step follows from it:**
completion marks are weak evidence and never dispositive, and they are weak
_asymmetrically_. An **unmarked but shipped** item is plan drift — a gap to
close, not proof nothing happened. A **marked but absent** item is a claim to
disbelieve. Marks are what this step writes, not what it reasons from.

Getting that backwards inverts the skill. Measured on two shipped projects in
this repository: 78 checkboxes between them, **zero** checked, both fully
delivered. That measures a repository with no closure discipline rather than
anything intrinsic to marks — this skill exists to change it — but until it
changes, mark-first reasoning reports finished work as unstarted.

**An unreconciled plan is itself unfinished work.** When the code shipped and
the document says nothing, the project isn't done: the documentation half of it
was skipped, and closing that gap is part of the work, not bookkeeping after it.
Report it that way.

This step has two halves, and both run on every run: **2a** judges what actually
happened, **2b** writes that judgment back into the document.

#### Step 2a: Judge What Actually Happened

**A "completion mark" is any deliberate in-document signal that something is
done — in whatever idiom the author chose.** Checkboxes are the most legible
form, not the only one. Others in circulation here:

- A `**Status:**` line, in frontmatter or in the body
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

   **For a docs-only project, the delivered documents _are_ rung 1.** A project
   whose plan said "add a `test-plan.md` doc type" is confirmed by that doc type
   existing, same as a plugin is confirmed by its directory. Don't conclude this
   rung is unavailable because nothing shipped outside `docs/` — that collapses
   the hierarchy onto exactly the rungs you're told not to trust.

   The one carve-out is a project's own `artifacts/` subfolder, which
   `docs/projects/README.md` defines as working research (codebase exploration,
   dependency analysis). That's a document _about_ the work, not the delivered
   work, and it never counts at this rung.

2. **Session documents** (`sessions/*.md`) — a contemporaneous record of what
   happened, written while it was happening.
3. **A `**Status:**` line** — a deliberate human claim, but often stale. When
   `plan.md` and `proposal.md` both carry one and they agree, treat them as one
   signal. When they disagree, **`plan.md` is closer to execution and ranks
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
that the status line is **not** required for this: a plan marked `Active` or
`Draft`, or a project with no `sessions/` folder at all, still reads as drift
when the shipped thing is sitting on disk. Rung 1 is what settles it.

**Resolving vs. surfacing.** The hierarchy is a resolution procedure — do reach
a conclusion, and lead with it. "Surface conflicts" (below) means _show the
conflicting evidence and which rung decided it_, not "decline to decide."
Silence is the thing being forbidden, not judgment.

**Plans and proposals use different status vocabularies — don't read a
difference as a disagreement.** `PLAN.template.md` defines
`Draft | Active | Completed | Superseded`; `PROPOSAL.template.md` defines
`Draft | Under Review | Approved | Rejected | Superseded`. So a proposal marked
`Approved` beside a plan marked `Completed` is two documents each in their own
terminal-ish state — entirely consistent, and reporting it as a conflict is
noise. A real conflict is one document claiming done while the other claims
not-started, or either contradicting the artifacts.

#### Step 2b: Write the Reconciliation Back

**The document is edited here, in Step 2b** — not later. Reconciling means
checking each planned item against reality and updating the document to match;
the marks are the output of this step, not its input. This edit is unconditional
and needs no confirmation: it happens on every run, including runs that archive
nothing. What Step 4 gates is the _move_, not the reconciliation.

Steps 5a and 5b therefore inherit an already-reconciled document. 5a adds the
status update and, where warranted, a note on why work remains; 5b moves the
folder. Neither re-does the marking. **Write the update in whatever idiom the
document already uses.** If it tracks with checkboxes, tick them. If it
annotates phases, annotate the phase. If it reports in prose, write a sentence.
The goal is a document a stranger can read and know where the work stands, not
conformance to a single format.

**Only ever tick a real list item.** A `- [ ]` is a tracking checkbox only when
it begins a Markdown list item. The same characters inside a code span or a
fenced block are documentation _about_ checkbox syntax — a plan explaining
"steps use checkbox (`- [ ]`) syntax", or a skill quoting the pattern it
matches. Ticking those silently rewrites someone's documentation into a lie, and
a blanket find-and-replace across the file will do exactly that. This is not
hypothetical: the first production run of this skill corrupted precisely such a
line. Go item by item, or exclude code spans and fences before you touch
anything.

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
- **Never normalize a free-form status into the template enum.** Real documents
  carry statuses like `V1.5 shipped (in spike branch, awaiting merge)` or
  `Approved (shipped)`. Those are _more_ informative than the enum, not less.
  Treat a free-form status as a usable signal, report it verbatim, and ask
  before changing it.
- **Surface conflicts rather than resolving them silently.** When `plan.md` and
  `proposal.md` disagree about status, that disagreement is itself the finding.

### Step 3: Discover and Classify References

**This runs before any move.** Two reasons, both load-bearing: the exclusion
filter below is only correct against the pre-move path, and showing the human
exactly what will change before anything moves is the entire point of the
check-in.

**`<project-folder-name>` below is a placeholder — substitute the actual folder
name before running (e.g. `NAME=hivemind-plugin`).** Pasted verbatim, the `<`
and `>` are shell redirections and the line is a parse error. `$NAME` is reused
by Step 5b.

**Re-derive `ROOT` and `NAME` in every shell invocation.** Each Bash call is a
fresh shell — variables do not survive between tool calls. Carrying them
mentally and pasting a later command bare gives you `git -C ""` and a source
path of `docs/projects/`, which is how a move goes wrong. The snippets below
re-declare both for this reason; keep it that way.

`$NAME` is interpolated into an extended regex. Folder names here are kebab-case
with dots at most (`grapevine-v1.6.7` is fine — verified not to collide with
`grapevine-v1.6`, because the segment boundary blocks it). Escape it first if a
name ever contains a regex metacharacter — `+`, `(`, `[`, `*`, or `.` in a
position where a literal dot matters.

```bash
ROOT=$(git rev-parse --show-toplevel)
NAME=<project-folder-name>
git -C "$ROOT" grep -nE "(projects/|\.\./|\./)${NAME}([/)\"'[:space:]]|$)" -- '*.md' \
  | grep -vE "^docs/projects/(_archive/)?${NAME}/"
```

Every part of that command is doing work, and the obvious simpler version is
wrong in four separate ways:

- **`(projects/|\.\./|\./)`** — three reference forms, all live. Sibling
  projects link each other with bare relative paths
  (`[V1.5 proposal](../grapevine/proposal.md)`) that never contain the string
  `projects/`; that is the dominant cross-project form. Documents in
  `docs/projects/` itself can use `./<name>/` — not attested in the repo today
  and not prescribed anywhere for _live_ projects, but a legal relative link and
  the exact source form of the `./_archive/<name>/` rewrite that
  `docs/projects/README.md` _does_ prescribe. Covering it costs nothing, and it
  is what lets the recovery path match archived references. A pattern matching
  only `projects/<name>` reports "zero references found" while silently breaking
  the others.
- **`([/)\"'[:space:]]|$)`** — enforces a path-segment boundary. Without it,
  `projects/grapevine` also matches `grapevine-v1.6`, `grapevine-v1.6.7`,
  `grapevine-v1.7`, and `grapevine-backlog` — every hit a false positive.
- **`git -C "$ROOT"`** — `git grep` prints paths relative to the current
  directory, so the `^docs/` anchor in the filter silently matches nothing when
  invoked from a subdirectory.
- **`(_archive/)?` in the exclusion** — covers the resume case. When the target
  is already archived (Step 0), its own internal links live under
  `docs/projects/_archive/<name>/`, and without this they'd be reported as
  external references and "fixed" — corrupting links that were correct.

**For a backlog item, the pattern is different — not a substitution.** Backlog
items live at `docs/backlog/<filename>.md`, so `projects/` can never match and
naively swapping the name in produces zero hits: the exact silent failure this
step exists to prevent. Use the containing directory instead, and note that
`NAME` here **excludes** the `.md` extension (the boundary class has no `.`, so
including it would match nothing):

```bash
ROOT=$(git rev-parse --show-toplevel)
NAME=<backlog-filename-without-extension>
git -C "$ROOT" grep -nE "${NAME}\.md" -- '*.md' \
  | grep -v "^docs/backlog/${NAME}\.md:"
```

Three asymmetries with the project variant, all deliberate:

- **The match is the bare filename — no directory prefix at all.** Requiring
  `backlog/` looks tighter and is the trap: backlog items are flat siblings, so
  `README.md`, `INDEX.md`, and neighbouring items link them as `./<name>.md` or
  plain `<name>.md`, and a pattern demanding `backlog/` misses every one of
  those. Verified against a fixture: an index holding two live links reported
  zero. A dated slug like `2026-02-02-thing` is distinctive enough that a bare
  match has effectively no false positives — and here over-matching is the
  _safe_ direction, since every hit is classified by hand before anything is
  rewritten.
- **It needs no `(_archive/)?` alternative.** Matching on the filename alone
  finds the item at either location, so this one command also serves the
  recovery path, where the item has already moved.
- **The exclusion names the item's own file, not its directory.** Backlog items
  are flat siblings in one folder, so excluding `^docs/backlog/` wholesale would
  drop live references from `docs/backlog/README.md` and from _other_ backlog
  items — the same silent-zero-references failure this step exists to prevent.
  On the recovery path, exclude `^docs/backlog/_archive/${NAME}\.md:` instead.

**Classify every hit into one of four buckets:**

Classify on **three questions, in this order**, so no hit can land in two
buckets:

1. **Is the path being quoted as an example rather than used as a reference?** —
   documentation that cites a path to illustrate a pattern, including this skill
   file, which cites `[V1.5 proposal](../grapevine/proposal.md)` to explain the
   discovery grep. These match the grep but point at nothing. → **Example.**
2. **Is the containing document a historical record?** — a dated session note,
   memory, investigation, report, lesson-learned, or anything else written as an
   account of a moment rather than a description of the present. Dated filenames
   are the usual tell, but the test is the document's _voice_, not its folder: a
   lesson-learned is retrospective by nature even when undated. → **Leave.**
3. **If neither an example nor historical: is the path a link target, or is it
   prose?** A markdown link destination or a bare path being used as a pointer →
   **Rewrite.** A path embedded in a sentence that asserts something about the
   project ("the `docs/projects/foo/` folder contains a proposal and plan") →
   **Flag.**

| Bucket      | Action                                                                   |
| ----------- | ------------------------------------------------------------------------ |
| **Rewrite** | Rewrite to the `_archive/` path                                          |
| **Leave**   | Leave it. Report it as deliberately left, so the omission is visible     |
| **Flag**    | **Do not rewrite.** Show the surrounding sentence and ask how to proceed |
| **Example** | Leave it. Report the count only, not each hit                            |

**Earlier questions win outright.** A link inside a dated session note is still
Leave (question 2 settles it before question 3 can call it a Rewrite). A prose
claim inside an active README is Flag, not Rewrite — the prose test is what
separates them, not which file it lives in.

The Leave rule is the same one `scaffold-update-checklist` applies to skill
removal: scrub live current-state references, leave dated retrospective prose
alone — it's historical record, not a current-state claim.

The Flag rule exists because substituting a path is mechanical, while rewriting
a sentence that asserts something about the project is a judgment call this
skill shouldn't make unattended.

**Scope limits to state in the report:** this searches tracked `*.md` files
only. References in JSON/YAML config, scripts, or outside this repository are
not found. That's deliberate, but a reader needs to know it.

### Step 4: Present and Check In

Show the human two things together:

1. The reconciliation: what's complete, what remains, any conflicting signals.
2. The classified reference list: what would be rewritten, what would be left,
   what needs their judgment.

Then ask, via `AskUserQuestion`. Everything accounted for makes this an
**archival candidate** — not an archived project. Present archival as a choice,
with the evidence, and let the human answer.

### Step 5a: Not Complete — Record and Stop

The marking already happened in Step 2b. What's left here:

- Confirm the Step 2b marking is written to disk; leave incomplete items
  unmarked.
- Update a `**Status:**` line **if it holds a template enum value** — for a
  plan, that vocabulary is `Draft | Active | Completed | Superseded`. Work
  started and work remaining means `Active`. If the line is free-form
  (`V1.5 shipped, awaiting merge`), leave it and report it verbatim; ask before
  changing it (Step 2b).

**Carve-out: a run that reached 5a only because of a destination collision**
(Step 0). Nothing about that project is incomplete — what's blocked is the
_move_. Reconciliation may well have found it finished. **Do not write `Active`
over a status Step 2b just confirmed as `Completed`**, and don't add a note
implying work remains. Keep what the reconciliation found, report the collision
as the reason nothing moved, and stop. The rest of this step's status guidance
applies only to a genuinely unfinished project.

Add a short dated note explaining _why_ work remains **only when the reason
isn't self-evident from the document's own structure.** "Phases 1 and 2 done,
phase 3 is its own branch" needs no note — the marks already say that. An
abandoned approach, an external blocker, or a mid-flight scope change does.

The bar is reflection, not routine. A skill that appends prose to someone's plan
on every run is worse than one that appends none.

Nothing moves. Report and stop.

### Step 5b: Complete and Confirmed — Archive

Move the target. `git mv` fails if the destination directory doesn't exist,
which it may not in a freshly generated scaffold, so create it first:

**Run exactly one of the two blocks below — never both.** They are separate
fences on purpose: the older single-fence version put the backlog variant behind
a `# or, for a backlog item:` comment, and a comment does not stop the line
under it from executing. Pasting the whole thing attempts both moves.

For a **project folder**:

```bash
ROOT=$(git rev-parse --show-toplevel)
NAME=<project-folder-name>
mkdir -p "$ROOT/docs/projects/_archive"
git -C "$ROOT" mv "docs/projects/$NAME" "docs/projects/_archive/$NAME"
```

For a **backlog item** (`$NAME` is the filename without `.md`):

```bash
ROOT=$(git rev-parse --show-toplevel)
NAME=<backlog-filename-without-extension>
mkdir -p "$ROOT/docs/backlog/_archive"
git -C "$ROOT" mv "docs/backlog/$NAME.md" "docs/backlog/_archive/$NAME.md"
```

Internal relative links survive by construction — the folder moves as a unit,
and `docs/projects/README.md` guarantees this explicitly.

Then apply the rewrites recorded in Step 3.

**Rewrite rule: insert `_archive/` immediately before the project name in the
matched path.**

- `projects/<name>` → `projects/_archive/<name>`
- `../<name>/` → `../_archive/<name>/`
- `./<name>/` → `./_archive/<name>/` — the form `docs/projects/README.md`
  prescribes for references made from the projects directory itself

This local transformation is correct at every depth. A single normalized form —
rewriting everything to a repo-root-relative path — would break sibling links
that are correct as relative paths.

**One exception: a `../<name>/` link from a document that is _itself_ already
under `_archive/`.** Such a link resolves to `docs/projects/_archive/<name>/`
the moment the target moves — it fixes itself, and applying the rule anyway
produces `_archive/_archive/<name>/`. Leave those untouched. (Real instance in
this repo: `docs/projects/_archive/test-plan-doc-type/proposal.md` links to a
sibling.) Step 3's exclusion only filters the target's own folder, so these hits
do reach you — check whether the _referencing_ file is under `_archive/` before
rewriting a `../` form.

Leave the Leave-bucket hits untouched. Present the Flag-bucket hits and act only
on the human's answer.

### Step 6: Report

State plainly:

- What was reconciled, including any conflicting signals found
- What moved, if anything
- Which references were rewritten
- Which were **deliberately left** (and why — historical record)
- Which were **flagged** for the human, and what they decided
- The scope limits: tracked `*.md` only, this repository only

**"Nothing needed doing" is a real outcome.** A second run against an
already-reconciled project should say so explicitly rather than producing a
silent no-op that reads like a failure.

## Acceptance Criteria

- [ ] The document is more accurate than it was, whether or not anything moved
- [ ] No tracking format was imposed on a document that didn't use it
- [ ] No free-form status was silently normalized
- [ ] Reference discovery ran **before** the move
- [ ] Every discovered reference landed in exactly one of the four buckets, and
      the Leave and Flag buckets appear in the report rather than vanishing
- [ ] `git status` shows the archival as a **rename**, not a delete plus an add
- [ ] Nothing was archived without explicit confirmation

**Correctness checks, in order of authority:**

1. `git diff` of the whole run — the primary check. Read it before accepting.
2. `git status --short` — confirms rename detection held.
3. Two greps confirm the rewrite landed. **Re-running Step 3 verbatim does not
   do this** — its pattern is `(projects/|\.\./|\./)${NAME}`, which cannot match
   `projects/_archive/<name>`, so it returns the Leave-bucket hits and none of
   your rewrites. Read literally, that looks like the rewrites vanished.
   Instead:

   ```bash
   # every rewritten reference now points at _archive/ — expect your rewrite count
   git -C "$ROOT" grep -nE "(projects/|\.\./|\./)_archive/${NAME}([/)\"'[:space:]]|$)" -- '*.md'

   # nothing still points at the old location except Leave/Flag hits you kept
   git -C "$ROOT" grep -nE "(projects/|\.\./|\./)${NAME}([/)\"'[:space:]]|$)" -- '*.md' \
     | grep -vE "^docs/projects/(_archive/)?${NAME}/"
   ```

## Risks & Gotchas

- **Trusting completion marks.** The failure that inverts this skill's purpose:
  finished projects routinely carry plans with nothing marked, so mark-first
  reasoning reports shipped work as never started. Verify against artifacts and
  sessions; write the marks to match.
- **Assuming one marking idiom.** The mirror failure: scanning for `- [x]`,
  finding none, and reporting "no completion signals" when the document tracked
  its phases in status annotations or addendum notes all along. Read the
  document before deciding what it doesn't contain.
- **The naive discovery pattern is silently destructive.** It reports "zero
  references" on a project with real inbound sibling links. If you find yourself
  simplifying the Step 3 command, don't — each piece is there because the
  simpler version was verified wrong.
- **Running discovery after the move** makes the archived project's own internal
  links look like external references, and "fixing" them breaks links that were
  correct.
- **Prefix collisions are common in practice.** Projects named `foo`, `foo-v2`,
  and `foo-backlog` coexist routinely. The segment boundary is not theoretical.
- **`git mv` losing rename detection** turns a reviewable move into a large
  delete-plus-add diff that hides real changes. Check `git status --short`.
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
- **Simplifying the Step 3 discovery pattern** — verified wrong four ways.
- **Running discovery after the `git mv`** — reports internal links as external.
- **Reading an unmarked plan as unstarted work** instead of as plan drift — the
  most likely way this skill reaches a confidently wrong conclusion.
- **Adding checkboxes to a narrative document** so it "matches the template."
- **Normalizing `V1.5 shipped (awaiting merge)` to `Active`** — destroys
  information in the name of consistency.
- **Appending a "why work remains" note on every run** regardless of whether the
  document already makes it obvious.
- **Treating "not complete" as a failed run** — it's the most common outcome.
- **Rewriting a memory or session note** because it contains the old path.

## Output

At completion, summarize:

- Target and its resolved state
- Reconciliation result: complete / not complete, with the evidence
- Whether anything moved, and where
- References: rewritten / left / flagged, with counts and the reasoning for the
  left ones
- Scope limits that applied
- Follow-up items, if any
