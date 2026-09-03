# `_archive`-internal link exception escapes `sweep-project`'s own invariants

**Added:** 2026-09-02

Step 5b carves out one case from the rewrite: a `../<name>/` link in a document
that is _itself_ already under `docs/projects/_archive/`. Such a link is already
correct as written, and rewriting it would produce `_archive/_archive/`. The
carve-out is right — but it was added without reconciling two claims the same
file makes elsewhere, so the exception now escapes both:

1. **The four-bucket invariant.** The ordered three-question test classifies
   such a hit as **Rewrite** (it is not an Example, not historical, and is a
   link target), and Step 5b then declines to rewrite it. So the acceptance
   criterion "every discovered reference landed in exactly one of the four
   buckets" is satisfied only nominally — the hit is in a bucket whose action it
   does not receive.
2. **Correctness grep 2.** Its comment reads "nothing still points at the old
   location except Leave/Flag hits you kept," but this hit is neither Leave nor
   Flag. An executor treating that grep as a pass/fail gate either reports a
   false failure or "fixes" the link into `_archive/_archive/`.

The underlying behavior is correct and the real-repo instance is genuine
(`docs/projects/_archive/test-plan-doc-type/proposal.md:382` links to
`../design-resolution-doc-type/proposal.md`, which is also archived, so the link
is live). What is missing is making the exception first-class rather than a
footnote to a rule that contradicts it.

Likely fix: give it a real bucket — a fifth classification, or a documented
sub-case of Leave — and amend correctness grep 2's comment to expect it.

## Acceptance Criteria

- [ ] An `_archive`-internal `../<name>/` hit has one stated classification, and
      the action it receives matches that classification
- [ ] Correctness grep 2's comment accounts for the hit, so a clean run does not
      look like a failure
- [ ] The acceptance criterion about buckets is true as literally written

## References

- `plugins/project-docs/skills/sweep-project/SKILL.md` — Step 3 classification
  questions; Step 5b rewrite exception; Acceptance Criteria
- `docs/projects/_archive/test-plan-doc-type/proposal.md:382` — the real
  instance
- Found by the execution review of `feature/sweep-project-completion-marks`
