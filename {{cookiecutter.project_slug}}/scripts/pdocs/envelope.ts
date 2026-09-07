// The contract `pdocs` has with whatever is calling it: how the output format
// is chosen, what shape machine output takes, and what the exit status means.
//
// Nothing here knows about documents. It is the part of the CLI an agent reads
// once and then relies on for every command, which is why it lives in its own
// file rather than inside `cli.ts` — a contract buried in a dispatcher is a
// contract nobody can find.

/**
 * Exit codes are an API.
 *
 * A caller cannot read prose — it reads the exit status. These values are a
 * published contract: changing one is a breaking change for every script and
 * agent that branches on it. ADD, NEVER RENUMBER.
 *
 * Everything from 124 up is RESERVED and never allocated here, so a delegating
 * CLI can pass a child's exit code through verbatim without collision. 124 is
 * `timeout`'s "time limit reached" and 125 is its (and Docker's) "the wrapper
 * itself failed"; 126, 127 and "greater than 128" are POSIX. A code another
 * convention has already claimed is not ours to allocate, however unassigned it
 * looks from inside this table.
 *
 * Modelled on `src/acc/exit-codes.ts` in `agent-cli-conformance`, which is the
 * catalogue this CLI is trying to be a first-party example of. Only the codes
 * `pdocs` can actually produce are declared — the gaps (`3` auth, `4`
 * permission, `7` rate limit, `8` confirmation) are deliberately left where
 * that catalogue put them rather than reused for something else, so a caller
 * that already knows the bands is never surprised.
 */
export const ExitCode = {
  /** The command did what was asked. */
  Success: 0,
  /** Anything unexpected — a bug, an unhandled shape. The safe default for an
   *  unclassified fault. */
  Internal: 1,
  /** The invocation itself was wrong: bad flags, unknown command, bare
   *  invocation. */
  Usage: 2,
  /** The named thing does not exist: no docs root, no `.project-docs.json`, no
   *  such document. */
  NotFound: 5,
  /** A precondition failed; the request conflicts with current state — the
   *  document `pdocs new` was asked to write is already there. */
  Conflict: 6,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/**
 * OUTCOME codes — deliberately NOT errors.
 *
 * An error means the invocation failed. An outcome means the invocation
 * SUCCEEDED and the answer was negative. `pdocs check` on a dirty tree did its
 * job perfectly; the report is accurate, well-formed data and stays on stdout
 * as `ok: true`. But it must still exit non-zero, because non-zero-ness is what
 * makes a finding visible to a harness that does not parse JSON.
 *
 * The bands: 1-8 = why the INVOCATION failed. 9-123 = what the SUBJECT turned
 * out to be. 124+ = what a CHILD PROCESS did, or what the shell did on our
 * behalf.
 *
 * `agent-cli-conformance` already allocates `9` (`NonConformant`) and `10`
 * (`Stale`) in its own table. `10` is therefore NOT free for a second meaning
 * here: the two CLIs are read by the same agents, and a code that means two
 * things across a family is worse than an unallocated one.
 */
export const Outcome = {
  /** The check ran successfully; the documentation tree has problems. */
  Dirty: 9,
} as const;

export type OutcomeValue = (typeof Outcome)[keyof typeof Outcome];

/** Stable machine identifiers, paired 1:1 with the error codes above. The
 *  `kind` is the contract; the message is presentation. */
export const ErrorKind = {
  Internal: "internal",
  Usage: "usage",
  NotFound: "not_found",
  Conflict: "conflict",
} as const;

export type ErrorKindValue = (typeof ErrorKind)[keyof typeof ErrorKind];

/** A failure with a code and a machine-readable kind attached. Thrown anywhere;
 *  caught once, at the top of `cli.ts`. */
export class CliError extends Error {
  constructor(
    message: string,
    readonly kind: ErrorKindValue,
    readonly exitCode: ExitCodeValue
  ) {
    super(message);
    this.name = "CliError";
  }
}

/** The invocation was malformed. Retrying it unchanged will fail identically. */
export class UsageError extends CliError {
  constructor(message: string) {
    super(message, ErrorKind.Usage, ExitCode.Usage);
    this.name = "UsageError";
  }
}

/** The named thing does not exist. */
export class NotFoundError extends CliError {
  constructor(message: string) {
    super(message, ErrorKind.NotFound, ExitCode.NotFound);
    this.name = "NotFoundError";
  }
}

/**
 * The invocation is well-formed and the tree is in a state that refuses it.
 *
 * Distinct from `UsageError` because retrying is not futile: the caller can
 * change the tree — archive the document that is in the way, close the cycle
 * that is already open — and run exactly the same command again.
 */
export class ConflictError extends CliError {
  constructor(message: string) {
    super(message, ErrorKind.Conflict, ExitCode.Conflict);
    this.name = "ConflictError";
  }
}

export type Format = "text" | "json";

/**
 * Which format to render in.
 *
 * An explicit `--format` wins over everything. Absent that, the pipe decides:
 * a human at a terminal gets prose, and anything reading stdout through a pipe
 * — an agent, a CI step, a `$(...)` — gets JSON, because that is who is on the
 * other end when stdout is not a TTY.
 *
 * The heuristic is NOT sufficient on its own, and `package.json` proves it:
 * measured under a real pty, `npm run` inherits the parent's stdio and stdout
 * IS a TTY, so `npm run docs:graph` would render text unless the script says
 * `--format json`. A resolver that guesses needs a way to be told.
 */
export function resolveFormat(argv: string[], isTTY: boolean): Format {
  const i = argv.indexOf("--format");
  if (i !== -1) {
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("-"))
      throw new UsageError(
        "--format needs a value — `--format text` or `--format json`."
      );
    if (value !== "text" && value !== "json")
      throw new UsageError(
        `--format: unknown value \`${value}\` — expected \`text\` or \`json\`.`
      );
    return value;
  }
  if (argv.includes("--json")) return "json";
  return isTTY ? "text" : "json";
}

/**
 * The machine envelope.
 *
 * `ok` says whether the INVOCATION succeeded, not whether the answer was
 * positive: `pdocs check` on a dirty tree is `ok: true` with `clean: false`,
 * and exits 9. Conflating the two is the mistake this field exists to prevent.
 */
export interface Envelope<T> {
  ok: boolean;
  command: string;
  data: T;
}

export function envelope<T>(command: string, data: T, ok = true): Envelope<T> {
  return { ok, command, data };
}

/** Machine output goes to stdout, and only ever the envelope. */
export function printEnvelope<T>(command: string, data: T, ok = true): void {
  console.log(JSON.stringify(envelope(command, data, ok), null, 2));
}

/**
 * Diagnostics go to stderr — always, in both formats.
 *
 * Keeping them off stdout is what lets `pdocs check --format json | jq` work on
 * a tree that turns out not to have a docs root: the pipe stays parseable and
 * the reason is still visible.
 */
export function printDiagnostic(
  command: string,
  error: CliError,
  format: Format
): void {
  if (format === "json") {
    console.error(
      JSON.stringify(
        { ok: false, command, error: { kind: error.kind, message: error.message } },
        null,
        2
      )
    );
    return;
  }
  console.error(`pdocs: ${error.message}`);
}
