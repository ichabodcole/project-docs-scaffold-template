---
type: item
title: Add the feature-question advisory to pdocs new item
description:
  pdocs new item says nothing when research is filed with no parent, so a filer
  that loads no skill never meets the feature question.
status: draft
lifecycle: backlog
id: 01a1eb29-7ef9-7479-b884-47a71d485554
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-17 }
parent: feature/feature-touchpoints
from: 01a1eab2-ae6b-7236-8be0-cee5e10d7960
---

# Add the feature-question advisory to pdocs new item

A filer that loads no skill meets only the CLI.
[the write-up](./feature-or-item-touchpoint/write-up.md) specifies a
`feature-question` advisory on `pdocs new item`, built on
`scripts/pdocs/advisories.ts`: when it fires, when it stays silent, and its
`message` and `action` text. The first wording misfired twice in the trial; the
revised wording in the write-up has not been run on fresh agents, so this item's
last box is that trial.

## Definition of done

- [ ] The advisory fires on `kind: research` with no `parent`, and stays silent
      with `--parent`, with `--from` naming a feature, when the item is filed
      `done` or `dropped`, and on every other kind.
- [ ] It appears in both JSON and text output, lists at most five open features,
      and has a test for each condition.
- [ ] The payload copy of the CLI matches.
- [ ] Replay 4 in the write-up passes: the `investigator`, with no skill change
      present, reports the build question for the GitHub-import request. If the
      slow-tests request still draws a question, the advisory is dropped and
      that is recorded here.

## Related Documents

- [Find where an agent should ask whether work needs a feature](./feature-or-item-touchpoint/item.md)
