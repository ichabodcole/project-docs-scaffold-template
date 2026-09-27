---
name: "generate-dev-plan"
description: >
  Create a development plan for a feature (or a work item) in docs/features/ or
  docs/items/. Use when the user has a feature.md and wants to plan
  implementation — consults the project's playbooks for this kind of work, reads
  the feature, an optional design-resolution.md, analyzes the codebase,
  generates plan.md in the owner's folder using the PLAN template, and shapes
  the feature's work items (blocked_by, ready). Prefer this over generic
  plan-writing skills when a docs/features/ feature exists. Triggers when user
  asks to "create a dev plan", "plan this proposal", "plan this feature",
  "generate a plan from the proposal", "write implementation plan", or
  references a feature that needs a plan.md.
allowed_tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "Agent"]
---

You are tasked with creating a comprehensive development plan for implementing a
feature proposal.

**Owner:** `$1` — a reference to what the plan belongs to: `feature/<slug>`
(usual) or `item/<slug>` for a work item big enough to need a plan. A bare slug
means `feature/<slug>`. The owner's folder is `docs/features/<slug>/` or
`docs/items/<slug>/`. `pdocs` below means `bun scripts/pdocs/cli.ts`, the
documentation CLI at the repo root; the docs root is `docsRoot` in
`.project-docs.json` (default `docs/`).

**Your workflow:**

0. **Consult the playbooks for this kind of work** — first. Read the owner's
   entry file far enough to name the kind of work in a few words (a database
   migration, a new CLI verb, an auth integration), then run:

   ```bash
   pdocs find --type playbook --format json
   ```

   Read each match's `description` — that is the playbook index — and read in
   full the ones that apply to this kind of work. **Quote the evidence in the
   plan and in your reply**: the `path` of every playbook you applied, and a
   one-line reason; or, when `count` is 0 or none applies, the literal result —
   "`pdocs find --type playbook`: 0 matches" or "N playbooks, none for <kind of
   work>: <their paths>". A claim that nothing applies, with no query output
   behind it, is not a consult. What an applied playbook says becomes a
   constraint or a step in the plan, attributed to it.

1. **Read and understand the proposal**
   - Read the owner's entry file: `feature.md` (or the item's `item.md`). **If
     its body is still the template's prompts**, there is nothing to plan from:
     say so, and ask the user to fill it in (or run `generate-proposal`) first
   - Check if a design resolution exists at `design-resolution.md` in the same
     folder and read it if present — use resolved decisions, boundaries, and
     data model to ground the plan in already-made system-level decisions
   - Read `docs/features/README.md` (or `docs/items/README.md`) for conventions
   - For a feature, list the work items that already name it:
     `pdocs view feature <slug>`
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
   - Create the file with the CLI, which places it in the owner's folder, seeds
     it from `docs/TEMPLATES/PLAN.template.md` and links the owner from its
     Related section:

     ```bash
     pdocs new plan --owner feature/<slug> \
       --title "…" --description "…" --by "<your model or name>"
     ```

     A single-file item given as owner is promoted to a folder first. The CLI
     fills the frontmatter and, from `--title`, the H1; replace every bracketed
     prompt in the body, and delete the template's guidance comments once you
     have used them.

   - **Fill the template's frontmatter block, every field** — the bracketed
     values are placeholders, not defaults; `pdocs check` reports one left in
     place (`PLACEHOLDER`): `title` matching the H1; `description` as one
     sentence naming the route from here to the proposed state; 2–4 kebab-case
     `tags`; `status: draft`; `lifecycle: draft` (it becomes `active` when
     implementation starts, which is not now);
     `generated: { by: <your model or name>, at: <today, YYYY-MM-DD> }`. **Don't
     write `related:`.** A plan is a workbench document, and the lint checks
     `related` edges only on library pages, so a mistyped one on a plan passes
     silently. Link in the body instead, where the lint checks the path: the
     feature (`./feature.md`, which `pdocs new --owner` already wrote under
     Related Documents) and each playbook you applied in step 0, linked from the
     Playbooks consulted section
     (`[<title>](../../playbooks/<name>-playbook.md)`).
   - Think "gas stations on a road trip" — highlight important stops, not
     turn-by-turn directions
   - Include relevant sections:
     - **Playbooks consulted** (first, as its own `##` section — the template
       has no slot for it): step 0's evidence — the paths and why, or the
       zero-match result
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

**Output:** Create a development plan at `plan.md` in the owner's folder. Inform
the user of the location when complete, and quote step 0's consult result.

After the plan is written, in this order: the user reviews it; you shape its
items (below); then you ask about a test plan (the section after).

## Shaping the Work Items

Planning is where a feature's work gets **shaped**: each piece gets a settled
definition of done and knows what it waits on. Once the user has reviewed the
plan, for a feature, **list the items you propose to file and the `blocked_by`
between them, and ask the user to approve the list.** Their approval is the
triage step for these items — they are the user's own plan, seen and accepted —
which is why they can skip `triage`. Without it, file nothing, or file them with
no `--lifecycle` so they wait in `triage`.

1. **File the items the plan names that don't exist yet**, one per phase or task
   an agent could pick up on its own:

   ```bash
   pdocs new item <slug> --kind task --parent feature/<slug> --lifecycle backlog \
     --title "…" --description "…" --by "<your model or name>"
   ```

   `backlog`, not `triage`, only because the user approved the list above.
   `pdocs new item` writes the frontmatter only: edit each item file's body —
   its H1 and its `## Definition of done` — from the plan. An item the plan
   names that already exists keeps its file; write its definition of done if its
   body is still the template's prompt.

2. **Set what each waits on**, from the plan's phase dependencies:

   ```bash
   pdocs set item/<slug> --blocked-by <id-or-item/slug>,…
   ```

3. **Move the shaped, unblocked ones to `ready`** — an item whose definition of
   done you have now written and whose `blocked_by` is empty or all `done`.
   `ready` means nothing is blocking it. A shaped item that is still blocked
   stays `backlog`: `finalize-branch` moves it to `ready` when the last item it
   waits on lands.

   ```bash
   pdocs set item/<slug> --lifecycle ready
   ```

Leave alone any item already in `triage`: that is the user's call, through
`triage-items`. Show the user `pdocs view feature <slug> --format text` and
`pdocs view ready --format text` when you are done — the second shows which
items the `blocked_by` you set are holding back.

## After the Plan Is Created

Once the plan is written and the user has reviewed it, assess whether a **test
plan** is warranted. Ask the user:

> "Should we create a test plan for this feature? A test plan defines tiered
> verification scenarios (smoke tests, critical path, edge cases) before
> implementation begins."

**Suggest a test plan when:**

- The feature touches multiple systems or layers
- There are complex state transitions, data flows, or failure modes
- The plan has 3+ phases or significant integration points
- The proposal mentions reliability, correctness, or safety concerns

**Skip the test plan when:**

- It's a simple refactor, rename, or config change
- The plan is a single phase with straightforward validation
- Testing strategy is adequately covered within the plan itself

If the user agrees, run the `generate-test-plan` skill for the same owner.
