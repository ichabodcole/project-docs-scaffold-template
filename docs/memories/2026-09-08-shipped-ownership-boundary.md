---
type: memory
title: What you ship says who owns it
description:
  Development-process artefacts leak into a payload one convenience at a time,
  and each one quietly hands the consumer something to maintain.
tags: [scaffold, tooling, design]
status: stable
generated: { by: claude-opus-5, at: 2026-09-08 }
---

# What you ship says who owns it

The scaffold shipped a `package.json` wrapping the CLI in `docs:*` scripts, a
`tsconfig.json`, the CLI's own test suite, an `acc.config.json` for a tool the
payload does not install, and a `.gitignore` for the `node_modules/` the
`package.json` implied. Every one of them arrived as a convenience. Together
they told a consumer that the code we deliver is theirs to configure, typecheck,
test and maintain.

**Nobody decided that.** Each file was added because it was true of THIS
repository, and the payload is where this repository's habits go to become
someone else's problem.

## The tell is an instruction you would not follow yourself

Two of them were not merely presumptuous, they were wrong, and both were printed
as steps for the consumer to carry out:

- `"test": "bun test"` was in the paste-into-your-package.json block. Most
  projects already own that script name.
- "Add `scripts/**/*.ts` to your tsconfig `include`" produces **74 errors** on
  the production files alone under a conventional config — our code imports with
  explicit `.ts` specifiers and assumes `types: ["bun"]`.

Neither had ever been run against a project that was not this one. The question
that finds this class of defect is not "is this useful?" but **"whose file does
this land in, and would I follow this instruction in a repository I did not
write?"**

## A shorthand is a second interface, and it decays

The `docs:*` scripts covered `check`, `graph` and `report` — the three verbs
that existed when the tool was `docs/lint.ts` — and not `find`, `backlinks`,
`orphans`, `new` or `schema`. A wrapper freezes at the moment it is written
while the thing it wraps grows, so it teaches a fraction of the interface and
makes the caller switch vocabularies for the rest.

It also had to **defeat** the tool to work: `npm run` inherits a TTY, so every
script pinned `--format` to override the resolution the CLI exists to get right.
A shorthand that must disable a feature to be useful is evidence against itself.
And nothing the CLI says about itself — `help --json`, `schema`, `choices` on
every rejection — survives the indirection.

## What to do instead

- **Ship the tool and name it.** The replacement for the scripts is one
  paragraph in the consumer's `AGENTS.md` pointing at the CLI and at `help`.
  Agents read the tool; they do not need a wrapper over part of it.
- **Let the consumer wrap it if they want to.** Their `package.json` is theirs.
- **Check what a generation actually produces**, not what the payload contains.
  Both install branches now deliver three things: `docs/`, `scripts/pdocs/`,
  `.project-docs.json`.
- **Keep it to one directory.** The core used to land beside the CLI as a second
  entry in a `scripts/` folder that is the consumer's. The split between core
  and rules is ours; it does not belong in their tree.

---

**Related Documents:**

- [The session this came out of](../projects/project-docs-cli/sessions/2026-09-08-pdocs-consumer-boundary.md)
- [The pdocs CLI proposal](../projects/project-docs-cli/proposal.md)
