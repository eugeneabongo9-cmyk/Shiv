# Go-Live Runbook — ShivWorks Network — June 1, 2026

> **Single source of truth for the launch cutover.** Read top-to-bottom. Each section is a checklist; tick as you go. If any step fails, STOP and consult the rollback line at the bottom of that section before continuing.

**Owner:** Max (network app + cutover)  
**Support:** Aaron (WP/DNS/secrets), Micah (branch protection / repo admin)  
**Target go-live:** Monday June 1, 2026 (morning, US Central)

---

## Phase 0 — Pre-flight (May 30, evening)

Goal: confirm the codebase is launch-ready before any deploys.

- [ ] Run `pnpm install --frozen-lockfile` locally — clean install, no peer warnings
- [ ] Run `pnpm check` — TypeScript clean, zero errors
- [ ] Run `pnpm test` — Vitest suite green (`wc-webhook.test.ts`, `cache.test.ts`, `webhook-idempotency.test.ts`, `classify.test.ts`)
- [ ] Run `pnpm lint` — eslint clean (warns OK, errors NO)
- [ ] Run `pnpm smoke` — Playwright public spec passes against local dev
- [ ] Snapshot main: `pwsh scripts/snapshot-main.ps1` — produces `backup/main-YYYYMMDD-HHMM` tag on origin

**Rollback if any of the above fail:** do not proceed. Fix locally, PR, merge, restart Phase 0.

---

## Phase 1 — Secrets & external services (May 31 morning) — AARON BLOCKERS

These cannot be set by Max. Aaron must complete before Phase 2.

### Infisical (`shivworks-network` project, `prod` environment)

- [ ] `CLERK_SECRET_KEY` — production Clerk key (Aaron has access)
- [ ] `CLERK_PUBLISHABLE_KEY` — `pk_live_...`
- [ ] `WC_WEBHOOK_SECRET` — generate a 64-char random string; Aaron pastes the same value into WC admin (see below)
- [ ] `SENTRY_DSN` — server DSN from Sentry org (Aaron creates project if not done)
- [ ] `VITE_SENTRY_DSN` — same DSN, client copy
- [ ] `RESEND_API_KEY` — production Resend key
- [ ] `RESEND_FROM_EMAIL` — `welcome@shivworks.com` (verify DKIM/SPF/DMARC pass on resend.com dashboard)
- [ ] `ACTIVECAMPAIGN_API_URL` + `ACTIVECAMPAIGN_API_KEY` — optional; webhook still provisions if unset

### WordPress / WooCommerce admin (Aaron)

- [ ] WC → Settings → Advanced → Webhooks → Add webhook:
  - **Name:** `network-provisioning`
  - **Status:** Active
  - **Topic:** `Order updated` (fires on status change to `completed`)
  - **Delivery URL:** `https://network.shivworks.com/api/wc/webhook`
  - **Secret:** *paste same value as `WC_WEBHOOK_SECRET` above*
  - **API Version:** WP REST API Integration v3
- [ ] Save. Send a test ping. Confirm 200 response in Webhook log.

### DNS (Aaron — domain registrar)

- [ ] `network.shivworks.com` → CNAME → `shivworks-network.pages.dev` (Cloudflare Pages canonical hostname)
- [ ] Verify with `nslookup network.shivworks.com` — propagates within ~5 min on most registrars

### Cloudflare bindings (Aaron — CF dashboard, Pages project `shivworks-network`)

- [ ] D1 binding: `DB` → `shivworks-network-db`
- [ ] KV binding: `KV` → `shivworks-network-kv` (create namespace if missing)
- [ ] Custom domain: add `network.shivworks.com`, wait for SSL provision

---

## Phase 2 — Database migrations (May 31, after Phase 1)

```bash
# Verify what's already applied to remote D1
pnpm migrate:list

# Apply any unapplied migrations (0001–0012)
pnpm migrate
```

Expected state after this step:
- 0001–0008: original schema
- 0009: `processed_webhook_events` (idempotency)
- 0010: indexes
- 0011: gamification (`member_gamification`)
- 0012: member profiles (`member_profiles`)

**Verification query:**
```bash
pnpm db:shell "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Must include `processed_webhook_events`, `member_gamification`, `member_profiles`.

**Rollback:** D1 has no rollback. If a migration breaks, hotfix-forward only. **Do not rerun migrations on prod without first running them on a staging D1.**

---

## Phase 3 — Staging deploy + smoke (May 31, afternoon)

```bash
pnpm deploy:staging
```

This builds and deploys to the `staging` branch on CF Pages → produces a unique URL like `staging.shivworks-network.pages.dev`.

- [ ] Public smoke against staging URL: `BASE_URL=https://staging.shivworks-network.pages.dev pnpm smoke`
- [ ] Manual: open landing, navigate to checkout, click Bronze + VIP buttons, confirm redirects to WC
- [ ] Manual: WP test order → fires real webhook to staging → confirm new row in `imported_member_provisions` (`pnpm db:shell "SELECT * FROM imported_member_provisions ORDER BY created_at DESC LIMIT 5"`)
- [ ] Sign up via Clerk (use test email) → confirm member row in `members` and provision auto-claimed
- [ ] Confirm welcome email arrives via Resend
- [ ] (If ActiveCampaign configured) Confirm `VIP_Founding` or `Jujitsu_Course_Member` tag applied

**Rollback if smoke fails:** the staging deploy is isolated; fix forward and redeploy. Production not yet touched.

---

## Phase 4 — Load test (May 31 evening, optional but recommended)

Goal: confirm staging can hold ~600 concurrent founding-member sessions on Monday morning.

```bash
pnpm load:base       # baseline ramp
pnpm load:auth       # authenticated-route ramp
pnpm load:report     # generate HTML report
```

Targets: p95 < 800ms, error rate < 1%, no 5xx on cached routes.

**If targets miss:** check CF Pages function CPU; consider lowering Artillery target rate or enabling more KV caching on hot paths. Not a hard launch blocker if margins are close — Founding-member traffic ramps gradually.

---

## Phase 5 — Production cutover (June 1, ~9:00 AM CT)

```bash
# 1. Snapshot main (mandatory before cutover)
pwsh scripts/snapshot-main.ps1

# 2. Deploy production
pnpm deploy
```

This deploys to the `main` branch on CF Pages → `network.shivworks.com`.

- [ ] Production smoke: `BASE_URL=https://network.shivworks.com pnpm smoke`
- [ ] Manually verify landing renders, fonts load, no console errors
- [ ] Verify Sentry receives a test event: `curl "https://network.shivworks.com/api/dev/sentry-test?fire=1"` → confirm issue appears in Sentry dashboard within ~30 sec. **Then delete `src/routes/api/dev/sentry-test/` in a follow-up PR — endpoint has no place in long-lived prod.**
- [ ] Verify WC webhook on production: place real $1 test order in WC, confirm provision row
- [ ] Verify Clerk login flow end-to-end with a real test account
- [ ] Verify `/api/members` and `/people` render (Replit-shipped routes — first prod test)
- [ ] Verify dashboard renders for an authenticated test user

**ROLLBACK if production smoke fails:**
1. `git reset --hard backup/main-<latest-pre-cutover-tag>`
2. `git push origin main --force-with-lease` (only if branch protection is OFF)
3. `pnpm deploy` again to redeploy previous good state

---

## Phase 6 — Cut over the founding member emails (June 1, ~10:00 AM CT)

Aaron sends the announcement email to the 643 founding members with their dashboard URL: `https://network.shivworks.com/login`.

- [ ] Watch Sentry for ~30 min after blast — anything trending should be triaged
- [ ] Watch CF Pages function logs for 4xx/5xx spikes
- [ ] Watch D1 query metrics for unusual contention

---

## Common rollback recipes

| Symptom | Rollback |
|---------|----------|
| Bad commit on main, want to undo | `git reset --hard backup/main-<timestamp>` then `git push --force-with-lease origin main` |
| Bad CF Pages deploy | CF dashboard → Pages → Deployments → click previous → "Rollback to this deployment" |
| Bad WC webhook secret | Rotate `WC_WEBHOOK_SECRET` in Infisical + WC admin simultaneously; idempotency table prevents replay |
| Migration broke prod | Hotfix-forward migration; D1 cannot roll back schema |

---

## Day-after checklist (June 2)

- [ ] Sentry triage — group + fix any new errors
- [ ] D1 metrics review — identify slow queries, add indexes in 0013 if needed
- [ ] CF Pages bandwidth + functions invocation counts vs estimate
- [ ] Resend deliverability — bounces, complaints, opens
- [ ] LEDGER entry: launch summary

---

*Last updated: 2026-05-29 · Max · post-restore + Replit-audit.*
