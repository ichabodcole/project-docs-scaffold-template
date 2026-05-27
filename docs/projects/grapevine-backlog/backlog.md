# Grapevine — Feature Backlog

**Status:** Living document **Last Updated:** 2026-05-27

---

## What this is

A catch-all for grapevine feature ideas that aren't yet assigned to a version.
Each entry captures the shape of an idea, the motivation, an initial design
sketch, and open questions — enough to pick it up later without having to
reconstruct the thinking, but not so much that it pretends to be a proposal.

When an item is ready to be promoted, it moves to a versioned project folder
(`docs/projects/grapevine-v1.X/`) and gets a real proposal.

## How to use this

- Add new ideas freely as they come up. The bar is "would be a shame to forget."
- Each item has a status — **idea** (just a spark), **sketched** (shape is
  clear), or **ready** (waiting on a version slot).
- Items can be merged, split, or struck out. The backlog isn't sacred.
- When promoting to a version, copy the entry into the versioned proposal and
  remove it here.

---

## Items

### ~~Cross-channel broadcast (`announce` verb)~~ → Promoted to V1.7

**Status:** Promoted **Originated:** 2026-05-27 **Promoted:** 2026-05-27 (same
day, after the V1.6 rollout demonstrated the need concretely — release
announcement + correction took eight manual sends across four channels; one
`announce` call would have done each)

See [grapevine-v1.7/proposal.md](../grapevine-v1.7/proposal.md) feature **#7**
for the live design. Full sketch and open questions migrated there.

This is a clean demonstration of the backlog → version promotion path: an idea
graduates when motivation accrues, not on a fixed schedule.

---

### Timed announcements / facilitation timer

**Status:** Idea **Originated:** 2026-05-27 (V1.7 design conversation)

**Idea:** A timer primitive that fires a deferred `announce`-style message after
a delay. Useful for facilitating timed activities ("five-minute brainstorm —
pencils down at the buzzer").

**Motivation:**

- Design-sprint facilitation: timed phases ("5 min ideation, 3 min discussion, 2
  min vote").
- Session bumpers: "wrap up in 5 minutes."
- Pomodoro-style coordination across agents.

**Sketch:**

- New verb: `cli.ts timer set <delay> <text> [--channels a,b] [--from <alias>]`.
  Examples: `timer set 5m "pencils down"`, `timer set 30s "halftime"`.
- A timer is conceptually a deferred `announce` — same payload, same
  `kind:"announcement"`, just with a scheduled fire time. Announce and timer
  share infrastructure (this is the design symmetry that makes the pair
  satisfying).
- New verbs: `timer list`, `timer cancel <id>`. List shows pending timers with
  eta + payload.
- Per-channel timer (default) or cross-channel via `--channels` flag.

**Open questions (heavier than `announce` alone):**

- **Durability across daemon restart.** Timers need persistence —
  `~/.grapevine/timers.jsonl` or similar. Restart should load and resume.
- **Fire-on-recovery semantics.** If a timer should have fired while the daemon
  was down, fire it immediately on startup, skip it, or warn? Probably
  fire-immediately with a "(delayed by Nm)" tag.
- **Scheduling primitive.** `setTimeout` is fine for short delays; hour+ delays
  want a periodic-check loop instead.
- **Cancellation by alias?** Can only the creator cancel, or anyone? Probably
  anyone — grapevine is symmetric and unauthenticated by design.

**Notes:**

- Timer + announce together form half of a "facilitation primitives" set. Other
  candidates in that family: agenda steps, rounds, voting. Worth considering
  whether to ship them as a coherent V1.X facilitation release, or land each on
  its own merits.

---

## Possible future families (not yet items)

Things that have been alluded to in conversation but aren't ideas yet, captured
here so they don't get lost as conversation context fades.

- **Facilitation primitives beyond timer:** structured agenda steps, rounds
  (each subscriber speaks once before next round), lightweight voting/polling
  primitives. Would form a coherent V1.X release if several converge.
- **Cross-machine reach:** the V1.5 limit "localhost only, no auth" is
  intentional, but if a real use case emerges (e.g. two humans on different
  machines sharing a grapevine), this would be a sizable spike — touches auth,
  networking, persistence assumptions.
- **Web push / mobile notification path:** the watch UI is great when you're at
  a desk; a "ping my phone when an announcement lands" path would extend
  grapevine to the "I stepped away" case. Probably out of scope philosophically
  but worth noting.
- **Channel transcripts / digest export:** a "give me a markdown summary of this
  channel" verb. Overlaps with the existing `digestify` toolbox skill; might be
  solved by composition rather than a new verb.

---

**Related Documents:**

- [V1.5 proposal](../grapevine/proposal.md) — original design + V2 candidates
- [V1.6 proposal](../grapevine-v1.6/proposal.md)
- [V1.7 proposal](../grapevine-v1.7/proposal.md) — current participation scope
- [Issue #129](https://github.com/ichabodcole/project-docs-scaffold-template/issues/129)
  — original feedback that motivated V1.6 + V1.7 direction
