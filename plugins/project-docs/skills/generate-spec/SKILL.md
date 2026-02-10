---
name: Generate Project Specification
description: >
  This skill should be used when the user asks to "generate a specification",
  "create specs from code", "reverse engineer specs", "document the app as
  specs", "spec-driven design", "create a specification from this project",
  "generate technology-agnostic specs", or wants to produce specification
  documents that fully describe an existing application's functionality, data,
  and behavior so it could be rebuilt in a different technology stack.
---

# Generate Project Specification

## Purpose

Transform an existing codebase into a set of technology-agnostic specification
documents that:

1. Fully describe what the application does, how it works, and how it's
   structured
2. Are detailed enough that an agent or developer could rebuild the app from
   them
3. Contain no framework or library-specific references
4. Serve as living documentation that evolves with the project

Specifications are output to `docs/specifications/` using domain-oriented
grouping, with each file covering a distinct functional domain of the
application.

## Process Overview

The specification generation follows five phases:

1. **Explore** - Deep codebase analysis across multiple dimensions
2. **Identify Domains** - Group functionality into specification domains
3. **Write Specifications** - Produce detailed, technology-agnostic spec
   documents
4. **Validate** - Cross-reference specs against actual code for accuracy
5. **Refine** - Update specs based on validation findings

## Phase 1: Explore the Codebase

Launch parallel exploration agents (Explore type subagents) to analyze the
project. Assign each agent a specific dimension to investigate:

- **Data models and entities** - What data does the app store? What are the
  schemas, relationships, and constraints?
- **Screens and navigation** - What views/pages exist? How does the user move
  between them?
- **Core business logic** - What are the algorithms, calculations, and rules?
- **User interactions** - What can the user do? What are the flows?
- **Settings and configuration** - What's customizable? What are the defaults?
- **External integrations** - APIs, file system, audio, sensors, etc.
- **State management** - What states exist? What are the transitions?

### Exploration Strategy

Start broad, then go deep. First identify the project structure (directories,
entry points, route definitions) to understand scope. Then dispatch focused
exploration agents for each area of functionality.

**Each exploration agent should report:**

- Exact property names and their types (from schemas, interfaces, or models)
- Enum values and their meanings (from type definitions or constants)
- Default values (from schema defaults, factory functions, or initialization
  code)
- Validation rules and constraints (from validators, schemas, or form logic)
- Behavioral details: what happens on create, update, delete?
- State transitions: what triggers state changes?
- Relationships: how do entities reference each other?

**What to look at:**

- Schema/model definitions (database schemas, type interfaces, validation
  schemas)
- Service/repository layers (business logic, data access, operations)
- Route/page definitions (available screens, navigation structure)
- Configuration files (manifests, constants, seed data)
- State management (stores, reducers, context, reactive state)
- Test files (reveal expected behaviors and edge cases)

Synthesize findings from all agents before proceeding. Look for natural
boundaries between concerns - these suggest domain groupings.

## Phase 2: Identify Domains

Group the explored functionality into specification domains. Common patterns
include:

- One spec per major data entity (e.g., Timers, Sessions, Users)
- One spec per major system (e.g., Audio, Notifications, Authentication)
- One spec for cross-cutting concerns (e.g., Settings, Data Management)
- One spec for UI/navigation (screens, layout, themes)
- One spec for analytics/statistics if applicable
- One overview spec that ties everything together

If a single domain is complex enough to require multiple files (e.g., a payments
domain covering providers, refunds, invoicing, and webhooks), group those files
in a subdirectory. If the project contains distinct subsystems or multiple
applications, use subdirectories per subsystem. See the **Output Structure**
section for examples.

**Naming convention:** `NN-domain-name.md` (e.g., `01-overview.md`,
`02-timers.md`)

The overview spec (`01-overview.md`) should always exist and should:

- Describe the application's purpose and value proposition
- Define core concepts and terminology
- Outline key user journeys
- List all other spec files with links
- Document specification conventions (time units, nullability, enums)
- Include implementation notes for cross-platform considerations

## Phase 3: Write Specifications

For each domain spec, include these sections as applicable. Consult
[references/spec-writing-guide.md](references/spec-writing-guide.md) for
detailed templates and examples.

**Required sections:**

- **Overview** - What this domain is and why it exists
- **Data Model** - Properties with types, constraints, defaults (as tables)
- **Operations** - CRUD and domain-specific operations with inputs/outputs
- **Business Rules** - Validation rules, calculations, algorithms (as
  pseudocode)
- **State Machine** - States and transitions (as ASCII diagrams)

**Recommended sections:**

- **User Interactions** - What the user sees and does
- **Edge Cases** - Boundary conditions and error handling
- **Display Considerations** - How data is presented (without prescribing UI
  framework)

**Writing principles:**

- Use generic pseudocode for algorithms, not language-specific syntax
- Express time values in milliseconds with human-readable notes
- Use ASCII diagrams for state machines and timelines
- Present data models as markdown tables with Type, Constraints, Default,
  Description columns
- Describe UI by function ("a toggle that controls X") not implementation ("a
  React Switch component")
- Include visual timeline diagrams for time-based behaviors
- Document nullable vs optional fields explicitly

### Technology-Agnostic Checklist

Before finalizing any spec, verify it passes these checks:

- No framework names (React, Vue, SwiftUI, Flutter, Angular, etc.)
- No library names (Dexie, Zustand, Redux, Tailwind, Alamofire, etc.)
- No language-specific syntax in pseudocode (no `=>`, `?.`, `!!`, `async/await`)
- No platform-specific APIs referenced directly (describe behavior generically)
- UI described by function ("a list of items sorted by date") not component ("a
  FlatList with renderItem")
- Data storage described generically ("local database", "persisted storage",
  "key-value store")
- Algorithms in generic pseudocode with descriptive variable names
- Time values in milliseconds with human-readable context (e.g.,
  `300000 (5 minutes)`)
- All constants have explicit values, not symbolic references to code variables
- Audio, animation, or visual behaviors described with mathematical precision
  where needed

## Phase 4: Validate

After writing all specs, launch validation agents to cross-reference each spec
against the actual code. This is a critical quality step - specs that don't
match the code will produce incorrect implementations.

Each validation agent should:

1. Read the specification document thoroughly
2. Explore the corresponding code (services, models, components, hooks, tests)
3. Produce a structured report covering:
   - **Accuracy** - Do property names, defaults, enum values, and behaviors
     match the code?
   - **Completeness** - Is anything significant in the code missing from the
     spec?
   - **Discrepancies** - List specific mismatches with file references and line
     numbers
   - **Technology agnosticism** - Flag any framework-specific language that
     leaked in
   - **Suggestions** - Improvements to make the spec more useful for
     implementation

Launch validation agents in parallel, one per spec file or per related group of
specs.

### Common Validation Findings

Watch for these frequent issues:

- **Default value mismatches** - Schema defaults differ from what the spec
  documents
- **Unimplemented features** - Properties defined in schema but never used in
  logic
- **Missing edge cases** - Code handles cases the spec doesn't mention (null
  handling, empty states)
- **Naming inconsistencies** - Spec uses different names than the code for the
  same concept
- **Incomplete state machines** - States that exist in code but aren't in the
  spec diagram

## Phase 5: Refine

Apply validation findings to update the specifications:

- Fix incorrect default values, property names, or enum values
- Add missing functionality or edge cases
- Replace any technology-specific language with generic descriptions
- Add mathematical definitions where precision matters (e.g., fade curves,
  scoring algorithms)
- Enhance pseudocode algorithms with clearer variable names and comments
- Add visual timeline diagrams for complex temporal behaviors

## Output Structure

Match the structure to the project's complexity. A simple application can use a
flat list of files. A complex application or monorepo may need subdirectories to
group related specs.

### Flat Structure (Simple Applications)

When the entire app can be covered with roughly 5-15 spec files:

```
docs/specifications/
  01-overview.md
  02-timers.md
  03-sessions.md
  04-audio.md
  05-settings.md
```

### Grouped Structure (Complex Applications)

When a single domain needs multiple files, or the app has distinct subsystems,
modules, or applications:

```
docs/specifications/
  01-overview.md                  # Top-level overview, links to all domains
  admin/
    01-overview.md                # Admin subsystem overview
    02-user-management.md
    03-permissions.md
    04-audit-log.md
  storefront/
    01-overview.md                # Storefront subsystem overview
    02-catalog.md
    03-cart.md
    04-checkout.md
    05-payments.md
  shared/
    01-authentication.md          # Cross-cutting concerns
    02-notifications.md
    03-data-management.md
```

### Monorepo / Multi-App Structure

When the repository contains multiple distinct applications:

```
docs/specifications/
  01-overview.md                  # System-wide overview and relationships
  mobile-app/
    01-overview.md
    02-onboarding.md
    ...
  api-server/
    01-overview.md
    02-endpoints.md
    ...
  admin-dashboard/
    01-overview.md
    ...
  shared/
    01-data-models.md             # Shared entities across apps
    02-business-rules.md
```

### Choosing a Structure

- Start flat. Only introduce subdirectories when the flat list becomes unwieldy
  or when clear boundaries exist between subsystems.
- Each subdirectory should contain its own `01-overview.md` that describes that
  subsystem and links to its spec files.
- The top-level `01-overview.md` should link to all subdirectory overviews and
  describe how the subsystems relate to each other.
- Shared or cross-cutting concerns (authentication, data models used by multiple
  subsystems) belong in a `shared/` directory.

## Living Documentation

These specifications are meant to evolve with the project. Treat them as
first-class project artifacts, not one-time documents.

**When to update specs:**

- **After feature additions**: Update relevant domain specs and add new domains
  if needed
- **After refactors**: Verify specs still match implementation; update data
  models and operations
- **After bug fixes that reveal spec gaps**: If a bug stemmed from
  underspecified behavior, clarify the spec
- **Periodic validation**: Re-run validation agents quarterly or after major
  releases to catch drift

**Maintenance practices:**

- Commit spec changes alongside code changes in the same branch/PR
- Treat spec discrepancies as bugs worth fixing
- When specs and code disagree, investigate which is the source of truth before
  updating
- New team members or agents should read specs before diving into code

## Additional Resources

### Reference Files

For detailed guidance on writing individual spec sections:

- **[references/spec-writing-guide.md](references/spec-writing-guide.md)** -
  Templates, formatting rules, and examples for each section type
