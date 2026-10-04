---
type: item
title: Re-pin the v3.0 migration to scaffold 9.4.1
description:
  Scaffold 9.4.1 shipped the check fixes, so the v2.10-to-v3.0 migration
  installs it, with plugin project-docs 4.5.0.
status: draft
lifecycle: done
id: 01a1051e-6180-71d3-a690-80874de60420
kind: chore
generated: { by: claude-opus-5-5, at: 2026-10-03 }
---

# Re-pin the v3.0 migration to scaffold 9.4.1

Scaffold 9.4.1 shipped the check fixes. The writing-migrations playbook's Step
14 re-pins the newest migration to each scaffold release, so an adopter running
update-project-docs reaches it.

## Definition of done

- [x] The v2.10-to-v3.0 migration installs
      `project-docs-scaffold-template-v9.4.1`, in every place Step 14 lists,
      with its tests passing.
- [x] Plugin project-docs is 4.5.0, with its version history and `dist/`.
