---
type: item
title: Match GitHub's heading anchors in the link check
description:
  The lint's heading slug drops accented letters, keeps link targets and never
  numbers repeats, so pdocs check reports anchors GitHub renders as missing.
status: stable
lifecycle: ready
id: 01a1eaa7-4464-7652-a622-94473a0a63f3
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-17 }
source: "#208"
priority: medium
---

# Match GitHub's heading anchors in the link check

`slug` in `scripts/pdocs/docs-lint/index.ts` lowercases, drops everything but
`\w`, whitespace and hyphens, and turns whitespace into hyphens. GitHub's
algorithm differs in three places, so `pdocs check` reports anchors as missing
that GitHub renders:

| Heading                      | GitHub          | `slug`                |
| ---------------------------- | --------------- | --------------------- |
| `## Café notes`              | `#café-notes`   | `#caf-notes`          |
| `## See [the plan](plan.md)` | `#see-the-plan` | `#see-the-planplanmd` |
| a second `## Notes`          | `#notes-1`      | `#notes`              |

All three are false failures: a correct link is reported, not a broken one
missed.

Reported in
[#208](https://github.com/ichabodcole/project-docs-scaffold-template/issues/208),
from a project on scaffold 9.4.1.

## Definition of done

- [ ] `slug` keeps Unicode letters and numbers (`\p{L}\p{N}`), and a markdown
      link in a heading contributes its text, not its target.
- [ ] Repeated headings in one document are numbered `-1`, `-2`, … in document
      order, and a link to `#notes-1` passes.
- [ ] Tests cover the three headings above. `pdocs` stays zero-dependency.
