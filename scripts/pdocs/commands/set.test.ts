// `pdocs set` (plan Task 2.6): change a work entity's fields in place, through
// the same validation the lint runs, touching nothing else in the file.

import { afterAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { ExitCode } from "../envelope.ts";
import { childEnv } from "../test-env.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");
const PAYLOAD = join(REPO_ROOT, "{{cookiecutter.project_slug}}");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function run(args: string[]) {
  const p = Bun.spawnSync(["bun", CLI, ...args], { cwd: REPO_ROOT, env: childEnv() });
  return { code: p.exitCode, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}

const A = "0190f4b2-7c3a-7d4e-8f00-00000000000a";
const B = "0190f4c9-1d2e-7f00-8a00-00000000000b";

const ITEM_A = `---
type: item # REQUIRED (OKF §3).
title: Fix the hook
description: The hook reads the wrong index.
status: draft # OKF §5.4
lifecycle: triage # triage | backlog | ready | active | review | done | dropped
id: ${A} # never edit it
kind: bug
priority: high
cycle: 2026-09-x
generated: { by: test, at: 2026-09-22 }
---

# Fix the hook

Body stays exactly as written.
`;

const ITEM_B = `---
type: item
title: Other
description: Another item.
status: draft
lifecycle: backlog
id: ${B}
kind: task
generated: { by: test, at: 2026-09-22 }
---

# Other
`;

const cycle = (slug: string, lifecycle: string) => `---
type: cycle
title: Cycle ${slug}
description: A fixture cycle.
status: draft
lifecycle: ${lifecycle}
generated: { by: test, at: 2026-09-01 }
---

# Cycle
`;

function tree(): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-set-"));
  roots.push(root);
  cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
  copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
  const config = JSON.parse(readFileSync(join(root, ".project-docs.json"), "utf8"));
  config.lint.scopes = ["cli"];
  writeFileSync(join(root, ".project-docs.json"), JSON.stringify(config, null, 2));
  const write = (rel: string, body: string) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  write("docs/items/fix-hook.md", ITEM_A);
  write("docs/items/other.md", ITEM_B);
  write("docs/cycles/2026-09-x.md", cycle("2026-09-x", "active"));
  write("docs/cycles/2026-10-y.md", cycle("2026-10-y", "planned"));
  Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
  return root;
}

const set = (root: string, ...args: string[]) =>
  run(["set", ...args, "--root", root, "--format", "json"]);
const read = (root: string, rel = "docs/items/fix-hook.md") =>
  readFileSync(join(root, rel), "utf8");

describe("pdocs set", () => {
  test("the fixture is clean", () => {
    const root = tree();
    expect(run(["check", "--root", root, "--format", "text"]).stdout).toContain(
      "docs-lint: clean"
    );
  });

  test("rewrites only the keys given, leaving comments, key order and body alone", () => {
    const root = tree();
    const r = set(root, "item/fix-hook", "--lifecycle", "active", "--cycle", "2026-10-y");
    expect(r.stderr).toBe("");
    expect(r.code).toBe(ExitCode.Success);
    const expected = ITEM_A.replace(
      "lifecycle: triage # triage | backlog | ready | active | review | done | dropped",
      "lifecycle: active"
    ).replace("cycle: 2026-09-x", "cycle: 2026-10-y");
    expect(read(root)).toBe(expected);
  });

  test("`--lifecycle backlog` on a triage item succeeds: there is no triage flag (D8)", () => {
    const root = tree();
    expect(set(root, A.slice(0, 8), "--lifecycle", "backlog").code).toBe(ExitCode.Success);
    expect(read(root)).toContain("lifecycle: backlog\n");
    expect(run(["set", "--help"]).stdout).not.toContain("--accept");
  });

  test("an invalid value exits 2, names the valid set, and writes nothing", () => {
    const root = tree();
    for (const [flag, value, expected] of [
      ["--lifecycle", "doing", "triage | backlog | ready | active | review | done | dropped"],
      ["--priority", "p1", "urgent | high | medium | low"],
      ["--kind", "story", "task | bug | chore | research"],
    ] as const) {
      const r = set(root, "item/fix-hook", flag, value);
      expect(r.code).toBe(ExitCode.Usage);
      expect(r.stderr).toContain(expected);
    }
    expect(read(root)).toBe(ITEM_A);
  });

  test("references go through the lint's resolution, and are written in full", () => {
    const root = tree();
    expect(set(root, "item/fix-hook", "--cycle", "2099-01-nope").code).toBe(ExitCode.Usage);
    expect(set(root, "item/fix-hook", "--parent", "feature/nope").code).toBe(ExitCode.Usage);
    expect(set(root, "item/fix-hook", "--scope", "ui").code).toBe(ExitCode.Usage);
    expect(read(root)).toBe(ITEM_A);

    expect(set(root, "item/fix-hook", "--blocked-by", B.slice(0, 10)).code).toBe(ExitCode.Success);
    expect(read(root)).toContain(`blocked_by: [${B}]\n`);
  });

  test("a change the lint would report is refused — a blocked_by loop", () => {
    const root = tree();
    expect(set(root, "item/other", "--blocked-by", A).code).toBe(ExitCode.Success);
    const r = set(root, "item/fix-hook", "--blocked-by", B);
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("BLOCKED CYCLE");
    expect(read(root)).toBe(ITEM_A);
  });

  test("a second active cycle is refused as a conflict", () => {
    const root = tree();
    const r = set(root, "cycle/2026-10-y", "--lifecycle", "active");
    expect(r.code).toBe(ExitCode.Conflict);
    // Setting the active one active again is not a second.
    expect(set(root, "cycle/2026-09-x", "--lifecycle", "active").code).toBe(ExitCode.Success);
  });

  test("--unset removes the key", () => {
    const root = tree();
    expect(set(root, "item/fix-hook", "--unset", "cycle").code).toBe(ExitCode.Success);
    expect(read(root)).not.toContain("\ncycle:");
    expect(set(root, "item/fix-hook", "--unset", "priority,assignee").code).toBe(ExitCode.Success);
    expect(read(root)).not.toContain("\npriority:");
  });

  test("--unset of a required key is refused", () => {
    const root = tree();
    const r = set(root, "item/fix-hook", "--unset", "kind");
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("MISSING kind");
    expect(read(root)).toBe(ITEM_A);
  });

  test("--released-in is accepted with no check (D9)", () => {
    const root = tree();
    expect(set(root, "item/fix-hook", "--released-in", "9.0.0").code).toBe(ExitCode.Success);
    expect(read(root)).toContain("released_in: 9.0.0\n");
  });

  test("a field the type does not declare is refused", () => {
    const root = tree();
    const r = set(root, "cycle/2026-09-x", "--kind", "bug");
    expect(r.code).toBe(ExitCode.Usage);
    expect(r.stderr).toContain("--kind");
  });

  test("nothing to set is a usage error", () => {
    const root = tree();
    expect(set(root, "item/fix-hook").code).toBe(ExitCode.Usage);
  });

  test("JSON output carries the path and each key's before and after", () => {
    const root = tree();
    const r = set(root, "item/fix-hook", "--lifecycle", "ready", "--unset", "cycle");
    const data = JSON.parse(r.stdout).data;
    expect(data.path).toBe("docs/items/fix-hook.md");
    expect(data.changes).toEqual([
      { key: "lifecycle", before: "triage", after: "ready" },
      { key: "cycle", before: "2026-09-x", after: null },
    ]);
  });

  test("text output shows ids short; JSON keeps them full (D25)", () => {
    const root = tree();
    const text = run(["set", "item/fix-hook", "--blocked-by", B, "--root", root, "--format", "text"]).stdout;
    expect(text).toContain(`blocked_by: (none) -> [${B.slice(0, 12)}]`);
    expect(text).not.toContain(B);
  });

  test("the tree is clean after a run of changes", () => {
    const root = tree();
    set(root, "item/fix-hook", "--lifecycle", "active", "--assignee", "seat-2", "--scope", "cli");
    set(root, "item/other", "--blocked-by", "item/fix-hook", "--priority", "low");
    expect(read(root, "docs/items/other.md")).toContain(`blocked_by: [${A}]`);
    expect(run(["check", "--root", root, "--format", "text"]).stdout).toContain(
      "docs-lint: clean"
    );
  });
});
