# Documentation

This directory contains project documentation organized into focused subdirectories. Each subdirectory serves a specific purpose in capturing knowledge throughout the development lifecycle.
{% if cookiecutter.include_braindump_docs == 'y' %}

## Braindump Integration

This project uses **[Braindump](./BRAINDUMP.md)** as an intake layer for quick-capture thoughts and ideas. Braindump documents often serve as the starting point for formal documentation:

- **Feature ideas** in Braindump → Investigation or Proposal
- **Bug reports** in Braindump → Lesson Learned
- **Architecture thoughts** in Braindump → Architecture documentation
- **Work context** in Braindump → Referenced in Sessions

See [BRAINDUMP.md](./BRAINDUMP.md) for detailed integration guide and MCP server setup.
{% endif %}

## Structure

### `/investigations`

Research documents that explore questions before committing to proposals. Investigations gather evidence, analyze options, and determine whether action is warranted. Can be synthesized from patterns across multiple sessions. Use these when you're uncertain if a proposal is needed.

### `/proposals`

Feature proposals and design ideas that capture the _why_ and _what_ before implementation begins. Proposals explore options, constraints, and expected outcomes.

### `/plans`

Development plans that translate proposals into actionable paths forward. Plans outline the _how_ with phased guidance, constraints, and acceptance criteria. They bridge the gap between vision and execution.

### `/sessions`

Dev journals capturing what happened during implementation - what went smoothly, what didn't, deviations from plan, and lessons learned. Focus on what stands out, not routine work. Optional if nothing notable occurred; sessions should feel worthwhile, not obligatory.

### `/playbooks`

Reusable dev plans for recurring tasks or augmenting existing systems (e.g., adding AI workflows, database entities). Playbooks codify proven approaches for tasks you've done 2-3 times, including phases, pitfalls, and validation steps.

### `/architecture`

Maps of the landscape - what systems exist, where their boundaries are, and how major pieces fit together. Focus on building mental models at high to mid-level; avoid exhaustive detail that's better found by reading code.

### `/lessons-learned`

Hard-won insights and non-obvious solutions discovered through experience. Captures specific bugs/issues or code patterns ("don't do X, do Y") that aren't easily Googled. These are the diamonds found through making mistakes.

## Choosing the Right Document Type

Not sure which type of document to create? Use this decision flowchart:

```
                    START: What are you documenting?
                                  ↓
                    ┌─────────────────────────┐
                    │   Have a question or    │
                    │   uncertain if action   │
                    │   is needed?            │
                    └─────────────────────────┘
                              ↓
                         ┌────┴────┐
                         │   YES   │
                         └────┬────┘
                              ↓
                      INVESTIGATION
                  (lightweight-moderate)
                              ↓
                    ┌─────────────────────┐
                    │ Outcome determines  │
                    │ next step:          │
                    └─────────────────────┘
                              ↓
              ┌───────────────┴───────────────┐
              ↓                               ↓
      [Proposal Needed]            [No Action / Monitor]
              ↓                               ↓
          PROPOSAL                    Document decision
    (What should we build?)            (investigation
              ↓                         conclusion)
              ↓
    Is it approved/ready
    for implementation?
              ↓
          ┌───┴───┐
          │  YES  │
          └───┬───┘
              ↓
           PLAN
   (How will we build it?)
              ↓
      Currently working
      on implementation?
              ↓
          ┌───┴───┐
          │  YES  │
          └───┬───┘
              ↓
         SESSION
   (What happened today?)
              ↓
        Work complete?
              ↓
          ┌───┴───┐
          │  YES  │
          └───┬───┘
              ↓
      ┌───────────────────┐
      │ Documenting...    │
      └───────────────────┘
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
[Pattern for       [System as-built]
 reuse]                  ↓
    ↓                ARCHITECTURE
PLAYBOOK          (How does X work?)
```

**Quick Reference:**

- **Investigation:** "Should we even do this? Let me research..." (uncertain, exploratory)
- **Proposal:** "We should build X. Here's why and what." (committed idea)
- **Plan:** "Here's how we'll build X, step by step." (implementation roadmap)
- **Session:** "Here's what I did today while building X." (work log)
- **Playbook:** "Here's how to do X repeatedly." (reusable pattern)
- **Architecture:** "Here's how X works in our system." (as-built documentation)
- **Lesson Learned:** "We hit problem Y, here's the fix." (specific issue + solution)

**Special cases:**

- **Specific problem solved?** → Lesson Learned
- **Still figuring out the approach?** → Investigation first, then Proposal
- **Need to document an existing system?** → Architecture
- **Recurring task pattern?** → Playbook (after 2-3 implementations)

## Usage

Each subdirectory contains its own README with detailed guidance on:

- When to create documents
- When NOT to create documents
- File naming conventions
- Recommended structure
- Tips and best practices

Refer to the subdirectory READMEs for specific instructions on creating and maintaining documentation in each category.
