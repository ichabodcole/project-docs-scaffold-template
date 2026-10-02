---
type: item
title: Add a portfolio view for cycles and features
description:
  Show current cycles and features in one concise overview with progress counts
  and an option to include completed history.
status: stable
lifecycle: done
id: 01a0f8c6-2e4e-72f3-bdce-6a3e96b77e66
kind: task
generated: { by: pdocs, at: 2026-10-01 }
scope: pdocs
cycle: 2026-10-pdocs-views
---

# Add a portfolio view for cycles and features

`pdocs find --type cycle` and `pdocs find --type feature` list individual
records, and `pdocs view board --features` mixes features into every work-item
group. There is no concise view of current cycles and features together, or a
count of the work inside each.

Add a purpose-built portfolio view (proposed command: `pdocs view portfolio`).
It summarizes:

- **Current cycles:** planned and active cycles, their lifecycle, and counts of
  member items by work state.
- **Current features:** unarchived features that are not `done` or `dropped`,
  their lifecycle, and counts of child items by work state.
- **An empty-state signal:** say plainly when there is no active cycle or no
  current feature, rather than silently returning an empty view.

Keep the default concise. A deliberate `--all` option can include closed cycles
and completed/dropped or archived features for historical review. The text and
JSON forms should carry the same information; JSON should give callers stable
fields for each entity, state and count. This is a summary, not another
rendering of every item. Existing `view cycle`, `view feature`, `find`, and
`board` stay useful for drilling into details.

Use the current work model and lifecycle groups. Do not add duplicate status or
membership fields: cycle membership remains the item's `cycle`, feature
membership remains the item's `parent`, and lifecycle remains the source of
current state.

## Definition of done

- [x] A single portfolio view lists current cycles and features together, with
      their lifecycle and counts of child items in unstarted, started,
      completed, and cancelled groups.
- [x] A planned cycle is included as current/upcoming; a closed or abandoned
      cycle is excluded by default. Done, dropped and archived features are
      excluded by default.
- [x] The view says when no active cycle exists even if planned cycles are
      listed, and handles an empty current-feature set explicitly.
- [x] `--all` includes historical cycles and completed, dropped, and archived
      features with clear state labels.
- [x] Text output is compact and scannable; JSON exposes stable entity,
      lifecycle, and per-state count fields with equivalent inclusion rules.
- [x] Counts derive from existing `cycle` and `parent` references, count each
      associated item once per applicable summary, and handle items without a
      parent or cycle.
- [x] Tests cover mixed lifecycle states, planned/active/closed cycles, archived
      features, feature child items, empty states, text/JSON parity, and
      `--all`.
- [x] Help and work documentation describe the view and its inclusion rules; the
      pdocs suite and docs checks pass.

## Context

At the time of filing, `pdocs find --type cycle` listed seven cycles, all
closed; `pdocs find --type cycle --lifecycle active` had no matches.
`pdocs find --type feature` listed 33 features, mostly historical, while
`pdocs view board --features` emitted a long mixed board. The gap is the concise
current overview, not the ability to find an individual entity.
