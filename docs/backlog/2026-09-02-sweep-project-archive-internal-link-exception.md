---
type: backlog
title:
  "`_archive`-internal link exception escapes `sweep-project`'s own invariants"
description:
  sweep-project leaves inbound references alone when it archives a project, so
  every archive breaks the memories and sessions that cite it.
status: stable
lifecycle: done
generated: { by: unknown, at: 2026-09-02 }
---

# `_archive`-internal link exception escapes `sweep-project`'s own invariants

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

- [x] An `_archive`-internal `../<name>/` hit has one stated classification, and
      the action it receives matches that classification
- [x] Correctness grep 2's comment accounts for the hit, so a clean run does not
      look like a failure
- [x] The acceptance criterion about buckets is true as literally written

## References

- `plugins/project-docs/skills/sweep-project/SKILL.md` — Step 3 classification
  questions; Step 5b rewrite exception; Acceptance Criteria
- `docs/projects/_archive/test-plan-doc-type/proposal.md:382` — the real
  instance
- Found by the execution review of `feature/sweep-project-completion-marks`

---

## Outcome

**Done 2026-09-04**, in the `2026-09` OKF frontmatter layer cycle, which pulled
this in because the lint's first run turned it from a hypothesis into a list: of
31 broken links found across the tree, 12 were inbound references to projects
archived after the referring document was written.

The fix was the one this item proposed — give the exception a real bucket rather
than leaving it a footnote to a rule that contradicts it. `sweep-project` Step 3
now classifies on **four** questions into **five** buckets, and an
`_archive`-internal `../<name>/` hit lands in **Self-correcting**: left alone,
reported as a count, and explicitly not an omission. Only the `../` form
qualifies; a `projects/<name>` or `./<name>/` hit in the same file still falls
through to Rewrite. Correctness grep 2 filters the bucket out, so a clean run no
longer reads as a failure, and Step 5b stopped re-deciding the case it had
already been handed.

The 31 links themselves were repaired in the same cycle. What is **not** fixed
is the underlying cause — `sweep-project` still leaves inbound historical
references alone when it archives, so the next archive will break a fresh batch.
That was always the correct behaviour for a dated record and the item never
argued otherwise; it is the reason the class recurs, and worth knowing before
the next sweep.
