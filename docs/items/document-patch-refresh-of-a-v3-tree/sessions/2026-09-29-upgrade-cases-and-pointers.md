---
type: session
title: Upgrade cases, the CLI pointer and the Outcome lint — 2026-09-29
description:
  update-project-docs now works out which upgrade case a tree is in, migrations
  refuse to set a newer tree back, the newest migration is re-pinned to 9.1.0,
  adopters are pointed at the CLI, and the lint checks a closed cycle's Outcome.
tags: [migrations, update-project-docs]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-29 }
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

# Upgrade cases, the CLI pointer and the Outcome lint — 2026-09-29

Part of
[Story-loom migration](../../../cycles/_archive/2026-09-story-loom-migration.md).
Owned by the upgrade-case item; it is the record of five items landed on one
branch with one review: [the upgrade case](../item.md),
[Step 5 checks the markers](../../update-skill-step-5-rewrites-markers.md),
[migrations refuse a newer tree](../../migration-refuses-newer-tree.md),
[the CLI pointer](../../prompt-root-agent-file-cli-pointer.md) and
[the closed-cycle Outcome lint](../../lint-closed-cycle-without-outcome.md).

## Context

Issues #182 and #154. Spellbook refreshed 9.0.0 → 9.1.0 with no instructions for
its case, re-ran the v3.0 script by guess, got its markers set back to 9.0.1,
and never learned the root agent file should point at the CLI. #154's last open
point was that nothing checks a closed cycle's Outcome.

## What Happened

Cole decided the marker rule first: every scaffold release re-pins the newest
migration to itself, so re-running it is the refresh, and the scripts, not the
skill, set the markers. Then, one commit per item:

- **Migrations refuse a newer tree.** The v3.0 script and the three older ones
  stop, writing nothing, when the tree's version is past the release they
  install.
- **Step 5 checks the markers** instead of writing them. The re-pin is Step 14
  of the migrations playbook.
- **Step 2 names the case:** the tree is newer, a migration applies, behind with
  none (re-run the newest script), or already at the release. None of it names a
  release.
- **The CLI pointer:** Step 6's blurb is a pointer and `--help`. The v3.0 script
  and the scaffold install say when the root agent file lacks one.
  `docs/AGENTS.md` and `CLAUDE.md` point at the CLI, and three READMEs name
  their `pdocs new` command.
- **The Outcome lint:** `pdocs check` reports a closed or abandoned cycle whose
  Outcome is missing, empty or the template's own placeholder.

## Review

Census: the roster was read from this session's Agent tool listing.
`general-purpose` (all tools, shell access) was the review of record, one review
for the branch; `feature-dev:code-reviewer` was rejected on capability
(`BashOutput` and `KillShell`, no `Bash`).

The first review said **No**. It ran the Step 2 block verbatim against trees
generated from local tags and found two dead ends:

- **B1:** the legacy v2.7 → v2.8 guide generated the current template and
  stamped 9.1.0, so the next script's new guard refused it, and Step 2 then
  stopped too.
- **B2:** 9.1.0 was already released while the newest script still pinned 9.0.1,
  so every fresh project and Spellbook's real tree (9.1.0) were told to update a
  plugin that had no newer version.

Cole decided a newer tree has nothing to migrate: the skill runs no script and
carries on, and approved every fix. The legacy guides now check out their own
era's tags. The newest script is re-pinned to 9.1.0; `OWNED_RELEASES` needed no
change, because 9.0.1 and 9.1.0 differ only in version strings. Case 1
continues, and the refusals no longer send the adopter in a loop. Step 3's row
selection is decidable (legacy rows only without `.project-docs.json`). The
Outcome lint accepts `## Outcome — …` and ignores fenced headings.

The re-review, **Ready to merge: Yes**: the Step 2/Step 3 matrix over trees from
2.3.0 to 9.1.0 and a fake 9.2.0 matched, and a real chain from a 6.3.0 tree,
driven only by the skill's own output, ended at 9.1.0 in case 4 with owned files
byte-equal to 9.1.0's. Spellbook's real markers now land in case 4. It ran
typecheck and the full gate (1988 pass).

## Follow-up

Filed from this session, in `triage`:

- [update-project-docs re-tests each migration just before running it](../../update-skill-retests-before-running.md)
- [Migration wording that predates refreshes](../../migration-wording-leftovers.md)

---

**Related Documents:**

- [Document refreshing a v3.0 tree to a newer patch](../item.md)
