// The template-header advisory: `pdocs new` copies a template's header comment
// into the document it writes, and `pdocs check` reports a document that still
// holds it — one advisory naming every such document, after the verdict, with
// the exit code left alone. Templates themselves are never reported.
//
// Real temp trees and the real CLI, in the style of `review-advisory.test.ts`.

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
import { TEMPLATE_HEADER_ADVISORY, advisoryLines, templateHeaderAdvisory } from "../advisories.ts";
import { ExitCode } from "../envelope.ts";
import { TEMPLATE_HEADER_LINE, hasTemplateHeader } from "../lint/rules.ts";
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

/** The payload's docs tree, with `files` written over it. */
function tree(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "pdocs-header-"));
  roots.push(root);
  cpSync(join(PAYLOAD, "docs"), join(root, "docs"), { recursive: true });
  copyFileSync(join(PAYLOAD, ".project-docs.json"), join(root, ".project-docs.json"));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  Bun.spawnSync(["git", "init", "-q"], { cwd: root, env: childEnv() });
  return root;
}

/** An item written the real way: `pdocs new` copies the template, header and all. */
function newItem(root: string, slug: string): string {
  const r = run(
    root,
    "new",
    "item",
    slug,
    "--kind",
    "task",
    "--title",
    `Fix ${slug}`,
    "--description",
    `Fixes ${slug}.`,
    "--by",
    "test",
    "--format",
    "json"
  );
  expect(r.code).toBe(ExitCode.Success);
  return JSON.parse(r.stdout).data.path as string;
}

/** `text` with its leading template header comment removed, and nothing else. */
const stripHeader = (text: string) =>
  text.replace(/<!--\s*OWNERSHIP \(of this template file[\s\S]*?-->\n\n?/, "");

function check(root: string) {
  const t = run(root, "check", "--format", "text");
  const j = run(root, "check", "--format", "json");
  expect(t.stderr).toBe("");
  expect(j.stderr).toBe("");
  return { text: t, json: { code: j.code, data: JSON.parse(j.stdout).data } };
}

type Adv = { id: string; message: string; action: string; refs?: string[] };
const header = (advisories: Adv[]) => advisories.find((a) => a.id === TEMPLATE_HEADER_ADVISORY);

describe("pdocs check — the template-header advisory", () => {
  test("a filled document that keeps the header is reported, and exit stays 0", () => {
    const root = tree();
    const path = newItem(root, "kept");
    expect(readFileSync(join(root, path), "utf8")).toContain(TEMPLATE_HEADER_LINE);

    const { text, json } = check(root);
    expect(text.code).toBe(ExitCode.Success);
    expect(json.code).toBe(ExitCode.Success);
    expect(json.data.clean).toBe(true);
    expect(json.data.total).toBe(0);

    const a = header(json.data.advisories);
    expect(a?.refs).toEqual([path]);
    expect(a?.message).toBe(`1 document still holds its template's header comment: ${path}.`);
    expect(a?.action).toContain("`OWNERSHIP (of this template file`");

    // Text and JSON say the same thing, after the verdict.
    expect(text.stdout).toContain(`docs-lint: clean\n\n${advisoryLines([a!]).join("\n")}\n`);
    expect(text.stdout.endsWith(`${advisoryLines(json.data.advisories).join("\n")}\n`)).toBe(true);
  });

  test("templates are never reported, though every one holds the header", () => {
    const root = tree();
    const { json } = check(root);
    // The payload's templates carry the header: this tree would report them
    // if the exclusion went.
    expect(json.data.templates.length).toBeGreaterThan(0);
    for (const t of json.data.templates as string[])
      expect(hasTemplateHeader(readFileSync(join(root, t), "utf8"))).toBe(true);
    expect(header(json.data.advisories)).toBeUndefined();
  });

  test("a document without the header is not reported, nor one that only quotes its line", () => {
    const root = tree();
    const path = newItem(root, "cleaned");
    const abs = join(root, path);
    const stripped = stripHeader(readFileSync(abs, "utf8"));
    expect(stripped).not.toContain(TEMPLATE_HEADER_LINE);
    writeFileSync(
      abs,
      `${stripped}\nThe header opens with \`${TEMPLATE_HEADER_LINE} — not of documents created from it)\`.\n`
    );
    const { text, json } = check(root);
    expect(json.data.advisories).toEqual([]);
    expect(text.stdout.trimEnd().endsWith("docs-lint: clean")).toBe(true);
  });

  test("the warning only appends: the transcript before it is byte-identical", () => {
    const root = tree();
    const path = newItem(root, "both");
    const kept = check(root).text.stdout;
    const abs = join(root, path);
    writeFileSync(abs, stripHeader(readFileSync(abs, "utf8")));
    const clean = check(root);
    expect(clean.text.code).toBe(ExitCode.Success);
    expect(clean.json.data.advisories).toEqual([]);
    expect(clean.text.stdout.endsWith("\ndocs-lint: clean\n")).toBe(true);
    const a = templateHeaderAdvisory([path])!;
    expect(kept).toBe(`${clean.text.stdout}\n${advisoryLines([a]).join("\n")}\n`);
  });

  test("one advisory for many documents, naming five and counting the rest", () => {
    const root = tree();
    const paths = ["a", "b", "c", "d", "e", "f", "g"].map((s) => newItem(root, s)).sort();
    const { json } = check(root);
    const all = (json.data.advisories as Adv[]).filter((x) => x.id === TEMPLATE_HEADER_ADVISORY);
    expect(all.length).toBe(1);
    expect(all[0]!.refs).toEqual(paths);
    expect(all[0]!.message).toBe(
      `7 documents still hold their template's header comment: ${paths.slice(0, 5).join(", ")} and 2 more.`
    );
  });

  test("an excluded document is not reported", () => {
    const root = tree();
    const path = newItem(root, "excluded");
    const cfgPath = join(root, ".project-docs.json");
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    cfg.lint = { ...(cfg.lint ?? {}), exclude: [path] };
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
    expect(header(check(root).json.data.advisories)).toBeUndefined();
  });
});

describe("the shipped templates", () => {
  test("every template's header says to delete it once the document is written", () => {
    const root = tree();
    const { json } = check(root);
    for (const t of json.data.templates as string[]) {
      const text = readFileSync(join(root, t), "utf8");
      expect(text).toContain("ONCE WRITTEN: delete this whole comment block from the document.");
    }
  });
});

// ---------------------------------------------------------------------------------------
// What counts as the header: an HTML comment opening with the line, outside code.
// ---------------------------------------------------------------------------------------

const OPEN = `<!--\n${TEMPLATE_HEADER_LINE} — not of documents created from it): it is\nyours to edit.\n-->`;

/** A body for a work document, around `middle`. */
const body = (middle: string) => `# A page\n\nSome prose.\n\n${middle}\n\nMore prose.\n`;

/** Each case: the body text, and whether it holds a real header. */
const CASES: Record<string, { text: string; header: boolean }> = {
  "backtick fence": { text: body(`\`\`\`markdown\n${OPEN}\n\`\`\``), header: false },
  "tilde fence": { text: body(`~~~\n${OPEN}\n~~~`), header: false },
  "unclosed fence": { text: body(`\`\`\`\n${OPEN}`), header: false },
  "indented code": { text: body(OPEN.split("\n").map((l) => `    ${l}`).join("\n")), header: false },
  "inline code span": { text: body(`Templates open with \`<!-- ${TEMPLATE_HEADER_LINE}\`.`), header: false },
  "double-backtick span": { text: body(`Templates open with \`\`<!-- ${TEMPLATE_HEADER_LINE}\`\`.`), header: false },
  "CRLF endings": { text: body(OPEN).replace(/\n/g, "\r\n"), header: true },
  "<!-- on its own line": { text: body(OPEN), header: true },
  "the opening on the <!-- line": {
    text: body(`<!-- ${TEMPLATE_HEADER_LINE} — not of documents created from it)\n-->`),
    header: true,
  },
  "not first in the file": { text: body(`<!-- an earlier comment -->\n\n${OPEN}`), header: true },
  "two blocks": { text: body(`${OPEN}\n\n${OPEN}`), header: true },
  "after a code block": { text: body(`\`\`\`\ncode\n\`\`\`\n\n${OPEN}`), header: true },
  "after an inline span": { text: body(`See \`code\`.\n\n${OPEN}`), header: true },
};

describe("hasTemplateHeader", () => {
  for (const [name, c] of Object.entries(CASES))
    test(`${name}: ${c.header ? "a header" : "not a header"}`, () => {
      expect(hasTemplateHeader(c.text)).toBe(c.header);
    });
});

describe("pdocs check — code is not the header", () => {
  test("only the documents holding a real header are reported, one row each", () => {
    const files: Record<string, string> = {};
    const expected: string[] = [];
    let n = 0;
    for (const c of Object.values(CASES)) {
      const rel = `docs/features/case-${++n}/feature.md`;
      const fm = [
        "---",
        "type: feature",
        `title: Case ${n}`,
        "description: A case.",
        "status: draft",
        "lifecycle: backlog",
        "generated: { by: test, at: 2026-10-01 }",
        "---",
        "",
      ].join("\n");
      files[rel] = fm + c.text;
      if (c.header) expected.push(rel);
    }
    const root = tree(files);
    const { json } = check(root);
    expect(json.code).toBe(ExitCode.Success);
    expect(header(json.data.advisories)?.refs).toEqual(expected.sort());
  });

  test("a `lint.skip` directory is not reported", () => {
    const root = tree({ "docs/scratch/notes.md": body(OPEN) });
    const cfgPath = join(root, ".project-docs.json");
    // Without the skip, the page is reported: the fixture is a real header.
    expect(header(check(root).json.data.advisories)?.refs).toEqual(["docs/scratch/notes.md"]);
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    cfg.lint = { ...(cfg.lint ?? {}), skip: [...(cfg.lint?.skip ?? []), "scratch"] };
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
    expect(header(check(root).json.data.advisories)).toBeUndefined();
  });
});
