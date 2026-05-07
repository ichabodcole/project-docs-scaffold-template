# Recipes Consolidation — Initial Implementation — 2026-05-07

## Context

Consolidate the recipes plugin from 21 individual skills into 1 umbrella
`recipes` skill that loads recipes on demand. Discussed and agreed before this
session: the recipes plugin had grown enough that its 21 skills were bloating
the agent's metadata pool and creating triggering noise on generic phrases like
"set up X" or "add Y". Recipes are reference material consulted on demand, so
the skill-per-recipe model was wrong- shaped.

The work is mechanical — file moves, frontmatter strips, path updates — so this
was done as a lightweight branch, no formal proposal/plan upstream.

## What Happened

Built straightforwardly in a single pass:

1. **Scoped via Digestify.** Used the digestify skill to walk through the design
   questions: recipe filename (RECIPE.md), INDEX format (bullets, flexible),
   umbrella trigger tone (strict — only on the word "recipe"), process path
   (lightweight branch). Got clean structured answers, locked the design before
   any code touched.

2. **Caught a digestify rendering bug.** First dogfood pass on the design doc
   rendered the question prompts as narrow horizontal columns —
   `marked.parseInline` couldn't handle bullet lists, and inline elements inside
   the flex container each became their own flex item. Pulled out, fixed
   digestify on a separate branch (full markdown rendering + inner div wrapper +
   first-paragraph-only bold), shipped that, came back here.

3. **Built the umbrella.** Hand-wrote `recipes/SKILL.md` (strict trigger
   description, when-to-fire / when-not-to lists) and `INDEX.md` (categorized
   into 7 groups, one-line "what this builds" per recipe — descriptions
   distilled from the existing frontmatter, trigger phrases dropped since they
   don't apply anymore).

4. **Moved 20 recipes via `git mv`.** One shell loop:
   `git mv plugins/recipes/skills/<r> plugins/recipes/skills/recipes/library/<r>`
   then rename `SKILL.md` → `RECIPE.md` inside each. `references/` subdirs (5 of
   them) came along automatically.

5. **Stripped frontmatter** with a small Python script — handled both
   `description: >` folded-scalar and single-line description forms. All 20
   succeeded; bodies now open directly with `# <Name> Recipe`.

6. **Updated `create-recipe`.** Several path/terminology edits: `recipe skill` →
   `recipe`, `plugins/recipes/skills/<name>/SKILL.md` →
   `plugins/recipes/skills/recipes/library/<name>/RECIPE.md`, added a "Phase
   4.5: Update the Index" step, updated commit/PR templates, renamed
   `references/recipe-skill-template.md` → `references/recipe-template.md` and
   stripped its frontmatter section.

7. **Bumped plugin version 1.14.0 → 2.0.0** (major: skill names disappear,
   breaking change for anyone tracking them).

8. **Built dist + validated.** 53 → 34 skills total. Validator clean, prettier
   clean.

9. **Independent code review** via `feature-dev:code-reviewer` on
   `git diff develop..HEAD`. Verdict: ready to merge. One minor note about the
   `recipes:create-recipe` prefix in INDEX.md footer — confirmed that's the
   project's namespacing convention (consistent with `toolbox:digestify` etc.),
   no fix needed.

## Notable Discoveries

- **The metadata-pool argument is the strong one.** I came in expecting context
  savings to be the main benefit. They're not — loading a recipe costs the same
  tokens before and after. The real win is removing 21 entries from the agent's
  "what skills exist" reasoning surface, which makes every other skill's
  triggering cleaner.

- **Strict trigger discipline works because the user opts in.** The umbrella
  description deliberately doesn't try to anticipate every possible phrasing. It
  fires on the word "recipe" and trusts the user to say it. Dropping the
  auto-fire-on-soft-cues heuristic would have been scary if recipes were the
  agent's main job, but they're not — they're occasional reference lookups.

- **`git mv` preserves rename history at the file level even when both the
  parent path and the filename change.** The shell loop did
  `git mv .../foo .../recipes/library/foo` then
  `git mv .../recipes/library/foo/SKILL.md .../recipes/library/foo/RECIPE.md` in
  two separate commands per recipe; git's rename detection on the diff still
  recognized them as 96-98% similar renames.

## Changes Made

- New umbrella skill: `plugins/recipes/skills/recipes/SKILL.md` + `INDEX.md` +
  `library/` directory.
- 20 recipes moved into `library/`, renamed `RECIPE.md`, frontmatter stripped.
  `references/` subdirs preserved (5 recipes had them).
- `create-recipe` skill updated for new layout. Reference template renamed and
  its frontmatter section stripped.
- `plugins/recipes/.claude-plugin/plugin.json` bumped to 2.0.0.
- Dist mirror rebuilt.

## Lessons Learned

- **Use digestify for design checks even on small projects.** The rendering bug
  it caught was in digestify itself, not in the recipes work — but it surfaced
  because I was using digestify on rich markdown for the first time. Real use
  catches things synthetic use doesn't.

- **One commit can be the right size.** The consolidation diff is large (69
  files) but logically atomic — partial-state intermediates would be broken
  (e.g. moves without frontmatter strips would leave recipes still triggering).
  A single commit avoids any window where the plugin would be in an inconsistent
  state.

- **The plugin's audience size matters for migration ceremony.** If recipes had
  thousands of users tracking specific skill names, this would need a
  deprecation window, redirect skills, or a compat shim. With a small audience
  the major version bump is sufficient signal.

## Follow-up

Already noted in the proposal:

- Watch for whether strict trigger model surfaces friction in real use. Soften
  if needed.
- Revisit `create-recipe`-as-its-own-skill boundary if it feels arbitrary.

Nothing blocking — the work is done.

---

**Related Documents:**

- [Proposal](../proposal.md)
- Branch: `feat/recipes-plugin-consolidation` (1 commit at finalize).
- Related: digestify rendering fix that came out of this session, shipped
  separately on `fix/digestify-prompt-rendering`.
