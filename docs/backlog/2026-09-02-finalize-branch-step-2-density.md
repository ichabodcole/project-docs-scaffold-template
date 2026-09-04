---
type: backlog
title: "`finalize-branch` Step 2 is 149 lines of argument for a short procedure"
description:
  finalize-branch Step 2 is 149 lines, most of it justification an executing
  agent has to read past to find the instruction.
status: stable
lifecycle: open
generated: { by: unknown, at: 2026-09-02 }
---

# `finalize-branch` Step 2 is 149 lines of argument for a short procedure

Step 2 now spans ~149 lines. Most of it is justification — why self-review
fails, why capability matters, why the census is testimony rather than proof,
where the check most often gets skipped. Each paragraph was added in response to
a real observed failure, and none is wrong. The problem is aggregate: the actual
procedure is short (census the roster, pick an execution-capable reviewer,
dispatch with the prompt template, demand an execution log), and it is now
buried in nested rationale two levels deep inside a bullet.

Flagged by an adversarial reviewer of the 3.4.0 gate, whose point was behavioral
rather than aesthetic: **a skimming executor reads nested justification as
commentary and skips it.** So the density is not merely verbose — it is a
plausible cause of the exact skip the section is written to prevent. The most
likely hurried failure it predicted is an executor that dispatches the familiar
reviewer first and back-fills a census, never carrying it into the session
document because the requirement reads as preamble.

Worth considering: split the operative procedure from the rationale, the way
Step 8 separates its runnable block from the paragraphs explaining why the
`-C "$ROOT"` anchor is load-bearing. A short numbered procedure up top, with the
"why" collected below or moved to the plugin README, would leave the instruction
skimmable without losing the reasoning that earned each rule.

Do not simply delete the rationale. Every paragraph in it corresponds to a
failure that actually happened, and the reasoning is why the rules survive
contact with an agent looking for a shortcut.

## Acceptance Criteria

- [ ] The operative procedure in Step 2 is readable without wading through the
      rationale, and is not nested more than one level deep
- [ ] No rule loses the reasoning that justifies it — relocated, not dropped
- [ ] A cold reader given only the skill still runs the census, rejects
      read-only reviewers, and demands an execution log

## References

- `plugins/project-docs/skills/finalize-branch/SKILL.md` — Step 2
- `plugins/project-docs/skills/finalize-branch/SKILL.md` — Step 8, for the
  procedure/rationale split worth copying
- Found while validating the 3.4.0 capability gate
