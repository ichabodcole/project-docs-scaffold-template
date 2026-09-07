// Claims about THIS repository's `.project-docs.json`, and nothing else.
//
// NOT MIRRORED INTO THE PAYLOAD, deliberately, and the reason is the same one
// that keeps `golden.test.ts` here: a generated project has no `dist/` and no
// cookiecutter payload, so an assertion that those two are excluded is true
// here and false everywhere the scaffold ships. It used to sit inside
// `rules.test.ts`; mirroring that file made it fail in the payload copy, which
// is exactly the signal that it was in the wrong file.

import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { loadConfig } from "../../docs-lint/config.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");

describe("this repository's own lint configuration", () => {
  // These two trees used to be a constant inside `unlinted-links.ts`, which put
  // one repository's directory names in a file shipped to every other one. They
  // are config now, so this is what holds them in place.
  test("excludes its build output and its template payload", () => {
    const config = loadConfig(REPO_ROOT);
    expect(config.lint.exclude).toContain("dist/**");
    expect(config.lint.exclude).toContain(
      "\\{\\{cookiecutter.project_slug\\}\\}/**"
    );
  });

  // `{a,b}` is alternation in a glob, so a directory literally named
  // `{{cookiecutter.project_slug}}` needs its braces escaped or the pattern
  // matches nothing — silently, which is the bad way for an exclusion to fail.
  // The escaping is easy to lose in a JSON edit, so this holds it.
  //
  // It also has to live in an UNMIRRORED file: cookiecutter renders every
  // payload file through Jinja, so these literals would be substituted on
  // generation and the test would assert something else entirely.
  test("a literal-brace path needs escaped braces, and gets no warning without them", () => {
    const escaped = new Bun.Glob("\\{\\{cookiecutter.project_slug\\}\\}/**");
    const bare = new Bun.Glob("{{cookiecutter.project_slug}}/**");
    const path = "{{cookiecutter.project_slug}}/docs/README.md";
    expect(escaped.match(path)).toBe(true);
    expect(bare.match(path)).toBe(false);
  });
});
