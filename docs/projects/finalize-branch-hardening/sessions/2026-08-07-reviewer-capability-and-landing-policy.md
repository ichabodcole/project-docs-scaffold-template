---
type: session
title: "Reviewer Capability Check and Project-Owned Landing Policy — 2026-08-07"
status: stable
generated: { by: unknown, at: 2026-08-07 }
---

# Reviewer Capability Check and Project-Owned Landing Policy — 2026-08-07

## Context

Two GitHub issues on `ichabodcole/project-docs-scaffold-template` reported the
same root failure in `plugins/project-docs/skills/finalize-branch/SKILL.md`: the
skill made authoritative-sounding defaults without verifying they were actually
safe or possible for the repo it was running in, silently.

- **#148** — Step 2 named `feature-dev:code-reviewer` as the default mandatory
  reviewer, but that agent has no `Bash` tool — its "mandatory" review was a
  static read that couldn't run tests, run the CLI, or reproduce a defect.
- **#149** — Step 8 both decided the squash strategy and executed it, with no
  knowledge of the target project. On a real branch with SHA-cited docs and
  multi-agent attribution trailers, that default would have destroyed
  information the project deliberately preserves.

No formal proposal/plan was written for this work — it started as a
conversational GitHub-issue triage and grew through direct discussion into the
scope below. Captured here as a session rather than a full pipeline.

## What Happened

**Fix 1 — Step 2 capability check.** Reworded from naming a default reviewer to
requiring verification: check the candidate agent's tool list for `Bash` before
dispatching, since agent toolsets drift independently of this skill.
`feature-dev:code-reviewer` stays listed as a confidence-filtered option, but
paired with an execution-capable reviewer rather than dispatched alone.

**Fix 2 — Step 8 project-owned landing policy.** Rather than picking a squash
strategy itself, Step 8 now computes branch facts unconditionally (SHA citations
in tracked docs, distinct author/attribution trailers), looks for a
`## Branch Landing Policy` heading in root `AGENTS.md`/`CLAUDE.md`, and follows
it if found — printing it inline, running any fenced check it defines. If no
policy exists, it says so explicitly and presents strategy options (including
"leave history untouched") instead of guessing.

**Design discussion on where the policy pointer should live.** Talked through
how directive the pointer should be — a soft "use your project's standard" vs. a
hard, named anchor. Landed on a specific heading name in `AGENTS.md` (already
the scaffold's home for agent-facing conventions) rather than a new file type,
so a project that wants more structure can have that heading point to a file it
owns.

**Dogfooding the new "cold-read" methodology mid-session.** While fixing this,
realized the scaffold-update-checklist had no step for catching
author-context-blindness — content that reads clearly to the person who wrote it
but assumes knowledge a first-time reader won't have. Added a "Cold-read
verification" item to `.claude/skills/scaffold-update-checklist/SKILL.md`'s
Final Checks, then immediately ran it against the new item itself and against
the finalize-branch rewrite. Both passes found real, fixable issues (unglossed
jargon, an actual loop-syntax bug in the branch-facts commands, a missing third
option in Step 8's no-policy branch, an undefined "seat" term borrowed from an
unrelated concept).

**Migration-guidance gap.** Realized the finalize-branch fix introduced a new
expectation (the `AGENTS.md` heading) that the `update-project-docs` skill's
migration system explicitly doesn't cover — it only tracks `docs/` structural
changes, and its own doc lists "plugin-only changes" as not needing a migration.
Initially patched this with worked examples directly in the plugin README's
changelog entry. A follow-up cold-read pass on that content, plus direct
feedback that the changelog entry now read like a migration guide itself
(duplicating content that would need to live in a real mechanism later), led to
reversing course.

**Building the Root-Level Conventions mechanism.** Rather than ship the
README-embedded stopgap, generalized `update-project-docs` Step 6 (previously a
single hardcoded check for a docs/ pointer) into a data-driven
`## Root-Level Conventions` table — plugin-version-keyed convention rows, each
with a documented subsection, checked unconditionally (no attempt to detect an
installed plugin's version at runtime, since that's not reliably possible and
isn't needed for correctness). This was a real scope pivot mid-branch, made
deliberately after an earlier decision to defer it — see Discoveries.

**Branch hygiene catch.** Partway through, realized all of this work had
happened directly on `develop` rather than a feature branch. Used
`project-docs:init-branch` to create
`fix/finalize-branch-reviewer-and-landing-policy` properly, carrying the
uncommitted work over.

**Finalization review.** Dispatched dual independent review (a Bash-capable
`general-purpose` reviewer plus the confidence-filtered
`feature-dev:code-reviewer`) against the full `git diff develop`. Both
independently found the same two broken relative links (wrong `../` depth in two
files); the execution-capable reviewer additionally caught a corrupted paragraph
in Step 8's Strategy B description, a stale skill-frontmatter description, and
an unverified `superpowers:code-reviewer` reference that doesn't actually exist
as a dispatchable agent in this environment (the `superpowers` plugin has no
`agents/` directory). Also ran the cold-read check against the newest
`update-project-docs` content (the piece added after the earlier cold-read
passes), which caught inconsistent grep argument order, unhandled missing-file
stderr noise, and a genuinely confusing juxtaposition — a plugin-semver
"Introduced In" column sitting next to a `docs_version`-keyed migrations table,
using unrelated numbering schemes.

## Notable Discoveries

- **Fixing the same bug twice.** The first fix for the corrupted Strategy B
  paragraph reintroduced an equivalent bug: it used a literal `+` as a word
  connector ("schema + migrations"), and when Prettier reflowed the paragraph
  during a later rebuild, the `+` landed at the start of a wrapped line and got
  parsed as CommonMark list syntax — the same failure mode as the original
  corruption, self-inflicted. This is very likely how the original bug was
  introduced in the first place. Fixed by rewording to avoid the ambiguous
  character ("schema and migrations") rather than trying to protect the `+` from
  reflow.
- **The reviewers validated the review process itself.** The confidence-filtered
  reviewer (no `Bash`/`Task` tools) explicitly disclosed that limitation up
  front and caveated its findings accordingly — exactly the behavior Step 2's
  rewrite exists to produce, observed live rather than just specified.
- **Meta-finding from the execution-capable reviewer:** the branch's own new
  cold-read checklist item hadn't been run against the branch's own newest
  changes before finalizing. Correct catch — closed by running it during
  finalization instead of skipping it.

## Changes Made

- `plugins/project-docs/skills/finalize-branch/SKILL.md` — Step 2 capability
  check, Step 8 landing-policy lookup, updated frontmatter description, Strategy
  B text fix, generalized plan-aware-reviewer bullet.
- `plugins/project-docs/skills/update-project-docs/SKILL.md` — generalized Step
  6, new `## Root-Level Conventions` table + subsections, new "Adding a New
  Root-Level Convention" section.
- `plugins/project-docs/README.md` — 3.1.0 version history entry (trimmed to
  changelog shape, links to the mechanism instead of duplicating it);
  `plugin.json` bumped 3.0.0 → 3.1.0.
- `.claude/skills/scaffold-update-checklist/SKILL.md` — new "Cold-read
  verification" Final Checks item; new bullet under "Adding or Modifying a
  Plugin Skill" for changes that depend on non-mirrored root-file content.
- `AGENTS.md` — this repo's own `## Branch Landing Policy`, dogfooding the
  convention.
- `dist/project-docs/**` — rebuilt via `./scripts/build-skills-dist.sh`.
- `docs/investigations/2026-08-07-project-closure-and-archive-touchpoint-investigation.md`
  (new, separate scope) — captures a related, larger gap (no touchpoint for
  archiving finished projects) surfaced while working on this fix, plus the
  Root-Level Conventions design discussion as a "Related Finding," marked
  implemented once built here.

## Lessons Learned

- A cold-read pass is genuinely cheap and catches a different class of bug than
  code review or format/build validation — confirmed twice in one session (the
  checklist item's own wording, and the finalize-branch rewrite).
- Run it against the _last_ thing you changed too, not just the first — content
  added late in a session is exactly what's most likely to have skipped
  verification.
- Literal `+`/`-`/`*` characters as word-connectors are fragile at Markdown
  paragraph-reflow boundaries; prefer words ("and") when a rewrap could place
  the character at the start of a line.

## Follow-up

- Two GitHub issues (#148, #149) should be closed/commented with a link to this
  work once merged — not done yet, deliberately held for explicit go-ahead since
  posting to GitHub is a visible action on a shared system.
- `docs/investigations/2026-08-07-project-closure-and-archive-touchpoint-investigation.md`
  remains open — the main archive-touchpoint question (a `finalize-branch` →
  `archive-project` closure trigger) is still unresolved and deferred, scoped
  separately from this branch.
- Pre-existing, unrelated to this branch:
  `dist/project-docs/skills/update-project-docs/skill.md` is tracked in git with
  lowercase casing while the build script writes uppercase `SKILL.md` —
  invisible on case-insensitive filesystems, would break on a case-sensitive
  checkout. A prior commit (`12cfe24`) fixed this for the `operator` plugin
  only; worth a follow-up sweep across the rest.

---

**Related Documents:**

- [finalize-branch skill](../../../../plugins/project-docs/skills/finalize-branch/SKILL.md)
- [update-project-docs skill](../../../../plugins/project-docs/skills/update-project-docs/SKILL.md)
- [scaffold-update-checklist](../../../../.claude/skills/scaffold-update-checklist/SKILL.md)
- [project-docs plugin README](../../../../plugins/project-docs/README.md)
  (3.1.0 version history)
- [Archive touchpoint investigation](../../../investigations/2026-08-07-project-closure-and-archive-touchpoint-investigation.md)
- GitHub issues:
  [#148](https://github.com/ichabodcole/project-docs-scaffold-template/issues/148),
  [#149](https://github.com/ichabodcole/project-docs-scaffold-template/issues/149)
