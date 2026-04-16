# API MCP Server — Desktop Client Gotcha

**Status:** Draft **Created:** 2026-04-16 **Author:** Cole Reed

---

## Overview

The `recipes:api-mcp-server` skill documents how to add a cloud-hosted MCP
server to a Bun/Elysia API, but a recent debugging session surfaced a gotcha
that isn't covered: the server works when connected from Claude Code, but fails
to connect from Claude Desktop (and potentially other clients). A playbook with
the fix exists and should be folded into the skill as an explicit
troubleshooting section.

## Problem Statement

Developers following the `api-mcp-server` recipe can successfully stand up an
MCP server and verify it from Claude Code, then hit a silent connection failure
when adding it to Claude Desktop. The current skill doesn't mention this failure
mode or its resolution, so users end up debugging from scratch.

## Proposed Solution

Update the `recipes:api-mcp-server` skill to include a troubleshooting / "client
compatibility" section that:

- Names the Claude Desktop failure mode explicitly (symptoms + why it happens)
- Documents the fix from the playbook
- Generalizes to other MCP clients where appropriate

The playbook will be dropped into this project folder as an artifact and
referenced during the skill update.

## Scope

**In Scope (MVP):**

- Read the playbook artifact
- Update `recipes:api-mcp-server` with a troubleshooting section covering the
  Claude Desktop connection issue and its resolution
- Keep existing recipe content intact — additive only

**Out of Scope:**

- Refactoring the rest of the skill
- Adding troubleshooting for unrelated MCP issues
- Changes to other MCP-related skills or recipes

**Future Considerations:**

- If more client-specific gotchas surface, expand the section into a broader
  "client compatibility matrix"

## Technical Approach

Single skill update in the `recipes` plugin. No code changes, no new
dependencies. Plugin version bumps per the semver convention (minor bump for
behavioral / instructional change).

## Impact & Risks

**Benefits:** Future users of the recipe avoid the same debugging loop.

**Risks:** Low — documentation-only change.

**Complexity:** Low.

## Open Questions

- Does the fix generalize to all non-Claude-Code MCP clients, or is it
  Desktop-specific? (Playbook should clarify.)

---

**Related Documents:**

- Playbook artifact: `playbook.md` (to be added to this project folder)
