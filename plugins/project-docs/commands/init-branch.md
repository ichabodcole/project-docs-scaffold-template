---
description: "Initialize a new feature/fix/refactor/chore branch from develop"
allowed_tools: ["Bash", "Read", "Edit", "AskUserQuestion"]
---

You are tasked with initializing a new branch for development work.

**Playbook reference:** if the project has
`docs/playbooks/branch-initialization-playbook.md`, follow the workflow there —
it overrides this file. Most projects don't; the steps below stand on their own.

**`pdocs`** below means `bun scripts/pdocs/cli.ts`, the documentation CLI at the
repo root. The work-item steps apply only when that file exists and the docs
root (`docsRoot` in `.project-docs.json`, default `docs/`) has an `items/`
folder; on an older scaffold, skip them silently.

## Workflow Summary

1. **Verify on develop** - Switch to develop if needed
2. **Pull latest** - Ensure develop is up to date
3. **Check for uncommitted changes** - Handle stashing/notification
4. **Pick the work item** - What this branch starts, if anything
5. **Create branch** - With conventional naming, after the item
6. **Start the item and attach it to the active cycle** - `active`, `cycle`

## Process

### Step 1: Check Current State

```bash
git branch --show-current
git status --short
```

If not on develop, switch:

```bash
git checkout develop
```

### Step 2: Update Develop

```bash
git pull
```

If it fails because the branch has no remote or upstream, say so and carry on;
if it fails on a conflict, stop and tell the user.

### Step 3: Handle Uncommitted Changes

If `git status` shows changes:

1. **Notify the user** about the uncommitted changes
2. **Ask:** "Are these changes part of the work you're about to start?"
   - **Yes (already started working)** → Proceed - changes will carry over to
     the new branch. This is fine.
   - **No (unrelated changes)** → Ask whether to:
     - Stash them (`git stash push -m "description"`)
     - Discard them (if confirmed)
     - Abort and let user handle manually

**Key distinction:** It's common to start working before remembering to create a
branch. In that case, carrying over the changes is the right thing to do. Only
stash/discard if the changes are unrelated to the new work.

### Step 4: Pick the Work Item

A branch usually starts one work item. Offer the ones ready to start:

```bash
pdocs view ready --format text
```

(`pdocs` prints JSON when its output is not a terminal; `--format text` gives
the table.) It lists the `ready` items whose `blocked_by` items are all `done`,
each with its short id, priority and path. Show the list and ask which one this
branch starts, or whether it starts none.

- **The user picks one from the list** — keep its reference, `item/<slug>`.
- **The user names an item that is not listed** — check its state with
  `pdocs find --type item --format json` (or `pdocs find --id <prefix>`):
  - `backlog`: start it, since the user named it.
  - `triage`: **don't start it.** Nobody has decided to take it on yet; say so,
    and suggest triaging it first (the `triage-items` skill). The branch may
    still be created with no item.
  - `active`, `review`, `done` or `dropped`: say which, and ask how to proceed
    rather than moving it.
- **No item** — fine. Work often runs before anyone files an item;
  `finalize-branch` creates one for it when the branch lands.

`pdocs view ready` printing nothing is also fine: say there is nothing ready and
ask whether the branch starts a named item or none.

### Step 5: Create Branch

Ask user for:

- **Branch type:** feature, fix, refactor, chore, docs
- **Description:** short, hyphenated description of the work. **When the branch
  starts an item, use the item's slug** — `finalize-branch` finds the item again
  by matching the branch's description to it.

Or accept these as arguments if provided: `$ARGUMENTS`

Create the branch:

```bash
git checkout -b <type>/<description>
```

`cycle` is **not** a branch type. A cycle spans branches — see the next step.

### Step 6: Start the Item and Attach It to the Active Cycle

**1. Find the active cycle**, if the project keeps `docs/cycles/`:

```bash
pdocs find --type cycle --lifecycle active --format text
```

It prints the cycle's path; read the file's `title` from its frontmatter.

- **Exactly one match** — tell the user which cycle it is and its `title`, and
  ask whether this branch belongs to it.
- **No match** — say so and carry on. Work outside a cycle is normal; an
  unattached branch is not an error, and this command does not create cycles.
- **More than one match** — report the filenames and carry on without attaching
  anything. Two active cycles is a lint failure (`pdocs check` catches it), and
  guessing which one owns the branch would paper over it.

Projects on an older scaffold have no cycles; skip this part silently.

**2. Check the item has been reviewed** (when Step 4 picked one). Read its
`status`: the `status` field of `pdocs find --id <prefix> --format json`, or the
tag Step 4's `pdocs view ready --format text` printed after it — an item that is
not `stable` ends with `[draft]`, `[deprecated]` or `[no status]`.

If it is not `stable`, show the user the content they are approving: its
**description** (the `description` field in its frontmatter) and its
**definition of done** (the list under `## Definition of done` in its body). Ask
them to approve that content before work starts. **Approval means approving that
description and definition of done as you showed them.** "Looks good", "go
ahead" or "start the branch" said about the work in general is not approval of
the item. If they approved this content earlier in this conversation, that
counts; don't ask again. If they want changes now, make them first, then show
the result. Once they approve, add `--status stable` to the `set` in 3. Never
add `--status stable` for content the user has not seen.

**If they decline, skip 3 entirely**, under either policy
(`checks.workItemReview.mode` in `.project-docs.json`; absent means `warn`).
Declining covers "no", "not now", and "I want to edit it, but not now": anything
short of approving the content as it stands. An item whose content the user
declines to approve does not move: don't start it, and don't run
`pdocs set item/<slug> --cycle …` on its own either. Under `strict` both would
be refused (exit 6, nothing written); under `warn` nothing would refuse them,
and that is not permission to run them.

Tell the user the item stays unstarted, in its current state, and carry on with
the branch. It is still named after the item (Step 5), so `finalize-branch`
finds the item again, recognises it as this branch's, and closes it with its
cycle when the branch lands. Don't ask for the review again unless they bring it
up; if they approve later on the branch, run 3 then, with `--status stable`. If
the branch belongs to the active cycle, still record it in the cycle's Sessions
list (4): that line records the branch, not the item.

**3. Start the item** (when Step 4 picked one, and 2 did not skip this). If the
branch belongs to the active cycle:

```bash
pdocs set item/<slug> --lifecycle active --cycle <cycle-filename>
```

Otherwise `pdocs set item/<slug> --lifecycle active`. Add `--status stable` when
the user approved the item's content in 2. A cycle is named by its filename,
with or without `.md` (`2026-09-auth` or `2026-09-auth.md`); there is no `slug`
field to look for. `pdocs set` refuses a value the lint would reject and names
the valid ones. Membership lives on the item: never add a `scope:` list to the
cycle file.

These changes — the item's fields and the cycle's Sessions line — stay
uncommitted; they go in with the branch's first commit and land with it.

**4. Record the branch in the cycle** (when it belongs to one): append a line to
the cycle file's `## Sessions` section:

```markdown
- <type>/<description> (open)
```

Append under the existing entries, not at the top; the section reads
chronologically. If it has no entries yet, add the line after the section's
comment. `finalize-branch` Step 6 changes `(open)` to `(landed YYYY-MM-DD)` when
the branch lands.

### Branch Naming Conventions

- Use lowercase
- Use hyphens between words
- Keep concise but descriptive
- Include issue numbers if applicable

**Examples:**

- `feature/user-authentication`
- `fix/login-redirect-loop`
- `refactor/extract-api-client`
- `chore/update-dependencies`

## Output

Confirm to user:

- Branch created and checked out
- Base commit (latest develop)
- The work item it started (`item/<slug>`, now `active`), that it started none,
  or that it left the branch's item unstarted because the user declined to
  approve its content
- The cycle the branch was recorded in, and whether the item joined it, or that
  there is no active cycle
- Any stashed changes they should remember
- Ready to begin work

## Important Constraints

- **Always branch from develop** - Never from another feature branch
- **Ask about uncommitted changes** - Don't assume; ask if they're related to
  the new work
- **Carrying over changes is OK** - If user already started working, changes
  should come with
- **User awareness** - Always notify about stashed changes
- **Never start a `triage` item** - Triage is the step the user sees; an item
  leaves `triage` there, not here
