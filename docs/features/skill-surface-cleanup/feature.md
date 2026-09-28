---
type: feature
title: Skill surface cleanup
description:
  "Resolve the Phase 4 skill audit's leftovers: duplicated triggers and skills,
  paths that exist only in this repository, and outputs with no document type."
tags: [skills, audit]
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: backlog # backlog | ready | active | review | done | dropped
generated: { by: claude-opus-5-5, at: 2026-09-26 }
---

# Skill surface cleanup

## Overview

The Phase 4 skill audit of the work-taxonomy release
([skill-audit](../work-taxonomy/artifacts/skill-audit.md)) found problems it did
not fix: skills that duplicate each other, a trigger two skills claim, paths
that exist only in this repository, and outputs with no document type. Each is
filed as an item under this feature. None has been shaped yet.

## Problem Statement

A consumer loads every one of these skills. Two of the problems are wrong in
every consumer today: skills name plugin paths that only exist in this
repository, and `update-deps` declares a tool no environment has. The rest are
duplication, which costs a consumer's agent a wrong pick between two skills that
claim the same request.

## Scope

The items with `parent: feature/skill-surface-cleanup`
(`pdocs view feature skill-surface-cleanup`). Also in scope, since 2026-09-28:
[which skills belong in project-docs](../../items/project-docs-skill-scope.md)
and the moves it decides. Out of scope: moving plugins to another repository,
which belong to `toolbox-migration`, and HiveMind's own skills.

## Success Criteria

- [ ] Every item under this feature is `done` or `dropped` with a reason.
- [ ] No shipped skill names a path under `plugins/` that a consumer does not
      have.
