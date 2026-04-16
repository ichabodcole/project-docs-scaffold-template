# MCP OAuth Remote Connector (Claude Desktop) Playbook

**Created:** 2026-04-16 **Last Updated:** 2026-04-16 **Status:** Active

---

## Context

This playbook captures the end-to-end diagnosis and fix for a specific failure
mode: **a fully spec-compliant MCP server that works from Claude Code but fails
from Claude Desktop's "custom connector" (remote MCP) with "Couldn't reach the
MCP server."**

The failure is not a network issue, a TLS issue, or a WWW-Authenticate issue.
It's an OAuth Dynamic Client Registration (DCR) mismatch between what
`claude.ai`'s backend sends and what most OAuth-provider libraries accept by
default. When this mismatch lands, the connector aborts silently between DCR and
the authorize step. No server-side error surfaces to the user, only the generic
"Couldn't reach" message.

This playbook is worth codifying because:

- Multiple GitHub issues across `anthropic/claude-code` and
  `anthropic/claude-ai-mcp` describe this exact symptom without a published fix
- The server-side error (when logged) is unambiguous, but surfacing it requires
  instrumentation the default setup doesn't provide
- The fix is a ~30-line request-body rewrite, provided you know where to apply
  it
- The adjacent gotchas (userinfo scope requirements, JWT vs. opaque tokens,
  path-scoped discovery) are easy to be misled by — this playbook names each one
  explicitly

## Applicability

**Use this playbook when:**

- You have an MCP server that Claude Code (CLI) connects to successfully
- The same server fails with "Couldn't reach the MCP server" from Claude
  Desktop's custom connector
- You control the OAuth authorization server (you can modify DCR behavior, not
  just configure it)
- Your OAuth implementation uses BetterAuth's `@better-auth/oauth-provider`, or
  any library with a similar "confidential clients must authenticate DCR" check
- Your error reference from Claude Desktop looks like `ofid_<hex>`

**Don't use this playbook when:**

- You're using a hosted auth provider (Auth0, WorkOS, Clerk) — the fix must
  happen on the path between Claude.ai and your token issuer, which you may not
  control
- Your symptom is "infinite about:blank loop" (different bug, Claude Desktop
  aborting before any server contact — usually an issue on Anthropic's side,
  worth filing but not fixable by you)
- Claude Code also fails — then the issue is broader than this playbook covers

## Prerequisites

- An OAuth 2.1 authorization server with Dynamic Client Registration enabled
  (RFC 7591)
- Ability to intercept requests to `/oauth2/register` (or equivalent) before
  your OAuth library sees them
- Scoped access logging on your OAuth surfaces — without it, you'll be
  diagnosing blind
- A `/.well-known/oauth-protected-resource` and
  `/.well-known/oauth-authorization-server` that both return 200
- The MCP endpoint returns 401 with a
  `WWW-Authenticate: Bearer resource_metadata=...` header when unauthenticated

## Approach Summary

**Key Principles:**

- **Diagnose with logs, not speculation.** The symptoms are generic; the
  server-side evidence is specific. Trust the access log, not your hypotheses.
- **Walk the OAuth dance one step at a time.** Discovery → DCR → authorize →
  consent → token → authenticated MCP. Find the first step that's missing;
  that's where the break is.
- **Fix the smallest thing.** The actual blocker is typically one endpoint's
  response, not the whole auth architecture.

**Overall Strategy:**

1. Enable scoped access logging on MCP/OAuth paths
2. Trigger the Desktop connect attempt
3. Identify the first step in the OAuth dance that doesn't appear in logs
4. Inspect the last request that _did_ land — its body, headers, and your
   response
5. Apply a targeted fix at that exact boundary
6. Gate the logging behind an env var so it stays available for the next time

## Steps / Phases

### Phase 1: Instrument

**Goal:** Make the server-side evidence visible. Nothing else matters until you
can see what `claude.ai`'s backend and Desktop are actually doing.

**Actions:**

1. Add an `onRequest` access logger scoped to these paths only (so production
   stdout stays readable):
   - `/api/mcp`
   - `/.well-known/*`
   - `/api/auth/oauth2/*` (or wherever DCR/authorize/token live)
   - `/api/auth/jwks`
   - `/oauth/*` (your consent/login pages)

2. For each logged request, capture: method, path + query, presence of
   `Authorization` header, user-agent.

3. For `POST /api/auth/oauth2/register` specifically, **clone the request and
   log the JSON body** (up to ~500 chars). This is the single most important
   line of evidence.

4. Add an `onAfterResponse` hook that logs status codes for the same paths. Be
   aware that `set.status` may reflect the handler's default (200) rather than
   the actual response status when the handler returns a
   `new Response(..., { status: X })` directly — treat these as approximate.

5. Gate all of the above behind an env var (default off) so you're not spewing
   this into production logs permanently.

**Validation:**

- [ ] Trigger a request from Claude Code (known-working). Confirm you see the
      full sequence: 401 `/api/mcp`, discovery, DCR, authorize, token,
      authenticated `/api/mcp`.
- [ ] Trigger a request from MCP Inspector. Same sequence should appear.
- [ ] No access logs from other surfaces (sync, AI, health) — noise is the
      enemy.

### Phase 2: Trigger and capture

**Goal:** Get a clean log window covering one Desktop attempt. Everything else
is derived from this.

**Actions:**

1. Enable the logging env var and restart the server.
2. In Claude Desktop: Settings → Connectors → "Add custom connector" → enter
   your MCP URL → click Add.
3. Note the `ofid_<hex>` reference Desktop displays on failure. This is
   Anthropic's internal trace ID; you can include it in support tickets but
   can't decode it yourself.
4. Save the server logs for the ~30-second window around the attempt.

**Validation:**

- [ ] You see `python-httpx/<ver>` user-agent entries — these are `claude.ai`'s
      backend making server-to-server calls.
- [ ] You see a `Mozilla/...` or `Claude-User` user-agent — these are the
      browser and Desktop app respectively.
- [ ] The log sequence stops at some identifiable step (or never starts).

### Phase 3: Identify the first missing step

**Goal:** The OAuth flow has a well-defined order. Find the first expected step
that's absent, and the last present step is where the break is.

**Expected order from `claude.ai` / Desktop:**

```
1. POST /api/mcp             (unauthenticated probe, expected 401)
2. GET  /.well-known/oauth-protected-resource
3. GET  /.well-known/oauth-authorization-server
4. POST /api/auth/oauth2/register          (DCR)
5. GET  /api/auth/oauth2/authorize?...     (browser redirect lands here)
6. GET  /oauth/consent (or your equivalent)
7. redirect to client callback with code
8. POST /api/auth/oauth2/token             (code exchange)
9. POST /api/mcp   with Authorization: Bearer ...
```

**Triage table:**

| First missing step                          | Likely cause                                                                                                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step 1 not even attempted                   | Anthropic-side bug, network issue, or TLS validation failure. Check `modelcontextprotocol/claude-code#11814` / `#5826` for similar reports. Often not fixable server-side. |
| Steps 2–3 missing after 401                 | Your `WWW-Authenticate` header is malformed, or the discovery URLs return non-200.                                                                                         |
| Step 4 missing after discovery              | `authorization_servers` or `resource` in your PRM response is unparseable, or DCR endpoint 404s.                                                                           |
| **Step 5 missing after DCR**                | **Most common. DCR returned a non-2xx or a response Claude's backend rejects.** Go to Phase 4.                                                                             |
| Step 8 missing after authorize              | Authorization code issuance failed, or redirect URI didn't match.                                                                                                          |
| Step 9 has `Authorization` but `user: null` | Token validation problem on your side. See the "JWT / userinfo" gotcha below.                                                                                              |

### Phase 4: Fix DCR — the actual root cause for Claude Desktop

**Goal:** The DCR endpoint must accept Claude Desktop's specific request shape.

**The exact request Claude Desktop sends:**

```json
{
  "redirect_uris": ["https://claude.ai/api/mcp/auth_callback"],
  "token_endpoint_auth_method": "client_secret_post",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "openid profile email offline_access",
  "client_name": "Claude"
}
```

**What's wrong with it (from a BetterAuth perspective):**

- `token_endpoint_auth_method: "client_secret_post"` declares a confidential
  client
- The request is not authenticated (no session cookie, no bearer)
- BetterAuth's `@better-auth/oauth-provider` at `dist/index.mjs:1336` hardcodes:
  _"if not a session and not `token_endpoint_auth_method === 'none'`, return 401
  `Authentication required for confidential client registration`"_
- There is **no config option** to relax this check

Claude.ai's backend silently gives up when DCR returns a non-2xx, so the user
sees nothing but "Couldn't reach."

**The fix: request-body rewrite**

Register a route for `POST /api/auth/oauth2/register` **before** the mounted
OAuth handler. Read the JSON body, coerce any confidential
`token_endpoint_auth_method` to `"none"`, and forward the modified request to
the OAuth handler.

```typescript
// routes/oauth/register-intercept.ts
export function coerceConfidentialDcrToPublic(body: string): string {
  if (!body) return body;
  let parsed: { token_endpoint_auth_method?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    return body;
  }
  const method = parsed.token_endpoint_auth_method;
  if (!method || method === "none") return body;
  return JSON.stringify({ ...parsed, token_endpoint_auth_method: "none" });
}

export const dcrInterceptRoute = new Elysia().post(
  "/api/auth/oauth2/register",
  async ({ request }) => {
    const original = await request.text();
    const rewritten = coerceConfidentialDcrToPublic(original);
    const headers = new Headers(request.headers);
    headers.delete("content-length"); // let Fetch recompute
    return auth.handler(
      new Request(request.url, { method: "POST", headers, body: rewritten })
    );
  }
);
```

Wire it in before `.mount(auth.handler)` — route specificity beats mount prefix.

**Why this is safe**:

- MCP's own spec (2025-06-18 §3.3) requires PKCE. A confidential client sending
  a secret from a browser is a _weaker_ posture than a public PKCE client, so
  coercing to public is a tightening, not a loosening.
- Public clients using PKCE + `authorization_code` + `refresh_token` grant types
  (which Claude requests) is the OAuth 2.1 recommended pattern for
  native/desktop apps.
- The only clients that would legitimately send `client_secret_post` to DCR
  without auth are old or misconfigured — rejecting them is the server's choice,
  but coercing them to PKCE gets them working without weakening security.

**Validation:**

- [ ] `curl -X POST …/api/auth/oauth2/register -d '{"token_endpoint_auth_method":"client_secret_post", …}'`
      returns **200** with `"public": true` and
      `"token_endpoint_auth_method": "none"` in the response body.
- [ ] The logs show a `[dcr-rewrite]` or equivalent line on each such coercion.
- [ ] Retrying Desktop now produces the full sequence through step 9.

### Phase 5: Verify end-to-end, then harden

**Goal:** Confirm all three MCP client types keep working, then remove temporary
diagnostic surface.

**Actions:**

1. Trigger a fresh Claude Desktop "Add custom connector." Expect: authorize →
   consent → token → authenticated `/api/mcp`.
2. Trigger a fresh `claude mcp add --transport http …` from Claude Code. Expect:
   same flow.
3. Trigger MCP Inspector connect. Expect: same flow.
4. Confirm sign-in to your desktop/mobile app still works (nothing in the DCR
   path should affect app sign-in, but test anyway).
5. Leave the DCR intercept in place permanently.
6. Gate the access logging behind an env var (default off). You want it
   available next time, not running in production.

**Validation:**

- [ ] All three clients connect and can call MCP tools.
- [ ] App sign-in still works.
- [ ] Production logs are quiet unless the env var is set.

## Risks & Gotchas

### Gotcha 1: `/oauth2/userinfo` requires `openid` scope

- **Symptom:**
  `[session] OAuth userinfo failed: 400 {"error_description":"Missing required scope","error":"invalid_scope"}`
  in logs. Downstream: authenticated requests arriving at your resource endpoint
  with `user: null`.
- **Root cause:** BetterAuth's userinfo endpoint (`dist/index.mjs:460`) requires
  the access token to carry `openid`. MCP clients are not required to request
  `openid`. If your resource server resolves users exclusively via userinfo, any
  non-`openid` token looks like a bad token.
- **Mitigation:** Don't resolve users via userinfo as your only path. Either:
  - Verify the JWT directly using the authorization server's JWKS
    (`/api/auth/jwks`), asserting `iss` and `aud`. This has no scope requirement
    and is the standard OAuth 2.0 resource-server pattern.
  - Or keep userinfo but accept that it only works for tokens with `openid`, and
    ensure your clients always request it.
- **Note:** For _this specific Claude Desktop bug_ (the Phase 4 DCR fix),
  Claude's request includes `scope: "openid profile email offline_access"`, so
  its tokens _do_ have `openid` and userinfo works. But a future Claude Desktop
  version (or any other MCP client) might drop `openid`, so the JWKS path is a
  good long-term architecture.

### Gotcha 2: BetterAuth access tokens are JWTs when audience is configured

- **Symptom:** DB lookups in `oauth_access_token` turn up nothing for tokens
  Claude is presenting. Token-introspection-based approaches silently fail.
- **Root cause:** `@better-auth/oauth-provider` signs access tokens as JWTs
  whenever `validAudiences` is configured and the JWT plugin is enabled
  (`dist/index.mjs:862`). These JWTs are _not_ stored in the
  `oauth_access_token` table. Only opaque tokens (issued when no audience
  matches) are stored.
- **Mitigation:** Validate tokens via JWKS signature verification, not DB
  lookup. Keep an opaque-token fallback (DB lookup or userinfo) only if you have
  clients that request tokens without a `resource` parameter.

### Gotcha 3: MCP 2025-06-18 path-scoped discovery

- **Symptom:** A newer or stricter MCP client logs "couldn't resolve
  authorization server" despite your root `/.well-known/*` returning 200.
- **Root cause:** MCP 2025-06-18 / RFC 9728 §3.1 / RFC 8414 §3.1 prefer
  path-scoped discovery: `/.well-known/oauth-protected-resource/<resource-path>`
  and `/.well-known/oauth-authorization-server/<resource-path>`. Some clients
  (not Claude Desktop's current connector as of April 2026) construct these URLs
  from the resource path and never follow the `WWW-Authenticate` header.
- **Mitigation:** Mount your PRM and AS metadata handlers at both the root and
  the path-scoped variants. Response body is identical.
- **Note:** This was not the Claude Desktop fix — Claude's connector follows
  `WWW-Authenticate` and uses the root URLs — but it's cheap protection against
  stricter future clients.

### Gotcha 4: The `ofid_` error reference is opaque to you

- **Symptom:** Desktop shows "Couldn't reach the MCP server. Share this
  reference: `ofid_<hex>`."
- **Root cause:** This is Anthropic's internal trace ID. It's meaningful only to
  their support team. Do not try to decode it.
- **Mitigation:** Include it verbatim in any GitHub issue or support ticket.
  Correlate it with your own server logs by timestamp.

### Gotcha 5: The `Authorization`-less `POST /api/mcp` at the start is normal

- **Symptom:** A `[mcp] POST /api/mcp — user: null` fires before any OAuth
  traffic. Tempting to interpret as "Desktop failed to authenticate."
- **Root cause:** The MCP spec requires the resource server to return 401 with
  `WWW-Authenticate` to _initiate_ OAuth discovery. Clients deliberately probe
  unauthenticated first. This is the trigger that starts the flow, not a
  failure.
- **Mitigation:** Ignore the initial unauthenticated `/api/mcp`. Look at the
  requests _after_ it.

### Gotcha 6: `Claude-User`, `python-httpx`, and browser UA are three different actors

- **Claude-User**: the Desktop app itself, talking to `/api/mcp` with a bearer
  token.
- **python-httpx/0.x**: `claude.ai`'s server-to-server backend — does the probe,
  discovery, DCR, and token exchange.
- **Mozilla/... AppleWebKit**: the user's browser — handles the authorize and
  consent redirects.

If you grep for a single user-agent in logs, you'll see an incomplete picture.

### Gotcha 7: Desktop uses root `/.well-known/*`, not path-scoped

- **Symptom:** You add path-scoped discovery URLs and Desktop still fails.
- **Root cause:** Desktop reads your
  `WWW-Authenticate: Bearer resource_metadata="…"` header and follows that URL
  exactly. Path-scoped discovery is for clients that don't honor the hint.
- **Mitigation:** Don't expect path-scoped discovery to unblock Desktop
  specifically. It's future-proofing, not a fix.

## Validation & Acceptance

**Acceptance criteria:**

- [ ] Unauthenticated
      `curl -X POST https://<host>/api/auth/oauth2/register -d '{"token_endpoint_auth_method":"client_secret_post", …}'`
      returns 200.
- [ ] Claude Desktop "Add custom connector" completes the full OAuth dance and
      lands in a state where tool calls succeed.
- [ ] Claude Code `claude mcp add --transport http <url>` still works.
- [ ] MCP Inspector still works.
- [ ] App sign-in (cookie-based) still works.
- [ ] Production logs are not flooded — access logging is env-gated and
      default-off.

**Testing:**

- Manual: trigger each of the three clients from scratch, with cleared local
  state where possible.
- Automated: unit-test the DCR body rewrite in isolation (pure function). The
  rest is integration and is best tested by reproduction.

## Examples

### Example 1: Operator Editor API (2026-04-16)

**Context:** Claude Desktop custom connector consistently failed with "Couldn't
reach the MCP server" against `https://api.operator-editor.com/api/mcp`. Claude
Code and MCP Inspector worked fine. API: Bun + Elysia + BetterAuth with
`@better-auth/oauth-provider`.

**Diagnosis path:**

- Initial hypothesis: path-scoped `/.well-known/*` URLs (based on GitHub issue
  thread). Added them — harmless, didn't help.
- Second hypothesis: userinfo openid requirement (based on `invalid_scope`
  logs). Rewrote session middleware to use JWKS — a genuine architectural
  improvement, but turned out to be orthogonal.
- Third hypothesis (correct): DCR response status. Added request-body logging,
  saw `"token_endpoint_auth_method":"client_secret_post"` in Claude's DCR.
  Manually replayed the same request: 400 "Authentication required for
  confidential client registration."
- Fix: DCR intercept that rewrites the auth method to `none`.

**Outcome:** Full OAuth dance completed on the first retry after deploying the
intercept. Total commits that landed on `develop`:

- `acac28d` — path-scoped well-known URLs (not needed for Desktop; kept for
  future-proofing)
- `650d208` + `54cf9f6` — JWKS validation + userinfo fallback (better
  architecture; not needed to unblock Desktop specifically since Claude requests
  `openid`)
- **`2c953bc`** — DCR intercept (the actual fix)
- `ed30002` + `1eb36ae` — diagnostic logging (tooling that made the diagnosis
  possible)
- `5528a6a` — env gate on the logging (cleanup)

**Lessons:**

- Without the access logger, we'd have been guessing for hours. The `[req-body]`
  log of the DCR payload was the decisive piece of evidence — add it first, not
  last.
- "Reported symptoms match issue X" is a lead, not a diagnosis. The path-scoped
  URLs and the userinfo openid requirement were real issues discussed in the
  community, but neither was _this_ server's blocker. Always verify with your
  own evidence.
- Be willing to ship cleanup commits after the fact. The JWKS rewrite wasn't
  strictly necessary but is a better architecture; it earned its keep
  independent of the fix. The regression it caused (opaque tokens breaking
  sign-in) was caught and repaired the same day.

**Reference:** `docs/playbooks/mcp-oauth-remote-connector-playbook.md` (this
file). Commits on `develop` range `acac28d..5528a6a`.

## Why this was hard to find

This bug has been reported repeatedly across multiple GitHub issues and across
many OAuth-provider libraries. Before fixing it, it's worth being explicit about
why a careful reader of the relevant docs would **not** have caught it in
advance — so future-you doesn't spend the first two hours of the next bug
assuming you just didn't read carefully enough.

### The bug lives at the intersection of three things, and nobody documents interactions

1. **BetterAuth's `@better-auth/oauth-provider`.** Their option
   `allowUnauthenticatedClientRegistration: true` reads as "enable
   unauthenticated DCR." In practice it enables _public_ unauthenticated DCR
   only; confidential registrations (`token_endpoint_auth_method` ≠ `"none"`)
   are still hardcoded to require a session, with no config flag to relax the
   check. The asymmetry is not prominent in the library docs and surfaces only
   at runtime as a 401.

2. **Claude Desktop's remote MCP connector.** The exact DCR payload
   (`token_endpoint_auth_method: "client_secret_post"`, specific
   `redirect_uris`, specific `scope`) is not publicly documented. That's
   defensible from Anthropic's side — documenting an exact request shape creates
   a compatibility cage — but it means you can only learn it by capturing the
   real request.

3. **OAuth 2.1 / MCP 2025-06-18 specs.** They say MCP clients MUST use PKCE and
   SHOULD be public. They _don't_ say "your server MUST reject
   `client_secret_post`" _or_ "your server MUST accept it." Server policy is
   left implicit. A careful reader can correctly conclude the Claude client is
   violating best practice, but that conclusion doesn't unstick the connector.

No single document in the set above describes the interaction. The playbook
above is roughly the document that should have existed.

### The surfaced failure mode is designed to obscure

- **"Couldn't reach the MCP server"** is the error Claude Desktop shows for
  _any_ failure in the connector pipeline — DNS, TLS, discovery, DCR, token
  exchange. The word "reach" misdirects you to network diagnosis when the actual
  fault is protocol-level.
- **claude.ai's backend aborts silently on non-2xx DCR.** It doesn't log the
  server's error body anywhere you can see, doesn't pass it to Desktop, doesn't
  retry with alternate parameters. If the backend simply echoed the 400 body
  ("Authentication required for confidential client registration") through to
  the user, the fix would take minutes.
- **The `ofid_<hex>` reference is an Anthropic-internal trace ID.** You can file
  a support ticket with it, but you can't correlate it to anything yourself.

### Real-but-wrong leads

Several search results and community GitHub issues describe plausible root
causes that are **not** the same bug we hit:

- **Path-scoped `/.well-known/*`** — a real MCP 2025-06-18 spec requirement,
  cited in several issue threads, and adopted by MCP Inspector. Claude Desktop's
  connector honors `WWW-Authenticate` instead and uses the root URLs, so
  path-scoped discovery is future-proofing rather than a fix.
- **`invalid_scope` from userinfo** — a real BetterAuth behavior that affects
  MCP clients which don't request `openid`. Claude's DCR _does_ request
  `openid`, so tokens have it, so this path isn't the Desktop blocker.
- **WAF / Anthropic IP allowlisting** — reportedly fixed other people's bugs
  (see the #5826 thread). Not the issue here; VPS with no WAF.

Each of these is a legitimate failure mode — just not this one. "My symptoms
match issue X" is a lead, not a diagnosis.

### The fix lives at an unusual layer

"Intercept the incoming DCR request and rewrite the JSON body before forwarding
to the mounted OAuth handler" is not a standard OAuth-provider configuration
operation. There is no flag to flip; the fix is a ~30-line interceptor. If you
are looking for a documented "accept confidential DCR without auth" switch
(which is what a reasonable search would try), you'll never find one — because
it doesn't exist, and shouldn't.

### What would have caught it sooner

**Instrumentation beats documentation.** Specifically, a single log line of the
DCR request body, in production, is the decisive piece of evidence. The
diagnostic sequence that maps directly to this bug:

1. Request/response access log → shows DCR attempt and missing authorize attempt
2. Request **body** log on DCR → shows
   `"token_endpoint_auth_method": "client_secret_post"`
3. Replay that exact request in `curl` → shows the 400 + specific error
4. `grep "Authentication required for confidential"` in
   `node_modules/@better-auth/oauth-provider/` → shows the hardcoded check
5. Fix is now obvious

Five steps. Maybe 20 minutes with the right instrumentation. The playbook above
codifies this sequence so the next person does steps 1–2 **first** and skips the
detours.

### Meta-lesson

When a bug lives at the intersection of two libraries and a product
(BetterAuth + Claude Desktop + OAuth 2.1), **no single doc will document the
interaction**. The more authors involved, the less likely anyone documented it —
each author implicitly assumed the others would. Reading documentation can tell
you what each component does _alone_; it rarely tells you how they compose. For
intersection bugs, targeted instrumentation plus the ability to replay one
request in `curl` outperforms research by a wide margin.

## Related Patterns

- [api-mcp-server-playbook.md](./api-mcp-server-playbook.md) — original MCP
  server scaffolding for this repo
- [RFC 7591 – OAuth 2.0 Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
- [RFC 8414 – OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
- [RFC 9728 – OAuth 2.0 Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [MCP Authorization spec (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- [anthropics/claude-code#5826 — canonical tracking issue for this class of bug](https://github.com/anthropics/claude-code/issues/5826)
- [anthropics/claude-ai-mcp#143](https://github.com/anthropics/claude-ai-mcp/issues/143)
- [anthropics/claude-ai-mcp#158](https://github.com/anthropics/claude-ai-mcp/issues/158)

---

## Version History

- **2026-04-16** — Initial version. Captures the DCR
  confidential-client-coercion fix, the adjacent JWKS-vs-userinfo gotcha,
  path-scoped discovery considerations, and the user-agent taxonomy for Claude's
  multi-actor OAuth flow.
