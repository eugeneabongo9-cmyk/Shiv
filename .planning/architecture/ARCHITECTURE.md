# ShivWorks Network — Architecture & Cache Audit

**Audited:** 2026-05-29 against `createsomethingtoday/shivworks-network` @ `main`.
**Purpose:** ground the team in what's actually deployed before we own the full launch — what the stack is, how data flows, where the seams are, and (critically) what caching does **not** exist today and what we need to add before 600+ concurrent users hit the app.

---

## 1. Stack — the deployed reality

| Layer            | What's there                                                                   | Notes                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Edge             | **Cloudflare Pages** (`network.shivworks.com` / `shivworks-network.pages.dev`) | Built from `.svelte-kit/cloudflare` via `@sveltejs/adapter-cloudflare`. CDN for static assets is automatic. |
| Runtime          | Cloudflare Workers (nodejs_compat)                                             | `compatibility_date: 2026-03-20`, `compatibility_flags: ["nodejs_compat"]`.                                 |
| Framework        | **SvelteKit 2 + Svelte 5 + Vite 6**                                            | TS strict via `tsconfig.json`.                                                                              |
| Database         | **Cloudflare D1** (`shivworks-network-db`, binding `DB`)                       | Production + preview DBs declared in `wrangler.jsonc`. Migrations in `migrations/`.                         |
| Auth             | **Clerk** (`@clerk/backend` + `@clerk/clerk-js`)                               | Webhook-verified via svix. Session-limit enforcement in `session-security.ts`.                              |
| Payments         | **Stripe** wired today; **WC/Fortis** is the strategic direction               | Both webhooks exist. Stripe is the _currently running_ path; WC webhook is the build target (`w358`).       |
| Video            | **Cloudflare Stream**                                                          | tus-js-client for resumable upload; status webhook reconciles.                                              |
| Email            | **Resend**                                                                     | Welcome, receipts, session-security alerts, content-release.                                                |
| Community        | **Circle**                                                                     | Linked out by URL only. The Network owns no community data.                                                 |
| Error monitoring | **Sentry** (`@sentry/sveltekit`)                                               | Wired in no-op mode, gated on `PUBLIC_SENTRY_DSN`.                                                          |
| Secrets          | **Infisical** (CLI managed)                                                    | NOT Doppler, NOT raw CF env vars. See `INFISICAL.md`.                                                       |
| Hosting (alt)    | **Replit** preview                                                             | `wrangler.replit.jsonc` for an alternate preview environment.                                               |

## 2. Route map (what's actually served)

```
src/routes/
├── +layout.{server.ts,svelte}        global layout + auth hydration
├── +page.{server.ts,svelte}          landing
├── welcome/                           post-signup interstitial
├── login/   signup/                   Clerk-mounted [...rest]
├── checkout/                          Stripe-wired today (target: WC)
├── dashboard/                         tier-gated member home
├── library/                           course index + [slug] detail
├── live/                              livestream surface
├── updates/                           updates feed
├── community/                         Circle link surface
├── vip-calls/                         VIP request surface
├── settings/                          profile + sessions/[id]/revoke
├── admin/                             admin surface (member imports, media)
├── sitemap.xml/                       public sitemap
└── api/
    ├── stripe/{checkout,webhook}
    ├── clerk/webhook
    ├── webhooks/stream
    ├── library/episodes/[episodeId]/{playback,progress}
    ├── library/modules/[moduleId]/progress
    ├── events/[id]/rsvp
    ├── vip-calls/request
    ├── settings/sessions/[sessionId]/revoke
    └── admin/media/uploads/{init,complete,sync}
```

**Auth posture:** `hooks.server.ts` runs Clerk authentication first, hydrates `event.locals.user` from D1, enforces the session limit, and (when DSN is set) wraps everything in `Sentry.sentryHandle()`. Errors classified via `lib/errors/classify.ts` then surfaced through per-section `+error.svelte` boundaries.

## 3. Data model — D1 (`shivworks-network-db`)

Built incrementally across 8 migrations. The current tables:

| Table                             | Migration   | Purpose                                                                                                                                      |
| --------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `members`                         | 0001        | The identity row — `clerk_user_id`, `email`, `tier`, `access_status`, `role`, `email_verified`. The hot read on every authenticated request. |
| `member_sessions`                 | 0001        | Tracks active Clerk sessions for session-limit enforcement.                                                                                  |
| `member_audit_log`                | 0001        | Append-only audit of access transitions.                                                                                                     |
| `courses`, `course_modules`       | 0001        | Curriculum spine.                                                                                                                            |
| `events`                          | 0001        | Live / scheduled events.                                                                                                                     |
| `media_assets`                    | 0008        | Cloudflare Stream video metadata.                                                                                                            |
| `course_module_episodes`          | 0008        | Multi-episode modules linking modules → media.                                                                                               |
| `member_episode_progress`         | 0003 + 0004 | Per-episode + per-module watch progress.                                                                                                     |
| `member_imports`                  | 0005        | **Pending provisioning by email** (the WC webhook target).                                                                                   |
| `member_notification_preferences` | 0006        | Per-member opt-in flags.                                                                                                                     |
| `member_content_release_alerts`   | 0007        | Drip-release email tracking.                                                                                                                 |
| `free_access_tier`                | 0002        | Free-tier flag/config.                                                                                                                       |

**Hot paths (reads to D1 per request):**

- `getMemberByClerkId` — every authenticated request (layout hydration).
- `ensureMemberIdentity` — first login + every login when claim-check needs to run.
- `claimImportedMemberProvision` — every login (lookup by email, even if no row).
- Per-route: dashboard reads members + progress; library reads courses + modules + episodes + progress; live reads events.

This is the fan-out that becomes a problem at 600+ concurrent users without caching.

## 4. Integration map (where the seams live)

```
                  ┌──────────────┐                ┌────────────────┐
   Member ───────▶│  Cloudflare  │   D1 binding   │  D1            │
                  │  Pages /     │◀──────────────▶│  shivworks-    │
                  │  Workers     │                │  network-db    │
                  └──────┬───────┘                └────────────────┘
                         │
            ┌────────────┼────────────┬─────────────┬──────────────┐
            ▼            ▼            ▼             ▼              ▼
        Clerk         Stripe       Resend       CF Stream       Sentry
       (auth +      (current      (email)      (video host    (errors +
        webhook)     payment)                   + webhook)    sourcemaps)
                         │
                         └─[future: replaced by]─▶  WooCommerce/Fortis
                                                    via webhook (w358)
```

**Critical seam — the WC webhook (planned):**

```
Buyer pays on shivworkspg.com (WC + Fortis)
        ↓
WC fires order webhook
        ↓
POST /api/wc/webhook (verify HMAC, parse order)
        ↓
upsertImportedMemberProvision({ email, tier })   ──▶  member_imports row
        ↓
… later, that buyer signs up via Clerk with same email
        ↓
ensureMemberIdentity → claimImportedMemberProvision (by email)
        ↓
member.tier = bronze | vip
```

Email is the _only_ identifier across systems at purchase time. There is no Clerk user yet at purchase; the link is established lazily on first login.

## 5. Cache architecture — **the gap**

**Current state:** ZERO cache. Confirmed:

- No `kv_namespaces` in `wrangler.jsonc`.
- No `caches.default` / `caches.open()` usage in `src/`.
- No `Cache-Control` headers set in any `+page.server.ts`, `+layout.server.ts`, or API route.
- Static assets get CF CDN automatically; everything dynamic hits D1.

**Why this matters at 600 concurrent users:**

- A dashboard load with no cache = ~3–5 D1 reads.
- 600 users active = ~1,800–3,000 D1 reads/min just from hydration + dashboard.
- D1 has rate limits per worker; this is the right order of magnitude to start seeing throttling.
- Page TTFB is dominated by D1 round-trip per request, not by Worker compute.

### Proposed 4-layer cache architecture

| Layer                           | What                                                                                                        | TTL           | Invalidation                    | Why                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **L1. Cloudflare CDN**          | Static assets, prerendered pages (landing, FAQ, about)                                                      | Long (1d+)    | Build hash                      | Already automatic for static; we should opt the landing route into prerender.                                             |
| **L2. SvelteKit `setHeaders`**  | Public/read-mostly endpoints: `/sitemap.xml`, `/api/members` (count), library index                         | 30–60s        | TTL only                        | One-line per route. Drops repeat D1 reads to ~1/min.                                                                      |
| **L3. Cloudflare Cache API**    | Server-side edge cache for course lists, episode metadata, live event schedule                              | 60–300s       | Tag-based on write + TTL        | `caches.default.match/put` keyed on URL. Catches the long tail of repeat reads from different visitors.                   |
| **L4. Cloudflare KV namespace** | Hot config + slow-changing reads: tier definitions, course catalog snapshot, founding-member tracker counts | minutes–hours | Write-through on admin mutation | KV binding in `wrangler.jsonc`. Ideal for "every member reads it, almost nobody writes it." Sub-millisecond global reads. |

**Hot paths to target first (highest read multiplier):**

1. `members.tier` lookup on every authenticated request — **L4 (KV)** keyed by `clerkUserId`, invalidated by webhook or settings change. Single biggest D1 traffic reducer.
2. Course/module/episode catalog — **L3 (Cache API)** with a short TTL or **L4 (KV)** with admin-mutation invalidation.
3. Founding-member tracker count — **L4 (KV)** with the webhook writing through; reads are near-free.
4. Public landing page — **L1 (prerender)** if marketing-only, otherwise **L2 (setHeaders, 60s)**.

**Write-through pattern (the discipline):**

- Mutation endpoints set the cache on success: `caches.default.put(...)` or `KV.put(...)`.
- Webhooks (Clerk, Stripe/WC, Stream) invalidate the affected keys.
- D1 stays the source of truth; cache is a read accelerator, never authoritative.

**What to NOT cache:**

- Anything tier-gated where a stale tier could grant unauthorized access (no caching the _result_ of `requirePaidMember`).
- Anything written within the same request (member progress).
- Anything with PII in the cache key (use member ID, not email).

## 6. Build, deploy, CI

- **Build:** `pnpm build` → `vite build` → `@sveltejs/adapter-cloudflare` writes `.svelte-kit/cloudflare`.
- **Deploy:** `pnpm deploy` (`wrangler pages deploy ... --branch=main`) or `pnpm deploy:preview`.
- **Migrations:** `pnpm migrate` (= `wrangler d1 migrations apply shivworks-network-db --remote`). Forward-only by convention.
- **CI:** `.github/workflows/ci.yml` — check / lint / format / unit / build / smoke. Runs on every PR + push to main. PR template at `.github/PULL_REQUEST_TEMPLATE.md`.
- **Pre-commit:** `simple-git-hooks` + `lint-staged` (`eslint --fix` + `prettier --write` on staged TS/Svelte/JS).
- **Smoke:** Playwright public-route specs; auth-gated specs blocked on Clerk test users.

## 7. Load test target (Artillery)

Documented in `.planning/architecture/LOAD-TEST-PLAN.md`. The Artillery config in `tests/load/` ramps to **600+ concurrent virtual users** against:

1. `GET /` (landing) — should be cacheable.
2. `GET /api/members` (tracker count) — KV-backed once implemented.
3. `GET /library` — course index, KV/Cache API target.
4. `GET /dashboard` — tier-gated, hits D1 today.
5. `POST /api/library/episodes/[id]/progress` — write path, no cache.

The test is _both_ a regression gate (do we hold up?) and a forcing function (it will be miserable until L2–L4 cache lands; that's the point).

## 8. Open architectural questions

1. **KV namespace vs Durable Object for the tracker count** — KV is eventually consistent (~60s globally); a DO gives strongly consistent counters but adds cost. For a launch tracker, KV is fine; for a real-time leaderboard, DO.
2. **Tier-result caching** — safest pattern is `tier + audit_log version` as the key, but increases write complexity. Alternative: short TTL (10s) and accept brief stale reads.
3. **CDN purge on member-import** — bulk import provisions thousands of rows. Need a purge strategy so first logins after import don't read a stale "no entitlement" cache.
4. **Replit preview environment** — alternate `wrangler.replit.jsonc` exists; needs its own D1 + KV bindings or it diverges silently from production.

---

_See companion docs:_

- `INFISICAL.md` — secrets vault setup + CLI usage.
- `LOAD-TEST-PLAN.md` — Artillery scenarios + targets.
- `.planning/LEDGER.md` — engineering log of what shipped to date.
