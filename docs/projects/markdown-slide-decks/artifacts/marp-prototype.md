---
marp: true
theme: default
paginate: true
style: |
  section {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0f172a;
    color: #e2e8f0;
  }
  h1 { color: #f8fafc; font-size: 2rem; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
  h2 { color: #93c5fd; font-size: 1.5rem; }
  h3 { color: #7dd3fc; }
  a { color: #60a5fa; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { background: #1e3a5f; color: #93c5fd; padding: 0.5rem 0.75rem; text-align: left; }
  td { border-top: 1px solid #334155; padding: 0.5rem 0.75rem; }
  tr:nth-child(even) td { background: #1e293b; }
  code { background: #1e293b; color: #7dd3fc; padding: 0.1rem 0.4rem; border-radius: 4px; }
  ul { line-height: 1.8; }
  li { margin-bottom: 0.25rem; }
  .muted { color: #94a3b8; font-size: 0.9rem; }
---

# Markdown Slide Deck Tooling

## Technology Investigation

Finding the best tool for agent-authored slide decks

---

# The Problem

Project docs are written **for agents** — dense, detailed, structured for
implementation.

Human reviewers need a faster path to the signal.

**Goal:** An agent writes lightweight slide markdown → tooling renders it →
reviewer clicks through in minutes.

**Key constraints:**

- Low agent authoring effort
- Mermaid diagram support
- Minimal setup (no complex build pipeline)
- Browser-based output

---

# Candidates Evaluated

Three tools considered:

| Tool       | Agent Effort | Mermaid                | Setup               |
| ---------- | ------------ | ---------------------- | ------------------- |
| **Marp**   | Very low     | Plugin (needs testing) | `npx` one-liner     |
| **Slidev** | Low–Medium   | Native, zero config    | Dev server required |
| Reveal.js  | Medium–High  | Plugin                 | Moderate            |

> Reveal.js eliminated early — too much HTML surface area for pure-markdown
> workflows.

---

# Marp

Markdown Presentation Ecosystem

**Strengths:**

- Plain markdown + `---` dividers = valid Marp input
- Single command: `npx @marp-team/marp-cli slide.md --html`
- No project setup, no dev server
- VS Code extension for live preview
- Output: HTML, PDF, PPTX

**Weakness:**

- Mermaid requires `--html` flag + plugin — not built-in

---

# Slidev

Vue-powered slides by Anthony Fu

**Strengths:**

- **Mermaid built-in** — just write a `mermaid` code block
- Hot-reload dev server
- Interactivity: click-to-reveal, Vue components, presenter mode
- Natural path to clickable option selection

**Weakness:**

- Requires a running dev server + project directory
- More setup than a single `npx` command
- Vue features increase agent authoring complexity (agents should avoid them)

---

# The Deciding Variable

```
If Marp Mermaid plugin is low-friction → use Marp (simplicity wins)
If Marp Mermaid is awkward           → use Slidev (native support wins)
```

**Philosophy match:** Marp most closely mirrors the `html-mockup-prototyping`
approach — single file, CDN/npx, no build step.

**Interactivity headroom:** Only Slidev has a credible path to clickable
decision slides.

---

# Prototype Flow (Mermaid Test)

<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true, theme:'dark'});</script>

<pre class="mermaid">
flowchart LR
    A[Source Doc] --> B[Agent distills]
    B --> C[Slide markdown]
    C --> D{Render}
    D -->|Marp npx| E[HTML output]
    D -->|Slidev dev server| F[SPA output]
    E --> G[Reviewer views]
    F --> G
    G --> H[Feedback via Claude Code]
</pre>

---

# Open Questions

- [ ] Does Marp's Mermaid plugin work without extra config?
- [ ] Is Slidev's dev server acceptable friction vs. Marp's `npx`?
- [ ] Where do slide files live? `artifacts/`, `docs/slides/`, or ephemeral?
- [ ] Should slide files be committed or generated on demand?
- [ ] Is there a path to light interactivity in Marp's HTML output?

---

# Recommendation

**More research needed** — prototype required to decide.

**Next steps:**

1. Render this deck with Marp → evaluate Mermaid plugin friction
2. Render same content with Slidev → compare output quality + setup cost
3. Choose tool → define skill (trigger conditions, structure conventions, output
   location)

---

# Summary

|                | Marp                   | Slidev                    |
| -------------- | ---------------------- | ------------------------- |
| Agent writes   | Plain markdown + `---` | Same, plus frontmatter    |
| Mermaid        | Plugin (untested)      | ✅ Native                 |
| Launch         | `npx` one-liner        | `npx slidev` + dev server |
| Interactivity  | None                   | High                      |
| Philosophy fit | ✅ Strong              | Moderate                  |
