#!/usr/bin/env python3
"""
Validate dist/ skills for Agent Skills spec compliance.

READ-ONLY. Normalization moved to `normalize-skill-frontmatter.py`, which the
build runs unconditionally: this script needs `skills_ref` and therefore uv, so
anything it changed made the build's output depend on whether uv was installed.

Usage: uv run scripts/validate-skills-dist.py [dist_dir]
"""

import sys
from pathlib import Path

from skills_ref import validate


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
