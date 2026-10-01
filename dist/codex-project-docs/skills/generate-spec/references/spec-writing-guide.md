# Specification Writing Guide

Detailed templates, formatting conventions, and examples for writing
technology-agnostic specification documents.

---

## Overview Section Template

Every spec file starts with a brief overview:

```markdown
# [Domain] Specification

## Overview

[1-3 sentences describing what this domain is and why it exists in the
application.]
```

**Good example:**

> Timers are reusable configurations that define how meditation sessions run.
> They act as templates that can be used repeatedly to start sessions.

**Bad example (too technical):**

> The Timer module exports a Dexie entity with Zod validation that maps to the
> timers IndexedDB table.

---

## Data Model Section

Present each entity's properties as a markdown table. Use separate tables for
nested objects.

### Property Table Format

```markdown
| Property    | Type           | Constraints            | Default | Description               |
| ----------- | -------------- | ---------------------- | ------- | ------------------------- |
| `id`        | string         | Unique, auto-generated | -       | Unique identifier         |
| `title`     | string         | 1-100 characters       | -       | User-defined name         |
| `volume`    | number         | 0.1 - 1.0              | 0.7     | Playback volume (10-100%) |
| `mode`      | enum           | "fixed", "fibonacci"   | "fixed" | Timing pattern            |
| `startedAt` | datetime       | Required               | -       | When session began        |
| `notes`     | string or null | 0-1000 chars           | null    | Optional user text        |
```

### Type Conventions

| Spec Type           | Meaning                                                  |
| ------------------- | -------------------------------------------------------- |
| `string`            | Text value                                               |
| `number`            | Numeric value (specify units in Description)             |
| `boolean`           | True/false                                               |
| `enum`              | One of listed values (list in Constraints)               |
| `datetime`          | Date and time (stored as UTC)                            |
| `string or null`    | Nullable string                                          |
| `number (optional)` | Field may be omitted entirely                            |
| `array`             | Ordered list (specify element type in Description)       |
| `object`            | Nested structure (document in separate table or section) |

### Nested Objects

When an entity has nested configuration, break into sub-tables with a header:

```markdown
### Sound Settings

| Property  | Type           | Constraints           | Default | Description             |
| --------- | -------------- | --------------------- | ------- | ----------------------- |
| `enabled` | boolean        | -                     | true    | Whether sound is active |
| `soundId` | string or null | Valid sound reference | null    | Sound to play           |
| `volume`  | number         | 0.1 - 1.0             | 0.7     | Playback volume         |
```

---

## Operations Section

Document each operation with Inputs, Process, Outputs, and Side Effects:

```markdown
### Create [Entity]

**Inputs:** [Entity] properties (title required, others have defaults)
**Process:**

1. Validate input against schema
2. Generate unique ID
3. Set createdAt and updatedAt to current time
4. Apply defaults for unspecified fields

**Outputs:** New [entity] with generated ID **Side Effects:** Persisted to
storage
```

### Query Operations

```markdown
### List [Entities]

**Inputs:** Optional sort direction, optional filters **Outputs:** Array of
[entities] **Default Sort:** By [field] descending

**Null Handling:** [Describe how null values sort]
```

---

## Business Rules Section

### Validation Rules

Group by field or concern:

```markdown
## Validation Rules

### Title

- Required
- Must be 1-100 characters
- Trimmed of leading/trailing whitespace

### Volume (all sound types)

- Minimum: 0.1 (10%)
- Maximum: 1.0 (100%)
- Step: 0.1 increments recommended
```

### Algorithms as Pseudocode

Write algorithms in generic pseudocode with clear variable names:

```markdown
**Algorithm:**
```

function calculateIntervals(startDelayMs, intervalMs, sessionDurationMs):
timestamps = [] current = startDelayMs + intervalMs

    while current < sessionDurationMs:
        timestamps.push(current)
        current += intervalMs

    return timestamps

```

```

**Pseudocode conventions:**

- Use `function name(params):` syntax
- Use descriptive variable names with units (e.g., `startDelayMs` not `delay`)
- Indent with 4 spaces
- Use `//` for comments
- Use plain English for complex operations (`sort items by date descending`)
- No language-specific syntax (no `=>`, `?.`, `!!`, etc.)

### Mathematical Formulas

For precision-critical calculations, include formulas:

```markdown
**Mathematical Definition:**
```

Fade In: gain(t) = targetVolume _ (t / fadeDuration)^2 Fade Out: gain(t) =
currentVolume _ (1 - t / fadeDuration)^2

```

Where `t` is time elapsed since fade began (0 to fadeDuration).
```

---

## State Machine Section

Use ASCII diagrams for state transitions:

```markdown
## Lifecycle
```

[Created] --> [Active] --> [Completed] | \
 v \--> [Cancelled] [Paused] | v [Active]

```

```

### State Descriptions

After the diagram, describe each state:

```markdown
#### Active

- Session is running
- Timer counting down
- Audio playing according to settings

#### Paused

- Timer frozen at current position
- Audio stopped
- Pause duration tracked
```

### State Transition Table (for complex machines)

```markdown
| From      | Event        | To        | Side Effects                |
| --------- | ------------ | --------- | --------------------------- |
| Idle      | User starts  | Preparing | Load audio assets           |
| Preparing | Assets ready | Playing   | Start timer, play audio     |
| Playing   | User pauses  | Paused    | Stop audio, freeze timer    |
| Paused    | User resumes | Playing   | Resume audio, restart timer |
| Playing   | Timer ends   | Completed | Play end sound, stop timer  |
```

---

## Timeline Diagrams

For time-based behavior, use ASCII timeline diagrams:

```markdown

```

Example: 5-min interval, 2-min delay, 25-min session
|--|----1----|----2----|----3----|----4----|-- 0 2 7 12 17 22 25 ^ ^ ^ ^ chime
chime chime chime

```

```

**Guidelines:**

- Use `|` for boundaries, `-` for time passing
- Use `^` or `↑` for event markers
- Label the timeline in human-readable units
- Include a legend if symbols aren't self-explanatory

---

## User Interaction Section

Describe screens and interactions by function, not implementation:

```markdown
## Timer List View

**Purpose:** Display and manage all user timers

**Elements:**

- Page title
- Create new timer action
- List of timer cards, each showing:
  - Timer title
  - Duration (or infinity symbol for endless mode)
  - Audio enabled indicator
  - Edit and delete actions

**Sorting:** Most recently used first

**Empty State:** Message encouraging timer creation with call-to-action

**Actions:**

- Select timer -> Start session
- Edit action -> Open timer editor
- Delete action -> Confirm then remove
```

**Do:**

- Describe what the user sees and can do
- Specify sorting, filtering, and empty states
- Document confirmation dialogs and their copy

**Don't:**

- Reference component names (`<TimerCard>`, `UITableView`)
- Specify CSS classes or styling details
- Dictate specific layout frameworks

---

## Edge Cases Section

Document boundary conditions and how to handle them:

```markdown
## Edge Cases

| Scenario                             | Expected Behavior                                |
| ------------------------------------ | ------------------------------------------------ |
| No timers exist                      | Show empty state with create prompt              |
| Timer deleted with existing sessions | Sessions retained with embedded snapshot         |
| Very long duration (>2 hours)        | Format as "X hr Y min"                           |
| All sessions unrated                 | Rating average displays "N/A"                    |
| Network lost during sound download   | Retry once, then show error with cached fallback |
```

---

## Blockquote Conventions

Use blockquotes for implementation guidance and rationale:

```markdown
> **Note:** End sound is automatically disabled when endless mode is active.

> **Implementation Note:** The UI presents a slider defaulting to position 3. If
> truly optional ratings are needed, add a "No Rating" option that saves null.

> **Rationale:** Pause/stop are immediate to provide responsive feedback.
> Natural completion uses fade for a gentle ending experience.
```

- `**Note:**` - Important behavioral detail
- `**Implementation Note:**` - Guidance for the developer implementing this
- `**Rationale:**` - Explains why a design decision was made

---

## Cross-References

Link between spec files for related concepts:

```markdown
See [Audio System](./04-audio.md) for sound playback details. See
[Sessions](./03-sessions.md#rating-system) for the rating scale definition.
```

---

## Technology-Agnostic Checklist

Before finalizing any spec, verify:

- [ ] No framework names (React, Vue, SwiftUI, Flutter, etc.)
- [ ] No library names (Dexie, Zustand, Tailwind, etc.)
- [ ] No language-specific syntax in pseudocode
- [ ] No platform-specific APIs referenced directly (use generic descriptions)
- [ ] UI described by function, not component type
- [ ] Data storage described generically ("local database", "persisted storage")
- [ ] Algorithms in generic pseudocode
- [ ] Time values in milliseconds with human-readable labels
- [ ] All constants have explicit values, not symbolic references to code

---

## File Naming

```
01-overview.md      # Always first, always exists
02-timers.md        # Major entity
03-sessions.md      # Major entity
04-audio.md         # Major system
05-notifications.md # Supporting system
06-settings.md      # Configuration
07-data-management.md # Cross-cutting
08-user-interface.md  # Screens and navigation
09-statistics.md    # Analytics/reporting
```

**Rules:**

- Two-digit prefix for ordering
- Lowercase kebab-case names
- One domain per file
- Overview always first, UI near the end (depends on other domains)
