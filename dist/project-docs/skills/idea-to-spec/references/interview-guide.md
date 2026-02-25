# Interview Guide for Idea-to-Spec

Detailed guidance for conducting specification interviews. Use this as a
reference during the interview process to ensure thorough coverage and effective
question techniques.

---

## Question Banks by Domain

### Core Concept Questions

Use these when the idea is still fuzzy:

**Framing questions:**

- "If you had to explain this app to a friend in one sentence, what would you
  say?"
- "What's the one thing this app must do well to be useful?"
- "What existing tool or process does this replace?"
- "Who would be frustrated if this app disappeared?"

**Scoping questions:**

- "Does this need user accounts, or is it single-user?"
- "Does data stay on the device, or does it sync somewhere?"
- "Is this primarily mobile, desktop, or both?"
- "Does it need to work without internet?"

**Priority questions:**

- "If you could only ship three features, which three?"
- "What's the simplest version of this that would still be useful?"
- "What feature would make users choose this over alternatives?"

---

### Data Model Questions

Use these to discover entities and their properties:

**Entity discovery:**

- "What are the main things a user creates, views, or manages?"
- "What would you see in a list view? What fields appear on each item?"
- "If you exported all the data to a spreadsheet, what would the columns be?"
- "Are there things that belong to other things?" (parent-child relationships)

**Property refinement:**

- "Is [field] required or optional when creating a [entity]?"
- "What are the valid values for [field]? Is it free text or a fixed set?"
- "Does [field] ever change after creation, or is it set once?"
- "Are there any fields that are calculated from other fields?"

**Relationship mapping:**

- "Can a [entity A] exist without a [entity B]?"
- "If you delete a [entity A], what happens to its [entity B]s?"
- "Can a [entity A] belong to multiple [entity B]s, or just one?"
- "Do you need to look up [entity B]s by their [entity A]?"

---

### User Interface Questions

Use these to map screens and flows:

**Screen discovery:**

- "Walk me through opening the app for the first time. What do you see?"
- "After that first screen, where can the user go?"
- "Is there a main dashboard or home screen? What's on it?"
- "How many distinct 'pages' or 'views' do you imagine?"

**Screen detail:**

- "On the [screen name], what actions can the user take?"
- "What information is displayed on this screen?"
- "What happens when there's no data to show on this screen?"
- "Does this screen look different on phone vs. tablet vs. desktop?"

**Navigation:**

- "How does the user get back to the home screen from anywhere?"
- "Is there a persistent navigation bar, menu, or sidebar?"
- "Are there any screens that are only reachable from certain other screens?"
- "What happens when the user presses the browser/device back button?"

**Input collection:**

- "What forms does the user fill out? What fields are on each?"
- "Are there any multi-step forms or wizards?"
- "What happens when the user enters invalid data?"
- "Are there any drag-and-drop, slider, or non-standard inputs?"

---

### Business Logic Questions

Use these to uncover rules and algorithms:

**State machines:**

- "Does [entity] go through different states?" (draft → active → archived)
- "Can [entity] go back to a previous state, or only forward?"
- "What triggers each state transition?"
- "Are there any states where certain actions are blocked?"

**Calculations:**

- "Does the app compute any statistics or summaries?"
- "Are there any formulas?" (averages, streaks, scores, etc.)
- "Do any values update automatically based on other values?"
- "Is there any time-based logic?" (countdowns, schedules, reminders)

**Sorting and filtering:**

- "When showing a list of [entity], what order are they in?"
- "Can the user change the sort order?"
- "Are there filters? What can the user filter by?"
- "Is there search? What fields are searchable?"

**Validation:**

- "What are the minimum and maximum values for [field]?"
- "Are there any fields that must be unique?"
- "Are there combinations of fields that are invalid together?"
- "What characters or formats are allowed in [field]?"

---

### System Behavior Questions

Use these selectively based on the app's needs:

**Audio (if relevant):**

- "What sounds does the app play? When?"
- "Can the user control volume per sound or globally?"
- "Should sounds continue when the app is in the background?"
- "Are sounds bundled with the app or loaded from a server?"

**Notifications (if relevant):**

- "Does the app send notifications? What triggers them?"
- "Are notifications in-app, push notifications, or both?"
- "Can the user disable or customize notifications?"
- "Are there different notification priorities?"

**Offline (if relevant):**

- "What should work without internet?"
- "What should happen when the connection drops mid-action?"
- "How should data sync when connection returns?"
- "Are there any features that require internet?"

**Data management:**

- "Can the user export their data? In what format?"
- "Can the user import data? From where?"
- "What happens if the user imports duplicate data?"
- "Should the app auto-backup?"

---

## Common App Patterns

Recognizing these patterns speeds up the interview by anticipating likely needs:

### CRUD App Pattern

Timer management, todo lists, note-taking, contact management.

- **Likely needs:** Create/edit/delete forms, list views with sorting, detail
  views, search/filter
- **Often overlooked:** Confirmation dialogs for delete, empty states, bulk
  operations

### Session/Activity Tracker Pattern

Meditation timers, workout trackers, study timers, habit trackers.

- **Likely needs:** Active session screen with controls, session history,
  statistics/streaks, timer/countdown
- **Often overlooked:** Pause/resume behavior, what happens on app close during
  session, session rating/notes

### Dashboard/Analytics Pattern

Personal finance, health tracking, project management.

- **Likely needs:** Summary cards, charts, date range filtering, data export
- **Often overlooked:** Empty state for new users, handling of partial data,
  timezone considerations

### Content Consumption Pattern

Reading apps, podcast players, learning platforms.

- **Likely needs:** Content library, playback controls, progress tracking,
  bookmarks
- **Often overlooked:** Offline access, resume position, content organization
  (folders, tags)

### Social/Collaborative Pattern

Messaging, shared workspaces, social feeds.

- **Likely needs:** User profiles, permissions, real-time updates, activity
  feeds
- **Often overlooked:** Conflict resolution, offline behavior, notification
  overload

---

## Red Flags: Missing Specification Areas

Watch for these signals that indicate gaps in the specification:

### "It just works like normal"

When the user says something "works like normal" or "the usual way," push for
specifics. What's normal for them may not match what gets built.

**Follow-up:** "Can you describe exactly what happens step by step? I want to
make sure we capture the details."

### No mention of empty states

If the user only describes the app with data, ask what the experience is like
when the app is brand new with no content.

**Follow-up:** "What does this screen look like the very first time, before any
[entities] exist?"

### No mention of errors

If the user hasn't addressed what happens when things go wrong, probe.

**Follow-up:** "What if the save fails? What if the file they import is
corrupted? What if they lose internet?"

### Vague quantities

"The user can add items" - how many? Is there a limit? What happens at scale?

**Follow-up:** "Is there a maximum number of [entities]? What if someone has
1,000 of them?"

### Missing deletion rules

"The user can delete a [entity]" - what about related entities? Is it soft
delete or permanent? Confirmation required?

**Follow-up:** "When a [entity A] is deleted, what happens to its [entity B]s?
Can the delete be undone?"

### No settings mentioned

Most apps have at least a few user preferences. If the user hasn't mentioned
settings, ask.

**Follow-up:** "Are there any preferences or settings the user can configure?
Theme, notifications, defaults?"

---

## Techniques for Eliciting Requirements

### The Walkthrough Technique

Ask the user to narrate using the app from opening to closing. Capture every
screen, action, and decision point they mention. Fill gaps after with targeted
questions.

### The Stranger Test

"If I gave this spec to someone who's never heard of the app, could they build
it?" Use this to evaluate completeness. If the answer is no, identify what's
missing.

### The Edge Case Probe

For each feature, ask: "What's the weirdest thing a user might try to do with
this?" This surfaces boundary conditions and validation rules.

### The Day-in-the-Life Technique

Ask the user to describe a typical day using the app. This reveals the primary
user flow and helps prioritize features by frequency of use.

### The Comparison Technique

"How is this different from [similar app]?" Differences highlight unique
business logic that must be specified precisely. Similarities can reference
known patterns.

---

## Progress Assessment Checklist

Use this checklist to estimate specification completeness:

### Data Model (25% weight)

- [ ] All entities identified
- [ ] All fields listed with types and constraints
- [ ] Relationships between entities documented
- [ ] ID strategy and uniqueness defined
- [ ] Timestamp management specified (createdAt, updatedAt)
- [ ] Indexes and query patterns identified

### User Interface (20% weight)

- [ ] All screens inventoried with routes and purposes
- [ ] Navigation map complete
- [ ] Each screen has elements list and action list
- [ ] Empty states defined for each screen
- [ ] Responsive behavior noted
- [ ] Confirmation dialogs and modals specified

### Business Logic (20% weight)

- [ ] State machines documented with all transitions
- [ ] Calculations specified with pseudocode
- [ ] Validation rules table per entity
- [ ] Sorting and filtering rules defined
- [ ] Time-based logic specified

### User Flows (15% weight)

- [ ] Primary user journey documented end-to-end
- [ ] Secondary flows documented
- [ ] New user / onboarding flow
- [ ] Error recovery flows

### System Behavior (10% weight)

- [ ] Audio/media behavior (if applicable)
- [ ] Notification system (if applicable)
- [ ] Offline behavior (if applicable)
- [ ] Data import/export (if applicable)
- [ ] External integrations (if applicable)

### Edge Cases & Errors (10% weight)

- [ ] Empty states per screen
- [ ] Error handling per operation
- [ ] Boundary values and limits
- [ ] Concurrent action handling
- [ ] Data corruption/recovery

---

## Mapping Interview Results to Spec Files

After interviews, organize findings into specification files:

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
