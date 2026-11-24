---
type: item
title: Find where an agent should ask whether work needs a feature
description:
  An agent asked to file a research item files it with no parent and never asks
  whether the work is a feature, because the rule sits in READMEs it does not
  read at that moment.
status: stable
lifecycle: done
id: 01a1eab2-ae6b-7236-8be0-cee5e10d7960
kind: research
generated: { by: claude-fable-5-2, at: 2026-11-17 }
priority: medium
parent: feature/feature-touchpoints
cycle: 2026-11-check-fixes-and-board-research
---

# Find where an agent should ask whether work needs a feature

Asked to "create a new research item for X", an agent files the item and stops.
Most of the time that work should have a feature: research leads to further
items, and a feature is the thing that holds several items across cycles. The
person asking should not have to say "feature" for the question to come up.

The rule exists, but not where the agent is when it files:

- **Written down:** `docs/items/README.md` ("Item or feature?"),
  `docs/features/README.md` and `docs/README.md` each say to write a feature
  when the work will split into several items. For research they say "research
  item first", which reads as "no feature".
- **Asked:** only `workshop-idea` tells the agent to ask the user which fits.
  `triage-items` proposes a parent, but later, once the item is already filed.
- **Silent on the path taken:** root `AGENTS.md`, `docs/CLAUDE.md`,
  `pdocs new --help` and the item template mention `parent` as a flag at most.
  `create-investigation` and the `investigator` agent never mention `parent`;
  `create-investigation` offers a feature only when the research closes.

Checked 2026-11-17 by reading those files. The payload copies under
`{{cookiecutter.project_slug}}/` and the output of a real `pdocs new item` run
were not checked.

Question: where does the touchpoint go, and what does it ask? The answer decides
what changes in the skills, the template and the CLI.

The touchpoint should reach the agent when it needs it, not be preloaded.
Guidance in `AGENTS.md` or `docs/CLAUDE.md` is read before the agent knows what
it is about to do, and competes with everything else there. Candidates, nearest
the moment first:

1. **`pdocs new item` itself, as an advisory.** The CLI already has the
   mechanism: `scripts/pdocs/advisories.ts` gives every advisory an `id`, a
   `message` (what is the case) and an `action` (what to do next), and
   `pdocs new` already returns an `advisories` list in JSON and in text. A
   `research` item filed with no `--parent` could carry one: the question, and
   the command that creates or names a feature. Every filer reaches it, with or
   without a skill. (The `next:` line `pdocs new` prints is text-only, so an
   agent reading JSON never sees it.) If the CLI is the path, or one part of it,
   an advisory is the form; whether the CLI is the path is still open.
2. **The skill doing the filing** (`create-investigation`, the `investigator`
   agent), at its item-creation step.
3. **`AGENTS.md` or `docs/CLAUDE.md`**, only if the first two cannot carry it.

To settle:

- What shape of request means "this is a feature": research that expects a
  build, work that will span cycles, more than one item named at once.
- Whether the CLI can tell enough from `--kind` and a missing `--parent` to
  prompt usefully, without nagging on every small research item.
- What each surface costs: an advisory adds a line to every matching command,
  while a skill costs nothing until loaded but reaches only agents that load it.
  The answer may be more than one surface.
- Which surfaces a fresh agent is certain to reach when it files an item, found
  by running the path rather than reading it.
- Whether the agent asks the user, proposes a feature and proceeds, or checks
  for an existing feature to join.

Related:
[keep a feature's finished items in view](../research-items-parent-feature/item.md),
the archiving half of the same gap.

## Definition of done

- [x] A write-up records the path three fresh agents took when asked for "a new
      research item", and where each could have been prompted.
- [x] It names the signals that mean a feature, and the wording of the question.
- [x] It says whether a `pdocs new item` advisory can carry the prompt, with a
      trial of the wording on fresh agents.
- [x] It recommends the surfaces to change, as items filed under one feature.
