# Creating Custom AI CLI Prompts Playbook

## Context

This playbook describes how to create custom prompts (slash commands) for AI CLI
tools used in development: Claude Code and Codex CLI. Custom prompts enable
reusable workflows that can be invoked with a simple slash command (e.g.,
`/plan-proposal`).

## Applicability

Use this playbook when you want to:

- Create reusable workflows for recurring development tasks
- Standardize how AI assistants approach specific types of work
- Share consistent prompts across team members or projects
- Automate multi-step analysis or generation tasks

## Approach Summary

Both Claude Code and Codex CLI support custom markdown-based prompts with
similar but slightly different structures. The key is to:

1. Identify a repeatable workflow that would benefit from a custom prompt
2. Write clear, actionable instructions in markdown format
3. Place the file in the appropriate location for each tool
4. Test and refine the prompt based on actual usage

## Tool Comparison

| Feature         | Claude Code                         | Codex CLI                                |
| --------------- | ----------------------------------- | ---------------------------------------- |
| **Location**    | `.claude/commands/` (project-level) | `~/.codex/prompts/` (global, user-level) |
| **Format**      | Markdown with YAML frontmatter      | Markdown with YAML frontmatter           |
| **Frontmatter** | `description`, `allowed_tools`      | `description`, `argument-hint`           |
| **Parameters**  | `$1` through `$9`, `$ARGUMENTS`     | `$1` through `$9`, `$ARGUMENTS`          |
| **Scope**       | Per-project (committed to repo)     | Global (user-specific, not committed)    |

## Steps / Phases

### Phase 1: Design the Prompt

1. **Identify the workflow**
   - What task does this prompt automate?
   - What are the key steps involved?
   - What inputs does it need from the user?

2. **Define the structure**
   - Write a clear description (1-2 sentences)
   - Determine if parameters are needed (`$1`, `$2`, etc.)
   - Outline the step-by-step workflow
   - Specify expected outputs

3. **Consider context requirements**
   - Does it need to read specific files?
   - Does it need to search the codebase?
   - Does it need to write or modify files?
   - For Claude Code: List required tools in `allowed_tools`

### Phase 2: Create the Prompt File

#### For Claude Code (Project-Level)

1. Create the file in `.claude/commands/[command-name].md`

2. Add frontmatter:

   ```yaml
   ---
   description: "Brief description of what this command does"
   allowed_tools: ["Read", "Write", "Grep", "Glob", "Task"]
   ---
   ```

3. Write the prompt content with clear instructions

4. Use parameter substitution where needed:
   - `$1` through `$9` for positional arguments
   - `$ARGUMENTS` for all arguments
   - Example: `docs/proposals/$1`

5. Commit to version control for team sharing

#### For Codex CLI (Global)

1. Ensure directory exists:

   ```bash
   mkdir -p ~/.codex/prompts
   ```

2. Create the file in `~/.codex/prompts/[command-name].md`

3. Add frontmatter:

   ```yaml
   ---
   description: "Brief description of what this command does"
   argument-hint: "filename.md"
   ---
   ```

4. Write the prompt content with clear instructions

5. Use parameter substitution where needed:
   - `$1` through `$9` for positional arguments
   - `$ARGUMENTS` for all arguments

6. Not committed to version control (user-specific configuration)

### Phase 3: Test and Refine

1. **Test the command**
   - Claude Code: `/[command-name] [args]`
   - Codex CLI: `/[command-name] [args]`

2. **Evaluate results**
   - Does the AI follow the instructions correctly?
   - Are the outputs as expected?
   - Are there ambiguities in the instructions?

3. **Iterate**
   - Refine the wording for clarity
   - Add more specific examples if needed
   - Adjust the workflow steps based on actual behavior

## Example: Plan Proposal Command

### Claude Code Version (`.claude/commands/plan-proposal.md`)

```markdown
---
description: "Create development plan from proposal"
allowed_tools: ["Read", "Write", "Grep", "Glob", "Task"]
---

You are tasked with creating a comprehensive development plan for implementing a
feature proposal.

**Proposal to analyze:** `docs/proposals/$1`

**Your workflow:**

1. **Read and understand the proposal**
   - Read the full proposal document at `docs/proposals/$1`
   - Identify the core features, requirements, and technical considerations

2. **Analyze the current codebase**
   - Search for relevant existing code that relates to this proposal
   - Identify components, services, stores, or workflows that will need
     modification

[... additional steps ...]

**Output:** Create a detailed, actionable development plan in `docs/plans/` with
an appropriate filename.
```

### Codex CLI Version (`~/.codex/prompts/plan-proposal.md`)

```markdown
---
description: "Create development plan from proposal"
argument-hint: "proposal-filename.md"
---

You are tasked with creating a comprehensive development plan for implementing a
feature proposal.

**Proposal to analyze:** `docs/proposals/$1`

**Your workflow:**

1. **Read and understand the proposal**
   - Read the full proposal document at `docs/proposals/$1`
   - Identify the core features, requirements, and technical considerations

[... same content as Claude Code version ...]
```

## Risks & Gotchas

**Location Confusion**

- **Risk:** Creating Codex prompts in project directory or Claude prompts in
  home directory
- **Mitigation:** Remember: Claude Code = project `.claude/`, Codex CLI = global
  `~/.codex/`

**Parameter Substitution Issues**

- **Risk:** Forgetting to use `$1` syntax or assuming parameters work without
  testing
- **Mitigation:** Always test with actual arguments after creating the command

**Overly Specific Instructions**

- **Risk:** Writing prompts that only work for one specific case
- **Mitigation:** Keep instructions general but actionable; use parameters for
  specificity

**Missing Tool Permissions (Claude Code)**

- **Risk:** Claude Code may not have access to required tools if not listed in
  `allowed_tools`
- **Mitigation:** Include all necessary tools in the frontmatter

**Frontmatter Syntax Errors**

- **Risk:** Invalid YAML frontmatter prevents command from working
- **Mitigation:** Use proper YAML syntax with dashes and quotes where needed

**Global vs Project Scope**

- **Risk:** Team members don't have the same Codex prompts since they're
  user-level
- **Mitigation:** Document custom Codex prompts in project docs if team-wide
  consistency is needed

## Validation & Acceptance

A custom prompt is successfully implemented when:

- ✅ The file is in the correct location for the respective tool
- ✅ The frontmatter is valid and includes required fields
- ✅ The command appears in the slash command menu
- ✅ Invoking the command with parameters works as expected
- ✅ The AI follows the instructions and produces the desired output
- ✅ The prompt is general enough to be reused for similar tasks

## References / Links

- **Claude Code Documentation:** https://docs.claude.com/en/docs/claude-code
- **Codex CLI Custom Prompts:**
  https://zread.ai/openai/codex/23-custom-prompts-and-agents-md
- **Codex CLI GitHub:** https://github.com/openai/codex
- **Example Implementation:** This project's `/plan-proposal` command in both
  `.claude/commands/` and `~/.codex/prompts/`

## Tips

- Start simple: Create a basic version, test it, then add complexity
- Use consistent naming across tools when possible (same command name in both)
- Document your custom commands in your project's README or CLAUDE.md
- Review and update prompts periodically as workflows evolve
- Consider creating a "custom-commands.md" document listing all project-specific
  commands
