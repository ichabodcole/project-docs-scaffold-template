---
type: memory
title:
  "Completion marks generalized; two fail-open checks found by execution review"
status: stable
generated: { by: unknown, at: 2026-09-02 }
---

# Completion marks generalized; two fail-open checks found by execution review

Shipped project-docs 3.3.0. `sweep-project` no longer reasons about checkboxes
specifically but about **completion marks** — any deliberate in-document signal
that work is done (status line, per-phase annotation, inline addendum,
past-tense prose) — read in whatever idiom the document already uses, and
verified by sampling three load-bearing claims rather than re-deriving all of
them. The stance is asymmetric: unmarked-but-shipped is a documentation gap to
close, marked-but-absent is a claim to disbelieve.

The durable lesson is about review, not the skill. Two rounds of cold reading
returned twelve defects, and the two that mattered were **checks that fail
open** — `finalize-branch`'s sha scan had no `git -C "$ROOT"` anchor, so from a
subdirectory it searched one subtree and reported zero citations; and
`sweep-project`'s backlog discovery required a literal `backlog/`, which flat
sibling links never contain. Both reported success while inspecting nothing.
Neither surfaces as an error; both simply let a destructive action through.
`sweep-project` already documented the `-C "$ROOT"` hazard in its own text —
stating a hazard in one file does not transfer it to the next.

Also: the repo's `## Branch Landing Policy` was unreachable. It forbade
squashing any branch with "more than one distinct author/attribution trailer,"
while the repo mandates a `Co-Authored-By: Claude` trailer on every commit, so
its stated default could never apply. Rewritten to name the real case — multiple
**Anthill seats** each signing their own commits — and made a fact about the
branch, not the project.

**Key files:** `plugins/project-docs/skills/sweep-project/SKILL.md`,
`plugins/project-docs/skills/finalize-branch/SKILL.md` (Steps 6 and 8),
`AGENTS.md` (Branch Landing Policy)

**Docs:**
[session](../projects/sweep-project/sessions/2026-09-02-completion-marks-generalization.md)
— full account, including two defects introduced by this change and caught in
review; supersedes the checkbox framing in
[2026-08-07](./2026-08-07-sweep-project-closure-touchpoint.md)
