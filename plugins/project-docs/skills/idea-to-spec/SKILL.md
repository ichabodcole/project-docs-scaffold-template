---
name: idea-to-spec
description: >
  This skill should be used when the user has an idea for an application and
  wants to develop it into a complete specification. Activated when the user
  asks to "turn my idea into a spec", "help me spec out my app", "I have an idea
  for an app", "idea to specification", "spec from scratch", "flesh out my
  idea", "help me define my app", "plan out my application", "brainstorm my app
  idea", "what would I need to specify", or wants to go from a rough concept to
  a detailed, technology-agnostic specification document set.
---

# Idea to Spec

## Purpose

Transform a rough application idea into a complete set of technology-agnostic
specification documents through structured, iterative interviews. The goal is to
progressively detail every domain of the application until the specification is
comprehensive enough to hand off to the `implementation-blueprint` skill or
directly to a developer.

The output follows the same specification format produced by the `generate-spec`
skill, ensuring consistency across the plugin's workflow: **idea** → **spec** →
**blueprint** → **build**.

## Progress Tracking

Track specification completeness as a percentage throughout the process. Display
this at the start of each interview round:

```
Specification Progress: [████████░░░░░░░░░░░░] 40%
```

### How Progress Is Calculated

Divide the specification into weighted domains. Each domain contributes to the
total based on its complexity weight. A domain is "complete" when its core
entities, rules, states, and edge cases are documented.

| Domain Category     | Weight | Examples                                   |
| ------------------- | ------ | ------------------------------------------ |
| Core data model     | 25%    | Entities, relationships, field definitions |
| User interface      | 20%    | Screens, navigation, component inventory   |
| Business logic      | 20%    | Rules, calculations, state machines        |
| User flows          | 15%    | Journeys, interactions, session lifecycle  |
| System behavior     | 10%    | Audio, notifications, background tasks     |
| Edge cases & errors | 10%    | Validation, empty states, error handling   |

Update the percentage after each round based on what has been covered. The
progression is not linear - early rounds cover more ground at a surface level,
later rounds fill in depth.

### Typical Progression

| Round | Expected Progress | Focus                            |
| ----- | ----------------- | -------------------------------- |
| 1     | 0% → 15%          | Core concept and scope           |
| 2     | 15% → 35%         | Data model and entities          |
| 3     | 35% → 55%         | Screens and user flows           |
| 4     | 55% → 70%         | Business logic and rules         |
| 5     | 70% → 85%         | System behavior and integrations |
| 6     | 85% → 95%         | Edge cases and polish            |
| 7+    | 95% → 100%        | Review, gaps, and sign-off       |

## Process Overview

Each round below lists key questions. For expanded question banks organized by
domain, read [references/interview-guide.md](references/interview-guide.md).

### Round 1: The Elevator Pitch (0% → ~15%)

Start by understanding the idea at a high level. Ask the user to describe their
app in a few sentences, then ask focused follow-ups.

**Questions to cover:**

- What does the app do in one sentence?
- Who is the primary user?
- What problem does it solve or what need does it fill?
- What are the 3-5 core features?
- Is this a single-user app, multi-user, or collaborative?
- Does it need to work offline?
- Are there any existing apps that are similar? What would be different?

**After Round 1, produce:**

- A written summary of the app concept (3-5 paragraphs)
- A preliminary list of specification domains that will need to be covered
- An estimate of total rounds needed based on complexity

Present the summary and domain list to the user for confirmation before
proceeding. This is the foundation everything else builds on - correct
misunderstandings here.

### Round 2: Data Model Discovery (~15% → ~35%)

Identify every entity the application needs to store or manage.

**Questions to cover:**

- What are the main "things" in the app? (Users create X, the app tracks Y,
  etc.)
- For each entity: what properties does it have?
- How do entities relate to each other? (A timer has many sessions, etc.)
- What uniquely identifies each entity?
- Which fields are required vs. optional?
- Are there any calculated/derived fields?
- What are the valid values or constraints for each field?

**After Round 2, produce:**

- Entity table for each identified data type (fields, types, constraints)
- Relationship descriptions between entities
- Draft of the data management specification section

### Round 3: Screens and User Flows (~35% → ~55%)

Map out what the user sees and does.

**Questions to cover:**

- What is the first screen the user sees?
- Walk through the primary user journey step by step
- What screens are needed? List each with its purpose
- How does the user navigate between screens?
- What actions are available on each screen?
- Are there different states for screens? (empty, loading, populated, error)
- What confirmation dialogs or modals are needed?

**After Round 3, produce:**

- Screen inventory with routes, purpose, and key elements
- Navigation map showing how screens connect
- Primary user flow narratives
- Draft of the UI specification section

### Round 4: Business Logic and Rules (~55% → ~70%)

Define how the application behaves.

**Questions to cover:**

- What calculations does the app perform?
- Are there any state machines? (e.g., session states: idle → active → paused →
  complete)
- What validation rules apply to user input?
- Are there any time-based behaviors? (countdowns, scheduling, streaks)
- What sorting and filtering rules exist?
- Are there any formulas or algorithms? (streak calculation, statistics, etc.)

**After Round 4, produce:**

- State machine diagrams in text format
- Calculation pseudocode
- Validation rule tables
- Business rule documentation

### Round 5: System Behavior (~70% → ~85%)

Cover the non-UI aspects of the application.

**Questions to cover (conditionally relevant):**

- Does the app play audio? What kinds? How is it controlled?
- Does the app send notifications? What triggers them?
- Does the app need to work offline? What should be cached?
- Is there data import/export? What format?
- Are there any background processes?
- Does the app integrate with external services or APIs?
- Are there any device hardware interactions? (camera, sensors, haptics)

Skip questions that don't apply based on what was learned in earlier rounds.

**After Round 5, produce:**

- System-specific specification sections (audio, notifications, etc.)
- Integration descriptions
- Caching and offline strategy

### Round 6: Edge Cases and Polish (~85% → ~95%)

Fill gaps and handle the unexpected.

**Questions to cover:**

- What happens when there's no data yet? (empty states)
- What are the error scenarios and how should each be handled?
- Are there any limits? (max items, max text length, storage quotas)
- What happens with extreme values? (very long durations, very many items)
- Are there accessibility requirements?
- Are there any settings or preferences the user can configure?
- What statistics or insights does the app surface?

**After Round 6, produce:**

- Edge case tables for each domain
- Error handling specifications
- Settings specification
- Statistics specification (if applicable)

### Round 7+: Review and Sign-Off (~95% → 100%)

Review the complete specification set for gaps.

**Process:**

1. Present the full domain list with completion status
2. For each domain, summarize what's documented
3. Ask: "Is anything missing or incorrect?"
4. Address any gaps with targeted follow-up questions
5. Cross-reference domains for consistency (e.g., every entity in data model has
   corresponding UI screens)

**Completion criteria:**

- Every entity has a full property table
- Every screen is inventoried with elements and actions
- Business rules have pseudocode or clear descriptions
- Edge cases are documented per domain
- State machines cover all transitions
- The spec set could be handed to a stranger and they'd know what to build

## Interview Principles

- **Ask 2-4 questions per batch.** Avoid walls of questions. Group them by
  theme.
- **Summarize before advancing.** At the end of each round, recap what was
  captured and get confirmation.
- **Track what's missing, not just what's covered.** Maintain a running list of
  open questions and unresolved domains.
- **Adapt round boundaries.** Simple apps may combine rounds. Complex apps may
  split a round into multiple sub-rounds. The round numbers are guidelines, not
  rigid gates.
- **Propose when the user is unsure.** If the user says "I don't know," suggest
  a reasonable default based on similar applications. Mark it as an assumption
  in the spec.
- **Use concrete examples.** Instead of "how should sorting work?", ask "if a
  user has 10 timers, which one appears first in the list?"
- **Don't over-specify.** If a detail doesn't affect behavior (e.g., exact pixel
  dimensions), leave it to implementation.

## Output Format

Write specification files to `docs/specifications/` (or user-specified location)
using the same structure and conventions as the `generate-spec` skill:

- Technology-agnostic language (no framework references)
- Pseudocode for algorithms
- Milliseconds for time values
- Tables for structured data
- State machine descriptions for lifecycle entities
- Edge case sections for each domain

For spec writing templates and conventions, read
`../generate-spec/references/spec-writing-guide.md`.

### File Organization

Choose the appropriate structure based on complexity discovered during
interviews:

**Simple apps (≤8 spec files):** Flat structure with numbered files.

**Medium apps (9-15 spec files):** Group related specs into subdirectories by
domain.

**Complex apps (15+ spec files or multi-app):** Subdirectories per app or major
subsystem.

### Mapping Interview Rounds to Spec Files

| Interview Round          | Typical Spec File(s)                                           |
| ------------------------ | -------------------------------------------------------------- |
| Round 1: Elevator Pitch  | `01-overview.md`                                               |
| Round 2: Data Model      | `XX-data-management.md`, entity-specific specs                 |
| Round 3: Screens & Flows | `XX-user-interface.md`                                         |
| Round 4: Business Logic  | Entity-specific specs (e.g., `XX-timers.md`, `XX-sessions.md`) |
| Round 5: System Behavior | Domain specs (e.g., `XX-audio.md`, `XX-notifications.md`)      |
| Round 6: Edge Cases      | Distributed across all relevant spec files                     |
| Round 7: Review          | Updates across all files, `XX-settings.md` if not yet written  |

Number files in a logical reading order: overview first, then data entities,
then systems, then UI, then cross-cutting concerns (statistics, settings).

## Handling Difficult Scenarios

### User Has a Vague Idea

Start Round 1 with even broader questions: "What kind of app is this?"
(productivity, game, social, tool, etc.). Use analogies: "Is it more like a todo
app, a journal, or a dashboard?" Narrow down before proceeding.

### User Wants to Skip Ahead

If the user jumps to implementation details ("I want it in React with
Tailwind"), acknowledge the preference, note it for the blueprint phase, and
redirect: "Great, we'll capture that when we get to the implementation
blueprint. For now, let's focus on what the app does, not how it's built."

### Scope Creep During Interviews

If new features keep emerging, maintain a "Future Enhancements" section. Gently
ask: "Is this needed for the first version, or is it a future addition?" Keep
the core spec focused.

### Multi-Platform Applications

If the idea targets multiple platforms (web + mobile, etc.), treat
platform-specific behavior as a cross-cutting concern. Write one unified
specification set with platform-specific callouts where behavior diverges (e.g.,
"On mobile: bottom navigation. On desktop: sidebar navigation."). Do not
duplicate entire spec files per platform.

### User Disagrees with Progress Percentage

The percentage is an estimate. If the user feels it should be higher or lower,
adjust. The purpose is shared understanding of how much work remains, not
precision.

## Additional Resources

### Reference Files

For detailed guidance on conducting effective specification interviews:

- **[references/interview-guide.md](references/interview-guide.md)** - Question
  banks organized by domain, techniques for eliciting requirements, common
  patterns across app types, and red flags that indicate missing specification
  areas
