---
type: playbook
title: Changing pdocs Playbook
description:
  Changing the pdocs CLI or its lint under scripts/pdocs/ — a new rule, verb or
  flag — so it fires everywhere it claims to and holds in a consumer's hook.
tags: [pdocs, lint]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-25 }
---

# Changing pdocs Playbook

## Goal

A change to `scripts/pdocs/` that fires everywhere its contract says it does,
returns output an agent can use, and behaves the same inside a consumer's commit
hook and time zone as in your shell. Applies to any new lint rule, verb, flag or
change of behaviour in the CLI.

## Steps

1. **Break a new lint rule in every folder class the lint walks** — a workbench
   folder, a library folder, and `_archive/` — not only in the folder where you
   implemented it. A rule tested only where it was written is the rule that
   silently skips half the tree.
2. Run every example the documents give (`SCHEMA.md`, a README, a template, a
   skill) **verbatim**, not the string you know works.
3. Read `--format json` output from a file and parse it
   (`pdocs … --format json > out.json`). Never judge it through `| head`, `grep`
   or `wc`: they hide a truncated stream.
4. Pass a hostile path — `..`, an absolute path, a name that climbs out of the
   docs root — to every argument that becomes a path.
5. Spawn children through `childEnv()` in tests and through `gitEnv()` in
   production code. Run any code that spawns git in a child process, not
   in-process: a Bun spawn with no `env` inherits the process's starting
   environment, hook variables included.
6. Copy every new or changed non-test file under `scripts/pdocs/` into
   `{{cookiecutter.project_slug}}/scripts/pdocs/` by hand; the mirror check
   finds drift, not omission.
7. Make the payload's code typecheck under a strict consumer: this repository's
   `tsconfig` carries `noUncheckedIndexedAccess` so CI sees what a consumer's
   would.

## Verification

- [ ] The rule's test puts a violating document in a workbench folder, a library
      folder and an `_archive/`, and each is reported.
- [ ] `GIT_INDEX_FILE=$(mktemp) bun test` passes (the hook's environment).
- [ ] `TZ=America/Los_Angeles bun test` passes, and so does it after 17:00
      local.
- [ ] A documented example, pasted verbatim, succeeds.
- [ ] `diff -rq scripts/pdocs '{{cookiecutter.project_slug}}/scripts/pdocs'`
      lists only tests, `test-env.ts` and `__fixtures__`.
- [ ] `npx tsc --noEmit` is clean.
