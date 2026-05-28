# Toolbox Migration — Splitting the Interactive Suite into Its Own Repo

**Status:** Draft (light proposal — scoping/exploratory) **Created:** 2026-05-27
**Author:** Cole

---

## Overview

The toolbox plugin family — grapevine, magpie, tuskboard, digestify, and
adjacent tools — has grown into a coherent suite with its own design language,
audience, and lifecycle. It currently lives inside the
project-docs-scaffold-template repo as a sibling marketplace plugin, but the
signal is growing that it wants to be its own thing.

This is a light proposal capturing the signal, the rationale, and the questions
that need answering before pulling the trigger. **Not a committed migration plan
yet** — explicit scoping document. Timing is likely post-V1.7-of-grapevine.

## Problem Statement / Signal

Two halves of the current repo serve different value props:

- **project-docs proper** — documentation methodology for software projects.
  Cookiecutter template + skills that augment it (create-project,
  generate-dev-plan, investigation-methodology, idea-to-spec, finalize-branch,
  etc.). Audience: people who want better project documentation conventions.
- **Toolbox-as-suite (interactive dynamic family)** — surfaces for agent
  collaboration and agent↔human work. Grapevine, magpie, tuskboard, digestify,
  html-mockup-prototyping. Audience: people who want richer multi-agent /
  agent↔human tooling.

They share a repo and a marketplace mechanism but not a thesis. Today's
recursive moment: `docs/projects/grapevine-v1.6/proposal.md` lives inside a repo
whose primary purpose is scaffolding _other_ projects' docs structure. Grapevine
IS using project-docs conventions, but it's a _user_ of those conventions, not
part of them.

The toolbox suite has accumulated its own:

- **Design language.** The Bun-powered mini-UI pattern (see the
  `agent-surface-bun` recipe), the per-skill HTML watch surfaces, the
  channel/board metaphors.
- **Versioning cadence.** Grapevine has had three versions (V1.5, V1.6, V1.6.1)
  in the span of weeks; each release shipped behavioral changes independent of
  project-docs proper.
- **Project-docs structure for its own work.** Grapevine has `proposal`, `plan`,
  `backlog`, `sessions` folders in `docs/projects/` — nested inside the
  project-docs repo that defines that structure.
- **Audience overlap but not identity** with project-docs users. Some overlap
  (agents and operators who use both), but they're distinct audiences with
  distinct intents.

## Proposed Direction (sketch)

**Spin the toolbox suite out into its own repo and marketplace.** Keep
project-docs focused on its documentation methodology mission.

What likely moves to the new repo:

- The "dynamic interactive surface" family: grapevine, magpie, tuskboard,
  digestify
- Their `agent-surface-bun` recipe heritage
- Possibly html-mockup-prototyping (depending on whether it fits the
  agent-surface theme or stays as a project-docs design aid)

What likely stays in project-docs:

- The cookiecutter template
- Methodology skills (create-project, generate-dev-plan,
  investigation-methodology, idea-to-spec, finalize-branch, generate-spec, etc.)
- Project-docs-specific skills (update-project-docs, scaffold-update-checklist)

What's uncertain (deserves a decision before migration):

- Utility skills currently in toolbox: `screenshot-optimization`,
  `maestro-testing`. These aren't agent-surface tools — they're developer
  utilities. Could stay in project-docs as dev tooling, move to the new repo
  just because they were under "toolbox," or live in a third "utilities" repo.
- html-mockup-prototyping: design exploration tool. Borderline — feels
  agent-surface-y (single-page interactive HTML), but its primary user is a
  designer/PM, not a multi-agent system.

## Scope

**In Scope of THIS proposal:**

- Capturing the signal that the split is wanted
- Sketching the rationale
- Listing the questions that need answers before migration
- Identifying timing constraints (likely post-V1.7-of-grapevine)

**Out of Scope of THIS proposal (deferred to plan):**

- Mechanical migration steps
- New repo bootstrap details
- Marketplace coordination
- Backwards-compat strategy for existing users
- The actual split itself

This proposal exists to **collect signal** until the decision is ready. When the
decision is made, a plan picks up from here.

## Open Questions

### Identity & Naming

- **New repo name?** Some candidates:
  - `agent-surfaces` — describes the family precisely (per the
    `agent-surface-bun` recipe name); slightly technical
  - `toolbox` — promote the current plugin name to the repo level; simple but
    underspecified
  - Something evocative — `loom`, `meadow`, `lattice`, `parlour`, `commons` —
    captures the "shared space for tools and agents" vibe
- **Marketplace identity.** Same name as the repo? Different?
- **Does the marketplace include all skills or curate by category?** Single
  marketplace serving everything vs. multiple for distinct audiences.

### Scope of the Migration

- **Which skills move?** The interactive surface family is clear (grapevine,
  magpie, tuskboard, digestify). The borderline cases (html-mockup-prototyping,
  screenshot-optimization, maestro-testing) need decisions.
- **What about agent-surface-bun (the recipe)?** Lives in recipes/ today.
  Migrate alongside, or stay in this repo as a methodology artifact?
- **What about the grapevine V1.5–V1.7 project docs themselves?** Migrate to the
  new repo so the trail stays with the code? Or leave them as project-docs
  archaeology and start fresh in the new repo?

### Methodology Coupling

- **Does the new repo adopt project-docs conventions as a pattern, or install
  project-docs as a dependency?** I.e. does the new repo have its own
  `docs/projects/<feature>/proposal.md` structure (because the convention is
  good), or does it formally consume project-docs as a template?
- **How do cross-repo references work?** Today an agent invokes the grapevine
  skill and may also use project-docs skills in the same session. After the
  split, both plugins coexist in a Claude Code install with no issue, but the
  docs trail for cross-cutting improvements becomes ambiguous.

### Mechanics

- **Marketplace coordination.** New repo means a new `marketplace.json` entry.
  Users currently install via the project-docs marketplace. Do we maintain both
  for a deprecation window, or hard-cut?
- **Existing cache pinning.** Sessions opened before the migration will still
  resolve to the old paths (the cache-pinning issue we just surfaced with V1.6).
  Plan needs to account for the migration day's user experience.
- **Release-please / versioning.** Today release-please runs over the whole
  repo. New repo gets its own. Coordination concerns?

### Timing

- **Post-V1.7-of-grapevine** is the working assumption. Reasons:
  - V1.7 is participation-primitives — a real release that shouldn't be
    disrupted by a repo move.
  - By then, the toolbox suite will have settled identities for its skills
    (grapevine V1.7, tuskboard shipped, digestify shipped, magpie shipped) —
    less moving while the move happens.
- **Are there forcing functions that would move it sooner or push it later?**
  None obvious today. Could be moved sooner if the nesting gets in the way of
  V1.7 work; could be pushed later if other priorities surface.

## Impact & Risks

**Benefits:**

- Cleaner project-docs identity (back to "documentation methodology")
- Cleaner toolbox identity (focused suite with its own design language)
- Independent versioning cadences
- Easier onboarding for users who want one or the other
- Removes the recursive-nesting weirdness of using project-docs conventions to
  track project-docs methodology AND a separate suite

**Risks:**

- **Maintenance overhead.** Two repos, two release pipelines, two issue
  trackers. Real cost.
- **Discovery loss.** Users who find one might miss the other. Mitigation:
  cross-reference in READMEs, possibly maintain a meta-list.
- **Migration-day disruption.** Existing users with cached plugins will have
  stale paths. Need a clear "if you have the old plugin, do X" story.
- **Convention drift.** Two repos doing their own version of "how we manage
  projects" risks divergence. Mitigation: explicitly adopt project-docs
  conventions in the new repo (whether as a dependency or as a pattern), keep
  the new repo's docs/projects/ structure aligned.

## Notes

- This proposal stays in **Draft** while we collect more signal. Update as more
  nesting moments hit, naming candidates surface, or scope questions resolve.
- When ready to commit, this graduates to a plan.md (migration steps) and the
  status moves to Approved.
- Don't pull the trigger before V1.7-of-grapevine ships, absent a forcing
  function. Reason: scope discipline and minimizing concurrent moving pieces.

---

**Related Documents:**

- [PROJECT_MANIFESTO](../../PROJECT_MANIFESTO.md)
- [Grapevine V1.5 proposal](../grapevine/proposal.md)
- [Grapevine V1.7 proposal](../grapevine-v1.7/proposal.md) — pre-migration
  release
- [Grapevine backlog](../grapevine-backlog/backlog.md) — for context on the
  operator/facilitation/participation framing

---

## Design language consideration — companion-app pattern (surfaces)

_Captured here because it's likely to shape what the spun-out suite becomes, not
just where it lives._

A pattern is emerging across the toolbox suite: each tool tends to have
**multiple surfaces serving different audiences with overlapping but distinct
ergonomic needs**:

- **Agent surface** — the skill + its scripts. Tuned for agents invoking via
  paths the skill provides. Always present, always the primary mechanism.
- **Human visual surface** — the watch HTML (grapevine), the drag-and-drop board
  (tuskboard), the inline-answers document (digestify). Tuned for a human at a
  browser tab.
- **Human CLI surface** — a standalone `grapevine` / `tuskboard` / `digestify`
  CLI installable on PATH. Doesn't exist yet. Would be tuned for a human at a
  terminal who wants to check state, run admin verbs, or invoke the tool outside
  a Claude Code session.

The three surfaces share data and primitives but have different ergonomic
constraints:

- Agent surface: verbose paths OK, JSON output expected, predictable flag
  parsing required.
- Visual surface: rich rendering, distinct affordances per kind, minimal text.
- CLI surface: terse commands (`grapevine doctor`, not
  `bun ${LONG_PATH}/cli.ts doctor`), human-readable output by default with
  `--json` for piping.

The overlap is where it gets interesting. Operator-style verbs (`doctor`,
`version`, `info`, `stop`, `list`) are useful to ALL three audiences and should
feel native to each. Agent-style verbs (`tail` wrapped with Monitor, `wait` in
loops) are mostly agent-only — a CLI version exists but is rarely the right tool
for a human.

**Implication for the migration:** the new repo's design should make room for
the multi-surface model from day one. Specifically:

- The skill stays the primary distribution mechanism, but
- The same source-of-truth scripts should be repackageable as standalone CLIs
  (`npm i -g grapevine-cli`, etc.), and
- The visual surfaces (watch HTML for grapevine, the board for tuskboard) should
  also be invocable from the standalone CLI (`grapevine watch` opens the browser
  tab, same as `cli.ts watch`).

This isn't a blocker for the spinout — the current shape works. But the spinout
is a good moment to commit to the multi-surface model as the design language of
the suite, rather than treating the in-skill CLI as the only surface.

Concrete first-step:
[Standalone grapevine CLI for humans in the grapevine-backlog](../grapevine-backlog/backlog.md).
Likely lands after V1.7 + the spinout.

---

## Signal Log

A running log of moments where the current arrangement felt cramped or mis-fit.
Add entries as they happen — each is evidence for the migration decision.

- **2026-05-27 — Grapevine V1.6/V1.7 session.** Recursive moment: shipping a
  V1.6 release of grapevine, scaffolding V1.7, and managing a feature backlog —
  all using `docs/projects/grapevine-*` structure inside a repo whose primary
  purpose is scaffolding _other_ projects' doc structure. Project-docs has
  become both the methodology AND a user of the methodology, which works but
  feels nested. First articulation of the migration signal by Cole.

- **2026-05-27 (later same day) — Companion-CLI signal.** Talking through the
  V1.6.5 rollover, Cole articulated a pattern: every toolbox tool has an agent
  surface (skill + scripts) and a human surface (watch HTML / board / etc.), but
  the operator-style verbs really want a third surface — a standalone CLI
  installable on PATH. Captured as
  [design language consideration above](#design-language-consideration--companion-app-pattern-surfaces).
  Reinforces the spinout case: a dedicated repo can commit to the multi-surface
  model from day one in a way that a marketplace-plugin in this repo can't
  easily.
