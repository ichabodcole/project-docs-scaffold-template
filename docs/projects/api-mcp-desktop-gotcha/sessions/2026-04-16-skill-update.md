# Skill update for Claude Desktop DCR gotcha — 2026-04-16

## Context

Recently debugged an MCP server that connected fine from Claude Code but failed
silently from Claude Desktop's custom connector. Root cause turned out to be a
DCR (Dynamic Client Registration) mismatch: Desktop sends a confidential-client
shape (`token_endpoint_auth_method: "client_secret_post"`) without auth, which
BetterAuth's `@better-auth/oauth-provider` hardcodes to reject with a 401;
claude.ai's backend then aborts silently on non-2xx DCR with only the generic
"Couldn't reach the MCP server" error. A playbook captured the full diagnosis
and fix. The `recipes:api-mcp-server` skill already covered MCP server setup but
didn't mention this Desktop-specific failure mode, so the goal was to fold just
the fix (not the full retro) into the skill.

Project folder: `docs/projects/api-mcp-desktop-gotcha/` Playbook artifact:
`artifacts/mcp-oauth-remote-connector-playbook.md`

## What Happened

Straightforward documentation work once scope was settled.

Scoping took one round of back-and-forth. The playbook has seven gotchas, a
5-phase diagnostic methodology, and a retro section on why the bug was hard to
find. Most of that belongs in the playbook, not the skill. Landed on:

- One new subsection (§5.3 in Phase 5 "OAuth Discovery Endpoints") with the
  actual fix: context, the `coerceConfidentialDcrToPublic` + `dcrInterceptRoute`
  code, wiring note, "why it's safe" one-liner, curl validation
- One Gotchas bullet cross-referencing §5.3
- Everything else (path-scoped `/.well-known/*`, userinfo/openid, JWT vs opaque
  tokens, the `ofid_` trace ID, user-agent taxonomy) stays in the playbook where
  it already has mitigations — they're general better practice rather than tied
  to this specific fix

Dispatched `feature-dev:code-reviewer` on the net diff. Came back with **Ready
to merge: With fixes** and three issues, all in the new §5.3:

1. **Elysia "route specificity" claim was wrong.** The skill said "route
   specificity beats mount prefix, so the explicit route wins." In reality what
   makes this work is registration order — `.use(dcrInterceptRoute)` called
   before `.mount(auth.handler)`. Elysia's specificity semantics across
   `.use()` + `.mount()` aren't formally documented and have known
   inconsistencies (Elysia issue #1752). Rewrote the prose to be honest about
   the mechanism.
2. **`content-length` delete comment was misleading.** `Content-Length` is a
   forbidden request header per the Fetch spec — the runtime always manages it.
   So `headers.delete("content-length")` is a no-op, and the comment
   `// let Fetch recompute` implied it was what triggered recomputation. Dropped
   the delete entirely and added a comment explaining why.
3. **Type annotation too narrow on `coerceConfidentialDcrToPublic`.**
   `JSON.parse(body)` returns `any`, so `parsed` could be a primitive, array, or
   null and the subsequent spread would throw. Added a type guard.

All three are 1–3 line edits that tighten the instructional content without
adding scope. Committed as a separate fixup.

## Changes Made

- `plugins/recipes/skills/api-mcp-server/SKILL.md` — added §5.3 (~90 lines),
  added Gotchas bullet. After review: tightened route-ordering prose, removed
  misleading content-length handling, added type guard.
- `plugins/recipes/.claude-plugin/plugin.json` — 1.9.0 → 1.10.0 (minor, per
  instructional-change convention)
- `dist/recipes/skills/api-mcp-server/SKILL.md`, `dist/recipes/openpackage.yml`
  — regenerated via `./scripts/build-skills-dist.sh`

## Lessons Learned

- The reviewer catch on the "specificity vs ordering" claim is the kind of thing
  self-review misses reliably. The playbook source had the same imprecise
  framing — carrying that forward into the skill would have misled future
  implementers without tripping any quality gate. Worth dispatching an
  independent reviewer every time on any content that claims "X wins over Y"
  semantics.
- Scope discipline paid off. The playbook is ~390 lines; the skill addition is
  ~90. The rest stays in the project folder as the retro it was written as.

## Follow-up

- Pre-existing manifesto discrepancy: `docs/PROJECT_MANIFESTO.md` claims "19
  implementation recipes" but `plugins/recipes/skills/` has 20. Not this
  branch's scope — worth a separate chore.

---

**Related Documents:**

- [Proposal](../proposal.md)
- [Playbook artifact](../artifacts/mcp-oauth-remote-connector-playbook.md)
