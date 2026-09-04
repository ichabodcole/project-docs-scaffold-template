---
type: report
title:
  "File-Based Work-Tracking Landscape: repo-native units, status vocabularies,
  and closure"
status: stable
generated: { by: unknown, at: 2026-09-03 }
---

# File-Based Work-Tracking Landscape: repo-native units, status vocabularies, and closure

> Correction (2026-09-03, verified against
> [okf/SPEC.md](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)):
> §7 below was read against OKF 0.1. The current spec is **0.2**: `type` is
> still the only required key; `status` is defined in §5.4 as
> `draft | stable | deprecated` (default `stable`); `generated: { by, at }`
> replaces 0.1's `timestamp` (§5.2); and §4.1 states "Producers MAY include any
> additional keys. Consumers SHOULD preserve unknown keys when round-tripping
> and MUST NOT reject documents with unrecognized fields." So a `lifecycle`
> field is a conformant extension, and the conclusion of §7 (that work-state
> vocabulary must be layered on locally) still holds — only the reason differs:
> OKF's `status` is about document trust, not work state.

---

Scope: how existing communities represent a "unit of work" as a file (or set of
files) in a git repo, what status vocabularies they use, how units
open/close/archive, and how grouping/nesting is expressed. Compiled for
evaluating a file-based "cycle" concept for a solo-dev + AI-agent repo
(`docs/projects/<name>/`, `docs/backlog/`, OKF frontmatter).

---

## 1. Large-project proposal/enhancement processes

### Rust RFCs

- Repo: `rust-lang/rfcs`, one Markdown file per RFC, PR-based.
- Lifecycle: proposal opened as PR → discussion → **Final Comment Period (FCP)**
  motioned by subteam → PR **merged** (= accepted) or **closed** (=
  rejected/withdrawn).
- Critically, "merged" only means the RFC text is accepted — **not that the
  feature is built**. On merge, a **separate tracking issue** is created in
  `rust-lang/rust` to track implementation progress, unresolved questions, and
  blockers. This tracking issue is the actual "in progress" state; the RFC file
  itself is inert once merged. Source: https://github.com/rust-lang/rfcs
- Confirmation of the "merged ≠ implemented" split and FCP mechanics:
  https://notes.iveselov.info/programming/checking-status-of-rust-features
- Walkthrough of proposal → RFC → tracking issue flow:
  https://rustc-dev-guide.rust-lang.org/walkthrough.html

### Kubernetes KEPs (Kubernetes Enhancement Proposals)

- Repo: `kubernetes/enhancements`, one folder per KEP:
  `keps/sig-<name>/<NNNN>-<short-title>/` containing a `kep.yaml` (structured
  metadata) plus `README.md` (prose). Nested subdirectories exist for sub-areas
  (e.g. `sig-cloud-provider/azure/`). Source (folder layout):
  https://github.com/kubernetes/enhancements/blob/master/keps/README.md,
  https://github.com/kubernetes/enhancements/blob/master/keps/sig-architecture/0000-kep-process/README.md
- `kep.yaml` **status** field vocabulary: `provisional`, `implementable`,
  `implemented`, `deferred`, `rejected`, `withdrawn`, `replaced`.
  - provisional = suggested, SIG agreed it's worth doing
  - implementable = approved to start work
  - implemented = done, frozen
  - deferred = suggested but not being worked right now
  - rejected = decided not to pursue
  - withdrawn = authors pulled it
  - replaced = superseded by a newer KEP Source:
    https://kodekloud.com/blog/kubernetes-keps/
- Separate **stage** field tracks target maturity per dev cycle: `alpha`,
  `beta`, `stable` — i.e. status (lifecycle) and stage (feature maturity) are
  tracked independently.
- Moving to `implementable` requires a completed Production Readiness Review.
  Source: https://kodekloud.com/blog/kubernetes-keps/

### Python PEPs

- Repo: `python/peps`, one file per PEP, flat list indexed by PEP 0.
- **Status** header vocabulary: `Draft`, `Active`, `Accepted`, `Provisional`,
  `Deferred`, `Rejected`, `Withdrawn`, `Final`, `Superseded`.
  - Draft = under active discussion/revision
  - Active = ongoing/continuously relevant (no "final" state applies, e.g.
    process PEPs)
  - Accepted = formally accepted but not yet built
  - Provisional = accepted into reference implementation but still revisable;
    can still be Rejected/Withdrawn even post-release
  - Final = accepted **and implementation complete**
  - Superseded = replaced by a later PEP Source:
    https://peps.python.org/pep-0001/
- This is the clearest "accepted but not built" vs "done" split in the set:
  **Accepted ≠ Final**; Final specifically requires implementation completion.

### Ember RFCs

- Repo: `emberjs/rfcs`. Ember explicitly modeled a multi-**stage** pipeline (not
  binary accepted/rejected) via RFC 0617 "RFC Stages": stages include (roughly)
  Proposed → Exploring → Accepted → Ready for Release → Released, plus terminal
  Recommended/Backlog states in later RFCs.
- "Accepted" = text finalized, FCP-to-accept passed, team believes it's ready
  for implementation, but **not yet built**.
- "Ready for Release" = implementation complete per the RFC's plan, in harmony
  with any Ember changes since, docs written; may still be behind a flag; team
  decides when to promote to stable.
- Each stage transition happens via **a new PR that changes the stage
  metadata**, gated by its own FCP; merging one stage-transition PR auto-opens
  the PR for the next stage. Source:
  https://rfcs.emberjs.com/id/0617-rfc-stages/,
  https://blog.emberjs.com/improved-rfc-process/

### Go proposals

- Repo: `golang/proposal`, tracked primarily via GitHub issue labels rather than
  in-file status fields: `Proposal` (under review) and `Proposal-Accepted`
  (decided). An issue closed **without** `Proposal-Accepted` = declined.
- Explicit "Likely Decline" holding state before final decline (one-week waiting
  period for objections) before moving to "Declined" column on the tracking
  board.
- On accept: label added, issue moved out of the `Proposal` milestone into a
  work milestone, and the same issue is **repurposed** to track implementation
  (no separate tracking issue, unlike Rust). Source:
  https://go.googlesource.com/proposal/+/c69968cf9f3547f276d07a78421bf153936238b2/README.md,
  https://research.swtch.com/proposals-clarity

### TC39 (ECMAScript proposals)

- Repo: `tc39/proposals`, index file listing proposals by stage; each proposal
  is its own repo/spec text, champion-owned.
- **Stage** vocabulary (0-4), each with entrance criteria:
  - Stage 0 Strawperson — any idea, no formal proposal yet
  - Stage 1 Proposal — formal problem statement + solution shape
  - Stage 2 Draft — formal spec language
  - Stage 3 Candidate — spec complete, needs implementation/user feedback
  - Stage 4 Finished — ready for inclusion in the standard
  - Ownership transfers from champion to editor group at Stage 4. Source:
    https://tc39.es/process-document/

**Takeaway across all six**: every large-project process separates "the decision
to do X" from "X is done," using either (a) a second artifact (tracking
issue/PR) or (b) an explicit intermediate status value
(`implementable`→`implemented`, `Accepted`→`Final`,
`Accepted`→`Ready for Release`). None of them conflate "merged proposal" with
"shipped."

---

## 2. Architecture Decision Records (ADRs)

- **Nygard format** (original, 2011): one file per decision, sections Title /
  Status / Context / Decision / Consequences. Status vocabulary: `proposed`,
  `accepted`, `deprecated`, `superseded`.
  - `deprecated` = no longer relevant, no direct replacement
  - `superseded` = replaced by a newer ADR; the **old ADR gets a forward link**
    ("Superseded by ADR-00xx") and the **new ADR gets a backward link**
    ("Supersedes ADR-00yy") Source:
    https://hidekazu-konishi.com/entry/architecture_decision_records_templates_and_operations.html,
    https://www.catio.tech/blog/architecture-decision-record
- Practical constraint noted by practitioners: `accepted` status should be
  treated as **immutable** once set — you don't edit an accepted decision, you
  write a new ADR that supersedes it. This is what keeps the log trustworthy as
  a append-mostly history. Source:
  https://hidekazu-konishi.com/entry/architecture_decision_records_templates_and_operations.html
- **MADR** (Markdown ADR) extends Nygard's format with Decision Drivers,
  Considered Options (with pros/cons per option), and a Confirmation section —
  heavier, best for genuinely contested decisions; considered overkill for
  routine ones. Source:
  https://hidekazu-konishi.com/entry/architecture_decision_records_templates_and_operations.html
- **Numbering / log convention**: ADRs are numbered sequentially (`0001-`,
  `0002-`...) and never renumbered or deleted — the directory is an append-only
  log, closer to a changelog than a mutable task list.
- **Tooling**:
  - `adr-tools` — bash CLI, creates the next numbered file from a template,
    auto-wires supersession links. Filesystem-numbering dependent.
  - `log4brains` — docs-as-code tool that turns an `doc/adr/` directory into a
    browsable static site with a timeline view; deliberately has **no required
    numbering scheme** (uses timestamp-based filenames) specifically to avoid
    git merge conflicts on sequential numbers. Source:
    https://adr.github.io/adr-tooling/,
    https://calcipy.kyleking.me/docs/adr-research/log4brains/

---

## 3. Git-native issue trackers

| Tool                              | Storage model                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Unit                             | States                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **git-bug**                       | Embeds issues/comments as git objects (not plain files) in the repo, replicated via `git push`/`pull`; CLI/TUI/web front ends.                                                                                                                                                                                                                                                                                                                                                         | Issue (bug)                      | Open/closed plus labels; comments as append-only event log. Source: https://github.com/git-bug/git-bug                                                                                                                                                                                                                                                |
| **git-issue** (community variant) | Issues stored as git commits under `refs/issues/` — explicitly modeled as an append-only event log, since git itself is a distributed append-only content-addressable database.                                                                                                                                                                                                                                                                                                        | Issue                            | Open/closed via commit trailers. Source: https://matej.ceplovi.cz/blog/current-state-of-the-distributed-issue-tracking.html                                                                                                                                                                                                                           |
| **ticgit / ticgit-ng**            | Plain text ticket files inside a dedicated orphan branch (`ticgit`/`ticgit-ng`) of the repo, kept separate from the working tree.                                                                                                                                                                                                                                                                                                                                                      | Ticket                           | Original ticgit: open / resolved / invalid / on-hold. ticgit-ng splits into **status** (open/closed) plus **state**: open states = new, assigned, in-progress, blocked, review; closed states = resolved, wontfix, duplicate, invalid. Source: https://github.com/schacon/ticgit, https://ticgit.dev/                                                 |
| **Fossil tickets**                | Built into the Fossil SCM itself (not plain git); tickets are versioned artifacts in the Fossil repository. Not deeply covered by search results this pass — flagged as a gap (see below).                                                                                                                                                                                                                                                                                             | Ticket                           | Not confirmed in this pass.                                                                                                                                                                                                                                                                                                                           |
| **Sourcehut todo.sr.ht**          | Hosted (not local git-file), but git-adjacent — tickets can be closed by `Fixes:` trailers in commit messages pushed to the linked repo.                                                                                                                                                                                                                                                                                                                                               | Ticket                           | Open, plus closed **resolutions**: `fixed`, `implemented`, `wont_fix`, `by_design`, `invalid`, `duplicate`, `not_our_bug`. Source: https://man.sr.ht/todo.sr.ht/index.md                                                                                                                                                                              |
| **Radicle issues (COBs)**         | "Collaborative Objects" stored directly in git's object database, synced peer-to-peer; works fully offline.                                                                                                                                                                                                                                                                                                                                                                            | Issue                            | Lifecycle actions: Comment, Edit, Label, Assign, Lifecycle(Open/Close) — binary open/closed plus label-based sub-states. Source: https://deepwiki.com/radicle-dev/heartwood/6.1-collaborative-objects-(cobs)                                                                                                                                          |
| **Jujutsu (jj)**                  | jj itself has no built-in issue tracker; it's a VCS. Notable 2025 integration: jj + Radicle used together for a branchless flow, with Radicle supplying the issue/patch layer on top of jj-managed history.                                                                                                                                                                                                                                                                            | N/A (jj is not an issue tracker) | Source: https://radicle.dev/2025/08/14/jujutsu-with-radicle                                                                                                                                                                                                                                                                                           |
| **beads (`bd`)**                  | Purpose-built in Oct 2025 by Steve Yegge specifically for AI coding agents. Backed by **Dolt** (a SQL database with git-like branch/merge semantics), travels with the repo; exports to JSONL for git-native diffing/review. Explicitly designed to solve agents' "50 First Dates" problem — no persistent memory of prior work across sessions. Graph-based: supports dependency edges between work items, not just a flat list. MIT-licensed, Go, ~18.7k GitHub stars by March 2026. | Work item / bead                 | Graph-based issue tracker; supports dependencies between items (task graph, not flat backlog). Exact status vocabulary not confirmed in this pass — flagged as gap. Source: https://tekai.dev/references/2026-04-03-beads-graph-issue-tracker-ai-agents, https://ianbull.com/posts/beads/, https://steve-yegge.medium.com/beads-blows-up-a0a61bb889b4 |

**Gaps**: Fossil's specific ticket status vocabulary and beads' exact status
enum were not confirmed with a primary source in this pass; would need a direct
fetch of Fossil docs / the beads README/schema to fill in precisely.

---

## 4. Handbook / docs-as-code organizations

### Oxide Computer RFDs (Requests for Discussion)

- Repo: `oxide-computer/rfd` (rendered at rfd.shared.oxide.computer), one
  Markdown/AsciiDoc file per RFD in a numbered folder, git history as the audit
  trail.
- **State** vocabulary (explicit, ordered): `prediscussion` → `ideation` →
  `discussion` → `published` → `committed`, with `abandoned` as a terminal
  off-ramp from any point.
  - prediscussion = "collaborative extension of an engineer's notebook" —
    pre-formal, still just notes
  - ideation = an early but clearly-scoped idea
  - discussion = actively being discussed in an open PR
  - published = discussion converged, PR about to merge — this is the "ready"
    resting state for most RFDs
  - committed = represents current organizational thinking/direction (a stronger
    claim than merely published)
  - abandoned = explicitly not pursued Source:
    https://rfd.shared.oxide.computer/rfd/0001,
    https://oxide.computer/blog/rfd-1-requests-for-discussion
- Notable design point: state is tracked **in the document's own metadata**, not
  via GitHub PR/issue state, and the state itself is meaningful editorial
  content (an RFD in `prediscussion` is treated very differently by readers than
  one in `committed`), i.e. status is a first-class signal about _how much
  weight to give the document_, not just a workflow checkbox.

### GitLab handbook / product process

- Handbook itself: `gitlab/handbook` repo rendered via Goldmark/CommonMark,
  docs-as-code (same repo/tooling as their product code). Source:
  https://handbook.gitlab.com/docs/markdown-guide/
- OKRs are modeled as a GitLab **work item type** (Objective/Key Result),
  historically mapped as Objective=epic, Key Result=child issues attached to
  that epic — i.e. grouping is expressed via the epic→issue parent/child
  relationship in their own issue tracker, not via folder structure in the
  handbook repo. Source: https://docs.gitlab.com/user/okrs/
- This is a hybrid: **handbook prose lives as docs-as-code, but the OKR/epic
  tracking itself lives in GitLab's own issue tracker**, not as separate
  markdown files — worth noting as a limit case (they didn't go full file-based
  for the tracking layer).

### Basecamp/37signals — Shape Up

- No public repo of Shape Up "cycle" artifacts was found (Shape Up is a book,
  not a docs-as-code system), but the artifact model is well-documented:
  - **Pitch** = the single document per candidate project: problem,
    appetite/constraints, solution sketch, rabbit holes, no-gos. This is the
    "proposal" analog.
  - **Betting table** = a recurring meeting during **cool-down** (2-week gap
    between six-week cycles) where pitches are selected ("bets") for the next
    cycle.
  - **Cycle** = the fixed 6-week window of committed, in-play work; explicitly
    **no backlog and no board** — work not bet on simply doesn't exist as an
    artifact until it's re-pitched. Source: https://37signals.com/06,
    https://www.process.st/shape-up-process/
- 37signals' own `basecamp/policies` and `basecamp/handbook` repos confirm they
  do run internal docs as public, versioned Markdown repos, but these searches
  didn't surface a specific "Shape Up cycle folder" convention inside a repo —
  likely because pitches/bets live in Basecamp the product, not in git. Flagged
  as a gap: no direct evidence of file-based cycle folders at 37signals. Source:
  https://github.com/basecamp/handbook, https://github.com/basecamp/policies

---

## 5. Personal knowledge / PARA-style systems

### Tiago Forte's PARA

- Four buckets: **Projects** (short-term, have a **deadline and a completion
  state** — they end when the goal is achieved), **Areas** (ongoing spheres of
  responsibility, a standard to maintain, never "finish"), **Resources** (topics
  of interest, no maintenance obligation), **Archives** (anything from the other
  three that's completed or inactive). Source:
  https://thomasjfrank.com/productivity/books/the-para-method-by-tiago-forte-summary-and-book-notes/
- The **Projects vs Areas boundary is explicitly the "has an end" test**: if a
  piece of work has a deadline/completion criterion, it's a Project; if it's an
  ongoing standard to maintain indefinitely, it's an Area. Areas can _spawn_
  projects (e.g. Area "Health" → Project "prepare for Ironman 2023"). Source:
  (Building a Second Brain summary)
  https://briansunter.com/building-a-second-brain (via search synthesis),
  https://thomasjfrank.com/productivity/books/the-para-method-by-tiago-forte-summary-and-book-notes/
- **Archiving discipline**: things move to Archive when completed or put on
  hold; PARA's ordering (P→A→R→A) is explicitly a **descending actionability
  gradient** — most of your time is spent in Projects, progressively less in
  Areas/Resources, Archive is inert storage. Recommended review cadence: weekly
  for Areas, monthly for Resources (Projects presumably reviewed
  more/continuously since they're active).
- Notes are expected to **flow between folders** as their status changes —
  pulled from Areas into a new Project, then pushed back to Areas (or to
  Archive) when the project closes. This is a live-migration model, not a fixed
  taxonomy per note.

### Johnny.Decimal

- Not project-lifecycle-oriented — it's a pure **addressing/findability**
  system, orthogonal to PARA's project/area distinction. Structure: max 10
  **Areas** (`10-19`, `20-29`...), each split into max 10 **Categories**, each
  holding up to 100 numbered **IDs** (`12.03`). Guarantees a fixed, predictable,
  shallow address for anything, but says nothing about status or lifecycle.
  Source: https://johnnydecimal.com/documentation/areas-and-categories
- Relevant as a **grouping/nesting convention** (fixed cardinality namespace)
  rather than a lifecycle model — could inform folder numbering for
  `docs/projects/` if that's ever a scaling concern, but doesn't address
  open/close semantics.

---

## 6. Diátaxis / docs lifecycle / cycle-log conventions

- **Diátaxis** (diataxis.fr) organizes documentation by reader need — tutorial /
  how-to / reference / explanation — not by lifecycle/status. No direct
  "ephemeral vs durable" terminology was found in Diátaxis's own materials in
  this pass; the framework is about _purpose_, not _freshness or in-play state_.
  Flagged as a gap relative to the specific ephemeral/durable question —
  Diátaxis is the wrong lens for that distinction; it doesn't model a document's
  lifecycle at all. Source: https://diataxis.fr/start-here/
- **Keep a Changelog**'s `Unreleased` section is the closest widely-adopted
  convention to an explicit **"in-play container"**: all merged-but-unreleased
  changes accumulate under a standing `## Unreleased` heading; at release time
  that heading is **renamed** to the version number + date, and a fresh empty
  `Unreleased` section is left at the top. This is a single-file,
  rename-to-close pattern (not move-to-archive). Source:
  https://keepachangelog.com/en/1.1.0/,
  https://github.com/olivierlacan/keep-a-changelog/blob/main/CHANGELOG.md
- **release-please** (and similar: git-cliff, changesets) automates exactly this
  transition — parses conventional commits since the last tag, generates the new
  dated section from what's accumulated in "unreleased" state, and cuts the
  release PR. Confirms the Unreleased-section pattern is production-proven as an
  automatable "cycle close" mechanism. Source:
  https://www.releasepad.io/blog/keep-a-changelog/
- **/now page** (Derek Sivers, 2015) — a single, deliberately transient page
  (`/now`) answering "what are you focused on right now"; the convention is that
  it's expected to be **stale and gets manually refreshed periodically**, unlike
  an "about" page. It's a personal, single-slot "what's currently in play"
  pointer rather than a structured folder/status system, but it's a direct
  real-world precedent for a single always-current "what's in the current cycle"
  pointer file. Source: https://sive.rs/nowff, https://sive.rs/now2

---

## 7. 2025-2026 writing on AI-agent-specific work-item/plan conventions

- **`AGENTS.md`**: emerging plain-Markdown convention for _persistent_, stable,
  repo-level agent instructions (analogous to a README aimed at an agent) —
  explicitly **not** meant to hold per-task/per-cycle state, only durable
  conventions. Source:
  https://promptessor.com/blog/best-agentsmd-examples-for-codex-cursor-and-ai-coding-agents-in-2026
- **Tool-specific plan directories**: an empirical study of 36,710 GitHub repos
  found Markdown plan files committed under tool-specific paths —
  `.claude/plans/*.md`, `.cursor/plans/*.md`, `.gemini/plans/*.md` — with 85
  such files found across 10 repos. Motivation cited: making the agent's
  implementation reasoning visible to human reviewers/collaborators alongside
  the resulting code, i.e. the plan file is committed as a durable rationale
  trail, not deleted after use. Source: https://arxiv.org/html/2608.04661
- **"planning-with-files"** (community skill/plugin, 2025-2026): crash-proof
  Markdown plan files designed explicitly for agent session recovery — persists
  plan state across `/clear` and context compaction, re-injects the plan every
  turn to fight context rot, and defines a "deterministic completion gate" (an
  explicit, checkable condition for when the plan/unit of work is considered
  done, rather than the agent self-reporting completion). Source:
  https://github.com/othmanadi/planning-with-files,
  https://thereisaskillforthat.com/skill/planning-with-files/
- **GitHub Spec Kit** (`github/spec-kit`, spec-driven development toolkit,
  2025-2026): scaffolds `.specify/` with templates for spec → technical plan →
  **tasks.md**. `tasks.md` is generated per-feature with: tasks grouped by user
  story, explicit dependency ordering (models before services before endpoints),
  `[P]` parallel-execution markers, exact file paths per task, and checkpoint
  validation gates between phases; task status is updated in place as work
  proceeds (not a separate open/close file move). Source:
  https://github.com/github/spec-kit,
  https://github.github.com/spec-kit/quickstart.html
- **beads** (see section 3) is the most directly relevant 2025-2026 precedent
  for an **agent-oriented, git-backed, graph-structured work-item system with
  explicit dependency edges** — worth treating as the primary comparison point
  for any bespoke "cycle" design, since it was built for exactly this use case
  (solo/small-team + AI agents needing durable, git-native memory of open work).
- **Open Knowledge Format (OKF)**, Google Cloud, published June 12 2026 —
  directly relevant since the user is about to adopt OKF frontmatter. Spec: a
  directory of Markdown files with YAML frontmatter; the _only_ required field
  per concept is `type`; recommended optional fields are `title`, `description`,
  `resource`, `tags`, `timestamp`. **OKF's base spec does not mandate a
  status/lifecycle field** — a `status` field (values like
  `draft | stable | deprecated`, plus a `stale_after` freshness parameter)
  appears only in secondary implementation guides as a _recommended extension_,
  not in the core spec. This means: OKF frontmatter alone won't give a "cycle"
  concept for free — any open/in-progress/closed/archived vocabulary needs to be
  layered on top as a project-specific convention, same as every other system
  surveyed here. Source:
  https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md,
  https://okf.md/spec/,
  https://www.marktechpost.com/2026/06/16/google-cloud-introduces-open-knowledge-format-okf-a-vendor-neutral-markdown-spec-for-giving-ai-agents-curated-context/

---

## Comparison table

| Source                                                          | Unit(s)                                                       | Status vocabulary                                                                                                                  | Grouping / nesting                                                                                          | What closes a unit                                                                       | Archive behaviour                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Rust RFCs**                                                   | RFC file + separate tracking issue                            | RFC: open PR / merged / closed. Tracking issue: open / closed (implementation done)                                                | Flat `text/` dir of RFC files; no sub-grouping                                                              | Tracking issue closed = feature shipped                                                  | Merged RFC files stay in place permanently (append-only log); no move                                               |
| **Kubernetes KEPs**                                             | One folder per KEP (`kep.yaml` + `README.md`)                 | `provisional, implementable, implemented, deferred, rejected, withdrawn, replaced` + independent `stage: alpha/beta/stable`        | `keps/sig-<name>/<NNNN>-<title>/`, nested for sub-areas                                                     | Status set to `implemented`                                                              | Folder stays; status field marks it inert, no physical move                                                         |
| **Python PEPs**                                                 | One file per PEP                                              | `Draft, Active, Accepted, Provisional, Deferred, Rejected, Withdrawn, Final, Superseded`                                           | Flat, indexed by PEP 0                                                                                      | Status → `Final` (accepted **and** implemented)                                          | File never moves; superseded PEPs get a forward pointer                                                             |
| **Ember RFCs**                                                  | One file per RFC, staged via metadata + follow-up PRs         | Stages incl. Proposed → Accepted → Ready for Release → Released (+ Recommended/Backlog off-ramps)                                  | Flat, numbered                                                                                              | Stage reaches Released                                                                   | File stays; stage field is the record                                                                               |
| **Go proposals**                                                | GitHub issue (proposal repo used for design docs when needed) | Labels: `Proposal`, `Proposal-Accepted`; unlabeled-and-closed = declined; "Likely Decline" holding state                           | Milestones (`Proposal` milestone → work milestone)                                                          | Issue repurposed/closed once shipped                                                     | N/A (issue-based, not file-based)                                                                                   |
| **TC39 proposals**                                              | One repo/spec per proposal, listed in index                   | Stage 0–4 (Strawperson→Proposal→Draft→Candidate→Finished)                                                                          | Flat list, categorized active/finished/stage-0 in separate index files                                      | Reaches Stage 4, ownership moves to editor group                                         | Finished proposals listed in a separate `finished-proposals.md`                                                     |
| **Oxide RFDs**                                                  | One file per RFD                                              | `prediscussion, ideation, discussion, published, committed, abandoned`                                                             | Flat numbered folders                                                                                       | Reaches `committed` (or is `abandoned`)                                                  | File stays; state field is the record, git history is the audit trail                                               |
| **ADRs (Nygard/MADR)**                                          | One file per decision                                         | `proposed, accepted, deprecated, superseded` (rejected sometimes added)                                                            | Flat, sequential-numbered log (`adr/0001-*.md`)                                                             | Status → `accepted` (decision made); later may go `deprecated`/`superseded`              | Never deleted/moved; append-only; superseded ADRs get forward/back links                                            |
| **git-bug / git-issue / Radicle COBs**                          | Issue object embedded in git                                  | Open / closed (+ labels)                                                                                                           | Repo-wide flat issue list, labels for grouping                                                              | Explicit close action                                                                    | No physical archive; closed issues remain queryable in the git object store                                         |
| **ticgit-ng**                                                   | Ticket file on orphan branch                                  | status: open/closed; state: new/assigned/in-progress/blocked/review (open) or resolved/wontfix/duplicate/invalid (closed)          | Flat within the `ticgit-ng` branch                                                                          | state moves to a closed-state value                                                      | Stays on the orphan branch, filterable by state                                                                     |
| **Sourcehut todo.sr.ht**                                        | Ticket (hosted)                                               | Open + closed resolutions: `fixed, implemented, wont_fix, by_design, invalid, duplicate, not_our_bug`                              | Per-repo tracker, labels                                                                                    | Any closed resolution set (often via commit `Fixes:` trailer)                            | N/A (hosted, not file-based)                                                                                        |
| **beads (`bd`)**                                                | Work item ("bead") in a Dolt DB, JSONL-exported               | Not fully confirmed this pass (graph-based; supports dependency edges between items)                                               | Dependency graph, not folders                                                                               | Not confirmed                                                                            | DB travels with repo via git-like Dolt semantics; JSONL export is the git-diffable artifact                         |
| **GitLab handbook OKRs**                                        | Work item (Objective/Key Result)                              | GitLab's own issue/epic state machine (not file-based)                                                                             | Epic (Objective) → child issues (Key Results)                                                               | Issue/epic closed                                                                        | N/A (tracked in-app, not in the handbook repo)                                                                      |
| **Shape Up (37signals)**                                        | Pitch (one doc per candidate project)                         | Implicit: pitched → bet (selected) → shipped; no formal status field, no backlog artifact at all                                   | None — deliberately no backlog/board; only what's bet on for the current 6-week cycle exists as active work | Cycle ends (6 weeks) or team declares it shipped                                         | Not bet on = doesn't persist as a tracked artifact; re-pitch from scratch if revisited                              |
| **PARA (Tiago Forte)**                                          | Project (folder/note collection)                              | Implicit binary: active vs. archived; no explicit status field, the "has a deadline/completion state" test decides Project vs Area | Projects / Areas / Resources / Archives, four top-level buckets; notes migrate between them                 | Goal achieved → move to Archive                                                          | Explicit `Archives` bucket; recommended periodic review (weekly Areas, monthly Resources) to catch what should move |
| **Johnny.Decimal**                                              | Any item (no lifecycle semantics)                             | None — pure addressing scheme                                                                                                      | Max-10 Areas → max-10 Categories → up-to-100 IDs                                                            | N/A                                                                                      | N/A                                                                                                                 |
| **Keep a Changelog**                                            | Changelog entry (line under a category)                       | Implicit: `Unreleased` (in-play) vs. dated version section (closed)                                                                | Categories (Added/Changed/Deprecated/Removed/Fixed/Security) within each version section                    | Version cut: `Unreleased` heading renamed to `vX.Y.Z - date`                             | Old version sections stay in the same file, in reverse-chronological order — no separate archive file               |
| **/now page**                                                   | Single page, one per person                                   | Implicit: current vs. stale (manually refreshed)                                                                                   | None — single slot                                                                                          | Manually overwritten with new content                                                    | No history kept by convention (though git would keep it if versioned)                                               |
| **AI-agent plan files (`.claude/plans/`, spec-kit `tasks.md`)** | Plan file / tasks.md per feature                              | Informal / tool-specific: task-level done markers, `[P]` parallel markers, checkpoint gates; spec-kit tracks task status in place  | Per-feature folder (spec-kit: spec → plan → tasks.md pipeline)                                              | Deterministic completion gate (planning-with-files) or all tasks in tasks.md marked done | Left in repo as rationale trail; not typically moved after completion                                               |
| **OKF (Google, 2026)**                                          | "Concept" markdown file with YAML frontmatter                 | Not in core spec; `status: draft/stable/deprecated` + `stale_after` seen only in secondary implementation guides                   | Directory of concept files; grouping mechanism not mandated by spec                                         | Not specified by core spec                                                               | Not specified by core spec                                                                                          |

---

## Notable gaps / needs-follow-up

- Fossil's native ticket status vocabulary was not directly confirmed (search
  results focused on Fossil-vs-git comparisons, not the ticket schema itself).
- beads' exact status enum (open/in-progress/blocked/closed or similar) wasn't
  confirmed from primary source; only its graph/dependency model and Dolt-backed
  storage were confirmed.
- Diátaxis has no explicit ephemeral-vs-durable lifecycle model — it answers a
  different question (documentation _type_, not document _status_) — so it's not
  a source of lifecycle vocabulary, just worth ruling out explicitly.
- No direct evidence found of 37signals using file-based/git-committed pitch or
  cycle folders internally (Shape Up artifacts appear to live in the Basecamp
  product, not in a docs-as-code repo).
