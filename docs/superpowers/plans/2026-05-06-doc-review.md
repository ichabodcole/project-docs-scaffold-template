# doc-review Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `doc-review` skill to the toolbox plugin that lets a terminal
agent spawn a one-shot browser review session — markdown rendered, question
fields filled inline, optional text-anchored comments — and receive the response
as JSON in the same turn.

**Architecture:** Single Python stdlib script (`review.py`) that parses
pandoc-style `:::question` fences out of stdin/file markdown, spins up a
loopback HTTP server, opens the browser to a static template (`template.html`)
with marked.js + highlight.js + DOMPurify from CDN, blocks until `POST /submit`
or `POST /cancel` or timeout, then prints `{answers, comments, submitted_at}`
JSON to stdout and exits with a contract-defined exit code (0/2/124/130).

**Tech Stack:** Python 3.8+ stdlib (`http.server`, `webbrowser`, `argparse`,
`json`, `re`, `threading`, `socket`, `unittest`); marked.js + highlight.js +
DOMPurify via CDN in the served HTML; vanilla JS in the page (~100 LOC); the
toolbox plugin's existing skill layout.

**Spec:** `docs/superpowers/specs/2026-05-05-doc-review-design.md`

---

## File Structure

**Create:**

- `plugins/toolbox/skills/doc-review/SKILL.md` — agent-facing skill instructions
- `plugins/toolbox/skills/doc-review/scripts/review.py` — main Python entry
  point + library functions
- `plugins/toolbox/skills/doc-review/scripts/template.html` — single-file HTML
  page served at `/`
- `plugins/toolbox/skills/doc-review/scripts/test_review.py` — unit tests for
  parsing and HTTP handlers

**Modify:**

- `plugins/toolbox/.claude-plugin/plugin.json` — bump `version` from `1.1.0` to
  `1.2.0` (minor bump for new behavior, per project semver convention)

**Mirrored to `dist/toolbox/skills/doc-review/`** by running
`npm run build:dist` at the end (handled in Task 10).

The Python script is intentionally one file. Question parsing, payload building,
HTTP handlers, and the CLI entry are all under ~250 LOC total — keeping them in
one module makes the script self-contained and trivially copyable.

**Security note on the HTML template:** the markdown rendered in the page comes
from agent-authored content the user is choosing to review, served on loopback.
We still sanitize all marked output through DOMPurify before assigning to
`innerHTML` — defense in depth is cheap and the template is the only piece that
touches arbitrary HTML.

---

## Task 1: Scaffold the skill directory and bump plugin version

**Files:**

- Create: `plugins/toolbox/skills/doc-review/scripts/` (directory)
- Create: `plugins/toolbox/skills/doc-review/scripts/review.py` (empty
  placeholder, just shebang + module docstring)
- Modify: `plugins/toolbox/.claude-plugin/plugin.json` (bump version)

- [ ] **Step 1: Create the scripts directory**

```bash
mkdir -p plugins/toolbox/skills/doc-review/scripts
```

- [ ] **Step 2: Create empty review.py with shebang**

Create `plugins/toolbox/skills/doc-review/scripts/review.py`:

```python
#!/usr/bin/env python3
"""doc-review: one-shot browser-based markdown review with inline Q&A.

Reads markdown from stdin or --file, parses :::question fences, serves a
local HTTP page that renders the markdown with question fields and inline
comment widgets, blocks until the user submits, then prints
{answers, comments, submitted_at} JSON to stdout.

Exit codes:
  0   submitted successfully
  2   bad input (no questions, malformed args, etc.)
  124 timeout
  130 user closed tab without submitting
"""
```

- [ ] **Step 3: Make it executable**

```bash
chmod +x plugins/toolbox/skills/doc-review/scripts/review.py
```

- [ ] **Step 4: Bump plugin version**

Edit `plugins/toolbox/.claude-plugin/plugin.json`:

Change:

```json
  "version": "1.1.0",
```

to:

```json
  "version": "1.2.0",
```

- [ ] **Step 5: Commit**

```bash
git add plugins/toolbox/skills/doc-review/scripts/review.py plugins/toolbox/.claude-plugin/plugin.json
git commit -m "feat(toolbox): scaffold doc-review skill"
```

---

## Task 2: Parse `:::question` fences from markdown

**Files:**

- Modify: `plugins/toolbox/skills/doc-review/scripts/review.py` (add parser +
  Question dataclass)
- Create: `plugins/toolbox/skills/doc-review/scripts/test_review.py` (tests)

The parser must:

1. Find `::: question id=<id>\n<body>\n:::` blocks (whitespace-tolerant,
   case-sensitive on `question`).
2. Replace each block in the source with a placeholder marker
   `<!--QBLOCK:<id>-->` so the rendered markdown can later be split around the
   questions.
3. Return `(transformed_markdown, [Question(id, prompt_markdown), ...])`.
4. Raise `ValueError` on: no question blocks found, duplicate `id`, missing
   `id`, empty `id`.

- [ ] **Step 1: Write failing tests for the parser**

Create `plugins/toolbox/skills/doc-review/scripts/test_review.py`:

```python
"""Unit tests for review.py — parser, payload builder, HTTP handlers."""
import json
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
import review


class ParseQuestionsTests(unittest.TestCase):
    def test_single_question_block_extracted(self):
        md = "Intro paragraph.\n\n::: question id=scope\nShould we split it?\n:::\n\nOutro."
        transformed, questions = review.parse_questions(md)
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0].id, "scope")
        self.assertEqual(questions[0].prompt, "Should we split it?")
        self.assertIn("<!--QBLOCK:scope-->", transformed)
        self.assertNotIn(":::", transformed)

    def test_multiple_question_blocks_preserve_order(self):
        md = (
            "::: question id=first\nFirst?\n:::\n\n"
            "Middle.\n\n"
            "::: question id=second\nSecond?\n:::\n"
        )
        _, questions = review.parse_questions(md)
        self.assertEqual([q.id for q in questions], ["first", "second"])

    def test_question_body_can_contain_markdown(self):
        md = "::: question id=naming\nPick: `Foo`, `Bar`, or `Baz`?\n:::"
        _, questions = review.parse_questions(md)
        self.assertEqual(questions[0].prompt, "Pick: `Foo`, `Bar`, or `Baz`?")

    def test_no_questions_raises(self):
        with self.assertRaises(ValueError) as cm:
            review.parse_questions("Just prose, no questions.")
        self.assertIn("no question blocks", str(cm.exception).lower())

    def test_duplicate_id_raises(self):
        md = "::: question id=x\nA?\n:::\n\n::: question id=x\nB?\n:::"
        with self.assertRaises(ValueError) as cm:
            review.parse_questions(md)
        self.assertIn("duplicate", str(cm.exception).lower())

    def test_missing_id_raises(self):
        md = "::: question\nWhat?\n:::"
        with self.assertRaises(ValueError):
            review.parse_questions(md)

    def test_empty_id_raises(self):
        md = "::: question id=\nWhat?\n:::"
        with self.assertRaises(ValueError):
            review.parse_questions(md)

    def test_id_can_contain_underscores_hyphens_alphanumeric(self):
        md = "::: question id=naming-v2\nQ?\n:::\n\n::: question id=scope_a\nQ?\n:::"
        _, questions = review.parse_questions(md)
        self.assertEqual([q.id for q in questions], ["naming-v2", "scope_a"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: All `ParseQuestionsTests` fail with
`AttributeError: module 'review' has no attribute 'parse_questions'`.

- [ ] **Step 3: Implement the parser**

Append to `plugins/toolbox/skills/doc-review/scripts/review.py`:

```python
import re
from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class Question:
    id: str
    prompt: str


_QBLOCK_RE = re.compile(
    r"^:::\s*question(?P<attrs>[^\n]*)\n(?P<body>.*?)\n:::\s*$",
    re.MULTILINE | re.DOTALL,
)
_ID_RE = re.compile(r"\bid\s*=\s*(?P<id>[A-Za-z0-9_\-]*)")


def parse_questions(markdown: str) -> Tuple[str, List[Question]]:
    """Extract :::question fences. Returns (transformed_md, questions).

    Each fence in the source is replaced with `<!--QBLOCK:<id>-->`. Raises
    ValueError if there are zero blocks, missing/empty ids, or duplicates.
    """
    questions: List[Question] = []
    seen_ids = set()

    def _replace(match: re.Match) -> str:
        attrs = match.group("attrs") or ""
        id_match = _ID_RE.search(attrs)
        if not id_match or not id_match.group("id"):
            raise ValueError(
                "question block missing or has empty id; expected '::: question id=<name>'"
            )
        qid = id_match.group("id")
        if qid in seen_ids:
            raise ValueError(f"duplicate question id: {qid!r}")
        seen_ids.add(qid)
        body = match.group("body").strip()
        questions.append(Question(id=qid, prompt=body))
        return f"<!--QBLOCK:{qid}-->"

    transformed = _QBLOCK_RE.sub(_replace, markdown)
    if not questions:
        raise ValueError(
            "no question blocks found; expected at least one '::: question id=<name>' fence"
        )
    return transformed, questions
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 7 tests pass, no failures or errors.

- [ ] **Step 5: Commit**

```bash
git add plugins/toolbox/skills/doc-review/scripts/review.py plugins/toolbox/skills/doc-review/scripts/test_review.py
git commit -m "feat(toolbox/doc-review): add :::question fence parser"
```

---

## Task 3: Build the payload object served to the page

**Files:**

- Modify: `plugins/toolbox/skills/doc-review/scripts/review.py` (add
  `build_payload`)
- Modify: `plugins/toolbox/skills/doc-review/scripts/test_review.py` (add
  `BuildPayloadTests`)

The payload is the JSON blob the HTML page loads to render. Shape:

```json
{
  "title": "Document Review",
  "markdown": "...transformed markdown with QBLOCK markers...",
  "questions": [{ "id": "scope", "prompt": "Should we split it?" }]
}
```

- [ ] **Step 1: Add failing tests for `build_payload`**

Append to `test_review.py` before `if __name__ == "__main__":`:

```python
class BuildPayloadTests(unittest.TestCase):
    def test_payload_contains_title_markdown_and_questions(self):
        md = "Intro.\n\n::: question id=q1\nWhy?\n:::"
        payload = review.build_payload(md, title="Test Title")
        self.assertEqual(payload["title"], "Test Title")
        self.assertIn("<!--QBLOCK:q1-->", payload["markdown"])
        self.assertEqual(payload["questions"], [{"id": "q1", "prompt": "Why?"}])

    def test_payload_default_title(self):
        md = "::: question id=q1\nQ?\n:::"
        payload = review.build_payload(md)
        self.assertEqual(payload["title"], "Document Review")

    def test_payload_is_json_serialisable(self):
        md = "::: question id=q1\nQ?\n:::"
        payload = review.build_payload(md)
        json.dumps(payload)  # must not raise
```

- [ ] **Step 2: Run tests to verify failure**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 3 new tests fail with
`AttributeError: module 'review' has no attribute 'build_payload'`.

- [ ] **Step 3: Implement `build_payload`**

Append to `review.py`:

```python
def build_payload(markdown: str, title: str = "Document Review") -> dict:
    """Parse questions out of the markdown and return the page payload dict."""
    transformed, questions = parse_questions(markdown)
    return {
        "title": title,
        "markdown": transformed,
        "questions": [{"id": q.id, "prompt": q.prompt} for q in questions],
    }
```

- [ ] **Step 4: Run tests to verify pass**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/toolbox/skills/doc-review/scripts/review.py plugins/toolbox/skills/doc-review/scripts/test_review.py
git commit -m "feat(toolbox/doc-review): add page payload builder"
```

---

## Task 4: HTTP request handler with `/`, `/submit`, `/cancel`

**Files:**

- Modify: `plugins/toolbox/skills/doc-review/scripts/review.py` (add handler +
  factory)
- Modify: `plugins/toolbox/skills/doc-review/scripts/test_review.py` (add
  `HandlerTests`)
- Create: `plugins/toolbox/skills/doc-review/scripts/template.html` (minimal
  placeholder for now — full content in Task 7)

The handler serves three routes:

- `GET /` → returns `template.html` content with the payload injected as a JSON
  `<script>` tag.
- `POST /submit` → reads JSON body, sets `result["status"] = "submitted"` and
  `result["data"] = body`, replies `{"ok": true}`.
- `POST /cancel` → sets `result["status"] = "cancelled"`, replies
  `{"ok": true}`.
- All other paths → 404.

We test the handler by driving its `do_GET`/`do_POST` methods directly with a
fake request object, since spinning up a real socket inside a unit test is
overkill.

- [ ] **Step 1: Create a placeholder template.html**

Create `plugins/toolbox/skills/doc-review/scripts/template.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>__TITLE__</title>
  </head>
  <body>
    <h1>__TITLE__</h1>
    <pre id="payload">__PAYLOAD__</pre>
  </body>
</html>
```

(This placeholder is just enough to test the handler's substitution logic. Task
7 replaces it with the real UI.)

- [ ] **Step 2: Add failing handler tests**

Append to `test_review.py`:

```python
import io
from http.server import BaseHTTPRequestHandler


class FakeRequest:
    """Stand-in for a socket connection to drive BaseHTTPRequestHandler directly."""

    def __init__(self, raw: bytes):
        self.rfile = io.BytesIO(raw)
        self.wfile = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        return self.rfile if "r" in mode else self.wfile


def _drive(handler_cls, raw_request: bytes):
    req = FakeRequest(raw_request)
    handler = handler_cls(req, ("127.0.0.1", 0), None)
    return handler, req.wfile.getvalue()


class HandlerTests(unittest.TestCase):
    def setUp(self):
        self.payload = {"title": "T", "markdown": "x", "questions": []}
        self.template = "<!doctype html><html><head><title>__TITLE__</title></head><body>__PAYLOAD__</body></html>"
        self.result = {}
        self.HandlerCls = review.make_handler(self.payload, self.template, self.result)

    def test_get_root_serves_template_with_substitutions(self):
        _, response = _drive(self.HandlerCls, b"GET / HTTP/1.1\r\nHost: x\r\n\r\n")
        self.assertIn(b"200", response.split(b"\r\n", 1)[0])
        body = response.split(b"\r\n\r\n", 1)[1]
        self.assertIn(b"<title>T</title>", body)
        self.assertIn(b'"questions"', body)

    def test_get_unknown_path_404s(self):
        _, response = _drive(self.HandlerCls, b"GET /nope HTTP/1.1\r\nHost: x\r\n\r\n")
        self.assertIn(b"404", response.split(b"\r\n", 1)[0])

    def test_post_submit_records_result_and_returns_ok(self):
        body = b'{"answers":{"q1":"yes"},"comments":[]}'
        raw = (
            b"POST /submit HTTP/1.1\r\nHost: x\r\nContent-Length: "
            + str(len(body)).encode()
            + b"\r\nContent-Type: application/json\r\n\r\n"
            + body
        )
        _, response = _drive(self.HandlerCls, raw)
        self.assertIn(b"200", response.split(b"\r\n", 1)[0])
        self.assertEqual(self.result["status"], "submitted")
        self.assertEqual(self.result["data"]["answers"], {"q1": "yes"})

    def test_post_cancel_records_cancelled(self):
        raw = b"POST /cancel HTTP/1.1\r\nHost: x\r\nContent-Length: 0\r\n\r\n"
        _, response = _drive(self.HandlerCls, raw)
        self.assertIn(b"200", response.split(b"\r\n", 1)[0])
        self.assertEqual(self.result["status"], "cancelled")
```

- [ ] **Step 3: Run tests to verify failure**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 4 new handler tests fail with
`AttributeError: module 'review' has no attribute 'make_handler'`.

- [ ] **Step 4: Implement `make_handler`**

Append to `review.py`:

```python
import json as _json
from http.server import BaseHTTPRequestHandler


def make_handler(payload: dict, template: str, result: dict):
    """Return a BaseHTTPRequestHandler subclass bound to this session's state.

    `result` is a dict the handler mutates: on /submit it gets {"status":
    "submitted", "data": <body>}; on /cancel {"status": "cancelled"}. The
    main loop watches `result` to decide when to shut down the server.
    """
    payload_json = _json.dumps(payload)
    page_html = template.replace("__TITLE__", payload["title"]).replace(
        "__PAYLOAD__", payload_json
    )

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):  # silence default access log
            return

        def _send(self, status: int, body: bytes, content_type: str = "application/json"):
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path == "/":
                self._send(200, page_html.encode("utf-8"), "text/html; charset=utf-8")
            else:
                self._send(404, b'{"error":"not found"}')

        def do_POST(self):
            length = int(self.headers.get("Content-Length", "0") or "0")
            raw = self.rfile.read(length) if length else b""
            if self.path == "/submit":
                try:
                    data = _json.loads(raw.decode("utf-8") or "{}")
                except _json.JSONDecodeError:
                    self._send(400, b'{"error":"invalid json"}')
                    return
                result["status"] = "submitted"
                result["data"] = data
                self._send(200, b'{"ok":true}')
            elif self.path == "/cancel":
                result["status"] = "cancelled"
                self._send(200, b'{"ok":true}')
            else:
                self._send(404, b'{"error":"not found"}')

    return Handler
```

- [ ] **Step 5: Run tests to verify pass**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 14 tests pass.

- [ ] **Step 6: Commit**

```bash
git add plugins/toolbox/skills/doc-review/scripts/
git commit -m "feat(toolbox/doc-review): add HTTP handler with submit/cancel routes"
```

---

## Task 5: Blocking server runner with timeout

**Files:**

- Modify: `plugins/toolbox/skills/doc-review/scripts/review.py` (add
  `serve_blocking`)
- Modify: `plugins/toolbox/skills/doc-review/scripts/test_review.py` (add
  `ServeBlockingTests`)

`serve_blocking(host, port, payload, template, timeout) -> tuple[int, dict | None]`
returns:

- `(0, response_data)` on submit
- `(130, None)` on cancel
- `(124, None)` on timeout

It binds a real socket (port 0 = random free port), exposes the bound port via a
callback so the test can issue requests, and shuts down via `result["status"]`.

- [ ] **Step 1: Add failing tests**

Append to `test_review.py`:

```python
import threading
import urllib.request


class ServeBlockingTests(unittest.TestCase):
    def setUp(self):
        self.payload = {"title": "T", "markdown": "x", "questions": []}
        self.template = "<!doctype html><html><body>__PAYLOAD__</body></html>"

    def _start(self, **overrides):
        kwargs = dict(host="127.0.0.1", port=0, payload=self.payload,
                      template=self.template, timeout=5.0)
        kwargs.update(overrides)
        port_holder = {}
        result_holder = {}

        def runner():
            code, data = review.serve_blocking(
                on_ready=lambda p: port_holder.setdefault("port", p),
                **kwargs,
            )
            result_holder["code"] = code
            result_holder["data"] = data

        t = threading.Thread(target=runner, daemon=True)
        t.start()
        # wait for port_holder to populate
        for _ in range(100):
            if "port" in port_holder:
                break
            import time; time.sleep(0.01)
        self.assertIn("port", port_holder, "server failed to start")
        return port_holder["port"], t, result_holder

    def test_submit_returns_zero_and_response(self):
        port, t, result = self._start()
        body = b'{"answers":{"q1":"hi"},"comments":[]}'
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/submit", data=body, method="POST",
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req).read()
        t.join(timeout=2)
        self.assertEqual(result["code"], 0)
        self.assertEqual(result["data"]["answers"], {"q1": "hi"})

    def test_cancel_returns_130(self):
        port, t, result = self._start()
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/cancel", data=b"", method="POST",
        )
        urllib.request.urlopen(req).read()
        t.join(timeout=2)
        self.assertEqual(result["code"], 130)
        self.assertIsNone(result["data"])

    def test_timeout_returns_124(self):
        _, t, result = self._start(timeout=0.2)
        t.join(timeout=2)
        self.assertEqual(result["code"], 124)
        self.assertIsNone(result["data"])
```

- [ ] **Step 2: Run tests to verify failure**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 3 new `ServeBlockingTests` fail with
`AttributeError: module 'review' has no attribute 'serve_blocking'`.

- [ ] **Step 3: Implement `serve_blocking`**

Append to `review.py`:

```python
import time
from http.server import HTTPServer
from typing import Callable, Optional


def serve_blocking(
    host: str,
    port: int,
    payload: dict,
    template: str,
    timeout: float,
    on_ready: Optional[Callable[[int], None]] = None,
    poll_interval: float = 0.05,
) -> Tuple[int, Optional[dict]]:
    """Run the HTTP server until the user submits, cancels, or times out.

    Returns (exit_code, response_data). exit_code is 0 on submit, 130 on
    cancel, 124 on timeout. response_data is the parsed POST body on submit,
    else None.
    """
    result: dict = {}
    handler_cls = make_handler(payload, template, result)
    httpd = HTTPServer((host, port), handler_cls)
    bound_port = httpd.server_address[1]
    if on_ready:
        on_ready(bound_port)

    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    deadline = time.monotonic() + timeout
    try:
        while time.monotonic() < deadline:
            status = result.get("status")
            if status == "submitted":
                return 0, result.get("data")
            if status == "cancelled":
                return 130, None
            time.sleep(poll_interval)
        return 124, None
    finally:
        httpd.shutdown()
        httpd.server_close()
```

Also add `import threading` near the other imports if not already present.

- [ ] **Step 4: Run tests to verify pass**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 17 tests pass. (Tests use a 5s timeout for happy paths; total runtime
should be under ~3s.)

- [ ] **Step 5: Commit**

```bash
git add plugins/toolbox/skills/doc-review/scripts/
git commit -m "feat(toolbox/doc-review): add blocking server runner with submit/cancel/timeout"
```

---

## Task 6: CLI entry — argparse, stdin/file, exit codes, stdout JSON

**Files:**

- Modify: `plugins/toolbox/skills/doc-review/scripts/review.py` (add `main`,
  `_read_input`, `if __name__ == "__main__"` block)
- Modify: `plugins/toolbox/skills/doc-review/scripts/test_review.py` (add
  `MainTests` driving `main()` via subprocess)

`main(argv, stdin, stdout, stderr, open_browser=...) -> int` does the following:

1. Parse args: `--file`, `--title`, `--timeout`, `--no-open`, `--port`,
   `--host`.
2. Read markdown from stdin (if not a tty) else `--file`. If both empty → exit 2
   with stderr error.
3. Build payload (catches `ValueError` from `parse_questions` → exit 2).
4. Load `template.html` from the script's own directory.
5. Call `serve_blocking`. After `on_ready` fires, print
   `{"url": "http://host:port", "port": N}` to stderr and call
   `webbrowser.open(url)` unless `--no-open`.
6. On exit code 0, print response JSON (with `submitted_at` added) to stdout. On
   124/130, print nothing.
7. Return the exit code.

The `if __name__ == "__main__"` block calls
`sys.exit(main(sys.argv[1:], sys.stdin, sys.stdout, sys.stderr))`.

- [ ] **Step 1: Add failing tests driving `main()` via subprocess**

Append to `test_review.py`:

```python
import subprocess
import os


SCRIPT = Path(__file__).parent / "review.py"


def _run(stdin_text: str, *args, timeout: float = 10.0):
    """Run review.py as a subprocess, return CompletedProcess."""
    return subprocess.run(
        ["python3", str(SCRIPT), "--no-open", *args],
        input=stdin_text,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _post_submit(port: int, data: dict):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}/submit", data=body, method="POST",
        headers={"Content-Type": "application/json"},
    )
    urllib.request.urlopen(req).read()


def _wait_for_port(stderr_buffer):
    """Read stderr until we see the connection-info JSON; return the port."""
    while True:
        line = stderr_buffer.readline()
        if not line:
            raise RuntimeError("subprocess exited before printing port")
        line = line.strip()
        if line.startswith("{") and '"port"' in line:
            return json.loads(line)["port"]


class MainTests(unittest.TestCase):
    def test_no_questions_exits_2(self):
        result = _run("Just prose, no questions.")
        self.assertEqual(result.returncode, 2)
        self.assertIn("no question blocks", result.stderr.lower())

    def test_no_input_exits_2(self):
        result = _run("")
        self.assertEqual(result.returncode, 2)

    def test_submit_prints_response_json_with_timestamp(self):
        # Spawn manually so we can grab the port and POST during its lifetime
        proc = subprocess.Popen(
            ["python3", str(SCRIPT), "--no-open", "--timeout", "5"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True,
        )
        proc.stdin.write("::: question id=q1\nWhy?\n:::")
        proc.stdin.close()
        port = _wait_for_port(proc.stderr)
        _post_submit(port, {"answers": {"q1": "because"}, "comments": []})
        out, _ = proc.communicate(timeout=5)
        self.assertEqual(proc.returncode, 0)
        payload = json.loads(out)
        self.assertEqual(payload["answers"], {"q1": "because"})
        self.assertEqual(payload["comments"], [])
        self.assertIn("submitted_at", payload)

    def test_timeout_exits_124(self):
        result = _run("::: question id=q1\nQ?\n:::", "--timeout", "0.3")
        self.assertEqual(result.returncode, 124)

    def test_file_input(self):
        import tempfile
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
            f.write("::: question id=q1\nWhy?\n:::")
            path = f.name
        try:
            proc = subprocess.Popen(
                ["python3", str(SCRIPT), "--no-open", "--file", path, "--timeout", "5"],
                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True,
            )
            port = _wait_for_port(proc.stderr)
            _post_submit(port, {"answers": {"q1": "ok"}, "comments": []})
            out, _ = proc.communicate(timeout=5)
            self.assertEqual(proc.returncode, 0)
            self.assertEqual(json.loads(out)["answers"], {"q1": "ok"})
        finally:
            os.unlink(path)
```

- [ ] **Step 2: Run tests to verify failure**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 5 new tests fail (subprocess returns nonzero, no stderr port info,
etc.).

- [ ] **Step 3: Implement `main` and CLI dispatch**

Append to `review.py`:

```python
import argparse
import sys
import webbrowser
from datetime import datetime, timezone
from pathlib import Path


def _read_input(args, stdin) -> str:
    """Read markdown from stdin (if piped) else --file. Empty → empty string."""
    if not stdin.isatty():
        text = stdin.read()
        if text:
            return text
    if args.file:
        return Path(args.file).read_text(encoding="utf-8")
    return ""


def main(argv, stdin, stdout, stderr, open_browser=webbrowser.open) -> int:
    parser = argparse.ArgumentParser(
        description="One-shot browser-based markdown review with inline Q&A.",
    )
    parser.add_argument("--file", help="read markdown from this file instead of stdin")
    parser.add_argument("--title", default="Document Review")
    parser.add_argument("--timeout", type=float, default=1800.0,
                        help="max seconds to wait for submit (default 1800)")
    parser.add_argument("--no-open", action="store_true",
                        help="do not auto-open the browser")
    parser.add_argument("--port", type=int, default=0,
                        help="bind port (default: random free)")
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args(argv)

    markdown = _read_input(args, stdin)
    if not markdown.strip():
        print("error: no markdown provided on stdin or via --file", file=stderr)
        return 2

    try:
        payload = build_payload(markdown, title=args.title)
    except ValueError as exc:
        print(f"error: {exc}", file=stderr)
        return 2

    template_path = Path(__file__).parent / "template.html"
    template = template_path.read_text(encoding="utf-8")

    def _on_ready(port: int):
        url = f"http://{args.host}:{port}"
        print(_json.dumps({"url": url, "port": port}), file=stderr, flush=True)
        if not args.no_open:
            try:
                open_browser(url)
            except Exception:  # noqa: BLE001 — opening browser is best-effort
                pass

    code, data = serve_blocking(
        host=args.host,
        port=args.port,
        payload=payload,
        template=template,
        timeout=args.timeout,
        on_ready=_on_ready,
    )

    if code == 0 and data is not None:
        response = {
            "answers": data.get("answers", {}),
            "comments": data.get("comments", []),
            "submitted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        stdout.write(_json.dumps(response))
        stdout.write("\n")
        stdout.flush()

    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:], sys.stdin, sys.stdout, sys.stderr))
```

- [ ] **Step 4: Run tests to verify pass**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 22 tests pass. The subprocess tests should all complete within ~10s
total.

- [ ] **Step 5: Commit**

```bash
git add plugins/toolbox/skills/doc-review/scripts/
git commit -m "feat(toolbox/doc-review): add CLI entry with stdin/file input and exit-code contract"
```

---

## Task 7: Real `template.html` — rendered markdown, question cards, inline comments

**Files:**

- Modify: `plugins/toolbox/skills/doc-review/scripts/template.html` (replace
  placeholder with full UI)

This is the only task that isn't TDD — the UI is verified manually in Task 9.
Keep the JS straightforward; the goal is "readable, fillable, submittable", not
visual polish.

The page must:

1. Read the JSON payload from the `<script id="payload">` tag (substituted
   server-side via `__PAYLOAD__`).
2. Render `payload.markdown` via `marked`, run the resulting HTML through
   `DOMPurify.sanitize(...)`, then walk the rendered DOM and replace each
   `<!--QBLOCK:<id>-->` HTML comment with a question card containing the prompt
   (rendered + sanitized) and a `<textarea>`.
3. On any text selection inside the doc body, show a small floating "💬 Comment"
   button near the selection. Clicking opens an inline comment box anchored
   below the selected paragraph; saving stores
   `{anchor: <selected text>, text: <comment>}` in an in-memory list and shows
   it as a chip near the anchor (using `textContent`, not `innerHTML`, since
   user-typed comments are plain text).
4. The Submit button is always enabled; on click, POST `{answers, comments}`
   JSON to `/submit`. On 200, swap the document body for a confirmation message
   constructed via `textContent`.
5. On `beforeunload` while not yet submitted, fire
   `navigator.sendBeacon('/cancel')`.

**Sanitization rule:** any time the page assigns to `innerHTML`, the value MUST
be the output of `DOMPurify.sanitize(...)` or a hard-coded constant string.
User-typed text uses `textContent`. This is a small surface area — only marked
output gets sanitized.

- [ ] **Step 1: Replace `template.html` with the real UI**

Replace `plugins/toolbox/skills/doc-review/scripts/template.html` entirely with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>__TITLE__</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css"
    />
    <script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.11/dist/purify.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/highlight.min.js"></script>
    <style>
      :root {
        --fg: #1a1a1a;
        --muted: #666;
        --bg: #fafafa;
        --card: #fff;
        --accent: #2563eb;
        --border: #e2e2e2;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font:
          16px/1.6 -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          system-ui,
          sans-serif;
        color: var(--fg);
        background: var(--bg);
      }
      header {
        position: sticky;
        top: 0;
        background: var(--card);
        border-bottom: 1px solid var(--border);
        padding: 12px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 10;
      }
      header h1 {
        margin: 0;
        font-size: 18px;
      }
      header button {
        background: var(--accent);
        color: white;
        border: 0;
        padding: 8px 18px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
      }
      header button:hover {
        filter: brightness(1.1);
      }
      main {
        max-width: 760px;
        margin: 0 auto;
        padding: 32px 24px 120px;
      }
      main h1,
      main h2,
      main h3 {
        line-height: 1.25;
      }
      main pre {
        background: #f4f4f4;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
      }
      main code {
        background: #f0f0f0;
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 0.92em;
      }
      main pre code {
        background: transparent;
        padding: 0;
      }
      main blockquote {
        border-left: 3px solid var(--border);
        margin: 0;
        padding-left: 16px;
        color: var(--muted);
      }
      .qcard {
        background: var(--card);
        border: 1px solid var(--border);
        border-left: 3px solid var(--accent);
        border-radius: 6px;
        padding: 16px 20px;
        margin: 24px 0;
      }
      .qcard .qprompt {
        font-weight: 500;
        margin: 0 0 10px;
      }
      .qcard textarea {
        width: 100%;
        min-height: 80px;
        font: inherit;
        padding: 10px;
        border: 1px solid var(--border);
        border-radius: 4px;
        resize: vertical;
      }
      .comment-chip {
        display: inline-block;
        background: #fff7c2;
        border: 1px solid #e0d27a;
        padding: 6px 10px;
        border-radius: 4px;
        margin: 8px 0;
        font-size: 13px;
      }
      .comment-chip .anchor {
        color: var(--muted);
        font-style: italic;
      }
      .floating-comment-btn {
        position: absolute;
        background: var(--accent);
        color: white;
        border: 0;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 100;
      }
      .inline-comment {
        background: var(--card);
        border: 1px solid var(--accent);
        border-radius: 4px;
        padding: 10px;
        margin: 10px 0;
      }
      .inline-comment textarea {
        width: 100%;
        min-height: 50px;
        font: inherit;
        border: 1px solid var(--border);
        padding: 6px;
        border-radius: 3px;
      }
      .inline-comment .row {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      .inline-comment button {
        padding: 4px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .done {
        text-align: center;
        padding: 80px 24px;
      }
      .done h2 {
        font-size: 32px;
        margin: 0 0 12px;
      }
    </style>
  </head>
  <body>
    <header>
      <h1 id="page-title"></h1>
      <button id="submit-btn" type="button">Submit</button>
    </header>
    <main id="doc"></main>
    <script id="payload" type="application/json">
      __PAYLOAD__
    </script>
    <script>
      (function () {
        const payload = JSON.parse(
          document.getElementById("payload").textContent
        );
        document.getElementById("page-title").textContent = payload.title;
        document.title = payload.title;

        const sanitize = (html) =>
          DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
        const renderMd = (md) => sanitize(marked.parse(md));
        const renderInlineMd = (md) => sanitize(marked.parseInline(md));

        const questionsById = Object.fromEntries(
          payload.questions.map((q) => [q.id, q])
        );
        const answers = {};
        const comments = []; // {anchor, text}
        let submitted = false;

        // Render markdown, then replace QBLOCK comments with question cards.
        const docEl = document.getElementById("doc");
        docEl.innerHTML = renderMd(payload.markdown);
        document
          .querySelectorAll("pre code")
          .forEach((el) => hljs.highlightElement(el));

        // Walk for QBLOCK HTML comments.
        const walker = document.createTreeWalker(
          docEl,
          NodeFilter.SHOW_COMMENT
        );
        const commentsToReplace = [];
        while (walker.nextNode()) {
          const m = walker.currentNode.nodeValue.match(/^QBLOCK:(.+)$/);
          if (m) commentsToReplace.push({ node: walker.currentNode, id: m[1] });
        }
        commentsToReplace.forEach(({ node, id }) => {
          const q = questionsById[id];
          if (!q) return;
          const card = document.createElement("div");
          card.className = "qcard";
          const prompt = document.createElement("div");
          prompt.className = "qprompt";
          prompt.innerHTML = renderInlineMd(q.prompt);
          const ta = document.createElement("textarea");
          ta.placeholder = "Your answer...";
          ta.addEventListener("input", () => {
            if (ta.value.trim()) answers[id] = ta.value;
            else delete answers[id];
          });
          card.appendChild(prompt);
          card.appendChild(ta);
          node.parentNode.replaceChild(card, node);
        });

        // Floating comment button on text selection.
        let floatingBtn = null;
        document.addEventListener("mouseup", () => {
          if (submitted) return;
          const sel = window.getSelection();
          const text = sel.toString().trim();
          if (floatingBtn) {
            floatingBtn.remove();
            floatingBtn = null;
          }
          if (!text || !docEl.contains(sel.anchorNode)) return;
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          floatingBtn = document.createElement("button");
          floatingBtn.className = "floating-comment-btn";
          floatingBtn.textContent = "💬 Comment";
          floatingBtn.style.left = rect.left + window.scrollX + "px";
          floatingBtn.style.top = rect.bottom + window.scrollY + 6 + "px";
          floatingBtn.addEventListener("click", () =>
            openCommentBox(text, range)
          );
          document.body.appendChild(floatingBtn);
        });

        function nearestBlock(node) {
          const el = node.nodeType === 3 ? node.parentElement : node;
          return el.closest("p,li,blockquote,pre,h1,h2,h3,h4,h5,h6") || docEl;
        }

        function openCommentBox(anchorText, range) {
          if (floatingBtn) {
            floatingBtn.remove();
            floatingBtn = null;
          }
          const para = nearestBlock(range.endContainer);
          const box = document.createElement("div");
          box.className = "inline-comment";

          const label = document.createElement("div");
          label.style.cssText =
            "font-size:13px;color:var(--muted);margin-bottom:6px";
          const labelLead = document.createTextNode("on: ");
          const labelQuote = document.createElement("i");
          labelQuote.textContent =
            '"' +
            anchorText.slice(0, 80) +
            (anchorText.length > 80 ? "…" : "") +
            '"';
          label.appendChild(labelLead);
          label.appendChild(labelQuote);

          const ta = document.createElement("textarea");
          ta.placeholder = "Comment...";

          const row = document.createElement("div");
          row.className = "row";
          const saveBtn = document.createElement("button");
          saveBtn.textContent = "Save";
          const cancelBtn = document.createElement("button");
          cancelBtn.textContent = "Cancel";
          row.appendChild(saveBtn);
          row.appendChild(cancelBtn);

          box.appendChild(label);
          box.appendChild(ta);
          box.appendChild(row);

          ta.focus();
          saveBtn.addEventListener("click", () => {
            const text = ta.value.trim();
            if (text) {
              comments.push({ anchor: anchorText, text });
              const chip = document.createElement("div");
              chip.className = "comment-chip";
              const anchorSpan = document.createElement("span");
              anchorSpan.className = "anchor";
              anchorSpan.textContent =
                '"' +
                anchorText.slice(0, 60) +
                (anchorText.length > 60 ? "…" : "") +
                '"';
              const sep = document.createTextNode(": ");
              const textSpan = document.createElement("span");
              textSpan.textContent = text;
              chip.appendChild(anchorSpan);
              chip.appendChild(sep);
              chip.appendChild(textSpan);
              para.parentNode.insertBefore(chip, para.nextSibling);
            }
            box.remove();
          });
          cancelBtn.addEventListener("click", () => box.remove());
          para.parentNode.insertBefore(box, para.nextSibling);
        }

        function showSentScreen() {
          while (document.body.firstChild)
            document.body.removeChild(document.body.firstChild);
          const wrap = document.createElement("div");
          wrap.className = "done";
          const h2 = document.createElement("h2");
          h2.textContent = "✓ Sent";
          const p = document.createElement("p");
          p.textContent = "You can close this tab.";
          wrap.appendChild(h2);
          wrap.appendChild(p);
          document.body.appendChild(wrap);
        }

        document
          .getElementById("submit-btn")
          .addEventListener("click", async () => {
            const btn = document.getElementById("submit-btn");
            btn.disabled = true;
            btn.textContent = "Submitting...";
            try {
              const res = await fetch("/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers, comments }),
              });
              if (!res.ok) throw new Error("submit failed");
              submitted = true;
              showSentScreen();
            } catch (err) {
              btn.disabled = false;
              btn.textContent = "Submit";
              alert("Submit failed: " + err.message);
            }
          });

        window.addEventListener("beforeunload", () => {
          if (!submitted && navigator.sendBeacon) {
            navigator.sendBeacon(
              "/cancel",
              new Blob([], { type: "application/json" })
            );
          }
        });
      })();
    </script>
  </body>
</html>
```

- [ ] **Step 2: Re-run the test suite to confirm nothing regressed**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: all 22 tests still pass. (The handler tests use a placeholder template
via the `template` argument, so they aren't affected by the file content.)

- [ ] **Step 3: Commit**

```bash
git add plugins/toolbox/skills/doc-review/scripts/template.html
git commit -m "feat(toolbox/doc-review): add browser UI with question cards and inline comments"
```

---

## Task 8: Write `SKILL.md`

**Files:**

- Create: `plugins/toolbox/skills/doc-review/SKILL.md`

The skill description determines when agents will autonomously invoke this
skill, so it must be specific.

- [ ] **Step 1: Write `SKILL.md`**

Create `plugins/toolbox/skills/doc-review/SKILL.md`:

````markdown
---
name: doc-review
description:
  Spawn a one-shot browser review window when you have a longer markdown
  document with multiple embedded questions for the user. Use when the agent
  needs to share a paragraph or longer of context plus 2+ structured questions,
  and a terminal back-and-forth would be cumbersome to read or reply to. The
  user reads rendered markdown, fills in answers inline, optionally selects text
  and adds anchored comments, submits once, and the agent receives the
  structured response in the same turn. Triggers when user says "let's review
  this in a browser", "open this in a window so I can read it", "send me the
  questions in a browser", or when the agent produces 200+ words of content
  alongside multiple discrete questions. Do NOT use for single short questions,
  iterative back-and-forth, or visual design picking — use chat for the first
  two and the brainstorming skill's visual-companion for the third.
---

# doc-review

A one-shot browser review companion for long-form Q&A interactions. The agent
writes a markdown document with embedded `:::question` fences, runs `review.py`,
and the script blocks until the user submits a response in the browser.

## When to Use

Use when **all** are true:

- You have at least one paragraph of context the user benefits from reading
  rendered (headings, lists, code blocks).
- You have 1+ discrete questions you want answered.
- A single terminal-friendly response is enough — no follow-up rounds in the
  same browser session.

Do NOT use for: single short questions (just ask in chat), iterative selection
of visual options (use `superpowers:brainstorming` visual companion), or
anything where the user would reasonably want a real chat back-and-forth.

## How It Works

1. You write markdown with `:::question` fences.
2. You invoke `scripts/review.py` via the Bash tool, passing the markdown on
   stdin (or `--file path.md`).
3. The script opens the user's browser to a local URL and **blocks** until the
   user submits.
4. On submit, the script prints a JSON response to stdout and exits 0.
5. You parse the JSON and continue the conversation with the answers.

The Bash tool call blocks for the duration of the review. Set a long enough Bash
timeout (default `--timeout 1800` = 30 min); shorten with `--timeout 600` if you
expect a quicker turnaround.

## Question Block Syntax

```markdown
::: question id=scope Should we include the migration step in this PR or split
it? :::
```

Rules:

- `id` is required, must be unique within the doc, alphanumeric / `-` / `_`.
- The body is markdown; it renders inside the question card.
- Pure-prose docs without any `:::question` blocks are rejected (exit 2).

## Invocation

**stdin (preferred for short-to-medium docs):**

```bash
cat <<'EOF' | python3 ${CLAUDE_PLUGIN_ROOT}/skills/doc-review/scripts/review.py --title "Proposal Review" --timeout 1800
# Foo proposal

Some context paragraphs explaining the proposal...

::: question id=scope
Should we include the migration in this PR?
:::

More context...

::: question id=naming
Pick a name: `FooManager`, `FooService`, or `FooCoordinator`?
:::
EOF
```

**file (for very long docs or when you've already written one):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/doc-review/scripts/review.py \
  --file /path/to/proposal-review.md \
  --title "Proposal Review" \
  --timeout 1800
```

## Response Format

Stdout JSON on successful submit:

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
  "submitted_at": "2026-05-06T12:34:56Z"
}
```

- `answers`: keys are question `id`s. **Missing keys mean the user left that
  question blank** — treat as "no answer", not as an empty-string answer.
- `comments`: array (possibly empty) of text-anchored inline comments.
- `submitted_at`: ISO 8601 UTC timestamp.

## Exit Code Contract

| Code | Meaning             | What to do                                                                                                             |
| ---- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 0    | Submitted           | Parse stdout JSON, continue conversation                                                                               |
| 2    | Bad input           | stderr explains; fix the markdown and retry                                                                            |
| 124  | Timeout             | Tell the user "the review timed out — want to try again?"                                                              |
| 130  | User closed the tab | Tell the user "I noticed you closed the tab without submitting — want me to retry, or should we continue another way?" |

## Flags

- `--file PATH` — read markdown from file instead of stdin
- `--title TEXT` — page/tab title (default `"Document Review"`)
- `--timeout SECONDS` — failsafe timeout (default `1800` / 30 min)
- `--no-open` — don't auto-open the browser; useful in headless / SSH setups
- `--port N` — bind specific port (default: random free port)
- `--host HOST` — bind host (default `127.0.0.1`)

The script prints `{"url": "...", "port": N}` to stderr as soon as it's
listening, before opening the browser.

## Common Pitfalls

- **Don't use this for one short question.** A question that would fit in one
  terminal line should stay in chat.
- **Don't forget unique `id`s.** Duplicate IDs exit 2.
- **Don't expect a multi-turn session.** One submit ends the session. Spawn a
  fresh `review.py` for a follow-up review.
- **Set Bash timeout high enough.** The default Bash timeout (2 min) is way
  shorter than the default review timeout (30 min). Pass `timeout: 1800000` (ms)
  to the Bash tool, or shorten `--timeout` to match.
````

- [ ] **Step 2: Commit**

```bash
git add plugins/toolbox/skills/doc-review/SKILL.md
git commit -m "docs(toolbox/doc-review): add SKILL.md"
```

---

## Task 9: End-to-end manual smoke test

**Files:** none modified — this is a verification task.

- [ ] **Step 1: Run with a real doc and submit normally**

````bash
cat <<'EOF' | python3 plugins/toolbox/skills/doc-review/scripts/review.py --title "Smoke Test" --timeout 600
# Smoke Test

This is the first paragraph of context. It has **bold** and *italic* and `inline code`.

```python
def hello():
    return "world"
````

::: question id=q1 Did the markdown render correctly with code highlighting? :::

A second paragraph with a list:

- Item one
- Item two

::: question id=q2 Did the inline comment flow work? Try selecting some text and
clicking 💬. :::

EOF

````

In the browser: verify the markdown renders, both questions have textareas, code is highlighted, selecting text shows the floating 💬 button, comments appear as chips. Fill in both answers, leave one inline comment, click Submit. Confirm the page shows "✓ Sent" and the terminal prints valid JSON with both answers, the comment, and a `submitted_at` timestamp. Confirm the script exits 0.

- [ ] **Step 2: Verify cancel path**

Run the same command, but in the browser, close the tab without submitting. Confirm the script exits 130 within ~1s.

```bash
echo $?
# expected: 130
````

- [ ] **Step 3: Verify timeout path**

```bash
printf '::: question id=q1\nQ?\n:::\n' | python3 plugins/toolbox/skills/doc-review/scripts/review.py --no-open --timeout 2
echo $?
# expected: 124
```

- [ ] **Step 4: Verify bad-input path**

```bash
echo "no questions here" | python3 plugins/toolbox/skills/doc-review/scripts/review.py --no-open
echo $?
# expected: 2 (with "no question blocks" on stderr)
```

- [ ] **Step 5: If any smoke test fails, fix the issue and re-run all tests**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 22/22 pass.

- [ ] **Step 6: Commit any fixes**

If fixes were needed:

```bash
git add plugins/toolbox/skills/doc-review/
git commit -m "fix(toolbox/doc-review): <describe fix>"
```

---

## Task 10: Build dist mirror, validate, final commit

**Files:**

- Auto-modified by `npm run build:dist`: `dist/toolbox/skills/doc-review/**`

- [ ] **Step 1: Run the build script**

```bash
npm run build:dist
```

Expected: completes without errors. Verify
`dist/toolbox/skills/doc-review/SKILL.md` and
`dist/toolbox/skills/doc-review/scripts/{review.py,template.html,test_review.py}`
now exist.

- [ ] **Step 2: Run the skills validator**

```bash
npm run validate:skills
```

Expected: completes without errors.

- [ ] **Step 3: Verify dist version matches plugins version**

```bash
grep '"version"' plugins/toolbox/.claude-plugin/plugin.json dist/toolbox/.claude-plugin/plugin.json
```

Both should show `"version": "1.2.0"`.

- [ ] **Step 4: Re-run unit tests one final time**

```bash
python3 plugins/toolbox/skills/doc-review/scripts/test_review.py
```

Expected: 22/22 pass.

- [ ] **Step 5: Commit the dist mirror**

```bash
git add dist/toolbox/
git commit -m "chore(toolbox): rebuild dist for doc-review skill (v1.2.0)"
```

- [ ] **Step 6: Verify final tree is clean**

```bash
git status
```

Expected: working tree clean. Branch ahead of origin by N commits (one per
task).

---

## Self-Review Notes

Spec coverage:

- KPI 1 (speed for agent): single bash call, JSON in / JSON out — Task 6 /
  Task 8.
- KPI 2 (speed for user): one-shot blocking, no ping-back, auto-open — Tasks 5
  / 7.
- KPI 3 (readability): marked.js + highlight.js + 760px column — Task 7.
- KPI 4 (portability): Python stdlib only, blocking model sidesteps
  platform-specific background-process quirks — Task 6.
- Question block syntax: `:::question id=` — Task 2.
- Response shape (`answers` / `comments` / `submitted_at`): Tasks 6 / 7.
- Exit code contract (0/2/124/130): Tasks 5 / 6.
- Inline-comment selection anchoring: Task 7.
- `--file` and stdin both supported: Task 6.
- `--no-open`, `--timeout`, `--port`, `--host` flags: Task 6.
- "What we are NOT building" all respected (no MCP, no offline mode, no
  persistence, no editing): throughout.
- Security: DOMPurify-sanitize all marked output before innerHTML; user-typed
  text uses textContent — Task 7.

Risks acknowledged in spec:

- Selection-anchor disambiguation is left as verbatim-only for v1; documented as
  a known limitation in the spec, not a blocker for shipping.
- CDN dependency is accepted for v1; offline mode deferred.
