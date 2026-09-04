---
type: memory
title:
  "finalize-branch: reviewer capability check + project-owned landing policy"
status: stable
generated: { by: unknown, at: 2026-08-07 }
---

# finalize-branch: reviewer capability check + project-owned landing policy

Fixed two GitHub issues (#148, #149) where `finalize-branch` made unverified
assumptions — Step 2 defaulted to a reviewer agent with no `Bash` tool, and Step
8 picked a squash strategy without knowing the target project's conventions.
Step 2 now requires verifying reviewer capability before dispatch; Step 8 now
looks for a `## Branch Landing Policy` heading in root `AGENTS.md`/`CLAUDE.md`
instead of guessing. That surfaced a gap in `update-project-docs` (no mechanism
for surfacing new plugin-driven root-file conventions to existing consumers),
which got generalized into a data-driven `## Root-Level Conventions` table
rather than patched inline. Added a "cold-read verification" step to
`scaffold-update-checklist` mid-session and ran it twice, catching real bugs
both times — including one where a fix for a corrupted paragraph reintroduced
the identical bug via a `+` character that Prettier's reflow turned into a stray
list marker.

**Key files:** `plugins/project-docs/skills/finalize-branch/SKILL.md`,
`plugins/project-docs/skills/update-project-docs/SKILL.md`,
`.claude/skills/scaffold-update-checklist/SKILL.md`, `AGENTS.md`

**Docs:**
[Session](../projects/finalize-branch-hardening/sessions/2026-08-07-reviewer-capability-and-landing-policy.md),
[Archive touchpoint investigation](../investigations/2026-08-07-project-closure-and-archive-touchpoint-investigation.md)
(separate, deferred scope surfaced during this work)
