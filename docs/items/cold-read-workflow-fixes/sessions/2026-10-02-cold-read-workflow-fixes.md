---
type: session
title: Cold-read workflow fixes — 2026-10-02
description:
  Before 9.4.0, context-free agents read the skills the pdocs views cycle
  changed; two rounds of fixes made the review rule's decline paths, research
  items, gate detection and sweep-project's new paths walk cleanly.
tags: [project-docs, skills, review]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-02 }
---

# Cold-read workflow fixes — 2026-10-02

## Context

The scaffold update checklist asks for a cold read of every new or changed
skill: a fresh agent with no context reads it and reports what confuses it.
Before releasing 9.4.0, three agents read the skills the
[pdocs views cycle](../../../cycles/_archive/2026-10-pdocs-views.md) changed.
They found contradictions and dead ends, most of them in that cycle's own text.
Cole chose to fix them before the release.

## What Happened

- **Round 1** fixed findings A–F from the item. Cole asked for a full read of
  every changed document afterwards, and that read caught fixes that
  contradicted other passages. Examples: finalize-branch Step 6 appending a
  Sessions line the new membership rule forbade, and three SCHEMA, README and
  template rows that disagreed with the new flows.
- **The review and two new cold reads found more.** Several were caused by round
  1's own edits. The main ones:
  - **warn vs strict:** the decline paths branched by mode, so under warn an
    agent moved an item out of `triage`;
  - **the strict move-back:** `--lifecycle ready` alone left the item
    `UNREVIEWED`, and only `--unset cycle` cleared it (verified with the CLI);
  - **the investigator** would close a `bug` it was handed;
  - **sweep-project** would re-close an already closed cycle.
- **Cole re-scoped round 2:** guard the path the agent actually walks, not
  detours it has no natural reason to take, and prefer fewer caveats. So round
  2:
  - set **one decline rule for both modes**: an item whose content approval is
    declined does not move, and Step 6 closes it `done` with its cycle;
  - **defined "approve"** once per skill: the description and definition of done
    as shown, not "land it";
  - limited the investigator to `research` items;
  - made sweep-project read a cycle's `lifecycle` from JSON, and the Audit Path
    approve the document, not the shipping.

  It also dropped the detours (slug collisions, a policy changing mid-branch,
  the abandoned-cycle route, `--root` detection) and trimmed round 1's detour
  caveats.

- **The final cold read walked six real scenarios.** Four were clean. Its two
  findings were fixed in one commit:
  - an earlier decline now counts like an earlier approval, so finalize-branch
    doesn't ask again;
  - the investigator marks its finished write-up `stable`.
- **Friction went to
  [workflow-docs-cold-read-polish](../../workflow-docs-cold-read-polish.md)**,
  including the slug-collision and abandoned-cycle routes and three CLI help
  gaps.

## Verification

- The reviewer walked approve and decline for the three item cases (unstarted,
  started, created at landing), under warn and strict, with the real CLI. Every
  command succeeded or was refused where the text says.
- The gate snippet finds this repo's two gates under bash and zsh, and finds
  nothing in a repo that only names `scripts/pdocs/**` in a path filter.
- The gate passed on every commit, with 1,576 tests.

## Review

Census, read from this session's list of dispatchable agent types (the Agent
tool's roster):

- **`general-purpose`** (Tools: `*`) has shell access. Chosen as the review of
  record, and for the cold reads.
- **`feature-dev:code-reviewer`** lists Glob, Grep, LS, Read, NotebookRead,
  WebFetch, TodoWrite, WebSearch, KillShell and BashOutput, with no `Bash`.
  Rejected on capability.
- **`code-simplifier:code-simplifier`** and **`project-docs:docs-curator`** (All
  tools) have shell access. Rejected on fit.

**Round 1: "With fixes".** It ran:

- every decline path in scratch payload trees, under warn and strict;
- the gate snippet against seven fixture repos;
- sweep-project's read-only commands on this repository;
- the gate (1,576 pass).

It found the strict move-back dead end and the investigator closing non-research
items.

**Round 2: "Ready to merge: Yes".** It ran the same walks on the new text, the
Cycle Path's JSON on the closed cycle, the snippet under bash and zsh, and the
gate. Its four detours were left as they are, by Cole's rule.

**The final fix commit** was two sentences. It was checked by reading its diff
against the cold read's two findings, and the gate passed.

---

**Related Documents:**

- [Fix the workflow gaps a cold read found before 9.4.0](../item.md)
