---
name: tech-integration-research
description:
  Rapid online research methodology for discovering how technologies integrate,
  current best practices, and configuration requirements.
---

# Technology Integration Research

A focused online research methodology for answering specific technical questions
about how tools, frameworks, and services work together.

## When to Use

Use this skill when you need to:

- Understand how Tool A integrates with Tool B
- Find migration patterns from one technology to another
- Discover configuration requirements and setup procedures
- Learn about API usage and authentication flows
- Identify common pitfalls and recommended approaches
- Research current best practices (2024-2026)

**Key indicator**: Questions containing "How does X work with Y?" or "What do I
need to set up Z?"

## Research Methodology

### 1. Context Gathering

- Check project documentation for current technology stack
- Note versions of tools already in use
- Understand what's changing (migration, new integration, upgrade)
- Identify specific question to answer

### 2. Search Strategy

**Official Documentation First:**

- Tool A official docs
- Tool B official docs
- Official integration guides (if they exist)

**Current Practices:**

- Recent blog posts (2024-2026)
- GitHub issues and discussions
- Migration guides and changelogs
- Example repositories or starter templates

**Search Query Patterns:**

```
"[Tool A] [Tool B] integration 2026"
"[Tool A] with [Tool B] setup guide"
"migrate from [Old Tool] to [New Tool] 2026"
"[Tool A] authentication [specific auth system]"
"[Tool A] Docker Compose example"
"[Tool A] version [X.x] [Tool B]"
```

### 3. Source Validation (Ongoing)

**Prioritization:**

1. Official documentation (highest authority)
2. Official blog posts from project maintainers
3. Well-maintained community guides with recent updates
4. GitHub discussions with maintainer responses
5. Individual blog posts (verify date and version)

**Confidence Levels:** Assign confidence to each finding based on source quality
and convergence:

- **High**: Official docs confirm, or 3+ independent sources agree
- **Medium**: 1-2 reliable sources, or official docs are ambiguous
- **Low**: Single community source, or sources conflict

**Red Flags:**

- Information older than 2 years (unless researching legacy)
- Blog posts without version numbers
- Contradictory information without explanation
- Examples that don't show imports/dependencies
- Tutorials that skip authentication/security

### 4. Information Synthesis (5 minutes)

Extract and organize:

- Key integration patterns discovered
- Required configuration (env vars, config files)
- Dependencies to install
- Step-by-step setup if available
- Common pitfalls mentioned across sources
- Gaps in documentation or open questions

## Output Format

Structure findings for easy scanning and comparison:

````markdown
## Question Researched

[Restate the specific question clearly]

## Summary

[2-3 sentence overview of key findings]

## Key Findings

- **[High/Medium/Low]** Finding 1: [Concise statement with source]
- **[High/Medium/Low]** Finding 2: [Concise statement with source]
- **[High/Medium/Low]** Finding 3: [Concise statement with source]

## Official Documentation

- [Tool Name Docs](URL) - What it covers
- [Integration Guide](URL) - What it covers

## Integration Pattern

[Code snippet or config example showing the integration]

```language
// Example code from official docs
```
````

## Setup Requirements

**Dependencies:**

- package-name@version - What it's for

**Environment Variables:**

- `VAR_NAME` - Purpose and example value

**Services Needed:**

- Service name - How it's used

## Configuration Example

[Actual config file example if found]

## Common Pitfalls

- Issue 1: What goes wrong and how to avoid it
- Issue 2: What goes wrong and how to avoid it

## Version Compatibility

- Tool A: version range tested
- Tool B: version range tested
- Known issues: [list any]

## Open Questions / Gaps

- What couldn't be found or remains unclear
- What needs further investigation

## Recommended Next Steps

1. [Concrete action to take based on findings]
2. [Next action]
3. [etc.]

## Sources Consulted

1. [Source Title](URL) - Published/Updated: [date], Accessed: [date]
2. [Source Title](URL) - Published/Updated: [date], Accessed: [date]
3. [etc.]

```

## Quality Checklist

Before returning findings:
- [ ] Checked 3+ sources minimum
- [ ] Included at least one official source
- [ ] Assigned confidence levels (High/Medium/Low) to each finding
- [ ] Noted any conflicts between sources
- [ ] Included code/config examples (not just prose)
- [ ] Verified information is current (2024-2026)
- [ ] Listed all sources with URLs and publication dates
- [ ] Identified gaps or unclear areas
- [ ] Included concrete recommended next steps
- [ ] Structured output in standard format

## Example Questions

**Good (specific and actionable):**
- "How does Tool A authenticate with Tool B's JWKS endpoint?"
- "What's the recommended Docker Compose setup for Service X with Database Y?"
- "How do I migrate from Library A to Library B?"

**Too Broad (needs scoping):**
- "How does Tool X work?" → Scope to specific aspect
- "Tell me about Technology Y" → What specifically about it?
- "Best practices for category Z" → Too vague, narrow the question

## Scaling Effort to Question Complexity

Match your research effort to the question's complexity:

**Simple question** (e.g., "What package integrates X with Y?"):
- Check official docs for both tools
- Find 2-3 community examples or guides
- Stop when sources converge on the same answer

**Moderate question** (e.g., "How do I set up X with Y and Z?"):
- Check official docs for all tools involved
- Find 5-8 sources across different angles (setup guides, examples, discussions)
- Look for complete working examples
- Stop when you have a clear integration pattern and setup steps

**Complex question** (e.g., "How do I migrate from A to B while maintaining C?"):
- Check official migration guides and docs
- Find 10+ sources including GitHub discussions, migration stories, and examples
- Look for edge cases and common pitfalls
- Compare multiple approaches if they exist
- Stop when you have clear recommendations with trade-offs explained

**Too complex?** If you've checked 15+ sources and still need more depth, or the question involves architectural decisions beyond simple integration, consider using the research-investigator agent instead.
```
