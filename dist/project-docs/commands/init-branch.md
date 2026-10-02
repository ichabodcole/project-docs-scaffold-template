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
`status`. If it is not `stable`, show the user its description and definition of
done and ask them to approve that content before work starts. If they approved
it earlier in this conversation, that counts; don't ask again. Once they
approve, add `--status stable` to the `set` below. If they want changes, make
them first. Never add `--status stable` for content the user has not seen.

**3. Start the item.** If the branch belongs to the active cycle:

```bash
pdocs set item/<slug> --lifecycle active --cycle <cycle-filename>
```

Otherwise `pdocs set item/<slug> --lifecycle active`. A cycle is named by its
filename, with or without `.md` (`2026-09-auth` or `2026-09-auth.md`); there is
no `slug` field to look for. `pdocs set` refuses a value the lint would reject
and names the valid ones. Membership lives on the item: never add a `scope:`
list to the cycle file.

If the user declined to review it in 2, what happens depends on
`checks.workItemReview.mode` in `.project-docs.json` (absent means `warn`):

- **`warn`** (the default): start it anyway. The output ends with an
  `advisory (work-item-review)`, which is expected here. Tell the user that the
  item is still `draft`.
- **`strict`**: don't run the start; it would exit 6 and write nothing. Tell the
  user the item stays unstarted until they approve it, leave it as it is, and
  carry on with the branch, with no started item. Don't ask for the review again
  unless they bring it up. If the branch belongs to the active cycle, still
  record it in the cycle's Sessions list (4): that line records the branch, not
  the item.

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
- The work item it started (`item/<slug>`, now `active`), or that it started
  none
- The cycle it was attached to, or that there is no active cycle
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
