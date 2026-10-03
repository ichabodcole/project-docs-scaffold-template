---
type: item
title: Guard project-summary's session glob and view call
description:
  The project-summary command globs session folders that zsh refuses when they
  are empty, and runs pdocs view with no fallback for an 8.x CLI.
status: draft
lifecycle: triage
id: 01a1040e-e8ee-70cb-9eca-129f9d0d01ff
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-03 }
from: items/ground-in-project-old-cli-fallback/sessions/2026-10-03-ground-in-project-old-cli.md
---

# Guard project-summary's session glob and view call

Found by the
[ground-in-project review](./ground-in-project-old-cli-fallback/sessions/2026-10-03-ground-in-project-old-cli.md).
`plugins/project-docs/commands/project-summary.md` lists recent sessions with
`ls -t docs/features/*/sessions/*.md docs/items/*/sessions/*.md 2>/dev/null`. In
an agent's shell (zsh, through `eval`) an unmatched glob aborts the command, and
it is unmatched on any tree without sessions in both folders, a fresh 9.4 tree
included. The command also runs `pdocs view board --features`, which an 8.x CLI
refuses. ground-in-project's nudge sends users to this command.

## Definition of done

- [ ] The session listing finds files rather than globbing folders (as
      ground-in-project's Step 3 does now) and runs in the agent's shell on a
      tree with no sessions.
- [ ] When the CLI refuses `view`, the command falls back the way
      ground-in-project does.

## Related Documents

- [ground-in-project on an older CLI — 2026-10-03](./ground-in-project-old-cli-fallback/sessions/2026-10-03-ground-in-project-old-cli.md)
