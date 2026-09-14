---
type: brief
title: Lint Beyond the Docs Root
description:
  pdocs sees one docs root and nothing widens it; a monorepo's app READMEs
  carrying the same frontmatter are invisible to check and find.
tags: [lint, okf, monorepo]
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: active # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-fable-5-1, at: 2026-09-14 }
---

# Lint Beyond the Docs Root

---

## The Spark

Story-loom's upgrade to the frontmatter layer (2026-09-14) reached the edge of
what `pdocs` can see. It is a monorepo: `apps/*` each carry a README and other
markdown that would benefit from the same frontmatter and the same checks.
`pdocs` lints one `docsRoot` and nothing in its config widens that.

Tried on a freshly generated project with `apps/web/README.md` carrying valid
frontmatter and a deliberately broken link:

| attempt                            | result                                                 |
| ---------------------------------- | ------------------------------------------------------ |
| `lint.durable` gains `../apps/web` | silently ignored; the broken link is never reported    |
| `docsRoot: "."`                    | exit 1, raw `ENOENT … /SCHEMA.md`; not a named refusal |
| `pdocs find --type architecture`   | `no matches`; the file is invisible                    |

Everything in the config narrows — `exclude`, `skip` — and nothing widens. The
one place `docsRoot` enters the registry is a single path join
(`scripts/pdocs/lint/registry.ts`), and the walker never leaves it.

## Inspiration & Influences

- **`dreamwood/dream-flute/scripts/docs-lint/tree.ts`** — the whole-tree lint:
  two tiers, one walker, libraries _discovered_ by globbing for `SCHEMA.md`
  rather than configured. Tier 1 (links and anchors) applies to any markdown;
  tier 2 (frontmatter, catalog reachability, `related` edges) only inside a
  library, because it is meaningless without a contract. Add a third library and
  it is covered with no wiring.
- **`AGENTS.md` § the lint's portable core** — "copied rather than shared as a
  package — three repositories are still discovering what this tool should be,
  and a package would freeze that early." The reason is _not yet_, not _no_.
- **Docs Foundation** (`docs/projects/docs-foundation/`) — declarable types and
  the ownership model are what make a root-agnostic tool possible: the
  vocabulary is config, not code.
- **`2026-02-25-cross-agent-skill-portability.md`** and
  **`2026-07-23-wiki-tooling-boundary-investigation.md`** — the portability
  split (lint portable; render app-coupled) that this brief's second step
  depends on.

## Vision

Any markdown in a repository that follows the OKF frontmatter standard can be
checked, found and graphed by the same tool, wherever it sits. The consumer says
where to look — or the tool finds libraries by their contract — and says what to
leave alone. `docs/` stays the default and the scaffold's home; it stops being
the boundary.

## Core Use Cases

1. **A monorepo's app documentation** — story-loom's `apps/*/README.md` and
   siblings get the link tier now and the contract tier once they carry
   frontmatter, without moving into `docs/`.
2. **A second library in one repository** — dream-flute's `kb` and `wiki` shape:
   two subtrees, each with its own `SCHEMA.md` and type vocabulary, linted by
   one command.
3. **The scaffold itself** — this repository's own `plugins/*/README.md` and
   skill files follow the standard loosely today and could follow it fully.
4. **A package, eventually** — `bunx` the tool against any tree that follows the
   standard, with project-docs becoming the scaffold plus the skills that depend
   on it, and tooling migrations collapsing to a version bump.

## What Makes It Interesting

Two designs answer the near-term case and they diverge on what "unlisted folder"
means:

- **Additional roots.** `lint.roots: ["apps/*"]` — the walker also enters each,
  with its own tier/type settings or the defaults. Small, explicit, keeps
  today's hard stop on an undeclared folder (the v2.6 migration's preflight
  depends on that rule).
- **Discovery.** A library is any subtree with a `SCHEMA.md`; everything else is
  link-tier only. More general, and the shape a package needs — but under it a
  folder outside any library is _not_ a stop, it is link-tier by definition, so
  the migration's "declare or skip it" rule needs restating for the non-library
  case.

The named error is owed either way: `docsRoot: "."` fails today on a raw file
path rather than saying the root must hold a `SCHEMA.md`.

## What It Is / What It Isn't

**It is:**

- A widening of what `pdocs check`, `find`, `graph`, `orphans` and `backlinks`
  walk, configured by the consumer.
- The decision between additional roots and discovery, with the migration
  preflight's rule restated to match.
- The step that makes a packaged `pdocs` conceivable.

**It is not:**

- The package. Extraction is a second decision, taken when story-loom and the
  playgrounds agree on the shape.
- A change to the scaffold's `docs/` layout or to which folder holds what.
- A render or graph UI; the boundary investigation already put those elsewhere.

## Open Questions

- [ ] Roots or discovery first? Roots ship in a day and story-loom needs them
      now; discovery is the shape a package wants and dream-flute has already
      proven it.
- [ ] Under discovery, what is a markdown file in no library — link-tier only,
      or still a stop until declared? The v2.6 migration's preflight currently
      says stop.
- [ ] Does a README outside `docs/` stay a "contract page" the codemod skips, or
      does it opt in by carrying frontmatter?
- [ ] Which repository is the second consumer for this: story-loom (the case) or
      this one (the dogfood)?

## Suggested Next Steps

- [ ] Add the named refusal for a `docsRoot` without a `SCHEMA.md` — one guard,
      watched failing, regardless of the rest.
- [ ] Decide roots vs discovery; write it as a proposal with story-loom's tree
      as the fixture.
- [ ] Restate the migration preflight's undeclared-folder rule for whichever
      design lands.
- [ ] Reopen the packaging question as its own brief once two consumers run the
      widened lint.

---

**Origin:**

- Story-loom's upgrade to the frontmatter layer, 2026-09-14, and the experiment
  above (a generated project, three config attempts, none reaching
  `apps/web/README.md`)
- [Migration Shape](../projects/migration-shape/proposal.md) — the project that
  made the migration preflight depend on the undeclared-folder rule this brief
  has to restate
