#!/usr/bin/env bun
// `pdocs` — the documentation gate and the graph behind it.
//
//   bun scripts/pdocs/cli.ts check     lint the tree; 9 if it is dirty
//   bun scripts/pdocs/cli.ts report    what is missing, grouped by field
//   bun scripts/pdocs/cli.ts graph     the knowledge graph, both tiers
//   bun scripts/pdocs/cli.ts find      query by type, lifecycle, status, tag, date
//   bun scripts/pdocs/cli.ts backlinks what cites a document
//   bun scripts/pdocs/cli.ts orphans   library pages the catalog cannot reach
//   bun scripts/pdocs/cli.ts new       create a document of a declared type
//
// Hand-rolled dispatch, and ZERO DEPENDENCIES on purpose. The recipe for this
// shape of CLI prescribes `citty`; this declines it. The lint's whole value is
// that the payload can be dropped into a repository and just run — a framework
// drags an install into every scaffolded project, and the surface here is a
// table, three interceptors and an argument loop. `project-antfarm` hand-rolls
// the same job in 408 lines.
//
// The output contract — format resolution, the envelope, the exit codes — is
// `envelope.ts`. This file is only about getting to the right command with the
// right arguments, and about turning a thrown `CliError` into a status.

import { existsSync, readFileSync, statSync, writeSync } from "node:fs";
import { join, resolve } from "node:path";
import { isatty } from "node:tty";
import { type Ctx, context } from "./lint/rules.ts";
import {
  CliError,
  ExitCode,
  type Format,
  NotFoundError,
  UsageError,
  printDiagnostic,
  printEnvelope,
  resolveFormat,
} from "./envelope.ts";
import { backlinks } from "./commands/backlinks.ts";
import { check } from "./commands/check.ts";
import { find } from "./commands/find.ts";
import { graph } from "./commands/graph.ts";
import { newCommand } from "./commands/new.ts";
import { orphans } from "./commands/orphans.ts";
import { report } from "./commands/report.ts";

/** One flag, as help and as the parser's rule for it. A `metavar` means the
 *  flag takes the next token as its value. */
export interface Option {
  flag: string;
  metavar?: string;
  summary: string;
}

/** What a command is handed. The tree is already resolved and already proven to
 *  exist — a command never re-derives a root, because a root derived in the
 *  wrong place is silent: the walk finds nothing and the lint reports clean. */
export interface Invocation {
  ctx: Ctx;
  format: Format;
  /** Parsed command-specific flags, keyed by flag with the leading `--`. */
  flags: Record<string, string | true>;
  /** Positional arguments, in order. */
  positionals: string[];
}

export interface Command {
  name: string;
  summary: string;
  usage: string;
  /** Beyond the globals every command accepts. */
  options: Option[];
  /** Names of the positionals this command takes, for help and for arity. */
  positionals?: string[];
  run(invocation: Invocation): number;
}

const COMMANDS: Command[] = [
  check,
  report,
  graph,
  find,
  backlinks,
  orphans,
  newCommand,
];

const GLOBAL_OPTIONS: Option[] = [
  {
    flag: "--root",
    metavar: "<path>",
    summary: "The repository to work on. Defaults to this CLI's own.",
  },
  {
    flag: "--format",
    metavar: "<text|json>",
    summary: "Output format. Defaults to text on a TTY, json otherwise.",
  },
  { flag: "--json", summary: "Shorthand for `--format json`." },
  { flag: "--help", summary: "Help for the command, or for pdocs. Also -h." },
  { flag: "--version", summary: "Print the version and exit. Also -V." },
];

const EXIT_CODE_TABLE: Array<[number, string]> = [
  [0, "clean — or dirty under `lint.adopting: true`"],
  [1, "an unexpected fault inside pdocs itself"],
  [2, "bad invocation: unknown command, unknown flag, missing value"],
  [5, "no docs root, or no .project-docs.json"],
  [6, "the document already exists"],
  [9, "outcome: it ran fine, and the documents are dirty"],
];

// ---------------------------------------------------------------------------------------
// The tree
// ---------------------------------------------------------------------------------------

/**
 * The tree to work on. Without `--root` that is this file's own repository, as
 * the lint always did; `--root <path>` points it at another one, resolved
 * against the working directory.
 *
 * A `--root` that cannot be used exits 2 rather than falling back to the
 * default, because the failure mode of falling back is a `clean` reported for a
 * repository nobody actually checked.
 */
export function repoRootFrom(argv: string[]): string {
  const i = argv.indexOf("--root");
  if (i === -1) return resolve(import.meta.dir, "..", "..");

  const value = argv[i + 1];
  if (value === undefined || value.startsWith("-"))
    throw new UsageError("--root needs a path — `--root /path/to/repo`.");

  const root = resolve(process.cwd(), value);
  if (!existsSync(root) || !statSync(root).isDirectory())
    throw new UsageError(`--root is not a directory: ${root}`);

  return root;
}

/**
 * Read the tree's configuration, and refuse to work on something that is not
 * one.
 *
 * `loadConfig` deliberately falls back to defaults when `.project-docs.json` is
 * absent, so that a project mid-adoption can run the lint before it has written
 * one. That is right for a library function and wrong for a CLI: an agent that
 * points `pdocs` at the wrong directory would otherwise get a confident answer
 * about a `docs/` folder that was never there. Missing config or missing docs
 * root is `NotFound`, not a silent default.
 */
export function treeContext(root: string): Ctx {
  if (!existsSync(join(root, ".project-docs.json")))
    throw new NotFoundError(
      `no .project-docs.json in ${root} — not a project-docs tree.`
    );

  const ctx = context(root);
  if (!existsSync(ctx.docsRoot) || !statSync(ctx.docsRoot).isDirectory())
    throw new NotFoundError(
      `no docs root at ${ctx.docsRoot} — \`docsRoot\` in .project-docs.json points nowhere.`
    );

  return ctx;
}

// ---------------------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------------------

/**
 * Everything after the command name.
 *
 * An unknown flag is an error and NAMES THE TOKEN. A CLI that shrugs at
 * `--formt json` and renders text has silently done something other than what
 * was asked, and the caller most likely to make that typo is the one least able
 * to notice — an agent reading stdout, not a person reading a terminal.
 */
export function parseArgs(
  command: Command,
  argv: string[]
): { flags: Record<string, string | true>; positionals: string[] } {
  const takesValue = new Map<string, boolean>();
  for (const o of [...GLOBAL_OPTIONS, ...command.options])
    takesValue.set(o.flag, o.metavar !== undefined);

  const flags: Record<string, string | true> = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string;

    if (!token.startsWith("-")) {
      positionals.push(token);
      continue;
    }

    if (!takesValue.has(token))
      throw new UsageError(
        `unknown flag \`${token}\` for \`pdocs ${command.name}\`. Try \`pdocs ${command.name} --help\`.`
      );

    if (!takesValue.get(token)) {
      flags[token] = true;
      continue;
    }

    const value = argv[i + 1];
    if (value === undefined || value.startsWith("-"))
      throw new UsageError(`${token} needs a value.`);
    flags[token] = value;
    i++;
  }

  const expected = command.positionals ?? [];
  if (positionals.length > expected.length)
    throw new UsageError(
      `unexpected argument \`${positionals[expected.length]}\` — \`${command.usage}\`.`
    );

  return { flags, positionals };
}

// ---------------------------------------------------------------------------------------
// Help and version
// ---------------------------------------------------------------------------------------

/**
 * The version this CLI ships as.
 *
 * Embedded rather than read from a neighbouring `package.json`, because the
 * CLI does not reliably have one. `hooks/post_gen_project.py` deliberately
 * does NOT move `package.json` when installing into an existing project — the
 * host has its own — so reading the nearest one answers with the HOST
 * project's version, which is not this tool's version and is worse than
 * useless for a caller trying to tell two `pdocs` apart.
 *
 * release-please rewrites the literal below via the marker comment, the same
 * way anthill's CLI carries its own.
 */
const VERSION = "6.3.0"; // x-release-please-version

export function version(): string {
  return VERSION;
}

function optionLines(options: Option[]): string[] {
  const left = options.map((o) =>
    o.metavar ? `${o.flag} ${o.metavar}` : o.flag
  );
  const width = Math.max(...left.map((s) => s.length));
  return options.map(
    (o, i) => `  ${(left[i] as string).padEnd(width)}  ${o.summary}`
  );
}

export function helpText(command?: Command): string {
  if (command) {
    const lines = [
      `pdocs ${command.name} — ${command.summary}`,
      "",
      "Usage",
      `  ${command.usage}`,
      "",
      "Options",
      ...optionLines([...command.options, ...GLOBAL_OPTIONS]),
    ];
    return `${lines.join("\n")}\n`;
  }

  const width = Math.max(...COMMANDS.map((c) => c.name.length));
  return `${[
    "pdocs — the documentation gate, and the graph behind it.",
    "",
    "Usage",
    "  pdocs <command> [options]",
    "",
    "Commands",
    ...COMMANDS.map((c) => `  ${c.name.padEnd(width)}  ${c.summary}`),
    `  ${"help".padEnd(width)}  This help. \`pdocs help --json\` for the manifest.`,
    "",
    "Options",
    ...optionLines(GLOBAL_OPTIONS),
    "",
    "Exit codes",
    ...EXIT_CODE_TABLE.map(([code, meaning]) => `  ${code}  ${meaning}`),
  ].join("\n")}\n`;
}

/** The machine manifest: the same information `helpText` renders, as data. */
export function helpManifest(): Record<string, unknown> {
  return {
    name: "pdocs",
    version: version(),
    summary: "the documentation gate, and the graph behind it",
    commands: COMMANDS.map((c) => ({
      name: c.name,
      summary: c.summary,
      usage: c.usage,
      options: [...c.options, ...GLOBAL_OPTIONS].map((o) => ({
        flag: o.flag,
        metavar: o.metavar ?? null,
        summary: o.summary,
      })),
      positionals: c.positionals ?? [],
    })),
    exitCodes: Object.fromEntries(EXIT_CODE_TABLE),
  };
}

/**
 * Help is prose unless asked for data.
 *
 * The only place the TTY heuristic does NOT apply, and deliberately: the
 * grammar is `pdocs help [--json]`, so a piped `pdocs --help` — a human running
 * it through `less` — stays readable. Every command that produces an ANSWER
 * follows the heuristic; help produces documentation.
 */
function helpFormat(argv: string[]): Format {
  return resolveFormat(argv, true);
}

// ---------------------------------------------------------------------------------------
// Writing to the terminal that may not be one
// ---------------------------------------------------------------------------------------

/**
 * Is stdout a terminal — asked WITHOUT materializing a stream over fd 1.
 *
 * `process.stdout.isTTY` is the obvious spelling and it silently truncates this
 * CLI's output. Reading any property of Node's stdout object materializes Bun's
 * `WriteStream` over the descriptor, and from that moment `console.log` routes
 * through it — an ASYNCHRONOUS writer whose queued tail is dropped when the
 * process ends. Left alone, `console.log` writes straight to the descriptor and
 * everything arrives.
 *
 * The loss is invisible until the output is big and stdout is a pipe, because a
 * pipe stops accepting writes once its 64 KiB buffer is full and a terminal
 * does not. Measured: `graph --format json` over this repository is 77757 bytes
 * redirected to a file, and was exactly 65536 through a pipe — cut mid-string,
 * `JSON.parse` refusing it, exit status 0.
 *
 * That is the DECLARED PRIMARY PATH, not an edge case. `resolveFormat` renders
 * JSON precisely BECAUSE stdout is not a terminal, so the caller this CLI is
 * built for — an agent capturing stdout — was the only one ever handed a
 * truncated answer, and was handed it silently.
 *
 * `node:tty`'s `isatty(1)` answers the same question against the raw descriptor
 * and materializes nothing. THE RULE THIS FILE KEEPS: pdocs never reaches for
 * Node's stdout or stderr objects. Prose goes out through `writeTo` below;
 * everything else goes through `console.log` / `console.error`. `cli.test.ts`'s
 * "stdout survives a real pipe" fails if this is undone.
 */
export function stdoutIsTerminal(): boolean {
  return isatty(1);
}

/** Write to a descriptor directly. Used for the help text, which is the one
 *  output that is not a line-oriented render and must not gain a newline. */
function writeTo(fd: 1 | 2, text: string): void {
  writeSync(fd, text);
}

// ---------------------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------------------

function run(argv: string[]): number {
  // Interceptors, before dispatch: these three answer without a tree, and
  // `--help` has to work on a command whose arguments are otherwise wrong.
  if (argv.includes("--version") || argv.includes("-V")) {
    console.log(version());
    return ExitCode.Success;
  }

  const first = argv[0];

  if (first === undefined) {
    // A bare invocation is a usage error, not a request for help — but the help
    // is what the caller needs to see, so it goes to stderr and stdout stays
    // empty for whatever was going to parse it.
    writeTo(2, helpText());
    return ExitCode.Usage;
  }

  if (first === "help" || argv.includes("--help") || argv.includes("-h")) {
    const named = COMMANDS.find(
      (c) => c.name === (first === "help" ? argv[1] : first)
    );
    if (helpFormat(argv) === "json") {
      printEnvelope("help", helpManifest());
      return ExitCode.Success;
    }
    writeTo(1, helpText(named));
    return ExitCode.Success;
  }

  if (first.startsWith("-"))
    throw new UsageError(
      `unknown flag \`${first}\` — pdocs takes a command first. Try \`pdocs help\`.`
    );

  const command = COMMANDS.find((c) => c.name === first);
  if (!command)
    throw new UsageError(
      `unknown command \`${first}\`. Try \`pdocs help\` for the list.`
    );

  const rest = argv.slice(1);
  // `--root` is validated FIRST so its own diagnostic wins over the parser's
  // generic "needs a value". Pointing the gate at the wrong tree is the failure
  // this CLI most needs to be legible about.
  const root = repoRootFrom(rest);
  const { flags, positionals } = parseArgs(command, rest);
  const format = resolveFormat(rest, stdoutIsTerminal());
  const ctx = treeContext(root);

  return command.run({ ctx, format, flags, positionals });
}

function main(): void {
  const argv = process.argv.slice(2);
  // Resolved before anything can throw, so a diagnostic is never rendered in
  // the wrong format because the failure happened during format resolution.
  let format: Format = "text";
  try {
    format = resolveFormat(argv, stdoutIsTerminal());
  } catch {
    /* a bad --format is itself reported below, in text */
  }

  // `process.exitCode`, never `process.exit()`. Exiting explicitly abandons
  // whatever output has not left the process yet; setting the status and
  // returning lets the runtime finish the writes and exit with it. Nothing here
  // holds the event loop open — every command is synchronous filesystem work —
  // so returning costs nothing. See `stdoutIsTerminal` for the failure this is
  // half of, and `cli.test.ts`'s "stdout survives a real pipe" for the guard.
  try {
    process.exitCode = run(argv);
  } catch (e) {
    const command = argv[0] && !argv[0].startsWith("-") ? argv[0] : "pdocs";
    const error =
      e instanceof CliError
        ? e
        : new CliError(
            e instanceof Error ? e.message : String(e),
            "internal",
            ExitCode.Internal
          );
    printDiagnostic(command, error, format);
    process.exitCode = error.exitCode;
  }
}

if (import.meta.main) main();
