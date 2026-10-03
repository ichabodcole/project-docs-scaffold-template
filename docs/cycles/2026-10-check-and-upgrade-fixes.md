---
type: cycle
title: Check and upgrade-skill fixes
description:
  pdocs check bugs every 9.4 project hits, and the upgrade and workflow skill
  fixes the operator-mono and media-forge upgrades found.
tags: [pdocs, lint, skills]
status: draft
lifecycle: active
started: 2026-10-03
appetite:
  Stop when the eight items land and ship in a scaffold minor and a plugin
  minor.
after: [2026-10-pdocs-views]
generated: { by: claude-opus-5-5, at: 2026-10-03 }
---

# Check and upgrade-skill fixes

## Why now

Adopting 9.4 in Spellbook, operator-mono (from 2.6.0) and media-forge (from
8.1.0) filed thirteen issues. The `pdocs check` bugs among them hit every
project already on 9.4 on every commit: operator-mono's gate failed on 41 valid
app-URI links, a duplicate key passed as clean, and library-tier problems print
twice. The skill fixes are small, and they are the potholes the next upgrade
walks into.

## Scope

- **[item/link-check-skips-uri-schemes](../items/link-check-skips-uri-schemes.md)**
  (#192) — a link with any URI scheme is external.
- **[item/lint-duplicate-frontmatter-key](../items/lint-duplicate-frontmatter-key.md)**
  (#190) — a duplicate key is an error naming both lines.
- **[item/check-dedupes-library-tier-problems](../items/check-dedupes-library-tier-problems.md)**
  (#198) — each problem once, in one path form.
- **[item/upgrade-verify-snippet-zsh-glob](../items/upgrade-verify-snippet-zsh-glob.md)**
  (#197) and
  **[item/upgrade-audit-lifecycle-before-v30](../items/upgrade-audit-lifecycle-before-v30.md)**
  (#194) — update-project-docs fixes, one branch.
- **[item/ground-in-project-old-cli-fallback](../items/ground-in-project-old-cli-fallback.md)**
  (#202) — fall back when the CLI has no `view`.
- **[item/finalize-branch-playbook-vs-landing-policy](../items/finalize-branch-playbook-vs-landing-policy.md)**
  (#199) — a stale playbook can't override the landing policy or the review.
- **[item/v26-migration-test-git-hang](../items/v26-migration-test-git-hang.md)**
  — the CI flake: harden the v2.6 test's git helper.

The three lint items share `docs-lint/index.ts`; land them in the order above.
The cycle ends in a scaffold minor and a plugin minor.

Out of scope, deliberately: the v3.0 migration fixes, which share one script and
are the [next cycle](./2026-10-v3-migration-feedback.md); the pre-2.7 migration
bugs (#191, #193), which only older trees hit; and the `pdocs relink` and
`pdocs catalog` commands, which need design.

## Outcome

_Written at close, not before — and for an `abandoned` cycle too._

[What shipped. What was cut, and why. What carried over to the next cycle: each
item still open, and the cycle it joined. What was learned that will change how
the next cycle is scoped. For an `abandoned` cycle, what was falsified: the
assumption that stopped it. Two paragraphs is usually enough; the point is that
a reader six months from now can tell what happened without reading every
session.]

## Sessions

<!--
One line per branch, appended by `init-branch` as it opens them:

  - feature/some-branch (open)

`finalize-branch` rewrites `(open)` as `(landed YYYY-MM-DD)` when the branch
lands. Leave this section empty until the first branch; do not carry a
placeholder line into a real cycle.
-->
