---
type: item
title: Review the live born items marked done for any that are not finished
description:
  The migration set every live project folder with no proposal to done; some,
  like grapevine-backlog, were living catch-alls rather than finished work.
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: done
id: 01a0dac0-8b08-7102-b43f-c3bb3cd9bdaa
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-25 }
scope: docs
priority: medium
cycle: 2026-09-v9-rollout-feedback
---

# Review the live born items marked done for any that are not finished

The v2.10-to-v3.0 migration turned every project folder with no proposal into an
item, `done` unless its plan was `active`. That is right for a trail of shipped
work and wrong for a folder that was still collecting work: `grapevine-backlog`,
a catch-all of unassigned grapevine ideas, was one and is now `backlog`. Done
when each live born item in `docs/items/` (not `_archive/`) has been checked and
set to its real state with `pdocs set`.

Checked 2026-09-27 on `fix/finalize-branch-wocky-rows`: all 16 live born `done`
items stay `done`
([the session](./wocky-talky-feedback-round-1/sessions/2026-09-27-finalize-branch-rows.md)).
