# Aaron — Unblockers for June 1 Launch

> Forward this whole doc to Aaron. Every item is something only he can do. None of it is hard; it's mostly clicking through dashboards and pasting values. Total time estimate: **45–60 minutes**.

**Deadline: end of day Saturday May 31** so Phase 3 staging smoke can run.

---

## 1. Infisical secrets (15 min)

Project: `shivworks-network`, environment: `prod`. Add these keys:

| Key | Where to get it | Notes |
|-----|-----------------|-------|
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys → Production | `sk_live_...` |
| `CLERK_PUBLISHABLE_KEY` | Same place | `pk_live_...` |
| `WC_WEBHOOK_SECRET` | Generate: `openssl rand -hex 32` | **Save it — you'll paste it again in step 3** |
| `SENTRY_DSN` | Sentry → Settings → Projects → shivworks-network → Client Keys (DSN) | Server-side |
| `VITE_SENTRY_DSN` | Same DSN value | Client-side copy |
| `RESEND_API_KEY` | Resend dashboard → API Keys | `re_...` |
| `RESEND_FROM_EMAIL` | Pick: `welcome@shivworks.com` | Must match a verified domain in Resend |
| `ACTIVECAMPAIGN_API_URL` | AC → Settings → Developer | Optional — webhook still works if unset |
| `ACTIVECAMPAIGN_API_KEY` | Same place | Optional |

**If a Sentry project doesn't exist yet:** create one — SvelteKit, name it `shivworks-network`, copy the DSN.

**If a Resend domain isn't verified yet:** Resend dashboard → Domains → add `shivworks.com` → paste the SPF/DKIM/DMARC records into your DNS provider. Verification typically completes within ~10 min.

---

## 2. DNS records (10 min, can run in parallel with step 1)

At your domain registrar (whoever holds `shivworks.com`):

| Type | Host | Value | Why |
|------|------|-------|-----|
| CNAME | `network` | `shivworks-network.pages.dev` | Points `network.shivworks.com` at the app |
| TXT | (per Resend) | (per Resend) | DKIM — let welcome emails through |
| TXT | (per Resend) | (per Resend) | SPF |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@shivworks.com` | DMARC reporting |

Verify CNAME with: `nslookup network.shivworks.com` — should resolve within 5 min.

---

## 3. WooCommerce webhook (10 min)

WordPress admin → **WooCommerce → Settings → Advanced → Webhooks → Add webhook**:

- **Name:** `network-provisioning`
- **Status:** Active
- **Topic:** `Order updated`
- **Delivery URL:** `https://network.shivworks.com/api/wc/webhook`
- **Secret:** **paste the same value as `WC_WEBHOOK_SECRET` from step 1**
- **API Version:** WP REST API Integration v3

Save. Click "Send test" — confirm a 200 response appears in the webhook log table. If you see 401, the secret doesn't match Infisical.

---

## 4. Cloudflare Pages bindings (10 min)

CF dashboard → Pages → `shivworks-network` project → Settings → Functions:

- **D1 database bindings**
  - Variable name: `DB`
  - D1 database: `shivworks-network-db`
- **KV namespace bindings** (create namespace first if missing — Workers & Pages → KV → Create)
  - Variable name: `KV`
  - KV namespace: `shivworks-network-kv`
- **Custom domains** → add `network.shivworks.com`, wait for SSL ✅

---

## 5. Clerk production setup (10 min)

Clerk dashboard → Instance settings:

- [ ] **Allowed origins:** add `https://network.shivworks.com`
- [ ] **Sign-in redirect URL:** `https://network.shivworks.com/dashboard`
- [ ] **Sign-up redirect URL:** `https://network.shivworks.com/dashboard`
- [ ] **Webhook endpoint:** `https://network.shivworks.com/api/clerk/webhook`
- [ ] **Webhook signing secret:** copy → add to Infisical as `CLERK_WEBHOOK_SIGNING_SECRET`
- [ ] **Subscribe to events:** `user.created`, `user.updated`, `user.deleted`, `session.created`

---

## Quick-reply checklist

When done, message back with just this filled in:

```
[x] Infisical secrets in prod
[x] DNS records published (network CNAME + Resend TXT + DMARC)
[x] WC webhook active, test ping 200 OK
[x] CF Pages bindings (DB + KV + custom domain SSL provisioned)
[x] Clerk prod origins/redirects/webhook configured
```

Once those five lines are all `[x]`, Max kicks off Phase 3 staging smoke.

---

*Generated: 2026-05-29 · Max · launch unblockers.*
