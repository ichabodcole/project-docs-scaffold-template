---
type: item
title: Prompt the root agent file to point at the CLI
description:
  Only an optional Step 6 row prompts a root AGENTS.md pointer to pdocs, so a
  full migration can finish without one.
status: draft
lifecycle: triage
id: 01a0e770-e0a1-710e-a816-3a6a86fe94f3
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: project-docs
source: "#182"
---

# Prompt the root agent file to point at the CLI

`docs/AGENTS.md` explains `pdocs`, but an agent reads it only once it is already
working in `docs/`. The root `AGENTS.md` or `CLAUDE.md` is what every agent
reads first, and it decides there whether to write a document by hand (issue
#182).

The only prompt to add a pointer is the optional `Documentation CLI pointer` row
in `update-project-docs` Step 6. The migration scripts, a scaffold install and
`docs/AGENTS.md` never mention it. Spellbook went through the whole v2.10 → v3.0
migration without the pointer, and found it missing only on a later refresh.

## Definition of done

- [ ] An adopter learns the root agent file should point at the CLI without
      having to reach Step 6. Something they will certainly read says so and
      carries the blurb, or says where to find it: the install output, the end
      of a migration run, or `docs/AGENTS.md`.
