---
type: artifact
title: "Step 2 density pass — removals, verbatim"
description:
  Every passage removed from finalize-branch Step 2, quoted verbatim with its
  original line numbers.
status: stable
generated: { by: unknown, at: 2026-09-02 }
---

# Step 2 density pass — removals, verbatim

Working record for the `guidance-not-argument` pass. Every passage removed is
reproduced verbatim with its original line numbers and classification, so the
pass is reversible by reading one file and a second pass can judge the whole set
at once.

Two of these removals are not compression. The dated tool-list block (R1) and
the fallback's capability claim (R2) are what let an adversarial reviewer
fabricate a compliant census on 2026-09-02 — it pasted the tool string from R1
and was factually correct. Removing them makes the document truer, not merely
shorter.

---

## R1 — lines 124–132 — _evidence only_

```
   **Observed 2026-09-02, and worth re-checking rather than trusting:**
   `feature-dev:code-reviewer` and `feature-dev:code-architect` both lacked
   `Bash` (each listing only
   `Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput`).
   That made `code-reviewer` useful as a confidence-filtered second opinion but
   not sufficient alone, and it disqualified `code-architect` despite its being
   the natural fit for the plan-aware slot below. These are notes from one
   session, not standing facts — the point of the census is that the roster
   changes underneath this file.
```

A dated measurement, compressed to a stated policy ("this file prints no
reviewer's tool list"). Its surviving reason — the roster changes independently
of this file — was already stated in item 1. Its second reason, that the
best-shaped candidate for a slot may be read-only, was a duplicate of the
plan-aware bullet and now lives only there.

## R2 — lines 167–172 — _evidence only + self-narration_

```
     access is available. Note this in the session doc. **Census it like any
     other candidate** — it has had full tool access whenever this was checked,
     but that is an observation, not a standing fact, and this is the bullet an
     executor is most tempted to take on trust precisely because the file
     vouches for it.
```

The cure for a document that vouches is to stop vouching, not to annotate the
vouching. The instruction ("census it like any other candidate") was kept.

## R3 — lines 77–79 — _no reason_

```
Tunnel vision makes self-review miss the things a fresh pair of eyes catches in
minutes.
```

and, from the following sentence,
`is exactly the failure mode this step exists to prevent`. The first restates
the preceding mechanism more weakly; the second is the project narrating its own
conduct.

## R4 — lines 116–118 — _duplicate_

```
   - **If any part of the review ends up being a static read, label it as one**
     in your report to the user. A static read presented as a verified review is
     worse than no review; this disclosure is an instruction, not a caveat.
```

Third of three copies of the static-read rule. Its reason ("worse than no
review") was relocated to the After-review bullet, which is where the report is
actually written. `this disclosure is an instruction, not a caveat` was a
revision record — it existed to correct a previous draft that had the rule as
rationale, addressed to a reader who never saw that draft.

## R5 — lines 146–148 — _trailing clause, unmeasured frequency_

```
**This
     bullet is where the capability check most often gets skipped:**
```

Fails the promotion test: standing alone it asserts a frequency nobody measured.
The rule underneath — shape does not substitute for the census — was kept and
now also carries R1's read-only point.

## R6 — lines 92–93 — _cross-reference describing another section's character_

```
   **This check is a hard gate, in the same register as Step 3's quality
   tools.** Like those, it fails _open_:
```

A sentence describing what Step 3 is goes stale when Step 3 changes, and its
bytes never move. "This check is a hard gate, and it fails open" carries the
claim without the dependency.

## C1 — line 189 — _self-assessment_

```
**This is the load-bearing one.**
```

Emphasis about the document's own contents rather than an instruction.

## C3 — line 99 — _wording defect, not a classification_

```
**The census is your account of what you did. It is not proof, and don't
     treat it as any.**
```

`treat it as any` was an error introduced in the previous revision. Rewritten as
"your account of what you did, not proof that you did it."

---

## Repaired during the re-read, not removed

**A false quantifier the compression manufactured.** The execution-log bullet
came to read "It is **the one part** of Step 2 you do not author yourself." That
is false — the reviewer also authors its findings and its ship verdict. Only the
non-self-authorship matters, so the claim was restated without the count. This
is exactly the class the method warns it creates: a spanning claim sitting on
top of an exclusion nobody enumerated.

## Verified, not assumed

- `This file prints no reviewer's tool list` is a stated policy about the
  document, so it was run against the document. The only tool names remaining
  are `BashOutput`/`KillShell`/`Bash` in the example teaching what "looks like
  shell access" means — not any reviewer's list. Claim holds.
- `a name below` (item 1) still resolves: `feature-dev:code-reviewer` and
  `general-purpose` both appear below it.
- `item 4` still resolves to the prompt template, which still carries the
  execution log.
- `static read` is still defined at first use, now in the After-review bullet.
- No surviving references to `code-architect`, `same register`, `Tunnel vision`,
  `load-bearing one`, `most often gets skipped`, or `vouches for it`.

## Left standing, though it looked cuttable

- The `BashOutput`/`KillShell` passage — an example that teaches a term. Without
  it, "a tool list that looks like shell access" means nothing.
- "If that thought appears, treat it as the signal to delegate" — reads as
  commentary, acts as a detector.

## Recorded without a reason — do not invent one

The census requirement itself. After two adversarial defeats the file concedes
the census cannot be verified, so its justification is **not** "it proves the
check happened." It may be that requiring the writing-down causes the checking,
which would be a real mechanism, but that has never been articulated here and no
evidence for it exists. The rule stays; its reason is unstated, and this note is
the record of that rather than a sentence written into the slot.

---

# Second round — what the cold read cost

The compression pass took Step 2 from 149 to 132 lines. A cold reader given only
the skill then found nine correctness defects, and fixing them took it to 158.
**The section is longer than when the pass started.** That is the honest result:
compression removed 17 lines of story, and the repairs added 26 lines of rule.

Recorded here because a later reader comparing line counts will otherwise
conclude the pass failed.

## Defects the compression itself introduced

- **The page broke its own stated policy.** R1 replaced the dated tool-list
  block with "This file prints no reviewer's tool list" — twelve lines above a
  bullet reading "**A confidence-filtered reviewer** (e.g.
  `feature-dev:code-reviewer`) … Per the capability check above, pair it with an
  execution-capable reviewer." That instruction _is_ a hardcoded capability
  finding about a named agent. The name and the finding were removed.
- **"A name below" was left pointing at a list the page had just refused to
  have.** Reworded to "any reviewer name you carry in from habit."
- **"Two rules keep it useful anyway"** — rule 1 is a definition with a
  prohibition attached, not a rule about the census.

## Defects the compression exposed but did not cause

The largest: **the gate's test did not match the data the environment
supplies.** Item 1 said "read its tool list and look for `Bash`." Rosters answer
in four shapes — an explicit list, `*`, `All tools`, `All tools except …` — and
only the first contains the token. The cold reader concluded a reviewer was
capable _by inference_, which is the exact unverified assumption the census
exists to prevent, and noted the same inference in the census this project wrote
earlier the same day. Now stated per shape, with a third outcome: a roster that
states no capabilities at all means the check cannot be run, which is different
from no capable reviewer existing, and both stop.

Also fixed: a mandatory "reject at least one on capability grounds" that some
environments cannot satisfy, and so pressures inventing one; a full-tools
reviewer with no read-only constraint, free to edit the tree between here and
Step 8's landing checks; a paired read-only reviewer told to review
`git diff <base>..HEAD`, which it cannot run; a dual-review bullet that dropped
the execution-capable requirement stated in its own lead-in; two bullets
describing one dispatch.

## What the full re-read caught afterwards

Re-reading the whole file — not the section, not the diff — found four places
where the Step 2 fixes had gone stale elsewhere:

- **Common Mistakes still carried the replaced test** ("check the agent's tool
  list for `Bash`"), directly contradicting the new guidance one screen up.
- **Rule 1 still said "with the tool lists attached to them"** after the
  paragraph above it established that most rosters attach something else.
- **Step 2 claimed its census fields were "the same fields Step 4 and the Output
  section ask for."** They were not — Step 4 omitted where the roster was read.
  A manufactured quantifier, of the class this method is known to produce.
- **The look-alike warning had been orphaned** from the capability paragraph it
  belongs to, stranded between the census rules and a policy statement.

None of these was visible in the diff, and none was caught by the build,
validator or formatter.

## Over-strong claims corrected

- "The agent that wrote the code is the worst possible reviewer of it" —
  literally false; a reviewer with no context and no shell is worse, which is
  the failure the rest of the step prevents. Now "cannot be a fresh reader of
  it."
- "A run whose output contains no census skipped the gate" — asserted that
  missing output proves a missing action, two paragraphs after conceding the
  census is not proof. Now "has not shown the gate was run."
- "A skill has no agent type and no tool list, so the census has nothing to
  attach to" — conceded its own counterexample two sentences later, where the
  skill "ultimately dispatches" something. Reasoning restated.
- "The single most common failure mode" — frequency claim with no source.
