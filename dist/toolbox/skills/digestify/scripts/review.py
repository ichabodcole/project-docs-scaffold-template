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
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple


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

    Each fence in the source is replaced with `<div data-qblock="<id>"></div>`,
    a placeholder that survives DOMPurify sanitization in the browser. Zero
    question blocks is valid — the page renders as a read-only / comment-only
    review. Raises ValueError on missing/empty ids, duplicate ids, or empty
    bodies.
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
        if not body:
            raise ValueError(f"question id={qid!r} has empty body")
        questions.append(Question(id=qid, prompt=body))
        # Surround with blank lines so marked treats this as a self-contained
        # HTML block. Without a trailing blank line, type-6 HTML blocks
        # (CommonMark) consume following markdown as raw HTML, breaking
        # subsequent headings and paragraphs.
        return f'\n\n<div data-qblock="{qid}"></div>\n\n'

    transformed = _QBLOCK_RE.sub(_replace, markdown)
    return transformed, questions


import json as _json
import mimetypes
import threading
from http.server import BaseHTTPRequestHandler
from urllib.parse import unquote, urlparse


def build_payload(
    markdown: str,
    title: str = "Document Review",
    theme: str = "digestify",
) -> dict:
    """Parse questions out of the markdown and return the page payload dict."""
    transformed, questions = parse_questions(markdown)
    return {
        "title": title,
        "theme": theme,
        "markdown": transformed,
        "questions": [{"id": q.id, "prompt": q.prompt} for q in questions],
    }


def make_handler(
    payload: dict,
    template: str,
    result: dict,
    assets_dir: Optional[Path] = None,
):
    """Return a BaseHTTPRequestHandler subclass bound to this session's state.

    `result` is a dict the handler mutates: on /submit it gets {"status":
    "submitted", "data": <body>}; on /cancel {"status": "cancelled"}. The
    main loop watches `result` to decide when to shut down the server.
    """
    import html as _html

    # Escape `</` in JSON so the payload string can't prematurely close a
    # surrounding <script> tag (e.g. if a title or markdown body contains
    # "</script>"). The browser still parses this as valid JSON.
    payload_json = _json.dumps(payload).replace("</", "<\\/")
    # HTML-escape the title before substituting into the template — title is
    # agent-supplied and lands inside both <title> and visible markup.
    page_html = template.replace(
        "__TITLE__", _html.escape(payload["title"], quote=True)
    ).replace("__PAYLOAD__", payload_json)
    asset_root = assets_dir.resolve() if assets_dir else None

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
            elif self.path.startswith("/assets/") and asset_root:
                asset_name = unquote(urlparse(self.path).path.removeprefix("/assets/"))
                asset_path = (asset_root / asset_name).resolve()
                if asset_root not in asset_path.parents or not asset_path.is_file():
                    self._send(404, b'{"error":"not found"}')
                    return
                content_type = (
                    mimetypes.guess_type(asset_path.name)[0]
                    or "application/octet-stream"
                )
                self._send(200, asset_path.read_bytes(), content_type)
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


import time
from http.server import HTTPServer
from typing import Callable
import argparse
import sys
import webbrowser
from datetime import datetime, timezone


def serve_blocking(
    host: str,
    port: int,
    payload: dict,
    template: str,
    timeout: float,
    on_ready: Optional[Callable[[int], None]] = None,
    poll_interval: float = 0.05,
    assets_dir: Optional[Path] = None,
) -> Tuple[int, Optional[dict]]:
    """Run the HTTP server until the user submits, cancels, or times out.

    Returns (exit_code, response_data). exit_code is 0 on submit, 130 on
    cancel, 124 on timeout. response_data is the parsed POST body on submit,
    else None.
    """
    result: dict = {}
    handler_cls = make_handler(payload, template, result, assets_dir=assets_dir)
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


def _read_input(args, stdin) -> str:
    """Assemble markdown from --reference (if any) + stdin or --file.

    The --reference body lands first; agent-authored content from stdin or
    --file appends below with a blank-line separator. Either side may be
    empty. Returns "" if all sources are empty.

    Stdin is only read when it actually has data or EOF ready within a
    short window — agent-harness background contexts can leave stdin
    open-but-empty, and a naive `.read()` would hang forever.
    """
    import select

    import html as _html_lib

    reference_content = ""
    ref_label = ""
    if args.reference:
        reference_content = Path(args.reference).read_text(encoding="utf-8")
        ref_label = Path(args.reference).name

    agent_content = ""
    if not stdin.isatty():
        try:
            ready, _, _ = select.select([stdin], [], [], 0.1)
            if ready:
                agent_content = stdin.read()
        except (ValueError, OSError):
            # stdin doesn't support select (rare on some platforms); skip.
            pass

    if not agent_content and args.file:
        agent_content = Path(args.file).read_text(encoding="utf-8")

    parts: List[str] = []
    if reference_content.strip():
        # Caption the reference content with its filename so the user can
        # tell at a glance which prose came from the doc they pointed at
        # vs. content the agent added below. Use the basename only — full
        # paths leak local filesystem layout into the rendered page.
        parts.append(f"> Reference: `{ref_label}`\n\n{reference_content.rstrip()}")
    if agent_content.strip():
        # When combined with reference content, separate with a styled
        # boundary marker rather than a plain '---'. Reference docs
        # commonly contain markdown HRs of their own; another `---` would
        # be visually indistinguishable from the doc's existing
        # separators. The marker carries the (HTML-escaped) reference
        # filename so the template can render "end of <filename>" as
        # the label without enabling attribute-injection.
        if parts:
            label_attr = _html_lib.escape(ref_label, quote=True)
            parts.append(
                f'<div data-refboundary="{label_attr}"></div>\n\n'
                + agent_content.rstrip()
            )
        else:
            parts.append(agent_content.rstrip())

    return "\n\n".join(parts)


def main(argv, stdin, stdout, stderr, open_browser=webbrowser.open) -> int:
    parser = argparse.ArgumentParser(
        description="One-shot browser-based markdown review with inline Q&A.",
    )
    parser.add_argument(
        "--file",
        help="read agent-authored markdown from this file instead of stdin",
    )
    parser.add_argument(
        "--reference",
        help=(
            "read a reference doc from this path; combines with stdin/--file "
            "(reference body first, agent content appended). Use this to point "
            "at a doc on disk so its content doesn't pass through the agent."
        ),
    )
    parser.add_argument("--title", default="Document Review")
    parser.add_argument(
        "--theme",
        default="digestify",
        choices=("digestify", "cthulhu", "classic"),
        help="visual theme to use in the browser UI",
    )
    parser.add_argument("--timeout", type=float, default=1800.0,
                        help="max seconds to wait for submit (default 1800)")
    parser.add_argument("--no-open", action="store_true",
                        help="do not auto-open the browser")
    parser.add_argument("--port", type=int, default=0,
                        help="bind port (default: random free)")
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args(argv)

    try:
        markdown = _read_input(args, stdin)
    except FileNotFoundError as exc:
        print(f"error: file not found: {exc.filename}", file=stderr)
        return 2
    if not markdown.strip():
        print(
            "error: no markdown provided on stdin, --file, or --reference",
            file=stderr,
        )
        return 2

    try:
        payload = build_payload(markdown, title=args.title, theme=args.theme)
    except ValueError as exc:
        print(f"error: {exc}", file=stderr)
        return 2

    template_path = Path(__file__).parent / "template.html"
    template = template_path.read_text(encoding="utf-8")
    assets_dir = Path(__file__).parent.parent / "assets"

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
        assets_dir=assets_dir,
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
