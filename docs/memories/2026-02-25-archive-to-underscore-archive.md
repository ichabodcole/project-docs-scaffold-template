---
type: memory
title: "Renamed archive/ to \\_archive/ across scaffold"
description:
  Every archive/ folder became _archive/, so closed work sorts to the top of a
  listing instead of into the middle of it.
tags: [documentation, archive, migration]
status: stable
generated: { by: unknown, at: 2026-02-25 }
---

# Renamed archive/ to \_archive/ across scaffold

Renamed all `archive/` directories to `_archive/` so they sort to the top of
directory listings. Updated path references across docs, cookiecutter template,
plugins, migration guides, and historical project docs. Created v2.5→v2.6
migration guide for end users. Plugin version bumped to 1.8.5.

**Key files:**
`plugins/project-docs/skills/update-project-docs/migrations/v2.5-to-v2.6.md`

**Docs:**
[Session](../projects/_archive/documentation-restructuring/sessions/2026-02-25-archive-to-underscore-archive.md)
