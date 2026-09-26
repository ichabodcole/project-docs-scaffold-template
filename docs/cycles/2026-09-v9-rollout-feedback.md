---
type: cycle
title: v9 rollout feedback
description:
  Land the fixes the first two 9.0.0 consumers found and release them, so
  story-loom's migration can test them.
tags: [feedback, migrations, pdocs]
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: active
started: 2026-09-26
appetite:
  Until a release carries these fixes; story-loom migrates on that release.
after: [] # cycles or features this one waits on: cycle/<slug>, feature/<slug>
generated: { by: claude-opus-5-5, at: 2026-09-26 }
---

# v9 rollout feedback

## Why now

9.0.0 and plugin 4.0.0 were released on 2026-09-26, and their first two
consumers reported back the same day over the grapevine channel
`project-docs-v9`. Spellbook migrated 8.1.0 → 9.0.0, and wocky-talky, a new
project, adopted 9.0.0 fresh and ran its first cycle. Every finding was checked
against this repository's code or a clone of the consumer's repository before it
was accepted. Story-loom migrates after this cycle's release, not before: its
run tests whether these fixes cover what the first two consumers hit, and
whatever it finds that is new opens the next round.

## Scope

- [Spellbook feedback, round 2](../items/spellbook-feedback-round-2.md) — the
  eight migration fixes land, so story-loom's run gets them.
- [wocky-talky feedback, round 1](../items/wocky-talky-feedback-round-1.md) —
  finalize-branch, formatter guidance and `pdocs new`/`set` output fixed.
- [The lint passes a template's placeholder body and H1](../items/lint-rejects-placeholder-bodies.md)
  — filed at release; wocky-talky's fresh cycle passing `pdocs check` with every
  placeholder in place makes it part of this patch.

Out of scope, deliberately: story-loom's migration itself, which follows this
cycle's release and tests it, and the triage items filed at release that no
consumer has hit.

## Outcome

_Written at close, not before._

## Sessions
