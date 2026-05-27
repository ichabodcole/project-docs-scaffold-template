---
name: scaffold-update-checklist
description: >
  This skill should be used when making changes to the project-docs scaffold
  template. Triggers when a user says "add a new document type", "create a new
  template", "add a new skill", "create a new command", "add a new agent", "bump
  the plugin version", "update the pipeline", "modify the decision flowchart",
  "add a migration guide", "update the cookiecutter template", "sync the
  mirrored docs", "update the README structure", or "add a new document
  category". Also triggers when editing files in cookiecutter template
  directories, plugin skill/command/agent directories, or mirrored doc locations
  where consistency checks are needed.
---

# Scaffold Update Checklist

## Purpose

Ensure consistency across the project-docs scaffold template when making
structural or plugin changes. This project has many files that must stay in sync
— mirrored copies, cross-references, counts, pipeline descriptions, and version
numbers. This skill provides the checklists to avoid missing updates.

## Mirrored Files

These files exist in both the project's own `docs/` and in the cookiecutter
template at `{{cookiecutter.project_slug}}/docs/`. Changes to one MUST be
reflected in the other.

**Always mirrored:**

- `docs/README.md`
- `docs/projects/README.md`
- All files in `docs/projects/TEMPLATES/`
- Category READMEs: `docs/architecture/README.md`, `docs/backlog/README.md`,
  `docs/briefs/README.md`, `docs/fragments/README.md`,
  `docs/interaction-design/README.md`, `docs/investigations/README.md`,
  `docs/lessons-learned/README.md`, `docs/memories/README.md`,
  `docs/playbooks/README.md`, `docs/reports/README.md`,
  `docs/specifications/README.md`
- Category templates: all `TEMPLATE*.md` files within those directories

**Structurally mirrored but content differs:**

- `docs/PROJECT_MANIFESTO.md` — project version is populated; cookiecutter
  version is an empty template skeleton

**Not mirrored (project-specific):**

- `docs/memories/*` — session continuity for this project only
- `docs/projects/<project-name>/*` — actual project work (proposals, sessions)
- `AGENTS.md` and `CLAUDE.md` at project root (different from cookiecutter
  versions)

**Sync procedure (cookiecutter is the source of truth):**

1. Edit the cookiecutter copy first (under `{{cookiecutter.project_slug}}/`)
2. Create or update the migration guide in
   `plugins/project-docs/skills/update-project-docs/migrations/`
3. Apply the migration to this project's own `docs/` — follow the same steps end
   users would, to validate the guide works
4. Run Prettier on changed files to prevent line-wrapping drift

## Checklists by Change Type

### Adding or Modifying a Document Type

**Cookiecutter first (source of truth):**

- [ ] Create/update template in
      `{{cookiecutter.project_slug}}/docs/projects/TEMPLATES/` (or relevant
      `{{cookiecutter.project_slug}}/docs/<category>/`)
- [ ] Update `{{cookiecutter.project_slug}}/docs/projects/README.md` — folder
      structure example, What Goes Where, add subsection with
      when-to/when-not-to guidance, Templates list
- [ ] Update `{{cookiecutter.project_slug}}/docs/README.md` — decision
      flowchart, documentation cycle string, Quick Reference, Special cases

**Migration path (dogfood the update-project-docs skill):**

- [ ] Create migration guide in
      `plugins/project-docs/skills/update-project-docs/migrations/` — use the
      `migration-authoring` skill for quality checks
- [ ] Update migration table in
      `plugins/project-docs/skills/update-project-docs/skill.md`
- [ ] Apply the migration to this project's own `docs/` — follow the same steps
      end users would to validate the guide works

**Project-specific updates (not mirrored):**

- [ ] Update `docs/PROJECT_MANIFESTO.md` — pipeline references (check ALL
      occurrences, not just the formal cycle diagram)
- [ ] Check if downstream skills/commands need awareness of new type (e.g.,
      `generate-dev-plan` needed to learn about `design-resolution.md`)

### Creating a New Plugin

- [ ] Create `plugins/<plugin>/.claude-plugin/plugin.json` with name, version
      (1.0.0), and description
- [ ] Create `plugins/<plugin>/skills/` directory
- [ ] Add plugin entry to `.claude-plugin/marketplace.json` — include name,
      source path, category, and tags
- [ ] Update `docs/PROJECT_MANIFESTO.md` if it references plugin counts
- [ ] Run `./scripts/build-skills-dist.sh` to verify the plugin is discovered

### Adding or Modifying a Plugin Skill

Skills are the preferred delivery mechanism — they get auto-surfaced by the
agent when relevant AND can be invoked explicitly by users. Prefer creating a
skill over a command unless the action is purely explicit/user-initiated with no
auto-surfacing value (e.g., `init-branch`, `update-deps`).

- [ ] Create/update skill in `plugins/<plugin>/skills/<skill-name>/SKILL.md`
- [ ] Include rich description with "Use when..." and "Triggers when..."
      sections to ensure reliable agent routing
- [ ] Bump plugin version in `plugins/<plugin>/.claude-plugin/plugin.json`
- [ ] Update `plugins/<plugin>/README.md` — add to Skills table
- [ ] Add version history entry in plugin README
- [ ] Update `docs/PROJECT_MANIFESTO.md` — skill count
- [ ] Verify skill count matches actual directories:
      `ls plugins/<plugin>/skills/ | wc -l`

### Adding or Modifying a Plugin Command

Commands are for explicit user actions only — things a user deliberately invokes
that should NOT be auto-surfaced by the agent. If the action should also be
triggered contextually by the agent, make it a skill instead.

- [ ] Create/update command in `plugins/<plugin>/commands/<command>.md`
- [ ] Bump plugin version in `plugins/<plugin>/.claude-plugin/plugin.json`
- [ ] Update `plugins/<plugin>/README.md` — add command documentation section
- [ ] Add version history entry in plugin README
- [ ] Update root `README.md` — add to plugin command list
- [ ] Update `docs/PROJECT_MANIFESTO.md` — command count
- [ ] Verify this shouldn't be a skill instead — if the agent should auto-invoke
      it based on context, convert to a skill

### Adding or Modifying a Plugin Agent

- [ ] Create/update agent in `plugins/<plugin>/agents/<agent>.md`
- [ ] Bump plugin version in `plugins/<plugin>/.claude-plugin/plugin.json`
- [ ] Update `plugins/<plugin>/README.md` — add agent documentation
- [ ] Add version history entry in plugin README
- [ ] Update `docs/PROJECT_MANIFESTO.md` — agent count

### Bumping a Plugin Version

Use semver to communicate the nature of the change:

- **Patch (x.x.N)** — Non-behavioral fixes only: typos, formatting, broken
  links, copy corrections. If in doubt, it's probably a minor.
- **Minor (x.N.0)** — Any change that alters agent or user behavior: new
  skills/commands/agents, updated guidance, new patterns, added classes, revised
  workflows, clarified conventions. This is the default for skill content
  updates.
- **Major (N.0.0)** — Breaking changes: renamed skills, removed commands,
  restructured plugin layout that would break existing usage.

Use `feat(plugin-name)` commits for minor bumps, `chore(plugin-name)` for
patch-only changes.

- [ ] Update version in `plugins/<plugin>/.claude-plugin/plugin.json`
- [ ] Add version history entry in `plugins/<plugin>/README.md`
- [ ] Do NOT duplicate version in `.claude-plugin/marketplace.json` —
      marketplace is discovery-only (name, source, category, tags)

### Updating Pipeline or Lifecycle

**Cookiecutter first:**

- [ ] Update `{{cookiecutter.project_slug}}/docs/README.md` — cycle string,
      decision flowchart, Quick Reference
- [ ] Update `{{cookiecutter.project_slug}}/docs/projects/README.md` if it
      references the pipeline

**Apply to this project via migration path:**

- [ ] Update or create migration guide if this is a structural change
- [ ] Apply changes to project's own `docs/README.md` and
      `docs/projects/README.md` following the migration steps

**Project-specific:**

- [ ] Update `docs/PROJECT_MANIFESTO.md` — ALL pipeline references (search for
      arrows `→` and stage names)

## Counts to Verify

When the manifesto claims specific counts, verify them against the project-docs
plugin:

```bash
# Commands
ls plugins/project-docs/commands/ | grep -c '.md$'

# Skills
ls plugins/project-docs/skills/ | wc -l

# Agents
ls plugins/project-docs/agents/ | grep -c '.md$'
```

## Cross-Agent Distribution

When skills, agents, or commands change, rebuild the distribution packages:

```bash
./scripts/build-skills-dist.sh
```

- [ ] Run the build script after any skill/agent/command changes
- [ ] Verify all skills pass validation (build script runs
      `validate-skills-dist.py` automatically)
- [ ] Verify `dist/` output matches expectations (check summary counts)
- [ ] Commit updated `dist/` alongside the source changes

## Smoke Test (for plugins with runnable components)

Automated tests cover behavior in isolation, but they run against an isolated
tmpdir HOME and don't exercise the real plugin paths, environment defaults, or
interactions with any existing live state. For plugins that ship runnable code
(CLI scripts, daemons, servers — e.g. grapevine, tuskboard, digestify, magpie),
run a quick manual smoke test from the local dev tree before merging the
release.

**Recipe:**

1. Run the new version's CLI directly from the dev-tree path:

   ```bash
   bun plugins/<plugin>/skills/<skill>/scripts/cli.ts <safe-readonly-verb>
   ```

   Prefer read-only verbs first (`info`, `list`, `doctor`, etc.) to confirm the
   CLI launches, resolves its plugin.json, and surfaces sensible output.

2. Exercise the new behavior end-to-end with a non-destructive verb:

   ```bash
   bun plugins/<plugin>/skills/<skill>/scripts/cli.ts <new-verb-or-flag>
   ```

3. If the plugin has a daemon/server, verify the new behavior _without replacing
   the running daemon_ when possible. For grapevine specifically: `ensureDaemon`
   finds a running daemon via the port file and reuses it, so dev-tree CLI verbs
   against an existing live daemon are non-clobbering.

**Before running anything that could disrupt:** check for active subscribers /
users. For grapevine, `bun .../cli.ts doctor` reports an `active_subscribers`
summary — if `total > 0`, real agents are connected and a daemon restart would
force them to auto-reconnect (works, but disruptive). For other plugins with
similar concerns, expose an equivalent health/status verb and check it first.

**Watch out for:**

- **Daemon clobbering.** If you run `stop` then a verb, the next daemon spawn
  comes from the dev-tree path. This works but couples cache-spawned CLIs to a
  process that disappears when you `git checkout` away. Avoid unless you intend
  the dev-tree daemon to take over for the duration — and only when `doctor`
  confirms no active subscribers (or you've coordinated with whoever is
  connected).
- **Environment differences.** Tests use tmpdir HOMEs; real smoke tests hit the
  user's actual data directory (e.g. `~/.grapevine`). Make sure the verb you're
  testing is read-only or operates on a throwaway target (e.g. a `_smoke`
  channel you create and close).
- **Side effects on running agents.** If other agents have live tails or
  sessions against the running daemon, prefer verbs that don't disturb them
  (read-only verbs, or sending to a new throwaway channel).

**Checklist:**

- [ ] Identify whether the plugin has runnable scripts (CLI, daemon, server). If
      not, skip this section.
- [ ] **Check for active subscribers / users first** (e.g. grapevine `doctor` →
      `active_subscribers.total`). If anyone is connected, coordinate before
      running disruptive verbs.
- [ ] Run at least one read-only verb from the dev-tree CLI; verify exit code 0
      and sensible output.
- [ ] Exercise any new verb/flag added in this release with a non-destructive
      invocation.
- [ ] Confirm any new daemon-side behavior shows up correctly (e.g.
      version-mismatch warning, new response fields, new endpoints).
- [ ] If applicable, run `lsof -p <pid>` or `ps` to confirm no zombie processes
      were left behind by the smoke test.

## Final Checks

- [ ] Run `npm run format:check` (or `npx prettier --write` on changed files)
- [ ] Verify cookiecutter copies match project-root copies
- [ ] Grep for the old state to catch missed references (e.g., if you changed
      the pipeline string, grep for the old version across all `.md` files)
- [ ] **Meta: does this skill need updating?** If new document categories were
      added, new mirrored file paths were introduced, new plugin components
      changed the count verification commands, or the sync procedure changed,
      update this skill at `.claude/skills/scaffold-update-checklist/SKILL.md`
      to reflect the new state
