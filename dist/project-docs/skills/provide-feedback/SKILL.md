---
name: provide-feedback
description:
  Provide feedback on the project-docs-scaffold-template repo (the source of the
  project-docs, recipes, toolbox, operator, agent-bridge, and hivemind plugins,
  and the scaffold template itself). Feedback is anything worth sending upstream
  — a bug, a rough edge, confusing guidance, missing coverage, an improvement
  idea, or a suggestion; it does not have to be something that broke. Files the
  feedback as a well-formed GitHub issue. Triggers when the user says "provide
  feedback on project-docs", "I have feedback on the X skill/recipe/command",
  "feedback on the scaffold", "this could be better in project-docs", "file an
  issue against project-docs", "report this upstream", or "log this to the
  project-docs repo".
---

# Provide Feedback on project-docs-scaffold-template

A lightweight utility skill that gives you exactly enough context to file
well-formed **feedback** — a bug, a rough edge, confusing guidance, missing
coverage, an improvement idea, or a suggestion — as a GitHub issue against the
source repo for any plugin or template artifact shipped from
`ichabodcole/project-docs-scaffold-template`.

Feedback is broader than a bug report: an improvement, a "this could read more
clearly," or "I wish this skill also did X" all belong here. It does not have to
be something that broke.

## Target Repository

All feedback is filed as a GitHub issue on:

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
- `hivemind` plugin
- The cookiecutter scaffold template and its documentation structure

If the user is giving feedback on any of the above, this is the right
destination — even if they can't pinpoint which plugin the component belongs to.

## Workflow

### 1. Identify the component

Figure out which artifact the feedback concerns. Ask the user if unclear. Be
specific in the issue body — use the format `<plugin>/<component-name>` where
possible:

- `recipes/api-mcp-server`
- `project-docs/generate-dev-plan`
- `toolbox/html-mockup-prototyping`
- `scaffold-template` (for the cookiecutter structure itself)
- `docs` (for scaffold documentation like READMEs, migration guides)

### 2. Draft the feedback

Compose a draft with this minimal structure (adapt to the kind of feedback — a
bug fills in "expected vs actual," an improvement or suggestion may not):

```markdown
## Component

<plugin>/<component-name>

## Feedback

<1–3 sentences: the bug, rough edge, improvement, or suggestion>

## Expected vs actual

<for a bug — what the user/agent expected, what actually happened; omit for a
pure suggestion>

## Context

<what the user or agent was doing when this came up — include the other project
or recipe being used, if relevant>

## Suggested change

<optional — only include if you have a clear idea or theory>
```

Pick a title that names the component and the point in one line, e.g.:

- `recipes/api-mcp-server: missing step for agent key rotation`
- `project-docs/generate-dev-plan: unclear when to create a test plan`
- `project-docs/finalize-branch: gate chapters on functional independence, not commit count`

Pick one label: `bug`, `docs`, or `enhancement` (use `enhancement` for
improvements and suggestions, not just net-new features).

### 3. Confirm with the user before submitting

This step is **required**. Show the user the full draft (or a clear summary if
the body is long — component, title, the point, label), then ask:

> "Ready to submit this feedback to
> `ichabodcole/project-docs-scaffold-template`?"

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
- **Feedback isn't only bugs.** Improvements, suggestions, and "this confused
  me" are first-class — don't make the user frame a suggestion as a defect.
- **Keep it factual.** Report what happened or what you'd improve; don't
  speculate beyond a clear suggested change.
- **Name the component precisely.** `<plugin>/<component>` beats vague
  descriptions like "that project-docs thing."
- **One topic per issue.** If the user raises two unrelated points, file two
  separate items.
