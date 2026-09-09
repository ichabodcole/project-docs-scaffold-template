#!/usr/bin/env python3
"""
Normalize Claude Code frontmatter extensions in dist/ to base Agent Skills spec.

- `allowed_tools` (underscore) becomes `allowed-tools` (hyphen)
- JSON-style arrays become YAML-style block lists

Usage: python3 scripts/normalize-skill-frontmatter.py [dist_dir]

THIS IS A BUILD STEP, NOT A VALIDATION STEP, AND THAT DISTINCTION IS WHY THIS
FILE EXISTS. It used to live inside `validate-skills-dist.py`, which the build
runs only `if command -v uv` — so `dist/` came out one shape on a machine with
uv and another shape without one. `check:dist` rebuilds and compares, so it
passed locally and could not pass in CI, which installs no uv. The gate was
unpassable in the one place it is not bypassable.

Nothing here imports anything outside the standard library, deliberately: a
step that changes the build's output cannot be conditional on an optional tool.
`validate-skills-dist.py` still needs `skills_ref`, and stays optional — it only
reads.
"""

import re
import sys
from pathlib import Path


def json_array_to_yaml_list(match: "re.Match[str]") -> str:
    key = match.group(1)
    items = re.findall(r'"([^"]*)"', match.group(2))
    if not items:
        return match.group(0)
    return "\n".join([f"{key}:"] + [f"  - {item}" for item in items])


def normalize_frontmatter(skill_md: Path) -> bool:
    """Returns True if the file was changed."""
    content = skill_md.read_text(encoding="utf-8")
    if not content.startswith("---"):
        return False

    parts = content.split("---", 2)
    if len(parts) < 3:
        return False

    frontmatter, body = parts[1], parts[2]
    original = frontmatter

    if "allowed_tools:" in frontmatter:
        frontmatter = frontmatter.replace("allowed_tools:", "allowed-tools:")

    frontmatter = re.sub(
        r"^(\S[^:]+):\s*\[([^\]]*)\]",
        json_array_to_yaml_list,
        frontmatter,
        flags=re.MULTILINE,
    )

    if frontmatter == original:
        return False
    skill_md.write_text(f"---{frontmatter}---{body}", encoding="utf-8")
    return True


def main() -> None:
    dist_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("dist")
    if not dist_dir.exists():
        print(f"Error: {dist_dir} does not exist. Run build-skills-dist.sh first.")
        sys.exit(1)

    changed = 0
    total = 0
    for skill_dir in sorted(dist_dir.glob("*/skills/*/")):
        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            skill_md = skill_dir / "skill.md"
            if not skill_md.exists():
                continue
        total += 1
        if normalize_frontmatter(skill_md):
            changed += 1

    print(f"  Normalized {changed} of {total} skill frontmatter blocks")


if __name__ == "__main__":
    main()
