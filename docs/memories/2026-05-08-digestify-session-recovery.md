# Digestify session-recovery features shipped

**Date:** 2026-05-08

Added a visible idle countdown, sliding-window heartbeat keep-alive
(`/heartbeat`), manual reset (click the timer pill), and localStorage-backed
draft recovery to the digestify skill. The auto-generated session id
(`digestify-<rand>-p<port>`) embeds the bound port so a relaunch with the same
`--id` reuses the port via probe-bind + `SO_REUSEADDR` — same origin →
localStorage in scope → restore. `--timeout` is now an idle window, not
absolute. Inline comment chips also got Edit/Delete and corner-rounded styling.
Toolbox bumped to 1.5.0.

**Key files:** `plugins/toolbox/skills/digestify/scripts/review.py`,
`plugins/toolbox/skills/digestify/scripts/template.html`,
`plugins/toolbox/skills/digestify/SKILL.md`,
`docs/projects/digestify-session-recovery/sessions/2026-05-08-initial-implementation.md`

**Docs:** [Project folder](../projects/digestify-session-recovery/) — session
journal includes the localStorage origin-partition gotcha, TIME_WAIT /
`SO_REUSEADDR` notes, and the design tradeoff that kept us on localStorage
instead of filesystem persistence.
