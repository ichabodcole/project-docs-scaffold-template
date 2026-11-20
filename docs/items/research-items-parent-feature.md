---
type: item
title: Keep a feature's finished items in view until the feature is done
description:
  Archiving a done item whose parent feature is still open removes it from the
  feature's view, and a finished research item leaves nothing open that points
  at the build it recommended.
status: stable
lifecycle: active
id: 01a1eaa7-44f9-7007-849c-b966874e830e
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-17 }
source: "#210"
priority: medium
parent: feature/feature-touchpoints
cycle: 2026-11-work-board
---

# Keep a feature's finished items in view until the feature is done

Archiving treats every `done` item alike. Two cases show that it should not.

**A finished item under an open feature.** When an agent is asked to archive the
done items, nothing asks whether an item belongs to a feature that is still
open. Some of those items are better left in place, finished but not archived,
until the whole feature is done. The archive step needs a touchpoint: for each
done item with an open `parent`, ask whether to archive it now or hold it until
the feature closes.

**A finished research item.** This is the strongest case, because research is
meant to lead to work. When it is `done` and archived, nothing open still points
at the build it recommended, so the follow-on work is easy to lose. A downstream
project hit this with a finished write-up on per-use image settings: it created
a feature to hold the research item (done) and a backlog item for the build, and
then did the same for three other research items before they started.

Issue #210 proposes a rule for the second case: every research item belongs to a
feature that stays open until both the research and the build it leads to are
done. Research that ends in "do nothing" has no build to hold open, so the rule
may be narrower: research that recommends a build files the build items, under a
feature, before it is archived.

Touches `sweep-project` (its archive steps and the archive advisory),
`create-investigation`, `triage-items` and `docs/items/README.md`.

Not this item: whether an agent asked for "a new research item" should propose a
feature at creation. That is filed separately.

Reported in
[#210](https://github.com/ichabodcole/project-docs-scaffold-template/issues/210).

## Definition of done

- [ ] When `sweep-project` archives done items, it lists the ones whose `parent`
      feature is still open and asks whether to archive each now or hold it
      until the feature is done. Its archive advisory path does the same.
- [ ] `docs/items/README.md` says when a done item under an open feature stays
      out of the archive, and which research items need a parent feature.
- [ ] A research item that recommends a build is not archived until the build
      has an open item under the same feature. `create-investigation` files
      those items when it closes the research.
- [ ] `triage-items` proposes a parent for a research item that has none.
