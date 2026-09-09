---
name: update-project-docs
description:
  Upgrade a project's documentation structure to a newer version of the
  project-docs scaffold template
---

# Update Project Docs

Orchestrate the upgrade of a project's documentation structure when the
project-docs scaffold template has released structural changes.

## When to Use

Activate when:

- User mentions upgrading their docs structure
- User says they downloaded a new version of the scaffold template
- User asks to migrate or update their documentation layout
- A version mismatch is detected between the project and the template

## How Versioning Works

The docs structure version is tracked in two places once a project is on v2.7 or
later, and in one place before that.

**`.project-docs.json` at the repo root** — present from v2.7. It also names the
docs root, which every step below depends on:

```json
{
  "docsRoot": "docs",
  "version": "6.3.0"
}
```

**`docs/README.md` frontmatter** — present in every version:

```yaml
---
docs_version: "2.0.0" # x-release-please-version
docs_template: https://github.com/ichabodcole/project-docs-scaffold-template
---
```

This version is kept in sync with the scaffold template's package version by
release-please. The `x-release-please-version` annotation tells release-please
to update this line automatically when a new version is released.

**How to read the version:**

- No `docs_version` frontmatter → **pre-2.0** (original flat structure)
- `docs_version: "X.Y.Z"` → matches the scaffold template release version

**The version number does not tell you which migrations have been applied.**
release-please bumps these markers on every scaffold release, structural or not,
so the number says which release the project last copied from — not what shape
its `docs/` is in. The `vX-to-vY` names in `## Available Migrations` are labels
in their own structural sequence and have long since diverged from it: a project
reading `docs_version: "6.3.0"` may or may not have the v2.7 layer.

So each migration row carries a **presence check** — a file or directory that
exists only after that migration has run. Use it. Step 3 says how.

**What triggers a version bump (with a migration guide):**

- New documentation category added (e.g., `backlog/`, `memories/`)
- Structural reorganization (e.g., flat dirs → project folders)
- Template content changes that affect how documents are created
- README convention changes that affect document lifecycle

Not every version bump requires a migration. Minor and patch releases that don't
change structure won't have a migration file — only major structural changes do.

**What does NOT trigger a version bump:**

- Prose fixes in READMEs
- Minor template wording adjustments
- Plugin-only changes (commands, skills, agents)

## Upgrade Process

### Step 1: Detect Current Version

Read `.project-docs.json` first, if it exists — it is the newer marker, and it
also tells you the docs root, which everything after this depends on:

```bash
[ -f .project-docs.json ] && cat .project-docs.json
grep "docs_version" docs/README.md
```

- `.project-docs.json` present → the project is on **v2.7 or later**. Its
  `version` field is authoritative; `docs/README.md` should agree, and a
  disagreement is worth reporting.
- `.project-docs.json` absent, `docs_version` present → read the number from
  `docs/README.md`.
- Neither → the project is on **v1** (the original flat structure with
  `proposals/`, `plans/`, `sessions/`).

**Set the docs root here and use it for the rest of the run.** It is `docsRoot`
in `.project-docs.json`, and `docs` when that file is absent. Every path in this
skill and in the migration guides is written as `docs/...` for readability; if
the project's root is something else, substitute it.

### Step 2: Identify Target Version

Check the latest version available. The target is typically the version in the
scaffold template you're upgrading to. Only structural transitions have a
migration file, so expect gaps: the `## Available Migrations` table is the
authoritative list, and a version range absent from it needs no migration work.

### Step 3: Find Applicable Migrations

Look in this skill's `migrations/` folder for each version step between current
and target. Migrations must be applied **in sequence** — you can't skip
versions.

Example: upgrading from pre-2.0 to 2.3 requires:

1. `migrations/v1-to-v2.md`
2. `migrations/v2.0-to-v2.3.md`

**Then run each candidate's presence check** from the `Applies If` column of the
`## Available Migrations` table, and drop the ones that have already been
applied. The version number narrows the list; the presence check settles it. A
migration re-run against a tree that already has it is not always harmless — and
for the ones that are, the check costs a single `ls`.

### Step 4: Execute Each Migration

For each migration file:

1. Read the migration guide
2. Follow its steps in order — most migrations have a companion script in
   `migrations/scripts/` that handles mechanical steps. Run `--dry-run` first to
   preview, then run without the flag. Only content-editing steps (flowchart
   updates, README prose) remain for the agent. The `.sh` scripts run with
   `bash`; `migrate-v2.6-to-v2.7.ts` runs with `bun`, and the guide's step 2
   installs it.
3. Verify the checklist at the end
4. Move to the next migration

### Step 5: Update Version Marker

After all migrations are applied, write the new version to **both** markers, so
they can't disagree:

- `docs_version` in `docs/README.md` frontmatter
- `version` in `.project-docs.json`, if the project has one (v2.7+)

In the scaffold repo itself both are maintained by release-please. In a
downstream project nothing maintains them but this step.

### Step 6: Ensure Root-Level Agent Context

Some plugin skills expect specific content in a project's root `AGENTS.md` /
`CLAUDE.md` — conventions that live outside `docs/` structure entirely, so
they're never covered by the version-tracked migration system above. For each
row in the `## Root-Level Conventions` table below, run its check against root
`AGENTS.md`/`CLAUDE.md`. **From the repository root** — every check uses
relative paths.

For each row, in order:

1. **If the row states a precondition, test it first.** A precondition that is
   false means the row does not apply to this project — skip the row entirely,
   and do not run its check. (Today only `Documentation CLI pointer` has one:
   the CLI must be installed, or the blurb points at a file that isn't there.)
2. **Run the check. It exits 0 when the convention is already satisfied**, and
   the row is done.
3. **A non-zero exit is the signal.** Present that row's documented example
   content (in the matching subsection below the table) and ask where they'd
   like it added.

Note the polarity, because the `## Available Migrations` table ten lines further
down uses the **opposite** one: an `Applies If` there is true when work is still
needed; a `Check` here is true when no work is needed.

All of these are recommendations, not required steps — the user may prefer to
word it differently or place it in a different file. Present the blurb, don't
apply it unasked.

Checking every row regardless of **plugin version** is intentional — there's no
reliable way for this skill to detect exactly which version of a plugin is
installed in the current environment, and it isn't needed for correctness:
recommending a convention to someone who hasn't yet upgraded to the plugin
version that uses it is harmless (inert until they do), while failing to
recommend it to someone who needs it is the real risk. The table's "Introduced
In" column is informational only, for humans reading it — not something this
step branches on. A **precondition** is a different thing and does gate a row:
it tests the project's own state, not which plugin version is installed.

### Step 7: Verify

Each migration file carries its own Verification section, and Step 4 ran it.
This step is the part **every** upgrade path ends with, whichever migrations
applied: the tooling is installed, the gate runs through it, and the two version
markers agree. Run it from the repository root.

```bash
# 1. The CLI is installed and runnable
ls scripts/pdocs/cli.ts && bun scripts/pdocs/cli.ts --version --format text

# 2. The gate runs through it, and is clean
bun scripts/pdocs/cli.ts check --format text

# 3. No delivered code is being treated as the project's own. The CLI ships
#    production files only; tests or a tsconfig covering scripts/ mean an
#    older build left artefacts behind.
ls scripts/pdocs/*.test.ts scripts/pdocs/test-env.ts 2>/dev/null \
  && echo "FAIL — the CLI's tests are installed" || echo "no shipped tests"
grep -q 'scripts/\*\*/\*\.ts' tsconfig.json 2>/dev/null \
  && echo "FAIL — tsconfig typechecks delivered code" || echo "tsconfig is the project's own"

# 4. The two version markers agree
grep docs_version docs/README.md
[ -f .project-docs.json ] && grep '"version"' .project-docs.json
```

Expect a version string from `--version`, `docs-lint: clean`, both artefact
lines reporting clean, and one version value in both markers. A `FAIL` on either
artefact line means an older scaffold's development setup is still installed:
the CLI's own tests running in the project's suite, or its files being
typechecked under a `tsconfig` they were never written for. The migration
guide's step 6 removes both.

Shortcut scripts are deliberately not checked. The scaffold ships no
`package.json`, so `docs:*` entries are the project's own business — if it has
them they should pin `--format`, and if it does not, the CLI is the interface.

**Stale-reference greps are not here on purpose.** Each migration names the
strings it made stale and greps for them in its own Verification section — those
are per-migration and Step 4 ran them. What is common to every path is that the
tool exists, answers, and agrees with the markers.

**If check 1 fails and `docs/SCHEMA.md` exists, no migration claimed this
project.** `v2.6-to-v2.7`'s presence check is `[ ! -f docs/SCHEMA.md ]` and
`v2.7-to-v2.8`'s is `[ -f docs/lint.ts ]` — both false for a tree that has the
frontmatter layer but never got the tooling, so Step 3 dropped every candidate
and Step 4 did nothing. It arises from a partial adoption rather than from a
version step: `docs/` copied across from a generated project without `scripts/`,
or the current-directory cookiecutter install interrupted before it moved
`scripts/` up, or `docs/lint.ts` deleted in a cleanup with nothing put in its
place.

There is no migration row for it, because the repair is a subset of one that
exists: [v2.7-to-v2.8](migrations/v2.7-to-v2.8.md). Run exactly these steps of
it, and no others:

| Step | Do                                                          | Note                                                                                                                        |
| ---- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2    | Install Bun and cookiecutter                                | Bun is what runs the CLI at all                                                                                             |
| 3    | Generate the scaffold, resolve `$SCAFFOLD`                  | Re-derive it in every shell — see that step's note                                                                          |
| 4    | Copy `scripts/pdocs/`, remove any old `scripts/docs-lint/`  | The actual repair                                                                                                           |
| 6    | Remove the development artefacts an earlier build installed | The CLI's tests and a `tsconfig` covering `scripts/` — skip whichever is not there                                          |
| 7    | Add the `kickoff` row to `docs/SCHEMA.md`                   | **Check first:** `grep -q kickoff docs/SCHEMA.md`. A `docs/` copied from a current scaffold already has the row; skip if so |
| 8    | Refresh the templates **and `docs/AGENTS.md`**              | Both halves. The second is what makes the docs tree's entry point name the CLI                                              |
| 11   | `pdocs check`                                               | The repair's own gate                                                                                                       |

Steps **1, 5, 9, 10 and 12 do not apply**: 1 and 10 are hygiene you can do
anyway, 5 has no `docs/lint.ts` to delete, 9 has no reference to it to re-point,
and 12's version markers are already whatever they were — this is a repair, not
a version step, so do not move them.

Then **re-run this step, and Step 6**. Step 6 ran before the CLI existed, so its
`Documentation CLI pointer` row was skipped by its own precondition and root
`AGENTS.md` has not been looked at.

## Available Migrations

The **Applies If** column is a shell test that is true when the migration is
still needed. Run it before applying (Step 3) — the version number narrows the
list, this settles it.

| Migration                                                | From    | To    | Applies If                                                       | Summary                                                                                                                                                                      |
| -------------------------------------------------------- | ------- | ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [migrations/v1-to-v2.md](migrations/v1-to-v2.md)         | pre-2.0 | 2.0.0 | `[ ! -d docs/projects ]`                                         | Flat dirs → project folders, add backlog/memories/specifications/fragments/interaction-design/reports                                                                        |
| [migrations/v2.0-to-v2.3.md](migrations/v2.0-to-v2.3.md) | 2.0–2.2 | 2.3.0 | `[ ! -f docs/projects/TEMPLATES/DESIGN-RESOLUTION.template.md ]` | Add design resolution and handoff templates, update READMEs with new pipeline stage                                                                                          |
| [migrations/v2.3-to-v2.4.md](migrations/v2.3-to-v2.4.md) | 2.3     | 2.4.0 | `[ ! -f docs/projects/TEMPLATES/TEST-PLAN.template.md ]`         | Add test plan template, external dependencies in DR template, update lifecycle across docs                                                                                   |
| [migrations/v2.4-to-v2.5.md](migrations/v2.4-to-v2.5.md) | 2.4     | 2.5.0 | `[ ! -d docs/briefs ]`                                           | Add briefs document type, update pipeline lifecycle to start with Brief                                                                                                      |
| [migrations/v2.5-to-v2.6.md](migrations/v2.5-to-v2.6.md) | 2.5     | 2.6.0 | `ls -d docs/*/archive/ 2>/dev/null \| grep -q .`                 | Rename `archive/` → `_archive/` for consistent sort-to-top behavior                                                                                                          |
| [migrations/v2.6-to-v2.7.md](migrations/v2.6-to-v2.7.md) | 2.6     | 2.7.0 | `[ ! -f docs/SCHEMA.md ]`                                        | Add the OKF frontmatter layer: frontmatter on every document, `SCHEMA.md`, `index.md`, a two-tier lint that gates commits and CI, the `cycle` type, and `.project-docs.json` |
| [migrations/v2.7-to-v2.8.md](migrations/v2.7-to-v2.8.md) | 2.7     | 2.8.0 | `[ -f docs/lint.ts ]`                                            | Replace the single-file `docs/lint.ts` with the `pdocs` CLI under `scripts/pdocs/`; re-point the `docs:*` scripts, `tsconfig`, templates and every reference to it           |

## Root-Level Conventions

Unlike the migrations above, these have nothing to do with `docs_version` — that
field tracks the **scaffold template's** `docs/` structure. The rows below are
content a specific **plugin** (e.g. `project-docs`, `recipes`) expects in root
`AGENTS.md`/`CLAUDE.md`, versioned independently via that plugin's own
`plugin.json` semver — a completely different, unrelated counter from
`docs_version`. "Introduced In: project-docs 3.1.0" does not correspond to any
`docs_version` and shouldn't be looked for in the Available Migrations table
above. Checked unconditionally by Step 6 regardless of installed plugin version
(see Step 6 for why).

**Every check below reads one concatenated stream —
`grep -q PATTERN <(cat AGENTS.md CLAUDE.md 2>/dev/null)` — and that shape is
load-bearing.** Most projects have only one of the two files (this repo's own
`CLAUDE.md` is a one-line pointer to `AGENTS.md`; plenty of projects have no
`CLAUDE.md` at all), and handing grep a filename that does not exist is an
**error**, not a non-match. What grep does with that varies by implementation
and it is not safe to assume: measured on the same machine, on a file that
matches with the second file missing, BSD `grep -q` exits 0 while the `ugrep -G`
wrapper Claude Code puts on `grep` exits **2** — so the same check passes for a
human at a terminal and reports "recommend it" for the agent running this skill.
`grep -l` exits 2 in both, having printed the matching filename, which is worse:
it looks like it worked.

`cat` absorbs the missing file, grep sees one stream and one file that exists,
and the exit status is 0 or 1 with no third state. Verified identical under both
greps. Keep new rows on this shape; do not pass two filenames to grep.

| Convention                 | Introduced In               | Check                                                                                                                                                                                          |
| -------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docs structure pointer     | project-docs (all versions) | `grep -q "docs/README\|docs/memories\|documentation.*docs/" <(cat AGENTS.md CLAUDE.md 2>/dev/null)`                                                                                            |
| `## Branch Landing Policy` | project-docs 3.1.0          | `grep -q '^## Branch Landing Policy' <(cat AGENTS.md CLAUDE.md 2>/dev/null)`                                                                                                                   |
| Documentation CLI pointer  | project-docs 3.8.0          | `grep -qE 'pdocs(/cli\.ts)? new' <(cat AGENTS.md CLAUDE.md 2>/dev/null) && ! grep -q 'docs/lint\.ts' <(cat AGENTS.md CLAUDE.md 2>/dev/null)` — **precondition:** `[ -f scripts/pdocs/cli.ts ]` |

### Docs structure pointer

Agents read root `AGENTS.md`/`CLAUDE.md` first when entering a project — if
there's no pointer to `docs/`, agents have to discover the documentation on
their own. If the check finds nothing, recommend adding a section like this to
whichever file the project uses for agent context:

```markdown
## Documentation

This project uses structured documentation in `docs/`. See
[docs/README.md](./docs/README.md) for the full structure overview and document
type guide.

Every document carries a frontmatter block, and
[docs/SCHEMA.md](./docs/SCHEMA.md) is the contract for it — which fields, which
vocabularies, and what the lint (`bun scripts/pdocs/cli.ts check`) checks. Read
it before creating or editing a document.

For quick onboarding on recent work, start with
[docs/memories/](./docs/memories/).
```

**The `SCHEMA.md` paragraph applies from v2.7 on** — that file is what the
frontmatter layer added. For a project that hasn't migrated yet, recommend the
section without it; the paragraph would point at nothing. (The check in the
table is unchanged: it looks for a pointer to `docs/` at all, and a project with
the older two-paragraph version passes it. This subsection is the copy shown to
someone who has none.)

### `## Branch Landing Policy`

Used by `finalize-branch` Step 8 to decide whether and how to squash a branch
before merging, instead of guessing a strategy. Optional — recommend it, don't
require it; with no policy present, Step 8 says so explicitly and presents the
strategy options with its own recommendation rather than acting on a default.

If the check finds nothing, recommend adding an `##` heading with that exact
text anywhere in root `AGENTS.md` (or `CLAUDE.md`) — position in the file
doesn't matter, but the level does: the check is anchored to `^## `, so a
deeper-nested heading won't be found. Three forms it can take:

An inline policy. Reword this freely — it is an example, not a
project-docs-prescribed default — except for the one constraint stated after it:

```markdown
## Branch Landing Policy

Default to a single-commit squash, at any commit count. Split into chapters only
when each one builds and delivers value on its own; a high commit count is a
reason to ask that question, not an answer to it. Two exceptions — merge or PR
those as-is instead:

- **Commits cited by SHA in tracked markdown.** A squash rewrites those SHAs and
  leaves the citation pointing at nothing. Read each hit before treating it as a
  veto — a seven-character sha turns up incidentally.
- **More than one contributor identity authored commits on this branch** —
  distinct `Anthill-Seat:` trailers (one per seat on a multi-seat agent team),
  or distinct git author names. A squash collapses who-did-what into a single
  message that can credit only one of them.

`Co-Authored-By: Claude …` trailers are never counted as a second identity. One
author plus one AI co-author is a single identity for landing purposes — the
squashed commit carries that same pairing forward — and a model-version change
mid-branch is not a second contributor.
```

**The constraint, which applies to all three forms:** however the authorship
exception gets worded — inline, in the pointed-to file, or in what the script
prints — it must exclude AI co-author trailers. In a repo that mandates one on
every commit, a policy counting them vetoes every branch, making its own stated
default unreachable. The rest is adjustable — including the SHA bullet, which a
project can drop without losing the protection: `finalize-branch` Step 8
computes and surfaces cited SHAs regardless of what the policy says.

A pointer to a separate file the project maintains:

```markdown
## Branch Landing Policy

See `docs/BRANCH_POLICY.md`.
```

Or a fenced, runnable check that `finalize-branch` executes and shows the output
of:

````markdown
## Branch Landing Policy

Run this before deciding a strategy:

```bash
./scripts/check-branch-landing.sh
```
````

### Documentation CLI pointer

**Precondition — test this before the row's check:**

```bash
[ -f scripts/pdocs/cli.ts ] && echo "row applies" || echo "skip this row"
```

A project without the CLI is not one to recommend this to; the blurb would name
a file it does not have. That project's problem is the missing tooling, which is
Step 7's check 1 — and once Step 7's repair installs it, **come back and run
this row**, because a root `AGENTS.md` written against v2.7 will both lack the
section and still name `bun docs/lint.ts`.

From v2.8 the scaffold ships a CLI at `scripts/pdocs/cli.ts`, and `pdocs new` —
not a text editor — is how a document gets created: it owns the folder, the
filename shape, the frontmatter and, for a library page, its catalog line in
`docs/index.md`. An agent that never learns this writes the file by hand and
fails the gate on frontmatter it had no way to know about.

The docs-structure-pointer blurb above does not cover it — it names the gate,
not the writer — so a project can pass that check and still have nothing
anywhere that says a CLI exists. Hence a separate row. If the check exits
non-zero, recommend a section like this:

````markdown
## Documentation CLI

Documents under `docs/` are created with the `pdocs` CLI, not by hand:

```bash
bun scripts/pdocs/cli.ts new <type> <name> --title "…" --description "…"
```

The type decides the folder, the filename shape and the template, and the CLI
fills the frontmatter — for a library page it also writes the catalog line in
`docs/index.md`. The same CLI reads the tree: `check` (the gate), `find`,
`backlinks`, `orphans`.

`bun scripts/pdocs/cli.ts help` lists every command, flag and exit code.
`docs/SCHEMA.md` is the frontmatter contract the gate enforces.
````

The check's second clause is there for the other half of the problem: a project
whose `AGENTS.md` was written against v2.7 still names `bun docs/lint.ts`, a
file that no longer exists, and a check that only asked "is the CLI mentioned?"
would call that satisfied.

## Creating New Migration Guides

When the scaffold template releases structural changes:

1. Create a new migration file: `migrations/vX-to-vY.md`
2. Use the `migration-authoring` skill to ensure every step is agent-executable
3. Run the quality checklist before finalizing
4. Add a row to the `## Available Migrations` table
5. The version in `docs/README.md` is bumped automatically by release-please

**Migration file structure:**

```markdown
# Migration: vX → vY

## Summary

[What changed and why]

## What's New

[New directories, files, or conventions]

## What Moved

[Files or directories that changed location]

## What's Removed

[Directories or files no longer used]

## Step-by-Step Migration

[Ordered steps to perform the upgrade]

## Cross-Reference Updates

[Paths that change and need updating]

## Verification

[How to confirm the migration succeeded]

## Checklist

[Checkbox list of all migration actions]
```

## Adding a New Root-Level Convention

_For maintainers of the plugin that ships the convention, not for projects
consuming it: this section and the next describe editing this skill's own
table._

When a plugin skill starts depending on new content in root
`AGENTS.md`/`CLAUDE.md` (as opposed to a `docs/` structural change, which goes
through the migration path above):

1. Add a row to the `## Root-Level Conventions` table above: convention name,
   introducing plugin@version, the exact check command. **The check must exit
   non-zero on a _stale_ copy of the convention, not only on an absent one** —
   an `AGENTS.md` written against the previous version, still naming a command
   or a path that no longer exists, needs the recommendation as much as one that
   never had the section. A single `grep -q` for the new content usually is not
   that check; the `Documentation CLI pointer` row shows the two-clause form.
   Use the `grep -q PATTERN <(cat AGENTS.md CLAUDE.md 2>/dev/null)` shape, never
   two filenames, for the reason given above the table. Construct the cases —
   absent, stale, correct, **and one project that has only `AGENTS.md`** — and
   run the candidate check against each **in this environment's shell**, not
   from memory of what grep does. If the convention names a tool or a file a
   project might not have, give the row a **precondition** too.
2. Add a matching subsection below the table: what the convention is for, and
   its example content (worked example, plus any alternate forms — a
   file-pointer, a runnable check — the way `## Branch Landing Policy` does
   above).
3. No `docs_version` bump and no migration file — this table is unversioned
   relative to the `docs/` migration system, and Step 6 checks every row
   unconditionally.
4. The introducing plugin's own README changelog entry should **link to the
   convention's subsection under `## Root-Level Conventions`**, not duplicate
   the example content inline — one canonical copy keeps the changelog and the
   subsection from drifting apart.
5. Bump the introducing plugin **minor** — a new convention changes behavior.

## Revising an Existing Root-Level Convention

Revising a shipped convention is the step that gets skipped, because the change
starts somewhere else. The maintainer hits the problem while working in the
plugin repo's own root `AGENTS.md` — the dogfooded copy — fixes it there, and
ships. The table subsection above is the copy every _downstream_ project is
shown, and nothing about editing `AGENTS.md` prompts anyone to open it.

So, whenever a root convention changes:

1. **Update this skill's subsection in the same commit as the `AGENTS.md`
   edit.** Not the same branch, the same commit — a follow-up is a thing to
   forget.
2. **Re-check the subsection against the skill that consumes it.** These
   examples describe behavior implemented elsewhere (`finalize-branch` Step 8,
   for Branch Landing Policy).
3. **Leave the "Introduced In" column alone.** It records when the convention
   was introduced, not when it was last edited.
4. Bump the plugin **minor** — a reworded recommendation changes behavior. As
   when adding one, the plugin's README changelog entry should **link to the
   convention's subsection under `## Root-Level Conventions`**, not duplicate
   the example content inline.
