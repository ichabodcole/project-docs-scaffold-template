---
type: item
title: Correct SCHEMA.md's over-claims, and look for others
description:
  SCHEMA.md says every document under docs/ carries frontmatter, which its own
  later sections and the file itself contradict; the owned guidance pages may
  make other claims broader than what is true.
status: draft
lifecycle: backlog
id: 01a0e94f-6944-710c-9c43-3a480b1564a3
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: docs
---

# Correct SCHEMA.md's over-claims, and look for others

`docs/SCHEMA.md` opens with "Every document under `docs/` carries OKF
frontmatter, and `scripts/pdocs/` checks it" (line 16), under a section titled
"Frontmatter — every page". The same file says otherwise further down. The loose
tier has no frontmatter (line 54), `lint.exclude` makes a file invisible to
every tier (line 172), and the owned files have none and are checked for links
only (line 151: "So does this file"). `SCHEMA.md` itself is the counter-example.

Nobody is blocked by it, but an agent that reads only the top of the contract
will believe something false about the tree. The owned guidance pages were
written to be firm, and other claims in them may be broader than what is true.

## Definition of done

- [ ] `SCHEMA.md`'s opening and the section title say which documents carry
      frontmatter, and which don't.
- [ ] The owned guidance pages (`SCHEMA.md`, `AGENTS.md`, `README.md` and the
      category READMEs) have been read for other absolute claims ("every",
      "always", "never", "only"). Each one found is either true as written or
      reworded, with the payload copies kept in step.
