# Code review subagent misses issues without shell access

**Added:** 2026-08-10

Recurring feedback from agents running the finalize-branch review step: the code
review subagent ends up doing a static read-and-grep review because it has no
`Bash` tool. Code review isn't only reading code and docs — it often means
running the tests, invoking the CLI, reproducing a reported defect, or executing
a check script. Without execution the reviewer reasons about what the code
_should_ do instead of observing what it does, and misses real issues.

The concrete offender is `feature-dev:code-reviewer`, whose tool list is
`Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput`
— no `Bash`. That agent lives in the `feature-dev` plugin, which this repo does
not own, so we can't just add the tool. What we own is which reviewer
`finalize-branch` tells the agent to dispatch.

`finalize-branch` Step 2 was already updated (commit `5298cf7`, plus the
uncommitted changes on `develop`) to require verifying the reviewer has shell
access before dispatching, and to demote `feature-dev:code-reviewer` to a paired
second opinion. **This item is to validate that guidance actually holds in
practice** — the feedback may predate the change, or the change may not be
strong enough to override an agent's habit of reaching for the familiar reviewer
name.

Options if validation shows it's still failing:

- Ship a project-docs-owned code-reviewer agent with full tool access
  (`plugins/project-docs/agents/`), so the skill can name a reviewer we control
  instead of negotiating capability at dispatch time.
- Drop the enumerated reviewer list from Step 2 entirely and state the
  requirement instead ("dispatch any reviewer with shell access"), removing the
  named agent that keeps getting picked.
- Keep the list but make the capability check a hard gate with an explicit
  disclosure requirement when no execution-capable reviewer exists.

## Outcome (2026-09-02)

**Validated: the guidance holds.** `finalize-branch` was run for real on
`feature/sweep-project-completion-marks`. The capability check happened before
dispatch, `feature-dev:code-reviewer` was excluded for lacking `Bash`, and two
execution-capable reviewers ran. The execution reviewer genuinely executed —
built git fixtures, ran the discovery greps — and found two fail-open defects a
static read would have missed.

That run was primed, though: the agent had read this file and the skill states
the limitation outright. So a second, unprimed agent was given only the skill
text and asked which reviewer it would dispatch and why. It ran the census
first, rejected both `feature-dev:code-reviewer` and
`feature-dev:code-architect` for lacking `Bash`, correctly identified
`code-review:code-review` as a skill rather than a dispatchable agent type, and
chose an execution-capable reviewer. The change from `5298cf7` works without
priming.

**But the check was under-enforced,** and the same cold reader said so: it fails
open in precisely the way Step 8's sha scan did — skip it, and the resulting
report is indistinguishable from a real one. It had no procedure, no output, and
no failure branch, so nothing downstream could detect a skip. Option 3 was taken
(hard gate + disclosure), not option 1: reviewer _selection_ demonstrably works,
so a project-docs-owned reviewer would have added maintenance surface without
addressing the actual gap. Shipped in 3.4.0.

Also addressed here: `allowed_tools` declared only `Task`, the historical name
for the dispatch tool. `Agent` was added alongside it rather than replacing it,
so older environments keep working. The same drift across four other skills and
eight agent definitions is tracked in
[2026-09-02-task-agent-tool-name-drift.md](../2026-09-02-task-agent-tool-name-drift.md).

## Acceptance Criteria

- [x] Run `finalize-branch` on a real branch and confirm the dispatched reviewer
      has shell access and actually executes something (tests, CLI, repro).
- [x] If it still degrades to a static review, pick one of the options above and
      implement it. — _It did not degrade. Hardened anyway, because the cold
      read showed the check could be skipped without detection._
- [x] Mirror any skill change into `dist/project-docs/` and bump the plugin
      version. — _3.3.0 → 3.4.0._

## References

- `plugins/project-docs/skills/finalize-branch/SKILL.md` — Step 2, reviewer
  selection and the capability census; and the "dispatching a reviewer without
  verifying it has shell access" entry under Common Mistakes. Cited by heading
  rather than line number, because the earlier line references here (`:60`,
  `:459`) were wrong against every version of the file
- Commit `5298cf7` — "verify reviewer capability, defer squash strategy to
  project policy"
