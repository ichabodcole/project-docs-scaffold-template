# CLI reference — `pdocs`

`pdocs` is the documentation gate and the graph behind it. It lints the tree,
answers questions about it, and creates documents of a declared type. Skills
call it instead of doing file surgery: the CLI owns folder, filename, template,
frontmatter and catalog wiring, so a skill only has to decide **when** and
**what to call it**.

> Self-contained. Everything below was run against the `pdocs` that ships with
> scaffold 9.0.0 and its output transcribed. You need nothing outside this file
> to drive the tool. Anything not verified by running it is marked _unverified_
> — there is nothing so marked today.

## Invoking it

```bash
bun scripts/pdocs/cli.ts <command> [args] [flags]
```

Project-relative, from the repository root — **there is no `pdocs` binary on
`PATH`**. It is invoked this way on purpose: it must run in CI and inside a
scaffolded project with no plugin installed, so it is never reached through
`${CLAUDE_PLUGIN_ROOT}`. Zero runtime dependencies; Bun is the only requirement.

If `scripts/pdocs/cli.ts` is not there, the project predates the CLI. Fall back
to writing the file by hand, or run `/project-docs:update-project-docs`.

Two globals every command takes:

| Flag                    | Effect                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| `--root <path>`         | Work on another repository. Defaults to the CLI's own.                 |
| `--format <text\|json>` | Override format resolution. `--json` is shorthand for `--format json`. |

Either spelling of a value works — `--format json` and `--format=json` are the
same request. A flag that takes no value refuses one: `--json=false` exits 2
rather than being read as `--json`, which is the opposite of what it says.

```bash
bun scripts/pdocs/cli.ts help          # command list and the exit-code table
bun scripts/pdocs/cli.ts help --json   # the same thing as a machine manifest
```

The manifest carries every verb, every flag and every metavar, and is the
authoritative source if this page and the tool ever disagree.

```bash
bun scripts/pdocs/cli.ts schema        # the same surface as an acc declaration
```

`schema` emits `agent-cli-conformance` declaration format v0 — `formatVersion`,
`provenance: "emitted"`, `selfDescription`, and one `commands[]` row per path
including the root as `path: []`. **It is the one command whose stdout is not
the envelope**, because `acc check --declaration` reads that document at the top
level and refuses unknown keys; wrapping it would produce a file the only
consumer cannot read. Both format modes emit the same bytes, and it needs no
docs tree — it describes the tool, not the tree:

```bash
bunx acc check scripts/pdocs/cli.ts --declaration <(bun scripts/pdocs/cli.ts schema)
```

Every field is walked out of the same tables the parser and the dispatcher use,
so the flags a verb accepts, the flags its rejection enumerates and the flags it
declares are one list rather than three that agree today.

## Format resolution

1. `--format text` or `--format json` wins over everything.
2. Otherwise `--json` means JSON.
3. Otherwise: **TTY → text, pipe → JSON.**

An agent capturing stdout therefore gets JSON by default and does not need a
flag. A person at a terminal gets prose.

`help` is the one exception: it resolves as if stdout were a terminal, so it
stays text THROUGH A PIPE — a human sending `pdocs --help` into `less` wants
documentation, not data. Rule 1 still wins over that: `--json` and
`--format json` both return the manifest.

Everything else follows the heuristic, **including the paths that are not
commands**. `--version` is the bare string at a terminal and
`{ "ok": true, "data": { "name": "pdocs", "version": "…" }, … }` through a pipe,
so a caller never has to regex a version out of prose; a bare `pdocs` prints
help to stderr at a terminal and the error envelope through a pipe. Machine mode
holds on every outcome, not only the ones a command reached.

**Nothing wraps this CLI, and that is deliberate.** The scaffold ships no
`package.json` — `pdocs` has no dependencies, so there is nothing to install,
and a shorthand covering three of its verbs teaches a partial interface. Invoke
it directly, and use `help` to find the rest.

**If a project adds its own shortcuts, they must pin `--format`.** Measured
under a real pty, `npm run` inherits the parent's stdio, so stdout **is** a TTY
and the heuristic resolves to text; in CI there is no TTY and the same script
resolves to JSON. Pinning is what makes one command produce one output in both
places — and that a shorthand has to defeat the CLI's own resolution to be
useful is most of the reason the scaffold does not ship one. The same applies to
any hook that wraps `pdocs`.

## The envelope

Every command's JSON output is the same envelope, pretty-printed to stdout.
There are exactly **two** top-level shapes and no third — a discriminated union
over `ok` is the whole algebra a consumer has to handle:

```json
{ "ok": true, "data": { ... }, "meta": { "command": "check" } }
```

**`ok` reports whether the INVOCATION succeeded, not whether the answer was
positive.** `pdocs check` on a dirty tree is `ok: true` with `data.clean: false`
and exits 9 — it did its job perfectly and the news is bad. Conflating the two
is the mistake the field exists to prevent.

A failure carries `error` instead of `data`, and goes to **stderr**, leaving
stdout empty and parseable:

```json
{
  "ok": false,
  "error": {
    "kind": "usage",
    "exit_code": 2,
    "retryable": false,
    "message": "--format: unknown value `yaml` — expected one of: text, json.",
    "choices": ["text", "json"],
    "details": { "token": "yaml" }
  },
  "meta": { "command": "check" }
}
```

`kind` is the stable identifier, paired 1:1 with the exit code: `internal`,
`usage`, `not_found`, `conflict`. `exit_code` is the status the process exits
with, so the envelope and the code can never disagree. `retryable` says whether
running the SAME invocation again could succeed — always `false` here, because
every failure `pdocs` raises is deterministic over a tree that did not move.

`hint` (prose remediation), `choices` and `details` are optional and **omitted**
rather than nulled when they do not apply.

**`details.token` is the token you got wrong**, verbatim — the flag, the verb,
the value, the type. It is a field rather than only a substring of `message`,
because prose gets rewritten and a field is a contract.

**`choices` is the closed set you got wrong.** Every rejection with a closed set
of valid alternatives hands that set over — the commands for an unknown command,
the flags a command takes for an unknown flag, `text`/`json` for `--format`, the
creatable types for `pdocs new`, and the lifecycle, status and variant
vocabularies underneath them. Each list is derived from the same registry the
parser enforces, so an error can never advertise a surface the tool does not
have. An agent that reads `choices` never has to go back and read help.

In text format a diagnostic is `pdocs: <message>` on stderr, with the hint on a
second indented line where there is one; the same enumeration appears in the
prose.

The shape is `agent-cli-conformance`'s canonical error envelope — a page in THAT
repository's wiki, not a file this scaffold ships or that your project has.
Everything needed to read one is above. Machine mode holds on **every** outcome
— including a parser error and a bare invocation, both of which answer with this
envelope when stdout is not a terminal.

That is a claim a repository can make checkable, by declaring
`{ "defaultOutput": "json" }` in an `acc.config.json` at its root. The scaffold
template's own repository does and gates on it. A generated project does not
ship one: acc is not a dependency of this CLI or of anything it scaffolds, and
adding the file is one line the day you point acc at `pdocs`.

## Exit codes

**The band is the contract.**

- **1–8 — the invocation failed.** Nothing was answered. Retrying unchanged
  gives the same result.
- **9 — the invocation succeeded and the subject is dirty.** The data on stdout
  is complete and correct. An agent that treats 9 as a crash has misread the
  tool.
- **124+ — reserved**, never allocated by `pdocs`, so a delegating CLI can pass
  a child's status through.

| Code | Meaning                                                                                      |
| ---- | -------------------------------------------------------------------------------------------- |
| 0    | Clean — or dirty under `lint.adopting: true`                                                 |
| 1    | An unexpected fault inside `pdocs` itself                                                    |
| 2    | Bad invocation: unknown command, unknown flag, missing value, bad `--root`, uncreatable type |
| 5    | Not found: no docs root, no `.project-docs.json`, no such document, no `--from` file         |
| 6    | Conflict: the document already exists, or the tree refuses it                                |
| 9    | Outcome: it ran fine, and the documents are dirty                                            |

Codes 3, 4, 7 and 8 are deliberately unallocated — they belong to
`agent-cli-conformance`'s bands (auth, permission, rate limit, confirmation) and
are left there rather than reused.

## The thirteen verbs

Eleven are dispatched through the command table and need a documentation tree.
Two — `schema` and `help` — are answered before that table is consulted, take no
tree, and describe the tool rather than the tree. All thirteen reject a flag
they do not take, with exit 2 and the valid set in `choices`.

**References.** The work verbs (`view`, `set`, `promote`, `archive`, and
`new --owner`) take a reference to a feature, an item or a cycle:
`feature/<slug>`, `item/<slug>`, `cycle/<slug>`, a full item id, or a unique id
prefix of 8 or more characters. An ambiguous prefix exits 2 and lists the
candidates. Ids are **printed** 12 characters long in text output, because ids
filed close together share their first characters; JSON always carries the full
id, and frontmatter always stores it.

### `check` — the gate

```bash
bun scripts/pdocs/cli.ts check [--root <path>] [--format text|json] [--against <ref>]
```

`data`: `clean` (bool), `adopting` (bool), `total` (int), `problems[]` — each
`{ tier, message }` where `tier` is `library` or `workbench` — `outside` (int)
and `templates[]`.

`outside` is how many tracked Markdown files **outside the docs root** were read
— `README.md`, `AGENTS.md`, anything `git ls-files '*.md'` lists — for links and
anchors only. Their problems arrive in `problems[]` as `workbench`, with a path
relative to the repository root, so a message naming a bare `DEV_KICKOFF.md`
means the file at the root. The text rendering says the same under the workbench
summary: _N tracked page(s) outside `docs/`, links only_. A `lint.exclude` glob
takes a file out of that corpus. `templates[]` is every file under the docs root
the lint skipped as a template.

Under the docs root a link target that is **not portable** — an absolute path, a
sibling checkout, a relative path that climbs above the repository and back in —
is `MISSING FILE` even when it exists on disk; the message ends
`(not portable: …)`. The repository is git's top level, so in a monorepo a link
above `.project-docs.json` and inside the git repository passes.

Exits **0** clean, **9** dirty. Under `lint.adopting: true` in
`.project-docs.json` a dirty tree still exits 0 and `adopting` says why.

**`--against <ref>`** names the git ref a work item may not silently leave
(default `HEAD`): an item present there and gone from the tree reports
`ITEM DELETED` unless it was `dropped`. A move, a promotion or an archive keeps
the `id` and is not a deletion. In CI, where the working tree equals `HEAD`,
pass the base branch.

### `report` — what is missing, by field

```bash
bun scripts/pdocs/cli.ts report [--root <path>] [--format text|json]
```

`data`: `lines[]` — the rendered report, line for line what `--format text`
prints — and `documents[]`, one `{ path, tier, missing }` per document with
anything missing:

```json
{
  "path": "docs/items/fix-hook.md",
  "tier": "workbench",
  "missing": ["description", "lifecycle"]
}
```

`path` is relative to the repository root, `tier` is `library` or `workbench`,
and `missing` names the required fields the document lacks — or the single word
`frontmatter` when it has no block at all. Every document is listed, not the ten
per folder the text shows, in the order the text first names it; a file the
report calls a slide deck is in neither. To split a backfill across workers,
shard `documents[]` — do not parse `lines[]` or `check`'s messages.

**Exits 0 however long the report is** — it is a summary, not a gate, so a
backlog of missing fields is never a failure. The INVOCATION can still fail like
any other: a `--root` that is not a directory exits 2, and a directory that is
not a project-docs tree exits 5.

### `graph` — the knowledge graph

```bash
bun scripts/pdocs/cli.ts graph [--root <path>] [--format text|json]
```

`data`: `pages` (int), `byTier` (`{ library, workbench }`), `byType`
(`{ <type>: count }`), `tags` (`{ <tag>: [path, …] }`), `hubs[]`
(`{ path, title, linksIn }`), `nodes[]`
(`{ path, tier, type, title, tags[], related[], linksOut[], linksIn[] }`).

**`linksIn` is two different types and its name does not say so.** On `hubs[]`
it is a COUNT (`8`); on `nodes[]` it is the ARRAY of citing paths
(`["docs/index.md"]`). Use `nodes[].linksIn.length` when you want a number —
comparing the array itself against an integer fails silently.

### `find` — query the tree

```bash
bun scripts/pdocs/cli.ts find [--type <t>] [--lifecycle <l>] [--status <s>] \
                              [--tag <t>] [--since <YYYY-MM-DD>] \
                              [--kind <k>] [--parent feature/<slug>] \
                              [--cycle <slug>] [--scope <name>] [--id <prefix>]
```

Filters are ANDed and all are optional, so a bare `find` lists everything. The
last five filter work: `--kind` (`task`, `bug`, `chore`, `research`),
`--parent`, `--cycle`, `--scope`, and `--id`, which matches an item whose id
starts with the prefix.

`data`: `matches[]` — each
`{ path, tier, type, title, description, status, lifecycle, tags[], date }`,
plus `id`, `kind`, `parent`, `cycle` and `scope` on a feature or item — and
`count`. `id` is the full id: this is where a skill reads one to write into a
commit trailer.

**An empty result exits 0.** "Nothing matches" is an answer. Read `count`, never
the status, to tell an empty corpus from a failure. A `--since` that is not a
date is a usage error rather than a silent no-match.

### `backlinks` — what cites a document

```bash
bun scripts/pdocs/cli.ts backlinks <target>
```

`<target>` is a repo-relative path (`docs/playbooks/foo-playbook.md`), a
`type/slug` key (`playbook/foo-playbook`), or — **legacy**, for a tree still on
the pre-9.0.0 `projects/` layout, and removed when this repository's migration
retires that layout — `project/<name>`. An unknown target exits **5**.

**Name a feature or an item by its entry file's path** —
`docs/features/oauth-upgrade/feature.md`, `docs/items/fix-hook.md` or
`docs/items/fix-hook/item.md`. `type/slug` is a library-tier scheme, and every
feature folder holds a `feature.md`, so `feature/feature` names none of them in
particular.

`data`: `target` (`{ path, type, key, title }`), `related[]`, `links[]` — each
`{ path, title }` — and `count`. **The two edge kinds are kept apart**:
`related` is the frontmatter field, `links` is body links. A `--from` wiring
made by `pdocs new` shows up under `links`.

### `orphans` — library pages the catalog cannot reach

```bash
bun scripts/pdocs/cli.ts orphans
```

`data`: `tier` (always `library`), `catalog` (path to `index.md`), `orphans[]`,
`count`. The workbench is not catalogued and is not searched.

### `new` — create a document

See below.

### `view` — derived views of the work

```bash
bun scripts/pdocs/cli.ts view <backlog|board|ready|feature|cycle|scope|unreleased|released> [<arg>] \
                              [--features] [--since <YYYY-MM-DD>]
```

Every view is computed from frontmatter; none is a file anyone writes.

| View                 | What it lists                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `backlog`            | Items in the unstarted group (`triage`, `backlog`, `ready`), by priority (urgent first, none last), then age   |
| `board`              | Items grouped by state group (unstarted, started, completed, cancelled); `--features` adds features. Live only |
| `ready`              | `ready` items whose every `blocked_by` item is `done` — what can start now                                     |
| `feature <slug>`     | The feature and the items whose `parent` names it                                                              |
| `cycle <slug>`       | The items whose `cycle` names it, and `closable`: at least one item, and every one `done` or `dropped`         |
| `scope <name>`       | Features and items in that scope                                                                               |
| `unreleased`         | `done` features and items with no `released_in`; `--since` limits it by `generated.at`                         |
| `released <version>` | Features and items with that `released_in`                                                                     |

An unknown view exits 2 and lists the views. Output is deterministic.

### `set` — change a feature's, an item's or a cycle's fields

```bash
bun scripts/pdocs/cli.ts set <ref> [--lifecycle <l>] [--cycle <slug>] [--<field> <value> …] \
                             [--unset <key,key>]
```

Rewrites only the keys named, leaving comments and key order alone. **It refuses
any change the lint would reject** — a state outside the type's vocabulary, a
`parent` that is not a feature, a `blocked_by` that does not resolve, a second
`active` cycle — with exit 2 and the valid set. `--blocked-by` and `--parent`
take references and write full ids. `--unset` removes keys, but not one the lint
requires. `--released-in` is accepted unchecked.

`data`: `path`, and `changes[]` — each `{ key, before, after }`.

**`set` does not check who is calling.** Moving an item out of `triage` is the
user's decision, taken at a triage step they have seen (the `triage-items`
skill); that rule lives in the skills, not in the CLI. It changes features,
items and cycles only — edit a plan's `lifecycle` line directly.

### `promote` — turn a single-file item into a folder

```bash
bun scripts/pdocs/cli.ts promote <item-ref>
```

Moves `items/<slug>.md` to `items/<slug>/item.md` and rewrites every link to and
from it. `new <type> --owner item/<slug>` does this for you when an item gains
its first owned document. An item that is already a folder is a no-op, exit 0.

`data`: `from`, `to`, `moved`, `rewritten[]` (the files whose links changed),
`links` (the count).

### `archive` — move a finished entity into `_archive/`

```bash
bun scripts/pdocs/cli.ts archive <feature-or-item-ref>
```

Moves a feature to `features/_archive/<slug>/`, or an item (file or folder) to
`items/_archive/`, and rewrites every link to and from the moved files in every
document under the docs root and every tracked Markdown file outside it. **It
refuses an entity that is not `done` or `dropped`** (exit 2, naming its state)
and a cycle. Ids are untouched, so `blocked_by` and `from:` keep resolving.
Archiving something already archived is a no-op, exit 0. It is the only way into
`_archive/`; the lint reports anything there that is not terminal.

`data`: `from`, `to`, `moved`, `rewritten[]`, `links`.

### `schema` — this CLI's own surface

```bash
bun scripts/pdocs/cli.ts schema
```

An acc declaration v0 document on stdout, not the envelope. See
[Invoking it](#invoking-it).

### `help` — the verb list, or one verb's

```bash
bun scripts/pdocs/cli.ts help [<verb>] [--json]
```

Prose on stdout, or the machine manifest under `--json`. Takes no tree.

## `pdocs new`

```bash
bun scripts/pdocs/cli.ts new <type> <name> [flags]
```

The type decides folder, filename, template and which flags apply. `new` never
overwrites: an existing target exits **6**. Every validation runs **before**
anything is written, so a refusal leaves the tree exactly as it was.

Text output is the repo-relative path on stdout, plus one indented line per
extra file touched:

```
docs/playbooks/rollback-a-release-playbook.md
  + catalog line in docs/index.md
```

JSON `data`: `path` (the document), `type` (the resolved registry type),
`created[]` — every file written or modified, document first — `promoted` (the
item's new entry file when `--owner` promoted it, else `null`), and `id` (a new
item's full id, else `null`).

### 14 types are creatable

| Type                | Lives at                | Filename                      |
| ------------------- | ----------------------- | ----------------------------- |
| `architecture`      | `architecture/`         | `<slug>-architecture.md`      |
| `specification`     | `specifications/`       | `NN-<slug>.md`                |
| `interaction`       | `interaction-design/`   | `<slug>-flow.md`              |
| `playbook`          | `playbooks/`            | `<slug>-playbook.md`          |
| `cycle`             | `cycles/`               | `YYYY-MM-<slug>.md`           |
| `feature`           | `features/<slug>/`      | `feature.md`                  |
| `item`              | `items/`                | `<slug>.md`                   |
| `plan`              | the owner's folder      | `plan.md`                     |
| `design-resolution` | the owner's folder      | `design-resolution.md`        |
| `test-plan`         | the owner's folder      | `test-plan.md`                |
| `handoff`           | the owner's folder      | `handoff.md`                  |
| `write-up`          | the owner's folder      | `write-up.md`                 |
| `session`           | the owner's `sessions/` | `YYYY-MM-DD-<slug>.md`        |
| `report`            | the owner's `reports/`  | `YYYY-MM-DD-<slug>-report.md` |

**A feature's positional names its folder.**
`bun scripts/pdocs/cli.ts new feature oauth-upgrade` creates
`docs/features/oauth-upgrade/feature.md` in `backlog`.

**An item** needs `--kind` (`task`, `bug`, `chore`, `research`). It gets a fresh
UUIDv7 `id` and starts in `triage` unless `--lifecycle` says otherwise; the text
output prints the id's first 12 characters under the path.

**An owned document needs `--owner`**: `feature/<slug>` or `item/<slug>` (or an
item id). It lands in that folder — a single-file item is promoted to a folder
first — and the CLI writes a link back to the owner's entry file into its
Related section. `--project` is refused and names `--owner`.

**The five that are not creatable**, and the reason `pdocs` gives when you try
(all exit **2**):

| Type        | Why not                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `manifesto` | the scaffold ships `PROJECT_MANIFESTO.md`; the `project-manifesto` skill fills it in                         |
| `summary`   | `PROJECT-SUMMARY.md` is synthesized from the whole repository by the `project-summary` skill                 |
| `index`     | the scaffold ships `index.md`; entries are added to it, not the file                                         |
| `kickoff`   | its template ships with the `dev-kickoff` plugin skill, outside the docs tree, where `pdocs` cannot reach it |
| `artifact`  | an artifact is freeform by design — it has no filename grammar and no template                               |

**The seven retired types** — `proposal`, `backlog`, `fragment`, `brief`,
`investigation`, `lesson` and `memory` — are still linted where a tree has them,
until the 9.0.0 migration moves it, and are refused by `new` with the
replacement named: a feature, an item, a research item and its write-up, or a
playbook. `new project` is refused the same way.

The refusal is a declared reason from the registry, not a missing-template
accident. Use the named skill instead.

### Filename grammar — you get a name you did not type

`new` **enforces** the date prefix and the suffix its type declares, so the
convention stops being something anyone has to remember:

```bash
bun scripts/pdocs/cli.ts new report "provider survey" --owner item/auth-providers
# → docs/items/auth-providers/reports/2026-09-06-provider-survey-report.md

bun scripts/pdocs/cli.ts new playbook "rollback a release"
# → docs/playbooks/rollback-a-release-playbook.md
```

A name that **already** carries the prefix or suffix is honoured as written, so
`bun scripts/pdocs/cli.ts new cycle 2026-10-tooling` names next month's cycle
rather than this month's. Names are slugified — `"Auth Stuff!! v2"` becomes
`auth-stuff-v2` — and a name with no letters or digits in it is a usage error,
including one made only of dots or dashes (`".."`, `"..."`). A name that would
put the document outside the docs root is refused rather than written.

`NN-` numbering (`specification` only) takes the highest number already in the
folder plus one, zero-padded to two.

### Flags

| Flag                   | Notes                                                                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--title <text>`       | Defaults to the slug, title-cased — which mangles acronyms (`oauth-upgrade` → `Oauth Upgrade`). **Pass it.**                                                                 |
| `--description <text>` | One sentence. Doubles as the catalog hook for a library page.                                                                                                                |
| `--tags <a,b>`         | Comma-separated kebab-case.                                                                                                                                                  |
| `--status <s>`         | OKF status: `draft`, `stable`, `deprecated`. Anything else exits 2.                                                                                                          |
| `--lifecycle <l>`      | Checked against the type's own vocabulary. Passing one to a type that declares none — every library type, plus `report`, `handoff`, `session` and `write-up` — exits 2.      |
| `--by <actor>`         | `generated.by`. Defaults to `pdocs` — pass your own model or name.                                                                                                           |
| `--owner <ref>`        | Required for an owned type: `feature/<slug>` or `item/<slug-or-id>`. A single-file item is promoted first. An owner that does not resolve exits 2, naming what was expected. |
| `--variant <v>`        | Required where a type has more than one template. `specification` is the only one: `overview` or `domain`.                                                                   |
| `--from <path>`        | See below.                                                                                                                                                                   |

Plus the fields a type declares, as kebab-case flags: on an item `--kind`,
`--parent`, `--scope`, `--cycle`, `--blocked-by`, `--source`, `--priority`,
`--assignee`, `--released-in`; on a feature `--scope` and `--released-in`; on a
cycle `--after`, `--appetite`, `--started`, `--closed`. Passing one to a type
that does not declare it exits 2. Every reference is resolved before anything is
written, exactly as the lint resolves it; `--scope` must be declared in
`lint.scopes`.

### `--from` — wiring in the originating document

`--from <path>` appends a link to the source document into the new document's
Related section:

```bash
bun scripts/pdocs/cli.ts new feature oauth-upgrade \
  --from docs/items/oauth-token-expiry/write-up.md
```

writes into `feature.md`'s Related section:

```markdown
- [Oauth Token Expiry](../../items/oauth-token-expiry/write-up.md)
```

**On an item**, `--from` also takes a reference — an item id, `item/<slug>`,
`feature/<slug>`, `cycle/<slug>` — and writes it to the item's `from:` field as
well as linking it. A review writes the session's path here.

The link text is the source's frontmatter `title`, falling back to its filename.
The href is computed relative to the new document. The path is resolved against
the **repository root first, then the docs root**, so both
`docs/items/x/write-up.md` and `items/x/write-up.md` work; neither resolving
exits 5. Templates spell the section five different ways, so `new` matches a
pattern and creates a `## Related Documents` section if the template has none.

The result is a **body link**, so it appears under `links` in `pdocs backlinks`,
not under `related`.

### Library pages also get a catalog line

A library page (`architecture`, `specification`, `interaction`, `playbook`) must
be reachable from `docs/index.md` and its catalog hook must repeat its
`description` verbatim, or the tree is immediately dirty. `new` writes both and
reports both in `created[]`. If `index.md` has no section for the folder, `new`
refuses with exit 5 rather than writing an orphan.

Workbench documents are not catalogued and get no such line.

## Gotchas

- **`pdocs check` does not catch template placeholders.** A document created
  without `--description` keeps the template's
  `description: "[One sentence: …]"`, and without `--tags` keeps its example
  `tags: [area, feature]` — both pass the gate clean, because they are
  syntactically valid. Verified on both tiers. Pass the flags; the lint will not
  save you.
- **Exit 9 is not a failure.** See the bands above.
- **`ok: true` does not mean the answer was yes.** See the envelope.
- **An unknown flag is an error, and `pdocs` names the token.** `--formt json`
  exits 2 rather than silently rendering text — and the rejection hands back the
  flags that command does take, in `error.choices`. Read that instead of
  guessing again.
- **A bare `pdocs` exits 2 with stdout empty.** At a terminal it prints help to
  stderr; through a pipe it prints the error envelope, whose `choices` are the
  commands.
- **A `--root` that is not a directory exits 2 rather than falling back**, so a
  `clean` is never reported for a tree nobody checked. That holds for every
  command that reads the tree — `check`, `report`, `graph`, `find`, `orphans`,
  `view`, and the verbs that write. `schema` is the exception: it reads no tree,
  so it accepts `--root`, ignores it, and exits 0.
- **Flags follow the command, and a misplaced one says so.**
  `pdocs --format json check` exits 2 with
  `` `--format` must follow a command `` and `error.choices` holding the command
  list — the flag is fine, its position is not. If its value is also outside the
  set, the value is what the rejection names, because that is wrong wherever the
  flag sits.
