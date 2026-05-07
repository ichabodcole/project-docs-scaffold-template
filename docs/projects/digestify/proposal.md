# Digestify

**Status:** Approved (in flight) **Created:** 2026-05-07 **Author:** Cole Reed

---

## Overview

Digestify is a one-shot browser review tool, shipped as a skill in the `toolbox`
plugin. The agent writes a markdown document with embedded `:::question` fences,
runs a Python script that opens the user's browser to a local rendered view, and
blocks until the user submits a JSON response with their answers and any
anchored inline comments.

This project folder exists as a historical reference for the design,
implementation, branding, and theming of the tool. The core skill landed on the
branch `feat/toolbox-doc-review-skill` (renamed inline to digestify); theming
support is being added in parallel by another agent.

## Problem Statement

When working with terminal-based coding agents (Claude Code, Codex CLI), longer
Q&A interactions hit a wall. Terminals don't render multi-paragraph content
well, and the user has no native way to leave inline reactions on a long
synthesis the agent produces. Existing workarounds are slow and lossy: agents
dump raw markdown into the terminal (hard to read), or write a `.md` file the
user opens elsewhere and pastes back (high friction, multiple artifacts), or ask
one question at a time (slow when the agent has a coherent batch of questions).

This pain shows up across several distinct shapes:

- Wrapping up a long terminal Q&A with a recap and outstanding decisions.
- Processing a user's brain-dump (rough notes, voice transcript) and asking what
  was unclear.
- Reading a doc on the user's behalf and returning a summary plus questions.
- Recapping multi-agent collaboration so the user can step back in.

All of these share the same underlying need: substantive synthesis the user
should read carefully, paired with specific questions only they can answer, and
a single round of response that closes the loop.

## Proposed Solution

A skill in the `toolbox` plugin called **Digestify**. The agent invokes a Python
script (`review.py`) that:

1. Parses pandoc-style `:::question id=foo` fences out of stdin/file markdown.
2. Spins up a loopback HTTP server, opens the browser to a local URL.
3. Renders the markdown via marked.js + DOMPurify in a clean, focused page, with
   question textareas inline and a text-selection comment flow.
4. **Blocks** until the user submits, cancels, or a timeout elapses.
5. Prints `{answers, comments, submitted_at}` JSON to stdout and exits with a
   contract-defined code (0/2/124/130).

The agent gets a structured response in the same turn — no second-turn polling,
no "ping me when you're done" ritual, no leftover artifacts.

The tool has a memorable, low-collision name (Digestify) so the user can opt-in
explicitly: _"digestify this for me"_. Two trigger modes are baked into the
skill description:

- **Explicit** — user says the magic word; agent fires immediately.
- **Suggested** — agent senses the situation fits but the user hasn't said the
  word; agent proposes the tool first ("Want me to digestify this?") and fires
  only on agreement.

## Scope

**In Scope (shipped on `feat/toolbox-doc-review-skill`):**

- `:::question` fence parser with id validation (unique, non-empty body).
- Local HTTP server with `/`, `/submit`, `/cancel` routes.
- Blocking server runner with timeout/cancel semantics and exit codes.
- CLI with `--file`, `--title`, `--timeout`, `--no-open`, `--port`, `--host`.
- Browser UI: rendered markdown, syntax-highlighted code, question cards,
  text-selection inline comments, refresh-safe unload semantics.
- DOMPurify sanitization on all marked output before `innerHTML` assignment.
- 30 unit tests covering parser, payload, handler (incl. HTML/JSON escaping and
  asset path-traversal), server, and CLI.
- Skill documentation with two-trigger-mode framing and feedback channel
  pointing at `project-docs:report-issue`.

**In Scope (in flight, separate agent):**

- Theming support and a set of opinionated themes for the rendered page.

**Out of Scope (deferred):**

- Multi-page / stepped review flows.
- Multiple-choice or other structured question types beyond free-text.
- Post-submit summary screen.
- Offline mode (CDN-vendored libraries).
- MCP server wrapper.
- Persistent session storage / multi-turn iterative review.

## Technical Approach

The script is a single-file Python stdlib program (~250 LOC) — no pip
dependencies, no virtualenv, no install step. The HTML page is a single file
loading marked.js, DOMPurify, and highlight.js from CDN, with vanilla JS for the
question cards and inline comment flow.

Architectural choice worth flagging: this is intentionally **not** the
visual-companion pattern (background server + screen_dir/state_dir + agent reads
events on next turn). That pattern is built for iterative selection sessions.
For Digestify's one-shot, single-submit case, blocking-bash sidesteps
background-process reaping differences across Codex / Windows / Gemini, the
user's "ping me when you're done" trigger, and persistent session directories.

QBLOCK markers in the rendered DOM are `<div data-qblock="id"></div>` elements
rather than HTML comments — comments don't survive DOMPurify sanitization by
default. The page replaces these placeholders with question cards on load.

## Impact & Risks

**Benefits:** Eliminates a high-friction loop in the user's day-to-day work.
Replaces "agent dumps markdown / user reads in terminal / writes notes elsewhere
/ pastes back" with one round trip and a structured response.

**Risks:**

- _Discoverability_ — agents may not know when to suggest the tool. Mitigated by
  the explicit "magic word" naming; users opt in directly.
- _Browser pop-up surprise_ — earlier versions risked auto-firing on generic
  cues. Mitigated by removing the auto-fire heuristic and requiring explicit
  invocation or proposal-first behavior.
- _Content sanitization_ — agent-authored markdown rendered as HTML in the page
  is sanitized via DOMPurify; user-typed text uses `textContent`. Defense in
  depth is cheap and the surface is small.
- _CDN availability_ — first use needs internet. Acceptable trade-off for v1.

**Complexity:** Low-Medium — small surface area, single-file script, single HTML
page. Theming work bumps complexity slightly but is contained.

## Open Questions

- Will the proposal-first "Suggested invocation" mode actually feel right in
  practice, or will agents over-propose? Will be iterated based on real use.
- How should multi-page flows work if/when added — same skill with optional
  pagination, or a separate companion?
- Is the question-fence syntax (`::: question id=foo`) the right surface, or
  should it accept richer attributes (`kind=choice options=A,B,C`) when feature
  scope grows?

## Success Criteria

- The author reaches for Digestify in real workflows when long synthesis + Q&A
  would otherwise sprawl in terminal.
- Agents fire on the magic word reliably and propose appropriately when not.
- Round-trip latency stays low: agent invokes, browser opens, user reads and
  submits, agent continues — all in one turn, no ceremony.

---

**Related Documents:**

- [Design spec](../../superpowers/specs/2026-05-05-doc-review-design.md) —
  pre-implementation design with architectural rationale (DOMPurify note
  back-ported during planning).
- [Implementation plan](../../superpowers/plans/2026-05-06-doc-review.md) —
  10-task TDD-driven plan executed via subagent-driven-development.
- Skill source: `plugins/toolbox/skills/digestify/`
- Branch: `feat/toolbox-doc-review-skill` (17+ commits at folder rename).

---

## Notes

### Naming history

The skill went through three names during development:

1. `doc-review` — the working name during initial implementation. Descriptive
   but generic enough to risk false-trigger collisions (the agent might fire on
   "review this doc" when the user just wanted a chat reply).
2. Multiple naming candidates considered: `digest`, `memo`, `dispatch`,
   `digestly`, `digesto`, `gistify`, `distillery`.
3. **`digestify`** — chosen for its low-collision profile (the `-ify` suffix
   makes it unambiguously a tool name, not a phrase that might come up
   incidentally), verb ergonomics ("digestify this"), and slight personality.

### Branding & theming assets

This folder's `assets/` subdirectory is intended as the home for branding
artifacts (logo concepts, color palettes, theme references) and any historical
materials worth preserving for the record.

### Known follow-ups

Light, batched into a future v1.3 polish pass:

- Multiple-choice question type (`kind=choice options=A,B,C`).
- Post-submit summary screen showing what was sent.
- Optional offline mode with vendored libraries.

Larger, requiring their own design pass:

- Multi-page / stepped flow for very long reviews. Constraint surfaced during
  dogfooding: must be very low-effort for the agent to drive.
- Multi-turn / iterative session support (intentionally out of scope for v1).
