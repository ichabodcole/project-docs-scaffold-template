---
name: provide-feedback
description:
  Provide feedback on the project-docs plugin and scaffold template (repo
  project-docs-scaffold-template), or on the plugins that moved to skill-garden
  (recipes, toolbox, operator, agent-bridge, hivemind). Feedback is anything
  worth sending upstream — a bug, a rough edge, confusing guidance, missing
  coverage, an improvement idea, or a suggestion; it does not have to be
  something that broke. Files the feedback as a well-formed GitHub issue.
  Triggers when the user says "provide feedback on project-docs", "I have
  feedback on the X skill/recipe/command", "feedback on the scaffold", "this
  could be better in project-docs", "file an issue against project-docs",
  "report this upstream", or "log this to the project-docs repo".
---

# Provide Feedback on project-docs and skill-garden

A lightweight utility skill that gives you exactly enough context to file
well-formed **feedback** — a bug, a rough edge, confusing guidance, missing
coverage, an improvement idea, or a suggestion — as a GitHub issue against the
source repo of any plugin or template artifact shipped from
`ichabodcole/project-docs-scaffold-template` or `ichabodcole/skill-garden`.

Feedback is broader than a bug report: an improvement, a "this could read more
clearly," or "I wish this skill also did X" all belong here. It does not have to
be something that broke.

## Target Repository

Feedback is filed as a GitHub issue on the repository that ships the component.
Call it `<repo>` in the steps below:

- **`ichabodcole/project-docs-scaffold-template`**
  (<https://github.com/ichabodcole/project-docs-scaffold-template>):
  - the `project-docs` plugin: skills, commands, agents;
  - the cookiecutter scaffold template and its documentation structure.
- **`ichabodcole/skill-garden`**
  (<https://github.com/ichabodcole/skill-garden>), where these plugins moved on
  2026-09-29:
  - `recipes`: all recipes (e.g., `api-mcp-server`, `electron-betterauth`);
  - `toolbox`: `maestro-testing`, `screenshot-optimization`,
    `html-mockup-prototyping`;
  - `operator`, `agent-bridge` and `hivemind`.

The plugin a component comes from decides the repository: `recipes:recipes` is
skill-garden, `project-docs:finalize-branch` is project-docs. If the user can't
say which plugin it is, ask. If it still isn't clear, file on project-docs and
say so in the issue.

`html-mockup-prototyping` ships in both: as
`project-docs:html-mockup-prototyping` and as `toolbox:html-mockup-prototyping`.
The plugin the user invoked decides, as above.

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

Pick one label: `bug`, `documentation`, or `enhancement` (use `enhancement` for
improvements and suggestions, not just net-new features).

### 3. Confirm with the user before submitting

This step is **required**. Show the user the full draft (or a clear summary if
the body is long — component, title, the point, label), then ask:

> "Ready to submit this feedback to `<repo>`?"

Wait for explicit approval. If the user wants changes, revise and re-confirm.

### 4. Submit

**Preferred:** use `gh issue create` if `gh` is installed and authenticated.

```bash
gh issue create \
  --repo <repo> \
  --title "<title>" \
  --label "<label>" \
  --body "<body>"
```

**Fallback:** if `gh` is unavailable or not authenticated, print a prefilled URL
the user can click:

```
https://github.com/<repo>/issues/new?title=<url-encoded-title>&body=<url-encoded-body>&labels=<label>
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
