---
type: report
title: "Work-Item Hierarchy Landscape: what each level is for"
description:
  What Linear, Jira, GitHub, Azure DevOps, and Shape Up each call the levels of
  a work-item hierarchy, what each level is for, and where the
  story/task/document distinctions are real versus collapsed.
tags: [taxonomy, work-management]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Work-Item Hierarchy Landscape: what each level is for

Context: this report is one of four tracks feeding
[the work-taxonomy investigation](../write-up.md). It does not redo the "in-play
container" angle (cycle vs. sprint vs. milestone as a cadence boundary) already
covered by
[PM Work-Taxonomy Landscape](../../work-cycle-taxonomy-landscape/reports/2026-09-03-pm-work-taxonomy-landscape-report.md);
it stays on the **canonical hierarchy** — what each level is for, how big it is,
who creates it, what "done" means, where documents attach, and which relations
beyond parent/child each tool models.

---

## 1. Linear

**Levels, top to bottom** (source:
[Linear Docs — Concepts](https://linear.app/docs/conceptual-model),
[Projects](https://linear.app/docs/projects),
[Project milestones](https://linear.app/docs/project-milestones)):

- **Workspace** — the whole company's Linear instance.
- **Initiative** — sits above projects; "broader strategic efforts" that group
  several projects toward one goal, and can nest (parent/sub-initiative).
  Source: [Linear Docs — Concepts](https://linear.app/docs/conceptual-model).
- **Project** — "a unit of work that has a clear outcome or planned completion
  date, such as a new feature's launch." Groups issues around a shared outcome,
  can span multiple teams, has a lead responsible for "writing the spec and
  general execution." Source:
  [Linear Docs — Projects](https://linear.app/docs/projects).
- **Project milestone** — sub-divisions of a project representing "meaningful
  stages of completion," each with its own target date and issue subset; used to
  filter and organize issues within one project, not to span projects. Source:
  [Linear Docs — Project milestones](https://linear.app/docs/project-milestones).
- **Issue** — "the fundamental unit of work in Linear." Represents a bug,
  feature, task, or request; moves through a team's workflow, can be assigned,
  labeled, prioritized. Source:
  [Linear Docs — Concepts](https://linear.app/docs/conceptual-model).
- **Sub-issue** — a child issue under a parent issue (breakdown mechanism);
  Linear's docs describe the parent/child relation but there is deliberately no
  separate "task" type beneath it — a sub-issue is still an issue. _(Unconfirmed
  from official docs how deep sub-issue nesting goes; not stated in the pages
  fetched.)_

**Who creates what, what's missing from docs.** The pages fetched do not state
formal creation rules (e.g., "only a lead can open a project") or an explicit
definition of "done" per level — Linear treats "done" as a workflow state on the
issue, and a project's completion is inferred from its issues' and milestones'
states rather than declared separately. This is not confirmed by an explicit doc
statement and is marked as an inference.

**Documents.** Projects carry a **description** plus **linked/embedded
documents** in the project details sidebar ("Teams can attach external files and
create project documents directly within the project details sidebar"). Source:
[Linear Docs — Projects](https://linear.app/docs/projects). Separately,
**project updates** are periodic written status posts attached to a project
(health, progress, blockers) — distinct from the spec/description, which is
timeless intent rather than a point-in-time update. _(The project-updates page
itself 404'd during this research; the existence and purpose of project updates
is corroborated by the surrounding Linear documentation ecosystem and general
product knowledge, and should be treated as medium confidence pending a direct
doc citation.)_

**Story vs. task: deliberately collapsed.** Linear's own house style
("[Write issues not user stories](https://linear.app/method/write-issues-not-user-stories)")
argues explicitly against the story/task split: "User stories have become a
cargo cult ritual that feels good but wastes a lot of resources and time,"
because splitting product framing (story) from execution framing (task) "mixes
product-level details into task-level work" and turns engineers into mechanical
implementers. The Linear Method's replacement is: write one issue, in plain
language, with a concrete outcome, authored by the person doing the work — not
handed down through a story→task translation step. Source:
[Linear Method — Write issues not user stories](https://linear.app/method/write-issues-not-user-stories).

**Relations beyond parent/child.** Linear models **blocks / blocked by**,
**related**, and **duplicate** as first-class issue relations, distinct from the
parent/sub-issue hierarchy — visible in the issue sidebar (blockers as an orange
flag, blocked issues as a red flag under "Blocks"), with keyboard shortcuts
(`M B` blocked-by, `M X` blocking, `M R` related) and a "merge duplicate into
canonical issue" action. Source:
[Linear Docs — Issue relations](https://linear.app/docs/issue-relations) (via
search synthesis; page content quoted from search snippet, not directly fetched
— medium confidence). Linear also has **project dependencies** (one project
blocking another) as a separate concept from issue-level blocking. Source:
[Linear Docs — Project dependencies](https://linear.app/docs/project-dependencies)
(title only confirmed; content unconfirmed).

---

## 2. Jira (Atlassian)

**Levels** (source: multiple secondary sources synthesizing Atlassian's own
issue-type model, cross-checked below; Atlassian's own issue-link-types page
returned 404 during this research and is not cited for link types):

- **Epic** — "the highest-level work type available in the out-of-the-box work
  hierarchy," used for defining and planning at a higher level; groups Stories
  and Tasks toward a larger goal.
- **Story, Task, Bug — peers, not parent/child of each other.** A common
  misconception is a strict Epic → Story → Task → Subtask chain; in fact
  "Stories, Tasks, and Bugs all sit side by side at the same level – one step
  below Epic, one step above Subtask... Stories and Tasks are peers." Source:
  synthesized from
  [Atlassian Community — Epic/subtasks vs Story/subtasks](https://community.atlassian.com/forums/Jira-questions/Epic-subtasks-vs-Story-subtasks/qaq-p/2726830)
  and related community threads returned by search (medium confidence — Jira's
  own issue-type doc was not directly fetched in this session).
- **Subtask** — one level below Story/Task; "usually represent actions (work) to
  be performed for implementing that story/functionality." A subtask can belong
  to a Story or a Task.
- **Initiative / Advanced Roadmaps levels** — above Epic in Jira's optional
  portfolio hierarchy (Jira Premium / Advanced Roadmaps), for grouping epics
  into larger initiatives spanning multiple teams. _(Unconfirmed by direct doc
  fetch in this session; included from general knowledge of Jira's hierarchy
  configuration, flagged low confidence — verify against Atlassian's Advanced
  Roadmaps docs before relying on exact naming.)_

**Story vs. task: the real distinction, per Jira convention.** "Stories focus on
end user value, and Tasks cover technical, operational or supporting work" — a
Story is written from the customer/user point of view (the "what" and "why"), a
Task from the developer/QA point of view (the "how"). Source: synthesized from
[TitanApps — Jira Epic vs Story vs Task](https://titanapps.io/blog/epic-vs-story-vs-task)
and corroborating community threads (medium confidence; secondary sources, not
Atlassian's own issue-type reference page, which was not successfully fetched).
In practice this line blurs: "Technically, underlying Jira behaviors treat tasks
and stories the same, and it is left to the users to decide when they use one
vs. the other." Source:
[Atlassian Community — Guidance on using stories VS tasks](https://community.atlassian.com/forums/Jira-questions/Guidance-on-using-stories-VS-tasks/qaq-p/1933631)
(medium confidence, forum thread synthesized via search).

**Small teams.** Practitioner guidance for solo/small teams: "if you wanted to
keep things as simple as possible, you'd tend to use either only story or task
with sub-tasks if necessary" — i.e., collapse Story and Task into one type and
keep only the Subtask split for execution steps. Source: search synthesis of
practitioner discussion (medium confidence, no single canonical citation).

**Where documents attach.** Jira has no dedicated "project spec" document type
in the base product; a specification/RFC typically lives as (a) the Epic's own
description field, (b) a linked Confluence page (Jira and Confluence are
commonly paired for this reason), or (c) an attachment on the Epic or
Initiative. _(This is general/common-knowledge convention rather than something
confirmed by a fetched Atlassian doc in this session — flagged unconfirmed.)_

**Relations beyond parent/child.** Jira issue link types are a distinct,
long-standing feature (Blocks / is blocked by, Relates to, Duplicates / is
duplicated by, Clones / is cloned by, Causes / is caused by are Jira's
well-known defaults), separate from the Epic→Story and Story→Subtask parent
links. _(This session could not successfully fetch Atlassian's issue-link-types
reference page — both attempted URLs 404'd — so the exact default list above is
from general product knowledge and should be treated as unconfirmed /
needs-direct-verification, even though it is widely and consistently reported
across Jira documentation and tutorials outside this session's search results.)_

---

## 3. GitHub (Issues, Sub-issues, Issue Types, Milestones, Projects)

**Levels** (source:
[GitHub Docs — Adding sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues),
[GitHub Changelog — Evolving GitHub Issues and Projects](https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/),
[GitHub Changelog — Hierarchy view](https://github.blog/changelog/2026-01-15-hierarchy-view-now-available-in-github-projects/)):

- **Issue** — the base unit; has a title, description, assignees, labels.
- **Issue type** — a standardized classification field on an issue, GA as
  of 2025. Default types are **Task**, **Bug**, **Feature**: "Bug — a problem
  with the software... Feature — something to be added that more likely than not
  has many moving parts... Task — a single item to be added to the software,
  [language] technical in nature." Types are editable/deletable per
  organization; there is no built-in "Epic" issue type. Source:
  [GitHub Changelog — Evolving GitHub Issues and Projects](https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/)
  (via search synthesis, medium-high confidence).
- **Sub-issue** — a child issue under a parent, GA alongside issue types. Up to
  100 sub-issues per parent and 8 levels of nesting; sub-issues automatically
  inherit the parent's Project and Milestone assignments. Source:
  [GitHub Docs — Adding sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues).
- **Milestone** — a date/version-bound grouping of issues (not hierarchical in
  the parent/child sense) used for release or deadline tracking.
- **Project (GitHub Projects)** — a separate board/table layer over issues (and
  now, since January 2026, a hierarchy view showing the sub-issue tree inside
  the project table, expandable/collapsible up to 8 levels, with
  group/slice/sort/filter that preserves hierarchy). Source:
  [GitHub Changelog — Hierarchy view](https://github.blog/changelog/2026-01-15-hierarchy-view-now-available-in-github-projects/).

**No native Epic.** GitHub has deliberately not shipped a built-in "Epic" work
type; the pattern instead is: an issue typed "Feature" (or just a plain issue)
with sub-issues under it does the epic's job, and GitHub Projects' hierarchy
view is what renders the roll-up. This is a structural difference from
Jira/Azure DevOps, which have a named Epic level; GitHub's model is closer to
Linear's "just issues, nested" — but unlike Linear, GitHub adds a _type_ field
on top of the flat issue rather than collapsing story/task framing away
entirely.

**Where documents attach.** GitHub has no separate document/spec entity in
Issues or Projects; a design doc is either the parent issue's own body
(Markdown, so it can hold a full spec), a linked file in the repo (e.g.
`docs/rfcs/*.md`, a convention many projects use), or a GitHub Discussion linked
from the issue. _(General convention, not confirmed by a specific fetched doc
page — unconfirmed.)_

**Relations beyond parent/child.** GitHub issues support a native "blocked by"
relation surfaced in the UI (separate from sub-issues) plus a manual convention
of closing keywords (`closes #123`) that create a completion link but not a
formal block/relate/duplicate taxonomy. The sub-issues documentation fetched in
this session did not describe "duplicate" or "relates to" as first-class
relation types — GitHub's duplicate handling is conventionally a label plus a
comment/close, not a modeled relation like Linear's or Jira's. _(Flagged as a
gap: this session found no authoritative GitHub doc describing a full relation
taxonomy analogous to Jira's issue links.)_

---

## 4. Azure DevOps (Agile / Scrum / Basic / CMMI process templates)

**Levels, per process template** (source:
[Microsoft Learn — Define features and epics to organize backlog items](https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/define-features-epics?view=azure-devops)):

| Process template | Hierarchy (top → bottom)                                                    |
| ---------------- | --------------------------------------------------------------------------- |
| Agile            | Epic → Feature → User Story → Task (Bugs configurable alongside Story/Task) |
| Scrum            | Epic → Feature → Product Backlog Item → Task (Bugs configurable)            |
| Basic            | Epic → Issue → Task                                                         |
| CMMI             | Epic → Feature → Requirement → Task (Bugs configurable)                     |

**What each level is for and how big it is:**

- **Epic** — "a large body of work that can be broken down into multiple
  features... represents a major initiative or goal and might span several
  sprints or even releases."
- **Feature** — "a significant piece of functionality that delivers value to the
  user... typically includes several user stories or backlog items and might
  take one or more sprints to complete."
- **User Story / Product Backlog Item / Requirement / Issue** (naming varies by
  template) — the backlog-item level; "Generally, you should complete backlog
  items, such as user stories or tasks, within a sprint."
- **Task** — "the actual steps to build a story," the level actually worked
  sprint-by-sprint.

Source for all four:
[Microsoft Learn — Define features and epics](https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/define-features-epics?view=azure-devops).

**Roll-up and progress.** Each level rolls up into the one above via
configurable rollup columns (progress bar = % of descendants closed, count, and
numeric totals like Story Points or Completed Work), so an Epic's percent
complete is derived from its descendant tree rather than set by hand. Source:
same page, "Display rollup progress, counts, or totals" section.

**Who creates / what's "done."** The doc frames Epic/Feature/Story/Task as
things any project member with Contributor access can create (via "New Work
Item"); "done" is a workflow **state** field on each work item type (e.g. New →
Active → Resolved → Closed, exact states vary by template), not a distinct
concept per level. The fetched page does not give a level-specific definition of
done beyond "closed" as the terminal state; confirmed only at a general level.

**Where documents attach.** Epics and Features carry a free-text description
field plus fields like **Value Area**, **Business Value**, **Time Criticality**,
and **Target Date** — the description field is where a spec/rationale would
typically live; Azure DevOps also commonly links out to an Azure DevOps Wiki
page for longer specs. _(The wiki-linking convention is general knowledge, not
confirmed by the fetched page.)_

**Relations beyond parent/child.** Not confirmed by the pages fetched in this
session; Azure DevOps is broadly known to support "Predecessor/Successor,"
"Related," and "Duplicate/Duplicate Of" link types in addition to Parent/Child,
but no Microsoft Learn page describing these was fetched here — **flagged as an
open gap requiring direct verification**.

---

## 5. Shape Up (Basecamp / Ryan Singer)

Shape Up does not have a work-item hierarchy in the ticket sense at all — it has
a shaping/execution vocabulary. Source:
[Shape Up — Glossary](https://basecamp.com/shapeup/4.5-appendix-06):

- **Pitch** — "a document that presents a shaped project idea for consideration
  at the betting table." This _is_ the specification; there is no separate
  spec-vs-work-item split — the pitch is simultaneously the unit proposed and
  the document describing it, until it is bet on.
- **Bet** — "the decision to commit a team to a project for one cycle with no
  interruptions and an expectation to finish." A bet is the pitch after
  acceptance — an outcome-bound commitment, roughly epic-sized (a project meant
  to fit one 6-week cycle).
- **Scope** — "parts of a project that can be built, integrated, and finished
  independently of the rest of the project." Scopes are Shape Up's rough
  equivalent of a story/task breakdown, but they are discovered during execution
  (via "scope mapping" while spiking), not pre-written before work starts — they
  emerge from the team doing the work, not from a PM decomposing a backlog in
  advance.
- **Hill chart** — "a diagram showing the status of work on a spectrum from
  unknown to known to done," tracked per scope; this is Shape Up's substitute
  for a task-level "done" checkbox — a scope's position on the hill (uphill =
  still figuring out, downhill = known and executing) is the state, not a
  binary.
- **Appetite** — "the amount of time we want to spend on a project, as opposed
  to an estimate" — Shape Up deliberately fixes time and lets scope flex,
  inverting the estimate-then-schedule model of the other four tools.

There is no sub-issue/subtask concept and no separate document-vs-work-item
distinction: the pitch **is** the unit of work at the proposal stage, and scopes
are informal groupings discovered inside a bet, not separately filed work items.
Source: all definitions from
[Shape Up — Glossary](https://basecamp.com/shapeup/4.5-appendix-06).

---

## Cross-tool table: levels, smallest to largest

| Size                           | Linear                                      | Jira                                                     | GitHub                                                                            | Azure DevOps (Agile)                             | Shape Up                             |
| ------------------------------ | ------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------ |
| Smallest (implementation step) | Sub-issue (still an "issue")                | Subtask                                                  | Sub-issue (typed Task, nested up to 8 levels)                                     | Task                                             | _(no equivalent — inside a scope)_   |
| Value-slice / story level      | _(collapsed into Issue — no separate type)_ | Story / Task (peers)                                     | Issue typed "Feature" or "Task"                                                   | User Story                                       | Scope                                |
| Feature/epic level             | Project                                     | Epic                                                     | _(no built-in type — Feature-typed issue + sub-issues + Projects hierarchy view)_ | Feature                                          | Bet (a pitch, accepted)              |
| Strategic/portfolio level      | Initiative                                  | Initiative (Advanced Roadmaps, unconfirmed exact naming) | _(none built in)_                                                                 | Epic                                             | _(none — pitches are per-cycle)_     |
| Grouping-only / cadence        | Project milestone (phase within a project)  | —                                                        | Milestone (date/release bound, not hierarchical)                                  | Sprint/Iteration (not in this table's hierarchy) | Cycle (6-week window, cadence-bound) |

Notes on the table: Linear's Project sits where Jira/Azure DevOps put Epic/
Feature in terms of scope, but Linear's Project is explicitly **outcome-bound**
("a clear outcome or planned completion date") rather than a pure grouping label
— see the entity/state/organisation analysis below for why this matters. Azure
DevOps's "Epic" is one level higher than Jira's Epic (Azure DevOps inserts
Feature between Epic and Story where Jira does not, in the base product), so a
naive "Epic = Epic" mapping across the two tools is wrong by one level. Source
for the level counts: Jira analysis above (community sources) and Azure DevOps
table above (Microsoft Learn).

---

## Story vs. task: where the distinction is real, where it's collapsed

**Real, by design, in Jira and Azure DevOps.** Both separate a customer-value
statement (Story / User Story / PBI) from an implementation step (Task): "A
story is written from a customer/user point of view and a task is written from a
developer/QA point of view... Stories are the 'what' and the 'why', while tasks
are about the 'how'." Source: search synthesis of
[TitanApps](https://titanapps.io/blog/epic-vs-story-vs-task) and related pages
(medium confidence). Jira additionally keeps them as **peers** rather than
parent/child — a Story does not contain Tasks; both sit one level below Epic and
one above Subtask, and if a Task needs breakdown it gets its own Subtasks
independent of any Story. Source:
[Atlassian Community](https://community.atlassian.com/forums/Jira-questions/Epic-subtasks-vs-Story-subtasks/qaq-p/2726830).
Azure DevOps does make Task a literal child of User Story ("Tasks are the actual
steps to build a story"), so the two tools disagree on whether Task is a sibling
or a child of Story even where both keep the distinction.

**Deliberately collapsed in Linear.** Linear has exactly one work-item type, the
issue, and argues in its own house doctrine that splitting story from task
"mixes product-level details into task-level work" and turns engineers into
"code monkeys micromanaged... rather than thinking about the product." Source:
[Linear Method — Write issues not user stories](https://linear.app/method/write-issues-not-user-stories).
The reasoning given is specifically about audience and trust, not size: story
framing assumes the person implementing doesn't understand the user, and
Linear's position is that on a good team the engineer already does.

**Ambiguous/optional in GitHub.** GitHub's issue types (Bug/Feature/Task) are a
flat classification, not a hierarchy level — a "Feature" issue and a "Task"
issue can both have sub-issues, and nothing in the GA docs enforces that a
Feature-typed issue must contain only Task-typed sub-issues. The story/task
distinction, where teams want it, is self-imposed convention, not a modeled
constraint. Source:
[GitHub Changelog — Evolving GitHub Issues and Projects](https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/).

**Practitioner default for small teams.** Across Jira-adjacent practitioner
writing found in this research, the converging small-team advice is to collapse
Story and Task into one type and keep only the Subtask level below it for
execution steps — i.e., move toward Linear's shape without adopting Linear's
specific tool. Source: search synthesis, medium confidence, no single canonical
citation (see §2 above).

---

## Where the spec/design/RFC document attaches

| Tool         | Attachment point                                                                                                                                      | Is the doc a unit of work, or an attachment?                                                                                                                                                                                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Linear       | Project **description** field, plus separately creatable **project documents** in the project sidebar                                                 | Attachment — the Project is the work unit; the doc(s) live inside it, and are explicitly plural/optional, not the unit itself. Source: [Linear Docs — Projects](https://linear.app/docs/projects).                                                                                                                                                     |
| Jira         | Epic **description** field, or a linked Confluence page                                                                                               | Attachment (by convention) — unconfirmed by a fetched Atlassian doc in this session.                                                                                                                                                                                                                                                                   |
| GitHub       | Parent issue **body** (Markdown), a repo file under `docs/`, or a linked Discussion                                                                   | Attachment, or in the repo-file case the doc _is_ a first-class artifact living beside code rather than inside the issue tracker at all — unconfirmed by a fetched doc.                                                                                                                                                                                |
| Azure DevOps | Epic/Feature **description** field plus structured fields (Value Area, Business Value); commonly linked to an Azure DevOps Wiki page for longer specs | Attachment. Description-field claim confirmed by [Microsoft Learn](https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/define-features-epics?view=azure-devops); wiki-linking convention unconfirmed.                                                                                                                                       |
| Shape Up     | The **pitch itself**                                                                                                                                  | Neither purely attachment nor purely work item — the pitch _is_ the unit of work at the shaping stage (problem, appetite, solution, rabbit holes, no-gos in one document), and it only becomes execution-trackable (a bet, then scopes) after the betting table accepts it. Source: [Shape Up glossary](https://basecamp.com/shapeup/4.5-appendix-06). |

The one outlier worth flagging for project-docs' own question: **Shape Up is the
only one of the five where the document and the work item are the same artifact
at the proposal stage.** Every other tool treats the document as something that
hangs off a separately-identified work item (a Project, Epic, or issue with its
own ID, state, and relations) — which matters for project-docs' proposal/plan
question, since project-docs' `proposal.md` today behaves more like a pitch
(doc-as-unit) than like a Linear project description (doc-as-attachment).

---

## Entity, state, or organisation/view — sorting each concept

Per the coordinator's addition to the brief, each concept researched here is
sorted into one of three layers: **ENTITY** (has its own identity, persists,
gets referenced), **STATE** (a field on an entity — where it has got to), or
**ORGANISATION/VIEW** (a grouping or lens that could, in principle, be derived
rather than authored). Disagreements between tools about which layer a concept
belongs to are called out explicitly — this is exactly the kind of ambiguity the
investigation asked about ("is 'backlog' a place or a state; is an epic an
entity or a label-like grouping").

| Concept                                                                         | Layer                                                                                                                                     | Notes / disagreement across tools                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Linear Issue                                                                    | ENTITY                                                                                                                                    | Uncontested — the fundamental unit, has an ID, is referenced by relations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Linear Sub-issue                                                                | ENTITY (same type as Issue)                                                                                                               | Not a separate entity type — a child pointer on an Issue. The hierarchy is organisation, but the thing at each node is still a full entity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Linear Project                                                                  | ENTITY                                                                                                                                    | Has its own ID, description, lead, state (implicitly "in progress"/"completed" inferred from issues). Not a view — it's a real container with its own lifecycle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Linear Project milestone                                                        | Contested: ORGANISATION/VIEW leaning ENTITY                                                                                               | It has a target date and an issue subset (organisational — a filter/grouping inside a project), but it also gets referenced individually enough (its own docs page, its own "meaningful stage") that Linear treats it closer to a lightweight entity than a pure derived view. This is one of the places where the layer is genuinely ambiguous.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Linear Initiative                                                               | ENTITY                                                                                                                                    | Groups projects, can nest — same entity-with-hierarchy pattern as Issue/Project.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Epic (Jira, Azure DevOps)                                                       | ENTITY                                                                                                                                    | Has its own ID, description, workflow state, and rollup fields (Business Value, Time Criticality) distinct from any child. Not just a label — confirmed by Azure DevOps's dedicated Epic work-item form.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Story / Task / Subtask (Jira, Azure DevOps)                                     | ENTITY                                                                                                                                    | Each is a distinct work-item type with its own ID and state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| GitHub Issue type (Bug/Feature/Task)                                            | STATE-like field on an ENTITY, not a separate entity                                                                                      | This is GitHub's clearest disagreement with Jira/Azure DevOps: where Jira makes Story/Task/Epic _different entity types with different schemas and different places in the hierarchy_, GitHub's "issue type" is a single classification **field** on one flat Issue entity — closer to a label than to a type-in-the-schema sense. The hierarchy (parent/sub-issue) is orthogonal to the type field.                                                                                                                                                                                                                                                                                                                                                                                             |
| GitHub Milestone                                                                | ORGANISATION/VIEW                                                                                                                         | Explicitly non-hierarchical, date/release-bound grouping; closer to a saved filter with a due date than to an entity with its own lifecycle beyond open/closed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| GitHub Project (board)                                                          | ORGANISATION/VIEW                                                                                                                         | A layer over issues (table/board with hierarchy view); issues remain the entities, the Project is a lens with saved grouping/filter/sort.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Backlog (as a concept)                                                          | Contested: STATE vs. ORGANISATION/VIEW, never an ENTITY                                                                                   | No tool researched here treats "backlog" as an entity with its own ID. Azure DevOps treats it as a **view** (a specific navigation level over Epics/Features/Backlog-items, "Select backlog navigation levels"). Jira/Linear/GitHub treat it implicitly as a **state** the issue is in (not yet scheduled/triaged) surfaced through a filtered view. Either way, "backlog" is never itself a first-class entity — it is state, view, or both, depending on the tool, but it is authored nowhere as its own document. This directly answers the coordinator's example: across every tool researched, backlog is derived (state + filter), never a place with independent identity — which argues against project-docs' current `backlog/` folder being an entity home rather than a state + view. |
| Shape Up Pitch                                                                  | ENTITY (pre-bet)                                                                                                                          | Has its own identity as a document under consideration; per §"Where the spec attaches" above, uniquely doubles as the document.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Shape Up Bet                                                                    | STATE transition on a Pitch, not a new entity                                                                                             | "Bet" is the decision (an event/state change — pitch becomes committed), not a new object with its own schema; Shape Up's glossary defines it as "the decision to commit," i.e., a verb outcome, not a noun-entity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Shape Up Scope                                                                  | Contested: ENTITY vs. ORGANISATION/VIEW                                                                                                   | Scopes are discovered during execution and tracked on a hill chart, giving them entity-like individual identity and state (their hill position) — but they are not pre-declared work items filed anywhere; they emerge from execution and are closer to an ad hoc, work-in-progress grouping than to a filed ticket. This is the report's clearest case of a tool where a concept sits on the entity/view boundary by design, not by accident: Shape Up deliberately avoids pre-committing scopes to entity status so the team can discover the real shape of the work.                                                                                                                                                                                                                          |
| Shape Up Hill chart                                                             | ORGANISATION/VIEW (visualization) whose data points are STATE (each scope's uphill/downhill position)                                     | The chart itself is a view; what it plots is a state field per scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Cycle (Shape Up), Sprint/Iteration (Azure DevOps)                               | ORGANISATION/VIEW (a cadence container)                                                                                                   | Time-boxed containers that group entities by when they're worked, not by what they are; per the earlier report's finding (not redone here), these are cadence-bound rather than outcome-bound, which is a view/grouping property, not an entity property.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Milestone (Azure DevOps date field, GitHub Milestone, Linear project milestone) | Mixed — see rows above; generally ORGANISATION/VIEW with a STATE-bearing date field, except Linear's project milestone which leans ENTITY | The word "milestone" is not used consistently as a layer across tools — this is itself a finding: the label is the same, the layer is not.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

**Where tools disagree, summarized:** the sharpest disagreement is **GitHub vs.
Jira/Azure DevOps on Story/Task/Epic** — GitHub keeps one entity type (Issue)
and makes "type" a field, matching Linear's philosophy of "just issues" even
though GitHub still ships a type field Linear refuses to have; Jira and Azure
DevOps instead give each level its own entity type with its own form and schema.
The second sharpest disagreement is **whether "backlog" and "milestone" are
entities or derived views** — no tool researched makes backlog an entity, but
milestone swings between a pure date-bound view (GitHub) and something closer to
a first-class sub-entity (Linear's project milestone, which gets "meaningful
stage of completion" language and its own docs page, not just a due-date field).
Shape Up's Scope is the one deliberately ambiguous case: the method's whole
point is to defer entity-hood until the team has done enough work to know what
the real independently-shippable pieces are, which is a different failure mode
than the other tools' ambiguity (theirs comes from underspecified docs; Shape
Up's is a considered design choice).

---

## Sources Consulted

1. [Linear Docs — Concepts](https://linear.app/docs/conceptual-model) — fetched
   2026-09-22
2. [Linear Docs — Projects](https://linear.app/docs/projects) — fetched
   2026-09-22
3. [Linear Docs — Project milestones](https://linear.app/docs/project-milestones)
   — found via search 2026-09-22, not directly fetched (title/summary only)
4. [Linear Docs — Issue relations](https://linear.app/docs/issue-relations) —
   found via search 2026-09-22, content via search snippet, not directly fetched
5. [Linear Docs — Project dependencies](https://linear.app/docs/project-dependencies)
   — found via search 2026-09-22, title only, content unconfirmed
6. [Linear Method — Write issues not user stories](https://linear.app/method/write-issues-not-user-stories)
   — fetched 2026-09-22
7. [Atlassian Community — Epic/subtasks vs Story/subtasks](https://community.atlassian.com/forums/Jira-questions/Epic-subtasks-vs-Story-subtasks/qaq-p/2726830)
   — via search synthesis 2026-09-22
8. [Atlassian Community — Guidance on using stories VS tasks](https://community.atlassian.com/forums/Jira-questions/Guidance-on-using-stories-VS-tasks/qaq-p/1933631)
   — via search synthesis 2026-09-22
9. [TitanApps — Jira Epic vs Story vs Task](https://titanapps.io/blog/epic-vs-story-vs-task)
   — via search synthesis 2026-09-22
10. [GitHub Docs — Adding sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues)
    — fetched 2026-09-22
11. [GitHub Changelog — Evolving GitHub Issues and Projects](https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/)
    — via search synthesis 2026-09-22
12. [GitHub Changelog — Hierarchy view now available in GitHub Projects](https://github.blog/changelog/2026-01-15-hierarchy-view-now-available-in-github-projects/)
    — via search synthesis 2026-09-22
13. [Microsoft Learn — Define features and epics to organize backlog items](https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/define-features-epics?view=azure-devops)
    — fetched 2026-09-22
14. [Basecamp — Shape Up Glossary](https://basecamp.com/shapeup/4.5-appendix-06)
    — fetched 2026-09-22
15. [PM Work-Taxonomy Landscape (prior report)](../../work-cycle-taxonomy-landscape/reports/2026-09-03-pm-work-taxonomy-landscape-report.md)
    — read in full 2026-09-22, cadence angle not redone

## Open Gaps

- **Jira's official issue-link-types page** could not be fetched (two attempted
  URLs 404'd). The default relation list (Blocks / Relates to / Duplicates /
  Clones / Causes) given in §2 is from general knowledge, not a source located
  and confirmed during this session — needs direct verification against
  Atlassian's current docs.
- **Jira Advanced Roadmaps' "Initiative" level** (above Epic) is named from
  general knowledge, not confirmed by a fetched Atlassian doc — flagged low
  confidence.
- **Azure DevOps relation types** (Predecessor/Successor, Related,
  Duplicate/Duplicate Of) beyond Parent/Child were not confirmed by any page
  fetched in this session.
- **GitHub's relation taxonomy** beyond "blocked by" and sub-issues (e.g. does
  GitHub model "duplicate" or "relates to" natively, or only via labels and
  closing-keyword conventions?) is unresolved — the sub-issues doc fetched did
  not cover it.
- **Linear's "project update" cadence and audience** (who writes it, how often,
  whether it's required) rests on ecosystem knowledge rather than a successfully
  fetched Linear doc page (that URL 404'd) — should be re-verified directly
  against `linear.app/docs/project-updates` or its current path.
- **"Done" at each level** is confirmed only loosely across all five tools —
  none of the sources fetched gave a crisp, level-specific definition of done
  beyond "terminal workflow state"; whether a Project/Epic/Feature's done-ness
  is a separately authored decision or purely a rollup of its children's states
  was not confirmed for Jira or GitHub in this session (Azure DevOps's rollup
  mechanism is confirmed; Linear's is inferred, not confirmed).
- **Plane and Macro** are explicitly out of scope for this track (assigned to
  track 1 of the parent investigation) and are not covered here.
