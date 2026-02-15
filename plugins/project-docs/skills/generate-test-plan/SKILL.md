---
name: "generate-test-plan"
description: >
  Generate a tiered test plan from a development plan and proposal. Use when the
  user wants verification scenarios defined before implementation, asks to
  "create a test plan", "generate test scenarios", "define what to test", or
  needs structured verification for agent-implemented features. Triggers when
  user mentions "test plan", "verification plan", "what should we test", or
  wants to prepare for parallel worktree development with clear testing
  expectations.
allowed_tools: ["Read", "Write", "Grep", "Glob"]
---

# Generate Test Plan

## Purpose

Generate a structured, tiered test plan from a development plan and proposal.
The test plan defines what to verify, how to verify it, and at what priority —
giving implementing agents a concrete verification roadmap that prevents the
"implementation complete but not actually working" gap.

The template defines point B. This skill is the methodology for getting there.

## Philosophy

- **The 80/20 rule is the operating principle.** Most verification value comes
  from a small number of well-chosen scenarios. The common failure mode of test
  plans is trying to test everything and testing nothing well. The tiered system
  makes the tradeoff visible.
- **Convergence, not creation.** Every scenario must trace back to a proposal
  goal, plan phase, or identified risk area. Do not invent new requirements or
  test scenarios that the proposal didn't contemplate.
- **Explicit deferral is a feature.** Tier 3 items with clear deferral rationale
  are more valuable than a flat list where everything has equal priority. Saying
  "we're not testing this now because X" is a decision, not a gap.
- **Concrete beats comprehensive.** Five well-defined scenarios with specific
  steps are worth more than twenty vague "verify X works" entries.
- **The test plan is optional.** Not every project needs one. If the plan's
  validation sections already have concrete verification steps, or the work is
  purely internal, say so and suggest skipping.

## Process

### Phase 1: Read & Analyze

1. Read the development plan at `docs/projects/$1/plan.md`
2. Read the proposal at `docs/projects/$1/proposal.md`
3. Check if a design resolution exists at
   `docs/projects/$1/design-resolution.md` and read it if present
4. Read the test plan template at
   `docs/projects/TEMPLATES/TEST-PLAN.template.md`
5. Read the projects README at `docs/projects/README.md` for conventions

**Extract from the inputs:**

- **Proposal goals** — What the user should be able to do when this is complete.
  Each goal is a candidate for Tier 2.
- **Plan phases** — Each phase's validation section seeds specific scenarios.
  What does each phase produce that's testable?
- **Risk areas** — Complex logic, state management, data transformations,
  integration points. These are candidates for Tier 2 or Tier 3 depending on
  impact.
- **External dependencies** — From the design resolution's External Dependencies
  section or the plan's Assumptions & Constraints. Third-party services, API
  keys, environment variables, human setup actions.

**Gate check:** If the plan's "Testing & Validation Strategy" section already
contains concrete, step-by-step verification scenarios (not just a prose
description), the test plan may be redundant. Present this assessment to the
user and suggest skipping if appropriate.

### Phase 2: Identify Scenarios

Map inputs to test scenarios using these sources:

1. **App-level smoke checks → Tier 1**
   - Does the app build without errors?
   - Do new pages/routes render without console errors?
   - Can the user navigate to the new feature?

2. **Proposal goals → Tier 2**
   - Every stated goal ("users should be able to...") becomes at least one
     scenario
   - Map goal language directly to test steps
   - Include both the happy path and the most important failure mode

3. **Plan phase validation → Tier 2**
   - Each phase's validation section describes what must be true after the phase
     is complete
   - Non-trivial business logic (transformations, state machines, calculations)
     maps to unit test scenarios

4. **Risk areas and edge cases → Tier 3**
   - Complex mocking requirements
   - Adversarial inputs
   - Error states, empty states, loading states
   - Performance bounds
   - Scenarios requiring infrastructure not yet available

Each scenario gets:

- **ID:** `T<tier>-<number>` (e.g., `T1-01`, `T2-03`, `T3-01`)
- **Title:** Short, descriptive
- **Type:** UI/E2E, Unit, Integration, or Manual
- **Source:** Which proposal goal or plan phase this verifies
- **Steps:** Concrete, ordered steps an agent can follow
- **Expected result:** Specific outcome, not "it works"

### Phase 3: Identify Prerequisites

Check the plan's dependencies and the design resolution's External Dependencies
section for:

1. **Third-party services** — Accounts, platforms, infrastructure that must
   exist before testing
2. **Credentials & API keys** — Specific keys or tokens and where they come from
3. **Environment variables** — `.env` values that must be populated
4. **Human actions required** — Setup steps that cannot be automated by the
   agent
5. **Verification command** — A quick check the agent can run to confirm
   prerequisites are met

If prerequisites exist, they go in the Test Environment section. Scenarios that
depend on unmet prerequisites should be flagged — they'll be marked as
**blocked** (not failed) in the results addendum if prerequisites aren't met at
execution time.

Many features have no external dependencies. That's fine — just note "No
external dependencies" and move on.

### Phase 4: Write Test Plan

1. Write to `docs/projects/$1/test-plan.md`
2. Use the template at `docs/projects/TEMPLATES/TEST-PLAN.template.md`
3. Populate all sections:
   - **Overview** — What's being verified, link to plan and proposal
   - **Test Environment** — How to run the app, prerequisites, external
     dependencies
   - **Verification Scenarios** — Organized by tier with full scenario detail
   - **Out of Scope** — Tests explicitly excluded with rationale
   - **Results Addendum** — Empty table with all scenario IDs, ready for the
     implementing agent to fill in
   - **Visual Artifacts** — Screenshot directory and naming convention
4. Set Status to "Draft"
5. Set the screenshot directory to `docs/projects/$1/artifacts/screenshots/`

### Phase 5: Present & Refine

1. Present the test plan to the user
2. Highlight:
   - Number of scenarios per tier
   - Key Tier 2 scenarios that map to proposal goals
   - Any scenarios marked for explicit deferral (Tier 3) and why
   - Prerequisites that need human action
3. Ask if any scenarios should be added, removed, or re-tiered
4. Apply feedback
5. Suggest next step: implementation (either directly or via
   `/project-docs:parallel-worktree-dev`)

## Output

Create a test plan at `docs/projects/$1/test-plan.md`. Inform the user of:

- The document location
- Summary of scenarios by tier (e.g., "3 smoke, 5 critical path, 2 deferred")
- Any prerequisites requiring human action
- Suggested next step

## Important Guidelines

- **This is convergence, not creation.** Do not introduce test scenarios for
  features or behaviors not described in the proposal or plan.
- **Scenario IDs are stable.** Once assigned, the IDs (`T1-01`, `T2-03`) are
  used for screenshot naming (`T2-03-feature-name.png`) and results tracking.
  Don't renumber after the plan is written.
- **Don't test everything.** The explicit anti-pattern is comprehensive
  coverage. Five Tier 2 scenarios that verify the feature works are better than
  twenty scenarios that try to cover every edge case.
- **The implementing agent is the executor.** The test plan agent generates
  scenarios. The implementing agent writes test code (unit/integration) and runs
  UI/E2E verification. Keep this separation clean.
- **Prerequisites prevent false positives.** An agent running tests against
  unconfigured services produces misleading "tests passed" results. Surface
  prerequisites explicitly so the implementing agent can check them before
  execution and mark dependent scenarios as "blocked" rather than "passed."
