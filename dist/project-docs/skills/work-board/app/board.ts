/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
// The board's page: Alpine glue. It fetches, polls, listens for keys and moves
// focus; every rule it applies lives in `client.ts`, `selection.ts` or
// `model.ts`. It writes two things, each through one `POST /api/write`: a
// triage decision and cycle membership. An Undo sends back the object the
// server returned. One write at a time; the board changes when its snapshot does.
import {
  afterSend,
  afterUndoSent,
  applyKey,
  applyPoll,
  attend,
  bringRow,
  closesInspector,
  EMPTY_FEED,
  emptyVm,
  focusKey,
  formIntent,
  formsOnShow,
  gateBusy,
  gateRelease,
  gateTake,
  handoffLine,
  IDLE_GATE,
  keyAction,
  keyIntent,
  landing,
  lastView,
  POLL_MS,
  readPoll,
  readWrite,
  settle,
  SETTLE_MS,
  SNOOZE_CHOICES,
  takeToken,
  TOKEN_HEADER,
  undoBody,
  unreachable,
  viewModel,
  withField,
  type Decided,
  type Effect,
  type Feed,
  type Forms,
  type Gate,
  type Last,
  type LastView,
  type Local,
  type PollResult,
  type Problem,
  type TriageForm,
  type Vm,
  type WriteIntent,
  type WriteResult,
} from "./client.ts";
import {
  activeCycle,
  liveSnoozes,
  snooze,
  withoutSnooze,
  withSnooze,
  type CandidateFilter,
  type Snapshot,
  type Snooze,
  type SnoozeChoice,
} from "./model.ts";
import {
  back,
  change,
  currentList,
  go,
  initialState,
  move,
  openFeature,
  openSnoozeMenu,
  pick,
  refresh,
  setCycle,
  selected,
  setTab,
  toggleCycleMenu,
  toggleDone,
  type BoardState,
  type CycleTab,
  type ListContext,
  type View,
} from "./selection.ts";

const TOKEN_KEY = "pdocs-work-board:token";
const SNOOZE_KEY = "pdocs-work-board:snoozes:";

/** The token from the address bar, which is then cleaned, or the one this tab already holds. */
function sessionToken(): string | null {
  const taken = takeToken(location.search);
  if (taken.token !== null) history.replaceState(null, "", location.pathname + taken.search + location.hash);
  try {
    // Kept for this tab only, so a reload still has it.
    if (taken.token !== null) sessionStorage.setItem(TOKEN_KEY, taken.token);
    return taken.token ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return taken.token;
  }
}

function readSnoozes(root: string): Snooze[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SNOOZE_KEY + root) ?? "[]");
    return Array.isArray(stored) ? (stored as Snooze[]) : [];
  } catch {
    return [];
  }
}

function writeSnoozes(root: string, snoozes: readonly Snooze[]): void {
  // Never under an empty root: that key would be shared by every project.
  if (!root) return;
  try {
    localStorage.setItem(SNOOZE_KEY + root, JSON.stringify(snoozes));
  } catch {
    // Snooze is view state: without storage it lasts as long as the page.
  }
}

function board() {
  // Held outside Alpine's reactive data, so nothing can change a snapshot in
  // place: the template sees only `vm`, which is rebuilt from these.
  const token = sessionToken();
  let feed: Feed = EMPTY_FEED;
  let state: BoardState | null = null;
  let snoozes: Snooze[] = [];
  let root = "";
  let polling: Promise<void> | null = null;
  // The last write, with the server's restore object as it came: never handed
  // to Alpine, so what Undo sends back is that object and nothing rebuilt.
  let lastWrite: Last | null = null;
  let decided: readonly Decided[] = [];
  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  // One write at a time, and none for a moment after one lands.
  let gate: Gate = IDLE_GATE;
  // The waiting item the inspector was showing at the last draw.
  let shown: string | null = null;
  // How many characters of the command fit on one line of the bar, as measured.
  let cols = 0;

  const ctx = (snapshot: Snapshot): ListContext => ({ snapshot, snoozes, now: new Date() });

  async function get(path: string): Promise<{ status: number; body: unknown } | null> {
    if (token === null) return null;
    try {
      const res = await fetch(path, { headers: { [TOKEN_HEADER]: token }, cache: "no-store" });
      return { status: res.status, body: await res.json().catch(() => null) };
    } catch {
      return null;
    }
  }

  async function post(body: unknown): Promise<{ status: number; body: unknown } | null> {
    if (token === null) return null;
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { [TOKEN_HEADER]: token, "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    } catch {
      return null;
    }
  }

  return {
    vm: emptyVm() as Vm,
    /** A snapshot has arrived, so there is a board to draw. */
    ready: false,
    problem: null as Problem | null,
    project: "",
    /** The line under the list: a line to copy, or the last write and its Undo. */
    last: null as LastView | null,
    /** A line to say to the agent, which opens the item in Scriptorium. */
    handoffText: "",
    /** A write is on its way or has only just landed: the gate's state, for the template to disable by. */
    busy: false,
    /** The triage form of each waiting item the inspector has shown, by slug. */
    forms: {} as Forms,
    decidedOpen: false,
    /** The row key, `tab:<tab>` or `decided` that a write just landed on. */
    flash: null as string | null,
    copied: false,
    snoozedOpen: false,
    snoozeChoices: SNOOZE_CHOICES,

    async init(): Promise<void> {
      await this.poll();
      // A hidden tab asks for nothing, so a forgotten one does not keep the
      // server reading the project; it catches up the moment it is seen again.
      setInterval(() => {
        if (!document.hidden) void this.poll();
      }, POLL_MS);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) void this.poll();
      });
      // The command in the bar is fitted to the width it is given.
      const text = document.querySelector<HTMLElement>("[data-ran-text]");
      if (text && typeof ResizeObserver !== "undefined") new ResizeObserver(() => this.measure(text)).observe(text);
    },

    /** How many characters fit on a line of the bar's command; draw the line again when that changes. */
    measure(text: HTMLElement): void {
      const width = text.clientWidth;
      if (!width) return;
      const pen = document.createElement("canvas").getContext("2d");
      if (!pen) return;
      const style = getComputedStyle(text);
      pen.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const one = pen.measureText("0").width;
      const fit = one > 0 ? Math.floor(width / one) : 0;
      if (fit === cols) return;
      cols = fit;
      this.last = lastView(lastWrite, cols);
    },
    /** A copy from the bar takes the whole command, however it is drawn. */
    copyCommand(e: ClipboardEvent): void {
      if (!lastWrite?.text || !e.clipboardData) return;
      e.clipboardData.setData("text/plain", lastWrite.text);
      e.preventDefault();
    },

    /** Learn which project this is. Asked again on every poll until it is known. */
    async identify(): Promise<void> {
      if (root) return;
      const health = await get("/api/health");
      const data = (health?.body as { data?: { root?: unknown } } | null)?.data;
      if (typeof data?.root !== "string" || !data.root) return;
      root = data.root;
      this.project = root.split("/").filter(Boolean).pop() ?? "";
      // Anything snoozed before the root was known is kept, over what was stored.
      snoozes = snoozes.reduce((list, s) => withSnooze(list, s), readSnoozes(root));
      writeSnoozes(root, snoozes);
    },

    /** One poll at a time: a second caller waits for the one in flight. */
    poll(): Promise<void> {
      polling ??= (async () => {
        try {
          const had = root;
          await this.identify();
          const res = token === null ? null : await get("/api/snapshot");
          const result: PollResult = res
            ? readPoll(res.status, res.body)
            : unreachable(token === null ? "no-token" : "no-answer");
          this.take(result, root !== had);
        } finally {
          polling = null;
        }
      })();
      return polling;
    },
    /** A poll that starts now: after a write, one already in flight may predate it. */
    async pollNow(): Promise<void> {
      if (polling) await polling;
      await this.poll();
    },

    /**
     * Take a poll's result: keep the snapshot when its hash is unchanged, and
     * settle the selection when it is not. `force` draws again regardless: the
     * project, and so its snoozes, has just become known.
     */
    take(result: PollResult, force = false): void {
      const before = feed.snapshot;
      const next = applyPoll(feed, result);
      feed = next.feed;
      if (next.changed && feed.snapshot) {
        if (state === null || before === null) state = initialState(feed.snapshot);
        else state = refresh(settle(state, feed.snapshot), ctx(before), ctx(feed.snapshot));
      }
      // A snooze ends on a date or with the cycle, whether or not anything else changed.
      const woke = this.pruneSnoozes();
      if (!next.redraw && !woke && !force) return;
      // Redrawing a list can move the highlighted row's element, which drops
      // the keyboard focus to the page. Put it back, unless it was somewhere
      // of its own: a field, a menu, a button outside the list.
      const active = document.activeElement;
      const loose = active === null || active === document.body || active.closest("[data-key]") !== null;
      const held = feed.snapshot && state ? selected(state, currentList(state, ctx(feed.snapshot))) : null;
      this.render();
      if (next.changed && held && loose && !state?.menu && state?.snoozeMenu === null) this.focusRow();
    },

    pruneSnoozes(): boolean {
      if (!feed.snapshot) return false;
      const live = liveSnoozes(snoozes, new Date(), activeCycle(feed.snapshot)?.slug ?? null);
      if (live.length === snoozes.length) return false;
      snoozes = live;
      writeSnoozes(root, snoozes);
      return true;
    },

    render(): void {
      this.problem = feed.problem;
      this.ready = feed.snapshot !== null;
      this.vm =
        feed.snapshot && state ? viewModel(state, ctx(feed.snapshot), feed.problem, decided) : emptyVm(feed.problem);
      // The waiting item the inspector has come to has a form, unticked.
      const now = this.vm.inspector?.triage ? this.vm.inspector.slug : null;
      const forms = formsOnShow(this.forms, shown, now);
      shown = now;
      if (forms !== this.forms) this.forms = forms;
    },

    /** Run one change to the view state, then draw it. */
    update(fn: (s: BoardState, c: ListContext) => BoardState): void {
      if (!feed.snapshot || !state) return;
      state = fn(state, ctx(feed.snapshot));
      this.copied = false;
      this.render();
    },

    // ---- the nav and the band ----
    go(view: View): void {
      this.update((s) => go(s, view));
      this.top();
    },
    openCycle(slug: string): void {
      this.update((s) => setCycle(go(s, "cycle"), slug));
      this.top();
    },
    setNowBy(by: "cycle" | "feature"): void {
      this.update((s, c) => change(s, c, (x) => ({ ...x, nowBy: by })));
      this.focusRow(true);
    },
    toggleMenu(): void {
      this.update((s) => toggleCycleMenu(s));
    },
    closeMenu(): void {
      if (state?.menu) this.update((s) => ({ ...s, menu: false }));
    },
    setCycle(slug: string): void {
      this.update((s) => setCycle(s, slug));
      this.top();
    },
    setTab(tab: CycleTab): void {
      this.update((s) => setTab(s, tab));
      this.top();
    },
    back(): void {
      this.update((s) => back(s));
      this.top();
    },
    toggleDone(): void {
      this.update((s, c) => toggleDone(s, c));
    },
    setCand(field: keyof CandidateFilter, value: string): void {
      this.update((s, c) => change(s, c, (x) => ({ ...x, cand: { ...x.cand, [field]: value } })));
    },
    openFeature(slug: string): void {
      this.update((s) => openFeature(s, slug));
      this.top();
    },

    // ---- rows and the inspector ----
    pick(key: string): void {
      this.update((s) => pick(s, key));
    },
    /** An Inbox row does the one thing it says: go to Triage, show a cycle, or show an item. */
    attend(id: string): void {
      this.update((s, c) => attend(s, c, id));
      if (state?.view !== "inbox") this.top();
    },
    step(n: number): void {
      this.update((s, c) => move(s, currentList(s, c), n));
      this.focusRow();
    },
    close(): void {
      this.update((s) => ({ ...s, open: false }));
      this.focusRow();
    },
    copy(): void {
      const path = this.vm.inspector?.path;
      if (!path) return;
      try {
        void navigator.clipboard?.writeText(path)?.catch(() => {});
      } catch {
        // No clipboard here: the path is in the button's title.
      }
      this.copied = true;
    },
    /** Scriptorium is the agent's to open: show the line to say, and start nothing. */
    handoff(): void {
      const path = this.vm.inspector?.path;
      if (path) this.handoffText = handoffLine(path);
    },

    // ---- the two writes, and Undo ----
    /** The form of the waiting item the inspector shows. */
    get form(): TriageForm | null {
      const item = this.vm.inspector;
      return item?.triage ? (this.forms[item.slug] ?? null) : null;
    },
    setForm<K extends keyof TriageForm>(field: K, value: TriageForm[K]): void {
      const item = this.vm.inspector;
      if (item?.triage) this.forms = withField(this.forms, item.slug, field, value);
    },
    apply(): void {
      if (feed.snapshot && state) void this.send(formIntent(state, ctx(feed.snapshot), this.form));
    },
    bringIn(): void {
      if (feed.snapshot && state) void this.send(bringRow(state, ctx(feed.snapshot), state.sel));
    },
    bringRow(key: string): void {
      if (feed.snapshot && state) void this.send(bringRow(state, ctx(feed.snapshot), key));
    },
    takeOut(): void {
      if (feed.snapshot && state) void this.send(keyIntent(state, ctx(feed.snapshot), "take"));
    },
    /**
     * Send one write. Nothing is drawn ahead of the answer: the board changes
     * with the poll that follows, so a refusal has nothing to take back.
     */
    async send(intent: WriteIntent | null): Promise<void> {
      if (intent) await this.exchange(intent.body, (local, result) => afterSend(local, result, intent), intent.effect, false);
    },
    /** Undo the write on offer, with the object the server returned for it. */
    async undo(): Promise<void> {
      const body = undoBody(lastWrite);
      const effect = lastWrite?.effect ?? null;
      if (body !== null) await this.exchange(body, afterUndoSent, effect, true);
    },
    /**
     * One body to `/api/write`, if the gate lets it through. The poll comes
     * before the answer is applied: the highlight leaves a row from the place
     * it had in the list as it was drawn. Then what the answer means to this
     * page and the line that says what ran, all in one draw.
     */
    async exchange(
      body: unknown,
      settleLocal: (local: Local, result: WriteResult) => Local,
      effect: Effect | null,
      undone: boolean
    ): Promise<void> {
      const taken = gateTake(gate, Date.now());
      if (!taken) return;
      gate = taken;
      this.busy = true;
      try {
        const res = await post(body);
        const result = readWrite(res?.status ?? null, res?.body ?? null);
        await this.pollNow();
        if (state) {
          const local = settleLocal({ state, decided, forms: this.forms, last: lastWrite }, result);
          ({ state, decided } = local);
          lastWrite = local.last;
          if (local.forms !== this.forms) this.forms = local.forms;
        }
        this.last = lastView(lastWrite, cols);
        this.render();
        if (result.ok && effect) this.land(effect, undone);
        // The control that was pressed is disabled, or gone with its row: the keyboard goes back to the list.
        if (feed.snapshot && state) this.focusRow(false, focusKey(state, ctx(feed.snapshot)));
      } finally {
        gate = gateRelease(Date.now());
        setTimeout(() => (this.busy = gateBusy(gate, Date.now())), SETTLE_MS + 20);
      }
    },
    /** Flash where a write landed, once the list that shows it is drawn. */
    land(effect: Effect, undone: boolean): void {
      const key = feed.snapshot && state ? landing(state, ctx(feed.snapshot), effect, undone) : null;
      clearTimeout(flashTimer);
      this.flash = null;
      requestAnimationFrame(() => {
        this.flash = key;
        flashTimer = setTimeout(() => (this.flash = null), 1700);
      });
    },

    // ---- snooze: view state, kept in this browser, never sent ----
    toggleSnooze(id: string): void {
      this.update((s) => (s.snoozeMenu === id ? { ...s, snoozeMenu: null } : openSnoozeMenu(s, id)));
    },
    closeSnooze(id: string): void {
      if (state?.snoozeMenu === id) this.update((s) => ({ ...s, snoozeMenu: null }));
    },
    snooze(id: string, choice: SnoozeChoice): void {
      this.update((s, c) => {
        snoozes = withSnooze(snoozes, snooze(id, choice, c.now, activeCycle(c.snapshot)?.slug ?? null));
        writeSnoozes(root, snoozes);
        // The row leaves the Inbox: if it was the highlighted one, the highlight moves on.
        return refresh({ ...s, snoozeMenu: null }, c, { ...c, snoozes });
      });
    },
    wake(id: string): void {
      snoozes = withoutSnooze(snoozes, id);
      writeSnoozes(root, snoozes);
      if (!snoozes.length) this.snoozedOpen = false;
      this.update((s) => s);
    },

    // ---- keys ----
    keydown(e: KeyboardEvent): void {
      if (!feed.snapshot || !state) return;
      const target = e.target instanceof Element ? e.target : null;
      const action = keyAction(
        {
          key: e.key,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          tag: target?.tagName ?? "",
          repeat: e.repeat,
        },
        this.vm.blocked
      );
      if (action === null) return;
      if (action === "bring" || action === "take") {
        void this.send(keyIntent(state, ctx(feed.snapshot), action));
        return;
      }
      if (action === "down" || action === "up") e.preventDefault();
      const closing = closesInspector(state, action);
      this.update((s, c) => applyKey(s, currentList(s, c), action));
      if (action === "down" || action === "up" || closing) this.focusRow();
    },

    // ---- the DOM: scroll and focus, after Alpine has drawn ----
    top(): void {
      requestAnimationFrame(() => {
        const scroller = document.querySelector("[data-scroll]");
        if (scroller) scroller.scrollTop = 0;
      });
    },
    /**
     * Keep the highlighted row in view and give it the keyboard focus, so Enter
     * acts on it. With `soft`, only when focus has nowhere else to be. With a
     * `key`, that row gets the focus instead.
     */
    focusRow(soft = false, key: string | null = state?.sel ?? null): void {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (soft && active instanceof HTMLElement && active !== document.body && active.isConnected && active.offsetParent)
          return;
        if (!key) return;
        const row = [...document.querySelectorAll<HTMLElement>("[data-key]")].find(
          (el) => el.dataset.key === key && el.offsetParent !== null
        );
        if (!row) return;
        // Only the highlighted row is brought into view: focus alone moves nothing.
        if (key === state?.sel) row.scrollIntoView({ block: "nearest" });
        row.querySelector<HTMLElement>("[data-focus]")?.focus({ preventScroll: true });
      });
    },
  };
}

document.addEventListener("alpine:init", () => {
  (window as unknown as { Alpine: { data(name: string, factory: () => object): void } }).Alpine.data("board", board);
});
