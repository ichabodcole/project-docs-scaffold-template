---
name: investigation-methodology
description:
  Systematic investigation framework for research, root cause analysis, and
  evidence-based inquiry
---

# Investigation Methodology

A structured approach to conducting investigations that produces defensible,
evidence-based conclusions.

## When to Use

Use this methodology when you need to:

- Investigate why something happened (incidents, bugs, failures)
- Understand how a system works (codebase archaeology, architecture analysis)
- Research a topic thoroughly (technology evaluation, security analysis)
- Trace root causes beyond surface symptoms
- Build a defensible understanding from scattered evidence

**Key indicator**: The answer isn't immediately obvious and requires gathering
evidence from multiple sources.

## Investigation Framework

### Phase 1: Scoping and Hypothesis Formation

Define boundaries before diving in:

- **Clarify objectives**: What questions must be answered?
- **Define success**: What does a complete answer look like?
- **Form hypotheses**: Based on available information, what are the likely
  explanations?
- **Identify evidence needs**: What would confirm or refute each hypothesis?
- **Map information sources**: Where might evidence exist? (logs, code,
  documentation, configs, git history)

**Stopping point**: You have 2-3 testable hypotheses and know where to look for
evidence.

### Phase 2: Evidence Gathering

Cast a wide net, then focus:

- **Gather broadly**: Collect more evidence than you think you need initially
- **Document everything**: Source, timestamp, context for each piece of evidence
- **Look for patterns**: What appears repeatedly? What's anomalous?
- **Cross-reference**: Validate findings across multiple sources
- **Note gaps**: What evidence is missing? What might that indicate?
- **Preserve originals**: Work with copies when analyzing, keep originals intact

**Stopping point**: You have enough evidence to evaluate all hypotheses, or
you've exhausted available sources.

### Phase 3: Analysis and Synthesis

Evaluate evidence against hypotheses:

- **Test each hypothesis**: Does the evidence support or contradict it?
- **Apply Occam's Razor**: Prefer the simplest explanation that fits all facts
- **Actively disprove**: Try to break your own theories before accepting them
- **Separate correlation from causation**: Just because A precedes B doesn't
  mean A caused B
- **Rate confidence**: How certain are you? What would change your mind?
- **Acknowledge uncertainty**: What remains unknown or ambiguous?

**Stopping point**: You have a conclusion that explains all evidence, or you
know why a conclusion isn't possible.

### Phase 4: Documentation and Recommendations

Structure findings for action:

- **Narrative structure**: Tell the story in logical order
- **Separate facts from interpretation**: Make clear which is which
- **Actionable recommendations**: What should be done based on findings?
- **Preventive measures**: How can similar issues be avoided?
- **Further investigation**: What questions remain unanswered?

**Stopping point**: Someone unfamiliar with the context could follow your
reasoning.

## Methodological Principles

**Evidence Hierarchy**: Prioritize by reliability:

1. Primary sources (logs, code, data) over secondary (documentation, memories)
2. Timestamped evidence over estimates
3. Multiple corroborating sources over single sources

**Adversarial Thinking**: Actively consider:

- What could go wrong?
- What assumptions might be false?
- What are we not seeing?

**Timeline Reconstruction**: Build chronological event sequences—time-based
analysis often reveals causation that static analysis misses.

**Follow the Data**: Let evidence guide conclusions. When evidence contradicts
hypotheses, abandon the hypothesis—not the evidence.

**Document the Journey**: Record not just what you found, but how you found it.
Your investigation path may be valuable for future researchers.

## Output Format

Structure investigation outputs using the templates in
`docs/investigations/README.md`. Key sections:

```markdown
# Investigation: [Topic]

## Summary

[2-3 sentence overview of findings]

## Background

[Context and why this investigation was needed]

## Methodology

[How you investigated - sources, approach]

## Findings

[Organized by theme or chronology]

### Finding 1: [Title]

**Evidence**: [What you found] **Source**: [Where you found it]
**Significance**: [What it means]

## Conclusions

[Your interpretation of the findings]

- Confidence level: [High/Medium/Low]
- Key uncertainties: [What you don't know]

## Recommendations

[What should be done based on findings]

## Appendix

[Supporting evidence, raw data, timelines]
```

## Quality Checklist

Before concluding any investigation:

- [ ] All initial questions have been addressed (or documented why they couldn't
      be)
- [ ] Evidence supports stated conclusions
- [ ] No logical gaps or unsupported leaps
- [ ] Confidence levels are stated for uncertain conclusions
- [ ] Recommendations are actionable and specific
- [ ] Someone unfamiliar with context could follow the reasoning
- [ ] Dead ends are documented with explanation

## Scaling to Complexity

**Simple investigation** (clear problem, limited scope):

- 2-3 sources
- Single hypothesis track
- Stop when evidence converges

**Moderate investigation** (unclear cause, multiple systems):

- 5-10 sources
- 2-3 hypothesis tracks
- Stop when you can explain all evidence

**Complex investigation** (systemic issue, many unknowns):

- 10+ sources, multiple types
- Multiple hypothesis tracks with branches
- Stop when you have high confidence or documented why certainty isn't possible

**Too complex?** Consider breaking into multiple focused investigations.
