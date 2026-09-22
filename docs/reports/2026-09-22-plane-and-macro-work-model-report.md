---
type: report
title:
  "Plane and Macro Work Model: primitives, nesting, states, and agent support"
description:
  What Plane and Macro each treat as a unit of work or document, how those units
  nest and close, and what of each design would translate to a file-based,
  agent-first system.
tags: [taxonomy, work-management]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Plane and Macro Work Model: primitives, nesting, states, and agent support

Context: this report is one of four tracks feeding
[the work-taxonomy investigation](../investigations/2026-09-22-work-taxonomy-for-agent-first-development-investigation.md).
It covers **Plane** and **Macro** in depth; Linear, Shape Up, Jira, Kanban,
GitHub, and GitLab are already covered in
[the PM work-taxonomy landscape report](./2026-09-03-pm-work-taxonomy-landscape-report.md)
and are not redone here.

---

## 1. Plane

Plane is an open-source project-management tool
([github.com/makeplane/plane](https://github.com/makeplane/plane)) with a hosted
SaaS at [plane.so](https://plane.so) and docs split across
[docs.plane.so](https://docs.plane.so) (user-facing concepts) and
[developers.plane.so](https://developers.plane.so) (API/MCP). The repository
itself was not inspected directly (source-diving the Django models under
`apps/api` was not needed — the docs were not thin); all claims below are from
the docs and changelog, cited per claim.

### Work items and sub-work-items

The **work item** (Plane's current name for what used to be called "issue") is
the fundamental unit: "a task, bug, feature, or any piece of work your team
needs to track." Source:
[Manage work items](https://docs.plane.so/core-concepts/issues/overview).

- **Sub-work-items** let you "break down larger tasks into smaller, manageable
  components," and — notably — a work item in one project can be nested as a
  sub-item beneath a work item in a _different_ project, so the parent/child
  relation is not confined to one project's boundary. Source:
  [Manage work items](https://docs.plane.so/core-concepts/issues/overview).
- **Work item types**: each project has a default work item type, and workspaces
  can define custom types (Task, Bug, Feature, etc.); Epic is itself now
  delivered as a work item type (see below) rather than a separate object.
  Source:
  [Manage work items](https://docs.plane.so/core-concepts/issues/overview);
  [Epics is becoming a work item type in Plane](https://plane.so/blog/epics-is-becoming-a-work-item-type-in-plane).

### States and state groups

Every work item state belongs to exactly one of five **state groups**, and the
group — not the state's name — is what analytics and "done" logic key off:

1. **Backlog** — not ready to be prioritized yet.
2. **Unstarted** — planned but not started (default: "Todo").
3. **Started** — actively being worked (default: "In Progress").
4. **Completed** — finished (default: "Done"). **Only items in this group count
   as done**, which is what cycle/module progress, burndown, and analytics
   bucket against.
5. **Cancelled** — no longer relevant or actionable.

A project's default state is Backlog; only one state can be default at a time.
Source: [Work Item States](https://docs.plane.so/core-concepts/issues/states).

### Relations

Beyond parent/child (sub-work-items), work items carry typed **relations**:
Relates To, Duplicate, Implements, Blocked by, Blocking, and temporal variants
(Starts Before/After, Finishes Before/After) that render as dependency
connectors in Timeline views. Source:
[Manage work items](https://docs.plane.so/core-concepts/issues/overview).

### Modules, cycles, epics, initiatives — four different groupings

- **Cycles** are time-boxed iterations (sprint/iteration-style), the same
  cadence-lane pattern Linear uses. Source: [Cycles](https://plane.so/cycles).
- **Modules** group related work items logically regardless of which cycle they
  fall into — a feature, a quarterly goal, a cross-cutting migration — and carry
  their own progress tracking (completion %, state distribution). Source:
  search-confirmed summary of
  [Plane's modules docs](https://docs.plane.so/core-concepts/projects/overview)
  (module purpose language); primary modules-overview page returned 404 on
  direct fetch — flagged below as unconfirmed by direct doc read.
- **Epics**, as of the 2026-05-31 change, are a configurable work item type
  rather than a separate object: they sit as parent-level work items, other work
  items attach via the ordinary Parent field, and epics can now be scoped
  directly into cycles and modules the way any other work item can. Epics
  support their own "Work Item Updates" (On Track / At Risk / Off Track).
  Source: [Epics](https://docs.plane.so/core-concepts/issues/epics);
  [Epics is becoming a work item type in Plane](https://plane.so/blog/epics-is-becoming-a-work-item-type-in-plane);
  [Epics become a work item type, publish MCP apps (changelog)](https://plane.so/changelog/2026-05-31-epics-work-item-type-publish-mcp-apps).
- **Initiatives** are workspace-level: they pull in projects, epics, and any
  work item type as "scope," and offer Overview (progress/completion) and Scope
  (detailed building-blocks) views. Plane's own framing: "Initiatives set the
  direction, while Projects, epics, and cycles break it down," and "completion
  flows from work items to epics to initiatives, with every level updating the
  one above it." Source:
  [Align multiple projects with Initiatives](https://docs.plane.so/core-concepts/projects/initiatives);
  [Epics and Initiatives](https://plane.so/epics-initiatives).

Workspace → Projects → {work items, cycles, modules, pages, intake} is the
documented containment; Initiatives sit above Projects at workspace scope.
Source:
[Create and manage projects](https://docs.plane.so/core-concepts/projects/overview).
**No "Teamspace" or "milestone" object was found** in the docs surfaced by this
pass — flagged as an open gap, not a confirmed absence.

### Pages / wiki

**Pages** are project-scoped documentation; **Wiki** is the workspace-wide
equivalent, and a page can be moved between Project, Teamspace, and Wiki scope
(this is the one place "Teamspace" appeared, as a page-transfer target, without
further definition found). "Work item pages create links between work items and
wiki pages so related documentation stays close to execution," and any sentence
in a page can be highlighted and converted directly into a work item (becoming a
linked mention). Pages track full edit history. Source:
[Pages for project documentation](https://docs.plane.so/core-concepts/pages/overview);
[Wiki for company-wide knowledge base](https://docs.plane.so/core-concepts/pages/wiki).

### Intake / triage

**Intake** is how external requests enter a project. Every intake submission
lands in a single, system-reserved state called **Triage** — a state group that
"doesn't appear in your project's state groups," cannot be created via the API,
cannot be deleted, and "Triage" cannot be used as a name for any other state.
Once accepted, an intake item moves into the project's normal state flow.
Source:
[Intake to collect and triage external work requests](https://docs.plane.so/core-concepts/intake);
[Work Item States](https://docs.plane.so/core-concepts/issues/states).

### AI / agents

Plane ships a first-party **MCP server**
([github.com/makeplane/plane-mcp-server](https://github.com/makeplane/plane-mcp-server),
hosted at `https://mcp.plane.so/`) exposing ~30 tools (one per resource:
projects, work items, cycles, modules, releases, customers, etc.) covering 204
operations, over three transports (API key + workspace slug via stdio; OAuth via
remote HTTP/SSE; PAT via remote HTTP). It lets external agent clients (Claude,
Cursor, ChatGPT, VS Code) read and write a Plane workspace. Plane also describes
building custom agents against signals, webhooks, and the REST API, and as of
the 2026-05-31 release supports publishing MCP apps alongside the epic-as-type
change. Source: [MCP server](https://developers.plane.so/dev-tools/mcp-server);
[Self-host the MCP server](https://developers.plane.so/dev-tools/mcp-server-self-host);
[Introducing MCP Connectors and Cursor agent](https://plane.so/blog/introducing-mcp-connectors-and-cursor-agent);
[Epics become a work item type, publish MCP apps](https://plane.so/changelog/2026-05-31-epics-work-item-type-publish-mcp-apps).
Plane's marketing also now brands the product itself as "AI-native project
management" (source: [plane.so](https://plane.so) homepage copy) — noted as a
positioning claim, not independently verified against a specific in-product AI
feature in this pass.

---

## 2. Macro

**What Macro actually is** (established before assuming): Macro is not a task
tracker with docs bolted on — it is a unified team workspace that combines
email, chat/messages, documents, tasks, calls, and a CRM, all cross-linked
("@-linked") and backed by a shared, continuously synthesized team memory
available to agents. Source:
[github.com/macro-inc/macro README](https://github.com/macro-inc/macro);
[macro.com](https://macro.com/).

### Data model

Macro's core data model is a **bidirectional graph**: emails, tasks, and
documents hold native cross-references to each other rather than living in
separate silos. A heterogeneous, mixed-type feed called the "Soup" (rendered by
a `UnifiedListView` component, backed by a `DssSoupService`) combines emails,
messages, and tasks into one list. The `document_storage_service` (DSS) is the
central API gateway/orchestrator, talking to specialized services over REST,
gRPC, and Kafka (via `macro_event_broker`); a `graphql_soup` crate unifies
GraphQL access for the frontend. Documents use CRDTs (via a `sync-service`) for
real-time collaborative editing, with the README describing "swarms of agents
acting as peers" in that same CRDT collaboration model. Source:
[DeepWiki: macro-inc/macro](https://deepwiki.com/macro-inc/macro) (third-party
generated summary of the repo — treat as secondary, not primary, confirmation);
[github.com/macro-inc/macro README](https://github.com/macro-inc/macro).

**Tasks**: the product page states tasks have "instant access to email, chat,
and docs," are "keyboard-first, auto deduplicated, and closeable by agents."
Source: [macro.com](https://macro.com/). This is marketing copy, not a
documented schema — no task-state vocabulary (e.g. open/in-progress/done) was
found in any primary source in this pass; flagged as an open gap.

### Tasks and agents as symmetric principals

A merged PR,
[#6796 "feat(tasks): assign a task to an agent"](https://github.com/macro-inc/macro/pull/6796),
is concrete evidence (primary source: the repo itself) of how Macro's task model
treats agents: "Assignees are principals, so the same property now carries
agents beside people," using identifiers like `bot|<uuid>` for agents and
`macro|<email>` for people. Assigning an agent to a task causes an
`AgentAssignmentService` to post an automatic mention of that agent into the
task's discussion thread, and the existing `agent_trigger` authorization
pipeline (used for manual @-mentions) governs the agent's permissions — i.e. no
separate agent-specific auth path was added. This confirms tasks are first-class
discussion/comment spaces, not just status records, and that Macro's
architecture treats "who owns this" as a uniform principal type covering both
humans and agents. Source:
[macro-inc/macro PR #6796](https://github.com/macro-inc/macro/pull/6796).

A second related PR,
[#6793 "tell an agent what a comment is anchored to"](https://github.com/macro-inc/macro/pull/6793),
suggests comments (in tasks or documents) carry anchor/context metadata
specifically so an agent reading the thread knows what a comment refers to —
consistent with a design built for agents to participate in threads, not just
receive a final task description. Source: PR title/description only (not fully
read for implementation detail) —
[macro-inc/macro PR #6793](https://github.com/macro-inc/macro/pull/6793);
flagged as a lighter-confidence claim.

### Shared team memory

Macro's memory is "updated from team conversations, your DMs, your sent and
received emails, tasks created and completed, etc.," synthesized in one pass and
combined with prior memory to produce a new memory snapshot; that memory is
exposed to external agents via MCP as well as to any AI model connected to the
workspace (OpenAI, Google, Anthropic, etc.). This is explicitly team-scoped, not
per-user: "Agents remember what your whole team is doing across email, messages,
tasks, docs, and calls, not just your own chat history." Source:
[github.com/macro-inc/macro README](https://github.com/macro-inc/macro).

### Documents

Documents are CRDT-backed (via the sync-service, with Cloudflare Durable Objects
mentioned in Macro's own documents documentation per the DeepWiki summary) and
can be edited by agents whether open or closed in the client. Source:
[DeepWiki: macro-inc/macro](https://deepwiki.com/macro-inc/macro) (secondary).
No further primary-source detail on document types, states, or a documented
task↔document link schema (beyond the "@-linked" graph claim) was found in this
pass — flagged as an open gap.

### What's distinctive vs. Linear

Macro is not primarily a project-management tool with an issue hierarchy — it
has no documented epic/project/cycle vocabulary at all. Its distinctive move is
collapsing PM, docs, comms, and CRM into one graph with agents as first-class
participants (assignable principals, memory-aware, CRDT peers) rather than an
integration bolted onto a separate ticket system. This is a genuinely different
category from Plane/Linear, not a competitor on the same axis — treat
comparisons cautiously.

---

## 3. Comparison table

| Primitive     | Tool  | Nests under                                                                       | States / state vocabulary                                                       | What closes it                                     | Docs relationship                                                                     | Agent support                                                                                             |
| ------------- | ----- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Work item     | Plane | Project (optionally parented under another work item, cross-project)              | 5 state groups: Backlog, Unstarted, Started, Completed, Cancelled               | Moving to a state in the Completed group           | Work item pages link a work item to a wiki page; page text can convert to a work item | Read/write via MCP server; agents built on API/webhooks/signals                                           |
| Sub-work-item | Plane | A parent work item (any project)                                                  | Same 5 groups, own state                                                        | Same as work item                                  | Same                                                                                  | Same                                                                                                      |
| Epic          | Plane | Project; scoped into cycles/modules like any work item; rolls up into Initiatives | Work item type — same state groups, plus On Track/At Risk/Off Track "Updates"   | Reaching Completed group                           | Same page-linking as any work item                                                    | Same                                                                                                      |
| Module        | Plane | Project                                                                           | Progress derived from member work items' states (no state of its own confirmed) | Implicit — all members reach Completed             | Not confirmed                                                                         | Not confirmed                                                                                             |
| Cycle         | Plane | Project                                                                           | Time-boxed; progress derived from member states                                 | End of the timebox                                 | Not confirmed                                                                         | Not confirmed                                                                                             |
| Initiative    | Plane | Workspace (spans projects/epics)                                                  | Completion rolls up from work items → epics → initiative                        | All scoped work reaching Completed (rollup)        | Not confirmed                                                                         | Not confirmed                                                                                             |
| Page / Wiki   | Plane | Project (page) or Workspace (wiki)                                                | None documented (edit history tracked)                                          | N/A — a document, not a work unit                  | Is the doc layer itself; links to work items both ways                                | Not confirmed beyond general MCP access                                                                   |
| Intake item   | Plane | Project, pre-acceptance                                                           | Reserved `Triage` state, outside normal state groups                            | Acceptance moves it into the normal flow           | N/A                                                                                   | Not confirmed                                                                                             |
| Task          | Macro | Graph-linked to emails/docs/chat, not a folder hierarchy                          | Not documented in primary sources (product copy only: "closeable by agents")    | Unconfirmed — no documented "done" semantics found | Documents/tasks/email are peers in one bidirectional graph, `@`-linked                | Agents are assignable principals (`bot\|<uuid>`) alongside people; participate in task discussion threads |
| Document      | Macro | Same graph                                                                        | CRDT-backed; no state vocabulary found                                          | N/A                                                | Same graph; agents can edit open or closed docs                                       | Agents edit documents as CRDT peers                                                                       |

---

## 4. Sorting each primitive into entity / state / organisation-view

Per the coordinator's addition, this sorts every primitive above into one of
three layers, and flags where a tool blurs the line (treats a state as if it
were an entity, or a view as if it carried its own state).

**Plane**

- **Entity**: Work item (including epics and sub-work-items, since Epic is now
  just a work item type — one entity kind, not two). Project. Page/Wiki
  document. Initiative (has its own scope and progress, arguably an entity that
  aggregates a view over other entities — borderline). Intake submission (before
  acceptance, it is really a work item with a special state, not a separate
  entity — see below).
- **State**: the 5 state groups (Backlog, Unstarted, Started, Completed,
  Cancelled) and their per-project state instances (Todo, In Progress, Done,
  etc.) are fields on a work item. The reserved **Triage** state is the same
  kind of field, not a separate object — Plane's own docs stress it "doesn't
  appear in your project's state groups" and cannot be created via the API,
  which suggests Plane treats intake as a _quarantined state_ on the work item
  type, which is the right layer, though the fact that Intake gets its own
  top-level nav section and a dedicated API namespace (`intake/overview`) is
  Plane presenting a state as if it had entity-level standing in the UI. That is
  a case worth naming explicitly: **Plane blurs state into organisation by
  giving one state (Triage) its own surface**, even though structurally it is a
  work item state.
- **Organisation/view**: Cycle and Module are the clearest examples of a pure
  view/grouping layer — both are documented as deriving their progress from the
  states of the work items they contain, with no independent state vocabulary of
  their own found. They are lenses, not things that themselves move through
  backlog → done. Initiative is the ambiguous one: it "pulls in"
  projects/epics/work items as scope (a view), but also carries its own Overview
  with completion rollup and is treated in the UI as something you create, name,
  and track — closer to a lightweight entity that wraps a view than a pure
  filter. Worth flagging as the second blur point: **Plane presents Initiative
  as an entity, but its substance is entirely a view over other entities'
  states** — nothing about an initiative is not derivable from its scoped work
  items.

**Macro**

- **Entity**: Task, Document, Email, Message/Channel, Agent, Person — all are
  graph nodes with their own identity ("principals" is Macro's own word for the
  person/agent case specifically).
- **State**: task "closeable by agents" implies an open/closed field, but no
  documented state vocabulary beyond that was found (a real gap — flagged
  above). Documents don't appear to carry a state field at all in what was found
  (open/closed as used in "agents can edit documents that are open or closed"
  reads like an _editor UI_ state, not a document lifecycle state).
- **Organisation/view**: the "Soup" (`UnifiedListView` / `DssSoupService`) is
  explicitly a derived, heterogeneous feed over tasks/emails/messages — a view,
  not an entity, and Macro's own architecture treats it that way (a service that
  reads other entities, not a store of its own). The `@`-linking graph itself is
  best read as the _relation_ layer connecting entities, not a view — but it is
  what makes views like the Soup possible without a separate index. No case of
  Macro presenting a state or a view as a first-class entity was found in this
  pass, which is notable by contrast with Plane's Initiative — Macro's public
  material doesn't describe anything shaped like Plane's Initiative or Cycle.

**What this suggests for project-docs**: Plane's own design is not perfectly
clean on this axis — it has to reach for UI/API special-casing (Triage) or an
entity-shaped wrapper (Initiative) at exactly the two places where a pure
state/view split would otherwise feel too thin for a user to navigate by. If
project-docs adopts a strict three-layer split, those are the two spots to watch
for pressure to reintroduce a "special state with its own home" or an "entity
that's really just a saved view."

---

## 5. What translates to files

**Translates cleanly (no database required):**

- Work item states as **groups**, not just names — a `state: backlog` field plus
  a `state_group: backlog|unstarted|started|completed|cancelled` (or equivalent)
  convention is pure frontmatter, and gives a file-based system the same "only
  `completed`-group items count as done" rule Plane uses for rollups, without
  needing Plane's actual state group names. A file with a `state` field plus a
  small enum-to-group mapping table (maintained once, e.g. in SCHEMA.md)
  reproduces this exactly.
- Relations (blocks/blocked-by/duplicate/relates-to/implements) as frontmatter
  links (`blocks: [path]`, `duplicate_of: path`) — plain references, no join
  table needed.
- Sub-items via a `parent:` frontmatter field, including cross-"project"
  parenting (a task in one folder pointing at a parent in another) — trivial in
  files, whereas Plane needed to build this explicitly because its DB schema
  defaults to project-scoped containment. A file-based system gets this by
  default since files don't enforce containment.
- Pages/wiki-to-work-item linking — a doc frontmatter field or inline link
  referencing a work item path, and vice versa, is exactly what markdown already
  does well; Plane's "highlight text → convert to work item" is a UI affordance,
  not a data-model requirement.
- Intake/Triage as a reserved state value on the same entity type (not a
  separate folder) — this is the cleaner reading of Plane's own model once the
  UI special-casing is set aside (see section 4): one type, one state value that
  means "not yet accepted."
- Macro's agent-as-principal pattern (`bot|<uuid>` next to `macro|<email>`) maps
  directly to a frontmatter `assignee:` field whose value can be a human handle
  or an agent identifier under one vocabulary — cheap to copy and directly
  useful for an agent-first system that wants a person and an agent to be
  assignable the same way.

**Depends on a database (or would need to be faked/derived at read time):**

- Cycle/Module _progress percentages_, burndown, and "current cycle" queries —
  computable from files by an agent or script scanning frontmatter, but not free
  the way a DB aggregate is; this is a view that would need to be materialized
  (a generated report or a script output), not stored.
- Plane's Initiative rollup ("completion flows from work items to epics to
  initiatives, with every level updating the one above it") — a live,
  continuously-updated rollup is a database trigger pattern; a file-based system
  would compute this on demand (a script) rather than maintain it as stored
  state, which is arguably the more honest implementation of "this is just a
  view" per section 4.
- Macro's Soup (mixed-type feed) and bidirectional graph — a live, queryable
  graph index across emails/docs/tasks is exactly what a database is for; a file
  tree can approximate the _links_ (frontmatter references) but not a fast
  arbitrary query over them without building an index, which is what a future
  agent-built UI would need to construct at read time.
- Macro's CRDT-based multi-agent concurrent document editing — this is a
  real-time collaboration feature with no file-based equivalent; git's merge
  model is the closest analog but is not concurrent/live.
- MCP servers for both tools are themselves database-backed APIs; a file-based
  system's "MCP server" would be a thin read/write layer over the file tree
  rather than a wrapper over relational tables, which is an implementation
  difference worth naming but not a blocker.

---

## Sources Consulted

1. [github.com/makeplane/plane](https://github.com/makeplane/plane)
2. [plane.so](https://plane.so)
3. [Manage work items](https://docs.plane.so/core-concepts/issues/overview)
4. [Epics](https://docs.plane.so/core-concepts/issues/epics)
5. [Epics is becoming a work item type in Plane](https://plane.so/blog/epics-is-becoming-a-work-item-type-in-plane)
6. [Epics become a work item type, publish MCP apps (changelog)](https://plane.so/changelog/2026-05-31-epics-work-item-type-publish-mcp-apps)
7. [Work Item States](https://docs.plane.so/core-concepts/issues/states)
8. [Cycles](https://plane.so/cycles)
9. [Create and manage projects](https://docs.plane.so/core-concepts/projects/overview)
10. [Align multiple projects with Initiatives](https://docs.plane.so/core-concepts/projects/initiatives)
11. [Epics and Initiatives](https://plane.so/epics-initiatives)
12. [Pages for project documentation](https://docs.plane.so/core-concepts/pages/overview)
13. [Wiki for company-wide knowledge base](https://docs.plane.so/core-concepts/pages/wiki)
14. [Intake to collect and triage external work requests](https://docs.plane.so/core-concepts/intake)
15. [MCP server](https://developers.plane.so/dev-tools/mcp-server)
16. [Self-host the MCP server](https://developers.plane.so/dev-tools/mcp-server-self-host)
17. [Introducing MCP Connectors and Cursor agent](https://plane.so/blog/introducing-mcp-connectors-and-cursor-agent)
18. [github.com/makeplane/plane-mcp-server](https://github.com/makeplane/plane-mcp-server)
19. [github.com/macro-inc/macro](https://github.com/macro-inc/macro)
20. [macro.com](https://macro.com/)
21. [macro-inc/macro PR #6796 — assign a task to an agent](https://github.com/macro-inc/macro/pull/6796)
22. [macro-inc/macro PR #6793 — tell an agent what a comment is anchored to](https://github.com/macro-inc/macro/pull/6793)
23. [DeepWiki: macro-inc/macro](https://deepwiki.com/macro-inc/macro)
    (secondary, AI-generated repo summary — used only where no primary source
    was found, and flagged inline)

## Open Gaps

- **Plane modules and cycles**: the primary docs pages
  (`docs.plane.so/core-concepts/projects/*`, an equivalent for modules) 404'd on
  direct fetch during this pass; module/cycle descriptions above rely on
  search-engine summaries of those pages, not a direct read. Whether modules or
  cycles carry any state of their own (vs. being pure derived views) is
  unconfirmed — treated as "not confirmed" in the comparison table.
- **Plane "Teamspace"**: mentioned once, as a page-transfer destination
  alongside Project and Wiki, with no further documentation found defining what
  a Teamspace is or how it nests. Flagged, not resolved.
- **Plane milestones**: no distinct "milestone" object was found in the docs
  surfaced by this pass (Linear/GitLab have one; Plane's initiative-level
  "phases" language wasn't found for Plane specifically). Could be an absence,
  or just undiscovered in this pass.
- **Plane's Django models under `apps/api`**: not read directly (docs were
  sufficient); a source-code read would give exact field names/enums instead of
  docs-page paraphrase and is worth doing if a later pass needs exact schema
  fidelity.
- **Macro task state vocabulary**: no primary source (repo docs, help center)
  enumerating task states (open/in-progress/done, or similar) was found — only
  the product-page claim "closeable by agents." This is the single largest gap
  in the Macro section.
- **Macro document states/types**: no schema-level documentation found for
  document types or lifecycle states, only the CRDT/collaboration mechanism.
- **Macro DeepWiki reliance**: DeepWiki is a third-party AI-generated summary of
  the repository, not Macro's own documentation; claims sourced only to it (data
  model graph shape, service names, Kafka/GraphQL details) should be treated as
  secondary and re-verified against the actual repo if precision matters later.
- **Plane's "AI-native project management" positioning**: seen only as homepage
  marketing copy; not verified against a specific in-product AI/agent feature
  beyond the MCP server and webhook/signal-based agent building already cited.
