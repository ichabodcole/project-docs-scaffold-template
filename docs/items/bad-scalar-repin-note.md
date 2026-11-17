---
type: item
title: Tell adopters about BAD SCALAR when the v3.0 migration is re-pinned
description:
  The stricter BAD SCALAR rule has no adopter-facing sentence yet; it belongs in
  the v3.0 guide when the migration is re-pinned to the release that carries the
  rule.
status: draft
lifecycle: triage
id: 01a1eb54-9441-7131-ad14-b3c8daa20dfa
kind: chore
generated: { by: claude-fable-5-2, at: 2026-11-17 }
from: items/check-rejects-non-strict-yaml-frontmatter/sessions/2026-11-17-strict-yaml.md
---

# Tell adopters about BAD SCALAR when the v3.0 migration is re-pinned

The #207 fix makes two frontmatter shapes an error in every tier, so an
adopter's first `check` after upgrading can exit 9. Run read-only against 15
adopter trees, five went from clean to failing, with 12 documents between them.

The fix's item asked for release notes saying what that first `check` shows. The
sentence belongs in "After the script" in
`plugins/project-docs/skills/update-project-docs/migrations/v2.10-to-v3.0.md`,
which names lint behaviour by release, and the migration's `SCAFFOLD_TAG` still
points at a release without the rule. `DUPLICATE FIELD` got its sentence the
same way, at the re-pin.

## Definition of done

- [ ] When the v3.0 migration is re-pinned to a release that carries the rule,
      the guide's "After the script" list says `check` reports `BAD SCALAR` for
      a wrapped value holding `: ` and for text after a closing quote, and gives
      the fix.

## Related Documents

- [Frontmatter a strict YAML parser rejects — 2026-11-17](./check-rejects-non-strict-yaml-frontmatter/sessions/2026-11-17-strict-yaml.md)
