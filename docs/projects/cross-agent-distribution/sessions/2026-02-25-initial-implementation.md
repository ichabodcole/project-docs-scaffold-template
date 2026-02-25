# Cross-Agent Skill Distribution — 2026-02-25

## Context

Making the project-docs skills available beyond Claude Code to users of
OpenCode, Codex, Crush, Cursor, and other Agent Skills-compatible tools. Started
with research into the cross-agent ecosystem, then designed and built the
distribution pipeline.

## What Happened

**Research phase:** Launched 5 parallel web researchers investigating Claude
Code plugin format, OpenAI Codex skills, OpenCode, Crush, and cross-agent
standards. Key finding: the Agent Skills open standard (agentskills.io) is
already adopted by 30+ tools, and our SKILL.md files are already spec-compliant
— the gap was distribution, not format.

**Design phase:** Brainstormed 3 approaches, chose "publish from existing repo
with build step" — a bash script that copies skills/agents/commands from each
plugin into `dist/<plugin>/` with OpenPackage-compatible manifests. Decided on
GitHub-first distribution (no npm yet), manual build, dist committed to repo.

**Implementation:**

- Built `scripts/build-skills-dist.sh` — iterates plugins, copies resources,
  generates `openpackage.yml` and `README.md` per plugin
- Added `scripts/validate-skills-dist.py` — normalizes Claude Code frontmatter
  extensions (`allowed_tools` → `allowed-tools`, JSON arrays → YAML lists) and
  validates all skills via `skills-ref`
- Set up Python tooling via `uv` for the validation dependency
- Added `build:dist` and `validate:skills` npm scripts
- Added "Cross-Agent Skills" section to root README

**Code review findings addressed:**

- Fixed Python string interpolation in `read_plugin_field` → uses `sys.argv`
  instead (security hardening)
- Eliminated macOS-only `sed -i ''` → uses heredoc variable expansion instead
  (portability fix)
- Removed `parallel-worktree-dev` mention from non-project-docs plugin READMEs
  (accuracy)

**Bug found:** `recipes/elysia-betterauth-api` had a name mismatch in
frontmatter (`elysia-and-better-auth-api` vs directory name). Fixed at source,
bumped recipes plugin to 1.1.1.

## Changes Made

- `scripts/build-skills-dist.sh` — core build script (new)
- `scripts/validate-skills-dist.py` — validation/normalization script (new)
- `pyproject.toml` + `uv.lock` — Python tooling for skills-ref (new)
- `dist/` — generated output for 3 plugins, 38 skills, 8 agents, 5 commands
- `README.md` — added Cross-Agent Skills section
- `package.json` — added build:dist and validate:skills scripts
- `.gitignore` — removed dist/ from ignore
- `.claude/skills/scaffold-update-checklist/SKILL.md` — added distribution
  section

## Lessons Learned

- The Agent Skills ecosystem is more mature than expected — SKILL.md is already
  a real standard, not just a Claude Code convention
- `strictyaml` (used by skills-ref) rejects JSON-style arrays that are valid
  YAML — the normalization step is essential for cross-tool compatibility
- OpenPackage provides a clean `opkg install` path that works across 40+
  platforms without requiring our repo structure to change

## Follow-up

- Publish to skills.sh registry when it opens for submissions
- Consider npm distribution for Node.js-centric teams
- Monitor OpenPackage adoption — if it gains traction, invest in richer
  manifests
- Pre-existing manifesto discrepancy: says "15 recipes" but there are 13 + 1
  meta-skill (create-recipe) = 14 directories

---

**Related Documents:**

- [Investigation](../../investigations/2026-02-25-cross-agent-skill-portability.md)
- [Design](../../plans/2026-02-25-cross-agent-distribution-design.md)
