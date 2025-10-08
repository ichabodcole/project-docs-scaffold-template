# Global Implementation Playbooks

This directory contains global playbooks that apply across all development
projects, regardless of tech stack or domain. These playbooks codify universal
development practices, tooling workflows, and cross-project patterns.

## Purpose

Global playbooks are for practices that:

- Apply to any software project (not domain-specific)
- Cover development tooling and workflows (git, AI CLIs, IDEs)
- Document universal patterns (testing, documentation, code review)
- Can be referenced from any project's local playbooks

Project-specific playbooks should remain in each project's `docs/playbooks/`
directory.

## Scope

**Belongs in global playbooks:**

- Creating custom AI CLI prompts
- Git workflow patterns and conventions
- IDE configuration and shortcuts
- Code review checklists
- Documentation standards
- Cross-language testing strategies

**Belongs in project playbooks:**

- Feature flag rollouts for a specific app
- Database migration patterns for a specific schema
- API integration for a specific service
- Framework-specific patterns (Nuxt, React, etc.)

## Content and Format

Global playbooks follow the same structure as project playbooks:

- **Context:** When to apply this playbook (use cases, triggers, prerequisites)
- **Applicability:** What situations this playbook addresses
- **Approach Summary:** The general strategy and guiding principles
- **Steps / Phases:** A coarse sequence of actions that can be adapted as needed
- **Risks & Gotchas:** Common pitfalls to avoid, with mitigation advice
- **Validation & Acceptance:** How to confirm the playbook has been successfully
  applied
- **References:** Links to documentation, tools, or related playbooks

## File Naming

- `short-topic-playbook.md` or `short-topic.md`
- Examples:
  - `creating-custom-ai-cli-prompts.md`
  - `git-commit-message-conventions.md`
  - `code-review-checklist.md`
  - `documentation-standards.md`

## Using Global Playbooks in Projects

Reference global playbooks from project documentation:

```markdown
See
[Creating Custom AI CLI Prompts](~/.code-docs/playbooks/creating-custom-ai-cli-prompts.md)
for general guidance on creating slash commands.
```

Or mention them in project READMEs:

```markdown
This project follows the patterns documented in `~/.code-docs/playbooks/`.
```

## Tips

- Keep playbooks **tool-agnostic** when possible (principles over specific
  commands)
- Update playbooks as tools evolve (e.g., when AI CLIs add new features)
- Link to official documentation rather than duplicating it
- If a pattern becomes project-specific, move it to that project's playbooks
- Cross-reference between global and project playbooks when appropriate
