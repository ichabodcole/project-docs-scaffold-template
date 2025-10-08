#!/usr/bin/env python
"""Post-generation hook for project-docs-scaffold-template."""
import os
import shutil

# Directories to rename from underscore to dotfile
RENAMES = {
    '_claude': '.claude',
    '_cursor': '.cursor',
}


def main():
    """Run post-generation tasks."""
    print("\n🔧 Running post-generation setup...\n")

    # Rename underscore-prefixed directories to dotfiles
    for old_name, new_name in RENAMES.items():
        if os.path.exists(old_name):
            shutil.move(old_name, new_name)
            print(f"✓ Renamed {old_name} → {new_name}")

    # Remove AI commands directory if not requested
    if '{{ cookiecutter.include_ai_commands }}' != 'y':
        if os.path.exists('.claude'):
            shutil.rmtree('.claude')
            print("✓ Removed .claude (not requested)")

    # Remove Cursor rules directory if not requested
    if '{{ cookiecutter.include_cursor_rules }}' != 'y':
        if os.path.exists('.cursor'):
            shutil.rmtree('.cursor')
            print("✓ Removed .cursor (not requested)")

    # Remove global docs directory if not requested
    if '{{ cookiecutter.include_global_docs }}' != 'y':
        if os.path.exists('global-docs'):
            shutil.rmtree('global-docs')
            print("✓ Removed global-docs (not requested)")

    print("\n✅ Project documentation structure created successfully!\n")
    print("📁 Project: {{ cookiecutter.project_name }}")
    print("📂 Location: ./{{ cookiecutter.project_slug }}\n")
    print("Next steps:")
    print("  1. cd {{ cookiecutter.project_slug }}")
    print("  2. Review and customize docs/README.md if needed")
    print("  3. Start documenting! 📝\n")


if __name__ == '__main__':
    main()
