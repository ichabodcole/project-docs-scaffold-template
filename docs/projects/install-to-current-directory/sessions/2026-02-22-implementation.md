# Session: Install to Current Directory

**Date:** 2026-02-22 **Branch:** `feat/install-to-current-directory` **Status:**
Complete

## Goal

Add the ability to install the docs scaffold directly into an existing project's
current directory, rather than always creating a new parent folder.

## What Was Done

1. **Added `install_target` choice variable** to `cookiecutter.json` as the
   first prompt — users choose between "Current directory (existing project)"
   and "New project folder"

2. **Implemented post-generation hook** (`hooks/post_gen_project.py`) with two
   paths:
   - **Current directory:** Moves `docs/` from the generated slug folder up to
     the parent directory, then removes the slug folder. Includes a guard that
     aborts if `docs/` already exists to prevent data loss.
   - **New project folder:** Standard cookiecutter behavior with success
     message.

3. **Updated root README.md:**
   - Fixed outdated prompts (removed references to `project_description`,
     `author_name`, `year` which don't exist in `cookiecutter.json`)
   - Added two usage examples (existing project + new project)
   - Updated generated structure to include `briefs/`
   - Replaced workaround-heavy "Adding to Existing Projects" section with
     first-class feature description

## Testing

- Verified "Current directory" path: docs/ installed correctly, slug folder
  cleaned up
- Verified existing `docs/` guard: installation aborted with helpful message
- Verified "New project folder" path: standard behavior preserved

## Decisions

- **First question:** `install_target` is the first prompt because it determines
  the entire installation behavior
- **Guard over overwrite:** If `docs/` exists, abort rather than merge or
  overwrite — safer default, users can manually merge
- **No plugin changes:** This is purely a cookiecutter template feature, no
  plugin version bump needed
