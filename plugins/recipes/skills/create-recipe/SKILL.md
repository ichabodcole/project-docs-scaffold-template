---
name: create-recipe
description: >
  Analyze a project or subsystem and extract its structure, patterns, and
  integration glue into a reusable recipe skill. Use when the user asks to
  "create a recipe", "extract a recipe from this project", "turn this into a
  reusable pattern", "make a recipe skill", "capture this as a recipe", or wants
  to package a working implementation as a repeatable blueprint for other
  projects.
---

# Create Recipe Skill

## Purpose

Analyze a project (or a specific subsystem within a project) and produce a
recipe skill that captures its architecture, patterns, and implementation
details in a form that can be executed in a different project to reproduce the
same system.

A recipe is a markdown file with YAML frontmatter that follows the Claude Code
skill convention. It lives in the `plugins/recipes/skills/` directory. When
invoked, it gives Claude the instructions and context needed to implement the
same patterns in a new codebase.

## Cross-Repo Workflow

**Important:** The user will typically invoke this skill from a _different_
project than where the recipes plugin lives. The workflow is:

1. **Analyze** the user's current project (the source of the recipe)
2. **Clone** the project-docs repo (where recipes live) into a temp directory
3. **Write** the new recipe skill into the clone
4. **Push** a branch and create a PR for the user to review and merge

The recipes repo is always cloned fresh from the canonical URL — this ensures
the skill works regardless of how the plugin was installed (local path, remote
URL, etc.).

## When to Use

- The user has a working implementation they want to replicate in other projects
- The user asks to "extract a recipe", "create a recipe", or "package this as a
  recipe"
- After building something that worked well and is likely to be needed again
- When the user wants to capture integration glue between technologies

## What Makes a Good Recipe

A recipe captures **the parts that aren't obvious from reading each library's
docs individually**:

- How technologies integrate with each other (the glue code)
- Architectural decisions and their rationale
- The order things must be set up in (and why order matters)
- Gotchas, trade-offs, and hard-won lessons
- The service API / data model that makes the system work

A recipe does NOT capture:

- Application-specific business logic
- Specific data models beyond what the pattern needs
- UI implementations (unless the pattern is inherently a UI pattern)
- Content, assets, or configuration values specific to one app

## Process

### Phase 0: Set Up Recipe Workspace

Before anything else, clone the recipes repo so you can reference existing
recipes and eventually write the new one.

1. **Clone the project-docs repo** into a temp directory:

   ```bash
   RECIPE_WORKSPACE="/tmp/recipe-workspace-$(date +%s)"
   git clone git@github.com:ichabodcole/project-docs-scaffold-template.git "$RECIPE_WORKSPACE"
   ```

2. **Create a branch** for the new recipe:

   ```bash
   cd "$RECIPE_WORKSPACE" && git checkout -b recipe/<recipe-name>
   ```

   Use kebab-case for the recipe name (e.g., `recipe/document-versioning`,
   `recipe/elysia-betterauth-api`).

3. **Read existing recipe skills** from the clone at
   `plugins/recipes/skills/*/SKILL.md` to understand the output format and
   quality bar. Skim at least 2 existing recipes if available.

After this phase, you have:

- The user's current project to analyze (their working directory)
- A clean clone of the recipes repo to write into
- Familiarity with existing recipe patterns

### Phase 1: Scope the Recipe

Before exploring code, clarify what the recipe should cover.

**Ask the user:**

Use AskUserQuestion to determine:

1. **What to capture** - Is this a full project recipe (entire app structure) or
   a subsystem recipe (e.g., "document versioning", "auth system", "real-time
   sync")? The user's initial request usually makes this clear, but confirm if
   ambiguous.

2. **Technology specificity** - Should the recipe be tied to specific
   technologies (e.g., "Elysia + BetterAuth + Drizzle") or technology-agnostic
   (e.g., "document versioning that works with any DB/framework")? Rule of
   thumb: if the value is in the integration glue between specific libs, make it
   technology-specific. If the value is in the architecture/pattern, make it
   agnostic.

3. **What to include** - For full project recipes, ask about optional systems
   (see "Categorizing Findings" below). For subsystem recipes, ask if there are
   related systems to include (e.g., "Should the recipe include the AI
   auto-versioning integration, or just the core versioning system?").

### Phase 2: Explore the Implementation

Thoroughly explore the codebase to understand the system being captured.

**For full project recipes:**

1. Read `package.json` (or equivalent) for dependencies and scripts
2. Read build/config files (tsconfig, vite.config, etc.)
3. Map the directory structure
4. Identify entry points and bootstrapping flow
5. Identify architectural patterns (layered, feature-based, etc.)
6. Identify code quality tooling (linting, formatting, testing)
7. Identify domain-specific systems and abstractions

**For subsystem recipes:**

1. Find ALL files related to the subsystem (use Grep and Glob liberally)
2. Read the data model / schema
3. Read the service layer / business logic
4. Read any shared constants, types, or error classes
5. Trace the lifecycle (creation, reads, updates, deletion)
6. Identify integration points with the rest of the app
7. Check for architecture docs (`docs/architecture/`) that describe the system
8. Understand what's shared across platforms vs platform-specific

**Use exploration agents for complex systems.** Launch parallel Explore agents
for different aspects (data model, service layer, UI integration, sync/API) to
gather context efficiently.

### Phase 3: Categorize Findings

Organize discoveries into categories to decide what goes in the recipe:

**A. Core Pattern (Always Include):**

- The fundamental architecture / data model
- Service layer API and key operations
- Integration glue between technologies
- Error handling specific to this pattern

**B. Supporting Infrastructure (Usually Include):**

- Configuration and setup steps
- Directory structure and conventions
- Key type definitions
- Required indexes, constraints, migrations

**C. Optional Extensions (Ask User):**

- AI/automation integration
- Sync/multi-device support
- Advanced features (session deduplication, etc.)
- UI component patterns
- Settings/configurability

**D. Application-Specific (Exclude):**

- Business logic specific to one app
- Specific data content or seed data
- App-specific UI styling
- Deployment configuration for one environment

Use AskUserQuestion for category C items (up to 4 questions, combine related
items).

### Phase 4: Write the Recipe Skill

Write the skill file into the cloned recipe workspace from Phase 0:

```
$RECIPE_WORKSPACE/plugins/recipes/skills/<recipe-name>/SKILL.md
```

The `<recipe-name>` directory should already match the branch name you created
in Phase 0 (e.g., if the branch is `recipe/document-versioning`, the directory
is `document-versioning`).

Consult
[references/recipe-skill-template.md](references/recipe-skill-template.md) for
the full template structure, writing principles, and examples of good vs bad
recipe content.

### Phase 5: Verify, Publish, and Present

**Quality checks** - verify the recipe before publishing:

- [ ] **Executable:** Could someone implement this system by following the
      recipe?
- [ ] **Scoped:** Does it avoid application-specific business logic?
- [ ] **Ordered:** Are implementation phases in dependency order?
- [ ] **Explained:** Are architectural decisions explained with rationale?
- [ ] **Complete:** Are integration points and gotchas documented?
- [ ] **Triggered:** Does the frontmatter description include natural trigger
      phrases?

**Publish the recipe** via git:

1. **Stage and commit** in the recipe workspace:

   ```bash
   cd "$RECIPE_WORKSPACE"
   git add plugins/recipes/skills/<recipe-name>/SKILL.md
   git commit -m "recipe: add <recipe-name> recipe skill"
   ```

2. **Push the branch:**

   ```bash
   git push -u origin recipe/<recipe-name>
   ```

3. **Create a pull request** so the user can review:

   ```bash
   gh pr create \
     --title "Recipe: <Human-Readable Recipe Name>" \
     --body "## New Recipe Skill

   **Recipe:** <recipe-name>
   **Type:** <technology-specific | technology-agnostic>
   **Source project:** <name of the project analyzed>

   ## What this recipe captures
   <2-3 bullet summary>

   ## Review checklist
   - [ ] Architecture and concepts are accurate
   - [ ] Implementation phases are in the right order
   - [ ] Gotchas and trade-offs are documented
   - [ ] Trigger phrases in description are natural"
   ```

4. **Clean up** the temp workspace:
   ```bash
   rm -rf "$RECIPE_WORKSPACE"
   ```

**Tell the user:**

- The PR URL so they can review and merge
- Brief summary of what the recipe captures
- Remind them to review the recipe in the PR before merging

## Additional Resources

### Reference Files

- **[references/recipe-skill-template.md](references/recipe-skill-template.md)** -
  Full skill file template, writing principles, recipe type characteristics
  (technology-specific vs technology-agnostic vs hybrid), and examples of good
  vs bad recipe content
