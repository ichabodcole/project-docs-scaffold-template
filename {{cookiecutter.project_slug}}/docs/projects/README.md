# Projects

This directory contains **project folders** — co-located collections of documents for a defined body of work. Each project folder groups its proposal, plan, sessions, and artifacts together so the full story of a piece of work lives in one place.

## Purpose

Projects solve the traceability problem. Instead of scattering a feature's proposal in `proposals/`, its plan in `plans/`, and its sessions in `sessions/`, everything lives together. Opening a project folder gives you the complete history of why and how something was built.

### Why Use Project Folders?

- **Full story in one place** - Proposal, plan, sessions, and artifacts are co-located and readable in sequence
- **Stable internal links** - Documents within a project reference each other with relative paths that never break
- **Clean archival** - When a project is done, the entire folder moves to `projects/archive/`. No scattered files to chase
- **Extensible** - Add whatever documents the work needs (task lists, technical notes, decision logs) without new conventions
- **Natural home for artifacts** - Working research and codebase exploration live alongside the work they support

## When to Create a Project

Create a project folder when:

- **An investigation concludes with "build this"** - The investigation identified work worth doing, and you're ready to define what that work looks like
- **A feature or significant change needs a proposal** - The work requires design decisions, option exploration, or scope definition
- **The work will span multiple sessions** - It's complex enough to need a plan and will generate session logs

**Project vs. backlog:** If the work can be described and completed without a proposal — it's a known fix, a small refactor, a clear task — it's a backlog item, not a project. If the work needs exploration of options, has design decisions, or will span multiple sessions, it's a project.

## When NOT to Create a Project

- **Small, well-defined tasks** - Use `backlog/` for bugs, minor refactors, papercuts
- **Still investigating** - Use `investigations/` first. The project gets created when you know what to build
- **Documenting existing systems** - Use `architecture/` or `interaction-design/` for as-built documentation
- **Repeatable patterns** - Use `playbooks/` for recurring tasks

## Project Folder Structure

A project folder is flexible. Not everything needs every file:

```
projects/
  my-feature/
    proposal.md          — What we're building and why
    plan.md              — How we're building it (when implementation begins)
    sessions/            — Development session journals
      2026-01-15-initial-implementation.md
      2026-01-20-edge-case-fixes.md
    artifacts/           — Working research generated during the project
      codebase-exploration.md
      dependency-analysis.md
    handoff.md           — Deployment steps (only when needed)
```

A small project might just have a `proposal.md`. A complex project might have all of the above plus additional documents. The folder accommodates whatever the work requires.

### What Goes Where

- **proposal.md** — The _why_ and _what_. Problem statement, proposed solution, scope, technical approach. Created when the project starts. See `TEMPLATES/PROPOSAL.template.md`.
- **plan.md** — The _how_. Phased implementation roadmap with validation criteria. Created when implementation begins. See `TEMPLATES/PLAN.template.md`.
- **sessions/** — Dev journals capturing what happened during implementation. Created during work. See `TEMPLATES/YYYY-MM-DD-SESSION.template.md`.
- **artifacts/** — Freeform working research: codebase exploration, dependency analysis, source code mapping, architecture sketches. No template — these are whatever the work generates.
- **handoff.md** — Deployment or integration steps required to ship the work. Created during branch finalization when the work requires more than merging code — database migrations, service redeployments, environment config changes, manual coordination. Most projects won't need this. See `TEMPLATES/HANDOFF.template.md`.

### Proposals

Proposals capture the _why_ and _what_ before implementation begins. They explore options, constraints, and expected outcomes.

**When to write a proposal:**

- You're reasonably certain action is needed and want to define what it looks like
- The work needs design decisions or scope definition
- Multiple approaches exist and you need to evaluate tradeoffs

**When NOT to write a proposal:**

- Still uncertain if action is needed — investigate first
- Trivial changes — use backlog
- Already know exactly what to do — skip to a plan

**Length guidance:**

- Lightweight (50-200 lines): Simple features with clear scope
- Standard (200-500 lines): Moderate complexity, some alternatives to explore
- Comprehensive (500-1,000 lines): Complex systems, multiple components
- Very large (> 1,000 lines): Consider splitting into multiple proposals

### Plans

Plans translate proposals into actionable paths forward. They describe the _how_ at a practical level without micro-managing implementation.

**When to write a plan:**

- A proposal is approved and implementation is starting
- The work needs a roadmap with phases and validation criteria
- Multiple developers or sessions will work on this

**When NOT to write a plan:**

- No proposal exists — write one first
- Still investigating — not ready for a plan yet
- Trivial work — just do it

**Tips for good plans:**

- Keep phases coarse-grained — focus on pivotal points, not task lists
- Use complexity boxes, not time boxes
- Ground in the current codebase — reference specific files and patterns
- Define validation criteria for each phase

### Sessions

Sessions are dev journals — informal records of what happened during implementation work.

**When to write a session:**

- Something notable happened during implementation
- Work went off-plan — bugs, unexpected complexity, discoveries
- You need to capture context for resuming later or handing off

**When NOT to write a session:**

- Everything went smoothly with nothing interesting to capture
- Trivial work with nothing notable

Sessions serve both as personal reflection and as handoff documentation. Write what's relevant, skip what's not.

### Artifacts

Artifacts are working research documents generated during the course of project work. They're freeform and varied — no standard template.

Examples: codebase exploration notes, dependency analysis, source code path mapping, architecture sketches, API research.

**How artifacts differ from investigations:** Investigations are discovery work done _before_ a project exists ("should we build this?"). Artifacts are research done _during_ project work ("how do we build this?").

## Naming Conventions

**Project folder names:** Descriptive kebab-case without date prefixes.

- `oauth-upgrade`
- `search-enhancement`
- `milkdown-editor`
- `documentation-restructuring`

Date is implicit from git history and document metadata.

**Document names within projects:** Simple descriptive names without date prefixes.

- `proposal.md`
- `plan.md`

**Sessions keep date prefixes** since there can be multiple per project:

- `sessions/2026-02-09-initial-implementation.md`
- `sessions/2026-02-15-edge-case-fixes.md`

## Cross-References

- Reference investigations: `../../investigations/investigation-name.md`
- Reference reports: `../../reports/report-name.md`
- Reference architecture: `../../architecture/doc-name.md`
- Reference specifications: `../../specifications/spec-name.md`
- Internal project references: use relative paths within the folder (e.g., `./proposal.md`, `./sessions/2026-02-09-session.md`)

## Archival

When a project is complete, move the entire folder to `projects/archive/`. Internal references remain valid because they're relative within the folder. External references to archived projects use `./archive/project-name/` paths (from the projects directory).

## Templates

Project-scoped templates are available in the `TEMPLATES/` subfolder:

- `TEMPLATES/PROPOSAL.template.md` — Starting point for project proposals
- `TEMPLATES/PLAN.template.md` — Starting point for implementation plans
- `TEMPLATES/YYYY-MM-DD-SESSION.template.md` — Starting point for session journals
- `TEMPLATES/HANDOFF.template.md` — Starting point for deployment handoffs

Copy the relevant template into your project folder when needed.
