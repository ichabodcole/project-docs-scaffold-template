# Digestify Session Recovery — Initial Implementation — 2026-05-08

## Context

Add session-resilience features to the digestify skill so users don't lose work
to timeouts. The drivers were two related concerns the user raised while using
the tool: (1) the timer was invisible — users had no way to know how much time
they had before the script killed the session; (2) if the timer did fire
mid-review, all in-progress answers and comments were gone. No formal proposal
or plan; this was an iterative build with the user dogfooding each feature.

## What Happened

Built up in concentric layers, each verified by a real dogfood session before
the next layer was added:

1. **Comment chip polish (preliminary).** `border-radius: 999px` was producing
   pill shapes that looked weird wrapping long text. Dropped to `10px`, added
   `max-width: 100%` and `pre-wrap` body. Added Edit and Delete actions per
   chip. Stripped client-side `id` from the submit payload so the agent JSON
   shape stayed `{anchor, text}` per comment.

2. **Visible idle timer + heartbeat.** Header pill counts down from `--timeout`;
   `markActivity()` resets the local deadline and (throttled to once per 5s)
   POSTs `/heartbeat`. Server holds a sliding `heartbeat_at` and the polling
   loop checks `now - heartbeat_at >= timeout` instead of a fixed absolute
   deadline. Stderr logs each heartbeat with monotonic timestamp so
   agents/operators can verify activity is reaching the server.

3. **Bug: client-side `Math.max(60, ...)` clamp on the displayed timeout.**
   Caught the first time the user tried `--timeout 20` — the page showed "0:59"
   while the server was actually about to die at 0:20. Killed the clamp.

4. **Manual reset button.** Click the timer pill → bypass the 5s heartbeat
   throttle, force an immediate `/heartbeat`, brief spin animation. Added
   keyboard-accessible (`role="button"`, Enter/Space).

5. **Recovery via session ID.** First implemented as server-side filesystem
   persistence (`~/.digestify/sessions/<id>.json`). User pushed back: too much
   complexity for an emergency hatch. Reverted to localStorage-backed
   persistence — but localStorage is partitioned by origin (host+port), and each
   launch gets a random port, so cross-process recovery breaks. Solution: bake
   the bound port into the auto-generated session id
   (`digestify-<rand>-p<port>`); on relaunch with the same `--id`, the script
   parses the port and rebinds it via probe-bind with `SO_REUSEADDR` (TIME_WAIT
   is the common state on rapid relaunch). Same port → same origin → same
   localStorage namespace → restored.

6. **Floating-button icon overlap.** Three-dot indicator was rendered via
   box-shadow off a 7px ::before; flex only reserved 7px of width, so the
   trailing dots overlapped the "Comment" label. Added `margin-right: 20px` to
   reserve space for the box-shadowed dots.

The independent code review caught five legitimate items, four of which were
fixed before merge:

- `import time` and `import sys` were positioned **below** `make_handler`
  (worked at runtime via late binding but a structural hazard). Hoisted all
  stdlib imports to the top.
- localStorage restore was unconditionally copying every prior `answers` key
  into the live `answers` map, including ids that no longer existed in the
  current payload. Filtered against `questionsById` so stale keys can't leak
  into the submit payload.
- The `HTTPServer` bind after probe-close was unhandled — a lost race against
  another process would surface as a raw Python traceback. Wrapped in try/except
  OSError, returns exit code 2 with a structured `bind_error` stderr line.
- `markActivity()` didn't gate on `expired`. A doomed tab with background typing
  could either prolong a session the user thought was dead or post heartbeats to
  a dead server. Added `expired` to the early-return.
- `extendDeadline()` silently swallowed fetch failures, which would leave the
  user staring at a freshly reset timer for a session that was already gone. The
  catch handler now flips the timer to "expired" so the UI matches reality.

The fifth (cross-thread `result` dict write without a lock) was deferred —
reviewer noted CPython's GIL makes this practically zero-risk for a localhost
dev tool.

## Notable Discoveries

- **localStorage is partitioned by `scheme + host + port`.** Two HTTP servers on
  the same host but different ports have completely separate localStorage
  namespaces. This was the entire reason the first restore attempt failed — two
  random-port sessions had no shared state to recover from. The fix (encoding
  port in the session id) only works because we control both ends of the
  relaunch contract.

- **macOS holds ports in `TIME_WAIT` for ~60-120 seconds after close.**
  `HTTPServer` sets `SO_REUSEADDR` by default (so its rebind works), but a bare
  `socket.socket()` doesn't. The probe-bind needed
  `setsockopt(SOL_SOCKET, SO_REUSEADDR, 1)` to land on the just-vacated port;
  without it, every recovery attempt failed immediately.

- **Sliding-window keepalive >> filesystem persistence for "I went to lunch"
  recovery.** The user's framing was instructive: filesystem persistence is
  durable across all kinds of failures (browser switch, machine reboot, cleared
  site data) but the practical recovery case is "I forgot the timer was
  running." For that, manual-reset on the visible timer eliminates the problem
  entirely. localStorage handles the residual case where the user did walk away.
  The simpler tool that actually solves the common case beat the more durable
  tool that solves cases nobody encounters.

## Changes Made

- `plugins/toolbox/skills/digestify/scripts/review.py` — `--id`, `--port`,
  port-from-id parser, probe-bind with `SO_REUSEADDR`, `/heartbeat` endpoint,
  sliding-window deadline in `serve_blocking`, structured `bind_error` on
  HTTPServer rebind failure, hoisted stdlib imports.
- `plugins/toolbox/skills/digestify/scripts/template.html` — header timer pill
  (clickable, role=button), session id chip (click-to-copy), comment chip polish
  (radius, edit/delete), localStorage restore filtered against current
  questions, expired-state guards in `markActivity` / `extendDeadline`.
- `plugins/toolbox/skills/digestify/scripts/test_review.py` — heartbeat
  extension test, idle-timeout-after-one-heartbeat test, port-from-id parser
  tests, payload session-id/timeout test. 38 → 43 unit tests.
- `plugins/toolbox/skills/digestify/SKILL.md` — `--id` flag, idle-timer
  semantics paragraph, **Session Recovery** section, exit-code 124/130 guidance
  updated to mention restore.
- `plugins/toolbox/.claude-plugin/plugin.json` — 1.4.0 → 1.5.0.
- `.gitignore`, `.prettierignore` — added `.scratch/` alongside the existing
  agent-scratch dirs so dogfood files don't trigger pre-commit format checks.

## Lessons Learned

- **Dogfood with a short `--timeout` even when the feature isn't about the
  timer.** The clamp bug (showing 0:59 for a configured 0:20 timeout) only
  surfaced because the user used a low timeout to verify timer ticking. With the
  production default of 30 minutes, that bug would have shipped silently and
  surfaced as "agent says session timed out way earlier than it should have."

- **A "simple" feature can have several non-obvious failure modes.** The
  recovery flow alone touched: localStorage origin partitioning, TCP TIME_WAIT,
  `SO_REUSEADDR` differences between `HTTPServer` and bare sockets, race windows
  between probe-close and rebind, stale answer-key leakage on payload changes.
  None of these were visible from the design; every one surfaced through
  implementation or review.

- **Take "emergency hatch, not robust system" guidance seriously.** The
  filesystem-persistence path I started building would have been correct, but
  the user's framing — "I'm not aiming for super robust, just baseline recovery
  for the common forget-about-it case" — meant localStorage with port-in-id was
  the right tradeoff. Stopping mid-build to ask was the right call.

## Follow-up

- The cross-thread `result` dict write is technically racy; would tighten with a
  `threading.Lock` if this ever moved off CPython. Filed as a deferred item; not
  blocking ship.
- Comment-chip restore re-anchors via
  `textContent.includes(anchor.slice(0, 60))`; if the source markdown changes
  between sessions and the anchor text moves or splits across paragraphs, the
  chip lands as an orphan at end-of-doc. Acceptable degradation for an emergency
  hatch; not worth a more sophisticated re-anchor pass yet.
- No automated test of the localStorage restore loop (it's pure browser code
  driven by Python; would need a Playwright-style harness). The unit tests cover
  the server-side heartbeat semantics; the browser side is validated only via
  dogfood. Acceptable for now; consider if the surface area grows.

---

**Related Documents:**

- [Toolbox 1.5.0 commit](../../../../) (squashed onto develop on merge)
- [Prior session](../../digestify-reference-input/sessions/2026-05-07-initial-implementation.md)
  — context for why digestify ships with `--reference` and idle timers stacked
- [SKILL.md](../../../../plugins/toolbox/skills/digestify/SKILL.md)
