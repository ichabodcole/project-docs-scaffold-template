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
allowed_tools: ["Read", "Write", "Bash", "Glob", "AskUserQuestion"]
---

# Create Project

Give a piece of work a home under `docs/projects/`, with a scaffolded
`proposal.md` in it.

## When to Use

- User has a new idea they want to formalize into a proposal
- An investigation has concluded and the next step is a proposal
- The `generate-proposal` skill needs a project folder to write into
- Any work that warrants structured tracking (proposal → plan → sessions)

**Not** for a thought that has not earned a folder yet — that is a `fragment` or
a `backlog` item. And not for work that already has a project; check
`docs/projects/` first.

## Step 1: Name it

This is the part no command can do for you. The name becomes the folder, the
slug in every `related:` key that ever points at this work, and the thing the
user types for the next year.

- **kebab-case** — lowercase, hyphens between words
- **Descriptive** but concise (2–4 words)
- **No date prefix** — dates live in frontmatter and git history

Good: `oauth-upgrade`, `milkdown-editor`, `search-enhancement`

Bad: `2026-02-09-new-feature`, `project1`, `stuff`

`auth-stuff` and `oauth-upgrade` name the same work; only one of them tells a
reader what they will find. If the user gave you a vague name, propose a better
one before you create anything — renaming later means rewriting every link into
it.

## Step 2: Create it

```bash
bun scripts/pdocs/cli.ts new project <name> \
  --title "<Title Case name>" \
  --description "<one sentence: what this proposes and why>" \
  --tags "<2-4,kebab-case,keywords>" \
  --by "<your model or name>" \
  [--from <path/to/investigation.md>]
```

One command, atomic: it creates the folder, seeds `proposal.md` from the
template, fills the frontmatter, and — with `--from` — links the originating
investigation into the proposal's Related Documents.

Pass `--title`, `--description` and `--tags`. **The lint does not catch a
template placeholder left in place**, so an omitted `--description` ships
`"[One sentence: what this proposes and why.]"` and passes clean. Write the
description from what the user actually told you; if they gave you a one-line
idea, that line _is_ the description. And the default title is the slug
title-cased, which mangles acronyms — `oauth-upgrade` becomes `Oauth Upgrade`.

**Exit 6 means the project already exists.** Stop and ask the user how to
proceed — use the existing folder, or pick a different name.

Everything else about the CLI — the other types it creates, the exit codes, the
JSON envelope, what to do if `scripts/pdocs/` is not there — is in
[references/pdocs.md](references/pdocs.md).

## Step 3: Hand it back

Confirm the path the command printed, then tell the user what happens next:

- Fill in the proposal — problem statement, proposed solution, scope
- When ready, `/project-docs:generate-dev-plan <name>` generates the plan

## Constraints

- **Don't create `plan.md` or `sessions/` yet.** Those come later, when
  implementation begins, and they have their own `pdocs new` types.
- **Don't fill in proposal content** beyond the frontmatter the command writes.
  The user or the `generate-proposal` skill handles the body.
