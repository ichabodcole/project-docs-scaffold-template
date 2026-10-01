---
type: session
title: Codex marketplace packaging — 2026-10-01
description:
  Built and locally installed the Codex skills package, recording build and
  discovery friction.
tags: [codex, plugins, tooling]
status: stable
generated: { by: codex, at: 2026-10-01 }
---

# Codex marketplace packaging — 2026-10-01

## Context

Packaging the existing `project-docs` skills for Codex, without converting
Claude commands or agents.

## What Happened

The distribution build now copies 22 source skills into a skills-only Codex
package. Five skills depend directly on Claude commands or named agents and are
deferred. A clean temporary Codex home found the marketplace, installed the
plugin, and reported it enabled. The installed package contained 22 `SKILL.md`
files and no `agents/` or `commands/` directory.

## Tooling Friction

- `codex plugin marketplace list` did not discover this repository's new local
  marketplace until `codex plugin marketplace add .` registered it. The README
  now includes that step.
- `codex plugin marketplace upgrade project-docs-local` rejected a local
  marketplace because the verb only supports Git sources. Repeating
  `codex plugin add project-docs@project-docs-local` refreshed the cached skill
  files; the README uses that command.
- `npm run build:dist` reached its optional skill validation, but `uv` could not
  open its default cache under the sandbox and printed a warning. Running
  `UV_CACHE_DIR=/private/tmp/project-docs-uv-cache uv run scripts/validate-skills-dist.py dist`
  succeeded: 49 skills, zero errors.
- `pdocs new session` promoted the item and rewrote its inbound cycle link as
  documented. No pdocs friction occurred in this pass.

## Follow-up

The complete repository gate passed with 2,564 tests and no failures before the
last wording cleanup in two shared skills. The distribution was rebuilt twice
after that cleanup, and `check:dist` passed. A later item can adapt the five
deferred skills and consider equivalents for Claude commands and agents.

## Landing Review

The general-purpose reviewer had shell access through the collaboration tools;
no specialist reviewer types were available. It reviewed the net diff against
the work item's definition of done and found that `generate-spec` still required
Claude's named Explore agents. The shared skill now uses available exploration
agents when supported and authorized, with direct exploration and validation
passes otherwise. The distribution was rebuilt from that source.

The reviewer's execution log records `git diff --check develop..HEAD`,
`bash -n scripts/build-skills-dist.sh`, Codex plugin command help, and a Python
audit of manifest agreement, the 22 skill directories, excluded agents and
commands, and relative TypeScript imports. It also ran a packaged migration
against an empty temporary directory: the migration rejected missing
preconditions and wrote no files. Installation checks establish discovery and
installation; they do not prove execution of every workflow.

Reflection: the installation and cache-refresh instructions belong in the README
and are already recorded there. No additional playbook step is needed.

---

**Related Documents:**

- [Add a Codex plugin marketplace for project-docs](../item.md)
