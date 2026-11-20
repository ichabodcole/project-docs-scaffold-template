---
type: session
title: The board's server and pdocs bridge — 2026-11-19
description:
  Built the work board's daemon, its pdocs bridge and its two writes, then
  hardened the state folder, Undo and spawns after a security review.
tags: [work-board, security]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-19 }
---

# The board's server and pdocs bridge — 2026-11-19

Part of [The work board](../../../cycles/2026-11-work-board.md).

## Context

Phase 2 of the [work board plan](../../../features/pdocs-work-board/plan.md): a
local daemon an agent opens, queries and stops, which reads a project only
through that project's own `pdocs` CLI and accepts two kinds of write.

## What Happened

Under `plugins/project-docs/skills/work-board/`: `lib/pdocs.ts`,
`lib/compat.ts`, `lib/snapshot.ts`, `lib/writes.ts`, `lib/state.ts`,
`scripts/server.ts` and `scripts/cli.ts` (`open`, `status`, `stop`), with 239
tests. The page is a placeholder until Phase 4.

The implementation was written before its tests. To make up for that, 39 rules
were broken one at a time across the two passes; all but two turned a test red,
and those two are covered by a second guard.

The plan left three things open, decided as follows:

- **Exit codes** follow `scripts/pdocs/envelope.ts`: 2 for usage, 5 when no
  project or no CLI is found, 6 when the CLI is too old, 1 when the server does
  not start or its state folder is refused.
- **State** (pid, port, token) and **the log** sit in one per-user folder:
  `$XDG_RUNTIME_DIR/pdocs-work-board` when that variable is set, otherwise
  `<tmpdir>/pdocs-work-board-<uid>`. The log is removed on `stop`.
- **A restore is accepted only if this server process issued it**, unchanged,
  among its last 100 writes. Without that rule, a restore could set any item to
  any allowed value.

## Notable Discoveries

- **Undo does not survive a server restart**, including the 30-minute idle exit.
  It is also refused when the item changed after the write, and it is used up on
  success. The plan records this contract for Phase 5: any 409 on Undo removes
  the Undo control.
- **A shared temp directory was trusted.** The first version used a fixed folder
  name under `os.tmpdir()`, which is `/tmp` on Linux. The reviewer wrote the
  server log through a planted symlink. The folder is now per-user, refused
  unless it is a real directory the user owns at mode 0700, and its files are
  opened with `O_EXCL` and `O_NOFOLLOW`. The pointer no longer stores a URL; it
  is rebuilt from the port and token.
- **`stop` in one project could stop another project's board**, given a pointer
  copied from it. The pointer's root must now match the project.
- **A stale Undo overwrote later work.** Accept an item on the board, start it
  from the CLI, then Undo: the item went back to `triage`. Fixed by the check
  above.
- **A `pdocs` spawn had no timeout.** A hung CLI blocked the snapshot and every
  later write, and left children alive after `stop`. Reads now time out at 10 s
  and `set` at 15 s.
- **Compatibility is checked on cycle entries too**, and on every snapshot, so
  an old CLI on an empty board is caught once it has entries.
- **The repository's spawn guard** (`scripts/pdocs/test-env.test.ts`) reads any
  `spawn(` in a test file as a bare spawn. Test helpers that spawn go through
  `childEnv()`.

## Review

- **Roster:** read from the agent types this session can dispatch.
- **Chosen:** `general-purpose` (tools `*`, so it has shell access), with a
  security brief, told to report only and to write only in scratch copies.
- **Rejected on capability:** `feature-dev:code-reviewer`. Its tool list has
  `BashOutput` and `KillShell` but no `Bash`.
- **What it ran, from its execution log:** the skill's tests three times in
  sequence and four times at once (194 pass); `npx tsc --noEmit`; about 85
  hostile request bodies against a fixture server, with `diff -r` against an
  untouched copy; token, Host and Origin probes; write and Undo sequences;
  `open`, `status` and `stop` after `kill -9`, with a forged pointer, from a
  subdirectory, and with a server that exits or hangs at start; spawn counts per
  poll; three stub CLIs; one planted log symlink; 29 mutations (23 red); and one
  read-only `open`, snapshot, `status`, `stop` against this repository.
- **Not run by the reviewer:** `npm run check` and the dist build. A wider
  symlink test was denied by the permission system, so two of its three
  state-folder scenarios rest on reading the code.
- **Also:** an automated security check on the commit flagged the same state
  folder.
- **Verdict:** ready to merge with fixes. One was blocking, the unrecorded Undo
  contract. It and the follow-ups it ranked above minor were fixed on the branch
  before landing: the state folder, stale Undo, spawn timeouts, overlapping
  snapshot reads, the compatibility gap, and tests for the six rules that had
  none. The fixes were not reviewed a second time; the implementer's mutation
  run and the commit gate (1862 pass) are the evidence for them.

## Follow-up

- Test files and `test-support.ts` ship in the plugin, because the build copies
  a skill folder whole. They cannot run there. Phase 6 packages the skill and
  decides whether to leave them out.
- A snapshot of this repository is about 200 KB per poll, with no "unchanged"
  answer on the hash.
- On a platform without `process.getuid`, the state folder is only checked to be
  a real directory.
- `open` against a hung CLI is bounded by the spawn limits but has no end-to-end
  test.
- The plan says a restore is compared "byte for byte as JSON". The server
  compares the parsed body, so key order and whitespace do not matter; values
  and the order of `changes` do.

---

**Related Documents:**

- [Build the work board's server and pdocs bridge](../item.md)
