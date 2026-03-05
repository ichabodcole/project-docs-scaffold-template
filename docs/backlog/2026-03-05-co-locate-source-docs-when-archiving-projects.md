# Co-locate Source Documents with Projects on Archive

**Added:** 2026-03-05

When archiving a completed project, related precursor documents — backlog items,
investigations, briefs, fragments — that were the clear genesis of that project
could move into the project folder rather than being archived in their own
category's `_archive/`. This keeps the full story of a project in one place and
prevents broken or stale cross-references.

The trigger would be part of the finalization/archiving workflow: after a
project is marked complete, do a brief review of whether any standalone docs are
tightly coupled to it (e.g., "this investigation directly led to this project
and nothing else"). If so, move them into the project folder at archive time.

**Not always applicable:**

- An investigation that spawned multiple projects probably stays in
  `investigations/_archive/` — it doesn't belong to any one project
- A backlog item that was partially addressed by a project might stay in backlog
  for follow-on work
- The move is opt-in per document, not automatic

**Open questions:**

- How should moved files be named or organized within the project folder?
  Options:
  - Keep the original filename (e.g., `2026-02-01-some-idea.md`)
  - Rename with a type prefix (e.g., `backlog-some-idea.md`,
    `investigation-portability.md`)
  - Place in a subfolder (e.g., `origin/` or `precursors/`)
- Should cross-references in the project docs be updated to point to the new
  in-project location, or is proximity enough?
- Does this need a migration guide update, or is it light enough to be a
  judgment call in `finalize-branch`?
