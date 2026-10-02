// The review advisory: a work item whose own document is not `stable` is
// reported when work on it starts — started outside a cycle, a cycle started
// around it, joined to the active cycle — at every touch point, in text and
// JSON; and under `checks.workItemReview.mode: strict` the start is refused
// before anything is written and `pdocs check` fails.
//
// Real temp trees and the real CLI, in the style of `view-advisory.test.ts`.

import { afterAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { BAD_CONFIG_ADVISORY, REVIEW_ADVISORY } from "../advisories.ts";
import { loadConfig } from "../docs-lint/config.ts";
import { ExitCode, Outcome } from "../envelope.ts";
import { childEnv } from "../test-env.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = join(REPO_ROOT, "scripts/pdocs/cli.ts");
const PAYLOAD = join(REPO_ROOT, "{{cookiecutter.project_slug}}");

const roots: string[] = [];
afterAll(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function run(root: string, ...args: string[]) {
  const p = Bun.spawnSync(["bun", CLI, ...args, "--root", root], {
    cwd: REPO_ROOT,
    env: childEnv(),
  });
  return { code: p.exitCode, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}

/** The JSON envelope's `data`, asserting success. */
function json(root: string, ...args: string[]) {
  const r = run(root, ...args, "--format", "json");
  expect(r.stderr).toBe("");
  expect(r.code).toBe(ExitCode.Success);
  return JSON.parse(r.stdout).data;
}

const text = (root: string, ...args: string[]) => run(root, ...args, "--format", "text");

let n = 0;
const nextId = () => `0190f4b2-7c3a-7d4e-8f00-${String(++n).padStart(12, "0")}`;

interface ItemSpec {
  lifecycle: string;
  status?: string | null;
  cycle?: string;
}

const itemDoc = (slug: string, s: ItemSpec) =>
  [
    "---",
    "type: item",
    `title: ${slug}`,
    "description: An item.",
    ...(s.status === null ? [] : [`status: ${s.status ?? "draft"}`]),
    `lifecycle: ${s.lifecycle}`,
    `id: ${nextId()}`,
    "kind: task",
    ...(s.cycle ? [`cycle: ${s.cycle}`] : []),
    "generated: { by: test, at: 2026-09-01 }",
    "---",
    "",
    `# ${slug}`,
    "",
  ].join("\n");

const cycleDoc = (slug: string, lifecycle: string) =>
  [
    "---",
    "type: cycle",
    `title: ${slug}`,
    "description: A cycle.",
    "status: draft",
    `lifecycle: ${lifecycle}`,
    "generated: { by: test, at: 2026-09-01 }",
    "---",
    "",
    `# ${slug}`,
    "",
    "## Outcome",
    "",
    "Shipped the thing.",
    "",
  ].join("\n");

interface Shape {
  items?: Record<string, ItemSpec>;
  archived?: Record<string, ItemSpec>;
  cycles?: Record<string, string>;
  mode?: unknown;
}

function tree(shape: Shape): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-review-"));
  roots.push(root);
  cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
  copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
  if (shape.mode !== undefined) setMode(root, shape.mode);
  const files: Record<string, string> = {};
  for (const [slug, s] of Object.entries(shape.items ?? {})) files[`docs/items/${slug}.md`] = itemDoc(slug, s);
  for (const [slug, s] of Object.entries(shape.archived ?? {}))
    files[`docs/items/_archive/${slug}.md`] = itemDoc(slug, s);
  for (const [slug, lc] of Object.entries(shape.cycles ?? {}))
    files[`docs/cycles/${slug}.md`] = cycleDoc(slug, lc);
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
  return root;
}

function setMode(root: string, mode: unknown): void {
  const path = join(root, ".project-docs.json");
  const cfg = JSON.parse(readFileSync(path, "utf8"));
  cfg.checks = { ...(cfg.checks ?? {}), workItemReview: mode === "absent" ? {} : { mode } };
  writeFileSync(path, JSON.stringify(cfg, null, 2));
}

/** Every file under `root` but `.git`, with its bytes. */
function snapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === ".git") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else out[p] = readFileSync(p, "utf8");
    }
  };
  walk(root);
  return out;
}

type Adv = { id: string; refs?: string[]; mode?: string; items?: { ref: string; reason: string }[] };
const review = (advisories: Adv[]) => advisories.find((a) => a.id === REVIEW_ADVISORY);
const reasons = (a: Adv | undefined) =>
  Object.fromEntries((a?.items ?? []).map((i) => [i.ref, i.reason]));

/** Assert a strict refusal: exit 6, the advisory in the error, nothing written. */
function refused(root: string, ...args: string[]) {
  const before = snapshot(root);
  const r = run(root, ...args, "--format", "json");
  expect(r.code).toBe(ExitCode.Conflict);
  expect(r.stdout).toBe("");
  const err = JSON.parse(r.stderr).error;
  expect(err.kind).toBe("conflict");
  expect(err.message).toContain("checks.workItemReview.mode is strict");
  expect(snapshot(root)).toEqual(before);
  return err.details.advisory as Adv;
}

const field = (root: string, slug: string, key: string) =>
  readFileSync(join(root, `docs/items/${slug}.md`), "utf8").match(new RegExp(`^${key}: (.*)`, "m"))?.[1];

// ---------------------------------------------------------------------------------------

describe("checks.workItemReview.mode", () => {
  test("defaults to warn when omitted — the key, the section or `checks`", () => {
    const root = tree({});
    expect(loadConfig(root).checks.workItemReview.mode).toBe("warn");
    setMode(root, "absent");
    expect(loadConfig(root).checks.workItemReview.mode).toBe("warn");
    expect(loadConfig(root).issues).toEqual([]);
  });

  test("takes warn and strict", () => {
    const root = tree({});
    for (const m of ["warn", "strict"] as const) {
      setMode(root, m);
      expect(loadConfig(root).checks.workItemReview.mode).toBe(m);
      expect(loadConfig(root).issues).toEqual([]);
    }
  });

  test("an invalid mode is BAD CONFIG for check, a bad-config advisory for views, and warn meanwhile", () => {
    const root = tree({ mode: "Strict", items: { a: { lifecycle: "active" } } });
    const cfg = loadConfig(root);
    expect(cfg.checks.workItemReview.mode).toBe("warn");
    expect(cfg.issues.map((i) => i.key)).toEqual(["checks.workItemReview.mode"]);

    const c = text(root, "check");
    expect(c.code).toBe(Outcome.Dirty);
    expect(c.stdout).toContain("BAD CONFIG  .project-docs.json: checks.workItemReview.mode is \"Strict\"");

    const board = json(root, "view", "board");
    expect(board.advisories.map((a: Adv) => a.id)).toEqual([BAD_CONFIG_ADVISORY, REVIEW_ADVISORY]);
    expect(board.reviewMode).toBe("warn");
    // The review advice is still given, so the action must not say otherwise.
    expect(board.advisories[0].action).toContain(
      "until then the work item review advice is still given, under the default policy, `warn`."
    );
    expect(board.advisories[0].action).not.toContain("not computed");

    // Warn meanwhile: a start is not refused.
    const s = json(root, "set", "item/a", "--lifecycle", "review");
    expect(s.advisories.map((a: Adv) => a.id)).toEqual([BAD_CONFIG_ADVISORY, REVIEW_ADVISORY]);
  });

  test("an unknown key in the section is an issue", () => {
    const root = tree({});
    const path = join(root, ".project-docs.json");
    const cfg = JSON.parse(readFileSync(path, "utf8"));
    cfg.checks = { workItemReview: { mood: "strict" } };
    writeFileSync(path, JSON.stringify(cfg));
    expect(loadConfig(root).issues.map((i) => i.key)).toEqual(["checks.workItemReview.mood"]);
  });

  test("a broken `checks` is one bad-config advisory on the board, not one per section", () => {
    const root = tree({});
    const path = join(root, ".project-docs.json");
    const cfg = JSON.parse(readFileSync(path, "utf8"));
    cfg.checks = 7;
    writeFileSync(path, JSON.stringify(cfg));
    const board = json(root, "view", "board");
    expect(board.advisories.map((a: Adv) => a.id)).toEqual([BAD_CONFIG_ADVISORY]);
    // Both sections are unreadable: the action says what each does meanwhile.
    expect(board.advisories[0].action).toContain(
      "the archive advice is not computed, and the work item review advice is still given"
    );
  });
});

describe("unknown checks sections", () => {
  const withChecks = (checks: unknown, shape: Shape = {}) => {
    const root = tree(shape);
    const path = join(root, ".project-docs.json");
    const cfg = JSON.parse(readFileSync(path, "utf8"));
    cfg.checks = checks;
    writeFileSync(path, JSON.stringify(cfg, null, 2));
    return root;
  };

  test("a misspelt section is BAD CONFIG with a suggestion; views carry bad-config; the policy stays warn", () => {
    const root = withChecks({ workitemReview: { mode: "strict" } }, { items: { a: { lifecycle: "ready" } } });
    const cfg = loadConfig(root);
    expect(cfg.checks.workItemReview.mode).toBe("warn");
    expect(cfg.issues).toEqual([
      {
        key: "checks.workitemReview",
        value: { mode: "strict" },
        kind: "unknown-section",
        expected: "no such section; checks takes archive, workItemReview — did you mean `workItemReview`?",
      },
    ]);
    const c = text(root, "check");
    expect(c.code).toBe(Outcome.Dirty);
    expect(c.stdout).toContain(
      'BAD CONFIG  .project-docs.json: checks.workitemReview is {"mode":"strict"}  (expected no such section; checks takes archive, workItemReview — did you mean `workItemReview`?)'
    );
    for (const args of [["view", "board"], ["view", "ready"], ["view", "portfolio"]]) {
      const d = json(root, ...args);
      const bad = d.advisories.filter((a: Adv) => a.id === BAD_CONFIG_ADVISORY);
      expect(bad.length).toBe(1);
      expect(bad[0].action).toContain("the sections this version knows still apply");
    }
    // Warn, not strict: the start goes ahead.
    expect(json(root, "set", "item/a", "--lifecycle", "active").advisories.map((a: Adv) => a.id)).toEqual([
      BAD_CONFIG_ADVISORY,
      REVIEW_ADVISORY,
    ]);
  });

  test("an unrelated unknown section lists the known ones, with no suggestion", () => {
    const [issue] = loadConfig(withChecks({ bogus: 1 })).issues;
    expect(issue).toEqual({
      key: "checks.bogus",
      value: 1,
      kind: "unknown-section",
      expected: "no such section; checks takes archive, workItemReview",
    });
  });

  test("a case slip, a typo, or both are suggested", () => {
    for (const [name, near] of [
      ["ARCHIVE", "archive"],
      ["workItemReveiw", "workItemReview"],
      ["WorkitemReveiw", "workItemReview"],
    ]) {
      const [issue] = loadConfig(withChecks({ [name as string]: {} })).issues;
      expect(issue?.expected).toEndWith(`did you mean \`${near}\`?`);
    }
  });

  test("a name three edits from every section gets no suggestion", () => {
    // `archiXXX` is 3 from `archive`, and far from `workItemReview`.
    const [issue] = loadConfig(withChecks({ archiXXX: {} })).issues;
    expect(issue?.expected).toBe("no such section; checks takes archive, workItemReview");
    const [two] = loadConfig(withChecks({ archiXX: {} })).issues;
    expect(two?.expected).toEndWith("did you mean `archive`?");
  });

  test("a message with a suggestion ends in ? — never ?.", () => {
    const root = withChecks({ workitemReview: {} });
    const bad = json(root, "view", "board").advisories[0] as Adv & { message: string };
    expect(bad.message).toEndWith("did you mean `workItemReview`?");
    expect(bad.message).not.toContain("?.");
  });

  test("inherited names are not sections: valueOf, constructor, toString, hasOwnProperty, __proto__", () => {
    const root = tree({});
    const path = join(root, ".project-docs.json");
    const cfg = JSON.parse(readFileSync(path, "utf8"));
    delete cfg.checks;
    // Raw JSON, so `__proto__` is an own key exactly as a file would hold it.
    const body = JSON.stringify(cfg, null, 2).replace(
      /\n}$/,
      ',\n  "checks": { "valueOf": 1, "constructor": {}, "toString": {}, "hasOwnProperty": {}, "__proto__": {} }\n}'
    );
    writeFileSync(path, body);
    expect(loadConfig(root).issues.map((i) => i.key)).toEqual([
      "checks.valueOf",
      "checks.constructor",
      "checks.toString",
      "checks.hasOwnProperty",
      "checks.__proto__",
    ]);
    expect(text(root, "check").code).toBe(Outcome.Dirty);
  });

  test("a dotted unknown section reaches the views too, and takes no known advice down", () => {
    const root = withChecks({ "work.ItemReview": { mode: "strict" }, "archive.x": 1, archive: { threshold: 0 } }, {
      items: { d: { lifecycle: "done", status: "stable" } },
    });
    expect(loadConfig(root).issues.map((i) => i.key)).toEqual(["checks.work.ItemReview", "checks.archive.x"]);
    expect(text(root, "check").code).toBe(Outcome.Dirty);
    const board = json(root, "view", "board");
    expect(board.advisories.map((a: Adv) => a.id)).toEqual([BAD_CONFIG_ADVISORY, "archive-threshold"]);
    expect(board.advisories[0].issues.map((i: { key: string }) => i.key)).toEqual([
      "checks.work.ItemReview",
      "checks.archive.x",
    ]);
    expect(json(root, "view", "ready").advisories.map((a: Adv) => a.id)).toEqual([BAD_CONFIG_ADVISORY]);
  });

  test("an archive error beside an unknown section: one merged action keeps both promises", () => {
    const root = withChecks({ archive: { threshold: -1 }, bogus: {} });
    const bad = json(root, "view", "portfolio").advisories;
    expect(bad.length).toBe(1);
    expect(bad[0].action).toContain("until then the advice it governs is not computed.");
    expect(bad[0].action).toContain(
      "A `checks` section this version does not know is ignored; the ones it knows still apply."
    );
  });

  test("the sections it knows still apply beside an unknown one", () => {
    const root = withChecks(
      { bogus: {}, workItemReview: { mode: "strict" }, archive: { threshold: 0 } },
      { items: { a: { lifecycle: "ready" }, d: { lifecycle: "done", status: "stable" } } }
    );
    const cfg = loadConfig(root);
    expect(cfg.checks.workItemReview.mode).toBe("strict");
    expect(cfg.checks.archive.threshold).toBe(0);
    refused(root, "set", "item/a", "--lifecycle", "active");
    const board = json(root, "view", "board");
    // The archive advice is still computed: an unknown section takes nothing down.
    expect(board.advisories.map((a: Adv) => a.id)).toEqual([BAD_CONFIG_ADVISORY, "archive-threshold"]);
  });
});

describe("what triggers", () => {
  const shape: Shape = {
    cycles: { "2026-09-now": "active", "2026-10-next": "planned", "2025-01-old": "closed" },
    items: {
      started: { lifecycle: "active" },
      reviewing: { lifecycle: "review", status: "deprecated" },
      unstatused: { lifecycle: "active", status: null },
      member: { lifecycle: "ready", cycle: "2026-09-now" },
      "triage-member": { lifecycle: "triage", cycle: "2026-09-now" },
      // Not triggers:
      "stable-started": { lifecycle: "active", status: "stable" },
      "stable-member": { lifecycle: "ready", status: "stable", cycle: "2026-09-now" },
      "planned-member": { lifecycle: "ready", cycle: "2026-10-next" },
      "loose-backlog": { lifecycle: "backlog" },
      "done-member": { lifecycle: "done", cycle: "2026-09-now" },
      "dropped-draft": { lifecycle: "dropped" },
      "closed-member": { lifecycle: "done", cycle: "2025-01-old" },
    },
    archived: { "old-done": { lifecycle: "done" } },
  };

  test("started work and the active cycle's unfinished work, not stable — and nothing else", () => {
    const root = tree(shape);
    const a = review(json(root, "view", "board").advisories);
    expect(reasons(a)).toEqual({
      "item/member": "active-cycle",
      "item/reviewing": "started",
      "item/started": "started",
      "item/triage-member": "active-cycle",
      "item/unstatused": "started",
    });
    expect(a?.refs?.length).toBe(5);
  });

  test("check reports the same items as an advisory, and exits 0 in warn mode", () => {
    // A missing status is its own lint problem (MISSING status); leave it out
    // so the only thing check has to say is the advice.
    const { unstatused: _, ...items } = shape.items as Record<string, ItemSpec>;
    const root = tree({ ...shape, items });
    const r = run(root, "check", "--format", "json");
    expect(r.code).toBe(ExitCode.Success);
    const data = JSON.parse(r.stdout).data;
    expect(data.clean).toBe(true);
    expect(Object.keys(reasons(review(data.advisories))).sort()).toEqual([
      "item/member",
      "item/reviewing",
      "item/started",
      "item/triage-member",
    ]);
    const t = text(root, "check");
    expect(t.code).toBe(ExitCode.Success);
    expect(t.stdout).toContain("docs-lint: clean\n\nadvisory (work-item-review): 4 items started or in the active cycle have no reviewed document");
    expect(t.stdout).not.toContain("UNREVIEWED");
  });

  test("a tree with nothing to review adds nothing to check's output", () => {
    const root = tree({ items: { a: { lifecycle: "backlog" } } });
    const r = text(root, "check");
    expect(r.code).toBe(ExitCode.Success);
    expect(r.stdout.trimEnd().endsWith("docs-lint: clean")).toBe(true);
    expect(json(root, "check").advisories).toEqual([]);
  });

  test("strict: check fails with one UNREVIEWED row per item", () => {
    const root = tree({ ...shape, mode: "strict" });
    const r = text(root, "check");
    expect(r.code).toBe(Outcome.Dirty);
    const rows = r.stdout.split("\n").filter((l) => l.startsWith("UNREVIEWED"));
    expect(rows.length).toBe(5);
    expect(rows).toContain(
      "UNREVIEWED  docs/items/member.md: status draft, lifecycle ready in active cycle 2026-09-now  (an active cycle's work needs `status: stable` — checks.workItemReview.mode is strict)"
    );
    expect(rows).toContain(
      "UNREVIEWED  docs/items/unstatused.md: status missing, lifecycle active  (started work needs `status: stable` — checks.workItemReview.mode is strict)"
    );
    const data = JSON.parse(run(root, "check", "--format", "json").stdout).data;
    expect(data.clean).toBe(false);
    expect(review(data.advisories)?.mode).toBe("strict");
  });
});

describe("starting an item", () => {
  test("warn: the start is written, and reported in text and JSON", () => {
    const root = tree({ items: { a: { lifecycle: "ready" } } });
    const t = text(root, "set", "item/a", "--lifecycle", "active");
    expect(t.code).toBe(ExitCode.Success);
    expect(t.stdout).toContain("advisory (work-item-review): 1 item started has no reviewed document (`status: stable`): item/a (draft, active).");
    expect(t.stdout).toContain("  next: Show the user each item's description and definition of done");
    expect(field(root, "a", "lifecycle")).toBe("active");

    const root2 = tree({ items: { a: { lifecycle: "ready" } } });
    const d = json(root2, "set", "item/a", "--lifecycle", "active");
    const a = review(d.advisories);
    expect(a?.refs).toEqual(["item/a"]);
    expect(a?.mode).toBe("warn");
    expect(field(root2, "a", "status")).toBe("draft"); // never promoted on its own
  });

  test("strict: refused before writing, with the advisory in the error", () => {
    const root = tree({ mode: "strict", items: { a: { lifecycle: "ready" } } });
    const a = refused(root, "set", "item/a", "--lifecycle", "active");
    expect(a.refs).toEqual(["item/a"]);
    // Text: the same refusal on stderr.
    const t = text(root, "set", "item/a", "--lifecycle", "review");
    expect(t.code).toBe(ExitCode.Conflict);
    expect(t.stderr).toContain("pdocs: refusing: checks.workItemReview.mode is strict");
  });

  test("strict: deprecated cannot satisfy it", () => {
    const root = tree({ mode: "strict", items: { a: { lifecycle: "ready", status: "deprecated" } } });
    refused(root, "set", "item/a", "--lifecycle", "active");
  });

  test("strict: a combined approved status and start succeeds", () => {
    const root = tree({ mode: "strict", items: { a: { lifecycle: "ready" } } });
    const d = json(root, "set", "item/a", "--status", "stable", "--lifecycle", "active");
    expect(d.advisories).toEqual([]);
    expect(field(root, "a", "lifecycle")).toBe("active");
    expect(field(root, "a", "status")).toBe("stable");
  });

  test("a stable item starts silently in either mode", () => {
    const root = tree({ mode: "strict", items: { a: { lifecycle: "ready", status: "stable" } } });
    expect(json(root, "set", "item/a", "--lifecycle", "active").advisories).toEqual([]);
  });

  test("strict: an unreviewed item filed straight into started work is refused; with --status stable it is written", () => {
    const root = tree({ mode: "strict" });
    refused(root, "new", "item", "x", "--kind", "task", "--lifecycle", "active");
    expect(existsSync(join(root, "docs/items/x.md"))).toBe(false);
    const d = json(root, "new", "item", "x", "--kind", "task", "--lifecycle", "active", "--status", "stable");
    expect(d.advisories).toEqual([]);
    // Draft creation stays supported.
    expect(json(root, "new", "item", "y", "--kind", "task").advisories).toEqual([]);
  });
});

describe("cycles", () => {
  test("starting a cycle reports its unreviewed members; strict refuses until they are reviewed", () => {
    const shape: Shape = {
      cycles: { "2026-10-next": "planned" },
      items: {
        m: { lifecycle: "ready", cycle: "2026-10-next" },
        ok: { lifecycle: "ready", status: "stable", cycle: "2026-10-next" },
        done: { lifecycle: "done", cycle: "2026-10-next" },
      },
    };
    const warn = tree(shape);
    const d = json(warn, "set", "cycle/2026-10-next", "--lifecycle", "active");
    expect(reasons(review(d.advisories))).toEqual({ "item/m": "active-cycle" });

    const strict = tree({ ...shape, mode: "strict" });
    expect(refused(strict, "set", "cycle/2026-10-next", "--lifecycle", "active").refs).toEqual(["item/m"]);
    json(strict, "set", "item/m", "--status", "stable");
    expect(json(strict, "set", "cycle/2026-10-next", "--lifecycle", "active").advisories).toEqual([]);
  });

  test("a later join to the active cycle — set or new — is reported, and refused in strict", () => {
    const shape: Shape = { cycles: { "2026-09-now": "active" }, items: { late: { lifecycle: "backlog" } } };
    const warn = tree(shape);
    expect(review(json(warn, "set", "item/late", "--cycle", "2026-09-now").advisories)?.refs).toEqual([
      "item/late",
    ]);
    expect(
      review(json(warn, "new", "item", "born", "--kind", "task", "--cycle", "2026-09-now").advisories)?.refs
    ).toEqual(["item/born"]);

    const strict = tree({ ...shape, mode: "strict" });
    refused(strict, "set", "item/late", "--cycle", "2026-09-now");
    refused(strict, "new", "item", "born", "--kind", "task", "--cycle", "2026-09-now");
    expect(json(strict, "set", "item/late", "--cycle", "2026-09-now", "--status", "stable").advisories).toEqual([]);
  });

  test("joining a planned cycle is drafting, not a start", () => {
    const root = tree({ mode: "strict", cycles: { "2026-10-next": "planned" }, items: { a: { lifecycle: "backlog" } } });
    expect(json(root, "set", "item/a", "--cycle", "2026-10-next").advisories).toEqual([]);
  });
});

describe("strict leaves repairs and unrelated edits possible", () => {
  const violating = (): string =>
    tree({ mode: "strict", items: { a: { lifecycle: "active" } }, cycles: { "2026-09-now": "active" } });

  test("an unrelated edit to an item already in violation is written, and reported", () => {
    const root = violating();
    const d = json(root, "set", "item/a", "--priority", "high");
    expect(review(d.advisories)?.refs).toEqual(["item/a"]);
    expect(json(root, "set", "item/a", "--lifecycle", "review").advisories.length).toBe(1);
  });

  test("review, finish or step back: each is allowed", () => {
    expect(json(violating(), "set", "item/a", "--status", "stable").advisories).toEqual([]);
    expect(json(violating(), "set", "item/a", "--lifecycle", "done").advisories).toEqual([]);
    expect(json(violating(), "set", "item/a", "--lifecycle", "ready").advisories).toEqual([]);
  });

  test("starting an item the active cycle already flagged is refused; stepping it back is not", () => {
    const shape: Shape = {
      mode: "strict",
      cycles: { "2026-09-now": "active" },
      items: { m: { lifecycle: "ready", cycle: "2026-09-now" }, s: { lifecycle: "active", cycle: "2026-09-now" } },
    };
    // `m` already needs review as an active-cycle member; starting it is a start.
    const a = refused(tree(shape), "set", "item/m", "--lifecycle", "active");
    expect(reasons(a)).toEqual({ "item/m": "started" });
    // `s` is started; stepping it back to `ready` in the cycle only lessens it.
    expect(reasons(review(json(tree(shape), "set", "item/s", "--lifecycle", "ready").advisories))).toEqual({
      "item/s": "active-cycle",
    });
    // An unrelated edit to the flagged member is still allowed.
    expect(json(tree(shape), "set", "item/m", "--priority", "low").advisories.length).toBe(1);
  });

  test("demoting started work to draft is refused: check would newly fail", () => {
    const root = tree({ mode: "strict", items: { a: { lifecycle: "active", status: "stable" } } });
    refused(root, "set", "item/a", "--status", "draft");
  });

  test("a cycle start does not refuse on members that already violated", () => {
    const root = tree({
      mode: "strict",
      cycles: { "2026-10-next": "planned" },
      items: { a: { lifecycle: "active", cycle: "2026-10-next" } },
    });
    const d = json(root, "set", "cycle/2026-10-next", "--lifecycle", "active");
    expect(reasons(review(d.advisories))).toEqual({ "item/a": "started" });
  });
});

describe("what never triggers", () => {
  test("an archived item, even one left started, is not reported", () => {
    const root = tree({ archived: { "old-active": { lifecycle: "active" } } });
    expect(review(json(root, "view", "board").advisories)).toBeUndefined();
  });

  test("a closed or abandoned cycle's unstarted drafts get no on-start finding", () => {
    for (const lc of ["closed", "abandoned"]) {
      const root = tree({ cycles: { "2026-08-past": lc }, items: { left: { lifecycle: "backlog", cycle: "2026-08-past" } } });
      const r = run(root, "view", "cycle", "2026-08-past", "--format", "json");
      expect(r.code).toBe(ExitCode.Success);
      expect(JSON.parse(r.stdout).data.advisories).toEqual([]);
    }
  });
});

describe("new item, text", () => {
  test("the advisory prints last; a strict refusal says to rerun the same new", () => {
    const warn = tree({ cycles: { "2026-09-now": "active" } });
    const t = text(warn, "new", "item", "born", "--kind", "task", "--cycle", "2026-09-now");
    expect(t.code).toBe(ExitCode.Success);
    const lines = t.stdout.trimEnd().split("\n");
    expect(lines.at(-2)).toBe(
      "advisory (work-item-review): 1 item in the active cycle has no reviewed document (`status: stable`): item/born (draft, triage in active cycle 2026-09-now)."
    );
    expect(lines.at(-1)).toStartWith("  next: Show the user each item's description");

    const strict = tree({ mode: "strict" });
    const r = text(strict, "new", "item", "born", "--kind", "task", "--lifecycle", "active");
    expect(r.code).toBe(ExitCode.Conflict);
    expect(r.stderr).toContain("run this same `pdocs new` command again with `--status stable` added");
    expect(r.stderr).not.toContain("pdocs set");
  });
});

describe("views", () => {
  const shape: Shape = {
    cycles: { "2026-09-now": "active", "2026-10-next": "planned" },
    items: {
      loose: { lifecycle: "ready" },
      member: { lifecycle: "ready", cycle: "2026-09-now" },
      fine: { lifecycle: "ready", status: "stable" },
      later: { lifecycle: "ready", cycle: "2026-10-next" },
      gone: { lifecycle: "ready", status: null },
    },
  };

  test("view ready: unreviewed items reported before they start, and status in JSON on every entry", () => {
    const root = tree(shape);
    const d = json(root, "view", "ready");
    expect(reasons(review(d.advisories))).toEqual({
      "item/gone": "on-start",
      "item/later": "on-start",
      "item/loose": "on-start",
      "item/member": "active-cycle",
    });
    expect(d.reviewMode).toBe("warn");
    expect(Object.fromEntries(d.items.map((e: { slug: string; status: string | null }) => [e.slug, e.status]))).toEqual({
      fine: "stable",
      gone: null,
      later: "draft",
      loose: "draft",
      member: "draft",
    });
  });

  test("view ready, text: a tag for each non-stable item, nothing for a stable one, advice last", () => {
    const root = tree(shape);
    const r = text(root, "view", "ready");
    expect(r.code).toBe(ExitCode.Success);
    const lines = r.stdout.trimEnd().split("\n");
    expect(lines.find((l) => l.includes("docs/items/loose.md"))?.endsWith("— loose [draft]")).toBe(true);
    expect(lines.find((l) => l.includes("docs/items/gone.md"))?.endsWith("— gone [no status]")).toBe(true);
    expect(lines.find((l) => l.includes("docs/items/fine.md"))?.endsWith("— fine")).toBe(true);
    expect(lines.at(-2)).toStartWith(
      "advisory (work-item-review): 4 items in the active cycle or not started yet have no reviewed document"
    );
    expect(lines.at(-1)).toStartWith("  next: ");
  });

  test("view ready stays usable, and exits 0, in strict mode", () => {
    const root = tree({ ...shape, mode: "strict" });
    const d = json(root, "view", "ready");
    expect(d.items.length).toBe(5);
    expect(review(d.advisories)?.mode).toBe("strict");
    expect(d.reviewMode).toBe("strict");
  });

  test("view cycle: an active cycle's members are violations, a planned one's are on-start", () => {
    const root = tree(shape);
    expect(reasons(review(json(root, "view", "cycle", "2026-09-now").advisories))).toEqual({
      "item/member": "active-cycle",
    });
    expect(reasons(review(json(root, "view", "cycle", "2026-10-next").advisories))).toEqual({
      "item/later": "on-start",
    });
    const t = text(root, "view", "cycle", "2026-09-now");
    expect(t.stdout).toContain("— member [draft]");
    expect(t.stdout).toContain("advisory (work-item-review): 1 item in the active cycle has no reviewed document");
  });

  test("view board carries violations only, beside the archive advice", () => {
    const root = tree(shape);
    const d = json(root, "view", "board");
    expect(reasons(review(d.advisories))).toEqual({ "item/member": "active-cycle" });
    expect(d.groups.unstarted.every((e: { status?: unknown }) => "status" in e)).toBe(true);
  });

  test("text and JSON agree on the advisory", () => {
    const root = tree(shape);
    for (const args of [["view", "ready"], ["view", "board"], ["view", "cycle", "2026-09-now"], ["check"]]) {
      // `check` exits 9 here: `gone` has no status, which is its own problem.
      const a = review(JSON.parse(run(root, ...args, "--format", "json").stdout).data.advisories) as Adv & {
        message: string;
        action: string;
      };
      const t = text(root, ...args).stdout;
      expect(t).toContain(`advisory (${a.id}): ${a.message}\n  next: ${a.action}\n`);
    }
  });
});

describe("view unreviewed — the audit of finished drafts", () => {
  test("done items not stable, live; --all adds the archive; never advises, never fails", () => {
    const root = tree({
      mode: "strict",
      items: {
        "done-draft": { lifecycle: "done" },
        "done-deprecated": { lifecycle: "done", status: "deprecated" },
        "done-stable": { lifecycle: "done", status: "stable" },
        "dropped-draft": { lifecycle: "dropped" },
        "active-draft": { lifecycle: "backlog" },
      },
      archived: { "old-draft": { lifecycle: "done" } },
    });
    const live = json(root, "view", "unreviewed");
    expect(live.items.map((e: { slug: string }) => e.slug).sort()).toEqual(["done-deprecated", "done-draft"]);
    expect(live.advisories).toEqual([]);
    const all = json(root, "view", "unreviewed", "--all");
    expect(all.items.map((e: { slug: string }) => e.slug).sort()).toEqual([
      "done-deprecated",
      "done-draft",
      "old-draft",
    ]);
    // Finished drafts are not a strict check failure.
    expect(text(root, "check").code).toBe(ExitCode.Success);
  });
});
