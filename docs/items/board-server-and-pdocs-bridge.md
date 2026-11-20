---
type: item
title: Build the work board's server and pdocs bridge
description:
  A daemon an agent can open, query and stop, which reads a project only through
  its own pdocs CLI, refuses a CLI too old to serve it, and accepts exactly two
  kinds of write.
status: draft
lifecycle: backlog
id: 01a1f70e-fbe5-718b-8d2d-d1af33d3f266
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-19 }
cycle: 2026-11-work-board
parent: feature/pdocs-work-board
from: features/pdocs-work-board/plan.md
blocked_by: [01a1f70e-fb86-7237-931e-c756125fe373]
---

# Build the work board's server and pdocs bridge

The board's server side, in `plugins/project-docs/skills/work-board/`: a bridge
that finds the project's `scripts/pdocs/cli.ts`, spawns it and parses its JSON
(`lib/pdocs.ts`); a compatibility check made from the JSON itself
(`lib/compat.ts`); the composed snapshot (`lib/snapshot.ts`); the two write
kinds and their Undo (`lib/writes.ts`); and the daemon and agent verbs
(`scripts/server.ts`, `scripts/cli.ts`: `open`, `status`, `stop`). It serves a
placeholder page until the shell is built. `work-board` is added to the Codex
exclusion in `scripts/build-skills-dist.sh`.

This is Phase 2 of the [plan](../features/pdocs-work-board/plan.md). It merges
after [the view fields](./view-entries-carry-board-fields.md), which its
end-to-end test needs.

## Definition of done

- [ ] `scripts/cli.ts open` starts a server on `127.0.0.1` and prints one JSON
      line with `url`, `port`, `pid` and `root`; a second `open` prints the same
      `url`; `stop` ends the process.
- [ ] On a CLI with no `view`, or without the view fields, `open` does not start
      and prints one error naming the fix: run `update-project-docs`.
- [ ] The server accepts only a triage decision, cycle membership and their
      Undo. Any other key, lifecycle or body shape is rejected, and a request
      without the token or from a foreign `Origin` is refused with nothing
      spawned.
- [ ] Against a fixture project, a triage write followed by its Undo leaves the
      item file byte-identical, including a field that was absent before.
- [ ] Nothing is written into the project's repository by the server itself, and
      nothing is copied into `dist/codex-project-docs/`.
- [ ] `bun test plugins/project-docs/skills/work-board` and `npm run check` pass
      after `npm run build:dist`.

## Related Documents

- [pdocs Work Board Implementation Plan](../features/pdocs-work-board/plan.md)
