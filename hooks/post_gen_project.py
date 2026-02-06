#!/usr/bin/env python
"""Post-generation hook for project-docs-scaffold-template."""


def main():
    """Run post-generation tasks."""
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


if __name__ == '__main__':
    main()
