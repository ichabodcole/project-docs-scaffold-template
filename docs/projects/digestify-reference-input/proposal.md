# Digestify — Reference Input

**Status:** Approved (in flight) **Created:** 2026-05-07 **Author:** Cole Reed

---

## Overview

Extend the Digestify skill so the agent can hand the tool a file path (e.g. an
existing proposal, README, or external doc) instead of pasting content through
stdin. The doc is read directly from disk by `review.py`, never round-tripping
through the agent's context. Optionally, the agent can append their own
commentary and `:::question` blocks on stdin to combine the reference doc with
their own questions in a single review session.

## Problem Statement

Two real use cases that today's Digestify can't serve cleanly:

1. **Pure reading surface.** The user has a long doc — proposal, spec, README —
   and wants a nicer way to read it than the terminal. Agent would render the
   markdown, let them leave anchored comments, and close. No questions needed.
   Today: `review.py` exits 2 with "no question blocks found".

2. **Reference doc + agent's questions.** The agent has loaded a doc and wants
   the user to read it AND answer questions about it. Today, the agent has to
   either paste the entire doc through stdin (token cost for the agent on the
   way in) or write a combined file via the Write tool (token cost for the doc
   going OUT through the agent). Either workaround forces the doc through the
   agent's context — for a 5000- line proposal, that's a meaningful waste.

The token-efficiency point is the headline. `--file path` already lets the agent
point at a file on disk so the script reads it directly, but that path requires
the file to _contain_ `:::question` blocks already. The "agent supplies
questions separately, doc stays on disk" pattern has no current shortcut.

## Proposed Solution

Two small changes to `review.py`:

### 1. Add a `--reference PATH` flag

Reads the file at `PATH`, uses its content as the doc body. Mutually combinable
with stdin and `--file`:

- `--reference path` only → reference doc IS the entire body. No agent authoring
  needed.
- `--reference path` + stdin → reference body lands first, agent's stdin content
  (commentary, questions) appends below. The agent can add `:::question` blocks
  in their stdin chunk; the parser sees the combined markdown.
- `--reference path` + `--file other.md` → same as stdin behavior, but reading
  the agent-authored content from a second file.
- Plain stdin / `--file` (no `--reference`) → unchanged from today.

The doc at `--reference path` never passes through the agent's context. Only the
agent's small added content costs tokens.

### 2. Relax the zero-questions rule

Today's parser raises `ValueError("no question blocks found")` if there are zero
`:::question` fences in the input. After the change, zero questions is a valid
state — the page renders the markdown, no question cards appear, comment flow
still works, Submit still works (returns
`{answers: {}, comments: [...], submitted_at}`).

The duplicate-id, missing-id, empty-id, and empty-body validations stay. Only
the "must have at least one question" rule relaxes.

## Scope

**In scope:**

- New `--reference PATH` flag in `review.py`.
- Concatenation order: reference body first, agent content (stdin or `--file`)
  appended below with a blank-line separator.
- Drop the `ValueError` on zero question blocks; keep all other parser
  validations.
- Tests covering: reference-only mode, reference+stdin combination,
  reference+`--file`, zero-question submit returns empty `answers`, reference
  path that doesn't exist exits 2 with a clear error.
- Update `SKILL.md` "Invocation" section and add an example for the
  reference-doc use case.
- Bump toolbox plugin version (1.3.0 → 1.4.0; minor for behavioral expansion,
  consistent with prior digestify version bumps).

**Out of scope (deferred):**

- Multi-reference support (`--reference a.md --reference b.md`). One reference
  per session is enough for v1; multi-doc review is a bigger scope question
  (probably wants a different UX entirely).
- Auto-detection of `:::question` blocks inside the reference doc to deduplicate
  or warn — same parser sees the combined content; if the reference happens to
  have question fences, they're treated as questions, no special-casing.
- A new "skim mode" UI variant for read-only flows. The same page works for both
  modes; no need to fork.

## Technical Approach

`review.py` changes:

- Add `--reference PATH` argument to argparse.
- In `_read_input` (or a new `_assemble_input`), if `--reference` is present,
  read the file and prepend its content (with a `\n\n` separator) to whatever
  stdin/`--file` provided.
- In `parse_questions`, replace the "no questions" `ValueError` with returning
  `(transformed_markdown, [])` — the empty list signals zero questions, which
  the rest of the pipeline handles naturally (build\_- payload returns
  `questions: []`, the JS renders no question cards).
- Add error-on-missing for `--reference` path, mirroring how `--file` handles
  missing paths today.

`template.html` should already handle `questions: []` correctly — the
`querySelectorAll("[data-qblock]")` walk just finds zero matches when there are
no question blocks. Verify in a smoke test, but no UI change expected.

`SKILL.md` updates:

- Add "Reference doc" subsection under Invocation showing
  `--reference path/to/doc.md`.
- Update the "Question Block Syntax" section to note that zero question blocks
  is valid (page becomes a read-only/comment-only review).
- Update the response shape note to clarify that `answers: {}` is the expected
  shape for question-less submits.

## Impact & Risks

**Benefits:**

- Token-efficient: a 10-page proposal stays on disk; only the small
  agent-authored question chunk costs tokens.
- Unlocks the "improve reading surface for an existing doc" use case the user
  keeps wanting (proposals, READMEs, voice-transcript brain-dumps already saved
  to disk).
- Composable — agent can pick the simplest input shape that fits the situation.

**Risks (and mitigations):**

- _Confused agents._ Adding a third input path (stdin / `--file` /
  `--reference`) means the SKILL.md needs a clear taxonomy. Mitigated by a small
  invocation table: "what kind of session?" → "use this pattern".
- _Page renders weirdly with no questions._ Low risk — the page just shows
  markdown + Submit. If the empty-questions visual feels too bare, could add an
  optional banner ("No questions — read & comment, then Submit when done").
  Defer until we see the empty state in real use.
- _Reference + stdin order surprise._ Reference goes first (the doc before the
  commentary). Documented in SKILL.md. If a use case wants the other order,
  revisit.

**Complexity:** Low. Single-file Python script change, ~30–60 LOC plus tests. No
HTML/JS template changes expected.

## Decisions Made (from dogfood)

Resolved during the implementation session by Digestifying the proposal itself:

- `--reference` and `--file` ARE allowed together. Reference body lands first,
  agent content (stdin or `--file`) appends after, separated by a labeled
  boundary marker (double-line rule with "END OF `<filename>`" centered on it;
  final implementation chose this over a plain `---` since reference docs
  commonly contain HRs of their own).
- Empty-question submit returns the same JSON shape
  (`{answers: {}, comments: [...]}`) — no separate exit code or signal.
- **Reversed**: a small visual cue IS added when reference is in play. A
  blockquote caption (`> Reference: filename.md`) introduces the reference
  content, and a labeled boundary marker (double-line rule with "END OF
  `<filename>`" centered on it) appears between reference and agent content when
  both are present. The labeled marker beats a plain `---` because reference
  docs commonly embed their own HRs and the user couldn't otherwise tell them
  apart. Reasoning for adding any cue at all: question cards already visually
  demarcate themselves, but if the agent adds _prose_ alongside the reference,
  the user couldn't otherwise tell which prose came from which source.

## Follow-up

Surfaced during the same dogfood session, deferred:

- **Link rendering goes nowhere.** Markdown links to relative paths (e.g.
  `../digestify/proposal.md`) render as clickable links in the page, but
  `review.py` only serves `/`, `/submit`, `/cancel`, and `/assets/*` — clicking
  404s. Pre-existing limitation that became more visible with `--reference`
  since reference docs commonly contain cross-doc links. Likely fix: serve
  relative paths from the reference doc's parent directory with the same
  path-traversal guard the assets route uses. Out of scope for this branch.

## Success Criteria

- Agent can run `python3 review.py --reference path/to/doc.md` and the user sees
  the rendered doc with no question cards, can leave comments, and submit.
- Agent can run `python3 review.py --reference path/to/doc.md` with stdin
  containing `:::question` blocks and the user sees the doc followed by inline
  questions, all in one continuous page.
- Doc content never passes through the agent's context for either pattern.
- All 30 existing tests still pass; new tests cover the three combination shapes
  plus the missing-reference error path.

---

**Related Documents:**

- [Digestify project](../digestify/proposal.md) — original spec and rationale
  for the tool.
