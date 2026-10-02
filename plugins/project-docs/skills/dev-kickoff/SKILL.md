---
name: dev-kickoff
description: >
  Orchestrate the full proposal-to-implementation process for a feature, either
  via a git worktree (isolated branch) or directly in the main repo. Use when
  the user has an approved feature (feature.md) and is ready to begin
  development — consults the project's playbooks for this kind of work, starts
  the branch through init-branch, moves the feature to `active`, writes a
  DEV_KICKOFF.md handoff document in the feature's folder, and optionally runs
  dev-discovery and generates the development plan. Triggers when user says
  "kick off dev", "start implementation", "ready to implement", "let's build
  this", or references a feature or proposal that needs implementation. Replaces
  parallel-worktree-dev.
---

# Dev Kickoff

Orchestrate development startup from an approved feature. Handles both worktree
and main-repo strategies — starts the branch or worktree, moves the feature to
`active`, writes a DEV_KICKOFF.md handoff document, and optionally runs
discovery and planning.

**Playbook override:** if the project has
`docs/playbooks/dev-kickoff-playbook.md`, follow the workflow there — it takes
precedence over this file wherever the two differ — and say that you followed
it, naming the file. Most projects don't have one.

`pdocs` below means `bun scripts/pdocs/cli.ts`, the documentation CLI at the
repo root. The docs root is `docsRoot` in `.project-docs.json` at the repo root,
default `docs/`; paths below are written as `docs/`.

## When to Use

Activate when:

- User has an approved feature in `docs/features/<slug>/` (`lifecycle: ready`)
- User says "kick off dev", "start implementation", "let's implement this",
  "ready to implement"
- A feature is approved and needs a branch, kickoff doc, and discovery/planning

**Key indicators:**

- "Let's kick off development on X"
- "Ready to start implementing the proposal"
- "Create a worktree for this feature"
- "Start a branch for this feature"

## Workflow

### Step 1: Locate the Feature

Identify the feature:

- Infer from current context (recent discussion, the feature folder open)
- Or ask: "Which feature are we kicking off?" — `pdocs view board --features`
  lists them

Read:

- `docs/features/<slug>/feature.md` (required)
- `docs/features/<slug>/design-resolution.md` (if it exists)
- Its work items: `pdocs view feature <slug>`

**Check its state.** It should be `ready` — approved to build. If it is still
`backlog`, it hasn't been approved: say so and ask the owner whether it is
approved now (then `pdocs set feature/<slug> --lifecycle ready`) or whether to
stop. If it is already `active`, it was kicked off before; ask whether this is a
new branch of the same feature.

### Step 2: Consult the Playbooks for This Kind of Work

Name the kind of work in a few words (a database migration, an auth integration,
a new CLI verb), then run:

```bash
pdocs find --type playbook --format json
```

Read each match's `description` — that is the playbook index — and read in full
the ones that apply. **Quote the evidence** in DEV_KICKOFF.md's Constraints and
in your reply: the `path` of each playbook that applies and why; or, when
`count` is 0 or none applies, the literal result —
"`pdocs find --type playbook`: 0 matches" or "N playbooks, none for
<kind of work>: <their paths>". A claim that nothing applies, with no query
output behind it, is not a consult.

### Step 3: Choose Strategy

Ask the user:

> "Do you want to work in a **worktree** (isolated copy of the repo, good for
> keeping main clean or parallel work) or directly in the **main repo**
> (simpler, same codebase, same or fresh session)?"

### Step 4A: Worktree Path

1. **Determine branch name** — derive from the feature slug, or from the work
   item the branch starts (next step), or ask the user
   - Format: `feature/<hyphenated-name>` (or fix/refactor/chore as appropriate)

2. **Create the worktree** using the bundled script:

   ```bash
   bash plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh <type> <name>
   ```

   The script creates the worktree and its branch, copies `.env` files, and
   generates `DEV_KICKOFF.md` in the worktree root from the template.

3. **Start the work, in the worktree** — the script created the branch, so run
   the rest of `init-branch` there, not its branch-creation steps: its **Step
   4** (pick the work item this branch starts, from `pdocs view ready`) and its
   **Step 6**: the item's review check (if its `status` is not `stable`, show
   the user its description and definition of done, and add `--status stable`
   once they approve it), then
   `pdocs set item/<slug> --lifecycle active --cycle <active cycle>` and the
   cycle's Sessions line. Then move the feature:

   ```bash
   pdocs set feature/<slug> --lifecycle active
   ```

   Run these inside the worktree, so the changes are on the new branch.

4. **Edit DEV_KICKOFF.md in the worktree root** — fill in:
   - **Mission** — 2-4 sentences summarizing the feature (pre-fill from
     `feature.md`; do not leave as placeholder)
   - **Source Documents** — the links to the feature's documents. From the
     worktree root they are `docs/features/<slug>/feature.md` and its siblings;
     `pdocs new kickoff` refuses (the template lives in this skill), so these
     links, the owner link included, are yours to write
   - **Constraints** — Step 2's consult result, decisions already made, patterns
     to follow, things to avoid
   - **Strategy** — set to `Worktree`
   - **Completion** — leave as "do not merge" version (already in template)

5. **Done** — tell the user:
   > "Worktree created at `.worktrees/<type>/<name>`. Open a new session there
   > and run `/project-docs:start-dev-kickoff` to begin."

### Step 4B: Main-Repo Path

1. **Start the branch with `init-branch`** — run the `init-branch` command in
   full: it checks out and updates develop, handles uncommitted changes, offers
   the work item to start (`pdocs view ready`), creates the branch, and sets the
   item `active` and its `cycle`. Don't create the branch by hand: that skips
   the item's state.

2. **Move the feature to `active`:**

   ```bash
   pdocs set feature/<slug> --lifecycle active
   ```

3. **Write DEV_KICKOFF.md** to `docs/features/<slug>/DEV_KICKOFF.md`:
   - Use
     `plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md`
     as the base. `pdocs new kickoff` refuses by design, so write the file
     yourself — including its **link to the owner**, `./feature.md`, which the
     CLI writes for every other owned document
   - Pre-fill **Mission** from the feature (2-4 sentences — not a placeholder)
   - Set **Strategy** to `Main repo`
   - Link the source documents relative to the file: `./feature.md`,
     `./design-resolution.md` if present, `./plan.md` once it exists
   - Put Step 2's consult result under **Constraints**
   - Set **Completion** to the main-repo version (run finalize-branch, then
     proceed with merge options)

4. **Commit** the kickoff document and the state changes:

   ```bash
   bun scripts/pdocs/cli.ts check
   git add docs/
   git commit -m "docs: add dev kickoff for <slug>"
   ```

5. **Ask** the user:

   > "Continue here (I'll run discovery and planning now) or open a fresh
   > session with `/project-docs:start-dev-kickoff`?"
   - **Continue** → proceed to Step 5
   - **Fresh window** → done. Tell user: "Open a new session and run
     `/project-docs:start-dev-kickoff` to begin."

### Step 5: Discovery and Planning (if continuing in same session)

**5a. Run dev-discovery** — use the `dev-discovery` skill to explore affected
codebase areas and write a discovery artifact to
`docs/features/<slug>/artifacts/`.

**5b. Assess UI prototyping** — if the feature describes an admin UI, dashboard,
or complex visual interface, ask the user whether to create HTML mockup
prototypes before planning. Prototypes help resolve layout and interaction
questions that would otherwise be speculative in the plan. Use the
`html-mockup-prototyping` skill if yes. Save prototypes to
`docs/features/<slug>/artifacts/`.

**5c. Run generate-dev-plan** — use the `generate-dev-plan` skill with
`feature/<slug>` to create `docs/features/<slug>/plan.md` and shape the
feature's items.

**5d. Have user review the plan** — wait for approval before proceeding.

**5e. Assess test plan** — if the feature is complex (multiple systems, 3+
phases, complex state transitions), ask whether to run `generate-test-plan`.
When in doubt, ask the user.

**5f. Begin implementation** — proceed with the plan.

## DEV_KICKOFF.md Template Reference

The template lives at:
`plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md`

The `create-worktree.sh` script auto-generates a filled version for worktrees.
For the main-repo path, generate it using the template as a base.

## Scripts

- **`plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh`** —
  Creates a git worktree, copies `.env` files, and generates `DEV_KICKOFF.md` in
  the worktree root from the template. Usage:
  `bash plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh <type> <name>`
- **`plugins/project-docs/skills/dev-kickoff/scripts/copy-env-to-worktree.sh`**
  — Auto-discovers and copies gitignored `.env` files from the main repo to a
  worktree. Called automatically by `create-worktree.sh`.

## Managing Active Worktrees

### List All Worktrees

```bash
git worktree list
```

### Check Worktree Status

```bash
for wt in $(git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2); do
  echo "=== $wt ==="
  git -C "$wt" status -s
done
```

### Sync Environment Files

If `.env` files change in the main repo:

```bash
bash plugins/project-docs/skills/dev-kickoff/scripts/copy-env-to-worktree.sh .worktrees/feature/my-feature
```

## Completing and Merging Worktree Work

When a worktree's work is complete:

1. **Run finalize-branch** in the worktree (if not already done by the agent):
   `/project-docs:finalize-branch`

2. **Identify the target branch** — check the `Branch:` field in
   `DEV_KICKOFF.md`. Base is always develop unless specified.

3. **Merge into target branch**

   ```bash
   git checkout develop
   git merge feature/my-feature --no-ff
   ```

4. **Smoke test before removing the worktree** — verify the merged work is
   present. Check key files, run the app.

5. **Only then remove the worktree**

   ```bash
   git worktree remove .worktrees/feature/my-feature
   git branch -d feature/my-feature
   ```

## Reference Documents

- `docs/playbooks/README.md` — General workflow playbooks
