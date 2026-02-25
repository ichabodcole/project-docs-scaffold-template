# Cross-agent skill distribution pipeline

**Date:** 2026-02-25

Added a build script that packages plugin skills, agents, and commands into
`dist/<plugin>/` with OpenPackage manifests and per-plugin READMEs. All 38
skills validate against the Agent Skills spec via `skills-ref`. Run
`npm run build:dist` after any skill/agent/command changes.

**Key files:** `scripts/build-skills-dist.sh`,
`scripts/validate-skills-dist.py`, `dist/`

**Docs:**
[Session](docs/projects/cross-agent-distribution/sessions/2026-02-25-initial-implementation.md),
[Investigation](docs/investigations/2026-02-25-cross-agent-skill-portability.md)
