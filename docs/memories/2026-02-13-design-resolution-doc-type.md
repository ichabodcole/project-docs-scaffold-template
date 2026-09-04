---
type: memory
title: Added Design Resolution document type
description:
  A Design Resolution stage was added between proposal and plan, for the
  system-level questions a proposal leaves open.
tags: [documentation, document-types, design]
status: stable
generated: { by: unknown, at: 2026-02-13 }
---

# Added Design Resolution document type

Added an optional "Design Resolution" stage between Proposal and Plan in the
documentation pipeline. Includes a template, interactive Q&A skill, slash
command, and documentation updates across 15+ files. Also updated
`proposal-to-plan` to read `design-resolution.md` when present, and cleaned up
`marketplace.json` to remove duplicated metadata.

**Key files:** `docs/projects/TEMPLATES/DESIGN-RESOLUTION.template.md`,
`plugins/project-docs/skills/proposal-to-design-resolution/SKILL.md`,
`plugins/project-docs/commands/proposal-to-design-resolution.md`

**Docs:**
[Project folder](../projects/_archive/design-resolution-doc-type/proposal.md),
[Plugin README](../../plugins/project-docs/README.md)
