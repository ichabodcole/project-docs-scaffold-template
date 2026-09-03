# `Root-Level Conventions` checks: heading level and "finds nothing" are both loose

**Added:** 2026-09-02

Two independent looseness bugs in `update-project-docs`, both in the Step 6 /
Root-Level Conventions machinery rather than in any one convention's content.
Neither is new; both were surfaced by the cold reader validating the 3.6.0
Branch Landing Policy example rewrite.

**1. Prose promises a heading match the check doesn't perform.** The Branch
Landing Policy subsection says to add the heading "anywhere in root `AGENTS.md`
(or `CLAUDE.md`) — matched by heading text, not position in the file." The check
is `grep -q '^## Branch Landing Policy'`, anchored to an H2. A project that
nests it as `### Branch Landing Policy` under a "Conventions" parent satisfies
the prose exactly and still fails the check. `finalize-branch` Step 8 agrees
with the check (`a '## Branch Landing Policy' heading (exact match)`), so the
prose is the outlier — either loosen the check to any heading level, or say H2
explicitly.

**2. "If the check finds nothing" is ambiguous across the two rows.** Step 6
says "If the check finds nothing, present that row's documented example
content." Row 1's check is `grep -l` (prints filenames on success); row 2's is
`grep -q`, which prints nothing either way and communicates only through exit
status. An agent reading "finds nothing" as "produced no stdout" fires the
recommendation on every project, including those that already have the policy.
The section's existing caveat covers stderr noise but not this. Say that exit
status is the signal, or make both rows use the same output convention.

## Acceptance Criteria

- [ ] Heading-level expectation consistent across the subsection prose, the
      table's check, and `finalize-branch` Step 8
- [ ] Step 6 states unambiguously that a check's exit status is the signal
- [ ] Both table rows use one output convention, or the difference is explained
- [ ] Mirrored into `dist/project-docs/` and the plugin version bumped

## References

- `plugins/project-docs/skills/update-project-docs/SKILL.md` — Step 6, the
  Root-Level Conventions table, and the Branch Landing Policy subsection
- `plugins/project-docs/skills/finalize-branch/SKILL.md` — Step 8's heading
  match
- Found by the cold reader validating the project-docs 3.6.0 example rewrite
