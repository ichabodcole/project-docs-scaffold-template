---
name: "create-project"
description: >
  Create a new project folder with proposal scaffold in docs/projects/. Use when
  work needs a project home — whether starting from an investigation, writing a
  new proposal, or beginning any feature that warrants structured tracking. This
  is a prerequisite for generate-dev-plan, generate-design- resolution, and
  generate-test-plan. Triggers when user says "let's create a project", "start a
  proposal", "we should work on this", "let's build this", or when transitioning
  from an investigation to actionable work. Also use when generate-proposal
  needs a project folder to write into.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

# Create Project

Create a new project folder under `docs/projects/` with a scaffolded proposal
template.

## When to Use

- User has a new idea they want to formalize into a proposal
- An investigation has concluded and the next step is a proposal
- The `generate-proposal` skill needs a project folder to write into
- Any work that warrants structured tracking (proposal → plan → sessions)

## Workflow

### Step 1: Determine Project Name

If a project name was provided as an argument, use it. Otherwise ask the user.

The name should be:

- **kebab-case** (lowercase, hyphens between words)
- **Descriptive** but concise (2-4 words)
- **No date prefix** — dates are tracked in document metadata and git history

Good: `oauth-upgrade`, `milkdown-editor`, `search-enhancement`

Bad: `2026-02-09-new-feature`, `project1`, `stuff`

### Step 2: Verify It Doesn't Already Exist

Check that `docs/projects/<name>/` doesn't already exist. If it does, inform the
user and ask how to proceed (use existing, choose different name, etc.).

### Step 3: Create Project Folder Structure

Create the project folder and copy the proposal template:

```
docs/projects/<name>/
  proposal.md    — Scaffolded from TEMPLATES/PROPOSAL.template.md
```

Read `docs/projects/TEMPLATES/PROPOSAL.template.md` and use it as the starting
point for `proposal.md`. (The docs root is `docsRoot` in `.project-docs.json` at
the repo root, default `docs/` — read it if the file exists.)

**If the template opens with a frontmatter block, fill it — every field.** The
bracketed values are placeholders, not defaults, and a placeholder left in place
is what the lint fails on:

- `type: proposal` — already correct; the folder decides it. Don't change it.
- `title` — the proposal's title, matching the H1 you write below it
- `description` — one sentence saying what this proposes and why. Write it from
  what the user actually told you. If they gave you a one-line idea, that line
  _is_ the description; don't inflate it into a paragraph, and don't leave it
  blank hoping to come back.
- `tags` — 2–4 kebab-case keywords
- `status: draft`
- `lifecycle: draft` — its opening value. A proposal becomes `approved` when
  someone approves it, not when it is written.
- `generated: { by: <your model or name>, at: <today, YYYY-MM-DD> }`

Then fill the body's title and leave all other template sections as-is for the
user to fill in.

### Step 4: Link to Investigation (if applicable)

If the user mentions an investigation or provides one as context:

- Add it to the proposal's Related Documents section
- Use the path format: `../../investigations/<investigation-file>.md`

### Step 5: Confirm Creation

If the project has a documentation lint (`docs/lint.ts` at the repo root), run
it before reporting:

```bash
bun docs/lint.ts
```

A new document is the cheapest possible moment to find a missing field. If it
reports a problem in the file you just wrote, fix it now rather than mentioning
it.

Tell the user:

- Project folder created at `docs/projects/<name>/`
- Proposal scaffolded with template, frontmatter filled
- Remind them of next steps:
  - Fill in the proposal (problem statement, proposed solution, scope)
  - When ready, use `/project-docs:generate-dev-plan <name>` to generate a plan

## Important Constraints

- **Don't create plan.md or sessions/ yet** — Those come later when
  implementation begins
- **Don't fill in proposal content** beyond template defaults — The user or the
  `generate-proposal` skill handles that. Frontmatter is the exception: it is
  metadata about the document, not content in it, and every field above is
  answerable from what you already know.
- **Check conventions** at `docs/projects/README.md` if unsure about structure
