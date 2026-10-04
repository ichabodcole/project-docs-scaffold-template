---
type: cycle
title: v3.0 migration adopter feedback
description:
  Fixes to the v2.10-to-v3.0 migration and its guide from the operator-mono,
  media-forge and story-loom upgrades.
tags: [migrations, project-docs]
status: draft
lifecycle: planned
started: 2026-10-03
appetite:
  Stop when the nine items land, with the migration re-pin and a plugin release.
after: [2026-10-check-and-upgrade-fixes]
generated: { by: claude-opus-5-5, at: 2026-10-03 }
---

# v3.0 migration adopter feedback

## Why now

The v2.10-to-v3.0 migration is the hop every pre-9.0 project takes, and three
adopters have now run it: story-loom, operator-mono and media-forge. Their
feedback is concrete, and nearly all of it lands in `migrate-v2.10-to-v3.0.ts`
and its guide, so it is one sequence of branches and one re-pin.

## Scope

- **[item/respell-split-paths](../items/respell-split-paths.md)** (#201) and
  **[item/respell-flags-code-files](../items/respell-flags-code-files.md)** —
  `--respell` handles wrapped paths and code files. One branch, first.
- **[item/v30-preflight-tool-written-folders](../items/v30-preflight-tool-written-folders.md)**
  (#200) — grouped stop lines, and a pattern for standing output streams.
- **[item/relink-legacy-archive-links](../items/relink-legacy-archive-links.md)**
  (#195) — the guide warns about archive link rot, and the migration can apply
  its own suggestions.
- **[item/v30-config-patch-array-layout](../items/v30-config-patch-array-layout.md)**
  — a shrunk config array is formatter-clean.
- **[item/catalog-bulk-fill-and-index-intro](../items/catalog-bulk-fill-and-index-intro.md)**
  (#196),
  **[item/synthesized-title-from-h1](../items/synthesized-title-from-h1.md)**,
  **[item/report-owner-named-explicitly](../items/report-owner-named-explicitly.md)**
  and
  **[item/preflight-messages-name-next-step](../items/preflight-messages-name-next-step.md)**
  — smaller fixes, batched.

Every item touches the same script, so the branches run in order. The cycle ends
with the migration re-pin (playbook Step 14) and a plugin release.

Out of scope, deliberately: the per-project migration records and re-run summary
counts, which have harmed nothing; and the `pdocs relink` and `pdocs catalog`
commands, filed in backlog.

## Outcome

_Written at close, not before — and for an `abandoned` cycle too._

[What shipped. What was cut, and why. What carried over to the next cycle: each
item still open, and the cycle it joined. What was learned that will change how
the next cycle is scoped. For an `abandoned` cycle, what was falsified: the
assumption that stopped it. Two paragraphs is usually enough; the point is that
a reader six months from now can tell what happened without reading every
session.]

## Sessions

<!--
One line per branch, appended by `init-branch` as it opens them:

  - feature/some-branch (open)

`finalize-branch` rewrites `(open)` as `(landed YYYY-MM-DD)` when the branch
lands. Leave this section empty until the first branch; do not carry a
placeholder line into a real cycle.
-->
