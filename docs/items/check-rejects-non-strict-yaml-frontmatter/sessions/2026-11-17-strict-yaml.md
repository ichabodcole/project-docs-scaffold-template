---
type: session
title: Frontmatter a strict YAML parser rejects — 2026-11-17
description:
  Made pdocs check report two frontmatter shapes strict YAML parsers refuse,
  taught the frontmatter reader block scalars, and quoted a value ending in a
  colon.
tags: [pdocs, lint, yaml]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# Frontmatter a strict YAML parser rejects — 2026-11-17

Part of
[Check fixes and board research](../../../cycles/2026-11-check-fixes-and-board-research.md).

## Context

Issue #207: `pdocs check` passed frontmatter that strict YAML parsers refuse, so
a tree could lint clean and still break a tool that reads it with a real parser.
Two shapes: a plain value wrapped over several lines that holds `: `, and a
value that opens with a quote and continues after the quote closes.

## What Happened

- **The lint.** `scalarFaults` in `scripts/pdocs/lint/rules.ts` reports both
  shapes under the existing `BAD SCALAR` code, naming the field and the fix:
  fold the value (`description: >-`) or quote all of it.
- **The reader.** `parseFrontmatter` now reads a `>` or `|` block scalar without
  its header. Before, the fix the message recommends read back as
  `>- The sentence…` in `find`, `view` and the catalog check.
- **The writers.** `pdocs new` and `pdocs set` already quoted a value holding
  `: `. The one fault was a value ending in a colon, now quoted too.
- **This repository.** One document needed its description folded.

Tests were written first, with `Bun.YAML.parse` as the oracle. `pdocs` source
gained no dependency.

## Notable Discoveries

- **The report is an error in every tier**, as `DUPLICATE FIELD` is. Under
  `lint.adopting: true` the rows print and the exit stays 0.
- **Five of 15 adopter trees go from clean to exit 9**, with 12 documents
  between them, all rejected by a strict parser. Across 5,168 real frontmatter
  blocks the rule reported nothing a strict parser accepts.
- **One valid shape is reported**: a list under a nested key, with its items at
  the mapping's indent. A document holding it already fails `UNKNOWN FIELD`.
  Filed.
- **Shapes still passed**: one line under the key holding `: `, which a strict
  parser reads as a mapping, and several it rejects. Filed.
- **Block scalars are read exactly only for one paragraph.** `|` loses blank
  lines and relative indent, and `>` joins paragraphs with a space. Nothing
  found that this harms.
- **The item's third box is half met.** The error decision is made. The
  adopter-facing sentence waits for the migration's re-pin and is filed as its
  own item.

## Review

- **Roster:** the agent types this session can dispatch, as its Agent tool lists
  them.
- **Checked:** `general-purpose` (all tools, so it has a shell) and
  `feature-dev:code-reviewer` (its list has `BashOutput` and `KillShell` but no
  `Bash`, so it cannot run anything). The second was rejected on that ground.
- **Chosen:** `general-purpose`, briefed to hunt for false positives with its
  own inputs.
- **What it ran:** `git diff develop..HEAD`; `bun add yaml js-yaml` in a scratch
  directory; 111 hand-written valid cases, a 200,000-document grammar fuzzer and
  300,000 mutations of real blocks against three parsers; `check` with both
  CLIs, read-only, against 15 adopter trees; `set`, `new session --owner`,
  `archive`, `find` and `view` on scratch projects with block-scalar
  descriptions, compared byte for byte; the branch's tests against `develop`'s
  source; `check` timed on both trees (no change); `npm run check:mirror`,
  `check:dist`, `check:version`, `format:check`, `npx tsc --noEmit` and the full
  suite (1615 pass).
- **Verdict:** ready to merge, with follow-ups and no blocking finding.

## Follow-up

Filed from the review, all in `triage`:

- [Report the other frontmatter shapes a strict parser misreads](../../bad-scalar-remaining-shapes.md)
- [Stop BAD SCALAR firing on a list under a nested key](../../bad-scalar-nested-list-false-positive.md)
- [Rewrite a whole block scalar when pdocs set replaces a value](../../set-description-block-scalar-blank-line.md)
- [Tell adopters about BAD SCALAR when the v3.0 migration is re-pinned](../../bad-scalar-repin-note.md)

---

**Related Documents:**

- [Report frontmatter a strict YAML parser rejects](../item.md)
