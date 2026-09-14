/**
 * The v2.10 migration — the first to use the seed verdicts on a real tree.
 *
 * Three things this file has to show, in the words of `migration-authoring`:
 * every guard has a test that was WATCHED FAILING (break the guarded thing,
 * see exit 1 and the reason, restore); every phase has a WIRING WITNESS
 * (neuter its call site in a disposable copy, expect the end-to-end run to
 * fail); and the logic copied out of `scripts/pdocs/seed.ts` is PINNED to the
 * original, so the verdicts this script gives are the verdicts the lint's own
 * module would give.
 *
 * The fixtures are real trees, generated OFFLINE: the v2.9 tree from this
 * repository's own history at the 8.0.0 release tag, the current scaffold from
 * the working tree, both through cookiecutter pointed at a local directory.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";

import {
  docsVersionOf,
  hashOf,
  isSeeded,
  loadManifest,
  mayWrite,
  patchTopLevelVersion,
  seededIn,
  serialiseManifest,
  verdictFor,
  within,
} from "./migrate-v2.9-to-v2.10.ts";
import {
  hashOf as seedHashOf,
  isSeeded as seedIsSeeded,
  loadManifest as seedLoadManifest,
  mayWrite as seedMayWrite,
  verdictFor as seedVerdictFor,
  within as seedWithin,
  type Verdict,
} from "../../../../../../scripts/pdocs/seed.ts";
import { patchTopLevelVersion as v26PatchTopLevelVersion } from "./migrate-v2.6-to-v2.7.ts";

const SCRIPT = join(import.meta.dir, "migrate-v2.9-to-v2.10.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../../../../..");
/** The release the v2.9 migration adopted consumers onto; fixture O is what it generated. */
const V80_TAG = "project-docs-scaffold-template-v8.0.0";
/** The `Applies If` cell of the migrations table, verbatim. */
const APPLIES_IF = "! grep -q isSeeded scripts/pdocs/lint/rules.ts";

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function tmp(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  roots.push(d);
  return d;
}

function write(root: string, files: Record<string, string>): void {
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const read = (root: string, rel: string) => readFileSync(join(root, rel), "utf8");
const readJson = (abs: string) => JSON.parse(readFileSync(abs, "utf8"));

// ─── Generated fixtures: real trees, not hand-built ones ─────────────────────

interface Scaffolds {
  /** A generated 8.0.0 project: the v2.9 layer, the manifest the hook wrote, the old lint. */
  old: string;
  /** A generated project from the working tree. */
  current: string;
}

let scaffolds: Scaffolds | null = null;

function sh(cmd: string[], cwd?: string, env?: Record<string, string>): string {
  const r = Bun.spawnSync(cmd, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: env ? { ...process.env, ...env } : process.env,
  });
  if (r.exitCode !== 0)
    throw new Error(
      `${cmd.join(" ")} exited ${r.exitCode}\n${r.stderr.toString()}${r.stdout.toString()}`
    );
  return r.stdout.toString();
}

/** Generate both templates once. Throws rather than skipping when it cannot. */
function generatedScaffolds(): Scaffolds {
  if (scaffolds) return scaffolds;
  if (!Bun.which("cookiecutter"))
    throw new Error(
      "cookiecutter is not on PATH, so the generated fixtures cannot be built. " +
        "Install it (`uv tool install cookiecutter` or `pipx install cookiecutter`) — " +
        "these tests do not skip without it."
    );
  const base = tmp("migrate-v210-scaffolds-");
  const config = join(base, "cookiecutter.yaml");
  writeFileSync(
    config,
    `replay_dir: "${join(base, "replay")}"\ncookiecutters_dir: "${join(base, "cookiecutters")}"\n`
  );
  const tagPresent =
    Bun.spawnSync(
      ["git", "-C", REPO_ROOT, "rev-parse", "--verify", "--quiet", `${V80_TAG}^{commit}`],
      { stdout: "pipe", stderr: "pipe" }
    ).exitCode === 0;
  if (!tagPresent)
    throw new Error(
      `tag ${V80_TAG} is not in this clone, so fixture O cannot be generated. ` +
        "Run `git fetch --tags` (a shallow or --no-tags clone drops it) and re-run."
    );
  const template80 = join(base, "template-v8.0.0");
  mkdirSync(template80);
  const tar = join(base, "template-v8.0.0.tar");
  sh(["git", "-C", REPO_ROOT, "archive", "--format=tar", "-o", tar, V80_TAG]);
  sh(["tar", "-xf", tar, "-C", template80]);

  const generate = (template: string, into: string): string => {
    mkdirSync(into);
    // `install_target="New project folder"` is load-bearing: `--no-input`
    // otherwise picks the hook's first choice, the current-directory install.
    sh([
      "cookiecutter",
      "--config-file",
      config,
      "--no-input",
      "-o",
      into,
      template,
      "install_target=New project folder",
    ]);
    return join(into, "my-project");
  };
  scaffolds = {
    old: generate(template80, join(base, "old")),
    current: generate(REPO_ROOT, join(base, "current")),
  };
  return scaffolds;
}

/** `git`, borrowing no identity, signing or default branch from the machine. */
function git(root: string, ...args: string[]): string {
  return sh(
    [
      "git",
      "-c", "user.name=fixture",
      "-c", "user.email=fixture@example.invalid",
      "-c", "commit.gpgsign=false",
      "-c", "init.defaultBranch=main",
      ...args,
    ],
    root
  );
}

function commitAll(root: string, message: string): void {
  if (!existsSync(join(root, ".git"))) git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-q", "--allow-empty", "-m", message);
}

/**
 * Fixture O: a real v2.9 tree — the 8.0.0 scaffold as generated, its manifest
 * written by that release's hook — committed, because the preflight stops on
 * dirt in a path the run writes. The variants below edit it and commit again.
 */
function fixtureO(): string {
  const root = tmp("migrate-v210-O-");
  cpSync(generatedScaffolds().old, root, { recursive: true });
  commitAll(root, "the 8.0.0 tree, as generated");
  return root;
}

/** Edit files in a fixture and commit, so the tree stays clean. */
function withFiles(root: string, files: Record<string, string>, message = "fixture edit"): string {
  write(root, files);
  commitAll(root, message);
  return root;
}

const MANIFEST = "docs/.pdocs-seed.json";
const manifestOf = (root: string) =>
  readJson(join(root, MANIFEST)) as { version: string | null; files: Record<string, string> };

/** Rewrite the fixture's manifest through a function, and commit. */
function withManifest(
  root: string,
  edit: (m: { version: string | null; files: Record<string, string> }) => void,
  message = "manifest edit"
): string {
  const m = manifestOf(root);
  edit(m);
  writeFileSync(join(root, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);
  commitAll(root, message);
  return root;
}

const PLAYBOOK = "docs/playbooks/TEMPLATE.md";
const CYCLE = "docs/cycles/TEMPLATE.md";
const REPORT = "docs/reports/YYYY-MM-DD-TEMPLATE-report.md";
/** Story-loom's page: a real specification whose name the old rule read as a template. */
const REAL_PAGE = "docs/specifications/templates.md";

/** (b) one template edited since it was recorded. */
const variantEdited = () =>
  withFiles(
    fixtureO(),
    { [PLAYBOOK]: `${readFileSync(join(generatedScaffolds().old, PLAYBOOK), "utf8")}\n## My section\n\nMine.\n` },
    "edited a template"
  );
/** (c) one recorded template deleted. */
const variantDeleted = () => {
  const root = fixtureO();
  rmSync(join(root, CYCLE));
  commitAll(root, "deleted a template");
  return root;
};
/** (d) a template on disk the manifest never recorded — the prefix-bug manifest — and one of the project's own. */
const variantUnknown = () =>
  withFiles(
    withManifest(fixtureO(), (m) => delete m.files["reports/YYYY-MM-DD-TEMPLATE-report.md"], "a manifest that missed a template"),
    { "docs/backlog/TEMPLATE-triage.md": "---\ntype: backlog\n---\n\n# Triage form\n" },
    "the project's own template"
  );
/** (e) the story-loom case: a real page with no frontmatter, hidden from the old lint. */
const variantRealPage = () =>
  withFiles(fixtureO(), { [REAL_PAGE]: "# Templates\n\nHow this project uses its templates.\n" }, "a real page named templates.md");
/** (f) gate on and clean under the new lint: a real page the new rule judges, carrying a valid block and its catalog line. */
const variantGateOnClean = () => {
  const root = fixtureO();
  const index = read(root, "docs/index.md").replace(
    /(## Specifications[\s\S]*?)_No pages yet\._/,
    "$1- [Templates](./specifications/templates.md) — How this project uses its templates."
  );
  return withFiles(
    root,
    {
      [REAL_PAGE]:
        "---\ntype: specification\ntitle: Templates\ndescription: How this project uses its templates.\ntags: [templates, process]\nstatus: stable\ngenerated: { by: fixture, at: 2026-09-14 }\n---\n\n# Templates\n\nHow this project uses its templates.\n",
      "docs/index.md": index,
    },
    "a real page named templates.md, valid"
  );
};
/** A template the scaffold ships that the tree never had: neither on disk nor recorded. */
const variantNeverHad = () => {
  const root = withManifest(fixtureO(), (m) => delete m.files["cycles/TEMPLATE.md"], "never recorded");
  rmSync(join(root, CYCLE));
  commitAll(root, "never had it");
  return root;
};
/** A recorded path the scaffold no longer ships. */
const variantUnshipped = () =>
  withManifest(
    withFiles(fixtureO(), { "docs/backlog/TEMPLATE-old.md": "old form\n" }, "an old form"),
    (m) => (m.files["backlog/TEMPLATE-old.md"] = sha("old form\n")),
    "recorded the old form"
  );

/**
 * The current scaffold, with its README's `docs_version` set to `version` —
 * both fixtures say 8.0.0 today, so a run that moves the markers needs a
 * scaffold that says something else.
 */
function scaffoldAt(version: string): string {
  const s = tmp("migrate-v210-N-");
  cpSync(generatedScaffolds().current, s, { recursive: true });
  const readme = join(s, "docs/README.md");
  writeFileSync(readme, read(s, "docs/README.md").replace(/^docs_version:\s*"[^"]*"/m, `docs_version: "${version}"`));
  return s;
}
let n999: string | null = null;
/** Fixture N at 9.9.9, shared: the whole-run tests never write into it. */
const target = () => (n999 ??= scaffoldAt("9.9.9"));

interface Run {
  exitCode: number | null;
  out: string;
}

/**
 * Run the script as a process. The 9.9.9 scaffold is passed with
 * `--scaffold-dir` unless `scaffold` is given (`null` omits the flag, so the
 * script fetches — or tries to). `--skip-format` is passed unless `format` is
 * true. Nothing here calls `main` in-process: the exit code is the contract,
 * and only a process has one.
 */
function migrate(
  root: string,
  args: string[] = [],
  o: { script?: string; env?: Record<string, string>; scaffold?: string | null; bun?: string; format?: boolean } = {}
): Run {
  const scaffold = o.scaffold === undefined ? target() : o.scaffold;
  const r = Bun.spawnSync(
    [
      o.bun ?? "bun",
      o.script ?? SCRIPT,
      "--root",
      root,
      ...(scaffold ? ["--scaffold-dir", scaffold] : []),
      ...(o.format ? [] : ["--skip-format"]),
      ...args,
    ],
    { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...o.env } }
  );
  return { exitCode: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

/** Every file's sha256, `.git/` excluded — what "byte-identical" means here. */
function treeDigest(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else out[relative(root, abs)] = hashOf(abs) as string;
    }
  };
  walk(root);
  return out;
}

// ─── The owned and seeded diff between O and N is DERIVED, never pinned ──────
//
// release-please bumps the version marker inside scripts/pdocs/cli.ts (both
// copies; see release-please-config.json) on every release, so on a release
// branch N differs from O by one more owned file than the 3.11.0 fixes
// touched, and a test that hard-codes the count or the list goes red on every
// release PR. What a test must prove is a FLOOR — the refresh carries the
// fixes — and the exact set is read off the two generated trees.

/** Under scripts/pdocs/, the files the 3.11.0 fixes touched: the refresh must carry these. */
const FIXED_OWNED = ["commands/check.ts", "lint/collect.ts", "lint/rules.ts", "pages.ts", "seed.ts"];
/** The template the 3.11.0 fixes touched. */
const FIXED_TEMPLATES = ["playbooks/TEMPLATE.md"];

/** Paths under `sub` whose bytes differ between two scaffolds, relative to `sub`, sorted. */
function ownedDiff(o: string, n: string, sub = "scripts/pdocs"): string[] {
  const a = treeDigest(join(o, sub));
  const b = treeDigest(join(n, sub));
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).sort();
}
/** Templates whose bytes differ between two scaffolds, docs-relative, sorted. */
const templateDiff = (o: string, n: string) => ownedDiff(o, n, "docs").filter((rel) => isSeeded(rel));

/** The owned files this release's refresh writes on O. */
const owned = () => ownedDiff(generatedScaffolds().old, generatedScaffolds().current);
/** The templates this release moves on O — the `update` verdicts that write. */
const moved = () => templateDiff(generatedScaffolds().old, generatedScaffolds().current);
/** How many templates the scaffold ships. */
const total = () => seededIn(join(generatedScaffolds().current, "docs")).length;

/**
 * A stub CLI answering only what the script asks of it: `check --format json`
 * prints an envelope, with the exit code, the count and the readability each
 * overridable by an environment variable so the verify phase can be made to
 * fail in every way it can.
 */
const STUB_CLI = `const a = process.argv.slice(2);
if (a[0] === "check") {
  if (process.env.CLI_CHECK_GARBAGE) { console.log("not an envelope"); process.exit(1); }
  const total = Number(process.env.CLI_CHECK_TOTAL ?? 0);
  console.log(JSON.stringify({ ok: true, data: { clean: total === 0, adopting: false, total, problems: Array.from({ length: total }, (_, i) => ({ tier: "library", message: "STUB PROBLEM " + (i + 1) })) } }));
  process.exit(Number(process.env.CLI_CHECK_EXIT ?? 0));
}
process.exit(0);
`;

/**
 * A hand-built scaffold with only the parts the script reads, each removable
 * so one guard at a time can be tripped. The generated scaffold is the subject
 * of the whole-run tests; this is for the guards, where a missing piece has to
 * be a scaffold defect rather than a fixture accident.
 */
function stubScaffold(
  o: {
    rulesMarker?: boolean;
    schemaMarker?: boolean;
    readme?: string | null;
    template?: boolean;
    pdocs?: boolean;
    schema?: boolean;
    version?: string;
  } = {}
): string {
  const s = tmp("migrate-v210-stub-");
  const files: Record<string, string> = {};
  if (o.schema !== false)
    files["docs/SCHEMA.md"] = `# Schema\n\n## Who owns which file\n\n${o.schemaMarker === false ? "| **Seeded** | any TEMPLATE |" : "| **Seeded** | `TEMPLATE.md`, `TEMPLATE-<variant>.md` |"}\n`;
  const readme =
    o.readme === undefined
      ? `---\ndocs_version: "${o.version ?? "9.9.9"}" # x-release-please-version\n---\n\n# Documentation\n`
      : o.readme;
  if (readme !== null) files["docs/README.md"] = readme;
  if (o.pdocs !== false) {
    files["scripts/pdocs/cli.ts"] = STUB_CLI;
    files["scripts/pdocs/lint/rules.ts"] = o.rulesMarker === false ? "// the old rule\n" : "// isSeeded\n";
  }
  if (o.template !== false) files["docs/playbooks/TEMPLATE.md"] = "---\ntype: playbook\n---\n\n# Stub playbook\n";
  write(s, files);
  return s;
}

/**
 * A `cookiecutter` on PATH that does what the mode says, so the generate path
 * of phase 2 — and every guard on it — runs without the network. `copy`
 * produces a real scaffold by copying the 9.9.9 one.
 */
function stubCookiecutter(mode: "fail" | "two" | "empty" | "copy", source: string = target()): string {
  const dir = tmp("migrate-v210-stubcc-");
  const bin = join(dir, "cookiecutter");
  writeFileSync(
    bin,
    `#!/bin/sh
out=""
while [ $# -gt 0 ]; do
  if [ "$1" = "-o" ]; then out="$2"; shift; fi
  shift
done
case "${mode}" in
  fail) echo "stub cookiecutter: boom" >&2; exit 3 ;;
  two) mkdir -p "$out/a" "$out/b" ;;
  empty) mkdir -p "$out/only" ;;
  copy) cp -R "${source}" "$out/my-project" ;;
esac
exit 0
`
  );
  chmodSync(bin, 0o755);
  return `${dir}:${process.env.PATH}`;
}

/**
 * An `npx` on PATH standing in for the project's Prettier: `append` rewrites
 * every file it is given (what a formatter does), `fail` exits 1.
 */
function stubNpx(mode: "append" | "fail"): string {
  const dir = tmp("migrate-v210-stubnpx-");
  const bin = join(dir, "npx");
  writeFileSync(
    bin,
    `#!/bin/sh
[ "$1" = "prettier" ] && [ "$2" = "--write" ] || { echo "stub npx: unexpected $*" >&2; exit 4; }
shift 2
case "${mode}" in
  fail) echo "stub prettier: boom" >&2; exit 1 ;;
  append) for f in "$@"; do printf '\\n<!-- formatted by the stub -->\\n' >> "$f"; done ;;
esac
exit 0
`
  );
  chmodSync(bin, 0o755);
  return `${dir}:${process.env.PATH}`;
}

/** Where a generated (not supplied) scaffold went, from the phase-2 line. */
const generatedAt = (r: Run): string | null => /✓ generated at (.+)$/m.exec(r.out)?.[1] ?? null;

/**
 * A disposable copy of the script with one edit applied. Throws if the text
 * to edit is not in the script, so a refactor that renames a call site fails
 * the witness loudly rather than neutering nothing and passing. The script is
 * self-contained, so nothing else has to travel with the copy.
 */
function patchedScript(edits: Array<[string, string]>): string {
  const dir = tmp("migrate-v210-patched-");
  let src = readFileSync(SCRIPT, "utf8");
  for (const [find, replace] of edits) {
    if (!src.includes(find)) throw new Error(`not in the script, so nothing was neutered: ${find}`);
    src = src.replace(find, replace);
  }
  const copy = join(dir, basename(SCRIPT));
  writeFileSync(copy, src);
  return copy;
}
const neutered = (callSite: string) => patchedScript([[callSite, `/* neutered: ${callSite.trim()} */`]]);

// ─── The copied seed logic is pinned to the original ─────────────────────────

describe("the copied seed logic equals scripts/pdocs/seed.ts", () => {
  const NAMES = [
    "TEMPLATE.md", "TEMPLATE-domain.md", "YYYY-MM-DD-TEMPLATE-investigation.md",
    "YYYY-MM-DD-TEMPLATE-report.md", "PLAN.template.md", "projects/TEMPLATES/anything.md",
    "README.md", "a-real-playbook.md", "TEMPLATE.txt", "2026-01-01-a-session.md",
    "templates.md", "email-templates.md", "EMAIL-TEMPLATES.md", "TEMPLATES.md",
    "docs/specifications/templates.md", "/abs/docs/projects/TEMPLATES/x.md",
  ];

  test("isSeeded agrees on every shape, and on every path in the current scaffold's docs/", () => {
    for (const n of NAMES) expect([n, isSeeded(n)]).toEqual([n, seedIsSeeded(n)]);
    const docs = join(generatedScaffolds().current, "docs");
    const all: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const abs = join(d, e.name);
        if (e.isDirectory()) walk(abs);
        else all.push(relative(docs, abs));
      }
    };
    walk(docs);
    expect(all.length).toBeGreaterThan(19);
    for (const rel of all) expect([rel, isSeeded(rel)]).toEqual([rel, seedIsSeeded(rel)]);
    expect(seededIn(docs).length).toBe(19);
  });

  test("verdictFor agrees on every (recorded, present, matching) combination, escaping keys included", () => {
    const docs = tmp("migrate-v210-verdict-");
    write(docs, { "a/TEMPLATE.md": "same\n", "b/TEMPLATE.md": "changed\n", "e/TEMPLATE.md": "unknown\n" });
    const m = { version: "8.0.0", files: { "a/TEMPLATE.md": sha("same\n"), "b/TEMPLATE.md": sha("was\n"), "c/TEMPLATE.md": sha("gone\n") } };
    const cases: Array<[string, Verdict]> = [
      ["a/TEMPLATE.md", "update"],
      ["b/TEMPLATE.md", "keep-modified"],
      ["c/TEMPLATE.md", "keep-deleted"],
      ["d/TEMPLATE.md", "install"],
      ["e/TEMPLATE.md", "keep-unknown"],
      ["../outside.md", "keep-unknown"],
      ["/etc/passwd", "keep-unknown"],
      ["", "keep-unknown"],
    ];
    for (const [rel, expected] of cases) {
      expect([rel, verdictFor(m, docs, rel)]).toEqual([rel, expected]);
      expect([rel, seedVerdictFor(m, docs, rel)]).toEqual([rel, expected]);
    }
    for (const v of ["update", "install", "keep-modified", "keep-unknown", "keep-deleted"] as const)
      expect(mayWrite(v)).toBe(seedMayWrite(v));
  });

  test("within and hashOf agree", () => {
    const docs = tmp("migrate-v210-within-");
    write(docs, { "x/TEMPLATE.md": "x\n" });
    for (const rel of ["x/TEMPLATE.md", "missing.md", "../up.md", "..", "", "/abs", "..foo/x.md"])
      expect([rel, within(docs, rel)]).toEqual([rel, seedWithin(docs, rel)]);
    expect(hashOf(join(docs, "x/TEMPLATE.md"))).toBe(seedHashOf(join(docs, "x/TEMPLATE.md")));
    expect(hashOf(join(docs, "nope"))).toBe(seedHashOf(join(docs, "nope")));
  });

  test("loadManifest agrees: absent is empty, corrupt throws the same text, a non-object throws", () => {
    const absent = tmp("migrate-v210-lm-");
    expect(loadManifest(absent)).toEqual(seedLoadManifest(absent));
    const corrupt = tmp("migrate-v210-lm-");
    write(corrupt, { ".pdocs-seed.json": "{ not json" });
    let a = "", b = "";
    try { loadManifest(corrupt); } catch (e) { a = (e as Error).message; }
    try { seedLoadManifest(corrupt); } catch (e) { b = (e as Error).message; }
    expect(a).toBe(b);
    expect(a).toContain("is not valid JSON");
    const array = tmp("migrate-v210-lm-");
    write(array, { ".pdocs-seed.json": "[]" });
    expect(() => loadManifest(array)).toThrow("must contain a JSON object");
    expect(() => seedLoadManifest(array)).toThrow("must contain a JSON object");
    const mixed = tmp("migrate-v210-lm-");
    write(mixed, { ".pdocs-seed.json": '{"version": 3, "files": {"a": "h", "b": 2}}' });
    expect(loadManifest(mixed)).toEqual(seedLoadManifest(mixed));
    expect(loadManifest(mixed)).toEqual({ version: null, files: { a: "h" } });
  });

  test("the copied patchTopLevelVersion equals the v2.6 script's on every shape", () => {
    const shapes = [
      '{"version": "1.0.0"}',
      '{\n  "docsRoot": "docs",\n  "version": "1.0.0",\n  "lint": { "version": "keep" }\n}\n',
      '{"a": {"version": "nested"}}',
      '{"key": "version", "version": 7}',
      '{"version": ["x"]}',
      '{"ver\\"sion": "x"}',
      "{}",
    ];
    for (const s of shapes) expect([s, patchTopLevelVersion(s, "9.9.9")]).toEqual([s, v26PatchTopLevelVersion(s, "9.9.9")]);
  });

  test("serialiseManifest keeps the file's indent and the hook's shape", () => {
    const m = { version: "9.9.9", files: { "b/TEMPLATE.md": "2", "a/TEMPLATE.md": "1" } };
    expect(serialiseManifest(m, null)).toBe('{\n  "version": "9.9.9",\n  "files": {\n    "a/TEMPLATE.md": "1",\n    "b/TEMPLATE.md": "2"\n  }\n}\n');
    expect(serialiseManifest(m, '{\n    "version": "x"\n}\n').startsWith('{\n    "version"')).toBe(true);
  });
});

// ─── The fixtures are what they claim ────────────────────────────────────────

describe("fixtures — the generated trees the whole-script tests run against", () => {
  test("O is a v2.9 tree: all four files, the hook's manifest at 8.0.0, the gate on, and the old lint", () => {
    const o = fixtureO();
    for (const f of [".project-docs.json", "docs/SCHEMA.md", "scripts/pdocs/cli.ts", MANIFEST]) expect(existsSync(join(o, f))).toBe(true);
    const m = manifestOf(o);
    expect(m.version).toBe("8.0.0");
    expect(Object.keys(m.files).length).toBe(19);
    expect(readJson(join(o, ".project-docs.json")).lint.adopting).toBe(false);
    expect(docsVersionOf(join(o, "docs/README.md"))).toBe("8.0.0");
    expect(read(o, "scripts/pdocs/lint/rules.ts")).not.toContain("isSeeded");
    expect(read(o, "docs/SCHEMA.md")).not.toContain("`TEMPLATE-<variant>.md`");
  });

  test("the Applies If test is true on O and false on N, executed as the table's shell", () => {
    const on = (root: string) => Bun.spawnSync(["sh", "-c", APPLIES_IF], { cwd: root, stdout: "pipe", stderr: "pipe" }).exitCode;
    expect(on(fixtureO())).toBe(0);
    expect(on(generatedScaffolds().current)).toBe(1);
    expect(on(target())).toBe(1);
  });

  test("N differs from O in the owned files (at least the ones the 3.11.0 fixes touched), the templates those fixes moved, SCHEMA.md and the manifest", () => {
    // The floor is what proves the refresh carries the fixes; the exact set is
    // derived, because release-please bumps cli.ts's marker on every release.
    for (const f of FIXED_OWNED) expect(owned()).toContain(f);
    for (const t of FIXED_TEMPLATES) expect(moved()).toContain(t);
    const o = treeDigest(fixtureO());
    const n = treeDigest(generatedScaffolds().current);
    const differ = Object.keys(o).filter((k) => o[k] !== n[k]).sort();
    expect(differ).toEqual(
      [
        "docs/.pdocs-seed.json",
        "docs/SCHEMA.md",
        ...moved().map((t) => `docs/${t}`),
        ...owned().map((f) => `scripts/pdocs/${f}`),
      ].sort()
    );
  });

  test("the story-loom page passes the old lint and fails the new one", () => {
    const o = variantRealPage();
    const oldCheck = Bun.spawnSync(["bun", "scripts/pdocs/cli.ts", "check", "--format", "json"], { cwd: o, stdout: "pipe", stderr: "pipe" });
    expect(oldCheck.exitCode).toBe(0);
    expect(JSON.parse(oldCheck.stdout.toString()).data.total).toBe(0);
    cpSync(join(target(), "scripts/pdocs"), join(o, "scripts/pdocs"), { recursive: true });
    const newCheck = Bun.spawnSync(["bun", "scripts/pdocs/cli.ts", "check", "--format", "json"], { cwd: o, stdout: "pipe", stderr: "pipe" });
    expect(newCheck.exitCode).toBe(9);
    expect(JSON.parse(newCheck.stdout.toString()).data.total).toBe(3);
  });
});

// ─── The whole migration, on each variant of O ───────────────────────────────

const expectRefreshed = (root: string, version = "9.9.9") => {
  expect(read(root, "scripts/pdocs/lint/rules.ts")).toContain("isSeeded");
  expect(read(root, "docs/SCHEMA.md")).toContain("`TEMPLATE-<variant>.md`");
  expect(docsVersionOf(join(root, "docs/README.md"))).toBe(version);
  expect(readJson(join(root, ".project-docs.json")).version).toBe(version);
};

describe("the whole migration on fixture O", () => {
  test("(a) untouched: every template is `update`, one has moved, the rest are already at the scaffold's bytes", () => {
    const root = fixtureO();
    const before = manifestOf(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("✓ v2.9 tree at");
    expect(r.out).toContain("· `pdocs check` under the installed CLI: clean");
    expect(r.out).toContain("✓ release 9.9.9, carrying what the refresh installs");
    expect(r.out).toContain(`✓ scripts/pdocs/ refreshed (${owned().length} file(s) written; the copy merges`);
    expect(r.out).toContain("✓ docs/SCHEMA.md replaced (owned)");
    for (const t of moved()) expect(r.out).toContain(`✓ updated docs/${t}`);
    expect(r.out).toContain("· docs/architecture/TEMPLATE.md already at the scaffold's bytes — update, nothing to write");
    expect(r.out).toContain("· formatting skipped (--skip-format)");
    expect(r.out).toContain(`✓ docs/.pdocs-seed.json written: ${total()} template(s) recorded at version 9.9.9, ${total()} entries`);
    expect(r.out).toContain(
      `✓ ${total()} template(s) in the scaffold: ${moved().length} updated, ${total() - moved().length} already at the scaffold's bytes, 0 installed, 0 kept (modified), 0 kept (unknown), 0 kept (deleted)`
    );
    expect(r.out).toContain("✓ pdocs check: clean (exit 0)");
    expect(r.out).toContain("✓ docs/README.md set to 9.9.9");
    expect(r.out).toContain("✓ .project-docs.json set to 9.9.9 — that one key; every other byte as it was");
    expect(r.out).toContain(`Migration complete. ${total()} template(s) reconciled, ${total()} recorded; the owned files are at release 9.9.9.`);
    expectRefreshed(root);
    const after = manifestOf(root);
    expect(after.version).toBe("9.9.9");
    // Every moved template is now the scaffold's, bytes and record; every
    // other record is as it was.
    for (const t of moved()) {
      expect(read(root, `docs/${t}`)).toBe(readFileSync(join(target(), "docs", t), "utf8"));
      expect(after.files[t]).toBe(hashOf(join(target(), "docs", t)) as string);
      expect(after.files[t]).not.toBe(before.files[t]);
    }
    const rest = (files: Record<string, string>) =>
      Object.fromEntries(Object.entries(files).filter(([k]) => !moved().includes(k)));
    expect(rest(after.files)).toEqual(rest(before.files));
    // Nothing the project wrote is touched: the scripts' unmirrored siblings, index.md, the manifesto.
    expect(read(root, "docs/index.md")).toBe(readFileSync(join(generatedScaffolds().old, "docs/index.md"), "utf8"));
  });

  test("(b) one template edited: keep-modified, named, bytes and record untouched", () => {
    const root = variantEdited();
    const mine = read(root, PLAYBOOK);
    const before = manifestOf(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("· kept docs/playbooks/TEMPLATE.md — keep-modified: you edited it since it was recorded; the scaffold's moved, yours stays");
    const others = moved().filter((t) => t !== "playbooks/TEMPLATE.md").length;
    expect(r.out).toContain(
      `${others} updated, ${total() - 1 - others} already at the scaffold's bytes, 0 installed, 1 kept (modified), 0 kept (unknown), 0 kept (deleted)`
    );
    expect(read(root, PLAYBOOK)).toBe(mine);
    const after = manifestOf(root);
    expect(after.files["playbooks/TEMPLATE.md"]).toBe(before.files["playbooks/TEMPLATE.md"]);
    expect(after.version).toBe("9.9.9");
    expectRefreshed(root);
  });

  test("(c) one template deleted: keep-deleted, stays deleted, record kept — and the lint, old and new, says the form is missing", () => {
    // Deleting is an edit, so the template stays deleted; the registry still
    // declares it, so `pdocs check` reports TEMPLATE MISSING under the old lint
    // (the baseline) and the new one alike, and the run ends at the verify stop
    // with nothing new to the refreshed lint. Restoring the file is the fix.
    const root = variantDeleted();
    const before = manifestOf(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("· `pdocs check` under the installed CLI: exit 9, 1 problem(s)");
    expect(r.out).toContain("· kept docs/cycles/TEMPLATE.md — keep-deleted: recorded, and you deleted it; deleting is an edit");
    expect(r.out).toContain("1 kept (deleted)");
    expect(r.out).toContain("STOPPED: `pdocs check` exits 9 on the refreshed tree: 1 problem(s). Against the baseline the older lint reported (1): 0 new to the refreshed lint, 0 no longer reported, 1 unchanged. Nothing here is new to the refreshed lint; the tree was not clean before this run.");
    expect(r.out).toContain("TEMPLATE MISSING  docs/cycles/TEMPLATE.md");
    expect(existsSync(join(root, CYCLE))).toBe(false);
    expect(manifestOf(root).files["cycles/TEMPLATE.md"]).toBe(before.files["cycles/TEMPLATE.md"]);
    expect(manifestOf(root).version).toBe("9.9.9");
    expect(docsVersionOf(join(root, "docs/README.md"))).toBe("8.0.0");
  });

  test("(c') the same, gate off: keep-deleted is honoured and the run completes with the problem reported", () => {
    const root = variantDeleted();
    withFiles(root, { ".project-docs.json": read(root, ".project-docs.json").replace('"adopting": false', '"adopting": true') }, "gate off");
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("· kept docs/cycles/TEMPLATE.md — keep-deleted");
    expect(r.out).toContain("✓ pdocs check: exit 0 — 1 problem(s) reported, and lint.adopting is true");
    expect(existsSync(join(root, CYCLE))).toBe(false);
    expectRefreshed(root);
  });

  test("(d) a template on disk the manifest never recorded: keep-unknown, left alone and NOT recorded; the project's own form is not mentioned", () => {
    const root = variantUnknown();
    const before = manifestOf(root);
    expect(before.files["reports/YYYY-MM-DD-TEMPLATE-report.md"]).toBeUndefined();
    const report = read(root, REPORT);
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("· kept docs/reports/YYYY-MM-DD-TEMPLATE-report.md — keep-unknown: on disk but never recorded; unknown is not permission");
    expect(r.out).toContain("1 kept (unknown)");
    expect(r.out).toContain(`${total() - 1} template(s) recorded at version 9.9.9, ${total() - 1} entries`);
    expect(r.out).not.toContain("TEMPLATE-triage");
    expect(read(root, REPORT)).toBe(report);
    expect(manifestOf(root).files["reports/YYYY-MM-DD-TEMPLATE-report.md"]).toBeUndefined();
    expect(read(root, "docs/backlog/TEMPLATE-triage.md")).toContain("# Triage form");
    expectRefreshed(root);
  });

  test("(e) the story-loom page: the refresh stays, verify goes red, exit 1, the markers do not move", () => {
    const root = variantRealPage();
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("✓ scripts/pdocs/ refreshed");
    expect(r.out).toContain("✓ docs/.pdocs-seed.json written");
    expect(r.out).toContain("STOPPED: `pdocs check` exits 9 on the refreshed tree: 3 problem(s). Against the baseline the older lint reported (0): 3 new to the refreshed lint, 0 no longer reported, 0 unchanged. Story-loom's real page");
    expect(r.out).toContain("The refresh STAYS");
    expect(r.out).toContain("markers were NOT moved: this tree is not at v2.10 until the check passes");
    expect(r.out).toContain("`bun scripts/pdocs/cli.ts report --format text`");
    expect(r.out).toContain("NO FRONTMATTER docs/specifications/templates.md");
    expect(r.out).toContain("Re-running this migration is safe");
    expect(r.out).toContain("The tree may be partly migrated");
    expect(r.out).not.toContain("[6/7]");
    // The refresh stayed; the markers did not move; the record moved with the refresh.
    expect(read(root, "scripts/pdocs/lint/rules.ts")).toContain("isSeeded");
    expect(docsVersionOf(join(root, "docs/README.md"))).toBe("8.0.0");
    expect(readJson(join(root, ".project-docs.json")).version).toBe("8.0.0");
    expect(manifestOf(root).version).toBe("9.9.9");

    // A second run, unfixed, ends at the same place and finds every phase done.
    commitAll(root, "the refresh, committed with the page still bare");
    const again = migrate(root);
    expect(again.exitCode).toBe(1);
    expect(again.out).toContain("✓ scripts/pdocs/ already identical to the scaffold's");
    expect(again.out).toContain("✓ docs/.pdocs-seed.json unchanged");
    expect(again.out).toContain("· `pdocs check` under the installed CLI: exit 9, 3 problem(s)");
    expect(again.out).toContain("Against the baseline the older lint reported (3): 0 new to the refreshed lint, 0 no longer reported, 3 unchanged. Nothing here is new to the refreshed lint");

    // Worked — the page gets its block and its catalog line — and the run passes.
    const fixed = variantGateOnClean();
    write(root, { [REAL_PAGE]: read(fixed, REAL_PAGE), "docs/index.md": read(fixed, "docs/index.md") });
    commitAll(root, "worked the problems");
    const passed = migrate(root);
    expect(passed.exitCode).toBe(0);
    expect(passed.out).toContain("✓ pdocs check: clean (exit 0)");
    expectRefreshed(root);
  });

  test("(f) gate on and clean: a real page the new lint judges and passes; the run completes", () => {
    const root = variantGateOnClean();
    expect(readJson(join(root, ".project-docs.json")).lint.adopting).toBe(false);
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("✓ pdocs check: clean (exit 0)");
    expectRefreshed(root);
  });

  test("a template the scaffold ships that the tree never had is installed and recorded", () => {
    const root = variantNeverHad();
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("✓ installed docs/cycles/TEMPLATE.md");
    expect(r.out).toContain("1 installed");
    expect(read(root, CYCLE)).toBe(readFileSync(join(target(), CYCLE), "utf8"));
    expect(manifestOf(root).files["cycles/TEMPLATE.md"]).toBe(hashOf(join(target(), CYCLE)) as string);
  });

  test("a recorded path the scaffold no longer ships is reported, left as it is, record kept", () => {
    const root = variantUnshipped();
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("· docs/backlog/TEMPLATE-old.md is recorded but the scaffold no longer ships it — left as it is, record kept");
    expect(read(root, "docs/backlog/TEMPLATE-old.md")).toBe("old form\n");
    expect(manifestOf(root).files["backlog/TEMPLATE-old.md"]).toBe(sha("old form\n"));
    expect(Object.keys(manifestOf(root).files).length).toBe(20);
  });

  test("a manifest key that escapes the docs root is dropped from the record and named, never re-minted", () => {
    const root = withManifest(
      fixtureO(),
      (m) => {
        m.files["../outside.md"] = sha("x\n");
        m.files["/etc/passwd"] = sha("y\n");
      },
      "a hand-edited manifest with escaping keys"
    );
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain('· docs/.pdocs-seed.json records "../outside.md", which is not a path inside the docs root — dropped from the record');
    expect(r.out).toContain('· docs/.pdocs-seed.json records "/etc/passwd", which is not a path inside the docs root — dropped from the record');
    expect(r.out).not.toContain("outside.md is recorded but the scaffold no longer ships it");
    expect(r.out).not.toContain("passwd is recorded but the scaffold no longer ships it");
    const after = manifestOf(root);
    expect(after.files["../outside.md"]).toBeUndefined();
    expect(after.files["/etc/passwd"]).toBeUndefined();
    expect(Object.keys(after.files).length).toBe(19);
    expect(read(root, MANIFEST)).not.toContain("passwd");
  });

  test("the gate off: problems are reported at exit 0 and the run completes", () => {
    const root = variantRealPage();
    const cfg = read(root, ".project-docs.json").replace('"adopting": false', '"adopting": true');
    withFiles(root, { ".project-docs.json": cfg }, "gate off");
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("✓ pdocs check: exit 0 — 3 problem(s) reported, and lint.adopting is true so the gate does not fail on them");
    expectRefreshed(root);
  });

  test("the manifest keeps its indent, and a project's own file beside the CLI survives the merge", () => {
    const root = fixtureO();
    const m = manifestOf(root);
    withFiles(root, { [MANIFEST]: `${JSON.stringify(m, null, 4)}\n`, "scripts/pdocs/mine.ts": "// theirs\n" }, "4-space manifest, own file");
    expect(migrate(root).exitCode).toBe(0);
    expect(read(root, MANIFEST).startsWith('{\n    "version": "9.9.9"')).toBe(true);
    expect(read(root, "scripts/pdocs/mine.ts")).toBe("// theirs\n");
  });
});

describe("idempotence and dry run", () => {
  test("a second run says already-done everywhere and leaves every byte alone", () => {
    const root = fixtureO();
    expect(migrate(root).exitCode).toBe(0);
    commitAll(root, "migrated");
    const before = treeDigest(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("✓ git tree clean");
    expect(r.out).toContain("✓ scripts/pdocs/ already identical to the scaffold's");
    expect(r.out).toContain("✓ docs/SCHEMA.md already identical to the scaffold's");
    expect(r.out).toContain(`0 updated, ${total()} already at the scaffold's bytes, 0 installed`);
    expect(r.out).toContain("· nothing was written, so nothing to format");
    expect(r.out).toContain("✓ docs/.pdocs-seed.json unchanged (19 entries, version 9.9.9)");
    expect(r.out).toContain("✓ docs/README.md already at 9.9.9");
    expect(r.out).toContain("✓ .project-docs.json already at 9.9.9");
    expect(r.out).not.toContain("✓ updated");
    expect(treeDigest(root)).toEqual(before);
  });

  test("--dry-run generates its plan from the scaffold, prints every verdict, and leaves O byte-identical", () => {
    const root = variantEdited();
    rmSync(join(root, CYCLE));
    commitAll(root, "and deleted one");
    const before = treeDigest(root);
    const r = migrate(root, ["--dry-run"]);
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain(`· would refresh scripts/pdocs/ (${owned().length} file(s) to write: ${owned().join(", ")})`);
    expect(r.out).toContain("· would replace docs/SCHEMA.md (owned)");
    // The playbook is kept (edited) and cycles/ is kept (deleted), whatever
    // the release did to them; any other moved template is one to update.
    const up = moved().filter((t) => t !== "playbooks/TEMPLATE.md" && t !== "cycles/TEMPLATE.md").length;
    expect(r.out).toContain(
      `· ${total()} template(s) in the scaffold: ${up} to update, ${total() - 2 - up} already at the scaffold's bytes, 0 to install, 1 kept (modified), 0 kept (unknown), 1 kept (deleted)`
    );
    expect(r.out).toContain("· would keep docs/playbooks/TEMPLATE.md — keep-modified:");
    expect(r.out).toContain("· would keep docs/cycles/TEMPLATE.md — keep-deleted:");
    expect(r.out).toContain("· docs/architecture/TEMPLATE.md already at the scaffold's bytes — update, nothing to write");
    expect(r.out).toContain(
      `· would record ${total() - 2} template(s) in docs/.pdocs-seed.json at version 9.9.9` +
        (up === 0 ? " (nothing written, so nothing to format)" : " (no formatting: --skip-format)")
    );
    // With something to write, the flag is what the line reports.
    const w = migrate(fixtureO(), ["--dry-run"]);
    expect(w.out).toContain(`· would record ${total()} template(s) in docs/.pdocs-seed.json at version 9.9.9 (no formatting: --skip-format)`);
    const f = migrate(fixtureO(), ["--dry-run"], { format: true });
    expect(f.out).toContain(`· would record ${total()} template(s) in docs/.pdocs-seed.json at version 9.9.9, after prettier over the ${moved().length} written`);
    expect(r.out).toContain("· would run `pdocs check`");
    expect(r.out).toContain("· would set docs/README.md from 8.0.0 to 9.9.9");
    expect(r.out).toContain("· would set .project-docs.json from \"8.0.0\" to 9.9.9");
    expect(r.out).toContain("Dry run complete — nothing was changed. 19 template(s) would be reconciled.");
    expect(treeDigest(root)).toEqual(before);
  });

  test("--dry-run without --scaffold-dir generates the scaffold and removes it", () => {
    const root = fixtureO();
    const before = treeDigest(root);
    const r = migrate(root, ["--dry-run"], { scaffold: null, env: { PATH: stubCookiecutter("copy") } });
    expect(r.exitCode).toBe(0);
    const at = generatedAt(r);
    expect(at).not.toBeNull();
    expect(r.out).toContain("✓ generated scaffold removed");
    expect(existsSync(at as string)).toBe(false);
    expect(treeDigest(root)).toEqual(before);
  });

  test("--scaffold is accepted as an alias of --scaffold-dir", () => {
    const r = Bun.spawnSync(["bun", SCRIPT, "--root", fixtureO(), "--scaffold", target(), "--skip-format", "--dry-run"], { stdout: "pipe", stderr: "pipe" });
    expect(r.exitCode).toBe(0);
  });
});

describe("format before record", () => {
  test("a written template is formatted with the project's Prettier before its hash is recorded", () => {
    const root = fixtureO();
    const r = migrate(root, [], { format: true, env: { PATH: stubNpx("append") } });
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain(`✓ formatted ${moved().length} written template(s) with your Prettier — before recording, never after`);
    const onDisk = read(root, PLAYBOOK);
    expect(onDisk).toEndWith("<!-- formatted by the stub -->\n");
    expect(manifestOf(root).files["playbooks/TEMPLATE.md"]).toBe(sha(onDisk));
    // Only what was written: a template already at the scaffold's bytes is not reformatted.
    expect(read(root, CYCLE)).not.toContain("formatted by the stub");
  });

  test("a formatter that fails stops the run before anything is recorded", () => {
    const root = fixtureO();
    const before = manifestOf(root);
    const r = migrate(root, [], { format: true, env: { PATH: stubNpx("fail") } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: prettier exited 1 over the 1 template(s) this run wrote");
    expect(r.out).toContain("stub prettier: boom");
    expect(r.out).toContain("--skip-format");
    expect(manifestOf(root)).toEqual(before);
    expect(r.out).toContain("The tree may be partly migrated");
  });

  test("a missing formatter stops the run in preflight rather than continuing unformatted", () => {
    const r = migrate(fixtureO(), [], { format: true, env: { PATH: `${dirname(Bun.which("bun") as string)}:/usr/bin:/bin` } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: npx not found, and --skip-format was not given");
    expect(r.out).toContain("Nothing was written.");
  });
});

// ─── Guards that must be able to fire ────────────────────────────────────────

describe("bad invocation exits 2, not 1", () => {
  const bad = (...args: string[]) => Bun.spawnSync(["bun", SCRIPT, ...args], { stdout: "pipe", stderr: "pipe" });
  test("--root without a value", () => {
    const r = bad("--root");
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("--root needs a value");
  });
  test("--scaffold-dir followed by another flag", () => {
    const r = bad("--scaffold-dir", "--dry-run");
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("--scaffold-dir needs a value");
  });
  test("--root with an empty value", () => {
    const r = bad("--root", "");
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("--root was given an empty value");
  });
  test("--scaffold-dir with an empty value", () => {
    const r = bad("--scaffold-dir", " ");
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("--scaffold-dir was given an empty value");
  });
  test("an unknown flag", () => {
    const r = bad("--nope");
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("unknown argument `--nope`");
  });
});

describe("guards that must be able to fire", () => {
  test("preflight: a .project-docs.json that is not valid JSON stops the run", () => {
    const root = fixtureO();
    writeFileSync(join(root, ".project-docs.json"), "{ not json");
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: .project-docs.json is not valid JSON");
    expect(r.out).toContain("Nothing was written.");
  });

  test("preflight: a .project-docs.json with a UTF-8 byte-order mark is named as such, not as a token JSON refuses", () => {
    const root = fixtureO();
    writeFileSync(join(root, ".project-docs.json"), `﻿${read(root, ".project-docs.json")}`);
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: .project-docs.json starts with a UTF-8 byte-order mark (BOM)");
    expect(r.out).toContain("Nothing was written.");
    expect(r.out).not.toContain("Unrecognized token");
  });

  for (const [rel, owner] of [
    [".project-docs.json", ".project-docs.json (v2.6-to-v2.7 writes it)"],
    ["docs/SCHEMA.md", "docs/SCHEMA.md (v2.6-to-v2.7 installs it)"],
    ["scripts/pdocs/cli.ts", "scripts/pdocs/cli.ts (v2.6-to-v2.7 installs it)"],
    [MANIFEST, "docs/.pdocs-seed.json (v2.8-to-v2.9 records it)"],
  ] as const)
    test(`preflight: a tree without ${rel} is not a v2.9 tree, and the stop names the migration that owns it`, () => {
      const root = fixtureO();
      rmSync(join(root, rel));
      commitAll(root, `without ${rel}`);
      const r = migrate(root);
      expect(r.exitCode).toBe(1);
      expect(r.out).toContain("STOPPED: this is not a v2.9 tree at");
      expect(r.out).toContain("1 of the four files a v2.9 tree has is missing");
      expect(r.out).toContain(owner);
      expect(r.out).toContain("Migrations run in sequence");
      expect(r.out).toContain("Nothing was written.");
    });

  test("preflight: a bare directory is missing all four, and every owner is named", () => {
    const r = migrate(tmp("migrate-v210-bare-"));
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("4 of the four files a v2.9 tree has are missing");
    expect(r.out).toContain("v2.6-to-v2.7");
    expect(r.out).toContain("v2.8-to-v2.9");
  });

  test("preflight: bun off PATH stops the run, even though the script itself is running under it", () => {
    const r = migrate(fixtureO(), [], { bun: Bun.which("bun") as string, env: { PATH: "/usr/bin:/bin" } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: bun is not on PATH");
  });

  test("preflight: cookiecutter missing with no --scaffold-dir stops the run", () => {
    const r = migrate(fixtureO(), [], { scaffold: null, env: { PATH: `${dirname(Bun.which("bun") as string)}:/usr/bin:/bin` } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: cookiecutter is not installed, and no --scaffold-dir");
  });

  test("preflight: an uncommitted edit to a path the run would write stops the run; --force writes over it", () => {
    const root = fixtureO();
    const rules = join(root, "scripts/pdocs/lint/rules.ts");
    const edited = `${read(root, "scripts/pdocs/lint/rules.ts")}\n// my uncommitted edit\n`;
    writeFileSync(rules, edited);
    writeFileSync(join(root, PLAYBOOK), `${read(root, PLAYBOOK)}\n## uncommitted\n`);
    writeFileSync(join(root, "notes.txt"), "dirt outside anything the run writes\n");
    const before = treeDigest(root);
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    // The template's uncommitted edit makes it keep-modified, so it is dirt the
    // run will not write and is not named; notes.txt is not written either.
    expect(r.out).toContain("STOPPED: 1 path(s) this run would write have uncommitted changes:");
    expect(r.out).toContain("       scripts/pdocs/lint/rules.ts");
    expect(r.out).not.toContain("       docs/playbooks/TEMPLATE.md");
    expect(r.out).toContain("Commit or stash them first — or pass --force");
    expect(r.out).toContain("Nothing was written.");
    expect(r.out).not.toContain("[2/7]");
    expect(treeDigest(root)).toEqual(before);

    const forced = migrate(root, ["--force"]);
    expect(forced.exitCode).toBe(0);
    expect(forced.out).toContain("· --force: writing over 1 uncommitted path(s) this run touches: scripts/pdocs/lint/rules.ts");
    expect(forced.out).toContain("· working tree is dirty (3 path(s))");
    expect(read(root, "scripts/pdocs/lint/rules.ts")).toBe(readFileSync(join(target(), "scripts/pdocs/lint/rules.ts"), "utf8"));
  });

  test("preflight: an uncommitted edit that leaves a recorded template matching its record is named — it would be written over", () => {
    // Committed with an edit, then the edit reverted but not committed: the
    // bytes match the record (update), git says dirty, and the run would write it.
    const root = variantEdited();
    writeFileSync(join(root, PLAYBOOK), readFileSync(join(generatedScaffolds().old, PLAYBOOK)));
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("       docs/playbooks/TEMPLATE.md");
  });

  test("preflight: a corrupt manifest stops the run, in seed.ts's own words", () => {
    const root = withFiles(fixtureO(), { [MANIFEST]: "{ not json" }, "corrupt manifest");
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: docs/.pdocs-seed.json is not valid JSON");
    expect(r.out).toContain("Delete it to start a fresh record");
  });

  test("preflight: a manifest that is not an object stops the run", () => {
    const root = withFiles(fixtureO(), { [MANIFEST]: "[]\n" }, "array manifest");
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: docs/.pdocs-seed.json must contain a JSON object");
  });

  test("preflight: a corrupt manifest is caught by the dirty-path computation too", () => {
    const root = fixtureO();
    writeFileSync(join(root, MANIFEST), "{ not json");
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: docs/.pdocs-seed.json is not valid JSON");
    expect(r.out).not.toContain("[2/7]");
  });

  test("scaffold: a --scaffold-dir that is not a generated project root stops the run", () => {
    const r = migrate(fixtureO(), [], { scaffold: tmp("migrate-v210-notroot-") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("is not a generated project root (expected docs/SCHEMA.md and scripts/pdocs/ inside it)");
  });

  test("scaffold: cookiecutter exiting non-zero stops the run", () => {
    const r = migrate(fixtureO(), [], { scaffold: null, env: { PATH: stubCookiecutter("fail") } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: cookiecutter failed (exit 3)");
    expect(r.out).toContain("stub cookiecutter: boom");
  });

  test("scaffold: more than one generated project stops the run", () => {
    const r = migrate(fixtureO(), [], { scaffold: null, env: { PATH: stubCookiecutter("two") } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("expected one generated project in");
    expect(r.out).toContain("found 2");
  });

  test("scaffold: a generated project missing SCHEMA.md or scripts/pdocs/ stops the run", () => {
    const r = migrate(fixtureO(), [], { scaffold: null, env: { PATH: stubCookiecutter("empty") } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("is missing docs/SCHEMA.md or scripts/pdocs/");
  });

  test("scaffold: a scaffold with no docs/README.md stops the run", () => {
    const r = migrate(fixtureO(), [], { scaffold: stubScaffold({ readme: null }) });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: the scaffold has no docs/README.md at");
  });

  test("scaffold: a scaffold with an unreadable version stops the run", () => {
    const r = migrate(fixtureO(), [], { scaffold: stubScaffold({ readme: "---\ndocs_version: not-a-version\n---\n" }) });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: could not read a version from the scaffold's docs/README.md");
  });

  test("scaffold: a scaffold older than this migration — rules.ts without the marker — stops in phase 2, in both modes, before anything is written", () => {
    const root = fixtureO();
    const before = treeDigest(root);
    for (const args of [["--dry-run"], []]) {
      const r = migrate(root, args, { scaffold: stubScaffold({ rulesMarker: false }) });
      expect(r.exitCode).toBe(1);
      expect(r.out).toContain("STOPPED: the scaffold at --scaffold-dir");
      expect(r.out).toContain("is older than this migration requires (release 9.9.9, missing scripts/pdocs/lint/rules.ts carrying `isSeeded`)");
      expect(r.out).toContain("Pass --scaffold-dir pointing at a");
      expect(r.out).toContain("Nothing was written.");
      expect(r.out).not.toContain("[3/7]");
    }
    expect(treeDigest(root)).toEqual(before);
  });

  test("scaffold: a scaffold whose SCHEMA.md lacks the exact-shape Seeded row is older than this migration", () => {
    const r = migrate(fixtureO(), [], { scaffold: stubScaffold({ schemaMarker: false }) });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("missing docs/SCHEMA.md naming `TEMPLATE-<variant>.md` in its Seeded row");
  });

  test("scaffold: the 8.0.0 scaffold itself — what the published template is until this releases — is refused", () => {
    const r = migrate(fixtureO(), [], { scaffold: generatedScaffolds().old });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("is older than this migration requires (release 8.0.0, missing scripts/pdocs/lint/rules.ts carrying `isSeeded` and docs/SCHEMA.md naming `TEMPLATE-<variant>.md` in its Seeded row)");
  });

  test("reconcile: a scaffold that ships no templates stops the run", () => {
    const r = migrate(fixtureO(), [], { scaffold: stubScaffold({ template: false }) });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: the scaffold ships no templates");
  });

  test("verify: a CLI that prints no envelope stops the run", () => {
    const r = migrate(fixtureO(), [], { scaffold: stubScaffold(), env: { CLI_CHECK_GARBAGE: "1" } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: `pdocs check` under the refreshed CLI printed nothing this script can read");
    expect(r.out).toContain("not an envelope");
  });

  test("verify: a tree the refreshed CLI rejects stops the run after the refresh, without a baseline to compare", () => {
    // The stub says 2 problems at exit 9; the tree's own old CLI gave the baseline (clean).
    const r = migrate(fixtureO(), [], { scaffold: stubScaffold(), env: { CLI_CHECK_EXIT: "9", CLI_CHECK_TOTAL: "2" } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: `pdocs check` exits 9 on the refreshed tree: 2 problem(s). Against the baseline the older lint reported (0): 2 new to the refreshed lint, 0 no longer reported, 0 unchanged.");
    expect(r.out).toContain("STUB PROBLEM 2");
  });

  test("verify: the stop's baseline sentence when the older lint reported some, and the newer one more", () => {
    // A bare workbench page the OLD lint already reports, beside the page it
    // hides: the baseline is 1, the refreshed lint says 4, and 3 are new.
    const root = withFiles(variantRealPage(), { "docs/backlog/2026-01-01-bare.md": "# Bare\n\nNo block.\n" }, "a bare page the old lint sees");
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("· `pdocs check` under the installed CLI: exit 9, 1 problem(s) — the baseline the verify phase compares against");
    expect(r.out).toContain("STOPPED: `pdocs check` exits 9 on the refreshed tree: 4 problem(s). Against the baseline the older lint reported (1): 3 new to the refreshed lint, 0 no longer reported, 1 unchanged.");
  });

  test("verify: the baseline sentence is a set difference, not a count difference", () => {
    // The old lint judges a recorded page the new lint skips (backlog/form.md,
    // recorded in the manifest, so the refreshed rule treats it as seeded),
    // while the new lint judges the page the old one hid. Baseline 1,
    // refreshed 3 — and NONE of the three were in the baseline. A count
    // difference would call two of them new and one "already there".
    const root = withManifest(
      withFiles(variantRealPage(), { "docs/backlog/form.md": "# A form\n\nNo block.\n" }, "a recorded non-template page"),
      (m) => (m.files["backlog/form.md"] = sha("# A form\n\nNo block.\n")),
      "recorded it"
    );
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("· `pdocs check` under the installed CLI: exit 9, 1 problem(s)");
    expect(r.out).toContain("STOPPED: `pdocs check` exits 9 on the refreshed tree: 3 problem(s). Against the baseline the older lint reported (1): 3 new to the refreshed lint, 1 no longer reported, 0 unchanged.");
    expect(r.out).not.toContain("2 of these are new");
  });

  test("verify: no baseline when the installed CLI cannot answer, and the stop says so", () => {
    const root = withFiles(fixtureO(), { "scripts/pdocs/cli.ts": "console.log('broken'); process.exit(1);\n" }, "a broken CLI");
    const r = migrate(root, [], { scaffold: stubScaffold(), env: { CLI_CHECK_EXIT: "9", CLI_CHECK_TOTAL: "1" } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("· `pdocs check` under the installed CLI printed nothing this script can read — no baseline");
    expect(r.out).toContain("The CLI before the refresh gave no baseline, so this script cannot say which of them are new");
  });

  test("the seam refuses a path outside the docs root", () => {
    const r = migrate(fixtureO(), [], { env: { PDOCS_MIGRATE_TEST_MUTATE: "../outside.md" } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: PDOCS_MIGRATE_TEST_MUTATE must name a path inside the docs root.");
  });

  test("an unexpected exception is still exit 1 with a named reason, not a stack trace", () => {
    // docs/SCHEMA.md as a DIRECTORY: the refresh phase's byte comparison throws
    // EISDIR where no guard expected it.
    const root = fixtureO();
    rmSync(join(root, "docs/SCHEMA.md"));
    write(root, { "docs/SCHEMA.md/inside.md": "a file inside what should be a file\n" });
    commitAll(root, "SCHEMA.md is a directory");
    const r = migrate(root, [], { scaffold: stubScaffold() });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: unexpected failure —");
    expect(r.out).not.toContain("    at ");
  });
});

// ─── The end-of-run invariants, and the wiring witnesses ─────────────────────

describe("the end-of-run invariants can fire", () => {
  test("a recorded template changed after the record — the seam — fails the run and names the ordering", () => {
    const r = migrate(fixtureO(), [], { env: { PDOCS_MIGRATE_TEST_MUTATE: "playbooks/TEMPLATE.md" } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: the migration's own invariants do not hold after this run:");
    expect(r.out).toContain("1 template(s) this run recorded no longer match the record:");
    expect(r.out).toContain("docs/playbooks/TEMPLATE.md");
    expect(r.out).toContain("the reconcile phase must be the last that touches a template's bytes, formatting included");
    expect(r.out).toContain("The tree may be partly migrated");
  });

  test("a manifest corrupted after the record is named", () => {
    // The real refreshed CLI reads the manifest and refuses a corrupt one at
    // the verify phase first; a CLI that does not read it lets the run reach
    // the end-of-run check, which is the guard under test here.
    const real = migrate(fixtureO(), [], { env: { PDOCS_MIGRATE_TEST_MUTATE: ".pdocs-seed.json" } });
    expect(real.exitCode).toBe(1);
    expect(real.out).toContain("STOPPED: `pdocs check` under the refreshed CLI printed nothing this script can read");
    const r = migrate(fixtureO(), [], { scaffold: stubScaffold(), env: { PDOCS_MIGRATE_TEST_MUTATE: ".pdocs-seed.json" } });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: the migration's own invariants do not hold after this run:");
    expect(r.out).toContain("docs/.pdocs-seed.json is not valid JSON");
    expect(r.out).toContain("the reconcile phase writes it whole");
  });
});

describe("wiring witnesses — each phase's call site, neutered", () => {
  test("phase 1 preflight: neutered, an uncommitted edit the intact script stops on is written over", () => {
    const intact = fixtureO();
    writeFileSync(join(intact, "scripts/pdocs/lint/rules.ts"), "// uncommitted\n");
    expect(migrate(intact).exitCode).toBe(1);
    expect(read(intact, "scripts/pdocs/lint/rules.ts")).toBe("// uncommitted\n");

    const root = fixtureO();
    writeFileSync(join(root, "scripts/pdocs/lint/rules.ts"), "// uncommitted\n");
    const r = migrate(root, [], { script: neutered("\n    preflight(ctx);\n") });
    expect(r.out).not.toContain("[1/7]");
    expect(r.exitCode).toBe(0);
    expect(read(root, "scripts/pdocs/lint/rules.ts")).toContain("isSeeded");
  });

  test("phase 2 scaffold: neutered, there is nothing to read a version from", () => {
    const r = migrate(fixtureO(), [], { script: neutered("\n    ctx.scaffoldDir = getScaffold(ctx);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("STOPPED: no scaffold to verify — the scaffold phase did not run");
  });

  test("phase 3 refresh: neutered, the invariant finds the old rules.ts and the old SCHEMA.md", () => {
    const r = migrate(fixtureO(), [], { script: neutered("\n    refreshOwned(ctx);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("scripts/pdocs/lint/rules.ts is missing or carries no `isSeeded` — the refresh phase installs the scaffold's");
    expect(r.out).toContain("docs/SCHEMA.md is missing or does not name `TEMPLATE-<variant>.md` — the refresh phase installs the scaffold's");
  });

  test("phase 4 reconcile: neutered, the invariant finds the record at the old release and a template never installed", () => {
    // Gate off, so the lint's own TEMPLATE MISSING does not end the run at the
    // verify phase before the end-of-run check can name the phase.
    const root = variantNeverHad();
    withFiles(root, { ".project-docs.json": read(root, ".project-docs.json").replace('"adopting": false', '"adopting": true') }, "gate off");
    const r = migrate(root, [], { script: neutered("\n    reconcileSeeded(ctx, templates, version);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("[5/7]");
    expect(r.out).toContain('docs/.pdocs-seed.json version is "8.0.0", not 9.9.9 — the reconcile phase records against the scaffold\'s release');
    expect(r.out).toContain("1 template(s) the scaffold ships are neither on disk nor recorded:");
    expect(r.out).toContain("docs/cycles/TEMPLATE.md");
    expect(r.out).toContain("the reconcile phase installs a template the tree never had");
  });

  test("phase 5 verify: neutered, the markers move on a red tree and the invariant catches it", () => {
    const root = variantRealPage();
    const r = migrate(root, [], { script: neutered("\n    verify(ctx);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("✓ docs/README.md set to 9.9.9");
    expect(r.out).toContain("`pdocs check` exits 9 on the migrated tree — the verify phase stops the run before the markers move");
    expect(docsVersionOf(join(root, "docs/README.md"))).toBe("9.9.9");
  });

  test("phase 6 version: neutered, both markers are found short of the scaffold's release", () => {
    const r = migrate(fixtureO(), [], { script: neutered("\n    bumpVersion(ctx, version);\n") });
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("docs/README.md docs_version is 8.0.0, not 9.9.9 — the version phase sets both markers together");
    expect(r.out).toContain('.project-docs.json version is "8.0.0", not 9.9.9 — the version phase sets both markers together');
  });

  test("phase 7 cleanup: neutered, the generated scaffold is found still on disk", () => {
    const r = migrate(fixtureO(), [], { script: neutered("\n    cleanup(ctx);\n"), scaffold: null, env: { PATH: stubCookiecutter("copy") } });
    const at = generatedAt(r);
    if (at) roots.push(resolve(at, ".."));
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("the generated scaffold is still on disk — the cleanup phase removes it");
  });
});

// ─── #167 — `.project-docs.json` keeps its bytes when only `version` moves ───

const BIOME_STYLE_CONFIG = `{
  "docsRoot": "docs",
  "version": "8.0.0",
  "lint": {
    "adopting": false,
    "exclude": [],
    "durable": ["architecture", "specifications", "interaction-design", "playbooks", "lessons-learned", "memories"],
    "workbench": ["backlog", "briefs", "investigations", "projects", "reports", "fragments", "cycles"],
    "skip": ["_archive"]
  }
}
`;

const changedLines = (before: string, after: string): Array<[number, string, string]> => {
  const a = before.split("\n");
  const b = after.split("\n");
  const out: Array<[number, string, string]> = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    if (a[i] !== b[i]) out.push([i, a[i] ?? "<none>", b[i] ?? "<none>"]);
  return out;
};

describe("#167 — .project-docs.json keeps its bytes when only `version` moves", () => {
  test("a Biome-style file, committed: the run changes the version line and no other", () => {
    const root = withFiles(fixtureO(), { ".project-docs.json": BIOME_STYLE_CONFIG }, "biome style");
    const r = migrate(root);
    expect(r.exitCode).toBe(0);
    expect(changedLines(BIOME_STYLE_CONFIG, read(root, ".project-docs.json"))).toEqual([
      [2, '  "version": "8.0.0",', '  "version": "9.9.9",'],
    ]);
    expect(r.out).toContain(".project-docs.json set to 9.9.9 — that one key; every other byte as it was");
  });

  test("a nested `version` key of the adopter's is left alone", () => {
    const cfg = readJson(join(fixtureO(), ".project-docs.json"));
    cfg.tooling = { version: "keep-me" };
    const root = withFiles(fixtureO(), { ".project-docs.json": `${JSON.stringify(cfg, null, 2)}\n` }, "nested version");
    expect(migrate(root).exitCode).toBe(0);
    const after = readJson(join(root, ".project-docs.json"));
    expect(after.version).toBe("9.9.9");
    expect(after.tooling.version).toBe("keep-me");
  });

  test("a README with no docs_version line is a `·`, and the invariant then fails the run", () => {
    const root = withFiles(fixtureO(), { "docs/README.md": "# Docs\n\nNo marker.\n" }, "no marker");
    const r = migrate(root);
    expect(r.exitCode).toBe(1);
    expect(r.out).toContain("· docs/README.md carries no docs_version line — nothing to set");
    expect(r.out).toContain("docs/README.md docs_version is (no line), not 9.9.9");
  });
});
