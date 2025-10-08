# Development Plans

This directory contains development plan documents that translate high-level proposals into actionable paths forward. A plan bridges the gap between a proposal’s vision and the detailed record of a working session.

## Purpose

The main purpose of a development plan is to outline _how_ a proposal will be realized. Plans provide phased guidance, constraints, and acceptance criteria without breaking work down into micro-tasks. They give both developers and AI agents a shared map of the work to be done.

Whereas proposals capture the _why_ and _what_, and sessions capture _what actually happened_, plans describe the _how_ at a practical but not overly granular level.

## Content and Format

Plans should be concise, structured, and oriented around phases or milestones. The format is flexible, but a good plan will answer:

- **Outcome:** What does success look like? What is “done”?
- **Approach:** Which strategy or path are we taking? What alternatives were considered?
- **Scope:** What’s explicitly in and out of bounds?
- **Phases:** How can the work be broken into large, verifiable chunks (e.g., Phase 1: Enable, Phase 2: Harden, Phase 3: Rollout)?
- **Acceptance Checks:** What gates or conditions must be met before declaring the plan complete?
- **Constraints and Risks:** What assumptions are we making? What could go wrong and how will we mitigate it?

## File Naming

- `YYYY-MM-DD-short-topic-plan.md`
- Examples:
  - `2025-10-01-quick-capture-sync-plan.md`
  - `2025-10-14-db-migration-plan.md`

## Recommended Structure

- Title & Metadata (link to related proposal)
- Outcome & Non-Goals
- Approach Summary
- Key Risks & Mitigations
- Assumptions / Constraints
- Phases (with gates and validation)
- Acceptance Checks (Definition of Done)
- Rollback / Feature Flags (if relevant)
- Observability (metrics, logs, dashboards)
- Links (proposal, sessions, design notes)

## Tips

- Keep phases coarse-grained; let sessions capture the step-by-step details.
- Link back to the originating proposal and forward to sessions created during execution.
- Use acceptance checks and gates to guide agents and developers on what to validate.
- Update plans if strategy changes; mark older versions as superseded when replaced.
- Avoid adding unnecessary implementation details that should be left for the developer to decide and implement. These documents are intended to give the developer solid ground, not tell them where to step.
