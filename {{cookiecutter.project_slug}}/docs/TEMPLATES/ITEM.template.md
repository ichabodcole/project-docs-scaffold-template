---
type: item # REQUIRED (OKF §3). Do not change it — the folder decides it.
title: "[What needs doing, as a short imperative]"
description: "[One sentence: the problem, and what done looks like.]"
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: triage # triage | backlog | ready | active | review | done | dropped
id: "[uuid]" # a lowercase UUID; `pdocs new item` writes it. Never edit it.
kind: task # task | bug | chore | research
generated: { by: your-name-or-model, at: YYYY-MM-DD }
---

<!--
OWNERSHIP (of this template file — not of documents created from it): it is
yours to edit. The scaffold records its hash, so a migration updates it only
while you have not touched it. Frontmatter is the contract the lint enforces;
below it is yours. See docs/SCHEMA.md → "Who owns which file".

Optional fields, added when they apply: priority (urgent | high | medium |
low), assignee, parent (feature/<slug>), scope (one value declared in
lint.scopes), cycle (a cycle's slug), from, source, blocked_by (a list of item
ids), released_in.
-->

# [Title]

## Definition of done

- [ ] [The observable result that closes this item]
