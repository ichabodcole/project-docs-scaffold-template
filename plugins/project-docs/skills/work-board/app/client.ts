// What the board's page does that is not drawing: the session token, the poll,
// the keys, and the view model the template binds. Pure functions over the
// model and the selection rules; nothing here touches the DOM or the network.
// `board.ts` calls these and hands the result to Alpine.
import {
  activeCycle,
  allEntries,
  blockers,
  blockerState,
  candidates,
  candidateTotal,
  containerGroups,
  cycleEntry,
  cycleItems,
  featureItems,
  featureSlug,
  idIndex,
  inboxCount,
  inboxGroups,
  inboxRows,
  isOpen,
  liveSnoozes,
  nowGroups,
  snoozedRows,
  startedItems,
  triageQueue,
  type InboxRow,
  type PortfolioEntry,
  type Snapshot,
  type Snooze,
  type SnoozeChoice,
  type ViewEntry,
} from "./model.ts";
import {
  attendPlannedCycle,
  currentList,
  escape,
  go,
  initialState,
  inspecting,
  move,
  noteBroughtIn,
  noteTakenOut,
  openInspector,
  pick,
  selected,
  type BoardState,
  type ListContext,
  type Row,
  type View,
} from "./selection.ts";

export const TOKEN_HEADER = "x-board-token";
export const POLL_MS = 4000;

// ---- the session token -------------------------------------------------------

/**
 * Take `token` out of a query string. Returns the token and the query string
 * to put back in the address bar, which keeps every other parameter.
 */
export function takeToken(search: string): { token: string | null; search: string } {
  const params = new URLSearchParams(search);
  const token = params.get("token");
  params.delete("token");
  const rest = params.toString();
  return { token: token || null, search: rest ? `?${rest}` : "" };
}

// ---- the poll ----------------------------------------------------------------

export interface Problem {
  message: string;
  hint: string | null;
  /** The board cannot be shown at all: the project's CLI is too old for it. */
  blocking: boolean;
}

export type PollResult =
  | { kind: "snapshot"; hash: string; snapshot: Snapshot }
  | { kind: "problem"; problem: Problem };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Any 401 from the board's API: the server was started again, and this page holds the old token. */
export const SESSION_ENDED = "This page's session ended. Open the board again with the `open` command.";

/** Read one `/api/snapshot` response: its status and its parsed body. */
export function readPoll(status: number, body: unknown): PollResult {
  if (status === 401) return { kind: "problem", problem: { message: SESSION_ENDED, hint: null, blocking: false } };
  const data = isRecord(body) && isRecord(body.data) ? body.data : null;
  if (status === 200 && data && typeof data.hash === "string" && isRecord(data.snapshot))
    return { kind: "snapshot", hash: data.hash, snapshot: data.snapshot as unknown as Snapshot };
  const error = isRecord(body) && isRecord(body.error) ? body.error : null;
  const message =
    error && typeof error.message === "string" && error.message
      ? error.message
      : status === 200
        ? "the board's server sent a snapshot this page cannot read."
        : `the board's server answered ${status}.`;
  return {
    kind: "problem",
    problem: {
      message,
      hint: error && typeof error.hint === "string" && error.hint ? error.hint : null,
      blocking: status === 409,
    },
  };
}

/** A poll that got no answer: the server stopped, or the page has no token. */
export function unreachable(why: "no-token" | "no-answer"): PollResult {
  return {
    kind: "problem",
    problem: {
      message:
        why === "no-token"
          ? "This page has no session token. Open the board again from the URL its `open` command prints."
          : "The board's server is not answering. It stops 30 minutes after its last visible page stops polling; start it again with `open`.",
      hint: null,
      blocking: false,
    },
  };
}

/** What the page holds from the server: the last snapshot, its hash, and what is wrong, if anything. */
export interface Feed {
  hash: string | null;
  snapshot: Snapshot | null;
  problem: Problem | null;
}

export const EMPTY_FEED: Feed = { hash: null, snapshot: null, problem: null };

/**
 * Take a poll's result. The snapshot object is replaced, never changed, and it
 * is kept as it was when the hash is the same. `changed` says whether the
 * snapshot is a new one; `redraw` whether anything on screen differs.
 */
export function applyPoll(feed: Feed, result: PollResult): { feed: Feed; changed: boolean; redraw: boolean } {
  if (result.kind === "problem") {
    const same =
      feed.problem !== null &&
      feed.problem.message === result.problem.message &&
      feed.problem.hint === result.problem.hint &&
      feed.problem.blocking === result.problem.blocking;
    return { feed: same ? feed : { ...feed, problem: result.problem }, changed: false, redraw: !same };
  }
  if (result.hash === feed.hash && feed.snapshot !== null) {
    if (feed.problem === null) return { feed, changed: false, redraw: false };
    return { feed: { ...feed, problem: null }, changed: false, redraw: true };
  }
  return { feed: { hash: result.hash, snapshot: result.snapshot, problem: null }, changed: true, redraw: true };
}

/**
 * Fit the view state to a new snapshot: a Cycle page whose cycle is gone goes
 * to the cycle a fresh board would show, and a feature's page whose feature is
 * gone goes back to the list.
 */
export function settle(state: BoardState, s: Snapshot): BoardState {
  let next = state;
  if (next.cycle === null || !s.portfolio.cycles.some((c) => c.slug === next.cycle)) {
    const cycle = initialState(s).cycle;
    if (cycle !== next.cycle) next = { ...next, cycle, peek: null };
  }
  if (next.view === "featurePage" && !featureEntry(s, next.feature))
    next = { ...next, view: "feature", feature: null, sel: null, open: false };
  return next;
}

// ---- keys --------------------------------------------------------------------

export type KeyAction = "down" | "up" | "open" | "escape" | "bring" | "take";

export interface KeyPress {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  /** The tag name of the element the key was pressed in, upper case. */
  tag: string;
  /** The key is being held down: this press is one of its repeats. */
  repeat?: boolean;
}

/**
 * What a key press asks for, or `null`. Typing in a field moves nothing, and
 * Enter on a button is left to the button. Escape counts wherever it is
 * pressed. While the board is `blocked` there are no rows to move through.
 * `b` and `t` ask for the two membership writes; whether one applies to the
 * highlighted row is `keyIntent`'s to say. A held `b` or `t` asks once: each
 * write moves the highlight on, so its repeats would write to the rows after.
 */
export function keyAction(e: KeyPress, blocked = false): KeyAction | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key === "Escape") return "escape";
  if (blocked) return null;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.tag)) return null;
  if (e.key === "ArrowDown" || e.key === "j") return "down";
  if (e.key === "ArrowUp" || e.key === "k") return "up";
  if (e.key === "Enter" && e.tag !== "BUTTON") return "open";
  if (e.repeat) return null;
  if (e.key === "b") return "bring";
  if (e.key === "t") return "take";
  return null;
}

/** Run a key's action through the selection rules. */
export function applyKey(state: BoardState, list: readonly Row[], action: KeyAction): BoardState {
  switch (action) {
    case "down":
      return move(state, list, 1);
    case "up":
      return move(state, list, -1);
    case "open":
      return openInspector(state, list);
    case "escape":
      return escape(state);
    // A write changes nothing here: the board changes when its snapshot does.
    case "bring":
    case "take":
      return state;
  }
}

/** Whether this action will close the inspector: an Escape with no menu open over it. */
export function closesInspector(state: BoardState, action: KeyAction): boolean {
  return action === "escape" && state.open && !escape(state).open;
}

/**
 * An Inbox row does the one thing it says: go to Triage, show a planned cycle,
 * or show an item. A row that is a line to say to the agent goes nowhere. A
 * row that is not in the Inbox now changes nothing.
 */
export function attend(state: BoardState, ctx: ListContext, id: string): BoardState {
  const target = inboxRows(ctx.snapshot, ctx.snoozes, ctx.now).find((r) => r.id === id)?.target;
  if (!target) return state;
  switch (target.type) {
    case "triage":
      return go(state, "triage");
    case "cycle":
      return attendPlannedCycle(state, target.slug);
    case "item":
      return pick(state, `a:${id}`);
    case "ask":
      return { ...state, snoozeMenu: null };
  }
}

// ---- what a row says ---------------------------------------------------------

/** One plain part of a meta line, with a lifecycle dot before it when `dot` is set. */
export interface MetaPart {
  text: string;
  dot: string | null;
  title: string | null;
}

/** One line of meta: plain parts, then pills. Pills are only for high and blocked. */
export interface Meta {
  parts: MetaPart[];
  pills: Array<{ kind: "high" | "blocked"; text: string }>;
}

export interface MetaOptions {
  /** Lead with the item's lifecycle. */
  lifecycle?: boolean;
  /** Say "in review" on an item in review. */
  review?: boolean;
  /** Leave the parent feature out: the page already names it. */
  noParent?: boolean;
}

export function meta(s: Snapshot, i: ViewEntry, o: MetaOptions = {}, index?: Map<string, ViewEntry>): Meta {
  const part = (text: string, dot: string | null = null, title: string | null = null): MetaPart => ({
    text,
    dot,
    title,
  });
  const parts: MetaPart[] = [];
  const pills: Meta["pills"] = [];
  const hot = i.priority === "high" || i.priority === "urgent";
  const blocked = blockerState(s, i, index);
  if (o.lifecycle && i.lifecycle) parts.push(part(i.lifecycle, i.lifecycle));
  if (o.review && i.lifecycle === "review") parts.push(part("in review", "review"));
  if (i.kind) parts.push(part(i.kind));
  if (i.priority && !hot) parts.push(part(i.priority));
  const parent = featureSlug(i.parent);
  if (parent && !o.noParent) parts.push(part(parent));
  if (i.status !== "stable")
    parts.push(part("draft", null, `status: ${i.status ?? "none"} — its content has not been reviewed`));
  if (blocked === "blocker-done") parts.push(part("blocker done", null, "every blocker is done"));
  if (hot && i.priority) pills.push({ kind: "high", text: i.priority });
  if (blocked === "blocked") pills.push({ kind: "blocked", text: "blocked" });
  return { parts, pills };
}

/** A string in pieces that may wrap between them: after each `/` and `-`. */
export function breakable(text: string): string[] {
  return text.split(/(?<=[/-])/).filter(Boolean);
}

export interface FieldBlocker {
  lifecycle: string;
  dot: string;
  name: string[];
}

/** One inspector field: text, or the list of blockers. */
export interface Field {
  label: string;
  mono: boolean;
  text: string[];
  blockers: FieldBlocker[];
}

/**
 * The inspector's fields. Empty ones are left out; priority and status are in
 * the meta line; the path and the id sit behind "Copy path".
 */
export function fields(s: Snapshot, i: ViewEntry, index?: Map<string, ViewEntry>): Field[] {
  const out: Field[] = [];
  const text = (label: string, value: string | null, mono: boolean): void => {
    if (value) out.push({ label, mono, text: breakable(value), blockers: [] });
  };
  text("cycle", i.cycle, true);
  text("feature", featureSlug(i.parent), false);
  text("source", i.source, true);
  // `from` may hold an id; a ref says more than one.
  const origin = i.from ? (index ?? idIndex(s)).get(i.from) : undefined;
  text("from", origin ? `${origin.entity}/${origin.slug}` : i.from, true);
  text("filed", i.date, true);
  if (i.blockedBy.length)
    out.push({
      label: "blocked by",
      mono: false,
      text: [],
      blockers: blockers(s, i, index).map((b) => ({
        lifecycle: b.lifecycle ?? "unknown",
        dot: b.lifecycle ?? "backlog",
        name: breakable(b.entry?.slug ?? b.id),
      })),
    });
  return out;
}

/** The line that opens a document in Scriptorium, for the user to copy. */
export function handoffLine(path: string): string {
  return `open, then show --doc ${path}`;
}

export interface Segment {
  lifecycle: string;
  n: number;
  pct: number;
}

/** A progress bar's segments: started leads, then finished, then what has not started. */
export function bar(list: readonly ViewEntry[]): Segment[] {
  const total = list.length || 1;
  return ["active", "review", "done", "ready", "backlog", "triage", "dropped"]
    .map((lifecycle) => ({ lifecycle, n: list.filter((i) => i.lifecycle === lifecycle).length }))
    .filter((seg) => seg.n)
    .map((seg) => ({ ...seg, pct: (seg.n / total) * 100 }));
}

export function summary(list: readonly ViewEntry[]): string {
  return `${list.filter((i) => !isOpen(i)).length} of ${list.length} finished`;
}

export const SNOOZE_CHOICES: Array<{ id: SnoozeChoice; label: string; note: string }> = [
  { id: "tomorrow", label: "Until tomorrow", note: "until tomorrow" },
  { id: "week", label: "For a week", note: "for a week" },
  { id: "cycle", label: "Until the next cycle starts", note: "until the next cycle starts" },
];

// ---- the two writes ----------------------------------------------------------
//
// A triage decision and cycle membership, each one `POST /api/write`. Nothing
// here changes the board: a write that ran shows when the next snapshot does,
// so a refusal has nothing to roll back.

export type Disposition = "backlog" | "ready" | "drop";

/** The triage form, one per waiting item. `priority` and `parent` are "" for none. */
export interface TriageForm {
  disp: Disposition;
  priority: string;
  /** A feature's slug. */
  parent: string;
  /** "Content reviewed": adds `--status stable`. Off unless ticked. */
  reviewed: boolean;
  /** Why it is dropped. Never sent: it becomes a line for the agent to record. */
  reason: string;
}

export const emptyForm = (): TriageForm => ({ disp: "ready", priority: "", parent: "", reviewed: false, reason: "" });

/** The form of each waiting item the inspector has shown, by slug. Never changed in place. */
export type Forms = Readonly<Record<string, TriageForm>>;

/**
 * The inspector moved from one waiting item (`was`) to another (`now`); `null`
 * is no waiting item. The item it comes to has a form, and "content reviewed"
 * is unticked every time, coming back to the same item included: a tick is for
 * the decision being made now. What else was chosen stays while the user steps
 * away and back.
 */
export function formsOnShow(forms: Forms, was: string | null, now: string | null): Forms {
  if (now === null || now === was) return forms;
  return { ...forms, [now]: { ...(forms[now] ?? emptyForm()), reviewed: false } };
}

/** Set one field of one item's form. An item with no form has none to set. */
export function withField<K extends keyof TriageForm>(forms: Forms, slug: string, field: K, value: TriageForm[K]): Forms {
  const form = forms[slug];
  return form ? { ...forms, [slug]: { ...form, [field]: value } } : forms;
}

/** Drop an item's form whole: after its decision ran, and after that was undone. */
export function withoutForm(forms: Forms, slug: string): Forms {
  if (!(slug in forms)) return forms;
  const { [slug]: _dropped, ...rest } = forms;
  return rest;
}

/** A body `/api/write` takes from the page. An Undo is not built here: it is the server's own object. */
export type WriteBody =
  | { kind: "triage"; ref: string; lifecycle: string; priority?: string; parent?: string; reviewed?: true }
  | { kind: "membership"; ref: string; cycle: string | null };

/** What a write does to the page's own state once it has run. */
export type Effect =
  | { kind: "triage"; slug: string; title: string; label: string }
  | { kind: "bring"; slug: string }
  | { kind: "take"; slug: string };

/** One write, ready to send: its body, what it will mean here, and a note for the bar. */
export interface WriteIntent {
  body: WriteBody;
  effect: Effect;
  note: string;
}

/** The decision the form holds, as one write. A drop sends its lifecycle and nothing else. */
export function triageIntent(item: ViewEntry, form: TriageForm): WriteIntent {
  const ref = `item/${item.slug}`;
  const title = titleOf(item);
  if (form.disp === "drop") {
    const reason = form.reason.trim();
    return {
      body: { kind: "triage", ref, lifecycle: "dropped" },
      effect: { kind: "triage", slug: item.slug, title, label: "dropped" + (reason ? ` · ${reason}` : "") },
      note: reason ? `reason for the agent to record: “${reason}”` : "",
    };
  }
  const body: WriteBody = { kind: "triage", ref, lifecycle: form.disp };
  if (form.priority) body.priority = form.priority;
  if (form.parent) body.parent = `feature/${form.parent}`;
  if (form.reviewed) body.reviewed = true;
  const label = [`accepted to ${form.disp}`, form.priority, form.parent].filter(Boolean).join(" · ");
  return { body, effect: { kind: "triage", slug: item.slug, title, label }, note: "" };
}

export function bringIntent(item: ViewEntry, cycle: string): WriteIntent {
  return {
    body: { kind: "membership", ref: `item/${item.slug}`, cycle },
    effect: { kind: "bring", slug: item.slug },
    note: "",
  };
}

export function takeIntent(item: ViewEntry): WriteIntent {
  return {
    body: { kind: "membership", ref: `item/${item.slug}`, cycle: null },
    effect: { kind: "take", slug: item.slug },
    note: "",
  };
}

/** The cycle "Bring in" brings into: the Cycle page's cycle, while it is a current one. */
export function bringTarget(state: BoardState, s: Snapshot): PortfolioEntry | null {
  if (!state.cycle) return null;
  return s.portfolio.cycles.find((c) => c.slug === state.cycle) ?? null;
}

/** A backlog or ready item in no cycle can be brought into a current cycle. */
export function canBring(item: ViewEntry, cycle: PortfolioEntry | null): boolean {
  if (!cycle || cycle.archived || !cycle.current) return false;
  return !item.archived && !item.cycle && ["backlog", "ready"].includes(item.lifecycle ?? "");
}

/** An open item in a cycle can be taken out of it. */
export function canTake(item: ViewEntry): boolean {
  return !item.archived && !!item.cycle && isOpen(item);
}

/**
 * The write a key asks for, or `null`. `t` takes out only the item the
 * inspector is showing. `b` brings the highlighted row in. On the Cycle page
 * the band names the cycle, so the highlight is enough; anywhere else `b`
 * needs the inspector open, where the button names the cycle it brings into.
 */
export function keyIntent(state: BoardState, ctx: ListContext, action: KeyAction): WriteIntent | null {
  if (action !== "bring" && action !== "take") return null;
  const list = currentList(state, ctx);
  const sel = selected(state, list);
  if (!sel) return null;
  const open = inspecting(state, list);
  if (action === "bring") return state.view === "cycle" || open ? bringRow(state, ctx, sel.key) : null;
  return open && canTake(sel.item) ? takeIntent(sel.item) : null;
}

/** "Bring in" on one row of the current list, highlighted or not; `null` when it cannot be brought in. */
export function bringRow(state: BoardState, ctx: ListContext, key: string | null): WriteIntent | null {
  const row = currentList(state, ctx).find((r) => r.key === key);
  const target = bringTarget(state, ctx.snapshot);
  return row && target && canBring(row.item, target) ? bringIntent(row.item, target.slug) : null;
}

/** "Apply" on the triage form: the decision on the item the inspector is showing. */
export function formIntent(state: BoardState, ctx: ListContext, form: TriageForm | null): WriteIntent | null {
  const list = currentList(state, ctx);
  const sel = selected(state, list);
  if (!form || !sel || !inspecting(state, list)) return null;
  return sel.key.startsWith("t:") && sel.item.lifecycle === "triage" ? triageIntent(sel.item, form) : null;
}

// ---- one write at a time -----------------------------------------------------

/** How long nothing more can be sent after a write has landed and the board has been redrawn. */
export const SETTLE_MS = 600;

/**
 * Whether a write may be sent. One is `pending` from the click to the redraw
 * that follows its answer; then nothing is taken until `until`. A write moves
 * the highlight on, so a second click or key meant for the same control would
 * otherwise land on the next item's.
 */
export interface Gate {
  pending: boolean;
  until: number;
}

export const IDLE_GATE: Gate = { pending: false, until: 0 };

export function gateBusy(gate: Gate, now: number): boolean {
  return gate.pending || now < gate.until;
}

/** Take the gate for one write, or `null`: one is pending, or one has only just landed. */
export function gateTake(gate: Gate, now: number): Gate | null {
  return gateBusy(gate, now) ? null : { pending: true, until: 0 };
}

/** The write landed and the board was redrawn at `now`. */
export function gateRelease(now: number): Gate {
  return { pending: false, until: now + SETTLE_MS };
}

export type WriteResult =
  | { ok: true; command: string; /** The Undo, exactly as the server sent it. */ restore: unknown; advisories: string[] }
  | { ok: false; status: number | null; message: string; hint: string | null; command: string | null };

/** Read one `/api/write` response: its status and parsed body, or `null` for no answer. */
export function readWrite(status: number | null, body: unknown): WriteResult {
  if (status === null)
    return { ok: false, status, message: "the board's server is not answering.", hint: null, command: null };
  if (status === 401) return { ok: false, status, message: SESSION_ENDED, hint: null, command: null };
  const data = isRecord(body) && isRecord(body.data) ? body.data : null;
  if (status === 200 && data && typeof data.command === "string")
    return {
      ok: true,
      command: data.command,
      restore: data.restore ?? null,
      advisories: (Array.isArray(data.advisories) ? data.advisories : []).flatMap((a: unknown) =>
        isRecord(a) && typeof a.message === "string" && a.message ? [a.message] : []
      ),
    };
  const error = isRecord(body) && isRecord(body.error) ? body.error : null;
  const choices = error && Array.isArray(error.choices) ? error.choices.filter((c) => typeof c === "string") : [];
  return {
    ok: false,
    status,
    message:
      error && typeof error.message === "string" && error.message
        ? error.message
        : status === 200
          ? "the board's server sent an answer this page cannot read."
          : `the board's server answered ${status}.`,
    hint:
      error && typeof error.hint === "string" && error.hint
        ? error.hint
        : choices.length
          ? `choices: ${choices.join(", ")}`
          : null,
    command: isRecord(body) && typeof body.command === "string" ? body.command : null,
  };
}

// ---- the line under the list --------------------------------------------------

export const UNDO_GONE = "Undo no longer available";

/** What the line under the list holds: the last write, with the one Undo there is. */
export interface Last {
  label: string;
  text: string;
  note: string;
  /** The Undo on offer: the server's object, kept as it came, sent back as it is. */
  restore: unknown;
  /** What the write that Undo belongs to meant here, for the Undo to take back. */
  effect: Effect | null;
  /** The command line of the write that Undo belongs to. */
  undoOf: string;
}

const shell = (command: string | null): string => (command ? `$ ${command}` : "");
const hasUndo = (last: Last | null): last is Last => !!last && last.restore !== null && last.restore !== undefined;
const REFUSED = "refused";

/**
 * The line after a write, given the line before it. One that ran shows its
 * command and its own Undo, which replaces any earlier one: there is one
 * slot. A refusal shows why, and keeps the earlier write's Undo on offer.
 */
export function afterWrite(result: WriteResult, intent: WriteIntent, prev: Last | null = null): Last {
  if (!result.ok) {
    const kept = hasUndo(prev) ? prev : null;
    return {
      label: REFUSED,
      text: shell(result.command),
      note: [result.message, result.hint].filter(Boolean).join(" "),
      restore: kept ? kept.restore : null,
      effect: kept ? kept.effect : null,
      undoOf: kept ? kept.undoOf : "",
    };
  }
  const text = shell(result.command);
  return {
    label: "ran",
    text,
    note: [intent.note, ...result.advisories].filter(Boolean).join(" · "),
    restore: result.restore,
    effect: intent.effect,
    undoOf: text,
  };
}

/** What Undo posts: the stored object itself, never one rebuilt from its parts. `null` when there is none. */
export function undoBody(last: Last | null): unknown {
  return hasUndo(last) ? last.restore : null;
}

/**
 * The line after an Undo was sent. One that ran is used up. Any 409 means it
 * can no longer be applied: the control goes. So does a 401: the token is new
 * on every start, so a refused token is a server that started since the write
 * and holds no Undo. Any other failure leaves the control. A line that is not
 * "undone with" is about the write the Undo belongs to, whatever it said before.
 */
export function afterUndo(last: Last, result: WriteResult): Last {
  if (result.ok)
    return { label: "undone with", text: shell(result.command), note: "", restore: null, effect: null, undoOf: "" };
  const about = { label: "ran", text: last.undoOf };
  if (result.status === 409 || result.status === 401)
    return { ...about, note: UNDO_GONE, restore: null, effect: null, undoOf: "" };
  return { ...last, ...about, note: `Undo did not run: ${result.message}` };
}

/**
 * A command on at most `max` lines of `cols` characters (its font is
 * monospace), broken between words. When that is not enough the item ref is
 * cut in the middle, by as little as makes it fit, and every flag stays whole.
 * Only a line too narrow for the flags themselves loses its end. With `cols`
 * unknown (0) the command is one line.
 */
export function commandLines(text: string, cols: number, max = 2): string[] {
  if (!text) return [];
  if (cols <= 0) return [text];
  const wrap = (words: readonly string[]): string[] => {
    const lines: string[] = [];
    for (const word of words) {
      const at = lines.length - 1;
      if (at >= 0 && lines[at]!.length + 1 + word.length <= cols) lines[at] += ` ${word}`;
      else lines.push(word);
    }
    return lines;
  };
  const fits = (lines: readonly string[]): boolean => lines.length <= max && lines.every((l) => l.length <= cols);
  const words = text.split(" ").filter(Boolean);
  let lines = wrap(words);
  if (fits(lines)) return lines;
  const at = words.findIndex((w) => w.startsWith("item/"));
  if (at >= 0) {
    const slug = words[at]!.slice("item/".length);
    for (let keep = slug.length - 2; keep >= 2; keep--) {
      const head = Math.ceil(keep / 2);
      const cut = `item/${slug.slice(0, head)}…${slug.slice(slug.length - (keep - head))}`;
      lines = wrap(words.map((w, n) => (n === at ? cut : w)));
      if (fits(lines)) return lines;
    }
  }
  // Too narrow even with the ref at its shortest: the end goes.
  const clip = (l: string, more: boolean): string => (l.length > cols || more ? `${l.slice(0, cols - 1)}…` : l);
  return lines.slice(0, max).map((l, n) => clip(l, n === max - 1 && lines.length > max));
}

/** What the template draws of the line. The restore object itself never goes to the template. */
export interface LastView {
  label: string;
  /** The whole command, for the tooltip and for a copy. */
  text: string;
  /** The command as drawn, for the measured width. */
  lines: string[];
  note: string;
  undo: boolean;
  /** "Undo", or "Undo previous write" when the line shows a later refusal. */
  undoLabel: string;
  /** The command that Undo would take back, when it is not the one the line shows. */
  undoTitle: string;
  /** The line is a refusal: its note, the reason, is what must stay readable. */
  refused: boolean;
  /** There is no command on the line: the note has all of it. */
  bare: boolean;
}

/** The line for the template, with its command fitted to `cols` characters a line. */
export function lastView(last: Last | null, cols: number): LastView | null {
  if (!last) return null;
  const earlier = hasUndo(last) && last.label === REFUSED;
  return {
    label: last.label,
    text: last.text,
    lines: commandLines(last.text, cols),
    note: last.note,
    undo: hasUndo(last),
    undoLabel: earlier ? "Undo previous write" : "Undo",
    undoTitle: earlier ? last.undoOf : "",
    refused: last.label === REFUSED,
    bare: !last.text,
  };
}

// ---- where a write lands ------------------------------------------------------

/** One line of "Decided". */
export interface Decided {
  slug: string;
  title: string;
  label: string;
}

/** Record a triage decision, newest last, one line per item. */
export function withDecided(list: readonly Decided[], effect: Effect): readonly Decided[] {
  if (effect.kind !== "triage") return list;
  return [...list.filter((d) => d.slug !== effect.slug), { slug: effect.slug, title: effect.title, label: effect.label }];
}

export function withoutDecided(list: readonly Decided[], slug: string): readonly Decided[] {
  return list.filter((d) => d.slug !== slug);
}

/** The view state after a write ran: a brought-in item joins "Added just now". */
export function applied(state: BoardState, effect: Effect): BoardState {
  if (effect.kind === "bring") return noteBroughtIn(state, effect.slug);
  if (effect.kind === "take") return noteTakenOut(state, effect.slug);
  return state;
}

/** The view state after a write's Undo ran. */
export function reverted(state: BoardState, effect: Effect): BoardState {
  return effect.kind === "bring" ? noteTakenOut(state, effect.slug) : state;
}

/**
 * What to flash after a write, or after its Undo: the item's row when the
 * list shows it, else the Cycle page's tab it went to. A triage decision
 * flashes "Decided", and its Undo the row that came back.
 */
export function landing(state: BoardState, ctx: ListContext, effect: Effect, undone: boolean): string | null {
  if (effect.kind === "triage") return state.view !== "triage" ? null : undone ? `t:${effect.slug}` : "decided";
  const tab = (effect.kind === "bring") !== undone ? "in" : "cand";
  if (currentList(state, ctx).some((r) => r.key === `i:${effect.slug}`)) return `i:${effect.slug}`;
  return state.view === "cycle" ? `tab:${tab}` : null;
}

// ---- what a write changes on the page ----------------------------------------

/** Everything on the page a write or its Undo can change. */
export interface Local {
  state: BoardState;
  decided: readonly Decided[];
  forms: Forms;
  last: Last | null;
}

/**
 * The page after a write was answered. One that ran is recorded: "Decided" or
 * "Added just now", and the decided item's form is dropped. A refusal applies
 * no local effect: the board is as it was. Either way the form that was sent
 * is unticked: a tick is for one decision.
 */
export function afterSend(local: Local, result: WriteResult, intent: WriteIntent): Local {
  const last = afterWrite(result, intent, local.last);
  const { effect } = intent;
  if (!result.ok) {
    const forms = effect.kind === "triage" ? withField(local.forms, effect.slug, "reviewed", false) : local.forms;
    return { ...local, forms, last };
  }
  return {
    state: applied(local.state, effect),
    decided: withDecided(local.decided, effect),
    forms: effect.kind === "triage" ? withoutForm(local.forms, effect.slug) : local.forms,
    last,
  };
}

/**
 * The page after an Undo was answered. One that ran takes back what its write
 * meant here, and drops the item's form so it opens fresh. One that did not
 * run changes the line and nothing else.
 */
export function afterUndoSent(local: Local, result: WriteResult): Local {
  if (!hasUndo(local.last)) return local;
  const last = afterUndo(local.last, result);
  const effect = result.ok ? local.last.effect : null;
  if (!effect) return { ...local, last };
  return {
    state: reverted(local.state, effect),
    decided: withoutDecided(local.decided, effect.slug),
    forms: withoutForm(local.forms, effect.slug),
    last,
  };
}

/** The row the keyboard goes to after a write: the highlighted one, else the first. */
export function focusKey(state: BoardState, ctx: ListContext): string | null {
  const list = currentList(state, ctx);
  return (selected(state, list) ?? list[0])?.key ?? null;
}

// ---- the view model ----------------------------------------------------------

export interface ItemRow {
  key: string;
  title: string;
  on: boolean;
  meta: Meta;
}

export interface InboxRowVm {
  id: string;
  key: string;
  label: string;
  n: number | null;
  /** The line under the label. */
  text: string;
  tip: string;
  does: string | null;
  /** A red dot before the label: the row is about blocked work. */
  alert: boolean;
  on: boolean;
  menu: boolean;
}

export interface Vm {
  view: View;
  /** The nav entry that is lit. */
  nav: "now" | "inbox" | "triage" | "cycle" | "feature";
  inboxCount: number;
  /**
   * The board cannot be shown: the project's CLI is too old for it. Nothing
   * of the last snapshot is drawn, the inspector included.
   */
  blocked: boolean;
  /** The inspector is open, so the centre is as wide as what is left. */
  inspecting: boolean;
  band: {
    /** The page's title, on a page that is not a container. */
    title: string;
    /** A container's page: one cycle or one feature. */
    box: null | {
      title: string;
      lifecycle: string;
      summary: string;
      noteLabel: string;
      note: string;
      back: string | null;
      bar: Segment[];
    };
    /** "N waiting", on Triage. */
    count: string;
    nowBy: "cycle" | "feature";
    menu: boolean;
    cycles: Array<{ slug: string; title: string; lifecycle: string; on: boolean }>;
    tab: "in" | "cand";
    inCount: number;
    candCount: number;
  };
  now: {
    cycle: null | { slug: string; title: string; summary: string; bar: Segment[] };
    empty: boolean;
    groups: Array<{ key: string; label: string; rows: ItemRow[] }>;
  };
  inbox: {
    empty: boolean;
    groups: Array<{ id: string; label: string; rows: InboxRowVm[] }>;
    snoozed: Array<{ id: string; label: string; n: number | null; note: string }>;
  };
  triage: {
    rows: Array<{ key: string; title: string; on: boolean; kind: string; source: string; filed: string }>;
    /** Decided on this page since it loaded, and no longer waiting. */
    decided: Decided[];
  };
  box: {
    empty: string;
    groups: Array<{ id: string; label: string; fold: boolean; open: boolean; rows: ItemRow[] }>;
  };
  cand: {
    q: string;
    lifecycle: string;
    feature: string;
    features: string[];
    rows: ItemRow[];
    /** There is a cycle to bring a candidate into. */
    bring: boolean;
  };
  features: Array<{
    slug: string;
    title: string;
    lifecycle: string;
    count: string;
    finished: string;
    draft: boolean;
    bar: Segment[];
  }>;
  inspector: null | {
    position: string;
    first: boolean;
    last: boolean;
    title: string;
    meta: Meta;
    description: string;
    fields: Field[];
    path: string;
    tip: string;
    slug: string;
    /** "Bring into <the cycle's title>", when the item can be brought in. */
    bring: string | null;
    /** The slug of that cycle, for the button's tooltip. */
    bringTitle: string;
    /** The item can be taken out of its cycle. */
    take: boolean;
    /** The item is waiting in triage: the inspector carries the decision form. */
    triage: boolean;
    /** The features the form offers as a parent. */
    features: string[];
  };
}

const TITLES: Partial<Record<View, string>> = { now: "Now", inbox: "Inbox", triage: "Triage", feature: "Features" };
const NAV: Record<View, Vm["nav"]> = {
  now: "now",
  inbox: "inbox",
  triage: "triage",
  cycle: "cycle",
  feature: "feature",
  featurePage: "feature",
};

const titleOf = (e: { title: string | null; slug: string }): string => e.title ?? e.slug;

function featureEntry(s: Snapshot, slug: string | null): ViewEntry | null {
  if (!slug) return null;
  return allEntries(s).find((e) => e.entity === "feature" && e.slug === slug) ?? null;
}

function inboxRowVm(r: InboxRow, state: BoardState): InboxRowVm {
  const line = r.target.type === "ask" ? r.target.line : "";
  // An advisory's own `action` is already the thing to ask for.
  const text = r.does || r.kind === "advisory" ? r.desc : `${r.desc} Ask the agent: “${line}”`;
  return {
    id: r.id,
    key: `a:${r.id}`,
    label: r.label,
    n: r.n,
    text,
    tip: r.does ? r.desc : line,
    does: r.does,
    alert: r.kind === "blocked",
    on: state.sel === `a:${r.id}`,
    menu: state.snoozeMenu === r.id,
  };
}

/** Everything the template draws, for one state over one snapshot, given what is wrong, if anything. */
export function viewModel(
  state: BoardState,
  ctx: ListContext,
  problem: Problem | null = null,
  decided: readonly Decided[] = []
): Vm {
  const s = ctx.snapshot;
  const index = idIndex(s);
  const list = currentList(state, ctx);
  const sel = selected(state, list);
  const view = state.view;
  const row = (i: ViewEntry, o: MetaOptions, prefix = "i:"): ItemRow => ({
    key: prefix + i.slug,
    title: titleOf(i),
    on: state.sel === prefix + i.slug,
    meta: meta(s, i, o, index),
  });
  const rows = inboxRows(s, ctx.snoozes, ctx.now);
  const active = activeCycle(s);
  const blocked = problem?.blocking ?? false;

  const vm: Vm = {
    view,
    nav: NAV[view],
    inboxCount: inboxCount(rows),
    blocked,
    inspecting: !blocked && inspecting(state, list),
    band: {
      title: TITLES[view] ?? "",
      box: null,
      count: "",
      nowBy: state.nowBy,
      menu: state.menu,
      cycles: s.portfolio.cycles.map((c) => ({
        slug: c.slug,
        title: titleOf(c),
        lifecycle: c.lifecycle ?? "",
        on: c.slug === state.cycle,
      })),
      tab: state.tab,
      inCount: state.cycle ? cycleItems(s, state.cycle).length : 0,
      candCount: candidateTotal(s),
    },
    now: { cycle: null, empty: false, groups: [] },
    inbox: { empty: false, groups: [], snoozed: [] },
    triage: { rows: [], decided: [] },
    box: { empty: "", groups: [] },
    cand: {
      q: state.cand.q,
      lifecycle: state.cand.lifecycle,
      feature: state.cand.feature,
      features: s.portfolio.features.map((f) => f.slug),
      rows: [],
      bring: bringTarget(state, s) !== null,
    },
    features: [],
    inspector: null,
  };

  if (view === "now") {
    if (active) {
      const its = cycleItems(s, active.slug);
      vm.now.cycle = { slug: active.slug, title: titleOf(active), summary: summary(its), bar: bar(its) };
    }
    vm.now.empty = startedItems(s).length === 0;
    vm.now.groups = nowGroups(s, state.nowBy).map((g) => ({
      key: g.key,
      label: g.label,
      rows: g.items.map((i) => row(i, { review: true, noParent: state.nowBy === "feature" })),
    }));
  }

  if (view === "inbox") {
    const live = liveSnoozes(ctx.snoozes, ctx.now, active?.slug ?? null);
    vm.inbox.empty = rows.length === 0;
    vm.inbox.groups = inboxGroups(rows).map((g) => ({
      id: g.id,
      label: g.label,
      rows: g.rows.map((r) => inboxRowVm(r, state)),
    }));
    vm.inbox.snoozed = snoozedRows(s, ctx.snoozes, ctx.now).map((r) => {
      const choice = SNOOZE_CHOICES.find((c) => c.id === live.find((x) => x.id === r.id)?.choice);
      return { id: r.id, label: r.label, n: r.n, note: choice ? `Snoozed ${choice.note}` : "" };
    });
  }

  if (view === "triage") {
    const queue = triageQueue(s);
    // A decided item still in the queue has not left it yet: it is drawn once, as waiting.
    vm.triage.decided = decided.filter((d) => !queue.some((i) => i.slug === d.slug));
    vm.band.count =
      `${queue.length} waiting` + (vm.triage.decided.length ? ` · ${vm.triage.decided.length} decided` : "");
    vm.triage.rows = queue.map((i) => ({
      key: `t:${i.slug}`,
      title: titleOf(i),
      on: state.sel === `t:${i.slug}`,
      kind: i.kind ?? "",
      source: i.source ?? "",
      filed: i.date ?? "",
    }));
  }

  if (view === "cycle") {
    const portfolio = s.portfolio.cycles.find((c) => c.slug === state.cycle) ?? null;
    const own = state.cycle ? cycleEntry(s, state.cycle) : null;
    const its = state.cycle ? cycleItems(s, state.cycle) : [];
    const lifecycle = portfolio?.lifecycle ?? own?.lifecycle ?? "";
    const when = lifecycle === "active" && own?.started ? `started ${own.started}` : lifecycle;
    vm.band.box = {
      title: portfolio ? titleOf(portfolio) : (state.cycle ?? "No cycle"),
      lifecycle,
      summary: [summary(its), when, own?.status !== "stable" ? "draft" : ""].filter(Boolean).join(" · "),
      noteLabel: own?.appetite ? "Appetite. " : "",
      note: own?.appetite ?? "",
      back: state.peek ? state.peek.label : null,
      bar: bar(its),
    };
    if (state.tab === "cand") vm.cand.rows = candidates(s, state.cand).map((i) => row(i, { lifecycle: true, noParent: true }));
    else {
      vm.box.empty = "Nothing is in this cycle yet.";
      vm.box.groups = containerGroups(its, state.added).map((g) => ({
        id: g.id,
        label: g.label,
        fold: g.fold,
        open: !g.fold || state.doneOpen,
        rows: g.items.map((i) => row(i, { lifecycle: g.id === "added" })),
      }));
    }
  }

  if (view === "featurePage") {
    const f = featureEntry(s, state.feature);
    const its = state.feature ? featureItems(s, state.feature) : [];
    vm.band.box = {
      title: f ? titleOf(f) : (state.feature ?? ""),
      lifecycle: f?.lifecycle ?? "",
      summary: [its.length ? summary(its) : "No items yet", f?.status !== "stable" ? "draft" : ""]
        .filter(Boolean)
        .join(" · "),
      noteLabel: "",
      note: f?.description ?? "",
      back: "Features",
      bar: bar(its),
    };
    vm.box.empty = "No item names this feature as its parent.";
    vm.box.groups = containerGroups(its).map((g) => ({
      id: g.id,
      label: g.label,
      fold: g.fold,
      open: !g.fold || state.doneOpen,
      rows: g.items.map((i) => row(i, { noParent: true })),
    }));
  }

  if (view === "feature")
    vm.features = s.portfolio.features.map((p) => {
      const its = featureItems(s, p.slug);
      const finished = its.filter((i) => !isOpen(i)).length;
      return {
        slug: p.slug,
        title: titleOf(p),
        lifecycle: p.lifecycle ?? "",
        count: its.length ? `${its.length - finished} open` : "no items",
        finished: finished ? `${finished} finished` : "",
        draft: featureEntry(s, p.slug)?.status !== "stable",
        bar: bar(its),
      };
    });

  if (vm.inspecting && sel) {
    const at = list.indexOf(sel);
    const i = sel.item;
    const target = bringTarget(state, s);
    vm.inspector = {
      position: `${at + 1} of ${list.length}`,
      first: at <= 0,
      last: at >= list.length - 1,
      title: titleOf(i),
      meta: meta(s, i, { lifecycle: true, noParent: true }, index),
      description: i.description ?? "",
      fields: fields(s, i, index),
      path: i.path,
      tip: `${i.path} · id ${i.id ?? "none"}`,
      slug: i.slug,
      bring: target && canBring(i, target) ? `Bring into ${titleOf(target)}` : null,
      bringTitle: target?.slug ?? "",
      take: canTake(i),
      triage: sel.key.startsWith("t:") && i.lifecycle === "triage",
      features: vm.cand.features,
    };
  }
  return vm;
}

const NOTHING: Snapshot = {
  board: { groups: {}, advisories: [] },
  portfolio: { cycles: [], features: [], advisories: [] },
  unreviewed: { items: [], advisories: [] },
  cycles: [],
};

/** What the template binds before the first snapshot arrives. */
export function emptyVm(problem: Problem | null = null): Vm {
  return viewModel(initialState(NOTHING), { snapshot: NOTHING, snoozes: [], now: new Date(0) }, problem);
}
