---
type: item
title: Warn when a filled document keeps its template header
description:
  pdocs new copies a template's header comment as guidance for filling the
  document, and agents often leave it in afterwards; pdocs check should warn on
  it, and the header should say to remove it.
status: stable
lifecycle: ready
id: 01a0f942-cb7e-7456-a2c3-b115102b17dc
kind: task
generated: { by: claude-opus-5-5, at: 2026-10-01 }
scope: pdocs
cycle: 2026-10-pdocs-views
blocked_by: [01a0f8bb-50a6-7659-98ae-2fe01cfe16d4]
---

# Warn when a filled document keeps its template header

Every template opens with a comment block:
`OWNERSHIP (of this template file — not of documents created from it)`, then
usage notes and, in most, who writes each field. `pdocs new` copies the template
body intact, this block included. That is deliberate: the agent filling the
document reads it as guidance. But once the document is filled the block is
noise, and agents often leave it in. On 2026-10-01, 23 documents in this
repository still carried it, mostly sessions and items written through
`pdocs new`, and `pdocs check` passed every one.

Cole's call (2026-10-01): keep copying the block, warn when it stays, and have
the block itself say to remove it.

- **The header says to remove it.** Each template's header gains a line telling
  whoever fills the document to delete the block once the document is written.
- **`pdocs check` warns.** A document that is not a template but still holds the
  header (matched by its fixed opening line, `OWNERSHIP (of this template file`)
  is reported as a warning, not an error: one row per document, naming the file
  and what to delete. A warning keeps a clean exit code, using the same advisory
  tier as the [draft review advisories](./pdocs-draft-review-advisories.md).
- **The per-section comments are out of scope.** Guidance comments further down
  a template stay where they are and are not checked.

## Definition of done

- [ ] Every shipped template's header carries a line saying to delete the block
      once the document is filled, in this repository and the payload.
- [ ] `pdocs check` reports a non-template document that still holds the header
      as a warning, with the file and the fix; templates themselves are never
      reported. Warnings alone leave the exit code at success, in text and JSON.
- [ ] Tests cover a filled document with the header, a template, a document
      without it, and the exit code when only warnings are found.
- [ ] The documents in this repository that carry the header have it removed.
