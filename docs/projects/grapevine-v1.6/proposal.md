# Grapevine V1.6 — Triage Wins + Human Control Plane Direction

**Status:** Draft **Created:** 2026-05-27 **Author:** Cole

---

## Overview

V1.6 lands the small set of CLI/notification papercuts surfaced by the first
real two-agent session
([#129](https://github.com/ichabodcole/project-docs-scaffold-template/issues/129))
without introducing new design concepts. It's deliberately a "tighten what's
there" release.

Alongside the V1.6 scope, this proposal records the direction the human control
plane should grow in over V1.7+ — sending from the watch UI, named identity for
the human, lurk-vs-participate distinction, direct messages, archive — and
captures an emerging V2-spike idea (lurk-mode "emissary" agents) so the V1.6
scope can stay clean without losing the larger arc.

## Problem Statement

After the first heavy session (~50 messages, two channels, two agents), a small
set of friction points showed up that aren't about missing features so much as
**rough edges on existing ones**:

- Monitor-event bodies are truncated at ~500 chars, forcing a second `pull` on
  every long message. The full message is in the JSONL — just not in the
  notification.
- Synthesizing a thread requires scrolling because there's no `grep` over the
  log.
- `send` reports `subscribers:N` and it's ambiguous whether that count includes
  the sender.

Separately, the human's relationship to the channel is currently
write-only-from-terminal and read-only-from-browser. The watch UI is great for
observation, but when the human wants to participate — answer a question, nudge
direction, ping one agent specifically — they have to context-switch to a
terminal. As multi-agent sessions get denser, this gap grows.

## Proposed Solution

### V1.6 — Triage wins (scope of this proposal)

Three small, additive changes. No new concepts.

1. **Notification truncation hint.** When a message exceeds the notification
   window, the tail line ends with `(+N chars — pull to read)` so the two-step
   is _expected_ rather than surprising. Pure tail-output formatting; daemon
   stays the same.
2. **`grapevine grep <channel> <pattern>`** — scans the channel's JSONL with a
   regex and prints matching messages. Trivial to implement (the log _is_ a
   file), high value during synthesis passes.
3. **Disambiguate `subscribers` on send response.** Either rename the field to
   `recipients` (excluding sender) or split into `subscribers` (total presence)
   and `recipients` (would-receive-this-message). Resolve in the implementation
   plan — both shapes are cheap, the naming choice deserves one round of
   thinking.

That's V1.6.

### V1.7+ direction (future considerations, NOT in V1.6 scope)

The watch UI grows into a real control plane. Sketch, not committed:

- **Human joins the channel by name.** The browser session prompts for an alias
  on first load (`cole`, etc.) and persists it locally. Joining agents see a
  real participant, not "another subscriber."
- **Send messages from the watch UI.** Form posts to `/channels/:name/messages`
  on the existing daemon. Behaves identically to `send` from CLI.
- **Lurk vs. join.** The current browser session is implicitly lurk mode
  (anonymous consumer, no presence). Promote that to an explicit toggle: stay
  invisible, or join as a named participant. This dovetails with V1.6 #3 —
  `subscribers` includes lurkers, `recipients` doesn't.
- **Targeted/direct messages.** A way to address one agent specifically
  (`@flint: how's the migration looking?`) — surface design TBD, could be a
  `to:` field or a `kind:"direct"` client-sugar pattern.
- **Archive a channel.** Distinct from `close` (which deletes the JSONL).
  `archive` marks the channel read-only: existing messages stay readable,
  presence is empty, no new sends, channel name is locked out from re-`open`.
  Useful for both humans and agents — preserves context without keeping live
  surface around.

### V2 spike candidate — Emissary / lurk-mode agent

Captured for the record, not scoped here: an agent that joins in **invisible
lurk mode**, watches the conversation without registering presence or appearing
in `who`, and serves as the human's translator/analyzer/catch-up surface. Their
analysis would surface in the HTML plane somehow (side panel? dedicated emissary
channel rendered inline?). The human could then converse with the emissary
directly without injecting noise into the working channel.

This needs a real spike — open questions:

- Is the emissary fully invisible to other agents (different visibility class
  than current pull-mode lurkers) or just anonymous?
- Where does the emissary's analysis render? Sidecar panel? An overlay layer
  per-channel? A dedicated emissary-only channel?
- Is the emissary one-per-channel or one-per-session-spanning-channels?
- Does the human talk to the emissary _through_ the watch UI, or via a separate
  surface?

Capturing as a V2 candidate so the V1.7 control plane work doesn't accidentally
foreclose on it.

## Scope

**In Scope (V1.6):**

- Truncation hint in tail output
- `grapevine grep <channel> <pattern>` verb
- Disambiguate `subscribers` count on send response
- Updated tests covering the above
- SKILL.md updates for `grep` and the new send response shape
- Plugin version bump (toolbox: 2.1.0 → 2.2.0, minor for behavioral change)

**Out of Scope (deferred to V1.7+):**

- Sending from the watch UI
- Human-joins-as-named-participant
- Lurk vs participate toggle
- Direct/targeted messages
- Channel archive (vs. close/delete)
- Threading (`in_reply_to`) — flagged in #129, deferred to V1.7 alongside
  control plane work because rendering threading well needs the UI changes
- `kind:"correction"` client sugar — pairs with threading, defer together

**Out of Scope (V2 candidate):**

- Emissary / lurk-mode analyst agent (needs its own spike)

**Future Considerations:** See the V1.7+ and V2 sections above.

## Technical Approach

All three V1.6 changes are localized:

- **Truncation hint** lives in `cmdTail` formatting. The daemon's SSE payload
  already includes the full message; the CLI decides whether to append the hint.
  Threshold can be a constant tuned to the typical Monitor notification window
  (~500 chars per #129); pick conservatively.
- **`grep`** is a new CLI verb that reads the channel's JSONL directly (it
  doesn't need to hit the daemon — the log is the contract). Print matching
  lines with the same formatting as `pull` so existing readers transfer over.
- **Subscribers disambiguation** is a daemon change to the send response
  payload. Either rename a field or add a second one. Coordinate with the watch
  HTML if anything renders the field there (currently nothing does, I believe —
  verify).

No new dependencies. No new persistence paths. The JSONL contract is unchanged.

## Impact & Risks

**Benefits:** Removes the top three friction points reported by real users
(agents). Each is independently small; together they tighten the daily-use
experience meaningfully.

**Risks:**

- _Naming the recipients field._ If we pick the wrong name, we'll either break
  clients later or live with awkwardness. Mitigation: pick one shape in the
  plan, document it once, move on. Field consumers today are minimal.
- _Grep semantics drift._ Users might expect regex when we give substring, or
  vice versa. Mitigation: ship one mode, document it, leave room for a flag
  later.

**Complexity:** Low. All three are small, additive, well-bounded.

## Open Questions

_Resolved 2026-05-27 via grapevine consult with cherry + flint (the original
feedback authors). Their convergence was clean, recorded below._

- **Subscribers field shape** — **Keep `subscribers` (total presence), add
  `recipients` (excluding sender).** Backwards-compatible, two unambiguous
  fields beat one renamed-with-changed-semantics field, and `recipients:0`
  becomes a useful second void-warning signal (the existing warning only fires
  when nobody's subscribed at all).
- **Grep mode** — **Regex, case-insensitive default, with `--literal` / `-F`
  flag for substring** (matches `grep -F` convention). Bonus ask from flint: add
  `--from <alias>` to scope a grep to one speaker
  (`grep <channel> --from cherry "8\+3"`); include it in the V1.6 plan.
- **Truncation hint threshold** — Empirical data from the storyline-staleness
  session: status pings ~200–400 chars passed whole; multi-paragraph synthesis
  messages of 2–3.5kB got cut. Practical cap was ~500–800 chars. **Pick a
  threshold in the 500–800 range; the hint itself matters more than the exact
  number.** Cherry's suggestion: 800 ("generous enough that short messages don't
  trigger noise, tight enough that typical agent-to-agent messages do"). Stretch
  goal from flint: make the hint actionable from the tail line (a shortcut to
  pull the full body) if it's cheap.

### Additional triage signal

Flint, unprompted, flagged that the `kind:"correction"` / no-edit-or-redact item
from #129 is the one they'd deprioritize. Append-only with corrections landing
as new messages is "fine for an audit-trail tool." This reinforces the choice to
defer threading + correction to V1.7.

## Success Criteria

- Both V1.6 friction points called out in #129 (truncation, grep) feel resolved
  on the next multi-agent session.
- The `subscribers:N` ambiguity stops showing up in agent paper-cut feedback.
- V1.6 ships without expanding grapevine's conceptual surface.

---

**Related Documents:**

- [Grapevine V1.5 proposal](../grapevine/proposal.md) — original design + V2
  candidates
- [Issue #129](https://github.com/ichabodcole/project-docs-scaffold-template/issues/129)
  — session feedback source

---

## Notes

The triage that produced this scope split is in the conversation that generated
this proposal. The full feedback issue ranks seven items; V1.6 takes the top
three additive wins, V1.7 absorbs the items that need UI changes (threading,
correction, control plane), and V2 holds the emissary spike.
