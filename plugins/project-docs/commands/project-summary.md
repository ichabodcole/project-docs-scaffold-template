---
description: "Generate or refresh a project summary with smart mode selection"
allowed_tools: ["Read", "Write", "Grep", "Glob", "Bash", "Task"]
argument-hint: "[--full | --refresh]"
---

# Project Summary Command

**Docs root:** paths below are written as `docs/`; the actual root is `docsRoot`
in `.project-docs.json` at the repo root, which defaults to `docs/`. Read it if
the file exists.

Generate or update `docs/PROJECT-SUMMARY.md`. The command auto-selects between
two modes based on how much has changed since the existing summary:

- **Full rebuild** — re-discover the project from scratch. Slow but complete.
  This is what runs when no summary exists, when structural shifts are detected,
  or when change volume is high.
- **Refresh** — patch only the sections affected by recent changes; trust the
  rest. Cheap, suitable for keeping the summary current between major rebuilds.

`pdocs` below means `bun scripts/pdocs/cli.ts`, the documentation CLI at the
repo root.

**No report.** The summary is the durable output; the command writes nothing
else. Your notes on what you read and how you decided are scratch — keep them in
the conversation, not in `docs/`. Only if the user explicitly asks to keep them
does a report get written, and then it needs an owner the user names:
`pdocs new report project-summary --owner feature/<slug>|item/<slug>`. A gap or
a recommendation you notice goes into what you tell the user at the end; file a
`triage` item for it only if they ask (`pdocs new item <slug> --kind chore`).

**What earlier runs missed** — check each, in both modes:

- **Name the project by where the work is, not by its README.** The README
  describes what the project was set up to be; `git log --since` over the last
  weeks shows which directories actually change. When they differ (a template
  repository whose plugins get most of the commits, say), frame the summary
  around the active surface.
- **Read build and distribution outputs as evidence of intent.** A checked-in
  `dist/`, a packaging manifest or a publish workflow says who consumes the
  project; follow it to the document that explains it.
- **Say when a category is empty.** If `docs/architecture/` or
  `docs/specifications/` has no pages, write that in the summary rather than
  dropping the section — an empty category is a finding about the project.
- **Read state from fields, never from prose.** A feature's or item's state is
  its `lifecycle`; `pdocs view board --features` lists them. A status written in
  a document's body ("Approved (in flight)") is history, not state.

## Step 0: Decide Mode (run first, always)

Parse arguments for explicit overrides:

- `--full` → force full rebuild, skip the rest of Step 0
- `--refresh` → force refresh (but if structural shifts are detected, warn the
  user and proceed)
- No flag → auto-decide using the signals below

**Read the existing summary if present:**

```bash
ls docs/PROJECT-SUMMARY.md 2>/dev/null
```

If absent → **full rebuild** (skip the rest of Step 0). Announce: _"No existing
summary found — running full rebuild."_

If present, extract its `Last Updated` date from the header (format
`**Last Updated:** YYYY-MM-DD`). Call this `<last-updated>`.

**Compute change signals since `<last-updated>`:**

```bash
# Commit count
git log --since="<last-updated>" --oneline --no-merges | wc -l

# Unique files touched
git log --since="<last-updated>" --name-only --pretty=format: | sort -u | grep -v '^$' | wc -l

# Detailed file list (for structural checks below)
git log --since="<last-updated>" --name-only --pretty=format: | sort -u | grep -v '^$'
```

**Check for structural shifts** (any one of these forces a full rebuild):

- New top-level directory at the repo root that didn't exist at `<last-updated>`
  time. Check with `git ls-tree --name-only HEAD` vs.
  `git ls-tree --name-only <last-updated-commit>` (use
  `git rev-list -1 --before="<last-updated> 23:59" HEAD` to find the commit).
- Package manifest changes that suggest a framework or runtime shift:
  `git diff <last-updated-commit>..HEAD -- package.json pyproject.toml Cargo.toml go.mod`
  — look for added/removed framework-level deps (e.g., React → Vue, Express →
  Fastify, runtime version bumps).
- New file in `docs/architecture/` or `docs/specifications/` that didn't exist
  before.
- A new feature in `docs/features/` (excluding `_archive/`) —
  `pdocs view board --features` lists the live ones.

**Apply the decision rule:**

| Condition                                                      | Mode         |
| -------------------------------------------------------------- | ------------ |
| No existing summary                                            | Full rebuild |
| `--full` flag                                                  | Full rebuild |
| Any structural shift detected (and no `--refresh` override)    | Full rebuild |
| `--refresh` flag (even with structural shifts — warn the user) | Refresh      |
| Commits < 40 AND files touched < 60 AND no structural shifts   | Refresh      |
| Otherwise                                                      | Full rebuild |

**Announce the decision** before doing further work. Examples:

- _"Summary is 23 days old, 12 commits, 18 files touched, no structural shifts →
  running **refresh**."_
- _"Summary is 47 days old, 156 commits, 89 files touched, new
  `docs/architecture/sync-engine.md` detected → running **full rebuild**."_
- _"No summary found → running **full rebuild**."_

Then branch to the appropriate workflow below.

---

## Methodology: Sub-Explorer Dispatch (applies to both modes)

For anything beyond the smallest projects, **prefer dispatching parallel
explorer subagents** over reading everything yourself. This keeps your
orchestrating context light, parallelizes the slow read work, and produces
sharper synthesis because each explorer focuses on a bounded scope.

### When to dispatch explorers

**Full rebuild mode** — dispatch in parallel after Step 2 (foundation analysis),
before Step 6 (synthesis):

- **Architecture explorer** — read all of `docs/architecture/`, return a list of
  documented systems with one-sentence descriptions and any notable
  cross-cutting concerns
- **Specifications explorer** — read all of `docs/specifications/`, return the
  domains specified and a one-line description of each
- **Active work explorer** — run `pdocs view board --features`, read the
  `feature.md` of each feature not `done` or `dropped`, and return
  `{name, lifecycle, brief purpose}` per feature, plus the items in flight
- **Code structure explorer** — survey top-level source directories, identify
  entry points and major patterns, return a structural summary (do NOT read
  every file — directory + naming patterns are enough)
- **Recent activity explorer** — read 3-5 most recent session notes and the last
  30 days of commits, return themes and active work areas

**Refresh mode** — dispatch one explorer per _dirty_ bucket from Step R3 when
multiple buckets need re-examination. For a single dirty bucket, read it
yourself.

### How to brief explorers

Each explorer prompt should be self-contained (the explorer has no conversation
context). Specify:

- The exact scope (paths to read)
- The exact format of the report you want back
- A word budget for the report (typically 200-400 words)
- An explicit "do not" list (e.g., "do not read source code", "do not read any
  file outside `docs/architecture/`")

Use `subagent_type: "Explore"` for read-only scanning. Use
`subagent_type: "general-purpose"` only when an explorer needs to follow
references across boundaries.

### What you do as orchestrator

- Step 0 (mode decision) — you do this yourself; it's tiny
- Foundation analysis (README, package manifest) — you do this yourself
- **Dispatch explorers in parallel** for the bounded scans above
- Synthesize their reports into the summary structure — this is the irreducible
  orchestrator work
- Write the summary yourself

### When NOT to dispatch

- Project is small (single-file scope per category) — direct reads are faster
- Refresh mode with only one dirty bucket
- The work is pure synthesis (combining already-gathered evidence)

---

## Refresh Mode Workflow

Run this only when Step 0 selected **refresh**.

### Step R1: Re-read the existing summary

Read `docs/PROJECT-SUMMARY.md` in full. This is your starting state. You will
patch sections in place, not regenerate from scratch.

### Step R2: List changed paths

```bash
git log --since="<last-updated>" --name-only --pretty=format: | sort -u | grep -v '^$'
```

Categorize the changed paths into buckets:

- `docs/architecture/*` — architecture changes
- `docs/specifications/*` — specification changes
- `docs/features/*`, `docs/items/*` — work status changes
- `docs/playbooks/*` — pattern changes
- Package manifests (`package.json`, etc.) — dependency changes
- Top-level dirs (`src/`, `apps/`, `packages/`, etc.) — code structure changes

### Step R3: Per-section patch logic

For each section in the existing summary, decide whether to trust verbatim or
re-examine:

| Section                        | Re-examine if...                                           |
| ------------------------------ | ---------------------------------------------------------- |
| **Overview**                   | Manifest deps changed significantly                        |
| **Core Technologies**          | Package manifest changed                                   |
| **Project Structure**          | Top-level code dirs added/removed/renamed                  |
| **Documented Systems**         | `docs/architecture/` changed                               |
| **Application Specifications** | `docs/specifications/` changed                             |
| **Recent Activity**            | Always rebuild fresh (time-bounded by nature)              |
| **Current Direction**          | Always re-examine the work — `pdocs view board --features` |
| **Development Patterns**       | `docs/playbooks/` changed                                  |
| **Quick Start**                | Package manifest scripts changed                           |
| **Key Insights**               | Trust verbatim unless deps or top-level structure changed  |

For each section that needs re-examination, do a **targeted** read of only the
relevant files — not a full project scan.

### Step R4: Always rebuild Recent Activity

This section is inherently time-bounded. Replace it entirely:

```bash
git log --since="30 days ago" --oneline --no-merges | head -20
git log --since="30 days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -10
```

Read 2-3 most recent session notes to flavor the activity summary:
`ls -t docs/features/*/sessions/*.md docs/items/*/sessions/*.md 2>/dev/null | head -3`.

### Step R5: Always re-examine Current Direction

State lives in frontmatter, so read it from the derived board rather than from
file edits:

```bash
pdocs view board --features
```

Update the section's "Active Features" and "In Progress Research" lists from it:
features and items in the started group (`active`, `review`), and research items
(`kind: research`) not yet `done`.

### Step R6: Bump Last Updated, write the summary

Update the `**Last Updated:** YYYY-MM-DD` header to today's date. Preserve all
verbatim sections exactly. Write the updated `docs/PROJECT-SUMMARY.md`.

### Step R7: Present results

Tell the user, in the conversation — there is no report file:

- **Summary:** Updated at `docs/PROJECT-SUMMARY.md` (refresh mode)
- **Why refresh:** the previous summary's date, commits and files touched since,
  and whether any structural shift was found
- **Sections patched**, each with what changed, and **sections trusted
  verbatim**, each with why
- Brief list (2-3 bullets) of the most notable changes since the previous
  summary, and any gap worth work (offer to file it as a `triage` item)

---

## Full Rebuild Mode Workflow

Run this when Step 0 selected **full rebuild**.

### Step 1: Check for existing summary

- Look for existing `docs/PROJECT-SUMMARY.md`
- If found, read it to understand the previous state
- Note: You'll create a fresh analysis, but comparing with the old summary helps
  identify changes

### Step 2: Analyze project foundation

- Read `README.md` (project root and docs folder)
- Read `package.json` or equivalent (language-specific manifest) to understand:
  - Project name and description
  - Key dependencies and technologies
  - Available scripts and tooling
- Check for configuration files (tsconfig, vite.config, etc.) to understand tech
  stack
- Get file tree structure to understand organization:
  `find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | head -100`

### Step 3: Review documentation state

> **Prefer dispatching explorer subagents in parallel here** — see the
> "Methodology: Sub-Explorer Dispatch" section above. One explorer per docs
> category (architecture, specifications, features and items) gives you bounded
> scans and parallel speed. Synthesize their reports below.

- List all documents in each docs subdirectory:
  - `docs/architecture/` - What systems are documented?
  - `docs/specifications/` - What application behavior is specified?
  - `docs/features/` - What features exist? `pdocs view board --features` gives
    each one's state; check each feature folder for `feature.md`, `plan.md` and
    `sessions/`
  - `docs/items/` - What work items are open, and which are research
    (`pdocs find --type item --kind research`)?
  - `docs/playbooks/` - What patterns are codified?
- Read key architecture documents to understand system design
- Note which features are live and which are `done` or `dropped` (some sit in
  `features/_archive/`)

### Step 4: Understand recent activity and current state

- Check `docs/features/*/sessions/` and `docs/items/*/sessions/` for recent
  session notes (read 3-5 most recent across all of them)
- Use git to find recently modified files:
  `git log --since="30 days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -20`
- Look at recent commits for context:
  `git log --since="30 days ago" --oneline --no-merges | head -20`
- Identify active work areas based on recent changes

### Step 5: Inspect key code structure (balanced approach)

- Identify main entry points (src/main, src/index, app.py, etc.)
- Review key directories: `ls -la src/` or equivalent
- Look for major patterns:
  - Component/module organization
  - Data layer (models, stores, database)
  - API/service layer
  - UI/presentation layer (if applicable)
- **Don't** read every file - use directory structure and naming to infer
  organization

### Step 6: Synthesize understanding

Based on your analysis, understand:

- **What is this project?** (core purpose, not just stated purpose)
- **What problem does it solve?**
- **What technologies does it use?**
- **How is it structured?**
- **What's the current state?** (early development, mature, maintenance, etc.)
- **What's been happening recently?** (last 30 days)
- **What direction is it heading?** (based on proposals, plans, recent work)

### Step 7: Generate polished project summary

Create `docs/PROJECT-SUMMARY.md` as the polished end product.

Use this structure:

```markdown
# Project Summary

**Last Updated:** YYYY-MM-DD **Project Status:** [Early Development / Active
Development / Mature / Maintenance]

## Overview

[2-3 paragraph summary of what this project is, what problem it solves, and why
it exists. This should be discoverable from the code and docs, not just
restating the README.]

## Core Technologies

- **Primary Language:** [Language]
- **Framework/Runtime:** [Key frameworks]
- **Build Tools:** [Build system, bundler, etc.]
- **Key Dependencies:** [Most important libraries - top 3-5]
- **Development Tools:** [Testing, linting, formatting]

## Project Structure

[Brief overview of how the codebase is organized. What are the main directories
and what do they contain?]
```

src/ ├── components/ [if applicable] ├── services/ [if applicable] ├── models/
[if applicable] └── ... docs/ ├── architecture/ ├── projects/ └── ...

```

[1-2 sentences describing the organizational pattern]

## Documented Systems

[List key architecture documents and what they cover. This helps onboarding devs know what documentation exists.]

- **[System/Component Name]** - Brief description (see `docs/architecture/...`)
- **[System/Component Name]** - Brief description (see `docs/architecture/...`)

## Application Specifications

[If `docs/specifications/` exists, list the domains that are specified. This tells readers what application behavior is formally documented.]

- **[Domain Name]** - Brief description (see `docs/specifications/NN-domain.md`)

[If no specifications exist, note: "No application specifications have been created yet."]

## Recent Activity (Last 30 Days)

[What's been happening? What areas are seeing active development?]

**Active Work Areas:**
- [Area 1]: [Brief description based on sessions/commits]
- [Area 2]: [Brief description based on sessions/commits]

**Recent Sessions:**
- [Date]: [Session topic/focus] (see `docs/features/<slug>/sessions/...`)
- [Date]: [Session topic/focus] (see `docs/items/<slug>/sessions/...`)

**Notable Changes:**
- [Summary of significant commits or features added]

## Current Direction

[Based on proposals, plans, and recent activity - where is this project heading?]

**Active Features:**
- [Feature name] - [lifecycle: backlog / ready / active / review] (see `docs/features/<slug>/`)

**In Progress Research:**
- [Research question] (see `docs/items/<slug>/write-up.md`)

[1-2 sentences summarizing the overall trajectory]

## Development Patterns & Practices

[Any established playbooks or patterns? How does the team work?]

- **Playbooks:** [List any documented playbooks]
- **Documentation Approach:** [How documentation is maintained]

## Quick Start for New Contributors

[Based on package.json scripts and setup]

1. Install dependencies: `[command]`
2. Run development: `[command]`
3. Run tests: `[command]`
4. Read key docs: [Point to 2-3 essential architecture docs or README]

## Key Insights

[2-4 bullet points of non-obvious or important things to know about this project. Could include architectural decisions, constraints, gotchas, or unique approaches.]

- [Insight 1]
- [Insight 2]
- [Insight 3]

---

*This summary was generated by analyzing the codebase, documentation, and recent activity. It represents the actual state of the project as discovered, not just stated intentions.*
```

### Step 8: Present results to user

After writing the summary, tell the user, in the conversation — there is no
report file:

- **Summary:** Saved to `docs/PROJECT-SUMMARY.md`
- Brief executive summary of what the project is (2-3 sentences)
- If this was an update, 2-3 key changes from the previous summary
- What you read to get there, in a few lines, and any gap or recommendation
  worth work (offer to file each as a `triage` item)

---

## Important Notes (apply to both modes)

- Focus on **discovery** - what the project actually is based on evidence
- Be accurate over optimistic - describe what exists, not what's intended
- The summary should be useful to both humans (onboarding) and AI agents
  (context)
- Avoid just restating the README - add value through synthesis
- Keep it concise - aim for ~2 pages, not exhaustive
- Reference specific docs for deeper dives

## Quality Checks

Before completing, ask yourself:

- ✅ Could someone understand this project from the summary alone?
- ✅ Does it accurately reflect the current state (not just initial vision)?
- ✅ Are recent activities and direction clear?
- ✅ Would this help an AI agent understand the project context?
- ✅ Are key technologies and structure documented?
- ✅ (Refresh mode) Did you preserve trusted sections verbatim rather than
  regenerating them?
