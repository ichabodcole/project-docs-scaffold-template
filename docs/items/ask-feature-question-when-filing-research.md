---
type: item
title: Ask the feature question when research is filed
description:
  create-investigation and the investigator agent file research with no parent
  and never ask whether it is the start of a build.
status: draft
lifecycle: backlog
id: 01a1eb29-7e11-71ea-90a6-6eb436f9bf58
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-17 }
parent: feature/feature-touchpoints
from: 01a1eab2-ae6b-7236-8be0-cee5e10d7960
---

# Ask the feature question when research is filed

`create-investigation` and the `investigator` agent file research without
settling its parent. In the trial runs agents sometimes joined an existing
feature, but none proposed a new one.
[the write-up](./feature-or-item-touchpoint/write-up.md) gives the wording for
`create-investigation` step 5 and for the agent, and the rule: join an open
feature that clearly fits and say so, ask when the research expects a build and
none fits, stay silent on a diagnosis or a survey.

## Definition of done

- [ ] `create-investigation` step 5 and the `investigator` agent carry the
      decision as the write-up words it.
- [ ] The `dist/` build is refreshed and the plugin version is bumped.
- [ ] Replays 1 to 3 in the write-up pass with fresh agents: the GitHub-import
      request draws the question and an offer to write a feature, the slow-tests
      request draws no question, and the board-page request is filed under
      `feature/pdocs-work-board` with the agent saying so.

## Related Documents

- [Find where an agent should ask whether work needs a feature](./feature-or-item-touchpoint/item.md)
