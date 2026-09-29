---
type: item
title: Re-pin the v3.0 migration to 9.2.0 and release plugin 4.2.0
description:
  "The release's second step: the newest migration installs scaffold 9.2.0,
  plugin project-docs goes to 4.2.0, and plugin-only commits no longer cut a
  scaffold release."
status: draft
lifecycle: done
id: 01a0ec94-2677-7452-91f0-f372356d5ac7
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-29 }
cycle: 2026-09-story-loom-migration
scope: migrations
---

# Re-pin the v3.0 migration to 9.2.0 and release plugin 4.2.0

The second step of the story-loom migration cycle's release. Scaffold 9.2.0
changed owned files and added the `NO OUTCOME` lint rule, so, by the rule that
every scaffold release re-pins the newest migration, the v3.0 migration had to
install 9.2.0, and the plugin that carries it had to be released.

## Definition of done

- [x] The v3.0 migration installs scaffold 9.2.0, `OWNED_RELEASES` holds 9.2.0's
      owned-file keys, and a 9.1.0 tree migrates to 9.2.0.
- [x] Plugin `project-docs` is 4.2.0, with its Version History.
- [x] A commit that touches only `plugins/` and `dist/` cuts no scaffold
      release.

## Related Documents

- [Re-pin to 9.2.0 and plugin 4.2.0 — 2026-09-29](./sessions/2026-09-29-repin-to-9.2.0.md)
