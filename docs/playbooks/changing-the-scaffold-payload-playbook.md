---
type: playbook
title: Changing the Scaffold Payload Playbook
description:
  Changing what the cookiecutter payload ships — a file, a template, a setup
  instruction — so it lands in the right owner's file and is true in a project
  that is not this one.
tags: [scaffold, process]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-25 }
---

# Changing the Scaffold Payload Playbook

## Goal

A payload change that lands in the file its owner expects, whose instructions
are true in a repository that is not this one, and whose prose describes what
the shipped code does. Applies to anything under
`{{cookiecutter.project_slug}}/` and to `hooks/post_gen_project.py`.

## Steps

1. For every file you add, ask **whose file this lands in** — owned (the
   migration overwrites it), seeded, or theirs (`docs/SCHEMA.md` § "Who owns
   which file"). Ship nothing that tells a consumer to configure, test or
   maintain code that is ours.
2. Run every paste-in instruction — a `package.json` block, a `tsconfig` change,
   a hook — in a repository that is not this one, and ship it only if you would
   follow it there.
3. Ship the tool and name it rather than wrapping it: a shorthand freezes a
   fraction of the interface and hides what the tool says about itself.
4. Describe what `scripts/pdocs/` does, not what a plan said it would: check
   every documented command and finding against a generated project.
5. Keep seeded templates byte-identical between this repository and the payload,
   and record any new seeded page in the hook's manifest.
6. Verify by generating, not by reading the payload.

## Verification

- [ ] `cookiecutter . --no-input --overwrite-if-exists -o <tmp> install_target="New project folder"`
      then `bun scripts/pdocs/cli.ts check --format text` in the result is
      clean.
- [ ] `find <tmp>/my-project -name '*.test.ts' -o -name 'test-env.ts'` prints
      nothing.
- [ ] Each paste-in instruction was run in a scratch repository, and the session
      says which.
- [ ] `npm run check:mirror` passes.
