---
type: item
title: Say where a process report goes now
description:
  The migration guide says to delete process reports, but SCHEMA.md and the
  reports guidance don't say that a docs-review or project-summary report
  belongs in the PR or session, not the tree.
status: draft
lifecycle: triage
id: 01a0ee55-c937-7490-a516-1fd504d0cf12
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-29 }
scope: docs
source: "grapevine project-docs-v9 #17"
---

# Say where a process report goes now

The v3.0 migration guide tells an adopter to fold and delete process reports (a
docs review's status report, a project summary's discovery notes), because
9.0.0's skills write none and a report is evidence owned by work. `SCHEMA.md`
and the reports guidance don't say so, so a project that writes one after the
migration has nothing telling it where it belongs. Story-loom asked.

## Definition of done

- [ ] `SCHEMA.md` or the relevant README says in one sentence that a process
      report belongs in the PR or the session, not the tree, in this repository
      and the payload.
