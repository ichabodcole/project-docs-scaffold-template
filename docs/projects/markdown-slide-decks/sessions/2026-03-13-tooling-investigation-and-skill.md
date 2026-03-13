# Tooling Investigation and Skill — 2026-03-13

## Context

First session on the markdown-slide-decks project. Covered the full arc from
investigation through prototyping to skill creation.

## What Happened

**Investigation:** Evaluated Marp vs Slidev vs Reveal.js for agent-authored
slide decks. Reveal.js eliminated early (too much HTML). Marp and Slidev
prototyped against the investigation doc itself as source material.

**Marp prototype:** Rendered cleanly with a single `npx` command. Mermaid was
the blocker — requires `--html` flag and replacing standard code blocks with
`<pre class="mermaid">` + inline CDN script tag. Non-standard syntax agents
would need to write.

**Slidev prototype:** Required `npm install @slidev/cli @slidev/theme-default`
(one-time) but then `npx slidev <file>.md` works directly. Native Mermaid — just
standard fenced code blocks. Hot-reload dev server.

**Interactivity prototype:** Built `MultiChoice.vue` and `FeedbackSummary.vue`
Vue components. Reviewer clicks through decision slides, selections persist to
localStorage, final slide aggregates all answers. "Save feedback.md" button uses
the File System Access API (Chromium) with a download fallback — no copy-paste
required. Both components validated end-to-end.

**Decision:** Slidev. Mermaid friction in Marp was the deciding factor.

**Skill created:** `plugins/project-docs/skills/generate-slide-deck/` — includes
SKILL.md, starter template, and the Vue components (MultiChoice,
FeedbackSummary, TellMeMore).

## Changes Made

- `docs/investigations/2026-03-13-markdown-slide-deck-tooling.md` — concluded,
  updated with prototype findings and decisions
- `docs/projects/markdown-slide-decks/proposal.md` — scaffolded
- `docs/projects/markdown-slide-decks/artifacts/marp-prototype.md` — Marp
  prototype (reference)
- `docs/projects/markdown-slide-decks/artifacts/slidev-prototype.md` — Slidev
  prototype with MultiChoice + FeedbackSummary (reference)
- `docs/projects/markdown-slide-decks/artifacts/components/MultiChoice.vue`
- `docs/projects/markdown-slide-decks/artifacts/components/FeedbackSummary.vue`
- `plugins/project-docs/skills/generate-slide-deck/SKILL.md` — new skill
- `plugins/project-docs/skills/generate-slide-deck/templates/slides.md` —
  starter template
- `plugins/project-docs/skills/generate-slide-deck/components/MultiChoice.vue`
- `plugins/project-docs/skills/generate-slide-deck/components/FeedbackSummary.vue`
- `plugins/project-docs/skills/generate-slide-deck/components/TellMeMore.vue`
- `plugins/project-docs/.claude-plugin/plugin.json` — v1.13.0 → v1.14.0
- `plugins/project-docs/README.md` — added skill entry and version history
- `package.json` / `package-lock.json` — added `@slidev/cli`,
  `@slidev/theme-default` as devDependencies

## Follow-up

- Continued in session 2: skill refinement, agent creation, executive deck
  philosophy

---

**Related Documents:**

- [Investigation](../../investigations/2026-03-13-markdown-slide-deck-tooling.md)
- [Brief](../../briefs/2026-03-13-markdown-slide-decks.md)
