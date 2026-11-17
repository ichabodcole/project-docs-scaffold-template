---
type: item
title: Rewrite a whole block scalar when pdocs set replaces a value
description:
  pdocs set stops at a blank line inside a multi-line value, leaving the rest
  orphaned under the new value, and treats a re-set of the same text as no
  change even when the shape on disk is invalid.
status: draft
lifecycle: triage
id: 01a1eb54-93eb-7266-a699-0f30efed622b
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-17 }
from: items/check-rejects-non-strict-yaml-frontmatter/sessions/2026-11-17-strict-yaml.md
---

# Rewrite a whole block scalar when pdocs set replaces a value

`rewriteFrontmatter` stops at a blank line inside a multi-line value. Running
`pdocs set --description` on

```yaml
description: |
  Line one

  Line three
```

leaves `Line three` orphaned under the new value and reports success. The file
is then invalid for a strict parser. This predates #207, but that fix steers
authors to block scalars, so it is now easier to reach.

Related: `pdocs set --description "<the same text>"` on a document that
`BAD SCALAR` reports returns `changed: false` and leaves the bad shape, so the
repair has to be a hand edit.

## Definition of done

- [ ] `pdocs set` replaces a block scalar with blank lines whole, with a test
      that parses the result with a strict YAML parser.
- [ ] Re-setting the same text on a value `BAD SCALAR` reports rewrites it in a
      valid form.

## Related Documents

- [Frontmatter a strict YAML parser rejects — 2026-11-17](./check-rejects-non-strict-yaml-frontmatter/sessions/2026-11-17-strict-yaml.md)
