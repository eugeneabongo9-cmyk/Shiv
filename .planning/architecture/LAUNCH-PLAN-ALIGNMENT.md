# Launch-Plan Alignment

**Source:** `E:/Kill Google/output/shivworks-launchplan.md` — Gemini conversation transcript on launch readiness.
**Done:** 2026-05-29.
**Purpose:** confirm every item Gemini raised is covered, partially covered, or open — with evidence (file paths / PRs / branches) and an owner + action for every gap.

Status keys: ✅ **shipped** · 🟡 **partial / wired-not-verified** · ⚠️ **gap** · ➖ **N/A for this stack**.

---

## Quick scoreboard

| Gemini section                     | Shipped | Partial | Gap | N/A |
| ---------------------------------- | ------- | ------- | --- | --- |
| Phase 1 — Infrastructure & Staging | 2       | 2       | 1   | 0   |
| Phase 2 — Performance & Load       | 1       | 1       | 0   | 1   |
| Phase 3 — Content & Automation     | 0       | 2       | 1   | 0   |
| Phase 4 — Rollout Strategy         | 0       | 0       | 2   | 0   |
| Phase 5 — Post-Launch Monitoring   | 1       | 1       | 0   | 0   |
| Turn 17 definitive (6 sections)    | 12      | 4       | 4   | 1   |
| Turn 21 launch-readiness checklist | 8       | 5       | 7   | 0   |
| Turn 22 task list (7 tasks)        | 3       | 2       | 2   | 0   |

**Where we are strong:** the entire hardening, telemetry, CI, and tooling layer is already on `main`. The architecture is documented and the load-test target is wired.
**Where we are still open:** the webhook _implementation_ (we have the spec/IDs/plan, not the code), bulk import + tracker (the launch-critical lane), the rollout/rollback choreography, and the Clerk/AC/Circle production wiring.

---

## Phase 1 — Infrastructure & Staging

| Gemini item                             | Status               | Evidence / notes                                                                                                                                                                                                                                                                    |
| --------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment parity (staging = prod)     | ⚠️ gap               | We have `wrangler.jsonc` with a `preview_database_id` for D1, but no documented staging deploy + smoke discipline. **Action:** define a Cloudflare Pages preview branch (e.g. `staging`) + staging Infisical env + staging D1 already exists, document the deploy flow. Owner: Max. |
| Payment webhook end-to-end test         | 🟡 partial           | Spec written (`wc-webhook-pr-summary.md`, INV-009), product IDs confirmed (Bronze 31517 / VIP 31518), idempotency designed. **Code not yet shipped.** Action: `feat/wc-webhook` PR. Owner: Max.                                                                                     |
| Database migrations (dry-run + indexes) | ✅ shipped (process) | 8 migrations in `migrations/` apply forward-only via `pnpm migrate`. **Index review:** no explicit index audit yet — `members.clerk_user_id` + `members.email` are the hot lookups; verify both have indexes in `0001`. Action: index audit PR (~1 hr). Owner: Max.                 |

## Phase 2 — Performance & Load Verification

| Gemini item                              | Status     | Evidence                                                                                                                                                                                |
| ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load testing (Artillery, 600 concurrent) | ✅ shipped | `tests/load/{scenarios,smoke}.yml` ramps to ~600 concurrent via arrivalRate 200/s sustained; `pnpm load:smoke` / `pnpm load:full` / `pnpm load:report`. See `LOAD-TEST-PLAN.md`.        |
| Database connection pooling              | ➖ N/A     | D1 on Cloudflare Workers is a serverless binding — no pool to tune. The equivalent concern is **cache** (so D1 isn't hit on every request). Plan in `ARCHITECTURE.md` §5 (L1–L4 cache). |
| Asset caching (static + video)           | 🟡 partial | CF Pages CDN is automatic for static. **Cloudflare Stream** already serves the videos (no origin video traffic). Cache for _dynamic_ reads (the rest of §5) is the open work.           |

## Phase 3 — Content & Automation Validation

| Gemini item                        | Status     | Evidence                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access control QA (every tier)     | 🟡 partial | Guards exist (`lib/server/guards.ts`: `requireAuthenticated`, `requireEntitled`, `requirePaidMember`, `requireVip`, `requireAdmin`). Auth-gated Playwright suite is written but blocked on Clerk test users (`w428` / `w445`). Action: Aaron creates Clerk Dev users → unblock + run. |
| Automation dry-run (welcome email) | ⚠️ gap     | `sendWelcomeEmail` exists in `lib/email/` and is called from the Stripe webhook today. WC path not yet wired (depends on `feat/wc-webhook`). Action: end-to-end email dry-run once WC webhook ships, against a Resend sandbox.                                                        |
| Video playback integrity           | 🟡 partial | Cloudflare Stream wired (`lib/server/stream.ts`, tus uploads, status sync webhook). No documented cross-device QA. Action: mobile + desktop walkthrough pre-launch. Owner: Aaron + Max.                                                                                               |

## Phase 4 — Rollout Strategy

| Gemini item                                  | Status | Evidence                                                                                                                                                                                              |
| -------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staggered onboarding (50 → 150 → rest)       | ⚠️ gap | No batching plan documented. Action: write `.planning/architecture/ROLLOUT.md` with the 50/30-min/150/30-min/rest cadence + the metric thresholds to advance/halt. Owner: Max + Aaron.                |
| Rollback plan (DB backup + one-click revert) | ⚠️ gap | Cloudflare Pages supports one-click rollback (per-deployment) — needs to be in the runbook. D1 backups: `wrangler d1 backup` snapshot before launch. Action: rollback runbook PR (~1 hr). Owner: Max. |

## Phase 5 — Post-Launch Monitoring

| Gemini item                           | Status             | Evidence                                                                                                                                                                                                                                    |
| ------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error tracking (Sentry)               | ✅ shipped (no-op) | `src/hooks.{client,server}.ts` + `lib/server/log.ts` + 7 error boundaries. **Activation:** Aaron creates the Sentry project + DSN goes into Infisical as `PUBLIC_SENTRY_DSN`. Code change: zero.                                            |
| Resource dashboards (CPU/mem/latency) | 🟡 partial         | Cloudflare Pages has built-in analytics. **No custom dashboard yet** — Sentry covers app-level, but D1 query latency + Worker CPU is in CF dashboard only. Action: bookmark the CF analytics view in the runbook, optionally Grafana later. |

---

## Turn 17 — definitive 6-section list

### 1. Backend & Data Routing

| Item                            | Status     | Evidence                                                                                                                                                                                              |
| ------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint architecture           | ✅ shipped | 11 API endpoints in `src/routes/api/`; see `ARCHITECTURE.md` §2.                                                                                                                                      |
| Payload parsing (typed)         | ✅ shipped | TS strict mode; `lib/server/db/shivworks.ts` returns typed records.                                                                                                                                   |
| Access control logic            | ✅ shipped | `lib/server/guards.ts` — 5-level guard ladder.                                                                                                                                                        |
| Capacity & threshold management | 🟡 partial | Tier capacities (Bronze 1k/tier × 4, VIP 200) defined in `lib/constants/tiers.ts`; **enforcement at sale time is on the WC side**, not the Network. Confirm with Alex during checkout build (`w433`). |

### 2. Integration & Webhooks

| Item                           | Status                | Evidence                                                                                                                                          |
| ------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook signature verification | 🟡 partial            | Clerk webhook verifies via svix ✅. Stripe webhook verifies via Stripe SDK ✅. **WC webhook** signature verification = TODO in `feat/wc-webhook`. |
| Idempotency                    | ⚠️ gap                | Spec designed (`processed_webhook_events` migration in INV-009 spec). **Not yet implemented.** Action: ships with `feat/wc-webhook`.              |
| Event state mapping            | ✅ shipped (existing) | `member_imports` table + `claimImportedMemberProvision` is the pending → granted flow.                                                            |

### 3. Frontend & Framework Assembly

| Item                                  | Status     | Evidence                                                                                                                                                          |
| ------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component migration (HTML → Svelte)   | 🟡 partial | Network app is SvelteKit ✅. The WC store checkout PHP templates + tracker mobile-HTML still need to live on WordPress, not in the SvelteKit app (decision `D4`). |
| State management (session continuity) | ✅ shipped | `hooks.server.ts` hydrates `event.locals.user` on every request from Clerk + D1.                                                                                  |
| Dynamic UI gates                      | ✅ shipped | Guards return either the record or `redirect(303, '/checkout')` / `error(403)`. `canAccessAudience` helper in `tiers.ts` for component-level gating.              |

### 4. Infrastructure & Database Hardening

| Item                      | Status                | Evidence                                                                 |
| ------------------------- | --------------------- | ------------------------------------------------------------------------ |
| DB schema + relationships | ✅ shipped (existing) | 12 tables, documented in `ARCHITECTURE.md` §3.                           |
| Connection pool mgmt      | ➖ N/A                | D1 binding — see Phase 2 note.                                           |
| Env var security          | ✅ shipped            | Infisical CLI integration on `main`; secret inventory in `INFISICAL.md`. |

### 5. Verification & Dry Runs

| Item                               | Status     | Evidence                                                                                                                                                                                                                                |
| ---------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payload mocking (`curl` / Postman) | 🟡 partial | Test fixtures planned for `wc-webhook.test.ts`. No top-level `curl` recipe doc yet. Action: add `tests/fixtures/wc-order.json` + a `scripts/mock-wc-webhook.sh` script alongside `feat/wc-webhook`.                                     |
| CI/CD pipeline validation          | ✅ shipped | `.github/workflows/ci.yml`: check / lint / format / unit / build / smoke. PR template `.github/PULL_REQUEST_TEMPLATE.md`.                                                                                                               |
| Edge-case walkthroughs             | ⚠️ gap     | Per-route SOPs in `.planning/sops/section-*.md` (12 files from earlier planning bundle) list edge cases per surface but not yet walked manually. Action: bulk-import dress rehearsal (`w259`) is the most important manual walkthrough. |

### 6. Live Monitoring & Operations

| Item                    | Status                    | Evidence                                                       |
| ----------------------- | ------------------------- | -------------------------------------------------------------- |
| Crash & error reporting | ✅ shipped                | Sentry wired no-op; activates on DSN.                          |
| Server log management   | ✅ shipped (via Wrangler) | CF Workers stderr captured; `logError` writes structured JSON. |
| Rollback protocol       | ⚠️ gap                    | Same as Phase 4.                                               |

---

## Turn 21 — comprehensive launch-readiness checklist

### 1. Payment Verification & Webhook Routing

| Item                         | Status                | Evidence                                                                                       |
| ---------------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| Webhook signature validation | 🟡 partial            | Clerk + Stripe ✅; **WC TODO**.                                                                |
| Idempotency handling         | ⚠️ gap                | `processed_webhook_events` ships with `feat/wc-webhook`.                                       |
| D1 user provisioning         | ✅ shipped (existing) | `upsertImportedMemberProvision` + `claimImportedMemberProvision` already wired.                |
| Dry-run mock traffic         | 🟡 partial            | Vitest unit tests cover existing webhooks; **`curl` mock for WC TODO** with `feat/wc-webhook`. |

### 2. SvelteKit & Cloudflare Configuration

| Item                          | Status                | Evidence                                                                                                                   |
| ----------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare adapter            | ✅ shipped            | `@sveltejs/adapter-cloudflare` in `svelte.config.js`.                                                                      |
| Infisical env vars            | ✅ shipped            | `.infisical.json` + 5 `*:secrets` scripts on `main`. **Workspace ID still placeholder** — run `infisical init` to replace. |
| D1 migrations                 | ✅ shipped (process)  | `pnpm migrate` against `--remote`. Forward-only.                                                                           |
| Cloudflare Stream integration | ✅ shipped (existing) | `lib/server/stream.ts`, `routes/api/webhooks/stream/+server.ts`.                                                           |

### 3. Authentication & User Flow (Clerk)

| Item                                          | Status     | Evidence                                                                                                                                     |
| --------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Production API keys (`pk_live_` / `sk_live_`) | ⚠️ gap     | Currently using test keys per `.env.example`. Action: rotate to live keys via Infisical at launch. Owner: Aaron + Max.                       |
| Redirect URIs (prod domain)                   | ⚠️ gap     | Clerk dashboard config — verify `network.shivworks.com` is in the allowed origins. Owner: Aaron.                                             |
| RBAC validation                               | 🟡 partial | Guards implemented ✅; cross-route audit not yet executed. Action: `pnpm smoke` + auth-gated smoke (blocked on `w445`) covers this when run. |

### 4. Operations, Messaging & Monitoring

| Item                                   | Status     | Evidence                                                                                                                                                                                                       |
| -------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sentry error tracking                  | 🟡 partial | Wired ✅; needs DSN to activate.                                                                                                                                                                               |
| ActiveCampaign tagging                 | ⚠️ gap     | Not in the codebase. Action: add an AC-tag fetch inside the WC webhook (alongside the welcome email call) in `feat/wc-webhook`. Owner: Max. AC API key goes in Infisical as `ACTIVECAMPAIGN_API_URL` + `_KEY`. |
| Resend deliverability (SPF/DKIM/DMARC) | ⚠️ gap     | Code wired (`lib/email/service.ts`). **DNS records not verified.** Action: confirm SPF/DKIM/DMARC on `network.shivworks.com` (or whatever From domain) — Resend dashboard shows status. Owner: Aaron + Max.    |
| Circle community SSO                   | ⚠️ gap     | Today the Network just links out to Circle. **Real SSO not implemented.** Action: optional for beta (a link is OK); the cleaner SSO is a post-launch nice-to-have. Owner: Aaron + Micah.                       |

### 5. Rollout Strategy

| Item                                | Status | Evidence     |
| ----------------------------------- | ------ | ------------ |
| Waitlist batching (50 → 150 → rest) | ⚠️ gap | See Phase 4. |
| Rollback plan (CF Pages one-click)  | ⚠️ gap | See Phase 4. |

---

## Turn 22 — Gemini's 7-task action plan

| Task                                    | Status                | Evidence / notes                                                                                                                                                                                                                                                                                                         |
| --------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Frontend component conversion        | ✅ shipped            | Routes exist; new pages (e.g. People-of) are Micah's lane (`w430`).                                                                                                                                                                                                                                                      |
| 2. Database setup (Drizzle ORM)         | ➖ N/A on Drizzle     | The app uses **direct D1 SQL** via `lib/server/d1-compat.ts` (the original CREATE SOMETHING choice). Drizzle is a recommendation we did _not_ adopt; the equivalent type safety comes from `lib/server/db/shivworks.ts` typed wrappers. No rework planned — call this out so contributors don't add Drizzle by accident. |
| 3. WC webhook endpoint                  | 🟡 partial            | Spec + IDs + plan exist; **code TODO** in `feat/wc-webhook`.                                                                                                                                                                                                                                                             |
| 4. Clerk integration                    | ✅ shipped (existing) | Clerk SDK, `hooks.server.ts`, guards, member identity hydration all in place.                                                                                                                                                                                                                                            |
| 5. Infisical for secrets                | ✅ shipped            | `chore/infisical-cli` merged; `*:secrets` scripts; secret inventory documented.                                                                                                                                                                                                                                          |
| 6. Wire triggers (Resend / AC / Circle) | 🟡 partial            | Resend wired; AC TODO; Circle SSO TODO (deferrable).                                                                                                                                                                                                                                                                     |
| 7. Final deployment pipeline            | ✅ shipped            | CI green, `pnpm deploy` / `pnpm deploy:preview` configured for CF Pages.                                                                                                                                                                                                                                                 |

---

## Consolidated gap list (the actual work remaining)

Sorted by leverage, with the owner and the branch where each will land. **Bold = launch-blocking.**

| #   | Gap                                                                                    | Owner         | Branch                        | Est.                  |
| --- | -------------------------------------------------------------------------------------- | ------------- | ----------------------------- | --------------------- |
| 1   | **WC webhook implementation** (signature + idempotency + provisioning + mock fixtures) | Max           | `feat/wc-webhook`             | 6.5 hrs               |
| 2   | **Bulk import + dress rehearsal** for the ~643 existing buyers                         | Max + Alex    | `feat/bulk-import-run`        | 6 hrs (+ Alex export) |
| 3   | **L2 cache (`setHeaders`)** on landing / sitemap / api/members                         | Max           | `feat/cache-l2-headers`       | 2 hrs                 |
| 4   | **L4 KV cache** on `members.tier` lookup + course catalog                              | Max           | `feat/cache-l4-kv`            | 3 hrs                 |
| 5   | **Rollout + rollback runbook** (50/150/rest cadence + CF Pages revert + D1 backup)     | Max           | `docs/rollout-and-rollback`   | 1.5 hrs               |
| 6   | **Staging environment** documented (preview branch + Infisical staging env)            | Max           | `docs/staging-environment`    | 1 hr                  |
| 7   | **D1 index audit** (`members.clerk_user_id`, `members.email`, `member_imports.email`)  | Max           | `chore/d1-index-audit`        | 1 hr                  |
| 8   | **WC `curl` mock harness** for offline dry-runs                                        | Max           | merges into `feat/wc-webhook` | 0.5 hrs               |
| 9   | **ActiveCampaign tagging** on successful provisioning                                  | Max           | merges into `feat/wc-webhook` | 0.5 hrs               |
| 10  | **Clerk prod keys** + redirect URIs verified                                           | Aaron         | n/a                           | 15 min                |
| 11  | **Sentry DSN** in Infisical                                                            | Aaron         | n/a                           | 15 min                |
| 12  | **Clerk dev test users** for auth-gated smoke                                          | Aaron         | n/a                           | 15 min                |
| 13  | **Resend DNS** (SPF / DKIM / DMARC) verified                                           | Aaron + Max   | n/a                           | 30 min                |
| 14  | **Buyer export** (~643 rows: email, tier, order id)                                    | Alex          | n/a                           | varies                |
| 15  | **Cross-device video QA** walkthrough                                                  | Aaron + Max   | n/a                           | 1 hr                  |
| 16  | **Circle SSO** (optional for beta)                                                     | Aaron + Micah | post-launch                   | TBD                   |

**Max's hands-on work to launch-ready:** ≈ 22 hrs.
**Owner-side actions (Aaron / Alex / Micah):** ≈ 2 hrs of decisions + Alex's export.

## Stack reconciliations (where Gemini ≠ this app)

- **Drizzle ORM:** Gemini recommended; the app uses direct D1 SQL. Stay with the current pattern.
- **Frontend framework:** Gemini left it open between Next.js and SvelteKit; the app **is SvelteKit**. The deprecated Next.js app-template is closed.
- **Payment routing:** Gemini frames Stripe + WC as the bridge; the live code is Stripe-wired today, the strategic direction (and what gap #1 above implements) is WC/Fortis. Stripe stays as dormant fallback.

## Cross-references

- `ARCHITECTURE.md` — stack + route tree + D1 schema + cache plan.
- `INFISICAL.md` — secrets vault + CLI usage + secret inventory.
- `LOAD-TEST-PLAN.md` — Artillery scenarios + the cache-stage p95 progression.
- `wc-webhook-pr-summary.md` (planning bundle) — the WC webhook spec referenced as gap #1.
- `LEDGER.md` — running engineering log; every gap above becomes a new entry as it lands.
