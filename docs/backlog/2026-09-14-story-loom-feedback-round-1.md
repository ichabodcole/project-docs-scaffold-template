---
type: backlog
title: "Story-loom feedback, round 1: nine fixes"
description:
  Land the nine verified defects story-loom filed as its first consumer (issues
  163–171), one commit per issue, minor plugin bump.
tags: [lint, codemod, migrations]
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: open # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-fable-5-1, at: 2026-09-14 }
---

# Story-loom feedback, round 1: nine fixes

Story-loom adopted 8.0.0 on 2026-09-14 as the first consumer and filed nine
issues upstream. Every claim was reproduced on this repository's current code
before scoping (two verifiers, one per cluster). Eight are confirmed as filed;
one is confirmed as an effect and misdescribed as a mechanism; two proposed
fixes are wrong though the defects are real.

## The nine

| Issue | Defect                                                                                                                       | Verdict                                    | Fix                                                                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #163  | `isTemplate()` substring match hides a real page named `templates.md` from every tier, codemod included                      | confirmed                                  | exact set from `docs/.pdocs-seed.json`, name-pattern fallback for pre-2.9 trees; the issue's pattern list misses `TEMPLATE-domain.md` and `TEMPLATE-overview.md` |
| #164  | codemod derives `tags:` from a bold Tags label anywhere in a line; lowercase-only token regex truncates capitals (`licking`) | effect confirmed, mechanism misdescribed   | anchor the label at line start; accept only backticked or `#` tokens; fix the case bug; keep the legitimate form                                                 |
| #165  | foreign frontmatter (no `type`, or a wrong one) skipped silently, then reported as ordinary missing fields                   | confirmed                                  | codemod names skipped files whose block has no `type` or a `type` the folder does not allow, as needing conversion                                               |
| #166  | no check that a project's formatter claims `scripts/pdocs/`                                                                  | gap confirmed, proposed grep refuted       | guidance that `scripts/pdocs/` is owned and to exclude, plus a behavioural check: run the project's formatter in check mode on the directory                     |
| #167  | both scripts re-serialise `.project-docs.json`, which SCHEMA calls theirs                                                    | confirmed for any run that moves `version` | patch the one key preserving the file's bytes, in both scripts                                                                                                   |
| #168  | codemod YAML uses backslash-escaped double quotes; the playbook template wraps `description:`                                | confirmed; quoting is config-independent   | single quotes when the value holds a double quote; unwrap the template; reword the guide's hook bullet                                                           |
| #169  | a slide deck's frontmatter reports as a bare missing `type` with no pointer to `lint.exclude`                                | confirmed                                  | renderer-key heuristic in the codemod summary and `pdocs report`, pointing at SCHEMA § "Files that are not documentation"                                        |
| #170  | the guide's `check` script replaces an existing gate of that name                                                            | confirmed                                  | name it `docs:check`, show the compose case; this repo's own `check` composes the docs lint the same way                                                         |
| #171  | the v2.5 `Applies If` cell errors under zsh                                                                                  | confirmed, cosmetic                        | the `find` form with stderr silenced                                                                                                                             |

## Shape

One branch, one commit per issue closing it, a minor `project-docs` bump. Known
fixes with no design decision left open, so backlog rather than proposal. The
fixes to `rules.ts` and the codemod ship in the scaffold payload; a consumer
already on 8.0.0 receives them only through
[v2.9 → v2.10](./2026-09-14-v2.9-to-v2.10-refresh-the-owned-files.md).

## Done when

All nine issues closed by commits on `develop`, the plugin bumped, and the
release cut.
