---
name: dev-discovery
description:
  Pre-planning technical discovery for complex features. Orchestrates explorers
  to gather codebase context, validates architecture docs, and prepares
  comprehensive input for the dev-plan-generator.
---

# Development Discovery

A methodology for gathering comprehensive technical context before creating a
development plan. Use this when starting work on complex features to avoid blind
spots and ensure the dev-plan-generator has complete information.

## When to Use

Use this skill when:

- Starting implementation of a complex feature (touches 3+ files or multiple
  systems)
- Moving from proposal to development plan
- The feature crosses integration boundaries (API, IPC, service layers, multiple
  platforms)
- You need to understand existing patterns before planning changes
- Architecture documentation might be missing or stale

**Key indicator**: Any feature that would benefit from the "Architecture
Discovery Before Implementation" methodology in `docs/lessons-learned/`.

## Workflow Overview

```
Proposal/Feature Idea
         ↓
   [Dev Discovery]  ← YOU orchestrate this
         ↓
   ┌─────┴─────┐
   ↓           ↓
Explorers   Architecture
(parallel)  Doc Check
   ↓           ↓
   └─────┬─────┘
         ↓
   Discovery Output
   (ephemeral file)
         ↓
   Dev Plan Generator
   (with full context)
```

## Step-by-Step Process

### 1. Parse the Proposal

Read the proposal and identify:

- **Affected systems**: Which parts of the codebase will this touch?
  - Desktop (main/preload/renderer)?
  - Mobile?
  - API?
  - Shared packages?
- **Integration points**: Where do these systems connect?
- **Data flows**: What data moves where?

Create a list of exploration targets based on this analysis.

### 2. Check Architecture Documentation

For each affected system, check `docs/architecture/` for relevant docs:

```bash
ls docs/architecture/
```

**For each affected area, ask:**

1. Does an architecture doc exist for this system?
2. If yes, is it current? (Check if code has diverged)
3. If no, should one exist?

**If an architecture doc is missing and needed:**

- Create it now using the architecture doc template
- This is permanent documentation that helps future work
- Spawn an Explore agent to understand the system, then document it

**If an architecture doc exists but is stale:**

- Flag it for update
- Note what's changed
- Consider updating it as part of this discovery

### 3. Spawn Explorers (Parallel)

Launch multiple Explore agents in parallel to gather context. Be specific about
what each explorer should find.

**Example exploration prompts:**

```
"Explore how document export currently works in the desktop app.
Find: export-related files, the export flow, what format is used,
where exports are saved. Focus on src/renderer/ and src/main/."

"Explore the context menu system in the desktop app.
Find: how context menus are registered, where menu items are defined,
how menu actions are handled. Map the pattern we should follow."

"Explore how the mobile app handles file operations.
Find: file picker usage, save operations, any existing import/export."
```

**Explorer assignment strategy:**

- One explorer per major system area
- One explorer per integration point
- One explorer for existing patterns we should follow

**Thoroughness level:** Use "very thorough" for critical paths, "medium" for
supporting areas.

### 4. Synthesize Findings

Once explorers return, synthesize their findings into a discovery document.

**Write to ephemeral location:**

```
.artifacts/<current-branch>/<feature-name>-discovery.md
```

Get the current branch name:

```bash
git branch --show-current
```

Create the artifacts folder if needed:

```bash
mkdir -p .artifacts/$(git branch --show-current)
```

This file captures:

- All explorer findings organized by area
- Key files and their responsibilities
- Existing patterns to follow
- Integration points mapped
- Architecture doc status
- Open questions or concerns

### 5. Hand Off to Dev Plan Generator

Now invoke the dev-plan-generator with:

1. The original proposal
2. Reference to architecture docs (existing or newly created)
3. Path to the discovery file

The planner now has complete context and can focus on _what to build_ rather
than _understanding the codebase_.

## Discovery Document Template

Save to `.claude/discoveries/YYYY-MM-DD-<feature-name>-discovery.md`:

````markdown
# Technical Discovery: [Feature Name]

**Date:** YYYY-MM-DD **Proposal:** [link or reference]

## Affected Systems

### Desktop

- [ ] Main process
- [ ] Preload
- [ ] Renderer
- Key areas: [list]

### Mobile

- [ ] Affected
- Key areas: [list]

### API

- [ ] Affected
- Key areas: [list]

### Shared Packages

- [ ] @operator/shared
- [ ] @operator/database
- Key areas: [list]

## Architecture Documentation Status

| System     | Doc Exists | Current | Action Needed      |
| ---------- | ---------- | ------- | ------------------ |
| [System 1] | Yes/No     | Yes/No  | None/Create/Update |
| [System 2] | Yes/No     | Yes/No  | None/Create/Update |

## Explorer Findings

### [Area 1]: [Summary]

**Key Files:**

- `path/to/file.ts` - Purpose
- `path/to/other.ts` - Purpose

**Current Pattern:** [How this area currently works]

**Integration Points:**

- Connects to X via Y
- Exposes Z to A

**Relevant Code:**

```typescript
// Key snippet showing the pattern
```
````

### [Area 2]: [Summary]

[Same structure...]

## Existing Patterns to Follow

1. **[Pattern Name]**: [Where it's used, how to apply it]
2. **[Pattern Name]**: [Where it's used, how to apply it]

## Integration Map

```
[ASCII diagram showing how components connect]
```

## Open Questions

1. [Question that needs answering]
2. [Uncertainty that might affect the plan]

## Recommendations for Planner

1. [Suggestion based on findings]
2. [Potential approach based on existing patterns]
3. [Risk or consideration to address]

```

## Ephemeral Storage

Discovery files go in `.artifacts/<branch-name>/` which is gitignored.

**Structure:**
```

.artifacts/ ├── feature/operator-hub-export-import/ │ ├──
operator-hub-discovery.md │ └── context-menu-exploration.md ├──
fix/login-redirect/ │ └── auth-flow-discovery.md └── ...

```

**Benefits:**
- Scoped to the branch - easy to find relevant artifacts
- Cleanup is natural - delete the folder when the branch is merged
- Multiple artifacts per feature if needed
- Doesn't pollute the committed codebase

**Lifecycle:**
- Created during dev-discovery
- Used during planning and early development
- Can be referenced throughout the feature work
- Deleted when the branch is merged or abandoned

## Quality Checklist

Before handing off to the planner:

- [ ] All affected systems identified
- [ ] Architecture docs checked (created if missing and needed)
- [ ] Explorers covered all major areas
- [ ] Key files and patterns documented
- [ ] Integration points mapped
- [ ] Open questions listed
- [ ] Discovery file written

## Example Usage

**User:** "Let's implement the Operator Hub export/import feature from the proposal"

**You (using this skill):**

1. Read the proposal, identify: Desktop context menu, file system operations, JSON serialization, folder/document traversal

2. Check architecture docs:
   - `desktop-file-operations.md` - exists, current
   - `context-menu-system.md` - doesn't exist, should create

3. Spawn explorers:
   - Explorer 1: "Desktop context menu registration and handling"
   - Explorer 2: "Document/folder traversal and serialization patterns"
   - Explorer 3: "File save/open dialogs in Electron"

4. Create architecture doc for context menu system

5. Write discovery to `.artifacts/feature/operator-hub-export-import/discovery.md`

6. Call dev-plan-generator with proposal + discovery file

## Relationship to Other Tools

- **Explore agent**: This skill orchestrates multiple Explore agents
- **dev-plan-generator**: This skill prepares input for the planner
- **Architecture docs**: This skill validates and creates these as needed
- **Lessons learned**: This skill implements the "Architecture Discovery Before Implementation" methodology
```
