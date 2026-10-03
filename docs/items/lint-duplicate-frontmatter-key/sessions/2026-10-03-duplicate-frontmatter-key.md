---
type: session
title: Duplicate frontmatter key — 2026-10-03
description:
  pdocs check reports a top-level frontmatter key written twice as DUPLICATE
  FIELD, naming the key and the file's line numbers.
tags: [pdocs, lint, frontmatter]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-03 }
---

# Duplicate frontmatter key — 2026-10-03

Part of
[check and upgrade-skill fixes](../../../cycles/2026-10-check-and-upgrade-fixes.md)

## Context

Spellbook found a cycle document with `started:` twice that `pdocs check` passed
as clean
([#190](https://github.com/ichabodcole/project-docs-scaffold-template/issues/190)).
YAML tools disagree on a duplicate key, so the value the lint validated may not
be the one another tool reads.

## What Happened

- **One report, from one place.** `frontmatterSyntaxProblems` in
  `lint/rules.ts`, the pass that already reads every document's frontmatter for
  unquoted `": "`, now reports a top-level key written more than once as
  `DUPLICATE FIELD`, with the key and its line numbers in the message. The label
  is `FIELD` because `DUPLICATE KEY` already names a type/slug collision, and
  the codebase calls a frontmatter key a field. Nothing else reports it, so it
  adds nothing to the double-printing #198 is about.
- **Top-level only.** A key at column 0 counts; nested keys, list items and the
  continuation lines of a folded `description` do not. Line numbers are the
  file's own.
- **`pdocs set` was left alone.** It reads the last copy, like every pdocs
  reader, and rewrites all copies on a change, so the duplicate stays and
  `check` still names both lines. One output misleads: setting the last copy's
  value prints "already set" while the first copy differs. Not on the main path,
  since `check` sends the agent to the file.
- `SCHEMA.md`'s tier table says the thin tier checks no key is written twice.

## Verification

- Unit tests on fixture files for both tiers, and CLI tests for exit 9, the text
  line printed once, the single JSON problem, and the clean case without the
  second key.
- Mutations of the line offset, the threshold, the top-level anchor and the rule
  itself each fail tests.
- The gate passed with 1,585 tests; this repository's tree is clean.

## Review

Census, read from this session's list of dispatchable agent types (the Agent
tool's roster):

- **`general-purpose`** (Tools: `*`) has shell access. Chosen, briefed for this
  branch, as the review of record.
- **`feature-dev:code-reviewer`** lists Glob, Grep, LS, Read, NotebookRead,
  WebFetch, TodoWrite, WebSearch, KillShell and BashOutput, with no `Bash`.
  Rejected on capability.
- **`code-simplifier:code-simplifier`** and **`project-docs:docs-curator`** (All
  tools) have shell access. Rejected on fit.

**Verdict: "Ready to merge: Yes".** It ran develop's and the branch's CLIs on
the same scratch trees: duplicates in an item, a feature, a cycle, an archived
cycle, a playbook and the root pages were reported, and templates,
`lint.exclude`, `lint.skip`, comments, folded continuations and case-differing
keys were not. It checked the line numbers against the files, the JSON and exit
code, `find` and `pdocs set` on a duplicate, four mutations, the mirror and the
gate (1,585 pass).

Its findings were all optional and are left as they are: CRLF files already fail
as `NO FRONTMATTER`; quoted keys are not read by pdocs' parser at all; `set`'s
"already set" message; and a payload `SCHEMA.md` row two characters wider than
its header, in a file Prettier does not format.

---

**Related Documents:**

- [Refuse a duplicate frontmatter key](../item.md)
