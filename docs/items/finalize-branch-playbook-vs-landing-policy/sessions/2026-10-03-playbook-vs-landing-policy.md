---
type: session
title: Finalization playbook vs landing policy — 2026-10-03
description:
  A branch-finalization playbook no longer relaxes the independent review, and
  the project's Branch Landing Policy wins landing over it, announced.
tags: [project-docs, skills, landing]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-03 }
---

# Finalization playbook vs landing policy — 2026-10-03

Part of
[check and upgrade-skill fixes](../../../cycles/_archive/2026-10-check-and-upgrade-fixes.md)

## Context

In operator-mono a pre-9.x `branch-finalization-playbook.md` mandated
self-review and always-squash, while root `AGENTS.md` had just gained a
`## Branch Landing Policy` saying to keep commits that each deliver value
([#199](https://github.com/ichabodcole/project-docs-scaffold-template/issues/199)).
finalize-branch's override paragraph said the playbook takes precedence wherever
the two differ, so followed literally the run would have skipped the independent
review and squashed against the policy.

## What Happened

- **Two things a playbook never overrides.** The override paragraph says Step
  2's independent review runs whatever the playbook says, and the landing policy
  governs landing, pointing at Step 8 for where to find it and what to do on a
  disagreement. Step 2's opening repeats the first.
- **Step 8 looked in the wrong order.** It took the playbook first and the
  `## Branch Landing Policy` heading only "otherwise", the operator-mono failure
  exactly. The heading is looked up first now; the playbook applies when there
  is none; and when both exist and disagree, the heading is the policy and the
  agent tells the user what each says before landing. A project with a playbook
  and no heading behaves as before.
- The Output section asks the run to report a disagreement.
- dev-kickoff and the handoff override needed nothing. What is left — a stale
  playbook's other content, the release playbook, the payload's playbooks
  README, and whether an upgrade should flag stale playbooks — is filed as
  [a follow-up](../../stale-lifecycle-playbooks-after-upgrade.md).

## Verification

- The gate passed on both commits, with 1,587 tests, and the dist check is
  clean.

## Review

Census, read from this session's list of dispatchable agent types (the Agent
tool's roster):

- **`general-purpose`** (Tools: `*`) has shell access. Chosen, briefed for this
  branch, as the review of record.
- **`feature-dev:code-reviewer`** lists Glob, Grep, LS, Read, NotebookRead,
  WebFetch, TodoWrite, WebSearch, KillShell and BashOutput, with no `Bash`.
  Rejected on capability.
- **`code-simplifier:code-simplifier`** and **`project-docs:docs-curator`** (All
  tools) have shell access. Rejected on fit.

**Verdict: "Ready to merge: Yes".** It built three projects from the template —
a stale playbook and a landing policy, a playbook only, a policy only — ran Step
8's lookups in each, and cold-read the skill for what an agent would do at Steps
2 and 8. The review ran in every case; the policy won in the first, with the
disagreement announced; the playbook-only case was unchanged. It also wrote a
session where the stale playbook says and showed `pdocs check` fails on it, and
ran the dist check and the gate (1,587 pass).

Of its optional points, the duplicated disagreement wording was fixed (the
override paragraph points at Step 8), checked by the gate; the other three are
the follow-up item.

---

**Related Documents:**

- [Stop a stale finalization playbook overriding the landing policy](../item.md)
