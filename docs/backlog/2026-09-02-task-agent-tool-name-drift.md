---
type: backlog
title: "`Task` vs `Agent`: stale dispatch-tool name across skills and agents"
description:
  Four skills still declare the subagent tool as `Task`, a name that no longer
  exists in any current environment.
status: stable
lifecycle: open
generated: { by: unknown, at: 2026-09-02 }
---

# `Task` vs `Agent`: stale dispatch-tool name across skills and agents

The subagent dispatch tool is named **`Agent`** in current environments. `Task`
is the historical name and is not present. Several project-docs files still
reference the old name, in two different ways:

**Functional — `allowed_tools` declarations.** Four skills still declare
`"Task"`:

- `plugins/project-docs/skills/create-investigation/SKILL.md`
- `plugins/project-docs/skills/generate-dev-plan/SKILL.md`
- `plugins/project-docs/skills/generate-design-resolution/SKILL.md`
- `plugins/project-docs/skills/generate-proposal/SKILL.md`

(`finalize-branch` was fixed in 3.4.0 and now declares both.)

**Why this doesn't currently break anything — and it is not the reason you would
guess.** The canonical Claude Code frontmatter key is `allowed-tools`, with a
hyphen. This repo's source skills use `allowed_tools`, with an underscore, which
is an unrecognized key that Claude Code ignores. The marketplace installs from
`plugins/` rather than `dist/`, so the underscore form is what ships. The
declarations are therefore **not read at all** in the install path — it is not
that enforcement is lax. `scripts/validate-skills-dist.py:39-66` rewrites the
key to the hyphenated form on the way into `dist/`, which is why only the built
copy looks canonical.

That has a bearing on scope: renaming `Task` to `Agent` is correct as
documentation and correct for the `dist/` and cross-tool paths, but on its own
it changes no runtime behavior. If the intent is for these declarations to
actually restrict tooling, the underscore-vs-hyphen key name is the thing to fix
first, and that is a larger decision than this item.

One tradeoff to record before choosing "declare both": it is only safe under the
assumption that unknown tool names are ignored. Under a harness that validates
names strictly — the very scenario that would make this item urgent — `Task`
becomes the error rather than the safety net. Declaring both hedges against one
failure mode by accepting the other.

**Cosmetic — prose and example blocks.** `review-docs/SKILL.md:91` says "using
the Task tool". Eight agent definitions narrate `<uses Task tool to launch …>`
inside their `description` example blocks: `dev-plan-generator`, `docs-curator`,
`gopher-dev`, `investigator`, `proposal-writer`, `test-plan-generator`,
`unit-test-writer`, `web-researcher`. These are illustrative narration rather
than instructions, so nothing breaks — but they teach the wrong name to any
agent reading them, and agent `description` text is matched against user intent,
so it is not inert.

Worth deciding once rather than per-file: whether these should say `Agent`,
`Task`, or both. `finalize-branch` currently takes the "both" approach —
declares `Agent` and `Task`, and its prose names `Agent` with a parenthetical
noting `Task` in older environments. That is portable but verbose to repeat
fourteen times.

Two adjacent findings that belong in the same sweep:

- `ground-in-project/SKILL.md` declares `LS`, a legacy tool name in the same
  family as `Task`. No other skill declares it.
- All six commands also use `allowed_tools`, and commands are **not** normalized
  by the build (`build-skills-dist.sh` copies them verbatim; the validator globs
  only `*/skills/*/`). So command tool restrictions are inert in both source and
  dist. Pre-existing, and only matters if they were ever meant to bite.
- `dist/project-docs/README.md` claims skills use "only base Agent Skills spec
  fields (`name`, `description`) — no Claude Code-specific extensions." That is
  now false: 11 of 27 dist skills ship `allowed-tools`. Fix in the generating
  heredoc in `scripts/build-skills-dist.sh`, not in the generated file.

## Acceptance Criteria

- [ ] A decision recorded on the key name itself: keep `allowed_tools`
      (documentation only) or move to `allowed-tools` (actually read)
- [ ] A decision recorded on the tool name: `Agent`, or `Agent` + `Task` for
      portability, with the strict-harness tradeoff above weighed
- [ ] All four remaining `allowed_tools` declarations updated to match
- [ ] `review-docs/SKILL.md` prose and the eight agent example blocks updated
- [ ] `ground-in-project`'s `LS` resolved
- [ ] The `dist/` README claim about frontmatter fields corrected at its source
- [ ] Mirrored into `dist/project-docs/` and the plugin version bumped

## References

- `plugins/project-docs/skills/finalize-branch/SKILL.md` — the pattern already
  applied, for reference
- Found by the cold reader validating
  [2026-08-10-code-review-subagent-needs-execution.md](./_archive/2026-08-10-code-review-subagent-needs-execution.md)
