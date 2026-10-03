---
type: item
title: Handle tool-written folders in the v3.0 preflight
description:
  The v3.0 preflight stops once per file for folders a project's tools keep
  writing into, and the guide has no pattern for a standing output stream.
status: draft
lifecycle: triage
id: 01a10389-621b-739c-9901-e2863eeeba90
kind: task
generated: { by: claude-opus-5-5, at: 2026-10-03 }
source: "#200"
---

# Handle tool-written folders in the v3.0 preflight

media-forge's v2.10→v3.0 run (scaffold 8.1.0 → 9.4.0) stopped on 55 judgment
steps, 52 of them from three folders its own tools keep writing into:
`reports/model-cards/` (27 `*.json` drafts a CLI reads), `reports/model-scans/`
with a living `ledger.md`, and `reports/skill-feedback/`. The preflight prints
one "not a document this migration knows where to put" line per file, and the
guide's options (link to one investigation, move into a project's `reports/`,
delete as a process report) all assume a one-off report.

What worked: move each stream into `docs/projects/<slug>/{reports,artifacts}/`
before the run, so the run makes each a born item, then
`pdocs set item/<slug> --lifecycle active` and repoint the tools.

A second case: `investigations/artifacts/<file>.md`, a companion of one
investigation. Moving it into `docs/projects/<slug>/` collides with the research
item the run creates (`items/<slug>/`), so it was parked outside `docs/` and
moved into `items/<slug>/artifacts/` afterwards.

Reported in
[#200](https://github.com/ichabodcole/project-docs-scaffold-template/issues/200).

## Definition of done

- [ ] The preflight groups its not-a-document lines by folder, with a count.
- [ ] The v3.0 guide gives a pattern for a standing output stream: the pre-run
      move, and the after-run `set` that makes it an `active` item its tools
      write into.
- [ ] An `investigations/artifacts/` file that exactly one investigation links
      to lands in that research item's `artifacts/`, or the guide says how to
      park it.
