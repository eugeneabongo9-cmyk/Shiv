# Production Ops Runbook — Secrets Rotation & Resend Deliverability

Covers w455 (production secrets) and w456 (Resend DNS / deliverability).

**Vault:** Infisical — environments: `dev`, `staging`, `prod`  
**Secrets sync:** Infisical → Cloudflare Pages integration (prod env → `shivworks-network` CF Pages project)

---

## w452 — Infisical workspace init

The repo contains `.infisical.json` with a placeholder `workspaceId`. To wire it to a real Infisical workspace:

```bash
# Install Infisical CLI if not already present
brew install infisical/get-cli/infisical   # macOS
# or: curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo bash && sudo apt-get install infisical

# Login
infisical login

# Inside the repo — overwrites .infisical.json with the real workspaceId
infisical init
```

Select the `ShivWorks Network` workspace and confirm the `workspaceId` is written to `.infisical.json`. Commit the updated file.

### Secret inventory — all three environments

Populate these in the Infisical dashboard (or via `infisical secrets set`) for each of `dev`, `staging`, and `prod`.

| Secret                              | Notes                                                  |
| ----------------------------------- | ------------------------------------------------------ |
| `PUBLIC_CLERK_PUBLISHABLE_KEY`      | `pk_live_*` for prod; `pk_test_*` for dev/staging      |
| `CLERK_SECRET_KEY`                  | `sk_live_*` for prod; `sk_test_*` for dev/staging      |
| `CLERK_JWT_KEY`                     | RSA public key from Clerk dashboard (prod)             |
| `CLERK_WEBHOOK_SIGNING_SECRET`      | From Clerk → Webhooks → signing secret                 |
| `CLERK_AUTHORIZED_PARTIES`          | Comma-separated list of allowed origins                |
| `STRIPE_SECRET_KEY`                 | `sk_live_*` for prod; `sk_test_*` for dev/staging      |
| `STRIPE_WEBHOOK_SECRET`             | Stripe → Webhooks → signing secret                     |
| `STRIPE_BRONZE_PRICE_ID`            | Live price ID for Bronze product                       |
| `STRIPE_VIP_PRICE_ID`               | Live price ID for VIP product                          |
| `RESEND_API_KEY`                    | Resend API key (use separate keys per env)             |
| `EMAIL_FROM`                        | `ShivWorks Network <noreply@network.shivworks.com>`    |
| `SUPPORT_EMAIL`                     | `network@shivworks.com`                                |
| `PUBLIC_SUPPORT_EMAIL`              | `network@shivworks.com`                                |
| `SHIVWORKS_ADMIN_EMAILS`            | Comma-separated admin email(s)                         |
| `PUBLIC_CIRCLE_COMMUNITY_URL`       | Circle community URL                                   |
| `CLOUDFLARE_ACCOUNT_ID`             | `9645bd52e640b8a4f40a3a55ff1dd75a`                     |
| `CLOUDFLARE_STREAM_API_TOKEN`       | CF Stream API token                                    |
| `CLOUDFLARE_STREAM_WEBHOOK_SECRET`  | CF Stream webhook signing secret                       |
| `CLOUDFLARE_STREAM_ALLOWED_ORIGINS` | `https://network.shivworks.com,...`                    |
| `VIDEO_STREAM_TOKEN_TTL_SECONDS`    | `14400` (4 hours)                                      |
| `WC_WEBHOOK_SECRET`                 | WC webhook signing secret (must match WC store config) |
| `ACTIVECAMPAIGN_API_URL`            | `https://<account>.api-us1.com`                        |
| `ACTIVECAMPAIGN_API_KEY`            | AC API key from AC → Settings → Developer              |
| `SENTRY_DSN`                        | Sentry DSN (server-side)                               |
| `VITE_SENTRY_DSN`                   | Sentry DSN (client-side, Vite-exposed)                 |

### Enable Infisical → Cloudflare Pages sync

1. In Infisical dashboard → Integrations → Cloudflare Pages.
2. Connect using a Cloudflare API token scoped to the `shivworks-network` Pages project.
3. Map the Infisical `prod` environment → CF Pages `Production` environment.
4. Map the Infisical `staging` environment → CF Pages `Preview` environment.
5. Click **Save**. Infisical will sync secrets to CF Pages on every save.
6. Verify in CF Pages → Settings → Environment Variables that the prod vars are present.

---

## w455 — Production secrets rotation

Perform this rotation **before launch day**.

### Checklist — rotate any secret generated during development

| Secret                                              | Rotation action                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | Switch from test → live Clerk app in Clerk dashboard; copy live keys   |
| `CLERK_JWT_KEY`                                     | Copy RSA public key from Clerk live app → JWT Templates                |
| `CLERK_WEBHOOK_SIGNING_SECRET`                      | Regenerate in Clerk → Webhooks for prod endpoint                       |
| `STRIPE_SECRET_KEY`                                 | Switch to live mode in Stripe dashboard; copy live secret key          |
| `STRIPE_WEBHOOK_SECRET`                             | Register prod webhook URL in Stripe; copy signing secret               |
| `STRIPE_BRONZE_PRICE_ID` + `STRIPE_VIP_PRICE_ID`    | Confirm live price IDs in Stripe dashboard                             |
| `RESEND_API_KEY`                                    | Create a dedicated prod API key in Resend (separate from dev key)      |
| `WC_WEBHOOK_SECRET`                                 | Generate a strong random secret; update in both WC store and Infisical |
| `ACTIVECAMPAIGN_API_KEY`                            | Use production AC account key (not a test/trial key)                   |
| `CLOUDFLARE_STREAM_API_TOKEN`                       | Scope to prod account; rotate if shared with dev                       |
| `SENTRY_DSN`                                        | Use prod Sentry project DSN (not a dev project)                        |

### Post-rotation verification

1. Update all rotated secrets in Infisical `prod` env.
2. Confirm the Infisical → CF Pages sync picked up new values (check CF Pages → Settings → Environment Variables timestamp).
3. Trigger a new CF Pages production deployment (push to `main` or redeploy last build).
4. Hit `https://network.shivworks.com/` — confirm 200 and no auth errors in CF Logs.
5. Check Sentry → Issues for any startup errors in the first 5 minutes.

---

## w456 — Resend deliverability (SPF / DKIM / DMARC)

**Sending domain:** `network.shivworks.com`  
**From address:** `noreply@network.shivworks.com`  
**Coordinate DNS changes with: Aaron**

### 1. Add the sending domain in Resend

1. Resend dashboard → Domains → Add Domain.
2. Enter `network.shivworks.com`.
3. Resend generates three DNS records — copy all three.

### 2. Publish DNS records

Add the following in the DNS provider for `shivworks.com` (likely Cloudflare DNS):

#### SPF (TXT record)

```
Host:  @  (or network.shivworks.com if adding a subdomain record)
Type:  TXT
Value: v=spf1 include:amazonses.com ~all
```

> Resend uses Amazon SES under the hood. The exact SPF value is shown in the Resend domain panel — use that value verbatim.

#### DKIM (CNAME records — Resend provides two)

```
Host:  resend1._domainkey.network.shivworks.com
Type:  CNAME
Value: <provided by Resend>

Host:  resend2._domainkey.network.shivworks.com
Type:  CNAME
Value: <provided by Resend>
```

#### DMARC (TXT record)

```
Host:  _dmarc.network.shivworks.com
Type:  TXT
Value: v=DMARC1; p=none; rua=mailto:dmarc@shivworks.com
```

`p=none` means monitoring-only at launch. After confirming clean delivery for 2–4 weeks, tighten to `p=quarantine` then `p=reject`.

### 3. Verify domain in Resend

DNS propagation takes 5–60 minutes. Once complete:

1. Resend dashboard → Domains → click `network.shivworks.com` → **Verify**.
2. Confirm all three checks show a green ✓.

### 4. Test send

1. Resend → Emails → Send test email from `noreply@network.shivworks.com` to a personal Gmail and a personal Outlook address.
2. Confirm:
   - Delivered (not in Spam).
   - Headers show `DKIM=pass`, `SPF=pass`, `DMARC=pass`.
   - No spam classification.
3. Check Gmail → Show original → `Authentication-Results` for pass/fail detail.

### 5. Troubleshooting

| Symptom                   | Check                                                       |
| ------------------------- | ----------------------------------------------------------- |
| DKIM fail                 | DNS propagation delay — wait 1 h and re-verify              |
| SPF fail                  | Confirm SPF TXT on the sending domain (not the root domain) |
| Email lands in spam       | DMARC aggregate reports at `dmarc@shivworks.com` after 24 h |
| Resend shows "unverified" | Check CNAME records are exact — trailing dots matter        |

---

## Sentry — production wiring & alert thresholds

Set both DSN secrets in Infisical `prod` (synced to CF Pages):

| Variable          | Scope            | Notes                                            |
| ----------------- | ---------------- | ------------------------------------------------ |
| `SENTRY_DSN`      | Server (Worker)  | Read lazily from `platform.env` on first request |
| `VITE_SENTRY_DSN` | Client (browser) | Same project DSN; Vite exposes at build time     |

### Validate after deploy

1. Confirm both vars appear in CF Pages → Settings → Environment variables (Production).
2. Hit a preview/staging route: `GET /api/dev/sentry-test?fire=1` — issue should appear in Sentry within ~30 s.
3. Remove or ignore `/api/dev/sentry-test` after validation (dev-only surface).

### Recommended alert rules (Sentry → Alerts → Create Alert)

| Rule                    | Condition                                        | Action                              |
| ----------------------- | ------------------------------------------------ | ----------------------------------- |
| **Error spike**         | `event.type:error`, count > 10 in 5 min          | Email `#ops` + Slack                |
| **Unhandled 5xx route** | `level:error`, tag `route` matches `/api/*`      | Email immediately                   |
| **WC webhook failures** | message contains `wc.webhook`                    | Email immediately                   |
| **Clerk auth failures** | message contains `Clerk` AND count > 5 in 15 min | Email                               |
| **New issue (prod)**    | First seen, environment = `production`           | Email (daily digest OK post-launch) |

Sample rate: `0.2` traces in production (already set in `hooks.server.ts` / `hooks.client.ts`).

### If events never arrive

- Server: confirm `SENTRY_DSN` is in CF Pages **encrypted** env, not only `.env.local`.
- Client: confirm `VITE_SENTRY_DSN` was present at **build** time (redeploy after adding).
- CSP: `connect-src` already allows `https://*.ingest.sentry.io` and `https://*.ingest.us.sentry.io`.
