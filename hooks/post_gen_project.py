#!/usr/bin/env python
"""Post-generation hook for project-docs-scaffold-template."""

import json
import os
import shutil

LAYER_NOTE = """     ─────────────────────────────────────────────────────
     ## Documentation

     This project uses structured documentation in `docs/`.
     See [docs/README.md](./docs/README.md) for the full
     structure overview and document type guide.

     Every document carries a frontmatter block, and
     [docs/SCHEMA.md](./docs/SCHEMA.md) is the contract for
     it — which fields, which vocabularies, and what
     `bun scripts/pdocs/cli.ts check` checks. Read it before
     creating or editing a document.

     For quick onboarding on recent work, start with
     [docs/memories/](./docs/memories/).
     ─────────────────────────────────────────────────────
"""

# The current-directory branch does not write a `package.json`, so it prints
# the scripts for a human to paste into theirs. Those bodies are NOT written
# out here: they are READ from the payload's own `package.json` at print time.
#
# This used to be a literal, and it is exactly the kind of literal that rots.
# The same four scripts were stated in three places — the repo's own
# `package.json`, the payload's, and this constant — and the third copy drifted:
# `--format text` was added to `docs:lint` and `docs:report` in the first two
# and not here, so this hook spent a release telling people to install a script
# that emits JSON into their CI log. `pdocs` prints text on a TTY and JSON
# everywhere else, which is why the flag is load-bearing rather than cosmetic.
#
# One statement, one place. The payload's `package.json` is the contract; this
# renders it.
#
# Only the NAMES below are stated twice, and only to leave one out. `typecheck`
# is `tsc --noEmit`, which needs a `tsconfig.json` — and this branch
# deliberately does not move ours (see `install_to_current_directory`). Printing
# it would recommend a script that cannot run. The `tsconfig` `include` an
# existing project does need is step 3 of the printed instructions instead.
UNINSTALLABLE_SCRIPTS = ("typecheck",)


def render_package_scripts(project_dir):
    """Render the payload's own docs scripts as pasteable `package.json` lines.

    Read before the payload directory is deleted — `install_to_current_directory`
    calls this at entry, and `shutil.rmtree`s `project_dir` well after.

    A missing or malformed `package.json` raises. That can only mean a broken
    payload, and a broken payload should fail generation loudly rather than
    print a quietly shorter list.
    """
    with open(os.path.join(project_dir, "package.json")) as handle:
        scripts = json.load(handle)["scripts"]

    entries = [(k, v) for k, v in scripts.items() if k not in UNINSTALLABLE_SCRIPTS]

    # Align the values the way a hand-written block would be — this is pasted
    # into a file a person reads.
    width = max(len(k) for k, _ in entries) + 3  # quotes and the colon
    lines = []
    for index, (name, body) in enumerate(entries):
        key = f'"{name}":'.ljust(width)
        comma = "," if index < len(entries) - 1 else ""
        lines.append(f'     {key} "{body}"{comma}')
    return "\n".join(lines) + "\n"


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

    # Read the scripts NOW, while the payload still exists. Everything below
    # moves pieces of it out and then deletes what is left, and the block is
    # printed after that.
    package_scripts = render_package_scripts(project_dir)

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
    # travel with docs/. `package.json`, `tsconfig.json` and `.gitignore`
    # deliberately do NOT: an existing project has its own of each, and
    # overwriting them to install a doc lint would be a poor trade.
    #
    # What those two files would have carried gets PRINTED instead, and the
    # print is derived rather than restated — the package scripts come out of
    # the payload's own `package.json` (see `render_package_scripts`), and the
    # `tsconfig` `include` is step 3. Neither is optional: without the scripts
    # there is no `npm run docs:lint`, and without `scripts/**/*.ts` in
    # `include` the project's `tsc` never sees the CLI it just installed.
    #
    # `scripts/pdocs/` is not optional. It holds every rule the gate enforces
    # and the entry point the printed scripts name; without it `docs/` arrives
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
    print("  1. Install the project-docs plugin for Claude Code:")
    print("     /plugin marketplace add ichabodcole/project-docs-scaffold-template")
    print("     /plugin install project-docs")
    print("  2. Add these scripts to your package.json (they were not written,")
    print("     so your own package.json is untouched):\n")
    print(package_scripts)
    print("     Then check the tree:  bun install && bun scripts/pdocs/cli.ts check")
    print("     It should print `docs-lint: clean` on a fresh scaffold.\n")
    print("  3. Add scripts/**/*.ts to your tsconfig.json `include` — the CLI")
    print("     landed in scripts/pdocs/ and your tsconfig was left untouched,")
    print("     so nothing typechecks it until you do:\n")
    print('       "include": ["docs/**/*.ts", "scripts/**/*.ts"]\n')
    print("  4. Review and customize docs/PROJECT_MANIFESTO.md")
    print("  5. Read docs/SCHEMA.md — the frontmatter contract the lint enforces")
    print("  6. Add this to your CLAUDE.md or AGENTS.md so AI agents")
    print("     discover the docs structure automatically:\n")
    print(LAYER_NOTE)
    print("  7. Start documenting! 📝\n")
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
    print("  2. bun install && bun scripts/pdocs/cli.ts check")
    print("     It should print `docs-lint: clean` on a fresh scaffold.")
    print("  3. Install the project-docs plugin for Claude Code:")
    print("     /plugin marketplace add ichabodcole/project-docs-scaffold-template")
    print("     /plugin install project-docs")
    print("  4. Review and customize docs/README.md if needed")
    print("  5. Read docs/SCHEMA.md — the frontmatter contract the lint enforces")
    print("  6. Add this to your CLAUDE.md or AGENTS.md so AI agents")
    print("     discover the docs structure automatically:\n")
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
