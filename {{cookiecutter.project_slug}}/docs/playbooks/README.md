# Implementation Playbooks

This directory contains implementation playbooks: reusable guides for recurring types of work. A playbook captures a proven approach, including phases, pitfalls, and validation steps, so that future efforts can follow an established path instead of starting from scratch.

## Purpose

The main purpose of a playbook is to **codify a repeatable pattern** for implementation. Where proposals focus on one-off ideas, plans map a specific path for a proposal, and sessions document what actually happened, playbooks distill _how we typically execute_ a class of work.

Playbooks make it easier for developers and AI agents to pick up and apply established practices, whether for migrations, refactors, feature toggling, API integrations, or testing strategies.

## Content and Format

Playbooks should be clear, structured, and designed for reuse. They are not rigid templates but should provide enough detail for consistent execution. A good playbook usually includes:

- **Context:** When to apply this playbook (use cases, triggers, prerequisites).
- **Approach:** The general strategy and guiding principles.
- **Steps / Phases:** A coarse sequence of actions that can be adapted as needed.
- **Risks & Gotchas:** Common pitfalls to avoid, with mitigation advice.
- **Validation & Acceptance:** How to confirm the playbook has been successfully applied.
- **References:** Links to prior plans or sessions where this playbook was used.

## File Naming

- `short-topic-playbook.md`
- Examples:
  - `feature-flag-rollout-playbook.md`
  - `db-migration-playbook.md`
  - `api-integration-playbook.md`
  - `adding-and-consuming-a-new-db-entity.md`

## Recommended Structure

- Title
- Context
- Applicability
- Approach Summary
- Steps / Phases
- Risks & Gotchas
- Validation & Acceptance
- References / Links

## Tips

- Keep playbooks **generic but actionable** — they should be adaptable, not tied to one specific proposal.
- If a plan or session reveals a new repeatable pattern, factor it out into a playbook.
- Cross-link playbooks from plans or proposals when applicable.
- Update playbooks over time as better practices emerge.
