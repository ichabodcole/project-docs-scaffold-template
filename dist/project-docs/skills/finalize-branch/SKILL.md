---
name: "finalize-branch"
description: >
  Code review, documentation, and merge workflow for completed branches. Use
  this instead of generic branch-completion skills — determines the base branch,
  performs independent code review via subagent (verifying the reviewer can
  execute code first), runs quality checks (format, lint, types, test), creates
  a session record in the work item's (or feature's) folder, runs a Reflect step
  that usually ends "nothing this time", moves the work item to `review` and
  then `done`, checks test plan results, and lands the branch per the project's
  own landing policy if one is defined (squash, consolidate, or leave history
  untouched) back to the base. Triggers when user says "finalize branch", "merge
  to develop", "merge to main", "finish this branch", "ready to merge", "wrap up
  this work", or wants to complete feature work with documentation and code
  review.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Agent
  - Task
  - Skill
  - AskUserQuestion
---

# Finalize Branch

Code review, documentation, and merge workflow for completed branches.

**Playbook override:** if the project has
`docs/playbooks/branch-finalization-playbook.md`, follow the workflow there — it
takes precedence over this file wherever the two differ — and say in your output
that you followed it, naming the file. Most projects don't have one; the steps
below stand on their own. Two narrower overrides apply at their own steps:
`handoff-playbook.md` (Step 6) and `release-playbook.md` (Step 8).

**`pdocs`** below means `bun scripts/pdocs/cli.ts`, the documentation CLI at the
repo root. Every `pdocs` step applies only when that file exists; a project on
an older scaffold has no work items, and those steps are skipped silently. The
docs root is `docsRoot` in `.project-docs.json` at the repo root, default
`docs/`.

## Workflow

### Step 0: Determine the Base Branch

**Do not assume `develop` or `main`.** Every command in the remaining steps
needs a base branch — the branch this feature branch was created from. Different
projects and different branches use different bases (`develop`, `main`,
`master`, `trunk`, `staging`, or a long-lived feature branch). Guessing wrong
leads the scope calculation and all subsequent steps to operate on the wrong
delta.

**How to figure it out:**

1. Check the upstream tracking branch if set:
   `git rev-parse --abbrev-ref @{upstream} 2>/dev/null`
2. Check the repo's default branch and recent merge history:
   - `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null` (often
     `origin/main` or `origin/develop`)
   - `git log --oneline --decorate -20` to see what's recently merged
3. If the user has project conventions documented (CLAUDE.md, AGENTS.md, or a
   root README), check there for a stated default branch workflow.
4. If after those checks you're still unsure, **ask the user explicitly**:
   _"What branch was this work based on / should it merge back into?"_ Don't
   guess.

Once established, use this base branch in every subsequent command — the
examples below use `<base>` as a placeholder. Replace it with the actual base
branch name (e.g., `develop`, `main`, `trunk`) for execution.

**Then resolve the branch's work item** — the item whose state this run moves.
`init-branch` names the branch after the item it started (`<type>/<item-slug>`)
and sets that item `active`, so look in this order:

1. The branch's description matches an item's slug. List the items with
   `pdocs find --type item --format json`; an item's slug is its file name
   without `.md` (`items/<slug>.md`), or its folder's name
   (`items/<slug>/item.md`).
2. Exactly one item is `active`: `pdocs find --type item --lifecycle active`.
   Ask the user to confirm it is this branch's.
3. The user names one; `pdocs find --id <prefix>` resolves an id they paste.

**Check the match's state.** The branch's item should be `active` —
`init-branch` started it. A match in `triage`, `backlog` or `ready` did not come
from `init-branch`: ask the user whether this branch is that item's work.
**Never move a `triage` item on your own judgement** — a yes from the user is
their decision to take it on; a no means none was found. A match already `done`
or `dropped` is not this branch's; treat it as none found.

**None found is allowed** — work often runs before anyone files an item. Say so,
and Step 4 creates one for it. Keep the item's reference (`item/<slug>`) and its
full `id` (the `id` field of `pdocs find --format json`) for Steps 2, 4, 6
and 7.

### Step 1: Understand Branch Scope

Review commits, files changed, and overall accomplishment.

```bash
git log <base>..HEAD --oneline
git diff --stat <base>
```

### Step 2: Independent Code Review (Mandatory)

**This step is not optional and cannot be self-performed.** Dispatch a subagent
to perform the review — do not review the code yourself.

**Why:** The agent that wrote the code cannot be a fresh reader of it. An "I've
been reviewing as I go, so this is covered" reflex is the signal to delegate,
not to skip.

**How:**

1. **Verify the reviewer exists and can execute code before dispatching — and
   show your work.** Check the Agent tool's currently available types first. Any
   reviewer name you carry in from habit or from another project may no longer
   exist here (plugins get removed, renamed, or restructured independently of
   this skill), or may exist only as a skill-driven prompt template rather than
   a directly dispatchable agent type — a skill name cannot be passed as
   `subagent_type`.

   **Read the capabilities the roster states, and know that most of its answers
   don't contain the word `Bash`.** Rosters report capability in several shapes:
   an explicit tool list, a bare wildcard (`*`), `All tools`, or
   `All tools except …`. Only the first can be searched for the token. A
   wildcard or an unqualified "all" grants shell access; an exception list
   grants it unless `Bash` is among the exceptions. Searching for the literal
   string and concluding "no `Bash`" from a wildcard is the most likely way to
   fail this check while believing you passed it. **If the roster states no
   capabilities at all, you cannot run this check** — say so and ask, exactly as
   if no capable reviewer existed. "I could not determine capability" and "none
   is capable" are different answers, and both stop here. And beware a list that
   _looks_ like shell access: `BashOutput` and `KillShell` without `Bash` mean
   the agent can read and kill shells it has no way to start.

   **This check is a hard gate, and it fails _open_:** skip it, dispatch a
   plausible-sounding reviewer, and you get a confident-looking report with
   nothing behind it. Nothing downstream will notice. So it has to leave a
   trace:
   - **Report the census before dispatching** — where you read the roster, the
     reviewers you checked, each one's shell-access status, which you chose, and
     why. That field list is the whole of it; the same fields are what Step 4
     and the Output section ask for.

     **The census is your account of what you did, not proof that you did it.**
     The roster lives in context, so reading it costs no tool call and leaves no
     trace; nothing about the resulting text distinguishes a real check from an
     invented one. A definition and a rule keep it useful anyway, and the
     evidence that bites arrives later, from the reviewer (item 4).
     1. **The roster is the set of agent types you can dispatch right now**,
        with the capabilities attached to them. Agent definition files in this
        repo (`plugins/*/agents/`) are **not** the roster — different prefixes,
        usually no `tools:` field, and silent about what is installed in this
        session. Censusing from them is a real action that answers the wrong
        question.
     2. **Say what you rejected and why** — including at least one rejected on
        capability grounds where there is one, and saying plainly that every
        available reviewer had shell access where there isn't. A census naming
        only the agent you were always going to pick records no decision; a
        rejection invented to satisfy this line is worse than none.

   - **If no execution-capable reviewer is available, stop and say so**, then
     ask how to proceed. Don't quietly fall through to a read-only reviewer.

   **This file prints no reviewer's tool list.** Any list here would be an
   answer to the question the census sends you to go and ask — and would go
   stale silently besides. Capability findings from past runs belong in the
   session records, not on this page.

2. **Choose a reviewer** based on what this branch needs. The review of record
   must come from an execution-capable reviewer; a read-only one may appear only
   in a paired, clearly-labelled second-opinion role:
   - **A plan-aware reviewer** — prefer when the branch has an approved
     `feature.md` (or an item with a definition of done), `plan.md`, design
     resolution, or similar spec to validate against. Look for an available
     agent or skill-driven review specialized for plan-alignment ("did we build
     what we said we'd build?"), architecture, and design-pattern review — check
     what's actually dispatchable in the current environment rather than
     assuming a previously-known name still resolves. **A skill-driven review
     does not discharge this step by itself:** the census attaches to a
     dispatched agent, and a skill is not one. Route through one if it helps,
     but census whatever it ultimately dispatches, and the requirements here
     still apply to that — the execution log included. **The best-shaped
     candidate here may well be read-only, and picking it feels _more_ compliant
     than falling back — shape does not substitute for the census.** If no
     plan-aware reviewer has shell access, brief a general-purpose reviewer
     explicitly to check the diff against the plan.
   - **A confidence-filtered reviewer** — a tight, low-noise report focused on
     real bugs, security issues, and clear convention violations. These are
     frequently read-only. If your census says this one is, it is a labelled
     second opinion beside an execution-capable reviewer, never the review of
     record — and it cannot run `git diff` itself, so paste the diff into its
     prompt.
   - **Dual review (both in parallel)** — for meaty branches: large diffs (~500+
     lines), work spanning multiple subsystems, significant architectural
     decisions, or anything high-stakes. The two reviewers flag different things
     — one's confidence filter catches bugs the other misses, the other catches
     architecture and plan drift. Dispatch them in parallel (one message,
     multiple Agent calls — the dispatch tool is named `Agent` in current
     environments and `Task` in older ones), then reconcile findings into a
     single merged report for the user. **At least one of the two must be
     execution-capable**; a pair of read-only reviewers is two static reads, not
     a dual review.
   - **A general reviewer briefed specifically for this branch** — the fallback
     when no specialist has shell access, and often the better option anyway:
     full tooling, persistent context, and re-dispatchable with that context
     intact for follow-up questions. Note the fallback in the session doc, and
     **census it like any other candidate** — this file makes no claim about
     what any agent can do.

3. **Scope the review to the net diff.** `git diff <base>..HEAD` is the truth —
   commit history is noise. Tell the reviewer to review the delta, not the
   commit log.

4. **Prompt template** — include all of these in the dispatch:
   - What the branch is supposed to accomplish (1–2 sentences).
   - Base branch and link to any approving proposal/plan if one exists.
   - Known constraints, conventions, or project guidelines (e.g., "follow
     patterns in CLAUDE.md / AGENTS.md").
   - Explicit asks: flag bugs, security issues, convention drift, missed edge
     cases.
   - **Tests-vs-mocks check:** "Do the tests actually test logic, or do they
     mostly exercise mocks? Flag tests that pass without proving the code under
     test works."
   - **A read-only constraint:** "Report only — make no edits to the repository
     under review." An execution-capable reviewer can write, and one that
     helpfully fixes what it finds alters the diff between here and the landing
     checks in Step 8 — which read the tree and the branch you are about to
     squash. You will not see it happen.
   - **Execution log:** "List the commands you actually ran. If you ran none,
     say so plainly." You cannot see a subagent's tool calls — only its final
     report — so without this, "the review verified the behavior" is a claim
     nobody can check, including you. You do not author it — which is what makes
     it evidence, where the census is testimony.
   - **Ship verdict:** "End your report with a clear verdict — _Ready to merge:
     Yes / No / With fixes_ — and a one-sentence reasoning."

5. **Move the work item to `review` just before you dispatch** — the work is now
   waiting on a reviewer — and tell the reviewer in the prompt that an
   uncommitted `lifecycle: review` change in the item's file is expected:

   ```bash
   pdocs set item/<slug> --lifecycle review
   ```

   Skip it when Step 0 found no item. It moves to `done` in Step 6. If the
   review sends you back to fix things on the branch, it stays `review` while
   you do; re-review what changed.

6. Wait for the subagent's findings (or both, for dual review) before
   proceeding.

**After review:**

- Surface the findings to the user — don't silently act on them.
- For dual review, present both reports side-by-side (or as a merged summary
  noting which reviewer flagged what) rather than picking one.
- Address high-confidence issues (bugs, security, clear convention violations)
  before moving to quality checks.
- For subjective or low-confidence suggestions, defer to the user.
- **A finding that is real but not for this branch becomes a work item**, not a
  line in a report that nobody reads again. Note each one now; file it in Step 4
  once the session document exists, because a review writes `from:`:

  ```bash
  pdocs new item <slug> --kind <task|bug|chore> \
    --title "…" --description "…" --by "<your model or name>" \
    --from <docs-root-relative path of the session document>
  ```

  Pass `--parent feature/<slug>` when the finding belongs to the same feature as
  this branch's item, so the feature does not look finished without it. It
  starts in `triage` — the default, and the right state: the user decides at
  triage whether it is worth doing. Don't pass `--lifecycle`, and don't set
  `priority`.

- If the reviewer(s) produce a "Ready to merge: No" or "With fixes" verdict,
  treat those fixes as blocking before Step 3. **Only the user can defer a
  blocking finding**: if they choose to land anyway, file it as a work item
  (below) and record in the session's Review section who deferred it and why.
  **Blocking attaches to the concrete findings, not to the verdict label** —
  where the fixes behind a "With fixes" are all subjective, that is the previous
  bullet's case: present them and let the user decide.
- If the reviewer produces nothing actionable, that's a valid result — say so
  explicitly rather than pretending no review happened.
- **State which reviewers ran and what each actually executed** — quoting the
  execution log, not inferring it from the fact that a reviewer _had_ `Bash`.
  Having shell access and using it are different claims, and only the second is
  a review. A reviewer that came back with no commands did a static read: label
  it as one. A static read presented as a verified review is worse than no
  review, because the user cannot tell them apart.

### Step 3: Run Quality Tools

Run these in sequence, fixing issues as they arise. **This is a hard gate** — do
not proceed to documentation or merge with failing checks.

```bash
pnpm run format
pnpm run lint
pnpm run check-types
pnpm run test
```

**If the project has a documentation lint** — `scripts/pdocs/cli.ts` exists at
the repo root (the docs root is `docsRoot` in `.project-docs.json`, default
`docs/`) — run it too, and treat it as part of the same gate:

```bash
bun scripts/pdocs/cli.ts check
```

Run it **again in Step 7**, once the session document and any other new
documentation are written but before they are committed. This run checks the
code you are landing; that run checks the documents you are about to land, which
don't exist yet.

Two things it reports are not failures to fix here:

- **`adopting: true`** — the project is still backfilling frontmatter and the
  lint says so on every run while exiting 0. Don't turn it off to make the
  output quieter; it turns off when the backfill finishes.
- **Pre-existing problems in documents this branch never touched.** Report them
  and carry on. A branch is not obliged to fix a tree it didn't break — but say
  so out loud, rather than letting a red gate read as this branch's fault.

### Step 4: Create Session Document

The document must include a **Review** paragraph carrying the Step 2 census —
the same fields, including where the roster was read — plus which reviewers ran
and what each executed, quoted from their execution logs. Chat scrollback is not
a trace; it survives the session and nothing else. A future reader asking "was
this genuinely reviewed, or only reviewed-looking?" has this file and nothing
else to go on.

**Its owner is the work item from Step 0.** If Step 0 found none, create the
item now — the work ran first, and this is its record:

```bash
pdocs new item <slug> --kind <task|bug|chore|research> \
  --title "…" --description "<one sentence: what this branch did>" \
  --by "<your model or name>" --lifecycle review \
  [--parent feature/<slug>]
```

It skips `triage` because the work is already built and the user asked for it to
land; it moves to `done` in Step 6, so it lands born done. Give it `--parent`
when the branch built part of a feature.

Then create the session in the owner's `sessions/` folder:

```bash
pdocs new session <topic> --owner item/<slug> \
  --title "<Topic> — YYYY-MM-DD" --description "…" --by "<your model or name>"
```

A single-file item is promoted to a folder first, and the CLI writes the
session's link to its owner (`../item.md`) into the session's Related section.
**Use `--owner feature/<slug>` instead** when the branch is one of several
building a feature whose folder already holds their sessions — the work tracked
at the feature, not at one item. Either way, never create the file by hand: the
CLI picks the dated filename, the template and the frontmatter.

Fill every placeholder the command leaves — the frontmatter below, and in the
body the H1 (`# [Topic] — YYYY-MM-DD`: the CLI does not fill it from `--title`),
and the template's example bullets under Related Documents (delete them; keep
the owner link the CLI wrote). Add a `## Review` section for the census. For the
frontmatter: **The lint will not catch a placeholder** — it checks that each
required key is present and non-empty, and `description: "[One sentence …]"`
satisfies that perfectly well. So this is on you, not on the gate:

- `type: session` — written by the CLI; the folder decides it. Don't change it.
- `title` — the session's topic and its date, matching the H1
- `description` — one sentence saying what this session did. Not a paraphrase of
  the title; this is the line that has to earn a reader's click.
- `tags` — 2–4 kebab-case keywords, replacing the template's `[area, feature]`
  (or pass `--tags` to `pdocs new`). The lint doesn't require them on workbench
  documents, but a session someone will search for later is worth tagging.
- `status` — `stable`, as the template ships it. A session is a frozen record,
  complete the moment it is written; it is never a draft.
- `generated: { by: <your model or name>, at: <today, YYYY-MM-DD> }`

**Don't write `related:`.** `docs/SCHEMA.md` resolves those edges against
library pages only, and a session, an item, a feature and a cycle are all
workbench. Link the cycle in the body instead — when the item is in the cycle
(its `cycle:` names it; if the branch belongs to the active cycle and the item
doesn't name it yet, run `pdocs set item/<slug> --cycle <cycle-slug>` first) — a
line under the session's own heading,
`Part of [<cycle title>](<relative path>/cycles/<slug>.md)`, which is a real
link the lint checks. From `items/<slug>/sessions/` and from
`features/<slug>/sessions/` that path is `../../../cycles/<slug>.md`.

A session carries **no `lifecycle`** — writing one is a lint error. See
`docs/SCHEMA.md` for why frozen records don't have a pipeline state.

**Now file the review's deferred findings** (Step 2), each with
`--from <this session's path>`, and list them in the session under a short
**Follow-up items** line so a reader of either can find the other.

### Step 5: Reflect

Ask one question, and answer it honestly:

> **Did this branch teach something that would save a future agent from
> rediscovering it?**

The bar is high and **the default answer is no.** Most branches do what they set
out to do and teach nothing a future agent needs; the session record already
holds what happened, and that is enough. When the answer is no, **say so out
loud** — "Reflect: nothing this time." — and write nothing. That line is a real
outcome, not a skipped step.

When the answer is yes, the usual outcome is **appending to an existing
playbook**, not writing a new document. Playbooks are indexed by the kind of
work they cover, and their `description` is the index:

```bash
pdocs find --type playbook --format json
```

Pick the playbook for this kind of work and append a **Step** (an imperative
instruction) and a **Verification** (how the next agent can tell the step was
done) to its sections. Write it as an instruction, not as a story: no "we
discovered", no "the journey". If no playbook fits and the lesson is genuinely
reusable, propose a new one (`pdocs new playbook <slug>`, shaped Goal · Steps ·
Verification) and ask the user before creating it. Quote the `pdocs find` output
you chose from, so the choice can be checked.

Never write a memory or a lesson: both types are retired. A playbook is a
library page, so a new one needs its catalog line in `docs/index.md` —
`pdocs new` writes it. Check that `pdocs check` reports no `ORPHAN` or
`STALE HOOK`.

### Step 6: Assess Additional Documentation

Present recommendations to user and get confirmation before creating new
documents. **The item's state, plan reconciliation and the cycle's session line
are the exceptions** — each edits something that already exists, and each is an
action to perform, not a recommendation to offer. Do them without asking.

- **The work item moves to `done`.** The branch is landing, and this change is
  committed with the session in Step 7, so it lands with the branch and is
  discarded with it:

  ```bash
  pdocs set item/<slug> --lifecycle done
  ```

  Leave its parent feature alone: a feature is moved to `done` by
  `sweep-project`, not by one branch.

- **Handoff** — Does this work require specific deployment steps beyond merging
  code? (DB migrations, service redeployments, environment config changes,
  manual coordination.) If so, create one beside the session's owner:
  `pdocs new handoff --owner item/<slug>` (or `feature/<slug>`). **If the
  project has `docs/playbooks/handoff-playbook.md`, follow it** for what the
  handoff must contain — it takes precedence over the template — and say that
  you did.
- **Architecture** — Did this change the system's structure in a way a future
  reader would need explained? If so, propose creating or updating a doc in
  `docs/architecture/` (see `docs/architecture/README.md` for conventions).
- **Interaction design** — Did this change how users interact with a feature? If
  so, propose creating or updating a doc in `docs/interaction-design/` (see
  `docs/interaction-design/README.md` for conventions).
- **Specifications** — Check if `docs/specifications/` exists and whether
  changes affect documented behavior. Flag any that may need updating.
- **Test plan** — If the owner's folder (the item's, or its parent feature's)
  holds a `test-plan.md`, verify that a Results Addendum section is present with
  pass/fail/blocked statuses. Flag any Tier 1 or Tier 2 scenarios without
  results. This is a soft check — don't block the merge, but surface it to the
  user.
- **Plan reconciliation** — If a `plan.md` exists for this work (in the item's
  folder or its parent feature's), reconcile it in place against what was
  actually built: mark the completed items, and when every phase is done set its
  frontmatter `lifecycle` to `completed` (its vocabulary is
  `draft · active · completed · abandoned`, per `docs/SCHEMA.md`'s **Lifecycle
  by type** table — read it there). `pdocs set` changes features, items and
  cycles only, so edit the plan's frontmatter line directly. Don't add a
  `**Status:**` line to the body; `lifecycle` is the one place state lives.
  **Verify against the artifacts and the session record, not against what the
  document currently claims** — finished work routinely leaves plans unmarked,
  so an unmarked plan means "unreconciled," not "unstarted."

  **Mark completion in whatever idiom the plan already uses** — checkboxes if it
  has them, a per-phase annotation or a short addendum note if that's how it
  tracks. Don't impose a format the document didn't choose, and don't conclude a
  plan is unmarked because it isn't using checkboxes.

  Do the reconciliation here rather than deferring it. Updating the plan as the
  work lands is part of the work — it's what makes the document trustworthy
  signal for whoever picks the work up next. Surfacing the gap without closing
  it just moves the debt.

  **What's soft here is the discrepancy, not the work.** Performing the
  reconciliation is mandatory. What doesn't block the merge is an item you
  genuinely can't resolve — you can't tell from the artifacts or the session
  record whether it shipped. Record that item as unresolved, say so in your
  report, and carry on to Step 7. (Contrast the test-plan check above, where
  "soft" does mean surface-only.)

- **Is the feature finished?** If the item has a `parent` feature, look at the
  feature's items:

  ```bash
  pdocs view feature <slug>
  ```

  If every item it lists is `done` or `dropped` — not merely this one — ask
  whether this branch completes the feature, and offer to invoke the
  `sweep-project` skill, which reconciles the feature, sets its terminal state
  and archives it. **Pass it the reference explicitly** — `feature/<slug>` —
  because `sweep-project` will not infer a target, by design. This mirrors Step
  8's delegation to `consolidate-long-branch`: present the option, then invoke
  the skill once the user chooses.

  **A yes here is not archival approval.** It means "go look" — `sweep-project`
  runs its own reconciliation and stops at its own confirmation gate before
  moving anything. Don't present this question as the last word, and don't treat
  a yes as license to skip the gate downstream.

  Three notes on the handoff:
  - **Name yourself as the caller when you invoke it.** `sweep-project` gates on
    a dirty `docs/` tree and carves out delegated runs, but nothing tells it who
    called — an unannounced run is treated as standalone. State that
    `finalize-branch` Step 6 is invoking it, alongside the target reference, or
    it stops and asks about the documentation changes you just wrote.
  - `sweep-project` re-reads from disk, so it sees the state you just wrote. The
    second pass is idempotent, not duplicated work.
  - When invoked from here, it leaves its changes uncommitted for Step 7. If it
    archives, the squash in Step 8 operates on the post-move tree — which is
    correct. Step 8's sha scan deliberately does not: it reads the branch as it
    stood _before_ Step 7's documentation commit, so neither the archival nor
    the reconciliation can veto the squash that carries them.

- **The active cycle** — if the project keeps `docs/cycles/`, find the cycle
  whose `lifecycle` is `active`:

  ```bash
  pdocs find --type cycle --lifecycle active
  ```

  No cycles directory, or no active cycle, means there is nothing to do here —
  say so once and move on. Two active cycles is a lint failure; report the
  filenames and edit neither.

  With one active cycle, do two things:
  1. **Update this branch's line in the cycle's `## Sessions` section.**
     `init-branch` Step 6 wrote it as `- <type>/<description> (open)`; rewrite
     that line as `- <type>/<description> (landed YYYY-MM-DD)`, using today's
     date. Change the marker in place — the section reads chronologically, so
     don't relocate the line. If it isn't there at all (the branch predates the
     cycle, or was created some other way), append it in the landed form rather
     than pretending it was tracked all along. This is an edit to perform, not a
     recommendation to offer.
  2. **Ask whether the cycle is done**, but only when the cycle's view says it
     can close:

     ```bash
     pdocs view cycle <cycle-slug>
     ```

     A cycle's work is the items that name it (`cycle: <slug>`); nothing lists
     it in the cycle file, and items that don't name it — a follow-up just filed
     in `triage`, say — don't hold it open. The view reports `closable: yes`
     when the cycle has at least one item and every one is `done` or `dropped` —
     which, after this step's `pdocs set`, may now include this branch's item.
     If it reports `closable: no`, say which items are holding it and stop
     there.

     When it is closable, offer to invoke `sweep-project` with `cycle/<slug>` as
     its target — it routes to its Cycle Path. Closing a cycle means writing its
     `## Outcome`, setting `lifecycle: closed` and `closed: <date>`, and moving
     any remaining `(open)` session lines; that belongs where the rest of the
     closing logic lives, not inlined here.

  **The cycle question is not the feature question.** A cycle usually spans
  several features and a feature usually spans several cycles, so answering one
  tells you nothing about the other. Both prompts can fire on the same branch;
  ask them separately.

### Step 7: Commit the Session Record

Stage and commit documentation changes under `docs/` — new files, and also edits
and moves (the item's state, plan reconciliation, a promotion, any
`sweep-project` archival land as modifications and renames, not only as new
files). Scope the staging to `docs/` rather than staging everything, so
unrelated uncommitted code doesn't ride along.

**Re-run the documentation lint first** (below), then commit. **This commit
carries the work item's trailer.** End its message with the item's full `id`, as
a git trailer, in one final paragraph with any other trailers:

```bash
git commit -m "docs: session record for <branch>" -m "Work-Item: <full item id>
Co-Authored-By: …"
```

Use the full id from `pdocs find --type item --format json`, not the 12
characters `pdocs` prints — a trailer has to resolve years later, when many more
ids share that prefix. Put it beside any other trailers your project requires
(`Co-Authored-By:` and the like), in one final paragraph.

This commit is the one the trailer lives on under every landing policy. If Step
8 squashes, **carry the trailer into the commit that absorbs this one** — the
single squashed commit (Strategy A), or the chapter that holds the session
record (Strategy B) — and check it survived in Step 8.5.

If Step 8 lands on a single-commit squash, this commit folds into it — that's
expected. Committing here still matters: it keeps the documentation work
recoverable and reviewable as its own step before any history rewriting.

**The lint run before that commit**, if the project has one (Step 3):

```bash
bun scripts/pdocs/cli.ts check
```

This is the run that checks what you just wrote — the session document, the
item's new state, the reconciled plan, the cycle edit, any follow-up items. Step
3's run happened before any of them existed. A missing `description`, a
`lifecycle` outside its type's vocabulary, or a link to a document that moved
all surface here and nowhere else.

### Step 8: Determine Landing Policy and Execute

**Whether and how to squash is a project decision, not something this skill can
assume.** Different projects have different reasons to want one clean commit
(readability) or to explicitly forbid squashing (SHA-pinned doc citations,
commits authored by more than one Anthill seat, each signing its own work with
an `Anthill-Seat:` trailer — or wanting to bisect the reasoning behind a branch
where documentation commits are rulings, not commentary). This skill's job is to
find and follow that decision, not make it.

**Landing on a release branch.** If this branch lands on `main` (or whatever
branch the project releases from) and the project has
`docs/playbooks/release-playbook.md`, follow it for the landing — it takes
precedence over the strategies below — and say that you did.

**How:**

1. **Compute the branch facts — always, regardless of policy.** This part is a
   fact about the branch, not a judgment call, so the skill can own it outright:

   ```bash
   # Substitute the real base branch name. Pasted verbatim, `<base>` is a
   # shell redirection and the first line is a parse error.
   BASE=<base>
   ROOT=$(git rev-parse --show-toplevel)

   # Scan a committed ref, not the working tree, and step past the
   # documentation commit Step 7 just made. HEAD^ is the normal case; use HEAD
   # instead if Step 7 had nothing to commit.
   SCAN=HEAD^

   git log "$BASE"..HEAD --oneline | wc -l                       # commit count
   for sha in $(git log "$BASE"..HEAD --format=%h); do
     hits=$(git -C "$ROOT" grep -l "$sha" "$SCAN" -- '*.md')
     if [ -n "$hits" ]; then printf '%s is cited by:\n%s\n' "$sha" "$hits"; fi
   done                                                          # shas cited in docs

   # Contributors whose authorship a squash would collapse. Count these two
   # lists separately; AI co-author trailers are deliberately absent from both.
   git log "$BASE"..HEAD --format='%(trailers:key=Anthill-Seat,valueonly)' \
     | grep -v '^$' | sort -u                                    # anthill seats
   git log "$BASE"..HEAD --format='%an' | sort -u                 # human authors
   ```

   If the sha loop finds any hit, or **either** identity list returns more than
   one line, **squashing would destroy that information.** Surface this
   explicitly no matter which strategy follows.

   **Count seats and human authors — never AI co-author trailers.** A branch
   with one human author and one `Co-Authored-By: Claude …` trailer carries that
   exact pairing onto the squashed commit, so a squash destroys nothing; a
   model-version change mid-branch (`Opus 4.8` → `Opus 5`) is not a second
   contributor either. In any repo that mandates the trailer, counting it vetoes
   every branch and makes "default to squash" unreachable — a rule that never
   permits anything is a rule nobody reads. The case this check exists for is a
   multi-seat Anthill team, where each seat signs its own commits and a squash
   really does erase who did what. That is a fact about **the branch**: an
   Anthill project on which only one seat committed squashes normally.

   **About the sha scan.** It reads a committed ref rather than the working
   tree: by this point the tree holds the session doc, the item's new state and
   the reconciled plan written in Steps 4–6, and scanning it lets this skill's
   own output veto its own squash. It scans the branch rather than `<base>`,
   because a commit in `<base>..HEAD` did not exist at `<base>` and nothing
   there could cite it — the citations that matter were written on this branch,
   by the work itself. A short sha is seven hex characters and can appear
   incidentally, so read each hit before treating it as a veto.

   **The `-C "$ROOT"` anchor is load-bearing.** `git grep`'s `'*.md'` pathspec
   resolves against the current directory, so running this from a package
   subdirectory in a monorepo searches only that subtree and reports zero
   citations — a silent and _permissive_ failure in the one guard standing
   between a SHA-cited ruling and the squash that would destroy it. This check
   fails open, so the anchor is not optional.

2. **Look for a project-owned landing policy.** Check, in order:
   - `docs/playbooks/branch-finalization-playbook.md` (the override at the top
     of this file). If it says how to land, that is the policy: follow it, and
     it waives this step's "announce and ask" and the squash checkpoint as far
     as it says. Still compute and surface step 1's branch facts.
   - Root `AGENTS.md`, then root `CLAUDE.md`, for a `## Branch Landing Policy`
     heading (exact match).
   - If that section only points to another file (e.g. "see
     `docs/BRANCH_POLICY.md`"), follow the pointer one level and read the linked
     file.
   - Within that section, a fenced code block only counts as a **runnable
     check** — run it and show the output, don't paraphrase — if it's introduced
     as something to run (a `bash`/`sh`-tagged block, or prose like "run:"
     immediately before it). Fenced blocks that are clearly illustrative
     (example output, a diagram) are not commands to execute.

3. **If a policy was found:** print the section's content inline — not "see your
   project's policy"; a pointer that needs a second lookup is a pointer that
   gets skipped — and follow it. If it conflicts with what step 1 found (e.g.
   the policy says "always squash" but this branch has cited shas or multiple
   identities), surface the conflict to the user before proceeding. Don't
   silently pick one.

4. **If no policy was found**, say so explicitly — an announced absence, not a
   silent guess — then present three options and ask the user to choose, or to
   go define `## Branch Landing Policy` in `AGENTS.md` first:
   - **Strategy A or Strategy B** (below), with their tradeoffs, informed by the
     branch facts from step 1.
   - **Leave history untouched** — merge or PR as-is, no squash/consolidation.
     Lead with this option whenever step 1 found cited shas or multiple
     identities, since squashing would destroy real information in that case.

**Strategy A — Single-commit squash:**

Use when the work is small or medium enough to summarize in one coherent commit
message. Simpler, cleaner, easier to revert as one unit.

```bash
git reset --soft <base>
git commit -m "<single descriptive commit message>"
```

**Strategy B — Multi-commit consolidation:**

Use when the branch naturally splits into 5–10 logical chapters (e.g., "schema
and migrations", "API", "UI", "tests", "docs"), **and each chapter is
functionally independent** — it builds and delivers value on its own, not only
once a later chapter lands. Preserving those chapters on the base branch makes
the feature's evolution readable months later, which matters more for big
features.

For this strategy, **invoke the `consolidate-long-branch` skill** — it provides
the full safe workflow (backup refs, cherry-pick + soft-reset, tree-equivalence
verification) so the consolidation cannot silently drop or duplicate changes. Do
not attempt a hand-rolled multi-commit squash; the tree-equivalence check is the
only reliable way to verify the consolidated branch matches the original tip.

**Reasoning to offer when presenting the options — lead with functional
independence, not commit count:**

The real question is **"does each proposed chapter deliver something useful and
buildable on its own?"** — not "how many commits are there?" Chapters are only
justified when each one stands alone: it builds and delivers value _without_ the
later chapters. A chapter that "only makes sense once the next chapter lands" is
exactly the partial, interdependent commit Strategy B is meant to avoid, just at
a coarser grain — collapse those into a single squash.

- **Apply the independence test first.** Can each candidate chapter be checked
  out and built/run in isolation, delivering self-contained value? If not, lean
  toward Strategy A regardless of commit count.
  - _Failure mode to watch for:_ a new daemon whose `server.ts` imports its own
    bundled UI surface — a "daemon" chapter won't build without the "surface"
    chapter, and the surface is inert without the daemon. Neither stands alone,
    so despite a high commit count the branch correctly collapses to one commit.
- **Commit count is a secondary signal** — it _prompts_ the question, it doesn't
  answer it. A high count hints there may be separable work; it doesn't
  establish it.
  - Under ~10 commits → Strategy A is usually the easy call.
  - 10–20 → Strategy A unless chapters are both wanted _and_ independently
    buildable.
  - 20+ → run the independence test; Strategy B only makes sense if the chapters
    pass it.
- Present the recommendation with the count, the independence judgment, and
  reasoning, then ask: _"This branch has N commits. No landing policy is defined
  in AGENTS.md, so here are the options: [Strategy A/B], with [costs]. I'd lean
  toward [X] because [reason] — which do you want, or should we define a policy
  first?"_

### Step 8.5: Verify the Squashed Result

Skip this step if the landing policy called for preserving history untouched —
nothing was squashed. Otherwise, after squashing (either strategy), do a quick
sanity check:

1. Run `git log --oneline <base>..HEAD` — confirm the commit count and subjects
   match the chosen strategy (1 commit for A, planned count for B).
2. Run `git diff <base>..HEAD --stat` and spot-check that the files and line
   counts match what the feature should have touched.
3. For Strategy A: read back the squashed commit message and confirm it
   accurately summarizes the diff — not a generic "implement feature X" line
   that drifted from reality.
4. For Strategy B: the `consolidate-long-branch` skill's tree-equivalence check
   (Phase 5) is the authoritative correctness gate — confirm it ran and produced
   zero output.
5. **The `Work-Item:` trailer survived.** It was on Step 7's commit; after a
   squash it must be on the commit that absorbed that one:

   ```bash
   git log <base>..HEAD --format='%h %(trailers:key=Work-Item,valueonly)'
   ```

   Expect the item's full id on exactly one line. If it is missing, amend the
   commit that holds the session record to add it back.

This is a sanity check, not another code review. If anything looks wrong, stop
and diagnose before offering completion options.

### Step 9: Present Completion Options

After documentation and squash are done, present these options:

```
Ready to integrate. What would you like to do?

1. Merge to <base> (default)
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work
```

**Option 1: Merge to `<base>`** (default workflow)

```bash
git checkout <base>
git merge --ff-only <branch>
```

Then delete branch and remove worktree if applicable.

**Option 2: Push and create PR**

```bash
git push -u origin <branch>
gh pr create --title "<title>" --body "<summary>"
```

Keep worktree intact — user may need to address review feedback.

**Option 3: Keep as-is**

Report the branch name and worktree path. Do not merge, push, or clean up.

**Option 4: Discard**

Confirm before proceeding — list the branch name, commits that will be lost, and
worktree path. Require explicit confirmation from the user.

```bash
git checkout <base>
git branch -D <branch>
# Remove worktree if applicable
```

### Step 10: Cleanup

Delete branch and remove worktree if applicable (Options 1 and 4 only).

## User Checkpoints

Ask for user confirmation at these points:

- **Step 2, if no execution-capable reviewer is available** — stop and ask
  before dispatching anything. This is a halt, not a note; the review of record
  cannot be a static read
- After independent code review findings (before proceeding)
- Before creating additional documentation (beyond session) — note that Step 6's
  plan reconciliation is exempt: it edits an existing document and is performed,
  not proposed
- When every item of the parent feature is `done` or `dropped`, before
  delegating to `sweep-project` (and again inside that skill, before anything is
  archived)
- Before creating a new playbook in Step 5 (appending to an existing one needs
  no extra confirmation)
- Before squashing commits (confirm landing policy found or absent, strategy A
  vs B, and commit message)
- Before merging to the base branch

## Important Constraints

- **Default is local** — Only push to remote if user selects Option 2 (PR)
- **Fast-forward only** — Never create merge commits when merging locally
- **Landing policy is project-owned** — Check `AGENTS.md`/`CLAUDE.md` for a
  `## Branch Landing Policy` section before choosing squash vs. consolidate vs.
  neither (Step 8). Absent a policy, present the options and their costs rather
  than silently defaulting — some projects have real reasons (SHA-cited docs,
  commits from multiple Anthill seats or multiple human authors) to forbid
  squashing entirely.
- **Always create session doc** — Even for smooth work
- **Never write a memory or a lesson** — both types are retired. Step 5's
  Reflect usually ends "nothing this time"; when it doesn't, it appends to a
  playbook

## Common Mistakes

- **Self-reviewing the code** — the failure this step exists to prevent. If you
  catch yourself thinking "I've been reviewing as I worked, this is fine," stop.
  Dispatch a subagent per Step 2. Always. No exceptions.
- **Dispatching a reviewer without verifying it has shell access** — A reviewer
  limited to reading and grepping produces a static read, not a verified review
  — it can't run tests or reproduce a defect. Read the capabilities the roster
  states before choosing — most of its answers don't contain the word `Bash` —
  and report the census (Step 2). A run whose output contains no census has not
  shown the gate was run — which is the only thing anyone downstream can check.
- **Asking the subagent to review commit-by-commit** — Give it the net diff
  (`git diff <base>..HEAD`), not the commit history. The commit log is noise;
  the delta is the truth.
- **Assuming a squash strategy without checking for a landing policy** —
  `AGENTS.md`/`CLAUDE.md` may explicitly forbid squashing (SHA-cited docs,
  multiple Anthill seats). Check for `## Branch Landing Policy` before executing
  Step 8, and announce it explicitly if none exists.
- **Rolling your own multi-commit squash** — If Strategy B is chosen, use the
  `consolidate-long-branch` skill. Ad-hoc interactive rebase without the
  tree-equivalence gate is how silent content drift enters the merged history.
- **Reconciling a plan by restructuring it** — Step 6's reconciliation updates a
  plan in place. Don't rewrite its shape, add checkboxes it never had, or append
  a summary section it didn't ask for.
- **Reading unchecked boxes as unfinished work** — a completed plan with every
  box unticked is the normal state of a shipped project, not evidence that
  nothing happened. Check the artifacts and the session record.
- **Skipping test verification** — Never proceed to merge/PR with failing tests.
  Quality checks (step 3) are a hard gate, not a suggestion.
- **Open-ended questions** — Don't ask "What should I do next?" Present the
  structured completion options instead.
- **Premature worktree cleanup** — Only remove worktrees for Options 1 and 4.
  Options 2 and 3 need the worktree preserved.
- **No confirmation for discard** — Always list what will be lost and get
  explicit confirmation before deleting branches.
- **Merging without verifying the result** — After merging to the base branch,
  verify tests pass on the merged result before deleting the branch.
- **Assuming the base branch is `develop` or `main`** — Always determine the
  actual base in Step 0. Guessing wrong makes every subsequent diff and merge
  operate on the wrong scope.

## Output

At completion, summarize:

- Branch finalized
- **The reviewer census** — reviewers checked, each one's shell-access status,
  the choice and why, and where the roster was read from
- Code review findings and resolutions
- **What each reviewer actually executed**, quoted from its execution log — not
  inferred from its tool list. Say it even when the answer is flattering
- Quality check results
- The work item and its moves (`review`, then `done`) — or the item Step 4
  created, born done
- Documentation created/updated, with the session's path
- **The Reflect outcome** — "nothing this time", or the playbook appended to,
  quoting the `pdocs find` line you chose it from
- Any playbook override followed (`branch-finalization`, `handoff`, `release`),
  by path — or that none exists
- Final commit message, and the commit carrying `Work-Item:`
- Follow-up items filed from the review (their paths, all in `triage`)
