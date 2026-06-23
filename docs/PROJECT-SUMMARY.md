# Project Summary

**Last Updated:** 2026-06-23 **Project Status:** Active Development

## Overview

`project-docs-scaffold-template` is a **two-headed product**: a Cookiecutter
template that drops an opinionated `docs/` scaffold into any new software
project, paired with a family of six Claude Code plugins (project-docs, recipes,
toolbox, operator, agent-bridge, hivemind) that operate on that scaffold to
plan, build, document, and review work. The scaffold gives every kind of
document a predictable home (architecture, specifications, projects,
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
├── plugins/                          # Source plugins (six).
│   ├── project-docs/                 # Doc workflow plugin (commands + skills + agents).
│   ├── recipes/                      # Umbrella recipes skill + library/.
│   ├── toolbox/                      # Specialist utilities (mockups, testing, optimization).
│   ├── operator/                     # Operator MCP setup/auth/usage skills.
│   ├── agent-bridge/                 # Skills for the agent-bridge MCP server.
│   └── hivemind/                     # Cross-project knowledge cycle (capture/digest/consult/feedback).
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

- **spellbook spin-out** — the interactive "agent-surface spell suite"
  (digestify, grapevine, magpie, and tuskboard → renamed `bounty`) was extracted
  out of `toolbox` into a standalone **spellbook** repo, now its single source
  of truth. Keeping copies here had created a second source of truth and
  double-maintenance.
- **toolbox 3.0.0 (breaking)** — toolbox narrowed to three
  documentation-adjacent utilities — `html-mockup-prototyping`,
  `maestro-testing`, `screenshot-optimization` — after the spell skills were
  removed (removing skills is a breaking bump).
- **hivemind plugin (new)** — added a sixth plugin operationalizing a
  cross-project knowledge cycle (collect → digest → disperse → consult) via four
  verb-split skills: `hivemind-capture`, `hivemind-digest`, `hivemind-consult`,
  `hivemind-feedback`.
- **recipes `agent-surface-bun` evolution** — the recipe was decoupled from the
  now-removed in-repo implementations and pointed at spellbook as the canonical
  example home, then evolved to document a daemon + thin-CLI "standing" shape
  alongside the original one-shot shape.

**Notable changes:**

- Per-plugin `dist/<plugin>/*` and `plugins/<plugin>/*` paths churn together —
  confirming the build-and-check-in distribution pattern.
- `{{cookiecutter.project_slug}}/docs/README.md` and `docs/README.md` are kept
  in lockstep.

## Current Direction

The repo is in a **deliberate-narrowing** posture, re-converging on its
documentation-methodology center. The defining recent move was the spellbook
spin-out: the interactive agent-surface spell suite shared this repo but not its
thesis (documentation methodology vs. agent-collaboration tooling), so it was
extracted to a standalone home. Two motions accompany the narrowing:

- **Spin-out as a lifecycle stage.** Matured concerns are routed elsewhere once
  they cohere (spells → spellbook) rather than accreting in this repo
  indefinitely.
- **Cross-project knowledge as installable infrastructure.** The new `hivemind`
  plugin steps up an abstraction level — from "tools agents use" to
  "infrastructure between agents and across projects" — implementing a shared
  collect → digest → disperse → consult cycle.

In-progress investigation `2026-02-25-cross-agent-skill-portability.md`
continues to drive the `dist/` and `openpackage.yml` cross-agent distribution
strategy.

Overall trajectory: re-center on documentation methodology, treat mature
tool-suites as things to spin out, formalize cross-agent distribution, and lift
cross-project knowledge into shared infrastructure.

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
  `BREAKING CHANGE:` triggers a major bump (as it did for `toolbox` 3.0.0 when
  the spell skills were removed). Each plugin versions independently from the
  umbrella template package.

---

_This summary was generated by analyzing the codebase, documentation, and recent
activity. It represents the actual state of the project as discovered, not just
stated intentions._
