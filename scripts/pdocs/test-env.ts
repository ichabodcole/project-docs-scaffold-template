// The environment a spawned child has to be given, and why.
//
// Every test in this tree that asserts anything about a DATE spawns the real
// CLI and compares its output against a date the test computed for itself.
// Both sides call the same `today()`, which reads the LOCAL zone on purpose —
// a document's `generated.at` is the day its author was living in, not the day
// it was in Greenwich.
//
// The two sides were not living in the same zone. `bun test` sets the TEST
// process to UTC and does NOT export `TZ`, so a child spawned from it reads
// `/etc/localtime` and gets the machine's real zone. West of Greenwich the two
// disagree for the last hours of every day — after 17:00 PDT the test computes
// tomorrow's date and the CLI writes today's — and four tests fail for seven
// hours a day. CI runs on `ubuntu-latest`, which is UTC, so the suite stayed
// green there while the pre-commit hook went red: the exact shape of failure
// that teaches people `--no-verify`.
//
// The fix belongs here rather than in `today()`. Forcing the CLI to UTC would
// make it write the wrong date for most of the planet for part of every day,
// which is the bug the local-time reading exists to avoid.
//
// `Intl` rather than a literal `"UTC"`, because the test process is not always
// UTC: `TZ=America/Los_Angeles bun test` puts it in Los Angeles, and a child
// pinned to UTC would then disagree in the other direction. Asking the test
// process what zone it is in makes the two agree under every invocation.

// GIT'S VARIABLES ARE THE SAME SHAPE OF FAILURE, FROM THE OTHER DIRECTION.
//
// The tests build temporary repositories — `git init` in a temp root, then the
// CLI, whose corpus outside the docs root is `git ls-files`. Git finds a
// repository by walking up from the working directory UNLESS its environment
// names one, and a hook's environment does: `git commit -a` exports
// `GIT_INDEX_FILE` to `.husky/pre-commit`, a commit from a worktree or with
// `--git-dir` exports `GIT_DIR`, and `bun test` hands all of it to every child.
// `git ls-files` in the temp root then reads THIS repository's index, the lint
// is given several hundred paths that do not exist under that root, and 43
// tests fail in the hook and none fail anywhere else. Reproduce it without
// committing:
//
//   cp .git/index <scratch>/idx && GIT_INDEX_FILE=<scratch>/idx bun test
//
// `GIT_DIR` is worse than a red suite: a `git init` that inherits it
// re-initialises the repository it names instead of the temp root it was run in.
//
// So a child gets none of them. The list is `git rev-parse --local-env-vars` —
// git's own statement of which variables describe ONE repository and must not
// cross into another — written out rather than asked for, because asking is a
// spawn that would itself need this file.
//
// WHAT THIS CANNOT REACH: code a test calls IN-PROCESS that spawns git itself.
// `collect()` runs `trackedMarkdown()`, and the v2.6 codemod's `main` runs
// `git status`, each with no `env` of its own — and a Bun spawn with no `env`
// inherits the environment the process STARTED with, so deleting the variables
// from `process.env` first changes nothing (`test-env.test.ts` holds that
// fact). A test whose outcome depends on what git says about a temp repository
// therefore runs that code in a CHILD, with `childEnv()`: `pdocs check` for the
// lint's verdict, a `bun -e` driver for the codemod. It does not call it here.

/** The zone the TEST process is running in, whatever put it there. */
export const CHILD_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** `git rev-parse --local-env-vars`: what a hook exports about ITS repository. */
export const GIT_LOCAL_ENV = [
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_PARAMETERS",
  "GIT_DIR",
  "GIT_GRAFT_FILE",
  "GIT_IMPLICIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_NO_REPLACE_OBJECTS",
  "GIT_OBJECT_DIRECTORY",
  "GIT_PREFIX",
  "GIT_REPLACE_REF_BASE",
  "GIT_SHALLOW_FILE",
  "GIT_WORK_TREE",
] as const;

/**
 * The environment for a spawned child: the test's own, plus the test process's
 * timezone made explicit so the child inherits it, minus every variable that
 * tells git which repository it is in.
 *
 * Use this on EVERY spawn in a test file — the CLI, a migration script, `git`
 * itself, `sh` — not only the ones that compare dates or read an index today.
 * A test that grows a date assertion or a `git init` later will not come back
 * to read this file. `extra` is for the spawn that needs its own variables on
 * top (a stubbed `PATH`, a test seam); it is applied last, so it wins.
 */
export const childEnv = (
  extra: Record<string, string | undefined> = {}
): Record<string, string | undefined> => {
  const env: Record<string, string | undefined> = { ...process.env, TZ: CHILD_TZ };
  for (const name of GIT_LOCAL_ENV) delete env[name];
  return { ...env, ...extra };
};
