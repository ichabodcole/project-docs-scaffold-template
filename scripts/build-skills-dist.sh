#!/usr/bin/env bash
#
# Build cross-agent distribution packages from Claude Code plugins.
#
# Copies skills, agents, and commands from each plugin into dist/<plugin>/
# with OpenPackage-compatible directory structure and generated manifests.
#
# Usage: ./scripts/build-skills-dist.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$REPO_ROOT/dist"
PLUGINS_DIR="$REPO_ROOT/plugins"

# ── Helpers ──────────────────────────────────────────────────────────────────

info()  { printf "  %s\n" "$1"; }
header() { printf "\n=== %s ===\n" "$1"; }

# Read a field from plugin.json using python (available on macOS/Linux)
read_plugin_field() {
    local plugin_json="$1"
    local field="$2"
    python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
keys = sys.argv[2].split('.')
val = data
for k in keys:
    val = val.get(k, '') if isinstance(val, dict) else ''
print(val)
" "$plugin_json" "$field"
}

# Generate openpackage.yml from plugin.json metadata
generate_manifest() {
    local plugin_json="$1"
    local output="$2"

    local name version description author license
    name=$(read_plugin_field "$plugin_json" "name")
    version=$(read_plugin_field "$plugin_json" "version")
    description=$(read_plugin_field "$plugin_json" "description")
    author=$(read_plugin_field "$plugin_json" "author.name")
    license=$(read_plugin_field "$plugin_json" "license")

    cat > "$output" <<YAML
name: $name
version: $version
description: "$description"
keywords: [agent-skills, documentation, ai-coding-agent]
author: "$author"
license: $license
YAML
}

# Generate README.md for a dist package
generate_readme() {
    local plugin_name="$1"
    local output="$2"
    local skill_count="$3"
    local agent_count="$4"
    local command_count="$5"

    cat > "$output" <<HEADER
# $plugin_name — Cross-Agent Skills Package

This package contains skills, agents, and commands from the
[project-docs-scaffold-template](https://github.com/ichabodcole/project-docs-scaffold-template)
plugin, packaged for cross-agent installation.

## What's Included

HEADER

    {
        echo "| Type | Count | Cross-tool? |"
        echo "| --- | --- | --- |"
        if [ "$skill_count" -gt 0 ]; then
            echo "| Skills | $skill_count | Yes — Agent Skills open standard |"
        fi
        if [ "$agent_count" -gt 0 ]; then
            echo "| Agents | $agent_count | Claude Code only |"
        fi
        if [ "$command_count" -gt 0 ]; then
            echo "| Commands | $command_count | Claude Code only |"
        fi
    } >> "$output"

    cat >> "$output" <<INSTALL

## Installation

### OpenPackage (recommended)

\`\`\`bash
opkg install gh@ichabodcole/project-docs-scaffold-template/dist/$plugin_name
\`\`\`

### Direct Clone

\`\`\`bash
git clone https://github.com/ichabodcole/project-docs-scaffold-template.git
\`\`\`

Then configure your tool's skills path:

**OpenCode** (\`opencode.json\`):

\`\`\`json
{
  "skills_paths": ["<clone-path>/dist/$plugin_name/skills"]
}
\`\`\`

**Crush** (\`crush.json\`):

\`\`\`json
{
  "options": {
    "skills_paths": ["<clone-path>/dist/$plugin_name/skills"]
  }
}
\`\`\`

**Codex**: Copy or symlink skills into \`~/.codex/skills/\`

### Claude Code (marketplace)

\`\`\`
/plugin marketplace add ichabodcole/project-docs-scaffold-template
/plugin install $plugin_name
\`\`\`

## Prerequisites

These skills are designed for projects using the
[project-docs scaffold template](https://github.com/ichabodcole/project-docs-scaffold-template)
documentation structure. Install the docs scaffold first:

\`\`\`bash
cookiecutter gh:ichabodcole/project-docs-scaffold-template
\`\`\`

## Known Limitations

- **Agents and commands** are Claude Code-specific. Other tools will only load
  the skills.
- Skills use only base Agent Skills spec fields (\`name\`, \`description\`) — no
  Claude Code-specific extensions. They work across all tools that implement the
  [Agent Skills standard](https://agentskills.io).
INSTALL
}

# ── Main ─────────────────────────────────────────────────────────────────────

header "Building cross-agent distribution packages"

# Clean dist/
if [ -d "$DIST_DIR" ]; then
    rm -rf "$DIST_DIR"
    info "Cleaned dist/"
fi

total_skills=0
total_agents=0
total_commands=0
plugins_built=0
parity_notes=()

for plugin_dir in "$PLUGINS_DIR"/*/; do
    plugin_name=$(basename "$plugin_dir")
    plugin_json="$plugin_dir/.claude-plugin/plugin.json"

    # Skip plugins without a manifest
    if [ ! -f "$plugin_json" ]; then
        info "Skipping $plugin_name (no plugin.json)"
        continue
    fi

    header "Packaging: $plugin_name"

    dest="$DIST_DIR/$plugin_name"
    mkdir -p "$dest"

    skill_count=0
    agent_count=0
    command_count=0

    # Copy skills
    if [ -d "$plugin_dir/skills" ]; then
        cp -R "$plugin_dir/skills" "$dest/skills"
        skill_count=$(ls -d "$dest/skills"/*/ 2>/dev/null | wc -l | tr -d ' ')
        info "Skills: $skill_count"

        # Flag skills with supporting files for parity notes
        for skill_dir in "$dest/skills"/*/; do
            file_count=$(find "$skill_dir" -type f | wc -l | tr -d ' ')
            if [ "$file_count" -gt 1 ]; then
                skill_name=$(basename "$skill_dir")
                has_scripts=$(find "$skill_dir" -name "*.sh" -type f | head -1)
                if [ -n "$has_scripts" ]; then
                    parity_notes+=("$plugin_name/$skill_name: contains scripts — test cross-tool execution")
                else
                    parity_notes+=("$plugin_name/$skill_name: has supporting files ($file_count files)")
                fi
            fi
        done
    fi

    # Copy agents
    if [ -d "$plugin_dir/agents" ]; then
        cp -R "$plugin_dir/agents" "$dest/agents"
        agent_count=$(find "$dest/agents" -name "*.md" -type f | wc -l | tr -d ' ')
        info "Agents: $agent_count (Claude Code only)"
    fi

    # Copy commands
    if [ -d "$plugin_dir/commands" ]; then
        cp -R "$plugin_dir/commands" "$dest/commands"
        command_count=$(find "$dest/commands" -name "*.md" -type f | wc -l | tr -d ' ')
        info "Commands: $command_count (Claude Code only)"
    fi

    # Generate openpackage.yml
    generate_manifest "$plugin_json" "$dest/openpackage.yml"
    info "Generated openpackage.yml"

    # Generate README.md
    generate_readme "$plugin_name" "$dest/README.md" "$skill_count" "$agent_count" "$command_count"
    info "Generated README.md"

    total_skills=$((total_skills + skill_count))
    total_agents=$((total_agents + agent_count))
    total_commands=$((total_commands + command_count))
    plugins_built=$((plugins_built + 1))
done

# ── Validate ─────────────────────────────────────────────────────────────────

if command -v uv &> /dev/null && [ -f "$REPO_ROOT/pyproject.toml" ]; then
    header "Validating skills"
    if uv run "$REPO_ROOT/scripts/validate-skills-dist.py" "$DIST_DIR"; then
        info "All skills passed validation"
    else
        printf "\n  WARNING: Some skills failed validation. Review errors above.\n"
    fi
fi

# ── Format ───────────────────────────────────────────────────────────────────

if command -v npx &> /dev/null; then
    npx prettier --write "$DIST_DIR"/**/*.md > /dev/null 2>&1
    info "Formatted markdown files with Prettier"
fi

# ── Summary ──────────────────────────────────────────────────────────────────

header "Build complete"
info "Plugins: $plugins_built"
info "Skills:  $total_skills"
info "Agents:  $total_agents (Claude Code only)"
info "Commands: $total_commands (Claude Code only)"

if [ ${#parity_notes[@]} -gt 0 ]; then
    printf "\n  Feature parity notes:\n"
    for note in "${parity_notes[@]}"; do
        printf "    - %s\n" "$note"
    done
fi

echo ""
