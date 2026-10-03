---
type: item
title: Stop a stale finalization playbook overriding the landing policy
description:
  finalize-branch follows a branch-finalization playbook even when it predates
  the skill and contradicts the project's Branch Landing Policy or skips the
  independent review.
status: stable
lifecycle: ready
id: 01a0ff09-ebc0-738b-8313-cba708160cb6
kind: task
generated: { by: claude-opus-5-5, at: 2026-10-02 }
source: "#199"
priority: medium
cycle: 2026-10-check-and-upgrade-fixes
---

# Stop a stale finalization playbook overriding the landing policy

finalize-branch follows `docs/playbooks/branch-finalization-playbook.md` over
its own steps even when the playbook predates the skill. In operator-mono a
pre-9.x playbook mandated self-review, `pnpm`, sessions in `docs/sessions/` and
always-squash, while root `AGENTS.md` had just gained a Branch Landing Policy
saying to keep commits that each deliver value. Followed literally, the run
would have skipped the independent review and squashed against the policy.

Reported in
[#199](https://github.com/ichabodcole/project-docs-scaffold-template/issues/199).

## Definition of done

- [ ] When a playbook and a `## Branch Landing Policy` disagree, finalize-branch
      says so before following either, and the policy governs landing.
- [ ] No playbook relaxes Step 2's independent review.
- [ ] Decide at triage whether update-project-docs should flag a finalization
      playbook that names retired paths.
