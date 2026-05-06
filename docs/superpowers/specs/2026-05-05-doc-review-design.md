# doc-review skill — design

**Status:** design approved, ready for implementation plan **Date:** 2026-05-05
**Home:** `toolbox` plugin (`plugins/toolbox/skills/doc-review/`)

## Problem

When working with terminal-based coding agents (Claude Code, Codex CLI), longer
Q&A interactions hit a wall: terminals are bad at displaying multi-paragraph
rendered content, and the user has no good way to leave inline reactions on a
long doc the agent produces. Workarounds today are slow and lossy:

- Agent dumps raw markdown into the terminal — hard to read.
- Agent writes a `.md` file, user opens it in another editor, jots notes
  elsewhere, pastes back — high friction, multiple artifacts.
- Agent asks one question at a time — works but is slow when the agent has a
  coherent batch of questions tied to context.

The user wants an in-the-moment way for the agent to spawn a small browser
window with a rendered, readable doc that has interleaved questions; reply
(structured + freeform inline); submit once; and have the agent receive
everything in the same turn.

## KPIs (in priority order)

1. **Speed for the agent** — minimum ceremony, ideally one bash call in / one
   structured response out.
2. **Speed for the user** — open browser, read, reply, submit, done. No "tell
   the agent you're finished" ritual, no leftover artifacts.
3. **Readability** — rendered markdown, code highlighting, sane typography.
4. **Portability** — works in Claude Code, Codex CLI, and similar across
   mac/Linux without per-platform special-casing.

Multi-turn iterative review and persistence are explicitly **non-goals**. If the
user can't answer directly, they fall back to chat — this tool is for one-shot
doc-with-questions interactions.

## Architectural decision

**One-shot blocking script.** The agent invokes `review.py`, the script spins up
a local HTTP server, opens the browser, blocks until the user submits (or
timeout/cancel), prints a JSON response to stdout, and exits.

This is intentionally _not_ the visual-companion pattern (background server +
screen_dir/state_dir + agent reads events on next turn). That pattern is built
for iterative selection sessions. For our one-shot, single-submit case, blocking
sidesteps:

- Background-process reaping differences across Codex / Windows / Gemini.
- The user's "ping me when you're done" trigger.
- Persistent session directories that need cleanup.

The agent's turn blocks for the duration of the user's review. That's the
_correct_ behavior here — the agent has nothing else to do, and the user's
submit naturally unblocks it.

## Components

### 1. `review.py` (single Python script, stdlib only)

**Inputs:**

- Markdown via stdin **or** `--file path/to/doc.md` (either accepted; stdin
  takes precedence if both).
- Flags:
  - `--title TEXT` — page/tab title (default: "Document Review")
  - `--timeout SECONDS` — failsafe max wait (default: `1800` / 30 min)
  - `--no-open` — skip `webbrowser.open()`, just print the URL
  - `--port N` — bind to specific port (default: `0`, random free port)
  - `--host HOST` — bind host (default: `127.0.0.1`)

**Behavior:**

1. Read markdown from stdin or `--file`.
2. Parse out question blocks (see syntax below) into a list of
   `{id, prompt, raw_markdown_offset}`.
3. Bind an HTTP server on `host:port` (loopback by default).
4. Print connection JSON to stderr (`{"url": "...", "port": N}`) so the agent
   can capture it if it wants. Open browser unless `--no-open`.
5. Serve `template.html` at `/`, with the parsed doc + question metadata
   embedded as a `<script>` JSON blob.
6. Accept `POST /submit` with `{answers: {...}, comments: [...]}` JSON body. On
   valid submit: write the response object to stdout (with a `submitted_at` ISO
   timestamp added), respond `200 {"ok": true}`, then shut down the server.
7. Accept `POST /cancel` (sent by the page's `beforeunload` handler if user
   closes the tab without submitting). Exit `130`.
8. If `--timeout` elapses: exit `124`.

**Exit codes:**

- `0` — submitted, JSON on stdout.
- `2` — bad input (no question blocks found, malformed `--file`, both stdin and
  `--file` empty).
- `124` — timeout.
- `130` — user closed tab without submitting.

**Dependencies:** Python 3.8+ stdlib only (`http.server`, `webbrowser`, `json`,
`argparse`, `sys`, `re`, `socket`, `threading`). No pip install. No external
Python packages.

### 2. `template.html` (single static file)

Self-contained HTML page served by `review.py`. Loads from CDN:

- `marked` (markdown rendering)
- `DOMPurify` (sanitizes marked output before any `innerHTML` assignment —
  defense in depth, since the markdown is agent-authored content the user is
  reviewing)
- `highlight.js` (code blocks)
- A web font for legibility (system stack fallback)

**Sanitization rule:** all marked output passes through `DOMPurify.sanitize`
before being assigned to `innerHTML`. User-typed text (answers, comments) uses
`textContent`, never `innerHTML`. The page touches `innerHTML` only for
sanitized HTML or hard-coded constants.

Page structure:

- **Header bar** — title, "Submit" button (always enabled — the user may
  legitimately want to skip all questions and only leave inline comments, or
  submit a single answer without filling the rest).
- **Main column** — rendered markdown with question blocks transformed into
  inline cards.
- **Per-paragraph hover gutter** — a small "💬" icon appears in the right margin
  when hovering a paragraph; clicking opens an inline comment box anchored to a
  text selection.
- **Submit-confirmation state** — after successful POST, page replaces itself
  with "✓ Sent — you can close this tab."

JS responsibilities (~80 lines vanilla):

- Render markdown via marked.
- Walk the rendered DOM, replacing question-block placeholders with `<textarea>`
  cards.
- Wire up text-selection comment flow: on `mouseup` over the doc, if there's a
  non-empty selection, show a floating "💬 Comment" button that opens an inline
  comment box anchored to the selected snippet.
- On Submit: collect `{answers, comments}`, POST to `/submit`, on success
  replace the page with the confirmation state.
- On `beforeunload`: `navigator.sendBeacon('/cancel')` if not yet submitted.

### 3. Question-block syntax

Pandoc-style fenced div:

```markdown
::: question id=scope Should we include the migration step in this PR or split
it? :::
```

- `id` is required, must be unique within the doc, used as the JSON key in
  `answers`.
- The body is markdown (rendered in the question card).
- Empty `id`, duplicate `id`s, or malformed fences cause exit code `2` with a
  clear stderr message.

If the agent provides a doc with **zero** question blocks, exit code `2` (this
tool is for Q&A; pure-comment-only review can come later if needed).

### 4. Response contract (stdout JSON)

```json
{
  "answers": {
    "scope": "Split it — migration deserves its own review.",
    "naming": "FooCoordinator"
  },
  "comments": [
    {
      "anchor": "the assumption that all clients support TLS 1.3",
      "text": "this isn't true for the embedded fleet"
    }
  ],
  "submitted_at": "2026-05-05T12:34:56Z"
}
```

- `answers`: keys are question `id`s. Missing keys mean the user left that
  question blank — value omitted (not empty-string).
- `comments`: array, possibly empty. `anchor` is the verbatim text snippet the
  user selected.
- `submitted_at`: ISO 8601 UTC timestamp added by the script.

### 5. `SKILL.md`

Frontmatter + body teaching the agent:

- When to use (long-doc Q&A, batched questions, anything that would otherwise
  sprawl in the terminal).
- When NOT to use (single short questions, iterative back-and-forth → just
  chat).
- The `:::` question fence syntax with examples.
- How to invoke the script (stdin and file forms).
- How to parse the response and how to handle non-zero exits gracefully
  (timeout, cancel, no-questions error).
- A short, copy-pasteable golden-path example.

## What we are NOT building

- Multi-turn sessions / live updates.
- Persistent session storage.
- Authentication / non-loopback binding by default.
- Markdown editing in the browser (read-only doc + reply fields only).
- A cross-platform packaged binary (Python script is the deliverable).
- An MCP server wrapper. Could be added later if users want a single tool call
  instead of a bash invocation, but blocking-bash works fine for v1.

## Risks and open questions

1. **Selection-anchor robustness.** If the same snippet appears multiple times
   in the doc, the agent can't disambiguate which one was commented. Mitigation:
   include a small surrounding window in `anchor` (e.g. ±20 chars), or include a
   paragraph index alongside. Decide during implementation; default to verbatim
   selection only and revisit if it bites.
2. **CDN dependency.** marked.js + highlight.js from CDN means the tool needs
   internet on first use per session. Acceptable trade-off for v1; if it becomes
   a problem, vendor the libs into the script via a `--offline` flag.
3. **Long markdown over stdin.** Some shells / agent harnesses may have stdin
   size limits. `--file` is the escape hatch.
4. **Tab close vs submit.** `beforeunload` + `sendBeacon('/cancel')` is
   best-effort; some browsers may suppress it. Worst case: the timeout catches
   it.

## Acceptance criteria

The skill is usable when:

- Agent can pipe a markdown doc with `:::question` blocks into `review.py` and
  receive a structured JSON answer back in the same turn.
- User can read rendered markdown, fill in question replies, optionally select
  text and add inline comments, and submit once.
- Tool exits cleanly with no leftover processes or files in any of: success,
  timeout, cancel, bad-input.
- Works identically in Claude Code and Codex CLI on macOS without code changes.

Implementation plan to follow.
