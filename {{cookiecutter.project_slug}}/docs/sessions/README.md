# Sessions

## Purpose

Sessions are **dev journals** - informal records of what happened during implementation work. They capture the journey: what went smoothly, what didn't, what was unexpected, and what you learned.

Think of sessions as a **developer's diary** or **dream journal** - you're jotting down what stands out, not documenting every detail. The goal is to capture notable moments that might be useful later for synthesis, learning, or understanding why certain decisions were made.

**Important:** Sessions also serve as **handoff documentation** - when another developer takes over work mid-flight, your session provides the breadcrumbs to understand where things ended, what issues were encountered, and what deviated from the plan. The plan shows what's been checked off; the session shows what actually happened along the way.

### Why Document Sessions?

- **Enable handoffs** - Another developer can pick up your work and understand where you left off, what you struggled with, and what's off-plan
- **Capture deviations** - Record when things went off-plan (bugs, unexpected complexity, closed gas stations)
- **Preserve context** - Future you (or teammates) can understand what happened and why
- **Enable synthesis** - Patterns across sessions can reveal refactoring opportunities or recurring issues
- **Learn from experience** - Reflect on what worked, what didn't, and what you'd do differently
- **Resume work easily** - Pick up where you left off without re-discovering what you already learned

## When to Create a Session

Create a session when:

- **Something notable happened** during implementation work worth recording
- **Work went off-plan** - bugs, unexpected complexity, architectural discoveries
- **You want to resume later** and need to capture current state and context
- **There are lessons to preserve** - things you learned that might be useful later

**Flexibility:** Sessions can be written during work (to capture discoveries in the moment) or after work (reflective summary). Do what feels natural.

## When NOT to Create a Session

- **Everything went smoothly** - If you followed the plan with no surprises, you might not need a session
- **Trivial work** - Small changes with nothing interesting to capture
- **Planning work** - Use proposals/plans for prospective thinking, not sessions
- **Nothing stands out** - Sessions capture what's notable, not routine work

**Rule of thumb:** If there's nothing interesting to write about, don't write a session. Sessions should feel worthwhile, not obligatory.

## File Naming

- `YYYY-MM-DD-short-topic.md`
- Examples:
  - `2025-09-06-upgrade-test-fix-session.md`
  - `2025-08-15-job-queue-stability-session.md`

## Template

A ready-to-use template is available: **[YYYY-MM-DD-TEMPLATE-session.md](./YYYY-MM-DD-TEMPLATE-session.md)**

The template provides suggested sections, but **sessions should be freeform and flexible**. Write what's relevant, skip what's not. Some sessions might be a few paragraphs, others might be detailed logs of a complex debugging journey.

### Suggested Sections

- **Context** - What were you working on and why?
- **What Happened** - The journey - what went smoothly, what didn't, deviations from plan
- **Notable Discoveries** - Bugs found, insights gained, things that weren't expected
- **Changes Made** - Key files/components modified (with rationale if interesting)
- **Lessons Learned** - What would you do differently? What tips would help future work?
- **Follow-up** - Open questions, next steps, things to revisit

**Use what helps. Skip the rest.** Sessions are personal dev journals, not formal reports.

## Tips

### Writing Sessions

- **Capture what stands out** - The car wreck, the closed gas station, the unexpected detour. Not every mile marker.
- **Write naturally** - Use prose, bullets, diagrams, code snippets - whatever communicates clearly
- **Link generously** - Reference files, commits, issues, other docs for context
- **Be honest about struggles** - "Spent 2 hours debugging X, turned out to be Y" is valuable information
- **Note deviations from plan** - When reality diverged from the plan, explain what happened and why

### Synthesis Opportunities

- **Patterns across sessions** - If you hit the same issue repeatedly, that might signal a refactoring opportunity
- **Extract to playbooks** - If a solution pattern emerges, document it as a playbook for future use
- **Update plans** - If multiple sessions reveal plan inaccuracies, update the plan
- **Create investigations** - If sessions surface questions worth exploring, spin up an investigation

### Before Starting New Work

- **Review recent sessions** - See what's been worked on recently, what issues were encountered, what's in flight
- **Check for context** - Sessions often contain valuable context about why things are the way they are
