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
    """Move one payload path into the parent, refusing to overwrite.

    Returns False on a collision, and THE CALLER MUST STOP. This used to
    return False into nobody: the install printed its warning, carried on, and
    finished with `Documentation structure installed` and six next steps —
    having installed `docs/` and not the CLI that checks it. The warning
    scrolled past inside a success message, and the recovery line it printed
    named a directory `shutil.rmtree` deleted four lines later, so there was
    nothing left to recover from either.
    """
    if os.path.exists(target):
        print(f"\n⚠️  {label} already exists in the current directory.")
        print("   Installation aborted rather than overwrite it.")
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
    # travel with docs/, and THAT IS THE WHOLE PAYLOAD — the four moves below
    # are everything the template has to give.
    #
    # It used to be more, and the rest was a development setup for code the
    # consumer does not own: a `package.json` wrapping the CLI in `docs:lint` /
    # `docs:graph` / `docs:report`, a `tsconfig.json` to typecheck it, the CLI's
    # own test suite, and a `.gitignore` for the `node_modules/` and `bun.lock`
    # that `package.json` implied. The wrapper covered three of the CLI's eight
    # verbs and had to pin `--format` to defeat the CLI's own resolution, so it
    # taught a partial interface badly; `pdocs` has no dependencies, so nothing
    # was ever installed for the ignore file to ignore.
    #
    # What is left needs no install and no configuration: run it, or wrap it
    # yourself if you want a shorthand in your own `package.json`.
    #
    # ONE DIRECTORY, not two. `docs-lint/` is the lint's portable core and it
    # used to land beside `pdocs/` as a second entry in a `scripts/` folder that
    # is the project's, not ours — an implementation detail of this tool showing
    # up as a directory the consumer has to account for. It lives inside
    # `scripts/pdocs/` now, so a project gains exactly one thing it does not own
    # and `update-project-docs` replaces it as one directory.
    #
    # A collision here is FATAL, and the `docs/` branch above is why: an
    # existing `scripts/pdocs/` is somebody else's, we cannot merge into it, and
    # `docs/` without the CLI is a contract with nothing that checks it. Note
    # `scripts/` ITSELF is not a collision — `makedirs(..., exist_ok=True)` in
    # `_move` merges into an existing one, leaving every file in it alone.
    moved = [os.path.join(parent_dir, "docs")]
    for source, target, label in (
        (
            os.path.join(project_dir, "scripts", "pdocs"),
            os.path.join(parent_dir, "scripts", "pdocs"),
            "scripts/pdocs/",
        ),
        (
            os.path.join(project_dir, ".project-docs.json"),
            os.path.join(parent_dir, ".project-docs.json"),
            ".project-docs.json",
        ),
    ):
        if _move(source, target, label):
            moved.append(target)
            continue

        # Put back what already went out, so the tree is as it was found and
        # the payload is still there to look at. Half an install is worse than
        # none: `docs/` alone passes nothing, and the next run would abort on
        # the `docs/` branch instead of saying what actually blocked it.
        for done in moved:
            shutil.move(done, os.path.join(project_dir, os.path.basename(done)))
        print("   Nothing was installed; your tree is as you left it.")
        print(f"   The generated layer is in ./{os.path.basename(project_dir)}/")
        print("   Move it in by hand — or, if you are upgrading an existing")
        print("   scaffold, run /project-docs:update-project-docs instead.\n")
        return

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
