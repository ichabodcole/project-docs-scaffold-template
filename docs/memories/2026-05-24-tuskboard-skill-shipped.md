---
type: memory
title: Tuskboard skill shipped
status: stable
generated: { by: unknown, at: 2026-05-24 }
---

# Tuskboard skill shipped

Closed out the Tusk Board branch — `toolbox:tuskboard`, a duplex agent↔user
task board in the browser (static + monitored host modes, multi-agent join,
drag-and-drop, inline edit, branded with woolly mammoth identity). 12 commits
squashed and merged to `develop`. The branch was the first flagship example of
the `recipes:agent-surface-bun` pattern. Mid-branch rename from `taskboard` →
`tuskboard` bumped `toolbox` to 2.0.0 (breaking — skill identifier changed).
Final pre-merge review caught an empty-string `task.edit` corruption path that
"validate type, not value" had slipped through; fixed at both server and client
layers with new test coverage.

**Key files:** `plugins/toolbox/skills/tuskboard/`, `docs/projects/tusk-board/`

**Docs:** [Project folder](../projects/tusk-board/),
[Finalize session](../projects/tusk-board/sessions/2026-05-24-finalize-and-merge.md)
