# Digestify skill shipped in toolbox plugin

**Date:** 2026-05-07

Built and shipped `digestify` — a one-shot browser-based markdown review tool
for terminal agents. Agent writes markdown with `:::question id=foo` fences,
Python stdlib script renders it in the user's browser, user submits answers +
inline comments back as JSON in the same agent turn. Two trigger modes: explicit
(user says "digestify") or suggested (agent proposes when sensing the shape,
fires only on agreement). Three themes (digestify default, cthulhu, classic).
Toolbox bumped to 1.2.0.

**Key files:** `plugins/toolbox/skills/digestify/`,
`docs/projects/digestify/proposal.md`,
`docs/projects/digestify/sessions/2026-05-07-initial-implementation.md`

**Docs:** [Project folder](../projects/digestify/) — proposal, session journal,
and 3-theme reference assets; design spec and implementation plan live under
`docs/superpowers/`.
