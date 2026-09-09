---
type: backlog
title: User-defined folders and document types
description:
  Let a project declare its own folders and types in .project-docs.json and have
  the lint and pdocs new honour them.
tags: [docs-lint, config, extensibility]
status: draft
lifecycle: open
generated: { by: claude-opus-5, at: 2026-09-04 }
---

# User-defined folders and document types

A project using this scaffold should be able to add its own folder — say
`docs/decisions/` holding `decision` documents — with its own template, and have
the frontmatter contract apply to it unchanged.

**Today the door is half-open, which is worse than closed.** `lint.durable` and
`lint.workbench` in `.project-docs.json` are already configurable, so the walker
will happily find files in a folder you add. The type vocabulary is not. Adding
`decisions` to `lint.durable` and dropping in a `type: decision` page produces:

```
WRONG TYPE     docs/decisions/exit-codes-below-125.md: "decision" (its position says "")
BAD type       decisions/exit-codes-below-125.md: "decision" not in {architecture, …}
ORPHAN         decisions/exit-codes-below-125.md
```

Note `its position says ""` — an empty string, because `DURABLE_TYPE` has no
entry for the folder. The config invites the change and then rejects it with a
message that does not explain itself. Even if the extensibility is never built,
that error should say "no type is declared for folder `decisions`".

**The shape it would take.** `.project-docs.json` gains a `types` map merged
over the built-in registry:

```json
"types": {
  "decision": {
    "folder": "decisions",
    "tier": "library",
    "lifecycle": null,
    "template": "decisions/TEMPLATE.md",
    "filename": { "date": "none", "suffix": "-decision" }
  }
}
```

The prize is not only that the lint accepts it — `pdocs new decision <name>`
would work for free, with the right path, template and frontmatter.

**What must stay fixed.** OKF `status` (`draft · stable · deprecated`, §5.4) and
`REQUIRED` are the specification, not preferences; if a project can extend
those, the format stops meaning the same thing across repositories. Per-type
`lifecycle` vocabularies are exactly where projects legitimately differ and
should be declarable.

**The hard part, and the shortcut to avoid.** `schemaTableChecks` proves the
code's tables equal `SCHEMA.md`'s prose table — the guard against stating a
contract twice and letting the copies drift. With types in config, that becomes
"the types your config declares must appear in your `SCHEMA.md`," which is
arguably better since the contract would then describe the actual tree. The
tempting shortcut is to drop the check; that would trade a real property for
convenience.

## Acceptance Criteria

- [ ] A project can declare a folder and type in `.project-docs.json` and lint
      documents in it with no code change.
- [ ] `pdocs new <user-type> <name>` honours the declared template and filename
      shape.
- [ ] `SCHEMA.md` agreement is still enforced for declared types, not dropped.
- [ ] A folder in `lint.durable` with no declared type produces an error that
      names the problem.

## References

- `scripts/pdocs/docs-lint/config.ts` — where `lint.durable` / `lint.workbench`
  live
- `scripts/pdocs/lint/registry.ts` — `buildRegistry(config)`, which already
  takes the config this item wants to extend, and the source tables it unifies
- `scripts/pdocs/lint/rules.ts` — `schemaTableChecks`, the property to preserve
- Related:
  [pdocs CLI design resolution](../projects/project-docs-cli/design-resolution.md)
  — the registry this depends on
