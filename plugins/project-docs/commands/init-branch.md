---
description: "Initialize a new feature/fix/refactor/chore branch from develop"
allowed_tools: ["Bash", "Read", "Edit", "AskUserQuestion"]
---

You are tasked with initializing a new branch for development work.

**Playbook reference:** if the project has
`docs/playbooks/branch-initialization-playbook.md`, follow the workflow there —
it overrides this file. Most projects don't; the steps below stand on their own.

## Workflow Summary

1. **Verify on develop** - Switch to develop if needed
2. **Pull latest** - Ensure develop is up to date
3. **Check for uncommitted changes** - Handle stashing/notification
4. **Create branch** - With conventional naming
5. **Attach it to the active cycle** - If the project keeps `docs/cycles/`

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

### Step 4: Create Branch

Ask user for:

- **Branch type:** feature, fix, refactor, chore, docs
- **Description:** short, hyphenated description of the work

Or accept these as arguments if provided: `$ARGUMENTS`

Create the branch:

```bash
git checkout -b <type>/<description>
```

`cycle` is **not** a branch type. A cycle spans branches — see the next step.

### Step 5: Attach the Branch to the Active Cycle

Only if the project has a `docs/cycles/` directory. (The docs root is `docsRoot`
in `.project-docs.json` at the repo root, default `docs/` — read it if the file
exists.) Projects on an older scaffold have no cycles; skip this step silently.

Find the active cycle:

```bash
ROOT=$(git rev-parse --show-toplevel)
grep -l '^lifecycle: active' "$ROOT"/docs/cycles/*.md 2>/dev/null | grep -v TEMPLATE
```

- **Exactly one match** — tell the user which cycle it is and its `title`, and
  ask whether this branch belongs to it. On yes, append a line to that file's
  `## Sessions` section:

  ```markdown
  - <type>/<description> (open)
  ```

  Append under the existing entries, not at the top; the section reads
  chronologically. `finalize-branch` Step 6 changes `(open)` to
  `(landed YYYY-MM-DD)` when the branch lands.

- **No match** — say so and carry on. Work outside a cycle is normal; an
  unattached branch is not an error, and this command does not create cycles.
- **More than one match** — report the filenames and carry on without editing.
  Two active cycles is a lint failure (`bun docs/lint.ts` catches it), and
  guessing which one owns the branch would paper over it.

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
