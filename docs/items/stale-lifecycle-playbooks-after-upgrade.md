---
type: item
title: Help a project notice a stale lifecycle playbook
description:
  After an upgrade, a lifecycle-override playbook can name retired paths or a
  merge rule the landing policy now beats, and nothing points it out.
status: draft
lifecycle: triage
id: 01a10418-32d1-7462-a753-1f06fd1b1f93
kind: task
generated: { by: claude-opus-5-5, at: 2026-10-03 }
from: items/finalize-branch-playbook-vs-landing-policy/sessions/2026-10-03-playbook-vs-landing-policy.md
---

# Help a project notice a stale lifecycle playbook

Left over from
[the playbook vs landing policy fix](./finalize-branch-playbook-vs-landing-policy/sessions/2026-10-03-playbook-vs-landing-policy.md)
(#199). finalize-branch now keeps the independent review and lets the
`## Branch Landing Policy` win landing, but the rest of a stale playbook still
governs, and three gaps remain:

- **A stale session location fails the gate with no direction.** A pre-9.x
  playbook that says to write sessions in `docs/sessions/` produces a session
  `pdocs check` reports as `WRONG TYPE` and `ORPHAN` (exit 9) at finalize-branch
  Step 7. Loud, but nothing says the playbook is the cause.
- **`release-playbook.md` at Step 8 "takes precedence over the strategies
  below"**, which does not say whether it or the landing policy wins when it
  prescribes how a branch merges.
- **The payload's `docs/playbooks/README.md`** ("Overriding a lifecycle skill")
  still says an override is followed instead of the skill's steps, and suggests
  one for a different merge strategy, which a landing-policy heading now beats.

Cost, from the implementer: a few lines of guide text in the v2.10-to-v3.0
guide's "After the script" (grep the lifecycle-override playbooks for retired
folders), or 30–50 lines as a check in `migrate-v2.10-to-v3.0.ts` with a test.

## Definition of done

- [ ] An upgrade points out a lifecycle-override playbook that names a retired
      folder (guide text or a migration check).
- [ ] Step 8 says the landing policy still decides how a branch merges when a
      release playbook also prescribes it.
- [ ] The playbooks README says the review and the landing policy are not
      overridden.

## Related Documents

- [Finalization playbook vs landing policy — 2026-10-03](./finalize-branch-playbook-vs-landing-policy/sessions/2026-10-03-playbook-vs-landing-policy.md)
