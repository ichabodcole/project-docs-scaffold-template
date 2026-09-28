---
type: item
title: Skills that use project-docs without living in it
description:
  How a skill keeps what must be fixed while a project extends the rest, as
  anthill's touch-point wiki pages do, and how a skill outside the plugin can
  build on project-docs without being coupled to it.
status: draft
lifecycle: backlog
id: 01a0e977-ee99-7345-8134-05f4e258a634
kind: research
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: project-docs
---

# Skills that use project-docs without living in it

Two questions that came up during the
[skill scope pass](./project-docs-skill-scope.md), but are bigger than it.

**How a skill is extended.** Anthill (`~/Projects/dreamwood/anthill`) splits
each touch-point skill in two. The skill holds what must always be true: its
steps, its guards, its order. How _this_ team does that touch point lives on a
wiki page the skill reads first (`<teamDir>/wiki/touchpoints/finalize.md`),
seeded by anthill and changed only by its `curate` skill. Project-docs has
started down this road. `finalize-branch`, `dev-kickoff` and `generate-dev-plan`
honour a project's `docs/playbooks/*-playbook.md`, but as an override that
replaces the skill's workflow, not an extension that keeps it. Project-docs'
core concepts (items, features, cycles) are settled and shouldn't be open to
redefinition. How a project runs each touch point could be.

**How a skill outside the plugin builds on project-docs.** Some skills do work
next to project-docs rather than inside it. `consolidate-long-branch` is about
git; it mentions project-docs once. If it leaves the plugin, a project may still
want it to know about items and sessions. What does a loosely coupled skill rely
on: the `pdocs` CLI's JSON output, `SCHEMA.md`, or nothing at all? And is there
guidance for writing one?

**Some of this already exists.** This repository's landing policy (squash by
default, and when not to) is defined by the project in `AGENTS.md`, and
`finalize-branch` follows it without saying what it is. That's an extension
point the skill never had to spell out.

**`finalize-branch` is the hard case.** Most of it is a git process: review, the
quality gate, commit, land. Part of it is a project-docs touch point: the item
moves to `done`, the session is written, and the cycle's Sessions line changes.
Whether it belongs in project-docs, or splits into a git skill that calls a
project-docs "close the work" step, is the question this item answers for every
skill: **which touch points project-docs owns, how each is defined, and how a
project extends it.**

Could share a cycle with the scope pass, since its answers help decide which
skills can leave.

## Definition of done

- [ ] A read of anthill's touch-point wiki pattern: what's fixed in the skill,
      what the wiki holds, and how it's changed. Compared with project-docs'
      playbook overrides.
- [ ] A recommendation on whether project-docs skills should take extension
      points of that kind, and for which touch points.
- [ ] The touch points project-docs owns, named. For a skill that is part touch
      point and part something else (`finalize-branch` first), which part stays.
- [ ] A recommendation on what a skill outside the plugin may rely on from
      project-docs, as a short contract, or a reason not to offer one.
