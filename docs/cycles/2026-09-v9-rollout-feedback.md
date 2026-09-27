---
type: cycle
title: v9 rollout feedback
description:
  Land the fixes the first two 9.0.0 consumers found and release them, so
  story-loom's migration can test them.
tags: [feedback, migrations, pdocs]
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: closed
started: 2026-09-26
appetite:
  Until a release carries these fixes; story-loom migrates on that release.
after: [] # cycles or features this one waits on: cycle/<slug>, feature/<slug>
generated: { by: claude-opus-5-5, at: 2026-09-26 }
closed: 2026-09-27
---

# v9 rollout feedback

## Why now

9.0.0 and plugin 4.0.0 were released on 2026-09-26, and their first two
consumers reported back the same day over the grapevine channel
`project-docs-v9`. Spellbook migrated 8.1.0 → 9.0.0, and wocky-talky, a new
project, adopted 9.0.0 fresh and ran its first cycle. Every finding was checked
against this repository's code or a clone of the consumer's repository before it
was accepted. Story-loom migrates after this cycle's release, not before: its
run tests whether these fixes cover what the first two consumers hit, and
whatever it finds that is new opens the next round.

## Scope

- [Spellbook feedback, round 2](../items/spellbook-feedback-round-2/item.md) —
  the eight migration fixes land, so story-loom's run gets them.
- [wocky-talky feedback, round 1](../items/wocky-talky-feedback-round-1/item.md)
  — finalize-branch, formatter guidance and `pdocs new`/`set` output fixed.
- [The lint passes a template's placeholder body and H1](../items/lint-rejects-placeholder-bodies.md)
  — filed at release; wocky-talky's fresh cycle passing `pdocs check` with every
  placeholder in place makes it part of this patch.

- Added at triage, 2026-09-26, because they touch the same files or help the
  same migration:
  [born items take their description from what they own](../items/born-items-take-description-from-owned-docs.md),
  [`pdocs new --title` fills the H1](../items/pdocs-new-title-fills-h1.md),
  [`pdocs new`'s catalog line is Prettier-stable](../items/pdocs-new-catalog-line-prettier.md),
  [`pdocs find` JSON carries the slug](../items/pdocs-find-json-slug.md), and
  [review this repository's born items marked done](../items/review-born-items-marked-done.md).

Out of scope, deliberately: story-loom's migration itself, which follows this
cycle's release and tests it, and the triage items filed at release that no
consumer has hit.

## Outcome

Everything the first two 9.0.0 consumers reported shipped in three branches,
plus a fourth for the re-pin. It was released as scaffold 9.0.1, then 9.1.0,
with plugin project-docs 4.1.0.

- `pdocs new`, `set` and `find` write what consumers expect, and the lint now
  reports a template's placeholders.
- finalize-branch catches branch SHAs cited in the session record, commits a
  dirty tree before review, and formats docs before committing.
- The v2.10-to-v3.0 migration handles adopters' own templates, edited owned
  files, links broken before the run, and paths outside `docs/`.
- The migration is pinned to 9.0.1, so story-loom gets the new cycle template.

Every branch was reviewed by an agent that ran the code, not just read it. Every
review came back **With fixes**, and several of its findings were real bugs
nobody had reported:

- the placeholder lint flagged legitimate tags;
- filling the H1 erased the names of owned documents;
- the move record was overwritten after a stop;
- case-only template clashes passed the preflight;
- the format step split paths with spaces and downloaded Prettier into projects
  without it.

Cut or deferred: `pdocs set-keeps-lifecycle-comment` was dropped, because the
owner retired the template's inline comments everywhere. Items filed from the
reviews wait in triage:

- the catalog line's list-wrap;
- placeholder wording;
- migration records shared across projects;
- a re-run's summary counts;
- Step 5's version markers.

Learned, and not in the scope:

- The plugin release was renumbered from the planned 4.0.1 to 4.1.0 under the
  repo's own semver convention: every change here altered behaviour.
- The coordinator's own session record cited branch SHAs, the exact fault it had
  just filed. Only the new `HEAD` scan caught it.
- The host machine sleeps mid-gate when unattended. Tests then "time out", and
  that cost an implementer hours before `pmset` showed the cause.
- A trial run on story-loom found its migration will stop on 19 preflight steps
  and then 288 verify problems, none caused by this cycle.
  [That readiness item](../items/story-loom-migration-readiness.md) is the next
  thing to plan, before story-loom migrates on 4.1.0.

## Sessions

- fix/pdocs-output-and-placeholder-lint (landed 2026-09-26)
- fix/v3-migration-spellbook-round-2 (landed 2026-09-27)
- fix/finalize-branch-wocky-rows (landed 2026-09-27)
- fix/repin-v3-migration-to-9.0.1 (landed 2026-09-27)
