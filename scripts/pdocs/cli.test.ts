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
import { DEFAULT_CONFIG } from "./docs-lint/config.ts";
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
    expect(out.meta.command).toBe("check");
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
    expect(JSON.parse(stdout).meta.command).toBe("check");
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
    expect(out.meta.command).toBe("report");
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
    expect(out.meta.command).toBe("graph");
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

  test("a flag pdocs HAS, where a command belongs, is misplaced not unknown", () => {
    // The rejection used to call `--root` unknown and then list `--root` among
    // the valid flags, which is a sentence that argues with itself and leaves
    // the caller no way forward. What belongs in that position is a command.
    const { code, stdout, stderr } = run(["--root", ".", "check"]);
    expect(code).toBe(ExitCode.Usage);
    expect(stdout).toBe("");
    const out = JSON.parse(stderr);
    expect(out.error.message).toContain("must follow a command");
    expect(out.error.message).not.toContain("unknown flag");
    // The usage it prints carries the flag's own value slot, so the corrected
    // invocation can be read straight off it.
    expect(out.error.message).toContain("`pdocs <command> --root <path>`");
  });

  test("a misplaced flag whose value is also out of set reports the value", () => {
    // Two things are wrong and only one of them is legible from the usage line.
    // A value outside the set is wrong wherever the flag sits, so that is the
    // error — which is also what A7 asks a verb-first tool to do, and what the
    // kit's detached probe reads.
    const { code, stdout, stderr } = run(["--format", "yaml", "check"]);
    expect(code).toBe(ExitCode.Usage);
    expect(stdout).toBe("");
    const out = JSON.parse(stderr);
    expect(out.error.message).toContain("yaml");
    expect(out.error.choices).toEqual(["text", "json"]);
  });

  test("a misplaced flag whose value is fine reports the placement", () => {
    const { stderr } = run(["--format", "json", "check"]);
    const out = JSON.parse(stderr);
    expect(out.error.message).toContain("must follow a command");
    expect(out.error.choices).toContain("check");
  });

  test("a bare invocation is a usage error, and machine mode holds", () => {
    // Spawned, so stdout is a pipe and machine mode is in force — the caller
    // this CLI is built for gets one JSON document on stderr rather than a help
    // screen it has no parser for. A human at a terminal still gets the help;
    // that branch turns on `isatty(1)` and no test here can allocate one.
    const { code, stdout, stderr } = run([]);
    expect(code).toBe(ExitCode.Usage);
    expect(stdout).toBe("");
    const out = JSON.parse(stderr);
    expect(out.ok).toBe(false);
    expect(out.error.kind).toBe("usage");
    expect(out.error.choices).toContain("check");
  });
});

// The A3 SHOULD, and step 6 of the acc adoption guide in one: where the valid
// alternatives form a CLOSED SET, the rejection hands it over — as prose for a
// human and as `choices` for a program — and the set is read off the same table
// the parser enforces rather than written out beside it. A list maintained by
// hand in an error message is the drift this is here to prevent.
describe("a rejection from a closed set enumerates it", () => {
  /** The envelope a failing invocation puts on stderr. */
  function rejection(args: string[]) {
    const { code, stdout, stderr } = run(args);
    expect(stdout).toBe("");
    const out = JSON.parse(stderr);
    expect(out.ok).toBe(false);
    return { code, out, stderr };
  }

  test("an unknown command names every command", () => {
    const { code, out, stderr } = rejection(["frobnicate"]);
    expect(code).toBe(ExitCode.Usage);
    expect(out.error.choices).toEqual([
      "check",
      "report",
      "graph",
      "find",
      "backlinks",
      "orphans",
      "new",
      "schema",
      "help",
    ]);
    // Prose carries the same set: a terminal is not a lesser caller.
    expect(stderr).toContain("expected one of: check, report");
    expect(out.error.message).toContain("frobnicate");
  });

  test("an unknown flag at the root names the global flags", () => {
    const { code, out } = rejection(["--nope"]);
    expect(code).toBe(ExitCode.Usage);
    expect(out.error.choices).toEqual([
      "--root",
      "--format",
      "--json",
      "--help",
      "-h",
      "--version",
      "-V",
    ]);
  });

  test("an unknown flag on a command names that command's flags", () => {
    const { out } = rejection(["find", "--nope"]);
    // Its own first, then the globals — and every one of them is accepted.
    expect(out.error.choices).toContain("--type");
    expect(out.error.choices).toContain("--root");
    expect(out.error.choices).not.toContain("--variant");
  });

  test("a bad --format names both formats", () => {
    const { out } = rejection(["check", "--format", "yaml"]);
    expect(out.error.choices).toEqual(["text", "json"]);
  });

  test("an unknown type for `new` names the creatable types", () => {
    const root = tree(CLEAN);
    const { out } = rejection(["new", "frobnicate", "x", "--root", root]);
    expect(out.error.choices).toContain("playbook");
    expect(out.error.choices).toContain("project");
    // Derived from the registry: every name it offers can actually be created.
    expect(out.error.choices).not.toContain("index");
  });

  test("a type pdocs will not create still names the ones it will", () => {
    const root = tree(CLEAN);
    const { out } = rejection(["new", "index", "x", "--root", root]);
    expect(out.error.message).toContain("not created by pdocs");
    expect(out.error.choices).toContain("playbook");
  });
});

describe("the error envelope is the shape acc publishes", () => {
  test("every failure carries kind, exit_code, retryable and meta.command", () => {
    const { code, stderr } = run(["check", "--root", tree(CLEAN, null)]);
    expect(code).toBe(ExitCode.NotFound);
    const out = JSON.parse(stderr);
    // Two top-level shapes and no third: `{ ok, error, meta }` on failure,
    // never a `data` beside an `error`.
    expect(Object.keys(out).sort()).toEqual(["error", "meta", "ok"]);
    expect(out.ok).toBe(false);
    expect(out.meta.command).toBe("check");
    expect(out.error.kind).toBe("not_found");
    // The envelope and the exit status can never disagree.
    expect(out.error.exit_code).toBe(ExitCode.NotFound);
    expect(out.error.retryable).toBe(false);
    expect(typeof out.error.message).toBe("string");
    // Optional members are OMITTED rather than nulled.
    expect("choices" in out.error).toBe(false);
    expect("details" in out.error).toBe(false);
  });

  test("a rejection carries the offending token as a FIELD, not only in prose", () => {
    // A3's MUST: in machine mode the token must appear as a field, because
    // prose gets rewritten and a field is a contract. It rides in `details`,
    // which is where the canonical envelope puts what a specific failure needs.
    const cases: Array<[string[], string]> = [
      [["--nope"], "--nope"],
      [["frobnicate"], "frobnicate"],
      [["check", "--nonsense"], "--nonsense"],
      [["check", "--format", "yaml"], "yaml"],
    ];
    for (const [argv, token] of cases) {
      const { stderr } = run(argv);
      const out = JSON.parse(stderr);
      expect(out.error.details.token).toBe(token);
    }
  });

  test("a success is `{ ok, data, meta }` and nothing else", () => {
    const { stdout } = run(["check", "--format", "json", "--root", tree(CLEAN)]);
    const out = JSON.parse(stdout);
    expect(Object.keys(out).sort()).toEqual(["data", "meta", "ok"]);
    expect(out.ok).toBe(true);
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
    expect(out.meta.command).toBe("help");
    // `help` and `schema` are answered before the command table is consulted,
    // and they are in the manifest anyway: a caller reading this to find out
    // what pdocs answers to must not have to know which side of dispatch a verb
    // lives on. They are rows in `VERBS` for exactly that reason.
    expect(out.data.commands.map((c: { name: string }) => c.name)).toEqual([
      "check",
      "report",
      "graph",
      "find",
      "backlinks",
      "orphans",
      "new",
      "schema",
      "help",
    ]);
    expect(out.data.exitCodes["9"]).toContain("dirty");
  });

  test("`help` typed as a verb rejects a flag it does not take", () => {
    // It used to exit 0 and print help, whatever came after it — the one verb
    // whose flags nothing owned. `acc`'s census cannot see that as a
    // disagreement: a verb that never rejects never enumerates, so the path
    // comes back NOT COMPARED and the declaration's claim about it is untested.
    const { code, stdout, stderr } = run(["help", "--acc-not-a-flag"]);
    expect(code).toBe(ExitCode.Usage);
    expect(stdout).toBe("");
    const out = JSON.parse(stderr);
    expect(out.error.details.token).toBe("--acc-not-a-flag");
    expect(out.error.choices).toContain("--json");
    // `--help` on a broken invocation still answers, and that asymmetry is
    // deliberate: `pdocs check --help --nonsense` is a request for help.
    expect(run(["check", "--help", "--nonsense"]).code).toBe(ExitCode.Success);
  });

  test("help for one command", () => {
    const { stdout } = run(["check", "--help"]);
    expect(stdout).toContain("pdocs check");
    expect(stdout).toContain("--root");
  });

  test("--version carries an embedded semver, with no package.json needed", () => {
    // Embedded deliberately: an install into an existing project has no
    // package.json of ours, and the host's version is not our version.
    //
    // Spawned, so stdout is a pipe and the answer is the envelope: in machine
    // mode the version is a FIELD, not a bare string a caller has to regex. A
    // terminal still gets the bare string — a shell comparing `pdocs --version`
    // does not start receiving JSON because of this.
    const { code, stdout } = run(["--version"]);
    expect(code).toBe(ExitCode.Success);
    const out = JSON.parse(stdout);
    expect(out.meta.command).toBe("version");
    expect(out.data.name).toBe("pdocs");
    expect(out.data.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("--version in text mode is the bare string", () => {
    const { code, stdout } = run(["--version", "--format", "text"]);
    expect(code).toBe(ExitCode.Success);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("the emitted declaration", () => {
  interface Arg {
    name: string;
    type: string;
    status: string;
    values?: string[];
  }
  interface Row {
    path: string[];
    args: Arg[];
    positionals: Array<{ name: string; required: boolean }>;
  }

  function declaration(): {
    formatVersion: string;
    provenance: string;
    selfDescription: { args: string[] } | null;
    commands: Row[];
  } {
    const { code, stdout } = run(["schema"]);
    expect(code).toBe(ExitCode.Success);
    return JSON.parse(stdout);
  }

  const at = (d: { commands: Row[] }, path: string[]) =>
    d.commands.find((c) => c.path.join(" ") === path.join(" ")) as Row;

  test("it is acc declaration format v0, and NOT enveloped", () => {
    // The one command whose stdout is not `{ ok, data, meta }`. `acc check
    // --declaration` reads the document at the top level and refuses unknown
    // keys, so an envelope around it is not a wrapper — it is a file that tool
    // cannot read.
    const d = declaration();
    expect(d.formatVersion).toBe("0");
    // `emitted` and not `modelled`: the running binary produced this. The
    // remedy a failed diff prints is chosen by this field.
    expect(d.provenance).toBe("emitted");
    expect(Object.keys(d).sort()).toEqual([
      "commands",
      "formatVersion",
      "provenance",
      "selfDescription",
    ]);
  });

  test("the root is a row, with the flags no verb owns", () => {
    // The trap that eats generators: a walk over "the commands" walks past the
    // flags the root answers itself, and every one of them then reads back as
    // undeclared surface against the only path a checker can always reach.
    const root = at(declaration(), []);
    expect(root.args.map((a) => a.name)).toEqual([
      "--root",
      "--format",
      "--json",
      "--help",
      "-h",
      "--version",
      "-V",
    ]);
    expect(root.positionals).toEqual([{ name: "command", required: true }]);
  });

  test("every verb the root advertises has a row", () => {
    // Both sides of this come from `VERBS`, so it cannot fail while that holds
    // — which is the point: the assertion is that nothing has grown a second
    // source. A verb answered before the table is consulted (`help`, `schema`)
    // is where that would happen first.
    const d = declaration();
    const { stderr } = run(["frobnicate"]);
    const advertised: string[] = JSON.parse(stderr).error.choices;
    const declared = d.commands
      .filter((c) => c.path.length === 1)
      .map((c) => c.path[0]);
    expect(declared.sort()).toEqual([...advertised].sort());
  });

  test("what a verb declares is what its rejection enumerates", () => {
    // THE BINDING, asserted from outside the process. `declaredArgs` is the one
    // call behind both, so a flag can only ever be in both or in neither.
    for (const verb of ["check", "find", "new", "orphans", "schema", "help"]) {
      const declared = at(declaration(), [verb]).args.map((a) => a.name);
      const { stderr } = run([verb, "--acc-not-a-flag"]);
      expect(JSON.parse(stderr).error.choices).toEqual(declared);
    }
  });

  test("selfDescription names a verb the document declares", () => {
    // `self-description-not-declared` is the finding this avoids: a caller
    // holding the declaration and nothing else can rediscover the door it came
    // through. Derived from the verb's own row, so renaming it follows.
    const d = declaration();
    const first = (d.selfDescription as { args: string[] }).args[0];
    expect(first).toBe("schema");
    expect(d.commands.some((c) => c.path[0] === first)).toBe(true);
  });

  test("a value set is declared only where the parser enforces one", () => {
    const d = declaration();
    const format = at(d, ["check"]).args.find((a) => a.name === "--format");
    expect(format).toEqual({
      name: "--format",
      type: "string",
      status: "valid",
      values: ["text", "json"],
    });
    // `find --type` filters; it checks nothing, so it claims nothing. A
    // declared set is a set the tool ENFORCES.
    const type = at(d, ["find"]).args.find((a) => a.name === "--type");
    expect(type).toEqual({ name: "--type", type: "string", status: "valid" });
    // An alias is a row of its own — v0 has no alias field — and never carries
    // the value slot.
    expect(at(d, ["check"]).args).toContainEqual({
      name: "-h",
      type: "boolean",
      status: "valid",
    });
  });

  test("it needs no tree, and no repository at all", () => {
    // `schema` describes the TOOL. A tool that could not say what its own
    // interface is until it found a `.project-docs.json` would be useless to
    // the caller most in need of the answer — and `acc check <cli>
    // --declaration <(pdocs schema)` runs from wherever it likes.
    const empty = mkdtempSync(join(tmpdir(), "pdocs-noroot-"));
    roots.push(empty);
    const { code, stdout } = run(["schema", "--root", empty], empty);
    expect(code).toBe(ExitCode.Success);
    expect(JSON.parse(stdout).formatVersion).toBe("0");
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
    expect(out.meta.command).toBe("graph");
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

describe("either spelling of a flag is the same request", () => {
  // `--flag=value` is the spelling every agent reaches for and the one this CLI
  // refused outright — `--format=json` came back `unknown flag` while the same
  // rejection listed `--format` among the valid ones. The rule these tests hold
  // is that the two spellings are indistinguishable downstream, INCLUDING in
  // the three places that read argv before the parser does.

  test("--format=json selects the format", () => {
    const root = tree(CLEAN);
    const { code, stdout } = run(["check", "--format=json", "--root", root]);
    expect(code).toBe(ExitCode.Success);
    expect(JSON.parse(stdout).ok).toBe(true);
  });

  test("--root=<path> redirects the tree, and does not quietly not", () => {
    // The failure this guards is the SILENT one: a `--root` the parser accepts
    // and the pre-scanner ignores would lint the CLI's own repository while
    // reporting on the one that was named.
    //
    // An EMPTY directory is what makes that visible without depending on what
    // either tree contains: the default root is always a project-docs tree, so
    // a fallback exits 0 and a redirect exits 5. Equality with the detached
    // spelling alone would hold just as well if both had fallen back.
    const empty = mkdtempSync(join(tmpdir(), "pdocs-notatree-"));
    roots.push(empty);
    const detached = run(["check", "--root", empty]);
    const attached = run(["check", `--root=${empty}`]);
    expect(attached.code).toBe(ExitCode.NotFound);
    expect(attached.stderr).toBe(detached.stderr);

    // And the same spelling reaches a tree that IS one.
    const root = tree(CLEAN);
    expect(run(["check", `--root=${root}`, "--format", "json"])).toEqual(
      run(["check", "--root", root, "--format", "json"])
    );
  });

  test("--format=<outside the set> is refused by value, not by spelling", () => {
    const { code, stdout, stderr } = run(["check", "--format=yaml"]);
    expect(code).toBe(ExitCode.Usage);
    expect(stdout).toBe("");
    const out = JSON.parse(stderr);
    expect(out.error.message).toContain("yaml");
    expect(out.error.choices).toEqual(["text", "json"]);
  });

  test("a boolean flag handed a value is refused, not stripped", () => {
    // `--json=false` means the opposite of what it does. A parser that reads it
    // as `--json` has performed that inversion silently.
    const { code, stderr } = run(["check", "--json=false"]);
    expect(code).toBe(ExitCode.Usage);
    expect(JSON.parse(stderr).error.message).toContain("takes no value");
  });

  test("an unknown flag in the attached spelling names the flag", () => {
    const { stderr } = run(["check", "--formt=json"]);
    const out = JSON.parse(stderr);
    // The name is the unknown part; naming the whole token invites the reader
    // to wonder whether the value was the problem. The token is kept for a
    // caller reconstructing what was typed.
    expect(out.error.message).toContain("unknown flag `--formt`");
    expect(out.error.details.token).toBe("--formt=json");
  });

  test("the attached spelling reaches the root's own diagnostics too", () => {
    const placement = JSON.parse(run(["--format=json", "check"]).stderr);
    expect(placement.error.message).toContain("must follow a command");
    const value = JSON.parse(run(["--format=yaml", "check"]).stderr);
    expect(value.error.message).toContain("yaml");
  });
});

describe("a reader that leaves is not a fault", () => {
  /**
   * The CLI's own exit status from inside a pipeline whose reader is already
   * gone, and whatever it wrote to stderr.
   *
   * `${PIPESTATUS[0]}` is a bashism and `sh` is dash on some systems, so the
   * status is carried out of the pipeline through a file. The `echo` writes to
   * that file rather than to the pipe, so it neither pollutes the stream nor
   * takes an EPIPE of its own.
   */
  function intoAClosedPipe(args: string[]) {
    const dir = mkdtempSync(join(tmpdir(), "pdocs-epipe-"));
    roots.push(dir);
    const err = join(dir, "err.txt");
    const status = join(dir, "status.txt");
    const q = (s: string) => JSON.stringify(s);
    Bun.spawnSync(
      [
        "sh",
        "-c",
        `{ bun ${q(CLI)} ${args.map(q).join(" ")} 2>${q(err)}; ` +
          `echo $? > ${q(status)}; } | true`,
      ],
      { cwd: REPO_ROOT, env: childEnv() }
    );
    return {
      code: Number(readFileSync(status, "utf8").trim()),
      stderr: readFileSync(err, "utf8"),
    };
  }

  // `schema` and `help` are the two verbs that write through `writeTo`, whose
  // `writeSync` throws EPIPE where `console.log` swallows it. Until that was
  // handled, one pipeline reported `kind: internal` at exit 1 — the code this
  // CLI documents as a fault inside itself — on these two and nothing at all
  // on the other five.
  for (const verb of ["schema", "help"])
    test(`${verb} exits 0 and says nothing`, () => {
      const { code, stderr } = intoAClosedPipe([verb]);
      expect(code).toBe(ExitCode.Success);
      expect(stderr).toBe("");
    });

  test("the console.log commands agreed already, and still do", () => {
    for (const args of [
      ["graph", "--format", "json"],
      ["check", "--format", "json"],
    ]) {
      const { code, stderr } = intoAClosedPipe(args);
      expect(code).toBe(ExitCode.Success);
      expect(stderr).toBe("");
    }
  });

  test("a genuine failure into the same pipe is still reported", () => {
    // The branch keys on EPIPE and not on "something threw while writing", so
    // a usage error still exits 2 and still carries its envelope.
    const { code, stderr } = intoAClosedPipe(["frobnicate"]);
    expect(code).toBe(ExitCode.Usage);
    expect(JSON.parse(stderr).error.kind).toBe("usage");
  });
});
