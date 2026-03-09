# Recipe Authoring — 2026-03-08

## Context

Authored and reviewed the `agent-feedback-reporting` recipe skill for the
recipes plugin. No proposal or plan — recipe was written directly and reviewed
against the existing collection for consistency and quality.

## What Happened

Recipe was written and reviewed in a single session. Two issues were caught
during review and fixed:

1. `getFeedbackEntries` repository function had a comment-only body — replaced
   with a real Drizzle implementation including dynamic filter conditions and
   LEFT JOIN
2. `AgentFeedbackRecord` type was referenced but never defined — added type
   definition derived from the schema

Additional nuance was added after discussion of two real use cases:

- **Original use case (story writer):** `entity_id` is a correlation anchor, not
  a subject link — the feedback is about the writing process, not the story
  itself. The entity lets you open the story to understand the context.
- **MCP server use case:** `entity_id` is optional when there's no discrete
  processing entity. `step_name` maps to tool name, `agent_input` maps to tool
  params. But if the MCP tool is operating on a specific entity (e.g., editing a
  document), the anchor still applies.

These distinctions were added to the SQL schema comment, field notes table,
detail panel description, Gotchas section, and a new MCP Server Variant section
under Adapting to Different Tech Stacks.

Scaffold checklist also caught an accidental plugin version downgrade (1.3.1 →
1.3.0) from branch creation; corrected to 1.3.2.

## Changes Made

- `plugins/recipes/skills/agent-feedback-reporting/SKILL.md` — new recipe
- `plugins/recipes/.claude-plugin/plugin.json` — bumped to 1.3.2
- `docs/PROJECT_MANIFESTO.md` — recipe count 16 → 17
- `dist/` — regenerated via `npm run build:dist`

---

**Related Documents:**

- [Recipe](../../../plugins/recipes/skills/agent-feedback-reporting/SKILL.md)
