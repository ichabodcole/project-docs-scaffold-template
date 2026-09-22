---
type: report
title:
  "Plans as artifacts, discovery vs. delivery, and idiomatic work-item fields"
description:
  "Establishes that a durable, reviewed plan is now the norm across agent coding
  tools and is written by the executing agent itself; that dual-track agile's
  discovery/delivery boundary hands over a shaped, accepted unit (never a raw
  idea); and which work-item fields are near-universal versus agent-native
  additions."
tags: [taxonomy, agents]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Plans as artifacts, discovery vs. delivery, and idiomatic work-item fields

Three follow-up questions from
[the work-taxonomy investigation](../investigations/2026-09-22-work-taxonomy-for-agent-first-development-investigation.md),
researched to inform its still-open decisions #3 (is a plan durable or scratch)
and the newly added discovery/delivery scoping question. Findings are sorted
into evidence (with a source) and opinion (labelled as such); the four
2026-09-22 reports this investigation already produced are not repeated here.

---

## 1. Plans as artifacts in agent workflows

**Question:** is an implementation plan emerging as a durable, reviewed, stored
document, or as agent scratch? Who writes it, is it reviewed, where does it
live, and does it outlive the task?

| Tool / source                                                               | Who writes the plan                                                                  | Reviewed before execution?                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Where it's stored                                                                                                                                                                                                                                                                          | Attached to                                                                                                       | Outlives the task?                                                                                                         |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code plan mode**                                                   | The executing agent, in a read-only planning pass                                    | Yes — human approves before Claude leaves plan mode ([Anthropic best-practices docs](https://code.claude.com/docs/en/best-practices); [Claude Code plan mode guide](https://www.vibecodingacademy.ai/blog/claude-code-plan-mode-complete-guide))                                                                                                                                                                                                                                           | Nowhere by default — the plan lives in the terminal/session transcript; plan mode itself is a session toggle, not a file store ([dev.to plan-mode mechanics](https://dev.to/rulestack/claude-code-plan-mode-what-it-actually-blocks-what-still-runs-and-what-approving-switches-you-22m3)) | The current turn/task                                                                                             | **No**, unless the user explicitly asks Claude to write the plan to a file                                                 |
| **Cursor Plan Mode**                                                        | The agent, after researching the codebase                                            | Yes — user reviews/edits the plan, then clicks "Build" ([Cursor Plan Mode docs](https://cursor.com/docs/agent/plan-mode); [Cursor blog](https://cursor.com/blog/plan-mode))                                                                                                                                                                                                                                                                                                                | Optionally saved as Markdown to a `.cursor/plans/` folder, checked into source control ([learncursor.dev](https://www.learncursor.dev/learn/cursor-agents/agent-plan-mode); [Cursor blog](https://cursor.com/blog/plan-mode))                                                              | The repository, generically — not bound to one issue by the tool                                                  | **Optional** — persistence is an explicit user choice, not the default                                                     |
| **OpenAI Codex / ExecPlans (PLANS.md)**                                     | A contributor or the agent, following OpenAI's `PLANS.md` spec                       | Yes, explicitly: "users can use these documents to verify the approach Codex will take before it begins a long implementation process" ([OpenAI Cookbook, Using PLANS.md](https://developers.openai.com/cookbook/articles/codex_exec_plans))                                                                                                                                                                                                                                               | Checked into the repo (e.g. `.agent/PLANS.md` or a task-specific plan file)                                                                                                                                                                                                                | A specific feature/refactor; "it should always be possible to restart from _only_ the ExecPlan and no other work" | **Yes, by design** — it's a living document meant to survive interruption and handoff                                      |
| **GitHub Spec Kit**                                                         | The agent, from `spec.md` and `constitution.md`, producing `plan.md` then `tasks.md` | Human approval gate between spec → plan → tasks ([GitHub spec-driven.md](https://github.com/github/spec-kit/blob/main/spec-driven.md); [Microsoft Learn](https://learn.microsoft.com/en-us/training/modules/spec-driven-development-github-spec-kit-greenfield-intro/))                                                                                                                                                                                                                    | `plan.md` and `tasks.md` are first-class files in the repo, alongside `spec.md`                                                                                                                                                                                                            | One feature/spec                                                                                                  | **Yes** — the four files are the durable record of that feature                                                            |
| **Kiro (AWS)**                                                              | The agent, from `requirements.md` → `design.md` → `tasks.md`, each gated             | Explicit human approval gate between each phase ([Kiro Specs docs](https://kiro.dev/docs/specs/))                                                                                                                                                                                                                                                                                                                                                                                          | Files in the repo per spec                                                                                                                                                                                                                                                                 | One feature                                                                                                       | **Yes** — the three files are the design record                                                                            |
| **GitHub Copilot coding agent**                                             | The agent, on request, before acting                                                 | Optional but supported: "ask for a plan before it takes any action" ([GitHub Docs, reviewing a PR created by Copilot](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/reviewing-a-pull-request-created-by-copilot))                                                                                                                                                                                                                                                    | The plan surfaces in the PR description / conversation, not a separate file                                                                                                                                                                                                                | The pull request                                                                                                  | **No** — the PR description is the closest thing to a durable trace, and it dies with the PR (or is squashed into history) |
| **Aider architect mode**                                                    | The "architect" model (prose plan); a separate "editor" model then emits diffs       | Yes when interactive: "Aider first proposes changes as a plan... and only implements after you approve" ([aistack.today](https://aistack.today/en/tips/aider-architect-mode/); [Aider docs](https://aider.chat/docs/usage/modes.html))                                                                                                                                                                                                                                                     | Chat history / terminal, not a file by default                                                                                                                                                                                                                                             | The current session                                                                                               | **No** — this is the clearest "plan as scratch" case among the tools researched                                            |
| **Devin (Cognition)**                                                       | A dedicated "Planner" model inside Devin's compound-agent architecture               | The plan is visible in Devin's session UI for the human to steer; review is built into the product loop rather than a hard gate ([Devin AI review 2026](https://hostadvice.com/ai-app-builders/devin-ai-review/); [Idlen Devin 2026](https://www.idlen.io/blog/devin-ai-engineer-review-limits-2026/))                                                                                                                                                                                     | Session/task-scoped in Devin's UI                                                                                                                                                                                                                                                          | The Devin session                                                                                                 | **No**, not as a repo artifact — it's part of the session record                                                           |
| **Harper Reed's codegen workflow** (practitioner)                           | The human, iteratively, with the LLM asking one question at a time                   | Yes — the whole point is a spec the human can hand to a developer                                                                                                                                                                                                                                                                                                                                                                                                                          | `spec.md`, then `prompt_plan.md` and `todo.md`, saved in the repo ([Harper Reed's blog](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/); [Simon Willison's linkblog](https://simonwillison.net/2025/Feb/21/my-llm-codegen-workflow-atm/))                                     | The feature being built                                                                                           | **Yes**, by intent — these are meant as durable planning documents                                                         |
| **Simon Willison, "Agentic Engineering Patterns" (practitioner, opinion)**  | The agent, but the pattern favors capturing state explicitly                         | Implied — the recommendation is to put "a task brief, a scoped plan, checkpoint notes, test output... in durable artifacts" rather than relying on chat memory ([Agentic Engineering Patterns](https://simonw.substack.com/p/agentic-engineering-patterns))                                                                                                                                                                                                                                | Files/PR, explicitly _not_ just chat                                                                                                                                                                                                                                                       | The task/PR                                                                                                       | **Yes** — this is presented as a deliberate practice, not a tool default                                                   |
| **Anthropic "explore, plan, code" guidance** (primary source, prescriptive) | The agent, prompted to plan before coding                                            | Yes — "letting Claude start coding immediately may create code that solves the wrong problem" is the stated reason to insert a plan step first ([Claude Code best practices](https://code.claude.com/docs/en/best-practices))                                                                                                                                                                                                                                                              | Not specified as a persisted file by this guidance itself; persistence is left to the user (plan mode → optional saved file)                                                                                                                                                               | The task                                                                                                          | Not asserted either way — this is workflow guidance, not a storage spec                                                    |
| **Addy Osmani (practitioner, opinion)**                                     | The agent                                                                            | Explicit and repeated: "describes the task, approves a plan... and the PR is waiting when they return" across four 2026 production tools (Claude Code Web, Copilot Coding Agent, Jules, Codex Web) ([My LLM coding workflow going into 2026](https://addyosmani.com/blog/ai-coding-workflow/)); his skills framework "forces AI coding agents through phases of spec, plan, build, test, review and ship" ([svanews.com summary](https://svanews.com/2026/09/16/agent-skills-addyosmani/)) | n/a (workflow description)                                                                                                                                                                                                                                                                 | n/a                                                                                                               | Opinion: plan-then-approve is now the default shape of the _interaction_, whether or not the plan is saved as a file       |

**Synthesis, evidence-labelled:**

- **Evidence.** Every actively-maintained agent tool researched now inserts a
  plan-review step before code execution. This is convergent across Anthropic,
  OpenAI, Cursor, GitHub, AWS (Kiro), and Aider — different vendors, same shape.
  The "plan-then-approve" _interaction pattern_ is no longer in question.
- **Evidence.** Whether the plan is _saved as a durable file_ is inconsistent
  and mostly opt-in. Claude Code plan mode and Aider architect mode default to
  ephemeral (chat/session only). Cursor makes saving an explicit, optional step.
  Spec Kit, Kiro, and OpenAI's ExecPlans are the exceptions that make the plan a
  first-class, checked-in file by _design_ — and all three are for **larger
  units of work** (a whole feature/spec), not a single small task.
- **Evidence, direct quote.** OpenAI's own guidance names the size threshold: an
  ExecPlan is "required for multi-step or multi-file work, new features,
  refactors, or tasks expected to take more than about an hour"
  ([OpenAI Cookbook](https://developers.openai.com/cookbook/articles/codex_exec_plans)).
  Below that bar, the implication (not stated as a rule, but consistent with
  every other tool defaulting to ephemeral plans for small tasks) is that a plan
  is disposable.
- **Evidence.** "One agent plans, another executes" as a _separate-agent_
  pattern is real but is the exception, confined to architect/editor splits
  (Aider) and Devin's internal Planner/Coder/Critic decomposition — both cases
  where the split is about model cost/capability tiering, not about a human
  planner handing work to a different executing agent. Every mainstream
  single-agent tool (Claude Code, Cursor, Copilot, Codex) has converged on **the
  executing agent plans for itself, and a human reviews the plan** — which
  directly answers the investigation's open question: yes, that is now the
  dominant trend, not "one agent plans, another executes."
- **Opinion (Willison, Osmani).** Practitioner writing converges on treating the
  plan as one of several durable artifacts (brief, plan, checkpoint notes, test
  output) worth keeping _when the work is complex enough to need restarting
  from_, explicitly as a hedge against context loss and handoff failure — not as
  ceremony for its own sake.
- **Gap.** No source states a plan should be discarded once work is merged; the
  practical default across small-task tools (Claude Code, Cursor without the
  save step, Aider) is simply that it was _never_ written to disk, not that a
  written plan gets deleted afterward.

---

## 2. Discovery vs. delivery (dual-track agile)

**Question:** where is the boundary, what crosses it, and do delivery tools hold
raw ideas or only shaped/accepted work?

| System                                | Discovery-side artifact                                                                                                                                                                                                                                                                                                         | Boundary event                                                                                                                                                                                                                                                                                                          | Delivery-side artifact                                                                                                                                                            | Does delivery hold raw ideas?                                                                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dual-track agile (Cagan & Patton)** | Prototypes, experiments, validated opportunities — discovery is framed around resolving four risks (value, usability, feasibility, business viability) before a story is "ready" ([SVPG, Dual-Track Agile](https://www.svpg.com/dual-track-agile/); [LearningLoop glossary](https://learningloop.io/glossary/dual-track-agile)) | An item becomes "ready" only once those risks are addressed                                                                                                                                                                                                                                                             | A backlog story, sized and sequenced for a delivery sprint                                                                                                                        | **No** — a raw idea is explicitly not "ready"; readiness is the gate                                                                                                                                                                                            |
| **Shape Up (Basecamp)**               | The pitch — problem, appetite, solution sketch, rabbit holes, no-gos — produced by shaping ([Shape Up ch. 2, Principles of Shaping](https://basecamp.com/shapeup/1.1-chapter-02); [basecamp.com/shapeup/shape-up.pdf](https://basecamp.com/shapeup/shape-up.pdf))                                                               | The betting table: senior people choose which pitches get bet on for the next 6-week cycle                                                                                                                                                                                                                              | The same pitch, now "bet," handed to the team; no separate delivery-side document is created — Shape Up is the one system where the discovery artifact _is_ the delivery artifact | **No** — only bet pitches enter a cycle; unshaped ideas stay in the shaping backlog, never scheduled                                                                                                                                                            |
| **Productboard → Jira/Azure DevOps**  | Feature ideas, user insights, and evidence attached to a feature card in Productboard                                                                                                                                                                                                                                           | A feature is pushed from Productboard into Jira "as epics, stories, or subtasks" ([Productboard Jira integration](https://www.productboard.com/integrations/jira/); [support.productboard.com](https://support.productboard.com/hc/en-us/articles/11535151728275-Getting-started-with-Productboard-s-Jira-Integration)) | A Jira epic/story/subtask, two-way synced by webhook back to the Productboard feature's status                                                                                    | **No** — Jira receives the pushed feature, not the raw customer requests Productboard collected; Productboard is explicitly the layer that holds "every user who's requested a feature and exactly what they said" so Jira doesn't have to                      |
| **Linear**                            | Free-form issue creation, or integration-sourced issues                                                                                                                                                                                                                                                                         | Triage: "a holding inbox that catches everything incoming and keeps it out of the real backlog until a person decides it belongs there" ([Linear Triage docs](https://linear.app/docs/triage); [issuelinker.com guide](https://www.issuelinker.com/blog/linear-triage)) — accept, decline, duplicate, snooze, or route  | An accepted issue in the team's real backlog                                                                                                                                      | **No**, only transiently — an unreviewed item sits in Triage, a state, not in the backlog proper, until a human/rule accepts it                                                                                                                                 |
| **Plane**                             | Intake: "collect and triage external work requests" from stakeholders/clients/guests before they enter the workflow ([Plane Intake docs](https://docs.plane.so/core-concepts/intake))                                                                                                                                           | Clicking "Add to project" moves the item from Intake into Work Items under the chosen state                                                                                                                                                                                                                             | A work item with `type` (possibly `epic`) in the project's normal state machine                                                                                                   | **No** — Intake is a separate, pre-acceptance holding area; only accepted items become real work items, and Plane now tracks accept/decline rates as a metric on the gate itself ([Plane blog, Aug 2026](https://plane.so/blog/whats-new-in-plane-august-2026)) |

**Synthesis, evidence-labelled:**

- **Evidence, convergent across every system researched.** Delivery-side
  trackers do **not** hold raw ideas. Every tool — old (Jira via Productboard),
  new (Plane), SaaS-native (Linear) — puts a gate between capture and the
  delivery backlog: triage, intake, or "ready" criteria. The gate is implemented
  as a **state** (Linear's Triage status, Plane's Intake) or as a **separate
  tool that only hands over shaped work** (Productboard → Jira), never as the
  delivery entity itself holding an "unshaped" flag.
- **Evidence.** Shape Up is the interesting exception noted in the
  investigation's existing findings (the report on work-item hierarchy already
  covers this): the pitch is both the discovery output and the thing scheduled.
  But even Shape Up gates hard — un-bet pitches never enter a cycle. So even the
  tool that collapses discovery and delivery into one artifact still keeps the
  acceptance gate; it just doesn't require a second document to cross it.
- **Evidence.** What crosses the boundary is consistently a **decision plus a
  right-sized unit**, not raw material: an accepted Linear issue, a Plane work
  item, a Productboard feature pushed as a Jira epic/story, or a bet-on Shape Up
  pitch. The raw material (customer quotes, all the declined/duplicate intake
  items, discarded fragments) stays on the discovery side or in an audit trail,
  never becomes the delivery record.
- **Opinion, applied to project-docs' scope.** This directly answers the
  investigation's added scope question: idea capture (today's `fragments/`)
  behaves like an intake/triage state feeding a gate, matching Plane's Intake
  and Linear's Triage almost exactly — it is _not_ upstream tooling belonging
  outside the tree, because every researched system keeps that gate adjacent to
  (often inside) the same product, just state-fenced from the accepted backlog.
  The candidate taxonomy's "triage → backlog → ready → active → review → done"
  state list (see the investigation's Candidate taxonomy) already matches this
  shape; the gate is `triage`, not a folder or a document type.

---

## 3. Idiomatic work-item fields

**Question:** which fields are near-universal, which are required vs. optional,
how is estimate and priority represented, and which fields matter to an
executing agent versus only to a human/UI?

| Field                                        | Linear                                                                                                                                          | Plane                                                                                                                                                                            | GitHub Issues                                                                                                                                                                         | Jira                                                                                                                                                                                                                                                                              | Backlog.md                                                    | beads (`bd`)                                                                                                                 | Taskmaster                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **id**                                       | Required, auto (`ABC-123`)                                                                                                                      | Required, auto                                                                                                                                                                   | Required, auto (`#N`)                                                                                                                                                                 | Required, auto (`PROJ-123`)                                                                                                                                                                                                                                                       | Required, auto                                                | Required, auto                                                                                                               | Required, auto (numeric, incl. subtask `N.M`)                   |
| **title**                                    | Required                                                                                                                                        | Required                                                                                                                                                                         | Required                                                                                                                                                                              | Required                                                                                                                                                                                                                                                                          | Required                                                      | Required                                                                                                                     | Required                                                        |
| **state/status**                             | Required, per-team workflow, rolled into 6 fixed groups                                                                                         | Required, per-project states rolled into 5 fixed groups (backlog/unstarted/started/completed/cancelled) ([Plane states docs](https://docs.plane.so/core-concepts/issues/states)) | Required (open/closed only, natively)                                                                                                                                                 | Required, per-project workflow                                                                                                                                                                                                                                                    | Required (`To Do`/`In Progress`/`Done`, extensible)           | Required                                                                                                                     | Required (`pending`/`in-progress`/`done`/etc.)                  |
| **parent**                                   | Optional (sub-issues)                                                                                                                           | Required conceptually for sub-work-items; optional otherwise                                                                                                                     | Optional (sub-issues, GA)                                                                                                                                                             | Required for Sub-task type; optional link otherwise                                                                                                                                                                                                                               | Optional (`parentTaskId`)                                     | Optional, via dependency edges                                                                                               | Optional (`subtasks` array with parent)                         |
| **labels/tags**                              | Optional                                                                                                                                        | Optional                                                                                                                                                                         | Optional                                                                                                                                                                              | Optional                                                                                                                                                                                                                                                                          | Optional                                                      | Optional                                                                                                                     | Not a distinct field in the base schema                         |
| **priority**                                 | Optional, enum: No priority / Low / Medium / High / Urgent ([Linear Priority docs](https://linear.app/docs/priority))                           | Optional, enum (similar 5-level)                                                                                                                                                 | **Not native**; only via a custom "Priority" single-select field when Issue Fields are enabled ([GitHub org fields discussion](https://github.com/orgs/community/discussions/189141)) | Required, enum (Highest–Lowest, customizable)                                                                                                                                                                                                                                     | Optional, enum (low/medium/high)                              | Optional, numeric — "lower numbers = higher priority" ([beads JSON schema](https://beads.gascity.com/reference/json-schema)) | Optional, enum (`high`/`medium`/`low`)                          |
| **assignee**                                 | Optional, one person (agents added as a contributor, not the assignee — per the Plane/Macro report already filed)                               | Optional, one or more people                                                                                                                                                     | Optional, one or more people                                                                                                                                                          | Optional, one person                                                                                                                                                                                                                                                              | Optional, list (`assignees`)                                  | Optional                                                                                                                     | Not in the base schema (delegated to the calling agent/session) |
| **estimate**                                 | Optional, team opts in to a scale (linear points, Fibonacci, T-shirt, exponential) ([Linear Estimates docs](https://linear.app/docs/estimates)) | Optional (points-based)                                                                                                                                                          | **Not native**; custom number field only                                                                                                                                              | Optional, "Story Points" custom field; T-shirt size is a _manually added_ custom field with automation to derive points ([Atlassian community](https://community.atlassian.com/t5/Jira-Software-questions/how-to-create-t-shirt-size-field-for-estimation-in-Jira/qaq-p/1976665)) | Absent from the base schema                                   | Absent                                                                                                                       | Absent from the base schema                                     |
| **due date**                                 | Optional                                                                                                                                        | Optional                                                                                                                                                                         | Optional (custom field)                                                                                                                                                               | Optional                                                                                                                                                                                                                                                                          | Absent                                                        | Absent                                                                                                                       | Absent                                                          |
| **blocked-by / relations**                   | Optional (`blocks`/`blocked by`/`related`)                                                                                                      | Optional (Relations, per Plane report already filed)                                                                                                                             | Optional (`Blocked by` task list syntax, or Issue Dependencies)                                                                                                                       | Optional ("is blocked by" link type)                                                                                                                                                                                                                                              | Optional (`dependencies`)                                     | **Central**: dependency edges are the top-level mechanism (`bd ready` queries them), not an afterthought                     | **Central**: `dependencies` array is core to task selection     |
| **cycle/iteration**                          | Optional (Cycle membership field)                                                                                                               | Optional (Cycle)                                                                                                                                                                 | Optional (custom Iteration field in Projects)                                                                                                                                         | Optional (Sprint field, Scrum templates only)                                                                                                                                                                                                                                     | Absent                                                        | Absent                                                                                                                       | Absent                                                          |
| **milestone**                                | Optional (Project, not literally "milestone")                                                                                                   | Optional (Module/Cycle serve this role)                                                                                                                                          | Optional (Milestone)                                                                                                                                                                  | Optional (Fix Version/Release)                                                                                                                                                                                                                                                    | Optional (`milestone`)                                        | Absent                                                                                                                       | Absent                                                          |
| **acceptance criteria / definition of done** | Free text in description, not a distinct field                                                                                                  | Free text in description                                                                                                                                                         | Free text in description                                                                                                                                                              | Free text, or a custom field                                                                                                                                                                                                                                                      | **Distinct fields**: `acceptanceCriteria`, `definitionOfDone` | **Distinct field**, part of the issue body-text slots (description/design/acceptance_criteria/notes)                         | Not a distinct field — folded into `details`/`testStrategy`     |

**How estimate is represented, evidence-labelled:**

- **Points (Fibonacci-like)** dominate Jira ("most teams use the Fibonacci
  sequence... especially in Jira" —
  [Easy Agile](https://www.easyagile.com/blog/agile-estimation-techniques)) and
  are Linear's default scale option.
- **T-shirt sizing** is explicitly a bolt-on everywhere it appears: Jira has no
  native T-shirt field type — teams build a custom single-select and automate a
  mapping to story points
  ([Atlassian community](https://community.atlassian.com/t5/Jira-Software-questions/how-to-create-t-shirt-size-field-for-estimation-in-Jira/qaq-p/1976665)).
  Linear offers it as one of several selectable scales, not a default.
- **None** is the agent-native default: Backlog.md, beads, and Taskmaster ship
  with **no estimate field at all** in their base schemas. None of the three
  agent-native tools researched here or in the companion agent-native-systems
  report added one.

**How priority is represented, evidence-labelled:**

- **5-level enum** (Linear, Plane) and **customizable enum, typically
  Highest–Lowest** (Jira) are the human-tool norm.
- **GitHub has no native priority field** at all outside its 2026 opt-in
  organization-level Issue Fields feature, which defaults to a 4-level enum
  (Urgent/High/Medium/Low) when turned on — priority is retrofitted, not
  foundational to the Issue entity.
- **beads inverts the convention**: priority is a small integer where _lower
  number means higher priority_ — closer to a Unix `nice` value than a human
  label, plausibly because it's read by `bd` tooling and sort logic rather than
  displayed as a badge to a human.
- Backlog.md and Taskmaster both use a simple 3-level enum
  (`high`/`medium`/`low`).

**Which fields matter to an executing agent vs. only to a human/UI,
evidence-labelled:**

- **Matters to the executing agent (present as a first-class, often
  machine-checked field in every agent-native tool):** `id`, `status`
  (machine-written back), `dependencies`/`blocked_by` (the field an agent
  actually queries — `bd ready`, Taskmaster's dependency graph, Spec Kit's `[P]`
  parallel marker — to decide "what can I start now" without reading a board,
  per the companion agent-native-systems report), and
  `acceptance_criteria`/`definition_of_done` (Backlog.md and beads both give
  these their own field, distinct from free-text description, specifically so an
  agent has a checkable target).
- **Present but mostly human/UI-facing:** `priority` (every agent-native tool
  carries it, but none of the researched agent workflows shows an agent
  _reading_ priority to decide anything — it orders a human's view), `labels`
  (search/filter convenience), `estimate` (entirely absent from agent-native
  tools — see above; this is the strongest single signal that estimate is a
  human-planning artifact, not something an executing agent consumes),
  `cycle`/`milestone`/`due date` (absent from every agent-native tool's base
  schema; these are cadence and reporting fields, consistent with the companion
  cadence report's finding that cycle membership is a field/view, not something
  an agent needs to plan its own work).
- **assignee**, where it appears in agent-native tools, is often just absent
  from the base schema (Taskmaster) — the calling agent/session is implicit, not
  modeled as a field — reinforcing that assignment is a human/orchestration
  concern layered on top, not core to the work-item entity itself.

---

## Implications for the candidate taxonomy

Tied to the investigation's settled decisions (one work-item entity, features as
parents, proposal-is-the-feature) and its still-open decisions:

1. **Decision #3 (plan: durable document or scratch) — the evidence supports a
   size-gated answer, not a single rule.** Every tool that makes the plan a
   durable, checked-in file (Spec Kit, Kiro, OpenAI's ExecPlans) does so for a
   **feature-sized** unit of work — exactly project-docs' candidate `Feature`
   entity, not its small `Work item`. Every tool that defaults to an ephemeral,
   session-only plan (Claude Code plan mode, Aider, Cursor without the explicit
   save) does so for a task-sized unit. Recommendation: a plan is a **document
   attached to the feature** when the feature is big enough to need restarting
   from (OpenAI's own bar: "multi-step or multi-file work... expected to take
   more than about an hour"), and pure agent scratch — never written down — for
   a single work item. This resolves the open question as "durable at the
   feature level, scratch at the work-item level," which also answers "is one
   agent planning and another executing still common": no — the dominant pattern
   is the executing agent plans for itself and a human reviews before it
   proceeds, matching the manifesto's "human in the loop for product decisions"
   framing.
2. **Fragments/triage stays inside the tree, one state on the work-item entity,
   not a separate type or an upstream tool.** Every discovery/delivery system
   researched keeps the intake gate adjacent to the delivery entity (Linear's
   Triage status, Plane's Intake screen) rather than shipping it to a wholly
   separate product before work items exist — Productboard→Jira is the only case
   with a genuinely separate tool, and that's because Productboard aggregates
   _customer_ signal across many features, a workspace-level concern the
   investigation already scoped out. For one project's own idea capture,
   `triage` as a state in the candidate taxonomy's state list is already the
   idiomatic shape; no separate `fragments/` entity is needed.
3. **Fields to bring in now (decision #5), evidence-ranked:** `id`, `state`,
   `parent`, `blocked_by`/dependencies, and `acceptance_criteria` are
   near-universal _and_ agent-consumed — bring all five in as foundational,
   matching the manifesto's own emphasis on scope and state. `priority` is
   near-universal among human tools but not agent-consumed anywhere researched;
   include it as optional (a single enum, Linear/Plane-style, not beads'
   inverted integer, since project-docs' primary reader is often a human
   skimming files) but do not build agent logic on it.
4. **`estimate` is the clearest field to leave out, on the evidence, not just
   the manifesto's prior wording.** No agent-native tool researched has one at
   all. It is a human-forecasting artifact (points/T-shirt) invented for
   capacity planning across a team — a job the cadence report already found
   "disappear[s] for a solo developer." This corroborates, rather than merely
   restates, the manifesto's "not people or dates" line: the field is also
   absent from every tool built for agents to read, independent of the
   solo-developer argument.
5. **`cycle`/`assignee` are confirmed as optional, low-priority fields, not
   foundational ones.** Every agent-native tool either omits them (Taskmaster
   has no assignee field at all) or treats them as orchestration metadata
   layered on top by the calling session rather than the work item's own schema
   — consistent with the investigation's decision #4 to leave cycle membership
   open and not force it as a core field on every work item.

---

## Sources Consulted

**Plans as artifacts**

1. [Claude Code plan mode: what it actually blocks](https://dev.to/rulestack/claude-code-plan-mode-what-it-actually-blocks-what-still-runs-and-what-approving-switches-you-22m3)
   — dev.to, 2026
2. [Claude Code Plan Mode: The Complete Guide (2026)](https://www.vibecodingacademy.ai/blog/claude-code-plan-mode-complete-guide)
3. [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
   — official Anthropic docs
4. [Cursor Plan Mode docs](https://cursor.com/docs/agent/plan-mode) — official
5. [Introducing Plan Mode](https://cursor.com/blog/plan-mode) — official Cursor
   blog
6. [Cursor Plan Mode: Review a Plan Before the Agent Codes](https://www.learncursor.dev/learn/cursor-agents/agent-plan-mode)
7. [Using PLANS.md for multi-hour problem solving](https://developers.openai.com/cookbook/articles/codex_exec_plans)
   — official OpenAI Cookbook
8. [ExecPlans – How to get your coding agent to run for hours](https://kau.sh/blog/exec-plans/)
9. [spec-kit/spec-driven.md](https://github.com/github/spec-kit/blob/main/spec-driven.md)
   — official GitHub repo
10. [Get Started with Spec-Driven Development and GitHub Spec Kit](https://learn.microsoft.com/en-us/training/modules/spec-driven-development-github-spec-kit-greenfield-intro/)
    — Microsoft Learn
11. [Kiro Specs docs](https://kiro.dev/docs/specs/) — official
12. [Reviewing a pull request created by GitHub Copilot](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/reviewing-a-pull-request-created-by-copilot)
    — official GitHub Docs
13. [Aider's architect mode: when the slower, more expensive workflow is worth it](https://tinker-ai.com/guides/aider-architect-mode-when-to-use/)
14. [Aider chat modes](https://aider.chat/docs/usage/modes.html) — official
15. [Devin AI Review 2026](https://hostadvice.com/ai-app-builders/devin-ai-review/)
16. [Devin, the AI Engineer: Review, Testing & Limitations in 2026](https://www.idlen.io/blog/devin-ai-engineer-review-limits-2026/)
17. [My LLM codegen workflow atm](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)
    — Harper Reed, primary source
18. [My LLM codegen workflow atm (linkblog)](https://simonwillison.net/2025/Feb/21/my-llm-codegen-workflow-atm/)
    — Simon Willison
19. [Agentic Engineering Patterns](https://simonw.substack.com/p/agentic-engineering-patterns)
    — Simon Willison
20. [My LLM coding workflow going into 2026](https://addyosmani.com/blog/ai-coding-workflow/)
    — Addy Osmani, primary source
21. [Agent Skills: Addy Osmani's Senior-Engineer Playbook](https://svanews.com/2026/09/16/agent-skills-addyosmani/)

**Discovery vs. delivery**

22. [Dual-Track Agile — Silicon Valley Product Group](https://www.svpg.com/dual-track-agile/)
    — Marty Cagan, primary source
23. [Dual Track Agile — learningloop.io glossary](https://learningloop.io/glossary/dual-track-agile)
24. [What is Dual-Track Agile? — Productboard](https://www.productboard.com/glossary/dual-track-agile/)
25. [Principles of Shaping — Shape Up ch. 2](https://basecamp.com/shapeup/1.1-chapter-02)
    — Ryan Singer, primary source
26. [Shape Up (full PDF)](https://basecamp.com/shapeup/shape-up.pdf) — Basecamp,
    primary source
27. [Productboard Jira integration](https://www.productboard.com/integrations/jira/)
    — official
28. [Getting started with Productboard's Jira Integration](https://support.productboard.com/hc/en-us/articles/11535151728275-Getting-started-with-Productboard-s-Jira-Integration)
    — official
29. [Linear Triage docs](https://linear.app/docs/triage) — official, primary
    source
30. [Linear Triage: A Practical Guide](https://www.issuelinker.com/blog/linear-triage)
31. [Plane Intake docs](https://docs.plane.so/core-concepts/intake) — official,
    primary source
32. [What's new in Plane: August 2026](https://plane.so/blog/whats-new-in-plane-august-2026)
    — official

**Idiomatic work-item fields**

33. [Backlog.md CLI-INSTRUCTIONS.md](https://github.com/MrLesk/Backlog.md/blob/main/CLI-INSTRUCTIONS.md)
    — official repo, primary source
34. [Backlog.md — The Atlas](https://yigitkonur.com/atlas/spec-driven-development/frameworks/backlog-md)
35. [JSON Output Schema Contract — Beads Documentation](https://beads.gascity.com/reference/json-schema)
    — official, primary source
36. [Introducing Beads: A coding agent memory system](https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a)
    — Steve Yegge, primary source
37. [Task Structure — Task Master](https://docs.task-master.dev/capabilities/task-structure)
    — official, primary source
38. [Linear Priority docs](https://linear.app/docs/priority) — official, primary
    source
39. [Linear Estimates docs](https://linear.app/docs/estimates) — official,
    primary source
40. [Agile Estimation Techniques: A Deep Dive Into T-Shirt Sizing](https://www.easyagile.com/blog/agile-estimation-techniques)
    — Easy Agile
41. [How to create a T-shirt size field for estimation in Jira](https://community.atlassian.com/t5/Jira-Software-questions/how-to-create-t-shirt-size-field-for-estimation-in-Jira/qaq-p/1976665)
    — Atlassian Community
42. [Plane Work Item States docs](https://docs.plane.so/core-concepts/issues/states)
    — official
43. [Issue fields: Structured issue metadata](https://github.com/orgs/community/discussions/189141)
    — GitHub product discussion, on the 2026 opt-in Priority field

---

## Open Gaps

- **No primary-source data on how often saved plans (Cursor's `.cursor/plans/`,
  Codex's ExecPlans) are actually kept and reread weeks later** versus written
  once and ignored — the tools support persistence, but no source measures
  whether people use it that way in practice. This bears directly on whether
  project-docs should expect its own feature-level plans to be reread.
- **Copilot coding agent's plan-in-PR-description pattern was not confirmed
  against a live example** — the docs describe the capability but this report
  did not verify what a real PR description looks like when Copilot is asked to
  plan first.
- **GitHub's 2026 opt-in Issue Fields (Priority, custom fields) is very recent**
  and this report could not confirm adoption depth or whether it has changed
  default behavior for new repositories.
- **No source directly compares agent read-consumption of `priority` across
  tools** — the claim that priority is human/UI-facing rather than
  agent-consumed is an inference from the absence of any researched example of
  an agent branching logic on priority, not a direct statement from any source.
- **Macro** (named in the investigation's parallel Plane-and-Macro report) was
  not re-researched here since that report already covers its field model
  directly; this report's field table is Linear/Plane/GitHub/Jira/Backlog.md/
  beads/Taskmaster only, per the question's own scope.
