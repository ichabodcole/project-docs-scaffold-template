# Architecture Documentation

This directory contains architecture documentation for the systems and components that make up the application. These documents help developers understand how systems work, how they interact, and the reasoning behind key design decisions.

## Purpose

Architecture documents serve as the authoritative reference for understanding the design and implementation of complex systems. They capture:

- System design decisions and their rationale
- Component interactions and data flows
- Integration points and system boundaries
- Technical constraints and trade-offs

Use architecture docs when planning significant changes, debugging cross-system issues, or onboarding to unfamiliar parts of the codebase.

## When to Create Architecture Documents

Create architecture documentation for:

- **Core system flows** - End-to-end features involving multiple components
- **Complex subsystems** - Background processing, authentication, caching strategies
- **Major integrations** - Third-party services, APIs, databases, message queues
- **Cross-cutting concerns** - Logging, error handling, security patterns

**Don't create architecture docs for:**

- Simple utilities or helpers
- Individual UI components (unless part of a larger system architecture)
- Standard CRUD operations with no special design
- Code fully explained by inline comments and types

## File Naming and Organization

- **Single files** for focused systems: `system-name-architecture.md` or `feature-name-flow.md`
- **Subdirectories** for complex systems with multiple related documents
- **Index files** (`README.md`) in subdirectories to provide navigation

Examples:
- `authentication-architecture.md`
- `payment-processing-flow.md`
- `job-queue/README.md` (for complex systems with multiple docs)

## Recommended Structure

```markdown
# <System Name> Architecture

## Overview

- Purpose and high-level description
- Key problems this system solves

## Core Components

- Main building blocks and their responsibilities
- Component relationships

## Data Flow

- How data moves through the system
- Request/response patterns

## Integration Points

- How this system connects with other systems
- External dependencies

## Key Design Decisions

- Important architectural choices
- Alternatives considered and trade-offs
- Why this approach was chosen

## Technical Considerations

- Performance characteristics
- Security concerns
- Scalability considerations
- Known limitations

## Code References

- Links to key implementation files
- Entry points and critical paths
```

## Tips

- **Start with the "why"** - Explain the problem being solved, not just the solution
- **Include diagrams** when helpful - Visual representations clarify complex flows. Use ASCII diagrams or Mermaid syntax for inline visualizations:

  ```
  # ASCII example
  User Request → API Gateway → Auth Service → Database
                              ↓
                         Cache Layer

  # Mermaid example
  ```mermaid
  graph LR
    A[User] --> B[API Gateway]
    B --> C[Auth Service]
    C --> D[Database]
    B --> E[Cache Layer]
  ```
  ```

- **Reference actual code** - Link to specific files where applicable (use `path/to/file.ts:123` format)
- **Document trade-offs** - Explain alternatives considered and why they were rejected
- **Keep it current** - Update docs when architecture changes significantly
- **Write for clarity** - Assume readers are unfamiliar with the system

## Relationship to Other Documentation

- **Proposals** capture ideas for future features; architecture docs describe what exists
- **Plans** outline implementation roadmaps; architecture docs explain the result
- **Playbooks** describe how to execute recurring tasks; architecture docs explain the systems involved
- **Sessions** document what happened during work; architecture docs provide the context for understanding that work
