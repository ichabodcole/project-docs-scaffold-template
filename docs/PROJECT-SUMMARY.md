# Project Summary

**Last Updated:** 2026-05-21 **Project Status:** Active Development

## Overview

`project-docs-scaffold-template` is a **two-headed product**: a Cookiecutter
template that drops an opinionated `docs/` scaffold into any new software
project, paired with a suite of Claude Code plugins that operate on that
scaffold to plan, build, document, and review work. The scaffold gives every
kind of document a predictable home (architecture, specifications, projects,
investigations, playbooks, lessons-learned, reports, memories, briefs,
fragments). The plugins understand those homes and automate the workflows that
move documents between them — from rough idea → brief → investigation → proposal
→ plan → sessions → archive.

The repository dogfoods itself: its own `docs/` follow the scaffold it
generates, and active work lives in `docs/projects/<name>/` folders with session
notes.

It is also explicitly **cross-agent**: plugin skills are built into a portable
`dist/` bundle (`openpackage.yml`) so they can be consumed beyond Claude Code,
following the [Agent Skills](https://agentskills.io) open standard.

## Core Technologies

- **Primary Language:** Markdown content, with Python (Cookiecutter hook) and
  Shell/Node tooling around it.
- **Framework/Runtime:** Cookiecutter (Jinja2 templating), Claude Code plugin
  system.
- **Build Tools:** Custom `scripts/build-skills-dist.sh` +
  `scripts/validate-skills-dist.py` build per-plugin `dist/` bundles.
- **Key Dependencies:** `@slidev/cli` + Slidev themes (slide decks), Prettier
  (markdown formatting), Husky (git hooks), Release Please (semver automation).
- **Development Tools:** Prettier pre-commit gate, Release Please on `main`,
  conventional commits, `uv` for the Python side.

## Project Structure

```
.
├── {{cookiecutter.project_slug}}/    # The cookiecutter payload (template).
│   └── docs/                         # Scaffold mirrored from live docs/.
├── hooks/post_gen_project.py         # Post-generation Python hook.
├── plugins/                          # Source plugins.
│   ├── project-docs/                 # Doc workflow plugin (commands + skills + agents).
│   ├── recipes/                      # Umbrella recipes skill + library/.
│   ├── toolbox/                      # Specialist utilities (digestify, mockups, ...).
│   ├── operator/                     # Operator-specific commands.
│   └── agent-bridge/                 # Skills for the agent-bridge MCP server.
├── dist/                             # Built, portable skill bundles per plugin.
├── scripts/                          # Build + validation scripts.
└── docs/                             # This repo's own docs (follow the scaffold).
```

Two organizing principles: **plugins are versioned independently** (each has its
own `plugin.json` semver), and **the template's `docs/` mirrors the live
`docs/`** — edits to the curated copy get propagated into the payload.

## Documented Systems

There are no formal `docs/architecture/` documents for the scaffold itself yet.
The system-level documentation lives in:

- **`README.md`** — outward-facing description of template + plugin family.
- **`AGENTS.md`** — detailed contributor guide: template structure, variable
  substitution, plugin conventions, command/skill/agent frontmatter rules.
- **`plugins/*/README.md`** — per-plugin docs.

## Application Specifications

No `docs/specifications/` content has been authored yet — only the README and
TEMPLATEs. The scaffold itself does not currently use this folder; it exists as
part of the generated structure for downstream projects.

## Recent Activity (Last 30 Days)

**Active work areas:**

- **toolbox/digestify** — new one-shot browser review tool. Three iterations in
  May: initial implementation → `--reference` flag for path-pointed input →
  visible idle timer + session recovery.
- **recipes plugin 2.0.0 (breaking)** — 20 individual recipe skills consolidated
  into a single umbrella `recipes:recipes` skill with an INDEX.
- **project-docs commands/skills** — new `ground-in-project` skill (lightweight
  session priming) and a smart refresh mode for `/project-summary` (this
  command).
- **Release Please train** — five releases in ~30 days: 2.26.0 → 2.26.1 → 3.0.0
  (recipes breaking) → 3.1.0 → 3.2.0.

**Recent sessions:**

- 2026-05-08:
  `digestify-session-recovery/sessions/2026-05-08-initial-implementation.md`
- 2026-05-07: `digestify-reference-input/`, `recipes-plugin-consolidation/`,
  `digestify/` initial implementations.
- 2026-04-19: `project-cli-toolkit-recipe/` slim + finalize sessions.
- 2026-04-16: `api-mcp-desktop-gotcha/` skill update.

**Notable changes:**

- The `dist/toolbox/skills/digestify/*` and `plugins/toolbox/skills/digestify/*`
  paths churn together — confirming the build-and-check-in distribution pattern.
- `{{cookiecutter.project_slug}}/docs/README.md` and `docs/README.md` are kept
  in lockstep.

## Current Direction

**Active projects (with proposals):**

- `digestify/` — Approved (in flight)
- `digestify-reference-input/` — Approved (in flight)
- `recipes-plugin-consolidation/` — Approved (shipped)
- `consolidate-long-branch/` — Draft
- `api-mcp-desktop-gotcha/` — Draft
- `document-versioning-ui-references/` — Draft
- `markdown-slide-decks/` — Draft

**Session-only projects (lightweight tracking, no proposal):**

- `digestify-session-recovery/`, `html-mockup-component-updates/`,
  `project-cli-toolkit-recipe/`, `toolbox-plugin/`, `agent-bridge-plugin/`

**In-progress investigations:**

- `2026-02-25-cross-agent-skill-portability.md` — drives the `dist/` and
  openpackage.yml strategy.

**Briefs awaiting next step:** `improve-skill-and-recipe-workflows`,
`ui-experimentation-framework`, `markdown-slide-decks`, `report-issue-skill`.

Overall trajectory: deepen the skill/recipe surface, formalize cross-agent
distribution, and add ergonomic tools for idea-shaping and human review
(digestify, slide decks, mockup prototyping, briefs workflow).

## Development Patterns & Practices

- **Playbooks:** none authored yet beyond the template.
- **Lessons Learned:** one canonical lesson —
  `lessons-learned/migration-steps-uniform-specificity.md`.
- **Memories:** active practice — ~18 dated memory notes in `docs/memories/`
  spanning 2026-02 through 2026-05; each captures a non-obvious decision or
  recipe.
- **Documentation Approach:** dogfood the scaffold; mirror live `docs/` into the
  template payload; check `dist/` bundles into git for distribution.
- **Versioning convention:** minor bump for any behavioral change, patch only
  for typos/formatting (per stored project memory).
- **Two-tier project tracking:** full `proposal.md` for new features; bare
  `sessions/` folders for "shipped, leave a trail" work.

## Quick Start for New Contributors

1. Install Node deps: `pnpm install` (lockfile is `pnpm-lock.yaml`).
2. Format markdown: `npm run format` (or `npm run format:check`).
3. Build skill distributions: `npm run build:dist`.
4. Validate built skills: `npm run validate:skills`.
5. Test the template locally: `cookiecutter . --overwrite-if-exists`.
6. Read `AGENTS.md` and `plugins/project-docs/README.md` for the plugin
   conventions before touching plugins.

## Key Insights

- **The plugins are the active surface.** The Cookiecutter scaffold is stable;
  most weekly work is plugin/skill evolution under `plugins/*` with mirrored
  `dist/*` updates.
- **Cross-agent portability is a real constraint.** The `dist/` bundles +
  `openpackage.yml` exist so skills work outside Claude Code — keep that path
  unbroken when editing skills.
- **Two-tier project tracking is intentional.** A folder with only a `sessions/`
  directory and no `proposal.md` is not a mistake — it's the lightweight track
  for shipped or trivially small work.
- **Release Please drives versioning.** Use conventional commits; a `feat!:` or
  `BREAKING CHANGE:` triggers a major bump (as it did for `recipes` 2.0.0). Each
  plugin versions independently from the umbrella template package.

---

_This summary was generated by analyzing the codebase, documentation, and recent
activity. It represents the actual state of the project as discovered, not just
stated intentions._
