# Cross-Agent Skill Distribution Design

**Date:** 2026-02-25 **Status:** Approved

## Goal

Make project-docs skills installable by users of any agent harness (Codex,
OpenCode, Crush, Cursor, etc.) via OpenPackage and direct GitHub clone.

## Approach

A build script packages skills, agents, and commands from each plugin into a
`dist/` directory with OpenPackage-standard structure. The build is run manually
and the output is committed to the repo so GitHub-based installs work.

## Build Script

`scripts/build-skills-dist.sh`:

1. Clean `dist/`
2. For each plugin (`project-docs`, `recipes`, `operator`):
   - Create `dist/<plugin>/`
   - Copy `skills/` directory as-is
   - Copy `agents/` directory as-is (if exists)
   - Copy `commands/` directory as-is (if exists)
   - Generate `openpackage.yml` from `plugin.json` metadata
   - Generate `README.md` with installation instructions
3. Print summary: plugins packaged, skill counts, parity notes

## Output Structure

```
dist/
├── project-docs/
│   ├── openpackage.yml
│   ├── README.md
│   ├── skills/          (22 skills, copied as-is)
│   ├── agents/          (8 agents, copied as-is)
│   └── commands/        (5 commands, copied as-is)
├── recipes/
│   ├── openpackage.yml
│   ├── README.md
│   └── skills/          (14 skills)
└── operator/
    ├── openpackage.yml
    ├── README.md
    └── skills/          (2 skills)
```

## Installation Channels

- **OpenPackage:**
  `opkg install gh@ichabodcole/project-docs-scaffold-template/dist/project-docs`
- **Direct clone:** Clone repo, point tool's `skills_paths` at
  `dist/project-docs/skills/`
- **Claude marketplace:** Unchanged, existing workflow

## Decisions

- **Committed to repo:** `dist/` is checked in so GitHub installs work
- **Manual build:** Run by hand, added to scaffold update checklist
- **No npm/skills.sh yet:** Future work once the process is proven
- **All plugins included:** project-docs, recipes, and operator each get their
  own `dist/<plugin>/` directory
- **No AGENTS.md snippet in dist:** Already handled by the upgrade skill

## Known Limitations

- `parallel-worktree-dev` skill has bash scripts that may not execute on all
  agent harnesses — noted for parity testing, fallback language to be added if
  confirmed
- Agents and commands only function on Claude Code — OpenPackage only installs
  resource types that the target platform supports
- No automated cross-tool testing yet
