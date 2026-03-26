# Add HTML Mockup Prototyping to Toolbox — 2026-03-26

## Context

Duplicating the `html-mockup-prototyping` skill from project-docs into the
toolbox plugin so it can be used in projects without the project-docs plugin.

## What Happened

Copied the full skill (SKILL.md, templates, references including components
library) to `plugins/toolbox/skills/html-mockup-prototyping/`. Only change:
replaced the project-docs-specific file location guidance
(`docs/projects/<project>/artifacts/`) with a prompt to ask the user where to
save the mockup.

Also discussed whether to add a canvas library (Konva.js, Pixi.js) to the skill
for interactive canvas prototypes. Decided to leave as-is for now — raw Canvas
covers the common case (procedural drawing with no canvas interaction), and a
library recommendation can be added later when the need is clearer.

## Changes Made

- `plugins/toolbox/skills/html-mockup-prototyping/` — full skill with location
  guidance updated
- `plugins/toolbox/.claude-plugin/plugin.json` — bumped to 1.1.0
- `dist/` — rebuilt (48 total skills)
