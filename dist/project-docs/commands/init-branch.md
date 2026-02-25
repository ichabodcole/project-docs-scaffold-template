---
description: "Initialize a new feature/fix/refactor/chore branch from develop"
allowed_tools: ["Bash", "AskUserQuestion"]
---

You are tasked with initializing a new branch for development work.

**Playbook reference:** Follow the workflow in
[docs/playbooks/branch-initialization-playbook.md](../../docs/playbooks/branch-initialization-playbook.md)

## Workflow Summary

1. **Verify on develop** - Switch to develop if needed
2. **Pull latest** - Ensure develop is up to date
3. **Check for uncommitted changes** - Handle stashing/notification
4. **Create branch** - With conventional naming

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
- Any stashed changes they should remember
- Ready to begin work

## Important Constraints

- **Always branch from develop** - Never from another feature branch
- **Ask about uncommitted changes** - Don't assume; ask if they're related to
  the new work
- **Carrying over changes is OK** - If user already started working, changes
  should come with
- **User awareness** - Always notify about stashed changes
