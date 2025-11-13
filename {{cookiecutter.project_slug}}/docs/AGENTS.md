# Documentation Overview

For a complete overview of the documentation structure and how to use it, see [README.md](./README.md).

## Documentation Types

This project uses a structured documentation approach with these key directories:

- **reports/** - Structured assessments of current state (code reviews, security audits, doc status)
- **investigations/** - Research exploring whether action is needed
- **proposals/** - Feature ideas and design proposals
- **plans/** - Implementation roadmaps
- **sessions/** - Dev journals documenting what happened during work
- **playbooks/** - Reusable patterns for recurring tasks
- **architecture/** - System design and how things work
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
{% if cookiecutter.include_braindump_docs == 'y' %}

## Braindump Integration

This project uses [Braindump](https://github.com/ichabodcole/braindump) as an intake layer for quick-capture thoughts and ideas. When working with this project:

### Checking Braindump for Context

Before creating formal documentation (investigations, proposals, plans), **check if relevant Braindump entries exist**:

- Search Braindump for keywords related to the current task
- Review recent Braindump entries for context
- Ask the user if they have Braindump notes about the topic

### Using Braindump Entries

When Braindump entries are found:

1. **For Feature Ideas** → Synthesize into Investigation or Proposal
2. **For Bug Reports** → Create Lesson Learned with Braindump context
3. **For Architecture Thoughts** → Incorporate into Architecture docs
4. **For General Context** → Reference in Sessions or Plans

### Example Workflow

```
User: "Let's work on improving keyboard shortcuts"

Agent: "Let me check your Braindump for any existing notes about
keyboard shortcuts..." [searches Braindump via MCP]

Agent: "I found 3 Braindump entries related to keyboard shortcuts.
Would you like me to create an investigation document synthesizing
these ideas?"
```

### Best Practices

- **Proactively search Braindump** when starting new work
- **Link back to Braindump entries** in formal docs for traceability
- **Suggest archiving Braindump entries** once formalized into documentation
- **Use Braindump as context** for understanding user's thinking and priorities

For detailed information about Braindump integration, see [BRAINDUMP.md](./BRAINDUMP.md).
{% endif %}
