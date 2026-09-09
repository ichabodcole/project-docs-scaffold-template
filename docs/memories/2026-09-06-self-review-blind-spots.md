---
type: memory
title: What seven self-run phase gates missed
description:
  Self-run verification cannot falsify its author's assumptions; an independent
  review found six defects in an afternoon that seven phases had passed.
tags: [code-review, verification, tooling]
status: stable
generated: { by: claude-opus-5, at: 2026-09-06 }
---

# What seven self-run phase gates missed

The pdocs CLI cycle ran seven phases, each ending green: `npm run check`, a
generated scaffold linting clean, and a per-phase perturbation pass proving the
tests were not vacuous. A dual independent review at the end found six blocking
defects anyway.

**They failed in one direction.** Every gate was run by the author of the thing
it checked, and a self-run pass reaches for the input its author had in mind.

The clearest case: `pdocs new cycle --scope project/<name>` never resolved,
because `pageKey` computed `type/basename` and every project's proposal keyed to
`proposal/proposal`. The use-it pass ran `--scope proposal/proposal` — the
string that works — rather than the grammar the design resolution, the cycle
template and the migration guide all document. The unit test encoded the same
degenerate case as its passing assertion. Two artefacts agreeing with each other
because the same person wrote both.

The most expensive: piped JSON truncated at exactly 64 KiB. Format resolution
defaults to JSON when stdout is a pipe, so the documented agent path returned
unparseable output — and every probe run during implementation used
`--format text` or piped into `head`/`grep`/`wc`, which do not care that the
stream was cut. **The gates checked that commands exit 0; nobody checked the
output was usable.**

The most embarrassing: the suite was timezone-dependent and the gate was red for
seven hours a day. `bun test` forces the test process to UTC without exporting
`TZ`; the CLI it spawns reads `/etc/localtime`. Every "944 pass, 0 fail"
reported during the cycle was taken before 17:00 local.

## What to do differently

- **Test the grammar the documents specify, not the string you know works.** If
  a worked example exists in a design document, run that example verbatim. Two
  of the six were failures of exactly this.
- **Check output is usable, not just that exit codes are right.** Redirect to a
  file, compare byte counts, parse the result. `| head` hides truncation.
- **Pass an adversarial name once.** `".."` found a path traversal that 18
  round-trip tests could not, because none of them passed a hostile input.
- **A capability census on the reviewer is not ceremony.** The best-shaped
  reviewer available (`feature-dev:code-reviewer`) carries `BashOutput` and
  `KillShell` but not `Bash` — it can read and kill shells it cannot start.
  Every one of the six findings came from a command. A read-only reviewer would
  have returned a confident report with nothing behind it.

The same lesson one level up: a review that only _reads_ cannot falsify claims
about behaviour, and a pass that only _runs_ still cannot falsify the
assumptions of whoever wrote it.

---

**Related Documents:**

- [The pdocs CLI proposal](../projects/project-docs-cli/proposal.md)
- [Landing session, with the review census](../projects/project-docs-cli/sessions/2026-09-06-pdocs-cli-landing.md)
