# Digestify — Initial Implementation — 2026-05-07

## Context

Built `digestify` (originally scaffolded as `doc-review`), a one-shot
browser-based markdown review skill for the `toolbox` plugin. Driven from the
design spec at `docs/superpowers/specs/2026-05-05-doc-review-design.md` and the
implementation plan at `docs/superpowers/plans/2026-05-06-doc-review.md` via the
`subagent-driven-development` skill.

A second agent ran in parallel adding theming infrastructure (themes object,
asset-serving HTTP route, classic and cthulhu themes); this session both wrote
the core skill and integrated their theming work, plus applied UX polish during
dogfooding.

## What Happened

**Core implementation went smoothly through TDD.** The plan's 10 tasks were
executed via subagent dispatches with two-stage review per task. Hits along the
way:

- The plan's `FakeRequest` test helper didn't work on Python 3.12+ because
  stdlib's `BaseHTTPRequestHandler` switched to `_SocketWriter` with `sendall`
  and `fileno` calls. Implementer added two-line shims; worth back-porting to
  the canonical plan template.
- Same Python 3.12 surface bit one of the subprocess tests: `proc.communicate()`
  after `proc.stdin.close()` raises `ValueError`. Substituted
  `proc.stdout.read() + proc.wait()`.
- The plan's `<!--QBLOCK:id-->` HTML-comment placeholder didn't survive
  DOMPurify (which strips comments by default). Switched the parser to emit
  `<div data-qblock="id"></div>`. Caught by the very first dogfood session — the
  empty Questions section was visually obvious.
- The pre-write hook flagged `innerHTML` usage. Added DOMPurify sanitization on
  all marked output and used `textContent` for user-typed strings. Defense in
  depth that paid off twice (see below).

**Dogfood iterations surfaced real bugs and refinements, all in the browser-side
template:**

- `highlight.js` 404'd from jsdelivr (wrong path under that registry); switched
  to cdnjs + guarded the `hljs.highlightElement` call so a CDN miss can't kill
  the page.
- The text-selection 💬 button's `click` was eaten by a parent `mouseup` handler
  that removed the button before its click event fired. Switched to `mousedown`
  on the button + `stopPropagation`.
- `beforeunload` fired `/cancel` on every refresh, including refreshes on a
  clean page. Added a `dirty` flag — only fires `/cancel` once the user has
  typed an answer or saved a comment. (Documented this divergence from the
  original spec contract in SKILL.md after code review caught the gap.)
- A bunch of theme polish: question side-border switched from pink→purple
  gradient to a flat purple matching the flatter theme language; question icon
  got a bubble treatment (pink fill + white inset highlight + purple inset
  shadow + soft drop); submit button's hard offset shadow softened to two
  blurred drops; sent-screen rebuilt around the digested-classic mascot image
  with the small muted close-tab line; body got `min-height: 100vh` so the page
  wash no longer leaves a hard edge after the short done page.

**Naming:** the skill went through `doc-review` → considered
`digest`/`memo`/`dispatch`/`gistify`/`distillery` → landed on `digestify`. The
`-ify` suffix gave the verb-first ergonomics the user wanted ("digestify this")
and the low-collision profile (won't accidentally fire on stray uses of "digest"
in conversation). Skill description rewritten around two trigger modes —
explicit (user says the magic word, agent fires) and suggested (agent senses the
shape, proposes first, fires only on agreement). Removed the
auto-fire-on-150-words heuristic the original framing had.

**Code review caught two real injection vectors before merge.** The
agent-supplied `--title` was substituted into `__TITLE__` unescaped, and
`_json.dumps` of the payload didn't escape `</`. Both fixed; both pinned with
new HandlerTests. The reviewer also flagged the `dirty`-only `/cancel` behavior
as a docs gap; updated the exit code table to call out that 124 (not 130) is the
clean-abandon outcome.

## Notable Discoveries

- **Marked + DOMPurify defaults strip HTML comments**, breaking the spec's
  chosen placeholder. `<div data-qblock="id"></div>` survives cleanly and
  CommonMark handles it correctly _if_ surrounded by blank lines (the parser had
  to be patched to do this — without trailing blank lines, type-6 HTML blocks
  consume following markdown as raw HTML, and the next heading rendered as
  literal `##`).
- **Blocking-bash is a clean fit for one-shot review.** The visual- companion's
  background-server pattern handles iterative selection sessions but is overkill
  for a single-submit interaction. Blocking sidesteps Codex/Windows/Gemini
  background-process reaping differences entirely. Same-turn return is a natural
  agent UX.
- **Naming matters more than I expected.** Once we landed on `digestify`, the
  trigger framing changed shape — instead of trying to describe the situations
  where the agent should auto-fire, we could lean on the magic word as the
  primary signal and have the agent _propose_ when it senses the situation but
  the word wasn't said. The auto-fire heuristic on word count went away
  entirely.

## Changes Made

- New skill at `plugins/toolbox/skills/digestify/` (renamed from `doc-review`).
  `review.py` (~290 LOC stdlib only), `template.html` (~1100 LOC including
  theming), `test_review.py` (30 tests: parser, payload, handler with HTML/JSON
  escape + asset path traversal, server runner, CLI subprocess), `SKILL.md`.
  Per-theme asset folders under `assets/classic/` and `assets/cthulhu/`
  (wordmark, mascot, digested mascot).
- `plugins/toolbox/.claude-plugin/plugin.json` bumped 1.1.0 → 1.2.0.
- Project folder at `docs/projects/digestify/` with proposal capturing rationale
  and naming history; `assets/` holds historical 3-theme reference WebPs.
- `.gitignore` adds `.agents/` and `.codex/` agent scratch dirs.

## Lessons Learned

- **Dogfood early.** The first dogfood session immediately surfaced three
  browser-side bugs (CDN 404, comment button click, empty question section) that
  no amount of unit testing would have caught. Schedule a real round-trip as
  soon as the page loads end-to-end, not after polish.
- **The plan's code-as-spec is great until a runtime quirk bites.** Three Python
  3.12 compat patches (FakeRequest, communicate, arguably the cdnjs swap too)
  had to be made by the implementer at TDD time. Implementers should be
  encouraged to flag these as `DONE_WITH_CONCERNS` so the plan template can be
  back-ported.
- **DOMPurify's defaults aren't the ones you might assume.** Comments are
  stripped, scripts are stripped, but `<div data-*>` survives cleanly. Worth
  knowing for any future skills that need agent→browser HTML round-trips.
- **Code review on the net diff caught what nobody else would have.** The
  HTML-injection and JSON-escape vectors were hidden behind 19 commits; the
  reviewer subagent on `git diff develop..HEAD` found them in one pass. The
  lesson: always dispatch a fresh reviewer before squash, even (especially) when
  you've been "reviewing as you go."

## Follow-up

Already noted in the proposal as deferred:

- Multiple-choice question type (`kind=choice options=A,B,C`).
- Post-submit summary screen ("you sent N answers, M comments").
- Optional offline mode with vendored CDN libraries.
- Multi-page / stepped flow for very long reviews — open architectural question;
  constraint surfaced during dogfooding is that it must be low-effort for the
  agent to drive.

Open question worth eyeballing in real use: will the suggested-invocation
(propose-first) mode feel right, or will agents over-propose? Easy to iterate
from real friction.

---

**Related Documents:**

- [Proposal](../proposal.md)
- [Design spec](../../../superpowers/specs/2026-05-05-doc-review-design.md)
- [Implementation plan](../../../superpowers/plans/2026-05-06-doc-review.md)
- Branch: `feat/toolbox-doc-review-skill`
