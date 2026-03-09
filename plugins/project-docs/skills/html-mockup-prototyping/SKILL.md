---
name: html-mockup-prototyping
description: >-
  Trigger on any request to build a mockup, prototype, or rough visual of a UI —
  especially when the goal is design exploration before implementation. Use when
  someone wants to SEE what something could look like: sketching out a flow,
  visualizing multiple UI states (idle/loading/error/success), comparing two
  layout options, or building a clickable preview before writing real code or a
  proposal. Also invoke proactively when reading a proposal, investigation, or
  design resolution that contains complex or undecided UI — suggest a
  prototyping step before locking in an implementation plan. The output is a
  self-contained interactive HTML file, not production code. Do NOT invoke for
  implementing real UI components, adding states to existing code, reviewing
  designs, or answering general UX questions.
---

# HTML Mockup Prototyping

## Overview

Single-file HTML prototypes using Tailwind CDN + Alpine.js. Open in a browser —
no build step, no server, no framework. Best for exploring flows and interaction
states quickly.

**Stack:** Tailwind CSS (utility styling) + Alpine.js (declarative
state/behavior). Both load from CDN.

## When to Use

- Design is unclear and needs visual exploration before a proposal or plan
- Feature has multiple states (loading, success, error, empty) that need to be
  shown
- Stakeholder needs to review a flow before implementation begins
- UX patterns are undecided (e.g., single-step vs multi-step upload)

**Not for:**

- Production code or anything that will be committed to the app
- Complex data-driven interactions (use the real UI for that)

## Core Pattern

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Mockup — [Feature Name]</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script
      defer
      src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
    ></script>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
    </style>
  </head>
  <body class="bg-slate-50 min-h-screen">
    <div x-data="{ state: 'idle' }">
      <!-- State switcher (amber bar) — always present -->
      <div
        class="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-3"
      >
        <span
          class="text-xs font-semibold text-amber-700 uppercase tracking-wide"
          >Prototype state</span
        >
        <div class="flex gap-2">
          <button
            @click="state = 'idle'"
            :class="state === 'idle' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-300'"
            class="text-xs px-3 py-1 rounded border font-medium"
          >
            1 · Idle
          </button>
          <button
            @click="state = 'loading'"
            :class="state === 'loading' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-300'"
            class="text-xs px-3 py-1 rounded border font-medium"
          >
            2 · Loading
          </button>
        </div>
      </div>

      <!-- States — shown/hidden via Alpine x-show -->
      <div x-show="state === 'idle'">
        <!-- idle content -->
      </div>

      <div x-show="state === 'loading'">
        <!-- loading content with skeletons -->
      </div>
    </div>
  </body>
</html>
```

## Alpine.js Quick Reference

Alpine adds behavior via HTML attributes — no separate script blocks needed for
state. Prefer it over vanilla JS: `x-show` is declarative and reliable, whereas
manual `getElementById`/`classList` manipulation is prone to silent failures
(blank sections when a lookup misses).

| Attribute | Purpose                                 | Example                                        |
| --------- | --------------------------------------- | ---------------------------------------------- |
| `x-data`  | Declare reactive state                  | `x-data="{ open: false, state: 'idle' }"`      |
| `x-show`  | Show/hide based on expression           | `x-show="state === 'loading'"`                 |
| `x-if`    | Conditionally render (removes from DOM) | `x-if="hasError"`                              |
| `@click`  | Handle click                            | `@click="state = 'success'"`                   |
| `:class`  | Conditional classes                     | `:class="active ? 'bg-blue-500' : 'bg-white'"` |
| `x-text`  | Set text content                        | `x-text="filename"`                            |
| `x-model` | Two-way bind input                      | `x-model="query"`                              |

## Loading States

Skeleton shimmer for loading placeholders:

```html
<style>
  .skeleton {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 4px;
  }
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
```

## Flow Design Process

1. **List states first** — write out every distinct screen/state before touching
   HTML (e.g., `idle → analyzing → populated → uploading → success`)
2. **Build the state switcher** — wire up all states even if some are
   placeholders; label each `N · Description`
3. **Fill most important states** — happy path first, then edge cases
4. **Add realistic app chrome** — sidebar nav, top header, card container even
   if not the focus
5. **Review with user** — click through states; iterate on design before
   committing to a plan

## Key Conventions

**State switcher** — Always the amber bar at top. This is what makes it a flow
mockup vs. a static screenshot.

**Realistic shell** — Wrap the mockup in app chrome. Avoids "floating widget"
syndrome where design looks good in isolation but context is unclear.

**File location** — `docs/projects/<project>/artifacts/<feature>-mockup.html`.
Commit to the branch as part of the project record.

**Resist real logic** — Buttons should just set `state = 'next'`, not implement
actual behavior. The goal is to show what happens, not make it work.

## Common Mistakes

- **Too many states in one file** — keep to one user flow (max 6-7 states).
  Split into multiple files if exploring multiple flows.
- **Missing the state switcher** — without it, reviewers can only see one state.
- **No app chrome** — floating a form on a white page makes layout decisions
  ambiguous.
- **Skipping states** — build all states (including error/empty) early, even as
  placeholders. This is where the most valuable design decisions happen.

## Skill Feedback

If anything in this skill was unclear, didn't work as expected, or could be
improved, write a `skill_feedback.md` file alongside the mockup output. Keep it
brief — a sentence or two is enough. Only do this if you have something
genuinely useful to report; don't force it.

```
## Skill Feedback
- [What was confusing or broken]
- [What would have helped]
```

This helps the skill evolve based on real usage.
