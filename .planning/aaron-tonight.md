# Aaron — Launch night checklist

Everything below is on you; nothing here needs Max. ~20 min total if secrets are handy. Do them in order — step 3 won't work until step 1 is done.

---

## 1. Point the subdomain (Cloudflare DNS — 2 min)

1. Cloudflare dashboard → select the **`shivworks.com`** zone
2. **DNS → Records → Add record**
   - **Type:** `CNAME`
   - **Name:** `network`
   - **Target:** `shivworks-network.pages.dev`
   - **Proxy status:** Proxied (orange cloud ON)
   - **TTL:** Auto
3. **Save**

## 2. Attach the domain to the Pages project (Cloudflare Pages — 3 min)

1. Cloudflare dashboard → **Workers & Pages → `shivworks-network`**
2. **Custom domains → Set up a custom domain**
3. Enter **`network.shivworks.com`** → Continue → Activate
4. Wait for SSL: green checkmark in 1–5 min. Verify by opening `https://network.shivworks.com` in a browser — should load (may still show no-secrets errors until step 3).

## 3. Create the KV namespace + bind it (Cloudflare — 2 min)

1. **Workers & Pages → KV → Create a namespace**
   - **Name:** `shivworks-network-kv`
2. Back to **Pages → `shivworks-network` → Settings → Functions → KV namespace bindings → Add binding**
   - **Variable name:** `KV`
   - **KV namespace:** `shivworks-network-kv`
3. **Save**

## 4. Paste secrets directly into Cloudflare Pages (10 min)

> **Why CF Pages and not Infisical tonight:** the Infisical → Cloudflare sync integration isn't wired yet (planned for tomorrow). Until that's set up, secrets pasted into Infisical won't reach the live Worker. Paste directly into CF Pages env vars tonight, back-fill into Infisical tomorrow when the integration is live.

**Cloudflare dashboard → Pages → `shivworks-network` → Settings → Environment variables**

Click **Add variable** for each one below. **Set the Environment dropdown to "Production"** (not Preview) for every entry. Click **Encrypt** so they're stored as secrets, not plain vars.

Required for login + payments + email to work:

- [ ] `CLERK_SECRET_KEY` — Clerk dashboard → API Keys → live secret
- [ ] `CLERK_PUBLISHABLE_KEY` — same page, starts with `pk_live_`
- [ ] `WC_WEBHOOK_SECRET` — generate any 64-char random string ([passwordsgenerator.net](https://passwordsgenerator.net), 64 chars, alphanumeric). **Save this value — you'll paste the same one into WC in step 5.**
- [ ] `RESEND_API_KEY` — Resend dashboard → API Keys → production key
- [ ] `RESEND_FROM_EMAIL` → `welcome@shivworks.com` (verify DKIM/SPF on Resend dashboard shows green)
- [ ] `SENTRY_DSN` — Sentry → project settings → Client Keys → DSN (create a SvelteKit project if it doesn't exist yet)
- [ ] `VITE_SENTRY_DSN` — same value as `SENTRY_DSN`
- [ ] `ACTIVECAMPAIGN_API_URL` + `ACTIVECAMPAIGN_API_KEY` — _optional_, skip if not ready

After pasting all variables: **Deployments tab → latest deployment → ⋯ → Retry deployment**. This rebuilds with the new env vars so they reach the running Worker. Without this step, the new secrets sit in settings but the live site keeps running on the old (empty) values.

**Tomorrow:** wire the Infisical → Cloudflare Pages integration (Infisical dashboard → Settings → Integrations → Cloudflare Pages), then mirror these same values into Infisical's `prod` env so the docs / canonical vault stays correct. After that, all future secret changes happen in Infisical only and auto-sync to CF.

## 5. Wire the WooCommerce webhook (WP admin — 3 min)

WordPress admin on `shivworkspg.com`:

1. **WooCommerce → Settings → Advanced → Webhooks → Add webhook**
   - **Name:** `network-provisioning`
   - **Status:** Active
   - **Topic:** `Order updated`
   - **Delivery URL:** `https://network.shivworks.com/api/wc/webhook`
   - **Secret:** _paste the same `WC_WEBHOOK_SECRET` value from step 4_
   - **API version:** WP REST API Integration v3
2. **Save webhook**
3. **Click the webhook again → Send test ping**
   - Expected: **200 OK** in the delivery log
   - If 401: secret mismatch — repeat step 4 and step 5 with the same value
   - If 500 with `"webhook not configured"`: `WC_WEBHOOK_SECRET` did not land in the running build — repeat step 4 + retry deployment
   - If 5xx other: ping Max with the response body

### Response-body cheat sheet (what each status means)

| Code | Body shape                                            | Meaning                                                                  |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| 200  | `{ success: true, claimed: true, tier: "bronze"       | "vip" }`                                                                 | Order processed, membership provisioned |
| 200  | `{ success: true, ignored: true, reason: "..." }`     | Order received but didn't map to a tier (wrong product ID, refund, etc.) |
| 200  | `{ success: true, alreadyProcessed: true }`           | WC retry of a previously-handled order; safe                             |
| 401  | `{ success: false, error: "invalid signature" }`      | Secret mismatch between WC and CF Pages env vars                         |
| 400  | `{ success: false, error: "invalid body" }`           | Payload wasn't valid JSON                                                |
| 500  | `{ success: false, error: "webhook not configured" }` | `WC_WEBHOOK_SECRET` env var not set in the running build                 |

**Product IDs the webhook recognises** (hardcoded in `src/lib/server/wc-webhook.ts`):

- `31517` → bronze (founding-member)
- `31518` → vip (founding-member)
- Anything else → 200 + `ignored:true` (no membership)

---

## Done conditions

When all five steps are green:

- [ ] `https://network.shivworks.com` loads
- [ ] Clicking **Login** opens Clerk's hosted form
- [ ] WC test webhook returned 200
- [ ] Infisical `prod` shows all 7 required secrets

Ping Max in the thread when you hit any blocker, or when it's all green so he can run migrations + the final deploy.
