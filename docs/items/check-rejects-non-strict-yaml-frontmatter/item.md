---
type: item
title: Report frontmatter a strict YAML parser rejects
description:
  pdocs check passes a plain multi-line value holding a colon and a space, or
  one that starts with a quote, which strict YAML parsers refuse to read.
status: stable
lifecycle: done
id: 01a1eaa7-441a-7045-ae6d-4878bc45b011
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-17 }
source: "#207"
priority: high
cycle: 2026-11-check-fixes-and-board-research
---

# Report frontmatter a strict YAML parser rejects

`pdocs check` reads frontmatter that a strict YAML parser refuses, and reports
the tree clean. Two shapes do it, both in a plain (unquoted) multi-line value:

```yaml
description:
  The first step of Board tours: a landscape of how other tools author and
  play paths through a canvas.
```

```yaml
description:
  "Never write the active version" is the right default but an absolute today;
```

The `yaml` package rejects the first with "Implicit keys need to be on a single
line" and the second with "Unexpected scalar at node end". A tool that parses
strictly cannot open the document: Spellbook's scriptorium reported 11 Story
Studio documents as unreadable, and `pdocs check` had named none of them.

The templates and `pdocs new` write `description:` followed by indented lines,
so any description with a colon and a space in it produces the first shape.

Reported in
[#207](https://github.com/ichabodcole/project-docs-scaffold-template/issues/207).

## Definition of done

- [x] `pdocs check` reports a plain multi-line value that holds `: `, and one
      that starts with a quote and continues after the closing quote, naming the
      field and the fix (a folded block, `description: >`, `description: >-`, or
      a quoted value). Tests cover both shapes.
- [x] `pdocs new` and `pdocs set` write a value holding `: ` in a form a strict
      parser reads, with a test that parses the written file.
- [ ] Whether the report is an error or a warning is decided, and the release
      notes say what an adopter's first `check` after upgrading will show.

The report is an error, under the existing `BAD SCALAR` code. The release notes
are not written yet: the sentence for adopters goes in the v3.0 migration
guide's "After the script" list when the migration is re-pinned to the release
that carries this fix.
