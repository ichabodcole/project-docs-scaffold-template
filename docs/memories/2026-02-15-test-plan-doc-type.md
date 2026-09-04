---
type: memory
title: Added test plan document type to project lifecycle
description:
  "Test plans became a document type: tiered verification scenarios written
  before an agent implements, not after."
tags: [documentation, document-types, testing]
status: stable
generated: { by: unknown, at: 2026-02-15 }
---

# Added test plan document type to project lifecycle

New optional lifecycle stage between Plan and Sessions — tiered verification
scenarios (Tier 1 smoke, Tier 2 critical path, Tier 3 edge cases) for
agent-implemented features. Includes template, dedicated agent, skill, command,
migration guide. Also added external dependencies awareness to the DR template
and proposal-to-plan/proposal-to-design-resolution skills. Root-level docs NOT
updated — deferred to migration dogfooding via `v2.3-to-v2.4` migration.

**Key files:** `plugins/project-docs/skills/generate-test-plan/SKILL.md`,
`plugins/project-docs/agents/test-plan-generator.md`,
`{{cookiecutter}}/docs/projects/TEMPLATES/TEST-PLAN.template.md`

**Docs:** [Project folder](../projects/_archive/test-plan-doc-type/proposal.md)
