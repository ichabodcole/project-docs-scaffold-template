---
type: item
title: Document refreshing a v3.0 tree to a newer patch
description:
  update-project-docs has no path for a tree already on v3.0 adopting a newer
  scaffold patch, and says nothing about the version markers that leaves behind.
status: draft
lifecycle: triage
id: 01a0e770-e05e-7526-9140-0cde39272320
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
source: "#182"
---

# Document refreshing a v3.0 tree to a newer patch

`update-project-docs` has no row in `## Available Migrations` for a tree already
on v3.0: `v2.10-to-v3.0`'s presence check is false once it has run (issue #182).
Spellbook found the path by trial. Re-running `migrate-v2.10-to-v3.0.ts` works:
its preflight accepts a v3.0 tree, and with nothing left to move it only
refreshes the owned files. But it stamps the version markers with the scaffold
it fetched (9.0.1), not the release being adopted (9.1.0).

Related:
[Step 5 rewrites markers the scripts set](./update-skill-step-5-rewrites-markers.md),
which is about the same markers.

## Definition of done

- [ ] The skill says what to do for a tree already on v3.0 that is adopting a
      newer scaffold release: which script to re-run, and when that is enough.
- [ ] It says what the version markers should read afterwards, and who writes
      them.
