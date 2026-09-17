// The cookiecutter hook's install and rollback paths, exercised.
//
// THIS FILE EXISTS BECAUSE THE ROLLBACK SHIPPED BROKEN. `_move`'s collision
// branch was added to stop a half-install, was never run, and restored
// `scripts/pdocs` to `<slug>/pdocs` — a different directory, from which the
// recovery command the hook prints does not resolve. Nothing in the repository
// referenced `post_gen_project.py` at all, so no gate could have said so.
//
// The hook is valid Python as it sits on disk: its only Jinja is inside string
// literals, so it imports without cookiecutter rendering it. `main()` is behind
// an `__main__` guard, so importing does not run the new-folder branch.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { childEnv } from "./pdocs/test-env.ts";

const HOOK = join(import.meta.dir, "..", "hooks", "post_gen_project.py");

/** A generated payload sitting in its slug directory, ready to be installed. */
function payload(slug: string): void {
  mkdirSync(join(slug, "docs"), { recursive: true });
  writeFileSync(join(slug, "docs", "README.md"), "# docs\n");
  mkdirSync(join(slug, "scripts", "pdocs"), { recursive: true });
  writeFileSync(join(slug, "scripts", "pdocs", "cli.ts"), "// cli\n");
  writeFileSync(join(slug, ".project-docs.json"), "{}\n");
}

/** Run the hook's current-directory branch with cwd set to the slug folder. */
function install(parent: string): { code: number; out: string } {
  const slug = join(parent, "my-project");
  const driver = join(parent, "_driver.py");
  writeFileSync(
    driver,
    [
      "import importlib.util, sys",
      `spec = importlib.util.spec_from_file_location("hook", ${JSON.stringify(HOOK)})`,
      "m = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(m)",
      "m.install_to_current_directory()",
    ].join("\n")
  );
  const r = spawnSync("python3", [driver], { cwd: slug, encoding: "utf8", env: childEnv() });
  return { code: r.status ?? -1, out: `${r.stdout}${r.stderr}` };
}

function fixture(): { parent: string; slug: string } {
  const parent = mkdtempSync(join(tmpdir(), "pdocs-hook-"));
  const slug = join(parent, "my-project");
  payload(slug);
  return { parent, slug };
}

describe("the hook installs the layer into an existing project", () => {
  test("an existing scripts/ is merged, not collided with", () => {
    const { parent, slug } = fixture();
    mkdirSync(join(parent, "scripts", "build"), { recursive: true });
    writeFileSync(join(parent, "scripts", "build", "deploy.ts"), "// theirs\n");

    const { out } = install(parent);

    expect(out).toContain("Documentation structure installed");
    // Theirs survives, ours lands beside it.
    expect(existsSync(join(parent, "scripts", "build", "deploy.ts"))).toBe(true);
    expect(existsSync(join(parent, "scripts", "pdocs", "cli.ts"))).toBe(true);
    expect(existsSync(join(parent, "docs", "README.md"))).toBe(true);
    expect(existsSync(slug)).toBe(false);
  });

  // The success message used to end "the install aborted above" — after an
  // install that had not. An abort says so itself, and says it once.
  test("a successful install says nothing about an abort", () => {
    const { parent } = fixture();
    const { out } = install(parent);
    expect(out).toContain("Documentation structure installed");
    expect(out).not.toContain("abort");
  });
});

describe("a collision aborts and leaves the tree as it was found", () => {
  // The regression this file was written for. `docs/` and `scripts/pdocs/` have
  // both already moved out by the time `.project-docs.json` collides, so this is
  // the case with the most to put back.
  test("a colliding .project-docs.json restores both moved paths to source", () => {
    const { parent, slug } = fixture();
    writeFileSync(join(parent, ".project-docs.json"), '{"mine": true}\n');

    const { out } = install(parent);

    expect(out).toContain("Nothing was installed");

    // Restored to where they came from — NOT to <slug>/pdocs, which is what
    // rolling back through basename() produces.
    expect(existsSync(join(slug, "scripts", "pdocs", "cli.ts"))).toBe(true);
    expect(existsSync(join(slug, "pdocs"))).toBe(false);
    expect(existsSync(join(slug, "docs", "README.md"))).toBe(true);

    // Their file is untouched and nothing of ours reached the parent.
    expect(Bun.file(join(parent, ".project-docs.json")).size).toBeGreaterThan(3);
    expect(existsSync(join(parent, "docs"))).toBe(false);
  });

  test("a rollback removes the scripts/ it created", () => {
    const { parent } = fixture();
    writeFileSync(join(parent, ".project-docs.json"), '{"mine": true}\n');

    install(parent);

    // "your tree is as you left it" has to be true when it is printed: a
    // project with no scripts/ of its own must not gain an empty one.
    expect(existsSync(join(parent, "scripts"))).toBe(false);
    expect(readdirSync(parent).sort()).toEqual(
      [".project-docs.json", "_driver.py", "my-project"].sort()
    );
  });

  test("a scripts/ they already owned is left in place by the rollback", () => {
    const { parent, slug } = fixture();
    mkdirSync(join(parent, "scripts", "build"), { recursive: true });
    writeFileSync(join(parent, "scripts", "build", "deploy.ts"), "// theirs\n");
    writeFileSync(join(parent, ".project-docs.json"), '{"mine": true}\n');

    install(parent);

    expect(existsSync(join(parent, "scripts", "build", "deploy.ts"))).toBe(true);
    expect(existsSync(join(parent, "scripts", "pdocs"))).toBe(false);
    expect(existsSync(join(slug, "scripts", "pdocs", "cli.ts"))).toBe(true);
  });

  test("a colliding scripts/pdocs/ aborts before .project-docs.json moves", () => {
    const { parent, slug } = fixture();
    mkdirSync(join(parent, "scripts", "pdocs"), { recursive: true });
    writeFileSync(join(parent, "scripts", "pdocs", "mine.ts"), "// theirs\n");

    const { out } = install(parent);

    expect(out).toContain("Nothing was installed");
    expect(Bun.file(join(parent, "scripts", "pdocs", "mine.ts")).size).toBeGreaterThan(0);
    expect(existsSync(join(slug, "docs", "README.md"))).toBe(true);
    expect(existsSync(join(slug, ".project-docs.json"))).toBe(true);
    expect(existsSync(join(parent, "docs"))).toBe(false);
  });

  test("a colliding docs/ aborts before anything moves", () => {
    const { parent, slug } = fixture();
    mkdirSync(join(parent, "docs"), { recursive: true });
    writeFileSync(join(parent, "docs", "mine.md"), "# theirs\n");

    const { out } = install(parent);

    expect(out).toContain("Installation aborted");
    // The upgrade pointer lives HERE, on the path where it is true.
    expect(out).toContain("/project-docs:update-project-docs");
    expect(out).not.toContain("Documentation structure installed");
    expect(Bun.file(join(parent, "docs", "mine.md")).size).toBeGreaterThan(0);
    expect(existsSync(join(slug, "scripts", "pdocs", "cli.ts"))).toBe(true);
    expect(existsSync(join(parent, "scripts"))).toBe(false);
  });
});
