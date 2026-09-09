---
type: session
title: What we were shipping that we did not mean to — 2026-09-08
description:
  Two acc follow-ups turned into an audit of what the scaffold hands a consumer;
  the recurring defect was a claim nothing had ever exercised.
tags: [cli, tooling, scaffold, verification]
status: stable
generated: { by: claude-opus-5, at: 2026-09-08 }
---

# What we were shipping that we did not mean to — 2026-09-08

Eight commits on `chore/pdocs-acc-conformance`, starting from two follow-ups
left open by the acc run and ending somewhere else entirely: an audit of what a
generated project actually receives.

## The CLI work

**A7 was already passing, and the order mattered.** `--format` refused an
out-of-set value in both spellings, but only one named the value — and only by
accident: the attached spelling `--format=xyzzy` was rejected whole as an
unknown flag whose token happened to contain the sentinel. Adding `--flag=value`
support first would have made both refusals name only `--format`, which the rule
reports as **unverified**. So the root's refusal was fixed first.

That refusal was worth fixing on its own. It said
`unknown flag \`--root\``and then listed`--root`among the valid flags — a sentence arguing with itself while withholding the one fact that would fix the invocation. A flag the CLI has is not unknown, it is misplaced, and what belongs in that position is a command.`1
of 2 named the value`became`2 of 2`, and diffing the before and after reports,
that line was the only substantive change.

**`--flag=value` cost more than the parser.** Three scanners read argv before
the parser proper runs. A spelling the parser understood and `repoRootFrom` did
not would have meant `pdocs check --root=/elsewhere` parsing and then linting
the wrong tree — so `readFlag` is one reader for both spellings, and `asks`
deliberately does not use it: `--help` takes no value, so `--help=x` is a
malformed token rather than a second spelling.

**EPIPE was the one defect of the opposite kind.** `pdocs schema | true` exited
1 with `kind: internal` — the code this CLI documents as a fault inside itself —
because `writeTo`'s `writeSync` throws where `console.log` swallows. One
pipeline reported an internal fault on two verbs and nothing on the other five.

## The audit

Then the question that changed the session: does the payload's `package.json`
make sense to ship? It did not, and neither did four other things. That argument
is [its own memory](../../../memories/2026-09-08-shipped-ownership-boundary.md);
what belongs here is what removing them cost and what it exposed.

| Removed                         | Why                                                   |
| ------------------------------- | ----------------------------------------------------- |
| `acc.config.json`               | Config for a tool the payload does not install        |
| `package.json`                  | A wrapper over three of the CLI's eight verbs         |
| `tsconfig.json`                 | Typechecking delivered code the consumer does not own |
| Six `*.test.ts` + `test-env.ts` | The CLI's own suite, running inside the consumer's    |
| `.gitignore`                    | `node_modules/` for dependencies that no longer exist |

Two of those had **shipped instructions that were wrong**, and neither had ever
been run against a project that was not this one: `"test": "bun test"` was in
the paste-into-your-package.json block, and "add `scripts/**/*.ts` to your
tsconfig `include`" raises 74 errors on the production files alone under a
conventional config.

The removals cascaded further than the payload. `docs/README.md`,
`docs/SCHEMA.md` and `docs/cycles/README.md` are **mirrored**, so their text has
to be true on both sides; and `check.ts` printed `Work the list with \`npm run
docs:report\`` in its own adopting-mode output — the tool advertising its own
wrapper.

## Two gaps the removals exposed

**Nobody was checking the version markers.** release-please owns six files
besides `package.json`. The 6.3.0 release touched two of them; the other four
were seeded by hand afterwards and have never been through a release. They read
`6.3.0` because someone typed it. `check:version` now derives the list from
`release-please-config.json` itself and fails on a stale path, a missing
`x-release-please-version` comment, or a marker that disagrees.

**A collision in the install reported success.** `_move` returned `False` into
nobody, so an existing `scripts/pdocs/` produced a warning, then
`✅ Documentation structure installed`, having moved `docs/` and no CLI — a
frontmatter contract with nothing that checks it. The recovery line named the
wrong directory, and `rmtree` deleted the payload four lines later. `docs/`
already handled its own collision correctly; the two `_move` calls never got the
same treatment.

Worth recording: **`scripts/` itself was never the collision.** A project with
`scripts/deploy.ts` gets ours added alongside — `makedirs(..., exist_ok=True)`
merges. It takes a directory named exactly `scripts/pdocs/`, which is why this
surfaced as a hook bug rather than a report from anyone.

## The shape of it

Five of the six defects were **a claim nothing had exercised.** A7 passed by
accident. release-please "owned" four markers it had never written. The hook's
collision path had never been run. Two printed instructions had never been
followed in a foreign repository. None of them would have been found by reading
the code, and all of them fell out of asking what a consumer actually receives
and then generating one to look.

## Deferred

Unchanged from the last session and still open: `find` does not validate
`--type` / `--lifecycle` / `--status`; the design resolution's
`pdocs new session --project X --title Y` example exits 2 because the row
requires a positional; templates still carry `USAGE: Copy this file…` comments.
The vendored acc skill at `.claude/skills/acc/` remains committed and
prettier-ignored.

**New, and found by writing this note.** Creating the memory beside it left
`docs/index.md` failing `format:check`. The catalog writer wraps its line at 80
columns with the em dash trailing the link; where the link alone is long enough,
Prettier moves the `—` down to the continuation instead:

```diff
-- [What you ship says who owns it](./memories/2026-09-08-shipped-ownership-boundary.md) —
-  Development-process artefacts leak into a payload one convenience at a time,
+- [What you ship says who owns it](./memories/2026-09-08-shipped-ownership-boundary.md)
+  — Development-process artefacts leak into a payload one convenience at a time,
```

That is the writer/checker contract breaking in the same direction as
`pdocs new project ".."` did: a document the tool created, that the tool's own
gate then rejects. Narrow — it needs a long slug and a long title — but a fresh
`pdocs new` followed by `npm run check` should never go red.

---

**Related Documents:**

- [Proposal](../proposal.md)
- [Landing session](2026-09-06-pdocs-cli-landing.md)
- [What you ship says who owns it](../../../memories/2026-09-08-shipped-ownership-boundary.md)
