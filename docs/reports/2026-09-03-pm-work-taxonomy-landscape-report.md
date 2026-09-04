# PM Work-Taxonomy Landscape: intent, grouping, and in-play units

**Date:** 2026-09-03 **Author:** Research pass (web-researcher agent, 21 tool
uses, 37 sources) **Scope:** Shape Up, Linear, Scrum/Jira, Kanban, GitHub
Projects, GitLab, Basecamp product, Notion, Plane. Height not found. **Status:**
Complete. **Feeds:**
[Work-cycle taxonomy investigation](../investigations/2026-09-03-work-cycle-taxonomy-landscape-investigation.md)

---

Context: solo developer + AI coding agents, markdown-in-git planning
(`docs/projects/<name>/proposal.md`, `plan.md`, `sessions/`, `docs/backlog/`).
Looking for the missing concept: a container for "scope of work currently in
play" — opens, gets worked, closes, archives — distinct from the timeless intent
(proposal) and the docs container (project folder). Leaning toward a Shape Up
"cycle" over a Scrum "sprint."

---

## 1. Shape Up (Basecamp / Ryan Singer)

**Primitives**

- **Pitch** — a written proposal of a shaped problem + appetite + solution
  sketch + rabbit holes/no-gos. Not a ticket, not an estimate. Source:
  [Basecamp — Shape Up ch. 6](https://basecamp.com/shapeup/2.1-chapter-07)
  (context in same chapter family).
- **Betting table** — a recurring decision meeting (not a standing backlog
  review) held during cooldown, attended at Basecamp by four people: CEO, CTO, a
  senior programmer, and a product strategist. It reviews "pitches from the last
  six weeks — or any pitches that somebody purposefully revived." Output is a
  cycle plan; "There's no 'step two' to validate the plan or get approval. And
  nobody else can jump in afterward to interfere or interrupt the scheduled
  work." Source:
  [Basecamp — The Betting Table, ch. 8](https://basecamp.com/shapeup/2.2-chapter-08)
- **Cycle** — a fixed 6-week window (Basecamp's default; teams adapt to 2–4
  weeks) of uninterrupted work on the bet-on pitches. "Long enough to finish
  something meaningful and short enough to feel the deadline from the
  beginning." Source:
  [Basecamp ch. 7](https://basecamp.com/shapeup/2.1-chapter-07)
- **Cooldown** — a mandatory ~2-week gap between cycles with no scheduled
  project work: bug fixes, exploration/spiking of future pitches, rest, and the
  next betting table happen here. Source:
  [Basecamp ch. 7](https://basecamp.com/shapeup/2.1-chapter-07),
  [ch. 8](https://basecamp.com/shapeup/2.2-chapter-08)
- **Hill chart** — a visual progress device per **scope**, plotted on a hill:
  uphill = "figuring out" (unknowns, problem-solving), downhill = "execution"
  (known path, just finishing). One dot per scope, not per task. Status is
  _human-generated_ (someone drags the dot) not derived from checked-off tasks;
  every update snapshots history. Source:
  [Basecamp product — Hill Charts](https://basecamp.com/hill-charts),
  [Basecamp 4 Help — Hill Charts](https://3.basecamp-help.com/article/412-hill-charts),
  [Tracking Work on the Hill Chart](https://3.basecamp-help.com/article/413-tracking-work-on-the-hill-chart)

**Scopes vs. tasks (nuance)**: A "scope" is a piece of the project that can be
built, integrated, and finished independently — this is the real unit Shape Up
wants you tracking, not granular to-dos. Ryan Singer's rationale: checking off
many small to-dos can create an illusion of progress without moving the needle;
tracking at scope-level forces honest uphill/downhill assessment.
Sub-tasks/todos still exist underneath a scope but are not what gets reported.
Source:
[Ademar Gonçalves — Shape Up notes](https://ademar-goncalves.medium.com/shape-up-by-ryan-singer-b1a56f2bea66),
[Process Street — Shape Up Process](https://www.process.st/shape-up-process/)

**"No backlogs" stance (nuance)**: Shape Up explicitly rejects a persistent,
shared backlog as "a big weight we don't need to carry" — backlogs create false
pressure and burn time on repeated triage of ideas that may never ship. Pitches
_not_ bet on at the betting table are simply released, untracked at the org
level — "If an idea truly matters, advocates will independently monitor it and
lobby for it six weeks later." Individuals at Basecamp do keep _private_ lists
of shaping docs/bugs/ideas they might raise later, but there's no shared backlog
artifact. This is a policy choice, not an absence of memory — the memory just
isn't systematized. Source:
[Basecamp — Bets, Not Backlogs, ch. 7](https://basecamp.com/shapeup/2.1-chapter-07)

**Nesting**: Pitch (before commitment, timeless-ish, lives outside any cycle) →
bet at betting table → becomes cycle work, decomposed into scopes → scopes
tracked on hill chart → scopes decompose into to-dos on a card
table/kanban-style board (Basecamp's "Card Table" feature). Source:
[Basecamp features](https://basecamp.com/features)

**What opens/closes a cycle**: Opens immediately after the betting table decides
the bets. Closes strictly at 6 weeks regardless of completion state — Shape Up
treats the deadline as fixed and scope as the variable that flexes (this is the
"appetite" concept: fixed time, variable scope, as opposed to Scrum's variable
time via story-point estimation against a fixed scope). Source:
[Basecamp ch. 8](https://basecamp.com/shapeup/2.2-chapter-08),
[Lenny's Newsletter interview with Ryan Singer](https://www.lennysnewsletter.com/p/shape-up-ryan-singer)

**Adapting for solo/small teams**: Ryan Singer himself frames the book's
prescriptions as "we do things like this / here's why we think it's right /
here's how you can adapt it," not a single canonical process — explicitly
inviting adaptation for teams unlike Basecamp. Source:
[Goodreads review discussion](https://www.goodreads.com/book/show/55987183) For
solo/freelance use, commentary highlights the appetite-driven core (fixed
timebox, variable scope) as the most portable piece, independent of the
multi-person betting-table ritual. Source:
[Lenny's Newsletter — Ryan Singer](https://www.lennysnewsletter.com/p/shape-up-ryan-singer)

**Known criticisms**:

- Sidelining builders: giving shaping power to senior "shapers" can turn
  engineers/designers into pure delivery executors with no say in the underlying
  business problem. Source:
  [Curious Lab — Dispelling myths about Shape Up](https://www.curiouslab.io/blog/basecamp-shape-up-myths/)
- Fit is conditional: works well for small-to-medium teams doing deep,
  uninterrupted work with clear boundaries; weaker for highly dynamic projects
  needing frequent external feedback or heavy documentation requirements.
  Source:
  [Curious Lab overview](https://www.curiouslab.io/blog/what-is-basecamps-shape-up-method-a-complete-overview/)
- No-estimates side effects: some adopters report technical debt from
  over-optimistic scope-shaping (since there's no formal estimation gate), and
  degraded cross-team progress communication when work splits away from shared
  rituals. Source:
  [fnune — Reflecting on a year of Shape Up after Scrum](https://fnune.com/2020/05/12/reflecting-on-a-year-of-shape-up-after-scrum/)
- Undershaping risk is worse for smaller/less mature orgs — Shape Up assumes a
  shaping discipline that immature product processes may not yet have. Source:
  [Curious Lab — Dispelling myths](https://www.curiouslab.io/blog/basecamp-shape-up-myths/)
- Ryan Singer's own later writing acknowledges mixed outcomes: some teams ship
  exactly on target, others "drag on, stuck at the last yard line" — his
  diagnosis is under-investment in shaping/spiking before committing to a cycle.
  Source:
  [Ryan Singer — Three "what about...?" questions when considering Shape Up](https://www.ryansinger.co/three-what-abouts/),
  [Ryan Singer — End-to-End with Shape Up case study](https://www.ryansinger.co/end-to-end-with-shape-up-a-real-world-case-study/)

---

## 2. Linear

**Primitives** (from Linear's own conceptual model docs): Initiative → Project →
Issue, with Cycles as an orthogonal, time-boxed lane that issues can also belong
to. Source: [Linear Docs — Concepts](https://linear.app/docs/conceptual-model),
[Linear Docs — Initiatives](https://linear.app/docs/initiatives)

- **Initiative**: can contain multiple projects; initiatives can nest
  (parent/sub-initiative) to roll strategic areas up into a larger objective.
- **Project**: groups related issues around a shared outcome; can span multiple
  teams; each issue belongs to exactly one project at a time. Has a named owner
  responsible for the project brief and delivery, and supports **project
  updates** and **milestones** (phases within a project, each with its own
  target date and issue subset — e.g. alpha / beta / GA).
- **Issue**: the fundamental unit of work — bug, feature slice, follow-up,
  internal request. Belongs to assignee, status, cycle, and project
  simultaneously (a genuinely unified data model, per Linear).
- **Cycle**: a team's _repeating_ time-boxed planning period, independent of any
  given project — "orthogonal" in the sense that a project can span multiple
  cycles, and a single cycle typically pulls issues from several projects at
  once. Source:
  [Aakash G — Linear Project Management guide](https://www.aakashg.com/linear-project-management/)
- **Triage**: a separate inbox for new issues/bug reports/requests to be
  reviewed/categorized before they enter the backlog proper — explicitly meant
  to keep the backlog from becoming "a dumping ground." Source:
  [Aakash G guide](https://www.aakashg.com/linear-project-management/)

**Membership/status representation**: an issue carries multiple orthogonal
attributes (status/workflow state, project, cycle, assignee) rather than living
inside a single hierarchical container — this is presented as a deliberate
design choice against "the fragmentation many teams accept as normal." Source:
[Linear Docs — Concepts](https://linear.app/docs/conceptual-model)

**The Linear Method's rationale for separating projects and cycles**: Linear's
own "Method" essays frame projects as _outcome-oriented_ ("Connect daily work to
larger goals with projects" — every project ties to a strategic goal and has a
named owner) and cycles as a _rhythmic cadence-forcing device_ ("Cycles create a
healthy routine and focus teams on what needs to happen next"), deliberately
short (Linear recommends 2-week cycles: "short enough to not lose sight of other
priorities, but long enough to build significant features"). The explicit
guidance is not to over-plan cycles — "Don't overload cycles with tasks and let
unfinished items move to the next cycle automatically" — i.e., cycles are a
scheduling lens over ongoing project work, not a scope-commitment container the
way a Scrum sprint or a Shape Up cycle is. Source:
[Linear Method — Principles & Practices](https://linear.app/method/introduction)

**What opens/closes**: A cycle opens/closes on a fixed repeating cadence (e.g.
every 2 weeks) regardless of any particular project's state; unfinished issues
roll over automatically rather than being explicitly re-triaged. A project
closes when its outcome is delivered (no fixed timebox) and can span an
arbitrary number of cycles. Source:
[Linear Method](https://linear.app/method/introduction),
[Aakash G guide](https://www.aakashg.com/linear-project-management/)

**Unselected/unfinished work**: rolls to the next cycle automatically (not
dropped, not requiring re-decision, contrast with Shape Up's "just let it go"
stance and Scrum's re-estimation-at-planning stance). New/unscoped incoming work
goes through Triage before it's allowed into the backlog. Source:
[Linear Method](https://linear.app/method/introduction),
[Aakash G guide](https://www.aakashg.com/linear-project-management/)

---

## 3. Scrum / Jira

**Primitives**: Epic → Story → Sub-task, with Sprint and Version/Release as two
separate, non-hierarchical cross-cutting containers. Source:
[Atlassian — What is an epic?](https://support.atlassian.com/jira-software-cloud/docs/what-is-an-epic/),
[Atlassian Community — Issue hierarchy](https://community.atlassian.com/forums/Jira-questions/Issue-hierarchy-epics-features-stories-tasks-sub-tasks-how-to/qaq-p/2139946)

- **Epic**: large body of work, broken into stories, may span months/years and
  multiple sprints.
- **Story**: assigned to a sprint (the "when we'll do it" axis).
- **Version/Release**: a customer-facing bundle of features+fixes shipped
  together — orthogonal to sprints ("the culmination of a team's work that will
  be shipped to the customer"), oriented around _what ships_, not _when the team
  works on it_. Source:
  [Easy Agile — Sprints vs. Versions in Jira](https://www.easyagile.com/blog/what-is-the-difference-between-sprints-and-versions-in-jira)
- **Sprint**: a fixed 1–4 week timebox during which a committed subset of
  backlog items is worked.

A common Jira structure nests these as Version (top) → Epic (major initiative
within the version) → Story (parts of the epic), while Sprint cuts across
epics/stories as a pure scheduling lane, similar in spirit to how Linear's Cycle
cuts across Projects. Source:
[Atlassian Community — Issue hierarchy discussion](https://community.atlassian.com/forums/Jira-questions/Issue-hierarchy-epics-features-stories-tasks-sub-tasks-how-to/qaq-p/2139946)

**The "sprint conflates scope and time" critique**: I could not find a single
canonical essay making exactly this argument by that phrase (search attempts
turned up only Atlassian's own sprint/scope-creep documentation and general "is
the sprint scope fixed?" discussions, not a critique essay). The closest
documented tension: a sprint's _scope_ is nominally fixed at planning but its
stories can still be swapped/added if the sprint _goal_ survives — meaning the
"time box" and "scope commitment" are formally supposed to be independent but
are handled by the same ceremony and the same artifact (the sprint backlog),
which is exactly the structural conflation Shape Up and Linear both react
against by giving scope (project/pitch) and time (cycle) genuinely separate
containers. Source:
[Mirko Perkusich — Scrum Myth: The Sprint Scope is Fixed](https://medium.com/@mirkoperkusich/scrum-myth-the-sprint-scope-is-fixed-a3ce4b262eaa),
[Atlassian — Sprints in Agile](https://www.atlassian.com/agile/scrum/sprints)
**Confidence: Low** — this is a reasonable synthesis of the sources found, not a
verified quote from a named critique essay; flagged as a gap.

**What opens/closes a sprint**: Opens at sprint planning (team commits to a
subset of backlog items for a fixed 1–4 week box); closes strictly at the end of
the timebox, followed by sprint review + retrospective. Source:
[Atlassian — Sprints in Agile](https://www.atlassian.com/agile/scrum/sprints)

**Unselected work**: stays in the product backlog, re-prioritized at the next
planning session — the backlog is explicitly persistent and shared, the opposite
of Shape Up's stance.

---

## 4. Kanban / flow-based

**Primitives**: no periods/iterations by design — Kanban is continuous flow. The
board's columns represent workflow stages; **swimlanes** are horizontal
groupings (by project, work type, or class of service) laid across those
columns. Source:
[Kanban Tool — Kanban Swimlanes](https://kanbantool.com/kanban-swimlanes),
[BusinessMap — Kanban Swimlanes](https://businessmap.io/kanban-resources/kanban-software/kanban-swimlanes)

- **WIP limits**: policy constraints on how much work is allowed in a given
  column/swimlane/person/system at once — can be scoped per column, per
  swimlane, per person, or system-wide. Source:
  [Kanban University Glossary](https://kanban.university/glossary/),
  [Teamhood — Kanban WIP Limits](https://teamhood.com/kanban-resources/kanban-wip-limits/)
- **Classes of service**: explicit priority policies (e.g. an "Expedited" class
  typically capped at WIP=1) used to differentiate how urgent/VIP work is
  scheduled, rather than time-boxing. Source:
  [Nave — WIP Limits in Kanban](https://getnave.com/blog/kanban-wip-limits/),
  [Customer Science — Service Kanban](https://customerscience.com.au/uncategorized/service-kanban-wip-classes-of-service-slas/)
- **"Done" as policy**: Kanban has no sprint boundary to force closure — "done"
  is defined by explicit, agreed board policies (what conditions must be true
  for a card to sit in the rightmost column), not by a ceremony. Source:
  [Kanban University Glossary](https://kanban.university/glossary/)

**Grouping representation**: Kanban has no native "project" or "epic" concept in
its pure form — grouping is achieved orthogonally via swimlanes, tags/classes of
service, or a separate portfolio-level board, not via a built-in hierarchy. This
is a genuine structural difference from every other system in this report:
there's no in-play _container that opens and closes_ — work items individually
enter and exit continuously, governed by policy rather than periods. Source:
[BusinessMap — Kanban Swimlanes](https://businessmap.io/kanban-resources/kanban-software/kanban-swimlanes)

---

## 5. GitHub Projects and GitLab (epics/iterations/milestones)

**GitHub**:

- **Milestone**: repo-scoped, tied to metadata on an issue/PR within a single
  repository; commonly used for release-oriented, date-bound grouping. Source:
  [GitHub Docs — Iteration fields](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iteration-fields)
- **Iteration field**: a Projects-level (cross-repo) field for associating items
  with repeating, arbitrary-length time blocks — can include breaks, supports
  `@current`/`@previous`/`@next` filters, and is a plain custom field rather
  than a first-class object with its own lifecycle ceremony. Source:
  [GitHub Docs — About iteration fields](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iteration-fields)

So GitHub's model: Milestone = release/goal grouping (repo-scoped); Iteration =
sprint-like recurring timebox (project-scoped, cross-repo). These are two
independently maintained fields on an issue, not a nested hierarchy — closer to
Linear's project/cycle orthogonality than to Jira's epic/story nesting.

**GitLab**:

- **Epic**: strategic, high-level container for large initiatives; can nest, and
  can span multiple milestones. Source:
  [GitLab Forum — Epics vs Milestones vs Iterations](https://forum.gitlab.com/t/epics-vs-milestones-vs-iterations/77973)
- **Milestone**: tracks issues/MRs toward a broader goal over a period (optional
  start/due date); can represent overlapping product goals and can be assigned
  directly to an epic to "cascade" from strategy to delivery. Source:
  [GitLab Docs — Milestones](https://docs.gitlab.com/user/project/milestones/),
  [GitLab Handbook — Milestones guidelines](https://handbook.gitlab.com/handbook/marketing/project-management-guidelines/milestones/)
- **Iteration**: GitLab's explicit sprint-equivalent — **mutually exclusive**
  timeboxes (unlike milestones, which can overlap), each with a date range and
  its own burndown chart, meant to track team velocity. Iterations run
  _alongside_ milestones as a separate concurrent timebox axis. Source:
  [GitLab Forum thread](https://forum.gitlab.com/t/epics-vs-milestones-vs-iterations/77973)

GitLab's structure is explicitly three-tier and orthogonal on the time axis:
Epic (strategic, no fixed time) → Milestone (goal-bound, optionally overlapping)
→ Iteration (mutually-exclusive sprint timebox, velocity tracking) — closest of
all the tools researched to naming three of this report's four roles
(intent/grouping/in-play) as distinct first-class objects simultaneously.

---

## 6. Basecamp product, Notion, Height, Plane

**Basecamp (the product, distinct from the Shape Up book/methodology)**:
Basecamp ships **Hill Charts** as a native feature attached to to-do lists
within a project — you opt a to-do list into hill-chart tracking, then manually
drag dots to reflect uphill/downhill status; each update is snapshotted into
project history so status is legible without asking. Basecamp also has a **Card
Table** (its Kanban-style board) as a separate feature for column-based flow
tracking. Neither Hill Charts nor Card Table requires or assumes the book's
pitch/betting-table/cycle ceremony — they're usable standalone inside any
ongoing Basecamp "project." Source:
[Basecamp — Hill Charts](https://basecamp.com/hill-charts),
[Basecamp Help — Hill Charts](https://3.basecamp-help.com/article/412-hill-charts),
[Basecamp Help — Tracking work on the Hill Chart](https://3.basecamp-help.com/article/413-tracking-work-on-the-hill-chart)

**Notion**: added native **Sprints** functionality distinct from **Projects** —
"Sprints and Projects are similar because they both are containers for your
actions or tasks. Projects group tasks based on their goals, while Sprints group
tasks based on when you're going to tackle them." This is Notion's own explicit
articulation of the grouping-unit-vs-in-play-unit split — goal-axis vs.
time-axis containers, same distinction Linear and GitLab draw. Source:
[Notion Help — Sprints, simplified](https://www.notion.com/help/guides/sprints-simplified-notions-sprint-tracking-system)

**Plane**: uses **Cycles** (explicitly Shape-Up/sprint-flavored terminology) as
its time-boxed unit, with burndown/build-up charts, manual or automatic start,
and automatic rollover of incomplete work into the next cycle — same "no
re-triage required" rollover behavior as Linear's cycles. Source:
[Plane Blog — Plane vs Notion](https://plane.so/blog/plane-vs-notion-which-should-you-choose-in-2026)

**Height**: no distinct-concept documentation surfaced in this pass (searches
did not return Height-specific material on a grouping vs. in-play split). **Gap
— flagged, not found.**

---

## 7. Writing on the pitch-vs-cycle / intent-vs-execution separation as a general principle

- Ryan Singer's later essays (post-book, on his own site) continue refining this
  exact tension. In "Three 'what about...?' questions when considering Shape
  Up," he discusses a founder whose teams had mixed results: "Some projects were
  knockouts... other projects dragged on, stuck at the last yard line" — and
  frames the fix as investing more in shaping/spiking _before_ the intent
  (pitch) converts into a time-boxed commitment (cycle), i.e., the separation
  between defining intent and committing to execution needs its own deliberate
  discipline, not just the container split. Source:
  [Ryan Singer — Three "what about...?" questions](https://www.ryansinger.co/three-what-abouts/)
- His "End-to-End with Shape Up" case study works through a concrete pitch →
  cycle → shipped-feature trace. Source:
  [Ryan Singer — End-to-End with Shape Up](https://www.ryansinger.co/end-to-end-with-shape-up-a-real-world-case-study/)
- Direct "Shape Up vs Scrum" comparison pieces converge on describing this as an
  intent/execution split: "senior team members, who ultimately will not execute
  the project, define the problem and solution... This represents a clear
  separation between those who shape (define intent) and those who build
  (execute)." Also: cycles run on parallel tracks — an upper track for anyone
  shaping/betting, a lower track for anyone building — running concurrently
  rather than sequentially phase-gated. Source:
  [mdalmijn — Basecamp's Shape Up: how different is it really from Scrum?](https://mdalmijn.com/p/basecamps-shape-up-how-different-is-it-really-from-scrum)
- Framed more generally (not Shape-Up-specific): Linear's Method essays make the
  same intent/execution split under different names — Project = intent/outcome,
  Cycle = execution rhythm — and explicitly warn against collapsing them ("Don't
  overload cycles with tasks"). Source:
  [Linear Method — Principles & Practices](https://linear.app/method/introduction)

**Gap**: I did not find a single named essay that argues this as an _abstract,
methodology-agnostic design principle_ (i.e., "always separate your intent
container from your in-play container, regardless of tool"). The pattern is
consistently _observed_ across Shape Up, Linear, Notion, GitLab, and Plane, but
each source frames it inside their own tool/method rather than as a named
general principle. This looks like an under-articulated idea in the current
PM-tooling discourse — potentially worth naming explicitly in your own docs
rather than expecting to find existing canon.

---

## Comparison Table

| Methodology            | Intent unit                                  | Grouping unit                                              | In-play unit                                                               | Time-boxed?                                                    | What closes it                                             | Unselected work goes to...                                                                       |
| ---------------------- | -------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Shape Up**           | Pitch                                        | (Pitch itself doubles as grouping — no separate container) | Cycle (6 wks)                                                              | Yes, hard deadline                                             | Cycle end (fixed date, scope flexes)                       | Nowhere systematic — pitch is dropped; individuals privately track ideas they may re-pitch later |
| **Linear**             | Initiative                                   | Project (outcome-bound, spans cycles)                      | Cycle (e.g. 2 wks, repeating)                                              | Yes, but decoupled from project completion                     | Cycle end (fixed cadence)                                  | Auto-rolls to next cycle; new/raw items go through Triage first                                  |
| **Scrum/Jira**         | Epic                                         | Version/Release (ships together)                           | Sprint (1–4 wks)                                                           | Yes                                                            | Sprint end + review/retro                                  | Returns to product backlog, re-prioritized next planning                                         |
| **Kanban**             | (none native — implicit in card description) | Swimlane / class of service (policy-based grouping)        | None — continuous flow, no in-play container                               | No                                                             | Nothing "closes" — "done" is a board policy                | Stays in queue/backlog column, pulled per WIP limits                                             |
| **GitHub Projects**    | (none native)                                | Milestone (repo-scoped, release/goal)                      | Iteration field (project-scoped, repeating timebox)                        | Iteration: yes; Milestone: date-bound but not iteration-shaped | Iteration boundary date; Milestone closes on completion    | Left unassigned to current iteration; re-filtered next iteration                                 |
| **GitLab**             | Epic (can nest)                              | Milestone (goal-bound, can overlap, can attach to epic)    | Iteration (mutually exclusive sprint timebox, velocity-tracked)            | Iteration: yes; Milestone: optional dates                      | Iteration end date                                         | Rolls or is re-scheduled to next iteration                                                       |
| **Basecamp (product)** | (Project itself, ongoing)                    | To-do list                                                 | Hill-chart-tracked to-do list (no fixed close date — human-updated status) | No                                                             | Nothing formally "closes" it — status is a manual snapshot | N/A — no periodic reset                                                                          |
| **Notion**             | (Project)                                    | Project                                                    | Sprint                                                                     | Yes                                                            | Sprint end                                                 | Stays in project, re-added to next sprint                                                        |
| **Plane**              | (Project)                                    | Project                                                    | Cycle                                                                      | Yes                                                            | Cycle end                                                  | Auto-rollover to next cycle                                                                      |

---

## Sources Consulted

1. [Basecamp — Bets, Not Backlogs, ch. 7](https://basecamp.com/shapeup/2.1-chapter-07)
2. [Basecamp — The Betting Table, ch. 8](https://basecamp.com/shapeup/2.2-chapter-08)
3. [Basecamp — Hill Charts (product page)](https://basecamp.com/hill-charts)
4. [Basecamp 4 Help — Hill Charts](https://3.basecamp-help.com/article/412-hill-charts)
5. [Basecamp 4 Help — Tracking Work on the Hill Chart](https://3.basecamp-help.com/article/413-tracking-work-on-the-hill-chart)
6. [Basecamp — Features](https://basecamp.com/features)
7. [Ademar Gonçalves — Shape Up by Ryan Singer (notes)](https://ademar-goncalves.medium.com/shape-up-by-ryan-singer-b1a56f2bea66)
8. [Process Street — Shape Up Process](https://www.process.st/shape-up-process/)
9. [Curious Lab — Dispelling myths about Shape Up](https://www.curiouslab.io/blog/basecamp-shape-up-myths/)
10. [Curious Lab — What is Basecamp's Shape Up method?](https://www.curiouslab.io/blog/what-is-basecamps-shape-up-method-a-complete-overview/)
11. [fnune — Reflecting on a year of Shape Up after Scrum](https://fnune.com/2020/05/12/reflecting-on-a-year-of-shape-up-after-scrum/)
12. [Ryan Singer — Three "what about...?" questions when considering Shape Up](https://www.ryansinger.co/three-what-abouts/)
13. [Ryan Singer — End-to-End with Shape Up: A Real-World Case Study](https://www.ryansinger.co/end-to-end-with-shape-up-a-real-world-case-study/)
14. [Lenny's Newsletter — Ryan Singer interview](https://www.lennysnewsletter.com/p/shape-up-ryan-singer)
15. [Goodreads — Shape Up book discussion](https://www.goodreads.com/book/show/55987183)
16. [mdalmijn — Basecamp's Shape Up: how different is it really from Scrum?](https://mdalmijn.com/p/basecamps-shape-up-how-different-is-it-really-from-scrum)
17. [Linear Docs — Concepts](https://linear.app/docs/conceptual-model)
18. [Linear Docs — Initiatives](https://linear.app/docs/initiatives)
19. [Linear Method — Principles & Practices](https://linear.app/method/introduction)
20. [Aakash G — Linear Project Management: A PM's High-Velocity Guide](https://www.aakashg.com/linear-project-management/)
21. [Atlassian — What is an epic?](https://support.atlassian.com/jira-software-cloud/docs/what-is-an-epic/)
22. [Atlassian Community — Issue hierarchy: epics, features, stories, tasks, sub-tasks](https://community.atlassian.com/forums/Jira-questions/Issue-hierarchy-epics-features-stories-tasks-sub-tasks-how-to/qaq-p/2139946)
23. [Easy Agile — Difference between sprints and versions in Jira](https://www.easyagile.com/blog/what-is-the-difference-between-sprints-and-versions-in-jira)
24. [Mirko Perkusich — Scrum Myth: The Sprint Scope is Fixed](https://medium.com/@mirkoperkusich/scrum-myth-the-sprint-scope-is-fixed-a3ce4b262eaa)
25. [Atlassian — Sprints in Agile](https://www.atlassian.com/agile/scrum/sprints)
26. [Kanban University — Glossary](https://kanban.university/glossary/)
27. [Kanban Tool — Kanban Swimlanes](https://kanbantool.com/kanban-swimlanes)
28. [BusinessMap — What Are Kanban Swimlanes?](https://businessmap.io/kanban-resources/kanban-software/kanban-swimlanes)
29. [Nave — Do Less to Do More: WIP Limits in Kanban](https://getnave.com/blog/kanban-wip-limits/)
30. [Teamhood — Kanban WIP Limits](https://teamhood.com/kanban-resources/kanban-wip-limits/)
31. [Customer Science — Service Kanban: WIP, Classes of Service, SLAs](https://customerscience.com.au/uncategorized/service-kanban-wip-classes-of-service-slas/)
32. [GitHub Docs — About iteration fields](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iteration-fields)
33. [GitLab Docs — Milestones](https://docs.gitlab.com/user/project/milestones/)
34. [GitLab Forum — Epics vs Milestones vs Iterations](https://forum.gitlab.com/t/epics-vs-milestones-vs-iterations/77973)
35. [GitLab Handbook — Milestones project management guidelines](https://handbook.gitlab.com/handbook/marketing/project-management-guidelines/milestones/)
36. [Notion Help — Sprints, simplified with Notion's sprint tracking system](https://www.notion.com/help/guides/sprints-simplified-notions-sprint-tracking-system)
37. [Plane Blog — Plane vs. Notion: Which should you choose in 2026?](https://plane.so/blog/plane-vs-notion-which-should-you-choose-in-2026)

## Open Gaps

- No canonical single essay found articulating "separate intent container from
  in-play container" as a named, tool-agnostic design principle — the pattern is
  consistent across sources but not yet named as such anywhere found.
- No Height-specific documentation found distinguishing a grouping vs. in-play
  concept.
- The "sprint conflates scope and time" framing is my synthesis from
  Scrum-scope-fixity discussions, not a verified quote from a named critique
  piece — flagged low-confidence above.
