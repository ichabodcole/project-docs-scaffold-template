---
type: item
title: What story-loom's v3.0 migration will ask for
description:
  A trial run on a scratch copy of story-loom stops on 19 preflight steps and,
  once past them, on 288 verify problems; list them so the real run is planned,
  not discovered.
status: draft
lifecycle: done
id: 01a0e459-0930-702d-8b15-46b74befaf20
kind: research
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations, story-loom]
scope: migrations
from: items/repin-v3-migration-to-9.0.1/sessions/2026-09-27-repin-to-9.0.1.md
priority: high
---

<!--
OWNERSHIP (of this template file — not of documents created from it): it is
yours to edit. The scaffold records its hash, so a migration updates it only
while you have not touched it. Frontmatter is the contract the lint enforces;
below it is yours. See docs/SCHEMA.md → "Who owns which file".

USAGE: `bun scripts/pdocs/cli.ts new item <slug> --kind <kind>` writes
docs/items/<slug>.md from this file, with a fresh `id` and `lifecycle: triage`.
Pass `--title`, `--description` and `--by`, and what you know as flags:
`--parent feature/<slug>`, `--blocked-by <ref,ref>`, `--from <path or ref>`.
Do not copy this file by hand: the `id` must be a fresh UUID, and the CLI
checks every reference before it writes.

WHO WRITES EACH FIELD. Add an optional field only when it applies. After
creation, change a field with `pdocs set <ref> --<field> <value>`; it refuses a
value the lint would reject.

  title, description, kind   whoever files the item
  id                         `pdocs new item`, once
  status                     OKF's document-trust marker. It keeps this
                             value; no workflow step moves it
  lifecycle                  `triage` when an agent files it. The user decides
                             at triage (the triage-items skill proposes):
                             `backlog`, `ready`, or `dropped`. Shaping sets
                             `ready`; init-branch sets `active`;
                             finalize-branch sets `review` when its review
                             starts and `done` when it lands. An agent
                             never moves an item out of `triage` itself.

  Optional:
  parent: feature/<slug>     whoever files it, or triage
  scope: <name>              whoever files it; one name from `lint.scopes`
  from: <what spawned it>    whoever files it: an item id, `feature/<slug>`,
                             `cycle/<slug>`, or a docs-root-relative path.
                             A review always writes it.
  source: <external id>      intake from outside the tree: an issue number
  priority: urgent | high | medium | low       triage
  assignee: <agent, seat or name>              triage, when it is routed
  blocked_by: [<item id>, ...]                 shaping
  cycle: <cycle file slug, e.g. 2026-09-auth>  init-branch, when one is active
  released_in: <version>     sweep-project, at release. Never checked.

docs/items/README.md has the states, the kinds and the rules.
-->

# What story-loom's v3.0 migration will ask for

The re-pin review ran v2.9→v2.10 and then v2.10→v3.0 (scaffold 9.0.1) on a
scratch clone of story-loom at `a76f31ca`, on scaffold 8.0.0. v2.9→v2.10
exits 0. v2.10→v3.0 stops at preflight on 19 judgment steps: a slug clash, 6
reports with no owner, 5 archived briefs, and 7 non-documents under
`investigations/prototypes/`. Resolved crudely, it then stops at verify with 288
problems, identical under a 9.0.0 pin. Among them:

- `projects/storyline-engine/` holds `storyline-engine-proposal.md`, not
  `proposal.md`, so it becomes a born item marked `done` although it is live,
  and its `workstreams/*/plan.md` files are typed `artifact` (9 plans:
  `WRONG TYPE`, `LIFECYCLE`, `UNKNOWN FIELD`).
- Two Slidev decks need `lint.exclude`.
- About 237 `MISSING FILE` come from never-linted archives, many of them links
  written from the repository root in `DEV_KICKOFF.md` files.

The question: which of these should the migration handle (a proposal under
another name; workstream plans; root-relative links) and which are story-loom's
to fix before or after the run?

## Definition of done

- [x] Each class of problem is listed with its count and a decision: handled by
      the migration (filed as its own item), or a pre-run or post-run step for
      story-loom.
- [x] The decisions are shared with story-loom's agent before its run.

## Related Documents

- [Re-pin to 9.0.1 and plugin 4.1.0 — 2026-09-27](../repin-v3-migration-to-9.0.1/sessions/2026-09-27-repin-to-9.0.1.md)
