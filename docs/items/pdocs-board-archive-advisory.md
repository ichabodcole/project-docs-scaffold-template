---
type: item
title: Suggest archiving finished items when the board grows
description:
  Emit an actionable advisory when unarchived finished items crowd the board, in
  text and JSON output.
status: draft
lifecycle: backlog
id: 01a0f8bb-5027-77cd-b8e5-13948e071aa0
kind: task
generated: { by: pdocs, at: 2026-10-01 }
scope: pdocs
---

# Suggest archiving finished items when the board grows

`pdocs view board` hides archived work but includes unarchived `done` and
`dropped` items. On October 1, 2026, this project's board contained 50 open, 54
done, and six dropped items. The archive already provides a way to shorten that
output; the missing touch point is a hint that it is time to use it.

Configure this advisory in `.project-docs.json` under a top-level `checks`
section, alongside the work-item review policy. Existing structural lint
settings remain under `lint`. Proposed configuration:

```json
{
  "checks": {
    "boardArchive": {
      "threshold": 25
    }
  }
}
```

Emit one advisory when the number of unarchived `done` and `dropped` items is
**greater than** the configured threshold. At a limit of 25, 25 finished items
produce no hint and 26 do. Default to 25 when the setting or section is omitted,
so existing projects get useful behavior without editing their config. Accept
nonnegative integers; zero means warn whenever any finished items remain. Reject
invalid explicit settings with an actionable configuration error rather than
silently ignoring them.

The advisory includes the count, why archiving helps, and the next action. It
supplements the existing board rather than changing its default filtering in
this pass. The board archive check remains advisory; the separate review check
can opt into strict gating. Each check declares only the settings it needs.

Example:

> 60 finished items remain on the board. Consider archiving them to shorten this
> view. Archiving preserves their records and updates links.

PDOCs detects and reports the condition. The calling agent offers a concrete
archive selection and applies what the user agrees to. An advisory is not
permission to archive automatically. Use the existing `pdocs archive` behavior
for moves and link updates.

## Definition of done

- [ ] `view board` counts unarchived `done` and `dropped` items and emits one
      archive advisory above the effective configured threshold; archived items
      do not contribute.
- [ ] `.project-docs.json` supports `checks.boardArchive.threshold`, defaults it
      to 25 when omitted, and validates explicit values as nonnegative integers.
- [ ] Text output includes the count and actionable archive guidance without one
      warning per item.
- [ ] JSON output exposes a stable machine-readable advisory identifier,
      affected count, threshold, and remediation, alongside existing board data.
- [ ] Advisory-only output preserves the successful exit code and changes no
      files.
- [ ] The calling workflow proposes a concrete archive selection before acting;
      an existing user authorization can cover that selection.
- [ ] Tests cover omitted configuration, custom limits (10, 25, 100), invalid
      values, zero, below/at/above the threshold, mixed done/dropped states,
      archived records, text/JSON parity, and unchanged board membership.
- [ ] Documentation explains the advisory, configuration key, default, and
      strict greater-than boundary. Payload copies and generated distributions
      match their source where affected.

## Related work

- [Draft review advisories](./pdocs-draft-review-advisories.md) use the same
  report-condition, prompt-for-action pattern.

Open-only defaults, recent completion dates, automatic archiving, and bulk
archive API changes are separate work.
