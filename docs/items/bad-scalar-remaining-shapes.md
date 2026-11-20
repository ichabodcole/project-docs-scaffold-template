---
type: item
title: Report the other frontmatter shapes a strict parser misreads
description:
  pdocs check still passes a value under its key that holds a colon and a space
  on one line, which a strict parser reads as a mapping, and several shapes it
  rejects outright.
status: draft
lifecycle: triage
id: 01a1eb54-9336-71d7-ae0a-49aa243cb9ed
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-17 }
from: items/check-rejects-non-strict-yaml-frontmatter/sessions/2026-11-17-strict-yaml.md
---

# Report the other frontmatter shapes a strict parser misreads

The #207 fix reports a wrapped plain value holding `: ` and a value that
continues after its closing quote. Its review found shapes `pdocs check` still
passes that a strict parser does not read as the string the author meant:

- **One line under the key holding `: `.** A strict parser reads `description`
  as a mapping, not a string. The same happens when every wrapped line holds a
  colon. Two documents in adopter trees have this today.

  ```yaml
  description:
    Board tours: a landscape of how other tools author and play paths.
  ```

- **A single-line value ending in a colon**, such as `title: Notes:`.
- **A value starting with a backtick or `@`**, which YAML reserves.
- **A value starting with `[`, `{`, `*`, `>`, `!` or `&`** that then goes wrong.
- **A comment in the middle of a wrapped plain value**, an unclosed quote, and a
  wrapped list item holding `: `.

## Definition of done

- [ ] Each shape above is reported with the field named, or is listed here as
      deliberately left, with the reason.
- [ ] Each reported shape has a test whose expectation comes from a strict YAML
      parser, and the rule stays silent on every valid shape in
      `lint/rules.test.ts`.

## Related Documents

- [Frontmatter a strict YAML parser rejects — 2026-11-17](./check-rejects-non-strict-yaml-frontmatter/sessions/2026-11-17-strict-yaml.md)
