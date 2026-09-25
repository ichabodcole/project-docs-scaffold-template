---
type: report
title:
  "Cadence at Agent Pace: What Happens to Sprints and Cycles When Agents Do the
  Work"
description:
  What practitioners, vendors, and researchers (2024–2026) report about
  sprint/cycle jobs when AI coding agents do most of the implementation, and
  what that implies for a file-based, agent-first work taxonomy.
tags: [cadence, agents]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Cadence at Agent Pace: What Happens to Sprints and Cycles When Agents Do the Work

Context: the fourth research track of the
[work-taxonomy investigation](../write-up.md). The question is narrow: when an
AI coding agent does most of the implementation and a human does product
decisions and review, which jobs a sprint or cycle used to do still matter,
which change shape, and which disappear — and what that means for a solo
developer's file-based system.

**A note on sourcing.** This is a fast-moving, heavily-blogged 2026 topic.
Vendor blogs (Faros, LinearB, Cognition, Anthropic, Linear) report their own
telemetry as evidence; practitioner and "state of AI in Agile" posts are
frequently opinion dressed as analysis, and several outlets (Medium's Agile
Insider, DEV Community "code-board") publish near-identical framing across
multiple posts, which reads as an emerging consensus narrative rather than
independently corroborated fact. Each claim below is labeled **Evidence** (a
named study, vendor telemetry, or primary documentation) or **Opinion** (a
practitioner argument or synthesis without a data source). Where I could not
verify a number's methodology beyond the secondary source reporting it, I say
so.

## 1. The bottleneck moved from writing code to reviewing and verifying it

**Evidence.** The 2025 DORA report (Google Cloud / DORA, the longest-running
primary research program on software delivery performance) found that AI
adoption raises individual effectiveness but is "associated with increasing
[software delivery] instability" at the team/system level — a reversal from raw
throughput gains not translating into system-level delivery performance. Source:
[2025 DORA State of AI-Assisted Software Development](https://cloud.google.com/resources/content/2025-dora-ai-assisted-software-development-report),
summarized in
[RedMonk's DORA 2025 analysis](https://redmonk.com/rstephens/2025/12/18/dora2025/).
DORA's own framing (echoed by follow-on analysis) is that AI is "an amplifier,
not a fix" — it magnifies both strong and weak engineering practices. Source:
[getDX — What the 2025 DORA report means for your AI strategy](https://getdx.com/blog/ai-amplifies-bad-practices-real-gains-come-from-focusing-aiefforts-on-systems-and-success-depends-on-strong-change-management/).

**Evidence.** Faros AI's 2026 "Acceleration Whiplash" report, built from
telemetry across roughly 22,000 developers, found that under high AI adoption:
PRs are 51% larger, bugs per PR are up 54%, 31% more PRs merge with no review at
all, and median time-in-review is up 441.5% even as throughput rose (~33.7% per
the secondary write-up; Faros's own blog gives "tasks with code completed
increased by 210%" — the two throughput figures disagree and were not reconciled
against the PDF; the 441.5% review figure is confirmed on Faros's blog).
AI-assisted PRs also wait roughly 16 hours for a first reviewer versus ~200
minutes for human-authored PRs. Source:
[Faros AI — AI Engineering Report 2026: The Acceleration Whiplash](https://pages.faros.ai/hubfs/AI_Engineering_Report_2026_The_Acceleration_Whiplash_Faros.pdf),
reported by
[Hyrax — The Review Gap Is Now Measurable](https://hyrax.dev/blog/review-gap-measurable-faros-ai-telemetry-2026)
and
[Faros AI's own blog](https://www.faros.ai/blog/ai-code-quality-senior-engineer-review-burden).
This is vendor-produced telemetry (Faros sells engineering analytics), so treat
the exact multipliers as directionally credible rather than independently
audited, but the direction — review time growing faster than code-generation
time — is corroborated by LinearB's separate 2026 benchmark, which found agentic
AI PRs have a pickup time 5.3x longer than unassisted PRs (cited secondhand via
[Developers Digest — AI Coding Agents Move the Bottleneck to Review Queues](https://www.developersdigest.tech/blog/ai-coding-agents-review-queues);
I could not locate LinearB's primary report directly, so this number is
**Confidence: Medium**, single-hop citation).

**Evidence.** Anthropic's own response is architectural, not procedural: it
shipped agent-based code review for Claude Code, where a team of review-agents
finds and ranks candidate bugs on a PR and posts one high-signal comment plus
inline findings — explicitly stopping short of approving PRs, because "that's
still a human call." Source:
[Claude by Anthropic — Code Review for Claude Code](https://claude.com/blog/code-review),
also covered by
[InfoQ — Anthropic Introduces Agent-Based Code Review](https://www.infoq.com/news/2026/04/claude-code-review/).
Anthropic's own best-practices guidance separately recommends a distinct
verification agent — "a fresh model tries to refute the result, so the agent
doing the work isn't the one grading it" — as a pattern for closing the
verification gap agent output creates. Source:
[Claude by Anthropic — Building verification loops in Claude Code with skills](https://claude.com/blog/building-verification-loops-in-claude-code-with-skills).

**Synthesis (opinion, mine):** every source above converges on the same shape
even where the numbers differ: agents removed the writing bottleneck and the
constraint reappeared one step downstream, at the point where a human has to
decide whether output is trustworthy. This is the load-bearing fact for the rest
of this report — sprint ceremonies were built to manage _commitment and
coordination_ under human writing-speed constraints; they were never built to
manage a _review and verification_ queue, so they don't automatically relieve
the new bottleneck just because they're still running.

## 2. What a sprint/cycle actually did, and which jobs survive at agent pace

Building on the companion landscape report's finding that every methodology
separates an intent unit, a grouping unit, and an in-play unit (see
[PM Work-Taxonomy Landscape §Comparison Table](../../work-cycle-taxonomy-landscape/reports/2026-09-03-pm-work-taxonomy-landscape-report.md)),
here is what the in-play unit specifically did, and what 2024–2026 sources say
about each job at agent pace.

| Sprint/cycle job                                                                                                 | Still needed?                                                                           | What changes                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Sources                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Commitment boundary** (team agrees to a scope for a period)                                                    | Changes shape                                                                           | Moves from a _period_ commitment (this sprint) to a _scope_ commitment per unit of work (this task/pitch), because an agent can start and finish inside what used to be one sprint slot. The dual-rhythm proposal keeps a fixed planning/commitment cadence for _coordination_ but lets _execution_ flow continuously within it.                                                                                                                              | Opinion/proposal: [Agility at Scale — SAFe Sprint Cadence for AI Teams: Dual-Rhythm Architecture](https://agility-at-scale.com/safe/ai-enabled-safe/safe-sprint-cadence-for-ai-teams-the-dual-rhythm-architecture/)                                                                                      |
| **Planning rhythm** (recurring ritual that pulls in next work)                                                   | Changes shape                                                                           | Survives as a _periodic_ activity for a human alone or human+agent-summary (what to work on next), but the artifact it produces shifts from a sprint backlog to acceptance criteria attached to each unit, because the unit itself may not live inside a period.                                                                                                                                                                                              | Evidence (capability data) + opinion (implication): [Lovex — Long-Horizon AI Agents: The End of the Two-Week Sprint](https://lovex.dev/blog/long-horizon-ai-agents-end-of-sprint); [METR — Time Horizon 1.1](https://metr.org/blog/2026-1-29-time-horizon-1-1/)                                          |
| **Review/demo** (show what shipped)                                                                              | Still needed, but continuous rather than batched                                        | The evidence in §1 says batching review to a period-end demo is actively harmful now — work piles up and review quality/latency both degrade. Practitioner consensus (Factory, Anthropic, DORA-adjacent commentary) is toward continuous, per-unit review rather than periodic demo.                                                                                                                                                                          | Evidence: Faros/LinearB review-latency data above; product evidence: [Claude by Anthropic — Code Review for Claude Code](https://claude.com/blog/code-review); [Factory.ai — Droid auto-review workflow](https://factory.ai/news/terminal-bench)                                                         |
| **Retro** (process reflection)                                                                                   | Still needed, changes subject                                                           | Practitioner writing on "AI-augmented" retros argues the retro's object shifts from team dynamics/velocity to agent failure analysis — reviewing rejected agent PRs, tracing rejection back to the originating spec/prompt. This is explicitly opinion/prescriptive, not measured.                                                                                                                                                                            | Opinion: [Scrum.org — AI-Enhanced Sprint Retrospective](https://www.scrum.org/resources/blog/ai-enhanced-sprint-retrospective-part-4-4); [AI-Augmented Scrum — Sprint Retrospective with AI Agents](https://aiaugmentedscrum.com/blogs/ai-augmented-scrum-events/ai-augmented-sprint-retrospective.html) |
| **Capacity planning** (how much fits in a period, based on team velocity)                                        | Mostly gone for a solo dev + agents                                                     | Velocity as "story points per period" assumes throughput is bounded by a roughly-constant number of human workers. It stops being a meaningful constraint once the same "team" can run several agent sessions in parallel; several sources note agent throughput is now bounded by _review capacity_, not _coding capacity_ — a different metric than velocity ever measured.                                                                                 | Evidence (bottleneck location): §1 sources above                                                                                                                                                                                                                                                         |
| **Stakeholder cadence** (predictable checkpoint for people outside the team)                                     | Still needed if stakeholders exist; not needed for a solo developer as sole stakeholder | The dual-rhythm model keeps this because SAFe assumes cross-team/organizational stakeholders. For a single developer who is also the sole product decision-maker, this job has no separate audience to serve — it collapses into "review the unit when it's done."                                                                                                                                                                                            | Opinion (applies dual-rhythm's own logic to the solo case): [Agility at Scale — Dual-Rhythm Architecture](https://agility-at-scale.com/safe/ai-enabled-safe/safe-sprint-cadence-for-ai-teams-the-dual-rhythm-architecture/)                                                                              |
| **Deadline pressure / appetite discipline** (a fixed window that forces a scope decision, Shape Up's "appetite") | Still useful, but per-unit not per-period                                               | Nothing in the 2024–2026 material argues appetite itself is obsolete — Shape Up's fixed-time/variable-scope trade survives conceptually. What changes is the _unit it's attached to_: an appetite that bounds a whole 6-week cycle assumes human-paced execution; at agent pace the more useful appetite is per-pitch/per-task ("this should take an agent a few hours, not a few days" as a scope-shaping heuristic), independent of any shared team period. | Opinion (extension of Shape Up's own logic; no direct 2024–2026 source argues this explicitly)                                                                                                                                                                                                           |

## 3. Proposed replacements in current practice

**Continuous flow with review as the throttle (evidence + product pattern).**
Multiple 2026 sources converge on treating code review as the WIP-limited stage,
not the coding stage: teams "track time-to-first-review and set team agreements
(many aim for under 4 hours)," and the practitioner framing is explicitly
Kanban-flavored — "limiting work in progress forces the team to clear the queue
before generating more code." Source:
[DEV Community — Code Review Is the Real Bottleneck of 2026](https://dev.to/code-board/code-review-is-the-real-bottleneck-of-2026-and-most-teams-dont-see-it-5eed)
(opinion/synthesis piece, but consistent with the Faros/LinearB telemetry
above). Separately, Kanban-community writing frames this as vindication of
flow-based practice over iteration-based practice specifically because "Kanban's
continuous flow and flow metrics tend to fit better than fixed sprints" for
AI-accelerated, frequently-repriotized work. Source:
[NimbleWork — Kanban in the AI Era](https://www.nimblework.com/blog/kanban-in-the-ai-era/)
(opinion).

**Async, ticket-level delegation rather than sprint-batched assignment
(evidence, product behavior).** Cognition (makers of Devin) describe their 2026
model as "the Age of Async Agents": a human delegates at the ticket/project
level via Slack, Linear, or Jira, the agent works and can be tagged/triggered by
events or other agents, and the human reviews asynchronously whenever they
return — there is no sprint-shaped batching of delegation at all. Source:
[Latent Space — The Age of Async Agents (Cognition's Walden Yan)](https://www.latent.space/p/cognition).
Factory.ai's "Droid" positions itself similarly as a delivery pipeline that
pulls work item-by-item from Linear/Jira rather than sprint-batch, with a
sandboxed background-execution primitive per task. Source:
[Digital Applied — Factory AI: Multi-Agent Coding Platform Review 2026](https://www.digitalapplied.com/blog/factory-ai-multi-agent-coding-platform-review).

**Spec-first as the new commitment artifact (evidence, tool adoption).**
GitHub's Spec Kit (first released September 2025, v1.0.1 by August 2026, 90k+
GitHub stars, integrates with 30+ coding agents) replaces "sprint commitment"
with a spec/plan/task-breakdown sequence per unit of work: "each phase produces
a markdown artifact that feeds the next, so the agent always has structured
context," and GitHub reports internal teams using it ship with "roughly an
order-of-magnitude fewer 'regenerate from scratch' cycles." Source:
[GitHub Blog — Spec-driven development with AI](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/);
adoption figures via
[MarkTechPost — Meet GitHub Spec-Kit](https://www.marktechpost.com/2026/05/08/meet-github-spec-kit-an-open-source-toolkit-for-spec-driven-development-with-ai-coding-agents/).
This is functionally the same move project-docs already made with
proposal→plan→session: the commitment boundary is the spec being accepted, not a
date on a calendar.

**Linear's own resolution: keep cycles, but only as a scheduling lens, and route
new agent-teammate work through the same triage inbox as human work (evidence,
primary docs).** Linear's Method literature explicitly frames cycles as "a
healthy routine," not a scope-commitment container — issues carry cycle,
project, and status as independent fields rather than living inside a single
container, and unfinished issues roll forward automatically rather than
requiring re-decision. Source:
[Linear Method — Principles & Practices](https://linear.app/method/introduction)
(already cited in the companion PM landscape report). In 2026, Linear's Agent
API matured so that third-party agents (Claude Code, Devin, Cursor, Copilot)
appear as workspace teammates with their own profiles, and issues created or
worked by agents flow through the same Triage inbox and cycle mechanics as
human-authored issues — Linear did not invent a separate cadence primitive for
agent work. Source:
[Linear Changelog — Introducing Linear Agent](https://linear.app/changelog/2026-03-24-introducing-linear-agent).
This is meaningful evidence for a specific design choice: Linear's answer to
"does a time-boxed cycle still make sense when agents do the work" was not to
replace the cycle, but to demote it from commitment-container to optional
scheduling metadata, while moving the real gate (new work must clear triage
before it's actionable) upstream of the cycle entirely.

**Verification loops as the new "definition of done" mechanism (evidence,
primary docs).** Anthropic's own engineering guidance recommends agents run
repeating self-check cycles — tests, linters, custom checks — and fix failures
before advancing, with an independent grading pass by a fresh model/session
rather than self-certification. Source:
[Claude by Anthropic — Building verification loops in Claude Code with skills](https://claude.com/blog/building-verification-loops-in-claude-code-with-skills).
This is a _per-unit_ mechanism, not a periodic one — it happens every time a
unit of work claims to be finished, which is a much finer grain than a sprint's
"definition of done" checked once at sprint boundary.

## 4. Implications for a file-based system

**Sprint/cycle is best modeled as organisation/view metadata on a work item, not
as an authored entity that itself opens and closes** — for this project's
specific situation (solo developer, agent-paced execution, human as sole
stakeholder). The strongest evidence for this: Linear itself, the tool whose
"cycle" this repo's own cycle concept is closest to, treats cycle membership as
one independent field on an issue rather than a container the issue lives inside
(§3, Linear Method). GitLab's iteration and GitHub's "iteration field" are
likewise plain fields, not first-class objects with their own lifecycle ceremony
(see companion landscape report §5). None of the 2024–2026 agent-pace material
argues for giving the _period_ its own document with a lifecycle; every source
that addresses cadence at all (the dual-rhythm proposal, Cognition's async
model, Faros/DORA bottleneck data) locates the meaningful state on the _unit of
work_ — is it specced, is it in review, is it verified, is it merged — not on
the period surrounding it.

That said, this repo's existing `cycle` document is not purely a time-period —
per the investigation's own description it is "scope-bound (not time-boxed): an
index document with an appetite and an outcome," which is structurally closer to
Shape Up's pitch/bet-into-cycle (an _outcome_ container) than to Linear's or
Jira's _time_ container. The evidence in this report does not undercut a
scope-bound, appetite-bearing index document — it undercuts a _time-boxed,
recurring, calendar-driven_ one. If the cycle's job is "here is the bounded
outcome currently in play, with a rough size budget," that survives the evidence
above (it plays the same role Shape Up's pitch-into-cycle plays, and
appetite-as-scope-discipline is not challenged by any source found). If the
cycle's job is "here is what we agreed to do this period, reviewed and closed on
a schedule," the evidence argues against it: the schedule stops corresponding to
anything real once a single agent run can exceed the coordination interval
itself (the Horizon-to-Cadence Ratio argument, §2) and the actual gating events
(spec accepted, review cleared, verification passed) happen per unit,
continuously, not on a period boundary.

**Which unit should carry "in play."** The evidence points to the smallest
committed unit of work (the investigation's open question about a missing
task/story-sized entity) carrying its own state field — e.g.
`spec-accepted → in-progress → in-review → verified → done` — with an optional,
non-authoritative `cycle` reference for anyone who wants a scope-bound grouping
view. This matches how Linear, GitLab, and GitHub all resolved the same tension:
state and cadence-membership live as fields on the work item; the "period" is
either absent (GitHub's plain iteration field) or reduced to metadata (Linear's
cycle membership).

**Is a time box useful for a solo developer + agents?** The evidence is mixed
but leans "not as a coordination mechanism, possibly still useful as a
scope-shaping heuristic." Nothing in the review-bottleneck evidence (§1),
Cognition's async model, or Linear's own agent integration argues a calendar
period does useful coordination work when there is one human and no other
stakeholders to synchronize with — coordination is the job a time box does, and
coordination has no object here. What a time box (or an appetite) can still do,
per Shape Up's surviving logic, is bound scope creep on a single unit ("this
should take an agent an afternoon, not a week") — but that is a property of the
unit's appetite, not of a shared calendar period that opens and closes multiple
units at once.

**What a close/retro ritual should record.** Given the bottleneck has moved to
review/verification (§1) and practitioner retro guidance for AI-hybrid work
explicitly redirects the retro's subject toward agent failures rather than team
dynamics (§2 table, Scrum.org/AI-Augmented Scrum sources), a close ritual for a
unit of work — not a period — should capture: what the spec/acceptance criteria
said versus what shipped, where the agent's self-verification loop caught (or
missed) a problem, what a human reviewer had to fix or reject, and whether the
unit's appetite estimate was realistic. This is consistent with how this repo's
`session` document already works (a frozen execution record per branch) — the
evidence in this report argues for enriching that per-unit record with a
verification/review trace, not for inventing a separate periodic retro document.

## Sources Consulted

1. [2025 DORA State of AI-Assisted Software Development](https://cloud.google.com/resources/content/2025-dora-ai-assisted-software-development-report)
   — Google Cloud/DORA, primary research, accessed 2026-09-22
2. [RedMonk — DORA 2025: Measuring Software Delivery After AI](https://redmonk.com/rstephens/2025/12/18/dora2025/)
   — analysis, 2025-12-18, accessed 2026-09-22
3. [getDX — What the 2025 DORA Report means for your AI strategy](https://getdx.com/blog/ai-amplifies-bad-practices-real-gains-come-from-focusing-aiefforts-on-systems-and-success-depends-on-strong-change-management/)
   — analysis, accessed 2026-09-22
4. [Faros AI — AI Engineering Report 2026: The Acceleration Whiplash](https://pages.faros.ai/hubfs/AI_Engineering_Report_2026_The_Acceleration_Whiplash_Faros.pdf)
   — vendor telemetry report, 2026, accessed 2026-09-22
5. [Hyrax — The Review Gap Is Now Measurable](https://hyrax.dev/blog/review-gap-measurable-faros-ai-telemetry-2026)
   — secondary reporting on Faros data, 2026, accessed 2026-09-22
6. [Developers Digest — AI Coding Agents Move the Bottleneck to Review Queues](https://www.developersdigest.tech/blog/ai-coding-agents-review-queues)
   — secondary reporting on LinearB data, 2026, accessed 2026-09-22 (Confidence:
   Medium, single-hop)
7. [Claude by Anthropic — Code Review for Claude Code](https://claude.com/blog/code-review)
   — primary vendor documentation, 2026, accessed 2026-09-22
8. [InfoQ — Anthropic Introduces Agent-Based Code Review](https://www.infoq.com/news/2026/04/claude-code-review/)
   — 2026-04, accessed 2026-09-22
9. [Claude by Anthropic — Building verification loops in Claude Code with skills](https://claude.com/blog/building-verification-loops-in-claude-code-with-skills)
   — primary vendor documentation, accessed 2026-09-22
10. [Lovex — Long-Horizon AI Agents: The End of the Two-Week Sprint](https://lovex.dev/blog/long-horizon-ai-agents-end-of-sprint)
    — practitioner analysis citing METR/Anthropic, 2026, accessed 2026-09-22
11. [METR — Time Horizon 1.1](https://metr.org/blog/2026-1-29-time-horizon-1-1/)
    — primary research, 2026-01-29, accessed 2026-09-22
12. [METR — Measuring AI Ability to Complete Long Software Tasks](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/)
    — primary research, 2025-03-19, accessed 2026-09-22
13. [Agility at Scale — SAFe Sprint Cadence for AI Teams: The Dual-Rhythm Architecture](https://agility-at-scale.com/safe/ai-enabled-safe/safe-sprint-cadence-for-ai-teams-the-dual-rhythm-architecture/)
    — practitioner proposal/opinion, 2026, accessed 2026-09-22
14. [Scrum.org — AI-Enhanced Sprint Retrospective (Part 4 of 4)](https://www.scrum.org/resources/blog/ai-enhanced-sprint-retrospective-part-4-4)
    — practitioner opinion, accessed 2026-09-22
15. [AI-Augmented Scrum — How to do a Sprint Retrospective with AI Agents](https://aiaugmentedscrum.com/blogs/ai-augmented-scrum-events/ai-augmented-sprint-retrospective.html)
    — practitioner opinion, accessed 2026-09-22
16. [DEV Community (code-board) — Code Review Is the Real Bottleneck of 2026](https://dev.to/code-board/code-review-is-the-real-bottleneck-of-2026-and-most-teams-dont-see-it-5eed)
    — practitioner opinion/synthesis, 2026, accessed 2026-09-22
17. [NimbleWork — Kanban in the AI Era: It Now Matters More, Not Less](https://www.nimblework.com/blog/kanban-in-the-ai-era/)
    — practitioner opinion, 2026, accessed 2026-09-22
18. [Latent Space — The Age of Async Agents (Cognition's Walden Yan & OpenInspect's Cole Murray)](https://www.latent.space/p/cognition)
    — interview/primary-adjacent, 2026, accessed 2026-09-22
19. [Digital Applied — Factory AI: Multi-Agent Coding Platform Review 2026](https://www.digitalapplied.com/blog/factory-ai-multi-agent-coding-platform-review)
    — practitioner review, 2026, accessed 2026-09-22
20. [Factory.ai — Droid: The #1 Software Development Agent on Terminal-Bench](https://factory.ai/news/terminal-bench)
    — vendor documentation, accessed 2026-09-22
21. [GitHub Blog — Spec-driven development with AI: Get started with a new open source toolkit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
    — primary vendor documentation, accessed 2026-09-22
22. [MarkTechPost — Meet GitHub Spec-Kit](https://www.marktechpost.com/2026/05/08/meet-github-spec-kit-an-open-source-toolkit-for-spec-driven-development-with-ai-coding-agents/)
    — secondary reporting, 2026-05-08, accessed 2026-09-22
23. [Linear Method — Principles & Practices](https://linear.app/method/introduction)
    — primary vendor documentation, accessed 2026-09-22 (also cited in companion
    PM landscape report)
24. [Linear Changelog — Introducing Linear Agent](https://linear.app/changelog/2026-03-24-introducing-linear-agent)
    — primary vendor documentation, 2026-03-24, accessed 2026-09-22
25. [PM Work-Taxonomy Landscape report](../../work-cycle-taxonomy-landscape/reports/2026-09-03-pm-work-taxonomy-landscape-report.md)
    — companion report, this repo, 2026-09-03

## Open Gaps

- **LinearB's 5.3x pickup-time figure** could not be traced to LinearB's own
  primary report; it is cited secondhand through a practitioner blog. Treat as
  directionally plausible given it agrees with Faros's independently-sourced
  441.5% review-time figure, but not independently verified here.
- **No source directly measures agent-paced cadence for a solo developer.**
  Every cadence-specific source found (dual-rhythm SAFe, Linear's cycle model,
  Faros/DORA telemetry) is written for or measured on a team with multiple human
  stakeholders. The "collapse of stakeholder cadence" and "time box has no
  coordination object" claims in §4 are this report's own extrapolation from
  that evidence to the solo-developer case, not a finding any source states
  directly — flagged as opinion, not evidence.
- **No canonical, citable essay found arguing sprints are obsolete outright** at
  agent pace; the closest is the Lovex "Horizon-to-Cadence Ratio" framing, which
  is a single practitioner's proposed metric (2026, unverified adoption beyond
  its own post) rather than an established or widely-cited term.
- **The retro's redirection toward "agent failure analysis"** is asserted by two
  practitioner sources (Scrum.org, AI-Augmented Scrum) with no supporting
  measurement of whether this actually improves outcomes versus traditional
  retros — it is prescriptive opinion, not evaluated practice.
- Did not find primary-source material from OpenAI or Cursor specifically
  addressing sprint/cycle cadence (as opposed to individual-developer workflow);
  their sections of the brief are thin as a result. Factory.ai and
  Cognition/Devin were the strongest vendor sources on delegation cadence;
  Cursor material found was product-feature-focused rather than
  process/cadence-focused.
