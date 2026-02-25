# Investigation: Cross-Agent Skill Portability and Distribution

**Date Started:** 2026-02-25 **Investigator:** Claude Code **Status:** Active
**Outcome:** In Progress

---

## Question / Motivation

The project-docs plugin currently distributes skills, commands, and agents
exclusively through the Claude Code marketplace. While this works well within
the Claude Code ecosystem, it means the 22 skills, 8 agents, and 5 commands are
inaccessible to users of other AI coding agent harnesses — OpenAI Codex,
OpenCode (SST), Crush (Charmbracelet), Cursor, GitHub Copilot, Gemini CLI, and
others.

Given the rapid growth of the agent harness ecosystem, we need to understand:

1. What formats do other agent harnesses support?
2. How much of our existing content is already portable?
3. What are the emerging standards for cross-agent skill distribution?
4. What changes (if any) would maximize reach without fragmenting maintenance?

## Current State Analysis

### What We Ship Today

| Component          | Count | Format                                | Location                                          |
| ------------------ | ----- | ------------------------------------- | ------------------------------------------------- |
| Skills             | 22    | SKILL.md (YAML frontmatter + MD body) | `plugins/project-docs/skills/`                    |
| Agents (subagents) | 8     | MD with YAML frontmatter              | `plugins/project-docs/agents/`                    |
| Commands           | 5     | MD with YAML frontmatter              | `plugins/project-docs/commands/`                  |
| Plugin manifest    | 1     | JSON                                  | `plugins/project-docs/.claude-plugin/plugin.json` |
| Marketplace index  | 1     | JSON                                  | `.claude-plugin/marketplace.json`                 |

### Claude Code-Specific Frontmatter Extensions

Our skills use several Claude Code-specific YAML frontmatter fields beyond the
base Agent Skills standard:

- `disable-model-invocation` — Prevents auto-invocation (user-only skills)
- `user-invocable` — Hides from `/` menu (Claude-only skills)
- `context: fork` — Runs skill in isolated subagent context
- `agent` — Which subagent type to use
- `model` — Model override
- `hooks` — Lifecycle hooks scoped to the skill

These fields are **silently ignored** by other tools — they don't break
portability, they just don't function.

### Distribution

Currently distributed via the Claude Code marketplace:

```
/plugin marketplace add ichabodcole/project-docs-scaffold-template
/plugin install project-docs
```

No alternative distribution path exists for non-Claude Code users.

## Investigation Findings

### The Agent Skills Open Standard

The most significant finding: **our SKILL.md format is already an open
standard**, adopted by 30+ tools.

Anthropic open-sourced the Agent Skills specification on December 18, 2025 at
[agentskills.io](https://agentskills.io). It is now governed by the Agentic AI
Foundation (Linux Foundation), co-founded by Anthropic, OpenAI, and Block.

**Base spec requires only:**

- `name` (lowercase-dashed, max 64 chars)
- `description` (max 1024 chars)

**Optional base fields:** `license`, `compatibility`, `metadata`,
`allowed-tools` (experimental)

**Confirmed adopters:** Claude Code, OpenAI Codex, Cursor, GitHub Copilot,
Gemini CLI, JetBrains Junie, OpenCode, Crush, Goose, Roo Code, OpenHands, VS
Code, Windsurf, and more.

### AGENTS.md as Project-Level Standard

AGENTS.md has emerged as the cross-tool standard for project-level instructions
(the equivalent of CLAUDE.md). Adopted by 60,000+ repositories and supported
natively by Codex, OpenCode, Crush, Copilot, Cursor, Windsurf, and Gemini CLI.

Most tools read AGENTS.md, and several also read CLAUDE.md as a fallback:

| Tool           | Native file                     | Reads AGENTS.md | Reads CLAUDE.md |
| -------------- | ------------------------------- | --------------- | --------------- |
| Claude Code    | CLAUDE.md                       | Yes             | Yes (primary)   |
| OpenAI Codex   | AGENTS.md                       | Yes (primary)   | Via config      |
| OpenCode (SST) | AGENTS.md                       | Yes (primary)   | Fallback        |
| Crush (Charm)  | CRUSH.md                        | Yes             | Yes             |
| Cursor         | .cursor/rules/                  | Yes             | No              |
| GitHub Copilot | .github/copilot-instructions.md | Yes             | No              |
| Gemini CLI     | GEMINI.md                       | Yes             | Yes             |

### Portability Matrix

| Component                 | Format                | Cross-tool? | Notes                                              |
| ------------------------- | --------------------- | ----------- | -------------------------------------------------- |
| `skills/*/SKILL.md`       | Agent Skills standard | **Yes**     | Base fields work everywhere; CC extensions ignored |
| AGENTS.md project context | Open standard         | **Yes**     | Read natively by most tools                        |
| `commands/*.md`           | Claude Code specific  | **No**      | Legacy alias for skills; already consolidated      |
| `agents/*.md`             | Claude Code specific  | **No**      | No cross-tool equivalent exists                    |
| `plugin.json`             | Claude Code specific  | **No**      | Manifest/versioning not portable                   |
| `marketplace.json`        | Claude Code specific  | **No**      | Distribution mechanism not portable                |
| `hooks/`                  | Claude Code specific  | **No**      | Lifecycle hooks are CC-only                        |
| CC frontmatter extensions | Claude Code specific  | **Ignored** | `context`, `agent`, `model`, `hooks` silently skip |

### The Protocol Stack

Four complementary layers have emerged:

```
┌──────────────────────────────────────┐
│  A2A (Agent2Agent)                   │  Agent-to-agent runtime communication
├──────────────────────────────────────┤
│  Agent Skills (SKILL.md)             │  Portable knowledge/instruction packages
├──────────────────────────────────────┤
│  MCP (Model Context Protocol)        │  Tool/resource access (APIs, DBs)
├──────────────────────────────────────┤
│  AGENTS.md / CLAUDE.md               │  Project-level context & coding rules
└──────────────────────────────────────┘
```

Key distinction: **MCP gives agents tools (verbs). Skills give agents knowledge
(context).** They are complementary, not competing.

### Distribution Mechanisms Beyond Claude Marketplace

| Channel            | Type               | Status            | Notes                                          |
| ------------------ | ------------------ | ----------------- | ---------------------------------------------- |
| skills.sh (Vercel) | Package manager    | Launched Jan 2026 | `npx skills add <name>`; emerging standard     |
| GitHub repos       | Direct install     | Mature            | Most tools can install skills from GitHub      |
| npm packages       | Package manager    | Mature            | Codex, OpenCode support npm-based distribution |
| openai/skills      | Curated catalog    | Active            | Official OpenAI skill catalog                  |
| Claude marketplace | Plugin marketplace | Active            | Claude Code-only                               |
| Filesystem sharing | Direct             | Works today       | OpenCode reads `~/.claude/skills/` natively    |

### How Other Tools Discover Skills

- **OpenAI Codex:** `~/.codex/skills/`, project `.codex/skills/`,
  `$skill-installer`
- **OpenCode:** `.opencode/skills/`, `~/.config/opencode/skills/`, **also reads
  `~/.claude/skills/`**
- **Crush:** `~/.config/crush/skills/`, configurable via `options.skills_paths`
- **Cursor:** `.cursor/skills/` (if supported), primarily rule-based
- **Cross-tool:** `~/.agents/skills/` (emerging shared path)

### Validation Tooling

- `skills-ref validate ./my-skill` — CLI validator from
  [agentskills/agentskills](https://github.com/agentskills/agentskills)
- `claude plugin validate .` — Claude Code-specific validation

## Key Observations

### What Works Well

1. **Our skills are already portable.** The 22 SKILL.md files follow the Agent
   Skills standard. Other tools will load `name`, `description`, and the
   markdown body. Claude Code-specific extensions are silently ignored.

2. **The root-level context blurb pattern is exactly right.** Our recent
   addition of a recommended AGENTS.md/CLAUDE.md blurb aligns with the AGENTS.md
   standard that most tools now support.

3. **Skill quality is high.** Rich descriptions with "Use when..." and "Triggers
   when..." patterns work across all tools since description-matching is the
   universal invocation mechanism.

### The Gaps

1. **Distribution is the primary gap.** The Claude marketplace is the only
   distribution channel. Skills.sh, GitHub, and npm are all viable alternatives
   but we don't publish to any of them.

2. **Agents have no cross-tool equivalent.** Our 8 subagent definitions
   (frontmatter with tools, model, permissionMode, etc.) are Claude Code-only.
   Other tools don't have a subagent specification.

3. **Commands are effectively skills.** Already consolidated in a prior effort.
   The `commands/` directory is a legacy alias in Claude Code.

4. **Plugin packaging is Claude-specific.** The `plugin.json` manifest,
   `.claude-plugin/` directory structure, and marketplace.json are not
   understood by other tools. Skills would need to be extractable as standalone
   directories.

5. **No automated cross-tool testing.** We have no way to verify skills work
   correctly in Codex, OpenCode, or Crush beyond manual testing.

## Open Questions

1. **Single repo or separate skills repo?** Should skills be extracted into a
   standalone GitHub repo (for skills.sh / npm distribution), or should the
   scaffold template repo serve double duty?

2. **How to handle Claude Code-specific extensions?** Our skills use `context`,
   `agent`, `model`, and other CC-only fields. These are silently ignored by
   other tools, but should we restructure so that skills degrade more
   gracefully?

3. **What about agents?** Our 8 subagents are valuable but CC-only. Could they
   be reimagined as skills? Or do they stay CC-exclusive?

4. **Distribution strategy:** Publish the full plugin to Claude marketplace AND
   individual skills to skills.sh? Or a separate "skills-only" package?

5. **AGENTS.md vs CLAUDE.md:** Should we recommend AGENTS.md as the primary
   project context file (cross-tool) with CLAUDE.md as a symlink or supplement?

6. **Versioning across channels:** How to keep versions in sync if skills are
   published to multiple registries (Claude marketplace, skills.sh, npm)?

## Next Steps

1. **Focus on the distribution gap** — this is the highest-impact area since
   skills are already format-compatible
2. **Evaluate distribution strategies** — standalone skills repo vs. dual
   publishing from the existing repo
3. **Assess agent portability** — determine if subagents can be meaningfully
   converted to skills or if they remain CC-exclusive
4. **Consider a proof-of-concept** — publish 2-3 skills to skills.sh and test
   cross-tool loading in Codex and OpenCode

---

**Related Documents:**

- [Plugin README](../../plugins/project-docs/README.md)
- [Plugin manifest](../../plugins/project-docs/.claude-plugin/plugin.json)
- [Marketplace config](../../.claude-plugin/marketplace.json)
- [Agent Skills specification](https://agentskills.io/specification)
- [AGENTS.md specification](https://agents.md/)

**Research Sources:**

- [agentskills.io](https://agentskills.io) — Agent Skills open standard
- [OpenAI Codex Skills docs](https://developers.openai.com/codex/skills)
- [OpenCode Skills docs](https://opencode.ai/docs/skills/)
- [Crush README](https://github.com/charmbracelet/crush)
- [skills.sh](https://skills.sh) — Vercel skills directory
- [Agentic AI Foundation](https://openai.com/index/agentic-ai-foundation/) —
  Linux Foundation governance
