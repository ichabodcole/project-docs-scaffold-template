---
type: cycle
title: Codex project-docs plugin
description:
  Make the existing project-docs skills installable through a Codex marketplace.
tags: [codex, plugins, documentation]
status: draft
lifecycle: closed
started: 2026-10-01
appetite:
  Stop when the existing skills can be installed and exercised in Codex, with
  commands and agents deferred.
after: []
generated: { by: codex, at: 2026-10-01 }
closed: 2026-10-01
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

Shipped in
[v9.3.0](https://github.com/ichabodcole/project-docs-scaffold-template/releases/tag/project-docs-scaffold-template-v9.3.0)
on October 1, 2026, through PR #184. The Codex marketplace installs the existing
project-docs skills package with 22 compatible skills. Fresh local discovery,
installation, and refresh were exercised. Claude commands and agents remain
deferred, along with five skills outside this pass's compatibility scope.

Investigation during verification found that migration suites were running from
source and both generated packages. The
[test optimization](../items/run-source-tests-once.md) landed through PR #185
before the release: source suites run once with four file workers. Final PR CI
passed all 1,412 unique tests in 67.99 seconds, with the job at 1m55s. Fixture
cleanup is batched and has a dedicated timeout budget.

Tooling friction and measurements are retained in the
[research write-up](../items/test-performance/write-up.md). The pre-existing
[Git fixture-copy failure](../items/stabilize-migration-git-fixtures.md) remains
separate follow-up work; its cause was not resolved by this cycle.

## Sessions

- feature/add-codex-plugin-marketplace (landed 2026-10-01)
