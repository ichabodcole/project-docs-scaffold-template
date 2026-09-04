---
type: backlog
title: "`sweep-project` reference boundary class misses three real terminators"
status: stable
lifecycle: open
generated: { by: unknown, at: 2026-09-02 }
---

# `sweep-project` reference boundary class misses three real terminators

Step 3's discovery pattern ends with the boundary class `([/)\"'[:space:]]|$)`,
which exists to stop `grapevine` matching `grapevine-v1.6.7`. It works for that,
but it only accepts a reference that ends at a slash, close-paren, quote,
whitespace, or end-of-line. Three forms that appear in ordinary prose are
silently missed:

```
Backtick form:   `docs/projects/grapevine` is the folder   <- MISSED
Trailing period: see docs/projects/grapevine.              <- MISSED
Comma form:      docs/projects/grapevine, and others.      <- MISSED
```

Verified against a fixture during the 3.3.0 review. The consequence is the same
silent-under-reporting the rest of Step 3 is written to prevent: a run archives
the folder, reports full reference coverage, and leaves those mentions pointing
at a path that no longer exists.

This is pre-existing — not introduced by 3.3.0 — but the skill claims its
pattern is corrected in four exhaustive ways against the naive version, which
overstates it while this gap is open.

Likely fix: extend the class to include a backtick, period, and comma. Take care
that adding `.` doesn't reintroduce a prefix collision (`grapevine.md` vs
`grapevine-v1.6`), and re-run the existing prefix-collision checks after.

## Acceptance Criteria

- [ ] All three forms above are matched by the Step 3 discovery pattern
- [ ] `grapevine` still does not match `grapevine-v1.6`, `grapevine-v1.6.7`, or
      `grapevine-backlog`
- [ ] Both acceptance-criteria greps in the same skill get the same treatment —
      they shared the previous boundary bug and must not drift apart again

## References

- `plugins/project-docs/skills/sweep-project/SKILL.md` — Step 3 discovery
  pattern and its four-part explanation; Acceptance Criteria greps
- Found by the execution review of `feature/sweep-project-completion-marks`
