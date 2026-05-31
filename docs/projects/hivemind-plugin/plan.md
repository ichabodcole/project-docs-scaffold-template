# HiveMind Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone `hivemind` Claude Code plugin with four verb-split
skills (`hivemind-capture`, `hivemind-feedback`, `hivemind-consult`,
`hivemind-digest`) plus a shared Field Guide convention, implementing the
cross-project knowledge cycle (collect → digest → disperse) on top of the
Operator-backed HiveMind workspace.

**Architecture:** A new `plugins/hivemind/` plugin mirroring the existing plugin
shape (`.claude-plugin/plugin.json` + `skills/<name>/SKILL.md` + `references/`).
Skills are pure Agent-Skills-standard markdown (only `name` + `description`
frontmatter). A single Field Guide reference file is the source of truth for
HiveMind's document types, frontmatter, promotion ladder, and stable group-ID
map; it is also seeded into the live HiveMind `@operator` folder so HiveMind is
self-describing. The plugin is registered in the marketplace and built into
`dist/hivemind/` by the existing `build:dist` script.

**Tech Stack:** Markdown (SKILL.md, Agent Skills open standard); JSON
(plugin.json, marketplace.json); Bash build script
(`scripts/build-skills-dist.sh`, auto-discovers `plugins/*/`); Python validator
(`scripts/validate-skills-dist.py`); Prettier (markdown format gate); Operator
MCP (storage backbone, credentials via the `operator` plugin's `operator-setup`
skill).

---

## Conventions for this plan (read first)

This is a **skills-authoring** project, not application code. There is no unit
test runner. The repo's actual quality gates are the "tests" each task verifies
against:

- **Validator:** `npm run build:dist && npm run validate:skills` — every
  `SKILL.md` must have valid frontmatter, `name` matching its directory, a
  non-empty `description` ≤ 1024 chars, and **no** `color`/`model`/`tools`/
  `allowed-tools` fields (those break cross-tool compat).
- **Format gate:** `npm run format:check` (Prettier) — pre-commit hook enforces
  this; run `npm run format` to fix.
- **Structural assertions:** exact frontmatter and required section headings,
  checked by reading the file back.
- **Trigger-scenario check:** read the `description` and confirm it fires on the
  intended phrases and stays quiet on the near-misses listed per skill.

**Prose-authoring rule (DRY):** The full SKILL.md prose is authored during
execution using two existing skills as the canonical voice/structure models — do
**not** invent a new structure:

- Capture/feedback model: `capture-scenario` (in another project at
  `~/Projects/Observatories/Projectlore/.claude/skills/capture-scenario/SKILL.md`).
- Digest model: `incorporate-feedback` (same project,
  `.../incorporate-feedback/SKILL.md`).

Each task below specifies the **exact frontmatter**, the **required section
skeleton**, and the **non-discoverable load-bearing content** (group IDs, the
capture-vs-feedback rule, procedures). That is the contract; prose fills the
skeleton in the source skills' register.

**Non-discoverable-information rule (from HiveMind itself):** Skills must NOT
enumerate MCP tool names or hardcode env-var spellings. Refer to "the Operator
MCP (discover tool names from your runtime's tool documentation)" and "the
HiveMind credential in the local `.operator`, conventionally
`OPERATOR_HIVEMIND_ADMIN_*` — ask the user if absent." The load-bearing facts
that DO belong in the skills/Field Guide are the destination IDs below.

## Resolved open questions (defaults applied; flag if you disagree)

1. **Field Guide vs `@operator/context`:** Create the Field Guide as a **new,
   separate** document in the `@operator` folder; leave `context` as the short
   intro and add one pointer line to it. (Non-destructive.)
2. **`hivemind-consult` materialize target:** Playbooks → `docs/playbooks/`;
   scenarios/lessons → `docs/lessons-learned/`. **Copy with provenance**
   frontmatter (`hivemind_source_id`, `hivemind_retrieved` date), not a bare
   copy, so the local snapshot is traceable back to the live doc.
3. **Build order:** Field Guide + scaffold first → capture → feedback → consult
   → digest → finalize. (This plan's task order.)

> **Revision (during execution):** The `skills/_shared/field-guide.md` approach
> in the original plan breaks the skills validator — `validate-skills-dist.py`
> globs every `skills/*/` directory and requires a `SKILL.md` in each, so a
> `_shared` folder fails. **Resolution (user choice):** drop `_shared/` and
> place a copy of `field-guide.md` inside each of the four skill folders
> (`skills/hivemind-*/field-guide.md`). The **live HiveMind Field Guide doc**
> (Task 7.5) remains the canonical source of truth; the four in-repo copies are
> snapshots. Each SKILL.md references its sibling copy as `./field-guide.md`.
> The canonical text is saved at `/tmp/hivemind-field-guide.md` during this run.

## Live HiveMind facts (load-bearing, non-discoverable)

- **Project ID:** `bMxQv-R9IXHVl8jlACagv` (name: "Hivemind").
- **Folder group IDs (reference by ID, never by name):**
  - Playbooks — `R4uC0jYDig8_pylpkHTMP`
  - Feedback — `c1X2fuiDRd6i7AQfCVm84`
  - Scenarios — `9vDJ9VOBqgd0g6FEV0oQQ`
  - Lessons Learned — `25izJ8swJEYP0B23UhZz0`
  - @operator — `UerSKStBeWvJJ_im2tb0Q`
- **Per-type frontmatter (verified 2026-05-31):**
  - scenario: `type, date, source_project, slug`
  - feedback: `type, date, originated_in, tags` + optional
    `proposes, impact, generalization`
  - playbook: `type, status, tags, stack, applied_to, last_verified`

---

## File Structure

**Create:**

- `plugins/hivemind/.claude-plugin/plugin.json` — plugin manifest (name,
  version, description, author, license).
- `plugins/hivemind/README.md` — plugin overview + the knowledge-cycle concept.
- `plugins/hivemind/skills/hivemind-capture/SKILL.md` — scenario capture.
- `plugins/hivemind/skills/hivemind-feedback/SKILL.md` — skill/process feedback
  intake.
- `plugins/hivemind/skills/hivemind-consult/SKILL.md` — dispersal/read +
  principle-violation flagging + materialize.
- `plugins/hivemind/skills/hivemind-digest/SKILL.md` — triage/promote ("the
  stomach").
- `plugins/hivemind/skills/_shared/field-guide.md` — canonical convention
  reference (shared by all four skills via relative reference).

**Modify:**

- `.claude-plugin/marketplace.json` — register the `hivemind` plugin.

**Generated (do not hand-edit; produced by `build:dist`):**

- `dist/hivemind/` — built bundle (skills, openpackage.yml, README.md).

**External writes (Operator MCP, not files in this repo):**

- New "HiveMind Field Guide" document in the `@operator` folder (group
  `UerSKStBeWvJJ_im2tb0Q`).
- One pointer line appended to the existing `context` doc
  (`iR5sy-VsOKb6XFkeblRjx`).

> **Note on `_shared/`:** the build script copies `skills/` verbatim, so
> `skills/_shared/field-guide.md` ships in dist. The validator only inspects
> `*/skills/*/SKILL.md`, so a `_shared` folder without a SKILL.md is ignored by
> validation — safe. Skills reference it by relative path
> (`../_shared/field-guide.md`).

---

## Task 1: Plugin scaffold + marketplace registration

**Files:**

- Create: `plugins/hivemind/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Create the plugin manifest**

Create `plugins/hivemind/.claude-plugin/plugin.json`:

```json
{
  "name": "hivemind",
  "version": "0.1.0",
  "description": "Cross-project knowledge cycle — capture scenarios and feedback, consult accumulated knowledge, and digest it into playbooks. Operator-backed.",
  "author": {
    "name": "Cole Reed"
  },
  "homepage": "https://github.com/ichabodcole/project-docs-scaffold-template",
  "repository": "https://github.com/ichabodcole/project-docs-scaffold-template",
  "license": "MIT"
}
```

- [ ] **Step 2: Register the plugin in the marketplace**

In `.claude-plugin/marketplace.json`, add this object to the `plugins` array
(after the `agent-bridge` entry):

```json
{
  "name": "hivemind",
  "source": "./plugins/hivemind",
  "category": "knowledge",
  "tags": [
    "hivemind",
    "cross-project",
    "knowledge-sharing",
    "playbooks",
    "feedback"
  ]
}
```

- [ ] **Step 3: Verify JSON is well-formed**

Run:
`python3 -c "import json; json.load(open('.claude-plugin/marketplace.json')); json.load(open('plugins/hivemind/.claude-plugin/plugin.json')); print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add plugins/hivemind/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "feat(hivemind): scaffold plugin manifest + marketplace registration"
```

---

## Task 2: Field Guide convention reference

The single source of truth for HiveMind's document model. All four skills read
it. Authored as a plugin reference file now; seeded into live HiveMind in Task
7.5.

**Files:**

- Create: `plugins/hivemind/skills/_shared/field-guide.md`

- [ ] **Step 1: Write the Field Guide**

Create `plugins/hivemind/skills/_shared/field-guide.md` with these required
sections (content specified — this file IS the deliverable, author in full):

1. **`# HiveMind Field Guide`** + one-paragraph statement that HiveMind is the
   cross-project knowledge base (collect → digest → disperse) and that the live
   workspace is the source of truth; this file documents its conventions.

2. **`## Document types`** — a table with exactly these four rows: | Type |
   Folder | What it is | Bar |
   - **scenario** — Scenarios — a human↔agent decision/thinking delta from
     implementation work, distilled into a named reusable takeaway — high
     ("worth re-reading in six months").
   - **feedback** — Feedback — a signal about a skill/process/mechanism, often
     from an end-of-run feedback touchpoint, aimed at improving the tool/process
     — lower; hypothesis-shaped/single-instance OK.
   - **playbook** — Playbooks — an abstracted, reusable how-to validated across
     projects — promoted, not authored directly.
   - **lessons-learned** — Lessons Learned — an issue→resolution writeup or a
     synthesis across scenarios — promoted via digest.

3. **`## Capture vs. feedback`** — state the distinction by **subject, not
   maturity**: capture = how to _think_ (a human↔agent decision delta during
   implementation); feedback = how a _tool/process performed_ and how to improve
   it (often surfaced at a skill's end-of-run touchpoint). Include one example
   of each.

4. **`## Scenarios are principles`** — there is no Principles folder; named
   scenarios serve as reusable principles. Digest promotes patterns _across_
   scenarios into Playbooks or Lessons Learned.

5. **`## Promotion ladder`** — feedback → (validated ≥2 projects) → playbook;
   feedback/scenarios → (synthesis) → lessons-learned; scenarios stand alone as
   principles. Triage is judgment-based, not a fixed count (borrowed from the
   `incorporate-feedback` bar-for-inclusion).

6. **`## Frontmatter by type`** — exact YAML blocks:

   ```yaml
   # scenario
   type: scenario
   date: <YYYY-MM-DD>
   source_project: <project label>
   slug: <kebab-case-takeaway>
   ```

   ```yaml
   # feedback
   type: feedback
   date: <YYYY-MM-DD>
   originated_in: [<project>]
   tags: [<...>]
   # optional: proposes, impact, generalization
   ```

   ```yaml
   # playbook
   type: playbook
   status: stable | draft
   tags: [<...>]
   stack: [<...>]
   applied_to: [<project>, ...]
   last_verified: <YYYY-MM-DD>
   ```

7. **`## Stable group-ID map`** — the project ID and five folder group IDs from
   the "Live HiveMind facts" section above. Note: **always reference by ID**; if
   an ID fails to resolve the folder was changed — surface to the user, do not
   recreate.

8. **`## Slug rules`** — kebab-case, 4–7 words, names the _takeaway_ not the
   situation; document filename `<YYYY-MM-DD>-<slug>.md` for scenarios.

9. **`## Credentials & access`** — Operator MCP via the `operator-setup` flow;
   look for the HiveMind key in the local `.operator` (conventionally
   `OPERATOR_HIVEMIND_ADMIN_*` — treat as a local convention, ask if absent). Do
   not enumerate MCP tool names; discover them from the runtime.

- [ ] **Step 2: Verify structure**

Run: `grep -c '^## ' plugins/hivemind/skills/_shared/field-guide.md` Expected:
`8` (eight `##` sections under the title).

Run:
`grep -F 'bMxQv-R9IXHVl8jlACagv' plugins/hivemind/skills/_shared/field-guide.md`
Expected: the project ID line prints (group-ID map present).

- [ ] **Step 3: Format**

Run: `npm run format` Expected: completes; field-guide.md normalized.

- [ ] **Step 4: Commit**

```bash
git add plugins/hivemind/skills/_shared/field-guide.md
git commit -m "feat(hivemind): add Field Guide convention reference"
```

---

## Task 3: Verify scaffold builds and validates

Confirms the empty plugin (manifest + shared reference, no skills yet) is
discovered and the build is green before adding skills.

**Files:** none (build verification only)

- [ ] **Step 1: Build the dist bundle**

Run: `npm run build:dist` Expected: output includes
`=== Packaging: hivemind ===`. (Skill count 0 is fine at this stage.)

- [ ] **Step 2: Confirm hivemind dist was generated**

Run: `ls dist/hivemind/` Expected: `README.md  openpackage.yml  skills` (skills
contains `_shared/`).

- [ ] **Step 3: Validate**

Run: `npm run validate:skills` Expected: exits 0. (No `hivemind` SKILL.md yet,
so nothing under hivemind to fail; other plugins still `OK`.)

- [ ] **Step 4: Commit the generated dist**

```bash
git add dist/hivemind
git commit -m "build(hivemind): generate initial dist bundle"
```

---

## Task 4: `hivemind-capture` skill (scenarios)

Generalizes the `capture-scenario` source skill. Captures a human↔agent
decision/thinking delta as a named scenario in HiveMind.

**Files:**

- Create: `plugins/hivemind/skills/hivemind-capture/SKILL.md`

- [ ] **Step 1: Write the SKILL.md frontmatter (exact)**

```yaml
---
name: hivemind-capture
description:
  Capture a human↔agent decision or thinking delta that surfaced during
  implementation work as a named scenario in HiveMind (the cross-project
  knowledge base). Use when the user pushes back on the agent's approach, a
  non-obvious decision gets made, or a lens-shift emerges — and there's a
  model-level takeaway worth preserving across projects. Triggers explicitly on
  "capture this scenario", "capture this moment", "this is a scenario worth
  capturing", "add this to HiveMind". Also fires in suggested mode when a
  substantive disagreement is resolved with reasoning — agent proposes and fires
  only if the user agrees. Writes to the HiveMind Scenarios folder via Operator
  MCP. Does NOT handle skill/process feedback (use hivemind-feedback) or
  cross-document synthesis (use hivemind-digest).
---
```

- [ ] **Step 2: Author the body from the `capture-scenario` model**

Required sections (author prose in the source skill's register; preserve its
two-trigger-mode structure and the scenario file shape):

- `# HiveMind Capture` — one-paragraph purpose.
- `## When to use` / `## When NOT to use` — port from source; add the explicit
  contrast: this is a _decision/thinking delta_, not a skill/process signal
  (that's `hivemind-feedback`).
- `## Two trigger modes` — explicit + suggested (port from source).
- `## Phases` — Recognize → Capture → Distill (align with user; Digestify if
  available, else chat) → Route → Report.
- `## Scenario file shape` — the markdown block with scenario frontmatter
  (`type/date/source_project/slug`) and sections Context / The delta / The
  resolution / Synthesis / Related.
- `## Reading the Field Guide` — at preflight, read `../_shared/field-guide.md`
  for the destination IDs and frontmatter; prefer the live HiveMind Field Guide
  doc when reachable.
- `## What this skill needs` — Operator MCP w/ HiveMind write scope (discover
  tool names from runtime); credential per Field Guide; Digestify optional.
- `## Edge cases` — port from source (auth fail → keep draft; suggested declined
  → drop; scenario already exists → sharpen not duplicate).

Load-bearing content that MUST appear: destination = Scenarios group
`9vDJ9VOBqgd0g6FEV0oQQ` in project `bMxQv-R9IXHVl8jlACagv`; document name
`<YYYY-MM-DD>-<slug>.md`; reference folder by ID; on unresolved ID, surface and
stop.

- [ ] **Step 3: Build + validate**

Run: `npm run build:dist && npm run validate:skills` Expected: line
`OK   hivemind/skills/hivemind-capture/SKILL.md`; overall exit 0.

- [ ] **Step 4: Trigger-scenario check**

Read the `description`. Confirm it WOULD fire on: "capture this scenario",
"that's a delta worth keeping in HiveMind". Confirm it would NOT fire on: "log a
bug" (backlog), "the skill was confusing to use" (that's `hivemind-feedback`).
If the description fires on a near-miss, tighten it.

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add plugins/hivemind/skills/hivemind-capture/SKILL.md dist/hivemind
git commit -m "feat(hivemind): add hivemind-capture skill"
```

---

## Task 5: `hivemind-feedback` skill (skill/process signals)

New skill. Files a skill/process/mechanism signal — typically from an end-of-run
feedback touchpoint — into HiveMind Feedback.

**Files:**

- Create: `plugins/hivemind/skills/hivemind-feedback/SKILL.md`

- [ ] **Step 1: Write the SKILL.md frontmatter (exact)**

```yaml
---
name: hivemind-feedback
description:
  File a signal about a skill, process, or mechanism into HiveMind's Feedback
  folder (the cross-project knowledge base). Use at the end of a skill run, or
  whenever a tool or process was rough, surprising, or improvable — the goal is
  to improve the tool/process itself, not to capture a way of thinking. Triggers
  on "file HiveMind feedback", "log feedback on this skill", "any issues using
  this skill", "send this to HiveMind feedback", and at a skill's end-of-run
  feedback touchpoint. Often hypothesis-shaped or single-instance. Writes via
  Operator MCP. Does NOT capture human↔agent decision deltas (use
  hivemind-capture) or promote feedback into playbooks (use hivemind-digest).
---
```

- [ ] **Step 2: Author the body**

Required sections (capture→align→write flow, lighter than capture):

- `# HiveMind Feedback` — purpose: improve a skill/process/mechanism.
- `## When to use` / `## When NOT to use` — emphasize the subject contrast vs
  `hivemind-capture`; this is about how a tool performed.
- `## Phases` — Observe (what was rough / surprising / improvable) → Draft →
  Align (optional, lighter than capture) → Route → Report.
- `## Feedback file shape` — markdown block with feedback frontmatter
  (`type/date/originated_in/tags` + optional `proposes/impact/generalization`)
  and sections: The observation / Why it matters / Generalizable claim (if any)
  / Proposes (optional) / Status.
- `## Reading the Field Guide` — preflight read of `../_shared/field-guide.md`.
- `## What this skill needs` — Operator MCP HiveMind write scope; credential per
  Field Guide.
- `## Edge cases` — auth fail → keep draft; nothing meets the bar → empty is the
  right output (skip silently).

Load-bearing content that MUST appear: destination = Feedback group
`c1X2fuiDRd6i7AQfCVm84` in project `bMxQv-R9IXHVl8jlACagv`; reference by ID;
unresolved ID → surface and stop.

- [ ] **Step 3: Build + validate**

Run: `npm run build:dist && npm run validate:skills` Expected:
`OK   hivemind/skills/hivemind-feedback/SKILL.md`; exit 0.

- [ ] **Step 4: Trigger-scenario check**

WOULD fire: "any issues using this skill?", "log feedback on the digest skill".
Would NOT fire: "capture this decision" (capture), "what does HiveMind know
about X" (consult). Tighten if it overlaps capture.

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add plugins/hivemind/skills/hivemind-feedback/SKILL.md dist/hivemind
git commit -m "feat(hivemind): add hivemind-feedback skill"
```

---

## Task 6: `hivemind-consult` skill (dispersal/read + flag + materialize)

New skill. The read direction: pull relevant HiveMind knowledge into the current
project, flag work that violates a known principle, optionally materialize a doc
into local `docs/`.

**Files:**

- Create: `plugins/hivemind/skills/hivemind-consult/SKILL.md`

- [ ] **Step 1: Write the SKILL.md frontmatter (exact)**

```yaml
---
name: hivemind-consult
description:
  Consult HiveMind (the cross-project knowledge base) from inside a working
  project — find and apply relevant playbooks, scenarios, and feedback for the
  task at hand, and flag when current work runs afoul of a principle HiveMind
  already recorded. Triggers on "what does HiveMind know about X", "check this
  against HiveMind", "is there a playbook for X", "consult HiveMind", "are we
  breaking anything we've learned". Searches via Operator MCP by frontmatter and
  content. Can materialize a playbook or principle into the project's local
  docs/ with provenance. Does NOT write new knowledge to HiveMind (use
  hivemind-capture/hivemind-feedback) or promote/triage (use hivemind-digest).
---
```

- [ ] **Step 2: Author the body**

Required sections:

- `# HiveMind Consult` — purpose: dispersal/read direction.
- `## When to use` — starting a known kind of activity; checking current work;
  looking for a prior solution.
- `## Modes` —
  - **Pull** — given the activity, search HiveMind (by `type`, `tags`, `stack`,
    `applied_to`, and content) and surface the most relevant entries; apply
    them.
  - **Guardrail** — compare current work against recorded scenarios/principles
    and flag violations (worked example: a skill draft restating discoverable
    tool names violates `only-include-non-discoverable-information`).
  - **Materialize** — copy a playbook → `docs/playbooks/`, a scenario/lesson →
    `docs/lessons-learned/`, adding provenance frontmatter:
    ```yaml
    hivemind_source_id: <doc id>
    hivemind_retrieved: <YYYY-MM-DD>
    ```
- `## Reading the Field Guide` — preflight read for group IDs + search fields.
- `## What this skill needs` — Operator MCP HiveMind **read** scope; credential
  per Field Guide.
- `## Edge cases` — no relevant entries (say so plainly); auth fail (degrade to
  "couldn't reach HiveMind"); materialize target folder missing (create or ask).

Load-bearing content that MUST appear: search across all five folders by ID; the
three example scenario slugs as known principles to check against
(`only-include-non-discoverable-information`,
`affirmative-scope-over-defensive-exclusion`,
`intentional-design-for-feedback-loops`).

- [ ] **Step 3: Build + validate**

Run: `npm run build:dist && npm run validate:skills` Expected:
`OK   hivemind/skills/hivemind-consult/SKILL.md`; exit 0.

- [ ] **Step 4: Trigger-scenario check**

WOULD fire: "what does HiveMind know about Bun migration", "check this skill
against what we've learned". Would NOT fire: "capture this", "file feedback".

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add plugins/hivemind/skills/hivemind-consult/SKILL.md dist/hivemind
git commit -m "feat(hivemind): add hivemind-consult skill"
```

---

## Task 7: `hivemind-digest` skill (the stomach)

New skill. Adapts the `incorporate-feedback` methodology, retargeted from local
files to HiveMind documents. Triage Feedback + Scenarios, propose promotions.

**Files:**

- Create: `plugins/hivemind/skills/hivemind-digest/SKILL.md`

- [ ] **Step 1: Write the SKILL.md frontmatter (exact)**

```yaml
---
name: hivemind-digest
description: Digest accumulated HiveMind knowledge (the cross-project knowledge base) — triage the Feedback and Scenarios folders, cluster by emergent theme, run a generalization pass, and propose promotions into Playbooks or Lessons Learned. Triggers on "digest HiveMind", "process the HiveMind backlog", "triage HiveMind feedback", "what should we promote in HiveMind", "synthesize HiveMind". Triage-and-propose, not triage-and-apply: surfaces a review-ready proposal for the user before writing. Reads/writes via Operator MCP. Does NOT capture new scenarios/feedback (use hivemind-capture/hivemind-feedback) or apply knowledge into a project (use hivemind-consult).
---
```

- [ ] **Step 2: Author the body from the `incorporate-feedback` model**

Required sections (port the method; swap targets from local files to HiveMind):

- `# HiveMind Digest` — purpose: the refinement/promotion step.
- `## Why this skill exists` — feedback/scenarios accumulate; promotion needs
  judgment, not rubber-stamping.
- `## The three phases` — Triage & propose → Review & align → Apply, archive,
  calibrate (port from source).
- `## Bar for inclusion` — judgment-not-count (port verbatim in spirit: does the
  general claim help the next project; load-bearing n=1 OK).
- `## Promotion targets` — validated-across-≥2-projects feedback → Playbook
  (`applied_to` warrant, `last_verified`); scenario/feedback cluster → Lessons
  Learned synthesis; mark promoted-from sources (e.g. add a note/frontmatter
  pointer rather than deleting).
- `## Reading the Field Guide` — preflight read; uses the promotion ladder.
- `## What this skill needs` — Operator MCP HiveMind read+write scope.
- `## Procedure (compact)` — numbered, mirroring the source's step list but over
  HiveMind folders (inventory Feedback+Scenarios by ID → read → cluster →
  generalization pass → propose → user review → apply promotions → report).
- `## Edge cases` — first run (nothing to promote yet is fine); auth fail;
  conflicting signals across docs (surface explicitly).

Load-bearing content that MUST appear: source folders Feedback
`c1X2fuiDRd6i7AQfCVm84` + Scenarios `9vDJ9VOBqgd0g6FEV0oQQ`; promotion targets
Playbooks `R4uC0jYDig8_pylpkHTMP` + Lessons Learned `25izJ8swJEYP0B23UhZz0`;
reference by ID; triage-and-propose (never auto-write promotions without
review).

- [ ] **Step 3: Build + validate**

Run: `npm run build:dist && npm run validate:skills` Expected:
`OK   hivemind/skills/hivemind-digest/SKILL.md`; exit 0.

- [ ] **Step 4: Trigger-scenario check**

WOULD fire: "process the HiveMind backlog", "what should we promote". Would NOT
fire: "capture this", "consult HiveMind".

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add plugins/hivemind/skills/hivemind-digest/SKILL.md dist/hivemind
git commit -m "feat(hivemind): add hivemind-digest skill"
```

---

## Task 7.5: Seed the Field Guide into live HiveMind

Makes HiveMind self-describing. Uses Operator MCP (not repo files). Requires a
live HiveMind admin session.

**Files:** none (Operator MCP writes)

- [ ] **Step 1: Authenticate**

Use the `operator-setup` flow with the HiveMind admin key from the local
`.operator`. Confirm the session resolves project `bMxQv-R9IXHVl8jlACagv`.

- [ ] **Step 2: Create the Field Guide document in @operator**

Create a document in group `UerSKStBeWvJJ_im2tb0Q` titled
`HiveMind Field Guide`, body = the content of
`plugins/hivemind/skills/_shared/field-guide.md` (adapt the "this file" framing
to "this document"; this live copy is the canonical source of truth).

- [ ] **Step 3: Add a pointer to the context doc**

Append one line to the `context` doc (`iR5sy-VsOKb6XFkeblRjx`):
`See the **HiveMind Field Guide** (this folder) for document types, frontmatter, and the promotion ladder.`

- [ ] **Step 4: Verify**

Browse group `UerSKStBeWvJJ_im2tb0Q`. Expected: two documents — `context` and
`HiveMind Field Guide`.

- [ ] **Step 5: Note completion** (no repo commit — external write)

Record the new Field Guide doc ID in the session notes for later reference.

---

## Task 8: Plugin README + final build, validate, format

**Files:**

- Create: `plugins/hivemind/README.md`

- [ ] **Step 1: Write the plugin README**

Create `plugins/hivemind/README.md` covering: the knowledge-cycle concept
(collect → digest → disperse); the four skills (one line each); the Field Guide;
Operator dependency + credential note; that HiveMind is concept-not-Operator and
may be extracted later. Match the tone of `plugins/operator/` docs.

- [ ] **Step 2: Full build**

Run: `npm run build:dist` Expected: summary shows `hivemind` with `Skills: 4`.

- [ ] **Step 3: Validate all skills**

Run: `npm run validate:skills` Expected: four `OK hivemind/...` lines; final
`All N skills passed validation`; exit 0.

- [ ] **Step 4: Format check**

Run: `npm run format:check` Expected: passes (run `npm run format` first if
needed).

- [ ] **Step 5: Confirm dist contents**

Run: `ls dist/hivemind/skills/` Expected:
`_shared  hivemind-capture  hivemind-consult  hivemind-digest  hivemind-feedback`.

- [ ] **Step 6: Commit**

```bash
npm run format
git add plugins/hivemind/README.md dist/hivemind
git commit -m "feat(hivemind): add plugin README and finalize dist bundle"
```

---

## Task 9: Update project tracking + session note

**Files:**

- Create:
  `docs/projects/hivemind-plugin/sessions/<YYYY-MM-DD>-implementation.md`
- Modify: `docs/projects/hivemind-plugin/proposal.md` (status →
  Approved/Completed)

- [ ] **Step 1: Flip proposal status**

In `docs/projects/hivemind-plugin/proposal.md` change `**Status:** Draft` to
`**Status:** Completed` (or `Approved` if any follow-up remains).

- [ ] **Step 2: Write a session note**

Create `docs/projects/hivemind-plugin/sessions/<YYYY-MM-DD>-implementation.md`
summarizing: what shipped (plugin + 4 skills + Field Guide), the live Field
Guide doc ID, any open follow-ups (e.g. proactive consult hooks, Principles
tier, cross-agent dist verification).

- [ ] **Step 3: Format + commit**

```bash
npm run format
git add docs/projects/hivemind-plugin
git commit -m "docs(hivemind-plugin): record implementation session, mark proposal complete"
```

---

## Self-Review (completed during planning)

**Spec coverage:** standalone plugin → Task 1; four skills → Tasks 4–7; Field
Guide → Tasks 2 + 7.5; capture-vs-feedback-by-subject → Tasks 4/5 + Field Guide;
scenarios-as-principles → Field Guide; consult flag + materialize → Task 6;
digest from incorporate-feedback method → Task 7; cross-cutting (credential
discovery, group-ID references, graceful degradation, non-discoverable-info) →
baked into every skill task + Field Guide; dist/marketplace → Tasks 1, 3, 8;
success criteria (installable, capture lands correctly, consult flags, digest
proposes, single-source Field Guide) → covered by Tasks 3/8 build+validate and
the per-skill structure. **Open-question resolutions** are stated explicitly up
top. No spec requirement left without a task.

**Placeholder scan:** no TBD/TODO. The SKILL.md prose is intentionally authored
during execution against named source models (a DRY decision, not a placeholder)
— each task pins exact frontmatter, required headings, and load-bearing IDs.

**Type/identifier consistency:** the five group IDs, project ID, skill names,
and folder names are identical everywhere they appear (Field Guide, every skill
task, digest targets). Skill `name` matches its directory in all four cases.

```

```
