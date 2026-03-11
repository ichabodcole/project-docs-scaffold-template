# UI Experimentation Framework

**Created:** 2026-03-11\
**Status:** Active

---

## The Spark

While building HTML mockup prototypes as visual references for recipe skills, it
became clear that the prototyping capability could serve a higher-level purpose:
systematically exploring UI variations on existing interfaces rather than just
building one-off mockups for new features.

## Inspiration & Influences

- The html-mockup-prototyping skill already provides fast, zero-build-step UI
  exploration with Tailwind + Alpine.js + Lucide
- A/B testing methodology — but applied at the design exploration stage rather
  than post-deployment
- Design critique workflows where multiple variations are presented side-by-side
  for evaluation
- The pattern of using subagents to parallelize independent work
- The `skill-creator` skill's evaluation framework — it generates multiple
  implementations of a skill (different descriptions, structures), runs them
  through evaluations, and grades the results. The same generate-variants →
  evaluate → pick-winner pattern applies here, just for UI instead of skill text

## Vision

A meta-skill that sits on top of the html-mockup-prototyping skill. Given an
existing UI (either a live page or existing code), it orchestrates a structured
exploration: analyze the current state, propose a range of variations (from
subtle tweaks to radical rethinks), dispatch subagents to build each variation
as a standalone prototype, then evaluate and present the results for user
review.

The workflow feels like having a design team run a quick exploration sprint —
except it happens in minutes, produces clickable prototypes, and captures
structured feedback.

## Core Use Cases

1. **Improve an existing page** — "This dashboard works but feels cluttered.
   Explore ways to improve it." The skill captures the current state, proposes
   3-5 variations (reorganized layout, simplified nav, progressive disclosure),
   builds each as a prototype, and presents them ranked.

2. **Explore a design decision** — "Should the detail view be a sidebar, a
   modal, or a full page?" The skill builds each option with realistic content
   and lets the user compare them side-by-side.

3. **Iterate on a prototype** — After an initial mockup is built, use the
   experimentation skill to generate variations: "What if the table had inline
   editing? What if we used cards instead of rows?"

4. **Evaluate with structured feedback** — Each prototype variant includes an
   embedded feedback widget where the reviewer can rate and annotate, with
   results saved to a structured file for comparison.

## What Makes It Interesting

Two things:

**Parallelized exploration.** Subagents can build 3-5 prototype variants
simultaneously. What would take a designer hours of manual iteration happens in
one dispatch. The prototyping skill is the execution layer; this skill is the
orchestration and evaluation layer.

**Structured evaluation.** Rather than just "here are some mockups, which do you
like?", the skill provides a framework: the agent grades each variant on
criteria (clarity, information density, interaction cost), the user adds their
own assessment, and the results are captured in a structured format that informs
the next step (proposal, implementation, or further iteration).

## What It Is / What It Isn't

**It is:**

- An orchestration skill that uses html-mockup-prototyping as its execution
  layer
- A structured process for exploring UI variations with evaluation criteria
- A way to parallelize design exploration using subagents
- Applicable to both new UIs and improvements to existing ones

**It is not:**

- A replacement for the html-mockup-prototyping skill (it depends on it)
- A production design system or component library
- Automated A/B testing (no real users or metrics — this is design-time
  exploration)
- A tool for non-UI decisions (architecture, data model, etc.)

## Open Questions

- [ ] How does the skill capture the "current state" of an existing UI? Options:
      Playwright screenshots, reading source code, or the user provides a
      description. Screenshots are most visual but source code gives the agent
      more to work with.
- [ ] How many variations is the right default? Too few limits exploration; too
      many overwhelms review. 3-5 feels right but should it be configurable?
- [ ] Should the embedded feedback widget be part of this skill or added to the
      base prototyping skill? It has value in both contexts.
- [ ] What evaluation criteria make sense? Candidate dimensions: clarity,
      information density, interaction cost, visual hierarchy, consistency with
      existing patterns.
- [ ] How should the "subtle vs. radical" spectrum be structured? Maybe: 1-2
      conservative variations (same layout, refined), 1-2 moderate (reorganized
      sections, different patterns), 1 radical (completely different approach).

## Suggested Next Steps

- [ ] Investigate the embedded feedback widget idea as a standalone addition to
      the html-mockup-prototyping skill — this has value even without the full
      experimentation framework
- [ ] Prototype the orchestration workflow manually: take an existing UI,
      propose variations by hand, build them, evaluate — see what works before
      encoding it as a skill
- [ ] Explore how subagent dispatch would work for parallel prototype generation

---

**Origin:**

- Experience building prototypes for openrouter-model-categories and
  nuxt-betterauth-admin recipe skills
