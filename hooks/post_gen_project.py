#!/usr/bin/env python
"""Post-generation hook for project-docs-scaffold-template."""

import os
import shutil


def install_to_current_directory():
    """Move docs/ to the parent directory and clean up the slug folder."""
    project_dir = os.getcwd()
    parent_dir = os.path.dirname(project_dir)
    docs_source = os.path.join(project_dir, "docs")
    docs_target = os.path.join(parent_dir, "docs")

    if os.path.exists(docs_target):
        print("\n⚠️  A docs/ directory already exists in the current directory.")
        print("   Installation aborted to avoid overwriting existing files.")
        print(f"   Generated files are in: ./{os.path.basename(project_dir)}/docs/")
        print("   You can manually merge the contents.\n")
        return

    shutil.move(docs_source, docs_target)
    os.chdir(parent_dir)
    shutil.rmtree(project_dir)

    print("\n✅ Documentation structure installed into current directory!\n")
    print("📁 Project: {{ cookiecutter.project_name }}")
    print("📂 Location: ./docs/\n")
    print("Next steps:")
    print("  1. Install the project-docs plugin for Claude Code:")
    print("     /plugin marketplace add ichabodcole/project-docs-scaffold-template")
    print("     /plugin install project-docs")
    print("  2. Review and customize docs/PROJECT_MANIFESTO.md")
    print("  3. Start documenting! 📝\n")


def install_to_new_folder():
    """Standard cookiecutter output — docs/ inside a new project folder."""
    print("\n✅ Project documentation structure created successfully!\n")
    print("📁 Project: {{ cookiecutter.project_name }}")
    print("📂 Location: ./{{ cookiecutter.project_slug }}\n")
    print("Next steps:")
    print("  1. cd {{ cookiecutter.project_slug }}")
    print("  2. Install the project-docs plugin for Claude Code:")
    print("     /plugin marketplace add ichabodcole/project-docs-scaffold-template")
    print("     /plugin install project-docs")
    print("  3. Review and customize docs/README.md if needed")
    print("  4. Start documenting! 📝\n")


def main():
    """Run post-generation tasks based on install target."""
    install_target = "{{ cookiecutter.install_target }}"

    if install_target == "Current directory (existing project)":
        install_to_current_directory()
    else:
        install_to_new_folder()


if __name__ == "__main__":
    main()
