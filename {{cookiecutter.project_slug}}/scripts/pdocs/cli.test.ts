// The CLI's own contract: format resolution, the envelope, and the exit codes.
//
// `lint/golden.test.ts` guards the TEXT rendering, byte for byte, against
// transcripts recorded before this CLI existed. This file covers everything
// that is new — the JSON envelope, the codes a caller branches on, and the
// refusal to guess when the invocation is wrong — by spawning the real process,
// because an exit code is not observable any other way.

import { afterAll, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DEFAULT_CONFIG } from "../docs-lint/config.ts";
import { ExitCode, Outcome, UsageError, resolveFormat } from "./envelope.ts";
import { childEnv } from "./test-env.ts";
import { buildRegistry } from "./lint/registry.ts";

const REPO_ROOT = resolve(import.meta.dir, "../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");
const SCHEMA = readFileSync(join(REPO_ROOT, "docs/SCHEMA.md"), "utf8");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function run(args: string[], cwd = REPO_ROOT) {
  const p = Bun.spawnSync(["bun", CLI, ...args], { cwd, env: childEnv() });
  return {
    code: p.exitCode,
    stdout: p.stdout.toString(),
    stderr: p.stderr.toString(),
  };
}

/**
 * Every template the registry declares, as a stub.
 *
 * `templateProblems` checks that a project-docs tree holds the templates its
 * registry names, so a fixture without them is not a minimal tree — it is a
 * tree with nineteen problems nobody meant to assert. Derived from the registry
 * rather than listed, so adding a type does not turn every fixture here red.
 * The stubs are inert on every tier: `isTemplate` skips them by name.
 */
function templateStubs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of buildRegistry(DEFAULT_CONFIG)) {
    if (row.template === null || row.externalTemplate) continue;
    for (const rel of [row.template].flat())
      out[rel] = "# A Template\n\nA stub. Every tier skips it by name.\n";
  }
  return out;
}

/**
 * A fixture repository. `config` is merged over the defaults, so a test that
 * cares about `lint.adopting` says only that.
 */
function tree(
  files: Record<string, string>,
  config: Record<string, unknown> | null = {}
): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-cli-"));
  roots.push(root);

  if (config !== null)
    writeFileSync(
      join(root, ".project-docs.json"),
      `${JSON.stringify(
        {
          docsRoot: "docs",
          version: "1.0.0",
          lint: {
            adopting: false,
            exclude: [],
            durable: [
              "architecture",
              "specifications",
              "interaction-design",
              "playbooks",
              "lessons-learned",
              "memories",
            ],
            workbench: [
              "backlog",
              "briefs",
              "investigations",
              "projects",
              "reports",
              "fragments",
              "cycles",
            ],
            skip: ["_archive", "superpowers"],
          },
          ...config,
        },
        null,
        2
      )}\n`
    );

  for (const [rel, body] of Object.entries({ ...templateStubs(), ...files })) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  // Empty repo, so `trackedMarkdown` cannot wander into whatever checkout the
  // temp directory happens to live inside. Same reasoning as the golden test.
  Bun.spawnSync(["git", "init", "-q"], { cwd: root });
  return root;
}

const INDEX = `---
type: index
title: Fixture Catalog
description: The catalog for the CLI fixture.
status: stable
tags: [fixture]
generated: { by: cli-test, at: 2026-01-01 }
---

# Fixture Catalog
`;

const CLEAN = { "docs/SCHEMA.md": SCHEMA, "docs/index.md": INDEX };

/** One problem, in a workbench folder, of a class every tier agrees about. */
const DIRTY = {
  ...CLEAN,
  "docs/projects/x/proposal.md": `---
type: proposal
title: X
description: A proposal whose lifecycle is outside its vocabulary.
status: draft
lifecycle: shipped
generated: { by: cli-test, at: 2026-01-01 }
---

# X
`,
};

// ---------------------------------------------------------------------------------------

describe("resolveFormat", () => {
  test("an explicit --format wins over the terminal", () => {
    expect(resolveFormat(["--format", "json"], true)).toBe("json");
    expect(resolveFormat(["--format", "text"], false)).toBe("text");
  });

  test("--json is shorthand for --format json", () => {
    expect(resolveFormat(["--json"], true)).toBe("json");
  });

  test("without a flag the pipe decides", () => {
    expect(resolveFormat([], true)).toBe("text");
    expect(resolveFormat([], false)).toBe("json");
  });

  test("a --format it does not know is a usage error naming the value", () => {
    expect(() => resolveFormat(["--format", "yaml"], true)).toThrow(UsageError);
    expect(() => resolveFormat(["--format", "yaml"], true)).toThrow("`yaml`");
  });

  test("--format with no value is a usage error", () => {
    expect(() => resolveFormat(["--format"], true)).toThrow(
      "--format needs a value"
    );
    expect(() => resolveFormat(["--format", "--root"], true)).toThrow(
      "--format needs a value"
    );
  });
});

describe("pdocs check", () => {
  test("a clean tree exits 0 and says so in the envelope", () => {
    const { code, stdout, stderr } = run([
      "check",
      "--format",
      "json",
      "--root",
      tree(CLEAN),
    ]);
    expect(code).toBe(ExitCode.Success);
    expect(stderr).toBe("");

    const out = JSON.parse(stdout);
    expect(out.ok).toBe(true);
    expect(out.command).toBe("check");
    expect(out.data.clean).toBe(true);
    expect(out.data.adopting).toBe(false);
    expect(out.data.problems).toEqual([]);
    expect(out.data.total).toBe(0);
  });

  test("a dirty tree exits 9 with ok: true — an outcome, not an error", () => {
    const { code, stdout } = run([
      "check",
      "--format",
      "json",
      "--root",
      tree(DIRTY),
    ]);
    expect(code).toBe(Outcome.Dirty);

    const out = JSON.parse(stdout);
    // The run SUCCEEDED. `ok` is about the invocation; `clean` is the answer,
    // and conflating them is the mistake the envelope exists to prevent.
    expect(out.ok).toBe(true);
    expect(out.data.clean).toBe(false);
    expect(out.data.total).toBe(1);
    expect(out.data.problems).toHaveLength(1);
    expect(out.data.problems[0].tier).toBe("workbench");
    expect(out.data.problems[0].message).toContain("BAD LIFECYCLE");
  });

  test("`lint.adopting` turns a dirty tree into exit 0, and stays visible", () => {
    const root = tree(DIRTY, {
      lint: {
        adopting: true,
        exclude: [],
        durable: [
          "architecture",
          "specifications",
          "interaction-design",
          "playbooks",
          "lessons-learned",
          "memories",
        ],
        workbench: [
          "backlog",
          "briefs",
          "investigations",
          "projects",
          "reports",
          "fragments",
          "cycles",
        ],
        skip: ["_archive", "superpowers"],
      },
    });

    const { code, stdout } = run(["check", "--format", "json", "--root", root]);
    expect(code).toBe(ExitCode.Success);

    const out = JSON.parse(stdout);
    // Exit 0 and `clean: false` together. A caller that only reads the status
    // cannot tell this from a clean tree — which is why `adopting` is on the
    // envelope rather than implied by the code.
    expect(out.data.adopting).toBe(true);
    expect(out.data.clean).toBe(false);
    expect(out.data.total).toBe(1);
  });

  test("the text and JSON renderings report the same problems", () => {
    const root = tree(DIRTY);
    const text = run(["check", "--format", "text", "--root", root]);
    const json = JSON.parse(
      run(["check", "--format", "json", "--root", root]).stdout
    );
    for (const p of json.data.problems)
      expect(text.stdout).toContain(p.message);
    expect(text.code).toBe(json.data.clean ? 0 : Outcome.Dirty);
  });

  test("with no --format and no terminal it renders JSON", () => {
    // `Bun.spawnSync` gives the child a pipe, which is the whole point: this is
    // what an agent, a `$(...)` and a CI step all see.
    const { stdout } = run(["check", "--root", tree(CLEAN)]);
    expect(JSON.parse(stdout).command).toBe("check");
  });
});

describe("pdocs report and graph", () => {
  test("report always exits 0 and carries its lines", () => {
    const { code, stdout } = run([
      "report",
      "--format",
      "json",
      "--root",
      tree(DIRTY),
    ]);
    expect(code).toBe(ExitCode.Success);
    const out = JSON.parse(stdout);
    expect(out.command).toBe("report");
    expect(Array.isArray(out.data.lines)).toBe(true);
  });

  test("graph --format json is enveloped like every other command", () => {
    // It was not, until Phase 5: it emitted `DocsLintReport` raw, for parity
    // with a `bun docs/lint.ts --json` that had no consumers. See the header of
    // `commands/graph.ts` for why that parity was dropped.
    const { code, stdout } = run([
      "graph",
      "--format",
      "json",
      "--root",
      tree(CLEAN),
    ]);
    expect(code).toBe(ExitCode.Success);
    const out = JSON.parse(stdout);
    expect(out.ok).toBe(true);
    expect(out.command).toBe("graph");
    // `index.md` only. SCHEMA.md is a contract page — a document ABOUT the
    // tree — and `collectPages` skips it, where the lint's graph tier counted
    // it as a node.
    expect(out.data.pages).toBe(1);
  });

  test("graph in text mode summarises rather than dumping", () => {
    const { code, stdout } = run([
      "graph",
      "--format",
      "text",
      "--root",
      tree(CLEAN),
    ]);
    expect(code).toBe(ExitCode.Success);
    expect(stdout).toContain("pages");
    expect(stdout).not.toContain('"nodes"');
  });
});

describe("a tree that is not one", () => {
  test("no .project-docs.json exits 5", () => {
    const { code, stdout, stderr } = run([
      "check",
      "--format",
      "json",
      "--root",
      tree(CLEAN, null),
    ]);
    expect(code).toBe(ExitCode.NotFound);
    // stdout stays parseable — a pipeline reading it sees nothing, not garbage.
    expect(stdout).toBe("");
    expect(JSON.parse(stderr).error.kind).toBe("not_found");
    expect(JSON.parse(stderr).ok).toBe(false);
  });

  test("a docsRoot that points nowhere exits 5", () => {
    const root = tree({}, { docsRoot: "documentation" });
    const { code, stderr } = run(["check", "--root", root]);
    expect(code).toBe(ExitCode.NotFound);
    expect(stderr).toContain("no docs root");
  });
});

describe("a bad invocation names the token", () => {
  test("an unknown command", () => {
    const { code, stdout, stderr } = run(["frobnicate"]);
    expect(code).toBe(ExitCode.Usage);
    expect(stdout).toBe("");
    expect(stderr).toContain("frobnicate");
  });

  test("an unknown flag on a known command", () => {
    const { code, stderr } = run(["check", "--nonsense"]);
    expect(code).toBe(ExitCode.Usage);
    expect(stderr).toContain("--nonsense");
  });

  test("an unknown value for --format", () => {
    const { code, stderr } = run(["check", "--format", "yaml"]);
    expect(code).toBe(ExitCode.Usage);
    expect(stderr).toContain("yaml");
  });

  test("an argument no command takes", () => {
    const { code, stderr } = run(["check", "extra"]);
    expect(code).toBe(ExitCode.Usage);
    expect(stderr).toContain("extra");
  });

  test("a flag where a command belongs", () => {
    const { code, stderr } = run(["--nope"]);
    expect(code).toBe(ExitCode.Usage);
    expect(stderr).toContain("--nope");
  });

  test("a bare invocation is a usage error, with the help on stderr", () => {
    const { code, stdout, stderr } = run([]);
    expect(code).toBe(ExitCode.Usage);
    expect(stdout).toBe("");
    expect(stderr).toContain("pdocs <command>");
  });
});

describe("help and version", () => {
  test("--help is prose even through a pipe", () => {
    // The one exception to the TTY heuristic: the grammar is
    // `pdocs help [--json]`, so a human piping help into a pager still gets
    // help. Every command that produces an ANSWER follows the heuristic.
    const { code, stdout } = run(["--help"]);
    expect(code).toBe(ExitCode.Success);
    expect(stdout).toContain("Usage");
    expect(stdout).toContain("Exit codes");
  });

  test("help --json is the machine manifest", () => {
    const { code, stdout } = run(["help", "--json"]);
    expect(code).toBe(ExitCode.Success);
    const out = JSON.parse(stdout);
    expect(out.ok).toBe(true);
    expect(out.command).toBe("help");
    expect(out.data.commands.map((c: { name: string }) => c.name)).toEqual([
      "check",
      "report",
      "graph",
      "find",
      "backlinks",
      "orphans",
      "new",
    ]);
    expect(out.data.exitCodes["9"]).toContain("dirty");
  });

  test("help for one command", () => {
    const { stdout } = run(["check", "--help"]);
    expect(stdout).toContain("pdocs check");
    expect(stdout).toContain("--root");
  });

  test("--version prints an embedded semver, with no package.json needed", () => {
    // Embedded deliberately: an install into an existing project has no
    // package.json of ours, and the host's version is not our version.
    const { code, stdout } = run(["--version"]);
    expect(code).toBe(ExitCode.Success);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("stdout survives a real pipe", () => {
  // THE DECLARED PRIMARY CONSUMER PATH. `resolveFormat` renders JSON precisely
  // BECAUSE stdout is not a terminal, so every large machine-readable answer
  // this CLI produces leaves through a pipe — and a pipe is where an output
  // path that does not finish its writes loses the tail. `cli.ts` used to read
  // `process.stdout.isTTY`, which materializes an asynchronous stream over
  // fd 1 and re-routes `console.log` through it; the queued remainder was
  // dropped at exit. `graph --format json` over this repository was 77757 bytes
  // to a file and exactly 65536 through a pipe, cut mid-string, exit 0.
  // `stdoutIsTerminal` in `cli.ts` carries the full mechanism.
  //
  // THE PIPE HAS TO BE REAL. `Bun.spawnSync` with a piped stdout is drained by
  // the parent as the child writes, which hides the bug entirely — the tests
  // above all use it and all passed throughout. A shell pipeline into `cat` is
  // what an agent, a `|` and a `$(...)` actually build, so these run
  // `sh -c 'bun cli.ts … | cat'` and assert on what comes out the far end.

  /**
   * A tree whose machine output exceeds one 64 KiB pipe buffer.
   *
   * Page COUNT is what drives it — `graph` emits identity and edges per node,
   * not prose — so the size comes from 400 documents rather than from long
   * ones. `lifecycle: shipped` is outside the proposal vocabulary, giving every
   * page one problem, which is what makes `check`'s output large too.
   */
  function bigTree(): string {
    const files: Record<string, string> = { ...CLEAN };
    const filler = "Nine tenths of a sentence, repeated to fill a buffer. ".repeat(6);
    for (let i = 0; i < 400; i++) {
      const n = String(i).padStart(3, "0");
      files[`docs/projects/p-${n}/proposal.md`] = `---
type: proposal
title: Proposal ${n}
description: ${filler}
status: draft
lifecycle: shipped
tags: [fixture, bulk]
generated: { by: cli-test, at: 2026-01-01 }
---

# Proposal ${n}
`;
    }
    return tree(files);
  }

  /** The CLI's stdout through a genuine shell pipe. */
  function piped(args: string[]): { code: number | null; stdout: string } {
    const p = Bun.spawnSync(
      [
        "sh",
        "-c",
        // `${PIPESTATUS[0]}` is a bashism; `sh` is dash on some systems. The
        // CLI's own status is not what this test is about, so `cat` closes the
        // pipeline and the assertion is on the bytes.
        `exec bun ${JSON.stringify(CLI)} ${args.map((a) => JSON.stringify(a)).join(" ")} | cat`,
      ],
      { cwd: REPO_ROOT, env: childEnv() }
    );
    return { code: p.exitCode, stdout: p.stdout.toString() };
  }

  const root = bigTree();

  test("graph --format json is parseable past the 64 KiB pipe buffer", () => {
    const { stdout } = piped(["graph", "--format", "json", "--root", root]);
    const out = JSON.parse(stdout);
    expect(out.command).toBe("graph");
    // The failure this guards is a SHORT read, so the fixture has to be able to
    // produce one. A truncated read is exactly 65536 bytes; this assertion is
    // what stops the fixture from being shrunk under the buffer, which would
    // leave a test that passes and proves nothing.
    expect(stdout.length).toBeGreaterThan(65536);
  });

  test("find and check survive the same pipe", () => {
    for (const args of [
      ["find", "--type", "proposal", "--format", "json", "--root", root],
      ["check", "--format", "json", "--root", root],
    ]) {
      const { stdout } = piped(args);
      expect(() => JSON.parse(stdout)).not.toThrow();
      expect(stdout.length).toBeGreaterThan(65536);
    }
  });

  test("redirection to a file and the pipe agree byte for byte", () => {
    const file = join(mkdtempSync(join(tmpdir(), "pdocs-pipe-")), "graph.json");
    Bun.spawnSync(
      ["sh", "-c", `exec bun ${JSON.stringify(CLI)} graph --format json --root ${JSON.stringify(root)} > ${JSON.stringify(file)}`],
      { cwd: REPO_ROOT, env: childEnv() }
    );
    expect(piped(["graph", "--format", "json", "--root", root]).stdout).toBe(
      readFileSync(file, "utf8")
    );
  });
});
