---
type: item
title: Refuse a duplicate frontmatter key
description:
  pdocs check passes a frontmatter that repeats a key, though YAML tools
  disagree on which value wins.
status: draft
lifecycle: triage
id: 01a0ff09-9fd1-743f-b6f2-a2830ddb1c5e
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-02 }
source: "#190"
---

# Refuse a duplicate frontmatter key

`pdocs check` reports `docs-lint: clean` on a document whose frontmatter repeats
a key. YAML tools disagree on a duplicate key (most keep the last, some refuse
the document), so the value the lint validated may not be the one another tool
reads. Spellbook hit it for real: `started:` twice in a cycle document.

Repro: copy a valid item, give it a fresh `id`, and write `lifecycle: done` on
two lines. `check` prints clean and exits 0.

Reported in
[#190](https://github.com/ichabodcole/project-docs-scaffold-template/issues/190).

## Definition of done

- [ ] `check` reports a duplicate frontmatter key as an error, naming the key
      and both line numbers, with a test.
