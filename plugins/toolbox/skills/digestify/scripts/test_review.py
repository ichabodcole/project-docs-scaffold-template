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
        self.assertIn('data-qblock="scope"', transformed)
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

    def test_no_questions_returns_empty_list(self):
        # Zero question blocks is valid — page becomes a read-only review.
        transformed, questions = review.parse_questions(
            "Just prose, no questions."
        )
        self.assertEqual(questions, [])
        self.assertEqual(transformed, "Just prose, no questions.")

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

    def test_empty_body_raises(self):
        md = "::: question id=foo\n\n:::"
        with self.assertRaises(ValueError) as cm:
            review.parse_questions(md)
        self.assertIn("empty", str(cm.exception).lower())

    def test_id_can_contain_underscores_hyphens_alphanumeric(self):
        md = "::: question id=naming-v2\nQ?\n:::\n\n::: question id=scope_a\nQ?\n:::"
        _, questions = review.parse_questions(md)
        self.assertEqual([q.id for q in questions], ["naming-v2", "scope_a"])


class BuildPayloadTests(unittest.TestCase):
    def test_payload_contains_title_markdown_and_questions(self):
        md = "Intro.\n\n::: question id=q1\nWhy?\n:::"
        payload = review.build_payload(md, title="Test Title")
        self.assertEqual(payload["title"], "Test Title")
        self.assertEqual(payload["theme"], "digestify")
        self.assertIn('data-qblock="q1"', payload["markdown"])
        self.assertEqual(payload["questions"], [{"id": "q1", "prompt": "Why?"}])

    def test_payload_default_title(self):
        md = "::: question id=q1\nQ?\n:::"
        payload = review.build_payload(md)
        self.assertEqual(payload["title"], "Document Review")

    def test_payload_accepts_theme(self):
        md = "::: question id=q1\nQ?\n:::"
        payload = review.build_payload(md, theme="classic")
        self.assertEqual(payload["theme"], "classic")

    def test_payload_accepts_cthulhu_theme(self):
        md = "::: question id=q1\nQ?\n:::"
        payload = review.build_payload(md, theme="cthulhu")
        self.assertEqual(payload["theme"], "cthulhu")

    def test_payload_is_json_serialisable(self):
        md = "::: question id=q1\nQ?\n:::"
        payload = review.build_payload(md)
        json.dumps(payload)  # must not raise

    def test_payload_includes_session_id_and_timeout(self):
        md = "::: question id=q1\nQ?\n:::"
        payload = review.build_payload(
            md, session_id="my-slug", timeout_seconds=900
        )
        self.assertEqual(payload["session_id"], "my-slug")
        self.assertEqual(payload["timeout_seconds"], 900)


class ParsePortFromSessionIdTests(unittest.TestCase):
    def test_extracts_trailing_port_marker(self):
        self.assertEqual(
            review.parse_port_from_session_id("digestify-abc123-p61432"), 61432
        )

    def test_returns_none_when_no_port_marker(self):
        self.assertIsNone(review.parse_port_from_session_id("digestify-abc123"))

    def test_returns_none_for_empty_id(self):
        self.assertIsNone(review.parse_port_from_session_id(""))

    def test_rejects_out_of_range_port(self):
        # Port must fit in valid TCP range; 99999 is too big.
        self.assertIsNone(
            review.parse_port_from_session_id("digestify-abc-p99999")
        )

    def test_only_matches_trailing_marker(self):
        # `-p<digits>` mid-string shouldn't be picked up — only suffix.
        self.assertIsNone(
            review.parse_port_from_session_id("digestify-p1234-suffix")
        )


import io
from http.server import BaseHTTPRequestHandler


class FakeRequest:
    """Stand-in for a socket connection to drive BaseHTTPRequestHandler directly."""

    def __init__(self, raw: bytes):
        self.rfile = io.BytesIO(raw)
        self.wfile = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        return self.rfile if "r" in mode else self.wfile

    def sendall(self, data: bytes):
        # Python 3.12 _SocketWriter calls sendall directly on the socket object.
        self.wfile.write(data)

    def fileno(self):
        return -1


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

    def test_title_is_html_escaped(self):
        # Title comes from agent input; must not allow tag injection into
        # the rendered HTML (e.g. the <title> element).
        template = (
            '<!doctype html><html><head><title>__TITLE__</title></head>'
            '<body><h1>__TITLE__</h1></body></html>'
        )
        payload = {
            "title": "<script>alert(1)</script>",
            "markdown": "x",
            "questions": [],
        }
        result = {}
        HandlerCls = review.make_handler(payload, template, result)
        _, response = _drive(HandlerCls, b"GET / HTTP/1.1\r\nHost: x\r\n\r\n")
        body = response.split(b"\r\n\r\n", 1)[1]
        self.assertNotIn(b"<script>alert(1)</script>", body)
        self.assertIn(b"&lt;script&gt;alert(1)&lt;/script&gt;", body)

    def test_payload_json_escapes_closing_script_tag(self):
        # If the title (or markdown) contains </script>, naive JSON encoding
        # would let it escape the surrounding <script type="application/json">
        # tag in the real template. Verify the payload escapes </ to <\/.
        payload = {
            "title": "</script><script>alert(1)</script>",
            "markdown": "x",
            "questions": [],
        }
        template = (
            '<script id="payload" type="application/json">__PAYLOAD__</script>'
        )
        result = {}
        HandlerCls = review.make_handler(payload, template, result)
        _, response = _drive(HandlerCls, b"GET / HTTP/1.1\r\nHost: x\r\n\r\n")
        body = response.split(b"\r\n\r\n", 1)[1]
        self.assertNotIn(b"</script><script>", body)
        self.assertIn(b"<\\/script>", body)

    def test_get_asset_serves_file_from_assets_dir(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            assets_dir = Path(tmp)
            (assets_dir / "mascot.png").write_bytes(b"png-bytes")
            handler_cls = review.make_handler(
                self.payload,
                self.template,
                self.result,
                assets_dir=assets_dir,
            )
            _, response = _drive(
                handler_cls,
                b"GET /assets/mascot.png HTTP/1.1\r\nHost: x\r\n\r\n",
            )
            self.assertIn(b"200", response.split(b"\r\n", 1)[0])
            self.assertEqual(response.split(b"\r\n\r\n", 1)[1], b"png-bytes")

    def test_get_asset_rejects_path_traversal(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            handler_cls = review.make_handler(
                self.payload,
                self.template,
                self.result,
                assets_dir=Path(tmp),
            )
            _, response = _drive(
                handler_cls,
                b"GET /assets/../template.html HTTP/1.1\r\nHost: x\r\n\r\n",
            )
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

    def test_heartbeat_extends_deadline(self):
        """A heartbeat received before the idle timeout pushes the deadline
        forward — the server is still alive past the original cutoff."""
        port, t, result = self._start(timeout=0.4, poll_interval=0.02)
        # Sleep to ~0.3s, send heartbeat (should extend by 0.4s more).
        time.sleep(0.3)
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/heartbeat", data=b"", method="POST",
        )
        urllib.request.urlopen(req).read()
        # Sleep past the original 0.4s deadline; if heartbeat worked, server
        # is still running. Submit to force a clean exit and verify code 0.
        time.sleep(0.25)  # total elapsed ~0.55s, well past original 0.4s
        body = b'{"answers":{},"comments":[]}'
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/submit", data=body, method="POST",
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req).read()
        t.join(timeout=2)
        self.assertEqual(
            result["code"], 0,
            "server should still have been alive after heartbeat extended deadline",
        )

    def test_heartbeat_does_not_prevent_eventual_idle_timeout(self):
        """Without further heartbeats, the deadline still fires."""
        port, t, result = self._start(timeout=0.3, poll_interval=0.02)
        # One heartbeat, then go silent — server should time out one cycle later.
        time.sleep(0.1)
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/heartbeat", data=b"", method="POST",
        )
        urllib.request.urlopen(req).read()
        # No further activity — server should now exit ~0.3s after the heartbeat.
        t.join(timeout=2)
        self.assertEqual(result["code"], 124)


import time
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
    def test_no_questions_submits_with_empty_answers(self):
        # Prose-only input is valid — server starts, user can submit (or
        # leave comments), agent gets back empty answers.
        proc = subprocess.Popen(
            ["python3", str(SCRIPT), "--no-open", "--timeout", "5"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True,
        )
        proc.stdin.write("Just prose, no questions.\n")
        proc.stdin.close()
        port = _wait_for_port(proc.stderr)
        _post_submit(port, {"answers": {}, "comments": []})
        out = proc.stdout.read()
        proc.wait(timeout=5)
        self.assertEqual(proc.returncode, 0)
        payload = json.loads(out)
        self.assertEqual(payload["answers"], {})
        self.assertEqual(payload["comments"], [])

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
        out = proc.stdout.read()
        proc.wait(timeout=5)
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

    def test_reference_only(self):
        # A reference doc with no agent content; user reads + submits.
        import tempfile
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
            f.write("# Reference doc\n\nJust prose, no questions.\n")
            ref_path = f.name
        try:
            proc = subprocess.Popen(
                ["python3", str(SCRIPT), "--no-open", "--reference", ref_path, "--timeout", "5"],
                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True,
            )
            port = _wait_for_port(proc.stderr)
            _post_submit(port, {"answers": {}, "comments": []})
            out, _ = proc.communicate(timeout=5)
            self.assertEqual(proc.returncode, 0)
            self.assertEqual(json.loads(out)["answers"], {})
        finally:
            os.unlink(ref_path)

    def test_reference_plus_stdin_questions(self):
        # Reference doc + agent's added questions on stdin. Reference body
        # comes first, agent's stdin chunk appends below.
        import tempfile
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
            f.write("# Reference doc\n\nSome content.\n")
            ref_path = f.name
        try:
            proc = subprocess.Popen(
                ["python3", str(SCRIPT), "--no-open", "--reference", ref_path, "--timeout", "5"],
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True,
            )
            proc.stdin.write("::: question id=q1\nReactions?\n:::\n")
            proc.stdin.close()
            port = _wait_for_port(proc.stderr)
            _post_submit(port, {"answers": {"q1": "looks good"}, "comments": []})
            out = proc.stdout.read()
            proc.wait(timeout=5)
            self.assertEqual(proc.returncode, 0)
            self.assertEqual(json.loads(out)["answers"], {"q1": "looks good"})
        finally:
            os.unlink(ref_path)

    def test_reference_plus_file_questions(self):
        # Reference doc + agent's added questions from a separate --file.
        import tempfile
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
            f.write("# Reference doc\n\nSome content.\n")
            ref_path = f.name
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
            f.write("::: question id=q1\nReactions?\n:::\n")
            agent_path = f.name
        try:
            proc = subprocess.Popen(
                [
                    "python3", str(SCRIPT), "--no-open",
                    "--reference", ref_path,
                    "--file", agent_path,
                    "--timeout", "5",
                ],
                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True,
            )
            port = _wait_for_port(proc.stderr)
            _post_submit(port, {"answers": {"q1": "yep"}, "comments": []})
            out, _ = proc.communicate(timeout=5)
            self.assertEqual(proc.returncode, 0)
            self.assertEqual(json.loads(out)["answers"], {"q1": "yep"})
        finally:
            os.unlink(ref_path)
            os.unlink(agent_path)

    def test_missing_reference_path_exits_2(self):
        result = _run("", "--reference", "/tmp/does-not-exist-digestify-test.md")
        self.assertEqual(result.returncode, 2)
        self.assertIn("file not found", result.stderr.lower())

    def test_reference_filename_with_quote_is_html_escaped(self):
        # A reference filename containing `"` could otherwise break out of
        # the data-refboundary attribute. Verify _read_input HTML-escapes
        # the attribute value before it lands in the markdown.
        import tempfile, os, types

        tmpdir = tempfile.mkdtemp()
        ref_path = os.path.join(tmpdir, 'has"quote.md')
        try:
            with open(ref_path, "w") as f:
                f.write("# Ref body\n")
            args = types.SimpleNamespace(
                reference=ref_path, file=None,
            )
            # Use a real OS pipe so _read_input's select.select() works.
            r, w = os.pipe()
            os.write(w, b"::: question id=q1\nQ?\n:::\n")
            os.close(w)
            stdin = os.fdopen(r, "r")
            try:
                md = review._read_input(args, stdin)
            finally:
                stdin.close()
            # Expect HTML-escaped attribute value, never a raw `"` inside
            # the data-refboundary attribute that would break out.
            self.assertIn('data-refboundary="has&quot;quote.md"', md)
            self.assertNotIn('data-refboundary="has"quote.md"', md)
        finally:
            os.unlink(ref_path)
            os.rmdir(tmpdir)


if __name__ == "__main__":
    unittest.main()
