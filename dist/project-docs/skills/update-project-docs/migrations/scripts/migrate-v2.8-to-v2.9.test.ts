/**
 * The v2.9 migration.
 *
 * Two invariants here have each broken twice, in the guide shape this script
 * replaced, and they are why most of these tests exist:
 *
 *   - FORMAT BEFORE RECORD. A hash taken before a reformat is wrong for ever
 *     after, and the file it describes is silently opted out of the mechanism.
 *   - A GUARD MUST BE ABLE TO FIRE. Every failure path below asserts a non-zero
 *     exit, because the previous shape's checks echoed text and returned 0.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { manifestMatchesDisk } from "./migrate-v2.8-to-v2.9.ts";

const SCRIPT = join(import.meta.dir, "migrate-v2.8-to-v2.9.ts");
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

/**
 * A stub CLI answering only the two questions the verify phase asks: `check`
 * must exit 0 and an unknown `--type` must exit 2. `CLI_CHECK_EXIT` lets a test
 * make the real check fail, so the verify phase itself is exercised rather than
 * assumed.
 */
const STUB_CLI = `const a = process.argv.slice(2);
if (a[0] === "check") process.exit(Number(process.env.CLI_CHECK_EXIT ?? 0));
if (a[0] === "find") process.exit(2);
process.exit(0);
`;

/** A stand-in for a generated scaffold: only the parts the script reads. */
function scaffold(version = "9.9.9"): string {
  const s = tmp("mig29-scaffold-");
  write(s, {
    "docs/SCHEMA.md":
      "# Schema\n\n## Who owns which file\n\n## Declaring your own folder\n",
    "docs/README.md": `---\ndocs_version: "${version}" # x-release-please-version\n---\n\n# Documentation\n`,
    "scripts/pdocs/seed.ts": "export const MARKER = 'seed';\n",
    "scripts/pdocs/cli.ts": STUB_CLI,
  });
  return s;
}

function project(
  files: Record<string, string>,
  config: Record<string, unknown> = {}
): string {
  const p = tmp("mig29-proj-");
  write(p, {
    ".project-docs.json": `${JSON.stringify(
      { docsRoot: "docs", version: "7.0.0", lint: {}, ...config },
      null,
      2
    )}\n`,
    "docs/README.md": '---\ndocs_version: "7.0.0"\n---\n\n# Docs\n',
    ...files,
  });
  return p;
}

const run = (root: string, sc: string, ...args: string[]) =>
  Bun.spawnSync(
    ["bun", SCRIPT, "--root", root, "--scaffold", sc, "--skip-format", ...args],
    { stdout: "pipe", stderr: "pipe" }
  );

const out = (r: ReturnType<typeof run>) =>
  r.stdout.toString() + r.stderr.toString();

const manifest = (root: string) =>
  JSON.parse(readFileSync(join(root, "docs/.pdocs-seed.json"), "utf8")) as {
    version: string | null;
    files: Record<string, string>;
  };

const TPL = { "docs/playbooks/TEMPLATE.md": "their playbook template\n" };

describe("adoption", () => {
  test("records the project's own bytes, not the scaffold's", () => {
    const p = project({
      ...TPL,
      "docs/projects/TEMPLATES/PLAN.template.md": "theirs too\n",
      "docs/playbooks/a-real-playbook.md": "not a template\n",
    });
    expect(run(p, scaffold()).exitCode).toBe(0);

    const m = manifest(p);
    expect(Object.keys(m.files).sort()).toEqual([
      "playbooks/TEMPLATE.md",
      "projects/TEMPLATES/PLAN.template.md",
    ]);
    expect(m.files["playbooks/TEMPLATE.md"]).toBe(
      createHash("sha256").update("their playbook template\n").digest("hex")
    );
  });

  test("a template named YYYY-MM-DD-TEMPLATE-* is recorded", () => {
    // The prefix-matching predicate skipped exactly these.
    const p = project({
      "docs/reports/YYYY-MM-DD-TEMPLATE-report.md": "x\n",
      "docs/investigations/YYYY-MM-DD-TEMPLATE-investigation.md": "y\n",
    });
    expect(run(p, scaffold()).exitCode).toBe(0);
    expect(Object.keys(manifest(p).files).sort()).toEqual([
      "investigations/YYYY-MM-DD-TEMPLATE-investigation.md",
      "reports/YYYY-MM-DD-TEMPLATE-report.md",
    ]);
  });

  test("a template under _archive/ is the adopter's history, not ours", () => {
    const p = project({
      ...TPL,
      "docs/backlog/_archive/TEMPLATE.md": "archived\n",
    });
    run(p, scaffold());
    expect(Object.keys(manifest(p).files)).toEqual(["playbooks/TEMPLATE.md"]);
  });
});

describe("guards that must be able to fire", () => {
  test("zero templates stops the run", () => {
    // The predecessor counted `": "` occurrences, which matched the manifest's
    // own `version` line — so an empty manifest reported 1 and passed.
    const p = project({ "docs/playbooks/a-playbook.md": "no templates here\n" });
    const r = run(p, scaffold());
    expect(r.exitCode).toBe(1);
    expect(out(r)).toContain("found 0 templates");
  });

  test("a stale recorded hash stops a re-run, and names the file", () => {
    const p = project(TPL);
    expect(run(p, scaffold()).exitCode).toBe(0);
    writeFileSync(join(p, "docs/playbooks/TEMPLATE.md"), "changed after adoption\n");

    const r = run(p, scaffold());
    expect(r.exitCode).toBe(1);
    expect(out(r)).toContain("playbooks/TEMPLATE.md");
    expect(out(r)).toContain("--re-adopt");
  });

  test("--re-adopt makes the current bytes the baseline", () => {
    const p = project(TPL);
    run(p, scaffold());
    writeFileSync(join(p, "docs/playbooks/TEMPLATE.md"), "changed\n");
    expect(run(p, scaffold(), "--re-adopt").exitCode).toBe(0);
    expect(manifest(p).files["playbooks/TEMPLATE.md"]).toBe(
      createHash("sha256").update("changed\n").digest("hex")
    );
    expect(run(p, scaffold()).exitCode).toBe(0); // clean again
  });

  test("a tree that is not a project-docs tree stops the run", () => {
    const r = run(tmp("mig29-bare-"), scaffold());
    expect(r.exitCode).toBe(1);
    expect(out(r)).toContain("not a project-docs tree");
  });

  test("a scaffold older than v2.9 stops the run", () => {
    const old = tmp("mig29-oldscaffold-");
    write(old, {
      "docs/SCHEMA.md": "# Schema\n",       // no ownership section
      "docs/README.md": '---\ndocs_version: "8.0.0"\n---\n',
      "scripts/pdocs/seed.ts": "x\n",
      "scripts/pdocs/cli.ts": STUB_CLI,
    });
    const r = run(project(TPL), old);
    expect(r.exitCode).toBe(1);
    expect(out(r)).toContain("older than v2.9");
  });

  test("a bad invocation exits 2, not 1", () => {
    const bad = Bun.spawnSync(["bun", SCRIPT, "--root"], { stdout: "pipe", stderr: "pipe" });
    expect(bad.exitCode).toBe(2);
    const unknown = Bun.spawnSync(["bun", SCRIPT, "--nope"], { stdout: "pipe", stderr: "pipe" });
    expect(unknown.exitCode).toBe(2);
  });
});

describe("idempotence and dry run", () => {
  test("a second run verifies rather than rewriting", () => {
    const p = project(TPL);
    run(p, scaffold());
    const first = readFileSync(join(p, "docs/.pdocs-seed.json"), "utf8");
    const r = run(p, scaffold());
    expect(r.exitCode).toBe(0);
    expect(out(r)).toContain("every recorded hash still matches");
    expect(readFileSync(join(p, "docs/.pdocs-seed.json"), "utf8")).toBe(first);
  });

  test("--dry-run changes nothing at all", () => {
    const p = project(TPL);
    const before = readFileSync(join(p, ".project-docs.json"), "utf8");
    const r = run(p, scaffold(), "--dry-run");
    expect(r.exitCode).toBe(0);
    expect(out(r)).toContain("would record 1 template");
    expect(() => manifest(p)).toThrow();
    expect(readFileSync(join(p, ".project-docs.json"), "utf8")).toBe(before);
  });
});

describe("version markers", () => {
  test("both are set from the scaffold", () => {
    const p = project(TPL);
    expect(run(p, scaffold("9.9.9")).exitCode).toBe(0);
    expect(JSON.parse(readFileSync(join(p, ".project-docs.json"), "utf8")).version).toBe("9.9.9");
    expect(readFileSync(join(p, "docs/README.md"), "utf8")).toContain('docs_version: "9.9.9"');
  });

  test("a nested `version` key of the adopter's is left alone", () => {
    // `.project-docs.json` is classified THEIRS. A line-based substitution
    // rewrote every `"version":` in the file, nested keys included.
    const p = project(TPL, { tooling: { version: "keep-me" } });
    expect(run(p, scaffold("9.9.9")).exitCode).toBe(0);
    const cfg = JSON.parse(readFileSync(join(p, ".project-docs.json"), "utf8"));
    expect(cfg.version).toBe("9.9.9");
    expect(cfg.tooling.version).toBe("keep-me");
  });

  test("a scaffold with an unreadable version stops the run", () => {
    const bad = tmp("mig29-badver-");
    write(bad, {
      "docs/SCHEMA.md": "## Who owns which file\n## Declaring your own folder\n",
      "docs/README.md": "---\ndocs_version: not-a-version\n---\n",
      "scripts/pdocs/seed.ts": "x\n",
      "scripts/pdocs/cli.ts": STUB_CLI,
    });
    const r = run(project(TPL), bad);
    expect(r.exitCode).toBe(1);
    expect(out(r)).toContain("could not read a version");
  });
});

describe("the verify phase can fail", () => {
  test("a tree the refreshed CLI rejects stops the run", () => {
    const p = project(TPL);
    const r = Bun.spawnSync(
      ["bun", SCRIPT, "--root", p, "--scaffold", scaffold(), "--skip-format"],
      { stdout: "pipe", stderr: "pipe", env: { ...process.env, CLI_CHECK_EXIT: "9" } }
    );
    expect(r.exitCode).toBe(1);
    expect(r.stdout.toString() + r.stderr.toString()).toContain("`pdocs check` exits 9");
  });
});

describe("the format-before-record invariant checks itself", () => {
  test("manifestMatchesDisk names a template changed after recording", () => {
    const p = project(TPL);
    expect(run(p, scaffold()).exitCode).toBe(0);
    expect(manifestMatchesDisk(join(p, "docs"))).toEqual([]);

    // Exactly what formatting-after-recording does to a recorded file.
    writeFileSync(join(p, "docs/playbooks/TEMPLATE.md"), "reformatted\n");
    expect(manifestMatchesDisk(join(p, "docs"))).toEqual(["playbooks/TEMPLATE.md"]);
  });

  test("a deleted recorded template is named too", () => {
    const p = project(TPL);
    run(p, scaffold());
    rmSync(join(p, "docs/playbooks/TEMPLATE.md"));
    expect(manifestMatchesDisk(join(p, "docs"))).toEqual(["playbooks/TEMPLATE.md"]);
  });

  test("no manifest is not a mismatch", () => {
    expect(manifestMatchesDisk(join(project(TPL), "docs"))).toEqual([]);
  });
});

describe("guards that had no witness", () => {
  test("the self-check is WIRED, not merely exported", () => {
    // Reviewer A neutered the call site in `main` with `if (false)` and the
    // suite stayed green: three tests called manifestMatchesDisk directly and
    // none proved it ran. The seam corrupts a recorded file after adoption, so
    // only a wired check can catch it.
    const p = project(TPL);
    const r = Bun.spawnSync(
      ["bun", SCRIPT, "--root", p, "--scaffold", scaffold(), "--skip-format"],
      {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PDOCS_MIGRATE_TEST_MUTATE: "playbooks/TEMPLATE.md" },
      }
    );
    expect(r.exitCode).toBe(1);
    const o = r.stdout.toString() + r.stderr.toString();
    expect(o).toContain("does not match the files on disk");
    expect(o).toContain("playbooks/TEMPLATE.md");
  });

  test("the README marker distinguishes absent from already-correct", () => {
    // Two questions, one string comparison: the historic bug reported "no
    // docs_version line" for a line that was present and already right.
    const already = project(TPL);          // its README holds docs_version "7.0.0"
    const a = run(already, scaffold("7.0.0"));
    expect(a.exitCode).toBe(0);
    expect(out(a)).toContain("already at 7.0.0");

    const none = project(TPL);
    writeFileSync(join(none, "docs/README.md"), "# Docs\n"); // no frontmatter at all
    const b = run(none, scaffold("7.0.0"));
    expect(b.exitCode).toBe(0);
    expect(out(b)).toContain("carries no docs_version line");
  });

  test("a template added after adoption is reported, not silently orphaned", () => {
    const p = project(TPL);
    expect(run(p, scaffold()).exitCode).toBe(0);
    mkdirSync(join(p, "docs/backlog"), { recursive: true });
    writeFileSync(join(p, "docs/backlog/TEMPLATE.md"), "added later\n");

    const r = run(p, scaffold());
    expect(r.exitCode).toBe(1);
    expect(out(r)).toContain("in no manifest");
    expect(out(r)).toContain("backlog/TEMPLATE.md");

    expect(run(p, scaffold(), "--re-adopt").exitCode).toBe(0);
    expect(Object.keys(manifest(p).files).sort()).toEqual([
      "backlog/TEMPLATE.md",
      "playbooks/TEMPLATE.md",
    ]);
  });

  test("the manifest records the version being migrated TO", () => {
    // It read `.project-docs.json` at step 5, two phases before step 7 rewrote
    // it — so a 7.0.0 -> 9.9.9 migration recorded 7.0.0, while the cookiecutter
    // hook records the new version for the same field.
    const p = project(TPL);                 // .project-docs.json version 7.0.0
    expect(run(p, scaffold("9.9.9")).exitCode).toBe(0);
    expect(manifest(p).version).toBe("9.9.9");
  });

  test("a missing formatter stops the run rather than continuing unformatted", () => {
    // Degrading to a note at exit 0 produces a manifest the project's own
    // formatter invalidates on its next commit.
    const p = project(TPL);
    const r = Bun.spawnSync(["bun", SCRIPT, "--root", p, "--scaffold", scaffold()], {
      stdout: "pipe",
      stderr: "pipe",
      // bun must stay reachable (it runs the script); only npx is removed.
      // bun and sh must stay reachable; only the Node/npx directory is removed.
      env: {
        ...process.env,
        PATH: `${dirname(Bun.which("bun") ?? "/bin/bun")}:/usr/bin:/bin`,
      },
    });
    expect(r.exitCode).toBe(1);
    expect(r.stdout.toString() + r.stderr.toString()).toContain("--skip-format");
  });

  test("--root with an empty value is refused, not resolved to cwd", () => {
    const r = Bun.spawnSync(["bun", SCRIPT, "--root", "", "--skip-format"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(r.exitCode).toBe(2);
  });

  test("--scaffold-dir is accepted, matching the other migration scripts", () => {
    const p = project(TPL);
    const r = Bun.spawnSync(
      ["bun", SCRIPT, "--root", p, "--scaffold-dir", scaffold(), "--skip-format"],
      { stdout: "pipe", stderr: "pipe" }
    );
    expect(r.exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------
// #167 — `.project-docs.json` is theirs: a run that moves `version` moves that
// one line and nothing else. The file used to come back re-serialised in the
// script's own style, so a Biome-formatted file (short arrays on one line)
// failed the adopter's own gate one commit after it had been formatted.
// ---------------------------------------------------------------------------------------

/** The file as Biome leaves it: 2-space, short arrays collapsed. */
const BIOME_STYLE_CONFIG = `{
  "docsRoot": "docs",
  "version": "7.0.0",
  "lint": {
    "adopting": false,
    "exclude": [],
    "skip": ["_archive", "superpowers"]
  }
}
`;

/** The lines that differ between two texts, as [index, before, after]. */
const changedLines = (before: string, after: string): Array<[number, string, string]> => {
  const a = before.split("\n");
  const b = after.split("\n");
  const out: Array<[number, string, string]> = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    if (a[i] !== b[i]) out.push([i, a[i] ?? "<none>", b[i] ?? "<none>"]);
  return out;
};

describe("#167 — .project-docs.json keeps its bytes when only `version` moves", () => {
  test("a Biome-style file: the run changes the version line and no other", () => {
    const p = project({ ...TPL, ".project-docs.json": BIOME_STYLE_CONFIG });
    const cfgPath = join(p, ".project-docs.json");
    const r = run(p, scaffold("9.9.9"));
    expect(r.exitCode).toBe(0);
    const after = readFileSync(cfgPath, "utf8");
    expect(changedLines(BIOME_STYLE_CONFIG, after)).toEqual([
      [2, '  "version": "7.0.0",', '  "version": "9.9.9",'],
    ]);
    expect(after).toContain('"skip": ["_archive", "superpowers"]');
    expect(out(r)).toContain(".project-docs.json set to 9.9.9 — that one key; every other byte as it was");
  });

  test("a file already at the release is not written at all", () => {
    const text = `${JSON.stringify({ docsRoot: "docs", version: "9.9.9", lint: {} }, null, 4)}\n`;
    const p = project({ ...TPL, ".project-docs.json": text });
    const cfgPath = join(p, ".project-docs.json");
    const r = run(p, scaffold("9.9.9"));
    expect(r.exitCode).toBe(0);
    expect(readFileSync(cfgPath, "utf8")).toBe(text);
    expect(out(r)).toContain(".project-docs.json already at 9.9.9");
  });

  test("when the key cannot be patched in place the file is re-serialised, the phase says so, and the indent is kept", () => {
    // No top-level `version` at all: nothing to patch, so the phase adds the
    // key by re-serialising — in the file's own indent, and saying so.
    const text = `{\n    "docsRoot": "docs",\n    "lint": {}\n}\n`;
    const p = project({ ...TPL, ".project-docs.json": text });
    const cfgPath = join(p, ".project-docs.json");
    const r = run(p, scaffold("9.9.9"));
    expect(r.exitCode).toBe(0);
    expect(out(r)).toContain(
      '.project-docs.json set to 9.9.9 — re-serialised, indent kept: no top-level "version" to patch in place'
    );
    const after = readFileSync(cfgPath, "utf8");
    expect(JSON.parse(after).version).toBe("9.9.9");
    expect(after.startsWith('{\n    "docsRoot"')).toBe(true);
  });
});
