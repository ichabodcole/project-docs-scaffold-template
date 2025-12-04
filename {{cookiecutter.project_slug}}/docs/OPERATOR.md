# Operator Integration

[Operator](https://github.com/ichabodcole/operator) is a quick-capture application designed for getting messy, unstructured thoughts into a structured format that AI agents can access and process. It serves as the entry point for many features and ideas that eventually make their way into formal documentation.

## What is Operator?

Operator is an Electron-based application that allows you to quickly capture thoughts, ideas, feature requests, bugs, and notes in a low-friction way. Instead of forcing structure upfront, Operator lets you dump thoughts as they come, then provides tools for organizing and refining them later.

**Key Features:**

- **Quick Capture** - Minimal friction for getting thoughts out of your head
- **Agent Access** - MCP server integration allows AI agents to read and search your Operator documents
- **Flexible Structure** - Organize thoughts when ready, not before
- **Integration Ready** - Seamlessly feeds into investigation, proposal, and planning workflows

## How Operator Fits Into This Documentation System

Operator serves as the **intake layer** for your documentation workflow:

```
┌─────────────┐
│  Operator   │  ← Quick capture, messy thoughts, raw ideas
│  Documents  │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────┐
│  Documentation Workflow                 │
├─────────────────────────────────────────┤
│                                         │
│  Report → Investigation → Proposal →   │
│  Plan → Session → Architecture/         │
│  Playbook/Lesson Learned                │
│                                         │
└─────────────────────────────────────────┘
```

**Common Patterns:**

1. **Feature Ideas** → Captured in Operator → Refined into Investigation or Proposal
2. **Bug Reports** → Quick capture in Operator → Formalized into Lesson Learned or Issue
3. **Architecture Thoughts** → Operator notes → Architecture documentation
4. **Development Context** → Captured during work → Referenced in Sessions

## MCP Server Setup

The Operator MCP server allows AI agents to access your Operator documents
directly during conversations.

### Supported Clients

**Currently Supported:**

- **Claude Code (CLI)** - Full support via HTTP transport

**Not Currently Supported:**

- **Claude Desktop** - Does not support HTTP-based MCP servers (only stdio). HTTPS
  support may be added in the future.

### Installation for Claude Code

1. **Install and Run Operator Application**

   Operator includes a built-in MCP server that runs on
   `http://localhost:3100/mcp` when the application is running.

2. **Configure MCP Server** in your Claude Code config
   (`~/.config/claude/config.json` or `~/.claude/config.json`):

```json
{
  "mcpServers": {
    "operator": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

3. **Restart Claude Code** to load the MCP server

**Note:** The Operator application must be running for the MCP server to be
accessible. The server starts automatically when you launch Operator.

### Available Operations

Once configured, agents can:

- **Search documents** - Find Operator entries by keyword, tag, or content
- **Read full documents** - Access complete document content
- **List recent documents** - See what you've captured recently
- **Filter by type** - Search within specific document types (ideas, bugs, notes, etc.)

## Workflow Integration

### Starting with Operator

**Scenario: Feature Idea**

1. Capture rough idea in Operator: "Need better keyboard shortcuts for navigation"
2. When ready to explore: Ask agent to review Operator documents related to "keyboard shortcuts"
3. Agent synthesizes Operator entries into Investigation document
4. Investigation leads to Proposal
5. Proposal leads to Plan
6. Implementation tracked in Sessions

**Scenario: Bug Discovery**

1. Quick capture in Operator: "Export feature crashes on large files"
2. Agent reads Operator entry
3. Agent helps create Lesson Learned with root cause and fix
4. Lesson Learned references original Operator entry for context

### Asking Agents to Use Operator

**Effective Prompts:**

```
"Check my Operator for any feature ideas related to [topic]"

"Review my recent Operator entries about [project area] and help me
create an investigation document"

"Find Operator notes about [bug/issue] and draft a lesson learned"

"Search Operator for anything related to [architecture/design topic]
and incorporate it into the architecture doc"
```

## Quick Reference

### Document Types in Operator

- **Ideas** - Feature concepts, improvements, experiments
- **Bugs** - Issues, unexpected behavior, crashes
- **Notes** - General observations, context, references
- **Tasks** - Quick TODOs, reminders
- **Questions** - Open questions, things to investigate

### Best Practices

1. **Capture First, Organize Later** - Don't let structure block quick capture
2. **Use Tags Liberally** - Makes searching easier later
3. **Link to Context** - Reference code files, commit hashes, or related docs
4. **Regular Review** - Periodically review with an agent to extract formal documentation
5. **Archive When Done** - Once formalized into docs, archive the Operator entry

### Integration Tips

**For New Features:**

1. Operator rough idea with key points
2. Let it marinate (capture more related thoughts over time)
3. When ready: Review all related Operator entries
4. Create Investigation (if uncertain) or Proposal (if ready)

**For Bug Fixes:**

1. Quick capture symptom and context in Operator
2. As you debug, add findings to same Operator entry
3. Once fixed, create Lesson Learned from Operator notes

**For Architecture Decisions:**

1. Capture scattered thoughts about design in Operator
2. When pattern emerges, ask agent to synthesize into Architecture doc
3. Reference original Operator entries for historical context

## Working Without Operator

If you're not using Operator, you can still use this documentation system effectively:

- Create Investigation documents directly for exploration
- Use scratch files or comments for quick notes
- Jump straight to Proposals for well-formed ideas
- Use Sessions to capture informal notes during development

The documentation workflow is designed to work with or without Operator as an intake tool.

---

**Related Documentation:**

- [Documentation Overview](./README.md)
- [Reports](./reports/README.md)
- [Investigations](./investigations/README.md)
- [Proposals](./proposals/README.md)
- [Sessions](./sessions/README.md)
