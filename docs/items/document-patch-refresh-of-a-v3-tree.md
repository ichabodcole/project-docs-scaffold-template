---
type: item
title: Document refreshing a v3.0 tree to a newer patch
description:
  update-project-docs has no path for a tree already on v3.0 adopting a newer
  scaffold patch, and says nothing about the version markers that leaves behind.
status: draft
lifecycle: ready
id: 01a0e770-e05e-7526-9140-0cde39272320
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
source: "#182"
priority: medium
cycle: 2026-09-story-loom-migration
---

# Document refreshing a v3.0 tree to a newer patch

Spellbook went from scaffold 9.0.0 to 9.1.0 and found no instructions for its
case (issue #182). No structural migration applied, so `update-project-docs`
offered none. But files the scaffold owns had changed in between (9.0.1 changed
`SCHEMA.md` and the cycle template). The skill's model is two cases: a
structural change gets a migration, and anything else only updates the version
markers (Step 5). Followed literally, that bumps the markers to 9.1.0 and keeps
a 9.0.0 `SCHEMA.md`: the tree claims a version it doesn't have. Spellbook's
agent guessed that re-running `migrate-v2.10-to-v3.0.ts` would refresh the owned
files, which worked, but the script stamped the markers 9.0.1, not 9.1.0.

The fix is not a row for 9.1.0. Every upgrade is in one of a few cases, and the
skill should say how to tell which one you're in, from checks the agent can run,
before it says what to do:

- **A migration applies.** A row's presence check says its work is still undone.
  Run it.
- **No migration applies, but the tree is behind the release being adopted.**
  Nothing structural changed, but owned files may have. Refresh them, then set
  the markers to the adopted release.
- **The tree is already at that release.** Nothing to do.

What decides between the second and third cases is the version markers against
the target, not whether a migration exists. The refresh needs to be one named
action that doesn't depend on which release you're adopting. Today that's
"re-run the latest script"; later it might be a refresh command of its own.

Related:
[Step 5 rewrites markers the scripts set](./update-skill-step-5-rewrites-markers.md),
about who writes the markers, and
[recording owned files at install](./record-owned-files-at-install.md), which
would let the refresh tell an edited owned file from an old one.

## Definition of done

- [ ] `update-project-docs` begins by working out which case the tree is in,
      from checks it names, and says so before acting.
- [ ] Each case has one action, and none is written for a specific release: a
      later patch needs no new row or section.
- [ ] The "behind, no migration" case refreshes the owned files and sets both
      markers to the adopted release, not the release a script fetched.
- [ ] Spellbook's case, 9.0.0 to 9.1.0, walked through the skill as written,
      lands on that case and ends with a current `SCHEMA.md` and markers at
      9.1.0.
