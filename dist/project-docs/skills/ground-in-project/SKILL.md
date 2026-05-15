---
name: "ground-in-project"
description: >
  Lightweight, ephemeral project orientation so Claude can hold an intelligent
  conversation about the project without doing a full deep scan. Reads anchor
  docs (PROJECT-SUMMARY, PROJECT_MANIFESTO, README, AGENTS/CLAUDE), scans recent
  commits, and peeks at active projects and investigations — then gives a short
  in-chat orientation. Does NOT write any files. Use this at the start of a
  fresh session in an already-developed project when the user wants you to "get
  up to speed" before discussing work. Triggers when user says "ground yourself
  in this project", "get grounded", "orient yourself", "catch up on this
  project", "get up to speed", or similar. Prefer this over the heavier
  `/project-docs:project-summary` command when the user wants quick context
  rather than a durable summary artifact.
allowed-tools:
  - Read
  - Bash
  - Glob
  - LS
---

# Ground in Project

Build just enough situational awareness to have an intelligent conversation
about the project. This is **session priming**, not documentation. No files are
written.

## When to Use

- Fresh session in an already-developed project where Claude has no context
- User asks Claude to "ground yourself", "get oriented", "catch up", "get up to
  speed"
- Before discussing what to work on, when the conversation needs a shared
  baseline

## When NOT to Use

- User wants a durable, polished summary artifact → use
  `/project-docs:project-summary` instead (it writes `docs/PROJECT-SUMMARY.md`
  and a discovery report)
- User wants to deeply understand a specific subsystem → read the relevant
  architecture/specification docs directly
- Brand-new or empty project → there is nothing meaningful to ground in; suggest
  `workshop-idea` or `create-investigation` instead

## Philosophy

Cheap and ephemeral. The goal is "you sound like someone who knows what you're
talking about," not "you have a complete mental model of the codebase." Sample
the right signals; don't enumerate. Stop scanning the moment you have enough to
converse intelligently.

A fresh `PROJECT-SUMMARY.md` is a head start, **never a substitute** for a light
recent-activity layer. Projects move fast — a 30-day-old summary can miss a
major shift.

## Workflow

### Step 1: Read anchor documents (cheap, high signal)

Read whichever of these exist, in this order. Note the modification date of each
so you can flag staleness vs. today.

- `docs/PROJECT-SUMMARY.md` — synthesized overview if it exists; the jackpot
- `docs/PROJECT_MANIFESTO.md` — the "why" of the project; usually stable
- `README.md` (project root) — surface description and quickstart
- `AGENTS.md` and/or `CLAUDE.md` (project root) — agent-facing conventions

If `PROJECT-SUMMARY.md` exists and is recent (within ~30 days), it is your
primary foundation. Still proceed to Step 2 — recent activity always layers on
top.

### Step 2: Scan recent activity (cheap)

Use cheap git commands. **Do not read commit diffs**, only metadata.

```bash
git log --since="30 days ago" --oneline --no-merges | head -30
git status --short
git rev-parse --abbrev-ref HEAD
```

From the commit messages, infer themes: what areas are seeing activity, what
kinds of changes (features, fixes, refactors), any obvious in-flight work.

### Step 3: Peek at active work (medium)

Light directory listings plus first-paragraph peeks. **Do not read full files**
unless something specifically demands it.

- `ls docs/projects/` — list active (non-`_archive`) project folders
- For each active project folder, read just the first ~30 lines of `proposal.md`
  (or whatever proposal-like file exists) to learn its purpose and status. Cap
  at 5 projects; if more, sample the most recently modified.
- `ls docs/investigations/` — list active investigations (skip `_archive`)
- Glance at 1–2 most recent session notes across all projects:
  `ls -t docs/projects/*/sessions/*.md 2>/dev/null | head -2`, read just the
  title and first paragraph of each.

### Step 4: Stop unless something demands deeper reading

You should now have enough to converse. Do **not**:

- Read source code
- Read architecture or specification documents
- Read playbooks, lessons-learned, or memories unless one is clearly relevant to
  a thread you're about to mention

Exception: if Step 1–3 turns up a clear pointer like "see
`docs/architecture/sync-engine.md` for details" _and_ that subsystem is
obviously the current focus of work, one targeted read is fine. Use judgment —
err toward stopping.

### Step 5: Deliver the orientation

Output an in-chat orientation of roughly **150–250 words**. Use this shape:

```markdown
**What this is:** [1–2 sentences synthesized from the anchor docs — what the
project does and why it exists]

**Where things stand:** [Current branch, active projects, active investigations
— concrete, not exhaustive]

**Recent activity:** [Themes from the last 30 days of commits and recent session
notes — what's been getting attention]

**Threads worth discussing:** [2–3 concrete things that look in-flight or
unresolved, framed as conversation openers, not directives. For example: "the X
migration in `docs/projects/x-migration/` looks close to a plan stage" or
"there's an unresolved investigation on Y"]
```

After the orientation, **only if applicable**, add one short line:

- If `PROJECT-SUMMARY.md` is missing entirely:
  > _No `docs/PROJECT-SUMMARY.md` exists. If you'd like a durable synthesized
  > summary, `/project-docs:project-summary` will generate one._
- If `PROJECT-SUMMARY.md` exists but is older than ~30 days:
  > _`PROJECT-SUMMARY.md` is from [date]. `/project-docs:project-summary` would
  > refresh it._
- Otherwise: no nudge.

Do **not** auto-run `/project-docs:project-summary`. Grounding is always cheap;
the user opts in to the heavier operation.

## Important Constraints

- **No artifacts.** Do not write or update any files. The orientation lives in
  the conversation.
- **No code reading.** This skill never opens source files.
- **No prescriptions.** "Threads worth discussing" invites conversation; it does
  not declare what to work on next.
- **Stay under the time budget.** Aim for under a minute of tool calls. Stop as
  soon as you have enough; this is detective work, not an audit.
- **Be honest about gaps.** If anchor docs are sparse or contradictory, say so
  briefly in the orientation rather than papering over it.
