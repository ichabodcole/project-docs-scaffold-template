---
description: "Generate a tiered test plan from a development plan and proposal"
allowed_tools: ["Read", "Write", "Grep", "Glob", "Task"]
---

You are tasked with generating a structured test plan with tiered verification
scenarios for a project.

**Project:** `docs/projects/$1`

**Your workflow:**

1. **Read and analyze the inputs**
   - Read the development plan at `docs/projects/$1/plan.md`
   - Read the proposal at `docs/projects/$1/proposal.md`
   - Check if a design resolution exists at
     `docs/projects/$1/design-resolution.md` and read it if present
   - Read the test plan template at
     `docs/projects/TEMPLATES/TEST-PLAN.template.md`
   - Read the projects README at `docs/projects/README.md` for conventions
   - Extract: proposal goals, plan phase validations, risk areas, external
     dependencies

2. **Gate check**
   - If the plan's testing section already has concrete, step-by-step
     verification scenarios, the test plan may be redundant — suggest skipping
   - If the work is purely internal (refactoring, documentation), suggest
     skipping

3. **Identify and tier scenarios**
   - **Tier 1 (Smoke):** App builds, new pages render, basic navigation works
   - **Tier 2 (Critical Path):** Core user flows from proposal goals, key unit
     tests for non-trivial logic. Every proposal goal gets at least one
     scenario.
   - **Tier 3 (Edge Cases):** Deferred with rationale. Complex mocking, error
     states, adversarial inputs.
   - Each scenario: ID (`T<tier>-<number>`), type (UI/E2E, Unit, Integration,
     Manual), concrete steps, expected result, source reference

4. **Identify prerequisites**
   - Check for external dependencies: third-party services, API keys,
     environment variables, human setup actions
   - Add verification command to confirm prerequisites are met
   - Many features have none — that's fine

5. **Write the test plan**
   - Write to `docs/projects/$1/test-plan.md` using the template
   - Include all sections: Overview, Test Environment, Verification Scenarios
     (by tier), Out of Scope, Results Addendum (empty table), Visual Artifacts
   - Screenshot directory: `docs/projects/$1/artifacts/screenshots/`
   - Screenshot naming: `<scenario-id>-<description>.png`

6. **Present and refine**
   - Show scenario count by tier
   - Highlight key Tier 2 scenarios
   - Flag any prerequisites needing human action
   - Apply user feedback
   - Suggest next step: implementation

**Output:** Create a test plan at `docs/projects/$1/test-plan.md`. Inform the
user of the location, scenario summary, and suggested next step.
