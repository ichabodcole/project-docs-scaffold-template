---
name: report-issue
description:
  File a GitHub issue against the project-docs-scaffold-template repo (the
  source of the project-docs, recipes, toolbox, operator, and agent-bridge
  plugins, and the scaffold template itself). Use when the user hits a bug,
  rough edge, confusing guidance, missing coverage, or an improvement idea in
  any of these components and wants to report it upstream. Triggers when user
  says "file an issue against project-docs", "report this to the project-docs
  repo", "this is a bug in the X recipe/skill/command", "submit feedback on
  [component]", "log this upstream", or "open a ticket for the scaffold
  template".
---

# Report Issue to project-docs-scaffold-template

A lightweight utility skill that gives you exactly enough context to file a
well-formed GitHub issue against the source repo for any plugin or template
artifact shipped from `ichabodcole/project-docs-scaffold-template`.

## Target Repository

All issues go to:

**`ichabodcole/project-docs-scaffold-template`**
<https://github.com/ichabodcole/project-docs-scaffold-template>

This single repo is the source for:

- `project-docs` plugin — skills, commands, agents
- `recipes` plugin — all recipes (e.g., `api-mcp-server`, `electron-betterauth`,
  etc.)
- `toolbox` plugin — `maestro-testing`, `screenshot-optimization`,
  `html-mockup-prototyping`
- `operator` plugin
- `agent-bridge` plugin
- The cookiecutter scaffold template and its documentation structure

If the user is reporting an issue with any of the above, this is the right
destination — even if they can't pinpoint which plugin the component belongs to.

## Workflow

### 1. Identify the component

Figure out which artifact the issue concerns. Ask the user if unclear. Be
specific in the issue body — use the format `<plugin>/<component-name>` where
possible:

- `recipes/api-mcp-server`
- `project-docs/generate-dev-plan`
- `toolbox/html-mockup-prototyping`
- `scaffold-template` (for the cookiecutter structure itself)
- `docs` (for scaffold documentation like READMEs, migration guides)

### 2. Draft the issue

Compose a draft with this minimal structure:

```markdown
## Component

<plugin>/<component-name>

## What happened

<1–3 sentences describing the issue>

## Expected vs actual

<if applicable — what the user/agent expected, what actually happened>

## Context

<what the user or agent was doing when this came up — include the other project
or recipe being used, if relevant>

## Suggested fix

<optional — only include if you have a clear theory>
```

Pick a title that names the component and the problem in one line, e.g.:

- `recipes/api-mcp-server: missing step for agent key rotation`
- `project-docs/generate-dev-plan: unclear when to create a test plan`
- `scaffold-template: migration guide v2.5→v2.6 skips README update`

Pick one label suggestion: `bug`, `docs`, or `enhancement`.

### 3. Confirm with the user before submitting

This step is **required**. Show the user the full draft (or a clear summary if
the body is long — component, title, problem, label), then ask:

> "Ready to submit this to `ichabodcole/project-docs-scaffold-template`?"

Wait for explicit approval. If the user wants changes, revise and re-confirm.

### 4. Submit

**Preferred:** use `gh issue create` if `gh` is installed and authenticated.

```bash
gh issue create \
  --repo ichabodcole/project-docs-scaffold-template \
  --title "<title>" \
  --label "<label>" \
  --body "<body>"
```

**Fallback:** if `gh` is unavailable or not authenticated, print a prefilled URL
the user can click:

```
https://github.com/ichabodcole/project-docs-scaffold-template/issues/new?title=<url-encoded-title>&body=<url-encoded-body>&labels=<label>
```

### 5. Return the issue URL

After submission, show the user the URL of the created issue (or the prefilled
URL if they're submitting manually).

## Principles

- **Always confirm before submitting.** Issues are public and permanent.
- **Keep it factual.** Report what happened; don't speculate beyond a clear
  suggested fix.
- **Name the component precisely.** `<plugin>/<component>` beats vague
  descriptions like "that project-docs thing."
- **One issue per problem.** If the user describes two unrelated issues, file
  two separate tickets.
