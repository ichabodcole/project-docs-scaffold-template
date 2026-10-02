---
type: session
title: pdocs output and the placeholder lint — 2026-09-26
description:
  pdocs new, set and find write what consumers expect, and the lint now reports
  a template's placeholders left in a document; reviewed twice, landed with five
  review fixes.
tags: [pdocs, lint, feedback]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-26 }
---

# pdocs output and the placeholder lint — 2026-09-26

Part of [v9 rollout feedback](../../../cycles/2026-09-v9-rollout-feedback.md).
Branch `fix/pdocs-output-and-placeholder-lint`. Implements rows 4 and 5 of
[this item](../item.md); rows 1–3 (finalize-branch) are a later branch. Also
finishes four items in the same files:
[`--title` fills the H1](../../pdocs-new-title-fills-h1.md),
[a Prettier-stable catalog line](../../pdocs-new-catalog-line-prettier.md),
[`find` JSON carries the slug](../../pdocs-find-json-slug.md) and
[the lint reports placeholders](../../lint-rejects-placeholder-bodies.md).

## What landed

- **`pdocs new`** writes frontmatter without the template's inline `#` comments.
  It fills a `YYYY-MM-DD` field with today (a cycle's `started`), always writes
  list fields (`--tags`) as YAML lists, fills the H1 from an explicit `--title`,
  and writes a catalog line Prettier leaves alone. The comments are stripped at
  write time and the templates are left untouched: a consumer owns its
  templates, and changing them would churn seed hashes. The stripper leaves
  quoted and block scalars alone.
- **`pdocs set`** reports an unchanged value as `(already set)` and does not
  rewrite the file. Its JSON gains `changed`.
- **`pdocs find --format json`** carries each document's `slug`.
- **The lint** reports `PLACEHOLDER`: a document still holding its template's
  bracketed title, description or other string (a cycle's `appetite`), a bare
  `YYYY-MM-DD`, tags that are only `area`/`feature`, or the template's H1. It
  reports `BAD TAGS` for tags that are not a list, quoted strings included. This
  repository's own tree had one real hit, a session still tagged
  `[area, feature]`, fixed on the branch.
- Six skills that said "`pdocs new` does not fill the H1" or "the lint does not
  catch a placeholder" now say what the CLI does. `SCHEMA.md` and the CLI
  reference agree.

## Decisions

- Owner, at triage: the template's inline frontmatter comments are retired
  everywhere, not preserved by `set` (`pdocs-set-keeps-lifecycle-comment`
  dropped).
- Owner, after the first review: tags are a placeholder only when every tag is
  `area` or `feature`, because two templates ship tags a real document could
  choose (`[overview, product]`, `[surface, flow]`). The H1 is filled only from
  an explicit `--title`, because the default title erased "Implementation Plan",
  "Deployment Handoff" and the like on owned documents. Without `--title`, the
  template's H1 stays and the lint names it.

## Review

Roster read from the Agent tool's dispatchable types in this session.
`general-purpose` (tools `*`) chosen, briefed against the five items'
definitions of done. `feature-dev:code-reviewer` rejected on capability: its
list has `BashOutput` and `KillShell` but no `Bash`. `doc-reviewer` (All tools)
was not chosen, being shaped for documents. `Plan` (all tools but editing) was
not needed, since the branch has no plan.

First review: **With fixes**. Its log: `npm run check` in a clone, "1751 pass /
0 fail"; a generated payload with `pdocs new` item, cycle, plan, handoff,
specification and interaction pages, `pdocs check` and `prettier --check` under
both configs; `catalogEntry` fuzzed against Prettier over 1,084 cases; four
fixes neutered, each failing its test. It found the tag false positive, the H1
fill erasing owned documents' names, stale skill text, two stripper shapes that
could corrupt an edited template, and gaps in the lint (`appetite`, quoted
tags). The owner chose to fix all five here.

Re-review of the two fix commits: **Ready to merge: Yes**. Its log: a fresh
clone, "1762 pass / 0 fail"; a second generated payload where the earlier
false-positive probes are clean, an owned plan without `--title` keeps its H1
and is reported, and `new cycle` fails without `--appetite` and passes with it;
20 stripper edge cases; four new fixes neutered, each failing its test.

**Follow-up items:** filed in `triage` from this session:
[the catalog line can wrap into a nested list](../../catalog-line-wraps-into-a-list/item.md),
[placeholder-lint wording polish](../../placeholder-lint-wording-polish.md). Two
finalize-branch wording points from the re-review (the session `tags` bullet and
the handoff step not suggesting `--title`/`--description`) go with rows 1–3 of
[this item](../item.md).

---

**Related Documents:**

- [wocky-talky feedback, round 1: the first work cycle on 9.0](../item.md)
