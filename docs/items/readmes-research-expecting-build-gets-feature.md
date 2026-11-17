---
type: item
title:
  Say in the READMEs that research expecting a build gets a feature at filing
description:
  Three READMEs read research item first as no feature, so research that leads
  to a build is filed with no parent.
status: draft
lifecycle: backlog
id: 01a1eb29-7f99-70ad-9b86-a842660b6eb6
kind: chore
generated: { by: claude-fable-5-2, at: 2026-11-17 }
parent: feature/feature-touchpoints
from: 01a1eab2-ae6b-7236-8be0-cee5e10d7960
---

# Say in the READMEs that research expecting a build gets a feature at filing

The rule for when to write a feature reads "research item first" in a way agents
take as "no feature". [the write-up](./feature-or-item-touchpoint/write-up.md)
found that none of the seven parentless research items that led to more work was
ever linked to the feature it fed.

## Definition of done

- [ ] "Item or feature?" in `docs/items/README.md`, "Feature or item?" in
      `docs/features/README.md` and the decision chart in `docs/README.md` say
      that research expecting a build gets a feature when it is filed, and that
      a diagnosis or a survey needs none.
- [ ] The payload copies say the same, and `npm run check:mirror` passes.

## Related Documents

- [Find where an agent should ask whether work needs a feature](./feature-or-item-touchpoint/item.md)
