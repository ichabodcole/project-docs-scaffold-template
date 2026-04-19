---
name: project-cli-toolkit
description: >
  Scaffold a project-specific command-line tool that serves both humans and
  agents from the same binary — with TTY-aware output (pretty text for
  terminals, structured JSON for pipes), a machine-readable command manifest for
  discovery, and a scope-grouped help view. Use when the user asks to "add a
  project CLI", "build a loom-style tool", "create an agent-friendly CLI",
  "scaffold a project orchestration CLI", "make a CLI that works for humans and
  agents", or wants a unified entry point for project utilities (dev tasks, API
  calls, code generation) that their AI agents can also drive.
---

# Project CLI Toolkit Recipe

## Purpose

Projects accumulate one-off scripts: DB migrations, log tailing, dev dumps, auth
bootstrap, feedback submission, code generators. A project-specific CLI unifies
them behind a single discoverable entry point (`myproj <group> <command>`) that
both humans and agents can drive.

This recipe captures the pieces that make such a CLI pleasant for humans (pretty
help, ANSI accent, short arg parsing) and reliable for agents (structured JSON
output, machine-readable manifest, stable exit codes, no surprise TTY behavior
when piped). Citty provides the command framework; the glue around it — the
output envelope, the manifest walker, the scope-grouped help, the project-root
discovery — is what this recipe is really about.

## Naming Convention in This Recipe

Throughout the recipe, the following tokens are placeholders — substitute your
project's identifier when implementing:

| Placeholder | Substitute with                           | Example          |
| ----------- | ----------------------------------------- | ---------------- |
| `myproj`    | lowercase CLI binary / package / dir name | `loom`, `acme`   |
| `MyProj`    | PascalCase prefix for TypeScript types    | `Loom`, `Acme`   |
| `MYPROJ_`   | SCREAMING_SNAKE env var prefix            | `LOOM_`, `ACME_` |

All three flavors appear together — keep them consistent when you rename.

## When to Use

- You have a growing collection of `scripts/*.ts` or `scripts/*.sh` files and
  want a single unified entry point
- Your AI agents need to drive project tooling (list records, trigger jobs,
  submit feedback) and you want them to get structured JSON, not scraped
  terminal output
- You want the same tool to be pleasant to use interactively and scriptable in
  CI / automation
- You want a CLI that can discover its own command tree (for help systems, shell
  completion, agent introspection) rather than hardcoding docs
- The project has multiple orthogonal concerns (workspace-local, API-bound,
  build-related) that benefit from being grouped visually

## Technology Stack

| Layer              | Technology                             | Notes                                                         |
| ------------------ | -------------------------------------- | ------------------------------------------------------------- |
| Runtime            | Bun 1.x (or Node 20+ via `tsx`)        | Bun executes `.ts` natively. See adapting section for Node.   |
| Command framework  | [citty](https://github.com/unjs/citty) | Hierarchical commands, typed args, Resolvable sub-commands.   |
| Output formatting  | Hand-rolled envelope + ANSI helpers    | No third-party output lib — intentional, keeps control tight. |
| Language           | TypeScript 5.x                         | Strict mode assumed.                                          |
| Linter / formatter | Biome or ESLint+Prettier               | Orthogonal. Biome is our preference.                          |

## Architecture Overview

```
  ┌───────────────────────────────────────────────────────────────┐
  │                         myproj (cli.ts)                       │
  │   • declares top-level groups + root flags                    │
  │   • intercepts `help --json` → manifest                       │
  │   • intercepts bare / `help` → grouped help renderer          │
  │   • otherwise delegates to citty's runMain                    │
  └────────────────────────────────┬──────────────────────────────┘
                                   │
         ┌─────────────────────────┼──────────────────────────┐
         │                         │                          │
   ┌─────▼──────┐            ┌─────▼──────┐            ┌──────▼──────┐
   │  log       │            │  api-proxy │            │  ...group N │
   │  (workspace)│           │  (app)     │            │             │
   └─────┬──────┘            └─────┬──────┘            └─────────────┘
         │                         │
   ┌─────▼────────────┐      ┌─────▼────────────┐
   │  log-list.ts      │     │  api-user-list.ts │
   │  log-level.ts     │     │  api-user-get.ts  │
   └───────────────────┘     └───────────────────┘
                                   │
                             ┌─────▼─────────────────┐
                             │  api-client layer     │
                             │  apiFetch / error map │
                             └───────────────────────┘

  Every command:   resolveFormat(--format) → try/catch → emit/emitError
  Every emit:      text mode → renderText() ;   json mode → envelope
```

### Core Concepts

**Dual-audience output.** Every command writes through a tiny `emit()` helper
that takes a `renderText` closure and decides at runtime whether to call it
(text mode) or wrap the raw data in a `{ ok, data, meta }` envelope (JSON mode).
Format resolution is: explicit `--format` flag wins, else
`process. stdout.isTTY` is used to auto-detect — terminals get text, pipes get
JSON. Agents do not need to pass any flag; their lack of a TTY is the signal.

**Machine-readable manifest.** `myproj help --json` walks the citty tree and
emits a JSON description of every group, command, flag, default, alias, and
scope. Agents use this to discover the command surface without scraping
ANSI-colored help output. The manifest walker is the single source of truth; the
human help renderer is built on top of it.

**Scope tagging.** Top-level groups declare a `scope` on their meta —
`workspace` (filesystem / local config, no API needed) or `app` (requires the
API to be running + auth token). Scope is inherited by subcommands. The grouped
help renderer uses this to print two clearly-labeled sections. Agents use it
(via the manifest) to decide whether to spin up the API before running a
command.

**Stable envelope shape.** Success:
`{ ok: true, data, meta: { command, durationMs } }`. Error:
`{ ok: false, error: string, meta: { command } }`. Agents parse one shape
regardless of command. `meta.command` is the space-joined path (e.g.
`"library list"`) so logs/telemetry stay grouped.

**Trade-offs accepted.**

- We do not use a higher-level CLI framework (Commander, oclif, clipanion)
  because citty's tree walk is simple enough to introspect for the manifest
  without plugins, and the envelope pattern is easier to own than adapt.
- We do not ship a separate agent-only binary. One entry point, two output
  modes. Keeps discovery and docs centralized.
- We do not vendor a colors library. A ~20-line `styles.ts` with NO_COLOR and
  `isTTY` checks is enough and has zero dependency surface.

## File Layout

```
scripts/myproj/
  cli.ts              — entry point: defines root command + intercepts
  define.ts           — thin wrapper around citty's defineCommand that
                        enforces `scope` on top-level groups
  agent-layer.ts      — emit, emitError, resolveFormat, OutputEnvelope
  manifest.ts         — walks the citty tree, emits JSON manifest
  help-renderer.ts    — human help output grouped by scope
  paths.ts            — project-root discovery, well-known paths
  styles.ts           — NO_COLOR / isTTY-aware ANSI wrappers
  tsconfig.json       — scoped tsconfig for the CLI sources
  commands/
    <group>.ts        — top-level group declaration (uses defineMyProjCommand)
    <group>-<sub>.ts  — individual subcommand (uses plain defineCommand)
    ...
  # optional layers
  api-client.ts       — fetch wrapper with bearer auth + error mapping
  env-file.ts         — parse/write .env files (for auth-bootstrap pattern)
  identity.ts         — ASCII banner (visual polish)
```

Every subcommand is its own file. Group files only import and wire them — no
command logic lives in group files. This keeps commands easy to find, easy to
test, and keeps `cli.ts` readable.

## Implementation Process

### Phase 1: Foundation

Install citty and set up the entry point.

```bash
bun add -d citty        # or: pnpm add -D citty
```

**1a. Wire the script in `package.json`:**

```json
{
  "scripts": {
    "myproj": "bun scripts/myproj/cli.ts"
  }
}
```

For pnpm/Node, see the "Adapting to pnpm / Node" section — you'll use `tsx` or
an ESM loader instead of `bun`.

**1b. Create `scripts/myproj/tsconfig.json`** scoped to the CLI sources:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["**/*.ts"]
}
```

`allowImportingTsExtensions` is required because we import sibling files with
explicit `.ts` extensions (runtime-friendly across Bun and tsx). Include this in
your typecheck script: `tsc --noEmit -p scripts/myproj/tsconfig.json`.

**1c. Project-root finder (`paths.ts`):**

The CLI needs to locate the project root so it can resolve paths like
`apps/api/.env` regardless of where the user invoked it from. Do NOT use
`import.meta.dir` — that points at the CLI source, which moves if you compile to
a binary later. Instead, walk up from `process.cwd()` looking for a
`package.json` with a known name:

```typescript
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function findProjectRoot(expectedName: string): string {
  let dir = process.cwd();
  while (true) {
    const pkgPath = resolve(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          name?: string;
        };
        if (pkg.name === expectedName) return dir;
      } catch {
        // malformed package.json — keep walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `could not find project root (no package.json named "${expectedName}")`
      );
    }
    dir = parent;
  }
}

export const PROJECT_ROOT = findProjectRoot("myproj");
export const API_ENV_FILE = resolve(PROJECT_ROOT, "apps/api/.env");
// ... other well-known paths
```

This mirrors how git / cargo / deno find their roots. Works identically when run
via `bun run` in the repo and when compiled to a binary on a user's `$PATH`.

**1d. Scope-enforcing define wrapper (`define.ts`):**

```typescript
import { type ArgsDef, type CommandDef, defineCommand } from "citty";

export type MyProjCommandScope = "workspace" | "app";

interface MyProjMeta {
  name: string;
  description: string;
  scope: MyProjCommandScope; // required on top-level groups
  version?: string;
  deprecated?: boolean;
}

export function defineMyProjCommand<T extends ArgsDef = ArgsDef>(
  input: CommandDef<T> & { meta: MyProjMeta }
): CommandDef<T> {
  return defineCommand(input);
}
```

Why: citty's `defineCommand` takes freeform meta. By defining a typed wrapper
for top-level groups, we get a compile-time guarantee that every group declares
its scope. Subcommands use plain `defineCommand` and inherit scope through the
manifest walker.

**Validate:** `bun run myproj` should print citty's default help (we'll replace
it in Phase 4).

### Phase 2: Agent Output Layer

Create `scripts/myproj/agent-layer.ts`:

```typescript
export type OutputFormat = "text" | "json";

export interface OutputMeta {
  command: string;
  durationMs?: number;
}

/** High-resolution millisecond timer. Bun: use Bun.nanoseconds(). */
function nowMillis(): number {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

export interface OutputEnvelope<T = unknown> {
  ok: true;
  data: T;
  meta?: OutputMeta;
}

export interface ErrorEnvelope {
  ok: false;
  error: string;
  meta?: OutputMeta;
}

/** Priority: explicit --format > TTY detection (terminal=text, pipe=json). */
export function resolveFormat(flagFormat?: string): OutputFormat {
  if (flagFormat === "json" || flagFormat === "text") return flagFormat;
  return process.stdout.isTTY ? "text" : "json";
}

export function emit<T>(options: {
  format: OutputFormat;
  command: string;
  data: T;
  renderText: (data: T) => string;
  startedAt?: number;
}): void {
  if (options.format === "text") {
    const text = options.renderText(options.data);
    if (text) process.stdout.write(`${text}\n`);
    return;
  }
  const envelope: OutputEnvelope<T> = {
    ok: true,
    data: options.data,
    meta: {
      command: options.command,
      ...(options.startedAt !== undefined && {
        durationMs: nowMillis() - options.startedAt,
      }),
    },
  };
  process.stdout.write(`${JSON.stringify(envelope)}\n`);
}

export function emitError(options: {
  format: OutputFormat;
  command: string;
  error: string;
}): void {
  if (options.format === "text") {
    process.stderr.write(`Error: ${options.error}\n`);
    return;
  }
  const envelope: ErrorEnvelope = {
    ok: false,
    error: options.error,
    meta: { command: options.command },
  };
  process.stderr.write(`${JSON.stringify(envelope)}\n`);
}
```

**Design notes:**

- `emit` always writes a single trailing newline. Agents parsing NDJSON rely on
  one envelope per line.
- Errors go to stderr; successes go to stdout. Mix-free streams let callers
  redirect independently (`myproj foo 2>/dev/null`).
- `startedAt` is optional so trivial commands don't need timing. Use
  `Bun.nanoseconds()` on Bun, or `process.hrtime.bigint()` on Node — wrap
  whichever you pick behind a `nowMillis()` helper so commands don't care.
- Text mode is plain ASCII by default. Commands opt into ANSI via `styles.ts`
  helpers, which self-disable when stdout isn't a TTY.

**Validate:** write a throwaway command that calls `emit({...})` and verify
`bun run myproj <cmd>` prints text, while `bun run myproj <cmd> | cat` prints
JSON — no flag change required.

### Phase 3: First Commands

A typical subcommand file (`commands/log-level.ts`):

```typescript
import { defineCommand } from "citty";
import { emit, emitError, resolveFormat } from "../agent-layer.ts";

interface LogLevelData {
  current: string;
  source: "env" | "default";
}

export const logLevelCommand = defineCommand({
  meta: {
    name: "level",
    description: "Show the current log level for the API",
  },
  args: {
    format: { type: "string", valueHint: "text|json" },
  },
  async run(ctx) {
    const format = resolveFormat(ctx.args.format);

    try {
      const current = process.env.LOG_LEVEL ?? "info";
      const data: LogLevelData = {
        current,
        source: process.env.LOG_LEVEL ? "env" : "default",
      };
      emit<LogLevelData>({
        format,
        command: "log level",
        data,
        renderText: (d) => `Log level: ${d.current} (${d.source})`,
      });
    } catch (err) {
      emitError({
        format,
        command: "log level",
        error: err instanceof Error ? err.message : "unknown error",
      });
      process.exit(1);
    }
  },
});
```

And the group file (`commands/log.ts`):

```typescript
import { defineMyProjCommand } from "../define.ts";
import { logLevelCommand } from "./log-level.ts";
import { logListCommand } from "./log-list.ts";

export const logCommand = defineMyProjCommand({
  meta: {
    name: "log",
    description: "Inspect and manage API logs",
    scope: "workspace",
  },
  subCommands: {
    level: logLevelCommand,
    list: logListCommand,
  },
});
```

**Conventions to follow across every command:**

- One subcommand per file, named `<group>-<sub>.ts`.
- Always declare a local `args.format` flag (type `"string"`, valueHint
  `"text|json"`) even though the root also declares `--format`. Citty does not
  inherit root flags into subcommands; declaring it locally makes it visible in
  per-command help.
- Every `run(ctx)` has this shape:
  1. `const format = resolveFormat(ctx.args.format)`
  2. `try { ... } catch (err) { emitError(...); process.exit(1) }`
  3. Build a typed `data` object
  4. `emit({ format, command, data, renderText })`
- `command` in the emit call is the space-joined path (`"log level"`), not just
  the leaf name. This makes log aggregation trivial.
- `renderText` is a pure function of `data`. This is important: both modes
  consume the _same_ data object, so a broken text renderer cannot silently
  break JSON mode. The test surface is narrower.

**Validate:** run a handful of commands in both TTY and piped modes. JSON should
always be single-line `{ ok, data, meta }`. Errors should exit non-zero.

### Phase 4: Grouped Help + Manifest

**4a. Manifest walker (`manifest.ts`):**

Citty exposes command meta and sub-commands as `Resolvable<T>` — either a direct
value, a Promise, or a `() => T | Promise<T>` thunk. You have to resolve each
node as you walk it. The manifest walker recursively traverses the tree, pulling
`meta`, `args`, and `subCommands` from each node:

```typescript
import type { ArgsDef } from "citty";

type Resolvable<T> = T | Promise<T> | (() => T | Promise<T>);

/** Narrow shape of a citty command we can introspect. Citty's own types
 *  aren't exported in a usable form, so we cast at the entry point. */
interface CittyCommand {
  meta?: Resolvable<{
    name?: string;
    description?: string;
    version?: string;
    scope?: MyProjCommandScope;
    deprecated?: boolean;
  }>;
  args?: ArgsDef;
  subCommands?: Record<string, Resolvable<CittyCommand>>;
}

export interface ManifestFlag {
  name: string;
  type?: string;
  description?: string;
  default?: unknown;
  alias?: string | string[];
  valueHint?: string;
}

export interface ManifestCommand {
  name: string;
  description?: string;
  path: string[];
  scope?: MyProjCommandScope;
  flags: ManifestFlag[];
  subcommands: ManifestCommand[];
}

export interface Manifest {
  name?: string;
  version?: string;
  commands: ManifestCommand[];
}

async function resolveValue<T>(
  v: Resolvable<T> | undefined
): Promise<T | undefined> {
  if (v === undefined) return undefined;
  // NOTE: this treats any callable as a thunk. Safe for citty usage where T
  // is always a plain object (meta / CittyCommand), never a function.
  if (typeof v === "function") return (v as () => T | Promise<T>)();
  return v;
}

async function buildCommandEntry(
  name: string,
  cmd: CittyCommand,
  path: string[],
  inheritedScope?: MyProjCommandScope
): Promise<ManifestCommand> {
  const meta = (await resolveValue(cmd.meta)) ?? {};
  const scope = meta.scope ?? inheritedScope; // inherit from parent

  const flags = Object.entries(cmd.args ?? {}).map(([name, a]) => ({
    name,
    type: a.type,
    description: a.description,
    default: a.default,
    alias: a.alias,
    valueHint: a.valueHint,
  }));

  const subcommands: ManifestCommand[] = [];
  for (const [subName, subCmd] of Object.entries(cmd.subCommands ?? {})) {
    const resolved = await resolveValue(subCmd);
    if (resolved) {
      subcommands.push(
        await buildCommandEntry(subName, resolved, [...path, subName], scope)
      );
    }
  }

  return {
    name,
    description: meta.description,
    path,
    scope,
    flags,
    subcommands,
  };
}

export async function buildManifest(root: unknown): Promise<Manifest> {
  const rootCmd = root as CittyCommand;
  const meta = (await resolveValue(rootCmd.meta)) ?? {};
  const commands: ManifestCommand[] = [];
  for (const [name, sub] of Object.entries(rootCmd.subCommands ?? {})) {
    const resolved = await resolveValue(sub);
    if (resolved)
      commands.push(await buildCommandEntry(name, resolved, [name]));
  }
  return { name: meta.name, version: meta.version, commands };
}
```

**Important:** citty does not export usable types for arbitrary command defs, so
the walker defines its own narrow `CittyCommand` shape and casts at the
boundary. This is a tolerated boundary cast — the runtime shape is stable. Don't
spread the cast inward.

**4b. Grouped help renderer (`help-renderer.ts`):**

Builds on the manifest. Filters by optional `--scope`, groups entries, applies
ANSI from `styles.ts`:

```typescript
export async function renderGroupedHelp(
  root: unknown,
  options: { scope?: MyProjCommandScope } = {}
): Promise<string> {
  const manifest = await buildManifest(root);
  const lines: string[] = [];
  // lines.push(renderBanner())   — optional, see visual polish layer

  for (const scope of ["workspace", "app"] as const) {
    if (options.scope && options.scope !== scope) continue;
    const group = manifest.commands.filter((c) => c.scope === scope);
    if (group.length === 0) continue;

    lines.push(bold(scope.toUpperCase()));
    for (const entry of group) {
      lines.push(`  ${accent(entry.name)}  ${dim(entry.description ?? "")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
```

**4c. Wire interceptors in `cli.ts`:**

```typescript
#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import { logCommand } from "./commands/log.ts";
import { buildManifest } from "./manifest.ts";
import { renderGroupedHelp } from "./help-renderer.ts";
import type { MyProjCommandScope } from "./define.ts";

const main = defineCommand({
  meta: { name: "myproj", version: "0.1.0", description: "Project CLI" },
  args: {
    format: {
      type: "string",
      description: "text|json",
      valueHint: "text|json",
    },
  },
  subCommands: {
    log: logCommand,
    // ...more groups
  },
});

// Intercept before citty's normal dispatch so we can emit the manifest.
if (process.argv[2] === "help" && process.argv.includes("--json")) {
  const manifest = await buildManifest(main);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  process.exit(0);
}

// Intercept bare invocation and `help` (without --json) for grouped help.
if (process.argv.length === 2 || process.argv[2] === "help") {
  const i = process.argv.indexOf("--scope");
  const scope =
    i >= 0
      ? (process.argv[i + 1] as MyProjCommandScope | undefined)
      : undefined;
  process.stdout.write(`${await renderGroupedHelp(main, { scope })}\n`);
  process.exit(0);
}

runMain(main);
```

**Validate:**

- `myproj help --json` returns valid JSON with nested command tree and scopes.
- `myproj` and `myproj help` print grouped human output.
- `myproj help --scope app` filters.
- `myproj <group> <cmd> --help` still shows citty's per-command help.

## Optional Layers

The core scaffold (phases 1–4) is enough for a read-only "local utilities" CLI.
Most projects eventually want more. These layers plug into the scaffold without
modifying it.

### Layer A: API Client

For commands in the `app` scope that talk to your local/dev API. Put everything
in `scripts/myproj/api-client.ts`:

```typescript
interface MyProjEnv {
  MYPROJ_API_URL: string;
  MYPROJ_API_BEARER: string | null;
}

/** Minimal .env parser — returns { KEY: value } for uncommented lines. */
function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function buildQuery(
  q?: Record<string, string | number | boolean | undefined>
): string {
  if (!q) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function getEnv(): MyProjEnv {
  const parsed = parseEnvFile(API_ENV_FILE);
  return {
    MYPROJ_API_URL: parsed.MYPROJ_API_URL ?? "http://localhost:3041",
    MYPROJ_API_BEARER: parsed.MYPROJ_API_BEARER || null,
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface FetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  token?: string; // empty string explicitly forces "no bearer"
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const env = getEnv();
  const token =
    options.token !== undefined ? options.token : env.MYPROJ_API_BEARER;
  const url = `${env.MYPROJ_API_URL}${path}${buildQuery(options.query)}`;

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!response.ok)
    throw new ApiError(response.status, `HTTP ${response.status}`, parsed);
  return parsed as T;
}

/** Convert ApiError → human-readable message for emitError. */
export function mapApiError(err: unknown, action = "request"): string {
  if (err instanceof ApiError) {
    if (err.status === 401)
      return "authentication failed. Run `myproj auth login` to refresh.";
    if (err.status === 403)
      return "forbidden: the authenticated user lacks access.";
    if (err.status === 404) {
      const body = err.body as { error?: string } | null;
      return body?.error ?? "not found";
    }
    const body = err.body as { error?: string } | null;
    return body?.error ?? `${action} failed: HTTP ${err.status}`;
  }
  if (err instanceof Error) return err.message;
  return `${action} failed`;
}
```

**Key points:**

- `token: ""` (empty string) is an explicit "send no bearer" signal, distinct
  from `undefined` (use the env default). This matters for auth endpoints that
  reject stale tokens — see the auth-bootstrap layer.
- `apiFetch` always tries JSON-parsing the body, falling back to text, so
  `ApiError.body` is the most useful shape available to the caller.
- `mapApiError` centralizes status-code interpretation. Commands call it from
  their catch block: `emitError({ error: mapApiError(err, "list") })`.

**Short-ID prefix resolution** (agent ergonomics). Agents that read a list and
want to act on a specific item shouldn't have to handle full UUIDs in every
command. Add a resolver:

```typescript
export async function resolveIdPrefix(
  prefix: string,
  listPath: string
): Promise<string> {
  if (prefix.length >= 36) return prefix; // already a full UUID
  const result = await apiFetch<{ items: Array<{ id: string }> }>(listPath, {
    query: { idPrefix: prefix, limit: 2 },
  });
  if (result.items.length === 0)
    throw new Error(`no match for prefix "${prefix}"`);
  if (result.items.length > 1)
    throw new Error(`prefix "${prefix}" is ambiguous`);
  return result.items[0]!.id;
}
```

This requires your API to accept an `idPrefix` query. The ergonomic win is
large: agents can do `myproj foo get a3f2` instead of passing full UUIDs through
multi-step flows.

### Layer B: Auth Bootstrap

Let agents (and humans) run a one-shot login that persists a bearer token into
the API's `.env` file. The token then flows into every other command through
`getEnv()`.

**`env-file.ts`** — parse/write a `.env` file while preserving comments:

```typescript
export function readEnvFile(path: string): string[] {
  try { return readFileSync(path, "utf8").split(/\r?\n/); }
  catch { return []; }
}

export function enableKey(
  lines: string[],
  key: string,
  value: string,
): { lines: string[]; changed: boolean } {
  // Replace an existing line matching ^#?KEY= or append if not found.
  // Preserves surrounding comments and ordering.
  ...
}

export function writeEnvFile(path: string, lines: string[]): void {
  writeFileSync(path, lines.join("\n"), "utf8");
}
```

**`commands/auth-login.ts`:**

```typescript
export const loginCommand = defineCommand({
  meta: { name: "login", description: "Sign in and persist bearer token" },
  args: {
    email: { type: "string" },
    password: { type: "string" },
    reload: { type: "boolean", default: true },
    format: { type: "string", valueHint: "text|json" },
  },
  async run(ctx) {
    const format = resolveFormat(ctx.args.format);
    // 1. Pull email/password from args or env
    // 2. POST /api/auth/sign-in/email with token:"" (no stale bearer)
    // 3. Write result.token into MYPROJ_API_BEARER via env-file helpers
    // 4. Optionally "reload" the API by touching its entry file (see below)
    // 5. emit({ data: { email, userId, reloaded }, renderText: ... })
  },
});
```

**Touch-to-reload trick.** Most dev servers (Bun's `bun --hot`, Node `--watch`,
Vite, tsx) restart when their entry file changes. After writing a new token,
`touch`-ing the API's entrypoint forces a clean restart that picks up the new
`.env`:

```typescript
import { utimesSync } from "node:fs";
export function touchApiEntrypoint(): { touched: boolean; path: string } {
  const path = resolve(PROJECT_ROOT, "apps/api/src/index.ts");
  try {
    utimesSync(path, new Date(), new Date());
    return { touched: true, path };
  } catch {
    return { touched: false, path };
  }
}
```

Agents really appreciate this: one command to go from zero-auth to a live
authenticated session.

**Security note.** This pattern writes plaintext tokens into a gitignored `.env`
file. It's appropriate for dev, not production. For production CLI auth, prefer
an OS keychain (`keytar` on Node, or `libsecret`/`security` via shell) and gate
the bootstrap behind an interactive confirm.

### Layer C: Visual Polish (Identity + ANSI)

**`styles.ts`** — minimal, dependency-free, TTY-aware:

```typescript
export const COLOR_ENABLED = !process.env.NO_COLOR && process.stdout.isTTY;

function wrap(open: string, close: string) {
  return COLOR_ENABLED
    ? (s: string) => `${open}${s}${close}`
    : (s: string) => s;
}

export const accent = wrap("\x1b[38;5;214m", "\x1b[39m"); // amber (pick a brand color)
export const dim = wrap("\x1b[2m", "\x1b[22m");
export const bold = wrap("\x1b[1m", "\x1b[22m");
export const muted = wrap("\x1b[38;5;245m", "\x1b[39m");
```

Read state at module load: if your tool ever detects TTY later (after some
setup), the check will be stale. Doing it at import time matches user
expectation — they know whether they're piping when they invoke the command.

**`identity.ts`** — optional ASCII wordmark banner rendered at the top of
`myproj help` and `myproj --version`. Not load-bearing; helps the CLI feel like
a first-class artifact rather than a grab-bag of scripts. Keep it short (5 rows
max) and respect `COLOR_ENABLED`. Rendered only in text mode; JSON mode never
includes it.

## Adapting to pnpm / Node

The recipe targets Bun because Bun can execute `.ts` files directly with no
setup. If you're on Node + pnpm, these substitutions apply:

**Runtime:** install [`tsx`](https://github.com/esbuild-kit/tsx):

```bash
pnpm add -D tsx
```

Change `package.json` script:

```json
{
  "scripts": {
    "myproj": "tsx scripts/myproj/cli.ts"
  }
}
```

And the shebang at the top of `cli.ts`:

```typescript
#!/usr/bin/env -S tsx
```

Or, if you want to allow `./scripts/myproj/cli.ts` to be invoked directly
(`chmod +x`), use the Node loader form:

```typescript
#!/usr/bin/env -S node --import=tsx/esm
```

**TypeScript:** `allowImportingTsExtensions` requires
`"moduleResolution": "bundler"` or `"noEmit": true`. Both are fine for a no-emit
CLI.

**Timing helper:** the `nowMillis()` shown in `agent-layer.ts` uses
`process.hrtime.bigint()` which works on both Bun and Node, so no change is
needed. If you prefer Bun-native timing, substitute
`Bun.nanoseconds() / 1_000_000n` inside the helper.

**`fetch`:** Node 20+ has global `fetch`. If you must support Node 18, import
[`undici`](https://github.com/nodejs/undici) and use its fetch.

**Testing:** Vitest runs identically on Bun and Node. Mock `global.fetch` for
commands that hit the API, or run a tiny HTTP test server.

**Monorepo / workspace tools:** `pnpm myproj <group> <cmd>` works the same as
`bun run myproj` — pnpm picks up the script from the root `package.json`. For
Turborepo / Nx, no special setup is needed; the CLI doesn't need to be a
workspace package.

**Compiling to a standalone binary:** Bun supports `bun build --compile`. For
Node, use [`pkg`](https://github.com/vercel/pkg) or
[`nexe`](https://github.com/nexe/nexe). The project-root finder pattern (Phase
1c) keeps working because it derives paths from `process.cwd()`, not from where
the binary lives.

## Integration Points

**With your existing test suite.** Commands that call `apiFetch` are testable by
mocking `global.fetch`. The `emit`/`emitError` helpers write to `process.stdout`
/ `process.stderr`; tests capture those streams or spy on them. Because
`renderText` is a pure function of `data`, you can unit-test the text output
without exercising the whole command.

**With your API.** If you use the `apiFetch` layer, the CLI becomes an excellent
smoke-test harness: most manual verification steps collapse into
`myproj <group> <cmd>` calls that return structured JSON for diffing.

**With agents.** Pair this CLI with an MCP server for the heavy-read /
heavy-write operations, and keep the CLI for orchestration, bootstrapping, and
workspace-local operations. Agents introspect via `myproj help --json` once per
session, then invoke commands by piping stdin/stdout.

**With CI.** The envelope's `ok` flag + non-zero exit on error gives CI scripts
a consistent integration pattern. `meta.durationMs` is useful for tracking slow
commands over time.

## Gotchas & Important Notes

**Do not rely on flag inheritance in citty.** Every subcommand must declare its
own `args.format` even though the root already does. Citty parses args per-node;
root flags are not propagated down. If you forget, `--format json` passed to a
subcommand is silently ignored.

**Do not emit on stderr in JSON mode's success path.** It contaminates captured
streams. Warnings that belong in the output envelope go in `data` (add an
optional `warnings: string[]` field). Only true errors go to stderr.

**Always set `command` in `meta`** to the space-joined path (`"library list"`).
It's the identifier for log aggregation, and agents use it to distinguish
responses in pipelines.

**The manifest walker must cast at the boundary.** Citty doesn't export command
def types in a form you can use. Define your own narrow `CittyCommand` shape,
cast once at the entry point of the walker, and keep the cast from spreading.
This is pragmatic — citty's runtime shape is stable, just undertyped.

**Scope is inherited, but only via the walker.** A subcommand's scope is not
introspectable from its `meta` alone — the walker threads `inheritedScope` down
through recursion. If you need the effective scope elsewhere (e.g. to gate a
command on whether the API is running), thread it through a shared helper, don't
recompute.

**TTY check is cached.** `COLOR_ENABLED` and `resolveFormat` read
`process.stdout.isTTY` once at import. If you're running the CLI inside a
subshell that rewrites the streams mid-execution, the cached value will be
wrong. In practice this only matters for unusual test harnesses — if you hit it,
expose a `setFormatOverride()` escape hatch instead of moving the detection
inline.

**Shebang + execute bit.** Making `cli.ts` directly executable
(`chmod +x && ./scripts/myproj/cli.ts foo`) is great for local hacking but adds
platform friction on Windows. The `package.json` script form is the primary
interface; the direct-execution form is a bonus.

**Help interception runs before citty.** The bare / `help` / `help --json`
checks execute before `runMain(main)`, which means they bypass citty's own help
generator entirely. If you add root-level flags that affect all commands (e.g.
`--verbose`), you must parse them in the interceptors too, or accept that they
don't apply to help.

**Don't embed secrets in the manifest.** `buildManifest` walks every flag
default verbatim. If you ever default a flag to a secret value, it leaks to
`help --json`. Default to `null`, read the secret from env inside `run(ctx)`.

**Short-ID resolution depends on API support.** The `resolveIdPrefix` helper
assumes the API accepts an `idPrefix` filter on list endpoints. If it doesn't,
either add that filter (cheap: `WHERE id::text LIKE $1 || '%'`) or fall back to
client-side filtering on a full list (acceptable up to a few thousand rows).
