# Development Plans

This directory contains development plan documents that translate high-level
proposals into actionable paths forward. A plan bridges the gap between a
proposal's vision and the detailed record of a working session.

## Purpose

The main purpose of a development plan is to outline _how_ a proposal will be
realized. Plans provide phased guidance, constraints, and acceptance criteria
without breaking work down into micro-tasks. They give both developers and AI
agents a shared map of the work to be done.

Whereas proposals capture the _why_ and _what_, and sessions capture _what
actually happened_, plans describe the _how_ at a practical but not overly
granular level.

### Why Document Plans?

- **Roadmap clarity** - Show the path from current codebase to completed feature
  without micro-managing
- **Highlight pivotal points** - Identify complex areas, migration concerns, or
  significant architectural changes
- **Iterative execution** - Break large work into verifiable chunks that can be
  tested and validated
- **Shared context** - Give developers (human and AI) enough detail to execute
  confidently without hand-holding
- **Risk awareness** - Surface what could get complex or go wrong before
  implementation starts

## When NOT to Create a Plan

- **No proposal exists:** Create a proposal first to explore the problem space
  and define requirements
- **Still investigating:** If uncertain whether to proceed, create an
  investigation first
- **Trivial work:** Minimal-complexity tasks that can be done directly
  (optionally create a session to document)
- **Documenting completed work:** Use sessions for historical records, not plans
- **Repeatable patterns:** Use playbooks for recurring tasks, not one-off plans

**Rule of thumb:** Plans are for committed work that needs a roadmap. If you're
still figuring out if/what to build, you're not ready for a plan yet.

## Content and Format

Plans should be concise, structured, and oriented around phases or milestones.
The format is flexible, but a good plan will answer:

- **Outcome:** What does success look like? What is "done"?
- **Approach:** Which strategy or path are we taking? What alternatives were
  considered?
- **Scope:** What's explicitly in and out of bounds?
- **Phases:** How can the work be broken into large, verifiable chunks (e.g.,
  Phase 1: Enable, Phase 2: Harden, Phase 3: Rollout)?
- **Acceptance Checks:** What gates or conditions must be met before declaring
  the plan complete?
- **Constraints and Risks:** What assumptions are we making? What could go wrong
  and how will we mitigate it?

## File Naming

- `YYYY-MM-DD-short-topic-plan.md`
- Examples:
  - `2025-10-01-quick-capture-sync-plan.md`
  - `2025-10-14-db-migration-plan.md`

## Template

A ready-to-use template is available:
**[YYYY-MM-DD-TEMPLATE-plan.md](./YYYY-MM-DD-TEMPLATE-plan.md)**

Copy this template to start a new implementation plan, replacing `YYYY-MM-DD`
with the current date and `TEMPLATE` with your topic. The template balances
structure with flexibility for different types of work.

### Key Sections

The template includes:

- **Metadata** (Created date, Related proposal, Status) - Traceability
- **Overview** - Connection to proposal and plan scope
- **Outcome & Success Criteria** - Clear definition of done
- **Approach Summary** - High-level implementation strategy
- **Phases** - Major chunks with deliverables and validation
- **Key Risks & Mitigations** - What could go wrong
- **Assumptions & Constraints** - Operating boundaries
- **Testing Strategy** - Validation approach
- **Rollback Plan** - Safety net if needed
- **Observability** - Monitoring and metrics

Adapt the template to your needs - not all sections may be relevant for every
plan.

## Tips

- **Keep phases coarse-grained** - Focus on pivotal points (complex areas,
  migrations, major transitions), not time-based task breakdowns. Let sessions
  capture step-by-step details.
- **Use complexity boxes, not time boxes** - Indicate if something is
  simple/moderate/complex rather than estimating hours. Time estimates are
  almost always wrong, especially with AI agents that work differently than
  humans. Complexity still signals "this might take longer" without the false
  precision.
- **Ground in current codebase** - Reference specific files, identify what needs
  to change, analyze current patterns. Show how we get from current state to
  proposed state.
- **Trust the developer** - Provide enough detail to execute confidently (the
  route) without dictating implementation choices (how to drive). Give them
  solid ground, not step-by-step directions.
- **Explain critical "why"** - When recommending a specific approach over
  alternatives, include the rationale—especially if choosing wrong would cause
  bugs or break the feature. Don't just say "do X", explain "do X because Y
  breaks if you don't". This prevents second-guessing and wrong decisions during
  implementation.
- **Link generously** - Connect back to the originating proposal and forward to
  sessions created during execution.
- **Use validation checks** - Define what "done" looks like for each phase so
  developers know when to move forward.
- **Update if strategy changes** - Mark older versions as superseded when
  replaced.
