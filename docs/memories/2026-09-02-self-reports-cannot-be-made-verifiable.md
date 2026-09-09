---
type: memory
title: A self-report can't be made verifiable by constraining its wording
description:
  Constraining how an agent words a self-report does not make the report
  verifiable; only checking the capability does.
tags: [skills, finalize-branch, verification]
status: stable
generated: { by: unknown, at: 2026-09-02 }
---

# A self-report can't be made verifiable by constraining its wording

Shipped project-docs 3.4.0, hardening `finalize-branch` Step 2's
reviewer-capability check. The durable lesson is the failure path, not the
feature.

The check verifies a dispatched code reviewer has shell access, because a
read-only reviewer produces a static read that looks like a verified review. It
**failed open** — skip it and nothing downstream can tell. Fixing that took
three attempts, and the first two were the same mistake: requiring the executor
to _report_ what it checked, then adding constraints on how that report must be
phrased. An adversarial reviewer defeated both by writing a fully compliant
report without inspecting anything, and named the reason: **the agent roster
lives in the executor's own context, so reading it costs no tool call and leaves
no trace.** No rule about phrasing can distinguish a real check from an invented
one when the action itself is unobservable.

The fix was structural, not verbal: move the evidence to an artifact the
claimant does not author. The dispatched reviewer is now required to report the
commands it actually ran, and every downstream claim quotes that log instead of
inferring execution from the presence of `Bash`. Having a tool and using it are
different claims; only the second is a review.

Two generalizations worth carrying:

- **Ask a reviewer to break the thing, not to check it.** "Confirm this works"
  returns a pass. "Construct output that looks compliant while verifying
  nothing" returned two defeats and the insight behind both, at no extra cost.
- **An anti-fabrication rule can teach fabrication.** One dropped constraint
  required naming a reviewer the skill didn't list — which forced padding the
  census with agents nobody would dispatch, purely to demonstrate diligence.

Incidental but useful: `allowed_tools` in this repo's skill frontmatter is **not
read** — the canonical key is `allowed-tools`, the marketplace installs from
`plugins/` rather than `dist/`, and `scripts/validate-skills-dist.py` rewrites
the key on the way into `dist/`. That also makes `npm run validate:skills` a
mutating normalizer rather than a read-only check.

**Key files:** `plugins/project-docs/skills/finalize-branch/SKILL.md` (Step 2),
`scripts/validate-skills-dist.py`

**Docs:**
[session](../projects/finalize-branch-hardening/sessions/2026-09-02-reviewer-capability-hard-gate.md)
— full account of both defeats; related to
[2026-09-02 fail-open checks](./2026-09-02-completion-marks-and-silent-permissive-checks.md),
which is the same bug class found earlier the same day in the same file
