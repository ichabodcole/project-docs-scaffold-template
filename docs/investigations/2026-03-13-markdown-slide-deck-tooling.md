# Investigation: Markdown Slide Deck Tooling

**Date Started:** 2026-03-13 **Investigator:** Claude Code\
**Status:** Concluded **Outcome:** Proposal Recommended

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
  writes standard markdown, adds dividers.
- **Marp loses on Mermaid.** Rendering Mermaid diagrams requires the `--html`
  flag AND replacing standard ` ```mermaid ``` ` code blocks with
  `<pre class="mermaid">` + an inline CDN script tag. Agents would need to write
  non-standard HTML — real friction, not just configuration.
- **Slidev wins on features.** Native Mermaid (agents write standard code
  blocks, nothing special), hot-reload dev server, Vue components, presenter
  mode, and a clear interactivity path.
- **Slidev's setup is a one-time cost.**
  `npm install @slidev/cli @slidev/theme-default` once in the project; after
  that `npx slidev <file>.md` is the daily command. With the package already
  installed in `project-docs`, friction is minimal.
- **Interactivity prototype validated.** Built `MultiChoice.vue` and
  `FeedbackSummary.vue` components: reviewers click through decision slides,
  select options, and hit a summary slide that aggregates all answers. A "Save
  feedback.md" button uses the File System Access API (Chromium) or falls back
  to a browser download — no copy-paste required.
- **Reveal.js is not a strong fit** for agent-authored content — too much HTML
  surface area.

### Options Considered

| Option    | Agent Effort | Mermaid                    | Setup                | Interactivity |
| --------- | ------------ | -------------------------- | -------------------- | ------------- |
| Marp      | Very low     | ❌ Non-standard workaround | Minimal (`npx`)      | None          |
| Slidev    | Low          | ✅ Native (zero config)    | One-time npm install | High          |
| Reveal.js | Medium–High  | Plugin                     | Moderate             | Medium        |

## Recommendation

- [x] **Create Proposal** — Action is warranted

**Rationale:** Slidev is the clear choice. Marp's Mermaid workaround requires
agents to write non-standard HTML syntax, which defeats the goal of low-effort
authoring. Slidev's one-time setup cost is acceptable — `@slidev/cli` is now
installed in this project, so the daily workflow is just `npx slidev <file>.md`.
The interactivity prototype confirmed that `MultiChoice` + `FeedbackSummary` Vue
components provide a viable feedback loop without requiring agents to write any
Vue code.

**Decisions made during prototyping:**

| Question                   | Decision                          |
| -------------------------- | --------------------------------- |
| Which tool?                | Slidev                            |
| Where do slide files live? | `docs/projects/<name>/artifacts/` |
| Commit slide source?       | Yes — commit the `.md` source     |

## Next Steps

- [x] Prototype Marp — confirmed Mermaid requires non-standard workaround
- [x] Prototype Slidev — confirmed native Mermaid, interactivity works
- [ ] Write proposal: skill definition, slide structure conventions, Vue
      component library (`MultiChoice`, `FeedbackSummary`), npm script for
      launching, and agent authoring guidelines

---

**Related Documents:**

- [Brief: Markdown Slide Decks](../briefs/2026-03-13-markdown-slide-decks.md)
