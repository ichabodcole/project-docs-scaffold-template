---
type: cycle
title: Codex project-docs plugin
description:
  Make the existing project-docs skills installable through a Codex marketplace.
tags: [codex, plugins, documentation]
status: draft
lifecycle: active
started: 2026-10-01
appetite:
  Stop when the existing skills can be installed and exercised in Codex, with
  commands and agents deferred.
after: []
generated: { by: codex, at: 2026-10-01 }
---

# Codex project-docs plugin

## Why now

The project already has a Claude plugin marketplace and a set of `project-docs`
skills. The next distribution step is to make those skills available through a
Codex marketplace, with a narrow scope that can be installed and checked.

## Scope

- **[item/add-codex-plugin-marketplace](../items/add-codex-plugin-marketplace/item.md)**
  — Add the Codex marketplace and package the existing skills so a fresh local
  install can use them.

Claude commands and agents are outside this cycle. Any Codex skill equivalents
for them can be scoped in a future pass.

## Outcome

_To be written when the cycle closes._

## Sessions

- feature/add-codex-plugin-marketplace (landed 2026-10-01)
