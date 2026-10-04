---
type: cycle
title: Check and upgrade-skill fixes
description:
  pdocs check bugs every 9.4 project hits, and the upgrade and workflow skill
  fixes the operator-mono and media-forge upgrades found.
tags: [pdocs, lint, skills]
status: draft
lifecycle: closed
started: 2026-10-03
appetite:
  Stop when the eight items land and ship in a scaffold minor and a plugin
  minor.
after: [2026-10-pdocs-views]
generated: { by: claude-opus-5-5, at: 2026-10-03 }
closed: 2026-10-03
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

- **[item/link-check-skips-uri-schemes](../../items/link-check-skips-uri-schemes/item.md)**
  (#192) — a link with any URI scheme is external.
- **[item/lint-duplicate-frontmatter-key](../../items/lint-duplicate-frontmatter-key/item.md)**
  (#190) — a duplicate key is an error naming both lines.
- **[item/check-dedupes-library-tier-problems](../../items/check-dedupes-library-tier-problems/item.md)**
  (#198) — each problem once, in one path form.
- **[item/upgrade-verify-snippet-zsh-glob](../../items/upgrade-verify-snippet-zsh-glob/item.md)**
  (#197) and
  **[item/upgrade-audit-lifecycle-before-v30](../../items/upgrade-audit-lifecycle-before-v30.md)**
  (#194) — update-project-docs fixes, one branch.
- **[item/ground-in-project-old-cli-fallback](../../items/ground-in-project-old-cli-fallback/item.md)**
  (#202) — fall back when the CLI has no `view`.
- **[item/finalize-branch-playbook-vs-landing-policy](../../items/finalize-branch-playbook-vs-landing-policy/item.md)**
  (#199) — a stale playbook can't override the landing policy or the review.
- **[item/v26-migration-test-git-hang](../../items/v26-migration-test-git-hang/item.md)**
  — the CI flake: harden the v2.6 test's git helper.

The three lint items share `docs-lint/index.ts`; land them in the order above.
The cycle ends in a scaffold minor and a plugin minor.

Out of scope, deliberately: the v3.0 migration fixes, which share one script and
are the [next cycle](../2026-10-v3-migration-feedback.md); the pre-2.7 migration
bugs (#191, #193), which only older trees hit; and the `pdocs relink` and
`pdocs catalog` commands, which need design.

## Outcome

All eight items shipped on 2026-10-03, and nothing in Scope was cut.
`pdocs check` treats a link with a URI scheme as external, reports a frontmatter
key written twice, and prints each library-page problem once with every path
repo-relative. update-project-docs' verify snippets run in an agent's zsh, the
whole backfill comes before v3.0, ground-in-project falls back on an 8.x CLI,
finalize-branch keeps the review and the landing policy over a stale playbook,
and the migration tests' git spawns are bounded. The release follows this close:
a scaffold minor with the v3.0 migration re-pinned to it, then a plugin minor.

What changed on the way, none of it in Scope:

- **Review reversed one fix.** #194 asked to audit `lifecycle` before v3.0 and
  leave descriptions for the end; review found v3.0 copies descriptions into the
  items it creates, so the whole backfill moved before v3.0.
- **The playbook bug was in Step 8, not the override paragraph.** Step 8 looked
  for the playbook before the landing policy, the operator-mono failure exactly.
- **Agent-shell bugs need the agent's shell.** `zsh -c` does not reproduce an
  unmatched glob aborting a block; only the harness shell (zsh through `eval`)
  does. The same glob was found and fixed in the v2.7-to-v2.8 guide and
  ground-in-project, and is filed for the `project-summary` command.
- **Real trees as the regression check.** The #198 review ran both CLIs on the
  three consumers' current and pre-backfill trees: no consumer goes red, and
  every removed row was a duplicate.

Follow-ups filed to triage:
[check-output-polish](../../items/check-output-polish.md),
[project-summary-zsh-glob-and-old-cli](../../items/project-summary-zsh-glob-and-old-cli.md)
and
[stale-lifecycle-playbooks-after-upgrade](../../items/stale-lifecycle-playbooks-after-upgrade.md).
Next is the planned
[v3.0 migration feedback cycle](../2026-10-v3-migration-feedback.md).

## Sessions

<!--
One line per branch, appended by `init-branch` as it opens them:

  - feature/some-branch (open)

`finalize-branch` rewrites `(open)` as `(landed YYYY-MM-DD)` when the branch
lands. Leave this section empty until the first branch; do not carry a
placeholder line into a real cycle.
-->

- fix/link-check-skips-uri-schemes (landed 2026-10-03)
- fix/lint-duplicate-frontmatter-key (landed 2026-10-03)
- fix/check-dedupes-library-tier-problems (landed 2026-10-03)
- fix/upgrade-skill-zsh-and-audit-order (landed 2026-10-03)
- fix/ground-in-project-old-cli-fallback (landed 2026-10-03)
- fix/finalize-branch-playbook-vs-landing-policy (landed 2026-10-03)
- fix/v26-migration-test-git-hang (landed 2026-10-03)
