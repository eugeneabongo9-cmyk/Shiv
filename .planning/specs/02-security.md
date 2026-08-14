# Spec 02 — Security

Reviewed against OWASP Top 10 (2021), OWASP API Security Top 10 (2023), and Cloudflare Pages production guidance. Findings grounded in the actual code at `main` (commit `f45b7a5`).

Severity legend: 🔴 must-fix before beta · 🟡 fix in week 1 post-beta · 🟢 hardening / nice-to-have.

---

## §1 Secrets handling 🟡

**Observation.** `.env.example` lists 14 vars. README documents only Doppler + Cloudflare Pages env. No secret rotation policy.

**Required.**

- All secrets injected via Doppler (`shivworks` project, configs `dev` / `stg` / `prd`).
- Cloudflare Pages environment secrets mirror Doppler `prd` for production builds; Doppler GitHub Action populates CI.
- `.env.example` is the **only** committed env artifact. Add `.env*` (except `.env.example`) to `.gitignore` — verify, add if missing.
- Rotation: Clerk secret key, Stripe secret + webhook secret, Resend API key, Cloudflare Stream API token rotated quarterly. Document the procedure in `sops/00-pull-requests.md` § Secrets Rotation.

**Acceptance.** No secret string appears in `git log -p`. `gitleaks` scan in CI returns clean.

## §2 Webhook integrity 🔴

### 2.1 Stripe webhook — replay + idempotency

`src/routes/api/stripe/webhook/+server.ts` verifies the signature but:

- Does **not** check `event.id` against a processed-events table → a retried webhook double-activates entitlement.
- `activateMemberEntitlement` is not idempotent on `(clerkUserId, sourceRef=session.id)` (verify in `db/shivworks.ts`).

**Required.**

- New migration `0009_processed_webhook_events.sql`:
  ```sql
  CREATE TABLE processed_webhook_events (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,           -- 'stripe' | 'clerk' | 'stream'
    received_at TEXT NOT NULL,
    payload_hash TEXT NOT NULL
  );
  ```
- Before processing, `INSERT OR IGNORE` the event; if `changes() === 0` return `{ success: true, replay: true }`.
- Wrap `upsertMemberFromWebhook` + `activateMemberEntitlement` in a D1 batch so a partial failure leaves the event un-marked.

### 2.2 Clerk webhook

Already verified via svix. Apply the same `processed_webhook_events` guard using `event.data.id + event.type` as key.

### 2.3 Cloudflare Stream webhook

`src/routes/api/webhooks/stream/+server.ts` — verify signature against `CLOUDFLARE_STREAM_WEBHOOK_SECRET` (HMAC). Audit during impl; if missing, add the verification.

**Acceptance.** Stripe CLI `stripe trigger checkout.session.completed --add` fired twice produces exactly one entitlement activation.

## §3 Session security 🟡

`src/lib/server/session-security.ts` enforces a session-limit. Review tasks:

- Confirm session-limit value is configurable per tier.
- On `requireAuthenticated` redirect, preserve query string + path; `buildLoginHref` already does this — add a test that asserts it for `?utm_*` params.
- Add `Set-Cookie` on logout to clear local session cookie if any (Clerk handles, but assert via test).

## §4 Authorization 🟡

Guards ladder in `guards.ts` is clean. Gaps:

- `requireAdmin` redirects unauthenticated to `/admin` (302) but `/admin` itself requires admin → potential infinite redirect for a logged-in non-admin who lands on `/admin`. **Fix:** redirect non-admins to `/dashboard` with `error(403, ...)` flash, not back to `/admin`.
- No audit log for admin actions (member imports, entitlement overrides). Add `audit_log` table in a follow-up migration:
  ```sql
  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_clerk_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    metadata TEXT,                  -- JSON
    created_at TEXT NOT NULL
  );
  ```

## §5 Input validation 🔴

API endpoints accept JSON bodies but no schema validation observed (`api/library/episodes/[episodeId]/progress`, `api/vip-calls/request`, `api/events/[id]/rsvp`).

**Required.**

- Add `zod` (or `valibot` for smaller bundle).
- Each `+server.ts` POST/PUT validates `request.json()` against a schema; reject with 400 + `{ error: 'invalid_body', issues: [...] }` on failure.
- Reject bodies > 100 KB with 413 (use `request.headers.get('content-length')` pre-parse).

**Acceptance.** A unit test per endpoint asserts the 400 response for malformed input.

## §6 Rate limiting 🟡

No rate limits on:

- `/api/stripe/webhook` (Stripe IP-allowlists, lower priority)
- `/api/clerk/webhook` (same)
- `/api/vip-calls/request` (member-facing, abuse vector — **must rate-limit**)
- `/api/events/[id]/rsvp` (same)
- `/api/library/episodes/[episodeId]/progress` (high-volume, can run at higher cap)

**Required.**

- Use Cloudflare Workers rate-limiting binding (`[[unsafe.bindings]]` in `wrangler.jsonc`) OR a D1-backed token bucket keyed by `clerkUserId`.
- Defaults: member-facing mutation endpoints → 30/min/user; webhook endpoints → 600/min/source (Stripe burst tolerance).

## §7 Security headers 🟡

No headers set today. Add in a `handle` hook in `hooks.server.ts`:

```ts
response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
// CSP: nonce-based; allow Clerk + Stripe + Cloudflare Stream domains
response.headers.set('Content-Security-Policy', csp);
```

CSP must permit:

- `script-src` — `'self' 'nonce-<n>' https://js.clerk.com https://js.stripe.com https://challenges.cloudflare.com https://customer-*.cloudflarestream.com`
- `frame-src` — `https://js.stripe.com https://challenges.cloudflare.com https://customer-*.cloudflarestream.com https://*.circle.so`
- `connect-src` — `'self' https://api.clerk.com https://api.stripe.com https://*.cloudflarestream.com https://*.ingest.sentry.io`

**Acceptance.** `securityheaders.com` grade ≥ A on production URL.

## §8 Dependency CVE scanning 🟢

- Dependabot already proposed (Spec 01 §7).
- Add `pnpm audit --prod --audit-level high` to CI; fail on high/critical.
- Add `gitleaks` GitHub Action to scan PR diffs for accidental secret commits.

## §9 PII + GDPR 🟢

`upsertMemberFromWebhook` stores `email`, `name`. Member can request deletion via `user.deleted` Clerk webhook (handled). Document the privacy contract in a new `PRIVACY.md` (out of scope for security PR; flagged for legal SOP).

---

## Mapping to PRs

| Section                                           | Goes to PR                   |
| ------------------------------------------------- | ---------------------------- |
| §2 webhooks                                       | INV-007                      |
| §5 validation                                     | INV-007                      |
| §6 rate limit                                     | INV-007                      |
| §7 headers                                        | INV-007                      |
| §1 secrets, §3 session, §4 authz, §8 deps, §9 PII | INV-007 follow-on or backlog |
