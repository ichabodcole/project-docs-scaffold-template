// The server's request handling, in process: a recording runner stands in for
// the project's CLI, so "nothing was spawned" is a fact the test can read.

import { describe, expect, test } from "bun:test";
import { entry, portfolioEntry } from "../app/test-support.ts";
import type { PdocsResult } from "../lib/pdocs.ts";
import { failed, ok, OLD_ENTRY } from "../lib/test-support.ts";
import { createBoard, idleExpired, IDLE_LIMIT_MS, serveBoard, TOKEN_HEADER, tokenMatches } from "./server.ts";

const TOKEN = "a".repeat(64);
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

const BOARD = {
  view: "board",
  groups: {
    unstarted: [
      entry({ slug: "waiting", lifecycle: "triage" }),
      entry({ slug: "settled", lifecycle: "backlog" }),
      entry({ slug: "spare", lifecycle: "backlog" }),
    ],
  },
  advisories: [],
};
const PORTFOLIO = { view: "portfolio", cycles: [portfolioEntry("cycle", "c1", "planned")], features: [], advisories: [] };
const SET_OK = ok({
  path: "docs/items/waiting.md",
  changes: [
    { key: "lifecycle", before: "triage", after: "ready", changed: true },
    { key: "priority", before: null, after: "high", changed: true },
  ],
  advisories: [],
});

function harness(
  over: { set?: PdocsResult | (() => Promise<PdocsResult>); board?: unknown; gate?: Promise<void> } = {}
) {
  const calls: string[][] = [];
  const log: string[] = [];
  let clock = 1_000_000;
  /** What the fake project holds now, by slug: a test moves an item by writing here. */
  const moved: Record<string, object> = {};
  const current = () => ({
    ...BOARD,
    groups: { unstarted: BOARD.groups.unstarted.map((e) => ({ ...e, ...moved[e.slug] })) },
  });
  const board = createBoard({
    root: "/project",
    token: TOKEN,
    port: PORT,
    log: (line) => log.push(line),
    now: () => clock,
    run: async (args) => {
      calls.push(args);
      if (args[0] === "set") return typeof over.set === "function" ? over.set() : (over.set ?? SET_OK);
      if (over.gate) await over.gate;
      if (args[1] === "board") return ok(over.board ?? current());
      if (args[1] === "portfolio") return ok(PORTFOLIO);
      if (args[1] === "unreviewed") return ok({ view: "unreviewed", items: [], advisories: [] });
      if (args[1] === "cycle" && args[2] === "c1")
        return ok({ view: "cycle", cycle: entry({ slug: "c1", entity: "cycle", lifecycle: "planned" }), items: [] });
      if (args[1] === "feature" && args[2] === "f1") return ok({ view: "feature", feature: {}, items: [] });
      return failed(2, `no such ${args[1]}`);
    },
  });
  const request = (path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) =>
    board.fetch(
      new Request(`${BASE}${path}`, {
        method: init.method ?? (init.body === undefined ? "GET" : "POST"),
        headers: { host: `127.0.0.1:${PORT}`, [TOKEN_HEADER]: TOKEN, ...init.headers },
        body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
      })
    );
  return {
    board,
    calls,
    log,
    request,
    sets: () => calls.filter((c) => c[0] === "set"),
    current,
    move: (slug: string, to: object) => (moved[slug] = { ...moved[slug], ...to }),
    tick: (ms: number) => (clock += ms),
  };
}

const TRIAGE = { kind: "triage", ref: "item/waiting", lifecycle: "ready", priority: "high" };

/** The fake project's reads, for a test that swaps the runner. */
async function harnessRead(args: string[], h: ReturnType<typeof harness>): Promise<PdocsResult> {
  if (args[1] === "board") return ok(h.current());
  if (args[1] === "portfolio") return ok(PORTFOLIO);
  if (args[1] === "unreviewed") return ok({ view: "unreviewed", items: [], advisories: [] });
  return ok({ view: "cycle", cycle: entry({ slug: "c1", entity: "cycle", lifecycle: "planned" }), items: [] });
}

/** One snapshot request against a board whose every read gives `result`. */
async function createBoardWith(run: () => Promise<PdocsResult>): Promise<Response> {
  const board = createBoard({ root: "/project", token: TOKEN, port: PORT, run });
  return board.fetch(
    new Request(`${BASE}/api/snapshot`, { headers: { host: `127.0.0.1:${PORT}`, [TOKEN_HEADER]: TOKEN } })
  );
}

describe("who may call", () => {
  const cases: Array<[string, Record<string, string>, number]> = [
    ["no token", { [TOKEN_HEADER]: "" }, 401],
    ["a wrong token", { [TOKEN_HEADER]: "b".repeat(64) }, 401],
    ["a token of another length", { [TOKEN_HEADER]: "a" }, 401],
    ["a foreign Origin, with the right token", { origin: "http://evil.example" }, 403],
    ["the right host on another port as Origin", { origin: "http://127.0.0.1:9" }, 403],
    ["`localhost` as Origin", { origin: `http://localhost:${PORT}` }, 403],
    ["a null Origin", { origin: "null" }, 403],
    ["a foreign Host, with the right token and Origin", { host: "evil.example", origin: BASE }, 403],
    ["a Host on another port", { host: "127.0.0.1:9" }, 403],
  ];
  for (const [name, headers, status] of cases)
    test(`${name}: refused on a read and on a write, and nothing is spawned`, async () => {
      const h = harness();
      for (const res of [
        await h.request("/api/snapshot", { headers }),
        await h.request("/api/write", { headers, body: TRIAGE }),
        await h.request("/api/cycle/c1", { headers }),
        await h.request("/api/health", { headers }),
      ]) {
        expect(res.status).toBe(status);
        expect(((await res.json()) as { ok: boolean }).ok).toBe(false);
      }
      expect(h.calls).toEqual([]);
      expect(h.log.every((l) => l.startsWith("refused"))).toBe(true);
    });

  test("the board's own origin, or none, with the token: served", async () => {
    const h = harness();
    expect((await h.request("/api/snapshot", { headers: { origin: BASE } })).status).toBe(200);
    expect((await h.request("/api/snapshot")).status).toBe(200);
  });

  test("a token in the query string is never accepted, with or without a wrong header", async () => {
    const h = harness();
    for (const headers of [{ [TOKEN_HEADER]: "" }, { [TOKEN_HEADER]: "b".repeat(64) }]) {
      expect((await h.request(`/api/snapshot?token=${TOKEN}`, { headers })).status).toBe(401);
      expect((await h.request(`/api/write?token=${TOKEN}`, { headers, body: TRIAGE })).status).toBe(401);
      expect((await h.request(`/api/health?${TOKEN_HEADER}=${TOKEN}`, { headers })).status).toBe(401);
    }
    expect(h.calls).toEqual([]);
  });

  test("a Host that makes no URL is refused as foreign, not as a fault", async () => {
    const h = harness();
    for (const url of ["http://a b/api/snapshot", "http://[/api/snapshot", "not a url"]) {
      const res = await h.board.fetch({
        url,
        method: "GET",
        headers: new Headers({ host: "a b", [TOKEN_HEADER]: TOKEN }),
      } as unknown as Request);
      expect(res.status).toBe(403);
    }
    expect((await h.request("/api/snapshot", { headers: { host: "a b" } })).status).toBe(403);
    expect((await h.request("/api/snapshot", { headers: { host: "" } })).status).toBe(403);
    expect(h.calls).toEqual([]);
    expect(h.log.some((l) => l.startsWith("fault"))).toBe(false);
  });

  test("the token is compared whole", () => {
    expect(tokenMatches(TOKEN, TOKEN)).toBe(true);
    for (const given of [null, "", TOKEN.slice(1), `${TOKEN}a`, "b".repeat(64)]) expect(tokenMatches(given, TOKEN)).toBe(false);
  });

  test("anything outside `/api/` that the shell does not serve is not found, and spawns nothing", async () => {
    const h = harness();
    expect((await h.request("/etc/passwd")).status).toBe(404);
    expect((await h.request("/app/model.ts")).status).toBe(404);
    expect(h.calls).toEqual([]);
  });
});

describe("the shell", () => {
  // A real listener: Bun serves the page and what it links through `routes`.
  async function served(
    fn: (base: string, h: ReturnType<typeof harness>, server: ReturnType<typeof serveBoard>) => Promise<void>
  ): Promise<void> {
    const h = harness();
    const server = serveBoard(h.board);
    try {
      await fn(`http://127.0.0.1:${server.port}`, h, server);
    } finally {
      await server.stop();
    }
  }
  /** Every script and stylesheet the page links, fetched. */
  async function assets(base: string, html: string): Promise<string[]> {
    const paths = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]!);
    expect(paths.some((path) => path.endsWith(".js"))).toBe(true);
    expect(paths.some((path) => path.endsWith(".css"))).toBe(true);
    return Promise.all(
      paths.map(async (path) => {
        const res = await fetch(new URL(path, base));
        expect(res.status).toBe(200);
        return res.text();
      })
    );
  }

  test("`/` is the app, needs no token, and carries no token and nothing of the project", async () => {
    await served(async (base, h) => {
      const res = await fetch(`${base}/?token=${TOKEN}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      const html = await res.text();
      expect(html).toContain("<title>Work board</title>");
      expect(html).toContain('x-data="board"');
      expect(html).toContain('name="referrer" content="no-referrer"');
      const all = [html, ...(await assets(base, html))].join("\n");
      expect(all.includes(TOKEN_HEADER)).toBe(true);
      expect(all.includes("Alpine")).toBe(true);
      // Nothing was read to serve it, so nothing of the project can be in it.
      expect(h.calls).toEqual([]);
      for (const secret of [TOKEN, "/project", "Title of ", "docs/items/"]) expect(all.includes(secret)).toBe(false);
    });
  });

  test("the page and what it links ask for nothing outside this server", async () => {
    await served(async (base) => {
      const html = await (await fetch(`${base}/`)).text();
      const all = [html, ...(await assets(base, html))].join("\n");
      // A URL in a comment or a licence note is not a request; a loader or a link is.
      expect(html).not.toMatch(/(?:src|href)="(?:https?:)?\/\//);
      expect(/@import|url\(\s*["']?https?:/.test(all)).toBe(false);
      expect(/cdn\.tailwindcss|jsdelivr|unpkg|googleapis/.test(all)).toBe(false);
    });
  });

  test("the page and its chunks say what they are and send no referrer; the page is never cached", async () => {
    await served(async (base) => {
      const res = await fetch(`${base}/`);
      const html = await res.text();
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("referrer-policy")).toBe("no-referrer");
      expect(res.headers.get("cache-control")).toBe("no-store");
      const paths = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]!);
      for (const path of paths) {
        const chunk = await fetch(`${base}${path}`);
        expect(chunk.status).toBe(200);
        expect(chunk.headers.get("x-content-type-options")).toBe("nosniff");
        expect(chunk.headers.get("referrer-policy")).toBe("no-referrer");
        expect(chunk.headers.get("content-type")).toMatch(/^text\/(javascript|css)/);
      }
      const head = await fetch(`${base}/`, { method: "HEAD" });
      expect(head.status).toBe(200);
      expect(await head.text()).toBe("");
    });
  });

  test("the page answers only GET and HEAD, and only as the board's own host", async () => {
    await served(async (base, h, server) => {
      const port = server.port;
      const ask = (path: string, method: string, host: string) =>
        server.fetch(new Request(`${base}${path}`, { method, headers: { host } }));
      const html = await (await ask("/", "GET", `127.0.0.1:${port}`)).text();
      expect(html).toContain('x-data="board"');
      const chunk = /src="(\/[^"]+)"/.exec(html)![1]!;
      for (const path of ["/", chunk]) {
        expect((await ask(path, "GET", `127.0.0.1:${port}`)).status).toBe(200);
        for (const method of ["POST", "PUT", "DELETE"]) expect((await ask(path, method, `127.0.0.1:${port}`)).status).toBe(405);
        for (const host of ["evil.example", `localhost:${port}`, "127.0.0.1:9", ""]) {
          const res = await ask(path, "GET", host);
          expect(res.status).toBe(403);
          expect(await res.text()).not.toContain("x-data");
        }
      }
      expect((await fetch(`${base}/`, { method: "POST" })).status).toBe(405);
      expect((await ask("/etc/passwd", "GET", `127.0.0.1:${port}`)).status).toBe(404);
      expect((await ask("/app/model.ts", "GET", `127.0.0.1:${port}`)).status).toBe(404);
      expect(h.calls).toEqual([]);
    });
  });

  test("a board takes the port it asks for when that is free, and the port answers again after a restart", async () => {
    const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("") });
    const free = probe.port ?? 0;
    await probe.stop(true);
    for (let round = 0; round < 2; round++) {
      const h = harness();
      const server = serveBoard(h.board, free);
      try {
        expect(server.port).toBe(free);
        expect(h.board.options.port).toBe(free);
        expect((await fetch(`http://127.0.0.1:${free}/api/snapshot`, { headers: { [TOKEN_HEADER]: TOKEN } })).status).toBe(200);
      } finally {
        await server.stop();
      }
    }
  });

  test("a port that is taken falls back to any free one, and the board answers there", async () => {
    const squatter = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("someone else") });
    const taken = squatter.port ?? 0;
    const h = harness();
    const server = serveBoard(h.board, taken);
    try {
      expect(server.port).not.toBe(taken);
      expect(server.port).toBeGreaterThan(0);
      expect(h.board.options.port).toBe(server.port);
      expect((await fetch(`http://127.0.0.1:${server.port}/api/snapshot`, { headers: { [TOKEN_HEADER]: TOKEN } })).status).toBe(200);
      expect(await (await fetch(`http://127.0.0.1:${server.port}/`)).text()).toContain('x-data="board"');
      expect(await (await fetch(`http://127.0.0.1:${taken}/`)).text()).toBe("someone else");
    } finally {
      await server.stop();
      await squatter.stop(true);
    }
  });

  test("serving the page does not count as the board's page calling, and the API still needs the token", async () => {
    await served(async (base, h) => {
      const start = h.board.lastRequest();
      h.tick(5000);
      await fetch(`${base}/`);
      expect(h.board.lastRequest()).toBe(start);
      expect((await fetch(`${base}/api/snapshot`)).status).toBe(401);
      expect((await fetch(`${base}/api/snapshot?token=${TOKEN}`)).status).toBe(401);
      expect((await fetch(`${base}/api/snapshot`, { headers: { [TOKEN_HEADER]: TOKEN } })).status).toBe(200);
    });
  });
});

describe("reads", () => {
  test("the snapshot has four parts and a hash, and is cached for a second", async () => {
    const h = harness();
    const first = (await (await h.request("/api/snapshot")).json()) as {
      data: { hash: string; snapshot: Record<string, unknown> };
    };
    expect(Object.keys(first.data.snapshot)).toEqual(["board", "portfolio", "unreviewed", "cycles"]);
    expect(first.data.hash).toMatch(/^[0-9a-f]{16}$/);
    expect(h.calls.length).toBe(4);
    await h.request("/api/snapshot");
    expect(h.calls.length).toBe(4);
    h.tick(1001);
    await h.request("/api/snapshot");
    expect(h.calls.length).toBe(8);
  });

  test("polls that overlap a slow read share it: one read, not one each", async () => {
    let release = (): void => {};
    const h = harness({ gate: new Promise<void>((r) => (release = r)) });
    const polls = [h.request("/api/snapshot"), h.request("/api/snapshot"), h.request("/api/snapshot")];
    await Bun.sleep(10);
    h.tick(5000);
    polls.push(h.request("/api/snapshot"));
    await Bun.sleep(10);
    expect(h.calls.filter((c) => c[1] === "board").length).toBe(1);
    release();
    const hashes = await Promise.all(
      polls.map(async (p) => ((await (await p).json()) as { data: { hash: string } }).data.hash)
    );
    expect(new Set(hashes).size).toBe(1);
    expect(h.calls.length).toBe(4);
    // The second of cache runs from when the read finished, not when it began.
    h.tick(999);
    await h.request("/api/snapshot");
    expect(h.calls.length).toBe(4);
    h.tick(2);
    await h.request("/api/snapshot");
    expect(h.calls.length).toBe(8);
  });

  test("a read that timed out is a 504 in the CLI's words", async () => {
    const res = await createBoardWith(async () => failed(124, "`pdocs view board` did not finish", "timeout"));
    expect(res.status).toBe(504);
    expect(((await res.json()) as { error: { message: string } }).error.message).toContain("did not finish");
  });

  test("an old CLI is refused on the snapshot too, naming the fix", async () => {
    const h = harness({ board: { view: "board", groups: { unstarted: [OLD_ENTRY] }, advisories: [] } });
    const res = await h.request("/api/snapshot");
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { message: string } }).error.message).toContain("update-project-docs");
  });

  test("a cycle or feature page is one view call; a refusal is the CLI's own", async () => {
    const h = harness();
    expect((await h.request("/api/cycle/c1")).status).toBe(200);
    expect((await h.request("/api/feature/f1")).status).toBe(200);
    expect(h.calls).toEqual([
      ["view", "cycle", "c1"],
      ["view", "feature", "f1"],
    ]);
    const res = await h.request("/api/cycle/nope");
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { exit_code: number } }).error.exit_code).toBe(2);
    const before = h.calls.length;
    expect((await h.request("/api/cycle/--root")).status).toBe(400);
    expect((await h.request("/api/cycle/a%20b")).status).toBe(400);
    expect(h.calls.length).toBe(before);
  });
});

describe("writes", () => {
  test("a triage decision is exactly one set call, logged, and returns its Undo", async () => {
    const h = harness();
    const res = await h.request("/api/write", { headers: { origin: BASE }, body: TRIAGE });
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { command: string; restore: unknown } };
    expect(h.sets()).toEqual([["set", "item/waiting", "--lifecycle", "ready", "--priority", "high"]]);
    expect(data.command).toBe("pdocs set item/waiting --lifecycle ready --priority high");
    expect(data.restore).toEqual({
      kind: "restore",
      ref: "item/waiting",
      changes: [
        { key: "lifecycle", before: "triage" },
        { key: "priority", before: null },
      ],
    });
    expect(h.log).toEqual(["spawn pdocs set item/waiting --lifecycle ready --priority high"]);
  });

  const accept = async (h: ReturnType<typeof harness>) => {
    const res = await h.request("/api/write", { body: TRIAGE });
    h.move("waiting", { lifecycle: "ready", priority: "high" });
    return ((await res.json()) as { data: { restore: unknown } }).data.restore;
  };

  test("the Undo a write returned is accepted, as one set call, once", async () => {
    const h = harness();
    const restore = await accept(h);
    const res = await h.request("/api/write", { body: restore });
    expect(res.status).toBe(200);
    expect(h.sets()[1]).toEqual(["set", "item/waiting", "--lifecycle", "triage", "--unset", "priority"]);
    // An Undo is not itself undone, and is used up.
    expect(((await res.json()) as { data: { restore: unknown } }).data.restore).toBeNull();
    const again = await h.request("/api/write", { body: restore });
    expect(again.status).toBe(409);
    expect(h.sets().length).toBe(2);
  });

  test("an Undo is refused once the item has changed since its write, and no set runs", async () => {
    for (const change of [{ lifecycle: "active", priority: "low" }, { lifecycle: "active" }, { priority: null }]) {
      const h = harness();
      const restore = await accept(h);
      h.move("waiting", change);
      const res = await h.request("/api/write", { body: restore });
      expect(res.status).toBe(409);
      expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
        "the item changed since this write; Undo is no longer available."
      );
      expect(h.sets().length).toBe(1);
    }
  });

  test("an Undo that set refuses is kept for another try", async () => {
    let refuse = true;
    const h = harness({ set: async () => (refuse ? failed(6, "strict", "conflict") : SET_OK) });
    refuse = false;
    const restore = await accept(h);
    refuse = true;
    expect((await h.request("/api/write", { body: restore })).status).toBe(409);
    refuse = false;
    expect((await h.request("/api/write", { body: restore })).status).toBe(200);
  });

  test("only the last 100 Undos are kept", async () => {
    // After 99 more writes the first Undo is still held; after 100 it is not.
    for (const [more, status] of [
      [99, 200],
      [100, 409],
    ] as const) {
      const h = harness({
        set: async () => ok({ path: "p", changes: [{ key: "cycle", before: null, after: "c1", changed: true }] }),
      });
      const bring = { kind: "membership", ref: "item/settled", cycle: "c1" };
      const first = ((await (await h.request("/api/write", { body: bring })).json()) as { data: { restore: unknown } })
        .data.restore;
      h.move("settled", { cycle: "c1" });
      // The writes that follow are on another item: in, out, in, out.
      for (let i = 0; i < more; i++) {
        const into = i % 2 === 0 ? "c1" : null;
        h.board.options.run = async (args) =>
          args[0] === "set"
            ? ok({ path: "p", changes: [{ key: "cycle", before: into ? null : "c1", after: into, changed: true }] })
            : harnessRead(args, h);
        const body = { kind: "membership", ref: "item/spare", cycle: into };
        expect((await h.request("/api/write", { body })).status).toBe(200);
        h.move("spare", { cycle: into });
      }
      expect([more, (await h.request("/api/write", { body: first })).status]).toEqual([more, status]);
    }
  });

  test("a set that timed out is a 504, and the next write still runs", async () => {
    let hang = true;
    const h = harness({
      set: async () => (hang ? failed(124, "`pdocs set …` did not finish within 15 s and was stopped.", "timeout") : SET_OK),
    });
    const res = await h.request("/api/write", { body: TRIAGE });
    expect(res.status).toBe(504);
    hang = false;
    expect((await h.request("/api/write", { body: TRIAGE })).status).toBe(200);
  });

  test("a set that throws is a fault for that request only", async () => {
    let broken = true;
    const h = harness({
      set: async () => {
        if (broken) throw new Error("spawn failed");
        return SET_OK;
      },
    });
    expect((await h.request("/api/write", { body: TRIAGE })).status).toBe(500);
    broken = false;
    expect((await h.request("/api/write", { body: TRIAGE })).status).toBe(200);
  });

  test("the 8 KB cap is on bytes, and a declared length over it is refused unread", async () => {
    const h = harness();
    // 5000 characters, 10000 bytes.
    const wide = await h.request("/api/write", { body: JSON.stringify({ ...TRIAGE, pad: "é".repeat(5000) }) });
    expect(wide.status).toBe(413);
    let read = false;
    const declared = await h.board.fetch({
      url: `${BASE}/api/write`,
      method: "POST",
      headers: new Headers({ host: `127.0.0.1:${PORT}`, [TOKEN_HEADER]: TOKEN, "content-length": "9000" }),
      get body() {
        read = true;
        return null;
      },
    } as unknown as Request);
    expect(declared.status).toBe(413);
    expect(read).toBe(false);
    // Just under the cap is read, and refused for what it says.
    const under = await h.request("/api/write", { body: JSON.stringify({ ...TRIAGE, pad: "x".repeat(8000) }) });
    expect(under.status).toBe(400);
    expect(h.calls).toEqual([]);
  });

  test("a restore this board did not hand out is refused, and no set runs", async () => {
    const h = harness();
    const res = await h.request("/api/write", {
      body: { kind: "restore", ref: "item/settled", changes: [{ key: "lifecycle", before: "dropped" }] },
    });
    expect(res.status).toBe(409);
    expect(h.calls).toEqual([]);
  });

  test("membership in and out", async () => {
    const h = harness({ set: ok({ path: "p", changes: [{ key: "cycle", before: null, after: "c1", changed: true }] }) });
    const res = await h.request("/api/write", { body: { kind: "membership", ref: "item/settled", cycle: "c1" } });
    expect(res.status).toBe(200);
    h.move("settled", { cycle: "c1" });
    await h.request("/api/write", { body: { kind: "membership", ref: "item/settled", cycle: null } });
    expect(h.sets()).toEqual([
      ["set", "item/settled", "--cycle", "c1"],
      ["set", "item/settled", "--unset", "cycle"],
    ]);
  });

  const rejected: Array<[string, unknown, number]> = [
    ["a lifecycle outside the three, on a hostile ref", { kind: "triage", ref: "item/x;rm -rf /", lifecycle: "active" }, 400],
    ["a lifecycle outside the three", { kind: "triage", ref: "item/waiting", lifecycle: "active" }, 400],
    ["a restore of `title`", { kind: "restore", ref: "item/waiting", changes: [{ key: "title", before: "x" }] }, 400],
    ["an unknown kind", { kind: "archive", ref: "item/waiting" }, 400],
    ["an extra key", { ...TRIAGE, title: "New" }, 400],
    ["an argv of the caller's own", { kind: "triage", argv: ["set", "item/waiting", "--title", "x"] }, 400],
    ["a body that is not JSON", "{", 400],
    ["a body that is not an object", "[]", 400],
    ["a body too large", { ...TRIAGE, pad: "x".repeat(9000) }, 413],
    ["a ref the snapshot does not list", { kind: "membership", ref: "item/nowhere", cycle: "c1" }, 404],
    ["a triage decision on an item not in triage", { kind: "triage", ref: "item/settled", lifecycle: "dropped" }, 409],
  ];
  for (const [name, body, status] of rejected)
    test(`${name}: refused, and no set is spawned`, async () => {
      const h = harness();
      const res = await h.request("/api/write", { headers: { origin: BASE }, body });
      expect(res.status).toBe(status);
      expect(h.sets()).toEqual([]);
      if (status === 400 || status === 413) expect(h.calls).toEqual([]);
    });

  test("GET on the write route is refused", async () => {
    const h = harness();
    expect((await h.request("/api/write")).status).toBe(405);
    expect(h.calls).toEqual([]);
  });

  test("a refusal from set is passed on with its message and choices, and the command that ran", async () => {
    const h = harness({
      set: { ok: false, kind: "usage", exit_code: 2, message: "no cycle file is named `c1.md`", choices: ["c2"] },
    });
    const res = await h.request("/api/write", { body: { kind: "membership", ref: "item/settled", cycle: "c1" } });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      ok: false,
      error: { kind: "usage", exit_code: 2, message: "no cycle file is named `c1.md`", choices: ["c2"] },
      command: "pdocs set item/settled --cycle c1",
    });
  });

  test("membership the fresh snapshot does not allow is a 409, and set is never run", async () => {
    const h = harness();
    const refusals: Array<[object, string]> = [
      [{ kind: "membership", ref: "item/waiting", cycle: "c1" }, "`item/waiting` is `triage`, not `backlog` or `ready`."],
      [{ kind: "membership", ref: "item/settled", cycle: "nope" }, "`nope` is not a planned or active cycle."],
      [{ kind: "membership", ref: "item/settled", cycle: null }, "`item/settled` is in no cycle."],
    ];
    for (const [body, message] of refusals) {
      const res = await h.request("/api/write", { body });
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ ok: false, error: { kind: "conflict", message } });
    }
    // The page showed the item as a candidate; a terminal has since put it in a cycle.
    h.move("settled", { cycle: "c1" });
    const stale = await h.request("/api/write", { body: { kind: "membership", ref: "item/settled", cycle: "c1" } });
    expect(stale.status).toBe(409);
    expect(h.sets()).toEqual([]);
  });

  test("strict review mode's exit 6 is a conflict", async () => {
    const h = harness({ set: failed(6, "review mode is strict", "conflict") });
    const res = await h.request("/api/write", { body: TRIAGE });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe("review mode is strict");
  });

  test("advisories set returns are passed on", async () => {
    const h = harness({ set: ok({ path: "p", changes: [], advisories: [{ id: "a", message: "m" }] }) });
    const { data } = (await (await h.request("/api/write", { body: TRIAGE })).json()) as {
      data: { advisories: unknown; restore: unknown };
    };
    expect(data.advisories).toEqual([{ id: "a", message: "m" }]);
    expect(data.restore).toBeNull();
  });

  test("a write is checked against a fresh snapshot, and the next read is fresh too", async () => {
    const h = harness();
    await h.request("/api/snapshot");
    await h.request("/api/write", { body: TRIAGE });
    await h.request("/api/snapshot");
    expect(h.calls.filter((c) => c[1] === "board").length).toBe(3);
  });
});

describe("idle exit", () => {
  test("after 30 minutes with no request, and not before", () => {
    expect(idleExpired(0, IDLE_LIMIT_MS - 1)).toBe(false);
    expect(idleExpired(0, IDLE_LIMIT_MS)).toBe(true);
    expect(IDLE_LIMIT_MS).toBe(30 * 60 * 1000);
  });

  test("only a request the board accepted as its own page's counts as activity", async () => {
    const h = harness();
    const start = h.board.lastRequest();
    h.tick(5000);
    await h.request("/api/snapshot", { headers: { [TOKEN_HEADER]: "" } });
    await h.request("/api/snapshot", { headers: { origin: "http://evil.example" } });
    await h.request("/api/snapshot", { headers: { host: "evil.example" } });
    await h.request(`/api/snapshot?token=${TOKEN}`, { headers: { [TOKEN_HEADER]: "" } });
    await h.request("/", { headers: { [TOKEN_HEADER]: "" } });
    await h.request("/nowhere");
    expect(h.board.lastRequest()).toBe(start);
    await h.request("/api/health");
    expect(h.board.lastRequest()).toBe(start + 5000);
  });
});
