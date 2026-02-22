# Cookiecutter install-to-current-directory option

**Date:** 2026-02-22

Added an `install_target` choice to the cookiecutter template so users can
install `docs/` directly into their existing project directory. A
post-generation hook handles moving files and cleaning up the slug folder, with
a guard against overwriting existing `docs/`. Also fixed outdated prompts in the
root README.

**Key files:** `cookiecutter.json`, `hooks/post_gen_project.py`, `README.md`

**Docs:**
[Session](../projects/install-to-current-directory/sessions/2026-02-22-implementation.md)
