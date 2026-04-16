# api-mcp-server skill gains Claude Desktop DCR compatibility section

**Date:** 2026-04-16

Added Phase 5.3 to the `recipes:api-mcp-server` skill documenting a DCR
intercept route that rewrites confidential-client DCR requests to public so
Claude Desktop's custom connector can authenticate. Without this, Desktop fails
with the generic "Couldn't reach the MCP server" because claude.ai's backend
silently aborts on non-2xx DCR and BetterAuth's oauth-provider hardcodes a 401
on confidential DCR without auth. Bumped `recipes` plugin to 1.10.0.

**Key files:** `plugins/recipes/skills/api-mcp-server/SKILL.md`,
`plugins/recipes/.claude-plugin/plugin.json`

**Docs:** [Project folder](../projects/api-mcp-desktop-gotcha/) (proposal +
playbook artifact)
