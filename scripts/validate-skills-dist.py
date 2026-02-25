#!/usr/bin/env python3
"""
Validate and normalize dist/ skills for Agent Skills spec compliance.

Normalizes Claude Code extensions to base spec format, then validates
each skill using skills-ref.

Usage: uv run scripts/validate-skills-dist.py [dist_dir]
"""

import re
import sys
from pathlib import Path

from skills_ref import validate


def normalize_frontmatter(skill_md: Path) -> bool:
    """Normalize Claude Code frontmatter extensions to base Agent Skills spec.

    - Converts allowed_tools (underscore) to allowed-tools (hyphen)
    - Converts JSON-style arrays to YAML-style lists

    Returns True if changes were made.
    """
    content = skill_md.read_text(encoding="utf-8")

    if not content.startswith("---"):
        return False

    parts = content.split("---", 2)
    if len(parts) < 3:
        return False

    frontmatter = parts[1]
    body = parts[2]
    changed = False

    # Convert allowed_tools to allowed-tools
    if "allowed_tools:" in frontmatter:
        frontmatter = frontmatter.replace("allowed_tools:", "allowed-tools:")
        changed = True

    # Convert JSON-style arrays to YAML-style lists
    # Matches: key: ["item1", "item2", ...]
    def json_array_to_yaml_list(match):
        key = match.group(1)
        items_str = match.group(2)
        # Parse items from JSON array
        items = re.findall(r'"([^"]*)"', items_str)
        if not items:
            return match.group(0)
        yaml_lines = [f"{key}:"]
        for item in items:
            yaml_lines.append(f"  - {item}")
        return "\n".join(yaml_lines)

    new_frontmatter = re.sub(
        r'^(\S[^:]+):\s*\[([^\]]*)\]',
        json_array_to_yaml_list,
        frontmatter,
        flags=re.MULTILINE,
    )
    if new_frontmatter != frontmatter:
        frontmatter = new_frontmatter
        changed = True

    if changed:
        skill_md.write_text(f"---{frontmatter}---{body}", encoding="utf-8")

    return changed


def main():
    dist_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("dist")

    if not dist_dir.exists():
        print(f"Error: {dist_dir} does not exist. Run build-skills-dist.sh first.")
        sys.exit(1)

    skill_dirs = sorted(dist_dir.glob("*/skills/*/"))
    if not skill_dirs:
        print(f"No skills found in {dist_dir}")
        sys.exit(1)

    total = 0
    normalized = 0
    errors = []

    print(f"\nValidating {len(skill_dirs)} skills in {dist_dir}/\n")

    for skill_dir in skill_dirs:
        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            # Check for lowercase variant
            skill_md = skill_dir / "skill.md"
            if not skill_md.exists():
                errors.append(f"  {skill_dir.relative_to(dist_dir)}: missing SKILL.md")
                total += 1
                continue

        total += 1
        plugin_name = skill_dir.parts[-3]  # dist/<plugin>/skills/<skill>
        skill_name = skill_dir.name
        label = f"{plugin_name}/{skill_name}"

        # Normalize frontmatter
        if normalize_frontmatter(skill_md):
            normalized += 1

        # Validate
        validation_errors = validate(skill_dir)
        if validation_errors:
            for err in validation_errors:
                errors.append(f"  {label}: {err}")
        else:
            print(f"  {label}: ok")

    # Summary
    print(f"\n{'=' * 40}")
    print(f"Skills: {total}")
    print(f"Normalized: {normalized}")
    print(f"Errors: {len(errors)}")

    if errors:
        print(f"\nValidation errors:")
        for err in errors:
            print(err)
        sys.exit(1)
    else:
        print("\nAll skills valid.")


if __name__ == "__main__":
    main()
