# Reviewer capability gate: two defeats and a relocation — 2026-09-02

## Context

Closes the 2026-08-10 backlog item asking whether the reviewer-capability
guidance added in `5298cf7` actually holds in practice. It does. What the item
didn't anticipate is that validating it would expose the check as unenforceable
and take three attempts to fix — the last of which concluded the check cannot be
made self-enforcing at all, and moved the evidence somewhere else.

Continues
[the 2026-08-07 session](./2026-08-07-reviewer-capability-and-landing-policy.md).
Shipped as project-docs 3.4.0.

## Review

Reviewers were censused from the Agent tool's available types in session
context. `general-purpose` (`Tools: *`) and `plugin-dev:plugin-validator`
(`Read, Grep, Glob, Bash`) were selected. Rejected on capability grounds:
`feature-dev:code-reviewer` and `feature-dev:code-architect` (both
`Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput`
— no `Bash`), and `plugin-dev:skill-reviewer` (`Read, Grep, Glob`), which was
the domain fit and failed the gate anyway.

All three dispatched reviewers executed. The validator ran
`build-skills-dist.sh` and `validate:skills`, and md5-compared 139 dist files
against a backup to confirm reproducibility. The first adversarial reviewer ran
the build, validator, Prettier, a frontmatter-stripped `diff` of plugin vs dist,
and a link-resolution check that found the broken `_archive` path. The second
verified the `feature-dev` tool-list string against the live roster.

**Caveat, and it is the honest one:** the execution-log requirement this branch
adds did not exist when these reviewers were dispatched, so none was asked to
report its commands. The above is reconstructed from what they volunteered. That
is exactly the unfalsifiable position the new requirement exists to end — had a
reviewer executed nothing and written confidently, this paragraph could not have
detected it.

## What Happened

**Validation first, and it passed.** A cold agent given only the skill text ran
the census, rejected `feature-dev:code-reviewer` and `code-architect` for
lacking `Bash`, spotted that `code-review:code-review` is a skill rather than a
dispatchable agent type, and chose an execution-capable reviewer. The `5298cf7`
guidance works unprimed. It also noticed something I hadn't: `BashOutput` and
`KillShell` without `Bash` means an agent that can read and kill shells it has
no way to start — a tool list that reads like shell access at a glance.

**But the same reader rated the check 6.5/10 skippable**, and the diagnosis
landed hard: it fails open in precisely the way Step 8's sha scan did — a defect
fixed in this same file, hours earlier, in the previous branch. Skip it,
dispatch a plausible-sounding reviewer, and the report is indistinguishable from
a real one. No procedure, no output, no failure branch.

**First fix: require a census. Defeated.** The reviewer dispatched under the new
gate was asked to defeat it rather than confirm it, and did — by observing that
Step 2's own text named two reviewers with their exact tool lists and asserted a
third's capability outright. A compliant census could be written straight off
the page. The document was handing over the answer it was sending the executor
to fetch. It also found the file contradicting itself: Common Mistakes said "a
run whose output contains no census skipped the gate," while the Output list —
the list an executor builds its report from — never asked for one. Following
both correctly produced a skipped gate by construction.

**Second fix: three constraints on the census. Defeated again, decisively.** The
next reviewer wrote a fully compliant fake census from the page plus general
knowledge of Claude Code's stock roster, then explained why no wording could
prevent it: **the roster lives in the executor's context, so reading it costs
zero tool calls and leaves zero trace.** The census is a self-report of an
unobservable action. I had spent two rounds trying to make a self-report
verifiable by constraining its phrasing.

**Third fix: stop trying.** The census is now labelled testimony rather than
proof, and the evidence moved downstream into the one artifact the dispatching
agent does not author — the reviewer's own execution log, demanded in the prompt
template. All three places that required stating what a reviewer executed now
require quoting that log instead of inferring it from the presence of `Bash`.

## Notable Discoveries

- **The same fail-open bug, twice in one file, hours apart.** Step 8's sha scan
  and Step 2's capability check share a shape: a guard that reports success
  while inspecting nothing. Fixing one did not make me see the other. The cold
  reader found it by asking a question I hadn't: _which of these checks can pass
  without having looked?_
- **You cannot make a self-report verifiable by constraining its wording.** Two
  rounds went into rules about how the census must be phrased. The property that
  mattered was structural — who authors the artifact. Evidence has to come from
  somewhere the claimant doesn't control.
- **An anti-fabrication rule can teach fabrication.** The dropped constraint
  ("name a reviewer this file doesn't list") forced padding the census with
  agents nobody would dispatch, purely to prove diligence. Rules that demand
  ritual output train the production of ritual output.
- **`allowed_tools` is not read.** The canonical key is `allowed-tools`; the
  marketplace installs from `plugins/`, not `dist/`; and
  `validate-skills-dist.py` rewrites the key on the way into `dist/`. So the
  source declarations have no runtime effect, and `npm run validate:skills` is a
  mutating normalizer rather than a read-only check — worth knowing before it
  goes into CI.

## Changes Made

- `plugins/project-docs/skills/finalize-branch/SKILL.md` — Step 2 capability
  gate, census rules, execution-log requirement in the prompt template,
  skill-driven-review bypass closed, fallback capability claim demoted, Output /
  Common Mistakes / After-review / Step 4 / User Checkpoints reconciled;
  `allowed_tools` declares `Agent` alongside `Task`.
- `plugins/project-docs/README.md` — 3.4.0 entry, rewritten twice as the claim
  it could honestly make shrank.
- Backlog: 2026-08-10 item reconciled and archived; three items filed
  (`task-agent-tool-name-drift`, `finalize-branch-step-2-density`, plus the two
  from the prior branch).

## Lessons Learned

Ask the reviewer to break the thing, not to check it. "Confirm this gate works"
returns a pass. "Construct output that looks compliant while verifying nothing"
returned two defeats and the structural insight behind both. The second framing
cost nothing extra.

And when a fix fails twice in the same direction, the problem is likely the
frame rather than the wording.

## Follow-up

- [Step 2 density](../../../backlog/2026-09-02-finalize-branch-step-2-density.md)
  — 149 lines, procedure nested inside rationale.
- [`Task`/`Agent` drift](../../../backlog/2026-09-02-task-agent-tool-name-drift.md)
  — now also covers the `allowed_tools` key-name question, which is the larger
  decision underneath it.
- The census still cannot be verified, by construction. It is retained as
  testimony. If that proves insufficient, the next move is a check that produces
  a tool call — but none is currently available for reading the agent roster.

---

**Related Documents:**

- [2026-08-07 session](./2026-08-07-reviewer-capability-and-landing-policy.md)
- [Archived backlog item](../../../backlog/_archive/2026-08-10-code-review-subagent-needs-execution.md)
