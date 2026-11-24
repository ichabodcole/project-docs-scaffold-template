/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
// The board's page: Alpine glue. It fetches, polls, listens for keys and moves
// focus; every rule it applies lives in `client.ts`, `selection.ts` or
// `model.ts`. Phase 4 of the plan: it reads, and writes nothing.
import {
  applyKey,
  applyPoll,
  attend,
  closesInspector,
  EMPTY_FEED,
  emptyVm,
  handoffLine,
  keyAction,
  POLL_MS,
  readPoll,
  settle,
  SNOOZE_CHOICES,
  takeToken,
  TOKEN_HEADER,
  unreachable,
  viewModel,
  type Feed,
  type PollResult,
  type Problem,
  type Vm,
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
  let polling = false;

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

  return {
    vm: emptyVm() as Vm,
    /** A snapshot has arrived, so there is a board to draw. */
    ready: false,
    problem: null as Problem | null,
    project: "",
    /** The line under the list: a line to copy now, the command a write ran later. */
    last: null as { label: string; text: string } | null,
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

    async poll(): Promise<void> {
      if (polling) return;
      polling = true;
      try {
        const had = root;
        await this.identify();
        const res = token === null ? null : await get("/api/snapshot");
        const result: PollResult = res ? readPoll(res.status, res.body) : unreachable(token === null ? "no-token" : "no-answer");
        this.take(result, root !== had);
      } finally {
        polling = false;
      }
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
      this.vm = feed.snapshot && state ? viewModel(state, ctx(feed.snapshot), feed.problem) : emptyVm(feed.problem);
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
      if (path) this.last = { label: "opens in Scriptorium:", text: handoffLine(path) };
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
        { key: e.key, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey, tag: target?.tagName ?? "" },
        this.vm.blocked
      );
      if (action === null) return;
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
     * acts on it. With `soft`, only when focus has nowhere else to be.
     */
    focusRow(soft = false): void {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (soft && active instanceof HTMLElement && active !== document.body && active.isConnected && active.offsetParent)
          return;
        const sel = state?.sel;
        if (!sel) return;
        const row = [...document.querySelectorAll<HTMLElement>("[data-key]")].find(
          (el) => el.dataset.key === sel && el.offsetParent !== null
        );
        if (!row) return;
        row.scrollIntoView({ block: "nearest" });
        row.querySelector<HTMLElement>("[data-focus]")?.focus({ preventScroll: true });
      });
    },
  };
}

document.addEventListener("alpine:init", () => {
  (window as unknown as { Alpine: { data(name: string, factory: () => object): void } }).Alpine.data("board", board);
});
