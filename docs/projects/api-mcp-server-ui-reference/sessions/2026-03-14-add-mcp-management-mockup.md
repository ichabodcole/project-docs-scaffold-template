# Add MCP Management Mockup — 2026-03-14

## Context

Adding an interactive HTML mockup to the `api-mcp-server` recipe skill to
illustrate the management UI for MCP access groups, agent keys, and roles.
Prompted by having developed a working prototype that could serve as a visual
reference for future implementations.

## What Happened

The mockup was already built as an external artifact. Work focused on:

1. **Placing the mockup** in `plugins/recipes/skills/api-mcp-server/references/`
   following the established pattern from `nuxt-betterauth-admin` and
   `agent-feedback-reporting`.

2. **Fixing the Lucide CDN** — the file used `unpkg.com/lucide@latest` which
   resolves to ESM format, incompatible with the `<script>` tag UMD pattern the
   mockup used. Switched to
   `cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js`.

3. **Updating terminology** — "revoke" was replaced with "delete" throughout
   (modal title, button text, function names). MCP keys are deleted, not
   revoked; the earlier term implied a softer disable-and-restore semantic that
   doesn't match the actual model.

4. **Removing the Status column** from the keys table — all keys are active by
   definition (deleted keys no longer exist), so the column added noise without
   value.

5. **Replacing the "Revoke" text link** with a trash icon (`btn-icon` +
   `trash-2` Lucide icon) in the keys table action column, consistent with the
   edit/delete icon pattern used elsewhere in the mockup.

6. **Removing the active count** from the keys footer — with the status column
   gone, tracking "N active" became meaningless.

7. **Adding a Delete Key modal state** to the state switcher, renumbering the
   Folder Picker state from 6 → 7.

8. **Adding `## UI Reference` section** to `SKILL.md` pointing to the mockup,
   matching the pattern from `nuxt-betterauth-admin/SKILL.md`.

9. **Bumped recipes plugin** from 1.5.0 → 1.6.0 (minor — new UI reference).

## Changes Made

- `plugins/recipes/skills/api-mcp-server/references/mcp-management-mockup.html`
  — new file, interactive prototype of MCP management UI
- `plugins/recipes/skills/api-mcp-server/SKILL.md` — added UI Reference section
- `plugins/recipes/.claude-plugin/plugin.json` — bumped to 1.6.0
- `dist/` — rebuilt

---

**Related Documents:**

- [api-mcp-server SKILL.md](../../../plugins/recipes/skills/api-mcp-server/SKILL.md)
