---
type: session
title: View entries carry the board's fields — 2026-11-19
description:
  Added description, from, source, appetite and started to pdocs view JSON
  entries, and stopped the new prose fields being unquoted twice.
tags: [pdocs, work-board]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-19 }
---

# View entries carry the board's fields — 2026-11-19

Part of [The work board](../../../cycles/2026-11-work-board.md).

## Context

Phase 1 of the [work board plan](../../../features/pdocs-work-board/plan.md).
The board reads a project only through `pdocs view … --json`, and five fields it
needs were missing from an entry.

## What Happened

`ViewEntry` in `scripts/pdocs/commands/view.ts` gained `description`, `from` and
`source` on every entry, and `appetite` and `started` on a cycle entry (`null`
on an item or a feature). The payload copy matches. Text output is unchanged,
and a test guards that.

The plan was silent on four points, decided as follows:

- **Key order.** `description` follows `title`; the other four follow `date`. No
  key was renamed or removed.
- **`from` is the value as written.** `pdocs new --from item/<slug>` writes the
  full item id, so a caller gets an id, not a slug or a path.
- **An unedited description comes through.** A new item made without
  `--description` carries the template's bracketed prompt, not `null`.
- **YAML null spellings are strings.** `source: ~` gives `"~"`, as every other
  entry field already does.

## Notable Discoveries

- **The first version unquoted the new fields twice.** It read them through
  `scalar`, and the frontmatter parser has already unquoted the value. A
  description that begins and ends with a quoted phrase lost its outer quotes.
  The review found it; the fields now read the parsed value directly, with a
  test that fails on the old code. `title` and the other older fields still go
  through `scalar` and have the same fault.
- **`appetite` and `started` reach a caller only through `view cycle <slug>`.**
  `view board` lists no cycles, and `view portfolio` rows are a different shape
  with none of the five keys. The board's snapshot has to fetch each current
  cycle.
- **Nine archived features have `description: "---"`** written literally. The
  entry carries it as written.

## Review

- **Roster:** read from the agent types this session can dispatch.
- **Chosen:** `general-purpose` (tools `*`, so it has shell access), briefed
  against the item, Phase 1 of the plan and the two playbooks, and told to
  report only.
- **Rejected on capability:** `feature-dev:code-reviewer`. Its tool list has
  `BashOutput` and `KillShell` but no `Bash`, so it cannot run anything.
- **What it ran, from its execution log:** `bun test` on `view.test.ts` at the
  branch head (40 pass) and with `view.ts` replaced by `develop`'s in a scratch
  copy (6 of the new tests fail); nine edge-case documents written to a scratch
  copy and read back through `view backlog` and `view cycle`; a key-presence
  walk over twelve view verbs; `cmp` on the payload copy; `npx tsc --noEmit`;
  `npm run check:mirror`; `bun test scripts/pdocs/commands` (359 pass).
- **Not run by the reviewer:** the cookiecutter generation and the full
  `npm run check`. The implementer ran both, and the commit gate ran the second.
- **Verdict:** ready to merge. Its one bug finding, the double unquoting, was
  fixed on the branch after the review, with its test.

**Follow-up items:**
[archived-features-dash-description](../../archived-features-dash-description.md)
and [view-entry-title-unquoted-twice](../../view-entry-title-unquoted-twice.md).

---

**Related Documents:**

- [Carry the board's fields on pdocs view entries](../item.md)
