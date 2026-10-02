---
type: session
title: Positional retype to artifact — 2026-09-28
description:
  The v3.0 migration retypes a document whose new position says artifact, from a
  mirror of the lint's own rule pinned to it by tests, and keeps an existing
  artifact's tool keys.
tags: [migrations, lint]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-28 }
---

# Positional retype to artifact — 2026-09-28

Part of
[Story-loom migration](../../../cycles/_archive/2026-09-story-loom-migration.md).

## Context

Row 3 of the story-loom readiness write-up. Story-loom's nine
`workstreams/*/plan.md` (all `completed`) and one nested session kept
`type: plan`/`session` and a `lifecycle` through the migration. 9.x types those
positions as `artifact`, and the lint reported 28 problems.

## What Happened

The migration can't import the 9.x lint: until phase 4 it runs against the
adopter's older `scripts/pdocs/`, and it works against a pinned scaffold. So it
mirrors the lint's positional rule (`ownedType`, and the registry's entity,
owned-file and subfolder tables), and tests pin each piece to the lint. The
migration's older `positionalType` disagreed with the lint for nested entry
files and was replaced by the mirror.

Any owned document with a declared type whose new position the mirror types as
`artifact` gets `type: artifact`. Every key an artifact doesn't allow is dropped
(`lifecycle`, `parent`, `id`, `released_in` and so on), and the run names each
file with the values it dropped, so a plan's `completed` isn't lost silently.
The body is kept byte for byte, and the frontmatter goes through the Prettier
shaping from the first branch. Documents in `lint.exclude` are untouched, and
briefs now take the same path.

The review found one regression the branch introduced: an existing `artifact`
went through the retype too, so a Marp deck lost `marp` and `theme` and stopped
rendering. Cole approved two fixes before landing. The retype now skips a
document already typed `artifact`. And the artifact-field pin became two-sided:
the lint now exports `allowedFields(type)` (used by its own `UNKNOWN FIELD`
check, so its behaviour is unchanged), and the migration's list must equal it as
a set.

## Review

Census: the roster was read from this session's Agent tool listing.
`general-purpose` (all tools, shell access) was the review of record.
`feature-dev:code-reviewer` was rejected on capability (`BashOutput` and
`KillShell`, no `Bash`); `Plan` and `doc-reviewer` weren't the right shape.

The review compared the migration's `ownedType` with the lint's over every path
up to five segments deep, 3,017,194 paths, with 0 mismatches. It mutated the
registry and `ownedPosition` in a scratch worktree and saw the pins fail. It
also added `aliases` to the lint's optional fields and saw the old one-sided pin
still pass, which became the second fix. Fixture O's output under develop's
script and this branch's differed in 0 files, apart from the new notice. On a
fresh story-loom clone, phase 10 went from 293 problems to 265: exactly the 28
nested-workstream rows gone, nothing new, and the canon still identical. It ran
`npm run typecheck`, the test file (200 pass) and the full gate (1893 pass).
Verdict: **Ready to merge: Yes**, with four non-blocking findings.

The two approved fixes were checked in the coordinating session. The retype
guard is `was !== "artifact"`, and the lint refactor preserves behaviour:
`allowedFields` uses `row?.lifecycle`, as the inline set did. The implementer
showed each new test failing first: the deck test on the previous commit, and
the set pin with `aliases` added. The gate passed with 1897 tests.

## Changes Made

- `migrate-v2.10-to-v3.0.ts`: the positional mirror, `ARTIFACT_FIELDS`, and
  `retypeAsArtifact` wired into `computeChanges`.
- `scripts/pdocs/lint/rules.ts` (and its payload copy): `allowedFields(type)`
  exported and used by `documentProblems`.
- `migrate-v2.10-to-v3.0.test.ts`: the pins, a nested plan and session retyped
  while the owner's own are kept, an excluded plan untouched, a re-run, Prettier
  shape, and an existing deck keeping its keys.
- `v2.10-to-v3.0.md`: a "Retyped by position" paragraph and a "For you to check"
  bullet.

## Follow-up

Filed from this session, in `triage`:

- [Pin the migration's lint mirror to the scaffold it installs](../../migration-mirror-pins-to-scaffold-tag.md)
- [A nested feature.md or item.md is neither fixed nor named in advance](../../migration-nested-entry-files.md)
- [Retyping to a type other than artifact drops only lifecycle](../../migration-retype-drops-only-lifecycle.md)

---

**Related Documents:**

- [The migration retypes documents whose new position says artifact](../item.md)
