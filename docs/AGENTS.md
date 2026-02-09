# Documentation Overview

For a complete overview of the documentation structure and how to use it, see
[README.md](./README.md).

## Foundational Document

- **PROJECT_MANIFESTO.md** - The constitution of this project. Defines what the
  project is, who it's for, core principles, what it does and doesn't do. Read
  this first to understand the foundational vision and boundaries.

## Documentation Types

This project uses a structured documentation approach with these key
directories:

- **reports/** - Structured assessments of current state (code reviews, security
  audits, doc status)
- **investigations/** - Research exploring whether action is needed
- **proposals/** - Feature ideas and design proposals
- **plans/** - Implementation roadmaps
- **sessions/** - Dev journals documenting what happened during work
- **playbooks/** - Reusable patterns for recurring tasks
- **architecture/** - System design and how things work
- **specifications/** - Technology-agnostic description of application behavior,
  organized by domain
- **interaction-design/** - User experience flow documentation that captures how
  users interact with features
- **lessons-learned/** - Specific problems and their solutions
- **fragments/** - Incomplete observations for later synthesis

### The Documentation Cycle

Reports often trigger the documentation lifecycle:

```
Report → Investigation → Proposal → Plan → Implementation (Sessions) → Report
```

When working with reports:

- Reports assess current state and identify findings
- Findings can spawn investigations, proposals, or direct action
- Link back to reports when creating follow-up documentation
- Generate new reports periodically to track progress
