---
type: item
title: Accept cycle filenames in cycle lookup
description:
  Let cycle lookup accept either the existing filename stem or the full filename
  with .md.
status: stable
lifecycle: ready
id: 01a0f8c4-33cb-7560-8185-1a7042f56393
kind: task
generated: { by: pdocs, at: 2026-10-01 }
scope: pdocs
cycle: 2026-10-pdocs-views
---

# Accept cycle filenames in cycle lookup

`pdocs view cycle` currently resolves its argument as a cycle's filename stem.
For example, `2026-10-codex-project-docs` works, but
`2026-10-codex-project-docs.md` fails even though that is the cycle file's name.
The CLI describes the argument as a slug, which can lead callers to look for a
separate slug value in frontmatter.

Accept both forms:

- `pdocs view cycle 2026-10-codex-project-docs` (existing stem form)
- `pdocs view cycle 2026-10-codex-project-docs.md` (filename form)

Keep the filename as the cycle's identity and source of truth. Do not add a
`slug` frontmatter field. Update help and error wording to say cycle filename,
while keeping the stem form working for existing workflows. Looking up a
repository-relative path is outside this item unless implementation shows it is
needed to make the filename form unambiguous.

## Definition of done

- [ ] `view cycle` resolves a stem and the same stem with `.md` to the same
      cycle; existing unambiguous behavior remains unchanged.
- [ ] Missing and ambiguous names produce actionable errors using the filename
      terminology.
- [ ] Help, CLI documentation, cycle documentation, and relevant agent
      instructions describe the argument as the filename (with or without
      `.md`).
- [ ] No duplicate cycle identity is added to frontmatter.
- [ ] Tests cover both spellings, an unknown filename, and any ambiguity the
      accepted forms can produce.
- [ ] The pdocs test suite and documentation checks pass.

## Context

The cycle is `2026-10-codex-project-docs`, stored at
`docs/cycles/2026-10-codex-project-docs.md`. During review on October 1, 2026,
`pdocs view cycle 2026-10-codex-project-docs.md` failed with “names no cycle”
while the stem form worked.
