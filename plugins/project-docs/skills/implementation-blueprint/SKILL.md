---
name: Implementation Blueprint
description: >
  This skill should be used when the user has a specification (or set of specs)
  and wants to prepare for implementation. Activated when the user asks to
  "create an implementation plan", "choose a tech stack", "prepare for
  implementation", "what technologies should we use", "create a blueprint from
  these specs", "technical discovery", "implementation blueprint", or wants to
  bridge the gap between specification documents and actually building the
  project.
---

# Implementation Blueprint

## Purpose

Bridge the gap between specification documents and implementation. Through a
structured interview with the user, produce an **Implementation Blueprint** - a
technical companion document to the specification that gives an agent or
developer everything needed to start building.

The blueprint captures decisions about technology choices, project structure,
development environment, and non-functional requirements that specifications
intentionally leave open.

## When to Use

When the user has:

- A set of technology-agnostic specification documents (from `generate-spec` or
  manually written)
- A desire to implement or rebuild the project
- Questions about what technologies or patterns to use

## Process Overview

1. **Read Specifications** - Understand what needs to be built
2. **Analyze Requirements** - Identify technical decisions that must be made
3. **Interview User** - Ask focused questions to capture decisions
4. **Produce Blueprint** - Write the implementation blueprint document

## Phase 1: Read Specifications

Before interviewing the user, read all specification documents to understand:

- Application scope and complexity (single app vs. multi-app)
- Data entities and their relationships
- Audio, media, or hardware requirements
- Offline/PWA requirements
- UI complexity (screens, themes, responsive needs)
- State management complexity

Summarize the findings back to the user before proceeding: "Based on the specs,
this is a [scope description] with [key technical needs]. I have [N] technical
decisions to work through with you." This builds shared understanding and lets
the user correct misreadings early.

This analysis also informs which interview questions are relevant. Skip
questions that don't apply to the project.

## Phase 2: Analyze Requirements

From the specifications, identify technical decisions that need answers. Group
them into categories:

**Always relevant:**

- Platform targets (web, mobile, desktop, all)
- Programming language and framework
- Styling/UI approach
- Data persistence approach
- Project structure

**Conditionally relevant (based on spec contents):**

- Audio/media handling (if specs mention audio, video, etc.)
- Offline/caching strategy (if specs mention offline capability)
- Authentication approach (if specs mention users/auth)
- API design (if specs mention server/backend)
- Real-time features (if specs mention live updates, sync)
- File handling (if specs mention import/export, uploads)

Prioritize decisions by impact. Framework choice constrains everything
downstream, so resolve it first. Styling choices can often be deferred or
changed later, so ask about those after the big decisions are locked in.

## Phase 3: Interview the User

Ask focused questions in batches of 2-4 to avoid overwhelming the user. Start
with the highest-impact decisions and work toward details.

### Interview Flow

**Round 1: Platform & Framework**

Start by understanding the target:

- What platforms should this run on? (Web, iOS, Android, Desktop, PWA)
- Is there a preferred programming language or framework? Or should one be
  recommended?
- Are there existing codebases, design systems, or libraries to integrate with?

If the user has no preference, propose options based on the spec requirements.
Explain trade-offs briefly. Let the user choose.

**Round 2: UI & Styling**

Based on the framework choice:

- Component library preference? (Use existing library vs. custom components)
- Styling methodology? (Utility-first, CSS modules, styled components, etc.)
- Any existing design system, brand guidelines, or theme tokens?
- Icon library preference?

**Round 3: Data & State**

Based on the persistence needs from specs:

- Local database choice for the framework? (SQLite, IndexedDB, Core Data, etc.)
- State management approach? (Framework built-in, dedicated library, etc.)
- If API exists: REST, GraphQL, or other?
- Data validation approach?

**Round 4: Development Environment**

- Package manager preference?
- Linting and formatting standards?
- Testing strategy and tools? (Unit, integration, E2E)
- CI/CD and deployment target?
- Version control workflow? (Branch strategy, PR process)

**Round 5: Non-Functional Requirements**

- Performance targets? (Load time, bundle size, memory usage)
- Accessibility requirements? (WCAG level)
- Browser/OS minimum versions?
- Internationalization needs?
- Analytics or error tracking?

### Interview Principles

- **Skip what's irrelevant.** If the spec describes a simple offline app with no
  auth, don't ask about auth providers.
- **Propose when the user is unsure.** Offer a recommended option with brief
  rationale, plus 1-2 alternatives.
- **Respect existing decisions.** If the user says "I want React with Tailwind,"
  don't re-litigate those choices.
- **Batch questions logically.** Group related decisions so the user thinks
  about one area at a time.
- **Explain trade-offs, don't lecture.** Keep explanations to 1-2 sentences per
  option.

## Phase 4: Produce Blueprint

Write the Implementation Blueprint to `docs/implementation-blueprint.md` (or the
location the user specifies).

### Blueprint Structure

```
# Implementation Blueprint

## Project Overview
Brief summary of what's being built (from specs) and the chosen approach.

## Platform & Targets
- Target platforms
- Minimum browser/OS versions
- PWA requirements (if applicable)

## Tech Stack
### Core
- Language: [choice]
- Framework: [choice]
- Runtime: [choice, if applicable]

### UI & Styling
- Component library: [choice]
- Styling approach: [choice]
- Icon library: [choice]
- Theme system: [approach]

### Data Layer
- Local storage: [choice]
- State management: [choice]
- Validation: [choice]
- API client: [choice, if applicable]

### Audio/Media (if applicable)
- Audio engine: [choice]
- Format support: [formats]
- Caching strategy: [approach]

## Project Structure
Proposed directory layout for the chosen framework.
Include key directories and their purposes.

## Development Environment
- Package manager: [choice]
- Node/runtime version: [version]
- Linting: [tool + config]
- Formatting: [tool + config]
- Pre-commit hooks: [if any]

## Testing Strategy
- Unit tests: [framework]
- Integration tests: [framework]
- E2E tests: [framework, if applicable]
- Coverage target: [percentage]

## Build & Deployment
- Build tool: [choice]
- Deployment target: [where]
- CI/CD: [approach]
- Environment configuration: [approach]

## Non-Functional Requirements
- Performance: [targets]
- Accessibility: [WCAG level]
- Offline support: [approach]
- Internationalization: [if applicable]

## Asset Management
- Static assets: [where they live]
- Sound/media files: [hosting approach]
- Images and icons: [bundling approach]

## Key Libraries
Table of specific libraries/packages to use:
| Purpose | Library | Version | Rationale |
|---------|---------|---------|-----------|

## Mapping: Spec Domains → Implementation
How each specification domain maps to the project structure:
| Spec File | Implementation Area | Key Files/Modules |
|-----------|-------------------|-------------------|

## Open Questions
Any decisions deferred or needing further research.
```

### Writing Principles

- **Be specific.** Write "React 18 with Next.js 14 App Router" not "a modern
  React framework."
- **Include versions.** Pin major versions for all key dependencies.
- **Justify choices.** One sentence on why each major choice was made.
- **Map specs to code.** Show how each spec domain becomes code
  modules/directories.
- **List the full dependency set.** An agent should be able to run the install
  command from this document.

**Good blueprint entry:**

```
### Data Layer
- Local storage: Dexie.js 4.x (IndexedDB wrapper)
  Chosen for its reactive queries and simple API, fitting the offline-first PWA requirement.
- State management: Zustand 4.x
  Lightweight, no boilerplate, works well with React 18 concurrent features.
- Validation: Zod 3.x
  Runtime schema validation for import/export and form inputs.
```

**Bad blueprint entry:**

```
### Data Layer
- Use a local database for storing data
- Add state management
- Validate inputs
```

The good entry is actionable - an agent can install those exact packages and
start coding. The bad entry defers every decision.

## Relationship to Specifications

The blueprint complements but does not replace the specifications:

| Document          | Answers         | Example                                                                        |
| ----------------- | --------------- | ------------------------------------------------------------------------------ |
| **Specification** | What to build   | "Sessions have a 1-5 rating system"                                            |
| **Blueprint**     | How to build it | "Ratings stored in SQLite via Drizzle ORM, UI via shadcn StarRating component" |

Together, these two documents provide everything needed to begin implementation.
An agent receiving both should be able to scaffold the project, install
dependencies, and start building features.

## Handling Edge Cases

### Incomplete Specifications

If specs are missing key details (e.g., no data model, vague UI description),
note the gaps and ask the user whether to:

- Proceed with assumptions (document them in "Open Questions")
- Pause and complete the specs first

### User Wants to Skip the Interview

If the user says "just pick everything for me," propose a default stack based on
the spec requirements and the user's stated platform. Present it as a draft for
approval rather than a final decision. The user should still confirm before the
blueprint is written.

### Spec Requirements Conflict with Tech Choice

If the user's preferred technology doesn't naturally support a spec requirement
(e.g., choosing a framework with poor offline support when specs require
offline-first), flag the tension. Propose workarounds or alternative
technologies. Document the trade-off in the blueprint.

### Multiple Implementation Targets

If the user wants the same spec implemented on multiple platforms (e.g., web +
mobile), produce one blueprint per platform or a single blueprint with
platform-specific sections. Highlight shared code opportunities and
platform-specific divergences.

## Additional Resources

### Reference Files

For detailed guidance on evaluating technology options:

- **[references/tech-decision-guide.md](references/tech-decision-guide.md)** -
  Common technology trade-offs, framework comparison criteria, and decision
  matrices for frequent choices
