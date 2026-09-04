---
type: backlog
title:
  '`Root-Level Conventions`: "if the check finds nothing" is ambiguous across
  the two rows'
status: stable
lifecycle: open
generated: { by: unknown, at: 2026-09-02 }
---

# `Root-Level Conventions`: "if the check finds nothing" is ambiguous across the two rows

A looseness bug in `update-project-docs`, in the Step 6 / Root-Level Conventions
machinery rather than in any one convention's content. Not new; surfaced by the
cold reader validating the 3.6.0 Branch Landing Policy example rewrite.

Step 6 says "If the check finds nothing, present that row's documented example
content." Row 1's check is `grep -l` (prints filenames on success); row 2's is
`grep -q`, which prints nothing either way and communicates only through exit
status. An agent reading "finds nothing" as "produced no stdout" fires the
recommendation on every project, including those that already have the
convention. The section's existing caveat covers stderr noise but not this. Say
that exit status is the signal, or make both rows use the same output
convention.

_A second issue filed here originally — the subsection prose promising a heading
match looser than the `^## `-anchored check performs — was fixed in 3.6.0 while
the branch that filed this was still open. The prose now states the level
requirement explicitly._

## Acceptance Criteria

- [ ] Step 6 states unambiguously that a check's exit status is the signal
- [ ] Both table rows use one output convention, or the difference is explained
- [ ] Mirrored into `dist/project-docs/` and the plugin version bumped

## References

- `plugins/project-docs/skills/update-project-docs/SKILL.md` — Step 6 and the
  Root-Level Conventions table
- Found by the cold reader validating the project-docs 3.6.0 example rewrite
