// The link rewriter: when documents move, every relative link that pointed at
// them — and every relative link inside them — is respelled to point at the
// same thing from where it now sits.
//
// PURE: text in, text out, and a count. It reads no disk and writes none, so
// `promote`, `archive` and the migration can each decide what to read and what
// to write, and the rewriting itself is tested without a tree.
//
// It reads links with the checker's own grammar (`MARKDOWN_LINK_RE`, scanned
// over `stripCode`), so a link inside code is not rewritten and a link the
// checker would read is never missed.

import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { MARKDOWN_LINK_RE, stripCode } from "./docs-lint/index.ts";

/**
 * Where `abs` lives after the move. `moveMap` maps absolute old paths to
 * absolute new ones; a key may be a FILE or a FOLDER, and a folder carries
 * everything under it. The longest matching key wins.
 */
export function movedTo(abs: string, moveMap: ReadonlyMap<string, string>): string {
  const exact = moveMap.get(abs);
  if (exact !== undefined) return exact;
  let best: string | null = null;
  for (const key of moveMap.keys())
    if (abs.startsWith(key + sep) && (best === null || key.length > best.length)) best = key;
  return best === null ? abs : (moveMap.get(best) as string) + abs.slice(best.length);
}

/**
 * Rewrite one file's links.
 *
 * `fromFile` is where the file sits now (its links resolve against that);
 * `toFile` is where it will sit (equal to `fromFile` when it does not move).
 * A link is respelled only when its target moves or the file itself does; any
 * other link keeps its exact spelling. URLs, `mailto:`, absolute paths and
 * same-file anchors are never touched. The anchor, a trailing `/` and pointy
 * brackets survive, and a `./` prefix is kept where the new path does not
 * climb.
 */
export function rewriteLinks(
  text: string,
  fromFile: string,
  toFile: string,
  moveMap: ReadonlyMap<string, string>
): { text: string; changed: number } {
  const fileMoves = fromFile !== toFile;
  const fromDir = dirname(fromFile);
  const toDir = dirname(toFile);
  const edits: Array<{ start: number; end: number; value: string }> = [];

  for (const m of stripCode(text).matchAll(MARKDOWN_LINK_RE)) {
    const raw = m[1];
    if (raw === undefined || m.index === undefined) continue;
    // The destination's position in the ORIGINAL text: `](` is two characters.
    const start = m.index + 2;
    const written = text.slice(start, start + raw.length);
    const pointy = /^<.*>$/.test(written.trim());
    const target = written.trim().replace(/^<(.*)>$/, "$1");
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // a URL, mailto:, …
    const hash = target.indexOf("#");
    const pathPart = hash === -1 ? target : target.slice(0, hash);
    const anchor = hash === -1 ? "" : target.slice(hash);
    if (pathPart === "" || isAbsolute(pathPart)) continue;

    const oldAbs = resolve(fromDir, pathPart);
    const newAbs = movedTo(oldAbs, moveMap);
    if (newAbs === oldAbs && !fileMoves) continue;

    let rel = relative(toDir, newAbs).split(sep).join("/");
    if (rel === "") rel = ".";
    if (pathPart.endsWith("/") && !rel.endsWith("/")) rel += "/";
    if (pathPart.startsWith("./") && !rel.startsWith("../") && !rel.startsWith("./"))
      rel = `./${rel}`;
    if (rel === pathPart) continue;

    const dest = pointy ? `<${rel}${anchor}>` : `${rel}${anchor}`;
    const lead = written.match(/^\s*/)?.[0] ?? "";
    const trail = written.match(/\s*$/)?.[0] ?? "";
    edits.push({ start, end: start + raw.length, value: `${lead}${dest}${trail}` });
  }

  let out = text;
  for (const e of edits.reverse()) out = out.slice(0, e.start) + e.value + out.slice(e.end);
  return { text: out, changed: edits.length };
}
