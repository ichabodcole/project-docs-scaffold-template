---
type: item
title: Print each library-tier problem once, with one path form
description:
  pdocs check prints library-tier frontmatter problems twice, once with a docs/
  prefix and once without.
status: draft
lifecycle: triage
id: 01a0ff09-eb6c-7636-b533-066f03d9eeb3
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-02 }
source: "#198"
---

# Print each library-tier problem once, with one path form

For library-tier pages, `check` prints a frontmatter problem twice: once from
the presence check with a `docs/` prefix, once from the graph tier without it
and in another format:

```
MISSING tags   docs/playbooks/tenant-api-key-lifecycle-playbook.md
MISSING tags  playbooks/tenant-api-key-lifecycle-playbook.md  (expected `tags: [ ... ]`)
```

operator-mono saw 1,851 reports for about 1,450 problems, and the two path forms
defeat `sort -u` and `grep -F -f`.

Reported in
[#198](https://github.com/ichabodcole/project-docs-scaffold-template/issues/198).

## Definition of done

- [ ] Each (rule, path) problem is reported once, in one path form, in text and
      JSON, with a test.
