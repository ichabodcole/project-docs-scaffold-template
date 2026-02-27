# project-docs — Cross-Agent Skills Package

This package contains skills, agents, and commands from the
[project-docs-scaffold-template](https://github.com/ichabodcole/project-docs-scaffold-template)
plugin, packaged for cross-agent installation.

## What's Included

| Type     | Count | Cross-tool?                      |
| -------- | ----- | -------------------------------- |
| Skills   | 23    | Yes — Agent Skills open standard |
| Agents   | 8     | Claude Code only                 |
| Commands | 6     | Claude Code only                 |

## Installation

### OpenPackage (recommended)

```bash
opkg install gh@ichabodcole/project-docs-scaffold-template/dist/project-docs
```

### Direct Clone

```bash
git clone https://github.com/ichabodcole/project-docs-scaffold-template.git
```

Then configure your tool's skills path:

**OpenCode** (`opencode.json`):

```json
{
  "skills_paths": ["<clone-path>/dist/project-docs/skills"]
}
```

**Crush** (`crush.json`):

```json
{
  "options": {
    "skills_paths": ["<clone-path>/dist/project-docs/skills"]
  }
}
```

**Codex**: Copy or symlink skills into `~/.codex/skills/`

### Claude Code (marketplace)

```
/plugin marketplace add ichabodcole/project-docs-scaffold-template
/plugin install project-docs
```

## Prerequisites

These skills are designed for projects using the
[project-docs scaffold template](https://github.com/ichabodcole/project-docs-scaffold-template)
documentation structure. Install the docs scaffold first:

```bash
cookiecutter gh:ichabodcole/project-docs-scaffold-template
```

## Known Limitations

- **Agents and commands** are Claude Code-specific. Other tools will only load
  the skills.
- Skills use only base Agent Skills spec fields (`name`, `description`) — no
  Claude Code-specific extensions. They work across all tools that implement the
  [Agent Skills standard](https://agentskills.io).
