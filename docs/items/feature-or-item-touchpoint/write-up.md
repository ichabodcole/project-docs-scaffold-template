---
type: write-up
title: Where an agent should ask whether work needs a feature
description:
  Ask the feature question in create-investigation and the investigator agent,
  where the agent can judge it, and back it with a pdocs new item advisory on
  research filed with no parent; trials on six fresh agents show where each
  reaches the filer.
tags: [project-docs, workflow, pdocs, skills]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# Where an agent should ask whether work needs a feature

**Outcome:** Work items recommended under
[Feature touchpoints](../../features/feature-touchpoints/feature.md), not yet
filed.

---

## Question

Where should an agent be prompted to ask "does this work need a feature, or just
an item?", and what does the prompt say? The answer decides what changes in the
filing skills, the item template and the `pdocs` CLI. The constraint, from the
item: the prompt reaches the agent at the moment it files, not preloaded in
`AGENTS.md` or `docs/CLAUDE.md`, and the agent raises the question itself.

## Current State

Checked 2026-11-17 by running the CLI in a scratch copy of the repository and by
grepping `plugins/project-docs/`.

**`pdocs new item` says nothing about a parent.** An agent's Bash call is not a
terminal, so `pdocs` answers in JSON by default. A research item filed with no
`--parent` returns:

```json
{
  "ok": true,
  "data": {
    "path": "docs/items/auth-providers-research.md",
    "type": "item",
    "created": ["docs/items/auth-providers-research.md"],
    "promoted": null,
    "id": "01a1eb11-…",
    "advisories": []
  }
}
```

With `--format text` the agent sees the path, the id and one `next:` line about
running Prettier. `pdocs new --help` lists `--parent <value>` as "`parent:` —
only on a type that declares it". A task, a research item with `--parent`, and
an item filed into the active cycle print the same `next:` line, and the last
also prints the `work-item-review` advisory. That advisory already appears in
both formats, so an advisory on `pdocs new` is an existing pattern
(`scripts/pdocs/commands/new.ts`, `adviseReview`), not a new one.

**Every surface that files an item:**

| Surface                              | At filing time?                                                          | Mentions `parent` today                                                              | Cost to add the question                           | Fires too often?                                                          |
| ------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| `pdocs new item`                     | Always: every filer passes through it (6 of 6 trials)                    | Only as a flag in `--help`                                                           | One advisory in `new.ts`, a test, the payload copy | Only if scoped badly: 52 live tasks, 44 bugs and 21 chores have no parent |
| `create-investigation`               | Yes, step 5, for a request phrased as research (6 of 6 trials loaded it) | No                                                                                   | A few lines at step 5                              | No: the agent judges                                                      |
| `investigator` agent                 | Yes, when a session delegates research to it                             | No                                                                                   | A few lines beside its flags table                 | No; it cannot ask, so it reports the question                             |
| `workshop-idea`                      | Yes                                                                      | Asks "feature or work item?" already                                                 | None                                               | —                                                                         |
| `triage-items`                       | Later, and only for items in `triage`                                    | Proposes a parent                                                                    | None                                               | —                                                                         |
| `operator-triage` (skill-garden)     | Yes                                                                      | Routes to item, feature or research already; the research route files with no parent | One clause on the research route                   | No                                                                        |
| `finalize-branch`                    | Yes, but for work already done; its kind mapping never yields `research` | Optional `--parent`                                                                  | None needed                                        | —                                                                         |
| `generate-dev-plan`, `sweep-project` | Yes                                                                      | Always pass `--parent`                                                               | None                                               | —                                                                         |
| `review-docs`, `project-summary`     | Yes, chores only                                                         | No                                                                                   | None: findings are not feature-sized               | —                                                                         |
| `AGENTS.md`, `docs/CLAUDE.md`        | Before the agent knows what it will do                                   | No                                                                                   | Ruled out by the item                              | Every session                                                             |

One fact the table hides: **`create-investigation` and the `investigator` file
the user's research `ready` or `active`, which skips `triage`.** `triage-items`
proposes parents only for items in `triage`, so the one later step that would
ask never sees these items.

**What the tree shows.** Of 16 live research items, 12 have no parent. Of those
12, 6 had a feature written from their write-up afterwards and 1 spawned five
items; 5 stood alone (diagnoses such as `test-performance` and
`ci-migration-test-git-hang-cause`, and landscape surveys). None of the 7 that
led to work was ever given the feature as its parent. Counted from
`pdocs find --type item --format json` and a grep of `docs/features/` and
`docs/items/` for each slug.

## Findings

### Evidence: six fresh agents

Each agent was told it was the main session for a user in a scratch copy of this
repository, given one user message, and asked to stop once the item was filled
and to write down any question it would ask the user. Nothing in the prompt
mentioned features or parents. Three ran against the CLI as it is (B); three ran
against a copy whose `pdocs new item` carried a trial advisory (A). Every agent
loaded `create-investigation`, and every agent passed `--format text`.

The trial advisory, as the agents saw it:

> advisory (feature-question): item/<slug> is research with no parent feature.
> Research that leads to a build, or to work across several items or cycles,
> belongs under a feature, which keeps that work together. Open features:
> feature/document-versioning-ui-references, feature/feature-touchpoints, … .
> next: Before you go on, ask the user whether this research is the start of
> something they mean to build. If it is, join an open feature
> (`pdocs set item/<slug> --parent feature/<slug>`) or write one
> (`pdocs new feature <slug>`, then the same `set`). If it only answers a
> question, leave it as it is.

| Request                                                  | Without advisory (B)                                                                                                                                | With advisory (A)                                                                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "a page that shows the cycle board in a browser"         | Found `feature/pdocs-work-board` in step 3's context search and filed with `--parent` itself. Asked whether the item duplicates the board research. | Found the same feature, then **left the parent empty** and asked the user to choose it or a new feature.                                                                   |
| "should pdocs be able to import GitHub issues as items?" | No parent. Ended with an aside: "Should it go under a feature (none fits clearly, `pdocs-work-board` is the closest)". Never offered a new feature. | No parent. Asked "Is this the start of something you mean to build? If you mean to build it, should it join `feature/pdocs-work-board` … or get a new feature of its own?" |
| "find out why `npm test` got slower this month"          | No parent, no question. Correct.                                                                                                                    | No parent. **Asked the build question anyway**, listing five unrelated features. Noise.                                                                                    |

Two caveats. One A agent ran `git show HEAD`, saw the commit that added the
trial advisory, and so knew the advisory was a trial. The scratch copies
contained this item and its feature, though no agent's list of files read names
them.

### Key Observations

1. **The CLI is the one surface every filer reaches, and the skill is the one
   that can judge.** All six agents passed through both `pdocs new item` and
   `create-investigation`. Only the agent can tell "why did X get slower" from
   "should we build X"; `--kind research` and a missing `--parent` cannot (A3).
   High confidence.
2. **Unprompted, agents join an existing feature but never propose a new one.**
   B1 joined `pdocs-work-board` on its own; B2 mentioned joining as an
   afterthought; no B agent asked whether the work needed a feature of its own.
   The new-feature case is the gap. Medium confidence: three runs.
3. **The advisory reached the agent and changed its question every time.** All
   three A agents turned it into a question to the user, worded close to the
   advisory's. Its wording, though, did harm twice: it made A1 defer a parent
   that B1 set correctly, and it made A3 ask on a diagnosis. Both come from "ask
   the user" being unconditional. High confidence that it reaches; the revised
   wording below is untrialled.
4. **The `next:` line is not the gap the item feared.** It is text-only, but
   every agent asked for text. Advisories appear in both formats, so the
   question of format does not decide the surface.
5. **Late is too late.** `triage-items` asks about parents, but the research a
   user asks for never enters `triage`, and of seven research items that led to
   work, none was linked back to the feature it fed.

### Signals that mean a feature

Ask, or join, when the request shows any of these:

- **It expects a build.** "Should we add / support / import …", "a page that
  shows …", "a command that …": a yes leads to work.
- **An open feature already covers it.** `pdocs view portfolio` lists one whose
  outcome includes this.
- **It names more than one piece of work**, or the answer will be followed by
  several items.
- **It will run across cycles.**

Do not ask when it is a **diagnosis** ("why did X break / get slower") or a
**survey that ends with its answer**: those are 5 of the 12 parentless research
items in the tree, and they needed no feature.

So **not every research item needs a parent**: only research that expects a
build or that an open feature already covers.

### Options Considered

| Criterion                        | Weight | A: advisory only                      | B: skill only                                | C: skill, then advisory                          | D: `AGENTS.md` rule                  | E: refuse research with no `--parent` |
| -------------------------------- | ------ | ------------------------------------- | -------------------------------------------- | ------------------------------------------------ | ------------------------------------ | ------------------------------------- |
| Reaches the filer at filing time | High   | Every filer                           | Only filers who load the skill (6 of 6 here) | Every filer                                      | Read at session start, not at filing | Every filer                           |
| Judges diagnosis vs build        | High   | No (A3)                               | Yes                                          | Yes; the advisory defers to the skill's judgment | Weakly                               | No                                    |
| Asks at the moment it applies    | High   | Yes                                   | Yes                                          | Yes                                              | No                                   | Yes, as a failure                     |
| Noise                            | Medium | One line per parentless research item | None                                         | One line, silent to the user when not needed     | Every session                        | A flag to pass on every diagnosis     |
| Cost                             | —      | Low                                   | Low                                          | Low + low                                        | Low                                  | Medium                                |
| **Fit**                          | —      | Partial                               | Good, narrow reach                           | **Best**                                         | Ruled out                            | Poor                                  |

- **D** is ruled out by the item's own constraint, and the trials show the
  question reaches the agent without it.
- **E** fails the 5 standalone research items, and an agent would learn to pass
  `--no-parent` without thinking.
- **F, relying on `triage-items` later,** fails because the research a user asks
  for skips `triage`.
- **A alone** reaches everyone but cannot judge, so its wording has to hand the
  judgment back to the agent.
- **B alone** judges well but misses filers who never load the skill: an agent
  following `operator-triage`'s research route, an ad-hoc `pdocs new item`, or a
  session that spawns the `investigator`.

## Recommendation

- [x] **File work items** — three items under the existing feature

**Ask in the skill, and back it with an advisory.** The skill carries the
judgment at the step where the agent is about to file; the advisory catches
every filer the skill does not reach, and says when to stay quiet.

**In `create-investigation` step 5, before `pdocs new item`:**

> **Decide the parent before you file.** Research that expects a build ("should
> we add / support / import …"), that will lead to several items, or that will
> run across cycles belongs under a feature. Run `pdocs view portfolio`. If one
> open feature clearly fits, file with `--parent feature/<slug>` and tell the
> user which. If none fits, ask the user: "Is this the start of something you
> mean to build? If so, I'll write a feature for it now, so this research and
> the work it leads to stay together." A diagnosis or a survey that ends with
> its answer files with no parent; do not ask.

**In the `investigator` agent, beside its flags table:** the same decision. It
cannot ask, so when none fits and the research expects a build, it puts the
question in its report.

**On `pdocs new item`, the `feature-question` advisory** (revised after the
trial; this wording was not run on fresh agents):

- **Fires** on an item of `kind: research` with no `parent`.
- **Stays silent** when `--parent` is given, when `--from` names a feature, when
  the item is filed `done` or `dropped`, and on every other kind.
- `message`: "`item/<slug>` is research with no parent feature. Open features:
  `feature/a`, `feature/b`, … (at most five, then `pdocs view portfolio`)."
- `action`: "If this research is meant to lead to a build, or to work across
  several items or cycles, it belongs under a feature. If one open feature
  clearly fits, set it (`pdocs set item/<slug> --parent feature/<slug>`) and
  tell the user. If none fits, ask the user whether to write one
  (`pdocs new feature <slug>`, then the same `set`). If it is a diagnosis or a
  survey that ends with its answer, leave it as it is and say nothing."
- `refs`: the item and the features listed.

**The agent asks, proposes or joins** by this rule: join when one open feature
clearly fits, and say so; ask when the research expects a build and no feature
fits; stay silent otherwise.

**How to verify it is reachable**, by replaying the original failure in a
scratch copy with fresh agents and nothing in the prompt about features:

1. "Create a new research item: should pdocs be able to import GitHub issues as
   items?" Passes when the agent's message to the user asks whether this is the
   start of a build and offers to write a feature.
2. "Create a new research item to find out why `npm test` got slower this
   month." Passes when the agent files it with no parent and asks no feature
   question.
3. "Create a new research item for adding a page that shows the cycle board in a
   browser." Passes when the item is filed under `feature/pdocs-work-board` and
   the agent says so.
4. The advisory alone, with no skill loaded: spawn the `investigator` with the
   request from replay 1 in a copy where `create-investigation` and the
   `investigator` changes are absent. Passes when its report carries the build
   question.

**When to reconsider:** if replay 2 shows the advisory still draws a question on
a diagnosis, drop the advisory and keep the skill change alone; if agents stop
loading `create-investigation` for research requests, the advisory becomes the
main surface and its wording carries the signals list.

## Next Steps

File these under `feature/feature-touchpoints`:

1. **Ask the feature question when research is filed** (task). Done when
   `create-investigation` step 5 and the `investigator` agent carry the decision
   above, the `dist/` build is refreshed, and replays 1–3 pass with fresh
   agents.
2. **Add the `feature-question` advisory to `pdocs new item`** (task). Done when
   it fires and stays silent as specified, in JSON and text, with tests for each
   condition, the payload copy matching, and replay 4 passing.
3. **Say in the READMEs that research expecting a build gets a feature at
   filing** (chore). Done when "Item or feature?" in `docs/items/README.md`,
   "Feature or item?" in `docs/features/README.md`, and the decision chart in
   `docs/README.md` no longer read "research item first" as "no feature", in
   this repository and in the payload.

The archiving half, the feature's other item, is not changed by this.

## Open Questions (Optional)

- **The revised advisory wording is untrialled.** The trial wording was run on
  three agents; the revision answers its two failures but has not been replayed.
  Item 2's definition of done covers it.
- **Filers that do not load `create-investigation`** were not observed: every
  trial agent loaded it. Replay 4 tests the advisory on that path.
- **Tasks filed several at once** ("file items for X, Y and Z") may also mean a
  feature. The CLI sees one command at a time and cannot tell; `workshop-idea`
  and `triage-items` already cover that case, so it is left out.
- **`operator-triage`** lives in skill-garden; its research route could carry
  one clause from the skill wording. Not filed here.

Sources: `scripts/pdocs/commands/new.ts`, `scripts/pdocs/advisories.ts`,
`docs/items/README.md`, `docs/features/README.md`, `docs/README.md`,
`plugins/project-docs/skills/{create-investigation,workshop-idea,triage-items,finalize-branch,generate-dev-plan,sweep-project,review-docs}/SKILL.md`,
`plugins/project-docs/agents/investigator.md`, skill-garden's
`plugins/operator/skills/operator-triage/SKILL.md`, and the six trial runs
above.

---

**Related Documents:**

- [Find where an agent should ask whether work needs a feature](./item.md)
- [Feature touchpoints](../../features/feature-touchpoints/feature.md)
- [Keep a feature's finished items in view](../research-items-parent-feature/item.md)
