# Finalize — 2026-05-24

## Context

Closing out the Tusk Board branch (`feat/taskboard-drag-drop`). The branch
started as a drag-and-drop addition to the original taskboard prototype and grew
through several live-use rounds into a full duplex-surface skill — host modes
(static + monitored via `bg.ts`), joiner path, branded identity, and a
mid-branch rename from `taskboard` → `tuskboard`.

12 commits ahead of `develop`. Prior review/polish rounds (batches 1, 2, 3a)
landed earlier; this session was the pre-merge sweep — final UI polish, one last
independent code review, and the squash + merge.

## What Happened

**Polish pass.** Removed two redundant in-UI references to the app name on the
user's note that the wordmark already carries identity — `SKILL.md` lost the
"the UI displays Tusk Board as two words" line (replaced with a light woolly-
mammoth-puns-welcome cue) and `template.html`'s browser-tab title dropped its
`Tusk Board ·` prefix in favor of just the board's own title. (Committed as
`c13d287`.)

**Independent code review.** Dispatched `feature-dev:code-reviewer` against the
net diff (`develop..HEAD`). Verdict was _Ready to merge: No — with fixes_ on two
important findings, both legitimate:

1. **Empty-title `task.edit` corrupts state** (conf 88). Server validated
   `typeof msg.title === "string"` but not emptiness. A user clearing a title
   field and blurring sent `task.edit` with `title: ""`, which the server
   accepted and broadcast — leaving the task with a permanently empty label and
   surfacing as `{ title: "" }` to the agent on submit. No existing test covered
   the empty-string path; `null`, `42`, and missing were all covered.
2. **`bg.ts` "Always pass --no-open" comment contradicted the code.** The
   comment claimed the wrapper always forwards `--no-open`, but the code only
   forwards it when the caller passes it, and the SKILL.md examples rely on the
   actual default (auto-open). The comment was stale, not the behavior.

Fixed both:

- Server now rejects `typeof msg.title !== "string" || msg.title.trim() === ""`,
  with comment explaining the reasoning.
- Client now reverts an empty edit to the original title before the server
  rejects it, so the visible text doesn't diverge from canonical state on blur.
- Extended the existing `task.edit` validation test with two new bad cases —
  empty string and pure whitespace — both verified silently dropped.
- `bg.ts` comment rewritten to match the actual conditional-forward behavior.

Rename check came back clean — no stale `taskboard` references anywhere in code,
docs, tests, or asset paths. Tests-vs-mocks check passed: the subprocess tests
in `server.test.ts` spawn the real server and exercise the real WebSocket
protocol, not stubs.

**Quality gate.** Prettier format-check, skill validator (37/37), and the
27-test tuskboard suite all green after the fixes.

## Notable Discoveries

The reviewer's empty-title finding was a clean illustration of why "validate
type, not value" silently corrupts state: every other invalid-shape edit was
caught, but the one shape that _looked_ valid (`title: ""` is a string) was the
one that produced the broken on-submit payload. The existing test pattern was
sturdy enough that adding the two new bad inputs to the existing
silently-dropped block fixed the gap in two lines without restructuring.

The `bg.ts` comment-vs-behavior mismatch was the kind of drift that survives
multiple review passes because nobody re-reads stale comments next to code they
aren't currently changing. Worth noting as a pattern — when behavior shifts and
the comment doesn't, the comment is the lie.

## Changes Made

- `plugins/toolbox/skills/tuskboard/scripts/server.ts` — empty-string guard in
  `task.edit` handler
- `plugins/toolbox/skills/tuskboard/scripts/template.html` — revert-on-empty in
  title-blur handler
- `plugins/toolbox/skills/tuskboard/scripts/server.test.ts` — two new bad-edit
  cases in the existing validation test
- `plugins/toolbox/skills/tuskboard/scripts/bg.ts` — comment corrected
- `plugins/toolbox/skills/tuskboard/SKILL.md` — branding line softened
- `plugins/toolbox/skills/tuskboard/scripts/template.html` — browser-tab title
  simplified to `__TITLE__`
- `dist/toolbox/skills/tuskboard/` — rebuilt to mirror

## Follow-up

Architectural items deliberately deferred from earlier batches (not blockers,
tracked for a future branch):

- `bg.ts` crash recovery — if the wrapper dies while the server is up, the
  agent's pipe to the cmds file is orphaned. Restart should re-attach.
- Host vs. joiner event envelope asymmetry — host emits bare events, joiner
  wraps as `{ type: "event", payload: { ... } }`. Doubles the agent-side helper
  surface; worth unifying.
- Replace the 250ms poll in `bg.ts` with `fs.watch` for edge-triggered IO.
- `task.move` broadcasts full state on every reorder — fine for small boards,
  worth diffing for large ones.
- `tuskboard-latest.json` pointer collides when two concurrent boards both claim
  "latest". Guard or namespace.

---

**Related Documents:**

- [Proposal](../proposal.md)
- [Architecture review](../reviews/architecture.md)
- [Code-quality review](../reviews/code-quality.md)
- [Agent-UX review](../reviews/agent-ux.md)
- [Pre-ship review report](../../../reports/2026-05-22-tuskboard-skill-pre-ship-review.md)
