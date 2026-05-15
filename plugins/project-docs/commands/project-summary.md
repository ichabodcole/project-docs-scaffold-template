---
description: "Generate or refresh a project summary with smart mode selection"
allowed_tools: ["Read", "Write", "Grep", "Glob", "Bash", "Task"]
argument-hint: "[--full | --refresh]"
---

# Project Summary Command

Generate or update `docs/PROJECT-SUMMARY.md` and a discovery report. The command
auto-selects between two modes based on how much has changed since the existing
summary:

- **Full rebuild** — re-discover the project from scratch. Slow but complete.
  This is what runs when no summary exists, when structural shifts are detected,
  or when change volume is high.
- **Refresh** — patch only the sections affected by recent changes; trust the
  rest. Cheap, suitable for keeping the summary current between major rebuilds.

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
- New entry in `docs/projects/` (excluding `_archive/`) or
  `docs/investigations/` (excluding `_archive/`).

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
- **Active projects explorer** — read each active folder under `docs/projects/`
  (skip `_archive`), return `{name, status, brief purpose}` per project
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
- Write both files yourself (summary + report)

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
- `docs/projects/*` — project status changes
- `docs/investigations/*` — investigation status changes
- `docs/playbooks/*`, `docs/lessons-learned/*` — pattern changes
- Package manifests (`package.json`, etc.) — dependency changes
- Top-level dirs (`src/`, `apps/`, `packages/`, etc.) — code structure changes

### Step R3: Per-section patch logic

For each section in the existing summary, decide whether to trust verbatim or
re-examine:

| Section                        | Re-examine if...                                                         |
| ------------------------------ | ------------------------------------------------------------------------ |
| **Overview**                   | Manifest deps changed significantly                                      |
| **Core Technologies**          | Package manifest changed                                                 |
| **Project Structure**          | Top-level code dirs added/removed/renamed                                |
| **Documented Systems**         | `docs/architecture/` changed                                             |
| **Application Specifications** | `docs/specifications/` changed                                           |
| **Recent Activity**            | Always rebuild fresh (time-bounded by nature)                            |
| **Current Direction**          | Always re-examine `docs/projects/` and `docs/investigations/` for status |
| **Development Patterns**       | `docs/playbooks/` or `docs/lessons-learned/` changed                     |
| **Quick Start**                | Package manifest scripts changed                                         |
| **Key Insights**               | Trust verbatim unless deps or top-level structure changed                |

For each section that needs re-examination, do a **targeted** read of only the
relevant files — not a full project scan.

### Step R4: Always rebuild Recent Activity

This section is inherently time-bounded. Replace it entirely:

```bash
git log --since="30 days ago" --oneline --no-merges | head -20
git log --since="30 days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -10
```

Read 2-3 most recent session notes from `docs/projects/*/sessions/` to flavor
the activity summary.

### Step R5: Always re-examine Current Direction

Status changes in projects/investigations don't always show as file edits
(status fields move around). Quick check:

```bash
ls docs/projects/ | grep -v '_archive'
ls docs/investigations/ | grep -v '_archive'
```

For each active project, read the first ~20 lines of `proposal.md` to confirm
status. Update the section's "Active Projects" / "In Progress Investigations"
lists.

### Step R6: Bump Last Updated, write the summary

Update the `**Last Updated:** YYYY-MM-DD` header to today's date. Preserve all
verbatim sections exactly. Write the updated `docs/PROJECT-SUMMARY.md`.

### Step R7: Write slim refresh report

Create `docs/reports/YYYY-MM-DD-project-summary-refresh-report.md`:

```markdown
# Project Summary Refresh Report

**Report Date:** YYYY-MM-DD **Report Type:** Project Summary Refresh **Generated
By:** project-summary command (refresh mode)

## Refresh Decision

- **Previous summary date:** YYYY-MM-DD
- **Commits since:** N
- **Files touched since:** N
- **Structural shifts detected:** None / [list]
- **Mode chosen:** Refresh

## Sections Patched

- **[Section name]** — [What changed and why it was re-examined]
- **[Section name]** — [What changed and why it was re-examined]

## Sections Trusted Verbatim

- **[Section name]** — [Brief reason, e.g., "no architecture docs changed"]
- **[Section name]** — [Brief reason]

## Notable Changes Since Last Summary

- [Brief bullet about a meaningful shift]
- [Brief bullet]

---

_This refresh patched only the sections affected by recent changes. For a full
re-discovery, run `/project-docs:project-summary --full`._
```

### Step R8: Present results

Tell the user:

- **Summary:** Updated at `docs/PROJECT-SUMMARY.md` (refresh mode)
- **Report:** Saved to
  `docs/reports/YYYY-MM-DD-project-summary-refresh-report.md`
- Brief list (2-3 bullets) of the most notable changes since the previous
  summary

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
> category (architecture, specifications, projects, investigations) gives you
> bounded scans and parallel speed. Synthesize their reports below.

- List all documents in each docs subdirectory:
  - `docs/architecture/` - What systems are documented?
  - `docs/specifications/` - What application behavior is specified?
  - `docs/projects/` - What projects exist? Check each project folder for
    proposal.md, plan.md, and sessions/
  - `docs/investigations/` - What's being researched?
  - `docs/playbooks/` - What patterns are codified?
  - `docs/lessons-learned/` - What problems were solved?
  - `docs/reports/` - What assessments exist?
- Read key architecture documents to understand system design
- Identify which proposals/plans are in active vs archive folders

### Step 4: Understand recent activity and current state

- Check `docs/projects/*/sessions/` for recent session notes (read 3-5 most
  recent across all projects)
- Check `docs/memories/` for recent work summaries
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

### Step 7: Create discovery report first

Create `docs/reports/YYYY-MM-DD-project-summary-report.md` documenting your
investigative process and findings.

Use this structure:

```markdown
# Project Summary Report

**Report Date:** YYYY-MM-DD **Report Type:** Project Summary Discovery
**Generated By:** project-summary command (full rebuild mode)

## Investigation Scope

This report documents the investigative process used to create/update the
project summary at `docs/PROJECT-SUMMARY.md`.

## Previous Summary Status

[If no previous summary existed:]

- **Status:** No previous summary found
- **Implication:** This is the first comprehensive project summary for this
  codebase

[If previous summary existed:]

- **Last Updated:** [date from previous summary]
- **Previous Status:** [status from previous summary]
- **Key Points from Previous Summary:**
  - [bullet point 1]
  - [bullet point 2]
  - [bullet point 3]

## Discovery Process

### Project Foundation Analysis

**Files Examined:**

- README.md: [brief notes on what you found]
- package.json: [key dependencies, scripts noted]
- [Other config files]: [brief notes]

**Tech Stack Discovered:**

- [List technologies found and where you found evidence of them]

### Documentation State

**Architecture Docs:**

- [List what exists, note if comprehensive or sparse]

**Specifications:**

- [List what domains are specified, note coverage and currency]

**Active vs Archived:**

- Projects: X active, Y archived (check docs/projects/)
- Investigations: X active

**Key Docs Read:**

- [List 3-5 most important docs you read for context]

### Recent Activity Analysis

**Session Notes Reviewed:**

- [List recent sessions and what they revealed]

**Git Analysis:**

- Time period: Last 30 days
- Most modified files: [list top 5-10]
- Active areas: [what areas of codebase are seeing changes]
- Recent commit themes: [patterns in commit messages]

### Code Structure Inspection

**Entry Points Found:**

- [List main entry points]

**Directory Structure:**

- [Key directories and what you inferred about them]

**Patterns Observed:**

- [Note any architectural patterns you discovered]

## Key Findings

### What This Project Actually Is

[1-2 paragraphs describing what you discovered the project to be, based on
evidence]

### Changes from Previous Summary

[If previous summary existed:]

- **Scope Changes:** [Has the project grown/changed direction?]
- **New Systems:** [Any new architecture documented?]
- **Completed Work:** [What proposals/plans have been implemented?]
- **Technology Changes:** [Any new dependencies or tech shifts?]

[If no previous summary:]

- N/A - This is the first summary

### Current State Assessment

- **Maturity:** [Early development / Active development / Mature / Maintenance]
- **Health Indicators:**
  - Documentation: [Well-documented / Partially documented / Sparse]
  - Activity: [Active / Moderate / Low]
  - Direction: [Clear / Evolving / Uncertain]

### Recent Activity Highlights

- [Finding 1 with evidence]
- [Finding 2 with evidence]
- [Finding 3 with evidence]

### Current Direction

**Based on active proposals:**

- [What proposals suggest about future direction]

**Based on recent work:**

- [What actual commits/sessions suggest about direction]

**Alignment:** [Do proposals and actual work align, or are they diverging?]

## Insights & Observations

[2-5 notable things you discovered that will inform the summary:]

- [Insight 1]
- [Insight 2]
- [Insight 3]

## Summary Generation Notes

**Approach:**

- [How you'll frame the overview]
- [What key points to emphasize]
- [What to include in "Key Insights" section]

**Decisions Made:**

- [Any judgment calls about what to include/exclude]
- [How you're categorizing the project status]

## Recommendations

[Optional - if you notice gaps or opportunities:]

- [ ] Consider documenting [undocumented system]
- [ ] Update architecture docs for [recently changed area]
- [ ] Archive completed proposals/plans from [date range]

---

_This report documents the discovery process for generating the project summary.
The polished summary can be found at `docs/PROJECT-SUMMARY.md`._
```

### Step 8: Generate polished project summary

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
- [Date]: [Session topic/focus] (see `docs/projects/<project>/sessions/...`)
- [Date]: [Session topic/focus] (see `docs/projects/<project>/sessions/...`)

**Notable Changes:**
- [Summary of significant commits or features added]

## Current Direction

[Based on proposals, plans, and recent activity - where is this project heading?]

**Active Projects:**
- [Project name] - [status: proposal only / planned / in progress] (see `docs/projects/<name>/`)

**In Progress Investigations:**
- [Investigation topic] (see `docs/investigations/...`)

[1-2 sentences summarizing the overall trajectory]

## Development Patterns & Practices

[Any established playbooks or patterns? How does the team work?]

- **Playbooks:** [List any documented playbooks]
- **Lessons Learned:** [Note if there's a strong lessons-learned practice]
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

### Step 9: Present results to user

After creating both files, tell the user:

- **Summary:** Saved to `docs/PROJECT-SUMMARY.md` (polished end product)
- **Report:** Saved to `docs/reports/YYYY-MM-DD-project-summary-report.md`
  (discovery notes and findings)
- Brief executive summary of what the project is (2-3 sentences)
- If this was an update, mention 2-3 key changes from previous summary
- Remind them they can review the discovery report to see how you arrived at
  your conclusions

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
