---
name: "create-project"
description: >
  Create a new feature — the folder under docs/features/ and its feature.md, the
  proposal that argues for the work — with `pdocs new feature`. Use when work
  needs a home: starting from a research write-up, writing a new proposal, or
  beginning any feature that warrants structured tracking. This is a
  prerequisite for generate-dev-plan, generate-design-resolution, and
  generate-test-plan. Also moves a feature to `ready` when its owner approves
  it. Triggers when user says "let's create a project", "create a feature",
  "start a proposal", "we should work on this", "let's build this", "this is
  approved", or when transitioning from research to actionable work. Also use
  when generate-proposal needs a feature to write into.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

# Create Project

Give a piece of work a home: a **feature**, which is a folder under
`docs/features/` holding a scaffolded `feature.md`. `feature.md` is the proposal
— it argues for the work and holds its state. ("Project" is the everyday word
for it; the docs call it a feature.)

`pdocs` below means `bun scripts/pdocs/cli.ts`, the documentation CLI at the
repo root.

## When to Use

- User has a new idea they want to formalize into a proposal
- A research item has concluded and its write-up recommends building something
- The `generate-proposal` skill needs a feature to write into
- Any work that warrants structured tracking (feature → plan → items → sessions)
- The owner says an existing feature is approved to build (Step 4)

**Not** for a thought that has not earned a folder yet — that is a work item,
filed with `pdocs new item <slug> --kind task`, which starts in `triage`. And
not for work that already has a feature; check first:

```bash
pdocs view board --features
```

## Step 1: Name it

This is the part no command can do for you. The name becomes the folder, the
`feature/<slug>` reference every item's `parent` points at, and the thing the
user types for the next year.

- **kebab-case** — lowercase, hyphens between words
- **Descriptive** but concise (2–4 words)
- **No date prefix** — dates live in frontmatter and git history

Good: `oauth-upgrade`, `milkdown-editor`, `search-enhancement`

Bad: `2026-02-09-new-feature`, `project1`, `stuff`

`auth-stuff` and `oauth-upgrade` name the same work; only one of them tells a
reader what they will find. If the user gave you a vague name, propose a better
one before you create anything — renaming later means rewriting every link and
every `parent` that points at it.

## Step 2: Create it

```bash
pdocs new feature <name> \
  --title "<Title Case name>" \
  --description "<one sentence: what this proposes and why>" \
  --tags "<2-4,kebab-case,keywords>" \
  --by "<your model or name>" \
  [--from <path/to/write-up.md>]
```

One command, atomic: it creates `docs/features/<name>/`, seeds `feature.md` from
the template, fills the frontmatter, starts it in `backlog` (accepted, and still
being shaped), and — with `--from` — links the originating document into its
Related section.

Pass `--title`, `--description` and `--tags`. `--title` also fills the H1. An
omitted `--description` ships `"[One sentence: what this proposes and why.]"`,
which `pdocs check` reports (`PLACEHOLDER`). Write the description from what the
user actually told you; if they gave you a one-line idea, that line _is_ the
description. And the default title is the slug title-cased, which mangles
acronyms — `oauth-upgrade` becomes `Oauth Upgrade`.

**Exit 6 means the feature already exists.** Stop and ask the user how to
proceed — use the existing folder, or pick a different name.

Everything else about the CLI — the other types it creates, the work verbs, the
exit codes, the JSON envelope, what to do if `scripts/pdocs/` is not there — is
in [references/pdocs.md](references/pdocs.md).

## Step 3: Hand it back

Confirm the path the command printed, then tell the user what happens next:

- Fill in `feature.md` — problem statement, proposed solution, scope
- When the owner approves it, it moves to `ready` (Step 4)
- `/project-docs:generate-dev-plan feature/<name>` generates the plan

## Step 4: Approval — `backlog` to `ready`

A feature stays in `backlog` while it is being shaped. It moves to `ready` on
**the owner's word** that it is approved to build — never on your own judgement
that it looks finished. When the user says so (now, or on a later run):

```bash
pdocs set feature/<name> --lifecycle ready
```

`dev-kickoff` moves it on to `active` when implementation starts, and
`sweep-project` to `done` or `dropped` at the end. A feature has no `triage`: it
arrives already accepted.

## Constraints

- **Don't create `plan.md` or `sessions/` yet.** Those come later, when
  implementation begins, with `pdocs new <type> --owner feature/<name>`.
- **Don't fill in the body** beyond the frontmatter the command writes. The user
  or the `generate-proposal` skill handles it.
- **Don't move a feature to `ready` without the owner's word.**
