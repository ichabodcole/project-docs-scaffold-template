---
type: item
title: Suggest archiving finished work when a live view grows
description:
  Emit an actionable advisory when unarchived finished items, features or cycles
  crowd a live view, governed by one archive threshold, in text and JSON output.
status: stable
lifecycle: done
id: 01a0f8bb-5027-77cd-b8e5-13948e071aa0
kind: task
generated: { by: pdocs, at: 2026-10-01 }
scope: pdocs
cycle: 2026-10-pdocs-views
blocked_by: [01a0e98e-f381-748e-8bb4-0042aa4c6034]
---

# Suggest archiving finished work when a live view grows

`pdocs view board` hides archived work but includes unarchived `done` and
`dropped` items. On October 1, 2026, this project's board contained 50 open, 54
done, and six dropped items. The archive already provides a way to shorten that
output; the missing touch point is a hint that it is time to use it.

The same holds for features and, once
[cycles can be archived](../archive-closed-cycles/item.md), for cycles. One rule
governs all three types:

- **Live views hide archived work** unless a deliberate flag asks for it
  (`--all` where a view offers history). This is today's board behaviour,
  extended to features and cycles.
- **One threshold decides when to suggest archiving.** Each type is counted on
  its own against it: unarchived `done` and `dropped` items, unarchived `done`
  and `dropped` features, and unarchived `closed` and `abandoned` cycles.
- **`find` is a query, not a live view.** It keeps returning archived records,
  as it does today, and emits no advisory.

Configure the threshold in `.project-docs.json` under a top-level `checks`
section, alongside the work-item review policy. Existing structural lint
settings remain under `lint`. Proposed configuration:

```json
{
  "checks": {
    "archive": {
      "threshold": 25
    }
  }
}
```

A type gets an advisory when its finished count is **greater than** the
threshold. At 25, 25 finished items produce no hint and 26 do. Default to 25
when the setting or section is omitted, so existing projects get useful
behaviour without editing their config. Accept nonnegative integers; zero means
warn whenever any finished work of that type remains unarchived. Reject invalid
explicit settings with an actionable configuration error rather than silently
ignoring them. One setting, not one per type: a per-type override can come later
if a project needs it.

Each view advises on the types it lists: `view board` on items (and on features
with `--features`), `view portfolio` on features and cycles. The advisory gives
the type, the count, why archiving helps, and the next action. It supplements
the views rather than changing their default filtering in this pass, and it
never repeats per entity.

Example:

> 60 finished items and 31 finished features are not archived. Consider
> archiving them to shorten this view. Archiving preserves their records and
> updates links.

pdocs detects and reports the condition. The calling agent offers a concrete
archive selection and applies what the user agrees to. An advisory is not
permission to archive automatically. Use the existing `pdocs archive` behaviour
for moves and link updates.

## Definition of done

- [x] One rule, stated in the work documentation: live views hide archived
      items, features and cycles by default, and show them only on an explicit
      flag; `find` returns archived records as it does today.
- [x] `.project-docs.json` supports `checks.archive.threshold`, defaults it to
      25 when omitted, and validates explicit values as nonnegative integers.
- [x] Each live view counts unarchived finished work for each type it lists, and
      emits one advisory naming every type above the threshold; archived records
      do not contribute.
- [x] Text output includes the counts and actionable archive guidance without
      one warning per entity.
- [x] JSON output exposes a stable machine-readable advisory identifier and, per
      type, the affected count, the threshold and the remediation, alongside the
      existing view data.
- [x] Advisory-only output preserves the successful exit code and changes no
      files.
- [x] The calling workflow proposes a concrete archive selection before acting;
      an existing user authorization can cover that selection.
- [x] Tests cover omitted configuration, custom limits (10, 25, 100), invalid
      values, zero, below/at/above the threshold for each type, mixed finished
      states, archived records, text/JSON parity, and unchanged view membership.
- [x] Documentation explains the rule, the advisory, the configuration key, the
      default and the strict greater-than boundary. Payload copies match their
      source where affected.

## Related work

- [Archive closed cycles](../archive-closed-cycles/item.md) supplies the cycle
  archive this rule counts against. Land it first, or have this item count
  cycles once it does.
- [Portfolio view](../pdocs-work-portfolio-view.md) is where feature and cycle
  advisories appear.
- [Draft review advisories](../pdocs-draft-review-advisories.md) use the same
  report-condition, prompt-for-action pattern and the same `checks` section.

Open-only defaults, recent completion dates, automatic archiving, and bulk
archive API changes are separate work.
