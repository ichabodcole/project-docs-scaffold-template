# Design Resolution: Test Plan Document Type

**Status:** Draft\
**Created:** 2026-02-15\
**Related Proposal:** [Test Plan Proposal](./proposal.md)\
**Author:** Cole Reed

---

## Overview

The proposal for adding a test plan document type is clear on the _what_ (tiered
verification document) and _why_ (close the gap between implementation and
verified completion). This design resolution clarifies the behavioral questions
that remained open:

- When does the implementing agent transition from building to testing?
- What does the test plan agent produce vs. what the implementing agent does?
- Where do artifacts live and how do they flow through the workflow?
- What happens when tests fail?
- How does finalize-branch verify the work was tested?

---

## System Behavior

### Entities and Their Roles

**Test Plan Document** (`test-plan.md`)

- A structured markdown file in the project folder.
- Created by the test plan agent after the development plan exists.
- Consumed by the implementing agent during and after implementation.
- Has two lifecycle phases: _scenarios_ (written by test plan agent) and
  _results addendum_ (filled in by implementing agent).

**Test Plan Agent**

- A dedicated plugin agent with testing-focused instructions.
- Inputs: development plan, proposal, design resolution (if present).
- Output: `test-plan.md` with tiered scenarios. No test code, no execution.
- Grounded in 80/20 testing philosophy — prioritizes high-value scenarios and
  explicitly flags what to skip.

**Implementing Agent**

- Reads the test plan alongside the development plan at the start of the
  session.
- Writes unit/integration test code using a per-phase TDD approach.
- Runs UI/E2E verification via Playwright after implementation is complete.
- Captures screenshots of verified UI flows.
- Records all results as an addendum to the test plan.

### State Transitions

```
Test Plan States:
  Draft → Scenarios Complete → In Execution → Results Recorded

  Draft:              Agent is generating scenarios
  Scenarios Complete: All tiers defined, ready for implementation to consume
  In Execution:       Implementing agent is running through scenarios
  Results Recorded:   All scenarios have pass/fail/blocked status
```

### Workflow Sequence

```
1. Plan exists
       ↓
2. Test plan agent generates test-plan.md (scenarios only)
       ↓
3. Implementation begins in worktree
   Agent reads both plan.md and test-plan.md
       ↓
4. Per plan phase:
   a. Write unit/integration tests first (from test plan scenarios)
   b. Implement to make tests pass
   c. Move to next phase
       ↓
5. All phases complete → UI/E2E verification pass
   a. Run Tier 1 smoke tests
   b. Run Tier 2 critical path tests via Playwright
   c. On failure: fix and re-test (escalate only if stuck)
   d. Run screenshot capture pass for verified flows
       ↓
6. Record results addendum in test-plan.md
       ↓
7. Finalize-branch verifies results exist
```

### Prerequisites and Human Dependencies

Some test scenarios depend on external setup that only a human can complete —
third-party accounts, API keys, environment variables, infrastructure
provisioning. For example, testing a Cloudflare R2 integration requires a
Cloudflare account, storage bucket, and API keys populated in `.env` before any
test touching that flow can run.

The test plan template includes a **Prerequisites** section that explicitly
lists:

1. **External services** — Accounts, API keys, or infrastructure that must exist
   (e.g., "Cloudflare R2 bucket with read/write API key").
2. **Environment variables** — Specific `.env` values that must be populated
   (e.g., `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
3. **Human actions required** — Setup steps that cannot be automated by the
   agent (e.g., "Create Cloudflare account and generate API token with R2
   permissions").
4. **Verification command** — A quick check the agent can run to confirm
   prerequisites are met before attempting test execution (e.g., "Run
   `curl $R2_ENDPOINT` and confirm 200 response").

**Workflow implication:** When the test plan agent generates the plan, it should
identify prerequisites from the development plan's dependencies section and flag
any that require human intervention. The implementing agent checks prerequisites
before entering the UI/E2E verification phase. If prerequisites are unmet, the
agent records those scenarios as **blocked** (not failed) in the results
addendum, with a note describing what's needed.

This prevents the common failure mode of an agent running through UI tests that
silently fail because a service isn't configured, producing misleading "tests
passed" results.

### Failure Handling

When a test scenario fails during UI/E2E verification:

1. The implementing agent attempts to fix the underlying issue.
2. The agent re-runs that specific scenario to confirm the fix.
3. The fix is noted in the session doc.
4. Only if the agent cannot resolve the issue after reasonable effort does it
   escalate to the developer — by recording the failure in the results addendum
   with diagnostic details (console errors, screenshots of the failure state).

This keeps the developer out of the loop for fixable issues while ensuring
unfixable problems are surfaced with enough context to act on.

---

## Boundaries

**Explicitly in scope:**

- Test plan template (`TEST-PLAN.template.md`) in project templates
- Test plan generation agent (reads plan → outputs test-plan.md)
- `generate-test-plan` skill paired with the agent
- WORKTREE_TASK.md template update to reference test plan when it exists
- Finalize-branch skill update to check that results addendum exists
- Screenshot capture convention and storage path
- Documentation updates (README, manifesto, decision flowchart)

**Explicitly out of scope:**

- Automated test runner infrastructure (agents use existing tools — project test
  suite, Playwright MCP)
- CI/CD pipeline integration
- Visual regression comparison tooling (comparing screenshots across branches)
- Prescribing specific testing frameworks
- Changes to the plan template's "Testing & Validation Strategy" section (it
  stays lightweight as-is)

**Postponed decisions:**

- **`parallel-worktree-dev` integration** — Making worktree agents automatically
  run verification before declaring completion. This is a natural follow-up but
  adds scope to a different skill. Defer to a separate effort.
- **Test result summary in session docs** — Whether sessions should include a
  condensed test results section. Depends on how the results addendum works in
  practice. Revisit after first real usage.

**Deferred complexity:**

- **Test plan updates during implementation** — If the plan changes
  mid-implementation (new phases added, scope shifts), the test plan may become
  stale. For now, this is handled manually — the agent or developer updates the
  test plan. Automated staleness detection is future work.

---

## Architectural Positioning

### Where Each Component Lives

| Component   | Location                                                         | Type                  |
| ----------- | ---------------------------------------------------------------- | --------------------- |
| Template    | `{{cookiecutter}}/docs/projects/TEMPLATES/TEST-PLAN.template.md` | Cookiecutter template |
| Agent       | `plugins/project-docs/agents/test-plan-generator.md`             | Plugin agent          |
| Skill       | `plugins/project-docs/skills/generate-test-plan/SKILL.md`        | Plugin skill          |
| Output      | `docs/projects/<name>/test-plan.md`                              | Project document      |
| Screenshots | `docs/projects/<name>/artifacts/screenshots/`                    | Project artifacts     |

### Dependencies

- The test plan agent depends on the **development plan** existing (primary
  input).
- The implementing agent depends on the **test plan** existing to follow the
  per-phase TDD workflow (but can proceed without it — the test plan is
  optional).
- The finalize-branch skill gains a **soft dependency** — it checks for test
  plan results if a test-plan.md exists, but doesn't fail if no test plan was
  created.
- Test execution may depend on **external prerequisites** (third-party services,
  API keys, environment variables) that require human setup before the agent can
  run verification. The test plan surfaces these explicitly so they can be
  fulfilled before or during implementation.

### What This Does NOT Change

- The plan template stays as-is. No new sections, no references to the test
  plan.
- The proposal template stays as-is.
- Existing skills and commands are unchanged except for finalize-branch (which
  gets a new check) and the WORKTREE_TASK.md template (which gets a reference
  line).

### What This Does Change (Beyond Test Plan Itself)

- The **design resolution template** gains an External Dependencies subsection
  under Architectural Positioning — an awareness check for third-party services,
  API keys, and human setup actions.
- The **proposal-to-design-resolution skill** gains external dependencies
  questions in the Architectural Positioning Q&A phase.
- The **proposal-to-plan skill** gains awareness of external dependencies from
  the design resolution, surfacing them in the plan's Assumptions & Constraints.

---

## Irreversible Decisions

**Document name: `test-plan.md`**\
This filename becomes a convention that agents, skills, and templates reference.
Changing it later means updating every touchpoint. Using `test-plan.md` (not
`verification-plan.md`, `test-scenarios.md`, etc.) because it's the most widely
understood term.

**Tiered priority system (Tier 1/2/3)**\
The three-tier system is baked into the template, the agent instructions, and
the workflow conventions. The tier definitions (smoke / critical path / edge
cases) should be stable. Adding a Tier 4 later is fine; changing what Tier 1-3
mean would require updating multiple components.

**Test plan agent generates only, does not execute**\
The agent produces `test-plan.md` and nothing else — no test stubs, no
Playwright scripts, no execution. The implementing agent handles all execution.
This clean separation means the test plan agent can be simple and focused. If we
later want an agent that also scaffolds test code, it would be a different
agent.

**Per-phase TDD for unit/integration tests**\
The convention that the implementing agent writes tests before implementation
(per plan phase) is encoded in the WORKTREE_TASK.md template and agent
instructions. This is a workflow convention, not a technical constraint — agents
can deviate if needed — but changing the recommended flow later means updating
documentation in multiple places.

**Screenshots in project artifacts directory**\
`docs/projects/<name>/artifacts/screenshots/` is committed to the repo and
survives merges. This means screenshots become part of the project record. The
alternative (gitignored `.artifacts/`) would be ephemeral. Choosing committed
artifacts because the primary use case is developer review across branches.

---

## Open Questions

These are implementation-level questions for the plan to address:

1. **Screenshot naming convention** — How should screenshot files be named?
   Options: sequential (`01-dashboard.png`), scenario-based
   (`T2-01-create-document.png`), or descriptive (`dashboard-after-create.png`).
   The plan should pick one.

2. **Results addendum format** — Should results be a markdown table at the
   bottom of the test plan, or inline status markers next to each scenario? The
   plan should define the exact format.

3. **Agent instructions length** — How much testing philosophy goes into the
   agent definition vs. the skill? Plugin agents are typically concise; the
   skill provides detailed methodology. The plan should balance these.

---

**Related Documents:**

- [Proposal](./proposal.md)
- [Plan](./plan.md) (created after resolution)

---

## Notes

Key design principle throughout: **the test plan is optional and lightweight**.
Every decision was made with the constraint that skipping the test plan should
always be valid and that creating one should not feel like ceremony. The tiered
system exists specifically to prevent the common failure mode of test plans —
trying to test everything and testing nothing well.
