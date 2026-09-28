---
type: item
title: Prompt the root agent file to point at the CLI
description:
  Only an optional Step 6 row prompts a root AGENTS.md pointer to pdocs, so a
  full migration can finish without one.
status: draft
lifecycle: ready
id: 01a0e770-e0a1-710e-a816-3a6a86fe94f3
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: project-docs
source: "#182"
priority: medium
cycle: 2026-09-story-loom-migration
---

# Prompt the root agent file to point at the CLI

`docs/AGENTS.md` explains `pdocs`, but an agent reads it only once it is already
working in `docs/`. The root `AGENTS.md` or `CLAUDE.md` is what every agent
reads first, and it decides there whether to write a document by hand (issue
#182).

The only prompt to add a pointer is the `Documentation CLI pointer` row in
`update-project-docs` Step 6, one of several root-file conventions that step
offers. The migration scripts, a scaffold install and `docs/AGENTS.md` never
mention it. Spellbook went through the whole v2.10 → v3.0 migration without the
pointer, and found it missing only on a later refresh.

**The principle: point at the CLI, don't re-explain it.** The CLI documents
itself (`pdocs --help`, and each command's own help), and `SCHEMA.md` and the
READMEs already cover the contract. What's missing is the redirects: at each
place an agent is about to do something by hand, a line saying the CLI does it,
and which command. More prose about the CLI in more places is not the fix. Every
copy of that prose is another thing that goes stale.

The touch points:

- **The root agent file**, prompted during adoption as part of Step 6's existing
  root-file section. The blurb is a pointer: the CLI exists, documents are
  created with it and not by hand, run `--help`. The current blurb re-lists
  commands; trim it to that.
- **The adopter actually reaching Step 6.** A scaffold install and the end of a
  migration run should say the root agent file needs a CLI pointer when it has
  none, and name Step 6.
- **`docs/AGENTS.md` and `docs/CLAUDE.md`**: a short pointer near the top, for
  an agent that enters through `docs/`.
- **Where an action happens.** A category README says which command performs its
  action (the cycles README: start one with `pdocs new cycle`). A skill that
  relies on a command names that command.

## Definition of done

- [ ] An adopter, by install or by any migration, is told when their root agent
      file has no CLI pointer, and pointed at Step 6.
- [ ] Step 6's blurb is a pointer to the CLI and its `--help`, not a list of its
      commands.
- [ ] `docs/AGENTS.md` and `docs/CLAUDE.md` point at the CLI near the top, in
      the payload too.
- [ ] Each category README with an action names the command for it, and no page
      repeats the CLI's reference.
