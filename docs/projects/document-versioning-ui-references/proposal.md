# Document Versioning UI References

**Status:** Draft **Created:** 2026-03-11 **Author:** Cole Reed

---

## Overview

Add HTML mockup prototypes as visual references to the `document-versioning`
recipe skill. The skill describes dropdown menus, dialog boxes, a version
management panel, and limit/upgrade states in prose, which leads to inconsistent
implementations.

## Proposed Solution

Create self-contained HTML mockup prototypes (using the
`html-mockup-prototyping` skill) that serve as visual references for the
document versioning UI components. These prototypes will be added to a
`references/` directory within the skill folder, and the skill's prose will
reference them as the canonical UI starting point.

## Scope

**In Scope:**

- Screenshot review of existing implementations for reference
- HTML mockup prototypes for version management UI
- Adding prototypes to `plugins/recipes/skills/document-versioning/references/`
- Updating skill text to reference the prototypes

**Out of Scope:**

- Changing the skill's architecture, data model, or API design
- Production UI components

---

**Related Documents:**

- Skill: `plugins/recipes/skills/document-versioning/SKILL.md`
- Reference screenshots:
  `docs/projects/document-versioning-ui-references/artifacts/`
