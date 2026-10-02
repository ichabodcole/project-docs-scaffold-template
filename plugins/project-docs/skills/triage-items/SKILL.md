---
name: "triage-items"
description: >
  Triage the work items waiting in `triage`: propose for each one whether to
  accept it (to `backlog` or `ready`) or drop it, with a `priority`, an
  `assignee` and a `parent` feature — and propose which items belong together
  under one feature and which can run in parallel. Shows the whole proposal to
  the user and applies it with `pdocs set` only after they have seen it. Use
  when items have piled up in triage, after a review or an intake filed new
  items, or when the user wants to plan the next round of work from what has
  been filed. Triggers when the user says "triage the items", "triage the
  backlog", "what's in triage", "organize the backlog", "group backlog items
  into features", "prioritize the backlog", "what should we work on next", or
  "review what's been filed".
allowed_tools: ["Read", "Bash", "Grep", "Glob", "AskUserQuestion"]
---

# Triage Items

Every work item an agent files starts in `triage`: a reviewer's finding, a bug
hit mid-task, an intake from outside the repository. Nobody has decided to take
it on yet. Triage is where the user decides, and this skill is the step that
puts the decision in front of them. **It proposes; the user disposes.** Nothing
leaves `triage` until the user has seen the proposal for it.

`pdocs` below means `bun scripts/pdocs/cli.ts`, the documentation CLI at the
repo root. This skill needs it, and a docs tree with `items/`. A project on the
pre-9.0.0 layout (`docs/backlog/`) runs the `update-project-docs` skill first.

## When to Use

- Items have accumulated in `triage` — after a review, an intake
  (`operator-triage`), or a few branches' worth of findings
- The user wants to plan the next round of work from what has been filed
- `init-branch` refused to start an item because it was still in `triage`

## Step 1: Inventory

```bash
pdocs find --type item --lifecycle triage --format json
```

Open every item it lists — `find` returns the frontmatter summary, not the body
— and read its title, `kind`, definition of done, `from:` (what spawned it) and
`source:` (where it came in from). For each one, note:

- **Area** — which part of the codebase it touches
- **Key files** — from its body, or from what spawned it
- **Dependencies** — other items it needs first, or that need it
- **Size** — low (a scoped change), medium (design and implement), high
  (research first)

Read the context it will land in, too:

```bash
pdocs find --type feature --format text   # the features an item could join
pdocs view board --format text            # the items, by state group
pdocs view backlog --format text          # everything unstarted, triage included
```

If the board ends with an archive advisory (`archive-threshold`), finish the
triage first, then mention it once and offer the `sweep-project` advisory path.
Never archive as part of triage.

An item that duplicates one already on the board is a drop candidate. So is one
that duplicates a phase in a feature's `plan.md`, when the feature has one
(`pdocs new feature` creates only `feature.md`, so a feature not yet shaped has
no phases to compare against — skip the check for it). An item that fits an
existing feature is a `parent` candidate.

Present the inventory as a table:

```
| # | Item | Kind | Area | Key files | Dependencies | Size | From |
|---|------|------|------|-----------|--------------|------|------|
```

## Step 2: Group and Assess Parallelism

Cluster the items, using these signals from strongest to weakest:

1. **Shared files** — items that modify the same files belong together; running
   them in parallel would collide
2. **Direct dependencies** — if A must land before B, they belong together, and
   B is `blocked_by` A
3. **Conceptual cohesion** — items addressing one user-facing concern
4. **Work type** — research items group apart from implementation items, so a
   question doesn't stall work that is already clear

For each cluster, propose where it lives:

- **An existing feature** — its items get `parent: feature/<slug>`.
- **A new feature** — when two or more items share an outcome worth shaping and
  no feature holds it. Name it (kebab-case, 2–4 words). It is created in Step 4
  with `pdocs new feature`, which starts it in `backlog`.
- **No feature** — a standalone item. Most small fixes are, and that is fine.

**Don't force groupings.** Items that don't cluster stay standalone. Prefer a
few cohesive features over many thin ones; a bad grouping costs more
coordination than it saves.

Then the **parallelism** of what is being accepted. For each cluster, list the
files and directories it touches, and say which clusters can run at the same
time:

- **Parallel-safe** — no shared files
- **Needs sequencing** — shared files; name them and suggest the order
- **Partial overlap** — only read-only references or configuration are shared;
  note the constraint

Present this as a small matrix. Do the same inside a cluster: two items that
share a file but do not depend on each other need sequencing too, so name the
order you suggest. It is advice for whoever starts the work. The fields that
record it are `parent`, and `blocked_by` only for a real dependency. Don't use
`blocked_by` to express "these touch the same file".

## Step 3: Propose a Disposition for Each Item

For every item in `triage`, propose:

| Field        | Values                               | Guidance                                                                                                                                                                                                                                                                                                                                     |
| ------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lifecycle`  | `backlog` · `ready` · `dropped`      | `ready` when its definition of done is settled and nothing blocks it (an item with a `blocked_by` that is not yet all `done` stays `backlog`; `finalize-branch` moves it to `ready` when its last blocker lands); `backlog` when accepted but not yet shaped; `dropped` when it duplicates something, is already done, or is not worth doing |
| `priority`   | `urgent` · `high` · `medium` · `low` | Optional. Leave it off rather than guess                                                                                                                                                                                                                                                                                                     |
| `assignee`   | an agent, a seat, or a name          | Only when the item is routed to a particular agent or seat. Usually left off                                                                                                                                                                                                                                                                 |
| `parent`     | `feature/<slug>`                     | From Step 2                                                                                                                                                                                                                                                                                                                                  |
| `blocked_by` | item ids                             | From Step 2's dependencies, when one is already visible at triage. Shaping adds any found later (the item template lists shaping as its writer; triage writes it too)                                                                                                                                                                        |

Give a one-line reason for each — especially for a drop. **Dropping is not
deleting**: the item stays in the tree at `dropped`, which is how it shows that
someone decided.

**When to propose `ready`.** A definition of done is _settled_ once the user
accepts it. The one the filer wrote is a proposal: writing it at filing does not
make the item `ready` (`docs/items/README.md`). So propose `ready` only for an
item whose body carries a concrete, checkable definition of done, and quote that
definition in the proposal row; the user's approval of the row is what accepts
it. An item whose definition of done is still the template's prompt, or too
vague to check, is not `ready`: propose `backlog`, or write a definition of done
into the proposal for the user to approve with the rest.

Present the whole proposal at once — the groupings, the parallelism matrix, and
one row per item — and ask the user to approve it, change it, or reject parts of
it. Use the available question tool, or put the same proposal and question in
your reply and **end your turn there**; the user's next message is the answer.
**Apply nothing before they answer.** An item the user skips stays in `triage`.
Apply exactly what the answer approves: when it names a state for an item but is
silent on a field you proposed (a `parent`, a `blocked_by`), ask, or leave that
field off and list it in the summary as not applied.

## Step 4: Apply What the User Approved

Create any new feature first, so items can name it:

```bash
pdocs new feature <slug> --title "…" --description "<one sentence: the outcome>" \
  --by "<your model or name>"
```

Then, per item, one `pdocs set` with every approved field:

```bash
pdocs set item/<slug> --lifecycle ready --priority high \
  --parent feature/<slug> --blocked-by <id>,<id>
pdocs set item/<slug> --lifecycle dropped
```

For a drop, and for an accepted item whose definition of done came from your
proposal rather than its body, edit the item's body too: append the drop reason
(`Dropped at triage, YYYY-MM-DD: <reason>.`), or write the approved definition
of done. An item whose body already held the definition of done the user
approved needs no body edit. `pdocs set` changes frontmatter only, and a reason
left in chat is lost.

`pdocs set` refuses a value the lint would reject — an unknown priority, a
`parent` that isn't a feature, a `blocked_by` that doesn't resolve — and names
the valid ones. It accepts an 8+ character id prefix or `item/<slug>` and writes
the full id. Fix what it refuses and run it again; don't edit frontmatter by
hand.

Then check the tree:

```bash
pdocs check
pdocs view backlog --format text
```

## Step 5: Commit and Summarize

Offer to commit the changes (only `docs/`). Then summarize:

- Items accepted, and to which state; items dropped, with reasons; items left in
  `triage`
- Features created, and which items joined which feature
- The parallelism overview — what can run concurrently, and what must wait
- What is now `ready` to start — `pdocs view ready` — which is what
  `init-branch` will offer next

## Constraints

- **Never apply before the user has seen the proposal.** `pdocs set` does not
  check who is calling, and neither does `pdocs new item --lifecycle <state>`,
  which files an item straight into any state. This rule is what makes triage a
  step the user sees. It is the whole point of the skill.
- **Never use `pdocs new item --lifecycle` to skip triage.** That flag is for an
  item the user has just approved in the same exchange, or asked you to file
  (`docs/items/README.md`). An item you file on your own judgement starts in
  `triage`, and leaves it only through this skill.
- **Never move an item out of `triage` except here**, or by the user's direct
  instruction.
- **Don't start work.** Triage ends at `backlog` or `ready`; `init-branch` moves
  an item to `active`.
- **Don't delete an item.** Drop it; the lint reports an item that leaves the
  tree without reaching `dropped`.
- **Don't write plans or sessions.** Shaping a feature is `generate-dev-plan`'s
  job, after triage.
