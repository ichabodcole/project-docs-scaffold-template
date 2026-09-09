#!/usr/bin/env python
"""Post-generation hook for project-docs-scaffold-template."""

import os
import shutil

LAYER_NOTE = """     ─────────────────────────────────────────────────────
     ## Documentation

     This project uses structured documentation in `docs/`.
     See [docs/README.md](./docs/README.md) for the full
     structure overview and document type guide.

     `bun scripts/pdocs/cli.ts` is the tool for this tree.
     `check` gates it; `new <type>` creates a document in the
     right folder, with the right filename and frontmatter;
     `find`, `backlinks` and `orphans` query it. Run
     `bun scripts/pdocs/cli.ts help` for the whole surface —
     it answers in JSON whenever its output is not a
     terminal. Prefer it over writing documents by hand.

     Every document carries a frontmatter block, and
     [docs/SCHEMA.md](./docs/SCHEMA.md) is the contract for
     it — which fields, which vocabularies, and what `check`
     enforces. Read it before creating or editing a document.

     For quick onboarding on recent work, start with
     [docs/memories/](./docs/memories/).
     ─────────────────────────────────────────────────────
"""


def _move(source, target, label):
    """Move one payload path into the parent, refusing to overwrite."""
    if os.path.exists(target):
        print(f"   ⚠️  {label} already exists — left yours in place.")
        print(f"      The generated one is in ./{os.path.basename(os.path.dirname(source))}/")
        return False
    os.makedirs(os.path.dirname(target), exist_ok=True)
    shutil.move(source, target)
    return True


def install_to_current_directory():
    """Move the layer into the parent directory and clean up the slug folder."""
    project_dir = os.getcwd()
    parent_dir = os.path.dirname(project_dir)
    docs_target = os.path.join(parent_dir, "docs")

    # docs/ is the whole point; if it collides there is nothing safe to do.
    if os.path.exists(docs_target):
        print("\n⚠️  A docs/ directory already exists in the current directory.")
        print("   Installation aborted to avoid overwriting existing files.")
        print(f"   Generated files are in: ./{os.path.basename(project_dir)}/docs/")
        print("   You can manually merge the contents — or, if you are upgrading an")
        print("   existing scaffold, run /project-docs:update-project-docs instead.\n")
        return

    shutil.move(os.path.join(project_dir, "docs"), docs_target)

    # The lint's portable core, the `pdocs` CLI that drives it, and its config
    # travel with docs/. `.gitignore` deliberately does not: an existing
    # project has its own, and overwriting it to install a doc lint would be a
    # poor trade.
    #
    # NOTHING ELSE IS INSTALLED, and that is the design rather than an
    # omission. This scaffold used to ship a `package.json` wrapping the CLI in
    # `docs:lint` / `docs:graph` / `docs:report`, a `tsconfig.json`, and the
    # CLI's own test suite — a development setup for code the consumer does not
    # own. The wrapper covered three of the CLI's eight verbs and had to pin
    # `--format` to defeat the CLI's own resolution, so it taught a partial
    # interface badly. `pdocs` has no dependencies, so there is nothing to
    # install and nothing to configure: run it, or wrap it yourself if you want
    # a shorthand in your own `package.json`.
    #
    # `scripts/pdocs/` is not optional. It holds every rule the gate enforces
    # and the entry point everything below names; without it `docs/` arrives
    # with a contract and nothing that checks it.
    _move(
        os.path.join(project_dir, "scripts", "docs-lint"),
        os.path.join(parent_dir, "scripts", "docs-lint"),
        "scripts/docs-lint/",
    )
    _move(
        os.path.join(project_dir, "scripts", "pdocs"),
        os.path.join(parent_dir, "scripts", "pdocs"),
        "scripts/pdocs/",
    )
    _move(
        os.path.join(project_dir, ".project-docs.json"),
        os.path.join(parent_dir, ".project-docs.json"),
        ".project-docs.json",
    )

    os.chdir(parent_dir)
    shutil.rmtree(project_dir)

    print("\n✅ Documentation structure installed into current directory!\n")
    print("📁 Project: {{ cookiecutter.project_name }}")
    print("📂 Location: ./docs/\n")
    print("Next steps:")
    print("  1. Check the tree — no install step, `pdocs` has no dependencies:\n")
    print("       bun scripts/pdocs/cli.ts check\n")
    print("     It should print `docs-lint: clean` on a fresh scaffold, and")
    print("     `bun scripts/pdocs/cli.ts help` prints the whole surface.")
    print("     Your package.json and tsconfig.json were left untouched.")
    print("     scripts/pdocs/ is delivered, not handed over: it is versioned")
    print("     with the scaffold and /project-docs:update-project-docs")
    print("     replaces it. Nothing in it is yours to edit or typecheck.\n")
    print("  2. Install the project-docs plugin for Claude Code:")
    print("     /plugin marketplace add ichabodcole/project-docs-scaffold-template")
    print("     /plugin install project-docs")
    print("  3. Review and customize docs/PROJECT_MANIFESTO.md")
    print("  4. Read docs/SCHEMA.md — the frontmatter contract the lint enforces")
    print("  5. Add this to your CLAUDE.md or AGENTS.md so AI agents")
    print("     discover the docs structure and reach for the CLI:\n")
    print(LAYER_NOTE)
    print("  6. Start documenting! 📝\n")
    print("If this directory ALREADY had a docs/ tree from an older scaffold, the")
    print("install aborted above — that upgrade path is a migration, not a copy.")
    print("Run /project-docs:update-project-docs and it will find the right one.\n")


def install_to_new_folder():
    """Standard cookiecutter output — the whole payload inside a new folder."""
    print("\n✅ Project documentation structure created successfully!\n")
    print("📁 Project: {{ cookiecutter.project_name }}")
    print("📂 Location: ./{{ cookiecutter.project_slug }}\n")
    print("Next steps:")
    print("  1. cd {{ cookiecutter.project_slug }}")
    print("  2. bun scripts/pdocs/cli.ts check   (no install — no dependencies)")
    print("     It should print `docs-lint: clean` on a fresh scaffold, and")
    print("     `bun scripts/pdocs/cli.ts help` prints the whole surface.")
    print("  3. Install the project-docs plugin for Claude Code:")
    print("     /plugin marketplace add ichabodcole/project-docs-scaffold-template")
    print("     /plugin install project-docs")
    print("  4. Review and customize docs/README.md if needed")
    print("  5. Read docs/SCHEMA.md — the frontmatter contract the lint enforces")
    print("  6. Add this to your CLAUDE.md or AGENTS.md so AI agents")
    print("     discover the docs structure and reach for the CLI:\n")
    print(LAYER_NOTE)
    print("  7. Start documenting! 📝\n")


def main():
    """Run post-generation tasks based on install target."""
    install_target = "{{ cookiecutter.install_target }}"

    if install_target == "Current directory (existing project)":
        install_to_current_directory()
    else:
        install_to_new_folder()


if __name__ == "__main__":
    main()
