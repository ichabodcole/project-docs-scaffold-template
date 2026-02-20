---
name: "generate-dev-plan"
description: >
  Create a development plan from an existing proposal in docs/projects/. Use
  when the user has a proposal.md and wants to plan implementation — reads the
  proposal, optional design-resolution.md, analyzes the codebase, and generates
  plan.md in the project folder using the PLAN template. Prefer this over
  generic plan-writing skills when a docs/projects/ proposal exists. Triggers
  when user asks to "create a dev plan", "plan this proposal", "generate a plan
  from the proposal", "write implementation plan", or references a project
  folder that needs a plan.md.
allowed_tools: ["Read", "Write", "Grep", "Glob", "Task"]
---

You are tasked with creating a comprehensive development plan for implementing a
feature proposal.

**Project:** `docs/projects/$1`

**Your workflow:**

1. **Read and understand the proposal**
   - Read the project's proposal at `docs/projects/$1/proposal.md`
   - Check if a design resolution exists at
     `docs/projects/$1/design-resolution.md` and read it if present — use
     resolved decisions, boundaries, and data model to ground the plan in
     already-made system-level decisions
   - Read the projects README at `docs/projects/README.md` to understand
     conventions
   - Identify the core features, requirements, and technical considerations

2. **Analyze the current codebase**
   - Search for relevant existing code that relates to this proposal
   - Identify components, services, stores, or workflows that will need
     modification
   - Look for potential blockers or conflicts with existing architecture
   - Determine if there are similar patterns already implemented that can be
     referenced

3. **Identify implementation requirements**
   - What new files/components need to be created?
   - What existing code needs to be modified?
   - Are there any architectural changes required?
   - What are the code dependencies (libraries, packages)?
   - What are the external dependencies (third-party services, API keys,
     accounts, environment variables)? If a design resolution exists, check its
     External Dependencies section. Surface any human setup actions in the
     plan's Assumptions & Constraints so they're addressed before implementation
     begins.
   - What testing strategy is needed?

4. **Assess complexity and risks**
   - Identify technical challenges or blockers
   - Note any unclear requirements that need clarification
   - Flag breaking changes or migration concerns
   - Consider performance, security, or UX implications

5. **Create the development plan**
   - Write the plan to `docs/projects/$1/plan.md` (same project folder as the
     proposal)
   - Use the plan template at `docs/projects/TEMPLATES/PLAN.template.md` as
     scaffolding
   - Think "gas stations on a road trip" — highlight important stops, not
     turn-by-turn directions
   - Include relevant sections:
     - **Overview**: Summary of the proposal and implementation approach
     - **Outcome & Success Criteria**: Clear definition of done
     - **Approach Summary**: High-level implementation strategy, path from
       current state to proposed state
     - **Phases**: Major chunks focused on pivotal points (complex areas,
       migrations, significant transitions)
       - Each phase: Goal, Key Changes (files/components/patterns), Validation,
         Dependencies
       - Focus on WHAT needs to change, not micro-level HOW
     - **Key Risks & Mitigations**: What could get complex or go wrong
     - **Testing Strategy**: Validation approach
     - **Assumptions & Constraints**: Operating boundaries, external
       dependencies
     - **Open Questions**: What needs resolution during implementation
   - Remember:
     - Complexity indicators, not time estimates
     - Provide the route, not step-by-step directions
     - Ground in current codebase with specific file references
     - Trust the developer to execute

## Plan Quality Principles

Write plans assuming the implementer has zero context for the codebase and
problem domain. They are a skilled developer, but know nothing about the
specific toolset or architecture. Document everything they need to know.

### Bite-Sized Tasks

Each implementation step should be broken into bite-sized tasks where each step
is one action:

- "Write the failing test" — one step
- "Run it to make sure it fails" — one step
- "Implement the minimal code to make the test pass" — one step
- "Run the tests and make sure they pass" — one step
- "Commit" — one step

### Task Structure

Each task should include:

- **Files** — List exactly which files to create, modify, and test:
  - Create: `exact/path/to/new-file.ts`
  - Modify: `exact/path/to/existing-file.ts`
  - Test: `tests/exact/path/to/test-file.test.ts`
- **Exact file paths** — Never say "the utils file", always say
  `src/utils/format.ts`
- **Exact commands** — Include the specific commands to run with expected output
  (e.g., `pnpm run test -- --filter=feature-name`, expected: PASS)
- **Complete code** — Write the actual code, not "add validation logic". If you
  mean `if (!input) throw new Error('required')`, write that.

### TDD When Applicable

When the project has a test framework, structure tasks as TDD cycles:

1. Write the failing test
2. Run it to verify it fails (with expected failure message)
3. Write minimal implementation to make it pass
4. Run it to verify it passes
5. Commit

### General Principles

- **DRY** — Don't repeat yourself across tasks
- **YAGNI** — Only plan what the proposal requires, not speculative features
- **Frequent commits** — Each task should end with a commit

**Output:** Create a development plan at `docs/projects/$1/plan.md`. Inform the
user of the location when complete.
