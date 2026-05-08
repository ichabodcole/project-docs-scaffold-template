# Digestify --reference flag shipped

**Date:** 2026-05-07

Extended the digestify skill so the agent can pass `--reference PATH` pointing
at an existing doc on disk. The doc renders in the browser without its content
round-tripping through the agent's context — the big token-efficiency win for
reviews of long proposals, READMEs, brain-dumps. Combinable with stdin /
`--file` (reference body lands first, then a labeled boundary marker, then agent
content). Also relaxed the parser's "must have ≥1 question" rule so
pure-reading + inline-comment sessions work. Toolbox bumped to 1.4.0.

**Key files:** `plugins/toolbox/skills/digestify/scripts/review.py`,
`plugins/toolbox/skills/digestify/scripts/template.html`,
`docs/projects/digestify-reference-input/proposal.md`,
`docs/projects/digestify-reference-input/sessions/2026-05-07-initial-implementation.md`

**Docs:** [Project folder](../projects/digestify-reference-input/) — proposal
with decisions made during dogfood and follow-up notes (including a pre-existing
markdown link-rendering limitation that became more visible with reference
docs).
