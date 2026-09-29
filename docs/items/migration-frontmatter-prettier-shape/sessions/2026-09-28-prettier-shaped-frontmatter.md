---
type: session
title: Prettier-shaped migration frontmatter — 2026-09-28
description:
  The v3.0 migration now writes frontmatter a consumer's prettier --check
  accepts, shaped by the project's own Prettier when it has one and never a
  downloaded one.
tags: [migrations, prettier]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-28 }
---

<!--
OWNERSHIP (of this template file — not of documents created from it): it is
yours to edit. The scaffold records its hash, so a migration updates it only
while you have not touched it. Frontmatter is the contract the lint enforces;
below it is yours. See docs/SCHEMA.md → "Who owns which file".

USAGE: `bun scripts/pdocs/cli.ts new session <topic> --owner feature/<slug>` (or
`item/<slug>`) writes this as sessions/YYYY-MM-DD-<topic>.md in the owner's
folder, dated today, and links the owner.

This is your dev journal - write what's relevant, skip what's not. Sessions are informal and flexible.
Focus on what stands out: deviations from plan, unexpected discoveries, what you would do differently.

Sessions serve two audiences:
1. YOU (or future you) - reflecting on what happened, capturing context for later
2. THE NEXT DEVELOPER - if someone takes over your work, this provides breadcrumbs to understand where
   you left off, what issues you hit, and what went off-plan

If everything went smoothly and there's nothing notable, you might only need a few lines.
If you wrestled with a complex bug for hours, write as much as helps capture what happened.

A step a future agent must follow does not stay here: add it, with its check, to
the playbook for that kind of work (docs/playbooks/README.md).

For more guidance, see the owner folder's README: ../../README.md
-->

# Prettier-shaped migration frontmatter — 2026-09-28

Part of [Story-loom migration](../../../cycles/2026-09-story-loom-migration.md).

## Context

Row 1 of the story-loom readiness write-up: after the v2.10-to-v3.0 migration,
231 of story-loom's `.md` files failed its `prettier --check` pre-commit hook,
against 0 before the run. The item asked for frontmatter in Prettier's shape,
with a test that runs Prettier over a migrated fixture.

## What Happened

The implementer checked story-loom's own tree before choosing an approach, and
that changed the approach. Story-loom's `.prettierrc` sets only `semi` and
`singleQuote`, so it runs with `proseWrap: preserve`: Prettier does not wrap
long YAML values there, and can unwrap some. A single fixed shape tuned to this
repository's `proseWrap: always` would have produced new failures in story-loom.
So the migration now shapes frontmatter in two layers:

- **Always:** one blank line after the closing `---`, and Prettier's quote
  preference (single quotes whenever a value contains `"` and needs no other
  escape). Every value stays on its key's line. This is what Prettier's defaults
  produce, and what a project without Prettier, or a run with `--skip-format`,
  gets.
- **When the project has Prettier:** at plan time, every block the run writes
  goes through the project's own Prettier (2.x or 3.x), loaded from its
  `node_modules` in one child process, at the document's own path so its config
  and `.prettierignore` apply. Only the block is formatted, never the body.
  Anything Prettier ignores or can't parse keeps the first layer's shape, and
  the plan says why.

Re-running the synthesis on story-loom's source also corrected the readiness
write-up's reading of its failures: the "11 wrapped" files were Prettier's quote
preference plus the missing blank line, and the "1 rewritten frontmatter" file
was a table whose links the run lengthened.

## Review

Census: the roster was read from this session's Agent tool listing of
dispatchable agent types. `general-purpose` (all tools, shell access) was chosen
as the review of record, briefed with the item and the write-up rows.
`feature-dev:code-reviewer` was rejected on capability: its tools list
`BashOutput` and `KillShell` but not `Bash`, so it could not run the migration.
`Plan` has shell access but is shaped for planning; `doc-reviewer` for
documents.

The first review ran the migration against story-loom's own Prettier 3.8.1 and
config, and whole-file `prettier --check` accepted all 25 written documents. Its
verdict was **With fixes**, for one blocker: the child process was started with
plain `bun -e`, and with no `node_modules` above the project, Bun's auto-install
fetched the latest Prettier from npm (reproduced with an empty
`BUN_INSTALL_CACHE_DIR`: it filled with prettier 3.9.9). Four non-blocking
findings: the quote rule counted quotes instead of following Prettier's rule,
Prettier 2.x rejected the array `ignorePath` and silently fell back, a broken
`.prettierrc` fell back silently, and the guide overstated both. Cole approved
fixing all five on the branch.

The re-review ran each fix: the empty cache stayed empty and the new test fails
without `--no-install`; 51 constructed values round-trip through `fmGet` and the
lint's `unquoteScalar` and are left alone by Prettier; Prettier 2.8.8 formats
and honours `.prettierignore`; a broken `.prettierrc` produces a note naming it.
Story-loom's 3.8.1 check, a second run (0 documents written, clean tree) and
resumes after stops in phases 5 and 6 still passed. Commands it ran included
`bun test …/migrate-v2.10-to-v3.0.test.ts` (165 pass), `npm run check:dist`, and
scratch worktrees against the base script (5 of the 7 new tests fail there).
Verdict: **Ready to merge: Yes**, with three cosmetic nits in the fallback note.

## Changes Made

- `migrate-v2.10-to-v3.0.ts`: `joinFrontmatter` and `yamlScalar` shape the first
  layer; `prettierFrontmatter()` runs the project's Prettier with
  `bun --no-install` and returns the blocks and a note that phase 3 prints.
- `migrate-v2.10-to-v3.0.test.ts`: a migrated fixture checked with
  `prettier --check`, with and without Prettier; the no-download test; the
  broken-config and `--skip-format` note tests.
- `v2.10-to-v3.0.md`: phase 3, `--skip-format` and after-run step 2 describe the
  two layers.

## Follow-up

Filed from this session, in `triage`:

- [The format phase can download Prettier](../../migration-format-phase-downloads-prettier.md)
- [Respelling a link inside a table misaligns the table](../../link-respell-misaligns-tables/item.md)
- [Owned files the refresh installs are not Prettier-clean](../../owned-files-installed-unformatted.md)
- [Polish the Prettier fallback note](../../prettier-fallback-note-polish.md)

---

**Related Documents:**

- [The migration writes frontmatter in Prettier's shape](../item.md)
