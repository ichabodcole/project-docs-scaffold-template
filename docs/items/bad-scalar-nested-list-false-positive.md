---
type: item
title: Stop BAD SCALAR firing on a list under a nested key
description:
  The new wrapped-value rule reports a valid nested mapping whose list items sit
  at the mapping's own indent, and suggests a fix that would destroy it.
status: draft
lifecycle: triage
id: 01a1eb54-938d-774f-b639-641204df8201
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-17 }
from: items/check-rejects-non-strict-yaml-frontmatter/sessions/2026-11-17-strict-yaml.md
---

# Stop BAD SCALAR firing on a list under a nested key

`scalarFaults` in `scripts/pdocs/lint/rules.ts` decides a multi-line value is a
nested mapping when every line at its base indent is `key: value`. A list whose
items sit at that indent breaks the test, so this valid frontmatter is reported
as "`checks` holds ": " in a plain multi-line value":

```yaml
checks:
  mode:
    - a
  level: 2
```

The suggested fix, `checks: >-`, would destroy the mapping. Reach is small: the
frontmatter key set is closed, so a document holding this already fails with
`UNKNOWN FIELD`, and Prettier re-indents such lists. Two rarer valid shapes are
reported too: a quoted nested key holding ` #` after the first line, and
mappings with a `? ` complex key or an empty key.

## Definition of done

- [ ] The block above lints with no `BAD SCALAR`, with a test, and it joins the
      valid-shapes list in `lint/rules.test.ts`.
- [ ] The two issue shapes from #207 are still reported.

## Related Documents

- [Frontmatter a strict YAML parser rejects — 2026-11-17](./check-rejects-non-strict-yaml-frontmatter/sessions/2026-11-17-strict-yaml.md)
