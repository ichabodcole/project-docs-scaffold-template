---
type: artifact
title:
  "Removals: guidance-not-argument pass on the 3.6.0 root-convention work —
  2026-09-02"
description:
  Every passage the guidance-not-argument pass removed from 3.6.0, quoted
  verbatim with why it went.
status: stable
generated: { by: unknown, at: 2026-09-02 }
---

# Removals: guidance-not-argument pass on the 3.6.0 root-convention work — 2026-09-02

Working record for the `guidance-not-argument` pass over the passages added in
project-docs 3.6.0. Every **removed** passage is recorded verbatim with its
classification. All seven were proposed as a written list and approved before
any edit; the eighth was surfaced by the post-edit whole-section re-read and is
marked as such.

**The replacement text quoted below is as this pass left it, not as the tree
reads now.** Two later commits on the same branch — `5d18d6d`, correcting the
example against `finalize-branch` Step 8, and `ec052b5`, repairing dangling
pointers — revised several of these passages again, so the "After" and "Replaced
by" snippets in A3, C2 and E1 no longer match the shipped files. That is
expected: this document records one pass, and the tree is authoritative for
current wording. The removals themselves are unaffected.

No line-count total is given. The baseline these passages would be measured
against was never committed — it existed only in the working tree between the
3.6.0 edits and this pass — so the figure could be derived but not run, and an
unverified count is worth less than its absence. One of the eight changes (E1)
made its passage longer, and A3 came out even; the pass was not optimising a
counter.

## A — `update-project-docs` / Revising an Existing Root-Level Convention

### A1 — evidence only

The mechanism above it covers every instance; this covered the one that
happened. It survives in the project-docs 3.6.0 changelog entry, which is where
the story belongs.

```
That is exactly how project-docs 3.3.0 fixed the Branch Landing Policy in root
`AGENTS.md` while leaving 3.1.0's broken wording here for three releases,
recommending to every consumer a rule the repo had already proven unusable.
```

### A2 — no reason

Trailing clause on item 2. Promoted to its own sentence it asserts a comparative
frequency nobody measured. The instruction and its `finalize-branch` Step 8
example were kept.

```
A convention drifts from its implementation as easily as from its dogfooded
copy.
```

### A3 — reason stated twice

Item 3 said the same thing in two consecutive sentences. Merged to one; no
content lost.

```
It records when the convention was introduced, not when it was last edited.
Revisions bump the plugin version; they don't move that column.
```

Replaced by:

```
It records when the convention was introduced, not when it was last edited — a
revision bumps the plugin version instead.
```

## B — `update-project-docs` / The constraint

### B1 — no reason

An unmeasured claim about reader behavior, and a phrase reused as punctuation:
it appears verbatim in `finalize-branch` Step 8, where it is load-bearing. The
mechanism preceding it already lands the point.

```
— and a rule that never permits anything is one nobody reads.
```

## C — `scaffold-update-checklist` / Cross-Agent Distribution

### C1 — reason told as story

Past tense ("staled") wrote one session's incident into what should be a
standing rule. Changed to "stales".

### C2 — cross-reference describing another section's character

Describes where Final Checks lists Prettier, which goes stale if that section
moves, and hedges the instruction with "in practice".

```
Final Checks lists Prettier below this section; in practice it has to run on
both sides of the build, or the last thing you touch wins. The cheap guarantee
is to rebuild once more at the end and confirm `npm run format:check` passes
with a clean rebuild.
```

Replaced by a direct instruction in the heading sentence ("Run Prettier on the
source files first, and rebuild again after") plus a statable signal ("a clean
rebuild that leaves `dist/` unchanged").

## D — `scaffold-update-checklist` / Adding or Modifying a Plugin Skill

### D1 — cross-reference + unmeasured comparative

The first half describes the neighbouring bullet's character; the second is an
unmeasured comparative. The mechanism it gestures at is stated in full in the
section the bullet already links to — duplicated evidence, not a duplicated
reason.

```
This is the counterpart to the bullet above: that one covers _adding_ a
convention, this one covers changing one already shipped — historically the
easier of the two to miss, because the work starts in `AGENTS.md` and nothing
there points back.
```

## E — surfaced by the post-edit re-read, not on the approved list

### E1 — a reason duplicated as a paraphrase

Removing the material around them made visible that "Adding" item 4 and
"Revising" item 4 state one rule in two different wordings. The rule earns
duplication — both readers need it — so the fix was to make the shared clause
verbatim rather than to cut it, per the skill's rule that a paraphrase is "a
second copy that does not look like one, and the form in which copies silently
diverge."

Before:

```
4. Bump the plugin **minor** — a reworded recommendation changes behavior — and
   link the changelog entry here rather than restating the new wording.
```

After, reusing "Adding" item 4's clause verbatim:

```
4. Bump the plugin **minor** — a reworded recommendation changes behavior. As
   when adding one, the changelog entry should **link here**, not duplicate the
   example content inline.
```

## Not touched

The project-docs 3.6.0 changelog entry in `plugins/project-docs/README.md`. A
changelog is the correct home for the narrative these cuts displace, so it keeps
the story while the guidance keeps the rule.
