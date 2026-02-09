# Feature Proposals

This directory contains feature proposal documents that serve as the primary
starting point for any new feature development in this project.

## Purpose

The main purpose of a feature proposal is to provide a comprehensive overview of
a new feature before development begins. This includes defining the feature's
scope, objectives, and high-level requirements. These documents are intended to
be the first resource that a developer or an AI agent consults when tasked with
implementing a new feature.

### Why Document Proposals?

- **Shared understanding** - Align team members on what we're building and why
  before implementation starts
- **Scope clarity** - Define boundaries (in scope, out of scope) to prevent
  scope creep during development
- **Decision record** - Capture why we chose this approach over alternatives
- **Implementation foundation** - Provide the "story" that implementation plans
  will detail into steps
- **Future reference** - Help future team members understand the intent and
  context behind features

## When NOT to Create a Proposal

- **Uncertain if action is needed:** Create an investigation first to gather
  evidence and determine if a proposal is warranted
- **Trivial changes:** Small UI tweaks, minor refactors, or bug fixes (create an
  issue or just implement)
- **Documenting existing systems:** Use architecture docs for "as-built"
  systems, not proposals
- **Tracking implementation work:** Use sessions for work-in-progress, not
  proposals
- **Repeatable patterns:** Use playbooks for recurring tasks, not proposals
- **Already have a plan:** If you're ready to implement, skip straight to
  creating a plan

**Rule of thumb:** If you're asking "should we even do this?" → create an
investigation first. Proposals are for when you're reasonably certain action is
needed and want to define what that action looks like.

## Content and Format

While the format of a proposal is flexible and should be tailored to its content
(e.g., a new feature versus a refactoring plan), the goal is always to provide
clarity and establish a shared understanding. A good proposal is not beholden to
a rigid structure but should answer key questions to guide development.

### Length Guidance

Proposals can vary significantly in length depending on complexity, but
understanding typical ranges helps set expectations:

- **Lightweight (50-200 lines):** Simple features with clear scope, minimal
  dependencies. Focus on problem statement and high-level solution concept.
- **Standard (200-500 lines):** Moderate complexity features requiring some
  exploration of alternatives, dependencies, and impacts.
- **Comprehensive (500-1,000 lines):** Complex systems involving multiple
  components, significant technical decisions, or cross-cutting concerns.
- **Very Large (> 1,000 lines):** Consider splitting into multiple focused
  proposals or creating supplementary architecture documents.

**Boundary note:** Proposals should stay high-level. If you're writing code that
could be directly copied into the codebase, you've crossed into implementation
plan territory. Use illustrative examples or pseudocode, not production-ready
code.

## File Naming

- `YYYY-MM-DD-proposal-name.md`
- Examples:
  - `2025-09-06-keyboard-shortcuts-system-proposal.md`
  - `2025-08-15-document-versioning-proposal.md`

## Template

A ready-to-use template is available:
**[YYYY-MM-DD-TEMPLATE-proposal.md](./YYYY-MM-DD-TEMPLATE-proposal.md)**

Copy this template to start a new proposal, replacing `YYYY-MM-DD` with the
current date and `TEMPLATE` with your topic. The template provides structure
while remaining flexible enough to adapt to your specific needs.

### Key Sections

The template includes:

- **Metadata** (Status, Created date, Author) - Consistent tracking
- **Overview** - Brief summary for quick understanding
- **Problem Statement** - The "why" behind the proposal
- **Proposed Solution** - High-level approach and key components
- **Scope** - What's in, what's out, future considerations
- **Technical Approach** - Architecture and data model considerations
- **Alternatives Considered** - Other options evaluated
- **Impact Assessment** - Benefits, risks, and complexity
- **Open Questions** - Unresolved aspects
- **Success Criteria** - How we measure success

### Guiding Questions

If you prefer to structure your proposal differently, consider addressing these
key questions:

- **The "Why":** What problem is being solved? What are the goals and
  objectives?
- **The "What":** What is the proposed solution at a high level? What are the
  key components, pages, or user-facing changes?
- **The Scope:** What is explicitly included and excluded? What does an MVP or
  the first iteration look like?
- **Impact and Dependencies:** How does this interact with existing features?
  What are the data model considerations or technical prerequisites?
- **Open Questions:** What aspects are still undecided and require further
  discussion?

The template is a starting point - adapt it to fit your proposal's needs.
