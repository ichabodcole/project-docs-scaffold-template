# Recipes Plugin: Skills vs. MCP Server — Investigate the Right Fit

**Added:** 2026-03-03

Recipes feel slightly awkward as plugin skills — they're code-generation
patterns rather than workflow orchestration, which is what skills are designed
for. Worth exploring whether recipes belong in this repo at all, and whether an
MCP server would be a better home for them.

Questions to answer:

- What exactly are recipes doing that skills don't do well? (They provide
  structured implementation blueprints, not agent workflow guidance — is that
  distinction meaningful?)
- Would an MCP server provide a meaningfully better authoring or consumption
  experience, or is it just a different distribution mechanism?
- What would extraction actually entail — a separate repo, separate versioning,
  separate installation step for users?
- Are there recipes consumers who don't use the rest of the project-docs plugin?
  If not, is extraction worth the overhead?

This is an open-ended investigation, not a pre-decided direction. The outcome
could be "keep as-is, the discomfort is cosmetic" or "yes, extract to MCP."

## References

- `plugins/recipes/` — current recipes plugin
- `plugins/project-docs/skills/` — for contrast with how skills are structured
