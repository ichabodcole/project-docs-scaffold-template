# Proposal: Add "Test Plan" Document Type to Project Lifecycle

**Status:** Draft\
**Date:** 2026-02-15\
**Author:** Cole Reed

---

## Overview

This proposal introduces a new document type — the **Test Plan** — to the
project documentation lifecycle. A test plan is a structured verification
document that defines what to test, how to test it, and at what priority,
created after the development plan and consumed during and after implementation.

The test plan addresses a specific gap in agent-driven development workflows:
implementations are declared "complete" without structured verification, leading
to manual testing loops where errors are discovered, copied back to agents, and
fixed iteratively. This is especially costly in parallel worktree workflows
where multiple features are developed simultaneously.

---

## Problem Statement

In the current workflow:

```
Proposal → [Design Resolution] → Plan → Implementation → ??? → Done
```

The gap between implementation and "done" is unstructured. What happens in
practice:

1. An agent implements a feature according to the plan.
2. The agent runs whatever tests exist (often just `pnpm verify` or similar).
3. The agent declares the work complete.
4. The developer manually opens the app and tests the feature.
5. The developer finds issues — console errors, broken UI flows, missing edge
   cases.
6. The developer copies errors back to the agent for another round.
7. Steps 4-6 repeat until the feature actually works.

This pattern has several problems:

- **Not scalable** — Manual testing blocks parallel development. If three
  features land simultaneously, the developer becomes the bottleneck testing
  each one.
- **Context loss** — The developer is doing the agent's verification work, often
  after the agent's session has ended or context has shifted.
- **Inconsistent coverage** — Without a checklist, verification depends on the
  developer remembering what to check. Important flows get missed.
- **No traceability** — There's no record of what was verified, making it hard
  to know if a feature was thoroughly tested or just spot-checked.

The plan template has a "Testing & Validation Strategy" section, but it's a
lightweight prose description of the overall approach. It doesn't provide
concrete, executable verification steps that an agent can run autonomously.

---

## Proposed Solution

Add a **Test Plan** document to the project folder, created after the
development plan, that provides structured, tiered verification scenarios.

### Updated Lifecycle

```
Report → Investigation → Project:
  ├ proposal
  ├ design-resolution (optional)
  ├ plan
  ├ test-plan (optional)
  ├ sessions
  └ report
```

### What a Test Plan Contains

A test plan translates the proposal's goals and the plan's implementation steps
into concrete verification scenarios, organized by priority:

**Tier 1 — Smoke Tests (always required):**

- Does the app build and start without errors?
- Do new routes/pages render without console errors?
- Can the user navigate to the new feature?
- These are cheap checks — navigate, assert no crashes, verify basic rendering.

**Tier 2 — Critical Path Tests (high value, should do):**

- The core user flows the feature enables.
- Maps directly to proposal goals: "users should be able to do X" becomes a
  concrete test scenario.
- Key unit tests for non-trivial business logic (transformations, state
  machines, calculations).
- These represent the minimum verification that the feature actually works as
  intended.

**Tier 3 — Edge Cases & Robustness (backlog unless critical):**

- Error states, empty states, loading states.
- Tests requiring complex mocking or infrastructure setup.
- Adversarial inputs, concurrency scenarios, performance bounds.
- These are explicitly flagged as optional or backlog items unless they cover
  critical infrastructure.

### Test Types

The test plan should specify the appropriate testing method for each scenario:

| Type        | When to Use                            | Tool/Approach      |
| ----------- | -------------------------------------- | ------------------ |
| UI/E2E      | User-facing flows, visual verification | Playwright         |
| Unit        | Pure logic, transformations, utilities | Project test suite |
| Integration | API endpoints, service interactions    | Project test suite |
| Manual      | Subjective quality, design review      | Developer review   |

### How It Fits Into the Agent Workflow

The test plan bridges two phases of agent work — implementation and
verification.

**During implementation (TDD-style for unit/integration tests):**

1. Agent reads `test-plan.md` before or alongside the development plan.
2. For unit and integration test scenarios, the agent writes the tests first
   (test-driven development), then implements to make them pass.
3. This keeps unit tests grounded in the test plan rather than invented ad hoc.

**After implementation (UI/E2E verification):**

4. Agent executes Tier 1 smoke tests — app builds, pages render, no console
   errors. Fix before continuing.
5. Agent executes Tier 2 critical path tests via Playwright — the core user
   flows work end-to-end.
6. Agent captures screenshots of key UI states (see Visual Verification
   Artifacts below).
7. Agent flags Tier 3 items as not yet covered (or implements if
   straightforward).
8. Agent records results as an addendum to the test plan.

**Workflow touchpoints — how the agent knows to do this:**

- The **WORKTREE_TASK.md** template references the test plan, making the agent
  aware of it from the start of the session.
- The **finalize-branch** skill checks that the test plan was executed and
  results recorded before merge.

### Visual Verification Artifacts

For UI/E2E tests, after the agent confirms all scenarios pass, it performs a
dedicated screenshot capture pass:

1. Walk through each verified UI flow.
2. Capture screenshots at key interaction points (page load, after form
   submission, success state, etc.).
3. Save screenshots to `.artifacts/<branch>/screenshots/` or the project's
   artifacts directory.

This gives the developer a visual smoke test: open the branch, review the
screenshots, and quickly assess whether the UI looks correct — without starting
the app. Visual issues (layout problems, missing elements, style regressions)
are caught before manual review.

### Dedicated Test Plan Agent

Test plan generation is handled by a **dedicated agent** rather than being part
of the planning or implementation agent's responsibilities. This separation is
deliberate:

- **Clean context** — The agent starts fresh with only the plan and proposal as
  inputs. No implementation context biases its judgment about what to test.
- **Testing mindset** — The agent is grounded in testing philosophy: the 80/20
  rule, tiered prioritization, and the discipline to flag Tier 3 items as
  backlog rather than trying to test everything.
- **Objective lens** — A separate agent naturally asks "what could go wrong?"
  rather than "what did I just build?" which produces better test coverage.

The agent reads the development plan (and optionally the proposal and design
resolution), generates the test plan following the template, and outputs
`test-plan.md` in the project folder.

### Example Test Plan Entry

```markdown
### T2-01: User can create a new document

**Type:** UI/E2E (Playwright) **Priority:** Tier 2 — Critical Path **Source:**
Proposal goal: "Users should be able to create documents from the dashboard"

**Steps:**

1. Navigate to `/dashboard`
2. Click "New Document" button
3. Enter document title "Test Document"
4. Click "Create"
5. Verify redirect to `/documents/{id}`
6. Verify document title appears in the editor

**Expected:** Document is created and user lands in the editor with the correct
title displayed. No console errors.
```

---

## Scope

**In Scope (MVP):**

- Test plan template (`TEST-PLAN.template.md`)
- Placement in project folder lifecycle
- Documentation updates (README, manifesto, decision flowchart)
- Tiered priority system (Tier 1/2/3)
- Dedicated test plan generation agent (reads plan, outputs test-plan.md)
- `generate-test-plan` skill paired with the agent
- WORKTREE_TASK.md template update to reference test plan
- Screenshot capture convention for visual verification artifacts
- Finalize-branch skill update to check test plan execution
- Test results recorded as addendum to test-plan.md

**Out of Scope:**

- CI/CD integration or test runner configuration
- Prescribing specific testing frameworks beyond recommendations
- Automated test execution infrastructure (agents use available tools like
  Playwright MCP)

**Future Considerations:**

- Integration with the `parallel-worktree-dev` skill so agents automatically run
  verification before declaring completion
- Test result summary as a section in session documents
- Screenshot comparison tooling (visual regression between branches)

---

## Technical Approach

### Document Structure

The test plan lives in the project folder alongside existing documents:

```
docs/projects/<project-name>/
  proposal.md
  design-resolution.md    (optional)
  plan.md
  test-plan.md            (new, optional)
  sessions/
```

### Template Design

The template should be structured enough to be useful but flexible enough not to
become ceremony. Key sections:

1. **Overview** — What's being verified, link to plan and proposal
2. **Test Environment** — Prerequisites, setup steps, URLs, how to start the app
3. **Verification Scenarios** — Tiered list with ID, type, steps, expected
   results
4. **Out of Scope / Backlog** — Explicitly deferred tests with rationale

And an addendum section filled in during/after execution:

5. **Results** — Pass/fail/blocked status per scenario, with notes on failures
6. **Visual Artifacts** — Links to screenshots captured during UI verification
   (stored in `.artifacts/<branch>/screenshots/` or project artifacts directory)

### When to Create

The test plan is created **after the development plan** because:

- The plan defines what's being built and in what phases
- Each phase's "Validation" section seeds the test plan's scenarios
- The proposal's goals define the critical path (Tier 2) scenarios
- Without a plan, you don't know enough to write meaningful tests

It can also be created **during implementation** if the plan didn't exist
beforehand (e.g., exploratory work), but the ideal flow is plan-first.

### When to Skip

Like design resolution, this is optional. Skip when:

- The feature has no UI (pure refactoring, internal tooling changes)
- The project already has comprehensive automated test coverage
- The work is documentation-only
- The feature is trivial (single function, obvious verification)

### Determining What to Test

The test plan author (human or agent) should prioritize based on:

1. **Proposal goals** — Every stated goal should have at least one Tier 2 test
2. **Plan phases** — Each phase's validation section seeds scenarios
3. **Risk areas** — Complex logic, state management, data transformations
4. **User-facing flows** — Anything the user directly interacts with
5. **Integration points** — Where the new code touches existing systems

The explicit anti-pattern is testing everything. The tiered system makes the
tradeoff visible: Tier 1 is non-negotiable, Tier 2 is the real value, Tier 3 is
conscious deferral.

---

## Impact & Risks

**Benefits:**

- Closes the "implementation complete but not verified" gap
- Enables truly autonomous agent workflows (implement → verify → report)
- Makes parallel development scalable (no manual testing bottleneck)
- Creates verification traceability (what was tested, what wasn't)
- The tiered system prevents over-testing while ensuring critical paths are
  covered

**Risks:**

- **Test plan becomes stale** — Mitigated by keeping it lightweight and
  tier-focused. The plan references scenarios, not implementation details.
- **Overhead for simple features** — Mitigated by making it optional, same as
  design resolution.
- **Agents struggle with Playwright** — This is a real concern. Playwright
  testing by agents requires the app to be running and accessible. The test plan
  should note environment prerequisites clearly.

**Complexity:** Low-Medium — This is a new document type with template,
documentation updates, and optional tooling. No changes to existing documents or
workflows; purely additive.

---

## Resolved Decisions

1. **Plan template's "Testing & Validation Strategy" stays lightweight.** The
   plan's testing section remains minimal — just enough for the implementing
   agent to verify each phase went according to plan. The test plan handles the
   heavy lifting. The test plan references the development plan, not the other
   way around.

2. **Create a `generate-test-plan` skill with a dedicated agent.** The agent
   provides clean context and a testing-focused mindset. Included in MVP scope.

3. **WORKTREE_TASK.md template references the test plan.** This is the primary
   touchpoint that makes agents aware of the test plan during implementation.

4. **Test results are recorded as an addendum to the test plan.** Each scenario
   gets a pass/fail/blocked status. UI test screenshots are saved as artifacts.

## Open Questions

1. **Where exactly does the unit test writing happen in the implementation
   flow?** The test plan can guide a TDD approach (write tests first from the
   test plan scenarios, then implement), but this depends on whether the
   implementing agent reads the test plan during implementation or only after.
   The WORKTREE_TASK.md reference makes it available, but the convention for
   when to use it during implementation needs to be defined — likely in the
   skill/agent instructions rather than the document format.

2. **Should the test plan agent also execute the tests, or only generate the
   plan?** Generation and execution could be separate concerns — one agent
   writes the test plan, the implementing agent (or a verification agent)
   executes it.

---

## Success Criteria

- Test plan template exists and follows project-docs conventions
- At least one real project uses the test plan to verify agent-implemented work
- Agent can read the test plan and execute Tier 1/2 scenarios without human
  intervention
- Manual testing time is measurably reduced for parallel feature development

---

**Related Documents:**

- [Plan Template](../TEMPLATES/PLAN.template.md) — Current testing section
- [Design Resolution Proposal](../design-resolution-doc-type/proposal.md) —
  Similar lifecycle addition pattern
- [Parallel Worktree Dev Skill](../../../plugins/project-docs/skills/parallel-worktree-dev/SKILL.md)
  — Agent workflow integration point
