---
type: item
title: Fold document-validation into docs-curator
description:
  document-validation has one reader, docs-curator; one file would stop the
  lifecycle rules drifting in two places.
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: backlog
id: 01a0da5f-86bb-750a-8e06-a9da8439eb9f
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-25 }
scope: project-docs
priority: medium
parent: feature/skill-surface-cleanup
---

# Fold document-validation into docs-curator

From the Phase 4 skill audit. Done when docs-curator carries the rules and
document-validation is removed or points at it.
