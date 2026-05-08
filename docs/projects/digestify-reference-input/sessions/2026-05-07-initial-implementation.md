# Digestify Reference Input — Initial Implementation — 2026-05-07

## Context

Add `--reference PATH` to the digestify skill so the agent can hand the tool a
doc on disk for the user to review without round-tripping its content through
the agent's context. Also relax the parser's "must have ≥1 question" rule so
pure-reading sessions (just rendering

- inline comments) work. Proposal at `../proposal.md`; design was clear enough
  to skip a formal dev plan.

## What Happened

Built straightforwardly in a single sitting. Three commits before squash:

1. Core feature — `--reference` flag, `_read_input` rewrite, parser relaxation,
   four new MainTests, SKILL.md and proposal updates, toolbox 1.3.0 → 1.4.0.
2. Boundary-marker upgrade — initial design used a plain `---` rule between
   reference and agent content, but the first dogfood (using the proposal itself
   as the reference) revealed reference docs commonly contain `---` rules of
   their own. Switched to a data-attribute marker styled as a labeled
   double-line rule with "END OF `<filename>`" centered on it. Filename label
   populated via CSS `attr()`.
3. SKILL.md tweaks — corrected the stale `---` mention, added a tip about the
   heredoc + pipeline approval-gate quirk and the project-local `--file`
   workaround.

Then the independent code review caught a real injection vector:
`data-refboundary` attribute value wasn't HTML-escaped, so a filename containing
`"` could break out of the attribute. Fixed with `html.escape(quote=True)`
mirroring the existing `__TITLE__` escape. Pinned with a HandlerTest.

## Notable Discoveries

- **`select.select()` is the right tool for non-blocking stdin in agent-harness
  contexts.** When run in background-task mode, stdin is non-tty but never sees
  EOF, so a naive `stdin.read()` hangs forever. The fix — `select(timeout=0.1)`
  to peek before reading — works for both real subprocess pipes and CLI heredoc
  invocations. Tests need a real OS pipe (StringIO has no `fileno()`); the new
  test for HTML escape uses `os.pipe()` to drive `_read_input` directly without
  HTTP round-trips.

- **Token efficiency was the headline benefit, not just a perk.** Dogfooding the
  feature on the proposal itself made it visceral: the 185-line proposal renders
  in the browser without any of its content passing through my context, while
  the agent-authored questions chunk is small. For real-world long docs
  (5000-line proposals, README dumps), this is the difference between "burns
  tokens" and "doesn't."

- **Visual differentiation matters more than the proposal predicted.** The
  original proposal said "no visual cue needed" because question cards already
  demarcate themselves. Dogfood reversed this: when the agent adds _prose_
  alongside the reference (not just questions), the user couldn't tell which
  prose came from where. Added a blockquote caption + labeled boundary marker in
  response.

- **Bash heredoc + pipeline + `&&` triggers an extra approval gate in Claude
  Code.** Surfaced naturally during dogfood. Workaround: separate Bash calls,
  write agent content to a project-local scratch file (`.agents/...` since it's
  gitignored), pass via `--file`. Documented in SKILL.md.

## Changes Made

- `plugins/toolbox/skills/digestify/scripts/review.py` — `--reference` flag, new
  `_read_input` (select-based stdin handling, HTML escape on ref_label for the
  boundary attribute), parser relaxed to allow zero questions.
- `plugins/toolbox/skills/digestify/scripts/template.html` — CSS for
  `[data-refboundary]` (double-line rule + "END OF <filename>" via `attr()` in
  CSS content).
- `plugins/toolbox/skills/digestify/scripts/test_review.py` — replaced 2 tests
  invalidated by the parser relaxation, added 5 new ones (reference-only,
  reference+stdin, reference+--file, missing-ref exits 2, attribute-escape
  pinning). 35/35 pass.
- `plugins/toolbox/skills/digestify/SKILL.md` — new "Invocation" framing
  (intent-based --file vs --reference), invocation table, scratch-file tip.
- `plugins/toolbox/.claude-plugin/plugin.json` — 1.3.0 → 1.4.0.
- `docs/projects/digestify-reference-input/` — proposal + this session journal.
- Dist mirror rebuilt.

## Lessons Learned

- **Dogfood the design with the tool itself when possible.** Used digestify's
  own proposal as the reference doc to test `--reference`. Caught the
  boundary-marker visual issue, the link- rendering follow-up, and the
  bash-pipeline UX gotcha — all in conversation rather than via post-merge
  friction.

- **A locked-in design from a proposal is a starting point, not an endpoint.**
  The "no visual differentiation" decision flipped after one round of real use.
  Document the reversal in the proposal so future readers see the actual
  reasoning, not just the original guess.

- **Independent review on the net diff still pays off after every commit you've
  felt confident about.** The HTML-escape gap on `data-refboundary` was a
  perfect candidate to miss in self-review: the title-escape precedent existed,
  the parallel was obvious, but during implementation I focused on the new code
  path and didn't retrace the existing pattern.

## Follow-up

- Link rendering goes nowhere — markdown links to relative paths render as
  clickable but `review.py` has no route handler for them. Pre-existing;
  surfaced naturally during reference-doc dogfood. Likely fix: serve relative
  paths from the reference doc's parent dir with a path-traversal guard. Out of
  scope for this branch; noted in proposal "Follow-up" section.

- The "scratch file in `.agents/`" convention for digestify question files is
  currently informal (called out in SKILL.md tip). If other skills end up
  wanting similar scratch space, formalize it as a shared convention.

---

**Related Documents:**

- [Proposal](../proposal.md)
- Branch: `feat/digestify-reference-input` (1 commit at finalize after squash).
