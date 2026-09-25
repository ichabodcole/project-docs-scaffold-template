---
type: playbook
title: Changing a Shipped Skill Playbook
description:
  Changing a plugin skill, command or agent that consumers run, so every check
  it prescribes can fail and a fresh agent can follow it.
tags: [skills, process]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-25 }
---

# Changing a Shipped Skill Playbook

## Goal

A plugin skill, command or agent whose every check can fail, whose evidence is
not written by the agent it judges, and which a fresh agent can follow literally
in a project that is not this one. Applies to anything under `plugins/` that a
consumer runs.

## Steps

1. Anchor every git command in a skill with `git -C "$ROOT"`. From a
   subdirectory an unanchored command inspects one subtree and reports success.
   Stating the hazard in one skill does not carry it to the next: check each.
2. Match the link forms real documents use (`../x.md`, flat sibling links), not
   an idealised path. A pattern that requires `backlog/` in a link misses every
   sibling link and lets the action through.
3. Put the evidence for a claim in an artifact the claimant does not author: a
   reviewer's own command log, a CLI's output — never the executing agent's
   report of what it checked. Constraining how a self-report is worded does not
   make it verifiable.
4. Ask a reviewer to break the thing, not to check it: "construct output that
   looks compliant while verifying nothing".
5. Drive every write a skill prescribes through `pdocs` (`new`, `set`,
   `promote`, `archive`), never a hand-written path or `git mv`.
6. Walk the changed skill with a fresh agent in a generated project, following
   it literally, before landing it. Reading it finds what is incoherent; only
   running it finds what is wrong.
7. Rebuild `dist/` twice after formatting the sources; the second build must
   change nothing.
8. If a second implementer works in parallel, give them their own worktree: the
   `dist/` mirror couples everyone's commits.

## Verification

- [ ] `grep -n 'git ' SKILL.md | grep -v -- '-C'` finds no unanchored git
      command that inspects the tree.
- [ ] Each claim the skill's output makes quotes a command log or CLI output.
- [ ] The walk's transcript exists (a session, or the review's log) and ran
      every `pdocs` command the skill names.
- [ ] `./scripts/build-skills-dist.sh && ./scripts/build-skills-dist.sh && git status --short dist/`
      shows only the intended files, the same after both builds.
