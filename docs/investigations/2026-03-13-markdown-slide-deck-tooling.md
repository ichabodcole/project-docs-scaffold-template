# Investigation: Markdown Slide Deck Tooling

**Date Started:** 2026-03-13 **Investigator:** Claude Code\
**Status:** Active **Outcome:** In Progress

---

## Question / Motivation

Which markdown-to-slide technology best supports an agent-authoring workflow
where an agent writes minimal slide-flavored markdown and tooling handles
rendering with no build complexity?

The core requirements driving this decision:

1. **Low agent authoring effort** — the format should stay close to plain
   markdown; agents shouldn't need to learn a complex DSL or produce
   framework-specific syntax
2. **Mermaid diagram support** — slides should be able to render flow diagrams
   and relationships inline, not just text and bullets
3. **Minimal setup** — if it takes significant configuration to get running,
   it's the wrong tool
4. **Browser-based viewing** — output should open in a browser and be clickable;
   no PDF-only workflows
5. **Future interactivity headroom** — ideally the technology has a path toward
   light interactivity (clickable option selection) without a full rewrite

This investigation feeds directly into the `markdown-slide-decks` brief
(`docs/briefs/2026-03-13-markdown-slide-decks.md`).

## Current State Analysis

No slide deck tooling exists in this project today. The gap: project documents
(proposals, dev plans, architecture docs) are authored for agent consumption —
dense, detailed, structured for implementation. There is no lightweight
human-facing summary layer.

The adjacent art in this project is the `html-mockup-prototyping` skill, which
uses a similar philosophy: a minimal CDN-based stack (Tailwind + Alpine.js) that
an agent can author without a build step. The same principle applies here — find
the technology where writing the source file is the only real work.

## Investigation Findings

### Candidates to Evaluate

**Marp**

- Markdown Presentation Ecosystem — extends standard markdown with `---` slide
  separators and a small set of directives (`<!-- _class: ... -->`)
- Agent authoring effort: very low — a standard markdown file with `---`
  dividers is already valid Marp input
- Mermaid support: available via `@marp-team/marp-cli` with the `--html` flag or
  the Mermaid plugin; not built-in by default
- Setup: `npx @marp-team/marp-cli slide.md --html` — single command, no config
  required for basic use
- Output: HTML (browser), PDF, PPTX
- Interactivity: none natively; HTML output can be augmented but not designed
  for it
- VS Code extension available for live preview

**Slidev**

- Vue-powered slide framework by Anthony Fu
- Markdown-based with frontmatter config; uses `---` separators like Marp
- Agent authoring effort: low for basic slides; higher if using Vue component
  features (which agents should avoid)
- Mermaid support: **built-in, zero config** — just write a `mermaid` code block
- Setup: `npm init slidev` or `npx slidev` — requires Node.js, spins up a dev
  server
- Output: browser SPA (hot reload), PDF export, static HTML
- Interactivity: designed for it — click-to-reveal, component embedding,
  presenter mode; Vue components can be dropped into slides
- More opinionated and feature-rich than Marp

**Reveal.js**

- HTML/JS presentation framework; markdown support via a plugin
- Agent authoring effort: higher — source is HTML or requires a markdown plugin
  wrapper
- Mermaid support: available via plugin
- Setup: moderate (requires a project scaffold or CDN links)
- Less suited for pure-markdown authoring workflows

### Key Observations

- **Marp wins on simplicity.** A plain markdown file with `---` separators
  renders immediately with a single `npx` command. Zero project setup. Agent
  writes standard markdown, adds dividers. This matches the html-mockup
  philosophy closely.
- **Slidev wins on features.** Native Mermaid, hot-reload dev server, Vue
  components, presenter mode, interactivity. But it requires a running dev
  server and a project directory — more setup than a single-command render.
- **Mermaid is the deciding variable.** If Marp's Mermaid plugin is reliable and
  low-friction to enable, Marp is likely the right choice. If it requires
  significant config, Slidev's zero-config Mermaid becomes compelling despite
  the heavier setup.
- **Reveal.js is not a strong fit** for agent-authored content — too much HTML
  surface area.

### Options Considered

| Option    | Agent Effort | Mermaid                | Setup                 | Interactivity |
| --------- | ------------ | ---------------------- | --------------------- | ------------- |
| Marp      | Very low     | Plugin (needs testing) | Minimal (`npx`)       | None          |
| Slidev    | Low–Medium   | Native (zero config)   | Moderate (dev server) | High          |
| Reveal.js | Medium–High  | Plugin                 | Moderate              | Medium        |

## Recommendation

- [x] **More Research Needed** — Prototype required before deciding

**Rationale:** The core tradeoff (Marp simplicity vs. Slidev
Mermaid/interactivity) can't be resolved by reading docs alone. Need to
prototype both with a real project document and evaluate: how close is the
agent's output to valid input, does Mermaid work reliably, and is the setup
friction acceptable.

## Next Steps

- [ ] Prototype Marp: take an existing proposal or dev plan, generate a slide
      markdown file with `---` separators, render with `npx @marp-team/marp-cli`
      with `--html` flag, verify Mermaid renders via plugin
- [ ] Prototype Slidev: same source doc, generate slides, run `npx slidev`,
      verify Mermaid renders natively, assess agent authoring complexity
- [ ] Compare: which output looks better, which required less agent-specific
      syntax, which setup was less friction
- [ ] Based on prototype results, write a proposal covering: chosen technology,
      skill definition (trigger conditions, slide structure conventions, output
      location), and doc structure recommendation

## Open Questions

- [ ] Does Marp's Mermaid plugin work reliably without additional configuration?
- [ ] Is Slidev's dev server requirement acceptable, or does it add too much
      friction compared to Marp's single-command render?
- [ ] Where should `.md` slide source files live in the doc structure? Options:
      `docs/slides/`, alongside source doc, or in project `artifacts/`
- [ ] Should a slide file be committed to the repo or treated as ephemeral
      output (generated on demand, not checked in)?
- [ ] Is there a path to light interactivity in Marp (e.g., via its HTML
      output), or does interactivity require Slidev?

---

**Related Documents:**

- [Brief: Markdown Slide Decks](../briefs/2026-03-13-markdown-slide-decks.md)
