---
type: backlog
title: "Spellbook feedback, round 1: twelve items from the upgrade channel"
description:
  "Twelve verified friction items from Spellbook's v2.6 to v2.9 upgrade, worked
  as one branch: a per-document report shape, a link rule, two lint messages,
  and eight guide and script wordings."
tags: [feedback, lint, migrations, guides]
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: open # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-fable-5-1, at: 2026-09-15 }
---

# Spellbook feedback, round 1: twelve items from the upgrade channel

Spellbook ran v2.6 → v2.7 → v2.9 on 2026-09-15, filed #176 (fixed, `cce845e`),
and sent eleven more friction items over the grapevine channel
`spellbook-upgrade` while it worked. Every item was verified on this
repository's code before it was accepted; two of the agent's claims were refuted
as mechanisms and kept as effects, and one recipe error was mine. The upgrade
landed on its `develop` at `49b4d0b9`, CI green at `eb012b7f`, gate enforcing —
the first consumer at the v2.7 guide's end state.

They are one item because they ship together: one branch, one plugin bump, one
release. None needs design work. Two touch behaviour (1, 4, 12) and get the
minor bump; the rest are wording and placement.

## The twelve

| #   | Item                                                                                                                                                                                                                                              | Where                                                                                                                                   | Size                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | `report --format json` emits one record per document, `{ path, tier, missing: [...] }`, beside the existing `lines`. A backfill then shards without a regex.                                                                                      | `scripts/pdocs/lint/rules.ts` `reportLines` (already parses per document; add a by-document map), `commands/report.ts`, golden fixtures | small feature, one shape call |
| 2   | The formatter-exclusion step moves **before** `## Run it` in both guides, reworded to name the loop (refresh restores the scaffold's bytes, the formatter redoes them, every migration diffs) and to say nothing is lost.                         | `migrations/v2.6-to-v2.7.md`, `v2.9-to-v2.10.md`                                                                                        | guide                         |
| 3   | The v2.9 guide names `--scaffold-dir` as the remedy for a fix on `develop` but unreleased, with the reachability probe and the script's exact cookiecutter call (`install_target=New project folder` included). Same in the v2.10 guide.          | `migrations/v2.8-to-v2.9.md`, `v2.9-to-v2.10.md`                                                                                        | guide                         |
| 4   | `UNKNOWN FIELD` says: not a project-docs document? add it to `lint.exclude`.                                                                                                                                                                      | `scripts/pdocs/lint/rules.ts:332`, golden fixtures                                                                                      | one string                    |
| 5   | The check's summary names the outside-docs-root corpus (_N tracked pages outside `docs/`, links only_), and SCHEMA's tier table says it in a sentence, with `lint.exclude` as the way out.                                                        | `scripts/pdocs/lint/collect.ts:76`, `commands/check.ts`, `docs/SCHEMA.md`                                                               | small                         |
| 6   | The post-gen hook's "the install aborted above" paragraph prints only in the success path today, so it is wrong every time it appears. Delete it or make it forward-looking.                                                                      | `hooks/post_gen_project.py:240`                                                                                                         | trivial                       |
| 7   | v2.9 phase 3 says "present" / "already identical" when the bytes did not change; "refreshed" only when they did.                                                                                                                                  | `migrations/scripts/migrate-v2.8-to-v2.9.ts:418,427` and its test                                                                       | wording                       |
| 8   | The husky snippet covers a lint-staged hook: `bun run docs:check` as its own line, never through lint-staged, and a probe conditional on what the hook contains.                                                                                  | `migrations/v2.6-to-v2.7.md` § Turn the gate on                                                                                         | guide                         |
| 9   | Backfill section: when setting `lifecycle`, check the tree for a successor or a merge; a missing marker is not "not done". Cost Spellbook six wrong values across seven subagents.                                                                | `migrations/v2.6-to-v2.7.md` § The backfill                                                                                             | guide                         |
| 10  | The #176 record carries Spellbook's coverage-ward argument (a consumer that asserts every file was examined cannot exclude the directory, so the layer must typecheck under consumer flags) and the landing SHAs.                                 | `docs/projects/spellbook-feedback/sessions/…`, `docs/memories/2026-09-15-…`                                                             | record                        |
| 11  | Backfill section: format the markdown you edited, not `docs/`; the tree may hold files another tool owns, and v2.9's Prettier pass is scoped to templates for that reason.                                                                        | `migrations/v2.6-to-v2.7.md` § The backfill                                                                                             | guide                         |
| 12  | A link target that resolves outside the repository root is `MISSING FILE` regardless of what is on disk — so a link into a sibling checkout fails locally, not first in CI. Plus SCHEMA's sentence: a link may leave `docs/`, not the repository. | `scripts/pdocs/docs-lint/index.ts` `checkLinks` (takes an optional root; the docs-corpus callers pass it), `docs/SCHEMA.md`             | small, one wrinkle            |

**The wrinkle in 12.** `checkLinks` has three callers. The two docs-corpus
callers can pass the root. The third is `unlinted-links.ts`, ported verbatim and
kept byte-identical by contract, so it does not pass one and the outside- docs
corpus keeps today's existence-only check. Spellbook's three failures were all
inside `docs/`, so the rule reaches the case that happened.

**A thirteenth, found opening the branch.** `git commit -a` exports
`GIT_INDEX_FILE` to the pre-commit hook, the test suite's temporary repositories
inherit it, and `git ls-files` inside them reads this repository's index: 43
tests fail in the hook and none fail outside it. Reproduce with
`cp .git/index /tmp/idx && GIT_INDEX_FILE=/tmp/idx bun test scripts/pdocs/cli.test.ts`.
The fix is in `scripts/pdocs/test-env.ts`, which exists for exactly this shape
(hook red, CI green): strip git's hook variables from every spawned child.

**Not in this item.** `noPropertyAccessFromIndexSignature` (16 sites) and
`exactOptionalPropertyTypes` (1) on the owned layer — no consumer has them on.

## Done when

- [ ] One branch lands the twelve; `project-docs` 3.13.0.
- [ ] `report --format json` on this repository's fixture tree emits a record
      per document with missing fields, and the text output is unchanged.
- [ ] A link to an absolute path outside the repository fails `pdocs check`
      here, on a tree where that path exists.
- [ ] The release that carries them is cut, closing the v2.9 downgrade window
      for every consumer, and posted on `spellbook-upgrade`.

## References

- Issue #176; Spellbook `49b4d0b9`, `eb012b7f`; channel `spellbook-upgrade`
  messages 1–23.
- [Session record](../projects/spellbook-feedback/sessions/2026-09-15-owned-layer-under-a-strict-consumer.md)
  for the #176 fix.
