# Grapevine V1.6 Implementation Plan

**Created:** 2026-05-27 **Related Proposal:** [proposal.md](./proposal.md)
**Status:** Draft

---

## Overview

V1.6 is three small, additive changes to the existing grapevine skill: a
truncation-hint on tail output, a `grep` verb, and a clean split between
`subscribers` (total presence) and `recipients` (excluding sender) on the
send-response payload. No new architectural concepts, no new persistence paths,
no daemon HTTP surface changes beyond a one-field addition.

The three changes are independent; we order them by where the surface change
lives (daemon → CLI verb → tail formatting) so test coverage stacks predictably.
End of phase 4 includes the scaffold-checklist wrap (plugin version bump,
SKILL.md updates, dist rebuild).

## Outcome & Success Criteria

**Definition of Done:**

- [ ] `POST /channels/:name/messages` response includes both `subscribers`
      (total count) and `recipients` (count excluding sender)
- [ ] `cmdSend` surfaces both fields in JSON output; void-warning fires when
      either count is meaningful (existing: `subscribers===0`; new:
      `recipients===0`)
- [ ] `bun cli.ts grep <channel> <pattern>` exists, defaults to case-insensitive
      regex, supports `--literal`/`-F` for substring mode and `--from <alias>`
      for per-speaker filtering
- [ ] `cmdTail` appends `(+N chars — pull to read)` to the JSONL line when
      message body exceeds the configured threshold (default 800 chars)
- [ ] All new behavior covered by tests in `cli.test.ts`; full suite green
- [ ] `SKILL.md` updated: new verb in the verbs table, new send response shape
      documented, truncation hint mentioned under tail
- [ ] `plugins/toolbox/.claude-plugin/plugin.json` version bumped 2.1.0 → 2.2.0
- [ ] `dist/` rebuilt via `scripts/build-skills-dist.sh`
- [ ] Prettier-formatted, single squash-merged commit on `develop`

**Non-Goals:**

- Sending from the watch UI (V1.7)
- Human-as-named-participant in the watch UI (V1.7)
- Threading / `in_reply_to` / `kind:"correction"` (deferred to V1.7)
- Channel archive vs. close (deferred to V1.7)
- Emissary/lurk-mode agents (V2 spike)
- Making the truncation hint clickable/actionable from tail (flint's stretch;
  defer — requires Monitor-side coordination)

## Approach Summary

Existing code shape (read in plan prep):

- `plugins/toolbox/skills/grapevine/scripts/daemon.ts` — Bun broker. POST
  `/messages` handler at lines ~365–388 returns
  `{...m, subscribers, subscriber_aliases}`. This is the single point where the
  response shape changes.
- `plugins/toolbox/skills/grapevine/scripts/cli.ts` — `cmdSend` (lines 144–173),
  `cmdTail` (lines 240–344), `parseFlags` (lines 409–435), `main` command switch
  (lines 437–541). All three V1.6 changes touch this file.
- `plugins/toolbox/skills/grapevine/scripts/cli.test.ts` — 22 existing
  integration tests using Bun's test runner and live daemon. New tests follow
  the same pattern (spawn cli.ts, parse JSON output, assert).
- Channel logs live at `~/.grapevine/channels/<name>.jsonl` (one JSON message
  per line). `grep` reads these directly — no daemon round-trip needed.

Path from current state → done: change the daemon response first so the
`recipients` field exists, update `cmdSend` to surface it, then add the `grep`
verb (standalone, doesn't touch daemon), then format truncation hints in
`cmdTail`. Wrap with docs + scaffold checklist.

## Phases

### Phase 1: `subscribers` / `recipients` split

**Goal:** The send response distinguishes "total presence" from "who'll receive
this message," and the void-warning surfaces `recipients:0` as a second-level
signal.

**Key Changes:**

- `daemon.ts` POST `/messages` handler: compute `recipients` as
  `subscriber_aliases.filter(a => a !== body.from).length` and include both
  `subscribers` and `recipients` in the response.
- `cli.ts cmdSend`: include both fields in the output object; expand the
  void-warning logic so `warning: "channel has no subscribers"` still fires when
  `subscribers===0`, and add `warning: "no recipients besides you"` (or similar
  — settle wording in implementation) when `subscribers>0` but `recipients===0`.
- `cli.test.ts`: new test asserting both fields appear; new test asserting the
  second-level void warning fires when only the sender is subscribed.
- Update the `send --verbose` test if it asserts the exact response shape.

**Implementation order (TDD):**

1. Add failing test: "send response includes both subscribers and recipients."
2. Update daemon handler; run test → green.
3. Add failing test: "void warning fires when sender is only subscriber."
4. Update `cmdSend` warning logic; run test → green.
5. Run full suite; commit.

**Validation:**

- [ ] New tests pass
- [ ] Existing 22 tests still pass (none should regress on the response shape —
      only `send --verbose` test might need a trivial update)
- [ ] Manual: open a channel, `tail --as a`, `send --from b` → response shows
      `subscribers:1, recipients:1`. Then `tail --as a` stays, `send --from a` →
      `subscribers:1, recipients:0` + new warning.

**Dependencies:** None.

---

### Phase 2: `grapevine grep <channel> <pattern>` verb

**Goal:** Synthesis-time recall. Read the channel JSONL directly, filter by
pattern (and optionally by sender), print matches as JSONL.

**Key Changes:**

- `cli.ts`: new `cmdGrep(name, pattern, opts)`. Reads
  `~/.grapevine/channels/<name>.jsonl` line-by-line, parses each as JSON,
  applies the regex (or substring) to `.text`, optionally filters by
  `.from === opts.from`, prints matching messages as JSONL on stdout.
- Default: case-insensitive regex. `--literal` (or `-F`) switches to substring
  (`pattern` becomes a `.text.includes(pattern)` check, also case-insensitive).
  `--from <alias>` adds the speaker filter.
- Add `grep` to the command switch in `main()`, the help text, and
  `BOOLEAN_FLAGS` (for `--literal`).
- `cli.test.ts`: tests for regex match, substring (`--literal`), `--from`
  filter, no-matches (empty messages array), missing channel (no log file →
  error message), invalid regex (graceful error).

**Implementation order (TDD):**

1. Failing test: "grep returns regex-matched messages."
2. Implement `cmdGrep` (regex-only first); run test → green.
3. Failing test: "grep --literal does substring match."
4. Add `--literal` branch; test → green.
5. Failing test: "grep --from filters by sender."
6. Add `--from` filter; test → green.
7. Failing test: "grep handles missing channel gracefully."
8. Add file-not-found handling; test → green.
9. Run full suite; commit.

**Validation:**

- [ ] All grep tests pass
- [ ] Manual: open a channel, send 5+ messages from two aliases, run
      `grep <channel> "<word>" --from <alias>` → only matching messages from
      that alias appear.

**Dependencies:** None (independent of Phase 1).

**Design notes:**

- `grep` reads the JSONL directly rather than hitting the daemon — the log is
  the contract, and this keeps the daemon free of search responsibility.
- Match against `.text` only (not `.from`, `.kind`, etc.). Filtering by speaker
  is a separate flag.
- Regex flag: `i` (case-insensitive) by default. Don't add `g` — we want a
  per-line presence check.

---

### Phase 3: Truncation hint on `tail` output

**Goal:** When a message body exceeds the Monitor notification window, the tail
line itself signals "there's more here, pull to read it." No daemon change; pure
CLI formatting.

**Key Changes:**

- `cli.ts cmdTail`: where the message JSON is written to stdout (line 334),
  check `payload.text.length > THRESHOLD`. If so, augment the printed object
  with a `_truncated_hint: "+N chars — pull to read"` field, OR (preferred, to
  be settled in implementation) print the JSONL line as-is followed by a comment
  line `# +N chars beyond notification window, pull to read`. Final shape
  settled in step 1 of the phase.
- Threshold: a module-level constant `TRUNCATION_HINT_THRESHOLD = 800`. Settable
  via `GRAPEVINE_TRUNCATION_HINT_THRESHOLD` env var for tuning without code
  changes.
- `cli.test.ts`: tests for short message (no hint), long message (hint appears
  with correct char count), threshold-edge cases.

**Implementation order (TDD):**

1. Settle the hint output shape — adding a sidecar field to the JSON object
   keeps tail output machine-readable. Pick one, document in the test.
2. Failing test: "tail emits truncation hint for long messages."
3. Implement threshold check + hint emission; test → green.
4. Failing test: "tail does not emit hint for short messages."
5. Verify with no-hint case; test → green.
6. Failing test (optional, low value): "threshold env var overrides default."
7. Add env var read; test → green.
8. Run full suite; commit.

**Validation:**

- [ ] All truncation-hint tests pass
- [ ] Manual: subscribe via `tail --as observer`, send a short message (~100
      chars) → no hint; send a long message (~1500 chars) → hint present with
      accurate `N`.
- [ ] Pipe-friendliness: `tail | jq` still works (i.e., hint stays
      machine-parseable if we go the sidecar-field route).

**Dependencies:** None (independent of Phases 1–2). Order in implementation is
last because the field name from Phase 1 (`recipients`) is harder to revisit
once tests exist; doing it last gives the smallest blast radius if we revisit.

---

### Phase 4: Documentation, version bump, dist rebuild

**Goal:** Skill is publishable.

**Key Changes:**

- `plugins/toolbox/skills/grapevine/SKILL.md`:
  - Add `grep` row to the verbs table (between `who` and `topic` is fine).
  - Note the new send-response shape in the Message Shape / verbs descriptions
    where the field appears.
  - Add a one-line note under the `tail` description about the truncation hint.
- `plugins/toolbox/.claude-plugin/plugin.json`: bump version 2.1.0 → 2.2.0
  (minor — new verb, new response field, both behavioral changes).
- Run `scripts/build-skills-dist.sh` to rebuild `dist/toolbox/...`.
- Run `npx prettier --write` on the touched files.
- Commit the docs + version + dist as one final commit (per project's
  scaffold-checklist convention).

**Validation:**

- [ ] `grep -R "grep" plugins/toolbox/skills/grapevine/SKILL.md` shows the new
      entry.
- [ ] `plugin.json` version is `2.2.0`.
- [ ] `dist/toolbox/skills/grapevine/SKILL.md` matches the source.
- [ ] `bun test plugins/toolbox/skills/grapevine/scripts/cli.test.ts` still
      green.

**Dependencies:** Phases 1–3 complete.

---

## Key Risks & Mitigations

- **Tail hint shape (JSON sidecar vs. comment line).** A sidecar field preserves
  machine-readability for jq pipelines; a comment line is invisible to jq but
  easier to scan visually. **Mitigation:** Settle in Phase 3 step 1. Default to
  the sidecar field unless a strong reason emerges — pipe-friendliness is what
  made grapevine usable from any runtime.
- **Existing `send --verbose` test asserts response shape.** Adding `recipients`
  to the response will surface here. **Mitigation:** Update that test as part of
  Phase 1. It's a single assertion.
- **Threshold of 800 chars is empirical, not measured.** It's a defensible guess
  from the cherry/flint session, not a hard fact about the Monitor window.
  **Mitigation:** Env-var override so anyone can tune without re-releasing.
  Document the override in SKILL.md.
- **`grep` against a not-yet-loaded channel.** If a channel's JSONL exists on
  disk but hasn't been loaded into the daemon, `grep` still works (reads disk
  directly). If the JSONL doesn't exist at all (typo'd channel), return an empty
  messages array with a clear error message — don't crash.

## Testing & Validation Strategy

- **Unit/integration:** Extend `cli.test.ts` with ~6–8 new test cases, one per
  scenario above. Existing test pattern (spawn cli.ts, parse JSON, assert)
  carries over cleanly.
- **Manual smoke:** After all three phases, run a quick 2-terminal session: one
  tail with `--as`, one send long+short messages. Verify both response fields,
  both warnings, hint shape, and `grep` over the resulting log.
- **No new dependencies, no daemon protocol changes** beyond one additional
  response field, so the existing skill consumers (cherry, flint, watch UI) keep
  working without modification.

## Assumptions & Constraints

**Assumptions:**

- The `~/.grapevine/channels/<name>.jsonl` path remains stable; `grep` reads it
  directly.
- Monitor's notification truncation cap is roughly in the 500–800 char range
  (cherry/flint empirical data); 800 is a safe trigger threshold.
- Existing consumers of the send response (cli, tests, possibly the watch HTML)
  tolerate an _added_ field; they read by name, not by exact-shape assertion.

**Constraints:**

- Keep V1.6 strictly to these three changes. Threading, archive, watch-UI send,
  etc. all belong to V1.7 — resist scope creep.
- Don't break the JSONL contract: a `grep` consumer must be able to read the
  same file the daemon writes.

## Open Questions

- **Truncation-hint shape.** Sidecar field on the JSON object, or comment-line
  beside the JSONL? Settle in Phase 3 step 1. Recommendation: sidecar field,
  preserves jq compatibility.
- **Second-level void warning wording.** Phase 1 needs final wording —
  `"no recipients besides you"` is one option; `"only you are subscribed"` is
  another. Pick during implementation.
- **`grep --literal` flag name.** `--literal` and `-F` both make sense; shipping
  both as aliases is cheap. Default to `--literal` in docs.

---

**Related Documents:**

- [Proposal](./proposal.md)
- [V1.5 proposal](../grapevine/proposal.md)
- [Feedback issue #129](https://github.com/ichabodcole/project-docs-scaffold-template/issues/129)

---

## Implementation Notes

The cherry/flint consult that resolved the proposal's open questions is recorded
inline in `proposal.md`'s Open Questions section. Their suggested 800-char
threshold and `--from <alias>` flag for grep are baked into this plan. flint's
stretch ask (clickable/actionable hint from the tail line) is explicitly
deferred — it requires Monitor-side coordination and doesn't belong in V1.6's
"tighten what's there" scope.
