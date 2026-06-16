# Agent-Surface (Bun) Recipe — Evolve the Duplex Shape to Daemon + Thin-CLI

**Status:** Approved **Created:** 2026-06-16 **Author:** Cole Reed

---

## Overview

The `recipes/agent-surface-bun` recipe documents how to build a browser surface
an agent drives. Its **one-shot** shape is still accurate, but its
**duplex/streaming** shape documents the _previous generation_ of the agent
interface — `Bun.spawn` + JSON-lines stdio + an ephemeral surface. In the
standalone Spellbook repo, two heavily-iterated spells (**grapevine**,
**imago**) have independently converged on a newer "house pattern," and a third
(**bounty**) is mid-migration onto it. This project evolves the recipe's duplex
section into that pattern — a **persistent daemon holding canonical state,
driven by a stateless thin CLI** — while keeping the one-shot shape as-is.

This is the feedback loop the recipe itself anticipated: it ends with _"as
patterns improve in spellbook, fold the learnings back via a PR/issue."_ Issue
[#145] is that issue.

[#145]: https://github.com/ichabodcole/project-docs-scaffold-template/issues/145

## Problem Statement

The recipe points builders at a substrate the canonical implementations have
moved off of:

- **Wrong substrate as "the contract."** The recipe frames `Bun.spawn` +
  JSON-lines stdio as _the agent contract_. But `Bun.spawn` cannot detach a
  daemon that survives the CLI process — so it structurally can't express a
  standing surface. imago/grapevine/bounty all use `node:child_process` `spawn`
  with `detached: true` + `unref()`.
- **Wrong reference implementation.** The recipe names `bounty` as "the duplex
  reference — study and copy this." `bounty` is precisely the spell being
  migrated _off_ the old substrate; copying its pre-migration shape propagates
  the thing we're fixing.
- **Wrong persistence stance.** The recipe says the surface is ephemeral and
  durable state "belongs in the agent or a separate store." The house pattern
  deliberately persists canonical state _in the daemon_ (debounced snapshot +
  restore).
- **Missing the modern surface-tech ladder.** The recipe stops at vanilla inline
  JS and omits Bun's HTML-import bundler entirely.
- **Two real frame-design bugs undocumented.** Both were caught during the
  bounty migration's contract review and silently break agent coordination if
  unaddressed.

Who's affected: anyone using this recipe to build a standing, agent-driven,
persistent surface — they'll inherit a substrate that can't detach, a reference
that's mid-deprecation, and two latent SSE bugs.

## Proposed Solution

Present **two co-equal shapes** with neutral names — **one-shot** and
**standing** — and weight the **standing** shape as primary, since that's where
applications are trending (dynamic, real-time agent↔human back-and-forth). Keep
the **one-shot** section (the async "agent opens a surface, the user works it
and submits back" shape — digestify's model) essentially as-is; it's still the
right fit when the richer standing surface would be overkill. Rewrite the
**standing** section as the **daemon + thin-CLI** pattern, explicitly noting
stdio JSON-lines as the _prior generation_ (fine for the simplest streaming
cases, not for a standing, agent-driven, persistent surface). Add explicit
**"which shape when"** guidance so a builder can choose deliberately.

Use neutral "one-shot / standing" language, not spellbook's themed
"cantrip/conjuration" vocabulary — the theme fits _in_ spellbook but reads as
unexplained jargon to an agent consulting a general recipe.

### The evolved pattern

A standing surface the agent drives across a whole session:

- **Persistent daemon holds canonical state.** The agent runs a **stateless
  `cli.ts`** — one HTTP round-trip per verb, no long-lived agent-side process.
- **Write — `POST /cmd` with a `--stdin` body path.** Natural-language text is
  passed via stdin, never inlined into a shell-parsed argument string (fixes a
  real apostrophe/metacharacter quoting bug).
- **Read-back — `GET /state[?lean=1]`.** The agent confirms a command applied
  and discovers server-assigned ids — it is no longer write-only.
- **Live push — `GET /events?since=<id>` SSE tail**, wrapped by the agent's
  watcher/Monitor primitive. Monotonic ids + resume-from-cursor so a
  reconnecting agent loses nothing; a curated **wake-set** decides which events
  wake the agent versus which are simply read from `/state`.
- **Anti-flood stdio discipline.** Payload on **stdout**, liveness/echo on
  **stderr** (never `2>&1`); self-echo suppression; scoped/filtered reads. (This
  generalizes the exact fix shipped in grapevine V1.6.8 / issue #140.)
- **Persistence in the daemon.** Debounced snapshot + `open --restore` that
  merges the snapshot over current defaults (forward-compatible as state shape
  evolves).
- **Asymmetric transport by audience.** Browser ↔ daemon stays **WebSocket**
  (full-state broadcast); agent ↔ daemon is **HTTP**. Same daemon, two
  audiences, two transports.

### Specific changes to the recipe

1. **Substrate correction (most load-bearing).** Replace `Bun.spawn`-as-contract
   with `node:child_process` `spawn` (`detached: true` + `unref()`) for the
   daemon. Keep `Bun.serve` as the daemon's HTTP+WS server and `bun` as the
   runtime; the correction is specifically about _detaching a surviving daemon_,
   not abandoning Bun.
2. **Repoint reference implementations.** Canonical examples become **imago**
   (canonical-state daemon — richest worked example) and **grapevine** (cleanest
   agent CLI: `--stdin`, stdout/stderr discipline, SSE tail with resume); cite
   post-migration **bounty** as the worked duplex/board example. Keep the
   implementation-agnostic stance established in the 6/11 cleanup — reference
   these by name and role, no hardcoded spellbook file paths.
3. **Qualify the persistence claim.** Rewrite "the surface is ephemeral /
   persistence belongs elsewhere" to: the _one-shot_ surface is ephemeral; the
   _standing_ daemon owns canonical state with snapshot/restore.
4. **Add a surface-tech ladder:** vanilla inline JS → **Alpine-over-CDN** (no
   build) → **React via Bun's HTML-import bundler**. Name the ladder and the
   tradeoffs (the hard-won part: _when_ to climb a rung, and that the standing
   daemon makes a build step viable), but **don't reproduce Bun's HTML-import
   docs** — link to them and point at the imago surface as the worked example.
   This follows the "is the information easily reachable?" principle: capture
   non-obvious, hard-won patterns in the recipe; for anything already documented
   elsewhere, give an obvious next step (a link) rather than repeating it.
5. **Add two `/events`-frame gotchas:**
   - **(a) Envelope-id collision.** Building the SSE log as
     `{ id: ++seq, ...msg }` when payloads already carry a bare `id` (e.g. a
     task id) clobbers the cursor → resume silently breaks. Fix: the envelope
     `id` _is_ the monotonic cursor; rename the inner identifier (e.g. `taskId`)
     in agent-facing frames; keep the SSE frame shape separate from the
     WS/browser shape.
   - **(b) Every mutation must emit, with an actor tag.** The event log must
     carry _all_ state mutations — including agent `/cmd` writes, not only
     browser-origin actions — or agent-to-agent coordination (e.g. a lead
     assigning work via the CLI) is invisible to a scoped/`--owner` tail, which
     defeats per-owner subscriptions. Stamp `by: "user" | "agent" | "system"` on
     every frame so a tail can suppress self-echo and scope by owner. Self-echo
     suppression is therefore **load-bearing, not optional**.
6. ~~**Stale `tuskboard` branding** (line ~9).~~ ✅ Done ahead of this project
   in commit `87e54e3` (recipes 2.1.1).

## Scope

**In Scope (MVP):**

- Rewrite the duplex section of `RECIPE.md` into the daemon + thin-CLI pattern,
  including the architecture diagram(s), the HTTP/SSE/WS contract, and the
  anti-flood stdio discipline.
- Add the two `/events`-frame gotchas to the Gotchas section.
- Repoint the "Reference Implementations" section to imago + grapevine (+ bounty
  as worked example).
- Add the surface-tech ladder (vanilla → Alpine-CDN → React/Bun-HTML-import).
- Qualify the persistence and "ephemeral" claims.
- Keep the one-shot section as-is apart from light framing edits, and add a
  "which shape when" decision aid steering between one-shot and standing.
- `recipes` minor version bump (substantive guidance change); rebuild `dist/`.

**Out of Scope:**

- Hardcoding spellbook's internal file layout or URLs into the recipe — stay
  implementation-agnostic, per the 6/11 decision.
- Changing any spellbook code. This is recipe documentation only; the canonical
  implementations already exist and are the source of truth.
- Re-deriving or re-litigating the pattern. The issue is the spec; this project
  transcribes a converged, battle-tested pattern, it doesn't invent one.

**Future Considerations:**

- A standalone "daemon + thin-CLI" recipe if the pattern outgrows being one
  section of agent-surface-bun.
- Cross-linking from the toolbox/operator skills that already embody pieces of
  this (e.g. grapevine's SSE tail) once stable.

## Technical Approach

Documentation change to a single recipe file
(`plugins/recipes/skills/recipes/library/agent-surface-bun/RECIPE.md`) plus its
`dist/` mirror via `./scripts/build-skills-dist.sh`. The substance is faithful
transcription of the converged pattern from issue #145, with code snippets
illustrative (the gotchas especially benefit from before/after fragments). No
new plugin components; recipe count unchanged, so no manifesto-count edits —
only a `recipes` version bump and dist rebuild per the scaffold-update-checklist
"Adding or Modifying a Plugin Skill" path.

Notable dependency on existing project knowledge: the anti-flood stdio rule is
the same lesson as grapevine V1.6.8 (issue #140) — the recipe should state the
general rule and can note grapevine as the cleanest reference for it.

## Impact & Risks

**Benefits:** The recipe stops teaching a substrate the canonical spells have
abandoned; builders get the detach-capable daemon pattern, the modern
surface-tech ladder, and two hard-won frame-design gotchas before they hit them.

**Risks:**

- _Drift / accuracy._ The recipe describes a pattern that lives in another repo
  I can't pin to file paths. Mitigation: keep it implementation-agnostic
  (describe the contract, not the lines), cite spells by role, and lean on the
  issue as the authored spec.
- _Over-specification._ Risk of turning a recipe into a framework manual.
  Mitigation: keep the daemon contract crisp (verbs + frame shapes + the two
  gotchas); push exhaustive detail to the reference spells.

**Complexity:** Medium — the substance is settled; the work is careful technical
writing and accurate contract description.

## Resolved Decisions

Resolved with the author on approval (2026-06-16):

- **Two co-equal shapes, standing weighted primary.** Present **one-shot** and
  **standing** as co-equal, but give the **standing** (dynamic agent↔human
  back-and-forth) shape the most how-to depth — that's where applications are
  trending. Keep the **one-shot** async shape (digestify's model); it's still
  the right call when the standing surface would be overkill. Add explicit
  **"which shape when"** decision guidance.
- **Point to docs for documented tech; capture only hard-won patterns.** For the
  React/Bun-HTML-import rung, link to Bun's docs and cite the imago surface as
  the worked example rather than reproducing documented material. General
  principle (the HiveMind _"is the information easily reachable?"_ lens): the
  recipe earns its space on non-obvious, hard-won patterns we're actively
  recommending; anything already documented elsewhere gets an obvious next step
  (a link), not a copy.
- **Neutral vocabulary.** Use "one-shot / standing", not spellbook's
  "cantrip/conjuration". The theme is on-brand inside spellbook but reads as
  unexplained jargon to an agent consulting a general recipe.

## Success Criteria

- The duplex section describes the daemon + thin-CLI pattern with the full
  HTTP/SSE/WS contract and the `--stdin` write path.
- `node:child_process` detached-daemon guidance replaces
  `Bun.spawn`-as-contract.
- Both `/events`-frame gotchas are documented with fixes.
- Reference implementations point at imago + grapevine (+ bounty as example); no
  remaining "study and copy `bounty`" framing on the old substrate.
- Surface-tech ladder present, including Bun HTML-import bundling.
- One-shot section intact; `recipes` bumped (minor); `dist/` rebuilt;
  `format:check` passes.

---

**Related Documents:**

- [Issue #145][#145] — the authored spec this proposal transcribes
- Prior work: `docs/projects/spellbook-extraction-cleanup/` (the 6/11 extraction
  that made spellbook the source of truth and set the implementation-agnostic
  stance)
- Related lesson: grapevine V1.6.8 / issue #140 — the anti-flood stdout/stderr
  rule generalized here

---

## Notes

The line-9 branding fix (issue point 6) was committed ahead of this proposal as
a trivial standalone patch (`87e54e3`) so the stale name didn't sit on `develop`
while the larger evolution is planned. Everything else in #145 is in scope here
and should flow into a dev plan next.
