#!/usr/bin/env bun
// grapevine CLI — thin wrapper around the daemon's HTTP surface.
//
// Usage:
//   bun cli.ts open <name>
//   bun cli.ts list
//   bun cli.ts send <name> --from <alias> <text...>
//   bun cli.ts tail <name> [--since <id>] [--from-start]
//   bun cli.ts close <name>
//   bun cli.ts stop
//   bun cli.ts info
//
// `tail` writes each incoming message as one JSONL line on stdout. Pipe
// or wrap with Monitor.

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DATA_DIR = process.env.GRAPEVINE_HOME ?? join(homedir(), ".grapevine");
const PORT_FILE = join(DATA_DIR, "daemon.port");
const PID_FILE = join(DATA_DIR, "daemon.pid");
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DAEMON_SCRIPT = join(SCRIPT_DIR, "daemon.ts");
// GRAPEVINE_FROM sets the default --from / --as alias so agents don't have
// to repeat their identity on every verb. Per-verb flags still override.
const DEFAULT_ALIAS = process.env.GRAPEVINE_FROM ?? undefined;

function die(msg: string, code = 2): never {
  process.stderr.write(`grapevine: ${msg}\n`);
  process.exit(code);
}

async function readDaemonPort(): Promise<number | null> {
  if (!existsSync(PORT_FILE)) return null;
  const raw = readFileSync(PORT_FILE, "utf-8").trim();
  const port = parseInt(raw, 10);
  if (!port) return null;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, {
      signal: AbortSignal.timeout(500),
    });
    if (res.ok) return port;
  } catch {}
  // Stale — clean up.
  try {
    unlinkSync(PORT_FILE);
  } catch {}
  try {
    unlinkSync(PID_FILE);
  } catch {}
  return null;
}

async function ensureDaemon(): Promise<number> {
  let port = await readDaemonPort();
  if (port) return port;
  // Spawn detached so the daemon survives this CLI process exit.
  const proc = spawn(process.execPath, [DAEMON_SCRIPT], {
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
    env: process.env,
  });
  proc.unref();
  // Wait up to 3s for the port file to appear and respond.
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
    port = await readDaemonPort();
    if (port) return port;
  }
  die("daemon failed to start within 3s");
}

async function api<T = any>(
  port: number,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: T }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers:
      body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

function printJson(data: unknown) {
  process.stdout.write(JSON.stringify(data) + "\n");
}

async function cmdOpen(name: string, opts: { topic?: string; from?: string }) {
  if (!name) die("usage: grapevine open <name> [--topic <text>]");
  const port = await ensureDaemon();
  const body: Record<string, string> = { name };
  if (opts.topic !== undefined) body.topic = opts.topic;
  if (opts.from !== undefined) body.from = opts.from;
  const { status, data } = await api(port, "POST", "/channels", body);
  if (status >= 400) die(data?.error ?? `HTTP ${status}`);
  printJson({ ok: true, channel: data });
}

async function cmdTopic(
  name: string,
  text: string | undefined,
  from: string | undefined
) {
  if (!name) die("usage: grapevine topic <channel> [<text>]");
  const port = await ensureDaemon();
  await api(port, "POST", "/channels", { name });
  if (text === undefined) {
    // Read current topic.
    const { status, data } = await api(port, "GET", `/channels/${name}/topic`);
    if (status >= 400) die(data?.error ?? `HTTP ${status}`);
    printJson({ ok: true, channel: name, topic: data.topic });
    return;
  }
  const { status, data } = await api(port, "PUT", `/channels/${name}/topic`, {
    topic: text,
    from: from ?? "system",
  });
  if (status >= 400) die(data?.error ?? `HTTP ${status}`);
  printJson({ ok: true, channel: name, topic: data.topic, id: data.id });
}

async function cmdList() {
  const port = await readDaemonPort();
  if (!port) {
    printJson({ ok: true, daemon: false, channels: [] });
    return;
  }
  const { data } = await api(port, "GET", "/channels");
  printJson({ ok: true, daemon: true, ...data });
}

async function cmdSend(
  name: string,
  from: string,
  text: string,
  opts: { quiet?: boolean; verbose?: boolean }
) {
  if (!name || !from || !text)
    die("usage: grapevine send <name> --from <alias> <text...>");
  const port = await ensureDaemon();
  const { status, data } = await api(
    port,
    "POST",
    `/channels/${name}/messages`,
    { from, text }
  );
  if (status >= 400) die(data?.error ?? `HTTP ${status}`);
  if (opts.quiet) return;
  // Terse default: id + subscriber count + void warning. --verbose also
  // includes the subscriber alias list (same data as the `who` verb,
  // piggybacked to avoid an extra round-trip when the sender cares).
  const out: Record<string, unknown> = {
    ok: true,
    id: data.id,
    channel: data.channel,
    subscribers: data.subscribers ?? 0,
  };
  if (data.subscribers === 0) out.warning = "channel has no subscribers";
  if (opts.verbose) out.subscriber_aliases = data.subscriber_aliases ?? [];
  printJson(out);
}

async function cmdPull(name: string, since: number) {
  if (!name) die("usage: grapevine pull <channel> [--since <id>]");
  const port = await ensureDaemon();
  await api(port, "POST", "/channels", { name });
  const { status, data } = await api(
    port,
    "GET",
    `/channels/${name}/messages?since=${since}`
  );
  if (status >= 400) die(data?.error ?? `HTTP ${status}`);
  const msgs = data.messages ?? [];
  const cursor = msgs.length ? msgs[msgs.length - 1].id : since;
  printJson({ ok: true, messages: msgs, cursor });
}

async function cmdWait(
  name: string,
  since: number,
  timeoutS: number,
  alias: string | undefined
) {
  if (!name)
    die(
      "usage: grapevine wait <channel> [--as <alias>] [--since <id>] [--timeout <s>]"
    );
  const port = await ensureDaemon();
  await api(port, "POST", "/channels", { name });
  // Give the HTTP fetch a slightly higher abort timeout than the daemon's
  // long-poll timeout so the daemon always wins the timeout race.
  // `?as=<alias>` registers presence on the channel for the wait duration —
  // wait is long-poll (push-shaped with a deadline) so it deserves presence.
  const asParam = alias ? `&as=${encodeURIComponent(alias)}` : "";
  const url = `http://127.0.0.1:${port}/channels/${name}/wait?since=${since}&timeout=${timeoutS}${asParam}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout((timeoutS + 5) * 1000),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) die(data?.error ?? `HTTP ${res.status}`);
  printJson({
    ok: true,
    messages: data.messages ?? [],
    cursor: data.cursor ?? since,
    timed_out: !!data.timed_out,
  });
}

async function cmdWho(name: string) {
  if (!name) die("usage: grapevine who <channel>");
  const port = await readDaemonPort();
  if (!port) {
    printJson({ ok: true, daemon: false, channel: name, subscribers: [] });
    return;
  }
  const { status, data } = await api(
    port,
    "GET",
    `/channels/${name}/subscribers`
  );
  if (status >= 400) die(data?.error ?? `HTTP ${status}`);
  printJson({ ok: true, ...data });
}

async function cmdTail(
  name: string,
  opts: { since?: number; fromStart?: boolean; as?: string }
) {
  if (!name)
    die(
      "usage: grapevine tail <name> [--as <alias>] [--since <id>] [--from-start]"
    );
  const myAlias = opts.as;

  // Clean exit on signals so the SSE stream doesn't leak.
  let stopped = false;
  const cleanup = () => {
    stopped = true;
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  let highestSeen = opts.fromStart ? 0 : (opts.since ?? -1);
  let reconnectDelay = 250;

  while (!stopped) {
    const port = await ensureDaemon();
    // Ensure the channel exists (so a fresh `tail name` works without explicit open).
    await api(port, "POST", "/channels", { name });
    const asParam = myAlias ? `&as=${encodeURIComponent(myAlias)}` : "";
    const url = `http://127.0.0.1:${port}/channels/${name}/tail?since=${highestSeen}${asParam}`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch (e: any) {
      process.stderr.write(`# connect failed: ${e.message}, retrying…\n`);
      await new Promise((r) => setTimeout(r, reconnectDelay));
      reconnectDelay = Math.min(reconnectDelay * 2, 5000);
      continue;
    }
    if (!res.ok || !res.body) {
      process.stderr.write(`# tail HTTP ${res.status}, retrying…\n`);
      await new Promise((r) => setTimeout(r, reconnectDelay));
      reconnectDelay = Math.min(reconnectDelay * 2, 5000);
      continue;
    }
    reconnectDelay = 250; // reset on a successful open

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    streamLoop: while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (e: any) {
        process.stderr.write(`# stream dropped: ${e.message}, reconnecting…\n`);
        break streamLoop;
      }
      if (chunk.done) {
        process.stderr.write(`# stream closed, reconnecting…\n`);
        break streamLoop;
      }
      buffer += decoder.decode(chunk.value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const lines = block.split("\n");
        let eventName = "message";
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith(":")) continue;
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:"))
            dataLines.push(line.slice(5).trim());
        }
        if (!dataLines.length) continue;
        try {
          const payload = JSON.parse(dataLines.join("\n"));
          if (eventName === "subscribed") {
            process.stderr.write(
              `# subscribed to ${payload.channel} (since=${payload.since})\n`
            );
            if (payload.topic)
              process.stderr.write(`# topic: ${payload.topic}\n`);
            continue;
          }
          if (typeof payload.id === "number" && payload.id > highestSeen) {
            highestSeen = payload.id;
          }
          // Suppress self-echo: when --as is set, drop messages we sent
          // ourselves. The sender already got the receipt as the POST
          // response, so re-emitting it on tail is pure noise.
          if (myAlias && payload.from === myAlias) continue;
          process.stdout.write(JSON.stringify(payload) + "\n");
        } catch (e: any) {
          process.stderr.write(`# bad sse data: ${e.message}\n`);
        }
      }
    }
    // Brief pause before reconnect; resume from highestSeen so no messages
    // are lost across reconnects.
    if (!stopped) await new Promise((r) => setTimeout(r, 200));
  }
}

async function cmdClose(name: string) {
  if (!name) die("usage: grapevine close <name>");
  const port = await readDaemonPort();
  if (!port) die("no daemon running");
  const { status, data } = await api(port, "DELETE", `/channels/${name}`);
  if (status >= 400) die(data?.error ?? `HTTP ${status}`);
  printJson({ ok: true });
}

async function cmdStop() {
  const port = await readDaemonPort();
  if (!port) {
    printJson({ ok: true, daemon: false });
    return;
  }
  try {
    await api(port, "DELETE", "/");
  } catch {}
  printJson({ ok: true, stopped: true });
}

async function cmdWatch(name: string | undefined) {
  // Channel name is optional — the page reads it from the URL hash and
  // defaults to "lobby" if absent. We pass through whatever the user gave
  // (or "lobby") and open the browser. Daemon is ensured so the served
  // /watch HTML is reachable.
  const channel = name && name.trim() ? name.trim() : "lobby";
  const port = await ensureDaemon();
  // Ensure the channel exists so the page sees a valid backlog/topic.
  await api(port, "POST", "/channels", { name: channel });
  const url = `http://127.0.0.1:${port}/watch#${encodeURIComponent(channel)}`;
  // Open the browser via the platform's default opener. Best-effort —
  // print the URL so the user can click it if auto-open fails.
  const opener =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "explorer"
        : "xdg-open";
  try {
    const p = spawn(opener, [url], {
      detached: true,
      stdio: "ignore",
    });
    p.unref();
  } catch {
    /* opener missing — just print */
  }
  printJson({ ok: true, channel, url });
}

async function cmdInfo() {
  const port = await readDaemonPort();
  if (!port) {
    printJson({ ok: true, daemon: false });
    return;
  }
  const { data } = await api(port, "GET", "/");
  printJson({ ok: true, daemon: true, ...data });
}

const BOOLEAN_FLAGS = new Set(["quiet", "from-start", "verbose", "stdin"]);

function parseFlags(argv: string[]): {
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (BOOLEAN_FLAGS.has(key)) {
        flags[key] = true;
        continue;
      }
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  const { positional, flags } = parseFlags(rest);

  switch (cmd) {
    case "open":
      await cmdOpen(positional[0], {
        topic: flags.topic as string | undefined,
        from: (flags.from as string | undefined) ?? DEFAULT_ALIAS,
      });
      return 0;
    case "topic":
      await cmdTopic(
        positional[0],
        positional.length > 1 ? positional.slice(1).join(" ") : undefined,
        (flags.from as string | undefined) ?? DEFAULT_ALIAS
      );
      return 0;
    case "list":
      await cmdList();
      return 0;
    case "send": {
      const name = positional[0];
      const from = (flags.from as string | undefined) ?? DEFAULT_ALIAS;
      let text: string;
      if (flags.stdin) {
        // Bypass shell quoting entirely — read raw bytes from stdin.
        // Trailing newline is stripped; everything else is preserved.
        const buf: Buffer[] = [];
        for await (const chunk of process.stdin) buf.push(chunk as Buffer);
        text = Buffer.concat(buf).toString("utf-8").replace(/\n$/, "");
      } else {
        text = positional.slice(1).join(" ");
      }
      if (!from)
        die("send: --from <alias> required (or set GRAPEVINE_FROM env var)");
      await cmdSend(name, from, text, {
        quiet: !!flags.quiet,
        verbose: !!flags.verbose,
      });
      return 0;
    }
    case "pull": {
      const since = flags.since ? parseInt(flags.since as string, 10) : 0;
      await cmdPull(positional[0], since);
      return 0;
    }
    case "wait": {
      const since = flags.since ? parseInt(flags.since as string, 10) : 0;
      const timeout = flags.timeout ? parseFloat(flags.timeout as string) : 30;
      const alias = (flags.as as string | undefined) ?? DEFAULT_ALIAS;
      await cmdWait(positional[0], since, timeout, alias);
      return 0;
    }
    case "who":
      await cmdWho(positional[0]);
      return 0;
    case "tail":
      await cmdTail(positional[0], {
        since: flags.since ? parseInt(flags.since as string, 10) : undefined,
        fromStart: !!flags["from-start"],
        as: (flags.as as string | undefined) ?? DEFAULT_ALIAS,
      });
      return 0;
    case "close":
      await cmdClose(positional[0]);
      return 0;
    case "stop":
      await cmdStop();
      return 0;
    case "watch":
      await cmdWatch(positional[0]);
      return 0;
    case "info":
      await cmdInfo();
      return 0;
    case undefined:
    case "help":
    case "--help":
    case "-h":
      process.stdout.write(`grapevine — agent-to-agent walkie-talkie

Usage:
  grapevine open <name> [--topic <text>]
  grapevine list
  grapevine send <name> [--from <alias>] [--quiet] [--verbose] [--stdin] <text...>
  grapevine tail <name> [--as <alias>] [--since <id>] [--from-start]
  grapevine pull <name> [--since <id>]
  grapevine wait <name> [--since <id>] [--timeout <s>]
  grapevine topic <name> [<text>]   # no text → read current; with text → update
  grapevine who <name>
  grapevine watch [<name>]          # open browser tab; live chat-bubble view
  grapevine close <name>
  grapevine stop
  grapevine info

Env:
  GRAPEVINE_FROM   Default alias for --from (send) and --as (tail).
  GRAPEVINE_HOME   Data dir (default ~/.grapevine).
`);
      return 0;
    default:
      die(`unknown command: ${cmd}`);
  }
}

if (import.meta.main) {
  const code = await main(process.argv.slice(2));
  process.exit(code);
}
