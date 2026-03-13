# Improve Skill & Improve Recipe Workflows

**Created:** 2026-03-11\
**Status:** Active

---

## The Spark

While working in another project (executing recipes and using skills), we
discovered improvements needed in the source skills and recipes. The path to
actually making those improvements was ad hoc and frustrating — trying to edit
the marketplace cache (wrong, it's pulled from git), duplicating the skill
locally, then manually extracting changes. There's no defined workflow for "I'm
using this skill/recipe and found a way to improve it."

## The Problem

The `create-recipe` skill has a clear workflow: analyze a project, extract
patterns, clone the recipes repo, create a branch, write the skill, push, PR.
But there's no equivalent for **modifying** an existing skill or recipe from
another project context.

Two distinct scenarios:

1. **Improve Skill** — While using a skill in a project, the agent or user
   discovers it could be better (missing guidance, common mistakes not
   documented, outdated patterns). Need a path to improve it in the source
   plugin repo.

2. **Improve Recipe** — While executing a recipe, the agent gets confused or
   hits friction. The user can ask "How could this recipe be improved?" and
   there should be a defined path to capture and apply those improvements.

## Vision

Two sibling skills that mirror the create-recipe pattern but for modifications:

**`improve-skill`** — triggered when a user says "this skill could be better",
"improve this skill", or "update the skill to handle X". The workflow:

1. Identify the skill and its source plugin/repo
2. Analyze the current skill content and the improvement needed
3. Clone the source repo (or use existing clone)
4. Create a branch
5. Apply the improvement
6. Show the user the diff for review
7. Push and create a PR

**`improve-recipe`** — triggered when a user says "improve this recipe", "the
recipe was confusing about X", or proactively after recipe execution when the
agent identifies friction points. Same clone-modify-PR workflow.

## What Makes It Interesting

**Self-reinforcing improvement loop.** Every time a skill or recipe is used in
the field, it has a chance to get better. The friction of "how do I even submit
this improvement?" is the main barrier — removing it means skills and recipes
naturally improve through use.

**Agent-identified improvements.** The agent executing a recipe is often the
first to encounter ambiguity or missing guidance. If it can articulate what
confused it and propose a fix, that's valuable signal that's currently lost.

**Cross-repo workflow.** Both skills need to handle the "I'm in project A but
need to modify code in repo B" pattern. This is the same pattern create-recipe
solved — clone, branch, modify, PR — but applied to edits rather than creation.

## What It Is / What It Isn't

**It is:**

- A defined workflow for improving existing skills and recipes from any project
  context
- A cross-repo modification pattern (clone source → branch → edit → PR)
- A way to capture agent-identified improvement opportunities
- Sibling workflows to create-recipe's creation pattern

**It is not:**

- A way to create new skills or recipes (that's create-recipe and skill-creator)
- An automated quality system (improvements are user/agent-initiated)
- A replacement for direct editing when you're already in the source repo

## Open Questions

- [ ] Should these be two separate skills or one skill with a mode parameter?
      They share 80% of the workflow but the trigger context differs.
- [ ] How does the skill identify the source repo for a given skill/recipe? The
      marketplace cache has source info, plugin.json has repository fields.
- [ ] Should the "agent identifies improvement" flow be proactive (agent
      suggests after execution) or only on-demand (user asks)?
- [ ] How to handle the case where the source repo isn't accessible (private
      repo, no git access)? Fallback to creating an issue instead of a PR?
- [ ] Should the improvement capture a "field report" — what the agent was
      doing, what went wrong, what the fix is — as context for the PR?

## Suggested Next Steps

- [ ] Review the create-recipe skill's cross-repo workflow to identify reusable
      patterns (clone, branch, PR creation)
- [ ] Investigate how to resolve a skill/recipe back to its source repo
      programmatically
- [ ] Prototype the improve-recipe workflow manually: execute a recipe, note
      friction, apply improvement to source repo, see what the workflow feels
      like before encoding it

---

**Origin:**

- Experience upgrading the html-mockup-prototyping skill with pattern references
  from another project
- Pain point: no defined path from "this skill needs improvement" to
  "improvement submitted as PR"
