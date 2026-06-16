# Agent-Surface (Bun) Recipe Evolution — Implementation Plan

**Created:** 2026-06-16 **Related Proposal:** [proposal.md](./proposal.md)
**Status:** Draft

---

## Overview

This plan implements the [approved proposal](./proposal.md): evolving the
duplex/streaming half of the `agent-surface-bun` recipe into the converged
**daemon + thin-CLI** house pattern, while keeping the one-shot half essentially
as-is. The entire deliverable is a rewrite of a single documentation file —
`plugins/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md` — plus its
`dist/` mirror, a `recipes` minor version bump, and the standard
`format:check`/dist-rebuild gates from the scaffold-update-checklist's "Adding
or Modifying a Plugin Skill" path.

**There is no application code in this project.** The phases below are organized
by _which sections of the recipe to rewrite, in what order, and how to verify_,
not by software components. The canonical implementations (imago, grapevine,
bounty) already exist in the standalone spellbook repo and are the source of
truth; this project transcribes their converged contract into recipe prose. We
reference those spells **by name and role only** — no hardcoded spellbook file
paths, no invented internal layout, no fabricated URLs.

## Outcome & Success Criteria

**Definition of Done:**

- [ ] The recipe presents **two co-equal shapes named `one-shot` and
      `standing`** (neutral vocabulary — no "cantrip"/"conjuration"), with the
      **standing** shape carrying the most how-to depth and a "which shape when"
      decision aid.
- [ ] The standing section documents the **daemon + thin-CLI** contract:
      stateless `cli.ts`, `POST /cmd` with `--stdin` body, `GET /state[?lean=1]`
      read-back, `GET /events?since=<id>` SSE tail with monotonic cursor +
      resume, wake-set, and asymmetric transport (browser↔daemon WebSocket,
      agent↔daemon HTTP).
- [ ] **Substrate correction landed:** `node:child_process` `spawn` with
      `detached: true` + `unref()` replaces `Bun.spawn`-as-contract for the
      daemon; `Bun.serve` + the `bun` runtime are retained.
- [ ] Both `/events`-frame gotchas are in the Gotchas section with before/after
      fragments: (a) envelope-id collision; (b) every-mutation-must-emit with an
      actor tag (`by: "user" | "agent" | "system"`), with self-echo suppression
      stated as load-bearing.
- [ ] The surface-tech ladder (vanilla → Alpine-over-CDN → React via Bun
      HTML-import) is named with "when to climb a rung" tradeoffs, **linking**
      to Bun's docs and citing the imago surface rather than reproducing
      documented material.
- [ ] Reference Implementations point at **imago** (canonical-state daemon,
      richest example) + **grapevine** (cleanest agent CLI), with post-migration
      **bounty** as the worked board example; no "study and copy bounty" framing
      on the old substrate remains.
- [ ] The persistence/ephemeral claim is qualified: one-shot is ephemeral; the
      standing daemon owns canonical state via debounced snapshot + restore.
- [ ] The anti-flood stdout/stderr discipline is stated as a general rule,
      citing grapevine V1.6.8 / issue #140 as the cleanest reference.
- [ ] One-shot section reads intact end-to-end; `recipes` bumped 2.1.1 → 2.2.0;
      `dist/` rebuilt and matching; `npm run format:check` passes.

**Non-Goals:**

- Writing or changing any spellbook code, or any application code at all.
- Hardcoding spellbook file paths, internal layout, or URLs into the recipe.
- Re-deriving or re-litigating the pattern — it is settled; we transcribe it.
- The line-9 `tuskboard`→`bounty` branding fix — **already shipped** in commit
  `87e54e3` (recipes 2.1.1), out of scope here except as context.
- A standalone "daemon + thin-CLI" recipe (a future consideration, not now).

## Approach Summary

The work is a careful, section-by-section rewrite of one file. The sequence
below front-loads the structural reframe (so later sections have a stable
skeleton to slot into), then writes the new substance (the standing contract and
the gotchas), then does the lighter repointing edits, and finishes with the
mechanical version-bump + dist-rebuild + verification gate.

The **load-bearing change is the substrate correction** (Phase 3): the recipe
currently frames `Bun.spawn` + JSON-lines stdio as _the agent contract_, but
`Bun.spawn` structurally cannot detach a daemon that survives the CLI process,
so it cannot express a standing surface. Everything in the standing section
depends on getting this right.

Current → target, by recipe section:

| Section                        | Change                                                           |
| ------------------------------ | ---------------------------------------------------------------- |
| Purpose                        | Reframe duplex → one-shot/standing; keep agent-driven framing    |
| When to Use                    | Add "which shape when" decision aid (one-shot vs. standing)      |
| Technology Stack / "Why Bun"   | Correct the `Bun.spawn`-as-contract bullet; keep Bun.serve + bun |
| Architecture                   | Rewrite duplex variant as standing daemon + thin-CLI contract    |
| Build a New Surface            | Re-sequence steps for the standing shape (daemon + CLI verbs)    |
| Gotchas                        | Add the two `/events`-frame gotchas + substrate note             |
| Patterns Worth Reusing         | Add anti-flood stdio discipline; surface-tech ladder cross-link  |
| Reference Implementations      | Repoint to imago + grapevine (+ bounty as worked example)        |
| What This Recipe Doesn't Cover | Qualify the persistence/ephemeral claim                          |

## Hard Constraints (Non-Negotiable)

Carried verbatim from the proposal's **Resolved Decisions** and the issue spec.
Every phase below must honor these:

1. **Neutral vocabulary.** Two co-equal shapes named **one-shot** and
   **standing** — never spellbook's themed "cantrip"/"conjuration". The
   **standing** (daemon + thin-CLI) shape gets the most how-to depth; one-shot
   stays largely as-is. Include an explicit "which shape when" decision aid.
2. **Implementation-agnostic.** Reference the spells by **name and role only** —
   imago = canonical-state daemon (richest example), grapevine = cleanest agent
   CLI, bounty = worked board example (post-migration). No hardcoded spellbook
   file paths, no invented internal layout, no fabricated spellbook URL.
3. **Substrate correction.** `Bun.spawn`-as-contract → `node:child_process`
   `spawn` with `detached: true` + `unref()` for the daemon. Keep `Bun.serve` +
   the `bun` runtime otherwise — the correction is about _detaching a surviving
   daemon_, not abandoning Bun.
4. **Both `/events`-frame gotchas** (envelope-id collision; every-mutation-emits
   with actor tag) go in Gotchas with before/after fragments.
5. **Surface-tech ladder** names the rungs + the hard-won "when to climb a rung"
   tradeoffs, but **links** to Bun's HTML-import docs and cites the imago
   surface rather than reproducing documented material (the "is the information
   easily reachable?" principle).
6. **Anti-flood stdout/stderr discipline** is the same lesson as grapevine
   V1.6.8 / issue #140 — state the general rule, cite grapevine as the cleanest
   reference.

## Phases

### Phase 1: Restructure into one-shot / standing + "which shape when"

**Goal:** Establish the neutral two-shape skeleton so later phases have stable
sections to write into. One-shot content is preserved; the duplex framing is
renamed and reweighted toward standing.

**Key Changes:**

- **Purpose:** Reframe the "one-shot / duplex-streaming" framing into
  **one-shot** and **standing**. Keep the agent-driven, three-actor framing.
  Update the two-reference-implementation teaser (a one-shot doc-review surface;
  a standing board) without the old "duplex" word.
- **When to Use:** Add an explicit **"which shape when"** decision aid steering
  between one-shot (async open → user works it → submit ends it; digestify's
  model; right when a standing surface would be overkill) and standing (dynamic,
  real-time agent↔human back-and-forth across a whole session).
- Light edits only to the one-shot prose; do **not** rewrite the one-shot
  mechanics — they're still accurate.

**Validation:**

- [ ] The recipe names exactly two shapes: `one-shot` and `standing`. No
      occurrence of `duplex` as the canonical name, no `cantrip`/`conjuration`.
- [ ] A "which shape when" subsection exists and reads as a genuine decision
      aid.
- [ ] One-shot guidance still reads coherently and is substantively unchanged.

**Dependencies:** None. This is the skeleton.

---

### Phase 2: Write the standing daemon + thin-CLI contract

**Goal:** Replace the duplex/streaming Architecture variant with the full
standing **daemon + thin-CLI** contract — the new substance of the recipe.

**Key Changes (Architecture + Build a New Surface):**

- **Persistent daemon holds canonical state; the agent runs a stateless
  `cli.ts`** — one HTTP round-trip per verb, no long-lived agent-side process.
- **Write path — `POST /cmd` with a `--stdin` body.** Natural-language text is
  passed via stdin, never inlined into a shell-parsed argument string (this
  fixes a real apostrophe/metacharacter quoting bug — note it).
- **Read-back — `GET /state[?lean=1]`.** The agent confirms a command applied
  and discovers server-assigned ids; it is no longer write-only.
- **Live push — `GET /events?since=<id>` SSE tail**, wrapped by the agent's
  watcher/Monitor primitive: monotonic ids + resume-from-cursor so a
  reconnecting agent loses nothing; a curated **wake-set** decides which events
  wake the agent vs. which are simply read from `/state`.
- **Persistence in the daemon.** Debounced snapshot + `open --restore` that
  merges the snapshot over current defaults (forward-compatible as state shape
  evolves).
- **Asymmetric transport by audience.** Browser↔daemon stays **WebSocket**
  (full- state broadcast); agent↔daemon is **HTTP**. Same daemon, two
  audiences, two transports — redraw the architecture diagram to show this.
- Re-sequence "Build a New Surface" for the standing shape: start the daemon,
  define the command verbs + state shape + event-frame shapes, wire `Bun.serve`
  HTTP routes (`/cmd`, `/state`, `/events`) plus the `/ws` browser upgrade, then
  the thin `cli.ts` verbs.
- Explicitly note stdio JSON-lines as the **prior generation** — fine for the
  simplest streaming cases, not for a standing, agent-driven, persistent
  surface.

**Validation:**

- [ ] The standing section documents all four contract surfaces: `POST /cmd`
      (+`--stdin`), `GET /state[?lean=1]`, `GET /events?since=<id>` (monotonic +
      resume + wake-set), and the WS browser broadcast.
- [ ] The asymmetric-transport point (HTTP for agent, WS for browser) is
      explicit.
- [ ] Daemon-owned persistence (debounced snapshot + `--restore` merge) is
      stated.
- [ ] stdio JSON-lines is positioned as prior-generation, not removed wholesale.

**Dependencies:** Phase 1 (the standing section must exist to write into).

---

### Phase 3: Gotchas + substrate correction

**Goal:** Land the load-bearing substrate correction and the two hard-won
`/events`-frame gotchas with before/after fragments.

**Key Changes:**

- **Substrate correction (most load-bearing).** In the Technology Stack / "Why
  Bun" section, rewrite the `Bun.spawn` + JSON-lines-stdio-is-the-contract
  bullet: the daemon is launched with **`node:child_process` `spawn`** using
  `detached: true` + `unref()` so it survives the CLI process. Keep `Bun.serve`
  as the daemon's HTTP+WS server and `bun` as the runtime — the correction is
  specifically about detaching a surviving daemon, not abandoning Bun. Add a
  short note in Gotchas explaining _why_ `Bun.spawn` can't express a standing
  surface (it cannot detach a daemon that outlives the CLI).
- **Gotcha (a) — Envelope-id collision.** Building the SSE log as
  `{ id: ++seq, ...msg }` when payloads already carry a bare `id` (e.g. a task
  id) clobbers the cursor → resume silently breaks. Fix: the envelope `id` _is_
  the monotonic cursor; rename the inner identifier (e.g. `taskId`) in
  agent-facing frames; keep the SSE frame shape separate from the WS/browser
  shape. Include a before/after fragment.
- **Gotcha (b) — Every mutation must emit, with an actor tag.** The event log
  must carry _all_ state mutations — including agent `/cmd` writes, not only
  browser-origin actions — or agent-to-agent coordination (e.g. a lead assigning
  work via the CLI) is invisible to a scoped/`--owner` tail, defeating per-owner
  subscriptions. Stamp `by: "user" | "agent" | "system"` on every frame so a
  tail can suppress self-echo and scope by owner. State that self-echo
  suppression is therefore **load-bearing, not optional**. Include a
  before/after fragment.
- **Anti-flood stdio discipline** (Patterns Worth Reusing, or alongside the
  gotchas): payload on **stdout**, liveness/echo on **stderr** (never `2>&1`);
  self-echo suppression; scoped/filtered reads. State the general rule and note
  it generalizes the exact fix shipped in **grapevine V1.6.8 / issue #140** —
  cite grapevine as the cleanest reference, don't reproduce its internals.

**Validation:**

- [ ] No `Bun.spawn`-as-the-agent-contract framing remains; the daemon-launch
      guidance is `node:child_process` `spawn` + `detached:true` + `unref()`.
- [ ] `Bun.serve` and the `bun` runtime are still recommended (correction is
      scoped to daemon detachment only).
- [ ] Both gotchas are present with before/after fragments and explicit fixes.
- [ ] Anti-flood rule is stated generally and cites grapevine V1.6.8 / #140.

**Dependencies:** Phase 2 (the gotchas reference the `/events` and `/cmd`
contract defined there).

---

### Phase 4: Surface-tech ladder + reference-impl repoint + persistence qualification

**Goal:** The lighter repointing edits — add the surface-tech ladder, fix the
reference implementations, and qualify the persistence/ephemeral claims.

**Key Changes:**

- **Surface-tech ladder** (Patterns Worth Reusing or a new subsection):
  **vanilla inline JS → Alpine-over-CDN (no build) → React via Bun's HTML-import
  bundler.** Name the ladder and the hard-won tradeoffs — _when_ to climb a
  rung, and that the standing daemon makes a build step viable. **Do not
  reproduce Bun's HTML-import docs**: link to them and point at the imago
  surface as the worked example (the "is the information easily reachable?"
  principle — capture non-obvious hard-won patterns here; for documented
  material, give an obvious next step, a link).
- **Reference Implementations repoint.** Canonical examples become **imago**
  (canonical-state daemon — richest worked example) and **grapevine** (cleanest
  agent CLI: `--stdin`, stdout/stderr discipline, SSE tail with resume); cite
  post-migration **bounty** as the worked duplex/board example. Remove the
  "study and copy `bounty`" framing on the old substrate. Keep the
  implementation-agnostic stance from the 6/11 cleanup — by name and role, no
  hardcoded spellbook file paths.
- **Qualify the persistence claim** (What This Recipe Doesn't Cover): rewrite
  "the surface is ephemeral / persistence belongs elsewhere" to: the _one-shot_
  surface is ephemeral; the _standing_ daemon owns canonical state with
  snapshot/restore. The "rich UI frameworks / resist build steps" note should be
  reconciled with the ladder (build steps are viable for the standing shape).

**Validation:**

- [ ] The ladder names all three rungs with "when to climb" guidance and links
      to Bun docs + cites the imago surface (no reproduced Bun docs).
- [ ] Reference Implementations name imago + grapevine + bounty by role; no
      "copy bounty on the old substrate" framing; no hardcoded spellbook paths.
- [ ] The persistence/ephemeral claim is split one-shot vs. standing and is
      internally consistent with the ladder's build-step guidance.

**Dependencies:** Phases 2–3 (the ladder and persistence text reference the
standing daemon and the imago example established there).

---

### Phase 5: Version bump + dist rebuild + verification

**Goal:** Ship per the scaffold-update-checklist "Adding or Modifying a Plugin
Skill" path, and run the full verification gate.

**Key Changes:**

- `plugins/recipes/.claude-plugin/plugin.json`: bump version **2.1.1 → 2.2.0**
  (minor — substantive guidance change, per the semver convention: any change
  that alters agent/user behavior is a minor).
- Rebuild the dist mirror: `./scripts/build-skills-dist.sh`. The build cleans
  and regenerates, so
  `dist/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md` picks up the
  rewrite automatically; commit the updated `dist/` alongside source.
- Run `npm run format:check` (or `npx prettier --write` on changed files) and
  fix any wrapping drift.

**Note on the checklist:** the recipes plugin has **no `README.md`** and this is
a rewrite (recipe count unchanged), so the "update plugin README version
history" and "update manifesto count" steps from the generic skill-modification
checklist do **not** apply here — only the version bump, dist rebuild, and
format check do. Confirm this assumption holds before adding any
README/manifesto edits.

**Validation (verification gate):**

- [ ] `plugin.json` reads `2.2.0`.
- [ ] `./scripts/build-skills-dist.sh` exits clean and validation passes; the
      dist `RECIPE.md` byte-matches the source `RECIPE.md`.
- [ ] `npm run format:check` passes.
- [ ] **No leaked themed vocabulary:**
      `grep -ni 'cantrip\|conjuration' plugins/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md`
      returns nothing.
- [ ] **No hardcoded spellbook paths introduced:** grep the recipe for spellbook
      file-path patterns (e.g. `spellbook/`, `scripts/`, `.ts` references tied
      to spellbook layout) — only name/role mentions should remain.
- [ ] **Substrate sanity:** `grep -n 'Bun.spawn' RECIPE.md` shows no remaining
      "Bun.spawn is the agent contract" framing (incidental mentions, if any,
      are clearly historical/prior-generation).
- [ ] **Coherence read-through:** the recipe reads end-to-end — one-shot intact,
      standing section is the new substance, the two shapes are balanced.

**Dependencies:** Phases 1–4 (content complete before bumping/rebuilding).

## Key Risks & Mitigations

- **Drift / accuracy — the pattern lives in another repo we can't pin to file
  paths.** → Keep it implementation-agnostic: describe the contract (verbs +
  frame shapes + the two gotchas), cite spells by role, and lean on issue #145
  as the authored spec. Never invent spellbook's internal layout or a URL.
- **Over-specification — turning a recipe into a framework manual.** → Keep the
  daemon contract crisp; push exhaustive detail to the reference spells. For
  documented tech (Bun HTML-import), link rather than reproduce.
- **One-shot regression — accidentally rewriting still-correct one-shot prose.**
  → Phase 1 only reframes/reweights one-shot; the coherence read-through in
  Phase 5 explicitly checks one-shot reads intact.
- **Dist drift — forgetting to rebuild or committing a stale mirror.** → Phase 5
  rebuilds via the build script and asserts dist matches source as a gate.
- **Vocabulary leak — themed words slipping in from the spellbook mental
  model.** → Phase 5 greps for `cantrip`/`conjuration` as a hard gate.

## Testing & Validation Strategy

This is a documentation change, so "testing" is the verification gate in Phase 5
plus the per-phase coherence checks:

- **Automated gates:** `./scripts/build-skills-dist.sh` (clean build + skill
  validation + dist-matches-source), `npm run format:check` (Prettier).
- **Grep gates:** no `cantrip`/`conjuration`; no hardcoded spellbook paths; no
  surviving `Bun.spawn`-as-contract framing.
- **Manual coherence read:** the recipe reads end-to-end with one-shot intact
  and the standing section as the new substance; the two shapes feel co-equal
  with standing carrying the depth; every cross-reference (Bun docs, grapevine
  #140, imago/grapevine/bounty roles) is by-link or by-role, never by hardcoded
  path.
- **Success-criteria checklist:** walk the proposal's Success Criteria and this
  plan's Definition of Done line-by-line before marking the plan Completed.

## Assumptions & Constraints

**Assumptions:**

- The recipes plugin has no `README.md` and no recipe-count entry that changes
  (rewrite, not addition), so the README-version-history and manifesto-count
  steps of the generic checklist don't apply. Verify before adding such edits.
- `./scripts/build-skills-dist.sh` regenerates the `agent-surface-bun` dist
  mirror from source (confirmed:
  `dist/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md` exists
  today).
- The converged pattern in issue #145 is the spec; this project transcribes it
  and does not re-derive it.

**Constraints:**

- Single-file source change (`RECIPE.md`) plus its dist mirror, `plugin.json`
  version, and nothing else.
- Implementation-agnostic: spells referenced by name/role only.
- `recipes` version bump is **minor** (2.1.1 → 2.2.0); use a `feat(recipes)`
  commit.

## Open Questions

- **Exact placement of the anti-flood discipline** — its own subsection in
  "Patterns Worth Reusing" vs. folded next to the `/events` gotchas. Decide
  during the Phase 3 write for the cleanest read; either satisfies the
  constraint.
- **How much of the prior-generation stdio model to retain** — keep a short "if
  you only need the simplest streaming case" pointer vs. drop it entirely. Lean
  toward a brief retention so the simplest case still has guidance.

---

**Related Documents:**

- [Proposal](./proposal.md)
- Issue #145 — the authored spec the proposal transcribes
- Prior work: `docs/projects/spellbook-extraction-cleanup/` — the 6/11
  extraction that made spellbook the source of truth and set the
  implementation-agnostic stance
- Related lesson: grapevine V1.6.8 / issue #140 — the anti-flood stdout/stderr
  rule generalized here
- [Sessions](./sessions/) (created during implementation)

---

## Implementation Notes

- The line-9 `tuskboard`→`bounty` branding fix shipped ahead of this project in
  commit `87e54e3` (recipes 2.1.1); it is context only, not work to redo.
- Target file:
  `plugins/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md`.
- Dist mirror (regenerated, not hand-edited):
  `dist/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md`.
- Version file: `plugins/recipes/.claude-plugin/plugin.json` (2.1.1 → 2.2.0).
