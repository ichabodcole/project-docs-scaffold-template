---
type: item
title: Which skills belong in project-docs
description:
  Write down the rule that a project-docs skill exists because of a project-docs
  lifecycle touch point, and sort every skill in the plugin into keep, move,
  merge or retire by it.
status: draft
lifecycle: backlog
id: 01a0e970-e698-73cb-b7fa-160879fa0e30
kind: research
generated: { by: claude-opus-5-5, at: 2026-09-28 }
parent: feature/skill-surface-cleanup
scope: project-docs
---

# Which skills belong in project-docs

The `project-docs` plugin ships 27 skills. Some are the framework itself:
`finalize-branch`, `sweep-project`, `triage-items`, `update-project-docs`.
Others make things a project might keep under `docs/` without being about
project-docs at all. `html-mockup-prototyping` is one, and toolbox already ships
a copy. `generate-slide-deck` is another.

Cole's rule (2026-09-28): **a skill belongs in project-docs when it exists
because of a project-docs lifecycle touch point**: filing, shaping or triaging
work, running a branch or a cycle, closing work out, keeping the tree current. A
skill that produces a kind of document is not that on its own. Its output can be
an artifact under a feature without project-docs owning the skill that made it.
The aim is a smaller set where every skill is plainly there for the framework.

The two items about specific moves,
[one html-mockup-prototyping skill](./merge-html-mockup-prototyping-copies.md)
and [the slide-deck skill](./move-slide-deck-skill-to-toolbox.md), are cases of
this rule and are decided by it.

## Definition of done

- [ ] The rule is written down where a future skill's author will meet it.
- [ ] Every skill in `plugins/project-docs/skills/` is sorted into keep, move
      (and to where), merge (and with what) or retire, with a line of reason
      each.
- [ ] Each move, merge or retirement is filed as its own item under
      [skill surface cleanup](../features/skill-surface-cleanup/feature.md), or
      folded into one already there.
