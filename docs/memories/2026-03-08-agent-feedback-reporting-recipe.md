# Added agent-feedback-reporting recipe

**Date:** 2026-03-08

New recipe implementing a pattern for giving AI agents a structured feedback
tool to report difficulties during execution, with an in-memory registry,
persistence layer, and admin triage UI. Key design note: `entity_id` is a
correlation anchor ("generated while processing this"), not a subject link
("feedback about this") — make it nullable for use cases with no discrete
processing entity (e.g., ad-hoc MCP tool calls). MCP variant guidance included.

**Key files:** `plugins/recipes/skills/agent-feedback-reporting/SKILL.md`

**Docs:**
[Session](docs/projects/agent-feedback-reporting/sessions/2026-03-08-recipe-authoring.md)
