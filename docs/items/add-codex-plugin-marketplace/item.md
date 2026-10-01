---
type: item
title: Add a Codex plugin marketplace for project-docs
description:
  Package the existing project-docs skills for Codex and list them in a
  repository-scoped Codex marketplace.
status: draft
lifecycle: done
id: 01a0f620-402b-7110-839b-95279ac6df53
kind: task
generated: { by: codex, at: 2026-09-30 }
cycle: 2026-10-codex-project-docs
released_in: 9.3.0
---

# Add a Codex plugin marketplace for project-docs

This repository exposes `plugins/project-docs` through its Claude marketplace,
but has no Codex marketplace entry or Codex plugin package. Codex users cannot
install the project's documentation workflows from this repository as a plugin.

Create a repository-scoped Codex marketplace at
`.agents/plugins/marketplace.json` and a Codex-compatible package for the
existing `project-docs` skills. Adapt skill instructions and paths where Codex
requires it. Leave Claude commands and agents out of this pass; skill
equivalents can be considered later. Keep the Claude marketplace and generated
`dist/` distribution working. Document the install and refresh steps and which
skills are available in Codex. Scope this item to `project-docs`; the broader
distribution question for other plugins lives in `skill-garden`.

## Definition of done

- [x] `.agents/plugins/marketplace.json` lists the Codex `project-docs` plugin
      with a resolvable local source path and valid marketplace metadata.
- [x] The Codex plugin has a supported manifest and exposes the existing
      `project-docs` skills intended for this pass. Claude-specific paths and
      tool assumptions in those skills are adapted or documented where needed.
- [x] Claude commands and agents are not included in the Codex plugin; the
      documentation makes this scope clear without promising equivalents yet.
- [x] Repository documentation shows how to discover, install, and test the
      local plugin in Codex and explains how its source relates to the Claude
      plugin and `dist/`.
- [x] A fresh local install exposes the intended skills in Codex; repository
      checks pass, including `check:dist` if shared plugin sources change.
