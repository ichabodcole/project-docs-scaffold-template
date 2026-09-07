// The environment a spawned `pdocs` has to be given, and why.
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

/** The zone the TEST process is running in, whatever put it there. */
export const CHILD_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * The environment for a spawned `pdocs`: the test's own, plus the test
 * process's timezone made explicit so the child inherits it.
 *
 * Use this on EVERY spawn helper that drives the CLI, not only the ones that
 * compare dates today — a test that grows a date assertion later will not come
 * back to read this file.
 */
export const childEnv = (): Record<string, string | undefined> => ({
  ...process.env,
  TZ: CHILD_TZ,
});
