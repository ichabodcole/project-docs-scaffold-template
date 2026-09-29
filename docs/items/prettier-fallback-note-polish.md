---
type: item
title: Polish the migration's Prettier fallback note
description:
  The plan-time note that explains a Prettier fallback misses a space, reports a
  Prettier missing a dependency as absent, and counts ignored blocks as
  failures.
status: draft
lifecycle: backlog
id: 01a0ea0f-3adc-7629-be6f-6a47e0634867
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-frontmatter-prettier-shape/sessions/2026-09-28-prettier-shaped-frontmatter.md
priority: low
---

# Polish the migration's Prettier fallback note

Three nits from the review of the Prettier-shaped frontmatter, all in the note
`prettierFrontmatter()` returns for phase 3 to print:

- the partial-failure note has no space after its semicolon (`…:);3 of 3 …`);
- a Prettier that is installed but missing one of its own dependencies also
  throws `MODULE_NOT_FOUND`, so it is reported as "no Prettier";
- blocks skipped because `.prettierignore` names their path are counted in the
  "N of M failed" figure when some other block failed.

The fallback itself is safe in every case; only the explanation is off.

## Definition of done

- [ ] The note reads correctly in each of the three cases, with a test for the
      count.
