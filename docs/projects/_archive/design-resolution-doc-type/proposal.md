# Proposal: Add "Design Resolution" Stage to Project Lifecycle

**Status:** Proposed\
**Date:** 2026-02-13\
**Author:** Cole Reed

---

## Overview

This proposal introduces a new optional stage in the Project Docs lifecycle:
**Design Resolution**.

The purpose of this stage is to formalize the transition between a proposal and
a development plan by explicitly resolving behavioral, structural, and
architectural ambiguity before execution begins.

This stage is not required for all projects. It exists to support moments where
a proposal is clear in intent but still contains unresolved system-level
questions that would otherwise leak into the development planning phase.

---

## Problem Statement

In the current lifecycle:

Report → Investigation → Proposal → Plan → Sessions → Report

There are recurring moments where:

- A proposal is well-formed and directionally clear.
- The work is justified and scoped at a high level.
- However, behavioral details remain ambiguous.
- Data structures are not fully defined.
- Invariants and state transitions are unclear.
- Architectural boundaries are not fully resolved.
- "What's in / what's out" is still fuzzy.

When development planning begins under these conditions:

- The plan becomes partially speculative.
- System decisions are made mid-implementation.
- Tasks are rewritten as understanding evolves.
- Ambiguity is resolved informally instead of deliberately.
- Parallel agent workflows inherit unclear assumptions.

The result is friction, drift, and avoidable rework.

---

## Proposed Addition

Introduce an optional stage:

Report\
→ Investigation\
→ Proposal\
→ Design Resolution\
→ Plan\
→ Sessions\
→ Report

### Definition

**Design Resolution** is a focused, system-level clarification stage where the
proposal is translated into a resolved model of:

- System behavior
- Data shape
- Boundaries
- Invariants
- Architectural positioning

It is a convergence phase.\
It does not introduce new goals.\
It hardens existing ones.

---

## Purpose of the Design Resolution Stage

The Design Resolution stage exists to:

- Collapse ambiguity before planning
- Prevent speculative development plans
- Clarify irreversible decisions early
- Make delegation to AI agents safer
- Reduce architectural drift during implementation
- Improve long-term traceability

It serves as the "crystallization" step between intent and execution.

---

## What Design Resolution Contains

A Design Resolution document should aim to answer:

### 1. System Behavior

- What are the core entities?
- What are their states?
- What transitions are allowed?
- What invariants must always hold?
- What are known edge cases?
- What failure modes are anticipated?

### 2. Data Model (Conceptual Level)

- Primary entities
- Relationships
- Identity rules
- Required vs optional fields
- Ownership boundaries

Not migration scripts. Not schema diffs.\
Conceptual structure only.

### 3. Boundaries

- Explicitly in scope
- Explicitly out of scope
- Postponed decisions
- Deferred complexity

### 4. Architectural Positioning

- Where does this live?
- What layer owns it?
- What does it depend on?
- What depends on it?
- What constraints does it impose on future work?

### 5. Irreversible Decisions

- What would be expensive to change later?
- What assumptions must be locked before planning?

---

## What Design Resolution Explicitly Does Not Include

- Task breakdown
- Sequencing
- Timeline
- Ticket-level detail
- Git strategy
- Worktree division
- Session structure

Those remain the responsibility of the Plan stage.

---

## When to Use Design Resolution

Design Resolution is optional.

It is appropriate when:

- The proposal contains unresolved behavioral questions.
- The system introduces new entities or state models.
- The work affects architecture or cross-cutting concerns.
- The development plan would otherwise require speculative assumptions.
- Parallel agent execution requires clear system contracts.

It may be skipped when:

- The feature is small and bounded.
- The proposal is already behaviorally precise.
- The work is refactoring-only with no new system behavior.

This aligns with the principle:

Lightweight where possible, formal when valuable.

---

## Relationship to Existing Stages

### Investigation

Explores unknowns and gathers information.

### Proposal

Defines intent, scope, and justification.

### Design Resolution

Converges on system clarity and eliminates ambiguity.

### Plan

Defines execution strategy and task breakdown.

Design Resolution does not replace Proposal.\
It hardens it.

---

## Structural Integration into Project Docs

Recommended folder structure:

docs/projects/&lt;project-name&gt;/\
proposal.md\
design-resolution.md\
plan.md\
sessions/

This maintains lifecycle-based organization without introducing a new top-level
category.

---

## Lifecycle Impact

Updated documentation loop:

Report\
→ Investigation\
→ Project\
├ proposal\
├ design-resolution (optional)\
├ plan\
└ sessions\
→ Report

The stage is optional but formally recognized.

---

## Expected Benefits

- Reduced mid-plan ambiguity
- More stable development plans
- Cleaner task decomposition
- Safer AI delegation
- Stronger architectural memory
- Improved long-term documentation integrity

---

## Open Questions

- Should Design Resolution have a strict template or remain semi-structured?
- Should certain categories of projects automatically require it?
- Should tooling support automatic proposal → design-resolution scaffolding?
- Should architectural decisions made here generate ADRs automatically?

---

## Conclusion

Design Resolution fills a recurring gap between conceptual approval and
execution planning.

It is not additional ceremony for its own sake.\
It is a deliberate ambiguity-collapse phase.

By formalizing this stage, Project Docs gains:

- A clearer separation between thinking and doing
- A safer delegation boundary for AI agents
- A more resilient documentation lifecycle

---

**Next Step:**

If accepted, create:

- A `design-resolution-template.md`
- Updates to lifecycle documentation
- Optional commands to scaffold the stage
- Integration into decision flowchart and README conventions
