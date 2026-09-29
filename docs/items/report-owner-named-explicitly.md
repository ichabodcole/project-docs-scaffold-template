---
type: item
title:
  The v3.0 preflight lets a report name its owner when it links to two
  investigations
description:
  A report linked with two investigations stops the preflight, and the only fix
  is editing its prose, because the rule decides only when the report links to
  exactly one.
status: draft
lifecycle: triage
id: 01a0ee55-545e-709b-987e-00f929f56189
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-29 }
scope: migrations
---

# The v3.0 preflight lets a report name its owner when it links to two investigations

The preflight gives a report to the one investigation it is linked with, and
stops when two are. The guide's fix is to add a link from the report to its
owner, which decides "whatever else links to the report", but only if the report
links to exactly one investigation. Story-loom's report already linked both, in
a "Related material" line, so adding a `For […]` line changed nothing. It had to
unlink one investigation for the run and restore it afterwards.

## Definition of done

- [ ] A report can name its owner explicitly (a `For [x](…)` line under its
      heading that wins over plain body links, or a frontmatter key), the
      preflight honours it, and the guide says how. Tested with a report linking
      two investigations.
