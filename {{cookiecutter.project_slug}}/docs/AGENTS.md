# Documentation Overview

For a complete overview of the documentation structure and how to use it, see [README.md](./README.md).

## Foundational Document

- **PROJECT_MANIFESTO.md** - The constitution of this project. Defines what the project is, who it's for, core principles, what it does and doesn't do. Read this first to understand the foundational vision and boundaries.

## Documentation Types

This project uses a structured documentation approach with these key directories:

- **reports/** - Structured assessments of current state (code reviews, security audits, doc status)
- **investigations/** - Research exploring whether action is needed
- **proposals/** - Feature ideas and design proposals
- **plans/** - Implementation roadmaps
- **sessions/** - Dev journals documenting what happened during work
- **playbooks/** - Reusable patterns for recurring tasks
- **architecture/** - System design and how things work
- **interaction-design/** - User experience flow documentation that captures how users interact with features
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
{% if cookiecutter.include_operator_docs == 'y' %}

## Operator Integration

This project uses [Operator](https://github.com/ichabodcole/operator) as an intake layer for quick-capture thoughts and ideas. When working with this project:

### Checking Operator for Context

Before creating formal documentation (investigations, proposals, plans), **check if relevant Operator entries exist**:

- Search Operator for keywords related to the current task
- Review recent Operator entries for context
- Ask the user if they have Operator notes about the topic

### Using Operator Entries

When Operator entries are found:

1. **For Feature Ideas** → Synthesize into Investigation or Proposal
2. **For Bug Reports** → Create Lesson Learned with Operator context
3. **For Architecture Thoughts** → Incorporate into Architecture docs
4. **For General Context** → Reference in Sessions or Plans

### Example Workflow

```
User: "Let's work on improving keyboard shortcuts"

Agent: "Let me check your Operator for any existing notes about
keyboard shortcuts..." [searches Operator via MCP]

Agent: "I found 3 Operator entries related to keyboard shortcuts.
Would you like me to create an investigation document synthesizing
these ideas?"
```

### Best Practices

- **Proactively search Operator** when starting new work
- **Link back to Operator entries** in formal docs for traceability
- **Suggest archiving Operator entries** once formalized into documentation
- **Use Operator as context** for understanding user's thinking and priorities

For detailed information about Operator integration, see [OPERATOR.md](./OPERATOR.md).
{% endif %}
