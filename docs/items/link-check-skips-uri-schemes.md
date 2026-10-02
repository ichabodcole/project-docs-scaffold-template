---
type: item
title: Skip links with a URI scheme in the link check
description:
  The link check reads operator://, file:// and other custom-scheme links as
  file paths and reports them MISSING FILE.
status: draft
lifecycle: triage
id: 01a0ff09-e97b-72b7-9bff-f71e9d2e57bf
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-02 }
source: "#192"
---

# Skip links with a URI scheme in the link check

The link check skips only `http(s)://` and `mailto:`, so links with any other
scheme are read as file paths and reported `MISSING FILE`: `operator://…`,
`braindump://…`, `op:doc/…`, `file:///…`. operator-mono links its documents with
app URIs, and 41 such links failed the gate; the only way through was turning
them into code spans.

Reported in
[#192](https://github.com/ichabodcole/project-docs-scaffold-template/issues/192).

## Definition of done

- [ ] A link target that starts with a URI scheme (`[a-z][a-z0-9+.-]*:`) is
      treated as external and skipped, with a test that a relative path
      containing a colon later on is still checked.
